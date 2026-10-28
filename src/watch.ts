import { useCallback, useEffect, useRef, useState } from 'react'
import { useNow, useSnapshot } from './data/StoreContext'
import { useToast } from './components/Toast'
import { PARKING_ZONES, spotIds } from './domain/layout'
import { spotView } from './domain/rules'

const KEY = 'campusspot.watch'
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[] } catch { return [] } }
const write = (v: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ } }

/** Zones the student asked to be told about. Stored on this device only. */
export function useWatchedZones() {
  const [watched, setWatched] = useState<string[]>(read)
  const toggle = useCallback((id: string) => {
    setWatched((w) => { const n = w.includes(id) ? w.filter((x) => x !== id) : [...w, id]; write(n); return n })
  }, [])
  return { watched, toggle }
}

/** Runs for the whole app: when a watched zone goes from full to having a free space, tell the student. */
export function useZoneWatcher() {
  const snap = useSnapshot()
  const now = useNow()
  const toast = useToast()
  const prev = useRef<Record<string, number>>({})
  useEffect(() => {
    const watched = read()
    const next: Record<string, number> = {}
    for (const z of PARKING_ZONES) {
      const free = spotIds(z).filter((id) => spotView(snap.parking[id], now) === 'free')
      next[z.id] = free.length
      if (watched.includes(z.id) && prev.current[z.id] === 0 && free.length > 0) toast(`Zone ${z.id} has a free space (${free[0]}).`)
    }
    prev.current = next
  }, [snap.parking, now, toast])
}
