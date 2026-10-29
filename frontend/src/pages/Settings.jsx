import { useEffect, useState } from 'react'
import { Alert, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { BUDGET_LEVELS, CURRENCIES, INTERESTS, PACES, VIBES } from '../lib/format'

export default function Settings() {
  const toast = useToast()
  const [p, setP] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    api.getPrefs().then((r) => alive && setP(r)).catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [])

  const toggle = (i) => setP((x) => ({ ...x, interests: x.interests.includes(i) ? x.interests.filter((y) => y !== i) : [...x.interests, i] }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.savePrefs({ interests: p.interests, pace: p.pace, vibe: p.vibe, budget_level: p.budget_level, currency: p.currency })
      toast.success('Preferences saved')
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="page">
      <div className="page-head"><div><p className="muted small">Personalisation</p><h1>Preferences</h1></div></div>
      <Alert>{error}</Alert>
      {!p && !error && <div className="row"><Spinner /> <span className="muted">Loading…</span></div>}
      {p && (
        <form className="glass card stack" style={{ maxWidth: 760, gap: 18 }} onSubmit={save}>
          <p className="muted small">These defaults pre-fill the trip builder, so you only change what's different.</p>
          <div><p className="small muted" style={{ marginBottom: 8 }}>Favourite vibe</p>
            <div className="chips">{VIBES.map((v) => <button type="button" key={v.id} className={`chip${p.vibe === v.id ? ' on' : ''}`} onClick={() => setP({ ...p, vibe: v.id })} aria-pressed={p.vibe === v.id}>{v.emoji} {v.label}</button>)}</div></div>
          <div><p className="small muted" style={{ marginBottom: 8 }}>Pace</p>
            <div className="seg">{PACES.map((x) => <button type="button" key={x.id} className={p.pace === x.id ? 'on' : ''} onClick={() => setP({ ...p, pace: x.id })}>{x.label}<small>{x.hint}</small></button>)}</div></div>
          <div><p className="small muted" style={{ marginBottom: 8 }}>Travel style</p>
            <div className="seg">{BUDGET_LEVELS.map((x) => <button type="button" key={x.id} className={p.budget_level === x.id ? 'on' : ''} onClick={() => setP({ ...p, budget_level: x.id })}>{x.label}</button>)}</div></div>
          <div><p className="small muted" style={{ marginBottom: 8 }}>Interests</p>
            <div className="chips">{INTERESTS.map((i) => <button type="button" key={i} className={`chip${p.interests.includes(i) ? ' on' : ''}`} onClick={() => toggle(i)} aria-pressed={p.interests.includes(i)}>{i}</button>)}</div></div>
          <label className="field" style={{ maxWidth: 200 }}>Currency
            <select className="input" value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <div><button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button></div>
        </form>
      )}
    </div>
  )
}
