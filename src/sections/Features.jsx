import { useI18n } from '../i18n/index.jsx'

export function Features() {
  const { t } = useI18n()

  return (
    <section id="features" data-chapter className="features">
      <h2 className="display">
        {t.features.title[0]}
        <br />
        {t.features.title[1]}
      </h2>

      <ul className="feature-list" data-track="features">
        {t.features.items.map((f, i) => (
          <li className="feature" key={i} data-item>
            <h3>{f.head}</h3>
            <p>{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
