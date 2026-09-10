import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { circleOutline, icoWire, latticeWire, helixWire, burstWire } from './geo.js'
import { presenceOf, focusOf } from './useFocus.js'

// Scenery. None of this means anything — it is the hall the instruments are
// standing in, and its whole job is to give the light something to happen on.

const STEEL = '#5d7d8c'

// ---- a floor of receding graduations, so depth is felt rather than inferred --
export function Floor({ from = 14, to = -168, halfWidth = 16, y = -4.6, step = 2.4 }) {
  const geo = useMemo(() => {
    const p = []
    for (let z = from; z >= to; z -= step) {
      p.push(-halfWidth, y, z, halfWidth, y, z)
    }
    for (let i = -6; i <= 6; i++) {
      const x = (i / 6) * halfWidth
      p.push(x, y, from, x, y, to)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [from, to, halfWidth, y, step])

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={STEEL} transparent opacity={0.085} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  )
}

// ---- five different sculptures turning slowly in the dark, off the flight path
function Rig({ position, kind, radius, speed, tilt }) {
  const parts = useRef([])

  const geos = useMemo(() => {
    switch (kind) {
      case 'ico':
        return [icoWire(radius), icoWire(radius * 0.58)]
      case 'lattice':
        return [latticeWire(radius * 1.5, 3)]
      case 'helix':
        return [helixWire(radius * 0.62, 3.5, radius * 2.4, 220, 3)]
      case 'burst':
        return [burstWire(radius, 52), circleOutline(radius * 0.34, 60)]
      default:
        return [circleOutline(radius, 96), circleOutline(radius * 0.74, 84), circleOutline(radius * 0.46, 64)]
    }
  }, [kind, radius])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed
    parts.current.forEach((m, i) => {
      if (!m) return
      const s = 1 + i * 0.35
      if (kind === 'gyro') {
        if (i === 0) m.rotation.set(t * 0.09, t * 0.14, tilt)
        if (i === 1) m.rotation.set(Math.PI / 2 + t * 0.11, t * -0.08, 0)
        if (i === 2) m.rotation.set(t * -0.13, Math.PI / 2 + t * 0.1, 0)
      } else if (kind === 'burst') {
        m.rotation.set(0, 0, tilt + t * (i === 0 ? 0.07 : -0.16))
      } else {
        m.rotation.set(t * 0.07 * s, t * 0.11 * s, tilt)
      }
    })
  })

  return (
    <group position={position}>
      {geos.map((g, i) => (
        <lineSegments key={i} geometry={g} ref={(el) => el && (parts.current[i] = el)}>
          <lineBasicMaterial
            color={STEEL}
            transparent
            opacity={0.2 - i * 0.05}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      ))}
    </group>
  )
}

// Placed to the sides and behind, so they never contend with what is being read.
const RIGS = [
  { position: [-11.5, 2.4, -26], kind: 'gyro', radius: 4.6, speed: 0.8, tilt: 0.4 },
  { position: [12.5, -1.6, -56], kind: 'ico', radius: 3.6, speed: 0.55, tilt: -0.3 },
  { position: [-13.5, 1.2, -88], kind: 'helix', radius: 4.2, speed: 0.95, tilt: 0.2 },
  { position: [11.0, 2.8, -124], kind: 'lattice', radius: 3.0, speed: 0.7, tilt: -0.5 },
  { position: [-10.5, -2.2, -156], kind: 'burst', radius: 4.4, speed: 0.6, tilt: 0.3 },
  { position: [13.0, 3.4, -8], kind: 'ico', radius: 2.8, speed: 0.85, tilt: 0.1 },
  { position: [-12.0, -2.8, -112], kind: 'gyro', radius: 3.8, speed: 0.5, tilt: -0.2 },
]

export function Armatures({ animate = true }) {
  return (
    <group>
      {RIGS.map((r, i) => (
        <Rig key={i} {...r} speed={animate ? r.speed : 0} />
      ))}
    </group>
  )
}

