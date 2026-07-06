# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Virtual Temple — a single-page React app that simulates a personal home altar/puja (Hindu worship) experience: onboarding, placing deity idols on an altar, lighting incense/diyas, and offering garlands. All state is local to the browser (localStorage) — there is no backend.

## Commands

- `npm run dev` — start Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`) then production build via Vite
- `npm run lint` — run Oxlint (config in `.oxlintrc.json`)
- `npm run preview` — preview the production build

There is no test runner configured in this project.

## Architecture

- **State**: `src/useTempleStore.ts` is the single hook owning all app state (`UserProfile` and `TempleState`). It persists to `localStorage` under keys `vt-user-v2` / `vt-state-v2`, and runs a 30s interval tick that expires diyas/incense after a 3-hour window (`THREE_HOURS`). `App.tsx` calls this hook once and threads the returned state/actions down as props — there is no context provider or external state library.
- **Data model**: `src/types.ts` defines the shapes; `src/data.ts` holds the static content — the list of deities (`IDOLS`). Adding a new deity is just an entry in `data.ts`; components look them up by id (e.g. `IDOLS.find(i => i.id === placed.idolId)`).
- **Flow**: `App.tsx` shows `OnboardingWizard` (a 4-step wizard: login → temple name → choose idols → review) when there's no user or when guided re-setup is triggered. Otherwise it renders a header with a tab bar (`Page` union type in `App.tsx`) switching between pages: **Temple**, **3D Mandir**, and **Customize** (`CustomizePage` — rename devotee/temple, add/remove deities).
- **Shared 3D scene**: `MandirScene.tsx` holds everything that renders inside a react-three-fiber `<Canvas>` — sky/fog, lights, the shape-following `Sanctum` enclosure, `TempleHall` preset, floor meshes, murtis, and decorations — parameterized by a `Layout3D` + `placedIdols` and optional interaction callbacks (`onItemDown`, `onFloorMove/Up`). Two consumers wrap it: **`Temple3D.tsx`** (the 3D Mandir page: toolbars, layout-editing state, OrbitControls, drag-to-move) and **`MandirViewport.tsx`** (a fixed front-camera, non-orbiting view embedded in the Temple page where tapping a murti offers a garland). Both lazy-load, so three.js stays out of the main bundle in one shared chunk.
- **Temple page**: `TempleAltar.tsx` is the whole page and owns every puja interaction in-scene (no button panels): clickable hanging bells (Web Audio chime), a puja table whose items light the agarbatti/deepam and offer garlands via the store actions, and a two-tap-to-confirm reset. The deity area is the live `MandirViewport` — a real 3D front view of the user's built mandir (there are no 2D deity cards).
- **3D layout model**: everything the user builds lives in one `Layout3D` object (`src/layout3d.ts`) persisted under localStorage `vt-3d-v1`: murti `positions`/`rotations` (keyed by `instanceId`, decor keyed `decor:<id>`), a `decor` list, `floor` (shape: circle/square/hex × size via `FLOOR_RADII`), `hall`, and `room`. `Temple3D` edits it; `MandirViewport` re-reads it fresh on each mount (tab switches remount). Placed deities come from the shared store; adding/removing a murti in 3D mutates temple-wide state via `onAddIdol`/`onRemoveIdol`. Dragging works by pointer-move raycasts against the floor mesh, clamped by `clampToFloor` to the current shape/size.
- **Deity 3D models**: real `.glb` models live in `src/assets` and are mapped per-deity in `DEITY_MODELS` in `MandirScene.tsx`; deities without an entry get the procedural `StatueBody`. To give a deity a real model: drop the `.glb` in assets, import it with a `?url` suffix (typed by `src/glb.d.ts`), and add one `DEITY_MODELS` entry — `DeityModel` auto-scales it to murti height and seats it on the pedestal via its bounding box, with the procedural statue as the Suspense fallback while it streams (the GLBs are tens of MB and ship with the build).
- **Pages**: When creating a new page component, ALWAYS add a link to it in the header — extend the `Page` union type in `App.tsx`, add a `TabButton` in the header nav row, and render the page in the page-switch block. The header tab bar is the app's only navigation; a page without a tab is unreachable.
- **Visual style**: No design system/component library — every component hand-rolls its look with inline `style` objects (radial/linear gradients, box-shadows) layered on top of Tailwind utility classes for layout. The app shell and Temple page use a marble-white/gold/silver theme; the recurring colors are repeated inline rather than tokenized: gold `#b8860b` (active/sacred), silver-grey `#8b8f98` (quiet labels), deep engraved gold `#6b5312` (headings), silver borders `rgba(176,180,190,…)`. The 3D scene is the exception — a dusk-purple night sky with warm lighting over white-marble architecture. Custom CSS keyframe animations (smoke, flicker, glow-pulse, bell-ring, garland-drop, breathe, etc.) live in `src/index.css` and are applied via class names like `.flame`, `.glow-anim`, `.breathe`. `DeityPhoto.tsx` is the shared "framed portrait" component used where a deity appears in 2D chrome (onboarding, customize page); it renders hand-drawn SVG portraits from `DeityArt.tsx` (keyed by idol id, emoji fallback for unknown deities). Note: `OnboardingWizard` and `CustomizePage` still carry the older dark-amber styling. Fonts are Google Fonts `Cinzel` / `Cinzel Decorative`, loaded in `index.html`.
- **Audio**: `TempleAltar.tsx` synthesizes the ghanta (bell) chime via the Web Audio API — no audio files anywhere in the app.
- **Build tooling**: Vite 8 + `@vitejs/plugin-react` + `@tailwindcss/vite` (Tailwind v4, no separate config file — configured via the Vite plugin and `@import "tailwindcss"` in `index.css`). Linting is Oxlint, not ESLint.
