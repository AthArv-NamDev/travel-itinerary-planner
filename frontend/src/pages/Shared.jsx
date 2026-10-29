import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BudgetCard, InfoCards, ItineraryCanvas } from '../components/Itinerary'
import { Alert, Background, Logo, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { fmtRange } from '../lib/format'

export default function Shared() {
  const { token } = useParams()
  const [trip, setTrip] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.shared(token).then((t) => alive && setTrip(t)).catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [token])

  return (
    <>
      <Background />
      <div className="shared-wrap">
        <div className="row no-print" style={{ marginBottom: 24 }}>
          <Link to="/" className="brand" style={{ padding: 0 }}><Logo /> Wayfind</Link>
          <span className="spacer" />
          <button className="btn sm" onClick={() => window.print()} disabled={!trip}>Print / PDF</button>
          <Link to="/signup" className="btn primary sm">Plan your own</Link>
        </div>

        {error && <Alert>{error === 'Shared trip not found' ? 'This link is invalid or sharing was turned off.' : error}</Alert>}
        {!trip && !error && <div className="row"><Spinner /> <span className="muted">Loading…</span></div>}

        {trip && (
          <div className="stack" style={{ gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 30 }}>{trip.title}</h1>
              <p className="muted">{trip.destination} · {fmtRange(trip.start_date, trip.end_date)} · {trip.travelers} traveller{trip.travelers > 1 ? 's' : ''}</p>
              {trip.itinerary?.summary && <p className="muted" style={{ marginTop: 10 }}>{trip.itinerary.summary}</p>}
            </div>
            <ItineraryCanvas trip={trip} readOnly />
            <BudgetCard trip={trip} />
            <InfoCards trip={trip} />
          </div>
        )}
      </div>
    </>
  )
}
