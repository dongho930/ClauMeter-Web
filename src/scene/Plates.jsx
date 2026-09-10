import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rectOutline, plateDetail, plateGlyph } from './geo.js'
import { presenceOf, activeOf } from './useFocus.js'

// Six panel plates stacked in a rack, fanned back into depth. As you read down
// the feature list the matching plate is pulled forward out of the stack and
// powered up — the way you would slide one card out of an equipment bay.
const N = 6

// Where the chosen card goes to be read. Pulling it forward from wherever it sat
// in the rack put the last ones off the side of the screen.
const STAGE = [1.4, 0.1, -47.5]

const LIT = new THREE.Color('#3fd08a')
const COLD = new THREE.Color('#5d7d8c')

export function Plates({ chapter, z = -52, xBase = 1.5, dim = 1 }) {
  const group = useRef()
  const plates = useRef([])

  const outline = useMemo(() => rectOutline(2.75, 1.7, 0.34), [])
  const fillGeo = useMemo(() => new THREE.PlaneGeometry(2.75, 1.7), [])
  const details = useMemo(() => Array.from({ length: N }, (_, i) => plateDetail(2.75, 1.7, i)), [])
  const glyphs = useMemo(() => Array.from({ length: N }, (_, i) => plateGlyph(i)), [])

  const layout = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => ({
        base: [xBase + i * 0.3, 1.0 - i * 0.4, z + i * 1.15],
        rotation: [0.04, -0.34, 0.015],
      })),
    [z, xBase]
  )

  useFrame((_, dt) => {
    const f = presenceOf(chapter) * dim
    const active = activeOf('features', N, chapter)
    const k = Math.min(1, dt * 6)

    plates.current.forEach((p, i) => {
      if (!p) return
      const lit = i === active ? 1 : 0
      const [edge, fillMesh, detail, glyph] = p.children
      edge.material.opacity += (f * (0.34 + lit * 0.78) - edge.material.opacity) * k
      fillMesh.material.opacity += (f * (0.012 + lit * 0.07) - fillMesh.material.opacity) * k
      detail.material.opacity += (f * (0.18 + lit * 0.7) - detail.material.opacity) * k
      glyph.material.opacity += (f * (0.30 + lit * 0.95) - glyph.material.opacity) * k
      edge.material.color.lerp(lit ? LIT : COLD, k)
      fillMesh.material.color.lerp(lit ? LIT : COLD, k)
      detail.material.color.lerp(lit ? LIT : COLD, k)
      glyph.material.color.lerp(lit ? LIT : COLD, k)

      // The chosen plate slides out of the rack to the same reading position.
      const to = lit ? STAGE : p.userData.base
      const kk = Math.min(1, dt * 4)
      p.position.x += (to[0] - p.position.x) * kk
      p.position.y += (to[1] - p.position.y) * kk
      p.position.z += (to[2] - p.position.z) * kk
      p.rotation.y += (p.userData.rot * (1 - lit) - p.rotation.y) * kk
    })

    if (group.current) group.current.visible = f > 0.001
  })

  return (
    <group ref={group}>
      {layout.map((l, i) => (
        <group
          key={i}
          position={l.base}
          rotation={l.rotation}
          ref={(el) => {
            if (!el) return
            plates.current[i] = el
            el.userData.base = l.base
            el.userData.rot = l.rotation[1]
          }}
        >
          <lineSegments geometry={outline}>
            <lineBasicMaterial color="#5d7d8c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </lineSegments>
          <mesh geometry={fillGeo}>
            <meshBasicMaterial color="#5d7d8c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <lineSegments geometry={details[i]}>
            <lineBasicMaterial color="#5d7d8c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </lineSegments>
          <lineSegments geometry={glyphs[i]} scale={1.28}>
            <lineBasicMaterial color="#5d7d8c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}
