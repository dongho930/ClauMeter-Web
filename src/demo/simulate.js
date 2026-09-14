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

// What the app's model predicts each limit will close at, per workload. The detail
// window quotes these directly, and so does the pace advice, in twelve languages.
//
//   fiveHour   where this 5-hour window closes. session.js is built to add up to
//              exactly this, because the window closes when the script does.
//   weekly     where the *week* closes, at Saturday's reset — four days after the
//              session on screen, so it is not where the weekly bar stops. It is
//              the reading plus the rest of the week at the pace the week has run.
//   weeklyNow  where the weekly bar stops once the script has played out, which
//              the danger advice quotes by number ("the week is at 93%").
//
// scripts/check-session.mjs keeps fiveHour and weeklyNow honest.
//
// Each workload holds one state on both limits for as long as it plays — that is
// what makes the three worth picking between (see ARRIVAL below):
//   calm      safe on both: under the pace line, closing well inside the limit
//   caution   caution on both: ahead of the pace line, closing inside the limit
//   danger    danger on both: on course to run out before the reset
//
// Over 100 on purpose for danger. Everything the app says about a limit that runs
// out — "the limit is reached in 2h 13m", the slowdown it would take to avoid that,
// the red state — hangs off a projection above the limit.
//
// The danger week used to be capped at 93, on the reasoning that one session only
// moves it ~2pp. But the projection is to the end of the week, not the end of the
// session: 91% spent by Tuesday evening, with four days to go, closing at 93 would
// mean nobody touches Claude Code again until Saturday. It left the weekly light
// amber in the one workload built to show red.
const PROJECTED = {
  calm: { fiveHour: 46, weekly: 72, weeklyNow: 34 },
  caution: { fiveHour: 86, weekly: 91, weeklyNow: 61 },
  danger: { fiveHour: 106, weekly: 114, weeklyNow: 93 },
}

export const PROJECTED_FOR_TEST = PROJECTED

// How far into the 5-hour window each workload opens, and how far it plays before
// the scene starts over. The pace line sweeps the whole window, so a fixed reading
// changes state on its own as the clock passes it: calm used to open amber (24%
// used, 5% into the window) and caution turned green once the clock overtook its
// 86%. Each workload therefore plays only the stretch of the window where its
// state is true:
//
//   calm      opens at 55%, past anything it will ever read (46% at most)
//   caution   opens at 25%, well under its 60% start, and starts over at 60% —
//             before the pace line can catch it even at 300x, where the clock
//             outruns the script (scripts/check-session.mjs replays it to check)
//   danger    opens at 38%; its projection is over 100 throughout
//
// Starting over rather than rolling into a fresh window is also what keeps danger
// red: a fresh window has no projection for its first quarter, so it read amber
// for the first stretch of every lap.
const ARRIVAL = { calm: 0.55, caution: 0.25, danger: 0.38 }
const SCENE_END = { calm: 1, caution: 0.6, danger: 1 }

export const arrivalAt = (workload) => FIVE_HOUR_MS * (ARRIVAL[workload] ?? ARRIVAL.calm)
export const sceneEndAt = (workload) => FIVE_HOUR_MS * (SCENE_END[workload] ?? SCENE_END.calm)

// Verification numbers from the app's own accuracy log (model error vs. the naive
// estimate over recent completed windows), kept at the values the site's
// screenshots show so the demo and the gallery agree.
const ACCURACY = {
  fiveHour: { sampleCount: 14, modelMeanAbsErrorPct: 4.1, naiveMeanAbsErrorPct: 11.7 },
  weekly: { sampleCount: 6, modelMeanAbsErrorPct: 5.3, naiveMeanAbsErrorPct: 9.8 },
}

