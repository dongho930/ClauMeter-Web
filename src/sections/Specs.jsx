import { useState } from 'react'
import { useI18n, fill } from '../i18n/index.jsx'
import { VERSION, SHA256 } from '../config.js'

// The datasheet. The 3D goes dark here and the page turns into a printed sheet:
// this is the section people read before they trust the download.
export function Specs() {
  const { t } = useI18n()
  const [open, setOpen] = useState(0)

  return (
    <section id="specs" data-chapter className="specs">
      <div className="sheet">
        <div className="sheet-head">
          <h2>{t.specs.title}</h2>
          <span className="val sheet-stamp">ClauMeter {VERSION}</span>
        </div>

        <h3 className="sheet-sub">{t.specs.reqTitle}</h3>
        <dl className="sheet-table">
          {t.specs.reqs.map(([k, v], i) => {
            const value = fill(v, { version: VERSION, sha256: SHA256 })
            return (
              <div className="sheet-row" key={i}>
                <dt>{k}</dt>
                <dd className={ddClass(v, value)}>{value}</dd>
              </div>
            )
          })}
        </dl>

        <h3 className="sheet-sub">{t.specs.faqTitle}</h3>
        <div className="faq">
          {t.specs.faqs.map((f, i) => (
            <div className={`faq-item${open === i ? ' open' : ''}`} key={i}>
              <button
                className="faq-q"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <span>{f.q}</span>
                <span className="faq-mark" aria-hidden="true" />
              </button>
              <div className="faq-a" hidden={open !== i}>
                <p>{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Machine strings are set in mono. Only the checksum — one unbroken 64-character
// token — may break mid-word; everything else wraps between words.
function ddClass(template, value) {
  const classes = []
  if (/^[\x00-\x7F]+$/.test(template)) classes.push('val')
  if (/^[0-9a-f]{64}$/.test(value)) classes.push('hash')
  return classes.length ? classes.join(' ') : undefined
}
