import { useEffect, useRef, useState } from 'react'
import { Shell } from '../components/Shell'
import { Legend, Pill } from '../components/ui'
import { CafeMap } from '../maps/CafeMap'
import { useNow, useSnapshot, useStore } from '../data/StoreContext'
import { CAFE_CHAIRS_PER_TABLE, CAFE_SEATS } from '../domain/layout'
import { cafeFree, cafeStale, level } from '../domain/rules'
import { fmtDur } from '../domain/time'

export function Cafe() {
  const store = useStore()
  const snap = useSnapshot()
  const now = useNow()
  const [undo, setUndo] = useState<boolean[] | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(undoTimer.current), [])

  const seats = snap.cafe.seats
  const free = cafeFree(snap.cafe)
  const stale = cafeStale(snap.cafe, now)
  const canEdit = snap.staff

  const remember = () => {
    setUndo([...seats])
    clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setUndo(null), 10_000)
  }
  const setMany = (idx: number[], taken: boolean) => { remember(); void store.setSeats(idx, taken) }
  const onChair = (i: number) => void store.setSeats([i], !seats[i])
  const onTable = (t: number) => {
    const idx = Array.from({ length: CAFE_CHAIRS_PER_TABLE }, (_, c) => t * CAFE_CHAIRS_PER_TABLE + c)
    const anyFree = idx.some((i) => !seats[i])
    setMany(idx, anyFree)
  }
  const doUndo = () => {
    if (!undo) return
    const changedTaken = undo.map((v, i) => (v && !seats[i] ? i : -1)).filter((i) => i >= 0)
    const changedFree = undo.map((v, i) => (!v && seats[i] ? i : -1)).filter((i) => i >= 0)
    if (changedTaken.length) void store.setSeats(changedTaken, true)
    if (changedFree.length) void store.setSeats(changedFree, false)
    setUndo(null)
  }

  return (
    <Shell title="Library café" subtitle="Seats, updated by café staff" back="#/">
      {stale && <div className="banner">{snap.cafe.updatedAt == null ? 'Café staff have not updated the seats yet.' : `Last updated ${fmtDur(now - snap.cafe.updatedAt)} ago, so this may be out of date.`}</div>}
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><h2>{free} of {CAFE_SEATS} chairs free</h2>
            <div className="muted">{snap.cafe.updatedAt != null ? `Updated ${fmtDur(now - snap.cafe.updatedAt)} ago` : 'No update yet'}</div></div>
          <Pill level={level(free, CAFE_SEATS)} />
        </div>
        <CafeMap seats={seats} canEdit={canEdit} onChair={onChair} onTable={onTable} />
        <Legend kind="cafe" />
        {canEdit ? (
          <>
            <p className="hint">You are signed in as staff. Tap a chair to change it, or tap a table to change all four chairs.</p>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => setMany(seats.map((_, i) => i), false)}>Mark all free</button>
              <button className="btn" onClick={() => setMany(seats.map((_, i) => i), true)}>Mark all taken</button>
              {undo && <button className="btn secondary" onClick={doUndo}>Undo</button>}
            </div>
          </>
        ) : (
          <p className="hint">Café staff keep this up to date. <a href="#/staff">Staff sign in</a></p>
        )}
      </section>
    </Shell>
  )
}
