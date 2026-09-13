// The demo's stand-in for the app's main process: it produces the same payloads
// main.js sends over IPC, so the real renderer code can't tell the difference.
//
// Nothing here is measured. The app reads actual limit percentages out of Claude
// Code's statusLine hook, which a browser has none of. The readings come instead
// from the session playing out in the demo's terminal: session.js prices every
// line of that transcript, and the figure below is what those lines add up to.
// So the bars move because work happened, not because a clock did.

import { t } from './locales.js'
import { SESSIONS, WEEKLY_PER_POINT, weeklyStart } from './session.js'

export const FIVE_HOUR_MS = 5 * 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Where the demo's fake clock starts the 5-hour window, so the widget's "as of
// 14:38" and the reset countdowns read like a real afternoon of work.
const WINDOW_START_HHMM = [9, 52]

// How far into the week the visitor arrives: mid-Tuesday, with the weekly window
// resetting Saturday morning. Keeps "Resets in 4d 6h" on screen.
const WEEK_ELAPSED_MS = 2 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000

// Where each workload lands once its script has played out, which is what the
// app's model predicts the window will close at — so the detail window quotes it
// directly, and so does the pace advice, in twelve languages. session.js is built
// to add up to exactly these; scripts/check-session.mjs keeps them honest.
const PROJECTED = {
  calm: { fiveHour: 46, weekly: 34 },
  caution: { fiveHour: 86, weekly: 61 },
  // Over 100 on purpose. Everything the app says about a window that runs out —
  // "the limit is reached in 2h 13m", the slowdown it would take to avoid that,
  // the red state on both windows — hangs off a projection above the limit, so a
  // danger scenario capped under it would have said "you stay within the limit"
  // underneath its own "on course to run out" summary. (It did: the cap was there
  // to keep an old headroom line, "up to +{x}% more", from going negative, and it
  // outlived that line.)
  //
  // The weekly figure stays under 100 because it cannot honestly go over: the week
  // climbs a tenth of a point per point of 5-hour usage, so one session moves it
  // ~2pp, and a weekly projection above the limit would need a start above it too.
  // The two limits reading differently is the truer picture anyway — the window
  // runs out today, the week is merely tight.
  danger: { fiveHour: 106, weekly: 93 },
}

export const PROJECTED_FOR_TEST = PROJECTED

// Verification numbers from the app's own accuracy log (model error vs. the naive
// estimate over recent completed windows), kept at the values the site's
// screenshots show so the demo and the gallery agree.
const ACCURACY = {
  fiveHour: { sampleCount: 14, modelMeanAbsErrorPct: 4.1, naiveMeanAbsErrorPct: 11.7 },
  weekly: { sampleCount: 6, modelMeanAbsErrorPct: 5.3, naiveMeanAbsErrorPct: 9.8 },
}

// The app only shows a projection once enough of the window has gone by for one
// to mean anything (usageModel.isProjectionReliable).
const PROJECTION_FROM = 0.15

// The wall clock the fake window started on, as a real timestamp — the widget
// renders it with new Date(), so it has to be one.
export function windowStart() {
  const d = new Date()
  d.setHours(WINDOW_START_HHMM[0], WINDOW_START_HHMM[1], 0, 0)
  return d.getTime()
}

// What the terminal has spent, and the two clocks those two figures belong to:
//
//   window   this 5-hour window only, zeroed when it resets
//   week     since the week began, which a 5-hour reset does not touch
//
// Keeping them apart is the whole reason a weekly limit means anything: the
// 5-hour window comes back every five hours, the week does not. While both were
// read off one counter, the weekly bar dropped back every time the window reset
// and could never actually run out.
const only = (workload) => (SESSIONS[workload] ? workload : 'calm')

// The 5-hour reading: where the window already stood when the visitor arrived,
// plus what has run since. Capped at 100 the way the widget caps its own bar.
export function usedPct(workload, spent) {
  return Math.min(100, SESSIONS[only(workload)].base + spent.window)
}

