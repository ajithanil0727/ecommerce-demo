import { Link } from 'react-router-dom'
import { money } from '../api'
import { useCart } from '../context/AppContext.jsx'

export function CartSummary({ children }) {
  const { count, total } = useCart()
  return (
    <aside className="card summary">
      <h3>Order summary</h3>
      <div className="row"><span>Items ({count})</span><span>{money(total)}</span></div>
      <div className="row"><span>Delivery</span><span>Free</span></div>
      <div className="row total"><span>Total</span><span>{money(total)}</span></div>
      {children}
    </aside>
  )
}

export default function Cart() {
  const { items, setQuantity, remove } = useCart()

  if (!items.length) {
    return (
      <div className="empty">
        <h2>Your cart is empty</h2>
        <Link to="/" className="btn">Start shopping</Link>
      </div>
    )
  }

  return (
    <>
      <h2>Your cart</h2>
      <div className="two-col">
        <div className="card list">
          {items.map((item) => (
            <div className="line" key={item.id}>
              <Link to={`/products/${item.slug}`} className="line-thumb">
                {item.image && <img src={item.image} alt="" />}
              </Link>
              <div className="line-main">
                <Link to={`/products/${item.slug}`}><strong>{item.name}</strong></Link>
                <span className="muted">{money(item.price)} each</span>
                <button type="button" className="link-btn danger" onClick={() => remove(item.id)}>Remove</button>
              </div>
              <div className="qty">
                <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1} aria-label="Decrease quantity">−</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.stock} aria-label="Increase quantity">+</button>
              </div>
              <strong className="line-total">{money(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>
        <CartSummary>
          <Link to="/checkout" className="btn btn-block">Proceed to checkout</Link>
        </CartSummary>
      </div>
    </>
  )
}
