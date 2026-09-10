import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene.jsx'

export function Stage({ reduced, selectedLang, t }) {
  // Bloom does its own smoothing, so a slightly lower ceiling costs little
  // and buys back the GPU time the effect pass takes.
  const dpr = typeof window !== 'undefined' && window.innerWidth < 760 ? [1, 1.25] : [1, 1.5]

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={dpr}
        camera={{ fov: 42, near: 0.1, far: 220, position: [0, 0, 6.4] }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Scene reduced={reduced} selectedLang={selectedLang} t={t} />
      </Canvas>
      <div className="stage-vignette" />
    </div>
  )
}
