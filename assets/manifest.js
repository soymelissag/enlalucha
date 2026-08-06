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
    { id: "beach",  label: "Beach",  src: "assets/bg/beach.svg",  thumb: "assets/bg/beach.svg" },
    { id: "home",   label: "Home",   src: "assets/bg/home.svg",   thumb: "assets/bg/home.svg" },
    { id: "fiesta", label: "Fiesta", src: "assets/bg/fiesta.svg", thumb: "assets/bg/fiesta.svg" },
  ],

  // defaultScale = fraction of stage width the prop spans when first dropped.
  props: [
    { id: "chancla", label: "Chancla", src: "assets/props/chancla.svg", defaultScale: 0.16 },
    { id: "cactus",  label: "Cactus",  src: "assets/props/cactus.svg",  defaultScale: 0.18 },
    { id: "planta",  label: "Planta",  src: "assets/props/planta.svg",  defaultScale: 0.18 },
    { id: "tele",    label: "Tele",    src: "assets/props/tele.svg",    defaultScale: 0.22 },
    { id: "radio",   label: "Radio",   src: "assets/props/radio.svg",   defaultScale: 0.20 },
    { id: "cafe",    label: "Café",    src: "assets/props/cafe.svg",    defaultScale: 0.14 },
    { id: "perro",   label: "Perro",   src: "assets/props/perro.svg",   defaultScale: 0.22 },
    { id: "olla",    label: "Olla",    src: "assets/props/olla.svg",    defaultScale: 0.18 },
    { id: "bandera", label: "Bandera", src: "assets/props/bandera.svg", defaultScale: 0.18 },
  ],

  // Shared vocab so the pickers render from one source of truth even though
  // each pose stores its own per-pose file for every variant.
  outfitOptions:     [
    { id: "vestido", label: "Vestido" },
    { id: "delantal", label: "Delantal" },
    { id: "bata", label: "Bata" },
  ],
  expressionOptions: [
    { id: "feliz", label: "Feliz" },
    { id: "seria", label: "Seria" },
    { id: "sorprendida", label: "Sorprendida" },
  ],
  accessoryOptions:  [
    { id: "lentes", label: "Lentes" },
    { id: "aretes", label: "Aretes" },
    { id: "rosario", label: "Rosario" },
    { id: "tubos", label: "Tubos" },
    { id: "panuelo", label: "Pañuelo" },
  ],

  poses: [
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
