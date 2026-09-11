import { useI18n } from '../i18n/index.jsx'

export function TopRail() {
  const { t, lang, toggle } = useI18n()

  return (
    <header className="rail-top">
      <a className="mark" href="#top">
        <img className="mark-icon" src={`${import.meta.env.BASE_URL}icon.png`} alt="" width="24" height="24" />
        ClauMeter
      </a>

      <nav className="rail-nav">
        <a href="#features">{t.nav.features}</a>
        <a href="#setup">{t.nav.setup}</a>
        <a href="#specs">{t.nav.specs}</a>
      </nav>

      <div className="rail-right">
        <button className="lang-toggle" onClick={toggle} aria-label={t.a11y.langSwitch}>
          <span className={lang === 'en' ? 'on' : ''}>EN</span>
          <span className="lang-sep" aria-hidden="true" />
          <span className={lang === 'ko' ? 'on' : ''}>KO</span>
        </button>
        <a className="btn btn-sm" href="#download">{t.nav.download}</a>
      </div>
    </header>
  )
}
