# En la lucha — SVG frame animation

A calm, elegant **frame-by-frame** animation (a flipbook) built from SVG
illustrations. Each SVG is one frame; they play in order and loop.
No build tools, no npm, no server needed.

## How to run it

**Just double-click `index.html`** — it opens in your web browser and plays.

## Use your own illustrations

1. Put your `.svg` files into the **`svg/`** folder, named in play order,
   e.g. `frame-1.svg`, `frame-2.svg`, `frame-3.svg` …
2. Open **`index.html`** in a text editor and find the **`FRAMES`** list
   near the bottom. List your files in the order they should play:

   ```js
   const FRAMES = [
     'svg/frame-1.svg',
     'svg/frame-2.svg',
     'svg/frame-3.svg',
   ];
   ```

   Add or remove lines to match how many frames you have.

## Adjust the timing and feel

Two settings, both near the bottom of `index.html`:

```js
const FRAME_DURATION = 1400;   // how long each frame shows, in ms (1000 = 1s)
```

And in the `<style>` block:

```css
transition: opacity 1.2s ease-in-out;   /* the crossfade between frames */
```

- Bigger crossfade = softer, dreamier. Set it to `0s` for a hard
  "flipbook" cut instead.
- Change the background gradient at the top of `<style>`:

  ```css
  --sky-top:    #2a3550;
  --sky-bottom: #6d7f9e;
  ```

The placeholder frames (`svg/frame-1.svg` … `svg/frame-6.svg`) are just a
starting point — replace them with your own art whenever you're ready.
