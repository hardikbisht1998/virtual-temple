# 🛕 Virtual Temple

Build your own mandir, then actually worship in it.

Virtual Temple is a personal home altar (puja) in the browser. You set up a shrine the way you would in your own house — pick the room, the stone, the deities, where each murti stands — and then step into it: blow the shankh, ring the ghanta, light the deepam, offer a garland, play the aarti, and stand in darshan before a god.

Everything runs in your browser. No backend, no account, no sign-up. Your temple lives in `localStorage` and can be exported to a file.

---

## What you can do

### Build a temple

- **Eight shells** to hold it — open sky, room, wall niche, pillared hall, courtyard, **Nagara shikhara** (North Indian curved spire), **Dravidian** gopuram temple (South Indian, with mandapa and deepa-stambha), and a **Kerala sreekovil** (sloped copper roof, laterite walls).
- **Four stone and timber sets** — marble, sandstone, teak, granite — which change every surface in the scene, not just a swatch.
- **Two mandir cabinets** — a carved wooden home mandir, or a white marble one.
- **Floor** in three shapes (square, circle, hexagon) and three sizes.
- **Seven presets** as starting points: Home Mandir, Temple Hall, Wall Shrine, Courtyard, Shikhara Temple, South Temple, Sreekovil.
- **Drag, rotate and place** murtis and decor — diyas, pillars, flowers, rangoli, kalash, hanging bells — on a 0.25-unit snap grid.

### Choose your murtis

Eleven deities: Ganesha, Shiva, Lakshmi, Durga, Krishna, Ram, Hanuman, Saraswati, Kali, Jagannath, Mahamrityunjaya.

