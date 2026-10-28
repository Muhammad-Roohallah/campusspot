/**
 * The physical layouts, taken from the project sketches. Everything that draws a map or counts
 * spaces reads from here, so the diagram and the numbers cannot drift apart.
 */

// ---------- Parking (shaded lot, 124 spaces) ----------
export interface ParkingZone {
  id: 'A' | 'B' | 'C' | 'D' | 'E'
  /** col: boxes in a column with spaces on both sides. one: spaces on one side only. line: single spaces, top and bottom rows. */
  kind: 'col' | 'one' | 'line'
  count: number
  boxes?: number
}
export const PARKING_ZONES: ParkingZone[] = [
  { id: 'A', kind: 'col', count: 24, boxes: 6 },
  { id: 'B', kind: 'col', count: 24, boxes: 6 },
  { id: 'C', kind: 'col', count: 24, boxes: 6 },
  { id: 'D', kind: 'line', count: 28 },
  { id: 'E', kind: 'one', count: 24, boxes: 12 },
]
export const parkingZone = (id: string) => PARKING_ZONES.find((z) => z.id === id)
export const spotIds = (z: ParkingZone) => Array.from({ length: z.count }, (_, i) => `${z.id}${i + 1}`)
export const PARKING_TOTAL = PARKING_ZONES.reduce((n, z) => n + z.count, 0) // 124

// ---------- Library ILS ----------
export type FloorId = 'G' | 'F'
export const FLOORS: Record<FloorId, string> = { G: 'Ground floor', F: '1st floor' }

export interface IlsSection {
  id: 'A' | 'B' | 'C'
  floor: FloorId
  name: string
  /** h: boxes side by side (lines run vertically). v: boxes stacked (lines run horizontally). */
  dir: 'h' | 'v'
  boxes: number
  /** ILS per box: 4 means 2 desks against each bounding line, 2 means 1 desk against each. */
  per: 2 | 4
}
export const ILS_SECTIONS: IlsSection[] = [
  { id: 'A', floor: 'G', name: 'Row A', dir: 'h', boxes: 9, per: 4 },
  { id: 'B', floor: 'G', name: 'Column B', dir: 'v', boxes: 8, per: 4 },
  { id: 'C', floor: 'F', name: 'Row C', dir: 'h', boxes: 9, per: 2 },
]
export const ilsSection = (id: string) => ILS_SECTIONS.find((s) => s.id === id)
export const ilsId = (s: IlsSection, box: number, n: number) => `${s.id}${box}-${n}`
export const ilsIds = (s: IlsSection) => {
  const out: string[] = []
  for (let b = 1; b <= s.boxes; b++) for (let n = 1; n <= s.per; n++) out.push(ilsId(s, b, n))
  return out
}
export const floorIlsIds = (f: FloorId) => ILS_SECTIONS.filter((s) => s.floor === f).flatMap(ilsIds)
export const ILS_TOTAL = ILS_SECTIONS.reduce((n, s) => n + s.boxes * s.per, 0) // 86

export interface Room { id: string; name: string; floor: FloorId; short: string }
export const ROOMS: Room[] = [
  { id: 'R1', name: 'Collab room 1', floor: 'G', short: '1' },
  { id: 'R2', name: 'Collab room 2', floor: 'G', short: '2' },
]
/** Collab rooms: 8:30 am to 7:30 pm in one-hour slots. */
export const SLOT_START_MIN = 8 * 60 + 30
export const SLOT_COUNT = 11
export const SLOT_MIN = 60

// ---------- Cafe ----------
export const CAFE_TABLES = 4
export const CAFE_CHAIRS_PER_TABLE = 4
export const CAFE_SEATS = CAFE_TABLES * CAFE_CHAIRS_PER_TABLE // 16