// The app only shows a projection once enough of the window has gone by for one
// to mean anything — usageModel.js's PROJECTION_DEADZONE_FRAC, the same quarter.
const PROJECTION_FROM = 0.25

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
      weekly: 'The week is behind its pace line too. Keep going like this and it closes around 72% on Saturday — nothing here needs attention.',
    },
    caution: {
      summary:
        'You are running about 12% ahead of where this window usually is by now. Keep the current pace and you land near 86% — under the limit, but without much room to spare.',
      fiveHour:
        'Roughly 38 more minutes of this intensity is comfortable. After that, either slow down or wait for the reset at 14:52.',
      weekly: 'The week is ahead of its pace line as well, heading for about 91% by Saturday. Still inside the limit, but a couple more heavy days would use up the rest.',
    },
    danger: {
      summary:
        'Both limits are on course to run out. This window projects to 106%, so the limit lands before the 14:52 reset, and the week, already at 93%, projects to 114% and runs out before Saturday.',
      fiveHour:
        'Stop adding long sessions now. Short, targeted prompts until the 14:52 reset; slow down any less than that and the last stretch is locked out entirely.',
      weekly:
        'The week runs out before Saturday too: 93% used, heading for 114%. Slowing down today will not fix it on its own, so spread what is left across the coming days and push anything that can wait to next week.',
    },
  },
  ko: {
    calm: {
      summary:
        '지금 이 구간의 평소 흐름보다 약간 여유 있게 쓰고 있어요. 이 페이스면 46% 정도로 마감돼서 여유가 많이 남아요.',
      fiveHour:
        '따로 관리할 게 없어요. 마지막 한 시간을 몰아서 써도 한도 아래로 끝나니까, 원래 하려던 대로 하면 돼요.',
      weekly: '이번 주도 기준선보다 느리게 쓰고 있어요. 이대로면 토요일에 72% 정도로 마감돼서 신경 쓸 일이 없어요.',
    },
    caution: {
      summary:
        '지금 이 구간의 평소 흐름보다 12% 정도 앞서 있어요. 이 페이스를 유지하면 86% 근처에서 마감돼요. 한도 안이지만 여유가 많지는 않아요.',
      fiveHour:
        '이 강도로는 38분쯤 더가 적당해요. 그 다음부터는 속도를 줄이거나 14:52 초기화를 기다리는 게 좋아요.',
      weekly: '이번 주도 기준선보다 빨라서, 토요일에 91% 정도로 마감될 흐름이에요. 아직 한도 안이지만, 무거운 날이 이틀만 더 있으면 남은 여유를 다 써요.',
    },
    danger: {
      summary:
        '두 한도 모두 바닥나는 흐름이에요. 이 구간은 예상 마감이 106%라 14:52 초기화보다 한도에 먼저 닿고, 이미 93%인 주간 한도도 예상 마감이 114%라 토요일 전에 바닥나요.',
      fiveHour:
        '긴 작업을 더 넣는 건 지금 멈추는 게 좋아요. 14:52 초기화까지는 짧고 목적이 분명한 요청만 남기세요. 그만큼 속도를 줄이지 않으면 마지막 구간은 통째로 막혀요.',
      weekly:
        '주간 한도도 토요일 전에 바닥나요. 지금 93%를 썼고 예상 마감은 114%예요. 오늘 속도만 줄여서는 해결되지 않으니, 남은 작업을 며칠에 나눠 쓰고 미룰 수 있는 일은 다음 주로 넘기세요.',
    },
  },
  es: {
    calm: {
      summary:
        'Vas un poco por debajo de donde suele estar esta ventana a estas alturas. A este ritmo terminas cerca del 46%: te queda mucho margen.',
      fiveHour:
        'No hay nada que gestionar. Incluso una última hora intensa acaba muy por debajo del límite, así que trabaja como tenías previsto.',
      weekly: 'La semana también va por debajo de su línea de ritmo. Si sigues así, cierra cerca del 72% el sábado: nada que vigilar.',
    },
    caution: {
      summary:
        'Vas alrededor de un 12% por delante de donde suele estar esta ventana a estas alturas. Si mantienes el ritmo, acabarás cerca del 86%: por debajo del límite, pero sin mucho margen.',
      fiveHour:
        'Unos 38 minutos más a esta intensidad son llevaderos. Después, baja el ritmo o espera al reinicio de las 14:52.',
      weekly: 'La semana también va por delante de su línea de ritmo y apunta a cerca del 91% el sábado. Sigue dentro del límite, pero un par de días intensos más agotarían el resto.',
    },
    danger: {
      summary:
        'Los dos límites van camino de agotarse. Esta ventana proyecta un 106%, así que alcanzarás el límite antes del reinicio de las 14:52, y la semana, ya en el 93%, proyecta un 114%: se agota antes del sábado.',
      fiveHour:
        'Deja de añadir sesiones largas ahora. Solo peticiones cortas y concretas hasta el reinicio de las 14:52: si no bajas el ritmo al menos eso, el último tramo queda bloqueado por completo.',
      weekly:
        'La semana también se agota antes del sábado: 93% usado y rumbo al 114%. Bajar el ritmo solo hoy no basta, así que reparte lo que queda entre los próximos días y deja para la semana que viene lo que pueda esperar.',
    },
  },
  fr: {
    calm: {
      summary:
        "Vous êtes un peu en dessous de ce que cette fenêtre atteint d'habitude à ce stade. À ce rythme, vous terminez autour de 46 % : il reste beaucoup de marge.",
      fiveHour:
        "Rien à gérer ici. Même une dernière heure chargée finit bien en dessous du plafond : travaillez comme vous l'aviez prévu.",
      weekly: "La semaine est elle aussi sous sa ligne de rythme. À ce train, elle se termine vers 72 % samedi : rien à surveiller.",
    },
    caution: {
      summary:
        "Vous êtes environ 12 % au-dessus de ce que cette fenêtre atteint d'habitude à ce stade. En gardant ce rythme, vous finirez près de 86 % : sous le plafond, mais sans grande marge.",
      fiveHour:
        "Encore 38 minutes à cette intensité, c'est confortable. Ensuite, ralentissez ou attendez la réinitialisation de 14:52.",
      weekly: "La semaine est elle aussi en avance sur sa ligne de rythme et se dirige vers 91 % samedi. Toujours sous le plafond, mais deux journées chargées de plus consommeraient le reste.",
    },
    danger: {
      summary:
        "Les deux limites sont en passe d'être épuisées. Cette fenêtre est projetée à 106 % : la limite arrive avant la réinitialisation de 14:52. La semaine, déjà à 93 %, est projetée à 114 % et sera épuisée avant samedi.",
      fiveHour:
        "Arrêtez les longues sessions maintenant. Requêtes courtes et ciblées jusqu'à la réinitialisation de 14:52 : sans ce ralentissement, la fin de la fenêtre sera entièrement bloquée.",
      weekly:
        "La semaine sera elle aussi épuisée avant samedi : 93 % utilisés, 114 % en projection. Ralentir aujourd'hui ne suffira pas : répartissez ce qui reste sur les prochains jours et reportez à la semaine prochaine ce qui peut attendre.",
    },
  },
  de: {
    calm: {
      summary:
        'Sie liegen etwas unter dem, was dieses Fenster zu diesem Zeitpunkt üblicherweise erreicht. In diesem Tempo landen Sie bei rund 46% — reichlich Luft.',
      fiveHour:
        'Hier gibt es nichts zu steuern. Selbst eine intensive letzte Stunde bleibt deutlich unter dem Limit, arbeiten Sie also wie geplant weiter.',
      weekly: 'Auch die Woche liegt unter ihrer Tempolinie. So weiter, und sie schließt am Samstag bei rund 72% — hier gibt es nichts zu beachten.',
    },
    caution: {
      summary:
        'Sie liegen etwa 12% über dem, was dieses Fenster zu diesem Zeitpunkt üblicherweise erreicht. Bei diesem Tempo landen Sie bei knapp 86% — unter dem Limit, aber ohne viel Reserve.',
      fiveHour:
        'Etwa 38 weitere Minuten in dieser Intensität sind unbedenklich. Danach entweder langsamer werden oder auf den Reset um 14:52 warten.',
      weekly: 'Auch die Woche liegt über ihrer Tempolinie und steuert auf etwa 91% am Samstag zu. Noch innerhalb des Limits, aber zwei weitere intensive Tage würden den Rest aufbrauchen.',
    },
    danger: {
      summary:
        'Beide Limits laufen auf Erschöpfung zu. Die Prognose für dieses Fenster liegt bei 106%, das Limit kommt also vor dem Reset um 14:52 — und die Woche, schon bei 93%, steuert auf 114% zu und ist vor Samstag aufgebraucht.',
      fiveHour:
        'Hören Sie jetzt mit langen Sitzungen auf. Bis zum Reset um 14:52 nur kurze, gezielte Anfragen — ohne diese Drosselung ist die letzte Strecke komplett gesperrt.',
      weekly:
        'Auch die Woche ist vor Samstag aufgebraucht: 93% verbraucht, Prognose 114%. Nur heute langsamer zu machen reicht nicht — verteilen Sie den Rest auf die nächsten Tage und schieben Sie alles, was warten kann, in die nächste Woche.',
    },
  },
  pt: {
    calm: {
      summary:
        'Você está um pouco abaixo de onde esta janela normalmente está a esta altura. Nesse ritmo você termina perto de 46% — sobra bastante folga.',
      fiveHour:
        'Não há nada para gerenciar aqui. Mesmo uma última hora intensa termina bem abaixo do limite, então trabalhe como pretendia.',
      weekly: 'A semana também está abaixo da linha de ritmo. Seguindo assim, ela fecha perto de 72% no sábado — nada para acompanhar.',
    },
    caution: {
      summary:
        'Você está cerca de 12% à frente de onde esta janela normalmente está a esta altura. Mantendo o ritmo atual, você termina perto de 86% — abaixo do limite, mas sem muita folga.',
      fiveHour:
        'Mais uns 38 minutos nessa intensidade são tranquilos. Depois disso, reduza o ritmo ou espere a reinicialização às 14:52.',
      weekly: 'A semana também está à frente da linha de ritmo e caminha para cerca de 91% no sábado. Ainda dentro do limite, mas mais dois dias pesados consumiriam o resto.',
    },
    danger: {
      summary:
        'Os dois limites estão a caminho de se esgotar. Esta janela projeta 106%, então o limite chega antes da reinicialização das 14:52 — e a semana, já em 93%, projeta 114% e se esgota antes de sábado.',
      fiveHour:
        'Pare de adicionar sessões longas agora. Só pedidos curtos e objetivos até a reinicialização das 14:52: sem essa redução, o trecho final fica totalmente bloqueado.',
      weekly:
        'A semana também se esgota antes de sábado: 93% usados, projeção de 114%. Reduzir o ritmo só hoje não resolve — distribua o que resta pelos próximos dias e deixe para a semana que vem o que puder esperar.',
    },
  },
  ja: {
    calm: {
      summary:
        '今は、この区間のいつもの流れより少し余裕のあるペースです。このままなら46%前後で終わり、余裕はたっぷり残ります。',
      fiveHour:
        'ここで管理することは特にありません。最後の1時間に作業が集中しても上限には届かないので、予定どおり進めて大丈夫です。',
      weekly: '週もペースの目安線より控えめです。このままなら土曜日に72%前後で終わるので、気にすることはありません。',
    },
    caution: {
      summary:
        '今は、この区間のいつもの流れより12%ほど先行しています。このペースを保つと86%前後で終わり、上限内ではありますが余裕は多くありません。',
      fiveHour:
        'この強度なら、あと38分ほどが無理のない範囲です。そのあとはペースを落とすか、14:52のリセットを待つのがよさそうです。',
      weekly: '週もペースの目安線より先行していて、土曜日には91%前後になる見込みです。まだ上限内ですが、重い日があと2日あれば残りを使い切ります。',
    },
    danger: {
      summary:
        '両方の上限が尽きる流れです。この区間の予測は106%で、14:52のリセットより先に上限へ届きます。すでに93%の週間上限も予測は114%で、土曜日より前に尽きます。',
      fiveHour:
        '長い作業を足すのは今やめたほうがよいです。14:52のリセットまでは短く目的の絞れた依頼だけにしないと、最後の区間は完全に止まります。',
      weekly:
        '週間上限も土曜日より前に尽きます。現在93%で、予測は114%です。今日だけペースを落としても解決しないので、残りの作業を数日に分け、待てるものは来週に回してください。',
    },
  },
  zh: {
    calm: {
      summary: '你目前比这个周期的通常进度略慢一些。按这个节奏会在 46% 左右结束，余量很充足。',
      fiveHour: '这里没什么需要管理的。即使最后一小时密集使用，也远低于额度上限，按原计划工作即可。',
      weekly: '本周也低于进度基准线。照这样下去，周六会在 72% 左右结束，无需关注。',
    },
    caution: {
      summary:
        '你目前比这个周期的通常进度快了约 12%。保持当前节奏会在 86% 左右结束，仍在额度内，但余量不多。',
      fiveHour: '按这个强度，再用 38 分钟左右比较稳妥。之后建议放慢节奏，或等 14:52 的重置。',
      weekly: '本周也快于进度基准线，预计周六达到 91% 左右。仍在额度内，但再有两天高强度使用就会用完剩余额度。',
    },
    danger: {
      summary:
        '两个额度都将用尽。这个周期预计达到 106%，会在 14:52 重置之前触及上限；本周额度已达 93%，预计达到 114%，会在周六之前用尽。',
      fiveHour:
        '现在就别再安排长时间会话了。在 14:52 重置前只用简短、目标明确的提问，否则最后一段会被完全卡住。',
      weekly:
        '本周额度也会在周六前用尽：已用 93%，预计 114%。只在今天放慢节奏解决不了问题，请把剩余工作分摊到接下来几天，能等的留到下周。',
    },
  },
  ru: {
    calm: {
      summary:
        'Сейчас вы идёте чуть медленнее, чем это окно обычно к этому времени. При таком темпе вы закончите около 46% — запас большой.',
      fiveHour:
        'Здесь нечем управлять. Даже насыщенный последний час завершится заметно ниже лимита, так что работайте как планировали.',
      weekly: 'Неделя тоже идёт ниже линии темпа. Если так продолжать, к субботе она закроется около 72% — следить не за чем.',
    },
    caution: {
      summary:
        'Сейчас вы примерно на 12% опережаете обычный ход этого окна. Если сохранить темп, вы закончите около 86% — в пределах лимита, но без большого запаса.',
      fiveHour:
        'Ещё примерно 38 минут в таком темпе — нормально. После этого либо сбавьте, либо дождитесь сброса в 14:52.',
      weekly: 'Неделя тоже опережает линию темпа и к субботе выйдет примерно на 91%. Пока в пределах лимита, но ещё пара насыщенных дней израсходует остаток.',
    },
    danger: {
      summary:
        'Оба лимита идут к исчерпанию. Прогноз для этого окна — 106%, так что лимит наступит до сброса в 14:52, а неделя, уже на 93%, идёт к 114% и закончится до субботы.',
      fiveHour:
        'Прекратите добавлять длинные сеансы. До сброса в 14:52 только короткие точные запросы: без такого замедления последний отрезок будет полностью заблокирован.',
      weekly:
        'Неделя тоже закончится до субботы: израсходовано 93%, прогноз — 114%. Одного сегодняшнего замедления не хватит: распределите оставшееся на ближайшие дни и перенесите на следующую неделю всё, что может подождать.',
    },
  },
  it: {
    calm: {
      summary:
        "Sei un po' sotto il punto in cui questa finestra si trova di solito a quest'ora. Con questo ritmo chiudi intorno al 46%: margine in abbondanza.",
      fiveHour:
        "Non c'è nulla da gestire. Anche un'ultima ora intensa resta ben sotto il limite, quindi lavora come avevi previsto.",
      weekly: "Anche la settimana è sotto la sua linea di ritmo. Continuando così chiude intorno al 72% sabato: niente da tenere d'occhio.",
    },
    caution: {
      summary:
        "Sei circa il 12% avanti rispetto al punto in cui questa finestra si trova di solito a quest'ora. Mantenendo il ritmo chiudi vicino all'86%: sotto il limite, ma con poco margine.",
      fiveHour:
        "Altri 38 minuti circa a questa intensità sono tranquilli. Dopo, rallenta o aspetta il reset alle 14:52.",
      weekly: "Anche la settimana è avanti rispetto alla sua linea di ritmo e punta a circa il 91% per sabato. Ancora dentro il limite, ma altri due giorni intensi consumerebbero il resto.",
    },
    danger: {
      summary:
        "Entrambi i limiti stanno per esaurirsi. Questa finestra è proiettata al 106%, quindi il limite arriva prima del reset delle 14:52, e la settimana, già al 93%, è proiettata al 114% e si esaurisce prima di sabato.",
      fiveHour:
        "Smetti ora di aggiungere sessioni lunghe. Solo richieste brevi e mirate fino al reset delle 14:52: senza quel rallentamento l'ultimo tratto è del tutto bloccato.",
      weekly:
        "Anche la settimana si esaurisce prima di sabato: 93% usato, proiezione al 114%. Rallentare solo oggi non basta: distribuisci il lavoro rimasto sui prossimi giorni e rimanda alla settimana prossima ciò che può attendere.",
    },
  },
  nl: {
    calm: {
      summary:
        'Je zit iets onder waar dit venster op dit moment normaal staat. In dit tempo eindig je rond 46% — ruim marge over.',
      fiveHour:
        'Hier valt niets te managen. Zelfs een druk laatste uur blijft flink onder de limiet, dus werk zoals je van plan was.',
      weekly: 'Ook de week zit onder de tempolijn. Ga zo door en hij sluit zaterdag rond 72% — niets om op te letten.',
    },
    caution: {
      summary:
        'Je zit ongeveer 12% boven waar dit venster op dit moment normaal staat. Houd je dit tempo aan, dan eindig je rond 86% — onder de limiet, maar zonder veel marge.',
      fiveHour:
        "Nog zo'n 38 minuten op deze intensiteit is comfortabel. Daarna rustiger aan doen of wachten op de reset van 14:52.",
      weekly: 'Ook de week zit boven de tempolijn en koerst af op ongeveer 91% op zaterdag. Nog binnen de limiet, maar nog twee drukke dagen en de rest is op.',
    },
    danger: {
      summary:
        'Beide limieten raken op. Dit venster komt op een prognose van 106%, dus de limiet valt vóór de reset van 14:52 — en de week, al op 93%, koerst af op 114% en is vóór zaterdag op.',
      fiveHour:
        'Stop nu met lange sessies. Tot de reset van 14:52 alleen korte, gerichte vragen: zonder die vertraging is het laatste stuk helemaal geblokkeerd.',
      weekly:
        'Ook de week is vóór zaterdag op: 93% gebruikt, prognose 114%. Alleen vandaag rustiger aan doen is niet genoeg — verdeel wat overblijft over de komende dagen en schuif door naar volgende week wat kan wachten.',
    },
  },
  pl: {
    calm: {
      summary:
        'Jesteś trochę poniżej tego, gdzie to okno zwykle jest o tej porze. W tym tempie skończysz około 46% — zapasu jest dużo.',
      fiveHour:
        'Nie ma tu czym zarządzać. Nawet intensywna ostatnia godzina zmieści się wyraźnie pod limitem, więc pracuj tak, jak masz w planie.',
      weekly: 'Tydzień też jest poniżej linii tempa. Jeśli tak zostanie, w sobotę zamknie się około 72% — nie ma czego pilnować.',
    },
    caution: {
      summary:
        'Jesteś około 12% powyżej tego, gdzie to okno zwykle jest o tej porze. Przy tym tempie skończysz blisko 86% — pod limitem, ale bez dużego zapasu.',
      fiveHour:
        'Jeszcze około 38 minut w tej intensywności jest bezpieczne. Potem albo zwolnij, albo poczekaj na reset o 14:52.',
      weekly: 'Tydzień też wyprzedza linię tempa i zmierza do około 91% w sobotę. Wciąż w limicie, ale jeszcze dwa intensywne dni zużyją resztę.',
    },
    danger: {
      summary:
        'Oba limity zmierzają do wyczerpania. Prognoza dla tego okna to 106%, więc limit skończy się przed resetem o 14:52, a tydzień, już na 93%, zmierza do 114% i skończy się przed sobotą.',
      fiveHour:
        'Przestań teraz dodawać długie sesje. Do resetu o 14:52 tylko krótkie, konkretne zapytania — bez takiego zwolnienia ostatni odcinek będzie całkowicie zablokowany.',
      weekly:
        'Tydzień też skończy się przed sobotą: zużyte 93%, prognoza 114%. Samo zwolnienie dzisiaj nie wystarczy — rozłóż resztę pracy na najbliższe dni, a to, co może poczekać, przenieś na przyszły tydzień.',
    },
  },
}

export function adviceAt(workload, lang) {
  const dict = ADVICE[lang] ?? ADVICE.en
  const a = dict[workload] ?? dict.calm
  return { riskLevel: (SESSIONS[workload] ?? SESSIONS.calm).risk, ...a }
}
