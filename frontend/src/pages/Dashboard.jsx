import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTrips } from '../context/TripsContext'
import { api } from '../lib/api'
import { VIBES, daysBetween, fmtRange, money, todayISO } from '../lib/format'

export default function Dashboard({ favoritesOnly = false }) {
  const { user } = useAuth()
  const { trips, loading, error, refresh, patchLocal } = useTrips()
  const toast = useToast()
  const nav = useNavigate()
  const [q, setQ] = useState('')

  const name = (user?.user_metadata?.name || user?.email || '').split(/[ @]/)[0]
  const today = todayISO()

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return trips.filter((t) => (!favoritesOnly || t.favorite) && (!s || `${t.title} ${t.destination}`.toLowerCase().includes(s)))
  }, [trips, q, favoritesOnly])

  const upcoming = trips.filter((t) => t.end_date >= today).length
  const totalDays = trips.reduce((n, t) => n + daysBetween(t.start_date, t.end_date), 0)
  const cur = trips[0]?.currency || 'INR'

  const toggleFav = async (e, t) => {
    e.stopPropagation()
    patchLocal(t.id, { favorite: !t.favorite })
    try { await api.updateTrip(t.id, { favorite: !t.favorite }) }
    catch (err) { patchLocal(t.id, { favorite: t.favorite }); toast.error(err.message) }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="muted small">{favoritesOnly ? 'Your starred plans' : 'Welcome back'}</p>
          <h1>{favoritesOnly ? 'Favorites' : `Hi${name ? `, ${name}` : ''} 👋`}</h1>
        </div>
        <div className="row">
          <input className="input" style={{ width: 220 }} placeholder="Search trips…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search trips" />
          <button className="btn primary" onClick={() => nav('/app/new')}>＋ Plan a trip</button>
        </div>
      </div>

      {!favoritesOnly && trips.length > 0 && (
        <div className="stats">
          <div className="glass card stat"><span className="muted small">Trips planned</span><b>{trips.length}</b></div>
          <div className="glass card stat"><span className="muted small">Upcoming</span><b>{upcoming}</b></div>
          <div className="glass card stat"><span className="muted small">Days of travel</span><b>{totalDays}</b></div>
          <div className="glass card stat"><span className="muted small">Total est. spend</span><b>{money(trips.reduce((n, t) => n + Number(t.estimated_cost || 0), 0), cur)}</b></div>
        </div>
      )}

      {error && (
        <div className="stack" style={{ marginBottom: 16 }}>
          <Alert>{error}</Alert>
          <div><button className="btn" onClick={refresh}>Try again</button></div>
        </div>
      )}

      {loading ? (
        <div className="trip-grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 170 }} />)}</div>
      ) : list.length === 0 && !error ? (
        <div className="glass empty">
          <div className="big">{favoritesOnly ? '⭐' : '🗺️'}</div>
          <h3>{q ? 'No trips match your search' : favoritesOnly ? 'No favorites yet' : 'Plan your first trip'}</h3>
          <p className="muted" style={{ maxWidth: 380 }}>
            {favoritesOnly ? 'Tap the star on a trip to pin it here.' : 'Tell us where, when and your vibe. We build a day-by-day plan in seconds.'}
          </p>
          {!favoritesOnly && !q && <button className="btn primary" onClick={() => nav('/app/new')}>Create itinerary</button>}
        </div>
      ) : (
        <div className="trip-grid">
          {list.map((t) => {
            const v = VIBES.find((x) => x.id === t.vibe)
            const n = daysBetween(t.start_date, t.end_date)
            return (
              <article key={t.id} className="glass card hover trip-card" tabIndex={0} role="link"
                onClick={() => nav(`/app/trips/${t.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/app/trips/${t.id}`)}>
                <span className="glow" />
                <div className="row">
                  <span className="badge">{v?.emoji} {v?.label || t.vibe}</span>
                  <span className="spacer" />
                  <button className={`icon-btn star${t.favorite ? ' on' : ''}`} onClick={(e) => toggleFav(e, t)}
                    aria-label={t.favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={t.favorite}>{t.favorite ? '★' : '☆'}</button>
                </div>
                <h3>{t.title}</h3>
                <p className="muted small" style={{ flex: 1 }}>{t.summary ? t.summary.slice(0, 110) + (t.summary.length > 110 ? '…' : '') : t.destination}</p>
                <div className="row small muted wrap">
                  <span>📅 {fmtRange(t.start_date, t.end_date)}</span>
                  <span>· {n} day{n > 1 ? 's' : ''}</span>
                  <span>· {money(t.estimated_cost, t.currency)}</span>
                  {t.share_token && <span className="badge">🔗 Shared</span>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
