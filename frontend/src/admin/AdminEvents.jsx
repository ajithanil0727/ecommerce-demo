import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { ErrorNote, Field, Modal, Spinner, useFetch } from '../components/Bits.jsx'
import ImageCropper from '../components/ImageCropper.jsx'
import { useStore, useToast } from '../context/AppContext.jsx'

const BLANK = {
  name: '', emoji: '', headline: '', subheadline: '',
  primary_color: '#4f46e5', accent_color: '#f59e0b', background_color: '#f8fafc',
}
const BANNER_ASPECT = [{ label: 'Banner 3:1', value: 3 }]

function EventForm({ event, onClose, onSaved }) {
  const [form, setForm] = useState(event ? { ...BLANK, ...event } : BLANK)
  const [banner, setBanner] = useState(null)        // { blob, url } newly cropped
  const [removeBanner, setRemoveBanner] = useState(false)
  const [cropFile, setCropFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef(null)

  useEffect(() => () => { if (banner) URL.revokeObjectURL(banner.url) }, [banner])

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const preview = banner?.url || (!removeBanner && event?.banner_image) || ''

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const data = new FormData()
    Object.keys(BLANK).forEach((key) => data.append(key, form[key]))
    if (banner) data.append('banner_image', banner.blob, 'banner.jpg')
    else if (removeBanner) data.append('remove_banner', 'true')
    try {
      await api(event ? `/api/admin/events/${event.id}/` : '/api/admin/events/',
        { method: event ? 'PATCH' : 'POST', body: data })
      onSaved(event ? 'Event updated' : 'Event created')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (cropFile) {
    return (
      <ImageCropper file={cropFile} aspects={BANNER_ASPECT} title="Crop banner"
        onCancel={() => setCropFile(null)}
        onDone={(blob) => { setBanner({ blob, url: URL.createObjectURL(blob) }); setRemoveBanner(false); setCropFile(null) }} />
    )
  }

  return (
    <Modal title={event ? `Edit ${event.name}` : 'New event'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <div className="form-row">
          <Field label="Name"><input name="name" value={form.name} onChange={change} required placeholder="Diwali" /></Field>
          <Field label="Emoji"><input name="emoji" value={form.emoji} onChange={change} maxLength={8} placeholder="🪔" /></Field>
        </div>
        <Field label="Home page headline"><input name="headline" value={form.headline} onChange={change} /></Field>
        <Field label="Sub-headline"><input name="subheadline" value={form.subheadline} onChange={change} /></Field>
        <div className="form-row">
          <Field label="Main colour"><input type="color" name="primary_color" value={form.primary_color} onChange={change} /></Field>
          <Field label="Accent colour"><input type="color" name="accent_color" value={form.accent_color} onChange={change} /></Field>
          <Field label="Page background"><input type="color" name="background_color" value={form.background_color} onChange={change} /></Field>
        </div>
        <div className="field">
          <span>Banner photo (optional)</span>
          {preview && <img className="banner-preview" src={preview} alt="Banner preview" />}
          <div className="row-actions">
            <button type="button" className="btn btn-outline" onClick={() => fileInput.current.click()}>
              {preview ? 'Replace banner' : 'Upload banner'}
            </button>
            {preview && (
              <button type="button" className="link-btn danger"
                onClick={() => { setBanner(null); setRemoveBanner(true) }}>Remove</button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" hidden
            onChange={(e) => { setCropFile(e.target.files[0] || null); e.target.value = '' }} />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save event'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminEvents() {
  const { data: events, loading, error, reload } = useFetch('/api/admin/events/')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, object = edit
  const toast = useToast()
  const store = useStore()

  const refresh = (message) => { toast(message); reload(); store.reload() }
  const run = (promise, message) => promise.then(() => refresh(message)).catch((err) => toast(err.message, 'error'))

  const activate = (event) =>
    run(api(`/api/admin/events/${event.id}/activate/`, { method: 'POST' }), `${event.name} is now live on the home page`)
  const deactivate = () =>
    run(api('/api/admin/events/deactivate/', { method: 'POST' }), 'Back to the regular store')
  const remove = (event) => {
    if (!window.confirm(`Delete the ${event.name} event? Products keep existing but lose this tag.`)) return
    run(api(`/api/admin/events/${event.id}/`, { method: 'DELETE' }), 'Event deleted')
  }

  const active = events?.find((e) => e.is_active)

  return (
    <>
      <div className="section-head">
        <h2>Events</h2>
        <button type="button" className="btn" onClick={() => setEditing(null)}>+ New event</button>
      </div>
      <p className="muted">
        Activate an event to switch the home page to its theme and list only the products tagged with it.
        {active ? ` ${active.name} is live now.` : ' No event is live — the home page shows every product.'}
      </p>
      <ErrorNote>{error}</ErrorNote>
      {loading && !events ? <Spinner /> : (
        <div className="event-grid">
          <div className={`card event-card ${!active ? 'is-live' : ''}`}>
            <div className="event-swatch" style={{ background: 'linear-gradient(120deg, #4f46e5, #f59e0b)' }}>🛍️</div>
            <h3>Regular store</h3>
            <p className="muted">Default theme, all products on the home page.</p>
            <div className="row-actions">
              {active
                ? <button type="button" className="btn btn-outline" onClick={deactivate}>Switch to regular</button>
                : <span className="badge status-delivered">Live now</span>}
            </div>
          </div>
          {events?.map((event) => (
            <div className={`card event-card ${event.is_active ? 'is-live' : ''}`} key={event.id}>
              <div className="event-swatch"
                style={{ background: `linear-gradient(120deg, ${event.primary_color}, ${event.accent_color})` }}>
                {event.emoji}
              </div>
              <h3>{event.name}</h3>
              <p className="muted">{event.headline || 'No headline'} · {event.product_count} product{event.product_count === 1 ? '' : 's'}</p>
              <div className="row-actions">
                {event.is_active
                  ? <span className="badge status-delivered">Live now</span>
                  : <button type="button" className="btn" onClick={() => activate(event)}>Activate</button>}
                <button type="button" className="link-btn" onClick={() => setEditing(event)}>Edit</button>
                <button type="button" className="link-btn danger" onClick={() => remove(event)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing !== undefined && (
        <EventForm event={editing} onClose={() => setEditing(undefined)}
          onSaved={(message) => { setEditing(undefined); refresh(message) }} />
      )}
    </>
  )
}
