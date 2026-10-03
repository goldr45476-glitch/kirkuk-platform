/** Only allow same-site relative redirects (prevents open-redirect via ?next=). */
export function safeNext(v: string | null | undefined, fallback = "/"): string {
  return v && /^\/(?![/\\])/.test(v) ? v : fallback;
}
