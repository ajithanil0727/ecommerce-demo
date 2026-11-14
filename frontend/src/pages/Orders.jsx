import { Link } from 'react-router-dom'
import { formatDate, money } from '../api'
import { ErrorNote, Spinner, StatusBadge, useFetch } from '../components/Bits.jsx'

export default function Orders() {
  const { data: orders, loading, error } = useFetch('/api/orders/')
  if (loading) return <Spinner />
  return (
    <>
      <h2>My orders</h2>
      <ErrorNote>{error}</ErrorNote>
      {orders && !orders.length && (
        <div className="empty">
          <p>You haven't placed any orders yet.</p>
          <Link to="/" className="btn">Start shopping</Link>
        </div>
      )}
      <div className="stack">
        {orders?.map((order) => (
          <Link to={`/orders/${order.order_id}`} className="card order-card" key={order.id}>
            <div>
              <strong>{order.order_id}</strong>
              <span className="muted">{formatDate(order.created_at)}</span>
            </div>
            <span className="muted order-items">
              {order.items.map((i) => `${i.product_name} × ${i.quantity}`).join(', ')}
            </span>
            <StatusBadge status={order.status} />
            <strong>{money(order.total)}</strong>
          </Link>
        ))}
      </div>
    </>
  )
}
