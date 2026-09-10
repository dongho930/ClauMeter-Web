import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { focusOf, presenceOf, subOf } from './useFocus.js'
import { TRACE } from './Trace.jsx'

// Engraved legends for the 3D instruments. They are real DOM, so every script
// renders and every string stays selectable and translatable.

function Anno({ position, chapter, section = null, width = 1.0, factor = 9, className = '', children, onFrame, opacityFn = null }) {
  const el = useRef()
  useFrame((state) => {
    if (!el.current) return
    const f = opacityFn ? opacityFn()
      : section !== null ? presenceOf(section)
      : focusOf(chapter, width)
    el.current.style.opacity = f
    el.current.style.visibility = f > 0.02 ? 'visible' : 'hidden'
    if (onFrame) onFrame(el.current, state)
  })
  return (
    <Html position={position} center distanceFactor={factor} wrapperClass="anno-wrap" zIndexRange={[2, 0]}>
      <div className={`anno ${className}`} ref={el}>{children}</div>
    </Html>
  )
}

// Hero: names the two arcs and reads them out.
export function HeroLegend({ t, chapter = 0 }) {
  const five = useRef()
  return (
    <Anno
      position={[0, -3.05, 0]}
      section={chapter}
      factor={14}
      className="anno-legend"
      onFrame={(_, state) => {
        if (!five.current) return
        const v = 62 + Math.sin(state.clock.elapsedTime * 0.55) * 3.5
        five.current.textContent = `${Math.round(v)}%`
      }}
    >
      <span className="anno-line">
        <span className="anno-key">{t.hero.gauge5h}</span>
        <span className="anno-val ok" ref={five}>62%</span>
      </span>
      <span className="anno-line">
        <span className="anno-key">{t.hero.gaugeWeek}</span>
        <span className="anno-val ok">34%</span>
      </span>
    </Anno>
  )
}

// Chapter 1: the chart recorder — what it was reading, where the limit sat, and
// the point at which it simply stopped.
export function TraceLabels({ t, section = 1, z = -20 }) {
  const stopX = -TRACE.W / 2 + TRACE.STOP_T * TRACE.W
  const drawn = () => Math.min(1, subOf(section) / 0.78)
  return (
    <>
      <Anno
        position={[-TRACE.W / 2 + 0.35, TRACE.BASE - 0.46, z]}
        section={section}
        factor={11}
        className="anno-tag"
      >
        <span className="anno-name">{t.problem.traceLabel}</span>
      </Anno>

      <Anno
        position={[-TRACE.W / 2 + 0.5, TRACE.TOP + 0.3, z]}
        section={section}
        factor={11}
        className="anno-tag"
      >
        <span className="anno-note red">{t.problem.limitLabel}</span>
      </Anno>

      <Anno
        position={[stopX, TRACE.TOP + 0.62, z]}
        opacityFn={() => presenceOf(section) * (drawn() >= 0.985 ? 1 : 0)}
        factor={11}
        className="anno-tag"
      >
        <span className="anno-name">{t.problem.stopLabel}</span>
      </Anno>
    </>
  )
}

// Chapter 3: honest emptiness, until the first reading lands.
export function NoDataTag({ t, z = -62, opacityFn }) {
  const tag = useRef()
  return (
    <Anno
      position={[0, -3.15, z]}
      opacityFn={opacityFn}
      factor={17}
      className="anno-tag"
      onFrame={() => {
        if (!tag.current) return
        const landed = subOf(3) > 0.35
        tag.current.textContent = landed ? '62%' : t.problem.noData
        tag.current.className = `anno-note ${landed ? 'ok' : 'muted'}`
      }}
    >
      <span className="anno-note muted" ref={tag}>{t.problem.noData}</span>
    </Anno>
  )
}
