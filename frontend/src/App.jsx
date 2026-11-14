import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import { Spinner } from './components/Bits.jsx'
import { useAuth } from './context/AppContext.jsx'
import Home from './pages/Home.jsx'
import Products from './pages/Products.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import Profile from './pages/Profile.jsx'
import { Login, Register } from './pages/Auth.jsx'
import AdminLayout from './admin/AdminLayout.jsx'
import Dashboard from './admin/Dashboard.jsx'
import AdminProducts from './admin/AdminProducts.jsx'
import ProductForm from './admin/ProductForm.jsx'
import AdminEvents from './admin/AdminEvents.jsx'
import AdminUsers from './admin/AdminUsers.jsx'
import AdminOrders from './admin/AdminOrders.jsx'

function RequireAuth({ admin = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (admin && !user.is_staff) return <Navigate to="/" replace />
  return <Outlet />
}

function ShopLayout() {
  return (
    <>
      <Header />
      <main className="container page">
        <Outlet />
      </main>
      <footer className="footer">ShopFest · a demo store built with Django REST Framework and React</footer>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<ShopLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:slug" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route element={<RequireAuth />}>
          <Route path="checkout" element={<Checkout />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<div className="empty"><h2>Page not found</h2></div>} />
      </Route>
      <Route element={<RequireAuth admin />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductForm />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="orders" element={<AdminOrders />} />
        </Route>
      </Route>
    </Routes>
  )
}
