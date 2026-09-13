import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fill, useI18n } from '../i18n/index.jsx'
import { useReducedMotion } from '../hooks/useReducedMotion.js'
import { useDemoHost } from '../demo/host.js'
import { LOCALES, SUPPORTED_LANGUAGES, t as tr } from '../demo/locales.js'
import { FIVE_HOUR_MS, adviceAt, blockedBy, resetsAt, statsAt, usageAt } from '../demo/simulate.js'
import { SESSIONS, WORKLOADS, turnCost } from '../demo/session.js'
import { useSession } from '../demo/useSession.js'

// A desktop, on the page, running the actual product.
//
// The three windows are iframes onto public/demo/*.html — the app's own renderer,
// copied in by scripts/sync-demo.mjs and handed a window.api that this component
// implements. So everything inside the window frames is the real thing: the same
// markup, the same CSS, the same event handlers, the same twelve languages. This
// file is only the machine around it — the wallpaper, the taskbar, the window
// chrome, and the terminal the widget sits on top of.
//
// The bars move because the terminal ran something: the session in there is
// scripted, every line of it is priced, and the widget's reading is what those
// lines add up to (src/demo/session.js). The visitor can push it along with the
// prompt buttons or by typing. What is *not* real: the session and its costs.
// Nothing is executed and nothing leaves the page.

const BASE = import.meta.env.BASE_URL

// One fixed logical desktop, scaled to fit whatever column it lands in. Every
// coordinate below is in these units.
const STAGE = { w: 1000, h: 660 }
const MIN_SCALE = 0.58
const TASKBAR = 44
const MENUBAR = 26

// Content sizes straight out of main.js's BrowserWindow options, plus the title
// bar height the OS would add. The widget is frameless there and here.
const WINDOWS = {
  widget: { w: 340, h: 160, bar: 0 },
  detail: { w: 420, h: 480, bar: 30 },
  calibrate: { w: 360, h: 272, bar: 30 },
}

const HOME = {
  widget: [612, 96],
  detail: [150, 104],
  calibrate: [530, 296],
}

// How fast the demo's clock runs. 1x is real time: the countdown ticks a minute
// per minute and the 5-hour window really does take five hours, which is the
// honest baseline. The multipliers only compress the waiting.
//
// The session in the terminal is *not* multiplied. Its delays are already written
// at a real pace — a tool call takes about a second — so at 1x the whole demo is
// real time, and at 300x the transcript stays readable while the clock flies.
// Scaling both would make the terminal unreadable at anything but 1x, which is
// the part nobody wants to speed up.
const SPEEDS = [1, 60, 300]
const DEFAULT_SPEED = 60
// The clock advances CLOCK_TICK_MS x speed of demo time per tick. At 1x a whole
// second of demo time per tick is plenty (the widget only shows minutes) and
// saves four renders a second for five hours.
const clockTick = (speed) => Math.max(200, Math.round(1000 / speed))

const THRESHOLDS = [50, 75, 90]

