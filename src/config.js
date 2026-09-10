const REPO = 'https://github.com/dongho930/ClauMeter'

export const VERSION = 'v1.0.0'

// GitHub rewrites the spaces in an uploaded asset's name as dots, so the file
// that actually lands in the user's Downloads folder is "ClauMeter.Setup.1.0.0.exe",
// not the "ClauMeter Setup 1.0.0.exe" that electron-builder wrote locally. The
// page quotes the name people will really see.
export const INSTALLER = `ClauMeter.Setup.${VERSION.slice(1)}.exe`

// The installer is not code-signed, so the page publishes its hash instead and
// tells people how to check it. Verified against the released asset's own digest.
// Re-take after each build with: Get-FileHash "dist/ClauMeter Setup 1.0.0.exe" -Algorithm SHA256
export const SHA256 = '7e743707378f2c98897ed7de7cba486abf70e5f02b415b08ff1893b9d867183d'

export const LINKS = {
  // Pinned to this version on purpose: the asset name carries the version, so
  // "/releases/latest/download/..." would break on the next release. Bumping
  // VERSION above moves the download link with it.
  download: `${REPO}/releases/download/${VERSION}/${INSTALLER}`,
  repo: REPO,
  issues: `${REPO}/issues`,
  license: `${REPO}/blob/main/LICENSE`,
}
