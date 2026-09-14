// The Claude Code session the demo's terminal plays out, and the thing that
// moves the widget's bars.
//
// Usage used to come from a curve indexed by time, which meant the bars rose
// because the clock moved. Here it rises because work happened: every line of
// output carries a cost in limit percentage points, and the widget's reading is
// the sum of the lines that have played. That is the whole point of the terminal
// being there — cause and effect, rather than an animation.
//
// Nothing is executed and nothing is sent anywhere. The transcript is written out
// in advance; the costs are plausible numbers, not measured ones.
//
// One hard constraint: each workload's total must stay at the figure the pace
// advice quotes (46 / 86 / 106, weekly bar 34 / 61 / 93), because that advice is
// written out in twelve languages and none of it should have to change when this
// script does. `node scripts/check-session.mjs` says so out loud if a total
// drifts.
//
// The danger total is over 100 on purpose: that workload is the one that runs
// out, and a window only reads as running out if its projection passes the limit.
// See PROJECTED in simulate.js.
//
// Costs decide how fast the bars climb:
//   - a whole prompt costs about seven points, so no single ask swallows a
//     seventh of the window
//   - a line costs one to two, so the bar climbs in steps rather than lurches
//   - `base` is where the window already stood when the visitor arrived, and it
//     carries most of each workload's reading: what they watch is the last
//     stretch of a session, not the whole thing
//
// Holds decide how fast the session runs, and they are the other half of making
// a heavy prompt feel heavy — before, every line took the same nine-tenths of a
// second, so a project-wide rename went by as quickly as a grep:
//   - a lookup (Grep, Read, git diff) is under a second, because it is
//   - an Edit is a couple of seconds, because the model is writing code
//   - a Write of a whole new file is longer still
//   - a test run or a build takes as long as its own ✓ line says it took. Every
//     claimed duration below is the wait that precedes it; they used to disagree
//     by a factor of thirty ("build passed (28.4s)" went by in 0.8s)
//   - nothing waits longer than six seconds, past which a terminal reads as
//     frozen rather than busy

// A line is [kind, text, cost, holdMs]:
//   kind     which colour the terminal paints it (see demo.css)
//   text     printed verbatim — Claude Code's tool lines are English wherever
//            you run it, so only the human's prompts are translated
//   cost     limit percentage points this line consumes
//   holdMs   how long this line is the one being worked on. The line is printed
//            first and the wait follows it, so a long hold reads as that step
//            taking its time rather than as a gap before it.
//
// Tool names, paths and counts are the shapes Claude Code actually prints.
export const SESSIONS = {
  // A light afternoon: small asks, quick answers, the window never in danger.
  calm: {
    risk: 'safe',
    base: 24,
    weeklyEnd: 34,
    turns: [
      {
        prompt: 'tests',
        lines: [
          ['run', '● Read  src/billing/charge.test.ts (96 lines)', 1.3, 900],
          ['run', '● Bash  npm test -- billing', 1.9, 3200],
          ['ok', '  ✓ 24 passed  (3.2s)', 0.4, 400],
        ],
      },
      {
        prompt: 'findRetry',
        lines: [
          ['run', '● Grep  "retry" (7 files)', 1.6, 900],
          ['run', '● Read  src/webhook/retry.ts (140 lines)', 1.8, 900],
          ['run', '● Read  src/webhook/queue.ts (88 lines)', 1.5, 800],
        ],
      },
      {
        prompt: 'extract',
        lines: [
          ['run', '● Read  src/webhook/retry.ts (140 lines)', 1.4, 900],
          ['run', '● Edit  src/webhook/retry.ts', 1.9, 2800],
          ['run', '● Bash  npm test -- webhook', 3.0, 3000],
          ['ok', '  ✓ 11 passed  (3.0s)', 0.4, 400],
        ],
      },
      {
        prompt: 'tidy',
        lines: [
          ['run', '● Edit  src/webhook/retry.ts', 1.8, 2800],
          ['run', '● Edit  src/billing/charge.ts', 1.7, 2600],
          ['run', '● Bash  npm run lint', 2.4, 2600],
          ['ok', '  ✓ lint clean', 0.9, 400],
        ],
      },
    ],
  },

  // A real refactor. Ends near the limit with little room left over.
  caution: {
    risk: 'caution',
    // 60 rather than 58: the weekly start works out at 58 for this workload, and
    // two identical readings side by side read as a bug, not a coincidence.
    base: 60,
    weeklyEnd: 61,
    turns: [
      {
        prompt: 'refactor',
        lines: [
          ['run', '● Read  src/billing/charge.ts (412 lines)', 1.2, 1100],
          ['run', '● Read  src/billing/invoice.ts (268 lines)', 1.0, 900],
          ['run', '● Edit  src/billing/charge.ts', 1.5, 2900],
          ['run', '● Edit  src/billing/invoice.ts', 1.2, 2600],
          ['run', '● Bash  npm test -- billing', 1.3, 3200],
          ['ok', '  ✓ 24 passed  (3.2s)', 0.3, 400],
        ],
      },
      {
        prompt: 'types',
        lines: [
          ['run', '● Bash  npx tsc --noEmit', 1.1, 3000],
          ['run', '● Edit  src/billing/invoice.ts', 1.5, 2800],
          ['run', '● Edit  src/api/checkout.ts', 1.4, 2600],
          ['run', '● Edit  src/jobs/settle.ts', 1.3, 2700],
          ['run', '● Bash  npx tsc --noEmit', 0.9, 2800],
          ['ok', '  ✓ 0 errors', 0.3, 400],
        ],
      },
      {
        prompt: 'edgeTests',
        lines: [
          ['run', '● Read  src/billing/charge.ts (438 lines)', 1.0, 1100],
          ['run', '● Write src/billing/charge.test.ts', 2.1, 4500],
          ['run', '● Edit  src/billing/charge.test.ts', 1.7, 2800],
          ['run', '● Bash  npm test -- billing', 1.4, 3600],
          ['ok', '  ✓ 31 passed  (3.6s)', 0.3, 400],
        ],
      },
      {
        prompt: 'review',
        lines: [
          ['run', '● Bash  git diff --stat', 0.7, 700],
          ['run', '● Read  src/billing/charge.ts (438 lines)', 1.3, 1100],
          ['run', '● Read  src/billing/invoice.ts (281 lines)', 1.1, 900],
          ['run', '● Edit  src/billing/charge.ts', 1.8, 2900],
          ['run', '● Bash  npm test -- billing', 1.3, 3500],
          ['ok', '  ✓ 31 passed  (3.5s)', 0.3, 400],
        ],
      },
    ],
  },

  // A marathon that walks the window past its edge. The visitor arrives with it
  // already amber and the week nearly spent, and playing the script to the end
  // takes the 5-hour limit to 100% — which is the point: this is the only
  // workload where the terminal actually stops (see blockedBy).
  danger: {
    risk: 'danger',
    base: 85,
    weeklyEnd: 93,
    turns: [
      {
        prompt: 'rename',
        lines: [
          ['run', '● Grep  "Charge" (48 files)', 1.2, 900],
          ['run', '● Edit  src/billing/charge.ts', 1.3, 2800],
          ['run', '● Edit  src/api/checkout.ts', 1.2, 2700],
          ['run', '● Edit  src/webhook/retry.ts', 1.1, 2600],
          ['run', '● Edit  src/jobs/settle.ts', 1.2, 2800],
          ['run', '● Bash  npx tsc --noEmit', 1.0, 3000],
        ],
      },
      {
        prompt: 'buildAll',
        lines: [
          ['run', '● Bash  npm run build', 1.3, 6000],
          ['run', '● Edit  src/billing/invoice.ts', 1.4, 2800],
          ['run', '● Edit  src/jobs/settle.ts', 1.3, 2700],
          ['run', '● Edit  src/api/checkout.ts', 1.2, 2600],
          // The second build is incremental, which is why it is the quicker one.
          ['run', '● Bash  npm run build', 1.2, 4000],
          ['ok', '  ✓ build passed  (4.0s)', 0.6, 400],
        ],
      },
      {
        prompt: 'fullSuite',
        lines: [
          ['run', '● Bash  npm test', 1.4, 6000],
          ['run', '● Edit  src/billing/charge.test.ts', 1.3, 2800],
          ['run', '● Edit  src/webhook/retry.test.ts', 1.2, 2700],
          ['run', '● Bash  npm run lint', 1.0, 2600],
          ['run', '● Bash  npm test', 1.4, 6000],
          ['ok', '  ✓ 186 passed  (6.0s)', 0.7, 400],
        ],
      },
    ],
  },
}

