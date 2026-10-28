import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { BaseStore, type Store, emptyCafe } from './store'
import type { IlsMark, IlsMarkState, ParkingLog, Snapshot } from '../domain/types'
import { CAFE_SEATS, SLOT_COUNT } from '../domain/layout'
import { dayKey } from '../domain/time'
import { spotView } from '../domain/rules'

interface CafeRow { seat: number; taken: boolean; updated_at: string }
interface IlsRow { ils_id: string; state: IlsMarkState; marked_at: string; device_id: string }
interface ParkRow { spot_id: string; started_at: string; ends_at: string; device_id: string }
interface RoomRow { room_id: string; slot: number }

const iso = (ms: number) => new Date(ms).toISOString()

/**
 * Live backend on Supabase (PostgreSQL). Reads are public. Students write ILS marks and parking logs
 * anonymously. Only signed-in staff can write café seats and room bookings. All of that is enforced by
 * Row Level Security policies in supabase/schema.sql, not by this code, so a modified client cannot bypass it.
 * Changes reach every open browser through Supabase Realtime; we then re-read the (small) tables.
 */
export class SupabaseStore extends BaseStore implements Store {
  readonly mode = 'supabase' as const
  private client: SupabaseClient
  private refreshTimer: ReturnType<typeof setTimeout> | undefined

  constructor(url: string, anonKey: string) {
    super()
    this.client = createClient(url, anonKey)
    void this.start()
  }

  now = (): number => Date.now()

