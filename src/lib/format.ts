/**
 * Locale-pinned number formatting.
 *
 * IMPORTANT: never call `value.toLocaleString()` without an explicit locale in
 * render paths. The server (Node, typically en-US) and the client browser
 * (whatever locale the OS/user configured, e.g. en-IN which groups as
 * 7,24,382 instead of 724,382) would otherwise produce different strings for
 * the same number, causing React hydration mismatches.
 *
 * Always go through these helpers so SSR and CSR output is identical.
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