function detectOs() {
  const p = navigator.userAgentData?.platform || navigator.platform || ''
  return /mac/i.test(p) ? 'mac' : 'win'
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const hhmm = (ms) => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function Demo() {
  const { t, lang: siteLang } = useI18n()
  const reduced = useReducedMotion()
  const d = t.demo

  const [armed, setArmed] = useState(false)
  const [os, setOs] = useState(detectOs)
  const [workload, setWorkload] = useState('caution')
  const [playing, setPlaying] = useState(!reduced)
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [elapsed, setElapsed] = useState(() => FIVE_HOUR_MS * 0.38)
  const [draft, setDraft] = useState('')
  const [winLang, setWinLang] = useState(siteLang)
  const [opacity, setOpacity] = useState(1)
  const [prefs, setPrefs] = useState({ notificationsEnabled: true, autoUpdateEnabled: true })
  const [open, setOpen] = useState({ widget: true, detail: false, calibrate: false })
  const [pos, setPos] = useState(HOME)
  const [order, setOrder] = useState(['detail', 'calibrate', 'widget'])
  const [clickThrough, setClickThrough] = useState(false)
  const [toasts, setToasts] = useState([])
  const [dragging, setDragging] = useState(false)
  const [scale, setScale] = useState(1)

  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const scaleRef = useRef(1)
  const drag = useRef(null)
  const fired = useRef({ fiveHour: new Set(), weekly: new Set() })
  const adviceSeen = useRef(false)
  const langPinned = useRef(false)
  const opacityBeforeEdit = useRef(1)
  const handlers = useRef({})
  const host = useDemoHost(handlers)

  // The human's side of each scripted turn, in the site's language. Tool lines
  // are not translated: Claude Code prints those in English wherever it runs.
  const promptText = useCallback((id) => d.prompts[id] ?? id, [d])

  // Which limit has run out, if either. Claude Code refuses to send once one has,
  // so this is what stops the terminal, greys out the prompts, and says why.
  const blockFor = useCallback(
    (spent) => {
      const kind = blockedBy(workload, spent)
      if (!kind) return null
      return {
        kind,
        line: kind === 'fiveHour' ? fill(d.limitFiveHour, { at: resetsAt() }) : d.limitWeekly,
      }
    },
    [workload, d]
  )

  const session = useSession({
    workload,
    playing,
    promptText,
    adHocReply: d.adHocReply,
    reduced,
    blockFor,
  })

  const spent = session.spent
  const block = session.blocked
  const usage = useMemo(() => usageAt(workload, spent, elapsed), [workload, spent, elapsed])
  const inset = os === 'mac' ? MENUBAR : 0
  const elapsedRef = useRef(elapsed)
  elapsedRef.current = elapsed

  // A window asks for advice from inside the very call that tells it the language
  // changed, which is before React has re-rendered this component — so the answer
  // has to come from somewhere that is already current. See setLanguage().
  const winLangRef = useRef(winLang)
  winLangRef.current = winLang
  const usageRef = useRef(usage)
  usageRef.current = usage

  // ---- the demo only exists once it is nearly on screen -------------------
  // Three iframes and the app's scripts have no business loading with the hero.
  // It also guarantees the host object is installed before any bridge looks for it.
  useEffect(() => {
    const el = sectionRef.current
    if (!el || armed) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [armed])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const s = clamp(entry.contentRect.width / STAGE.w, MIN_SCALE, 1)
      scaleRef.current = s
      setScale(s)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- the clock -----------------------------------------------------------
  // All this moves now is the countdowns and the "as of" time. When the window
  // runs out it resets, and the session in the terminal starts over with it —
  // which is the one moment a visitor gets to watch the bars drop to zero.
  // session is a fresh object on every publish, so it is reached through a ref:
  // depending on it here rebuilt the interval several times a second.
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    if (!playing || !armed) return
    const tick = clockTick(speed)
    const step = tick * speed
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e + step < FIVE_HOUR_MS) return e + step
        // A new 5-hour window, which clears this window's spend and the
        // transcript — but not what the week has spent.
        sessionRef.current.newWindow()
        return 0
      })
    }, tick)
    return () => clearInterval(id)
  }, [playing, armed, speed])

  // A window that has just reset, or a different usage pattern, is a fresh set of
  // notifications. Thresholds already passed are marked as seen so the only
  // toasts a visitor gets are the ones they watch happen.
  const primeThresholds = useCallback((nextWorkload) => {
    const u = usageAt(nextWorkload, { window: 0, week: 0 }, elapsedRef.current)
    fired.current = {
      fiveHour: new Set(THRESHOLDS.filter((x) => u.fiveHourPct >= x)),
      weekly: new Set(THRESHOLDS.filter((x) => u.weeklyPct >= x)),
    }
  }, [])

  // A new workload, or a window that just reset, is a fresh set of notifications.
  useEffect(() => {
    primeThresholds(workload)
  }, [workload, primeThresholds])

  const pushToast = useCallback((body) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list.slice(-2), { id, body }])
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 5200)
  }, [])

  useEffect(() => {
    if (!open.widget || !prefs.notificationsEnabled) return
    const rows = [
      ['fiveHour', usage.fiveHourPct, 'notifyFiveHourBody'],
      ['weekly', usage.weeklyPct, 'notifyWeeklyBody'],
    ]
    for (const [key, pct, str] of rows) {
      for (const th of THRESHOLDS) {
        if (pct >= th && !fired.current[key].has(th)) {
          fired.current[key].add(th)
          pushToast(tr(winLang, str, { pct: th }))
        }
      }
      // Crossing back down (the window reset) re-arms the threshold.
      for (const th of THRESHOLDS) if (pct < th) fired.current[key].delete(th)
    }
  }, [usage, open.widget, prefs.notificationsEnabled, winLang, pushToast])

  // A prompt from a chip or from the input. Sending while paused presses play:
  // asking for something and watching nothing happen would read as broken.
  const sendPrompt = useCallback((turnIndex, typedText) => {
    setPlaying(true)
    sessionRef.current.send(turnIndex, typedText)
  }, [])

  const restart = useCallback(() => {
    // A clean week as well as a clean window: this is the way out of a weekly
    // limit, which nothing else in the demo can clear.
    sessionRef.current.newWeek()
    setElapsed(FIVE_HOUR_MS * 0.38)
    primeThresholds(workload)
    setPlaying(true)
  }, [primeThresholds, workload])

  // ---- windows -------------------------------------------------------------
  const focusWindow = useCallback((frame) => {
    setOrder((o) => [...o.filter((x) => x !== frame), frame])
  }, [])

  const openWindow = useCallback(
    (frame) => {
      setOpen((o) => (o[frame] ? o : { ...o, [frame]: true }))
      focusWindow(frame)
      if (frame === 'calibrate') opacityBeforeEdit.current = opacity
      // The detail window's figures are the snapshot taken when it fetched, which
      // is right in the app but drifts away from the widget within seconds at the
      // speed this demo runs a window. Stopping the clock keeps the two agreeing
      // while the advice is being read; Play picks it back up.
      if (frame === 'detail') setPlaying(false)
    },
    [focusWindow, opacity]
  )

  const closeWindow = useCallback(
    (frame) => {
      setOpen((o) => ({ ...o, [frame]: false }))
      host.detach(frame)
      setPos((p) => ({ ...p, [frame]: HOME[frame] }))
    },
    [host]
  )

  const beginDrag = useCallback(
    (frame, screenX, screenY) => {
      const [x, y] = pos[frame]
      drag.current = { frame, sx: screenX, sy: screenY, ox: x, oy: y }
      focusWindow(frame)
      setDragging(true)
    },
    [pos, focusWindow]
  )

  // The pointer delta arrives in screen pixels while positions are in the stage's
  // logical ones, hence the divide. Windows may hang off an edge the way they do
  // on a real desktop; KEEP_ON is how much of one has to stay grabbable.
  const moveDrag = useCallback(
    (screenX, screenY) => {
      const g = drag.current
      if (!g) return
      const KEEP_ON = 80
      const s = scaleRef.current || 1
      const { w, bar } = WINDOWS[g.frame]
      const top = os === 'mac' ? MENUBAR : 0
      const bottom = STAGE.h - (os === 'mac' ? 0 : TASKBAR)
      setPos((p) => ({
        ...p,
        [g.frame]: [
          clamp(g.ox + (screenX - g.sx) / s, KEEP_ON - w, STAGE.w - KEEP_ON),
          clamp(g.oy + (screenY - g.sy) / s, top, bottom - bar - 40),
        ],
      }))
    },
    [os]
  )

  const endDrag = useCallback(() => {
    drag.current = null
    setDragging(false)
  }, [])

  // This pair only carries title-bar drags, which start in this document. The
  // widget's own drag is forwarded out of its iframe instead — see bridge.js.
  useEffect(() => {
    if (!dragging) return
    const move = (e) => moveDrag(e.screenX, e.screenY)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [dragging, moveDrag, endDrag])

  // ---- the main process ----------------------------------------------------
  // main.js's localePayload(), verbatim in shape.
  const localePayload = useCallback(
    (code) => ({ lang: code, strings: LOCALES[code] ?? LOCALES.en, languages: SUPPORTED_LANGUAGES }),
    []
  )

  const setLanguage = useCallback(
    (code) => {
      // Ahead of the emit on purpose: detail.js responds to locale-data by asking
      // for fresh advice straight away, and that request must not be answered in
      // the language we are leaving.
      winLangRef.current = code
      setWinLang(code)
      adviceSeen.current = false
      for (const frame of ['widget', 'detail', 'calibrate']) {
        host.emit(frame, 'locale-data', localePayload(code))
      }
      // renderer.js only rewrites the countdown and the "as of" line when a
      // reading arrives, so locale-data alone leaves them in the old language.
      // In the app the next poll fixes that within seconds; the demo's clock can
      // be paused, so it hands the widget its current reading instead.
      host.emit('widget', 'usage-update', usageRef.current)
    },
    [host, localePayload]
  )

  // Until someone picks a language in the app's own settings window, the windows
  // follow the site's EN/KO switch. After that the app's setting wins — it would
  // be rude to overwrite a choice the visitor just made inside the product.
  useEffect(() => {
    if (!langPinned.current && siteLang !== winLang) setLanguage(siteLang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteLang])

  handlers.current = {
    'open-detail-window': () => openWindow('detail'),
    'open-calibrate-window': () => openWindow('calibrate'),
    'quit-app': () => closeWindow('widget'),
    'clickthrough:toggle': () => {
      const next = !clickThrough
      setClickThrough(next)
      host.emit('widget', 'clickthrough:state', next)
    },
    'clickthrough:get-state': () => clickThrough,
    // The app asks the OS to let the mouse through except over one button; a page
    // has no such thing, so bridge.js blocks those clicks instead.
    'clickthrough:hover': () => {},
    'set-language': (code) => {
      langPinned.current = true
      setLanguage(code)
    },
    'get-usage-advice': async ({ forceRefresh }) => {
      const cached = adviceSeen.current && !forceRefresh
      // The real call goes to a language model over the network. Without the wait
      // the detail window's loading state would never be seen.
      if (!cached) await new Promise((r) => setTimeout(r, reduced ? 150 : 700))
      adviceSeen.current = true
      return {
        structured: true,
        cached,
        advice: adviceAt(workload, winLangRef.current),
        // The durations in the stats are localized by the main process in the
        // app, so they need the window's language here too — not the site's.
        stats: statsAt(workload, spent, elapsed, winLangRef.current),
      }
    },
    'calibrate-opacity-preview': (value) => setOpacity(value),
    'calibrate-submit': (data) => {
      setOpacity(data.opacity)
      setPrefs({
        notificationsEnabled: data.notificationsEnabled,
        autoUpdateEnabled: data.autoUpdateEnabled,
      })
      closeWindow('calibrate')
    },
    'calibrate-cancel': () => {
      setOpacity(opacityBeforeEdit.current)
      closeWindow('calibrate')
    },
    'drag-start': ({ screenX, screenY }) => beginDrag('widget', screenX, screenY),
    'drag-move': ({ screenX, screenY }) => moveDrag(screenX, screenY),
    'drag-end': endDrag,
  }

  // What main.js does on did-finish-load, for whichever window just appeared.
  const onFrameLoad = useCallback(
    (frame) => {
      host.emit(frame, 'locale-data', localePayload(winLang))
      if (frame === 'widget') {
        host.emit('widget', 'usage-update', usageAt(workload, spent, elapsed))
        host.emit('widget', 'clickthrough:state', clickThrough)
      }
      if (frame === 'calibrate') {
        host.emit('calibrate', 'calibrate-init', {
          opacity,
          minOpacity: 0.5,
          maxOpacity: 1.0,
          lang: winLang,
          languages: SUPPORTED_LANGUAGES,
          ...prefs,
        })
      }
    },
    [host, localePayload, winLang, workload, spent, elapsed, clickThrough, opacity, prefs]
  )

  useEffect(() => {
    if (open.widget) host.emit('widget', 'usage-update', usage)
  }, [usage, open.widget, host])

  // The detail window caches its advice until Refresh is pressed, which is right
  // in the app but reads as broken here the moment a visitor picks a different
  // usage pattern behind its back. Re-sending the locale is how the app already
  // asks that window to fetch again.
  useEffect(() => {
    if (open.detail) host.emit('detail', 'locale-data', localePayload(winLang))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workload])

  // ---- render --------------------------------------------------------------
  const frames = [
    { frame: 'widget', src: 'widget.html', title: tr(winLang, 'widgetWindowTitle') },
    { frame: 'detail', src: 'detail.html', title: tr(winLang, 'detailWindowTitle') },
    { frame: 'calibrate', src: 'calibrate.html', title: tr(winLang, 'settingsWindowTitle') },
  ]

  return (
    <section data-chapter className="demo" id="demo" ref={sectionRef}>
      <h2 className="display">
        {d.title[0]}
        <br />
        {d.title[1]}
      </h2>
      <p className="lede">{d.lede}</p>

      <div className="dtop-wrap" ref={stageRef}>
        <div
          className="dtop-frame"
          style={{ width: STAGE.w * scale, height: STAGE.h * scale }}
        >
          <div
            className={`dtop os-${os}`}
            style={{ width: STAGE.w, height: STAGE.h, transform: `scale(${scale})` }}
          >
          {os === 'mac' ? (
            <MacMenuBar clock={hhmm(usage.updatedAt)} lang={winLang} />
          ) : null}

          <Terminal
            d={d}
            os={os}
            inset={inset}
            workload={workload}
            log={session.log}
            typed={session.typed}
            working={playing ? session.working : null}
            busy={session.busy}
            block={block}
            draft={draft}
            setDraft={setDraft}
            onSend={sendPrompt}
          />

          {armed &&
            frames.map(({ frame, src, title }) =>
              open[frame] ? (
                <Window
                  key={frame}
                  frame={frame}
                  src={`${BASE}demo/${src}`}
                  title={title}
                  os={os}
                  pos={pos[frame]}
                  z={10 + order.indexOf(frame)}
                  opacity={frame === 'widget' ? opacity : 1}
                  onLoad={() => onFrameLoad(frame)}
                  onClose={() => closeWindow(frame)}
                  onDragStart={beginDrag}
                  onFocus={() => focusWindow(frame)}
                />
              ) : null
            )}

          <div className="dtop-toasts" aria-live="polite">
            {toasts.map((x) => (
              <div className="dtop-toast" key={x.id}>
                <img src={`${BASE}icon.png`} alt="" width="28" height="28" />
                <div>
                  <strong>{tr(winLang, 'appTitle')}</strong>
                  <span>{x.body}</span>
                </div>
              </div>
            ))}
          </div>

          {os === 'win' ? (
            <WinTaskbar
              clock={hhmm(usage.updatedAt)}
              running={open.widget}
              label={tr(winLang, 'appTitle')}
              relaunch={d.relaunch}
              onRelaunch={() => openWindow('widget')}
            />
          ) : null}

            {dragging ? <div className="dtop-shield" /> : null}
          </div>
        </div>
      </div>

      <Controls
        d={d}
        block={block}
        os={os}
        setOs={setOs}
        workload={workload}
        setWorkload={setWorkload}
        playing={playing}
        setPlaying={setPlaying}
        speed={speed}
        setSpeed={setSpeed}
        onRestart={restart}
        clock={hhmm(usage.updatedAt)}
        used={usage.fiveHourPct}
      />

      <p className="dtop-note">{d.note}</p>
    </section>
  )
}

function Window({ frame, src, title, os, pos, z, opacity, onLoad, onClose, onDragStart, onFocus }) {
  const { w, h, bar } = WINDOWS[frame]
  const frameless = bar === 0

  return (
    <div
      className={`dwin dwin-${frame}${frameless ? ' is-frameless' : ''}`}
      style={{ left: pos[0], top: pos[1], width: w, zIndex: z, opacity }}
      onPointerDown={onFocus}
    >
      {!frameless && (
        <div
          className="dwin-bar"
          onPointerDown={(e) => {
            if (e.button === 0 && !e.target.closest('button')) onDragStart(frame, e.screenX, e.screenY)
          }}
        >
          {os === 'mac' ? (
            <>
              <span className="dwin-lights">
                <button className="dl dl-close" onClick={onClose} aria-label={`${title} — close`} />
                {/* The real window is not minimizable or resizable, so these two are
                    drawn the way macOS draws them for such a window: inert. */}
                <span className="dl dl-min" aria-hidden="true" />
                <span className="dl dl-max" aria-hidden="true" />
              </span>
              <span className="dwin-title">{title}</span>
            </>
          ) : (
            <>
              <span className="dwin-title">{title}</span>
              <span className="dwin-buttons">
                {/* The real window is minimizable but not maximizable, so Windows
                    draws exactly these two. Minimize is inert here. */}
                {frame === 'detail' && (
                  <span className="db" aria-hidden="true">
                    &#x2500;
                  </span>
                )}
                <button className="db db-close" onClick={onClose} aria-label={`${title} — close`}>
                  &#x2715;
                </button>
              </span>
            </>
          )}
        </div>
      )}
      <iframe
        src={src}
        title={title}
        width={w}
        height={h}
        loading="lazy"
        onLoad={onLoad}
        // The detail window's content can outrun its fixed height, and it scrolls
        // in the app too. The other two are exactly their content's size.
        scrolling={frame === 'detail' ? 'auto' : 'no'}
      />
    </div>
  )
}

function WinTaskbar({ clock, running, label, relaunch, onRelaunch }) {
  return (
    <div className="dbar dbar-win" style={{ height: TASKBAR }}>
      <div className="dbar-apps">
        <span className="dbar-start" aria-hidden="true" />
        <span className="dbar-app" aria-hidden="true" />
        <span className="dbar-app" aria-hidden="true" />
        <span className="dbar-app" aria-hidden="true" />
      </div>
      <div className="dbar-tray">
        {running ? (
          <span className="dbar-run">
            <img src={`${BASE}icon.png`} alt="" width="16" height="16" />
            {label}
          </span>
        ) : (
          <button className="dbar-relaunch" onClick={onRelaunch}>
            <img src={`${BASE}icon.png`} alt="" width="16" height="16" />
            {relaunch}
          </button>
        )}
        <span className="dbar-clock val">{clock}</span>
      </div>
    </div>
  )
}

function MacMenuBar({ clock, lang }) {
  return (
    <div className="dbar dbar-mac" style={{ height: MENUBAR }}>
      {/* Drawn rather than typed: the Apple glyph lives in a private-use codepoint
          that only ships with macOS, so on every other machine it is a tofu box. */}
      <svg className="dbar-apple" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 12.54c.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.71-3.18-1.73-1.36-.14-2.65.79-3.34.79-.69 0-1.75-.77-2.88-.75-1.48.02-2.84.86-3.6 2.18-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.61 2.25 2.76 2.21 1.11-.04 1.53-.72 2.87-.72 1.34 0 1.72.72 2.89.7 1.19-.02 1.95-1.08 2.68-2.14.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.31-.89-2.39-3.53zM14.9 6.2c.6-.73 1.01-1.75.9-2.76-.87.04-1.93.58-2.55 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.57-1.23z" />
      </svg>
      <strong>{tr(lang, 'appTitle')}</strong>
      <span className="dbar-spacer" />
      <img src={`${BASE}icon.png`} alt="" width="14" height="14" />
      <span className="dbar-clock val">{clock}</span>
    </div>
  )
}

// The session the widget is watching. Not decoration any more: it types, it
// streams, it takes prompts, and every line it prints is what moves the bars.
//
// The shell prompt is the one line that differs between the two systems, so it is
// drawn here rather than translated.
const PROMPT = {
  win: 'C:\\projects\\api> claude',
  mac: '~/projects/api % claude',
}

// Nothing here is ever disabled: a prompt sent mid-turn is queued, which is what
// Claude Code does with a message you send while it is working. Disabling on busy
// meant pausing mid-turn locked the terminal for good.
function Terminal({
  d,
  os,
  inset,
  workload,
  log,
  typed,
  working,
  busy,
  block,
  onSend,
  draft,
  setDraft,
}) {
  const body = useRef(null)

  // A terminal that does not follow its own output is a terminal nobody believes.
  useEffect(() => {
    const el = body.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log, typed])

  const submit = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || block) return
    setDraft('')
    onSend(null, text)
  }

  return (
    // data-busy is what a turn being in flight looks like from the outside: the
    // cursor cannot say it, since it belongs to the prompt line and that line is
    // hidden while output streams.
    <div className="dterm" data-busy={busy ? 'true' : 'false'} style={{ top: 70 + inset }}>
      <div className="dterm-bar">
        {os === 'mac' ? (
          <span className="dterm-lights">
            <span />
            <span />
            <span />
          </span>
        ) : null}
        {/* Says what this is, permanently. The three windows on this desktop are
            the real application; this one is a staged session, and a visitor
            should never have to guess which is which. */}
        <span className="dterm-name">claude — {d.sessionTag}</span>
        {os === 'win' ? (
          <span className="dterm-wbtns">
            <span>&#x2500;</span>
            <span>&#x2610;</span>
            <span>&#x2715;</span>
          </span>
        ) : null}
      </div>

      <div className="dterm-body" ref={body}>
        <pre role="log" aria-live="polite" aria-label={d.transcriptLabel}>
          <span className="dterm-dim">
            {PROMPT[os]}
            {'\n'}
          </span>
          {log.map((l) => (
            <span className={`dterm-${l.kind}`} key={l.id}>
              {l.text}
              {/* The step being worked on right now. Without it a three-second
                  Edit and a frozen terminal look exactly the same. */}
              {l.id === working ? <span className="dterm-work" aria-hidden="true" /> : null}
              {'\n'}
            </span>
          ))}
          {/* One live line: the prompt being typed, or an empty one with a cursor
              while the session waits for you. Hidden while output is streaming,
              because the prompt is in the scrollback by then. */}
          {(typed !== null || (!busy && !block)) && (
            <span className="dterm-live dterm-in">
              {`> ${typed ?? ''}`}
              <span className="dterm-caret" />
              {'\n'}
            </span>
          )}
        </pre>
      </div>

      <div className={`dterm-ask${block ? ' is-blocked' : ''}`}>
        <div className="dterm-chips">
          {SESSIONS[workload].turns.map((turn, i) => (
            <button
              key={turn.prompt}
              type="button"
              className="dterm-chip"
              disabled={!!block}
              onClick={() => onSend(i)}
              title={d.prompts[turn.prompt]}
            >
              <span className="dterm-chip-text">{d.prompts[turn.prompt]}</span>
              <Weight cost={turnCost(workload, i)} label={d.weightLabel} />
            </button>
          ))}
        </div>
        <form className="dterm-form" onSubmit={submit}>
          <span className="dterm-form-mark" aria-hidden="true">
            &gt;
          </span>
          <input
            className="dterm-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={block ? d.inputBlocked : busy ? d.inputQueue : d.inputPlaceholder}
            aria-label={d.inputPlaceholder}
            maxLength={120}
            disabled={!!block}
            spellCheck="false"
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  )
}

