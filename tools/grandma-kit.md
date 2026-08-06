# How the layered "grandma" kit was made

The character in the Scene Builder's grandma poses is composited at runtime from
two uploaded sprite sheets in `public/`:

- `grandma-different poses.svg` — 4 **headless** body poses in a 2×2 grid
  (pointing, arms-up/yell, running, standing)
- `grandma-facialexpresssions.svg` — 4 **expression heads** in a 2×2 grid
  (happy, sad, angry, surprised)

Because the bodies are headless and the heads are separate, any expression can
sit on any pose — the registration-frame idea from the build spec.

## Extraction steps

1. **Split each 2×2 sheet into quadrants at the _path_ level.** Splitting by
   top-level `<g>` isn't enough: in the poses sheet the top two figures share a
   single group. Assigning each leaf path to a quadrant by its centre separates
   all four.
2. **Region-grow the bodies.** Starting from the largest path in a quadrant,
   repeatedly add paths whose bounding box is within ~14px, and keep only that
   connected cluster. This drops stray feet/hands that a neighbouring figure
   pokes across the quadrant line.
3. **Crop tight** and re-emit each piece as its own transparent SVG.
4. **Give bodies head-space.** Enlarge each body's `viewBox` upward so there's
   room for the head above the collar, then record a head anchor
   `{ cx, by, h }` — the face's centre-x, chin-y, and height as fractions of
   that frame.

## Where things live

- Cut-outs: `assets/abuela/grandma/body-*.svg` and `face-*.svg`
- Colored complete figure (used as the dock thumbnail and the "A color" pose):
  `assets/abuela/grandma/grandma-color.svg` (from `grandma-1.svg`)
- Tuned per-pose head anchors: the `head` field on each grandma pose in
  `assets/manifest.js`

At render time `js/app.js` stacks the chosen `face-*` over the headless
`body-*` at that pose's head anchor — for both the on-screen stage and the
canvas PNG export.
