# Swapping in Your Own Logo

HackMate's branding is wired through **one file**: `public/logo.svg`.

The header emblem, the footer mark, the login-page brand and the browser
favicon all render that same asset (the favicon is declared as
`icons: { icon: "/logo.svg" }` in `src/app/layout.tsx`), so replacing
your logo is a single-file operation.

## The quick swap (30 seconds)

1. Put your logo at `public/logo.svg` (overwrite the file).
2. Hard-refresh the browser (`Ctrl+Shift+R`). Header, footer, login page
   and favicon all update. Done.

## If your logo is a PNG (or you have several sizes)

Next.js file-convention favicons win automatically when present, so:

1. Copy your image(s) into `src/app/`:
   - `src/app/icon.svg` — vector favicon (or)
   - `src/app/icon.png`, `icon-192.png`, `icon-512.png` — raster favicons
     (Next.js sizes them for browsers/touch devices automatically)
2. If you add files under `src/app/`, **remove** the `icons` block from
   the `metadata` export in `src/app/layout.tsx` (Next.js picks up the
   file-convention icons on its own, and explicit metadata would
   duplicate the tag).
3. For the in-app marks, either:
   - keep an SVG at `public/logo.svg` and let the `Logo` component
     render it (recommended — it scales to every size the app uses:
     36px header, 24px footer, 44px login), or
   - edit `src/components/shared/logo.tsx` to point at your PNG:
     change `src="/logo.svg"` to your file and adjust `width`/`height`.

## Design notes (so it matches the theme)

- The app is **dark-first** (ink-black canvas). A mark with a dark tile
  background + light/jade artwork reads best; a pure-black silhouette
  will disappear on the login page.
- Corners everywhere are 16px (`--radius`); if your mark is a squircle
  tile, an inner radius of ~25% matches the app's rounding.
- The accent is jade green `oklch(0.71 0.15 158)` ≈ `#2ee27e` on dark,
  `oklch(0.52 0.11 158)` ≈ `#12915d` on light.
- Keep the SVG's `viewBox` square (e.g. `0 0 64 64`); the `Logo`
  component renders it with `object-contain`, so any square ratio works.
- The favicon is read from the same SVG at 16-32px — make sure the mark
  is still legible when tiny (bold shapes, high contrast).

## Optional: a real 3D emblem (Spline)

The stock Spline "robot" scene has been removed from the project. The
`SplineObject` component (`src/components/ui/spline-object.tsx`) is still
available if you want a live 3D emblem somewhere:

1. Author or pick a scene at spline.design and export/publish it.
2. Add to `.env.local`:
   `NEXT_PUBLIC_SPLINE_SCENE_URL=https://prod.spline.design/<id>/scene.splinecode`
3. Drop `<SplineObject width={36} height={36} />` wherever you want it
   (e.g. back into the navbar brand slot).

Without that env var the component renders an animated breathing ink orb
(pure CSS, no network) instead of loading the Spline runtime.
