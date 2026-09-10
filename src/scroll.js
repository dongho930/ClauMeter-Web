// One source of truth for "where are we on the page".
//
//   p        0..1 across the whole document
//   index    which chapter the viewport is in
//   local    0..1 raw progress through that chapter
//   chapter  index + a hold curve: the camera parks at a keyframe for the first
//            third of a section, then flies to the next one and arrives before
//            the section ends. Sets stay lit while their section is being read.
//
// The 3D scene reads this object directly inside useFrame so that scrolling
// never triggers a React render. DOM consumers subscribe instead.

export const scroll = { p: 0, index: 0, local: 0, chapter: 0, count: 0, active: {} }

// Where on the screen a reader is looking, as a fraction of the viewport.
const READ_LINE = 0.45

// The camera parks for most of a section and only flies near the end. Moving at
// 0.38 meant it had already left while the reader was still on the third or
// fourth item of the list, taking that item's 3D with it.
const HOLD_IN = 0.62
const HOLD_OUT = 0.96

let tops = []
let trackers = []
let maxScroll = 1
const subs = new Set()
let raf = 0
let lastP = -1

function hold(x) {
  if (x <= HOLD_IN) return 0
  if (x >= HOLD_OUT) return 1
  const t = (x - HOLD_IN) / (HOLD_OUT - HOLD_IN)
  return t * t * (3 - 2 * t)
}

function remeasure() {
  const els = Array.from(document.querySelectorAll('[data-chapter]'))
  scroll.count = els.length
  maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  // A section shorter than the viewport can have a top past the last scroll
  // position; clamping keeps every section reachable instead of stranding it.
  tops = els.map((el) => Math.min(el.getBoundingClientRect().top + window.scrollY, maxScroll))

  // Lists whose 3D set steps along with them. Tying the set to the item actually
  // on screen keeps the two in step whatever the section's height works out to.
  trackers = Array.from(document.querySelectorAll('[data-track]')).map((el) => ({
    key: el.dataset.track,
    items: Array.from(el.querySelectorAll('[data-item]')).map((it) => {
      const r = it.getBoundingClientRect()
      return { mid: r.top + window.scrollY + r.height / 2 }
    }),
  }))
  update()
}

function update() {
  const y = window.scrollY
  scroll.p = Math.min(1, Math.max(0, y / maxScroll))

  const n = tops.length
  if (!n) return

  let i = n - 1
  let local = 0
  for (let k = 0; k < n - 1; k++) {
    if (y < tops[k + 1]) {
      i = k
      local = (y - tops[k]) / Math.max(1, tops[k + 1] - tops[k])
      break
    }
  }
  if (i === n - 1) local = (y - tops[n - 1]) / Math.max(1, maxScroll - tops[n - 1])

  scroll.index = i
  scroll.local = Math.min(1, Math.max(0, local))
  scroll.chapter = i + hold(scroll.local)

  const line = y + window.innerHeight * READ_LINE
  for (const t of trackers) {
    if (!t.items.length) continue
    let best = 0
    let bestD = Infinity
    for (let k = 0; k < t.items.length; k++) {
      const d = Math.abs(t.items[k].mid - line)
      if (d < bestD) { bestD = d; best = k }
    }
    scroll.active[t.key] = best
  }
}

function tick() {
  update()
  if (scroll.p !== lastP) {
    lastP = scroll.p
    subs.forEach((fn) => fn(scroll))
  }
  raf = requestAnimationFrame(tick)
}

export function initScroll() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  remeasure()
  window.addEventListener('resize', remeasure)
  if (document.fonts?.ready) document.fonts.ready.then(remeasure)
  const ro = new ResizeObserver(remeasure)
  ro.observe(document.documentElement)
  raf = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', remeasure)
    ro.disconnect()
  }
}

export function subscribeScroll(fn) {
  subs.add(fn)
  fn(scroll)
  return () => subs.delete(fn)
}
