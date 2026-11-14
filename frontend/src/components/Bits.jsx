import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, money } from '../api'

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />
}

export function ErrorNote({ children }) {
  return children ? <div className="error-note" role="alert">{children}</div> : null
}

/** Load data from the API. Returns { data, loading, error, reload, setData }. */
export function useFetch(path) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!path) return undefined
    let alive = true
    setState((s) => ({ ...s, loading: true, error: '' }))
    api(path)
      .then((data) => alive && setState({ data, loading: false, error: '' }))
      .catch((err) => alive && setState({ data: null, loading: false, error: err.message }))
    return () => { alive = false }
  }, [path, tick])
  return {
    ...state,
    reload: () => setTick((t) => t + 1),
    setData: (data) => setState((s) => ({ ...s, data })),
  }
}

export function Price({ price, mrp }) {
  const off = mrp && Number(mrp) > Number(price)
    ? Math.round((1 - Number(price) / Number(mrp)) * 100) : 0
  return (
    <span className="price">
      <strong>{money(price)}</strong>
      {off > 0 && <><s>{money(mrp)}</s><em>{off}% off</em></>}
    </span>
  )
}

export function ProductCard({ product }) {
  const image = product.images[0]?.image
  return (
    <Link to={`/products/${product.slug}`} className="card product-card">
      <div className="thumb">
        {image ? <img src={image} alt={product.name} loading="lazy" /> : <span>No photo</span>}
        {product.stock === 0 && <span className="badge badge-muted corner">Sold out</span>}
      </div>
      <div className="product-card-body">
        <div className="tags">
          {product.events.map((e) => <span key={e.id} className="tag">{e.emoji} {e.name}</span>)}
        </div>
        <h3>{product.name}</h3>
        <Price price={product.price} mrp={product.mrp} />
      </div>
    </Link>
  )
}

export function ProductGrid({ products, empty = 'No products to show.' }) {
  if (!products.length) return <div className="empty">{empty}</div>
  return <div className="grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
}

export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{status}</span>
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}
