import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ErrorNote, Field } from '../components/Bits.jsx'
import { useAuth } from '../context/AppContext.jsx'

function useAuthForm(action) {
  const navigate = useNavigate()
  const from = useLocation().state?.from
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e, form) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = await action(form)
      navigate(from || (user.is_staff ? '/admin' : '/'), { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return { error, busy, submit, from }
}

export function Login() {
  const { user, login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const { error, busy, submit, from } = useAuthForm((f) => login(f.email, f.password))
  if (user && !busy) return <Navigate to="/" replace />
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  return (
    <form className="card form auth" onSubmit={(e) => submit(e, form)}>
      <h2>Log in</h2>
      <Field label="Email">
        <input name="email" type="email" value={form.email} onChange={change} required autoComplete="email" />
      </Field>
      <Field label="Password">
        <input name="password" type="password" value={form.password} onChange={change} required
          autoComplete="current-password" />
      </Field>
      <ErrorNote>{error}</ErrorNote>
      <button className="btn btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="muted center">New here? <Link to="/register" state={{ from }}>Create an account</Link></p>
    </form>
  )
}

export function Register() {
  const { user, register } = useAuth()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })
  const { error, busy, submit, from } = useAuthForm(register)
  if (user && !busy) return <Navigate to="/" replace />
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  return (
    <form className="card form auth" onSubmit={(e) => submit(e, form)}>
      <h2>Create your account</h2>
      <Field label="Full name">
        <input name="full_name" value={form.full_name} onChange={change} required autoComplete="name" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" value={form.email} onChange={change} required autoComplete="email" />
      </Field>
      <Field label="WhatsApp number" hint="Order confirmations are sent here.">
        <input name="phone" type="tel" value={form.phone} onChange={change} required placeholder="9876543210" />
      </Field>
      <Field label="Password" hint="At least 6 characters.">
        <input name="password" type="password" value={form.password} onChange={change} required minLength={6}
          autoComplete="new-password" />
      </Field>
      <ErrorNote>{error}</ErrorNote>
      <button className="btn btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Sign up'}</button>
      <p className="muted center">Already have an account? <Link to="/login" state={{ from }}>Log in</Link></p>
    </form>
  )
}
