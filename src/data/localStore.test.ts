import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStore, seedData } from './localStore'
import { ilsView, spotView } from '../domain/rules'
import { MIN } from '../domain/time'
import { PARKING_TOTAL } from '../domain/layout'

// Minimal localStorage and window for the node test environment.
const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage

beforeEach(() => mem.clear())

describe('seed data', () => {
  it('is plausible', () => {
    const d = seedData(Date.now())
    expect(d.cafe.seats.length).toBe(16)
    expect(d.cafe.seats.filter(Boolean).length).toBe(9)
    expect(Object.keys(d.parking).length).toBeLessThanOrEqual(PARKING_TOTAL)
    expect(Object.keys(d.rooms)).toEqual(['R1', 'R2'])
  })
})

describe('LocalStore', () => {
  it('staff-only actions are refused for students', async () => {
    const s = new LocalStore()
    const before = s.getSnapshot().cafe.seats[0]
    await s.setSeats([0], !before)
    expect(s.getSnapshot().cafe.seats[0]).toBe(before)
    expect(s.getSnapshot().error).toMatch(/staff/i)
  })
  it('staff can toggle chairs and the update time moves', async () => {
    const s = new LocalStore()
    s.demo.setStaff(true)
    await s.setSeats([0, 1], true)
    const snap = s.getSnapshot()
    expect(snap.cafe.seats[0] && snap.cafe.seats[1]).toBe(true)
    expect(snap.cafe.updatedAt).not.toBeNull()
  })
  it('students can mark an ILS taken, then free', async () => {
    const s = new LocalStore()
    await s.setIls('A1-1', 'taken')
    expect(ilsView(s.getSnapshot().ils['A1-1'], s.now())).toBe('taken')
    await s.setIls('A1-1', 'free')
    expect(ilsView(s.getSnapshot().ils['A1-1'], s.now())).toBe('free')
  })
  it('parking: log, edit end time, leave', async () => {
    const s = new LocalStore()
    const spot = 'A1'
    await s.leaveParking(spot)
    await s.startParking(spot, s.now() + 60 * MIN)
    expect(spotView(s.getSnapshot().parking[spot], s.now())).toBe('taken')
    await s.updateParking(spot, s.now() + 120 * MIN)
    expect(s.getSnapshot().parking[spot].end).toBeGreaterThan(s.now() + 100 * MIN)
    await s.leaveParking(spot)
    expect(spotView(s.getSnapshot().parking[spot], s.now())).toBe('free')
  })
  it('the demo clock releases spaces and expires marks', async () => {
    const s = new LocalStore()
    await s.setIls('B1-1', 'taken')
    s.demo.advance(121)
    expect(ilsView(s.getSnapshot().ils['B1-1'], s.now())).toBe('unknown')
  })
})
