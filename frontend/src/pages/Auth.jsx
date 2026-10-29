import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Alert, Background, Logo, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabaseConfigured } from '../lib/supabase'

export default function Auth({ mode }) {
  const isSignup = mode === 'signup'
  const { user, loading, signIn, signUp } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (!loading && user) return <Navigate to="/app" replace />

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError('Enter a valid email address.')
    if (f.password.length < 6) return setError('Password must be at least 6 characters.')
    setBusy(true)
    try {
      if (isSignup) {
        const r = await signUp(f.email.trim(), f.password, f.name.trim())
        if (r.needsConfirmation) setInfo('Account created! Check your email to confirm, then sign in.')
        else nav('/app', { replace: true })
      } else {
        await signIn(f.email.trim(), f.password)
        nav('/app', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <Background />
      <div className="fullscreen-center">
        <div className="glass auth-card stack" style={{ gap: 16 }}>
          <Link to="/" className="brand" style={{ padding: 0 }}><Logo /> Wayfind</Link>
          <div>
            <h1 style={{ fontSize: 26 }}>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="muted small" style={{ marginTop: 4 }}>{isSignup ? 'Start planning trips in seconds.' : 'Sign in to your trips.'}</p>
          </div>

          {!supabaseConfigured && <Alert kind="info">Supabase isn’t configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env and restart.</Alert>}
          <Alert>{error}</Alert>
          <Alert kind="info">{info}</Alert>

          <form className="stack" onSubmit={submit} noValidate>
            {isSignup && <label className="field">Name<input className="input" value={f.name} onChange={set('name')} autoComplete="name" maxLength={60} /></label>}
            <label className="field">Email<input className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></label>
            <label className="field">Password<input className="input" type="password" value={f.password} onChange={set('password')} autoComplete={isSignup ? 'new-password' : 'current-password'} required /></label>
            <button className="btn primary block" disabled={busy}>{busy ? <Spinner /> : isSignup ? 'Sign up' : 'Sign in'}</button>
          </form>

          <p className="muted small center">
            {isSignup ? <>Already have an account? <Link to="/login" style={{ color: 'var(--orange)' }}>Sign in</Link></> : <>New here? <Link to="/signup" style={{ color: 'var(--orange)' }}>Create an account</Link></>}
          </p>
        </div>
      </div>
    </>
  )
}
