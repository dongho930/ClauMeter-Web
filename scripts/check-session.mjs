// The demo's pace advice is written out in twelve languages and quotes each
// workload's end-of-window figure by number ("you land near 86%"). That makes the
// session script's totals load-bearing: edit a line's cost in session.js and the
// advice silently starts lying.
//
// This is the guard. Run it after touching src/demo/session.js:
//
//   node scripts/check-session.mjs
//
// If a total has to change, change PROJECTED in simulate.js and all thirty-six
// advice strings that mention it, in the same commit.
//
// It also checks that the transcript keeps time with itself: see the pacing
// section at the bottom.
import { pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const S = await import(pathToFileURL(resolve(ROOT, 'src/demo/session.js')).href)
const { PROJECTED_FOR_TEST: PROJECTED } = await import(
  pathToFileURL(resolve(ROOT, 'src/demo/simulate.js')).href
)

let bad = 0
for (const workload of S.WORKLOADS) {
  const total = Math.round(S.sessionTotal(workload) * 10) / 10
  const quoted = PROJECTED[workload].fiveHour
  const turns = S.SESSIONS[workload].turns.map((_t, i) => Math.round(S.turnCost(workload, i) * 10) / 10)
  const ok = total === quoted
  if (!ok) bad++
  console.log(
    `${workload.padEnd(8)} base ${String(S.SESSIONS[workload].base).padStart(3)}` +
      ` + turns ${JSON.stringify(turns).padEnd(30)} = ${String(total).padStart(5)}` +
      `  advice quotes ${String(quoted).padStart(5)}  ${ok ? 'ok' : '<-- MISMATCH'}`
  )
}

// Where the weekly bar stops is quoted the same way. Its start is worked backwards
// from it at a fixed rate, so this is the only weekly reading to pin. (The weekly
// *projection* runs to Saturday's reset, days after the session, so it is not.)
for (const workload of S.WORKLOADS) {
  const end = S.SESSIONS[workload].weeklyEnd
  const quoted = PROJECTED[workload].weeklyNow
  if (end !== quoted) {
    bad++
    console.log(`${workload}: weekly ends at ${end} but the advice quotes ${quoted}`)
  }
}


// Pacing is the other half of that file, and the other thing a careless edit
// quietly breaks. A line's hold is how long that step is the one being worked
// on, and two things about it are load-bearing:
//
//   - nothing waits longer than MAX_HOLD, past which a terminal stops reading as
//     busy and starts reading as frozen
//   - a ✓ line that quotes a duration is reporting the step in front of it, so
//     "✓ build passed (4.0s)" has to follow a 4000ms hold. Those two once drifted
//     apart by a factor of thirty.
const MIN_HOLD = 300
const MAX_HOLD = 6000

console.log('')
for (const workload of S.WORKLOADS) {
  S.SESSIONS[workload].turns.forEach((turn, i) => {
    const held = Math.round(S.turnHold(workload, i) / 100) / 10
    console.log(
      `${workload.padEnd(8)} ${turn.prompt.padEnd(10)} plays for ${String(held).padStart(5)}s`
    )
    turn.lines.forEach(([, text, , hold], j) => {
      if (hold < MIN_HOLD || hold > MAX_HOLD) {
        bad++
        console.log(`  ${text.trim()} holds ${hold}ms, outside ${MIN_HOLD}-${MAX_HOLD}ms`)
      }
      const quoted = /\((\d+\.\d)s\)/.exec(text)
      if (!quoted) return
      const ran = j > 0 ? turn.lines[j - 1][3] / 1000 : 0
      if (Number(quoted[1]) !== ran) {
        bad++
        console.log(`  ${text.trim()} quotes ${quoted[1]}s, but the step before it took ${ran}s`)
      }
    })
  })
}

// Each workload is meant to hold one state on both limits for as long as it plays
// (ARRIVAL / SCENE_END in simulate.js). The pace line moves with the clock and the
// readings move with the script, which run at different rates — the clock at the
// visitor's chosen speed, the script always in real time — so whether a state
// holds depends on the speed. This replays each workload the way Demo.jsx and
// useSession.js step it, at every speed, in both site languages (a longer prompt
// takes longer to type, which delays the readings), and flags the first tick
// where either light shows something other than the workload's own state.
const SIM = await import(pathToFileURL(resolve(ROOT, 'src/demo/simulate.js')).href)
const siteTrees = []
for (const f of ['en.js', 'ko.js']) {
  const mod = await import(pathToFileURL(resolve(ROOT, 'src/i18n', f)).href)
  siteTrees.push([f, Object.values(mod).find((v) => v?.demo?.prompts)])
}

// Mirrors of the constants the replay depends on. If either file changes these,
// change them here too.
const SESSION_TICK = 50 // useSession TICK_MS
const TYPE_MS = 45
const THINK_MS = 900
const BETWEEN_TURNS_MS = 8000
const clockTick = (speed) => Math.max(200, Math.round(1000 / speed)) // Demo.jsx

function replay(workload, speed, prompts) {
  const turns = S.SESSIONS[workload].turns
  const s = { played: 0, turn: null, nextTurn: 0, typeAt: 0, pending: '', lineAt: 0, wait: 0 }
  const expected = S.SESSIONS[workload].risk
  const tick = clockTick(speed)
  let elapsed = SIM.arrivalAt(workload)
  const end = SIM.sceneEndAt(workload)

  for (let now = 0; ; now += SESSION_TICK) {
    // The clock, on its own interval.
    if (now > 0 && now % tick === 0) {
      if (elapsed + tick * speed >= end) return null
      elapsed += tick * speed
    }

    const spent = { window: s.played, week: s.played }
    const u = SIM.usageAt(workload, spent, elapsed)
    if (u.fiveHourRisk !== expected || u.weeklyRisk !== expected) {
      const at = Math.round((elapsed / SIM.FIVE_HOUR_MS) * 1000) / 10
      return `${(now / 1000).toFixed(1)}s in, ${at}% into the window: 5h ${u.fiveHourPct}% -> ${u.fiveHourRisk}, week ${u.weeklyPct}% -> ${u.weeklyRisk}`
    }
    if (SIM.blockedBy(workload, spent)) continue

    // One session tick, as useSession steps it.
    if (s.wait > 0) {
      s.wait -= SESSION_TICK
      if (s.wait > 0) continue
    }
    if (!s.turn) {
      if (s.nextTurn >= turns.length) continue
      s.turn = turns[s.nextTurn++]
      s.pending = prompts[s.turn.prompt]
      s.typeAt = 0
      s.lineAt = 0
    }
    if (s.typeAt < s.pending.length) {
      s.typeAt = Math.min(s.pending.length, s.typeAt + Math.max(1, Math.round(SESSION_TICK / TYPE_MS)))
      if (s.typeAt >= s.pending.length) s.wait = THINK_MS
      continue
    }
    const line = s.turn.lines[s.lineAt]
    if (line) {
      s.played = Math.round((s.played + line[2]) * 10) / 10
      s.lineAt += 1
      s.wait = line[3]
      continue
    }
    s.turn = null
    s.wait = BETWEEN_TURNS_MS
  }
}

console.log('')
for (const workload of S.WORKLOADS) {
  for (const speed of [1, 60, 300]) {
    for (const [file, tree] of siteTrees) {
      const broke = replay(workload, speed, tree.demo.prompts)
      if (broke) {
        bad++
        console.log(`${workload.padEnd(8)} ${String(speed).padStart(3)}x ${file}: leaves "${S.SESSIONS[workload].risk}" ${broke}`)
      }
    }
  }
  console.log(`${workload.padEnd(8)} holds "${S.SESSIONS[workload].risk}" on both limits at 1x, 60x and 300x`)
}

console.log(bad ? `\n${bad} mismatch(es)` : '\nTotals agree with the advice in all twelve languages, and every hold keeps time.')
process.exit(bad ? 1 : 0)
