import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNow, useSnapshot, useStore } from '../data/StoreContext'
import { encode, type TaskResult } from './results'
import { TASKS, type Ctx, type Mem } from './tasks'

const KEY = 'campusspot.study.v1'
const WATCH_KEY = 'campusspot.watch'

type Phase = 'welcome' | 'intro' | 'running' | 'question' | 'rate' | 'finished'
interface State {
  v: 1
  code: string
  phase: Phase
  idx: number
  startedAt: string
  taskStart: number
  taps: number
  screens: number
  mem: Mem
  cur: Partial<TaskResult>
  results: TaskResult[]
}

const newCode = () => 'P-' + Math.random().toString(36).slice(2, 6).toUpperCase()
const fresh = (): State => ({ v: 1, code: newCode(), phase: 'welcome', idx: 0, startedAt: new Date().toISOString(), taskStart: 0, taps: 0, screens: 0, mem: {}, cur: {}, results: [] })

function load(): State | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as State) : null } catch { return null }
}
function save(s: State): void { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode: the study still works until reload */ } }

/** Study mode is on with ?study=1 in the address, and stays on until the session is finished. ?study=0 clears it. */
export function studyEnabled(): boolean {
  try {
    const q = new URLSearchParams(location.search)
    if (q.get('study') === '0') { localStorage.removeItem(KEY); return false }
    if (q.has('study')) return true
    const raw = localStorage.getItem(KEY)
    return raw !== null && (JSON.parse(raw) as State).phase !== 'finished'
  } catch { return false }
}
const formUrl = (): string | null => { try { return new URLSearchParams(location.search).get('form') } catch { return null } }

const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

