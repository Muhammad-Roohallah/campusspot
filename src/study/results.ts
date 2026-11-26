export interface TaskResult {
  i: string        // task id
  o: 0 | 1         // success
  m: number        // time in ms
  t: number        // taps
  s: number        // screen changes
  g: 0 | 1         // gave up
  a?: string       // answer to the check question
  st?: number      // steps completed (multi-step tasks)
  q: number        // SEQ 1 to 7
  n?: string       // comment
}
export interface Report { v: 1; p: string; w: number; at: string; r: TaskResult[] }

const PREFIX = 'CS1.'

export function encode(rep: Report): string {
  const bytes = new TextEncoder().encode(JSON.stringify(rep))
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return PREFIX + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decode(code: string): Report {
  const body = code.trim().replace(/^CS1\./, '').replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(body + '==='.slice((body.length + 3) % 4))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as Report
}
