import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import { Background, PageLoader } from './components/ui'
import { useAuth } from './context/AuthContext'
import { TripsProvider } from './context/TripsContext'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Discover from './pages/Discover'
import Landing from './pages/Landing'
import NewTrip from './pages/NewTrip'
import Settings from './pages/Settings'
import Shared from './pages/Shared'
import TripView from './pages/TripView'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function NotFound() {
  return (
    <>
      <Background />
      <div className="fullscreen-center">
        <div className="glass card center stack" style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 40 }}>🧳</div>
          <h2>Page not found</h2>
          <p className="muted">That route doesn’t exist.</p>
          <Link to="/" className="btn primary">Go home</Link>
        </div>
      </div>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/shared/:token" element={<Shared />} />
      <Route path="/app" element={<Protected><TripsProvider><Shell /></TripsProvider></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="favorites" element={<Dashboard favoritesOnly />} />
        <Route path="new" element={<NewTrip />} />
        <Route path="discover" element={<Discover />} />
        <Route path="settings" element={<Settings />} />
        <Route path="trips/:id" element={<TripView />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
