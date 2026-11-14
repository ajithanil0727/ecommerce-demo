import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, tokens } from '../api'

/* ---------------- Toasts ---------------- */
const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)
  const toast = useCallback((message, type = 'success') => {
    const id = nextId.current++
    setToasts((list) => [...list, { id, message, type }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3500)
  }, [])
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  )
}

/* ---------------- Auth ---------------- */
const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokens.get()))

  useEffect(() => {
    if (tokens.get()) {
      api('/api/auth/me/').then(setUser).catch(() => tokens.clear()).finally(() => setLoading(false))
    }
    const onExpired = () => setUser(null)
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  const value = useMemo(() => {
    const accept = (data) => {
      tokens.set({ access: data.access, refresh: data.refresh })
      setUser(data.user)
      return data.user
    }
    return {
      user,
      loading,
      setUser,
      login: (email, password) =>
        api('/api/auth/login/', { method: 'POST', body: { email, password } }).then(accept),
      register: (form) => api('/api/auth/register/', { method: 'POST', body: form }).then(accept),
      logout: () => { tokens.clear(); setUser(null) },
    }
  }, [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ---------------- Cart (kept in this browser) ---------------- */
const CART_KEY = 'shopfest_cart'
const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || [] } catch { return [] }
}

function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(items)) }, [items])

  const value = useMemo(() => ({
    items,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    total: items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0),
    add(product, quantity = 1) {
      setItems((list) => {
        const existing = list.find((i) => i.id === product.id)
        const wanted = Math.min((existing?.quantity || 0) + quantity, product.stock)
        const line = {
          id: product.id, slug: product.slug, name: product.name, price: product.price,
          stock: product.stock, image: product.images?.[0]?.image || null, quantity: wanted,
        }
        return existing ? list.map((i) => (i.id === product.id ? line : i)) : [...list, line]
      })
    },
    setQuantity(id, quantity) {
      setItems((list) => list.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i))
    },
    remove(id) { setItems((list) => list.filter((i) => i.id !== id)) },
    clear() { setItems([]) },
  }), [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

/* ---------------- Storefront: active event + its theme ---------------- */
const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)

function applyTheme(event) {
  const root = document.documentElement.style
  const set = (name, value) => (value ? root.setProperty(name, value) : root.removeProperty(name))
  set('--primary', event?.primary_color)
  set('--accent', event?.accent_color)
  set('--bg', event?.background_color)
}

function StoreProvider({ children }) {
  const [state, setState] = useState({ event: null, products: [], loading: true, error: '' })

  const reload = useCallback(() => {
    return api('/api/storefront/')
      .then((data) => {
        applyTheme(data.event)
        setState({ event: data.event, products: data.products, loading: false, error: '' })
      })
      .catch((err) => setState((s) => ({ ...s, loading: false, error: err.message })))
  }, [])

  useEffect(() => { reload() }, [reload])

  const value = useMemo(() => ({ ...state, reload }), [state, reload])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <StoreProvider>
          <CartProvider>{children}</CartProvider>
        </StoreProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
