import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useTrips } from '../context/TripsContext'
import { api } from '../lib/api'
import { BUDGET_LEVELS, CURRENCIES, INTERESTS, PACES, VIBES, addDaysISO, daysBetween, todayISO } from '../lib/format'

const MAX_DAYS = 14
const STAGES = ['Understanding your preferences…', 'Picking the best places…', 'Optimising routes and timings…', 'Balancing your budget…', 'Polishing the plan…']

export default function NewTrip() {
  const nav = useNavigate()
  const toast = useToast()
  const { refresh } = useTrips()
  const [params] = useSearchParams()

  const start = addDaysISO(todayISO(), 14)
  const [f, setF] = useState({
    destination: params.get('destination') || '',
    start_date: start, end_date: addDaysISO(start, 3),
    travelers: 2, budget: '', currency: 'INR',
    budget_level: 'mid', pace: 'balanced', vibe: 'culture', interests: [], notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState('')

  // Pre-fill from saved preferences (best effort)
  useEffect(() => {
    let alive = true
    api.getPrefs().then((p) => {
      if (!alive || !p) return
      setF((x) => ({ ...x, interests: p.interests || [], pace: p.pace || x.pace, vibe: p.vibe || x.vibe, budget_level: p.budget_level || x.budget_level, currency: p.currency || x.currency }))
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 6000)
    return () => clearInterval(t)
  }, [loading])

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const pick = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const toggleInterest = (i) => setF((p) => ({ ...p, interests: p.interests.includes(i) ? p.interests.filter((x) => x !== i) : [...p.interests, i] }))

  const onStart = (e) => {
    const v = e.target.value
    setF((p) => ({ ...p, start_date: v, end_date: p.end_date < v ? v : p.end_date }))
  }

  const n = daysBetween(f.start_date, f.end_date)

  const validate = () => {
    if (f.destination.trim().length < 2) return 'Enter a destination.'
    if (!f.start_date || !f.end_date) return 'Pick your travel dates.'
    if (n < 1) return 'The end date must be on or after the start date.'
    if (n > MAX_DAYS) return `Trips are limited to ${MAX_DAYS} days.`
    if (!(Number(f.budget) > 0)) return 'Enter your total budget.'
    if (!(Number(f.travelers) >= 1 && Number(f.travelers) <= 20)) return 'Travellers must be between 1 and 20.'
    return ''
  }

  const submit = async (e) => {
    e.preventDefault()
    const msg = validate()
    if (msg) return setError(msg)
    setError(''); setStage(0); setLoading(true)
    try {
      const trip = await api.generate({
        destination: f.destination.trim(), start_date: f.start_date, end_date: f.end_date,
        travelers: Number(f.travelers), budget: Number(f.budget), currency: f.currency,
        budget_level: f.budget_level, pace: f.pace, vibe: f.vibe, interests: f.interests, notes: f.notes.trim(),
      })
      await refresh()
      toast.success('Itinerary ready!')
      nav(`/app/trips/${trip.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="glass card empty" style={{ marginTop: 40 }}>
          <Spinner lg />
          <h2>Building your {f.destination} trip</h2>
          <p className="muted" aria-live="polite">{STAGES[stage]}</p>
          <p className="muted xs">This usually takes 15–45 seconds. Please keep this tab open.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head"><div><p className="muted small">Smart trip builder</p><h1>Plan a new trip</h1></div></div>

      <form className="stack" style={{ gap: 18, maxWidth: 860 }} onSubmit={submit} noValidate>
        <Alert>{error}</Alert>

        <section className="glass card stack">
          <div className="form-grid">
            <label className="field full">Destination
              <input className="input" value={f.destination} onChange={set('destination')} placeholder="e.g. Jaipur, Lisbon, Bali" maxLength={120} autoFocus />
            </label>
            <label className="field">Start date<input className="input" type="date" value={f.start_date} min={todayISO()} onChange={onStart} /></label>
            <label className="field">End date<input className="input" type="date" value={f.end_date} min={f.start_date} onChange={set('end_date')} /></label>
            <label className="field">Travellers<input className="input" type="number" min="1" max="20" value={f.travelers} onChange={set('travelers')} /></label>
            <div className="field" style={{ justifyContent: 'flex-end' }}><span className="small">{n > 0 ? `${n} day${n > 1 ? 's' : ''}` : '—'}</span></div>
            <label className="field">Total budget (whole group)<input className="input" type="number" min="1" step="any" value={f.budget} onChange={set('budget')} placeholder="e.g. 40000" /></label>
            <label className="field">Currency
              <select className="input" value={f.currency} onChange={set('currency')}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
          </div>
        </section>

        <section className="glass card stack">
          <div><p className="small muted" style={{ marginBottom: 8 }}>Vibe</p>
            <div className="chips">{VIBES.map((v) => <button type="button" key={v.id} className={`chip${f.vibe === v.id ? ' on' : ''}`} onClick={() => pick('vibe', v.id)} aria-pressed={f.vibe === v.id}>{v.emoji} {v.label}</button>)}</div>
          </div>
          <div><p className="small muted" style={{ marginBottom: 8 }}>Pace</p>
            <div className="seg">{PACES.map((p) => <button type="button" key={p.id} className={f.pace === p.id ? 'on' : ''} onClick={() => pick('pace', p.id)}>{p.label}<small>{p.hint}</small></button>)}</div>
          </div>
          <div><p className="small muted" style={{ marginBottom: 8 }}>Travel style</p>
            <div className="seg">{BUDGET_LEVELS.map((p) => <button type="button" key={p.id} className={f.budget_level === p.id ? 'on' : ''} onClick={() => pick('budget_level', p.id)}>{p.label}</button>)}</div>
          </div>
          <div><p className="small muted" style={{ marginBottom: 8 }}>Interests</p>
            <div className="chips">{INTERESTS.map((i) => <button type="button" key={i} className={`chip${f.interests.includes(i) ? ' on' : ''}`} onClick={() => toggleInterest(i)} aria-pressed={f.interests.includes(i)}>{i}</button>)}</div>
          </div>
          <label className="field">Anything else? (optional)
            <textarea className="input" value={f.notes} onChange={set('notes')} maxLength={1000} placeholder="e.g. vegetarian, travelling with a toddler, avoid long walks" />
          </label>
        </section>

        <div className="row"><button className="btn primary lg" type="submit">✨ Generate itinerary</button><span className="muted small hide-sm">AI-planned, fully editable afterwards</span></div>
      </form>
    </div>
  )
}
