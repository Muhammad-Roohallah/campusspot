export const MIN = 60_000

export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
/** YYYY-MM-DD in local time, used as the booking day key. */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}
/** Short form for tight spaces, e.g. 10:45a. */
export function fmtShort(ms: number): string {
  return fmtTime(ms).replace(' am', 'a').replace(' pm', 'p')
}
export function fmtDur(ms: number): string {
  const m = Math.max(0, Math.round(ms / MIN))
  const h = Math.floor(m / 60)
  const r = m % 60
  return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m`
}
