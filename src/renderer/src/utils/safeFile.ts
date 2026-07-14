// Builds a safe-file:// URL for a local absolute path.
// The main process serves these through a validated custom protocol,
// so the renderer can run with webSecurity enabled.
//
// The scheme is registered as `standard`, so a fixed host ("local") is used
// and every segment is percent-encoded — otherwise Chromium would parse a
// Windows drive letter ("C:") as the URL host and mangle the path.
export function safeFileUrl(path: string): string {
  const segments = path.replace(/\\/g, '/').split('/').filter((s) => s.length > 0)
  return `safe-file://local/${segments.map(encodeURIComponent).join('/')}`
}
