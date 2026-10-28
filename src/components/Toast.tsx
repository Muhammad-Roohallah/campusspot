import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Notify = (message: string) => void
const Ctx = createContext<Notify>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const notify = useCallback<Notify>((m) => {
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 4500)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <Ctx.Provider value={notify}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  )
}
