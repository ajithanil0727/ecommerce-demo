import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AppContext.jsx'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  return (
    <div className="admin">
      <aside className="admin-side">
        <Link to="/admin" className="brand">🛍️ ShopFest <small>Admin</small></Link>
        <nav>
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/events">Events</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
        </nav>
        <div className="admin-side-foot">
          <Link to="/">← View store</Link>
          <span className="muted">{user.email}</span>
          <button type="button" className="link-btn" onClick={() => { logout(); window.location.assign('/') }}>Log out</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
