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

// The weekly endpoints are quoted the same way.
for (const workload of S.WORKLOADS) {
  const [, end] = S.SESSIONS[workload].weekly
  const quoted = PROJECTED[workload].weekly
  if (end !== quoted) {
    bad++
    console.log(`${workload}: weekly ends at ${end} but the advice quotes ${quoted}`)
  }
}

console.log(bad ? `\n${bad} mismatch(es)` : '\nTotals agree with the advice in all twelve languages.')
process.exit(bad ? 1 : 0)
