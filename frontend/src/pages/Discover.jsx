import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { BUDGET_LEVELS, INTERESTS, VIBES, money } from '../lib/format'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Discover() {
  const nav = useNavigate()
  const [f, setF] = useState({ vibe: 'culture', interests: [], budget_level: 'mid', month: '', origin: '', days: 5 })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggle = (i) => setF((p) => ({ ...p, interests: p.interests.includes(i) ? p.interests.filter((x) => x !== i) : [...p.interests, i] }))

  const go = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await api.recommend({ ...f, days: Math.min(14, Math.max(1, Number(f.days) || 5)) })
      setResults(r.destinations)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="page">
      <div className="page-head"><div><p className="muted small">Not sure where to go?</p><h1>Discover destinations</h1></div></div>

      <form className="glass card stack" style={{ maxWidth: 860, marginBottom: 22 }} onSubmit={go}>
        <div className="chips">{VIBES.map((v) => <button type="button" key={v.id} className={`chip${f.vibe === v.id ? ' on' : ''}`} onClick={() => setF({ ...f, vibe: v.id })} aria-pressed={f.vibe === v.id}>{v.emoji} {v.label}</button>)}</div>
        <div className="chips">{INTERESTS.map((i) => <button type="button" key={i} className={`chip${f.interests.includes(i) ? ' on' : ''}`} onClick={() => toggle(i)} aria-pressed={f.interests.includes(i)}>{i}</button>)}</div>
        <div className="form-grid">
          <label className="field">Budget style
            <select className="input" value={f.budget_level} onChange={(e) => setF({ ...f, budget_level: e.target.value })}>{BUDGET_LEVELS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
          </label>
          <label className="field">Month
            <select className="input" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}><option value="">Flexible</option>{MONTHS.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
          <label className="field">Travelling from<input className="input" value={f.origin} maxLength={80} onChange={(e) => setF({ ...f, origin: e.target.value })} placeholder="e.g. Mumbai" /></label>
          <label className="field">Trip length (days)<input className="input" type="number" min="1" max="14" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} /></label>
        </div>
        <div><button className="btn primary" disabled={loading}>{loading ? <><Spinner /> Finding…</> : '🧭 Suggest destinations'}</button></div>
      </form>

      <Alert>{error}</Alert>

      {results && (
        <div className="dest-grid">
          {results.map((d, i) => (
            <article className="glass card hover stack" style={{ gap: 10 }} key={`${d.destination}-${i}`}>
              <div>
                <h3>{d.destination}</h3>
                <p className="muted small">{d.country}{d.best_for ? ` · ${d.best_for}` : ''}</p>
              </div>
              <p className="small" style={{ color: '#cfd3d6' }}>{d.why}</p>
              {Array.isArray(d.highlights) && d.highlights.length > 0 && (
                <div className="chips">{d.highlights.slice(0, 3).map((h, j) => <span className="badge" key={j}>{String(h)}</span>)}</div>
              )}
              <div className="row" style={{ marginTop: 'auto' }}>
                {Number(d.est_daily_cost_per_person) > 0 && <span className="muted xs">≈ {money(d.est_daily_cost_per_person, d.currency || 'INR')} / day</span>}
                <span className="spacer" />
                <button className="btn sm primary" onClick={() => nav(`/app/new?destination=${encodeURIComponent(d.destination)}`)}>Plan trip →</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
