import { useEffect, useRef } from 'react'
import { subscribeScroll } from '../scroll.js'
import { useI18n } from '../i18n/index.jsx'

// The page's own gauge. The scrollbar is replaced by a graduated scale with a
// travelling index, reading out the position as a percentage — the same way the
// widget reads out a window.
const EDGE = 46

export function ScrollRuler() {
  const index = useRef()
  const label = useRef()
  const { t } = useI18n()

  useEffect(
    () =>
      subscribeScroll(({ p }) => {
        if (index.current) {
          const travel = window.innerHeight - 2 * EDGE
          index.current.style.transform = `translateY(${EDGE + p * travel}px)`
        }
        if (label.current) label.current.textContent = `${Math.round(p * 100)}%`
      }),
    []
  )

  return (
    <div className="ruler" role="img" aria-label={t.a11y.scrollProgress}>
      <div className="ruler-scale" />
      <div className="ruler-index" ref={index}>
        <span className="ruler-readout val" ref={label}>0%</span>
      </div>
    </div>
  )
}
