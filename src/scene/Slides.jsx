import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { rectOutline } from './geo.js'
import { presenceOf, activeOf } from './useFocus.js'

// The one place on the page where a real photograph appears. Everything else is
// drawn in light; these are the actual application windows, hung in the corridor
// like slides on a light table. The one you are reading about comes forward.

const BASE = import.meta.env.BASE_URL

// Sized from each capture's own aspect ratio; the images are 2x, so a slide can
// be pulled forward without going soft.
export const SHOTS = [
  { src: `${BASE}shots/widget.png`,   w: 3.90, h: 1.84, pos: [-0.35, 1.62, -119.0], rot: -0.30 },
  { src: `${BASE}shots/detail.png`,   w: 2.20, h: 3.50, pos: [ 3.35, 0.05, -116.0], rot: -0.22 },
  { src: `${BASE}shots/settings.png`, w: 3.00, h: 2.00, pos: [ 0.10, -1.95, -113.0], rot: -0.34 },
]

// Where the chosen slide goes to be read. The others stay in the stack.
const STAGE = [1.15, 0.15, -112.5]

const STEEL = new THREE.Color('#5d7d8c')
const LIT = new THREE.Color('#3fd08a')

export function Slides({ chapter = 5, dim = 1 }) {
  const group = useRef()
  const slides = useRef([])

  const textures = useLoader(THREE.TextureLoader, SHOTS.map((s) => s.src))
  useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.minFilter = THREE.LinearFilter
      t.generateMipmaps = false
    })
  }, [textures])

  const frames = useMemo(() => SHOTS.map((s) => rectOutline(s.w + 0.14, s.h + 0.14, 0)), [])

  useFrame((_, dt) => {
    const f = presenceOf(chapter) * dim
    const active = activeOf('shots', SHOTS.length, chapter)
    const k = Math.min(1, dt * 6)
    const kk = Math.min(1, dt * 4)

    slides.current.forEach((g, i) => {
      if (!g) return
      const lit = i === active ? 1 : 0
      const [image, frame] = g.children

      image.material.opacity += (f * (0.30 + lit * 0.70) - image.material.opacity) * k
      frame.material.opacity += (f * (0.22 + lit * 0.85) - frame.material.opacity) * k
      frame.material.color.lerp(lit ? LIT : STEEL, k)

      const to = lit ? STAGE : SHOTS[i].pos
      g.position.x += (to[0] - g.position.x) * kk
      g.position.y += (to[1] - g.position.y) * kk
      g.position.z += (to[2] - g.position.z) * kk
      g.rotation.y += (SHOTS[i].rot * (1 - lit) - g.rotation.y) * kk
    })

    if (group.current) group.current.visible = f > 0.001
  })

  return (
    <group ref={group}>
      {SHOTS.map((s, i) => (
        <group key={i} position={s.pos} rotation={[0, s.rot, 0]} ref={(el) => el && (slides.current[i] = el)}>
          <mesh>
            <planeGeometry args={[s.w, s.h]} />
            <meshBasicMaterial map={textures[i]} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
          <lineSegments geometry={frames[i]}>
            <lineBasicMaterial color="#5d7d8c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}
