const REPO = 'https://github.com/dongho930/ClauMeter'

// Everything below is the *fallback* release: what the page shows for the few
// hundred milliseconds before GitHub answers, and what it keeps showing if the
// API never does (rate limit, offline, blocked). The live numbers come from
// useRelease() — see release.jsx. Keep this pointing at a release that really
// exists, because a broken download is worse than an old one.
export const VERSION = 'v1.7.0'

// GitHub rewrites the spaces in an uploaded asset's name as dots, so the file
// that actually lands in the user's Downloads folder is "ClauMeter.Setup.1.1.0.exe",
// not the "ClauMeter Setup 1.1.0.exe" that electron-builder wrote locally. The
// page quotes the name people will really see.
export const INSTALLER = `ClauMeter.Setup.${VERSION.slice(1)}.exe`

// The macOS build is a single universal (Intel + Apple silicon) disk image.
export const MAC_INSTALLER = `ClauMeter-${VERSION.slice(1)}-universal.dmg`

// The installer is not code-signed, so the page publishes its hash instead and
// tells people how to check it. Verified against the released asset's own digest.
// Re-take after each build with: Get-FileHash "dist/ClauMeter Setup 1.7.0.exe" -Algorithm SHA256
export const SHA256 = '6049c0dcf66d54282747afb561795b1e0c949801e633a40d6b6a18a0a3958544'

// The releases API GitHub is asked for the current version and its assets.
export const RELEASE_API = 'https://api.github.com/repos/dongho930/ClauMeter/releases/latest'

export const LINKS = {
  download: `${REPO}/releases/download/${VERSION}/${INSTALLER}`,
  downloadMac: `${REPO}/releases/download/${VERSION}/${MAC_INSTALLER}`,
  repo: REPO,
  issues: `${REPO}/issues`,
  license: `${REPO}/blob/main/LICENSE`,
}
