import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import en from './en.js'
import ko from './ko.js'

const DICTS = { en, ko }
const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = DICTS[lang]
  const toggle = useCallback(() => setLang((l) => (l === 'en' ? 'ko' : 'en')), [])

  return (
    <I18nContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

export function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
}
