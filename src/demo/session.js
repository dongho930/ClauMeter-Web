// The Claude Code session the demo's terminal plays out, and the thing that now
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
// advice quotes (46 / 86 / 98, weekly 34 / 61 / 93), because that advice is
// written out in twelve languages and none of it should have to change when this
// script does. `node scripts/check-session.mjs` fails the build of your patience
// if a total drifts.

// A line is [kind, text, cost, delayMs]:
//   kind     which colour the terminal paints it (see demo.css)
//   text     printed verbatim — Claude Code's tool lines are English wherever
//            you run it, so only the human's prompts are translated
//   cost     limit percentage points this line consumes
//   delayMs  how long after the previous line it appears
//
// Tool names, paths and counts are the shapes Claude Code actually prints.
export const SESSIONS = {
  // A light afternoon: small asks, quick answers, the window never in danger.
  calm: {
    risk: 'safe',
    // Where the window already stood when the visitor arrived — the transcript
    // they see is the tail of a session, not its beginning.
    base: 24,
    weekly: [28, 34],
    turns: [
      {
        prompt: 'tests',
        lines: [
          ['run', '● Bash  npm test -- billing', 3.2, 800],
          ['ok', '  ✓ 24 passed  (3.1s)', 0.4, 900],
        ],
      },
      {
        prompt: 'findRetry',
        lines: [
          ['run', '● Grep  "retry" (7 files)', 2.1, 700],
          ['run', '● Read  src/webhook/retry.ts (140 lines)', 2.8, 850],
        ],
      },
      {
        prompt: 'extract',
        lines: [
          ['run', '● Edit  src/webhook/retry.ts', 3.4, 900],
          ['run', '● Bash  npm test -- webhook', 2.9, 800],
          ['ok', '  ✓ 11 passed  (1.8s)', 0.4, 850],
        ],
      },
      {
        prompt: 'tidy',
        lines: [
          ['run', '● Edit  src/webhook/retry.ts', 3.1, 800],
          ['run', '● Edit  src/billing/charge.ts', 2.8, 750],
          ['ok', '  ✓ lint clean', 0.9, 800],
        ],
      },
    ],
  },

  // A real refactor. Ends near the limit with little room left over.
  caution: {
    risk: 'caution',
    base: 41,
    weekly: [52, 61],
    turns: [
      {
        prompt: 'refactor',
        lines: [
          ['run', '● Read  src/billing/charge.ts (412 lines)', 3.4, 800],
          ['run', '● Read  src/billing/invoice.ts (268 lines)', 2.6, 700],
          ['run', '● Edit  src/billing/charge.ts', 4.1, 950],
          ['run', '● Bash  npm test -- billing', 3.3, 900],
          ['ok', '  ✓ 24 passed  (3.1s)', 0.4, 850],
        ],
      },
      {
        prompt: 'types',
        lines: [
          ['run', '● Bash  npx tsc --noEmit', 2.8, 850],
          ['run', '● Edit  src/billing/invoice.ts', 3.6, 900],
          ['run', '● Edit  src/api/checkout.ts', 3.2, 850],
          ['ok', '  ✓ 0 errors', 0.6, 800],
        ],
      },
      {
        prompt: 'edgeTests',
        lines: [
          ['run', '● Read  src/billing/charge.ts (438 lines)', 2.2, 750],
          ['run', '● Write src/billing/charge.test.ts', 6.2, 1050],
          ['run', '● Bash  npm test -- billing', 3.1, 900],
          ['ok', '  ✓ 31 passed  (4.0s)', 0.5, 850],
        ],
      },
      {
        prompt: 'review',
        lines: [
          ['run', '● Bash  git diff --stat', 1.2, 700],
          ['run', '● Read  src/billing/charge.ts (438 lines)', 3.6, 850],
          ['run', '● Edit  src/billing/charge.ts', 3.5, 900],
          ['ok', '  ✓ 31 passed  (4.1s)', 0.7, 850],
        ],
      },
    ],
  },

  // A marathon that walks the window up to its edge.
  danger: {
    risk: 'danger',
    base: 58,
    weekly: [79, 93],
    turns: [
      {
        prompt: 'rename',
        lines: [
          ['run', '● Grep  "Charge" (48 files)', 3.1, 800],
          ['run', '● Edit  src/billing/charge.ts', 4.2, 950],
          ['run', '● Edit  src/api/checkout.ts', 3.8, 900],
          ['run', '● Edit  src/webhook/retry.ts', 3.4, 900],
        ],
      },
      {
        prompt: 'buildAll',
        lines: [
          ['run', '● Bash  npm run build', 3.6, 900],
          ['run', '● Edit  src/billing/invoice.ts', 4.1, 950],
          ['run', '● Edit  src/jobs/settle.ts', 3.9, 900],
          ['ok', '  ✓ build passed  (28.4s)', 0.8, 900],
        ],
      },
      {
        prompt: 'fullSuite',
        lines: [
          ['run', '● Bash  npm test', 4.3, 1000],
          ['run', '● Edit  src/billing/charge.test.ts', 3.7, 900],
          ['run', '● Bash  npm test', 4.2, 1000],
          ['ok', '  ✓ 186 passed  (22.7s)', 0.9, 950],
        ],
      },
    ],
  },
}

export const WORKLOADS = Object.keys(SESSIONS)

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
  return { typed: text, lines: [['out', replyLine, cost, 900]] }
}

// What one prompt costs in full, so a chip can say how heavy it is before the
// visitor commits to it.
export function turnCost(workload, turnIndex) {
  const turn = SESSIONS[workload].turns[turnIndex]
  return turn.lines.reduce((n, l) => n + l[2], 0)
}

// Where the workload lands if its script is played to the end. Kept equal to the
// projections the pace advice quotes — see the note at the top of this file.
export function sessionTotal(workload) {
  const s = SESSIONS[workload]
  return s.base + s.turns.reduce((n, _t, i) => n + turnCost(workload, i), 0)
}

// How far through the scripted work we are, 0..1 — what the weekly bar tracks.
export function playedFraction(workload, playedCost) {
  const s = SESSIONS[workload]
  const all = sessionTotal(workload) - s.base
  return all === 0 ? 0 : Math.min(1, playedCost / all)
}
