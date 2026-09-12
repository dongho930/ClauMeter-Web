import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SESSIONS, adHocTurn } from './session.js'

// Plays a session script out in the terminal: types the prompt a character at a
// time, streams the tool lines behind it, and reports what the work has cost so
// far so the widget can be told about it.
//
// The whole machine lives in one ref and is stepped by a single interval. React
// state is only what the terminal has to draw, so a run of the script is a few
// renders a second rather than one per tick.

const TICK_MS = 50
const TYPE_MS = 30 // per character, at 1x
const THINK_MS = 450 // between the prompt landing and the first tool line
const BETWEEN_TURNS_MS = 4200 // how long the session rests before asking again
const MAX_LINES = 60 // the transcript is a window, not a log file

// A blank machine, at the top of a fresh 5-hour window.
function blank(workload) {
  return {
    workload,
    log: [],
    played: 0,
    turn: null, // the turn being performed
    lineAt: 0, // how many of its lines have printed
    typed: '', // the prompt text so far, while it is being typed
    typeAt: 0,
    pending: '', // the full prompt being typed
    wait: 0, // ms still to wait before the next step
    nextTurn: 0, // which scripted turn autoplay reaches for next
    queued: null, // a turn the visitor asked for, to run instead
    done: false, // the script has been played to the end
  }
}

let seq = 0

export function useSession({ workload, playing, speed, promptText, adHocReply, reduced }) {
  const m = useRef(blank(workload))
  // What the terminal draws. Kept as one object so a tick that changes nothing
  // visible costs no render.
  const [view, setView] = useState(() => ({ log: [], typed: null, played: 0, busy: false, done: false }))

  const publish = useCallback(() => {
    const s = m.current
    setView({
      log: s.log,
      // Non-null only while a prompt is actually being typed.
      typed: s.turn && s.typed !== null ? s.typed : null,
      played: s.played,
      busy: !!s.turn,
      done: s.done,
    })
  }, [])

  const reset = useCallback(
    (nextWorkload = m.current.workload) => {
      m.current = blank(nextWorkload)
      publish()
    },
    [publish]
  )

  // Switching workload starts a new session — the old transcript belongs to it.
  useEffect(() => {
    reset(workload)
  }, [workload, reset])

  const begin = useCallback((turn, typedText) => {
    const s = m.current
    s.turn = turn
    s.typed = ''
    s.typeAt = 0
    s.lineAt = 0
    s.wait = 0
    s.pending = typedText
  }, [])

  // A prompt the visitor picked or wrote. It jumps the queue: the session is
  // theirs to drive.
  const send = useCallback(
    (turnIndex, typedText) => {
      const s = m.current
      const turn =
        turnIndex == null
          ? adHocTurn(typedText, adHocReply)
          : SESSIONS[s.workload].turns[turnIndex]
      const text = turnIndex == null ? typedText : promptText(turn.prompt)
      if (s.turn) {
        s.queued = { turn, text }
      } else {
        begin(turn, text)
        publish()
      }
    },
    [adHocReply, promptText, begin, publish]
  )

  const promptRef = useRef(promptText)
  promptRef.current = promptText

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const s = m.current
      const step = TICK_MS * speed

      if (s.wait > 0) {
        s.wait -= step
        if (s.wait > 0) return
      }

      // Nothing running: take the visitor's request, else the next scripted turn.
      if (!s.turn) {
        if (s.queued) {
          const { turn, text } = s.queued
          s.queued = null
          begin(turn, text)
        } else if (!s.done) {
          const turns = SESSIONS[s.workload].turns
          const turn = turns[s.nextTurn]
          s.nextTurn += 1
          if (s.nextTurn >= turns.length) s.done = true
          begin(turn, promptRef.current(turn.prompt))
        } else {
          return
        }
      }

      // Type the prompt, then print it as one line.
      if (s.typeAt < s.pending.length) {
        if (reduced) {
          s.typeAt = s.pending.length
        } else {
          const chars = Math.max(1, Math.round(step / TYPE_MS))
          s.typeAt = Math.min(s.pending.length, s.typeAt + chars)
        }
        s.typed = s.pending.slice(0, s.typeAt)
        if (s.typeAt >= s.pending.length) {
          // The prompt joins the transcript, and the line being typed stops
          // existing — otherwise the same prompt sits on screen twice for the
          // rest of the turn, once as scrollback and once as a live line.
          s.log = [...s.log, { id: ++seq, kind: 'in', text: `> ${s.pending}` }].slice(-MAX_LINES)
          s.typed = null
          s.wait = THINK_MS
        }
        publish()
        return
      }

      // Stream one output line, charging what it costs.
      const line = s.turn.lines[s.lineAt]
      if (line) {
        const [kind, text, cost, delay] = line
        s.log = [...s.log, { id: ++seq, kind, text }].slice(-MAX_LINES)
        s.played = Math.round((s.played + cost) * 10) / 10
        s.lineAt += 1
        s.wait = delay
        publish()
        return
      }

      // Turn finished.
      s.turn = null
      s.typed = ''
      s.pending = ''
      s.wait = BETWEEN_TURNS_MS
      publish()
    }, TICK_MS)
    return () => clearInterval(id)
  }, [playing, speed, reduced, begin, publish])

  return useMemo(() => ({ ...view, send, reset }), [view, send, reset])
}
