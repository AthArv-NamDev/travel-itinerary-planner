import { Link } from 'react-router-dom'
import { Background, Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { ic: '✨', t: 'AI-built itineraries', d: 'Tell us where, when, your budget and vibe. Get a full day-by-day plan with sights, food and transport in seconds.' },
  { ic: '🧭', t: 'Route-smart days', d: 'Stops are ordered by proximity with travel times between them, so you spend more time exploring and less in transit.' },
  { ic: '💸', t: 'Budget tracking', d: 'Live cost estimates broken down by stay, food, activities and transport, with a warning if you go over.' },
  { ic: '🎛️', t: 'Make it yours', d: 'Check things off, add or remove stops, and regenerate any single day with a note like “more street food”.' },
  { ic: '🔗', t: 'Share & export', d: 'Send a read-only link to your travel buddies, add it to your calendar, or export to Markdown, JSON or PDF.' },
  { ic: '🔒', t: 'Private by default', d: 'Your trips are tied to your account and only visible to others if you create a share link.' },
]

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="land">
      <Background />
      <header className="nav">
        <Link to="/" className="brand" style={{ padding: 0 }}><Logo /> Wayfind</Link>
        <div className="row">
          {user ? <Link to="/app" className="btn primary">Open app</Link> : (<>
            <Link to="/login" className="btn ghost">Sign in</Link>
            <Link to="/signup" className="btn primary">Get started</Link>
          </>)}
        </div>
      </header>

      <section className="hero">
        <span className="pill">✨ AI travel planning, reimagined</span>
        <h1>Plan trips at the <span className="gradient-text">speed of thought</span></h1>
        <p className="lead">Wayfind turns your destination, budget and vibe into a complete, optimised day-by-day itinerary, then helps you edit, share and take it with you.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to={user ? '/app/new' : '/signup'} className="btn primary lg">Plan my trip</Link>
          <a href="#how" className="btn lg">How it works</a>
        </div>

        <div className="glass mock" aria-hidden="true">
          <div className="mock-in">
            <div className="l">
              <b style={{ color: '#fff' }}>Trips</b>
              <span>🏠 Today</span><span>🧭 Discover</span><span style={{ color: '#fff' }}>● Jaipur · 4 days</span><span>● Lisbon · 5 days</span>
            </div>
            <div>
              <h3 style={{ marginBottom: 4 }}>Day 1 · Old city & forts</h3>
              <p className="muted small" style={{ marginBottom: 8 }}>~14 km travel</p>
              {[['09:00', 'Breakfast at Rawat Misthan', '#F5C542'], ['10:30', 'Amber Fort', '#FF8A3D'], ['13:30', 'Lunch at LMB', '#F5C542'], ['15:30', 'City Palace', '#FF8A3D'], ['18:30', 'Sunset at Nahargarh', '#E45CC4']].map(([t, n, c]) => (
                <div className="mock-row" key={t}><span className="muted small">{t}</span><span className="dot" style={{ background: c }} />{n}</div>
              ))}
            </div>
            <div className="r">
              <b>Estimated cost</b>
              <h3 style={{ margin: '6px 0' }}>₹32,400</h3>
              <div className="progress" style={{ marginBottom: 10 }}><div style={{ width: '81%' }} /></div>
              <p className="muted small">of ₹40,000 budget</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <h2>Everything you need, nothing you don’t</h2>
        <p className="sub">Built for solo trips, couples and groups.</p>
        <div className="features">
          {FEATURES.map((f) => (
            <div className="glass card feature hover" key={f.t}>
              <div className="ic">{f.ic}</div><h3>{f.t}</h3><p className="muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="how">
        <h2>How it works</h2>
        <p className="sub">From idea to itinerary in under a minute.</p>
        <div className="steps">
          <div className="glass card step"><h3>Tell us about the trip</h3><p className="muted">Destination, dates, group size, budget, pace, vibe and interests.</p></div>
          <div className="glass card step"><h3>AI builds the plan</h3><p className="muted">Real places, balanced days, optimised routes and a cost estimate.</p></div>
          <div className="glass card step"><h3>Refine & go</h3><p className="muted">Tweak, regenerate a day, share with friends, export and travel.</p></div>
        </div>
      </section>

      <section className="section">
        <div className="glass cta">
          <h2>Your next trip is one form away</h2>
          <p className="muted" style={{ margin: '10px 0 22px' }}>Free to try. No spreadsheet required.</p>
          <Link to={user ? '/app/new' : '/signup'} className="btn primary lg">Start planning</Link>
        </div>
      </section>

      <footer className="footer">© {new Date().getFullYear()} Wayfind · AI-powered travel itinerary planner</footer>
    </div>
  )
}
