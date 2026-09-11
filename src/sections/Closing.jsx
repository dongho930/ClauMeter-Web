import { useI18n, fill } from '../i18n/index.jsx'
import { LINKS, VERSION } from '../config.js'

export function Closing() {
  const { t } = useI18n()

  return (
    <section id="download" data-chapter className="closing">
      <h2 className="display closing-title">{t.cta.title}</h2>
      <p className="lede">{t.cta.lede}</p>

      <div className="cta-row">
        <a className="btn btn-lg" href={LINKS.download}>{t.hero.download}</a>
        <a className="btn btn-lg" href={LINKS.downloadMac}>{t.hero.downloadMac}</a>
      </div>

      <footer className="foot">
        <div className="grad-rule" />
        <div className="foot-row">
          <span>{t.footer.built}</span>
          <nav className="foot-links">
            <a href={LINKS.repo}>{t.footer.repo}</a>
            <a href={LINKS.issues}>{t.footer.issues}</a>
            <a href={LINKS.license}>{t.footer.license}</a>
          </nav>
          <span className="val">{fill(t.footer.version, { version: VERSION })}</span>
        </div>
      </footer>
    </section>
  )
}
