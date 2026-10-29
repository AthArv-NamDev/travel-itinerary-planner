import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTrips } from '../context/TripsContext'
import { Background, Logo } from './ui'

const link = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`

export default function Shell() {
  const { user, signOut } = useAuth()
  const { trips } = useTrips()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(true)

  useEffect(() => setOpen(false), [loc.pathname])

  const name = user?.user_metadata?.name || user?.email || 'Traveller'
  const favs = trips.filter((t) => t.favorite).length

  return (
    <>
      <Background />
      <div className="shell">
        <div className={`scrim${open ? ' open' : ''}`} onClick={() => setOpen(false)} />
        <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
          <div className="brand"><Logo /> Wayfind</div>

          <button className="btn primary block" onClick={() => nav('/app/new')} style={{ marginBottom: 10 }}>＋ Plan a trip</button>

          <NavLink end to="/app" className={link}><span className="ico">🏠</span> Today</NavLink>
          <NavLink to="/app/discover" className={link}><span className="ico">🧭</span> Discover</NavLink>
          <NavLink to="/app/favorites" className={link}>
            <span className="ico">★</span> Favorites {favs > 0 && <span className="count">{favs}</span>}
          </NavLink>

          <div className="nav-label">
            <span>Trips</span>
            <button className="icon-btn" style={{ width: 22, height: 22, fontSize: 12 }}
              onClick={() => setFoldersOpen((o) => !o)} aria-label="Toggle trips list" aria-expanded={foldersOpen}>
              {foldersOpen ? '▾' : '▸'}
            </button>
          </div>
          {foldersOpen && (
            trips.length === 0
              ? <div className="muted small" style={{ padding: '4px 10px' }}>No trips yet</div>
              : trips.slice(0, 12).map((t) => (
                <NavLink key={t.id} to={`/app/trips/${t.id}`} className={(s) => `${link(s)} nav-trip`}>
                  <span className="dot" style={{ background: 'var(--orange)' }} />
                  <span className="t">{t.title}</span>
                </NavLink>
              ))
          )}

          <div className="nav-label"><span>Account</span></div>
          <NavLink to="/app/settings" className={link}><span className="ico">⚙️</span> Preferences</NavLink>

          <div className="sidebar-foot">
            <div className="row" style={{ padding: '4px 6px' }}>
              <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
              <div style={{ minWidth: 0 }}>
                <div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <button className="btn ghost sm" style={{ padding: 0, color: 'var(--muted)' }} onClick={signOut}>Sign out</button>
              </div>
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
            <div className="brand" style={{ padding: 0 }}><Logo /> Wayfind</div>
            <span className="spacer" />
            <button className="btn primary sm" onClick={() => nav('/app/new')}>＋ New</button>
          </header>
          <Outlet />
        </div>
      </div>
    </>
  )
}
