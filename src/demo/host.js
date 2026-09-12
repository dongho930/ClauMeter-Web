import { useEffect, useRef } from 'react'

// The demo's IPC. public/demo/bridge.js builds the app's window.api on top of
// these three calls, so the copied renderer code talks to the page the same way
// it talks to Electron's main process:
//
//   on      ipcRenderer.on      — the page pushes to a window
//   send    ipcRenderer.send    — a window tells the page something happened
//   invoke  ipcRenderer.invoke  — a window asks the page for something
//
// Both sides are same-origin, so this is a plain object on window rather than a
// postMessage protocol. Nothing here is reachable from another origin.
const GLOBAL = '__CLAUMETER_DEMO_HOST__'

function createHost(handlersRef) {
  // Listeners per window per channel. A channel can have more than one: the app's
  // renderer.js and the demo's own bridge both watch clickthrough:state, for
  // instance. A window announces itself with attach() as it loads, which drops
  // whatever the previous document in that frame had registered.
  const subs = new Map()
  const key = (frame, channel) => `${frame}:${channel}`

  return {
    attach(frame) {
      for (const k of [...subs.keys()]) if (k.startsWith(`${frame}:`)) subs.delete(k)
    },
    on(frame, channel, cb) {
      const k = key(frame, channel)
      const list = subs.get(k)
      if (list) list.push(cb)
      else subs.set(k, [cb])
    },
    send(frame, channel, payload) {
      handlersRef.current?.[channel]?.(payload, frame)
    },
    invoke(frame, channel, payload) {
      const h = handlersRef.current?.[channel]
      return Promise.resolve(h ? h(payload, frame) : undefined)
    },
    // The page's side of ipcRenderer.on.
    emit(frame, channel, payload) {
      for (const cb of subs.get(key(frame, channel)) ?? []) cb(payload)
    },
    // Called when a window closes, so nothing is left pointing into it.
    detach(frame) {
      this.attach(frame)
    },
  }
}

export function useDemoHost(handlersRef) {
  const host = useRef(null)
  if (!host.current) host.current = createHost(handlersRef)

  // Installed on mount rather than at module scope: the demo is one section of a
  // page, and nothing outside it should see this.
  useEffect(() => {
    window[GLOBAL] = host.current
    return () => {
      delete window[GLOBAL]
    }
  }, [])

  return host.current
}
