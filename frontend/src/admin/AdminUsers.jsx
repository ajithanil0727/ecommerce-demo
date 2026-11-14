import { useState } from 'react'
import { api, formatDate } from '../api'
import { ErrorNote, Field, Modal, Spinner, useFetch } from '../components/Bits.jsx'
import { useAuth, useToast } from '../context/AppContext.jsx'

const BLANK = { email: '', full_name: '', phone: '', password: '', is_staff: false, is_active: true }

function UserForm({ user, onClose, onSaved }) {
  const [form, setForm] = useState(user ? { ...BLANK, ...user, password: '' } : BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const change = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body = Object.fromEntries(Object.keys(BLANK).map((key) => [key, form[key]]))
    if (user && !body.password) delete body.password
    try {
      await api(user ? `/api/admin/users/${user.id}/` : '/api/admin/users/',
        { method: user ? 'PATCH' : 'POST', body })
      onSaved(user ? 'User updated' : 'User created')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal title={user ? `Edit ${user.email}` : 'New user'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <Field label="Email"><input name="email" type="email" value={form.email} onChange={change} required /></Field>
        <div className="form-row">
          <Field label="Full name"><input name="full_name" value={form.full_name} onChange={change} /></Field>
          <Field label="WhatsApp number"><input name="phone" type="tel" value={form.phone} onChange={change} /></Field>
        </div>
        <Field label={user ? 'New password' : 'Password'} hint={user ? 'Leave blank to keep the current password.' : 'At least 6 characters.'}>
          <input name="password" type="password" value={form.password} onChange={change}
            required={!user} minLength={6} autoComplete="new-password" />
        </Field>
        <label className="check"><input type="checkbox" name="is_staff" checked={form.is_staff} onChange={change} /> Admin (can manage the store)</label>
        <label className="check"><input type="checkbox" name="is_active" checked={form.is_active} onChange={change} /> Active (can log in)</label>
        <ErrorNote>{error}</ErrorNote>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save user'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminUsers() {
  const { data: users, loading, error, reload } = useFetch('/api/admin/users/')
  const [editing, setEditing] = useState(undefined)
  const { user: me } = useAuth()
  const toast = useToast()

  const remove = async (user) => {
    const orders = user.order_count ? ` Their ${user.order_count} order(s) will be deleted too.` : ''
    if (!window.confirm(`Delete ${user.email}?${orders} This cannot be undone.`)) return
    try {
      await api(`/api/admin/users/${user.id}/`, { method: 'DELETE' })
      toast('User deleted')
      reload()
    } catch (err) { toast(err.message, 'error') }
  }

  return (
    <>
      <div className="section-head">
        <h2>Users</h2>
        <button type="button" className="btn" onClick={() => setEditing(null)}>+ Add user</button>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {loading && !users ? <Spinner /> : users && (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>User</th><th>Phone</th><th>Role</th><th>Status</th><th className="num">Orders</th><th>Joined</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.full_name || '—'}</strong><span className="muted block">{u.email}</span></td>
                  <td>{u.phone || '—'}</td>
                  <td><span className={`badge ${u.is_staff ? 'status-shipped' : 'badge-muted'}`}>{u.is_staff ? 'Admin' : 'Customer'}</span></td>
                  <td><span className={`badge ${u.is_active ? 'status-delivered' : 'status-cancelled'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
                  <td className="num">{u.order_count}</td>
                  <td className="muted">{formatDate(u.date_joined)}</td>
                  <td className="actions">
                    <button type="button" className="link-btn" onClick={() => setEditing(u)}>Edit</button>
                    {u.id !== me.id && <button type="button" className="link-btn danger" onClick={() => remove(u)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing !== undefined && (
        <UserForm user={editing} onClose={() => setEditing(undefined)}
          onSaved={(message) => { setEditing(undefined); toast(message); reload() }} />
      )}
    </>
  )
}
