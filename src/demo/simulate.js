// The demo's stand-in for the app's main process: it produces the same payloads
// main.js sends over IPC, so the real renderer code can't tell the difference.
//
// Nothing here is measured. The app reads actual limit percentages out of Claude
// Code's statusLine hook, which a browser has none of. The readings come instead
// from the session playing out in the demo's terminal: session.js prices every
// line of that transcript, and the figure below is what those lines add up to.
// So the bars move because work happened, not because a clock did.

import { SESSIONS, playedFraction, sessionTotal } from './session.js'

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
  // Deliberately just under 100: the app's headroom line reads "up to +{x}% more",
  // so a projection over the limit would render a negative headroom.
  danger: { fiveHour: 98, weekly: 93 },
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

// The 5-hour reading: what the window already stood at when the visitor arrived,
// plus everything the terminal has run since. Capped at 100 the way the widget
// caps its own bar.
export function usedPct(workload, playedCost) {
  return Math.min(100, (SESSIONS[workload] ?? SESSIONS.calm).base + playedCost)
}

// The weekly reading tracks progress through the session rather than the clock:
// a week's worth of limit does not tick away on its own, it is spent.
function weeklyPct(workload, playedCost) {
  const [from, to] = (SESSIONS[workload] ?? SESSIONS.calm).weekly
  return Math.min(100, from + (to - from) * playedFraction(workload, playedCost))
}

// One `usage-update` payload, shaped exactly like main.js's computePercents().
// `playedCost` is what the terminal has spent; `elapsedMs` only moves the clock
// and the countdowns, which is the one thing time is still responsible for.
export function usageAt(workload, playedCost, elapsedMs) {
  return {
    fiveHourPct: usedPct(workload, playedCost),
    fiveHourHasData: true,
    fiveHourPending: false,
    weeklyPct: weeklyPct(workload, playedCost),
    weeklyHasData: true,
    fiveHourResetInMs: Math.max(0, FIVE_HOUR_MS - elapsedMs),
    weeklyResetInMs: Math.max(0, WEEK_MS - WEEK_ELAPSED_MS - elapsedMs),
    updatedAt: windowStart() + elapsedMs,
  }
}

