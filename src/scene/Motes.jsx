import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Dust in the light. The drift runs in the vertex shader rather than a JS loop,
// so the count can go up without the frame budget going with it, and each mote
// is a soft round point instead of a hard square.

const vert = /* glsl */ `
  attribute float seed;
  attribute float scale;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vFade;

  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.22 + seed) * 0.55;
    p.x += cos(uTime * 0.15 + seed * 1.7) * 0.35;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    // fade in the distance and very close up, so nothing pops at the camera
    vFade = smoothstep(1.5, 7.0, dist) * (1.0 - smoothstep(48.0, 88.0, dist));
    vFade *= 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * 0.9 + seed * 3.1));

    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(scale * uPixelRatio * (34.0 / dist), 22.0);
  }
`

const frag = /* glsl */ `
  precision mediump float;
  varying float vFade;
  uniform vec3 uColor;

  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d) * 2.0;
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * vFade;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`

export function Motes({ count = 620, depth = 178, animate = true }) {
  const mat = useRef()

  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const scale = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26
      pos[i * 3 + 1] = (Math.random() - 0.5) * 13
      pos[i * 3 + 2] = 12 - Math.random() * depth
      seed[i] = Math.random() * Math.PI * 2
      // a few large, most small — the big ones carry the bloom
      scale[i] = Math.random() < 0.12 ? 1.6 + Math.random() * 1.4 : 0.4 + Math.random() * 0.6
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('scale', new THREE.BufferAttribute(scale, 1))
    return g
  }, [count, depth])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1) },
      uColor: { value: new THREE.Color('#a9d0e0') },
    }),
    []
  )

  useFrame(({ clock }) => {
    if (animate) uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points geometry={geo}>
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