export function StudyPanel() {
  const store = useStore()
  const snap = useSnapshot()
  const now = useNow()
  const [st, setSt] = useState<State>(() => load() ?? fresh())
  const [tick, setTick] = useState(0)
  const [showTask, setShowTask] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const ctx = useMemo<Ctx>(() => ({ snap, now, device: store.deviceId }), [snap, now, store.deviceId])
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const def = TASKS[Math.min(st.idx, TASKS.length - 1)]

  useEffect(() => { save(st) }, [st])

  // Timer display while a task runs.
  useEffect(() => {
    if (st.phase !== 'running') return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [st.phase])

  // Count taps (outside the study bar) and screen changes while a task runs.
  useEffect(() => {
    if (st.phase !== 'running') return
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-study]')) return
      setSt((s) => ({ ...s, taps: s.taps + 1 }))
    }
    const onHash = () => { if (Date.now() - st.taskStart > 400) setSt((s) => ({ ...s, screens: s.screens + 1 })) }
    document.addEventListener('click', onClick, true)
    window.addEventListener('hashchange', onHash)
    return () => { document.removeEventListener('click', onClick, true); window.removeEventListener('hashchange', onHash) }
  }, [st.phase, st.taskStart])

  // Remember milestones of multi-step tasks as the data changes.
  useEffect(() => {
    if (st.phase !== 'running' || !def.observe) return
    setSt((s) => { const m = def.observe!(ctxRef.current, s.mem); return m === s.mem ? s : { ...s, mem: m } })
  }, [snap, st.phase, def])

  // Prepare a task (for example place the participant at a desk) when its introduction is shown.
  useEffect(() => {
    if (st.phase !== 'intro') return
    if (def.prepare) setSt((s) => (s.phase === 'intro' ? { ...s, mem: def.prepare!(store, ctxRef.current) } : s))
    else setSt((s) => ({ ...s, mem: {} }))
  }, [st.phase, st.idx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the app's sticky header below the study bar.
  useLayoutEffect(() => {
    const el = barRef.current
    const set = (h: number) => document.documentElement.style.setProperty('--studybar-h', `${h}px`)
    if (!el || st.phase !== 'running') { set(0); return }
    set(el.offsetHeight)
    const ro = new ResizeObserver(() => set(el.offsetHeight))
    ro.observe(el)
    return () => { ro.disconnect(); set(0) }
  }, [st.phase, st.idx])

  const start = useCallback(() => {
    try { localStorage.removeItem(WATCH_KEY) } catch { /* ignore */ }
    store.demo?.reset()
    setSt((s) => ({ ...s, phase: 'intro', idx: 0, startedAt: new Date().toISOString(), results: [], cur: {} }))
  }, [store])

  const begin = useCallback(() => {
    if (def.id === 'E6') { try { localStorage.removeItem(WATCH_KEY) } catch { /* ignore */ } }
    location.hash = '#/'
    setShowTask(false)
    setSt((s) => ({ ...s, phase: 'running', taskStart: Date.now(), taps: 0, screens: 0, cur: {} }))
  }, [def.id])

  const stop = useCallback((gaveUp: boolean) => {
    setSt((s) => {
      const ms = Date.now() - s.taskStart
      const c = ctxRef.current
      const cur: Partial<TaskResult> = { i: def.id, m: ms, t: s.taps, s: s.screens, g: gaveUp ? 1 : 0 }
      if (def.steps) cur.st = def.steps(s.mem).done
      if (!def.question) cur.o = !gaveUp && def.check?.(c, s.mem) ? 1 : 0
      return { ...s, cur, phase: def.question && !gaveUp ? 'question' : 'rate' }
    })
  }, [def])

  const answer = (a: string) => setSt((s) => ({ ...s, cur: { ...s.cur, a, o: a === def.question!.correct(ctxRef.current) ? 1 : 0 }, phase: 'rate' }))

  const rate = (q: number, n: string) => {
    const base: TaskResult = { i: def.id, o: 0, m: 0, t: 0, s: 0, g: 0, q }
    const done: TaskResult = { ...base, ...st.cur, q, ...(n.trim() ? { n: n.trim().slice(0, 300) } : {}) }
    const results = [...st.results, done]
    setSt({ ...st, results, cur: {}, mem: {}, idx: st.idx + 1, phase: st.idx + 1 >= TASKS.length ? 'finished' : 'intro' })
  }

  if (store.mode !== 'local')
    return <div className="studymodal" data-study><div className="card"><h2>Study mode needs the demo data</h2><p className="muted">This build is connected to a live database. Open the study link without the live settings so your answers do not change shared data.</p></div></div>

  const code = st.phase === 'finished' ? encode({ v: 1, p: st.code, w: window.innerWidth, at: st.startedAt, r: st.results }) : ''

  return (
    <>
      {st.phase === 'running' && (
        <div className="studybar" ref={barRef} data-study>
          <div className="studyhead">
            <b>Task {st.idx + 1} of {TASKS.length}</b>
            <span className="studytime">{mmss(Date.now() - st.taskStart)}</span><span hidden>{tick}</span>
            <button className="studytoggle" aria-expanded={showTask} onClick={() => setShowTask((v) => !v)}>{showTask ? 'Hide task' : 'Show task'}</button>
          </div>
          {showTask && <p className="studytext">{def.text(st.mem)}</p>}
          <div className="row">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => stop(false)}>I am done</button>
            <button className="btn" onClick={() => stop(true)}>I cannot do this</button>
          </div>
        </div>
      )}
      {st.phase !== 'running' && (
        <div className="studyscrim" data-study>
          <div className="studymodal" role="dialog" aria-modal="true" aria-label="Study">
            {st.phase === 'welcome' && (
              <>
                <h2>CampusSpot study</h2>
                <p>About 10 to 15 minutes. You will do {TASKS.length} short tasks in a prototype that shows free seats and parking at the IBA library, then answer a few questions in a form.</p>
                <p>We are testing the app, not you. If something is confusing, that is useful to know. Nothing you do here is personal: the app records only how long each task takes, how many taps it needs and your answers. Your name is not collected. You can stop at any time by closing this page.</p>
                <p className="muted">Use your phone if you can, held the way you normally would. The data in this app is made up and stays on your device.</p>
                <button className="btn primary" onClick={start}>I agree, start</button>
              </>
            )}
            {st.phase === 'intro' && (
              <>
                <div className="muted">Task {st.idx + 1} of {TASKS.length}</div>
                <h2>{def.title}</h2>
                <p className="studytask">{def.text(st.mem)}</p>
                <p className="muted">When you press Start, the timer begins and the app goes to its home screen. Press "I am done" when you have finished. If you are stuck for about two minutes, press "I cannot do this".</p>
                <button className="btn primary" onClick={begin}>Start task</button>
              </>
            )}
            {st.phase === 'question' && def.question && (
              <>
                <h2>One quick question</h2>
                <p className="studytask">{def.question.text}</p>
                <div className="studyopts">{def.question.options.map((o) => <button key={o} className="btn" onClick={() => answer(o)}>{o}</button>)}</div>
              </>
            )}
            {st.phase === 'rate' && <Rate key={st.idx} last={st.idx + 1 >= TASKS.length} onNext={rate} />}
            {st.phase === 'finished' && (
              <>
                <h2>Thank you</h2>
                <p>Last step: copy the code below and paste it into the questionnaire. It holds your task results and nothing about you.</p>
                <textarea className="studycode" readOnly value={code} rows={5} onFocus={(e) => e.currentTarget.select()} aria-label="Your results code" />
                <CopyButton text={code} />
                {formUrl() && <a className="btn primary studylink" href={formUrl()!} target="_blank" rel="noreferrer">Open the questionnaire</a>}
                <p className="muted">Participant code {st.code}. You can now close this page.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Rate({ last, onNext }: { last: boolean; onNext: (q: number, note: string) => void }) {
  const [q, setQ] = useState(0)
  const [n, setN] = useState('')
  return (
    <>
      <h2>How easy was that task?</h2>
      <div className="studyscale" role="radiogroup" aria-label="Ease from 1 very difficult to 7 very easy">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => <button key={i} role="radio" aria-checked={q === i} className={`btn ${q === i ? 'primary' : ''}`} onClick={() => setQ(i)}>{i}</button>)}
      </div>
      <div className="studyends"><span>1 very difficult</span><span>7 very easy</span></div>
      <label className="muted" htmlFor="studynote">Anything confusing or surprising? (optional)</label>
      <textarea id="studynote" className="studynote" rows={3} value={n} onChange={(e) => setN(e.target.value)} maxLength={300} />
      <button className="btn primary" disabled={!q} onClick={() => onNext(q, n)}>{last ? 'Finish' : 'Next task'}</button>
    </>
  )
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true) } catch { setDone(false) }
  }
  return <button className="btn" onClick={() => void copy()}>{done ? 'Copied' : 'Copy code'}</button>
}
