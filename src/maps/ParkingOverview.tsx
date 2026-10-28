import type { Snapshot } from '../domain/types'
import { parkingZone, spotIds } from '../domain/layout'
import { mineParking, spotView } from '../domain/rules'

/** Overview of the shaded lot. Positions follow the sketch: A, B, C lower left, D along the bottom, E down the right. */
export function ParkingOverview({ snap, now, device, onZone }: { snap: Snapshot; now: number; device: string; onZone: (id: string) => void }) {
  const mine = mineParking(snap.parking, device, now)
  const cls = (id: string) => (id === mine ? 'mine' : spotView(snap.parking[id], now))
  const rect = (x: number, y: number, w: number, h: number, id: string) => <rect key={id} className={`sp ${cls(id)}`} x={x} y={y} width={w} height={h} rx={2} />
  const open = (id: string) => {
    const z = parkingZone(id)!
    const free = spotIds(z).filter((s) => spotView(snap.parking[s], now) === 'free').length
    return { z, free }
  }
  const group = (id: string, children: React.ReactNode) => {
    const { z, free } = open(id)
    return (
      <g key={id} className="zone" tabIndex={0} role="button" aria-label={`Zone ${id}, ${free} of ${z.count} free`}
        onClick={() => onZone(id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onZone(id) } }}>
        {children}
      </g>
    )
  }
  const cols = [['A', 34], ['B', 134], ['C', 234]] as const
  const y0 = 200
  return (
    <svg viewBox="16 16 560 466" role="group" aria-label="Map of the shaded parking lot with zones A to E">
      {cols.map(([id, x0]) => group(id, (
        <>
          <rect className="bgr" x={x0 - 8} y={y0 - 34} width={76} height={12 * 12 + 44} rx={8} />
          <text x={x0 + 30} y={y0 - 12} fontSize={18} textAnchor="middle">{id}</text>
          {Array.from({ length: 12 }, (_, r) => (
            <g key={r}>{rect(x0, y0 + r * 12, 15, 11, `${id}${r + 1}`)}{rect(x0 + 45, y0 + r * 12, 15, 11, `${id}${r + 13}`)}</g>
          ))}
          {Array.from({ length: 6 }, (_, b) => <rect key={b} className="bx" x={x0 + 17} y={y0 + b * 24} width={26} height={23} rx={2} />)}
        </>
      )))}
      {group('D', (
        <>
          <rect className="bgr" x={78} y={402} width={14 * 18 + 34} height={74} rx={8} />
          <text x={92} y={446} fontSize={18} textAnchor="middle">D</text>
          {Array.from({ length: 14 }, (_, i) => (
            <g key={i}>{rect(104 + i * 18, 420, 16, 14, `D${i + 1}`)}{rect(104 + i * 18, 444, 16, 14, `D${i + 15}`)}</g>
          ))}
        </>
      ))}
      {group('E', (
        <>
          <rect className="bgr" x={498} y={26} width={60} height={24 * 12 + 44} rx={8} />
          <text x={528} y={48} fontSize={18} textAnchor="middle">E</text>
          {Array.from({ length: 24 }, (_, r) => rect(506, 60 + r * 12, 15, 11, `E${r + 1}`))}
          {Array.from({ length: 12 }, (_, b) => <rect key={b} className="bx" x={523} y={60 + b * 24} width={26} height={23} rx={2} />)}
        </>
      ))}
    </svg>
  )
}