function formatHM(ms) {
  if (ms == null) return '-'
  const total = Math.max(0, Math.round(ms / 60000))
  const d = Math.floor(total / 1440)
  const h = Math.floor((total % 1440) / 60)
  const m = total % 60
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`
}

// The stats half of `get-usage-advice`, shaped like main.js's buildStats().
export function statsAt(workload, playedCost, elapsedMs) {
  const p = usageAt(workload, playedCost, elapsedMs)
  const ready = elapsedMs / FIVE_HOUR_MS >= PROJECTION_FROM
  const proj = PROJECTED[workload] ?? PROJECTED.calm
  const round1 = (x) => Math.round(x * 10) / 10

  return {
    fiveHourPct: round1(p.fiveHourPct),
    fiveHourHasData: true,
    fiveHourElapsed: formatHM(elapsedMs),
    fiveHourRemaining: formatHM(p.fiveHourResetInMs),
    fiveHourProjectedPct: ready ? proj.fiveHour : null,
    fiveHourSafePct: ready ? round1(100 - proj.fiveHour) : null,
    fiveHourModelBased: true,
    weeklyPct: round1(p.weeklyPct),
    weeklyHasData: true,
    weeklyElapsed: formatHM(WEEK_ELAPSED_MS + elapsedMs),
    weeklyRemaining: formatHM(p.weeklyResetInMs),
    weeklyProjectedPct: proj.weekly,
    weeklySafePct: round1(100 - proj.weekly),
    weeklyModelBased: true,
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
        'This window is on course to run out. At the current pace you close it at about 98%, and the weekly limit is close behind at 93%.',
      fiveHour:
        'Stop adding long sessions now. Short, targeted prompts until the 14:52 reset, or you will be locked out of the last stretch.',
      weekly:
        'The weekly limit is the real constraint this time. Hold back anything that can wait until Saturday.',
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
        '이 구간은 한도에 거의 닿는 흐름이에요. 지금 페이스면 98% 근처에서 마감되고, 주간 한도도 93%로 바로 뒤에 붙어 있어요.',
      fiveHour:
        '긴 작업을 더 넣는 건 지금 멈추는 게 좋아요. 14:52 초기화까지는 짧고 목적이 분명한 요청만 쓰지 않으면 마지막 구간에서 막혀요.',
      weekly: '이번엔 주간 한도가 실제 제약이에요. 토요일까지 미룰 수 있는 일은 미뤄두세요.',
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
        'Esta ventana va camino de agotarse. Al ritmo actual la cierras en torno al 98%, y el límite semanal viene justo detrás con un 93%.',
      fiveHour:
        'Deja de añadir sesiones largas ahora. Solo peticiones cortas y concretas hasta el reinicio de las 14:52, o te quedarás sin margen en el último tramo.',
      weekly: 'Esta vez el límite semanal es la restricción real. Deja para el sábado todo lo que pueda esperar.',
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
        "Cette fenêtre est en route pour être épuisée. Au rythme actuel, vous la terminez autour de 98 %, et le plafond hebdomadaire suit de près à 93 %.",
      fiveHour:
        "Arrêtez les longues sessions maintenant. Requêtes courtes et ciblées jusqu'à la réinitialisation de 14:52, sinon la fin de la fenêtre sera bloquée.",
      weekly: "Cette fois, c'est le plafond hebdomadaire qui contraint vraiment. Reportez à samedi tout ce qui peut attendre.",
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
        'Dieses Fenster läuft auf sein Limit zu. Im aktuellen Tempo schließen Sie es bei etwa 98%, und das Wochenlimit folgt mit 93% direkt dahinter.',
      fiveHour:
        'Hören Sie jetzt mit langen Sitzungen auf. Bis zum Reset um 14:52 nur kurze, gezielte Anfragen — sonst stehen Sie auf der letzten Strecke ohne Kontingent da.',
      weekly: 'Diesmal ist das Wochenlimit die eigentliche Grenze. Halten Sie alles zurück, was bis Samstag warten kann.',
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
        'Esta janela está a caminho de esgotar. No ritmo atual você a fecha em torno de 98%, e o limite semanal vem logo atrás, em 93%.',
      fiveHour:
        'Pare de adicionar sessões longas agora. Só pedidos curtos e objetivos até a reinicialização das 14:52, ou você ficará sem margem no trecho final.',
      weekly: 'Desta vez o limite semanal é a restrição real. Deixe para sábado tudo o que puder esperar.',
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
        'この区間は上限に達しそうな流れです。今のペースでは98%前後で終わり、週間上限も93%とすぐ後ろに迫っています。',
      fiveHour:
        '長い作業を足すのは今やめたほうがよいです。14:52のリセットまでは短く目的の絞れた依頼だけにしないと、最後の区間で止まります。',
      weekly: '今回は週間上限が本当の制約です。土曜日まで待てるものは後回しにしてください。',
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
        '这个周期正朝着用尽的方向走。按当前节奏会在 98% 左右结束，周额度也紧随其后，已达 93%。',
      fiveHour:
        '现在就别再安排长时间会话了。在 14:52 重置前只用简短、目标明确的提问，否则最后一段会被卡住。',
      weekly: '这次真正的约束是周额度。凡是能等到周六的，先放一放。',
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
        'Это окно идёт к исчерпанию. При текущем темпе вы закроете его около 98%, а недельный лимит совсем рядом — 93%.',
      fiveHour:
        'Прекратите добавлять длинные сеансы. До сброса в 14:52 только короткие точные запросы, иначе на последнем отрезке вы останетесь без лимита.',
      weekly: 'На этот раз реальное ограничение — недельный лимит. Отложите до субботы всё, что может подождать.',
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
        "Questa finestra è avviata a esaurirsi. Con il ritmo attuale la chiudi intorno al 98%, e il limite settimanale segue da vicino al 93%.",
      fiveHour:
        "Smetti ora di aggiungere sessioni lunghe. Solo richieste brevi e mirate fino al reset delle 14:52, altrimenti resterai bloccato nell'ultimo tratto.",
      weekly: "Questa volta il vincolo vero è il limite settimanale. Rimanda a sabato tutto ciò che può attendere.",
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
        'Dit venster gaat richting uitputting. In het huidige tempo sluit je het rond 98% af, en de weeklimiet zit er met 93% kort achter.',
      fiveHour:
        'Stop nu met lange sessies. Tot de reset van 14:52 alleen korte, gerichte vragen, anders zit je op het laatste stuk zonder ruimte.',
      weekly: 'Deze keer is de weeklimiet de echte beperking. Stel alles uit wat tot zaterdag kan wachten.',
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
        'To okno zmierza do wyczerpania. W obecnym tempie zamkniesz je około 98%, a limit tygodniowy jest zaraz za nim, na 93%.',
      fiveHour:
        'Przestań teraz dodawać długie sesje. Do resetu o 14:52 tylko krótkie, konkretne zapytania, inaczej na ostatnim odcinku zostaniesz bez limitu.',
      weekly: 'Tym razem prawdziwym ograniczeniem jest limit tygodniowy. Odłóż wszystko, co może poczekać do soboty.',
    },
  },
}

export function adviceAt(workload, lang) {
  const dict = ADVICE[lang] ?? ADVICE.en
  const a = dict[workload] ?? dict.calm
  return { riskLevel: (SESSIONS[workload] ?? SESSIONS.calm).risk, ...a }
}