Thirteen sculpted `.glb` models back them, and **several gods have more than one form to pick from** — Ganesha as a seated statue or a modern murti, Shiva as Mahadev or as Nataraja, Krishna as Baal Krishna or Radha-Krishna. Deities without a sculpted model get a hand-built procedural statue carrying their emblem (Hanuman's gada, Ram's bow, Saraswati's veena).

### Save where you stand

Structures and gateways can hide a murti from the default angle, so the 3D editor lets you **save up to six viewpoints**. Each becomes a numbered pill in the Temple tab, and the camera eases between them. The one you last used is remembered.

### Do the puja

A nine-step **vidhi** rail guides the traditional order of worship:

`shankh → ghanta → abhishekam → chandan → pushpam → agarbatti → deepam → naivedyam → aarti`

- **Shankh** and **ghanta** are synthesized in code with the Web Audio API — no sample files.
- **Deepam** and **agarbatti** burn for three hours with live countdowns, and keep burning while the tab is closed.
- **Aarti** is drawn, not clicked — trace three circles in front of the deity with your finger or mouse.
- **Tap a murti** to walk up to it for darshan; the camera closes in, the lens tightens, and the deity's mantra appears. Tap again to offer a garland.

### Aarti playback

Ten full aarti recordings, one per deity. Play any of them from the picker, or — while in darshan before a particular god — the play button offers **only that deity's own aarti**. One song at a time; starting an aarti silences the Om drone.

### Keep it

- **Automatic save** — every change is persisted immediately.
- **Backup and restore** — export your entire temple (deities, layout, viewpoints, names, burn timers) as a single JSON file and restore it on another machine or browser. The restore screen shows you what's in the file before it overwrites anything.

### Learn what people use

Built-in **usage analytics** with two independent sinks. See [Analytics](#analytics) below.

---

## Getting started

```bash
npm install
npm run dev      # Vite dev server with HMR
```

Other scripts:

```bash
npm run build    # type-check (tsc -b) + production build
npm run preview  # serve the production build locally
npm run lint     # Oxlint
```

---

## Analytics

Every interesting interaction goes through a single `track()` call in `src/analytics.ts`, which fans out to two sinks:

**1. A local event log — always on.** The last 300 events are kept in `localStorage`, visible in the Customize page and exportable as NDJSON. No account, no network. This is what makes the app understandable on your own machine.

**2. Google Analytics 4 — optional.** Only loads when `VITE_GA_ID` is set *and* the visitor hasn't opted out. Without the variable, the gtag script is never even downloaded and the app behaves identically.

### Enabling GA4

Create `.env.local` in the project root:

```
VITE_GA_ID=G-XXXXXXXXXX
```

Get the Measurement ID from GA4 → Admin → Data streams → your web stream. It's a public value (it ships inside the JS bundle of every site using Analytics), so on Vercel or Netlify add it as a **plain config** variable, not a secret. Vite inlines `VITE_*` variables at **build time**, so a running deployment won't pick up a new value until you rebuild.

### What is measured

| Event | Carries |
|---|---|
| `screen_view` / `screen_time` | which tab, seconds spent |
| `darshan_enter` / `darshan_time` | which deity, **seconds spent standing before them** |
| `rite` | which of the nine vidhi steps, which deity |
| `aarti_play` / `aarti_toggle` | which deity, where it was started from |
| `aarti_listen` | seconds actually listened, % of track, why it ended |
| `shell_change`, `material_change`, `mandir_style`, `preset_apply`, `decor_add`, `deity_add`, `murti_form`, `view_save`, `view_switch` | which option was chosen |

Listening time accumulates across pauses, so "the track was loaded for 20 minutes" is never confused with "they listened for 4". Durations over an hour are discarded — a laptop left open overnight is not devotion.

To chart the parameters in GA4 you must first register them under Admin → Custom definitions (`deity`, `screen`, `rite` as dimensions; `seconds`, `percent` as metrics). Registration is not retroactive.

### What is never sent

No name, no temple name, no free text, no identifier that could single a person out — only deity ids, feature names and durations. IP anonymization is on and `send_page_view` is off (screens are sent explicitly, which is more accurate for a single-page app).

A deity choice is, strictly, a signal about someone's religious practice. It stays pseudonymous and never leaves as PII, which is why consent is honoured through GA Consent Mode and the opt-out is a visible checkbox rather than a buried setting.

---

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | [React 19](https://react.dev/) with TypeScript 6 |
| Build tool | [Vite 8](https://vite.dev/) + `@vitejs/plugin-react` |
| 3D rendering | [three.js](https://threejs.org/) via [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) and [@react-three/drei](https://docs.pmnd.rs/drei) (`useGLTF`, `Environment`, `OrbitControls`, `Html`), with bloom / vignette / N8AO ambient occlusion from [@react-three/postprocessing](https://docs.pmnd.rs/react-postprocessing) |
| Lighting | HDRI image-based lighting (`public/hdr/`) through `PMREMGenerator`, plus soft shadows and flickering flame lights |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`, plus hand-rolled inline styles and CSS keyframes for the temple look |
| Animation | [framer-motion](https://motion.dev/) for 2D chrome; framerate-independent exponential damping for the 3D camera |
| Fonts | Google Fonts — Cinzel / Cinzel Decorative |
| Audio | Web Audio API for the shankh, ghanta, bead click and Om drone (all synthesized, no sample files); a shared `<audio>` element streams the aarti tracks |
| State | One custom hook (`useTempleStore`) over `localStorage`; no state library, no backend |
| Analytics | Local ring buffer + optional GA4 via dynamically-loaded gtag |
| Linting | [Oxlint](https://oxc.rs/) |

### 3D assets

Deity models are Draco-compressed `.glb` files in `src/assets/`, produced with:

```bash
npx gltf-transform optimize in.glb out.glb \
  --compress draco --texture-compress webp --texture-size 2048
```

The Draco decoder is **self-hosted** in `public/draco/` rather than fetched from Google's CDN, so murtis still load on a restricted network. Aarti tracks live in `public/aarti/` and are served statically rather than imported, so the browser streams a song only when asked instead of bundling ~50 MB into the app.

> **Note on the audio files:** the aarti recordings are commercial releases. Fine for personal use; if you make this repository or a deployment public, replace them or add `public/aarti/*.mp3` to `.gitignore`.

---

## Project structure

```
src/
  App.tsx                    # header, tab navigation, screen timing
  analytics.ts               # track() — local event log + optional GA4
  backup.ts                  # export / inspect / restore a temple file
  useTempleStore.ts          # app state, localStorage persistence, 3h burn timers
  layout3d.ts                # persisted 3D layout: floor, shell, material, views, presets
  types.ts / data.ts         # data model + the deity list
  glb.d.ts                   # module declarations for .glb imports

  audio/
    templeAudio.ts           # synthesized shankh, ghanta, bead click, Om drone
    aarti.ts                 # single-track aarti player + listening-time accounting

  ritual/
    vidhi.ts                 # the nine-rite order of worship

  rooms/
    Shell.tsx                # the eight architectural shells

  materials/
    sets.ts                  # marble / sandstone / teak / granite material sets

  constants/
    models.ts                # the .glb catalogue and per-deity model choices

  components/
    OnboardingWizard.tsx     # first-run setup
    TempleAltar.tsx          # Temple page: altar, puja table, vidhi rail, aarti gesture
    MandirScene.tsx          # shared 3D scene: lights, architecture, murtis, decor
    Temple3D.tsx             # 3D Mandir page: toolbars, drag/rotate editing, saved views
    MandirViewport.tsx       # the Temple tab's 3D view, viewpoint switcher, darshan camera
    CustomizePage.tsx        # deities, backup/restore, analytics dashboard
    AartiPlayer.tsx          # now-playing bar + aarti picker
    aartiHooks.ts            # player hooks usable from inside the 3D canvas
    JapaMalaModal.tsx        # bead-counting japa
    DailyShlokaModal.tsx     # shloka of the day
    DarshanShareModal.tsx    # share a darshan image
    DeityPhoto.tsx / DeityArt.tsx  # framed SVG portraits for the 2D chrome

public/
  aarti/                     # aarti recordings (streamed, not bundled)
  draco/                     # self-hosted Draco decoder
  hdr/                       # HDRI environment map
```

---

## Design notes

A few rules that the codebase holds to, written down because breaking them has caused real bugs:

- **Nothing on the front-centre axis.** Shells and decor must stay off `+z` centre, or they stand between the devotee and the deity. A Kerala roof post and a Dravidian deepa-stambha both had to be moved off-axis for exactly this reason.
- **Side effects never live inside a React state updater.** StrictMode invokes updaters twice, which once rang the puja bead twice and double-counted every rite.
- **Camera moves are damped, not cut.** `k = 1 - Math.exp(-delta / EASE)` keeps the approach framerate-independent. Walking up to a god should feel like walking.
- **Verify by driving the app.** Features here are checked headlessly with Playwright against a real render before they're called done — which is how the duplicate-model, double-rite and blocked-murti bugs were all caught.
