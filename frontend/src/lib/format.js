export const VIBES = [
  { id: 'adventure', label: 'Adventure', emoji: '🧗' },
  { id: 'culture', label: 'Culture', emoji: '🏛️' },
  { id: 'romantic', label: 'Romantic', emoji: '💞' },
  { id: 'foodie', label: 'Foodie', emoji: '🍜' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌃' },
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { id: 'wellness', label: 'Wellness', emoji: '🧘' },
]

export const INTERESTS = ['Food', 'Sightseeing', 'History', 'Shopping', 'Beaches', 'Hiking', 'Photography', 'Museums', 'Markets', 'Wildlife']

export const PACES = [
  { id: 'relaxed', label: 'Relaxed', hint: '3–4 stops / day' },
  { id: 'balanced', label: 'Balanced', hint: '5–6 stops / day' },
  { id: 'packed', label: 'Packed', hint: '7–8 stops / day' },
]

export const BUDGET_LEVELS = [
  { id: 'budget', label: 'Budget' },
  { id: 'mid', label: 'Mid-range' },
  { id: 'premium', label: 'Premium' },
]

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'AED', 'SGD']

export const TYPE_META = {
  attraction: { label: 'Sight', color: '#FF8A3D' },
  food: { label: 'Food', color: '#F5C542' },
  transport: { label: 'Transit', color: '#6C8CFF' },
  activity: { label: 'Activity', color: '#E45CC4' },
  stay: { label: 'Stay', color: '#4CC9A0' },
}

export function money(value, currency = 'INR') {
  const n = Number(value) || 0
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`
  }
}

// Dates arrive as 'YYYY-MM-DD'; parse as local time so they never shift by timezone.
export function parseDate(s) {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function fmtDate(s, opts = { day: 'numeric', month: 'short' }) {
  if (!s) return ''
  return parseDate(s).toLocaleDateString(undefined, opts)
}

export function fmtRange(a, b) {
  return `${fmtDate(a)} – ${fmtDate(b, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export function daysBetween(a, b) {
  if (!a || !b) return 0
  return Math.round((parseDate(b) - parseDate(a)) / 86400000) + 1
}

export function todayISO() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function addDaysISO(iso, n) {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function mapsLink(item, destination) {
  if (item.lat != null && item.lng != null) return `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.title} ${item.location || destination || ''}`)}`
}

export function dur(min) {
  const m = Number(min) || 0
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`
}
