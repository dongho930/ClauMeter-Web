# public/demo — the app, running on the site

These are the ClauMeter desktop app's own renderer files, not a re-creation of
them. The in-page demo (`src/sections/Demo.jsx`) loads them in three iframes and
supplies the `window.api` that Electron's `preload.js` normally provides, so what
a visitor clicks is the shipping product — same markup, same CSS, same handlers,
same twelve languages.

| File | Where it comes from |
| --- | --- |
| `widget.html` | the app's `renderer/index.html` |
| `detail.html`, `calibrate.html` | the app's `renderer/` |
| `renderer.js`, `detail.js`, `calibrate.js`, `flags.js` | copied byte-for-byte |
| `bridge.js` | **written for the site** — the demo's stand-in for `preload.js` |

Everything except `bridge.js` is generated. Do not edit it here: change the app,
then re-run

```
node scripts/sync-demo.mjs [path-to-ClauMeter-app]    # default: ../../ClauMeter/ClauMeter
```

and commit the diff. The diff is the point — it is how you find out the demo has
drifted from the app. The script also regenerates `src/demo/locales.js` (the
app's `locales.js` as an ES module) and fails loudly if the app's markup has
moved far enough that it can no longer find where to inject `bridge.js`.

The app repo is deliberately not a dependency of this one: Cloudflare Pages only
ever sees this repository, so the copies have to be committed.

The numbers the demo shows are simulated — see `src/demo/simulate.js`.
