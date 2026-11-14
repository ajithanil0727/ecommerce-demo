// Small fetch wrapper: JSON + file uploads, JWT header, one silent token refresh on 401.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const TOKENS_KEY = 'shopfest_tokens'

export const tokens = {
  get: () => {
    try { return JSON.parse(localStorage.getItem(TOKENS_KEY)) || null } catch { return null }
  },
  set: (value) => localStorage.setItem(TOKENS_KEY, JSON.stringify(value)),
  clear: () => localStorage.removeItem(TOKENS_KEY),
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

// Turn DRF error bodies ({detail}, {field: [msgs]}, nested) into one readable sentence.
function describe(data, status) {
  if (!data) return status >= 500 ? 'The server had a problem. Please try again.' : 'Request failed.'
  if (typeof data === 'string') return data
  if (data.detail) return String(data.detail)
  const parts = []
  const walk = (value, label) => {
    if (Array.isArray(value)) value.forEach((v) => walk(v, label))
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => walk(v, k))
    else if (value != null) {
      const skip = !label || label === 'non_field_errors' || label === 'items'
      parts.push(skip ? String(value) : `${label.replace(/_/g, ' ')}: ${value}`)
    }
  }
  walk(data)
  return parts.join(' ') || 'Request failed.'
}

async function refreshAccess() {
  const current = tokens.get()
  if (!current?.refresh) return false
  const res = await fetch(`${API_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: current.refresh }),
  })
  if (!res.ok) return false
  const data = await res.json()
  tokens.set({ ...current, access: data.access })
  return true
}

async function send(path, { method = 'GET', body } = {}) {
  const headers = {}
  const access = tokens.get()?.access
  if (access) headers.Authorization = `Bearer ${access}`
  let payload = body
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  return fetch(`${API_URL}${path}`, { method, headers, body: payload })
}

export async function api(path, options = {}) {
  let res
  try {
    res = await send(path, options)
    if (res.status === 401 && tokens.get()?.refresh && !path.startsWith('/api/auth/login')) {
      if (await refreshAccess()) {
        res = await send(path, options)
      } else {
        tokens.clear()
        window.dispatchEvent(new Event('auth:expired'))
      }
    }
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, null)
  }
  if (res.status === 204) return null
  let data = null
  try { data = await res.json() } catch { /* empty or non-JSON body */ }
  if (!res.ok) throw new ApiError(describe(data, res.status), res.status, data)
  return data
}

export const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number(value) || 0)

export const formatDate = (value) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
