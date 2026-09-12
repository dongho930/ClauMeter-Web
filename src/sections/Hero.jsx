import { useI18n } from '../i18n/index.jsx'
import { useRelease } from '../release.jsx'

export function Hero() {
  const { t } = useI18n()
  const release = useRelease()

  return (
    <section id="top" data-chapter className="hero">
      <h1 className="display">
        {t.hero.title[0]}
        <br />
        {t.hero.title[1]}
      </h1>
      <p className="lede hero-lede">{t.hero.lede}</p>

      <div className="cta-row">
        <a className="btn btn-lg" href={release.download}>{t.hero.download}</a>
        <a className="btn btn-lg" href={release.downloadMac}>{t.hero.downloadMac}</a>
      </div>

      <p className="meta">{t.hero.meta}</p>
    </section>
  )
}
