import { useEffect, useState } from 'react'
import { Shell } from '../components/Shell'
import { Chevron, Legend, Pill, Sheet } from '../components/ui'
import { useToast } from '../components/Toast'
import { ParkingOverview } from '../maps/ParkingOverview'
import { useNow, useSnapshot, useStore } from '../data/StoreContext'
import { PARKING_TOTAL, PARKING_ZONES, parkingZone, spotIds, type ParkingZone } from '../domain/layout'
import { LEVEL_LABEL, level, mineParking, spotView } from '../domain/rules'
import { MIN, fmtDur, fmtTime } from '../domain/time'
import { go } from '../router'
import { useWatchedZones } from '../watch'

export function Parking({ route }: { route: string[] }) {
  const zone = route[1] ? parkingZone(route[1].toUpperCase()) : undefined
  return zone ? <ZoneView zone={zone} /> : <LotView />
}

function useZoneCounts() {
  const snap = useSnapshot()
  const now = useNow()
  const counts = (z: ParkingZone) => {
    let free = 0, over = 0
    for (const id of spotIds(z)) {
      const v = spotView(snap.parking[id], now)
      if (v === 'free') free++
      else if (v === 'over') over++
    }
    return { free, over, level: level(free, z.count) }
  }
  return { snap, now, counts }
}

function LotView() {
  const store = useStore()
  const { snap, now, counts } = useZoneCounts()
  const [sel, setSel] = useState<string | null>(null)
  const mine = mineParking(snap.parking, store.deviceId, now)
  const total = PARKING_ZONES.reduce((n, z) => n + counts(z).free, 0)
  return (
    <Shell title="Parking" subtitle={`Shaded lot, ${PARKING_TOTAL} spaces`} back="#/">
      {mine && (
        <section className="card mycard" aria-label="Your parking">
          <div className="grow"><h2>You are parked at {mine}</h2>
            <div className="muted">{snap.parking[mine].end < now ? `Your end time (${fmtTime(snap.parking[mine].end)}) has passed.` : `Until ${fmtTime(snap.parking[mine].end)}, in ${fmtDur(snap.parking[mine].end - now)}`}</div></div>
          <button className="btn secondary" onClick={() => setSel(mine)}>Edit or leave</button>
        </section>
      )}
      <section className="card ovwrap">
        <h2>{total} of {PARKING_TOTAL} spaces free</h2>
        <div className="muted">Tap a zone to see its spaces.</div>
        <ParkingOverview snap={snap} now={now} device={store.deviceId} onZone={(id) => go(`parking/${id}`)} />
        <Legend kind="parking" />
      </section>
      <div className="zl" aria-label="Zones">
        {PARKING_ZONES.map((z) => {
          const c = counts(z)
          return (
            <a key={z.id} className="zrow" href={`#/parking/${z.id}`}>
              <span className="badge">{z.id}</span>
              <span className="txt"><b>Zone {z.id}</b><span className="muted">{c.free} of {z.count} free{c.over ? `, ${c.over} past end time` : ''}</span></span>
              <Pill level={c.level} />
              <Chevron />
            </a>
          )
        })}
      </div>
      {sel && <SpotSheet id={sel} onClose={() => setSel(null)} />}
    </Shell>
  )
}

