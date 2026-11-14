import { Link } from 'react-router-dom'
import { money } from '../api'
import { ErrorNote, Spinner, useFetch } from '../components/Bits.jsx'

export default function Dashboard() {
  const { data, loading, error } = useFetch('/api/admin/stats/')
  if (loading) return <Spinner />
  return (
    <>
      <h2>Dashboard</h2>
      <ErrorNote>{error}</ErrorNote>
      {data && (
        <div className="stats">
          <Link to="/admin/orders" className="card stat"><span>Orders</span><strong>{data.orders}</strong></Link>
          <Link to="/admin/orders" className="card stat"><span>Revenue</span><strong>{money(data.revenue)}</strong></Link>
          <Link to="/admin/products" className="card stat">
            <span>Products</span><strong>{data.products}</strong>
            {data.low_stock > 0 && <small className="warn">{data.low_stock} low on stock</small>}
          </Link>
          <Link to="/admin/users" className="card stat"><span>Users</span><strong>{data.users}</strong></Link>
          <Link to="/admin/events" className="card stat">
            <span>Active event</span><strong>{data.active_event || 'None'}</strong>
            <small>Change the home page theme</small>
          </Link>
        </div>
      )}
    </>
  )
}
