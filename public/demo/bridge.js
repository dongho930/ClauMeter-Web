// What preload.js is to Electron, this file is to the demo.
//
// The three pages in this folder are the app's real windows, copied byte-for-byte
// by scripts/sync-demo.mjs. They touch nothing outside of window.api, so giving
// them a window.api backed by the page around them is enough to make them run in
// a browser — no fork, no re-creation, nothing to keep in sync by hand.
//
// The host side lives in src/demo/host.js. Both frames are same-origin, so the
// two talk through a plain object on the parent rather than postMessage.
(function () {
  const FRAME = (location.pathname.split('/').pop() || '').replace(/\.html$/, '') || 'widget'

  // Opened directly instead of inside the demo (e.g. /demo/widget.html): keep the
  // page from throwing, and say why it is empty.
  const host = (() => {
    try {
      return window.parent !== window && window.parent.__CLAUMETER_DEMO_HOST__
    } catch {
      return null
    }
  })()

  if (!host) {
    window.api = new Proxy({}, { get: () => () => Promise.resolve({}) })
    document.addEventListener('DOMContentLoaded', () => {
      document.body.style.cssText = 'font:12px system-ui;padding:16px;color:#9aa0a6'
      document.body.textContent = 'This window is part of the ClauMeter demo. Open the site instead.'
    })
    return
  }

  // Claims the frame: anything the previous document in it had registered goes.
  host.attach(FRAME)

  const on = (channel, cb) => host.on(FRAME, channel, cb)
  const send = (channel, payload) => host.send(FRAME, channel, payload)
  const invoke = (channel, payload) => host.invoke(FRAME, channel, payload)

  window.api = {
    onUsageUpdate: (cb) => on('usage-update', cb),
    onCalibrateInit: (cb) => on('calibrate-init', cb),
    submitCalibration: (data) => send('calibrate-submit', data),
    cancelCalibration: () => send('calibrate-cancel'),
    previewOpacity: (value) => send('calibrate-opacity-preview', value),
    openDetailWindow: () => send('open-detail-window'),
    openCalibrateWindow: () => send('open-calibrate-window'),
    quitApp: () => send('quit-app'),
    getUsageAdvice: (forceRefresh) => invoke('get-usage-advice', { forceRefresh }),
    toggleClickThrough: () => send('clickthrough:toggle'),
    getClickThroughState: () => invoke('clickthrough:get-state'),
    onClickThroughState: (cb) => on('clickthrough:state', cb),
    setClickThroughHover: (hovering) => send('clickthrough:hover', hovering),
    onLocaleData: (cb) => on('locale-data', cb),
    setLanguage: (code) => send('set-language', code),
  }

  // ---- everything below is demo-only, and has no counterpart in the app ----

  // The app's window is sized by Electron; an iframe needs to be told that the
  // panel fills it. Injected here so the copied markup stays untouched.
  const style = document.createElement('style')
  style.textContent =
    FRAME === 'widget'
      ? 'html,body{height:100%}body{cursor:move}.header-right,.info-btn{cursor:pointer}'
      : 'html{height:100%}' +
        // The detail window outgrows its fixed height in the app as well, so it
        // scrolls here too — just not with a full-width desktop scrollbar sitting
        // in the middle of the stage.
        '::-webkit-scrollbar{width:9px}::-webkit-scrollbar-track{background:#1f2126}' +
        '::-webkit-scrollbar-thumb{background:#3a3d44;border-radius:5px}' +
        '::-webkit-scrollbar-thumb:hover{background:#4a4e57}'
  document.head.appendChild(style)

  if (FRAME !== 'widget') return

  // In the app the widget is a frameless window with -webkit-app-region: drag, so
  // the OS moves it and .header-right is marked no-drag. Here the stage owns the
  // window's position, so a press on the body hands the drag up to it. The stage
  // puts a shield over the iframe for the duration, which is what lets it keep
  // seeing the pointer once it has left this document.
  let clickThrough = false
  on('clickthrough:state', (enabled) => {
    clickThrough = enabled
  })

  // Once a mouse button goes down inside an iframe, the browser keeps delivering
  // the rest of that gesture to this document — the page around it never sees the
  // move or the release. So the whole gesture is forwarded, not just its start.
  let dragging = false

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || clickThrough) return
    if (e.target.closest('button, a, input, .header-right')) return
    dragging = true
    send('drag-start', { screenX: e.screenX, screenY: e.screenY })
  })

  document.addEventListener('pointermove', (e) => {
    if (dragging) send('drag-move', { screenX: e.screenX, screenY: e.screenY })
  })

  const endDrag = () => {
    if (!dragging) return
    dragging = false
    send('drag-end')
  }
  document.addEventListener('pointerup', endDrag)
  document.addEventListener('pointercancel', endDrag)

  // With click-through on, the app lets the mouse pass straight through the widget
  // and only re-enables it while the pointer is over .safe-controls. Blocking the
  // clicks that would have passed through is how that reads in a browser.
  document.addEventListener(
    'click',
    (e) => {
      if (clickThrough && !e.target.closest('.safe-controls')) {
        e.stopPropagation()
        e.preventDefault()
      }
    },
    true
  )
})()
