import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BudgetCard, InfoCards, ItineraryCanvas } from '../components/Itinerary'
import { Alert, Modal, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useTrips } from '../context/TripsContext'
import { api } from '../lib/api'
import { fmtRange } from '../lib/format'

export default function TripView() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { patchLocal, removeLocal, refresh } = useTrips()

  const [trip, setTrip] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('') // '', 'day', 'trip', 'save'
  const [confirmDel, setConfirmDel] = useState(false)
  const [title, setTitle] = useState('')
  const saveSeq = useRef(0)

  useEffect(() => {
    let alive = true
    setTrip(null); setError('')
    api.getTrip(id).then((t) => { if (alive) { setTrip(t); setTitle(t.title) } })
      .catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [id])

  const apply = useCallback((t) => {
    setTrip(t)
    setTitle(t.title)
    patchLocal(t.id, { title: t.title, estimated_cost: t.estimated_cost, favorite: t.favorite, share_token: t.share_token, summary: t.summary })
  }, [patchLocal])

  // Optimistic itinerary edits; only the latest response wins.
  const saveItinerary = async (itinerary) => {
    const seq = ++saveSeq.current
    const before = trip
    setTrip((t) => ({ ...t, itinerary }))
    try {
      const t = await api.updateTrip(id, { itinerary })
      if (seq === saveSeq.current) apply(t)
    } catch (e) {
      if (seq === saveSeq.current) setTrip(before)
      toast.error(`Couldn't save: ${e.message}`)
    }
  }

  const regenDay = async (day, instruction) => {
    setBusy('day')
    try { apply(await api.regenerateDay(id, day, instruction)); toast.success(`Day ${day} regenerated`) }
    catch (e) { toast.error(e.message) } finally { setBusy('') }
  }

  const regenTrip = async () => {
    if (!window.confirm('Replace the whole itinerary with a freshly generated one? Your edits will be lost.')) return
    setBusy('trip')
    try { apply(await api.regenerateTrip(id)); toast.success('New itinerary generated') }
    catch (e) { toast.error(e.message) } finally { setBusy('') }
  }

  const rename = async () => {
    const t = title.trim()
    if (!t) return setTitle(trip.title)
    if (t === trip.title) return
    try { apply(await api.updateTrip(id, { title: t })) } catch (e) { setTitle(trip.title); toast.error(e.message) }
  }

  const toggleFav = async () => {
    try { apply(await api.updateTrip(id, { favorite: !trip.favorite })) } catch (e) { toast.error(e.message) }
  }

  const doDelete = async () => {
    try { await api.deleteTrip(id); removeLocal(id); toast.success('Trip deleted'); nav('/app') }
    catch (e) { toast.error(e.message); setConfirmDel(false) }
  }

  if (error) return <div className="page"><Alert>{error}</Alert><button className="btn" style={{ marginTop: 12 }} onClick={() => nav('/app')}>Back to dashboard</button></div>
  if (!trip) return <div className="page"><div className="row"><Spinner /> <span className="muted">Loading trip…</span></div></div>

  return (
    <div className="page">
      <div className="page-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={rename}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} maxLength={120} aria-label="Trip title" />
          <p className="muted small">
            {trip.destination} · {fmtRange(trip.start_date, trip.end_date)} · {trip.travelers} traveller{trip.travelers > 1 ? 's' : ''}
            {trip.itinerary?.generated_by === 'mock' && ' · demo content'}
          </p>
        </div>
        <button className={`btn no-print`} onClick={toggleFav} aria-pressed={trip.favorite}>
          <span className={`star${trip.favorite ? ' on' : ''}`}>{trip.favorite ? '★' : '☆'}</span> {trip.favorite ? 'Favorited' : 'Favorite'}
        </button>
      </div>

      {trip.itinerary?.summary && <p className="muted" style={{ marginBottom: 6, maxWidth: 760 }}>{trip.itinerary.summary}</p>}

      <div className="workspace">
        <ItineraryCanvas trip={trip} busy={busy === 'day'} onChange={saveItinerary} onRegenDay={regenDay} />

        <aside className="inspector">
          <BudgetCard trip={trip} />
          <InfoCards trip={trip} />
          <SharePanel trip={trip} onChange={apply} />
          <div className="glass card no-print">
            <h4>Export</h4>
            <div className="row wrap">
              <ExportBtn id={id} fmt="md" label="Markdown" />
              <ExportBtn id={id} fmt="ics" label="Calendar" />
              <ExportBtn id={id} fmt="json" label="JSON" />
              <button className="btn sm" onClick={() => window.print()}>Print / PDF</button>
            </div>
          </div>
          <div className="glass card no-print stack" style={{ gap: 10 }}>
            <h4 style={{ marginBottom: 0 }}>Manage</h4>
            <button className="btn" disabled={!!busy} onClick={regenTrip}>{busy === 'trip' ? <><Spinner /> Generating…</> : '↻ Regenerate whole trip'}</button>
            <button className="btn danger" onClick={() => setConfirmDel(true)}>Delete trip</button>
          </div>
        </aside>
      </div>

      {confirmDel && (
        <Modal title="Delete this trip?" onClose={() => setConfirmDel(false)}>
          <p className="muted" style={{ marginBottom: 16 }}>“{trip.title}” will be permanently removed, along with its share link.</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setConfirmDel(false)}>Cancel</button>
            <button className="btn primary" onClick={doDelete}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ExportBtn({ id, fmt, label }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try { await api.exportTrip(id, fmt) } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return <button className="btn sm" onClick={go} disabled={busy}>{busy ? '…' : label}</button>
}

function SharePanel({ trip, onChange }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const url = trip.share_token ? `${window.location.origin}/shared/${trip.share_token}` : ''

  const set = async (enabled) => {
    setBusy(true)
    try {
      const r = await api.share(trip.id, enabled)
      onChange({ ...trip, share_token: r.share_token })
      toast.success(enabled ? 'Share link created' : 'Sharing turned off')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Link copied') }
    catch { window.prompt('Copy this link:', url) }
  }

  return (
    <div className="glass card no-print">
      <h4>Share</h4>
      {url ? (
        <div className="stack" style={{ gap: 10 }}>
          <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Share link" />
          <div className="row"><button className="btn sm" onClick={copy}>Copy link</button><button className="btn sm danger" disabled={busy} onClick={() => set(false)}>Stop sharing</button></div>
          <p className="muted xs">Anyone with the link can view (not edit) this trip.</p>
        </div>
      ) : (
        <button className="btn" disabled={busy} onClick={() => set(true)}>{busy ? 'Creating…' : '🔗 Create share link'}</button>
      )}
    </div>
  )
}
