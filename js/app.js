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
  const CHAR_PREVIEW = "public/abuela-preview.png"; // dock + drag-ghost thumbnail
  const imgCache = new Map();
  const natAR = new Map();   // src -> naturalWidth/naturalHeight, for on-stage sizing
  function load(src) {
    if (imgCache.has(src)) return imgCache.get(src);
    const p = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => { if (im.naturalHeight) natAR.set(src, im.naturalWidth / im.naturalHeight); res(im); };
      im.onerror = () => rej(new Error("failed: " + src));
      im.src = src;
    });
    imgCache.set(src, p);
    return p;
  }
  const poseById = (id) => M.poses.find(p => p.id === id);
  const mapVals = (o) => o ? Object.values(o) : [];
  const poseSrcs = (pose) => pose.art ? [pose.src]
    : [pose.body, ...mapVals(pose.faces), ...mapVals(pose.outfits), ...mapVals(pose.accessories)];
  function preloadPose(id) { const p = poseById(id); return p ? Promise.all(poseSrcs(p).map(load)) : Promise.resolve(); }
  // Aspect (w/h) of the character's pose: art cut-outs and the grandma poses
  // carry their own; the cartoon poses use the shared 800x1200 frame.
  const charAspect = (c) => { const p = poseById(c.pose); return (p && p.aspect) || (M.character.frameW / M.character.frameH); };

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
      b.className = "bg-btn"; b.type = "button"; b.dataset.id = bg.id;
      b.setAttribute("aria-pressed", String(bg.id === scene.background));
      b.innerHTML = `<img src="${bg.thumb}" alt=""><span class="text-sm">${bg.label}</span>`;
      b.addEventListener("click", () => setBackground(bg.id));
      tiles.appendChild(b);
    });
  }
  function buildPropsTray() {
    const grid = $("#propGrid");
    const count = $("#propCount"); if (count) count.textContent = M.props.length + " Items";
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
  // Pose row is static (all poses); the expression/outfit/accessory rows are
  // rebuilt from the SELECTED pose's available options (poses differ).
  function optionRow(id, keys, isMulti, onPick, isActive) {
    const row = document.createElement("div"); row.className = "opt-row"; row.id = id;
    keys.forEach(k => {
      const b = document.createElement("button");
      b.className = "opt"; b.type = "button"; b.dataset.id = k; b.textContent = M.labels[k] || k;
      b.setAttribute("aria-pressed", String(isActive(k)));
      b.addEventListener("click", () => onPick(k));
      row.appendChild(b);
    });
    return row;
  }
  const keysOf = (o) => o ? Object.keys(o) : [];
  function toggleSection(rowSel, show) { const r = $(rowSel); if (r) { const s = r.closest(".section"); if (s) s.style.display = show ? "" : "none"; } }
  function refreshControls() {
    const c = scene.character, p = c && poseById(c.pose);
    const fk = p ? keysOf(p.faces) : [], ok = p ? keysOf(p.outfits) : [], ak = p ? keysOf(p.accessories) : [];
    $("#exprRow").replaceWith(optionRow("exprRow", fk, false, setExpression, id => c && c.expression === id));
    $("#outfitRow").replaceWith(optionRow("outfitRow", ok, false, setOutfit, id => c && c.outfit === id));
    $("#accRow").replaceWith(optionRow("accRow", ak, true, toggleAccessory, id => c && c.acc.includes(id)));
    toggleSection("#exprRow", fk.length > 0);
    toggleSection("#outfitRow", ok.length > 0);
    toggleSection("#accRow", ak.length > 0);
  }
  function buildCharacterPanel() {
    const poseRow = document.createElement("div"); poseRow.className = "opt-row"; poseRow.id = "poseRow";
    M.poses.forEach(p => {
      const b = document.createElement("button");
      b.className = "opt"; b.type = "button"; b.dataset.id = p.id; b.textContent = p.label;
      b.addEventListener("click", () => setPose(p.id));
      poseRow.appendChild(b);
    });
    $("#poseRow").replaceWith(poseRow);
    refreshControls();
  }
  // Keep the character's expression/outfit/accessory valid for its pose.
  function reconcilePose(c) {
    const p = poseById(c.pose);
    const fk = keysOf(p && p.faces); if (fk.length && !fk.includes(c.expression)) c.expression = fk[0];
    const ok = keysOf(p && p.outfits); if (ok.length && !ok.includes(c.outfit)) c.outfit = ok[0];
    const ak = keysOf(p && p.accessories); c.acc = (c.acc || []).filter(a => ak.includes(a));
  }

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
      pose: M.poses[0].id, outfit: null, expression: null, acc: [] };
    reconcilePose(scene.character);
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
  const setPose       = (id) => charEdit(c => { c.pose = id; reconcilePose(c); });
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
    if (bg) bgImg.src = bg.src;   // square crop + top anchor handled in CSS
  }
  function positionEl(el, it, sel) {
    const w = stage.clientWidth, h = stage.clientHeight;
    let pxW, pxH;
    if (sel === "char") { pxH = it.scale * h; pxW = pxH * charAspect(it); }
    else {
      const def = M.props.find(d => d.id === it.id);
      const ar = (def && natAR.get(def.src)) || 1;   // preserve the prop's own shape
      pxW = it.scale * w; pxH = pxW / ar;
    }
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
    const pose = poseById(c.pose);
    const layers = el.querySelector(".char-layers");
    layers.innerHTML = "";
    const full = (src) => { const im = document.createElement("img"); im.src = src; im.alt = ""; im.className = "layer-full"; layers.appendChild(im); };
    if (pose.art) {
      full(pose.src);
    } else {
      full(pose.body);                                            // headless/base body
      if (pose.outfits && pose.outfits[c.outfit]) full(pose.outfits[c.outfit]);
      if (pose.faces && pose.faces[c.expression]) {
        if (pose.head) {                                          // head anchored over the collar
          const im = document.createElement("img"); im.src = pose.faces[c.expression]; im.alt = ""; im.className = "layer-head";
          const h = pose.head;
          im.style.height = (h.h * 100) + "%";
          im.style.left = (h.cx * 100) + "%";
          im.style.top = ((h.by - h.h) * 100) + "%";
          layers.appendChild(im);
        } else full(pose.faces[c.expression]);                   // full-frame registration
      }
      if (pose.accessories) c.acc.forEach(a => { if (pose.accessories[a]) full(pose.accessories[a]); });
    }
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
    $$("#bgTiles .bg-btn").forEach(t => t.setAttribute("aria-pressed", String(t.dataset.id === scene.background)));
    const c = scene.character;
    setPressed("#poseRow", c && c.pose);
    refreshControls();                       // rebuild expr/outfit/acc rows for the current pose
    // empty-state dimming
    $(".character").classList.toggle("disabled", !scene.character);
    // fixed-art pose (single fused image): show the explanatory note
    const artPose = !!c && !!poseById(c.pose).art;
    $(".character").classList.toggle("art-pose", artPose);
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
    const src = payload.kind === "prop" ? M.props.find(p => p.id === payload.id).src : CHAR_PREVIEW;
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

  /* ---- Export ----------------------------------------------------------- */
  async function exportPNG() {
    const bg = M.backgrounds.find(b => b.id === scene.background);
    const bgImgEl = await load(bg.src);
    // Export as a square (matches the square stage).
    const OUT_W = bgImgEl.naturalWidth || bgImgEl.width || 1600;
    const OUT_H = OUT_W;
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W; canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");

    // 1. background — fill the square, anchored to the top (crop the bottom).
    drawCoverTop(ctx, bgImgEl, OUT_W, OUT_H);

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
      a.href = url; a.download = "la-escena-scene.png"; a.click();
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
  function drawContain(ctx, img, W, H) {
    const ir = img.width / img.height, cr = W / H;
    let dw, dh;
    if (ir > cr) { dw = W; dh = W / ir; } else { dh = H; dw = H * ir; }
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  // Cover the frame, anchored to the TOP: a too-tall image keeps its top and
  // loses its bottom; a too-wide image is centred horizontally.
  function drawCoverTop(ctx, img, W, H) {
    const ir = img.width / img.height, cr = W / H;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = H; dw = H * ir; dx = (W - dw) / 2; dy = 0; }
    else         { dw = W; dh = W / ir; dx = 0;           dy = 0; }
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
    const pose = poseById(c.pose);
    const h = c.scale * H, w = h * charAspect(c);
    const drawFull = async (src) => { const im = await load(src); ctx.drawImage(im, -w / 2, -h / 2, w, h); };
    ctx.save();
    ctx.translate(c.x * W, c.y * H);
    ctx.rotate((c.rot || 0) * Math.PI / 180);
    if (pose.art) {
      await drawFull(pose.src);
    } else {
      await drawFull(pose.body);
      if (pose.outfits && pose.outfits[c.outfit]) await drawFull(pose.outfits[c.outfit]);
      if (pose.faces && pose.faces[c.expression]) {
        if (pose.head) {                                       // head anchored over the collar
          const im = await load(pose.faces[c.expression]);
          const fh = pose.head.h * h, fw = fh * (im.naturalWidth / im.naturalHeight || 1);
          const fcx = -w / 2 + pose.head.cx * w, chin = -h / 2 + pose.head.by * h;
          ctx.drawImage(im, fcx - fw / 2, chin - fh, fw, fh);
        } else await drawFull(pose.faces[c.expression]);
      }
      if (pose.accessories) for (const a of c.acc) { if (pose.accessories[a]) await drawFull(pose.accessories[a]); }
    }
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
      syncAll();
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
