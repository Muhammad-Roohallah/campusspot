import type { Snapshot } from '../domain/types'
import type { Store } from '../data/store'
import { CAFE_SEATS, ROOMS, floorIlsIds } from '../domain/layout'
import { cafeFree, ilsView, slotView } from '../domain/rules'
import { MIN, startOfDay } from '../domain/time'

/** Everything a task needs to decide whether the participant did it. */
export interface Ctx { snap: Snapshot; now: number; device: string }
/** Facts remembered while a task runs (milestones, the desk we placed the participant at). */
export interface Mem { desk?: string; s1?: boolean; s2?: boolean; s3?: boolean }

export interface Question { text: string; options: string[]; correct: (c: Ctx) => string }
export interface TaskDef {
  id: string
  title: string
  text: (mem: Mem) => string
  question?: Question
  /** Runs once when the task is shown, before the timer starts. Returns facts to remember. */
  prepare?: (store: Store, c: Ctx) => Mem
  /** Runs on every data change while the task is running. Returns the updated memory. */
  observe?: (c: Ctx, mem: Mem) => Mem
  /** Success for tasks that change data. Question tasks are judged by the answer instead. */
  check?: (c: Ctx, mem: Mem) => boolean
  /** How many of the task's steps were completed (for tasks with several steps). */
  steps?: (mem: Mem) => { done: number; of: number }
}

const own = (snap: Snapshot, device: string) => Object.entries(snap.ils).filter(([, m]) => m.device === device)
const floorF = new Set(floorIlsIds('F'))
const at = (now: number, h: number, m: number) => startOfDay(now) + (h * 60 + m) * MIN
const ownParking = (snap: Snapshot, device: string) => Object.entries(snap.parking).find(([, p]) => p.device === device)

export const TASKS: TaskDef[] = [
  {
    id: 'E1',
    title: 'Café seat',
    text: () => 'You are at the library and want a coffee and somewhere to sit in the café. Find out how many chairs are free right now.',
    question: {
      text: 'How many chairs does the app show as free in the café?',
      options: ['4', '5', '6', '7', '8', '9', '10', 'I could not tell'],
      correct: (c) => String(cafeFree(c.snap.cafe)),
    },
  },
  {
    id: 'E2',
    title: 'Mark a desk',
    text: () => 'You need a desk on the first floor of the library to study. Find a free desk and tell the app you are sitting there.',
    check: (c) => own(c.snap, c.device).some(([id, m]) => m.state === 'taken' && floorF.has(id)),
  },
  {
    id: 'E3',
    title: 'Leave a desk',
    prepare: (store, c) => {
      const mine = own(c.snap, c.device).find(([, m]) => m.state === 'taken')
      if (mine) return { desk: mine[0] }
      const id = floorIlsIds('F').find((d) => ilsView(c.snap.ils[d], c.now) === 'unknown') ?? floorIlsIds('F')[0]
      void store.setIls(id, 'taken')
      return { desk: id }
    },
    text: (m) => `Your class is about to start. The app has you marked at desk ${m.desk ?? 'on the first floor'}. Tell the app that you are leaving.`,
    check: (c, m) => !own(c.snap, c.device).some(([, x]) => x.state === 'taken') && !!m.desk && c.snap.ils[m.desk]?.state === 'free',
  },
  {
    id: 'E4',
    title: 'Collab room',
    text: () => 'You and three friends want a collaboration room at 2:30 pm. Find out whether Room 1 is free then.',
    question: {
      text: 'Does the app show Room 1 as free at 2:30 pm?',
      options: ['Free', 'Booked', 'I could not tell'],
      correct: (c) => (slotView(c.snap.rooms[ROOMS[0].id], 6, c.now) === 'open' ? 'Free' : 'Booked'),
    },
  },
  {
    id: 'E5',
    title: 'Log parking',
    text: () => 'You drive in and plan to stay until about 3 pm. Log your parking in a zone that has space. Then you decide to stay until about 4 pm, so update it. Finally you leave: tell the app.',
    observe: (c, m) => {
      const p = ownParking(c.snap, c.device)
      const n = { ...m }
      if (p && p[1].end >= at(c.now, 14, 45) && p[1].end <= at(c.now, 15, 15)) n.s1 = true
      if (p && p[1].end >= at(c.now, 15, 45) && p[1].end <= at(c.now, 16, 15)) n.s2 = true
      if (!p && n.s2) n.s3 = true
      return n.s1 === m.s1 && n.s2 === m.s2 && n.s3 === m.s3 ? m : n
    },
    steps: (m) => ({ done: [m.s1, m.s2, m.s3].filter(Boolean).length, of: 3 }),
    check: (_c, m) => !!(m.s1 && m.s2 && m.s3),
  },
  {
    id: 'E6',
    title: 'Parking alert',
    text: () => 'Zone E is full. You would like the app to tell you when a space opens there. Set that up.',
    check: () => { try { return (JSON.parse(localStorage.getItem('campusspot.watch') ?? '[]') as string[]).includes('E') } catch { return false } },
  },
]

export const CAFE_TOTAL = CAFE_SEATS
