/* ============================================================================
 * Scene Builder
 * ----------------------------------------------------------------------------
 * Composites transparent images on a single 4:3 stage:
 *   background  <  props (drop order)  <  character (body/outfit/face/acc)  <  caption
 *
 * Design rules baked in (see build spec):
 *  - Character layers share ONE registration frame; swapping a pose/outfit/
 *    face/accessory just swaps image sources at the same box — no offsets.
 *  - Scene content is stored in PERCENTAGES of the stage, never pixels, so the
 *    scene survives resizing and exports at any resolution.
 *  - Pointer Events only, so one code path covers mouse + touch.
 *  - Undo stack, preloading, bounding-box hit testing (transparent PNG areas
 *    fall inside the box — accepted for v1).
 * ==========================================================================*/
(function () {
  "use strict";
  const M = window.SCENE_MANIFEST;
  const $ = (sel, r = document) => r.querySelector(sel);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const uid = (() => { let n = 0; return () => "u" + (++n) + "_" + (Date.now() % 100000); })();

  /* ---- Image cache & preloading ---------------------------------------- */
  const imgCache = new Map();
  function load(src) {
    if (imgCache.has(src)) return imgCache.get(src);
    const p = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("failed: " + src));
      im.src = src;
    });
    imgCache.set(src, p);
    return p;
  }
  const poseSrcs = (pose) => [pose.body,
    ...Object.values(pose.faces), ...Object.values(pose.outfits), ...Object.values(pose.accessories)];
  function preloadPose(id) { const p = M.poses.find(p => p.id === id); return p ? Promise.all(poseSrcs(p).map(load)) : Promise.resolve(); }

  /* ---- Scene state ------------------------------------------------------ */
  // x/y are the item CENTRE as a fraction of stage width/height (0..1).
  // prop.scale  = fraction of stage WIDTH the prop spans.
  // char.scale  = fraction of stage HEIGHT the character spans.
  function freshScene() {
    return {
      background: M.backgrounds[0].id,
      props: [],                       // {uid,id,x,y,scale,rot,z}
      character: null,                 // {x,y,scale,z,pose,outfit,expression,acc:[]}
      caption: "",
      zTop: 1,
    };
  }
  let scene = freshScene();
  let selected = null;                 // uid | "char" | null

  /* ---- Undo stack ------------------------------------------------------- */
  const undoStack = [];
  const UNDO_MAX = 25;
  function snapshot() { return JSON.stringify(scene); }
  function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    updateUndoBtn();
  }
  function undo() {
    if (!undoStack.length) return;
    scene = JSON.parse(undoStack.pop());
    if (selected && selected !== "char" && !scene.props.find(p => p.uid === selected)) selected = null;
    if (selected === "char" && !scene.character) selected = null;
    $("#captionInput").value = scene.caption;
    syncAll();
    updateUndoBtn();
  }
  const updateUndoBtn = () => { $("#undoBtn").disabled = undoStack.length === 0; };

  /* ---- DOM refs --------------------------------------------------------- */
  const stage = $("#stage");
  const bgImg = $("#stageBg");
  const captionBand = $("#captionBand");
  const captionText = $("#captionText");
  const stageHint = $("#stageHint");
  const itemEls = new Map();           // uid|"char" -> element

  /* ---- Build static UI from the manifest -------------------------------- */
  function buildBackgroundPicker() {
    const tiles = $("#bgTiles");
    M.backgrounds.forEach(bg => {
      const b = document.createElement("button");
      b.className = "tile"; b.type = "button"; b.dataset.id = bg.id;
      b.setAttribute("aria-pressed", String(bg.id === scene.background));
      b.innerHTML = `<img src="${bg.thumb}" alt=""><span>${bg.label}</span>`;
      b.addEventListener("click", () => setBackground(bg.id));
      tiles.appendChild(b);
    });
  }
  function buildPropsTray() {
    const grid = $("#propGrid");
    M.props.forEach(pr => {
      const el = document.createElement("div");
      el.className = "tray-item"; el.tabIndex = 0; el.dataset.propId = pr.id;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", "Add " + pr.label);
      el.innerHTML = `<img src="${pr.src}" alt=""><span>${pr.label}</span>`;
      el.addEventListener("pointerdown", (e) => startTrayDrag(e, { kind: "prop", id: pr.id }));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addProp(pr.id, 0.5, 0.5); } });
      grid.appendChild(el);
    });
  }
  function buildCharacterPanel() {
    const mk = (opts, current, isMulti, onPick, getActive) => {
      const row = document.createElement("div"); row.className = "opt-row";
      opts.forEach(o => {
        const b = document.createElement("button");
        b.className = "opt"; b.type = "button"; b.dataset.id = o.id; b.textContent = o.label;
        b.setAttribute("aria-pressed", String(getActive(o.id)));
        b.addEventListener("click", () => onPick(o.id));
        row.appendChild(b);
      });
      return row;
    };
    $("#poseRow").replaceWith(wrap("poseRow", mk(M.poses, null, false, setPose, id => scene.character && scene.character.pose === id)));
    $("#exprRow").replaceWith(wrap("exprRow", mk(M.expressionOptions, null, false, setExpression, id => scene.character && scene.character.expression === id)));
    $("#outfitRow").replaceWith(wrap("outfitRow", mk(M.outfitOptions, null, false, setOutfit, id => scene.character && scene.character.outfit === id)));
    $("#accRow").replaceWith(wrap("accRow", mk(M.accessoryOptions, null, true, toggleAccessory, id => scene.character && scene.character.acc.includes(id))));
  }
  const wrap = (id, child) => { child.id = id; return child; };

  /* ---- Mutations (each pushes undo, then re-syncs) ---------------------- */
  function setBackground(id) {
    if (scene.background === id) return;
    pushUndo(); scene.background = id; syncBackground(); syncPickers();
  }
  function addProp(id, x, y) {
    const def = M.props.find(p => p.id === id);
    pushUndo();
    const p = { uid: uid(), id, x, y, scale: def.defaultScale, rot: 0, z: ++scene.zTop };
    scene.props.push(p); selected = p.uid; syncAll();
  }
  function placeCharacter(x, y) {
    if (scene.character) return;
    pushUndo();
    scene.character = { x, y, scale: 0.82, z: ++scene.zTop,
      pose: M.poses[0].id, outfit: M.outfitOptions[0].id, expression: M.expressionOptions[0].id, acc: [] };
    selected = "char"; syncAll();
    preloadPose(M.poses[1].id).then(() => preloadPose(M.poses[2].id)); // background preload
  }
  function deleteItem(sel) {
    pushUndo();
    if (sel === "char") scene.character = null;
    else scene.props = scene.props.filter(p => p.uid !== sel);
    if (selected === sel) selected = null;
    syncAll();
  }
  const charEdit = (fn) => { if (!scene.character) return; pushUndo(); fn(scene.character); syncCharacter(); syncPickers(); };
  const setPose       = (id) => charEdit(c => { c.pose = id; });
  const setOutfit     = (id) => charEdit(c => { c.outfit = id; });
  const setExpression = (id) => charEdit(c => { c.expression = id; });
  const toggleAccessory = (id) => charEdit(c => {
    const i = c.acc.indexOf(id); if (i >= 0) c.acc.splice(i, 1); else c.acc.push(id);
  });
  function bringForward(sel) { const it = getItem(sel); if (it) { pushUndo(); it.z = ++scene.zTop; syncZ(); } }
  function sendBack(sel) {
    const it = getItem(sel); if (!it) return; pushUndo();
    const min = Math.min(...allItems().map(i => i.z)); it.z = min - 1; syncZ();
  }
  const getItem = (sel) => sel === "char" ? scene.character : scene.props.find(p => p.uid === sel);
  const allItems = () => [...scene.props, ...(scene.character ? [scene.character] : [])];

  /* ---- Rendering / reconcile ------------------------------------------- */
  function syncBackground() {
    const bg = M.backgrounds.find(b => b.id === scene.background);
    if (bg) bgImg.src = bg.src;
  }
  function positionEl(el, it, sel) {
    const w = stage.clientWidth, h = stage.clientHeight;
    let pxW, pxH;
    if (sel === "char") { pxH = it.scale * h; pxW = pxH * (M.character.frameW / M.character.frameH); }
    else { pxW = it.scale * w; pxH = pxW; }
    el.style.width = pxW + "px";
    el.style.height = pxH + "px";
    el.style.left = (it.x * w) + "px";
    el.style.top = (it.y * h) + "px";
    el.style.transform = `translate(-50%, -50%) rotate(${it.rot || 0}deg)`;
    el.style.zIndex = String(1000 + (it.z || 0));
  }
  function buildPropEl(p) {
    const el = document.createElement("div");
    el.className = "item"; el.dataset.sel = p.uid;
    const def = M.props.find(d => d.id === p.id);
    const img = document.createElement("img"); img.src = def.src; img.alt = def.label;
    el.appendChild(img);
    addHandles(el, p.uid);
    el.addEventListener("pointerdown", (e) => startMove(e, p.uid));
    stage.appendChild(el);
    return el;
  }
  function buildCharEl(c) {
    const el = document.createElement("div");
    el.className = "item"; el.dataset.sel = "char";
    const layers = document.createElement("div"); layers.className = "char-layers"; // filled by syncCharacter
    el.appendChild(layers);
    addHandles(el, "char");
    el.addEventListener("pointerdown", (e) => startMove(e, "char"));
    stage.appendChild(el);
    return el;
  }
  function syncCharacter() {
    if (!scene.character) { const e = itemEls.get("char"); if (e) { e.remove(); itemEls.delete("char"); } return; }
    let el = itemEls.get("char");
    if (!el) { el = buildCharEl(scene.character); itemEls.set("char", el); }
    const c = scene.character;
    const pose = M.poses.find(p => p.id === c.pose);
    const layers = el.querySelector(".char-layers");
    const srcs = [pose.body, pose.outfits[c.outfit], pose.faces[c.expression],
      ...c.acc.map(a => pose.accessories[a]).filter(Boolean)];
    layers.innerHTML = "";
    srcs.forEach(s => { const im = document.createElement("img"); im.src = s; im.alt = ""; layers.appendChild(im); });
    positionEl(el, c, "char");
    el.classList.toggle("selected", selected === "char");
  }
  function syncProps() {
    // remove stale
    itemEls.forEach((el, key) => {
      if (key === "char") return;
      if (!scene.props.find(p => p.uid === key)) { el.remove(); itemEls.delete(key); }
    });
    scene.props.forEach(p => {
      let el = itemEls.get(p.uid);
      if (!el) { el = buildPropEl(p); itemEls.set(p.uid, el); }
      positionEl(el, p, p.uid);
      el.classList.toggle("selected", selected === p.uid);
    });
  }
  function syncZ() { allItems().forEach(it => { const sel = it === scene.character ? "char" : it.uid; const el = itemEls.get(sel); if (el) el.style.zIndex = String(1000 + it.z); }); }
  function syncPickers() {
    $$("#bgTiles .tile").forEach(t => t.setAttribute("aria-pressed", String(t.dataset.id === scene.background)));
    const c = scene.character;
    setPressed("#poseRow", c && c.pose);
    setPressed("#exprRow", c && c.expression);
    setPressed("#outfitRow", c && c.outfit);
    $$("#accRow .opt").forEach(b => b.setAttribute("aria-pressed", String(!!c && c.acc.includes(b.dataset.id))));
    // empty-state dimming
    $(".character").classList.toggle("disabled", !scene.character);
    $("#abuelaCard").classList.toggle("placed", !!scene.character);
    stageHint.style.display = scene.character ? "none" : "block";
  }
  const setPressed = (rowSel, id) => $$(rowSel + " .opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
  function syncCaption() {
    const txt = scene.caption.trim();
    captionText.textContent = txt;
    captionBand.classList.toggle("empty", txt.length === 0);
    fitCaption();
  }
  function fitCaption() {
    // auto-shrink until it fits two lines within the band.
    const band = captionBand, span = captionText;
    let size = Math.max(14, Math.round(stage.clientHeight * 0.055));
    span.style.fontSize = size + "px";
    let guard = 40;
    while (span.scrollHeight > band.clientHeight - 4 && size > 9 && guard-- > 0) {
      size -= 1; span.style.fontSize = size + "px";
    }
  }
  function syncAll() { syncBackground(); syncProps(); syncCharacter(); syncPickers(); syncCaption(); }
  const $$ = (sel, r = document) => Array.from(r.querySelectorAll(sel));

  /* ---- Selection handles ------------------------------------------------ */
  function addHandles(el, sel) {
    const defs = [
      ["rotate", "⟳", startRotate],
      ["resize", "⤡", startResize],
      ["delete", "✕", () => deleteItem(sel)],
      ["forward", "▲", () => bringForward(sel)],
      ["back", "▼", () => sendBack(sel)],
    ];
    defs.forEach(([cls, glyph, fn]) => {
      const h = document.createElement("button");
      h.className = "handle " + cls; h.type = "button"; h.textContent = glyph;
      h.setAttribute("aria-label", cls);
      if (cls === "rotate" || cls === "resize") h.addEventListener("pointerdown", (e) => { e.stopPropagation(); fn(e, sel); });
      else h.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
      el.appendChild(h);
    });
  }
  function select(sel) { selected = sel; syncProps(); syncCharacter(); }

  /* ---- Pointer gestures ------------------------------------------------- */
  let gesture = null;
  const stageRect = () => stage.getBoundingClientRect();

  function startMove(e, sel) {
    if (e.target.classList.contains("handle")) return;   // handled separately
    e.preventDefault();
    select(sel);
    const it = getItem(sel); const r = stageRect();
    gesture = { type: "move", sel, moved: false,
      grabDX: e.clientX - (r.left + it.x * r.width),
      grabDY: e.clientY - (r.top + it.y * r.height),
      start: { x: it.x, y: it.y } };
    beginGesture(e);
  }
  function startResize(e, sel) {
    e.preventDefault(); select(sel);
    const it = getItem(sel); const r = stageRect();
    const cx = r.left + it.x * r.width, cy = r.top + it.y * r.height;
    gesture = { type: "resize", sel, startDist: Math.hypot(e.clientX - cx, e.clientY - cy), startScale: it.scale, cx, cy };
    pushUndo(); gesture.pushed = true;
    beginGesture(e);
  }
  function startRotate(e, sel) {
    e.preventDefault(); select(sel);
    const it = getItem(sel); const r = stageRect();
    const cx = r.left + it.x * r.width, cy = r.top + it.y * r.height;
    gesture = { type: "rotate", sel, cx, cy, startAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI, startRot: it.rot || 0 };
    pushUndo(); gesture.pushed = true;
    beginGesture(e);
  }
  function beginGesture(e) {
    // A plain tap that only selects should NOT create an undo step; move gestures
    // push lazily on the first actual movement (see onGestureMove).
    window.addEventListener("pointermove", onGestureMove);
    window.addEventListener("pointerup", onGestureUp, { once: true });
  }
  function onGestureMove(e) {
    const g = gesture; if (!g) return;
    const it = getItem(g.sel); if (!it) return;
    const r = stageRect();
    if (g.type === "move") {
      if (!g.pushed) { pushUndo(); g.pushed = true; }
      g.moved = true;
      it.x = clamp((e.clientX - g.grabDX - r.left) / r.width, -0.2, 1.2);
      it.y = clamp((e.clientY - g.grabDY - r.top) / r.height, -0.2, 1.2);
    } else if (g.type === "resize") {
      const d = Math.hypot(e.clientX - g.cx, e.clientY - g.cy);
      it.scale = clamp(g.startScale * (d / Math.max(8, g.startDist)), 0.04, 2.0);
    } else if (g.type === "rotate") {
      const a = Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180 / Math.PI;
      it.rot = Math.round(g.startRot + (a - g.startAngle));
    }
    const el = itemEls.get(g.sel); if (el) positionEl(el, it, g.sel);
  }
  function onGestureUp(e) {
    window.removeEventListener("pointermove", onGestureMove);
    const g = gesture; gesture = null;
    if (!g) return;
    const it = getItem(g.sel);
    // Drag a MOVE item off the stage to delete it.
    if (g.type === "move" && it) {
      const r = stageRect();
      const off = e.clientX < r.left - 20 || e.clientX > r.right + 20 || e.clientY < r.top - 20 || e.clientY > r.bottom + 20;
      if (off) { deleteItem(g.sel); return; }
    }
    if (!g.moved && g.type === "move") { /* was a plain select/tap */ }
    updateUndoBtn();
  }

  /* ---- Tray → stage drag (props + abuela) ------------------------------- */
  function startTrayDrag(e, payload) {
    e.preventDefault();
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    const src = payload.kind === "prop" ? M.props.find(p => p.id === payload.id).src : M.poses[0].body;
    const w = payload.kind === "prop" ? 90 : 90;
    ghost.innerHTML = `<img src="${src}" style="width:${w}px">`;
    document.body.appendChild(ghost);
    const move = (ev) => { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; };
    move(e);
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      ghost.remove();
      const r = stageRect();
      const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      if (inside) {
        const x = clamp((ev.clientX - r.left) / r.width, 0, 1);
        const y = clamp((ev.clientY - r.top) / r.height, 0, 1);
        if (payload.kind === "prop") addProp(payload.id, x, y);
        else placeCharacter(x, y);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  /* ---- Deselect on empty stage tap ------------------------------------- */
  stage.addEventListener("pointerdown", (e) => {
    if (e.target === stage || e.target === bgImg || e.target === stageHint) { selected = null; syncProps(); syncCharacter(); }
  });

  /* ---- Caption input ---------------------------------------------------- */
  const capInput = $("#captionInput");
  let captionBaseline = null;   // whole-scene snapshot taken before an edit session
  capInput.addEventListener("focus", () => { captionBaseline = snapshot(); });
  capInput.addEventListener("blur", () => { captionBaseline = null; });
  capInput.addEventListener("input", () => {
    // Push the pre-typing snapshot exactly once per editing session so a single
    // Undo reverts the whole caption edit rather than one keystroke.
    if (captionBaseline !== null) {
      undoStack.push(captionBaseline);
      if (undoStack.length > UNDO_MAX) undoStack.shift();
      updateUndoBtn();
      captionBaseline = null;
    }
    scene.caption = capInput.value.slice(0, 80);
    if (capInput.value.length > 80) capInput.value = scene.caption;
    syncCaption();
  });

  /* ---- Export ----------------------------------------------------------- */
  async function exportPNG() {
    const bg = M.backgrounds.find(b => b.id === scene.background);
    const bgImgEl = await load(bg.src);
    const OUT_W = 2048, OUT_H = Math.round(OUT_W * 3 / 4);   // 4:3 @ 2x-ish
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W; canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");

    // 1. background (cover)
    drawCover(ctx, bgImgEl, OUT_W, OUT_H);

    // 2..5 props + character interleaved by z (drop order, adjustable)
    const renderables = [];
    scene.props.forEach(p => renderables.push({ z: p.z, kind: "prop", data: p }));
    if (scene.character) renderables.push({ z: scene.character.z, kind: "char", data: scene.character });
    renderables.sort((a, b) => a.z - b.z);

    for (const r of renderables) {
      if (r.kind === "prop") await drawProp(ctx, r.data, OUT_W, OUT_H);
      else await drawCharacter(ctx, r.data, OUT_W, OUT_H);
    }

    // 6. caption band
    drawCaption(ctx, OUT_W, OUT_H);

    // download
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url; a.download = "escena-abuela.png"; a.click();
    } catch (err) {
      alert("Export was blocked by the browser's canvas security policy.\n" +
            "This happens when opening index.html directly via file://.\n\n" +
            "Run a tiny local server instead, e.g.:\n    python3 -m http.server\n" +
            "then open http://localhost:8000/");
      console.error(err);
    }
  }
  function drawCover(ctx, img, W, H) {
    const ir = img.width / img.height, cr = W / H;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
    dx = (W - dw) / 2; dy = (H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  async function drawProp(ctx, p, W, H) {
    const def = M.props.find(d => d.id === p.id);
    const img = await load(def.src);
    const w = p.scale * W, h = w * (img.height / img.width);
    ctx.save();
    ctx.translate(p.x * W, p.y * H);
    ctx.rotate((p.rot || 0) * Math.PI / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  async function drawCharacter(ctx, c, W, H) {
    const pose = M.poses.find(p => p.id === c.pose);
    const srcs = [pose.body, pose.outfits[c.outfit], pose.faces[c.expression],
      ...c.acc.map(a => pose.accessories[a]).filter(Boolean)];
    const h = c.scale * H, w = h * (M.character.frameW / M.character.frameH);
    ctx.save();
    ctx.translate(c.x * W, c.y * H);
    ctx.rotate((c.rot || 0) * Math.PI / 180);
    for (const s of srcs) { const im = await load(s); ctx.drawImage(im, -w / 2, -h / 2, w, h); }
    ctx.restore();
  }
  function drawCaption(ctx, W, H) {
    const txt = scene.caption.trim();
    if (!txt) return;
    const bandH = H * 0.15, y0 = H - bandH;
    ctx.fillStyle = "rgba(20,16,12,0.62)";
    ctx.fillRect(0, y0, W, bandH);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // shrink-to-fit within two lines
    let size = Math.round(bandH * 0.42);
    const maxW = W * 0.92;
    const lines = () => wrapText(ctx, txt, maxW);
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    let ls = lines();
    while ((ls.length > 2 || ls.some(l => ctx.measureText(l).width > maxW)) && size > 12) {
      size -= 2; ctx.font = `700 ${size}px system-ui, sans-serif`; ls = lines();
    }
    const lh = size * 1.15;
    const startY = y0 + bandH / 2 - (ls.length - 1) * lh / 2;
    ls.slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lh));
  }
  function wrapText(ctx, text, maxW) {
    const words = text.split(/\s+/); const lines = []; let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ---- Wiring ----------------------------------------------------------- */
  function bindToolbar() {
    $("#undoBtn").addEventListener("click", undo);
    $("#exportBtn").addEventListener("click", exportPNG);
    $("#resetBtn").addEventListener("click", () => {
      if (!confirm("Clear the scene and start over?")) return;
      pushUndo(); scene = freshScene(); selected = null;
      itemEls.forEach(el => el.remove()); itemEls.clear();
      capInput.value = ""; syncAll();
    });
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      if ((e.key === "Delete" || e.key === "Backspace") && selected && document.activeElement === document.body) {
        e.preventDefault(); deleteItem(selected);
      }
    });
    window.addEventListener("resize", () => { syncProps(); syncCharacter(); fitCaption(); });
  }

  /* ---- Boot ------------------------------------------------------------- */
  function init() {
    buildBackgroundPicker();
    buildPropsTray();
    buildCharacterPanel();
    $("#abuelaCard").addEventListener("pointerdown", (e) => { if (!scene.character) startTrayDrag(e, { kind: "char" }); });
    bindToolbar();
    syncAll();
    updateUndoBtn();
    // Preload: current pose + all props + all backgrounds ahead of first interaction.
    Promise.all([
      preloadPose(M.poses[0].id),
      ...M.props.map(p => load(p.src)),
      ...M.backgrounds.map(b => load(b.src)),
    ]).catch(() => {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