function ZoneView({ zone: z }: { zone: ParkingZone }) {
  const store = useStore()
  const { snap, now, counts } = useZoneCounts()
  const [sel, setSel] = useState<string | null>(null)
  const { watched, toggle } = useWatchedZones()
  const mine = mineParking(snap.parking, store.deviceId, now)
  const c = counts(z)

  const btn = (id: string) => {
    const log = snap.parking[id]
    const v = id === mine ? 'mine' : spotView(log, now)
    const label = v === 'free' ? `${id}, free` : v === 'mine' ? `${id}, your space, until ${fmtTime(log.end)}` : v === 'over' ? `${id}, taken, logged end time ${fmtTime(log.end)} has passed` : `${id}, taken until ${fmtTime(log.end)}`
    return (
      <button key={id} className={`spot ${v}`} aria-label={label} onClick={() => setSel(id)}>
        {v === 'free' ? <span className="t">{id}</span> : v === 'mine' ? <><span className="n">{id}</span><span className="t">You</span></> : <><span className="n">{id}</span><span className="t">{fmtTime(log.end).replace(' am', '').replace(' pm', '')}</span></>}
      </button>
    )
  }
  let grid: React.ReactNode
  if (z.kind === 'col') {
    const rows: React.ReactNode[] = []
    for (let r = 0; r < 12; r++) {
      rows.push(btn(`${z.id}${r + 1}`))
      if (r % 2 === 0) rows.push(<div key={`b${r}`} className="strip-box" style={{ gridRow: 'span 2' }}>Box {r / 2 + 1}</div>)
      rows.push(btn(`${z.id}${r + 13}`))
    }
    grid = <div className="lot col">{rows}</div>
  } else if (z.kind === 'one') {
    const rows: React.ReactNode[] = []
    for (let r = 0; r < 24; r++) {
      rows.push(btn(`${z.id}${r + 1}`))
      if (r % 2 === 0) rows.push(<div key={`b${r}`} className="strip-box" style={{ gridRow: 'span 2' }}>Box {r / 2 + 1}</div>)
    }
    grid = <div className="lot one">{rows}</div>
  } else {
    grid = (
      <div className="scroller" tabIndex={0} aria-label={`Zone ${z.id} spaces, scroll sideways`}>
        <div className="lot line">
          {Array.from({ length: 14 }, (_, i) => btn(`${z.id}${i + 1}`))}
          <div className="aisle-row">Aisle</div>
          {Array.from({ length: 14 }, (_, i) => btn(`${z.id}${i + 15}`))}
        </div>
        <p className="hint">Scroll sideways to see all 14 spaces on each side.</p>
      </div>
    )
  }
  return (
    <Shell title={`Zone ${z.id}`} subtitle="Parking under shade" back="#/parking">
      <section className="card">
        <div className="zhead">
          <div className="grow"><h2>Zone {z.id}</h2><div className="muted">{c.free} of {z.count} free{c.over ? `, ${c.over} past end time` : ''}</div></div>
          <Pill level={c.level}>{LEVEL_LABEL[c.level]}</Pill>
        </div>
        <label className="notify" htmlFor="notify">
          <input id="notify" type="checkbox" checked={watched.includes(z.id)} onChange={() => toggle(z.id)} />
          <span>Tell me when a space is free in Zone {z.id}</span>
        </label>
        {watched.includes(z.id) && <p className="hint" style={{ marginTop: 0 }}>Works while the app is open. In the IBA app this would be a push notification.</p>}
      </section>
      <section className="card">{grid}<Legend kind="parking" /></section>
      {sel && <SpotSheet id={sel} onClose={() => setSel(null)} />}
    </Shell>
  )
}

function SpotSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useStore()
  const snap = useSnapshot()
  const now = useNow()
  const toast = useToast()
  const log = snap.parking[id]
  const v = spotView(log, now)
  const mine = mineParking(snap.parking, store.deviceId, now)
  const isMine = mine === id
  const [until, setUntil] = useState(() => (isMine ? log.end : now + 120 * MIN))
  useEffect(() => { if (isMine) setUntil(log.end) }, [isMine, log?.end])  // eslint-disable-line react-hooks/exhaustive-deps
  const step = (d: number) => setUntil((u) => Math.max(now + 15 * MIN, Math.min(now + 10 * 60 * MIN, u + d * MIN)))
  const stepper = (
    <div className="stepper">
      <button onClick={() => step(-15)} aria-label="15 minutes earlier">&minus;</button>
      <div className="val">{fmtTime(until)}<small>in {fmtDur(until - now)}</small></div>
      <button onClick={() => step(15)} aria-label="15 minutes later">+</button>
    </div>
  )

  return (
    <Sheet onClose={onClose} labelledBy="spot-title">
      {isMine ? (
        <>
          <h3 id="spot-title">Your space, {id}</h3>
          <div className="muted">Change your end time if your plans change.</div>
          {stepper}
          <div className="row">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => { void store.updateParking(id, until); onClose(); toast(`End time saved: ${fmtTime(until)}.`) }}>Save end time</button>
            <button className="btn secondary" onClick={() => { void store.leaveParking(id); onClose(); toast(`Space ${id} is now free for others.`) }}>I have left</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </>
      ) : v === 'free' ? (
        mine ? (
          <>
            <h3 id="spot-title">Space {id} is free</h3>
            <p className="muted" style={{ margin: 0 }}>You are already parked at {mine}. Mark that you have left before logging another space.</p>
            <div className="row"><button className="btn" onClick={onClose}>Close</button></div>
          </>
        ) : (
          <>
            <h3 id="spot-title">Park at {id}</h3>
            <div className="muted">Starts now, {fmtTime(now)}. When will you leave?</div>
            {stepper}
            <div className="row">
              <button className="btn primary" style={{ flex: 1 }} onClick={() => { void store.startParking(id, until); onClose(); toast(`Parked at ${id} until ${fmtTime(until)}.`) }}>Start parking until {fmtTime(until)}</button>
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          </>
        )
      ) : (
        <>
          <h3 id="spot-title">Space {id} is taken</h3>
          <p className="muted" style={{ margin: 0 }}>
            {v === 'over' ? `The logged end time (${fmtTime(log.end)}) passed ${fmtDur(now - log.end)} ago. It is likely to be free soon.` : `Logged to be free at ${fmtTime(log.end)}, in ${fmtDur(log.end - now)}.`}
          </p>
          <div className="row"><button className="btn" onClick={onClose}>Close</button></div>
        </>
      )}
    </Sheet>
  )
}
