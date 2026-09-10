export default {
  code: 'en',
  nav: { features: 'Features', setup: 'Setup', specs: 'Specs', download: 'Download' },

  hero: {
    title: ['See the limit', 'coming.'],
    lede: "A Windows widget that keeps your 5-hour and weekly Claude Code usage on screen while you work. The numbers come from Anthropic's own servers — the same ones your limit is enforced on.",
    download: 'Download for Windows',
    repo: 'View on GitHub',
    meta: 'Free and MIT licensed, for Windows 10 and 11.',
    gauge5h: '5-hour window',
    gaugeWeek: 'Weekly window',
    resets: 'resets in',
  },

  problem: {
    title: ['The limit arrives', 'without warning.'],
    lede: 'Claude Code gives you no countdown. It works, and then it does not, and the first you hear of it is the message that will not send.',
    points: [
      {
        head: 'The status line is there, and you miss it',
        body: 'Claude Code prints your usage into the terminal status line. It scrolls away, it sits behind another window, and it is never where your eyes are.',
      },
      {
        head: 'A percentage on its own tells you little',
        body: 'Eighty percent means one thing with four hours left in the window and something else entirely with twenty minutes left. The reset time is the half that decides what to do next.',
      },
      {
        head: 'ClauMeter sits where you are already looking',
        body: 'It floats above the editor with both windows and both countdowns, reads the percentage Anthropic already calculated, and shows it unchanged. When there is no reading yet, it says so.',
      },
    ],
    traceLabel: 'This session',
    limitLabel: 'Limit',
    stopLabel: 'Stopped here',
    noData: 'No data',
  },

  features: {
    title: ['Six things', 'it does.'],
    items: [
      { head: 'Live gauges', body: 'The 5-hour and weekly rates redraw every second, with the reset countdown under each. Green while you have room, amber past 75%, red past 90%.' },
      { head: 'Pace advice', body: 'A prediction model trained on your own past windows works out where this one is heading, and an AI turns that into a sentence you can act on. It also shows how far off it has been lately, so you can decide how much to trust it.' },
      { head: 'Threshold alerts', body: 'A Windows toast at 50%, 75% and 90%. Once per window, and it remembers across restarts, so the same alert never fires twice.' },
      { head: 'Twelve languages', body: 'The whole widget, and the AI advice with it, switches the moment you pick a language. It stays picked.' },
      { head: 'Out of the way', body: 'Click-through mode lets the mouse pass straight through. Adjustable opacity, always on top, hidden from the taskbar, dragged anywhere.' },
      { head: 'Nothing to configure', body: 'The statusLine hook registers itself. Open a Claude Code terminal once and readings start. No API key, ever.' },
    ],
  },

  steps: {
    title: ['From installer', 'to first reading.'],
    items: [
      { head: 'Run the installer', body: 'Download {installer} and run it. The usual Windows wizard, nothing to choose.' },
      { head: 'The widget appears', body: 'It docks near the bottom of your screen reading "No data". That is correct — it has nothing to read yet.' },
      { head: 'Open Claude Code once', body: 'Send a single message. The statusLine hook is already registered, so the first real percentage lands immediately.' },
      { head: 'Tune it, or do not', body: 'The gear icon holds opacity, language and alerts. Every default is a working default.' },
    ],
  },

  languages: {
    title: ['It speaks', 'twelve languages.'],
    lede: 'Pick one in the settings window and the widget, the settings, the detail panel and the AI advice all follow. Click a name to try it here.',
    tryLabel: 'Widget preview',
  },

  gallery: {
    title: ['What you', 'actually get.'],
    lede: 'Three windows, and that is the whole program. Sample readings, real interface.',
    items: [
      {
        head: 'The widget',
        body: 'Two bars, two reset countdowns, and the time of the last reading. 340 by 160 pixels, dragged wherever it stays out of your way.',
        alt: 'The ClauMeter widget showing the 5-hour window at 62% and the week at 34%, each with a reset countdown',
      },
      {
        head: 'Pace advice',
        body: 'The numbers come from the prediction model, the sentences from the AI. It also shows how far off the model has been lately, so you can decide how much to trust it.',
        alt: 'The details window with projected end-of-window usage, a caution badge, and written advice for the 5-hour and weekly limits',
      },
      {
        head: 'Settings',
        body: 'Language, transparency, alerts. That is every setting there is.',
        alt: 'The settings window with a language dropdown, a transparency slider, and a usage-notifications checkbox',
      },
    ],
  },

  specs: {
    title: 'Datasheet',
    reqTitle: 'System requirements',
    reqs: [
      ['Operating system', 'Windows 10 or Windows 11'],
      ['Prerequisite', 'Claude Code CLI, installed and in use (includes Node.js)'],
      ['API key', 'Not required'],
      ['Price', 'Free'],
      ['License', 'MIT'],
      ['Version', '{version}'],
      ['Installer SHA-256', '{sha256}'],
    ],
    faqTitle: 'Questions worth asking',
    faqs: [
      { q: 'Does it cost anything?', a: 'No. ClauMeter is free.' },
      { q: 'Do I have to enter an API key?', a: 'No. The Groq key used for advice lives on the proxy server. It is not in the app you download, and there is nothing for you to paste in.' },
      { q: 'Is my usage data sent anywhere?', a: 'The percentages are computed locally and stay on your machine. Only when you ask for pace advice do the already-computed statistics — numbers, never any part of a conversation — go to the proxy so the advice can be written.' },
      { q: 'Is it open source?', a: 'Yes, MIT licensed. The repository is linked in the footer.' },
      {
        q: 'Windows says the publisher is unknown. Should I worry?',
        a: 'ClauMeter is not code-signed, so SmartScreen shows its blue "Windows protected your PC" notice. Choose More info, then Run anyway. A signing certificate costs money every year, which is a lot to carry for a free tool — so the SHA-256 of the installer is published above and on the release instead. Check it before you run the file: in PowerShell, Get-FileHash on the downloaded .exe should print exactly that string.',
      },
    ],
  },

  cta: {
    title: 'Know where you stand, all day.',
    lede: 'One installer. No account, no key, no configuration.',
  },

  footer: {
    license: 'MIT License',
    repo: 'GitHub repository',
    issues: 'Report an issue',
    version: 'Version {version}',
    built: 'A desktop widget for Claude Code.',
  },

  a11y: {
    langSwitch: 'Switch language',
    scrollProgress: 'Page position',
  },
}