export const WORKLOADS = Object.keys(SESSIONS)

// A point of 5-hour usage costs a tenth of a point of the week, so it takes
// about ten full windows to exhaust the weekly limit — roughly where a heavy week
// of Claude Code lands, given a week holds thirty-odd such windows.
//
// This used to be derived per workload from its weekly endpoints, which worked
// out at a fifth to a third: three to five windows would have finished the week,
// and the weekly bar jumped several points per prompt. A weekly limit does not
// move like that. The endpoints are now reached *because* of this rate rather
// than the other way round.
export const WEEKLY_PER_POINT = 0.1

// What one prompt costs in full, so a chip can say how heavy it is before the
// visitor commits to it.
export function turnCost(workload, turnIndex) {
  const turn = SESSIONS[workload].turns[turnIndex]
  return turn.lines.reduce((n, l) => n + l[2], 0)
}

// How long one prompt takes to play out, before the typing in front of it.
export function turnHold(workload, turnIndex) {
  const turn = SESSIONS[workload].turns[turnIndex]
  return turn.lines.reduce((n, l) => n + l[3], 0)
}

// What the whole scripted session spends, on top of where the window already was.
export function sessionSpend(workload) {
  return SESSIONS[workload].turns.reduce((n, _t, i) => n + turnCost(workload, i), 0)
}

// Where the workload lands if its script is played to the end. Kept equal to the
// projections the pace advice quotes — see the note at the top of this file.
export function sessionTotal(workload) {
  return SESSIONS[workload].base + sessionSpend(workload)
}

// Where the weekly bar starts, worked backwards from where the advice says it
// ends so that the rate above is the only thing deciding how fast it climbs.
export function weeklyStart(workload) {
  const end = SESSIONS[workload].weeklyEnd
  return Math.round((end - sessionSpend(workload) * WEEKLY_PER_POINT) * 10) / 10
}

// A prompt the visitor typed themselves.
//
// There is no honest way to answer arbitrary input with invented tool calls — a
// fabricated "● Edit src/…" for a request nobody ran is the one thing in this
// demo that would be a lie. So a typed prompt gets a plain answer that says what
// it is, and still costs something, because that is the part being demonstrated:
// asking anything at all moves the bar.
//
// The cost grows a little with the length of the prompt, which is the direction
// real token usage moves, and is capped so nobody can paste their way to 100%.
export function adHocTurn(text, replyLine) {
  const cost = Math.round((1.2 + Math.min(1.6, text.length / 60)) * 10) / 10
  return { typed: text, lines: [['out', replyLine, cost, 1400]] }
}
