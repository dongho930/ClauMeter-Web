import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { presenceOf } from './useFocus.js'

// The widget's own face, built at room scale: two horizontal meters, each with a
// graduated scale above it and a hatched redline past 90%. Where the dial is the
// product's mark, this is what the product actually looks like in use.

const OK = new THREE.Color('#3fd08a')
const CAUTION = new THREE.Color('#f0b429')
const RED = new THREE.Color('#f0533f')
const STEEL = new THREE.Color('#5d7d8c')

const colorFor = (v) => (v >= 0.9 ? RED : v >= 0.75 ? CAUTION : OK)

function chassis(w, h, gap) {
  const p = []
  const seg = (x1, y1, x2, y2) => p.push(x1, y1, 0, x2, y2, 0)

  for (const cy of [gap / 2 + h / 2, -gap / 2 - h / 2]) {
    const t = cy + h / 2
    const b = cy - h / 2
    // track
    seg(-w / 2, t, w / 2, t)
    seg(-w / 2, b, w / 2, b)
    seg(-w / 2, b, -w / 2, t)
    seg(w / 2, b, w / 2, t)
    // graduations above, scaled to the meter so a small one does not crowd
    const ticks = Math.max(8, Math.round(w * 3.4))
    for (let i = 0; i <= ticks; i++) {
      const x = -w / 2 + (i / ticks) * w
      seg(x, t + h * 0.07, x, t + h * (i % 2 === 0 ? 0.34 : 0.18))
    }
    // the redline zone, hatched
    const x90 = -w / 2 + 0.9 * w
    for (let i = 0; i < 7; i++) {
      const a = x90 + (i / 7) * (w / 2 - x90)
      seg(a, b, Math.min(w / 2, a + h * 0.7), t)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  return g
}

export function Bars({
  width = 6,
  height = 0.42,
  gap = 0.55,
  position = [0, 0, 0],
  section = null,
  dim = 1,
  driver = null,
  v5 = 0.62,
  vw = 0.34,
  opacity = 1,
}) {
  const group = useRef()
  const frame = useRef()
  const fills = useRef([])

  const geo = useMemo(() => chassis(width, height, gap), [width, height, gap])
  const quad = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const rows = useMemo(
    () => [gap / 2 + height / 2, -gap / 2 - height / 2],
    [gap, height]
  )

  useFrame((state, dt) => {
    const d = driver ? driver(state) : null
    const target = [d?.v5 ?? v5, d?.vw ?? vw]
    let f = (d?.opacity ?? opacity) * dim
    if (section !== null) f *= presenceOf(section)

    const k = Math.min(1, dt * 6)
    if (group.current) group.current.visible = f > 0.002
    if (frame.current) frame.current.material.opacity += (f * 0.5 - frame.current.material.opacity) * k

    fills.current.forEach((m, i) => {
      if (!m) return
      const want = Math.max(0, Math.min(1, target[i]))
      const cur = m.userData.v ?? 0
      const v = cur + (want - cur) * Math.min(1, dt * 4)
      m.userData.v = v
      // grow from the left edge
      m.scale.x = Math.max(0.0001, v * width)
      m.position.x = -width / 2 + (v * width) / 2
      m.material.color.lerp(colorFor(v), k)
      m.material.opacity += (f * 0.85 - m.material.opacity) * k
    })
  })

  return (
    <group ref={group} position={position}>
      <lineSegments ref={frame} geometry={geo}>
        <lineBasicMaterial color={STEEL} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      {rows.map((y, i) => (
        <mesh
          key={i}
          geometry={quad}
          position={[0, y, 0]}
          scale={[0.0001, height * 0.62, 1]}
          ref={(el) => el && (fills.current[i] = el)}
        >
          <meshBasicMaterial color={OK} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}
