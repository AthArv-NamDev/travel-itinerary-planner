import { Component, useEffect } from 'react'

export function Logo({ size }) {
  return (
    <span className="logo" style={size ? { width: size, height: size } : undefined} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="#fff"><path d="M3 11.5 21 3l-8.5 18-2.2-7.3z" /></svg>
    </span>
  )
}

export function Spinner({ lg }) {
  return <span className={`spinner${lg ? ' lg' : ''}`} role="progressbar" aria-label="Loading" />
}

export function Alert({ children, kind }) {
  if (!children) return null
  return <div className={`alert${kind ? ` ${kind}` : ''}`} role="alert">{children}</div>
}

export function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass" role="dialog" aria-modal="true" aria-label={title}>
        <h3 style={{ marginBottom: 12 }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function Background() {
  return <div className="ambient" aria-hidden="true"><i /></div>
}

export function PageLoader() {
  return (
    <div className="fullscreen-center"><Spinner lg /></div>
  )
}

export class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error(error) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="fullscreen-center">
        <div className="glass card center stack" style={{ maxWidth: 420, alignItems: 'center' }}>
          <div className="big" style={{ fontSize: 36 }}>😵</div>
          <h2>Something broke</h2>
          <p className="muted">An unexpected error occurred. Reloading usually fixes it.</p>
          <button className="btn primary" onClick={() => window.location.assign('/')}>Reload app</button>
        </div>
      </div>
    )
  }
}
