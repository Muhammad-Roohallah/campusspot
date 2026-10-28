import type { Snapshot } from '../domain/types'
import { ROOMS, ilsId, ilsIds, ilsSection, type FloorId, type IlsSection } from '../domain/layout'
import { currentSlot, ilsView, mineIls, slotView } from '../domain/rules'

const U = 48

export function LibraryOverview({ floor, snap, now, device, onSection, onRoom }: {
  floor: FloorId; snap: Snapshot; now: number; device: string; onSection: (id: string) => void; onRoom: (id: string) => void
}) {
  const mine = mineIls(snap.ils, device, now)
  const cls = (id: string) => (id === mine ? 'mine' : ilsView(snap.ils[id], now))
  const desk = (x: number, y: number, w: number, h: number, id: string) => <rect key={id} className={`dk ${cls(id)}`} x={x} y={y} width={w} height={h} rx={2} />

  const strip = (s: IlsSection, x0: number, y0: number) => {
    const h = s.dir === 'h'
    const W = h ? s.boxes * U : U, H = h ? U : s.boxes * U
    const taken = ilsIds(s).filter((id) => ilsView(snap.ils[id], now) === 'taken').length
    const items: React.ReactNode[] = []
    for (let b = 0; b < s.boxes; b++) {
      const bx = h ? x0 + b * U : x0, by = h ? y0 : y0 + b * U, n = b + 1
      const id = (k: number) => ilsId(s, n, k)
      if (h && s.per === 4) items.push(desk(bx + 3, by + 4, 14, 18, id(1)), desk(bx + 3, by + 26, 14, 18, id(2)), desk(bx + 31, by + 4, 14, 18, id(3)), desk(bx + 31, by + 26, 14, 18, id(4)))
      else if (!h && s.per === 4) items.push(desk(bx + 4, by + 3, 18, 14, id(1)), desk(bx + 26, by + 3, 18, 14, id(2)), desk(bx + 4, by + 31, 18, 14, id(3)), desk(bx + 26, by + 31, 18, 14, id(4)))
      else items.push(desk(bx + 3, by + 9, 14, 30, id(1)), desk(bx + 31, by + 9, 14, 30, id(2)))
    }
    const lines = Array.from({ length: s.boxes + 1 }, (_, k) => {
      const c = k === 0 || k === s.boxes ? 'ln-wall' : 'ln-div'
      return h
        ? <line key={k} className={c} x1={x0 + k * U} y1={y0} x2={x0 + k * U} y2={y0 + U} />
        : <line key={k} className={c} x1={x0} y1={y0 + k * U} x2={x0 + U} y2={y0 + k * U} />
    })
    return (
      <g key={s.id} className="zone" tabIndex={0} role="button" aria-label={`${s.name}, ${taken} of ${s.boxes * s.per} ILS marked taken`}
        onClick={() => onSection(s.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSection(s.id) } }}>
        <rect className="bgr" x={x0 - 8} y={y0 - 8} width={W + 16} height={H + 16} rx={6} />
        <rect className="bxl" x={x0} y={y0} width={W} height={H} />
        {items}{lines}
        <text x={h ? x0 : x0 + U + 14} y={h ? y0 - 14 : y0 + 14} fontSize={13}>{s.name}</text>
      </g>
    )
  }

  if (floor === 'F') {
    return (
      <svg viewBox="0 0 520 150" role="group" aria-label="Map of the library first floor">
        {strip(ilsSection('C')!, 40, 56)}
      </svg>
    )
  }
  const cs = currentSlot(now)
  const rooms = [[5, 'R1'], [7, 'R2']] as const
  return (
    <svg viewBox="0 0 520 560" role="group" aria-label="Map of the library ground floor">
      {strip(ilsSection('A')!, 40, 40)}
      {strip(ilsSection('B')!, 40, 150)}
      {rooms.map(([col, rid]) => {
        const room = ROOMS.find((r) => r.id === rid)!
        const x = 40 + col * U, y = 150
        const state = cs < 0 ? 'closed' : slotView(snap.rooms[rid], cs, now) === 'open' ? 'open now' : 'booked now'
        return (
          <g key={rid} className="room" tabIndex={0} role="button" aria-label={`${room.name}, ${state}`}
            onClick={() => onRoom(rid)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRoom(rid) } }}>
            <rect x={x} y={y} width={U} height={U} rx={4} />
            <text x={x + U / 2} y={y + U / 2 - 1} fontSize={11} textAnchor="middle">Collab</text>
            <text x={x + U / 2} y={y + U / 2 + 13} fontSize={11} textAnchor="middle">room {room.short}</text>
          </g>
        )
      })}
    </svg>
  )
}
