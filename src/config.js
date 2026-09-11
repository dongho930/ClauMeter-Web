const REPO = 'https://github.com/dongho930/ClauMeter'

export const VERSION = 'v1.1.0'

// GitHub rewrites the spaces in an uploaded asset's name as dots, so the file
// that actually lands in the user's Downloads folder is "ClauMeter.Setup.1.1.0.exe",
// not the "ClauMeter Setup 1.1.0.exe" that electron-builder wrote locally. The
// page quotes the name people will really see.
export const INSTALLER = `ClauMeter.Setup.${VERSION.slice(1)}.exe`

// The macOS build is a single universal (Intel + Apple silicon) disk image.
export const MAC_INSTALLER = `ClauMeter-${VERSION.slice(1)}-universal.dmg`

// The installer is not code-signed, so the page publishes its hash instead and
// tells people how to check it. Verified against the released asset's own digest.
// Re-take after each build with: Get-FileHash "dist/ClauMeter Setup 1.1.0.exe" -Algorithm SHA256
export const SHA256 = '3d5db319447a2d2898172fd21d45a5b34aba42a71f879369d8ebd77df67e1b50'

export const LINKS = {
  // Pinned to this version on purpose: the asset name carries the version, so
  // "/releases/latest/download/..." would break on the next release. Bumping
  // VERSION above moves both download links with it.
  download: `${REPO}/releases/download/${VERSION}/${INSTALLER}`,
  downloadMac: `${REPO}/releases/download/${VERSION}/${MAC_INSTALLER}`,
  repo: REPO,
  issues: `${REPO}/issues`,
  license: `${REPO}/blob/main/LICENSE`,
}
