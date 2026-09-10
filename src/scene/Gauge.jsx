import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { vert, frag, gaugeUniforms } from './gaugeShader.js'
import { focusOf, presenceOf } from './useFocus.js'

// `driver` runs every frame and may return any of { v5, vw, jitter, opacity }.
// Anything it omits falls back to the matching prop.
export function Gauge({
  v5 = 0.62,
  vw = 0.34,
  size = 3,
  jitter = 0,
  ticks = 1,
  glow = 1,
  opacity = 1,
  chapter = null,        // lit by where the camera is
  chapterWidth = 1.1,
  section = null,        // lit by which section is being read
  dim = 1,
  animate = true,
  driver = null,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  const mesh = useRef()
  const uniforms = useMemo(() => gaugeUniforms(), [])

  useFrame((state, dt) => {
    const u = uniforms
    const d = driver ? driver(state) : null

    const tV5 = d?.v5 ?? v5
    const tVW = d?.vw ?? vw
    const tJit = d?.jitter ?? jitter
    let tOp = (d?.opacity ?? opacity) * dim
    if (section !== null) tOp *= presenceOf(section)
    else if (chapter !== null) tOp *= focusOf(chapter, chapterWidth)

    const k = Math.min(1, dt * 4.5)
    u.uV5.value += (tV5 - u.uV5.value) * k
    if (tVW < 0) u.uVW.value = -1
    else u.uVW.value = u.uVW.value < 0 ? tVW : u.uVW.value + (tVW - u.uVW.value) * k
    u.uOpacity.value += (tOp - u.uOpacity.value) * Math.min(1, dt * 6)
    u.uJitter.value = tJit
    u.uTicks.value = ticks
    u.uGlow.value = glow
    if (animate) u.uTime.value = state.clock.elapsedTime
    if (mesh.current) mesh.current.visible = u.uOpacity.value > 0.004
  })

  return (
    <mesh ref={mesh} position={position} rotation={rotation} scale={size}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
