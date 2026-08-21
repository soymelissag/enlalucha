/* ============================================================================
 * Scene Builder asset manifest.
 *
 * Everything the app renders is driven from here — the pickers, the layer
 * stack, and the export all read this object. Adding a background, prop,
 * pose, dress colour (outfit), or expression means editing THIS file and
 * dropping the matching image into public/. No code changes.
 *
 * Loaded as a plain script (window.SCENE_MANIFEST) instead of fetched JSON so
 * the app also runs by double-clicking index.html over file:// with no server.
 *
 * Abuela is a headless coloured body (Red / Yellow) with a face placed over
 * the collar via `head:{cx,by,h}` (fractions of the body frame). `_empty.png`
 * is a transparent base so the colour is chosen as an "outfit" overlay.
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
    { id: "bullhorn", label: "Bullhorn",   src: "public/Bullhorn.png",       defaultScale: 0.15 },
    { id: "sign",     label: "Sign",       src: "public/Sign.png",           defaultScale: 0.18 },
    { id: "birdcage", label: "Bird Cage",  src: "public/Bird Cage.png",      defaultScale: 0.16 },
    { id: "bird",     label: "Bird",       src: "public/Bird.png",           defaultScale: 0.08 },
    { id: "crate",    label: "Crate",      src: "public/Crate.png",          defaultScale: 0.20 },
    { id: "radio",    label: "Radio",      src: "public/Radio.png",          defaultScale: 0.16 },
    { id: "cafe",     label: "Café",       src: "public/Cafe with Cups.png", defaultScale: 0.14 },
    { id: "cafetera", label: "Coffee Pot", src: "public/Cafetera 2.png",     defaultScale: 0.13 },
    { id: "vase",     label: "Vase",       src: "public/Vase.png",           defaultScale: 0.10 },
    { id: "frames1",  label: "Frames",     src: "public/Frames 1.png",       defaultScale: 0.13 },
    { id: "frames2",  label: "Frame",      src: "public/Frames 2.png",       defaultScale: 0.12 },
    { id: "box",      label: "Box",        src: "public/Small Box.png",      defaultScale: 0.10 },
  ],

  // Human labels for the dress colours (outfits) and the expressions.
  labels: {
    red: "Red", yellow: "Yellow",
    normal: "Normal", happy: "Happy", sad: "Sad", mad: "Mad",
  },

  /* Abuela poses. Each is a transparent base body + the chosen colour drawn as
   * an "outfit" overlay + a face placed over the collar (`head` anchor, as
   * fractions of the body frame). `aspect` = width/height of the coloured body
   * image, used to size the figure on the stage. */
  poses: [
    { id: "standing", label: "Standing", body: "public/_empty.png", aspect: 0.451,
      head: { cx: 0.49, by: 0.11, h: 0.22 },
      outfits: { red: "public/Red - Standing.png", yellow: "public/Yellow - Standing.png" },
      faces:   { normal: "public/Face Normal.png", happy: "public/Face Happy.png", sad: "public/Face Sad.png", mad: "public/Face Mad.png" } },
    { id: "pointing", label: "Pointing", body: "public/_empty.png", aspect: 0.727,
      head: { cx: 0.61, by: 0.15, h: 0.20 },
      outfits: { red: "public/Red - Pointing.png", yellow: "public/Yellow - Pointing.png" },
      faces:   { normal: "public/Face Normal.png", happy: "public/Face Happy.png", sad: "public/Face Sad.png", mad: "public/Face Mad.png" } },
    { id: "running", label: "Running", body: "public/_empty.png", aspect: 0.836,
      head: { cx: 0.53, by: 0.13, h: 0.22 },
      outfits: { red: "public/Red - Running.png", yellow: "public/Yellow - Running.png" },
      faces:   { normal: "public/Face Normal.png", happy: "public/Face Happy.png", sad: "public/Face Sad.png", mad: "public/Face Mad.png" } },
    { id: "armsup", label: "Arms Up", body: "public/_empty.png", aspect: 0.606,
      head: { cx: 0.50, by: 0.31, h: 0.18 },
      outfits: { red: "public/Red - Arms Up.png", yellow: "public/Yellow - Arms Up.png" },
      faces:   { normal: "public/Face Normal.png", happy: "public/Face Happy.png", sad: "public/Face Sad.png", mad: "public/Face Mad.png" } },
  ],
};
