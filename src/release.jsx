import { createContext, useContext, useEffect, useState } from 'react'
import { RELEASE_API, LINKS, VERSION, INSTALLER, MAC_INSTALLER, SHA256 } from './config.js'

// The asset names carry their version ("ClauMeter.Setup.1.2.0.exe"), so a link
// written by hand goes stale the moment a release ships. Instead the page asks
// GitHub which release is current and reads the real asset URLs — and their own
// published digests — out of the answer. Nothing here needs a token: the
// releases endpoint is public, and one unauthenticated call per visit is far
// under the 60/hour an anonymous IP gets.

const FALLBACK = {
  version: VERSION,
  installer: INSTALLER,
  macInstaller: MAC_INSTALLER,
  download: LINKS.download,
  downloadMac: LINKS.downloadMac,
  sha256: SHA256,
  live: false,
}

const ReleaseContext = createContext(FALLBACK)

export function ReleaseProvider({ children }) {
  const [release, setRelease] = useState(FALLBACK)

  useEffect(() => {
    // An aborted fetch must not write into an unmounted tree, and a failure of
    // any kind just leaves the pinned fallback in place — a slightly old
    // installer still installs, a dead link doesn't.
    const stop = new AbortController()

    fetch(RELEASE_API, {
      signal: stop.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((data) => {
        const next = fromApi(data)
        if (next) setRelease(next)
      })
      .catch(() => {})

    return () => stop.abort()
  }, [])

  return <ReleaseContext.Provider value={release}>{children}</ReleaseContext.Provider>
}

export function useRelease() {
  return useContext(ReleaseContext)
}

// Only accept an answer that actually carries both installers. A release that
// is still uploading, or one whose asset names changed shape, falls back whole
// rather than half-updating the page.
function fromApi(data) {
  const assets = Array.isArray(data?.assets) ? data.assets : []
  const win = assets.find((a) => a.name?.endsWith('.exe'))
  const mac = assets.find((a) => a.name?.endsWith('.dmg'))
  if (!data?.tag_name || !win?.browser_download_url || !mac?.browser_download_url) return null

  return {
    version: data.tag_name,
    installer: win.name,
    macInstaller: mac.name,
    download: win.browser_download_url,
    downloadMac: mac.browser_download_url,
    // GitHub reports the asset digest as "sha256:<hex>"; the datasheet prints
    // the hex alone, so it matches Get-FileHash's output character for character.
    // If a release ever comes back without one, the checksum row is dropped —
    // printing the previous version's hash would be worse than printing none.
    sha256: digestOf(win),
    live: true,
  }
}

function digestOf(asset) {
  const m = /^sha256:([0-9a-f]{64})$/.exec(asset.digest ?? '')
  return m ? m[1] : null
}
