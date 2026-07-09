# 🛕 Virtual Temple

A personal home altar (puja) experience in the browser. Set up your own mandir, invite deities, light the deepam and agarbatti, ring the ghanta, offer garlands — and build your temple in full 3D, modelled on a traditional carved wooden home mandir.

Everything runs locally in your browser — there is no backend, no account, no network calls. Your temple is saved in `localStorage`.

## Features

- **Onboarding wizard** — enter your name, name your temple, choose your deities.
- **Temple page** — a marble altar with a live 3D front view of your mandir: clickable hanging bells (synthesized ghanta chime), a puja table to light the agarbatti and deepam (each burns for 3 hours, with live countdowns), and tap-a-murti to offer a garland.
- **3D Mandir page** — build your own temple: choose the floor shape and size, toggle the carved **Wood Mandir** shrine / room cover / pillared temple hall, drag murtis and decor (diyas, pillars, flowers, rangoli) into place, rotate and remove them, and orbit the scene.
- **Deity models** — Shiva and Ganesha have real `.glb` 3D models; other deities get hand-built procedural statues with recognizable emblems (Krishna's flute, Hanuman's gada, Ram's bow…).
- **Customize page** — rename yourself or the temple, add/remove deities, or re-run guided setup.

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | [React 19](https://react.dev/) with TypeScript 6 |
| Build tool | [Vite 8](https://vite.dev/) + `@vitejs/plugin-react` |
| 3D rendering | [three.js](https://threejs.org/) via [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) (React renderer) and [@react-three/drei](https://docs.pmnd.rs/drei) helpers (`Stars`, `Html`, `useGLTF`, `OrbitControls`, `Environment`) — soft shadows, procedural environment reflections, and bloom/vignette via [@react-three/postprocessing](https://docs.pmnd.rs/react-postprocessing) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) (via `@tailwindcss/vite`) for layout + hand-rolled inline styles and custom CSS keyframe animations for the temple look |
| Fonts | Google Fonts — Cinzel / Cinzel Decorative |
| Audio | Web Audio API (the bell chime is synthesized in code — no audio files) |
| State & persistence | A single custom React hook (`useTempleStore`) persisting to `localStorage`; no state library, no backend |
| Linting | [Oxlint](https://oxc.rs/) |
| 3D assets | `.glb` deity models in `src/assets`, loaded with `useGLTF` and auto-scaled to the pedestal |

## Getting started

```bash
npm install
npm run dev      # start the dev server (Vite, HMR)
```

Other scripts:

```bash
npm run build    # type-check (tsc -b) + production build
npm run preview  # preview the production build
npm run lint     # run Oxlint
```

## Project structure

```
src/
  App.tsx                    # header, tab navigation, page switch
  useTempleStore.ts          # all app state + localStorage persistence + 3h burn timers
  types.ts / data.ts         # data model + the deity list
  layout3d.ts                # persisted 3D layout model (floor, structures, positions)
  components/
    OnboardingWizard.tsx     # 4-step first-run setup
    TempleAltar.tsx          # Temple page: altar, bells, puja table, live 3D front view
    MandirScene.tsx          # shared 3D scene: lights, architecture, murtis, decor
    Temple3D.tsx             # 3D Mandir page: toolbars, drag/rotate editing, orbit camera
    MandirViewport.tsx       # fixed front-camera 3D view embedded in the Temple page
    CustomizePage.tsx        # rename + manage deities
    DeityPhoto.tsx / DeityArt.tsx  # framed SVG deity portraits for 2D chrome
```