// The weekly reading is spent, not ticked away: it climbs at a fixed rate per
// point of 5-hour usage, and it carries across window resets.
export function weeklyPct(workload, spent) {
  return Math.min(100, weeklyStart(only(workload)) + spent.week * WEEKLY_PER_POINT)
}

// Which limit, if either, has run out — the one place the rule lives, read by
// both the terminal (which stops) and the controls (which say why).
export function blockedBy(workload, spent) {
  if (usedPct(workload, spent) >= 100) return 'fiveHour'
  if (weeklyPct(workload, spent) >= 100) return 'weekly'
  return null
}

// The baseline the app draws on each gauge: how far into the window the clock is,
// as a percentage. Usage under it is running behind the clock, over it is ahead.
function pacePctFromResetIn(resetInMs, windowMs) {
  const elapsedMs = Math.max(0, Math.min(windowMs, windowMs - resetInMs))
  return Math.round((elapsedMs / windowMs) * 1000) / 10
}

// main.js's paceRiskOf, verbatim. Both windows read their status from this one
// function in the app, so the demo keeps it in one place too — the widget's title
// row and the detail window's cards must never disagree about a limit.
function paceRiskOf(pct, pacePct, projectedPct) {
  if (pct == null) return null
  if (projectedPct != null && projectedPct > 100) return 'danger'
  if (pacePct != null && pct > pacePct) return 'caution'
  return 'safe'
}

// What the app's projection would be at this point of the window. The 5-hour
// figure is withheld until enough of the window has gone by to mean anything;
// the weekly one is not, because a week is far enough along on arrival.
function projectedAt(workload, elapsedMs) {
  const proj = PROJECTED[workload] ?? PROJECTED.calm
  return {
    fiveHour: elapsedMs / FIVE_HOUR_MS >= PROJECTION_FROM ? proj.fiveHour : null,
    weekly: proj.weekly,
  }
}

// One `usage-update` payload, shaped exactly like main.js's computePercents()
// plus the two risks pushUsageUpdate() sends alongside it.
// `elapsedMs` only moves the clock and the countdowns, which is the one thing
// time is still responsible for.
export function usageAt(workload, spent, elapsedMs) {
  const fiveHourResetInMs = Math.max(0, FIVE_HOUR_MS - elapsedMs)
  const weeklyResetInMs = Math.max(0, WEEK_MS - WEEK_ELAPSED_MS - elapsedMs)
  const fiveHourPct = usedPct(workload, spent)
  const weekly = weeklyPct(workload, spent)
  const fiveHourPacePct = pacePctFromResetIn(fiveHourResetInMs, FIVE_HOUR_MS)
  const weeklyPacePct = pacePctFromResetIn(weeklyResetInMs, WEEK_MS)
  const proj = projectedAt(workload, elapsedMs)

  return {
    fiveHourPct,
    fiveHourHasData: true,
    fiveHourPending: false,
    weeklyPct: weekly,
    weeklyHasData: true,
    fiveHourResetInMs,
    weeklyResetInMs,
    fiveHourPacePct,
    weeklyPacePct,
    fiveHourRisk: paceRiskOf(fiveHourPct, fiveHourPacePct, proj.fiveHour),
    weeklyRisk: paceRiskOf(weekly, weeklyPacePct, proj.weekly),
    updatedAt: windowStart() + elapsedMs,
  }
}

