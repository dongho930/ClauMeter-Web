import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { presenceOf, subOf } from './useFocus.js'

// A chart recorder: one session drawn across the paper, climbing through the
// caution line and into the redline, where it simply stops. The trace draws
// itself as the section is read — the point being that nothing counts it down
// for you, so the end arrives with no warning at all.

const W = 5.2          // paper width
const BASE = -1.05     // 0%
const TOP = 0.85       // 100%
const OK = new THREE.Color('#3fd08a')
const CAUTION = new THREE.Color('#f0b429')
const RED = new THREE.Color('#f0533f')
const STEEL = new THREE.Color('#5d7d8c')

const N = 150          // samples along the trace
const yOf = (v) => BASE + v * (TOP - BASE)

// A deterministic session: busy, uneven, and finished before the paper runs out.
function usageAt(t) {
  const ramp = Math.pow(t, 0.86)
  const wobble =
    Math.sin(t * 17.0) * 0.012 +
    Math.sin(t * 7.3 + 1.1) * 0.019 +
    Math.sin(t * 3.1 + 0.4) * 0.026
  return Math.max(0, Math.min(1, ramp * 1.16 + wobble))
}

const STOP_T = (() => {
  for (let i = 0; i <= N; i++) if (usageAt(i / N) >= 1) return i / N
  return 1
})()

export function Trace({ section = 1, dim = 1, animate = true }) {
  const group = useRef()
  const traceRef = useRef()
  const stopRef = useRef()
  const paperRef = useRef()
  const limitRef = useRef()
  const cautionRef = useRef()

  // ---- the trace itself, coloured by how full the window was at each point ----
  const traceGeo = useMemo(() => {
    const pos = []
    const col = []
    const c = new THREE.Color()
    const push = (t) => {
      const v = usageAt(t)
      pos.push(-W / 2 + t * W, yOf(v), 0)
      c.copy(v >= 0.9 ? RED : v >= 0.75 ? CAUTION : OK)
      col.push(c.r, c.g, c.b)
    }
    const verts = []
    const cols = []
    const last = Math.ceil(STOP_T * N)
    for (let i = 0; i < last; i++) {
      pos.length = 0
      col.length = 0
      push(i / N)
      push((i + 1) / N)
      verts.push(...pos)
      cols.push(...col)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
    g.setDrawRange(0, 0)
    return g
  }, [])

  // ---- paper: baseline, time graduations, and the two reference lines ----
  const paperGeo = useMemo(() => {
    const p = []
    p.push(-W / 2, BASE, 0, W / 2, BASE, 0)
    for (let i = 0; i <= 40; i++) {
      const x = -W / 2 + (i / 40) * W
      const h = i % 5 === 0 ? 0.14 : 0.07
      p.push(x, BASE, 0, x, BASE - h, 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [])

  const [limitGeo, cautionGeo] = useMemo(() => {
    const dashed = (v) => {
      const p = []
      const y = yOf(v)
      const n = 34
      for (let i = 0; i < n; i++) {
        const a = -W / 2 + (i / n) * W
        p.push(a, y, 0, a + (W / n) * 0.55, y, 0)
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
      return g
    }
    return [dashed(1), dashed(0.75)]
  }, [])

  // ---- where it stopped ----
  const stopGeo = useMemo(() => {
    const x = -W / 2 + STOP_T * W
    const y = TOP + 0.22
    const p = [x, BASE, 0, x, y, 0]
    // a small burst at the head of the pen
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      p.push(x + Math.cos(a) * 0.09, y + Math.sin(a) * 0.09, 0)
      p.push(x + Math.cos(a) * 0.19, y + Math.sin(a) * 0.19, 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [])

  useFrame((_, dt) => {
    const f = presenceOf(section) * dim
    if (group.current) group.current.visible = f > 0.001
    const k = Math.min(1, dt * 6)

    // The pen advances with the reader, and keeps going once the section is left.
    const drawn = Math.min(1, subOf(section) / 0.78)
    const last = Math.ceil(STOP_T * N)
    traceGeo.setDrawRange(0, Math.max(2, Math.floor(drawn * last) * 2))

    if (traceRef.current) traceRef.current.material.opacity += (f - traceRef.current.material.opacity) * k
    if (paperRef.current) paperRef.current.material.opacity += (f * 0.42 - paperRef.current.material.opacity) * k
    if (cautionRef.current) cautionRef.current.material.opacity += (f * 0.34 - cautionRef.current.material.opacity) * k
    if (limitRef.current) limitRef.current.material.opacity += (f * 0.65 - limitRef.current.material.opacity) * k
    if (stopRef.current) {
      const reached = drawn >= 0.985 ? 1 : 0
      stopRef.current.material.opacity += (f * reached * 0.9 - stopRef.current.material.opacity) * k
    }
  })

  return (
    <group ref={group}>
      <lineSegments ref={paperRef} geometry={paperGeo}>
        <lineBasicMaterial color={STEEL} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <lineSegments ref={cautionRef} geometry={cautionGeo}>
        <lineBasicMaterial color={CAUTION} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <lineSegments ref={limitRef} geometry={limitGeo}>
        <lineBasicMaterial color={RED} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <lineSegments ref={traceRef} geometry={traceGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <lineSegments ref={stopRef} geometry={stopGeo}>
        <lineBasicMaterial color={RED} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  )
}

export const TRACE = { W, BASE, TOP, STOP_T, yOf }
