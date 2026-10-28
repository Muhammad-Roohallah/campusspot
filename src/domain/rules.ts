import type { CafeState, IlsMark, IlsView, Level, ParkingLog, SlotView, SpotView } from './types'
import { MIN, startOfDay } from './time'
import { SLOT_MIN, SLOT_COUNT, SLOT_START_MIN } from './layout'

/** A "taken" mark clears itself after this long, in case the student forgets to leave. */
export const TAKEN_TTL = 120 * MIN
/** A "free" report is trusted for a shorter time, because someone can sit down any moment. */
export const FREE_TTL = 60 * MIN
/** A parking space is released this long after its logged end time. */
export const PARKING_GRACE = 10 * MIN
/** Cafe data older than this is flagged as possibly out of date. */
export const CAFE_STALE = 30 * MIN

export function ilsView(m: IlsMark | undefined, now: number): IlsView {
  if (!m) return 'unknown'
  if (m.state === 'taken') return m.at + TAKEN_TTL > now ? 'taken' : 'unknown'
  return m.at + FREE_TTL > now ? 'free' : 'unknown'
}
export function ilsExpiry(m: IlsMark): number {
  return m.at + (m.state === 'taken' ? TAKEN_TTL : FREE_TTL)
}

export function spotView(p: ParkingLog | undefined, now: number): SpotView {
  if (!p) return 'free'
  if (p.end + PARKING_GRACE <= now) return 'free'
  return p.end < now ? 'over' : 'taken'
}

/** Same thresholds for every space type: full at zero, busy at a quarter or less, otherwise available. */
export function level(free: number, total: number): Level {
  if (free <= 0) return 'full'
  return free <= total / 4 ? 'busy' : 'ok'
}
export const LEVEL_LABEL: Record<Level, string> = { ok: 'Available', busy: 'Busy', full: 'Full' }

export function slotStart(now: number, i: number): number {
  return startOfDay(now) + (SLOT_START_MIN + i * SLOT_MIN) * MIN
}
export function slotView(booked: boolean[] | undefined, i: number, now: number): SlotView {
  if (slotStart(now, i) + SLOT_MIN * MIN <= now) return 'past'
  return booked?.[i] ? 'booked' : 'open'
}
/** Index of the slot running now, or -1 outside opening hours. */
export function currentSlot(now: number): number {
  const i = Math.floor((now - slotStart(now, 0)) / (SLOT_MIN * MIN))
  return i >= 0 && i < SLOT_COUNT ? i : -1
}

export function cafeFree(c: CafeState): number {
  return c.seats.filter((t) => !t).length
}
export function cafeStale(c: CafeState, now: number): boolean {
  return c.updatedAt == null || now - c.updatedAt > CAFE_STALE
}

/** The ILS this device has marked taken (at most one), if the mark is still valid. */
export function mineIls(ils: Record<string, IlsMark>, device: string, now: number): string | null {
  for (const [id, m] of Object.entries(ils)) if (m.device === device && ilsView(m, now) === 'taken') return id
  return null
}
/** The parking space this device has logged (at most one), if it is still held. */
export function mineParking(parking: Record<string, ParkingLog>, device: string, now: number): string | null {
  for (const [id, p] of Object.entries(parking)) if (p.device === device && spotView(p, now) !== 'free') return id
  return null
}
