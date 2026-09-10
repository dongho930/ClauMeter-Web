// The twelve languages the widget itself ships with, written the way each one
// writes its own name. Endonyms, not flags: one flag never maps to one language.
//
// The order here is the order of the tiles in public/shots/widget-langs.png,
// a 3-wide sprite of the real widget captured once per language. Change one and
// you must change the other.
export const WIDGET_LANGS = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '简体中文' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
]

// tile geometry, in CSS pixels (the sheet is captured at 2x)
export const SHEET = { cols: 3, tileW: 340, tileH: 160 }
