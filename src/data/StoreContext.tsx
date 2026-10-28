import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { Store } from './store'
import { createStore } from './index'
import type { Snapshot } from '../domain/types'

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children, store }: { children: ReactNode; store?: Store }) {
  const s = useMemo(() => store ?? createStore(), [store])
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>
}
export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}
export function useSnapshot(): Snapshot {
  const s = useStore()
  return useSyncExternalStore(s.subscribe, s.getSnapshot)
}
/** Current time from the store (real time, or the demo clock), refreshed every 20 seconds and on any data change. */
export function useNow(): number {
  const s = useStore()
  const [now, setNow] = useState(() => s.now())
  useEffect(() => {
    const tick = () => setNow(s.now())
    const id = setInterval(tick, 20_000)
    const off = s.subscribe(tick)
    tick()
    return () => { clearInterval(id); off() }
  }, [s])
  return now
}
