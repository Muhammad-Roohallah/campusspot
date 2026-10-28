import { useEffect, useRef, type ReactNode } from 'react'
import type { Level } from '../domain/types'
import { LEVEL_LABEL } from '../domain/rules'

export function Pill({ level, children }: { level?: Level | 'n'; children?: ReactNode }) {
  const l = level ?? 'n'
  return <span className={`pill ${l}`}>{children ?? (l === 'n' ? '' : LEVEL_LABEL[l])}</span>
}

export function Chevron() {
  return (
    <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

/** Bottom sheet dialog: closes on Escape or scrim tap, moves focus in, and gives it back when closed. */
export function Sheet({ onClose, labelledBy, children }: { onClose: () => void; labelledBy: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('button.primary, button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [onClose])
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref}>{children}</div>
    </>
  )
}

export function Legend({ kind }: { kind: 'parking' | 'ils' | 'cafe' }) {
  if (kind === 'parking')
    return <div className="legend"><span><i className="lf" />Free</span><span><i className="lt" />Taken, shows end time</span><span><i className="lo" />Past end time</span><span><i className="lm" />Your space</span></div>
  if (kind === 'cafe')
    return <div className="legend"><span><i className="lf" />Free chair</span><span><i className="lt" />Taken chair</span></div>
  return (
    <div className="legend">
      <span><i className="lu" />Not reported</span><span><i className="lf" />Reported free</span><span><i className="lt" />Marked taken</span><span><i className="lm" />Your ILS</span>
      <span><i className="lw" />Wall</span><span><i className="ld" />Divider</span><span><i className="lp" />Partition</span>
    </div>
  )
}
