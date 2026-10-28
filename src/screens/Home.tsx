import { Shell } from '../components/Shell'
import { Chevron, Pill } from '../components/ui'
import { useNow, useSnapshot, useStore } from '../data/StoreContext'
import { ILS_TOTAL, PARKING_TOTAL, CAFE_SEATS, PARKING_ZONES, ILS_SECTIONS, ilsIds, spotIds } from '../domain/layout'
import { cafeFree, cafeStale, ilsView, level, spotView } from '../domain/rules'
import { fmtDur } from '../domain/time'

export function Home() {
  const snap = useSnapshot()
  const now = useNow()
  const store = useStore()

  const parkFree = PARKING_ZONES.flatMap(spotIds).filter((id) => spotView(snap.parking[id], now) === 'free').length
  const ilsTaken = ILS_SECTIONS.flatMap(ilsIds).filter((id) => ilsView(snap.ils[id], now) === 'taken').length
  const cFree = cafeFree(snap.cafe)
  const stale = cafeStale(snap.cafe, now)

  return (
    <Shell title="Campus" subtitle="Find a space before you walk there">
      {store.mode === 'local' && <div className="banner info">Demo mode. Data is stored in this browser only and is not shared with other devices.</div>}
      {!snap.ready && <div className="banner info">Loading live data…</div>}
      <div className="zl">
        <a className="zrow" href="#/library">
          <span className="badge">L</span>
          <span className="txt"><b>Library study spaces</b><span className="muted">{ILS_TOTAL} ILS on 2 floors, {ilsTaken} marked taken, plus collab rooms</span></span>
          <Chevron />
        </a>
        <a className="zrow" href="#/cafe">
          <span className="badge">C</span>
          <span className="txt"><b>Library café</b><span className="muted">{stale ? 'Not updated recently' : `${cFree} of ${CAFE_SEATS} chairs free`}</span></span>
          {stale ? <Pill>Check</Pill> : <Pill level={level(cFree, CAFE_SEATS)} />}
          <Chevron />
        </a>
        <a className="zrow" href="#/parking">
          <span className="badge">P</span>
          <span className="txt"><b>Parking under shade</b><span className="muted">{parkFree} of {PARKING_TOTAL} spaces free</span></span>
          <Pill level={level(parkFree, PARKING_TOTAL)} />
          <Chevron />
        </a>
      </div>
      <p className="hint">Library café is updated by café staff{snap.cafe.updatedAt ? `, last ${fmtDur(now - snap.cafe.updatedAt)} ago` : ''}. ILS marks come from students. Parking comes from the start and end times people log.</p>
      <p className="hint"><a href="#/staff">Staff sign in</a></p>
    </Shell>
  )
}
