import { describe, expect, it } from 'vitest'
import { decode, encode, type Report } from './results'
import { TASKS, type Ctx } from './tasks'
import { LocalStore, seedData } from '../data/localStore'
import { floorIlsIds } from '../domain/layout'
import { MIN, startOfDay } from '../domain/time'

const rep: Report = { v: 1, p: 'P-TEST', w: 390, at: '2026-11-26T10:00:00Z', r: [{ i: 'E1', o: 1, m: 12345, t: 4, s: 1, g: 0, a: '7', q: 6, n: 'ñ café ✓' }] }

describe('results code', () => {
  it('round-trips, including non-ASCII comments', () => {
    const code = encode(rep)
    expect(code.startsWith('CS1.')).toBe(true)
    expect(code).not.toMatch(/[+/=\s]/)
    expect(decode(code)).toEqual(rep)
  })
})

function ctx(): { c: () => Ctx; store: LocalStore } {
  const store = new LocalStore()
  return { store, c: () => ({ snap: store.getSnapshot(), now: store.now(), device: store.deviceId }) }
}
const T = (id: string) => TASKS.find((t) => t.id === id)!

describe('task checks', () => {
  it('E1 and E4 expect the seeded answers', () => {
    const { c } = ctx()
    expect(T('E1').question!.correct(c())).toBe('7')
    expect(['Free', 'Booked']).toContain(T('E4').question!.correct(c()))
  })
  it('E2 needs an own mark on the 1st floor, not the ground floor', async () => {
    const { store, c } = ctx()
    expect(T('E2').check!(c(), {})).toBe(false)
    await store.setIls('A1-1', 'taken')
    expect(T('E2').check!(c(), {})).toBe(false)
    const id = floorIlsIds('F').find((d) => !store.getSnapshot().ils[d])!
    await store.setIls(id, 'taken')
    expect(T('E2').check!(c(), {})).toBe(true)
  })
  it('E3 places the participant if needed, then succeeds only after they leave', async () => {
    const { store, c } = ctx()
    const mem = T('E3').prepare!(store, c())
    expect(mem.desk).toBeTruthy()
    expect(T('E3').check!(c(), mem)).toBe(false)
    await store.setIls(mem.desk!, 'free')
    expect(T('E3').check!(c(), mem)).toBe(true)
  })
  it('E5 needs all three steps in order', async () => {
    const { store, c } = ctx()
    const day = startOfDay(store.now())
    const free = Object.keys(store.getSnapshot().parking)
    const spot = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'].find((s) => !free.includes(s))!
    let mem = T('E5').observe!(c(), {})
    await store.startParking(spot, day + (15 * 60) * MIN)
    mem = T('E5').observe!(c(), mem)
    expect(mem.s1).toBe(true)
    await store.updateParking(spot, day + (16 * 60) * MIN)
    mem = T('E5').observe!(c(), mem)
    expect(mem.s2).toBe(true)
    expect(T('E5').check!(c(), mem)).toBe(false)
    await store.leaveParking(spot)
    mem = T('E5').observe!(c(), mem)
    expect(T('E5').check!(c(), mem)).toBe(true)
    expect(T('E5').steps!(mem)).toEqual({ done: 3, of: 3 })
  })
  it('seed still has the facts the kit relies on', () => {
    const d = seedData(Date.now())
    expect(d.cafe.seats.filter(Boolean).length).toBe(9)
  })
})
