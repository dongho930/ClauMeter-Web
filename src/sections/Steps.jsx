import { Fragment } from 'react'
import { useI18n, fill } from '../i18n/index.jsx'
import { INSTALLER } from '../config.js'

export function Steps() {
  const { t } = useI18n()

  return (
    <section id="setup" data-chapter className="steps">
      <h2 className="display">
        {t.steps.title[0]}
        <br />
        {t.steps.title[1]}
      </h2>

      <ol className="step-list" data-track="steps">
        {t.steps.items.map((s, i) => (
          <li className="step" key={i} data-item>
            <span className="step-n val" aria-hidden="true">{i + 1}</span>
            <div>
              <h3>{s.head}</h3>
              <p>{withFilename(fill(s.body, { installer: INSTALLER }))}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// The installer filename is a machine string, so set it as one. Split rather
// than inject: no markup ever goes through innerHTML.
function withFilename(text) {
  const parts = text.split(INSTALLER)
  if (parts.length === 1) return text
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && <code className="val">{INSTALLER}</code>}
    </Fragment>
  ))
}
