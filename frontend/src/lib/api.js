import { supabase } from './supabase'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function request(path, { method = 'GET', body, auth = true, raw = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) throw new Error('Please sign in again.')
    headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Check your connection and that the backend is running.')
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const j = await res.json()
      if (typeof j.detail === 'string') detail = j.detail
    } catch { /* non-JSON error */ }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return raw ? res : res.json()
}

async function download(path, fallbackName) {
  const res = await request(path, { raw: true })
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') || ''
  const name = /filename="([^"]+)"/.exec(cd)?.[1] || fallbackName
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const api = {
  listTrips: () => request('/api/trips'),
  getTrip: (id) => request(`/api/trips/${id}`),
  generate: (payload) => request('/api/trips/generate', { method: 'POST', body: payload }),
  updateTrip: (id, patch) => request(`/api/trips/${id}`, { method: 'PATCH', body: patch }),
  deleteTrip: (id) => request(`/api/trips/${id}`, { method: 'DELETE' }),
  regenerateTrip: (id) => request(`/api/trips/${id}/regenerate`, { method: 'POST' }),
  regenerateDay: (id, day, instruction) =>
    request(`/api/trips/${id}/days/${day}/regenerate`, { method: 'POST', body: { instruction } }),
  share: (id, enabled) => request(`/api/trips/${id}/share`, { method: 'POST', body: { enabled } }),
  exportTrip: (id, format) => download(`/api/trips/${id}/export?format=${format}`, `trip.${format}`),
  shared: (token) => request(`/api/shared/${encodeURIComponent(token)}`, { auth: false }),
  getPrefs: () => request('/api/preferences'),
  savePrefs: (p) => request('/api/preferences', { method: 'PUT', body: p }),
  recommend: (p) => request('/api/recommendations', { method: 'POST', body: p }),
}