  private async start(): Promise<void> {
    this.client.auth.onAuthStateChange((_event, session) => {
      void this.checkStaff(session?.user.id ?? null, session?.user.email ?? null)
    })
    const { data } = await this.client.auth.getSession()
    await this.checkStaff(data.session?.user.id ?? null, data.session?.user.email ?? null)
    await this.refresh()
    this.client
      .channel('campusspot-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => this.scheduleRefresh())
      .subscribe()
    // Safety nets: realtime can drop on bad networks, so also re-read now and then and when the tab returns.
    setInterval(() => void this.refresh(), 30_000)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void this.refresh() })
  }

  private scheduleRefresh(): void {
    clearTimeout(this.refreshTimer)
    this.refreshTimer = setTimeout(() => void this.refresh(), 150)
  }

  private async checkStaff(userId: string | null, email: string | null): Promise<void> {
    if (!userId) return this.set({ staff: false, staffEmail: null })
    const { data } = await this.client.from('staff').select('user_id').eq('user_id', userId).maybeSingle()
    this.set({ staff: !!data, staffEmail: data ? email : null })
  }

  async refresh(): Promise<void> {
    const day = dayKey(this.now())
    const [cafe, ils, park, rooms] = await Promise.all([
      this.client.from('cafe_seats').select('seat,taken,updated_at'),
      this.client.from('ils_marks').select('ils_id,state,marked_at,device_id'),
      this.client.from('parking_logs').select('spot_id,started_at,ends_at,device_id'),
      this.client.from('room_bookings').select('room_id,slot').eq('day', day),
    ])
    const failed = cafe.error ?? ils.error ?? park.error ?? rooms.error
    if (failed) return this.set({ error: 'Could not reach the live data. Showing the last known state.', ready: true })

    const seats = emptyCafe().seats
    let updatedAt: number | null = null
    for (const r of (cafe.data ?? []) as CafeRow[]) {
      if (r.seat >= 0 && r.seat < CAFE_SEATS) seats[r.seat] = r.taken
      const t = Date.parse(r.updated_at)
      if (updatedAt == null || t > updatedAt) updatedAt = t
    }
    const ilsMap: Record<string, IlsMark> = {}
    for (const r of (ils.data ?? []) as IlsRow[]) ilsMap[r.ils_id] = { state: r.state, at: Date.parse(r.marked_at), device: r.device_id }
    const parking: Record<string, ParkingLog> = {}
    for (const r of (park.data ?? []) as ParkRow[]) parking[r.spot_id] = { start: Date.parse(r.started_at), end: Date.parse(r.ends_at), device: r.device_id }
    const roomMap: Snapshot['rooms'] = {}
    for (const r of (rooms.data ?? []) as RoomRow[]) {
      roomMap[r.room_id] ??= Array<boolean>(SLOT_COUNT).fill(false)
      roomMap[r.room_id][r.slot] = true
    }
    this.set({ cafe: { seats, updatedAt }, ils: ilsMap, parking, rooms: roomMap, ready: true, error: this.snap.error?.startsWith('Could not reach') ? null : this.snap.error })
  }

  /** Apply the change on screen immediately, then write it. If the write fails, show why and re-read the truth. */
  private async write(optimistic: Partial<Snapshot>, op: () => PromiseLike<{ error: { message: string; code?: string } | null }>, friendly?: (code?: string) => string | null): Promise<void> {
    this.set(optimistic)
    const { error } = await op()
    if (error) {
      this.set({ error: friendly?.(error.code) ?? 'That change was not saved. ' + error.message })
      await this.refresh()
    }
  }

  async setSeats(indices: number[], taken: boolean): Promise<void> {
    const seats = [...this.snap.cafe.seats]
    indices.forEach((i) => { seats[i] = taken })
    const at = this.now()
    await this.write({ cafe: { seats, updatedAt: at } }, () =>
      this.client.from('cafe_seats').upsert(indices.map((seat) => ({ seat, taken, updated_at: iso(at) })), { onConflict: 'seat' }),
      () => 'Only signed-in café staff can change seats.')
  }

  async setRoomSlot(room: string, slot: number, booked: boolean): Promise<void> {
    const arr = [...(this.snap.rooms[room] ?? Array<boolean>(SLOT_COUNT).fill(false))]
    arr[slot] = booked
    const day = dayKey(this.now())
    await this.write({ rooms: { ...this.snap.rooms, [room]: arr } }, () =>
      booked
        ? this.client.from('room_bookings').upsert({ room_id: room, day, slot }, { onConflict: 'room_id,day,slot' })
        : this.client.from('room_bookings').delete().eq('room_id', room).eq('day', day).eq('slot', slot),
      () => 'Only signed-in library staff can change bookings.')
  }

  async setIls(id: string, state: IlsMarkState): Promise<void> {
    const at = this.now()
    await this.write({ ils: { ...this.snap.ils, [id]: { state, at, device: this.deviceId } } }, () =>
      this.client.from('ils_marks').upsert({ ils_id: id, state, marked_at: iso(at), device_id: this.deviceId }, { onConflict: 'ils_id' }))
  }

  async startParking(spot: string, end: number): Promise<void> {
    const start = this.now()
    const existing = this.snap.parking[spot]
    if (existing && spotView(existing, start) !== 'free') {
      this.set({ error: 'Someone just logged that space. Pick another one.' })
      return
    }
    const row = { spot_id: spot, started_at: iso(start), ends_at: iso(end), device_id: this.deviceId }
    await this.write({ parking: { ...this.snap.parking, [spot]: { start, end, device: this.deviceId } } }, () =>
      existing ? this.client.from('parking_logs').upsert(row, { onConflict: 'spot_id' }) : this.client.from('parking_logs').insert(row),
      (code) => (code === '23505' ? 'Someone just logged that space. Pick another one.' : null))
  }

  async updateParking(spot: string, end: number): Promise<void> {
    const cur = this.snap.parking[spot]
    if (!cur) return
    await this.write({ parking: { ...this.snap.parking, [spot]: { ...cur, end } } }, () =>
      this.client.from('parking_logs').update({ ends_at: iso(end) }).eq('spot_id', spot))
  }

  async leaveParking(spot: string): Promise<void> {
    const next = { ...this.snap.parking }
    delete next[spot]
    await this.write({ parking: next }, () => this.client.from('parking_logs').delete().eq('spot_id', spot))
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) return 'Sign in failed. Check the email and password.'
    return null
  }
  async signOut(): Promise<void> { await this.client.auth.signOut() }
}