// When the 5-hour window comes back, as a wall-clock time — what the app's own
// "resets at" line would say.
export function resetsAt() {
  const d = new Date(windowStart() + FIVE_HOUR_MS)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// main.js's formatHM, which reads its units out of the same locale table the
// windows do — "2시간 38분", not "2h 38m". The detail window prints these strings
// verbatim, so a hardcoded English one is the one place a language other than
// English leaks back into the demo.
function formatHM(ms, lang) {
  if (ms == null) return t(lang, 'unknownDuration')
  const total = Math.max(0, Math.round(ms / 60000))
  const d = Math.floor(total / 1440)
  const h = Math.floor((total % 1440) / 60)
  const m = total % 60
  return d > 0 ? t(lang, 'durationDHM', { d, h, m }) : t(lang, 'durationHM', { h, m })
}

// How long until a limit is reached, and how far the pace would have to drop to
// avoid it — main.js's projectLimit() tail. Both only exist once the projection
// says the window closes over 100, which is also when the app starts showing them.
function limitTiming(pct, projectedPct, resetInMs) {
  if (projectedPct == null || projectedPct <= 100) return { timeToLimitMs: null, slowdownRatio: null }
  // projectedPct > 100 >= pct, so the denominator is always positive. Already at
  // the limit (pct >= 100) means no time left at all.
  const r = pct >= 100 ? 0 : (100 - pct) / (projectedPct - pct)
  return { timeToLimitMs: Math.round(resetInMs * r), slowdownRatio: r }
}

// The stats half of `get-usage-advice`, shaped like main.js's buildStats().
// `lang` is the language the windows are set to: in the app every duration in
// here is already localized by the time it leaves the main process.
export function statsAt(workload, spent, elapsedMs, lang) {
  const p = usageAt(workload, spent, elapsedMs)
  const proj = projectedAt(workload, elapsedMs)
  const round1 = (x) => Math.round(x * 10) / 10
  // Shown as a percentage, so it is fixed to a whole one here. 0% would read as
  // "stop entirely", which is never the advice, hence the floor of 1.
  const slowdownPct = (ratio) => (ratio == null ? null : Math.max(1, Math.round(ratio * 100)))

  const fiveHour = limitTiming(p.fiveHourPct, proj.fiveHour, p.fiveHourResetInMs)
  const weekly = limitTiming(p.weeklyPct, proj.weekly, p.weeklyResetInMs)

  // The conversion that links the two limits. The app learns this ratio from the
  // user's own history; the demo already has it, because WEEKLY_PER_POINT is the
  // rate its own weekly bar climbs at — so the arithmetic below and the bar on
  // screen can never drift apart.
  const weeklyCostOfFullWindow = WEEKLY_PER_POINT * 100
  const weeklyHeadroomPct = Math.max(0, round1(100 - p.weeklyPct))
  const weeklyWindowsLeft = weeklyHeadroomPct / weeklyCostOfFullWindow
  // Calendar slots left are not used — they count the hours spent asleep. "So many
  // per day" is the honest unit, and it stops meaning anything under half a day.
  const weeklyDaysLeft = p.weeklyResetInMs / 86400000
  const weeklyWindowsPerDay =
    weeklyDaysLeft >= 0.5 ? Math.round((weeklyWindowsLeft / weeklyDaysLeft) * 10) / 10 : null

  return {
    fiveHourRisk: p.fiveHourRisk,
    weeklyRisk: p.weeklyRisk,
    fiveHourPct: round1(p.fiveHourPct),
    fiveHourHasData: true,
    fiveHourElapsed: formatHM(elapsedMs, lang),
    fiveHourRemaining: formatHM(p.fiveHourResetInMs, lang),
    fiveHourProjectedPct: proj.fiveHour,
    fiveHourTimeToLimit: fiveHour.timeToLimitMs != null ? formatHM(fiveHour.timeToLimitMs, lang) : null,
    fiveHourAtLimitNow: fiveHour.timeToLimitMs === 0,
    fiveHourSlowdownPct: slowdownPct(fiveHour.slowdownRatio),
    fiveHourModelBased: true,
    weeklyPct: round1(p.weeklyPct),
    weeklyHasData: true,
    weeklyElapsed: formatHM(WEEK_ELAPSED_MS + elapsedMs, lang),
    weeklyRemaining: formatHM(p.weeklyResetInMs, lang),
    weeklyProjectedPct: proj.weekly,
    weeklyTimeToLimit: weekly.timeToLimitMs != null ? formatHM(weekly.timeToLimitMs, lang) : null,
    weeklyAtLimitNow: weekly.timeToLimitMs === 0,
    weeklySlowdownPct: slowdownPct(weekly.slowdownRatio),
    weeklyModelBased: true,
    weeklyHeadroomPct,
    weeklyWindowsLeft: Math.round(weeklyWindowsLeft * 10) / 10,
    weeklyWindowsPerDay,
    weeklyIfFiveHourFull:
      p.fiveHourPct < 100 ? round1(p.weeklyPct + WEEKLY_PER_POINT * (100 - p.fiveHourPct)) : null,
    fiveHourAccuracy: ACCURACY.fiveHour,
    weeklyAccuracy: ACCURACY.weekly,
  }
}

// The advice half. In the app these three sentences come back from a language
// model, written in whichever language the widget is set to. The demo can't call
// one, so it quotes a representative answer instead — written out in all twelve
// languages the app speaks, so picking a language in the settings window changes
// this text too and not only the chrome around it.
//
// The wall-clock times and the weekday are the demo's own fiction (the 5-hour
// window resets at 14:52, the weekly one on Saturday); keep them in step with
// WINDOW_START_HHMM and WEEK_ELAPSED_MS if those ever move.
const ADVICE = {
  en: {
    calm: {
      summary:
        'You are running a little under where this window usually is by now. At this pace you finish around 46% — plenty of room left.',
      fiveHour:
        'Nothing to manage here. Even a heavy last hour lands well under the limit, so work the way you were going to work.',
      weekly: 'The week is barely touched. Nothing here needs attention before Saturday.',
    },
    caution: {
      summary:
        'You are running about 12% ahead of where this window usually is by now. Keep the current pace and you land near 86% — under the limit, but without much room to spare.',
      fiveHour:
        'Roughly 38 more minutes of this intensity is comfortable. After that, either slow down or wait for the reset at 14:52.',
      weekly: 'The week is on track. Two more sessions like this one would be the point to start watching it.',
    },
    danger: {
      summary:
        'This window runs out before it resets. At the current pace it projects to 106%, so the limit lands before the 14:52 reset, and the week is right behind it at 93%.',
      fiveHour:
        'Stop adding long sessions now. Short, targeted prompts until the 14:52 reset; slow down any less than that and the last stretch is locked out entirely.',
      weekly:
        'The week still has room, but less than one full 5-hour window of it. That is nearly everything you have left before Saturday, so hold back whatever can wait.',
    },
  },
  ko: {
    calm: {
      summary:
        '지금 이 구간의 평소 흐름보다 약간 여유 있게 쓰고 있어요. 이 페이스면 46% 정도로 마감돼서 여유가 많이 남아요.',
      fiveHour:
        '따로 관리할 게 없어요. 마지막 한 시간을 몰아서 써도 한도 아래로 끝나니까, 원래 하려던 대로 하면 돼요.',
      weekly: '이번 주는 아직 거의 안 썼어요. 토요일 초기화 전까지 신경 쓸 일이 없어요.',
    },
    caution: {
      summary:
        '지금 이 구간의 평소 흐름보다 12% 정도 앞서 있어요. 이 페이스를 유지하면 86% 근처에서 마감돼요. 한도 안이지만 여유가 많지는 않아요.',
      fiveHour:
        '이 강도로는 38분쯤 더가 적당해요. 그 다음부터는 속도를 줄이거나 14:52 초기화를 기다리는 게 좋아요.',
      weekly: '주간 한도는 아직 괜찮아요. 이런 작업을 두 번 더 하면 그때부터 지켜볼 시점이에요.',
    },
    danger: {
      summary:
        '이 구간은 초기화 전에 한도가 바닥나요. 지금 페이스면 예상 마감이 106%라, 14:52 초기화보다 한도에 먼저 닿아요. 주간 한도도 93%로 바로 뒤에 붙어 있어요.',
      fiveHour:
        '긴 작업을 더 넣는 건 지금 멈추는 게 좋아요. 14:52 초기화까지는 짧고 목적이 분명한 요청만 남기세요. 그만큼 속도를 줄이지 않으면 마지막 구간은 통째로 막혀요.',
      weekly:
        '주간 한도는 아직 남아 있지만, 남은 여유가 5시간 구간 한 번분도 안 돼요. 토요일까지 쓸 수 있는 게 사실상 그게 전부니, 미룰 수 있는 일은 미뤄두세요.',
    },
  },
  es: {
    calm: {
      summary:
        'Vas un poco por debajo de donde suele estar esta ventana a estas alturas. A este ritmo terminas cerca del 46%: te queda mucho margen.',
      fiveHour:
        'No hay nada que gestionar. Incluso una última hora intensa acaba muy por debajo del límite, así que trabaja como tenías previsto.',
      weekly: 'La semana está casi intacta. Aquí no hay nada que requiera atención antes del sábado.',
    },
    caution: {
      summary:
        'Vas alrededor de un 12% por delante de donde suele estar esta ventana a estas alturas. Si mantienes el ritmo, acabarás cerca del 86%: por debajo del límite, pero sin mucho margen.',
      fiveHour:
        'Unos 38 minutos más a esta intensidad son llevaderos. Después, baja el ritmo o espera al reinicio de las 14:52.',
      weekly: 'La semana va bien. Dos sesiones más como esta serían el momento de empezar a vigilarla.',
    },
    danger: {
      summary:
        'Esta ventana se agota antes de reiniciarse. Al ritmo actual la proyección es del 106%, así que alcanzarás el límite antes del reinicio de las 14:52, y la semana viene justo detrás con un 93%.',
      fiveHour:
        'Deja de añadir sesiones largas ahora. Solo peticiones cortas y concretas hasta el reinicio de las 14:52: si no bajas el ritmo al menos eso, el último tramo queda bloqueado por completo.',
      weekly:
        'A la semana aún le queda margen, pero menos de una ventana de 5 horas completa. Es casi todo lo que te queda hasta el sábado, así que deja para entonces lo que pueda esperar.',
    },
  },
  fr: {
    calm: {
      summary:
        "Vous êtes un peu en dessous de ce que cette fenêtre atteint d'habitude à ce stade. À ce rythme, vous terminez autour de 46 % : il reste beaucoup de marge.",
      fiveHour:
        "Rien à gérer ici. Même une dernière heure chargée finit bien en dessous du plafond : travaillez comme vous l'aviez prévu.",
      weekly: "La semaine est à peine entamée. Rien ici ne demande votre attention avant samedi.",
    },
    caution: {
      summary:
        "Vous êtes environ 12 % au-dessus de ce que cette fenêtre atteint d'habitude à ce stade. En gardant ce rythme, vous finirez près de 86 % : sous le plafond, mais sans grande marge.",
      fiveHour:
        "Encore 38 minutes à cette intensité, c'est confortable. Ensuite, ralentissez ou attendez la réinitialisation de 14:52.",
      weekly: "La semaine est bien partie. Deux sessions de plus comme celle-ci, et il faudra commencer à la surveiller.",
    },
    danger: {
      summary:
        "Cette fenêtre sera épuisée avant sa réinitialisation. Au rythme actuel, la projection est de 106 % : la limite arrive avant la réinitialisation de 14:52, et la semaine suit de près à 93 %.",
      fiveHour:
        "Arrêtez les longues sessions maintenant. Requêtes courtes et ciblées jusqu'à la réinitialisation de 14:52 : sans ce ralentissement, la fin de la fenêtre sera entièrement bloquée.",
      weekly:
        "La semaine a encore de la marge, mais moins d'une fenêtre de 5 heures pleine. C'est à peu près tout ce qu'il vous reste avant samedi : reportez ce qui peut attendre.",
    },
  },
  de: {
    calm: {
      summary:
        'Sie liegen etwas unter dem, was dieses Fenster zu diesem Zeitpunkt üblicherweise erreicht. In diesem Tempo landen Sie bei rund 46% — reichlich Luft.',
      fiveHour:
        'Hier gibt es nichts zu steuern. Selbst eine intensive letzte Stunde bleibt deutlich unter dem Limit, arbeiten Sie also wie geplant weiter.',
      weekly: 'Die Woche ist kaum angetastet. Vor Samstag braucht das hier keine Aufmerksamkeit.',
    },
    caution: {
      summary:
        'Sie liegen etwa 12% über dem, was dieses Fenster zu diesem Zeitpunkt üblicherweise erreicht. Bei diesem Tempo landen Sie bei knapp 86% — unter dem Limit, aber ohne viel Reserve.',
      fiveHour:
        'Etwa 38 weitere Minuten in dieser Intensität sind unbedenklich. Danach entweder langsamer werden oder auf den Reset um 14:52 warten.',
      weekly: 'Die Woche liegt im Plan. Zwei weitere Sitzungen wie diese wären der Punkt, ab dem Sie hinschauen sollten.',
    },
    danger: {
      summary:
        'Dieses Fenster ist vor dem Reset aufgebraucht. Im aktuellen Tempo liegt die Prognose bei 106%, das Limit kommt also vor dem Reset um 14:52 — und die Woche steht mit 93% direkt dahinter.',
      fiveHour:
        'Hören Sie jetzt mit langen Sitzungen auf. Bis zum Reset um 14:52 nur kurze, gezielte Anfragen — ohne diese Drosselung ist die letzte Strecke komplett gesperrt.',
      weekly:
        'Die Woche hat noch Luft, aber weniger als eine volle 5-Stunden-Periode. Viel mehr bleibt Ihnen bis Samstag nicht, halten Sie also alles zurück, was warten kann.',
    },
  },
  pt: {
    calm: {
      summary:
        'Você está um pouco abaixo de onde esta janela normalmente está a esta altura. Nesse ritmo você termina perto de 46% — sobra bastante folga.',
      fiveHour:
        'Não há nada para gerenciar aqui. Mesmo uma última hora intensa termina bem abaixo do limite, então trabalhe como pretendia.',
      weekly: 'A semana está quase intacta. Nada aqui exige atenção antes de sábado.',
    },
    caution: {
      summary:
        'Você está cerca de 12% à frente de onde esta janela normalmente está a esta altura. Mantendo o ritmo atual, você termina perto de 86% — abaixo do limite, mas sem muita folga.',
      fiveHour:
        'Mais uns 38 minutos nessa intensidade são tranquilos. Depois disso, reduza o ritmo ou espere a reinicialização às 14:52.',
      weekly: 'A semana está no caminho certo. Duas sessões como esta e já seria hora de começar a acompanhar.',
    },
    danger: {
      summary:
        'Esta janela se esgota antes de reiniciar. No ritmo atual a projeção é de 106%, então o limite chega antes da reinicialização das 14:52 — e a semana vem logo atrás, em 93%.',
      fiveHour:
        'Pare de adicionar sessões longas agora. Só pedidos curtos e objetivos até a reinicialização das 14:52: sem essa redução, o trecho final fica totalmente bloqueado.',
      weekly:
        'A semana ainda tem folga, mas menos de uma janela de 5 horas cheia. É quase tudo o que resta até sábado, então deixe para lá o que puder esperar.',
    },
  },
  ja: {
    calm: {
      summary:
        '今は、この区間のいつもの流れより少し余裕のあるペースです。このままなら46%前後で終わり、余裕はたっぷり残ります。',
      fiveHour:
        'ここで管理することは特にありません。最後の1時間に作業が集中しても上限には届かないので、予定どおり進めて大丈夫です。',
      weekly: '今週はまだほとんど使っていません。土曜日のリセットまで気にすることはありません。',
    },
    caution: {
      summary:
        '今は、この区間のいつもの流れより12%ほど先行しています。このペースを保つと86%前後で終わり、上限内ではありますが余裕は多くありません。',
      fiveHour:
        'この強度なら、あと38分ほどが無理のない範囲です。そのあとはペースを落とすか、14:52のリセットを待つのがよさそうです。',
      weekly: '週の使用量は想定どおりです。今回のような作業をあと2回続けたら、そこから注意して見るタイミングです。',
    },
    danger: {
      summary:
        'この区間はリセット前に上限へ達します。今のペースだと予測される期間終了時の使用率は106%で、14:52のリセットより先に上限へ届きます。週間上限も93%とすぐ後ろに迫っています。',
      fiveHour:
        '長い作業を足すのは今やめたほうがよいです。14:52のリセットまでは短く目的の絞れた依頼だけにしないと、最後の区間は完全に止まります。',
      weekly:
        '週にはまだ余裕がありますが、5時間枠1回分にも届きません。土曜日まで使えるのは実質それだけなので、待てる作業は後回しにしてください。',
    },
  },
  zh: {
    calm: {
      summary: '你目前比这个周期的通常进度略慢一些。按这个节奏会在 46% 左右结束，余量很充足。',
      fiveHour: '这里没什么需要管理的。即使最后一小时密集使用，也远低于额度上限，按原计划工作即可。',
      weekly: '本周几乎还没用。周六重置之前无需关注。',
    },
    caution: {
      summary:
        '你目前比这个周期的通常进度快了约 12%。保持当前节奏会在 86% 左右结束，仍在额度内，但余量不多。',
      fiveHour: '按这个强度，再用 38 分钟左右比较稳妥。之后建议放慢节奏，或等 14:52 的重置。',
      weekly: '本周进度正常。再来两次这样的会话，就该开始留意了。',
    },
    danger: {
      summary:
        '这个周期会在重置前用尽。按当前节奏预计将达到 106%，也就是在 14:52 重置之前就触及上限；周额度也紧随其后，已达 93%。',
      fiveHour:
        '现在就别再安排长时间会话了。在 14:52 重置前只用简短、目标明确的提问，否则最后一段会被完全卡住。',
      weekly:
        '本周还有余量，但不足一个完整的 5 小时周期。到周六之前基本就只有这些，能等的先放一放。',
    },
  },
  ru: {
    calm: {
      summary:
        'Сейчас вы идёте чуть медленнее, чем это окно обычно к этому времени. При таком темпе вы закончите около 46% — запас большой.',
      fiveHour:
        'Здесь нечем управлять. Даже насыщенный последний час завершится заметно ниже лимита, так что работайте как планировали.',
      weekly: 'Неделя почти не тронута. До субботы здесь не о чем беспокоиться.',
    },
    caution: {
      summary:
        'Сейчас вы примерно на 12% опережаете обычный ход этого окна. Если сохранить темп, вы закончите около 86% — в пределах лимита, но без большого запаса.',
      fiveHour:
        'Ещё примерно 38 минут в таком темпе — нормально. После этого либо сбавьте, либо дождитесь сброса в 14:52.',
      weekly: 'Неделя идёт по плану. Ещё два таких сеанса — и пора будет следить.',
    },
    danger: {
      summary:
        'Это окно закончится раньше, чем сбросится. При текущем темпе прогноз — 106%, то есть лимит наступит до сброса в 14:52, а неделя идёт следом с 93%.',
      fiveHour:
        'Прекратите добавлять длинные сеансы. До сброса в 14:52 только короткие точные запросы: без такого замедления последний отрезок будет полностью заблокирован.',
      weekly:
        'На неделе ещё есть запас, но меньше одного полного 5-часового окна. До субботы это практически всё, что у вас есть, — отложите всё, что может подождать.',
    },
  },
  it: {
    calm: {
      summary:
        "Sei un po' sotto il punto in cui questa finestra si trova di solito a quest'ora. Con questo ritmo chiudi intorno al 46%: margine in abbondanza.",
      fiveHour:
        "Non c'è nulla da gestire. Anche un'ultima ora intensa resta ben sotto il limite, quindi lavora come avevi previsto.",
      weekly: "Come consumo, la settimana è appena cominciata. Niente che richieda attenzione prima di sabato.",
    },
    caution: {
      summary:
        "Sei circa il 12% avanti rispetto al punto in cui questa finestra si trova di solito a quest'ora. Mantenendo il ritmo chiudi vicino all'86%: sotto il limite, ma con poco margine.",
      fiveHour:
        "Altri 38 minuti circa a questa intensità sono tranquilli. Dopo, rallenta o aspetta il reset alle 14:52.",
      weekly: "La settimana è in linea. Altre due sessioni come questa e sarebbe il momento di tenerla d'occhio.",
    },
    danger: {
      summary:
        "Questa finestra si esaurisce prima del reset. Con il ritmo attuale la proiezione è del 106%, quindi il limite arriva prima del reset delle 14:52, e la settimana segue da vicino al 93%.",
      fiveHour:
        "Smetti ora di aggiungere sessioni lunghe. Solo richieste brevi e mirate fino al reset delle 14:52: senza quel rallentamento l'ultimo tratto è del tutto bloccato.",
      weekly:
        "Alla settimana resta margine, ma meno di una finestra da 5 ore piena. È quasi tutto quello che hai fino a sabato, quindi rimanda ciò che può attendere.",
    },
  },
  nl: {
    calm: {
      summary:
        'Je zit iets onder waar dit venster op dit moment normaal staat. In dit tempo eindig je rond 46% — ruim marge over.',
      fiveHour:
        'Hier valt niets te managen. Zelfs een druk laatste uur blijft flink onder de limiet, dus werk zoals je van plan was.',
      weekly: 'De week is nauwelijks aangeroerd. Hier hoeft niets voor zaterdag aandacht te krijgen.',
    },
    caution: {
      summary:
        'Je zit ongeveer 12% boven waar dit venster op dit moment normaal staat. Houd je dit tempo aan, dan eindig je rond 86% — onder de limiet, maar zonder veel marge.',
      fiveHour:
        "Nog zo'n 38 minuten op deze intensiteit is comfortabel. Daarna rustiger aan doen of wachten op de reset van 14:52.",
      weekly: 'De week loopt op schema. Nog twee sessies als deze en het is tijd om erop te letten.',
    },
    danger: {
      summary:
        'Dit venster raakt op vóór de reset. In het huidige tempo komt de prognose op 106%, dus de limiet valt vóór de reset van 14:52 — en de week zit er met 93% kort achter.',
      fiveHour:
        'Stop nu met lange sessies. Tot de reset van 14:52 alleen korte, gerichte vragen: zonder die vertraging is het laatste stuk helemaal geblokkeerd.',
      weekly:
        'De week heeft nog ruimte, maar minder dan één volle periode van 5 uur. Veel meer heb je tot zaterdag niet, dus stel uit wat kan wachten.',
    },
  },
  pl: {
    calm: {
      summary:
        'Jesteś trochę poniżej tego, gdzie to okno zwykle jest o tej porze. W tym tempie skończysz około 46% — zapasu jest dużo.',
      fiveHour:
        'Nie ma tu czym zarządzać. Nawet intensywna ostatnia godzina zmieści się wyraźnie pod limitem, więc pracuj tak, jak masz w planie.',
      weekly: 'Tydzień jest prawie nietknięty. Do soboty nic tu nie wymaga uwagi.',
    },
    caution: {
      summary:
        'Jesteś około 12% powyżej tego, gdzie to okno zwykle jest o tej porze. Przy tym tempie skończysz blisko 86% — pod limitem, ale bez dużego zapasu.',
      fiveHour:
        'Jeszcze około 38 minut w tej intensywności jest bezpieczne. Potem albo zwolnij, albo poczekaj na reset o 14:52.',
      weekly: 'Tydzień idzie zgodnie z planem. Jeszcze dwie takie sesje i trzeba będzie zacząć pilnować.',
    },
    danger: {
      summary:
        'To okno wyczerpie się przed resetem. W obecnym tempie prognoza to 106%, więc limit skończy się przed resetem o 14:52, a tydzień jest tuż za nim, na 93%.',
      fiveHour:
        'Przestań teraz dodawać długie sesje. Do resetu o 14:52 tylko krótkie, konkretne zapytania — bez takiego zwolnienia ostatni odcinek będzie całkowicie zablokowany.',
      weekly:
        'W tygodniu został jeszcze zapas, ale mniej niż jedno pełne 5-godzinne okno. Do soboty to praktycznie wszystko, co masz, więc odłóż to, co może poczekać.',
    },
  },
}

export function adviceAt(workload, lang) {
  const dict = ADVICE[lang] ?? ADVICE.en
  const a = dict[workload] ?? dict.calm
  return { riskLevel: (SESSIONS[workload] ?? SESSIONS.calm).risk, ...a }
}
