import { useEffect, useState, lazy, Suspense } from 'react'
import { I18nProvider, useI18n } from './i18n/index.jsx'
import { ReleaseProvider } from './release.jsx'
import { initScroll } from './scroll.js'
import { useReducedMotion, useNarrow, hasWebGL } from './hooks/useReducedMotion.js'
// The 3D is a second act: the page must be readable and clickable before
// three.js has finished arriving.
const Stage = lazy(() => import('./scene/Stage.jsx').then((m) => ({ default: m.Stage })))
import { ScrollRuler } from './components/ScrollRuler.jsx'
import { TopRail } from './components/TopRail.jsx'
import { Hero } from './sections/Hero.jsx'
import { Problem } from './sections/Problem.jsx'
import { Features } from './sections/Features.jsx'
import { Steps } from './sections/Steps.jsx'
import { Languages } from './sections/Languages.jsx'
import { Gallery } from './sections/Gallery.jsx'
import { Demo } from './sections/Demo.jsx'
import { Specs } from './sections/Specs.jsx'
import { Closing } from './sections/Closing.jsx'

export default function App() {
  return (
    <I18nProvider>
      <ReleaseProvider>
        <Site />
      </ReleaseProvider>
    </I18nProvider>
  )
}

function Site() {
  const { t } = useI18n()
  const reduced = useReducedMotion()
  const narrow = useNarrow()
  const [webgl] = useState(hasWebGL)
  const [lang3d, setLang3d] = useState(0)

  useEffect(() => initScroll(), [])

  return (
    <>
      {webgl && (
        <Suspense fallback={null}>
          <Stage reduced={reduced} selectedLang={lang3d} t={t} />
        </Suspense>
      )}
      <ScrollRuler />
      <TopRail />
      <main className={`scroller${webgl ? '' : ' flat'}`}>
        <Hero />
        <Problem />
        <Features />
        <Steps />
        <Languages selected={lang3d} onSelect={setLang3d} />
        <Gallery webgl={webgl && !narrow} />
        <Demo />
        <Specs />
        <Closing />
      </main>
    </>
  )
}
