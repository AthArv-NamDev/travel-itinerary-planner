import { useEffect, useMemo, useState } from 'react'
import { TYPE_META, dur, fmtDate, mapsLink, money } from '../lib/format'
import { Modal } from './ui'

/* ------------------------------------------------------------------ canvas */
export function ItineraryCanvas({ trip, readOnly, busy, onChange, onRegenDay }) {
  const it = trip.itinerary || { days: [] }
  const days = it.days || []
  const [active, setActive] = useState(0)
  const [adding, setAdding] = useState(false)
  const [regen, setRegen] = useState(false)

  useEffect(() => { if (active >= days.length) setActive(0) }, [days.length, active])
  const day = days[active]

  const update = (mutator) => {
    const next = structuredClone(it)
    mutator(next.days[active])
    onChange(next)
  }
  const toggle = (id) => update((d) => { const i = d.items.find((x) => x.id === id); if (i) i.done = !i.done })
  const remove = (id) => update((d) => { d.items = d.items.filter((x) => x.id !== id) })
  const add = (item) => update((d) => {
    d.items.push({ id: Math.random().toString(36).slice(2, 10), type: 'activity', description: '', location: '', duration_min: 60, cost: 0, travel_km: 0, travel_min: 0, done: false, ...item })
    d.items.sort((a, b) => a.time.localeCompare(b.time))
  })

  const progress = useMemo(() => {
    const all = days.flatMap((d) => d.items)
    return { done: all.filter((i) => i.done).length, total: all.length }
  }, [days])

  if (!day) return <div className="glass card empty"><p className="muted">This itinerary has no days.</p></div>

  return (
    <div>
      <div className="daytabs" role="tablist" aria-label="Days">
        {days.map((d, i) => (
          <button key={d.day} role="tab" aria-selected={i === active} className={`daytab${i === active ? ' on' : ''}`} onClick={() => setActive(i)}>
            <b>Day {d.day}</b>
            <span className="xs">{fmtDate(d.date)}</span>
          </button>
        ))}
      </div>

      <div className="glass card print-day">
        <div className="row wrap" style={{ marginBottom: 6 }}>
          <div>
            <h3>Day {day.day}{day.theme ? ` · ${day.theme}` : ''}</h3>
            <p className="muted small">
              {fmtDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}
              {day.distance_km > 0 && ` · ~${day.distance_km} km travel`}
            </p>
          </div>
          <span className="spacer" />
          {!readOnly && (
            <div className="row no-print">
              <button className="btn sm" onClick={() => setAdding(true)}>＋ Add</button>
              <button className="btn sm" disabled={busy} onClick={() => setRegen(true)}>{busy ? 'Working…' : '↻ Regenerate day'}</button>
            </div>
          )}
        </div>

        {day.items.length === 0 && <p className="muted" style={{ padding: '24px 0' }}>Nothing planned for this day yet.</p>}

        {day.items.map((i, idx) => {
          const meta = TYPE_META[i.type] || TYPE_META.activity
          return (
            <div key={i.id || idx}>
              {idx > 0 && (i.travel_min > 0 || i.travel_km > 0) && (
                <div className="travel">↓ {i.travel_min} min{i.travel_km > 0 ? ` · ${i.travel_km} km` : ''}</div>
              )}
              <div className={`item${i.done ? ' done' : ''}`}>
                <button className={`check${i.done ? ' on' : ''}`} disabled={readOnly} onClick={() => toggle(i.id)}
                  aria-label={i.done ? `Mark ${i.title} not done` : `Mark ${i.title} done`} aria-pressed={!!i.done} />
                <span className="time">{i.time}</span>
                <div className="body" style={{ minWidth: 0 }}>
                  <div className="title">{i.title}</div>
                  {i.description && <p className="muted small" style={{ marginTop: 2 }}>{i.description}</p>}
                  <div className="meta">
                    <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: meta.color }} />{meta.label}</span>
                    <span>⏱ {dur(i.duration_min)}</span>
                    {i.cost > 0 && <span>{money(i.cost, trip.currency)} pp</span>}
                    {i.location && <a href={mapsLink(i, trip.destination)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--orange)' }}>📍 {i.location}</a>}
                  </div>
                </div>
                {!readOnly && (
                  <div className="actions no-print">
                    <button className="icon-btn" onClick={() => remove(i.id)} aria-label={`Remove ${i.title}`} title="Remove">✕</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!readOnly && progress.total > 0 && (
        <p className="muted small no-print" style={{ marginTop: 10 }}>{progress.done} of {progress.total} activities done</p>
      )}

      {adding && <AddItemModal onClose={() => setAdding(false)} onAdd={(x) => { add(x); setAdding(false) }} />}
      {regen && <RegenModal day={day.day} onClose={() => setRegen(false)} onGo={(t) => { setRegen(false); onRegenDay(day.day, t) }} />}
    </div>
  )
}

function AddItemModal({ onClose, onAdd }) {
  const [f, setF] = useState({ time: '12:00', title: '', type: 'activity', cost: '' })
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const ok = f.title.trim().length > 0
  return (
    <Modal title="Add an activity" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (ok) onAdd({ time: f.time, title: f.title.trim(), type: f.type, cost: Math.max(0, Number(f.cost) || 0) }) }}>
        <label className="field">What
          <input className="input" autoFocus value={f.title} onChange={set('title')} placeholder="e.g. Sunset at the lake" maxLength={120} required />
        </label>
        <div className="form-grid">
          <label className="field">Time<input className="input" type="time" value={f.time} onChange={set('time')} required /></label>
          <label className="field">Type
            <select className="input" value={f.type} onChange={set('type')}>
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="field full">Cost per person (optional)
            <input className="input" type="number" min="0" step="any" value={f.cost} onChange={set('cost')} placeholder="0" />
          </label>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!ok}>Add</button>
        </div>
      </form>
    </Modal>
  )
}

function RegenModal({ day, onClose, onGo }) {
  const [text, setText] = useState('')
  return (
    <Modal title={`Regenerate day ${day}`} onClose={onClose}>
      <div className="stack">
        <label className="field">Anything specific? (optional)
          <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="e.g. more street food, fewer museums, start later" />
        </label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onGo(text.trim())}>Regenerate</button>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ inspector */
export function BudgetCard({ trip }) {
  const est = Number(trip.estimated_cost) || 0
  const budget = Number(trip.budget) || 0
  const pct = budget > 0 ? Math.min(100, Math.round((est / budget) * 100)) : 0
  const over = est > budget
  const b = trip.itinerary?.cost_breakdown || {}
  const labels = { stay: 'Stay', food: 'Food', activities: 'Activities', transport: 'Transport' }
  return (
    <div className="glass card">
      <h4>Estimated cost</h4>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <b style={{ fontSize: 24 }}>{money(est, trip.currency)}</b>
        <span className="muted small">of {money(budget, trip.currency)}</span>
      </div>
      <div className={`progress${over ? ' over' : ''}`} style={{ margin: '10px 0' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%` }} />
      </div>
      {over && <p className="small" style={{ color: 'var(--danger)', marginBottom: 8 }}>Over budget by {money(est - budget, trip.currency)}</p>}
      {Object.keys(labels).map((k) => (
        <div className="kv" key={k}><span>{labels[k]}</span><span>{money(b[k] || 0, trip.currency)}</span></div>
      ))}
      <div className="kv" style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 8 }}>
        <span>Per person</span><span>{money(est / Math.max(1, trip.travelers), trip.currency)}</span>
      </div>
    </div>
  )
}

export function InfoCards({ trip }) {
  const it = trip.itinerary || {}
  return (
    <>
      {it.stays?.length > 0 && (
        <div className="glass card">
          <h4>Where to stay</h4>
          {it.stays.map((s, i) => (
            <div className="stay" key={i}>
              <div className="row"><b className="small">{s.name}</b><span className="spacer" />{s.price_per_night > 0 && <span className="small">{money(s.price_per_night, trip.currency)}</span>}</div>
              <p className="muted xs">{s.type}{s.why ? ` · ${s.why}` : ''}</p>
            </div>
          ))}
        </div>
      )}
      {it.transport_tips?.length > 0 && (
        <div className="glass card"><h4>Getting around</h4><ul className="tips">{it.transport_tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      )}
      {it.tips?.length > 0 && (
        <div className="glass card"><h4>Tips</h4><ul className="tips">{it.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      )}
    </>
  )
}
