export default {
  code: 'en',
  nav: { features: 'Features', setup: 'Setup', demo: 'Demo', specs: 'Specs', download: 'Download' },

  hero: {
    title: ['See the limit', 'coming.'],
    lede: "A desktop widget that pins your 5-hour and weekly Claude Code usage to the screen while you work. The numbers come straight from Anthropic — the same ones that decide when you get cut off.",
    download: 'Download for Windows',
    downloadMac: 'Download for Mac',
    meta: 'Free & open source (MIT) · No API key',
    gauge5h: '5-hour window',
    gaugeWeek: 'Weekly window',
    resets: 'resets in',
  },

  problem: {
    title: ['No warning.', 'It just stops.'],
    lede: "Claude Code doesn't count down. It works right up until it doesn't — and you find out when your message won't send.",
    points: [
      {
        head: 'The status line is easy to miss',
        body: "Claude Code does print usage in the terminal status line. But it scrolls away, hides behind other windows, and is never where you're looking.",
      },
      {
        head: "A percentage alone isn't enough",
        body: '80% with four hours left in the window means slow down. 80% with twenty minutes left means keep going. The reset time is what tells you which.',
      },
      {
        head: "ClauMeter sits where you're already looking",
        body: "It floats above your editor with both windows and both countdowns. It shows the percentage Anthropic already calculated, untouched — and if there's no reading yet, it tells you.",
      },
    ],
    traceLabel: 'This session',
    limitLabel: 'Limit',
    stopLabel: 'Stopped here',
    noData: 'No data',
  },

  features: {
    title: ['Small widget.', 'Six jobs.'],
    items: [
      { head: 'Live gauges', body: "Your 5-hour and weekly usage, redrawn every second, each with its own reset countdown. Green while there's room, amber past 75%, red past 90%." },
      { head: 'Pace advice', body: "A prediction model trained on your own past windows forecasts where this one is headed, and AI turns that into one sentence you can act on. It also shows how far off it's been lately, so you decide how much to trust it." },
      { head: 'Threshold alerts', body: 'Desktop notifications at 50%, 75%, and 90%. Once per window — and it remembers through restarts, so you never get the same alert twice.' },
      { head: 'Twelve languages', body: 'Pick a language and the whole widget switches instantly, AI advice included. Your choice sticks.' },
      { head: 'Stays out of your way', body: 'Turn on click-through and your mouse passes right through it. Adjustable opacity, always on top, no taskbar clutter, drag it anywhere.' },
      { head: 'Zero setup', body: 'The statusLine hook sets itself up. Open Claude Code once and the numbers start flowing. No API key, ever.' },
    ],
  },

  steps: {
    title: ['From download', 'to live numbers.'],
    items: [
      { head: 'Run the installer', body: 'Download {installer} and run it. A standard Windows installer with nothing to decide.' },
      { head: 'The widget appears', body: 'It docks near the bottom of your screen showing "No data". That\'s expected — there\'s just nothing to read yet.' },
      { head: 'Open Claude Code once', body: 'Send one message. The statusLine hook is already in place, so your first real numbers show up right away.' },
      { head: "Tweak it, or don't", body: 'Opacity, language, and alerts live behind the gear icon. The defaults work fine as they are.' },
    ],
  },

  languages: {
    title: ['It speaks', 'your language.'],
    lede: 'Choose from twelve languages in settings, and the widget, settings, details panel, and AI advice all switch together. Pick a name below to preview it.',
    tryLabel: 'Widget preview',
  },

  gallery: {
    title: ['What you', 'actually get.'],
    lede: "Three windows. That's the whole app. Sample numbers, real screens.",
    items: [
      {
        head: 'The widget',
        body: "Two bars, two reset countdowns, and when it last updated. 340 × 160 px — drag it wherever it won't get in your way.",
        alt: 'The ClauMeter widget showing the 5-hour window at 62% and the week at 34%, each with a reset countdown',
      },
      {
        head: 'Pace advice',
        body: 'Numbers from the prediction model, words from AI — plus its recent track record, so you know how much weight to give it.',
        alt: 'The details window with projected end-of-window usage, a caution badge, and written advice for the 5-hour and weekly limits',
      },
      {
        head: 'Settings',
        body: "Language, transparency, alerts. That's the entire list.",
        alt: 'The settings window with a language dropdown, a transparency slider, and a usage-notifications checkbox',
      },
    ],
  },

  demo: {
    title: ['Try it here,', 'before you install.'],
    lede: "What's below is not a screenshot — it's the app. Send the terminal some work and the widget's bars climb by what it cost. Drag the widget, open the pace advice with ⓘ, change the language and transparency in ⚙.",

    sessionTag: 'demo session',
    transcriptLabel: 'Demo Claude Code session transcript',
    inputPlaceholder: 'type something yourself',
    inputQueue: 'queued after this turn',
    adHocReply: "This is a demo session, so nothing actually ran. Your usage went up by what the request cost, though.",
    weightLabel: 'Roughly what it costs',
    limitFiveHour: "● You've used up the 5-hour limit. It resets at {at}, and nothing can be sent until then.",
    limitWeekly: "● You've used up the weekly limit. Nothing more can be sent this week.",
    inputBlocked: 'limit reached — start a new window to clear it',
    blockedLabel: { fiveHour: '5-hour limit spent — stopped', weekly: 'weekly limit spent — stopped' },
    prompts: {
      tests: 'just run the billing tests',
      findRetry: 'find where the webhook retry logic lives',
      extract: 'pull the retry interval out into a constant',
      tidy: 'tidy up the comments on what you just changed',
      refactor: 'refactor the billing module and run the tests',
      types: 'fix all the type errors',
      edgeTests: 'add tests for the edge cases',
      review: 'review what changed',
      rename: 'rename Charge to Payment everywhere',
      buildAll: 'build everything and fix what breaks',
      fullSuite: 'run the whole test suite',
    },

    workloadLabel: 'Workload',
    workloads: { calm: 'Light edits', caution: 'Module refactor', danger: 'Project-wide rename' },
    workloadNotes: {
      calm: 'Safe on both limits — behind the pace line and closing well under the limit. No notifications.',
      caution: 'Caution on both limits — ahead of the pace line, but closing inside the limit. Notifies at 75%.',
      danger: 'Danger on both limits — each on course to run out before it resets. Notifies at 90%, then the 5-hour limit stops the session.',
    },
    osLabel: 'Desktop',
    os: { win: 'Windows', mac: 'macOS' },
    speedLabel: 'Clock',
    speedTitles: {
      1: 'real time — a minute is a minute',
      60: 'a 5-hour window in 5 minutes',
      300: 'a 5-hour window in 1 minute',
    },
    play: 'Play',
    pause: 'Pause',
    restart: 'New window',
    usedLabel: '5-hour window {x}%',
    hint: 'Press a prompt to run that work. The heavier it is, the further the bar moves — and at 50, 75 and 90% the notifications fire. Reach 100% and it refuses to send, the way the real thing does.',
    relaunch: 'Relaunch widget',
    note: 'The three windows are the real application, loaded from the same code that ships. The terminal session is written out in advance and nothing in it actually runs, which is why the usage figures are illustrative too. The installed app reads the real limit values Claude Code reports, and a language model writes the advice in that same place.',
  },
  specs: {
    title: 'Datasheet',
    reqTitle: 'System requirements',
    reqs: [
      ['Operating system', 'Windows 10 or Windows 11'],
      ['Requires', 'Claude Code CLI, installed and in use (includes Node.js)'],
      ['API key', 'Not required'],
      ['Price', 'Free'],
      ['License', 'MIT'],
      ['Version', '{version}'],
      ['Installer SHA-256', '{sha256}'],
    ],
    faqTitle: 'Before you download',
    faqs: [
      { q: 'Is it really free?', a: 'Yes. Free to download, free to use, and open source.' },
      { q: 'Do I need an API key?', a: "No. The Groq key that powers the advice lives on a proxy server. It isn't bundled in the app, and there's nothing for you to paste in." },
      { q: 'Does my usage data leave my computer?', a: 'Your percentages are calculated locally and stay there. Only when you ask for pace advice are the already-computed statistics sent to the proxy to write it — just numbers, never a word of your conversations.' },
      { q: 'Is it open source?', a: 'Yes, under the MIT license. The repository is linked in the footer.' },
      {
        q: 'Windows warns about an unknown publisher. Is that a problem?',
        a: 'ClauMeter isn\'t code-signed, so SmartScreen shows a blue "Windows protected your PC" screen. Click More info, then Run anyway. Signing certificates cost money every year, which is hard to justify for a free tool — so the installer\'s SHA-256 is published above and on the release page instead. To verify before you run it, use Get-FileHash on the downloaded .exe in PowerShell. The output should match exactly.',
      },
    ],
  },

  cta: {
    title: 'Stop guessing.',
    lede: 'The Claude Code limit widget that shows measured numbers.',
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
