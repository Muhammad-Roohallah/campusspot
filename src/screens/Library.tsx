import { useState } from 'react'
import { Shell } from '../components/Shell'
import { Chevron, Legend, Pill, Sheet } from '../components/ui'
import { useToast } from '../components/Toast'
import { LibraryOverview } from '../maps/LibraryOverview'
import { useNow, useSnapshot, useStore } from '../data/StoreContext'
import { FLOORS, ILS_SECTIONS, ROOMS, SLOT_COUNT, ilsId, ilsIds, ilsSection, type FloorId, type IlsSection } from '../domain/layout'
import { currentSlot, ilsExpiry, ilsView, mineIls, slotView } from '../domain/rules'
import { fmtShort, fmtTime } from '../domain/time'
import { slotStart } from '../domain/rules'
import { go } from '../router'

const isFloor = (f: string | undefined): f is FloorId => f === 'G' || f === 'F'

export function Library({ route }: { route: string[] }) {
  const floor: FloorId = isFloor(route[1]) ? route[1] : 'G'
  const sec = route[2] ? ilsSection(route[2]) : undefined
  if (sec && sec.floor === floor) return <SectionView section={sec} />
  return <FloorView floor={floor} />
}

function FloorView({ floor }: { floor: FloorId }) {
  const snap = useSnapshot()
  const now = useNow()
  const store = useStore()
  const [room, setRoom] = useState<string | null>(null)
  const mine = mineIls(snap.ils, store.deviceId, now)
  const cs = currentSlot(now)

  return (
    <Shell title="Library" subtitle="Individual learning spaces" back="#/">
      {mine && (
        <section className="card mycard" aria-label="Your ILS">
          <div className="grow"><h2>You are marked at {mine}</h2>
            <div className="muted">Clears by itself at {fmtTime(ilsExpiry(snap.ils[mine]))}.</div></div>
          <MarkLeave id={mine} />
        </section>
      )}
      <section className="card field">
        <label htmlFor="floor">Floor</label>
        <select id="floor" value={floor} onChange={(e) => go(`library/${e.target.value}`)}>
          {(Object.keys(FLOORS) as FloorId[]).map((f) => <option key={f} value={f}>{FLOORS[f]}</option>)}
        </select>
      </section>
      <section className="card ovwrap">
        <h2>{FLOORS[floor]}</h2>
        <div className="muted">Tap a row, column or room for the detailed view.</div>
        <LibraryOverview floor={floor} snap={snap} now={now} device={store.deviceId} onSection={(id) => go(`library/${floor}/${id}`)} onRoom={setRoom} />
        <Legend kind="ils" />
        <p className="hint">Grey means nobody has marked it, not that it is free. Green is a student's report that it is free, and it goes back to grey after an hour.</p>
      </section>
      <div className="zl" aria-label="Sections">
        {ILS_SECTIONS.filter((s) => s.floor === floor).map((s) => {
          const ids = ilsIds(s)
          const taken = ids.filter((id) => ilsView(snap.ils[id], now) === 'taken').length
          const free = ids.filter((id) => ilsView(snap.ils[id], now) === 'free').length
          return (
            <a key={s.id} className="zrow" href={`#/library/${floor}/${s.id}`}>
              <span className="badge">{s.id}</span>
              <span className="txt"><b>{s.name}</b><span className="muted">{ids.length} ILS, {s.boxes} boxes of {s.per}</span></span>
              <span className="row" style={{ gap: 6 }}><Pill level="full">{taken} taken</Pill>{free > 0 && <Pill level="ok">{free} free</Pill>}</span>
              <Chevron />
            </a>
          )
        })}
        {ROOMS.filter((r) => r.floor === floor).map((r) => {
          const open = Array.from({ length: SLOT_COUNT }, (_, i) => slotView(snap.rooms[r.id], i, now)).filter((v) => v === 'open').length
          const v = cs < 0 ? null : slotView(snap.rooms[r.id], cs, now)
          return (
            <button key={r.id} className="zrow" onClick={() => setRoom(r.id)}>
              <span className="badge">{r.short}</span>
              <span className="txt"><b>{r.name}</b><span className="muted">{open} of {SLOT_COUNT} slots still open today</span></span>
              {v === null ? <Pill>Closed</Pill> : v === 'open' ? <Pill level="ok">Open now</Pill> : <Pill level="full">Booked now</Pill>}
              <Chevron />
            </button>
          )
        })}
      </div>
      {room && <RoomSheet id={room} onClose={() => setRoom(null)} />}
    </Shell>
  )
}

