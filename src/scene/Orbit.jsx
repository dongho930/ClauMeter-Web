import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { circleOutline } from './geo.js'
import { presenceOf } from './useFocus.js'

// Twelve nodes on a ring, one per language the widget ships with. The node for
// the language being previewed swings to the front and lights.
const N = 12
const R = 3.2

export function Orbit({ chapter, selected = 0, z = -94, animate = true, dim = 1 }) {
  const group = useRef()
  const nodes = useRef([])
  const node = useMemo(() => circleOutline(0.19, 28), [])
  const halo = useMemo(() => circleOutline(0.34, 28), [])

  const spokes = useMemo(() => {
    const pts = []
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      pts.push(Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0)
      pts.push(Math.cos(a) * (R - 0.3), Math.sin(a) * (R - 0.3), 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])

  const spokeMat = useRef()

  // Three shells tipped off the ring's own plane, turning at their own rates.
  // Pure scenery — they give the ring somewhere to sit.
  const shells = useRef([])
  const shellGeo = useMemo(
    () => [circleOutline(R * 1.34, 120), circleOutline(R * 1.62, 132), circleOutline(R * 1.06, 110)],
    []
  )
  const SHELL_TILT = [
    [1.15, 0.2, 0],
    [0.35, 1.25, 0],
    [1.45, -0.75, 0],
  ]

  useFrame(({ clock }, dt) => {
    const f = presenceOf(chapter) * dim
    const k = Math.min(1, dt * 6)
    if (group.current) {
      group.current.visible = f > 0.001
      // Bring the selected node to the top of the ring.
      const want = -((selected / N) * Math.PI * 2) + Math.PI / 2
      const cur = group.current.rotation.z
      let d = want - cur
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      group.current.rotation.z = cur + d * Math.min(1, dt * 3)
    }
    if (spokeMat.current) spokeMat.current.opacity = f * 0.18

    shells.current.forEach((sh, i) => {
      if (!sh) return
      sh.material.opacity += (f * (0.20 - i * 0.045) - sh.material.opacity) * k
      if (animate) {
        const t = clock.elapsedTime
        sh.rotation.set(SHELL_TILT[i][0] + t * (0.06 + i * 0.03), SHELL_TILT[i][1] + t * (0.09 - i * 0.025), 0)
      }
    })

    const pulse = animate ? 1 + Math.sin(clock.elapsedTime * 2) * 0.06 : 1
    nodes.current.forEach((n, i) => {
      if (!n) return
      const lit = i === selected ? 1 : 0
      n.children.forEach((c, ci) => {
        const target = f * (ci === 0 ? 0.34 + lit * 0.9 : lit * 0.7)
        c.material.opacity += (target - c.material.opacity) * k
        c.material.color.lerp(lit ? LIT : COLD, k)
      })
      const s = (1 + lit * 0.5) * (lit ? pulse : 1)
      n.scale.setScalar(n.scale.x + (s - n.scale.x) * k)
    })
  })

  return (
    <group ref={group} position={[0, 0, z]}>
      {shellGeo.map((g, i) => (
        <lineSegments key={i} geometry={g} rotation={SHELL_TILT[i]} ref={(el) => el && (shells.current[i] = el)}>
          <lineBasicMaterial color="#5d7d8c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </lineSegments>
      ))}
      <lineSegments geometry={spokes}>
        <lineBasicMaterial ref={spokeMat} color="#5d7d8c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      {Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2
        return (
          <group
            key={i}
            position={[Math.cos(a) * R, Math.sin(a) * R, 0]}
            ref={(el) => el && (nodes.current[i] = el)}
          >
            <lineSegments geometry={node}>
              <lineBasicMaterial color="#5d7d8c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
            </lineSegments>
            <lineSegments geometry={halo}>
              <lineBasicMaterial color="#5d7d8c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
            </lineSegments>
          </group>
        )
      })}
    </group>
  )
}

const LIT = new THREE.Color('#3fd08a')
const COLD = new THREE.Color('#5d7d8c')