// ---- a slow sweep around the hero dial, plus a counter-turning tick ring ----
export function DialRig({ radius = 3.4, animate = true, section = 0, dim = 1, presence }) {
  const ring = useRef()
  const sweep = useRef()
  const group = useRef()

  const tickRing = useMemo(() => {
    const p = []
    const n = 72
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const len = i % 6 === 0 ? 0.26 : 0.12
      p.push(Math.cos(a) * radius, Math.sin(a) * radius, 0)
      p.push(Math.cos(a) * (radius + len), Math.sin(a) * (radius + len), 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [radius])

  // A leading edge with a tail that dies away behind it, rather than a solid fan.
  const sweepGeo = useMemo(() => {
    const p = []
    const c = []
    const n = 72
    const span = 0.9
    const lit = new THREE.Color('#3fd08a')
    for (let i = 0; i < n; i++) {
      const f = 1 - i / n
      const a = -(i / n) * span
      const inner = radius * 0.30
      const outer = radius * 0.99
      p.push(Math.cos(a) * inner, Math.sin(a) * inner, 0)
      p.push(Math.cos(a) * outer, Math.sin(a) * outer, 0)
      const k = Math.pow(f, 2.2)
      c.push(lit.r * k * 0.25, lit.g * k * 0.25, lit.b * k * 0.25)
      c.push(lit.r * k, lit.g * k, lit.b * k)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3))
    return g
  }, [radius])

  useFrame(({ clock }, dt) => {
    const f = (presence ? presence() : 1) * dim
    const k = Math.min(1, dt * 6)
    if (group.current) group.current.visible = f > 0.002
    if (ring.current) {
      ring.current.material.opacity += (f * 0.34 - ring.current.material.opacity) * k
      if (animate) ring.current.rotation.z = clock.elapsedTime * -0.045
    }
    if (sweep.current) {
      sweep.current.material.opacity += (f * 0.5 - sweep.current.material.opacity) * k
      if (animate) sweep.current.rotation.z = clock.elapsedTime * 0.55
    }
  })

  return (
    <group ref={group}>
      <lineSegments ref={ring} geometry={tickRing}>
        <lineBasicMaterial color={STEEL} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <lineSegments ref={sweep} geometry={sweepGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  )
}

// ---- a turning polyhedron for the middle of the language ring ---------------
export function Core({ position = [0, 0, 0], section = null, dim = 1, animate = true, radius = 0.95 }) {
  const a = useRef()
  const b = useRef()
  const shell = useMemo(() => icoWire(radius), [radius])
  const inner = useMemo(() => icoWire(radius * 0.52), [radius])

  useFrame(({ clock }, dt) => {
    const f = (section === null ? 1 : presenceOf(section)) * dim
    const k = Math.min(1, dt * 6)
    const t = clock.elapsedTime
    if (a.current) {
      a.current.material.opacity += (f * 0.75 - a.current.material.opacity) * k
      if (animate) a.current.rotation.set(t * 0.18, t * 0.26, 0)
    }
    if (b.current) {
      b.current.material.opacity += (f * 0.4 - b.current.material.opacity) * k
      if (animate) b.current.rotation.set(-t * 0.3, t * 0.2, t * 0.1)
    }
  })

  return (
    <group position={position}>
      <lineSegments ref={a} geometry={shell}>
        <lineBasicMaterial color="#3fd08a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <lineSegments ref={b} geometry={inner}>
        <lineBasicMaterial color={STEEL} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  )
}

// ---- something standing in the dark beside the datasheet -------------------
export function Monolith({ position = [0, 0, 0], chapter = 6, dim = 1, animate = true }) {
  const g = useRef()
  const geo = useMemo(() => latticeWire(5.4, 4), [])

  useFrame(({ clock }, dt) => {
    const f = focusOf(chapter, 1.5) * dim
    const k = Math.min(1, dt * 6)
    if (!g.current) return
    g.current.visible = f > 0.002
    g.current.children[0].material.opacity += (f * 0.16 - g.current.children[0].material.opacity) * k
    if (animate) {
      const t = clock.elapsedTime
      g.current.rotation.set(t * 0.035, t * 0.05, 0.2)
    }
  })

  return (
    <group ref={g} position={position}>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color={STEEL} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  )
}
