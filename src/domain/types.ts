export type IlsMarkState = 'taken' | 'free'
export interface IlsMark { state: IlsMarkState; at: number; device: string }
export interface ParkingLog { start: number; end: number; device: string }
export interface CafeState { seats: boolean[]; updatedAt: number | null } // true = taken

/** What a student sees for one ILS after expiry rules are applied. */
export type IlsView = 'unknown' | 'taken' | 'free'
export type SpotView = 'free' | 'taken' | 'over'
export type Level = 'ok' | 'busy' | 'full'
export type SlotView = 'open' | 'booked' | 'past'

export interface Snapshot {
  ready: boolean
  error: string | null
  staff: boolean
  staffEmail: string | null
  cafe: CafeState
  ils: Record<string, IlsMark>
  parking: Record<string, ParkingLog>
  /** booked[roomId][slotIndex] for today */
  rooms: Record<string, boolean[]>
}
