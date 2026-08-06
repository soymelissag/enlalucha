# En la lucha — Scene Builder

A single-screen **scene builder**. Pick a background, drag props onto the
stage, drop **Abuela** in, then customize her pose, expression, outfit, and
accessories. Add a caption and export the result as a PNG.

Everything visual is a flat, transparent image composited on one 4:3 stage.
No build tools, no npm. The placeholder art is generated as self-contained
SVGs so the app runs with zero external assets — swap in illustrated PNGs
whenever the real art is ready (see [Assets](#assets)).

> The interactive **"painter's studio" diorama** lives at
> [`diorama.html`](diorama.html).

## Run it

Export writes to a `<canvas>`, and browsers block reading a canvas that was
painted with images loaded over `file://`. So for a **reliable Export**, serve
the folder over a tiny local server:

```bash
python3 -m http.server
# then open http://localhost:8000/
```

Everything except Export (backgrounds, props, character, caption) also works
by simply double-clicking `index.html`.

## What it does

- **Background** — three tiles under "Select a Background"; click to swap instantly.
- **Props** — a 3×3 tray; drag onto the stage. Once placed, a prop can be moved,
  resized, rotated, sent forward/back, and deleted (drag it off-stage or tap ✕).
  The same prop can be added many times.
- **Abuela** — drag her from the dock onto the stage (one instance). The
  **Pose** picker offers two **real painted abuelas** cut out from the
  illustrations in `public/` (*De pie*, *Con andadera*) plus three
  **customizable cartoon** poses (*Stand / Yell / Run*). Real poses are one
  fused image, so the **Expression / Outfit / Accessory** controls dim for
  them; on a cartoon pose those controls swap layers live. Changing a pose
  keeps her position and size — only the artwork swaps.
- **Caption** — types live into a band pinned across the bottom 15% of the
  stage (part of the exported image), capped at 80 chars and auto-shrunk.
- **Export** — composites the stage to a PNG at 2048×1536 and downloads it.
- **Undo** — ↶ button or `Ctrl/Cmd+Z` (25 levels).

Interactions use the **Pointer Events API**, so drag works on touch and mouse
through one code path. Scene content is stored in **percentages** of the stage,
never pixels, so it survives resizing and exports at any resolution.

## How the layers stack

The stack, bottom to top:

```
1. background        (fills the stage)
2. props             (z-ordered by drop sequence, adjustable)
3. character body/outfit
4. character face
5. character accessories
6. caption band
```

### Registration frame (the important bit)

Every character layer — body, outfit, face, each accessory — is drawn on the
**same 800×1200 artboard with the figure in the same place** and transparency
everywhere else. Compositing is then trivial: stack all layers at the same
x/y/size and they line up *by construction*. No per-combination pixel nudging.

This is why 3 poses × 3 outfits × 3 expressions × 5 accessories is **36 layer
assets**, not 135 flat combinations.

## Assets

Everything is driven by one manifest — [`assets/manifest.js`](assets/manifest.js).
Adding a background, prop, pose, outfit, expression, or accessory means editing
that file and dropping in the image. **No code changes.**

The placeholder art is produced by [`tools/gen_assets.py`](tools/gen_assets.py):

```bash
python3 tools/gen_assets.py     # regenerates everything under assets/
```

To use real illustrations, export each character layer from one master
artboard at identical dimensions with a transparent background, drop the files
into `assets/`, and point the manifest at them.

> **Labels marked as assumptions** (the sketch was ambiguous): the third
> background is **Fiesta**; outfits are **Vestido / Delantal / Bata**;
> accessories are **Lentes / Aretes / Rosario / Tubos / Pañuelo**. Change the
> `label` strings in the manifest freely.

## Files

```
index.html            the scene builder
css/styles.css        layout & chrome
js/app.js             renderer, drag/transform, undo, export
assets/manifest.js    single source of truth for all assets
assets/…              generated backgrounds, props, character layers
tools/gen_assets.py   placeholder-art generator
diorama.html          the interactive "painter's studio" diorama
```