function MarkLeave({ id }: { id: string }) {
  const store = useStore()
  const toast = useToast()
  return <button className="btn secondary" onClick={() => { void store.setIls(id, 'free'); toast(`${id} is now shown as free.`) }}>I have left</button>
}

/** Detail view: walls, dividers and desk pairs with partitions, drawn as in the sketch. */
function SectionView({ section: s }: { section: IlsSection }) {
  const snap = useSnapshot()
  const now = useNow()
  const store = useStore()
  const [sel, setSel] = useState<string | null>(null)
  const mine = mineIls(snap.ils, store.deviceId, now)
  const h = s.dir === 'h'
  const ids = ilsIds(s)
  const taken = ids.filter((id) => ilsView(snap.ils[id], now) === 'taken').length
  const free = ids.filter((id) => ilsView(snap.ils[id], now) === 'free').length

  const desk = (id: string) => {
    const v = id === mine ? 'mine' : ilsView(snap.ils[id], now)
    const m = snap.ils[id]
    const label = v === 'mine' ? `${id}, your ILS` : v === 'taken' ? `${id}, marked taken at ${fmtTime(m.at)}` : v === 'free' ? `${id}, reported free at ${fmtTime(m.at)}` : `${id}, not reported`
    return (
      <button key={id} className={`desk ${v}`} aria-label={label} onClick={() => setSel(id)}>
        {v === 'taken' || v === 'free' ? <><span className="n">{id}</span><span className="t">{fmtShort(m.at)}</span></> : v === 'mine' ? <><span className="n">{id}</span><span className="t">You</span></> : <span className="t">{id}</span>}
      </button>
    )
  }
  const cells: React.ReactNode[] = [<div key="w0" className="wall" />]
  for (let b = 1; b <= s.boxes; b++) {
    const d = (n: number) => desk(ilsId(s, b, n))
    cells.push(
      <div key={`c${b}`} className="cell" role="group" aria-label={`Box ${s.id}${b}`}>
        {s.per === 4
          ? <><div className="pair">{d(1)}<i className="part" />{d(2)}</div><i className="aisle" /><div className="pair">{d(3)}<i className="part" />{d(4)}</div></>
          : <><div className="pair">{d(1)}</div><i className="aisle" /><div className="pair">{d(2)}</div></>}
      </div>,
      b < s.boxes ? <div key={`d${b}`} className="divl" /> : <div key="w1" className="wall" />,
    )
  }
  const strip = <div className={`strip ${h ? 'h' : 'v'}`}>{cells}</div>
  return (
    <Shell title={s.name} subtitle={`Library, ${FLOORS[s.floor].toLowerCase()}`} back={`#/library/${s.floor}`}>
      <section className="card"><h2>{s.name}</h2>
        <div className="muted">{ids.length} ILS, {taken} marked taken, {free} reported free. Tap an ILS to mark it or report it.</div></section>
      <section className="card">
        {h ? <div className="scroller" tabIndex={0} aria-label={`${s.name}, scroll sideways`}>{strip}</div> : strip}
        <p className="hint">{h ? `Scroll sideways to see all ${s.boxes} boxes, left to right as on the map.` : 'Top to bottom as on the map.'}</p>
        <Legend kind="ils" />
        <p className="hint">Thick lines are walls and thin lines are dividers. Desks sit on both sides of a divider in pairs, with a partition between the two desks.</p>
      </section>
      {sel && <IlsSheet id={sel} onClose={() => setSel(null)} />}
    </Shell>
  )
}

function IlsSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useStore()
  const snap = useSnapshot()
  const now = useNow()
  const toast = useToast()
  const m = snap.ils[id]
  const view = ilsView(m, now)
  const mine = mineIls(snap.ils, store.deviceId, now)
  const isMine = mine === id
  const done = (msg: string) => { onClose(); toast(msg) }
  const sit = () => { void store.setIls(id, 'taken'); done(`Marked ${id} as taken. Tap "I have left" when you go.`) }
  const free = () => { void store.setIls(id, 'free'); done(`Thanks. ${id} is shown as free for the next hour.`) }

  return (
    <Sheet onClose={onClose} labelledBy="ils-title">
      {isMine ? (
        <>
          <h3 id="ils-title">Your ILS, {id}</h3>
          <p className="muted" style={{ margin: 0 }}>Marked at {fmtTime(m.at)}. It clears by itself at {fmtTime(ilsExpiry(m))}.</p>
          <div className="row"><button className="btn primary" style={{ flex: 1 }} onClick={free}>I have left</button><button className="btn" onClick={onClose}>Close</button></div>
        </>
      ) : view === 'taken' ? (
        <>
          <h3 id="ils-title">{id} is marked taken</h3>
          <p className="muted" style={{ margin: 0 }}>Marked at {fmtTime(m.at)} by another student. If they forgot to leave, it clears at {fmtTime(ilsExpiry(m))}. If you can see it is empty, report it.</p>
          <div className="row"><button className="btn primary" style={{ flex: 1 }} onClick={free}>It is free now</button><button className="btn" onClick={onClose}>Close</button></div>
        </>
      ) : (
        <>
          <h3 id="ils-title">{view === 'free' ? `${id} was reported free` : `${id} is not reported`}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {view === 'free' ? `Reported free at ${fmtTime(m.at)}. It goes back to grey at ${fmtTime(ilsExpiry(m))}. ` : ''}
            {mine ? `You are already marked at ${mine}. Tap "I have left" on that one before sitting somewhere else.` : 'Mark it when you sit down. Marks are anonymous.'}
          </p>
          <div className="row">
            <button className="btn primary" style={{ flex: 1 }} disabled={!!mine} onClick={sit}>I am sitting here</button>
            {view !== 'free' && <button className="btn secondary" onClick={free}>It is free</button>}
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </>
      )}
    </Sheet>
  )
}

function RoomSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useStore()
  const snap = useSnapshot()
  const now = useNow()
  const room = ROOMS.find((r) => r.id === id)!
  const cs = currentSlot(now)
  const booked = snap.rooms[id]
  const views = Array.from({ length: SLOT_COUNT }, (_, i) => slotView(booked, i, now))
  const open = views.filter((v) => v === 'open').length
  const label = (i: number) => `${fmtTime(slotStart(now, i)).replace(' am', '').replace(' pm', '')} to ${fmtTime(slotStart(now, i) + 60 * 60_000)}`
  return (
    <Sheet onClose={onClose} labelledBy="room-title">
      <h3 id="room-title">{room.name}</h3>
      <div className="muted">Today, 8:30 am to 7:30 pm in one-hour slots. {open} of {SLOT_COUNT} still open.</div>
      <div className="slots">
        {views.map((v, i) => {
          const text = v === 'past' ? 'Past' : v === 'booked' ? 'Booked' : 'Open'
          const inner = <><b>{label(i)}</b><span className="st">{text}{i === cs ? ', now' : ''}</span></>
          const cls = `slot ${v}${i === cs ? ' now' : ''}`
          return snap.staff && v !== 'past'
            ? <button key={i} className={cls} onClick={() => void store.setRoomSlot(id, i, v === 'open')} aria-label={`${label(i)}, ${text}. Tap to change.`}>{inner}</button>
            : <div key={i} className={cls}>{inner}</div>
        })}
      </div>
      <p className="hint" style={{ margin: 0 }}>{snap.staff ? 'You are signed in as staff. Tap a slot to change it.' : 'Bookings are arranged with the library desk.'}</p>
      <div className="row"><button className="btn primary" style={{ flex: 1 }} onClick={onClose}>Close</button></div>
    </Sheet>
  )
}
