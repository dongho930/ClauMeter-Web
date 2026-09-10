import { scroll } from '../scroll.js'

const smooth = (x) => x * x * (3 - 2 * x)

// How "present" a chapter's 3D set is to the *camera*, 0..1. Use this for a set
// whose whole point is where the camera is standing.
export function focusOf(index, width = 1.05) {
  const d = Math.abs(scroll.chapter - index)
  if (d >= width) return 0
  const x = 1 - d / width
  return smooth(x)
}

// How present a set is to the *reader*, 0..1 — lit for as long as its section is
// the one being read, regardless of where the camera has got to. Sets that step
// through a list use this, so the last item of the list still has something to
// look at.
export function presenceOf(index, fade = 0.18) {
  const p = scroll.index + scroll.local - index
  if (p <= -fade || p >= 1 + fade) return 0
  if (p < fade) return smooth((p + fade) / (2 * fade))
  if (p > 1 - fade) return smooth((1 + fade - p) / (2 * fade))
  return 1
}

// Raw progress through one chapter, 0..1.
export function subOf(index) {
  if (scroll.index < index) return 0
  if (scroll.index > index) return 1
  return scroll.local
}

// Which item of an n-item set is current. The steps finish a little before the
// section does, so the last one gets a proper look rather than a glimpse on the
// way out.
const STEP_SPAN = 0.85
export function stepOf(index, n) {
  const t = Math.min(1, subOf(index) / STEP_SPAN)
  return Math.min(n - 1, Math.floor(t * n))
}

// Prefer the item the reader is actually looking at; fall back to section
// progress if the list has not been measured yet.
export function activeOf(key, n, sectionIndex) {
  const a = scroll.active[key]
  if (a === undefined) return stepOf(sectionIndex, n)
  return Math.min(n - 1, a)
}
