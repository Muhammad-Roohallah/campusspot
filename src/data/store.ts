import type { CafeState, IlsMarkState, Snapshot } from '../domain/types'
import { CAFE_SEATS } from '../domain/layout'

/**
 * The only thing the screens know about data. There are two implementations:
 * LocalStore (demo, runs in the browser) and SupabaseStore (live, shared by everyone).
 * Screens never import either one directly, so swapping the backend never touches the UI.
 */
export interface Store {
  readonly mode: 'local' | 'supabase'
  /** Random id kept on this device so the app can tell which spot or ILS is "mine" without accounts. */
  readonly deviceId: string
  now(): number
  getSnapshot(): Snapshot
  subscribe(cb: () => void): () => void

  // Staff only (café seats, collab room slots). Enforced by database policies in live mode.
  setSeats(indices: number[], taken: boolean): Promise<void>
  setRoomSlot(room: string, slot: number, booked: boolean): Promise<void>
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>

  // Students (anonymous)
  setIls(id: string, state: IlsMarkState): Promise<void>
  startParking(spot: string, end: number): Promise<void>
  updateParking(spot: string, end: number): Promise<void>
  leaveParking(spot: string): Promise<void>

  clearError(): void
  /** Present only in local demo mode. */
  demo?: { advance(minutes: number): void; reset(): void; setStaff(on: boolean): void }
}

export const emptyCafe = (): CafeState => ({ seats: Array<boolean>(CAFE_SEATS).fill(false), updatedAt: null })

export const emptySnapshot = (): Snapshot => ({
  ready: false,
  error: null,
  staff: false,
  staffEmail: null,
  cafe: emptyCafe(),
  ils: {},
  parking: {},
  rooms: {},
})

export function deviceId(): string {
  const KEY = 'campusspot.device'
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'session-' + Math.random().toString(36).slice(2)
  }
}

/** Shared plumbing: holds the current immutable snapshot and notifies subscribers. */
export abstract class BaseStore {
  protected snap: Snapshot = emptySnapshot()
  private listeners = new Set<() => void>()
  readonly deviceId = deviceId()

  getSnapshot = (): Snapshot => this.snap
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
  protected set(patch: Partial<Snapshot>): void {
    this.snap = { ...this.snap, ...patch }
    this.listeners.forEach((l) => l())
  }
  /** Tell subscribers something outside the snapshot changed (for example the demo clock). */
  protected poke(): void {
    this.listeners.forEach((l) => l())
  }
  clearError = (): void => {
    if (this.snap.error) this.set({ error: null })
  }
}
