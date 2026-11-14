import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ErrorNote, Field } from '../components/Bits.jsx'
import { useAuth, useToast } from '../context/AppContext.jsx'

export default function Profile() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    full_name: user.full_name, phone: user.phone, address: user.address,
    city: user.city, pincode: user.pincode,
  })
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [saving, setSaving] = useState(false)

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      setUser(await api('/api/auth/me/', { method: 'PATCH', body: form }))
      toast('Profile saved')
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    try {
      await api('/api/auth/change-password/', { method: 'POST', body: passwords })
      setPasswords({ current_password: '', new_password: '' })
      toast('Password updated')
    } catch (err) { setPasswordError(err.message) }
  }

  return (
    <>
      <div className="section-head">
        <h2>My profile</h2>
        <Link to="/orders" className="btn btn-outline">View order history</Link>
      </div>
      <div className="two-col even">
        <form className="card form" onSubmit={save}>
          <h3>Personal details</h3>
          <Field label="Email"><input value={user.email} disabled /></Field>
          <Field label="Full name"><input name="full_name" value={form.full_name} onChange={change} required /></Field>
          <Field label="WhatsApp number"><input name="phone" type="tel" value={form.phone} onChange={change} /></Field>
          <Field label="Address"><textarea name="address" rows="3" value={form.address} onChange={change} /></Field>
          <div className="form-row">
            <Field label="City"><input name="city" value={form.city} onChange={change} /></Field>
            <Field label="PIN code"><input name="pincode" value={form.pincode} onChange={change} /></Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </form>

        <form className="card form" onSubmit={changePassword}>
          <h3>Change password</h3>
          <Field label="Current password">
            <input type="password" value={passwords.current_password} required autoComplete="current-password"
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} />
          </Field>
          <Field label="New password" hint="At least 6 characters.">
            <input type="password" value={passwords.new_password} required minLength={6} autoComplete="new-password"
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} />
          </Field>
          <ErrorNote>{passwordError}</ErrorNote>
          <button className="btn btn-outline">Update password</button>
        </form>
      </div>
    </>
  )
}
