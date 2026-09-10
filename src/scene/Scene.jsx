import { Gauge } from './Gauge.jsx'
import { Corridor } from './Corridor.jsx'
import { Motes } from './Motes.jsx'
import { Plates } from './Plates.jsx'
import { Iris } from './Iris.jsx'
import { Orbit } from './Orbit.jsx'
import { Slides } from './Slides.jsx'
import { CameraRig } from './CameraRig.jsx'
import { subOf } from './useFocus.js'
import { useLayout } from './useLayout.js'
import { HeroLegend, TraceLabels, NoDataTag } from './Annotations.jsx'
import { Trace } from './Trace.jsx'
import { Bars } from './Bars.jsx'
import { Floor, Armatures, DialRig, Core, Monolith } from './Structures.jsx'
import { presenceOf, focusOf } from './useFocus.js'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

// A reading that breathes, so the hero instrument reads as live rather than as
// a picture of an instrument.
const heroDriver = (s) => ({ v5: 0.62 + Math.sin(s.clock.elapsedTime * 0.55) * 0.035 })
const heroStill = () => ({ v5: 0.62 })
const heroPresence = () => presenceOf(0)
const closingPresence = () => focusOf(7, 2.2)

// Nothing to read at first, then the first real value lands. Timed to the
// reader rather than to the camera: it opens and clears while the camera is
// still parked at the gates, so it is never flown through.
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export const readingOpacity = () => {
  const s = subOf(3)
  // Clears before the camera reaches its plane at roughly 0.78 of the section.
  return smoothstep(0.10, 0.26, s) * (1 - smoothstep(0.64, 0.76, s))
}
const firstReadingDriver = () => {
  const s = subOf(3)
  const v = s < 0.28 ? 0 : Math.min(1, (s - 0.28) / 0.10) * 0.62
  return { v5: v, vw: v * 0.55, opacity: readingOpacity() }
}

export function Scene({ reduced, selectedLang, t }) {
  const animate = !reduced
  const { offset, lift, plateX, intensity, narrow } = useLayout()

  return (
    <>
      <color attach="background" args={['#0b1418']} />
      <fog attach="fog" args={['#000000', 15, 64]} />

      <CameraRig reduced={reduced} />
      <Corridor />
      <Floor />
      <Armatures animate={animate} />
      <Motes animate={animate} count={reduced ? 180 : narrow ? 260 : 480} />

      <group position-x={offset} position-y={lift}>
        {/* 0 — hero */}
        <DialRig radius={3.35} animate={animate} dim={1} presence={heroPresence} />
        <Gauge section={0} size={2.6} animate={animate}
               driver={animate ? heroDriver : heroStill} />
        <HeroLegend t={t} chapter={0} />

        {/* 1 — the chart recorder, drawn as the section is read */}
        <group position={[0, 0.1, -20]}>
          <Trace section={1} dim={intensity} animate={animate} />
        </group>
        <TraceLabels t={t} section={1} z={-20} />

        {/* 2 — the feature rack */}
        <Plates dim={intensity} chapter={2} z={-52} xBase={plateX} />

        {/* 3 — setup, ending in the first reading */}
        <Iris dim={intensity} chapter={3} z={-64} span={12} />
        <Bars dim={intensity} width={6} height={0.44} gap={0.62}
              position={[0, 0.1, -62]} driver={firstReadingDriver} />
        <NoDataTag t={t} z={-62} opacityFn={readingOpacity} />

        {/* 4 — twelve languages */}
        <Orbit dim={intensity} chapter={4} z={-94} selected={selectedLang} animate={animate} />
        <Core section={4} dim={intensity} position={[0, 0, -94.6]} animate={animate} />

        {/* 5 — the three windows, as lit slides */}
        {/* On narrow screens the gallery shows real <img> elements instead. */}
        {!narrow && <Slides chapter={5} dim={intensity} />}

        {/* 6 — datasheet: quiet, but not empty */}
        <Monolith position={[0.4, 0, -136]} chapter={6} dim={intensity} animate={animate} />

        {/* 7 — closing */}
        <group position={[0, 0, -151]}>
          <DialRig radius={3.1} animate={animate} dim={intensity} presence={closingPresence} />
        </group>
        <Gauge dim={intensity} chapter={7} chapterWidth={2.2} size={2.4} position={[0, 0, -151]}
               v5={0.41} vw={0.22} animate={animate} />
      </group>

      {/* Everything in the scene is emissive line work, so bloom is what turns it
          from a diagram into something lit. Off where the budget is tight. */}
      {!reduced && !narrow && (
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom intensity={1.7} luminanceThreshold={0.08} luminanceSmoothing={0.45} mipmapBlur radius={0.85} resolutionScale={0.5} />
          <Vignette offset={0.28} darkness={0.55} />
        </EffectComposer>
      )}
    </>
  )
}
