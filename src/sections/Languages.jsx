import { useI18n } from '../i18n/index.jsx'
import { WIDGET_LANGS, SHEET } from '../i18n/widgetLangs.js'

const SRC = `${import.meta.env.BASE_URL}shots/widget-langs.png`

// The real widget, captured once per language and served as one sprite, so
// switching is instant and nothing here is a recreation of the product.
export function Languages({ selected, onSelect }) {
  const { t } = useI18n()
  const lang = WIDGET_LANGS[selected]
  const col = selected % SHEET.cols
  const row = Math.floor(selected / SHEET.cols)
  const rows = Math.ceil(WIDGET_LANGS.length / SHEET.cols)

  return (
    <section data-chapter className="languages">
      <h2 className="display">
        {t.languages.title[0]}
        <br />
        {t.languages.title[1]}
      </h2>
      <p className="lede">{t.languages.lede}</p>

      <div className="lang-grid" role="group" aria-label={t.languages.tryLabel}>
        {WIDGET_LANGS.map((l, i) => (
          <button
            key={l.code}
            className={`lang-chip${i === selected ? ' on' : ''}`}
            aria-pressed={i === selected}
            lang={l.code}
            onClick={() => onSelect(i)}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div
        className="widget-shot"
        role="img"
        aria-label={`${t.languages.tryLabel}: ${lang.name}`}
        style={{
          backgroundImage: `url(${SRC})`,
          backgroundSize: `${SHEET.cols * SHEET.tileW}px ${rows * SHEET.tileH}px`,
          backgroundPosition: `-${col * SHEET.tileW}px -${row * SHEET.tileH}px`,
        }}
      />
    </section>
  )
}
