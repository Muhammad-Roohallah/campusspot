import { BaseStore, type Store, emptyCafe } from './store'
import type { IlsMarkState, Snapshot } from '../domain/types'
import { CAFE_SEATS, PARKING_ZONES, ROOMS, SLOT_COUNT, floorIlsIds, spotIds } from '../domain/layout'
import { MIN, startOfDay } from '../domain/time'

const KEY = 'campusspot.demo.v1'
/** The demo clock starts at 11:20 am today (inside the 10:00 to 16:00 peak) so collab rooms and expiry can be shown at any hour. */
const demoStart = () => startOfDay(Date.now()) + (11 * 60 + 20) * MIN
const STALE_DEMO = 6 * 60 * MIN

/** Small deterministic random generator so the demo data looks the same every reset. */
function rng(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Data = Pick<Snapshot, 'cafe' | 'ils' | 'parking' | 'rooms'>

export function seedData(now: number): Data {
  const r = rng(7)
  const data: Data = { cafe: emptyCafe(), ils: {}, parking: {}, rooms: {} }

  // Cafe: 9 of 16 chairs taken.
  const seats = Array<boolean>(CAFE_SEATS).fill(false)
  let k = 0
  while (k < 9) {
    const i = Math.floor(r() * CAFE_SEATS)
    if (!seats[i]) { seats[i] = true; k++ }
  }
  data.cafe = { seats, updatedAt: now - 6 * MIN }

  // ILS: some taken (older marks), a few reported free, the rest not reported.
  for (const [floor, taken, free] of [['G', 26, 6], ['F', 6, 2]] as const) {
    const ids = floorIlsIds(floor)
    let t = 0, f = 0
    while (t < taken) {
      const id = ids[Math.floor(r() * ids.length)]
      if (!data.ils[id]) { data.ils[id] = { state: 'taken', at: now - (5 + Math.floor(r() * 22) * 5) * MIN, device: 'seed' }; t++ }
    }
    while (f < free) {
      const id = ids[Math.floor(r() * ids.length)]
      if (!data.ils[id]) { data.ils[id] = { state: 'free', at: now - (3 + Math.floor(r() * 9) * 5) * MIN, device: 'seed' }; f++ }
    }
  }

  // Parking: zone E full, D nearly full, others partly full. A few are past their end time.
  const fill: Record<string, number> = { A: 0.75, B: 0.6, C: 0.5, D: 0.86, E: 1 }
  for (const z of PARKING_ZONES) {
    for (const id of spotIds(z)) {
      if (r() >= fill[z.id]) continue
      let end: number
      if (z.id === 'E') end = now + (15 + Math.floor(r() * 35) * 5) * MIN
      else if (r() < 0.06) end = now - (1 + Math.floor(r() * 8)) * MIN
      else end = now + (10 + Math.floor(r() * 50) * 5) * MIN
      data.parking[id] = { start: now - 60 * MIN, end, device: 'seed' }
    }
  }

  ROOMS.forEach((room, ri) => {
    data.rooms[room.id] = Array.from({ length: SLOT_COUNT }, () => r() < (ri ? 0.4 : 0.55))
  })
  return data
}

/**
 * Demo backend. State lives in this browser and is mirrored to localStorage, so two tabs of the same
 * browser stay in sync (open the app twice to try "barista toggles, student sees it").
 * It is not shared between devices; that is what SupabaseStore is for.
 */
export class LocalStore extends BaseStore implements Store {
  readonly mode = 'local' as const
  private offset = 0
  private staff = false

  constructor() {
    super()
    if (!this.load()) { this.resetData(); this.save() }
    this.set({ ready: true })
    try {
      window.addEventListener('storage', (e) => { if (e.key === KEY && this.load()) this.poke() })
    } catch { /* not in a browser */ }
  }

  now = (): number => Date.now() + this.offset

  private load(): boolean {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return false
      const d = JSON.parse(raw) as Data & { offset: number; realAt?: number }
      if (!d.realAt || Date.now() - d.realAt > STALE_DEMO) return false
      this.offset = d.offset ?? 0
      this.snap = { ...this.snap, cafe: d.cafe, ils: d.ils, parking: d.parking, rooms: d.rooms, staff: this.staff }
      return true
    } catch { return false }
  }
  private save(): void {
    try {
      const { cafe, ils, parking, rooms } = this.snap
      localStorage.setItem(KEY, JSON.stringify({ cafe, ils, parking, rooms, offset: this.offset, realAt: Date.now() }))
    } catch { /* storage unavailable: demo still works in this tab */ }
  }
  private resetData(): void {
    this.offset = demoStart() - Date.now()
    this.snap = { ...this.snap, ...seedData(this.now()) }
  }
  private commit(patch: Partial<Snapshot>): void { this.set(patch); this.save() }

  async setSeats(indices: number[], taken: boolean): Promise<void> {
    if (!this.snap.staff) return this.fail('Only café staff can change seats.')
    const seats = [...this.snap.cafe.seats]
    indices.forEach((i) => { seats[i] = taken })
    this.commit({ cafe: { seats, updatedAt: this.now() } })
  }
  async setRoomSlot(room: string, slot: number, booked: boolean): Promise<void> {
    if (!this.snap.staff) return this.fail('Only library staff can change bookings.')
    const arr = [...(this.snap.rooms[room] ?? Array<boolean>(SLOT_COUNT).fill(false))]
    arr[slot] = booked
    this.commit({ rooms: { ...this.snap.rooms, [room]: arr } })
  }
  async setIls(id: string, state: IlsMarkState): Promise<void> {
    this.commit({ ils: { ...this.snap.ils, [id]: { state, at: this.now(), device: this.deviceId } } })
  }
  async startParking(spot: string, end: number): Promise<void> {
    this.commit({ parking: { ...this.snap.parking, [spot]: { start: this.now(), end, device: this.deviceId } } })
  }
  async updateParking(spot: string, end: number): Promise<void> {
    const cur = this.snap.parking[spot]
    if (!cur) return
    this.commit({ parking: { ...this.snap.parking, [spot]: { ...cur, end } } })
  }
  async leaveParking(spot: string): Promise<void> {
    const next = { ...this.snap.parking }
    delete next[spot]
    this.commit({ parking: next })
  }

  async signIn(): Promise<string | null> { return 'Demo mode has no accounts. Use the demo staff switch instead.' }
  async signOut(): Promise<void> { this.demo.setStaff(false) }

  private fail(msg: string): void { this.set({ error: msg }) }

  demo = {
    advance: (minutes: number): void => { this.offset += minutes * MIN; this.save(); this.poke() },
    reset: (): void => { this.resetData(); this.commit({ staff: this.staff }) },
    setStaff: (on: boolean): void => { this.staff = on; this.set({ staff: on, staffEmail: on ? 'demo staff' : null }) },
  }
}

