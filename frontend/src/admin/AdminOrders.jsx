import { Fragment, useState } from 'react'
import { api, formatDate, money } from '../api'
import { ErrorNote, Spinner, useFetch } from '../components/Bits.jsx'
import { useToast } from '../context/AppContext.jsx'

const STATUSES = ['placed', 'shipped', 'delivered', 'cancelled']
const WHATSAPP_BADGE = { sent: 'status-delivered', logged: 'status-shipped', failed: 'status-cancelled', pending: 'badge-muted' }

export default function AdminOrders() {
  const { data: orders, loading, error, setData } = useFetch('/api/admin/orders/')
  const [open, setOpen] = useState(null)
  const toast = useToast()

  const replace = (updated) => setData(orders.map((o) => (o.id === updated.id ? updated : o)))

  const setStatus = async (order, status) => {
    try {
      replace(await api(`/api/admin/orders/${order.id}/`, { method: 'PATCH', body: { status } }))
      toast(`${order.order_id} marked ${status}`)
    } catch (err) { toast(err.message, 'error') }
  }

  const resend = async (order) => {
    try {
      const updated = await api(`/api/admin/orders/${order.id}/resend-whatsapp/`, { method: 'POST' })
      replace(updated)
      toast(`WhatsApp: ${updated.whatsapp_status}`, updated.whatsapp_status === 'failed' ? 'error' : 'success')
    } catch (err) { toast(err.message, 'error') }
  }

  return (
    <>
      <h2>Orders</h2>
      <ErrorNote>{error}</ErrorNote>
      {loading && !orders ? <Spinner /> : orders && (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th className="num">Total</th><th>WhatsApp</th><th>Status</th><th /></tr></thead>
            <tbody>
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr>
                    <td><strong>{order.order_id}</strong><span className="muted block">{formatDate(order.created_at)}</span></td>
                    <td>{order.full_name}<span className="muted block">{order.phone}</span></td>
                    <td className="num">{money(order.total)}</td>
                    <td><span className={`badge ${WHATSAPP_BADGE[order.whatsapp_status]}`}>{order.whatsapp_status}</span></td>
                    <td>
                      <select value={order.status} onChange={(e) => setStatus(order, e.target.value)}
                        aria-label={`Status of ${order.order_id}`}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="actions">
                      <button type="button" className="link-btn" onClick={() => setOpen(open === order.id ? null : order.id)}>
                        {open === order.id ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {open === order.id && (
                    <tr className="expanded">
                      <td colSpan="6">
                        <div className="two-col even">
                          <div>
                            <h4>Items</h4>
                            {order.items.map((item) => (
                              <div className="row" key={item.id}>
                                <span>{item.product_name} × {item.quantity}</span><span>{money(item.subtotal)}</span>
                              </div>
                            ))}
                            <h4>Deliver to</h4>
                            <p>{order.address}, {order.city} – {order.pincode}<br /><span className="muted">{order.customer_email}</span></p>
                          </div>
                          <div>
                            <h4>WhatsApp message</h4>
                            <pre className="message">{order.whatsapp_detail || 'Nothing recorded.'}</pre>
                            <button type="button" className="btn btn-outline" onClick={() => resend(order)}>Send again</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!orders.length && <tr><td colSpan="6" className="muted center">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
