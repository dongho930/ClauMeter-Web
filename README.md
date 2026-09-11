# ClauMeter — download site

A 3D interactive landing page for ClauMeter, the desktop widget that shows
your real Claude Code 5-hour and weekly usage. Built from the Notion content plan
*"ClauMeter 다운로드 웹사이트 콘텐츠 기획"*.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview  # serve the built output
```

`dist/` is fully static and uses relative asset paths, so it can be dropped on
any static host as-is.

## Deploying (Cloudflare)

Live at **https://claumeter-web.skysky930.workers.dev**

Cloudflare's build step turns a Vite project into a Workers application rather
than a Pages one, and a fresh Worker starts with no address attached — the
dashboard shows "No URLs enabled" until `workers.dev` is switched on under
Settings → Domains & Routes. Workers Static Assets honours `public/_headers`
just as Pages does; the deployed site was checked and both the long-lived
`/assets/*` cache and the security headers are being applied.

The build settings are:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | taken from `.node-version` (22) |

Cloudflare inspects the project and refuses to configure a Vite older than 6, so
the toolchain is pinned to Vite 7 (which wants Node 20.19+, hence `.node-version`
22). Nothing here needs Cloudflare's framework integration — if its auto-detection
ever gets in the way, setting the preset to **None** and keeping the build command
and output directory above is enough.

`public/_headers` ships the caching and security headers — Vite fingerprints
everything under `/assets`, so those are cached forever and the HTML is not.

**If the address changes**, three files name it: `VITE_SITE_URL` in [`.env`](.env),
the sitemap line in `public/robots.txt`, and the `<loc>` in `public/sitemap.xml`.
`.env` is checked in on purpose — it holds the public address and nothing secret;
anything genuinely private belongs in `.env.local`, which is ignored.

The absolute URLs matter: link-preview crawlers (KakaoTalk, Slack, X, Facebook)
will not follow a relative `og:image`, so `index.html` builds `og:image`, `og:url`
and `canonical` from `VITE_SITE_URL` at build time.

## Before it goes live

Every outbound link lives in one file, [`src/config.js`](src/config.js), and they
all point at `github.com/dongho930/ClauMeter` (verified public, default branch
`main`, issues enabled).

v1.1.0 is published, and the Windows and Mac download buttons point straight at
its two assets (`ClauMeter.Setup.1.1.0.exe` and `ClauMeter-1.1.0-universal.dmg`).

Note that GitHub rewrites spaces in an asset name as dots, so the file people
actually receive is `ClauMeter.Setup.1.1.0.exe`, not the `ClauMeter Setup 1.1.0.exe`
electron-builder writes locally — the page quotes the name they will really see.
The download URLs are pinned to this version on purpose (the asset names carry the
version, so `/releases/latest/download/...` would break on the next release).
**To ship a new version, bump `VERSION` in `src/config.js`; both installer names and
both download URLs follow from it.**

## The idea

The product is a meter, so the page is built as an instrument: engraved
graduations, a redline past 90%, and the widget's own three colours — `#3fd08a`
under 75%, `#f0b429` past it, `#f0533f` past 90% — used for nothing except what
they mean in the app. The scrollbar is replaced by a graduated scale down the
left edge that reads out your position, the same way the widget reads out a
usage window.

The argument the page makes is about visibility, not accuracy: Claude Code gives
you no countdown, so the limit arrives without warning. Nothing on the page
compares ClauMeter to other tools.

The 3D deliberately does not repeat one shape. The dial is the product's mark, so
it opens and closes the page; in between the forms change — a chart recorder, a
rack of cards, gates, a ring of languages, real screenshots on light slides, and
the widget's own bar meters.

Not everything on screen is about the product, and the shapes deliberately do not
repeat. `Structures.jsx` and the sculpture builders at the foot of `geo.js` are
scenery: a floor of receding graduations, and seven rigs turning slowly off to
the sides in five different forms — gyroscope, icosahedron, lattice, double helix,
starburst. The setup chapter flies through iris diaphragms that open on the step
you are reading; a polyhedron turns at the centre of the language ring; a lattice
stands in the dark beside the datasheet. None of it means anything. It is there to
give the light something to happen on.

Everything is emissive line work drawn with additive blending, which is what makes
bloom worth its cost — `EffectComposer` runs at half resolution and is skipped
entirely under `prefers-reduced-motion` and on narrow screens. The motes drift in
the vertex shader rather than a JS loop, and their point size is capped so a mote
near the camera cannot flood the frame with overdraw.

Scrolling flies a camera down one continuous corridor. Each section parks the
camera at a keyframe, holds it while you read, then flies to the next:

| Chapter | Section | 3D |
|---|---|---|
| 0 | Hero | The dial: two live arcs, 5-hour and weekly |
| 1 | Why it exists | A chart recorder: the session climbs through the caution line into the redline and stops, drawn as you read |
| 2 | Six features | A rack of panel cards, each carrying a line drawing of what that feature does; the one you are reading slides out and powers up |
| 3 | Setup | Four iris diaphragms, the one you are on standing open. Inside them the widget's bar meters sit empty at "No data", then the first reading lands |
| 4 | Twelve languages | Twelve nodes and three tilted shells orbiting a turning polyhedron; picking a language swings its node to the front |
| 5 | The three windows | Real screenshots of the app, hung as lit slides; the one you are reading swings to the front |
| 6 | Datasheet | The 3D goes dark and a printed spec sheet takes the frame |
| 7 | Closing | The dial returns, green |

## Layout

```
src/
  config.js          outbound links, version, installer filename
  scroll.js          scroll → chapter mapping, the camera hold curve, and which
                     list item is on screen (`[data-track]` / `[data-item]`)
  i18n/              en.js · ko.js (identical key trees) · widgetLangs.js (the widget's 12 languages)
  styles/tokens.css  palette and the type stack: Instrument Serif display,
                     Manrope body, IBM Plex Mono for machine values, with
                     Nanum Myeongjo and Gothic A1 carrying Hangul
  scene/
    gaugeShader.js   the dial: arcs, graduations, redline, index mark — one draw call
    Gauge.jsx        wraps it; `driver` runs per frame for live values
    CameraRig.jsx    KEYS — one camera keyframe per chapter
    Gauge / Trace / Bars / Plates / Iris / Orbit / Slides / Structures / Corridor / Motes
    Annotations.jsx  DOM legends positioned in 3D (so every script renders)
    useLayout.js     wide vs narrow framing: offset, lift, dolly, intensity
    useFocus.js      focusOf (lit by the camera) vs presenceOf (lit while its
                     section is being read) — stepping sets use the latter
  sections/          one component per chapter, all copy from i18n
  public/shots/      real captures of the app's three windows (2x)
  components/        ScrollRuler · TopRail
```

Nothing on the page is a recreation of the product. `public/shots/` holds the real
thing: the app's own `renderer/` pages captured at
2x with sample readings — the same markup, CSS and rendering code the installed
app runs, driven by stand-in data instead of a live session. They are shown once
each, never twice: as 3D slides on wide screens, and as plain `<img>` elements on
narrow screens or with no WebGL. To refresh them after a UI change, re-capture
those three pages at 340x160, 360x240 and 420x480 (CSS px, 2x zoom).

`widget-langs.png` is the languages section: the widget captured once per language
and laid out as a 3-wide sprite, so switching a language is instant and costs no
extra request. `SHEET` in `i18n/widgetLangs.js` describes the tile geometry, and
the order of `WIDGET_LANGS` **is** the order of the tiles — change one and you
must change the other.

`public/og.png` is the link-preview card, captured from the site's own hero.

## Code signing

The installer is **not** code-signed (`Get-AuthenticodeSignature` reports
`NotSigned`, and `package.json`'s `build.win` carries no signing options), so
Windows SmartScreen shows its "Windows protected your PC" notice on first run.

Rather than hide that, the site states it in the FAQ and publishes the installer's
SHA-256 in the datasheet so people can verify what they downloaded. The hash in
`src/config.js` was checked against the released asset's own digest from the
GitHub API — **re-take it whenever you publish a new build**, alongside `VERSION`.

To actually sign, `electron-builder` 25.1.8 (already in the app repo) supports
both `win.azureSignOptions` (Azure Trusted Signing) and `win.signtoolOptions`
(a certificate on a hardware token). Since June 2023 the CA/Browser Forum
requires code-signing keys to live on FIPS-140-2 Level 2 hardware, so a plain
`.pfx` file on disk is no longer an option for a publicly trusted certificate.

## Keeping the 3D in step with the text

Two things could drift apart here, and both have bitten:

- **A set going dark while its list is still being read.** The camera parks at a
  keyframe for the first `HOLD_IN` of a section and only then flies to the next.
  At 0.38 it had already left by the fourth item, so the last plate, the last gate
  and the third screenshot were never actually visible. `HOLD_IN` is now 0.62, and
  more importantly the stepping sets are lit by `presenceOf` — which follows the
  section being read, not the camera.
- **The lit item not matching the paragraph next to it.** Section progress is a
  poor proxy when a list is much shorter than its section. Lists therefore carry
  `data-track` / `data-item`, `scroll.js` records which item sits nearest the
  reading line, and the 3D reads that index. Layout can change freely without the
  two falling out of step.

Both stepping sets move the chosen item to one fixed reading position (`STAGE`)
rather than pulling it forward from where it sat, which is what used to push the
last card off the side of the screen.

A third thing is easy to miss: a set can be perfectly lit, perfectly in step, and
still say nothing. The feature cards were empty rectangles for a while — every
other chapter shows a real object, so a rack of blank boxes read as unfinished.
Each card now carries a glyph of its own feature (`plateGlyph` in `scene/geo.js`),
drawn in the same line work as everything else.

## Quality floor

- **Reduced motion** — `prefers-reduced-motion` stops all autonomous animation and
  camera damping; scroll-linked movement stays, since it answers the reader.
- **No WebGL** — the canvas never mounts and the page falls back to a flat layout.
- **Narrow screens** — sets recentre, lift into the top of the frame and dim to
  28% so body text scrolls over them and stays legible.
- **Loading** — three.js is lazy-loaded, so the text and the download button are
  interactive before the 3D arrives (9 kB gzip initial JS).
- **Korean** — `word-break: keep-all`, a Hangul display face, and its own type
  scale, because Hangul sets wider and taller than Latin at the same size.
