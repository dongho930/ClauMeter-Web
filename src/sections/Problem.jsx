import { useI18n } from '../i18n/index.jsx'

export function Problem() {
  const { t } = useI18n()

  return (
    <section data-chapter className="problem">
      <h2 className="display">
        {t.problem.title[0]}
        <br />
        {t.problem.title[1]}
      </h2>
      <p className="lede">{t.problem.lede}</p>

      <div className="grad-rule" />

      <dl className="points">
        {t.problem.points.map((p, i) => (
          <div className="point" key={i}>
            <dt>{p.head}</dt>
            <dd>{p.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
