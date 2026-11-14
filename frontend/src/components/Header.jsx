import { Link, NavLink } from 'react-router-dom'
import { useAuth, useCart, useStore } from '../context/AppContext.jsx'

export default function Header() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const { event } = useStore()

  return (
    <header className="header">
      <div className="container header-row">
        <Link to="/" className="brand">{event?.emoji || '🛍️'} ShopFest</Link>
        <nav className="nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/products">All products</NavLink>
          {user && <NavLink to="/orders">My orders</NavLink>}
          {user?.is_staff && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="nav nav-right">
          <NavLink to="/cart" className="cart-link">
            Cart{count > 0 && <span className="cart-count">{count}</span>}
          </NavLink>
          {user ? (
            <>
              <NavLink to="/profile">{user.full_name?.split(' ')[0] || 'Profile'}</NavLink>
              <button type="button" className="link-btn"
                onClick={() => { logout(); window.location.assign('/') }}>Log out</button>
            </>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
        </div>
      </div>
    </header>
  )
}
