import { useMemo } from 'react'
import * as THREE from 'three'

// The page's travel axis, drawn as a graduated scale extruded through space:
// two rails of tick marks, every fifth one major. It is the same ruler that
// runs down the left edge of the document, seen from the inside.
// Distance fade comes from the scene fog.
export function Corridor({ from = 12, to = -166, halfWidth = 7.5, y = 3.4 }) {
  const geo = useMemo(() => {
    const pts = []
    let n = 0
    for (let z = from; z >= to; z -= 1) {
      const len = n % 5 === 0 ? 0.62 : 0.26
      for (const sx of [-1, 1]) {
        pts.push(sx * halfWidth, -y, z, sx * halfWidth, -y + len, z)
        pts.push(sx * halfWidth, y, z, sx * halfWidth, y - len, z)
      }
      n++
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [from, to, halfWidth, y])

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial
        color="#5d7d8c"
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}
