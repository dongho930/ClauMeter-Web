import { useI18n } from '../i18n/index.jsx'

const BASE = import.meta.env.BASE_URL
const SRC = [`${BASE}shots/widget.png`, `${BASE}shots/detail.png`, `${BASE}shots/settings.png`]
// Captured at 2x; these are the CSS sizes, and they only reserve layout space
// for the no-WebGL fallback.
const DIMS = [
  { w: 340, h: 160 },
  { w: 412, h: 657 },
  { w: 360, h: 240 },
]

// The three windows are shown once, never twice: when the canvas is running it
// hangs them as slides in the corridor and this column carries only the captions
// (with the description kept for screen readers). With no WebGL the images come
// back here as real <img> elements.
export function Gallery({ webgl = true }) {
  const { t } = useI18n()

  return (
    <section data-chapter className="gallery">
      <h2 className="display">
        {t.gallery.title[0]}
        <br />
        {t.gallery.title[1]}
      </h2>
      <p className="lede">{t.gallery.lede}</p>

      <ol className={`shot-list${webgl ? ' captions-only' : ''}`} data-track="shots">
        {t.gallery.items.map((s, i) => (
          <li className="shot" key={i} data-item>
            <figure>
              {webgl ? (
                <span className="sr-only">{s.alt}</span>
              ) : (
                <img
                  src={SRC[i]}
                  width={DIMS[i].w}
                  height={DIMS[i].h}
                  alt={s.alt}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <figcaption>
                <h3>{s.head}</h3>
                <p>{s.body}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </section>
  )
}
