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

// The weekly endpoints are quoted the same way. Their starts are worked backwards
// from them at a fixed rate, so this is the only weekly figure to pin.
for (const workload of S.WORKLOADS) {
  const end = S.SESSIONS[workload].weeklyEnd
  const quoted = PROJECTED[workload].weekly
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

console.log(bad ? `\n${bad} mismatch(es)` : '\nTotals agree with the advice in all twelve languages, and every hold keeps time.')
process.exit(bad ? 1 : 0)
