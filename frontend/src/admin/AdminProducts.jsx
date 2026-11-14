import { Link } from 'react-router-dom'
import { api, money } from '../api'
import { ErrorNote, Spinner, useFetch } from '../components/Bits.jsx'
import { useStore, useToast } from '../context/AppContext.jsx'

export default function AdminProducts() {
  const { data: products, loading, error, reload } = useFetch('/api/admin/products/')
  const toast = useToast()
  const store = useStore()

  const remove = async (product) => {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return
    try {
      await api(`/api/admin/products/${product.id}/`, { method: 'DELETE' })
      toast('Product deleted')
      reload()
      store.reload()
    } catch (err) { toast(err.message, 'error') }
  }

  return (
    <>
      <div className="section-head">
        <h2>Products</h2>
        <Link to="/admin/products/new" className="btn">+ Add product</Link>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {loading && !products ? <Spinner /> : products && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>Events</th><th className="num">Price</th><th className="num">Stock</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-product">
                      <div className="line-thumb small">{p.images[0] && <img src={p.images[0].image} alt="" />}</div>
                      <div><strong>{p.name}</strong><span className="muted">{p.category} · {p.images.length} photo{p.images.length === 1 ? '' : 's'}</span></div>
                    </div>
                  </td>
                  <td><div className="tags">{p.events.map((e) => <span key={e.id} className="tag">{e.emoji} {e.name}</span>)}</div></td>
                  <td className="num">{money(p.price)}</td>
                  <td className={`num ${p.stock <= 5 ? 'warn' : ''}`}>{p.stock}</td>
                  <td><span className={`badge ${p.is_active ? 'status-delivered' : 'badge-muted'}`}>{p.is_active ? 'Live' : 'Hidden'}</span></td>
                  <td className="actions">
                    <Link to={`/admin/products/${p.id}`} className="link-btn">Edit</Link>
                    <button type="button" className="link-btn danger" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan="6" className="muted center">No products yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
