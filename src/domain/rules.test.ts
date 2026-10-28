import { describe, expect, it } from 'vitest'
import { CAFE_STALE, FREE_TTL, PARKING_GRACE, TAKEN_TTL, cafeFree, cafeStale, currentSlot, ilsView, level, slotView, spotView } from './rules'
import { ILS_TOTAL, ILS_SECTIONS, PARKING_TOTAL, SLOT_COUNT, ilsIds } from './layout'
import { MIN } from './time'

const at = (h: number, m = 0) => new Date(2026, 9, 27, h, m).getTime()

describe('layout matches the sketches', () => {
  it('parking has 124 spaces', () => expect(PARKING_TOTAL).toBe(124))
  it('library has 86 ILS: 36 + 32 on the ground floor, 18 on the 1st floor', () => {
    expect(ILS_TOTAL).toBe(86)
    expect(ILS_SECTIONS.map((s) => ilsIds(s).length)).toEqual([36, 32, 18])
  })
  it('ILS ids are unique', () => {
    const all = ILS_SECTIONS.flatMap(ilsIds)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('ILS marks', () => {
  const now = at(12)
  it('is unknown when nobody marked it', () => expect(ilsView(undefined, now)).toBe('unknown'))
  it('taken marks last 2 hours', () => {
    expect(ilsView({ state: 'taken', at: now - TAKEN_TTL + MIN, device: 'x' }, now)).toBe('taken')
    expect(ilsView({ state: 'taken', at: now - TAKEN_TTL, device: 'x' }, now)).toBe('unknown')
  })
  it('free reports last 1 hour, then go back to grey', () => {
    expect(ilsView({ state: 'free', at: now - FREE_TTL + MIN, device: 'x' }, now)).toBe('free')
    expect(ilsView({ state: 'free', at: now - FREE_TTL, device: 'x' }, now)).toBe('unknown')
  })
})

describe('parking', () => {
  const now = at(12)
  it('free with no log', () => expect(spotView(undefined, now)).toBe('free'))
  it('taken until the logged end time', () => expect(spotView({ start: now - 60 * MIN, end: now + MIN, device: 'x' }, now)).toBe('taken'))
  it('past end time is flagged, then released after the grace period', () => {
    expect(spotView({ start: now - 90 * MIN, end: now - 5 * MIN, device: 'x' }, now)).toBe('over')
    expect(spotView({ start: now - 90 * MIN, end: now - PARKING_GRACE, device: 'x' }, now)).toBe('free')
  })
})

describe('levels', () => {
  it('full at zero', () => expect(level(0, 24)).toBe('full'))
  it('busy at a quarter or less', () => { expect(level(6, 24)).toBe('busy'); expect(level(7, 24)).toBe('ok') })
})

describe('collab slots', () => {
  it('has 11 slots from 8:30 am', () => expect(SLOT_COUNT).toBe(11))
  it('current slot', () => {
    expect(currentSlot(at(8, 29))).toBe(-1)
    expect(currentSlot(at(8, 30))).toBe(0)
    expect(currentSlot(at(11, 20))).toBe(2) // 10:30 to 11:30
    expect(currentSlot(at(19, 29))).toBe(10)
    expect(currentSlot(at(19, 30))).toBe(-1)
  })
  it('past, booked and open', () => {
    const booked = Array<boolean>(SLOT_COUNT).fill(false)
    booked[3] = true
    expect(slotView(booked, 0, at(11, 20))).toBe('past')
    expect(slotView(booked, 2, at(11, 20))).toBe('open')
    expect(slotView(booked, 3, at(11, 20))).toBe('booked')
  })
})

describe('cafe', () => {
  it('counts free chairs and flags stale data', () => {
    const seats = Array<boolean>(16).fill(false)
    seats[0] = seats[1] = true
    expect(cafeFree({ seats, updatedAt: at(12) })).toBe(14)
    expect(cafeStale({ seats, updatedAt: at(12) }, at(12) + CAFE_STALE - MIN)).toBe(false)
    expect(cafeStale({ seats, updatedAt: at(12) }, at(12) + CAFE_STALE + MIN)).toBe(true)
    expect(cafeStale({ seats, updatedAt: null }, at(12))).toBe(true)
  })
})
