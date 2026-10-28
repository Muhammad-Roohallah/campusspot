import { CAFE_CHAIRS_PER_TABLE, CAFE_TABLES } from '../domain/layout'

const CENTERS = [[90, 82], [250, 82], [90, 252], [250, 252]] as const
const OFFS = [[0, -48], [48, 0], [0, 48], [-48, 0]] as const // chair order: north, east, south, west

/** Four round tables with four chairs each, like choosing seats on a plane or in a cinema. */
export function CafeMap({ seats, canEdit, onChair, onTable }: { seats: boolean[]; canEdit: boolean; onChair: (i: number) => void; onTable: (t: number) => void }) {
  return (
    <svg className="cafe-svg" viewBox="0 0 340 340" role="group" aria-label="Café seat map, four tables with four chairs each">
      {Array.from({ length: CAFE_TABLES }, (_, t) => {
        const [cx, cy] = CENTERS[t]
        return (
          <g key={t}>
            <circle className="tbl" cx={cx} cy={cy} r={32} />
            <text x={cx} y={cy + 5} textAnchor="middle">T{t + 1}</text>
            {canEdit && (
              <circle className="hit" cx={cx} cy={cy} r={32} role="button" tabIndex={0} aria-label={`Table ${t + 1}, toggle all chairs`}
                onClick={() => onTable(t)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTable(t) } }} />
            )}
            {Array.from({ length: CAFE_CHAIRS_PER_TABLE }, (_, c) => {
              const i = t * CAFE_CHAIRS_PER_TABLE + c
              const x = cx + OFFS[c][0], y = cy + OFFS[c][1]
              const taken = seats[i]
              const label = `Table ${t + 1}, chair ${c + 1}, ${taken ? 'taken' : 'free'}`
              return (
                <g key={i}>
                  <circle className={`chair ${taken ? 'taken' : 'free'}`} cx={x} cy={y} r={18} />
                  {taken && <path className="x" d={`M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}`} />}
                  {canEdit ? (
                    <circle className="hit" cx={x} cy={y} r={22} role="button" tabIndex={0} aria-label={label} aria-pressed={taken}
                      onClick={() => onChair(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChair(i) } }} />
                  ) : <title>{label}</title>}
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