// How heavy a prompt is, without quoting a made-up percentage at anyone: three
// bars, filled by what the turn costs relative to a full window.
function Weight({ cost, label }) {
  const level = cost >= 12 ? 3 : cost >= 6 ? 2 : 1
  return (
    <span className="dterm-weight" title={`${label}: ${'▮'.repeat(level)}`} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <i className={i <= level ? 'on' : ''} key={i} />
      ))}
    </span>
  )
}

function Controls({
  d,
  block,
  os,
  setOs,
  workload,
  setWorkload,
  playing,
  setPlaying,
  speed,
  setSpeed,
  onRestart,
  clock,
  used,
}) {
  return (
    <div className="dctl">
      <div className="dctl-row">
        <span className="dctl-label">{d.workloadLabel}</span>
        <div className="dctl-seg" role="group" aria-label={d.workloadLabel}>
          {WORKLOADS.map((w) => (
            <button
              key={w}
              className={workload === w ? 'on' : ''}
              aria-pressed={workload === w}
              onClick={() => setWorkload(w)}
            >
              {d.workloads[w]}
            </button>
          ))}
        </div>
      </div>

      <div className="dctl-row">
        <button className="dctl-play" onClick={() => setPlaying((p) => !p)}>
          {playing ? d.pause : d.play}
        </button>
        <button className="dctl-play" onClick={onRestart}>
          {d.restart}
        </button>
      </div>

      <div className="dctl-row">
        <span className="dctl-label">{d.speedLabel}</span>
        <div className="dctl-seg" role="group" aria-label={d.speedLabel}>
          {SPEEDS.map((x) => (
            <button
              key={x}
              className={speed === x ? 'on' : ''}
              aria-pressed={speed === x}
              title={d.speedTitles[x]}
              onClick={() => setSpeed(x)}
            >
              {x}&times;
            </button>
          ))}
        </div>
      </div>

      <div className="dctl-row">
        <span className="dctl-label">{d.osLabel}</span>
        <div className="dctl-seg" role="group" aria-label={d.osLabel}>
          {['win', 'mac'].map((x) => (
            <button key={x} className={os === x ? 'on' : ''} aria-pressed={os === x} onClick={() => setOs(x)}>
              {d.os[x]}
            </button>
          ))}
        </div>
      </div>

      <div className="dctl-row dctl-readout">
        <span className="dctl-clock val">{clock}</span>
        <span className="dctl-used val">{d.usedLabel.replace('{x}', Math.round(used))}</span>
        {block ? <span className="dctl-blocked">{d.blockedLabel[block.kind]}</span> : null}
      </div>

      <p className="dctl-hint">{d.hint}</p>
    </div>
  )
}
