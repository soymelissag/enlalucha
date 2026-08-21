/* ============================================================================
 * Scene Builder asset manifest.
 *
 * Everything the app renders is driven from here — the pickers, the layer
 * stack, and the export all read this object. Adding a background, prop,
 * pose, outfit, expression, or accessory means editing THIS file and dropping
 * the matching image into assets/. No code changes.
 *
 * Loaded as a plain script (window.SCENE_MANIFEST) instead of fetched JSON so
 * the app also runs by double-clicking index.html over file:// with no server.
 *
 * NOTE ON LABELS: the build sketch was ambiguous on a few names. The choices
 * below (third background "Fiesta"; outfits Vestido/Delantal/Bata; the five
 * accessories) are assumptions — swap the `label` strings freely.
 *
 * Character layers all share ONE 800x1200 registration frame with the figure
 * in the same place, so body + outfit + face + accessory line up by stacking
 * at the same x/y/size. See tools/gen_assets.py.
 * ==========================================================================*/
window.SCENE_MANIFEST = {
  character: { frameW: 800, frameH: 1200 },

  backgrounds: [
    { id: "tower",  label: "Tower",   src: "public/tower.png",  thumb: "public/tower.png" },
    { id: "lasala", label: "La Sala", src: "public/lasala.png", thumb: "public/lasala.png" },
    { id: "beach",  label: "Beach",   src: "public/beach.png",  thumb: "public/beach.png" },
  ],

  // defaultScale = fraction of stage width the prop spans when first dropped.
  props: [
    { id: "chancla", label: "Sandal", src: "assets/props/chancla.svg", defaultScale: 0.16 },
    { id: "cactus",  label: "Cactus",  src: "assets/props/cactus.svg",  defaultScale: 0.18 },
    { id: "planta",  label: "Plant",  src: "assets/props/planta.svg",  defaultScale: 0.18 },
    { id: "tele",    label: "TV",    src: "assets/props/tele.svg",    defaultScale: 0.22 },
    { id: "radio",   label: "Radio",   src: "assets/props/radio.svg",   defaultScale: 0.20 },
    { id: "cafe",    label: "Coffee",    src: "assets/props/cafe.svg",    defaultScale: 0.14 },
    { id: "perro",   label: "Dog",   src: "assets/props/perro.svg",   defaultScale: 0.22 },
    { id: "olla",    label: "Pot",    src: "assets/props/olla.svg",    defaultScale: 0.18 },
    { id: "bandera", label: "Flag", src: "assets/props/bandera.svg", defaultScale: 0.18 },
  ],

  // Human labels for every expression / outfit / accessory id used by any pose.
  // The expression/outfit/accessory pickers are rebuilt per selected pose from
  // that pose's available keys, so different poses can offer different options.
  labels: {
    // expressions
    feliz: "Happy", triste: "Sad", enojada: "Angry", sorprendida: "Surprised", seria: "Serious",
    // outfits
    vestido: "Dress", delantal: "Apron", bata: "Robe",
    // accessories
    lentes: "Glasses", aretes: "Earrings", rosario: "Rosary", tubos: "Curlers", panuelo: "Headscarf",
  },

  /* Poses come in three flavours the renderer understands:
   *  - LAYERED + head anchor (the grandma line-art kit): a headless `body` plus
   *    a `faces` map; `head` places the chosen face over the collar. Cropped
   *    from grandma-different-poses.svg + grandma-facialexpresssions.svg.
   *      head = { cx, by, h } as fractions of the body frame:
   *        cx = face centre x, by = chin/neck y, h = face height.
   *  - ART (`art:true`, single `src`): one fused image, no sub-controls.
   *  - LAYERED full-frame (the cartoon placeholder): body/outfit/face/accessory
   *    all share one 800x1200 registration frame.
   * `aspect` = width / height of the pose's frame, for sizing on the stage.
   */
  poses: [
    // ---- The grandma line-art kit: 4 poses x 4 expressions -----------------
    { id: "parada", label: "Standing", body: "assets/abuela/grandma/body-parada.svg", aspect: 0.4436,
      head: { cx: 0.5000, by: 0.4172, h: 0.3999 },
      faces: { feliz: "assets/abuela/grandma/face-feliz.svg", triste: "assets/abuela/grandma/face-triste.svg", enojada: "assets/abuela/grandma/face-enojada.svg", sorprendida: "assets/abuela/grandma/face-sorprendida.svg" } },
    { id: "senala", label: "Pointing", body: "assets/abuela/grandma/body-senala.svg", aspect: 0.5242,
      head: { cx: 0.5938, by: 0.3942, h: 0.3778 },
      faces: { feliz: "assets/abuela/grandma/face-feliz.svg", triste: "assets/abuela/grandma/face-triste.svg", enojada: "assets/abuela/grandma/face-enojada.svg", sorprendida: "assets/abuela/grandma/face-sorprendida.svg" } },
    { id: "grita", label: "Yelling", body: "assets/abuela/grandma/body-grita.svg", aspect: 0.4858,
      head: { cx: 0.5000, by: 0.3681, h: 0.3529 },
      faces: { feliz: "assets/abuela/grandma/face-feliz.svg", triste: "assets/abuela/grandma/face-triste.svg", enojada: "assets/abuela/grandma/face-enojada.svg", sorprendida: "assets/abuela/grandma/face-sorprendida.svg" } },
    { id: "corre", label: "Running", body: "assets/abuela/grandma/body-corre.svg", aspect: 0.5728,
      head: { cx: 0.5376, by: 0.4132, h: 0.3961 },
      faces: { feliz: "assets/abuela/grandma/face-feliz.svg", triste: "assets/abuela/grandma/face-triste.svg", enojada: "assets/abuela/grandma/face-enojada.svg", sorprendida: "assets/abuela/grandma/face-sorprendida.svg" } },

    // ---- Fixed full illustrations (single fused image) ---------------------
    { id: "color",    label: "Color",      art: true, src: "assets/abuela/grandma/grandma-color.svg", aspect: 0.589 },
    { id: "depie",    label: "Painted",       art: true, src: "assets/abuela/real/depie.svg",    aspect: 0.294 },
    { id: "andadera", label: "Walker", art: true, src: "assets/abuela/real/andadera.svg", aspect: 0.564 },
    {
      id: "stand", label: "Stand", body: "assets/abuela/stand/body.svg",
      faces:       { feliz: "assets/abuela/stand/face-feliz.svg", seria: "assets/abuela/stand/face-seria.svg", sorprendida: "assets/abuela/stand/face-sorprendida.svg" },
      outfits:     { vestido: "assets/abuela/stand/outfit-vestido.svg", delantal: "assets/abuela/stand/outfit-delantal.svg", bata: "assets/abuela/stand/outfit-bata.svg" },
      accessories: { lentes: "assets/abuela/stand/acc-lentes.svg", aretes: "assets/abuela/stand/acc-aretes.svg", rosario: "assets/abuela/stand/acc-rosario.svg", tubos: "assets/abuela/stand/acc-tubos.svg", panuelo: "assets/abuela/stand/acc-panuelo.svg" },
    },
    {
      id: "yell", label: "Yell", body: "assets/abuela/yell/body.svg",
      faces:       { feliz: "assets/abuela/yell/face-feliz.svg", seria: "assets/abuela/yell/face-seria.svg", sorprendida: "assets/abuela/yell/face-sorprendida.svg" },
      outfits:     { vestido: "assets/abuela/yell/outfit-vestido.svg", delantal: "assets/abuela/yell/outfit-delantal.svg", bata: "assets/abuela/yell/outfit-bata.svg" },
      accessories: { lentes: "assets/abuela/yell/acc-lentes.svg", aretes: "assets/abuela/yell/acc-aretes.svg", rosario: "assets/abuela/yell/acc-rosario.svg", tubos: "assets/abuela/yell/acc-tubos.svg", panuelo: "assets/abuela/yell/acc-panuelo.svg" },
    },
    {
      id: "run", label: "Run", body: "assets/abuela/run/body.svg",
      faces:       { feliz: "assets/abuela/run/face-feliz.svg", seria: "assets/abuela/run/face-seria.svg", sorprendida: "assets/abuela/run/face-sorprendida.svg" },
      outfits:     { vestido: "assets/abuela/run/outfit-vestido.svg", delantal: "assets/abuela/run/outfit-delantal.svg", bata: "assets/abuela/run/outfit-bata.svg" },
      accessories: { lentes: "assets/abuela/run/acc-lentes.svg", aretes: "assets/abuela/run/acc-aretes.svg", rosario: "assets/abuela/run/acc-rosario.svg", tubos: "assets/abuela/run/acc-tubos.svg", panuelo: "assets/abuela/run/acc-panuelo.svg" },
    },
  ],
};
