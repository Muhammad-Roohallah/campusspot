import { useState } from 'react'
import { Shell } from '../components/Shell'
import { useSnapshot, useStore } from '../data/StoreContext'

export function Staff() {
  const store = useStore()
  const snap = useSnapshot()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    setErr(await store.signIn(email.trim(), password))
    setBusy(false)
  }

  return (
    <Shell title="Staff" subtitle="Café and library staff" back="#/">
      {store.mode === 'local' ? (
        <section className="card">
          <h2>Demo staff mode</h2>
          <p className="muted">The demo has no accounts. Switch staff mode on to try changing café seats and collab room bookings.</p>
          <label className="notify" htmlFor="demo-staff">
            <input id="demo-staff" type="checkbox" checked={snap.staff} onChange={(e) => store.demo!.setStaff(e.target.checked)} />
            <span>Act as café and library staff</span>
          </label>
          <p className="hint">In the live version, staff sign in with an email and password, and only listed staff accounts can change seats. Open the app in two tabs of this browser to see one tab's changes appear in the other.</p>
        </section>
      ) : snap.staff ? (
        <section className="card">
          <h2>Signed in</h2>
          <p className="muted">{snap.staffEmail}. You can update café seats and collab room bookings.</p>
          <div className="row"><a className="btn primary" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href="#/cafe">Go to café seats</a>
            <button className="btn" onClick={() => void store.signOut()}>Sign out</button></div>
        </section>
      ) : (
        <form className="card field" onSubmit={submit}>
          <h2>Staff sign in</h2>
          <p className="muted" style={{ margin: 0 }}>Students do not need to sign in to see availability or to mark a space.</p>
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <div className="banner" role="alert">{err}</div>}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          {snap.staffEmail === null && snap.ready && <p className="hint">If you signed in but cannot edit, your account has not been added to the staff list yet.</p>}
        </form>
      )}
    </Shell>
  )
}
