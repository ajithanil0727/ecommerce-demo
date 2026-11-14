import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { ErrorNote, Field, Spinner, useFetch } from '../components/Bits.jsx'
import ImageCropper from '../components/ImageCropper.jsx'
import { useStore, useToast } from '../context/AppContext.jsx'

const ASPECTS = [
  { label: 'Square', value: 1 },
  { label: 'Portrait 3:4', value: 3 / 4 },
  { label: 'Landscape 4:3', value: 4 / 3 },
]
const BLANK = { name: '', category: '', description: '', price: '', mrp: '', stock: 0, is_active: true, event_ids: [] }

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const store = useStore()
  const events = useFetch('/api/admin/events/')
  const existing = useFetch(id ? `/api/admin/products/${id}/` : null)

  const [form, setForm] = useState(BLANK)
  const [savedImages, setSavedImages] = useState([]) // already on the server
  const [removedIds, setRemovedIds] = useState([])   // saved photos to delete on save
  const [newImages, setNewImages] = useState([])     // cropped, waiting for upload: { key, blob, url }
  const [cropQueue, setCropQueue] = useState([])     // files still to crop
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef(null)
  const nextKey = useRef(1)

  useEffect(() => {
    const p = existing.data
    if (!p) return
    setForm({
      name: p.name, category: p.category, description: p.description, price: p.price,
      mrp: p.mrp ?? '', stock: p.stock, is_active: p.is_active, event_ids: p.events.map((e) => e.id),
    })
    setSavedImages(p.images)
  }, [existing.data])

  // Free preview URLs when leaving the page.
  const previews = useRef([])
  previews.current = newImages
  useEffect(() => () => previews.current.forEach((i) => URL.revokeObjectURL(i.url)), [])

  if (id && existing.loading) return <Spinner />
  if (id && existing.error) return <ErrorNote>{existing.error}</ErrorNote>

  const change = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }
  const toggleEvent = (eventId) => setForm({
    ...form,
    event_ids: form.event_ids.includes(eventId)
      ? form.event_ids.filter((x) => x !== eventId) : [...form.event_ids, eventId],
  })

  const pickFiles = (e) => {
    setCropQueue([...e.target.files].filter((f) => f.type.startsWith('image/')))
    e.target.value = ''
  }
  const cropped = (blob) => {
    setNewImages((list) => [...list, { key: nextKey.current++, blob, url: URL.createObjectURL(blob) }])
    setCropQueue((queue) => queue.slice(1))
  }
  const dropNew = (image) => {
    URL.revokeObjectURL(image.url)
    setNewImages((list) => list.filter((i) => i.key !== image.key))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = { ...form, mrp: form.mrp === '' ? null : form.mrp }
      const product = id
        ? await api(`/api/admin/products/${id}/`, { method: 'PATCH', body })
        : await api('/api/admin/products/', { method: 'POST', body })

      const failures = []
      for (const imageId of removedIds) {
        await api(`/api/admin/images/${imageId}/`, { method: 'DELETE' }).catch((err) => failures.push(err.message))
      }
      for (const image of newImages) {
        const data = new FormData()
        data.append('image', image.blob, 'photo.jpg')
        await api(`/api/admin/products/${product.id}/images/`, { method: 'POST', body: data })
          .catch((err) => failures.push(err.message))
      }
      store.reload()
      if (failures.length) {
        toast(`Product saved, but some photos failed: ${failures[0]}`, 'error')
        navigate(`/admin/products/${product.id}`, { replace: true })
      } else {
        toast(id ? 'Product updated' : 'Product created')
        navigate('/admin/products')
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const shownSaved = savedImages.filter((i) => !removedIds.includes(i.id))

  return (
    <>
      <div className="section-head">
        <h2>{id ? 'Edit product' : 'Add product'}</h2>
        <Link to="/admin/products" className="link-btn">← Back to products</Link>
      </div>
      <form className="two-col even" onSubmit={save}>
        <div className="card form">
          <Field label="Name"><input name="name" value={form.name} onChange={change} required /></Field>
          <Field label="Category"><input name="category" value={form.category} onChange={change} placeholder="e.g. Decor" /></Field>
          <Field label="Description"><textarea name="description" rows="4" value={form.description} onChange={change} /></Field>
          <div className="form-row">
            <Field label="Price (₹)"><input name="price" type="number" min="1" step="0.01" value={form.price} onChange={change} required /></Field>
            <Field label="MRP (₹)" hint="Optional, shown struck through."><input name="mrp" type="number" min="0" step="0.01" value={form.mrp} onChange={change} /></Field>
            <Field label="Stock"><input name="stock" type="number" min="0" step="1" value={form.stock} onChange={change} required /></Field>
          </div>
          <label className="check"><input type="checkbox" name="is_active" checked={form.is_active} onChange={change} /> Visible in the store</label>
        </div>

        <div className="stack">
          <div className="card form">
            <h3>Event tags</h3>
            <p className="muted">The product appears on the home page when one of its events is active.</p>
            <div className="chips">
              {events.data?.map((ev) => (
                <button type="button" key={ev.id} onClick={() => toggleEvent(ev.id)}
                  className={`chip ${form.event_ids.includes(ev.id) ? 'active' : ''}`}
                  aria-pressed={form.event_ids.includes(ev.id)}>
                  {ev.emoji} {ev.name}
                </button>
              ))}
              {events.data && !events.data.length && <span className="muted">No events yet — create one under Events.</span>}
            </div>
          </div>

          <div className="card form">
            <h3>Photos</h3>
            <p className="muted">Each photo opens in the cropper before it is added. The first photo is the main one.</p>
            <div className="photo-grid">
              {shownSaved.map((img) => (
                <div className="photo" key={img.id}>
                  <img src={img.image} alt="" />
                  <button type="button" onClick={() => setRemovedIds([...removedIds, img.id])} aria-label="Remove photo">✕</button>
                </div>
              ))}
              {newImages.map((img) => (
                <div className="photo" key={img.key}>
                  <img src={img.url} alt="" />
                  <span className="badge corner">New</span>
                  <button type="button" onClick={() => dropNew(img)} aria-label="Remove photo">✕</button>
                </div>
              ))}
              <button type="button" className="photo photo-add" onClick={() => fileInput.current.click()}>
                + Add photos
              </button>
            </div>
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={pickFiles} />
          </div>

          <ErrorNote>{error}</ErrorNote>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : id ? 'Save changes' : 'Create product'}</button>
        </div>
      </form>

      {cropQueue.length > 0 && (
        <ImageCropper file={cropQueue[0]} aspects={ASPECTS}
          title={cropQueue.length > 1 ? `Crop photo (${cropQueue.length} left)` : 'Crop photo'}
          onDone={cropped} onCancel={() => setCropQueue((queue) => queue.slice(1))} />
      )}
    </>
  )
}
