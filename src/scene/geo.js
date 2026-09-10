import * as THREE from 'three'

export function rectOutline(w, h, notch = 0) {
  const x = w / 2
  const y = h / 2
  const p = notch > 0
    ? [[-x, y - notch], [-x + notch, y], [x, y], [x, -y], [-x, -y], [-x, y - notch]]
    : [[-x, y], [x, y], [x, -y], [-x, -y], [-x, y]]
  const pts = []
  for (let i = 0; i < p.length - 1; i++) {
    pts.push(p[i][0], p[i][1], 0, p[i + 1][0], p[i + 1][1], 0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

export function circleOutline(radius, segments = 72, arc = Math.PI * 2, start = 0) {
  const pts = []
  for (let i = 0; i < segments; i++) {
    const a0 = start + (i / segments) * arc
    const a1 = start + ((i + 1) / segments) * arc
    pts.push(Math.cos(a0) * radius, Math.sin(a0) * radius, 0)
    pts.push(Math.cos(a1) * radius, Math.sin(a1) * radius, 0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

// A card's fixing screws and its DIP-switch bank. The switch pattern encodes
// the card's own index, the way a real backplane card is addressed.
export function plateDetail(w, h, index) {
  const x = w / 2
  const y = h / 2
  const pts = []
  const cross = (cx, cy, r) => {
    pts.push(cx - r, cy, 0, cx + r, cy, 0)
    pts.push(cx, cy - r, 0, cx, cy + r, 0)
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) cross(sx * (x - 0.16), sy * (y - 0.16), 0.05)

  // label strip
  pts.push(-x + 0.3, y - 0.36, 0, x - 0.3, y - 0.36, 0)

  // eight switches, bit set = up
  const n = 8
  const sw = 0.09
  const gap = 0.15
  const startX = -x + 0.34
  const baseY = -y + 0.3
  for (let i = 0; i < n; i++) {
    const on = ((index + 1) >> (i % 4)) & 1
    const cx = startX + i * gap
    const y0 = baseY + (on ? 0.06 : -0.06)
    pts.push(cx, y0 - sw, 0, cx, y0 + sw, 0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

// ---- card faces -------------------------------------------------------------
// One line drawing per feature, so a card in the rack says what it is instead of
// being an empty box. Drawn in the plate's own space: the label strip sits at
// y≈0.49 and the switch bank at y≈-0.55, leaving roughly x±1.15, y±0.40 free.

const seg = (p, x1, y1, x2, y2) => p.push(x1, y1, 0, x2, y2, 0)

function arcTo(p, cx, cy, r, a0, a1, n = 40) {
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n
    seg(p, cx + Math.cos(t0) * r, cy + Math.sin(t0) * r, cx + Math.cos(t1) * r, cy + Math.sin(t1) * r)
  }
}

function dashTo(p, x1, y1, x2, y2, dash = 0.07) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const n = Math.max(1, Math.round(len / (dash * 2)))
  for (let i = 0; i < n; i++) {
    const a = i / n
    const b = (i + 0.55) / n
    seg(p, x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b)
  }
}

const GAP = -Math.PI / 4          // instrument dials open at the bottom
const SWEEP = Math.PI * 1.5

function glyphGauges(p) {
  arcTo(p, 0, 0, 0.38, GAP, GAP + SWEEP, 54)
  arcTo(p, 0, 0, 0.23, GAP, GAP + SWEEP * 0.55, 32)
  seg(p, 0, 0.05, 0, 0.16)
}

function glyphPace(p) {
  const pts = [[-0.95, -0.30], [-0.55, -0.16], [-0.2, -0.06], [0.1, 0.10]]
  for (let i = 0; i < pts.length - 1; i++) seg(p, ...pts[i], ...pts[i + 1])
  dashTo(p, 0.1, 0.10, 0.85, 0.36)          // where the pace is heading
  dashTo(p, -0.95, 0.40, 0.95, 0.40, 0.1)   // the limit it is heading for
  seg(p, 0.85, 0.30, 0.85, 0.42)
}

function glyphThresholds(p) {
  seg(p, -0.5, -0.40, -0.5, 0.40)
  const marks = [[-0.10, 0.16], [0.10, 0.22], [0.28, 0.30]]  // 50 / 75 / 90
  for (const [y, w] of marks) seg(p, -0.5, y, -0.5 + w, y)
  // the alert going off at the top mark
  for (let i = 0; i < 3; i++) {
    const a = -0.5 + i * 0.5
    seg(p, 0.46 + Math.cos(a) * 0.10, 0.30 + Math.sin(a) * 0.10, 0.46 + Math.cos(a) * 0.22, 0.30 + Math.sin(a) * 0.22)
  }
}

function glyphLanguages(p) {
  const n = 12
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const x = Math.cos(a) * 0.36
    const y = Math.sin(a) * 0.36
    const r = i === 0 ? 0.07 : 0.035
    arcTo(p, x, y, r, 0, Math.PI * 2, 8)
  }
  arcTo(p, 0, 0, 0.12, 0, Math.PI * 2, 14)
}

function glyphOutOfTheWay(p) {
  dashTo(p, -0.55, -0.34, 0.55, -0.34, 0.09)
  dashTo(p, 0.55, -0.34, 0.55, 0.34, 0.09)
  dashTo(p, 0.55, 0.34, -0.55, 0.34, 0.09)
  dashTo(p, -0.55, 0.34, -0.55, -0.34, 0.09)
  // a pointer passing straight through
  seg(p, -0.92, 0.30, 0.30, -0.18)
  seg(p, 0.30, -0.18, 0.14, -0.17)
  seg(p, 0.30, -0.18, 0.25, -0.03)
  seg(p, 0.30, -0.18, 0.92, -0.42)
}

function glyphNoSetup(p) {
  // a plug already seated in its socket
  seg(p, -0.9, -0.22, -0.28, -0.22)
  seg(p, -0.9, 0.22, -0.28, 0.22)
  seg(p, -0.9, -0.22, -0.9, 0.22)
  seg(p, -0.28, -0.22, -0.28, -0.08)
  seg(p, -0.28, 0.22, -0.28, 0.08)
  seg(p, -0.28, -0.08, -0.02, -0.08)
  seg(p, -0.28, 0.08, -0.02, 0.08)
  seg(p, 0.06, -0.34, 0.06, 0.34)
  seg(p, 0.06, -0.34, 0.62, -0.34)
  seg(p, 0.06, 0.34, 0.62, 0.34)
  seg(p, 0.62, -0.34, 0.62, 0.34)
  // and a tick, because there is nothing left to do
  seg(p, 0.74, 0.02, 0.84, -0.10)
  seg(p, 0.84, -0.10, 1.02, 0.20)
}

const GLYPHS = [glyphGauges, glyphPace, glyphThresholds, glyphLanguages, glyphOutOfTheWay, glyphNoSetup]

export function plateGlyph(index) {
  const p = []
  GLYPHS[index % GLYPHS.length](p)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  return g
}

// ---- sculptures -------------------------------------------------------------
// Shapes that carry no product meaning at all. They are here because a hall full
// of one repeated form is a poorer hall.

export function icoWire(r = 1) {
  const t = (1 + Math.sqrt(5)) / 2
  const v = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((p) => {
    const l = Math.hypot(...p)
    return p.map((c) => (c / l) * r)
  })
  const f = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
  ]
  const seen = new Set()
  const p = []
  for (const [a, b, c] of f) {
    for (const [i, j] of [[a,b],[b,c],[c,a]]) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      p.push(...v[i], ...v[j])
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  return g
}

export function latticeWire(size = 3, n = 3) {
  const p = []
  const s = size / 2
  const at = (i) => -s + (i / n) * size
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      p.push(at(i), at(j), -s, at(i), at(j), s)
      p.push(at(i), -s, at(j), at(i), s, at(j))
      p.push(-s, at(i), at(j), s, at(i), at(j))
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  return g
}

export function helixWire(r = 2, turns = 3.5, height = 6, segments = 260, strands = 2) {
  const p = []
  for (let s = 0; s < strands; s++) {
    const phase = (s / strands) * Math.PI * 2
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments
      const t1 = (i + 1) / segments
      const a0 = phase + t0 * turns * Math.PI * 2
      const a1 = phase + t1 * turns * Math.PI * 2
      p.push(Math.cos(a0) * r, -height / 2 + t0 * height, Math.sin(a0) * r)
      p.push(Math.cos(a1) * r, -height / 2 + t1 * height, Math.sin(a1) * r)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  return g
}

export function burstWire(r = 3, n = 40) {
  const p = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const inner = r * (0.32 + (i % 3) * 0.06)
    const outer = r * (i % 4 === 0 ? 1 : 0.78)
    p.push(Math.cos(a) * inner, Math.sin(a) * inner, 0)
    p.push(Math.cos(a) * outer, Math.sin(a) * outer, 0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  return g
}

// An aperture of n straight blades. `inner` is how far the blades stand off the
// centre, so growing it opens the iris.
export function irisBlades(n = 8, inner = 1, outerR = 2.4) {
  const p = []
  const half = Math.tan(Math.PI / n) * inner
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const cx = Math.cos(a) * inner
    const cy = Math.sin(a) * inner
    const tx = -Math.sin(a)
    const ty = Math.cos(a)
    // the blade edge across the aperture
    p.push(cx - tx * half, cy - ty * half, 0, cx + tx * half, cy + ty * half, 0)
    // and a short arm back toward the housing, not all the way — long arms read
    // as a tangle rather than a shutter
    const armR = inner + (outerR - inner) * 0.4
    p.push(cx + tx * half, cy + ty * half, 0, Math.cos(a) * armR + tx * half * 0.55, Math.sin(a) * armR + ty * half * 0.55, 0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  return g
}
