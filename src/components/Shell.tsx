import type { ReactNode } from 'react'
import { useNow, useStore } from '../data/StoreContext'
import { fmtTime } from '../domain/time'

export function Shell({ title, subtitle, back, children }: { title: string; subtitle?: string; back?: string; children: ReactNode }) {
  const now = useNow()
  const store = useStore()
  return (
    <div className="app">
      <header className="bar">
        {back && (
          <a className="back" href={back} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </a>
        )}
        <div className="grow"><h1>{title}</h1>{subtitle && <div className="sub">{subtitle}</div>}</div>
        <div className="clock">{store.mode === 'local' ? 'Demo ' : ''}{fmtTime(now)}</div>
      </header>
      <main>{children}</main>
      {store.demo && <DemoControls />}
    </div>
  )
}

function DemoControls() {
  const store = useStore()
  const demo = store.demo!
  return (
    <section className="card proto" aria-label="Prototype controls">
      <h2>Prototype controls</h2>
      <div className="muted" style={{ marginBottom: 10 }}>Demo data lives in this browser only. Move the clock to see marks and parking logs expire.</div>
      <div className="row">
        <button className="btn" onClick={() => demo.advance(15)}>+15 min</button>
        <button className="btn" onClick={() => demo.advance(60)}>+1 hour</button>
        <button className="btn" onClick={() => demo.reset()}>Reset sample</button>
      </div>
    </section>
  )
}
