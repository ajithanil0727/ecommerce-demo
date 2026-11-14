import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ErrorNote, Field } from '../components/Bits.jsx'
import { useAuth, useCart, useStore } from '../context/AppContext.jsx'
import { CartSummary } from './Cart.jsx'

export default function Checkout() {
  const { user } = useAuth()
  const cart = useCart()
  const store = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: user.full_name || '', phone: user.phone || '', address: user.address || '',
    city: user.city || '', pincode: user.pincode || '',
  })
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [error, setError] = useState('')

  if (!cart.items.length && !placed) return <Navigate to="/cart" replace />

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setPlacing(true)
    setError('')
    try {
      const order = await api('/api/orders/', {
        method: 'POST',
        body: { ...form, items: cart.items.map((i) => ({ product: i.id, quantity: i.quantity })) },
      })
      setPlaced(true)
      cart.clear()
      store.reload() // stock changed
      navigate(`/orders/${order.order_id}`, { replace: true, state: { justPlaced: true } })
    } catch (err) {
      setError(err.message)
      setPlacing(false)
    }
  }

  return (
    <>
      <h2>Checkout</h2>
      <form className="two-col" onSubmit={submit}>
        <div className="card form">
          <h3>Delivery details</h3>
          <Field label="Full name">
            <input name="full_name" value={form.full_name} onChange={change} required />
          </Field>
          <Field label="WhatsApp number" hint="Your order confirmation and order ID are sent to this number.">
            <input name="phone" type="tel" value={form.phone} onChange={change} required
              placeholder="9876543210" pattern="\+?[\d\s\-]{10,16}" title="10-digit mobile number" />
          </Field>
          <Field label="Address">
            <textarea name="address" rows="3" value={form.address} onChange={change} required />
          </Field>
          <div className="form-row">
            <Field label="City"><input name="city" value={form.city} onChange={change} required /></Field>
            <Field label="PIN code"><input name="pincode" value={form.pincode} onChange={change} required /></Field>
          </div>
          <p className="muted">Payment: cash on delivery (demo store — no payment is taken).</p>
        </div>
        <CartSummary>
          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-block" disabled={placing}>
            {placing ? 'Placing order…' : 'Place order'}
          </button>
        </CartSummary>
      </form>
    </>
  )
}
