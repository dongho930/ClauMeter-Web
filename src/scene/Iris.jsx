import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { circleOutline, irisBlades } from './geo.js'
import { presenceOf, activeOf } from './useFocus.js'

// Four apertures on the travel axis, one per setup step. The one you are on
// stands open and lit; the others are stopped down. The camera flies through
// them in order, which is the only reason they are rings at all.

const N = 4
const BLADES = 9
const OUTER = 2.6
const LIT = new THREE.Color('#3fd08a')
const COLD = new THREE.Color('#5d7d8c')

// The blades are rebuilt from a small set of pre-made openings rather than every
// frame — nine steps is more than enough to read as motion.
const STOPS = 9
const OPEN_MIN = 0.34
const OPEN_MAX = 1.72

export function Iris({ chapter = 3, z = -64, span = 12, dim = 1 }) {
  const group = useRef()
  const gates = useRef([])

  const rings = useMemo(() => [circleOutline(OUTER, 96), circleOutline(OUTER * 1.1, 96)], [])
  const blades = useMemo(
    () =>
      Array.from({ length: STOPS }, (_, i) =>
        irisBlades(BLADES, OPEN_MIN + (i / (STOPS - 1)) * (OPEN_MAX - OPEN_MIN), OUTER)
      ),
    []
  )

  const zs = useMemo(
    () => Array.from({ length: N }, (_, i) => z + span / 2 - (i / (N - 1)) * span),
    [z, span]
  )

  useFrame((_, dt) => {
    const f = presenceOf(chapter) * dim
    const active = activeOf('steps', N, chapter)
    const k = Math.min(1, dt * 6)

    gates.current.forEach((g, i) => {
      if (!g) return
      const lit = i === active ? 1 : 0
      // open toward the last stop when lit, close down when not
      const want = lit ? STOPS - 1 : 1
      const cur = g.userData.stop ?? 0
      const nxt = cur + (want - cur) * Math.min(1, dt * 5)
      g.userData.stop = nxt
      const idx = Math.max(0, Math.min(STOPS - 1, Math.round(nxt)))
      const [ringA, ringB, blade] = g.children
      if (blade.geometry !== blades[idx]) blade.geometry = blades[idx]

      blade.material.opacity += (f * (0.2 + lit * 0.85) - blade.material.opacity) * k
      blade.material.color.lerp(lit ? LIT : COLD, k)
      blade.rotation.z += ((lit ? 0.26 : 0) - blade.rotation.z) * Math.min(1, dt * 5)

      ringA.material.opacity += (f * (0.24 + lit * 0.7) - ringA.material.opacity) * k
      ringB.material.opacity += (f * (0.1 + lit * 0.32) - ringB.material.opacity) * k
      ringA.material.color.lerp(lit ? LIT : COLD, k)

      const s = 1 + lit * 0.05
      g.scale.setScalar(g.scale.x + (s - g.scale.x) * k)
    })

    if (group.current) group.current.visible = f > 0.001
  })

  return (
    <group ref={group}>
      {zs.map((gz, i) => (
        <group key={i} position={[0, 0, gz]} ref={(el) => el && (gates.current[i] = el)}>
          <lineSegments geometry={rings[0]}>
            <lineBasicMaterial color={COLD} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </lineSegments>
          <lineSegments geometry={rings[1]}>
            <lineBasicMaterial color={COLD} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </lineSegments>
          <lineSegments geometry={blades[0]}>
            <lineBasicMaterial color={COLD} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}
