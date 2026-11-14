import { Link, useLocation, useParams } from 'react-router-dom'
import { formatDate, money } from '../api'
import { Spinner, StatusBadge, useFetch } from '../components/Bits.jsx'

const WHATSAPP_NOTE = {
  sent: (o) => `A WhatsApp confirmation was sent to ${o.phone}.`,
  logged: (o) => `WhatsApp confirmation for ${o.phone} was recorded (sending is not switched on for this demo yet).`,
  failed: (o) => `We could not deliver the WhatsApp confirmation to ${o.phone}, but your order is confirmed.`,
  pending: () => 'Your WhatsApp confirmation is on its way.',
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const justPlaced = useLocation().state?.justPlaced
  const { data: order, loading, error } = useFetch(`/api/orders/${orderId}/`)

  if (loading) return <Spinner />
  if (error || !order) {
    return <div className="empty"><h2>Order not found</h2><Link to="/orders">Back to my orders</Link></div>
  }

  return (
    <>
      {justPlaced && (
        <div className="success-banner">
          <h2>🎉 Order placed!</h2>
          <p>Your order ID is <strong>{order.order_id}</strong>. {WHATSAPP_NOTE[order.whatsapp_status](order)}</p>
        </div>
      )}
      <div className="section-head">
        <h2>Order {order.order_id}</h2>
        <StatusBadge status={order.status} />
      </div>
      <p className="muted">Placed on {formatDate(order.created_at)}</p>

      <div className="two-col">
        <div className="card list">
          {order.items.map((item) => (
            <div className="line" key={item.id}>
              <div className="line-thumb">{item.image && <img src={item.image} alt="" />}</div>
              <div className="line-main">
                {item.product_slug
                  ? <Link to={`/products/${item.product_slug}`}><strong>{item.product_name}</strong></Link>
                  : <strong>{item.product_name}</strong>}
                <span className="muted">{money(item.price)} × {item.quantity}</span>
              </div>
              <strong className="line-total">{money(item.subtotal)}</strong>
            </div>
          ))}
          <div className="row total pad"><span>Total</span><span>{money(order.total)}</span></div>
        </div>
        <aside className="card summary">
          <h3>Delivery</h3>
          <p>{order.full_name}<br />{order.address}<br />{order.city} – {order.pincode}</p>
          <p className="muted">WhatsApp: {order.phone}</p>
          {!justPlaced && <p className="muted">{WHATSAPP_NOTE[order.whatsapp_status](order)}</p>}
          <Link to="/orders" className="btn btn-outline btn-block">All my orders</Link>
        </aside>
      </div>
    </>
  )
}
