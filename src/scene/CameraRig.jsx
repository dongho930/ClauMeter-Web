import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scroll } from '../scroll.js'
import { useLayout } from './useLayout.js'

// One keyframe per chapter. The camera is always travelling down -Z; the small
// lateral offsets are what stop it feeling like a slideshow.
export const KEYS = [
  { pos: [0.0, 0.00, 12.0],   look: [0, 0, 0] },       // 0 hero: the instrument
  { pos: [0.0, 0.15, -10.4],  look: [0, 0, -20] },     // 1 the chart recorder
  { pos: [0.0, 0.30, -38.0],  look: [0, 0, -50] },     // 2 the feature rack
  { pos: [0.0, 0.00, -46.0],  look: [0, 0, -66] },     // 3 setup: fly the gates
  { pos: [0.0, 0.00, -80.5],  look: [0, 0, -94] },     // 4 twelve languages
  { pos: [0.0, 0.00, -104.0], look: [0, 0, -116] },    // 5 the three windows
  { pos: [1.7, 0.20, -126.0], look: [0.4, 0, -136] },  // 6 datasheet: pull aside
  { pos: [0.0, 0.00, -142.0], look: [0, 0, -151] },    // 7 closing
]

const smooth = (x) => x * x * (3 - 2 * x)

export function CameraRig({ reduced }) {
  const { camera } = useThree()
  const { narrow, dolly } = useLayout()
  const pos = useRef(new THREE.Vector3(...KEYS[0].pos))
  const look = useRef(new THREE.Vector3(...KEYS[0].look))
  const mouse = useRef({ x: 0, y: 0 })
  const tmpP = useRef(new THREE.Vector3())
  const tmpL = useRef(new THREE.Vector3())

  useFrame(({ pointer }, dt) => {
    const c = Math.min(KEYS.length - 1, Math.max(0, scroll.chapter))
    const i = Math.min(KEYS.length - 2, Math.floor(c))
    const f = smooth(Math.min(1, Math.max(0, c - i)))

    tmpP.current.fromArray(KEYS[i].pos).lerp(V.fromArray(KEYS[i + 1].pos), f)
    tmpL.current.fromArray(KEYS[i].look).lerp(V.fromArray(KEYS[i + 1].look), f)

    tmpP.current.z += dolly

    if (!reduced && !narrow) {
      mouse.current.x += (pointer.x - mouse.current.x) * Math.min(1, dt * 2.5)
      mouse.current.y += (pointer.y - mouse.current.y) * Math.min(1, dt * 2.5)
      tmpP.current.x += mouse.current.x * 0.55
      tmpP.current.y += mouse.current.y * 0.35
    }

    const k = reduced ? 1 : Math.min(1, dt * 3.2)
    pos.current.lerp(tmpP.current, k)
    look.current.lerp(tmpL.current, k)
    camera.position.copy(pos.current)
    camera.lookAt(look.current)
  })

  return null
}

const V = new THREE.Vector3()
