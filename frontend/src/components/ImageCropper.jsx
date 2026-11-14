import { useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import { Modal } from './Bits.jsx'

const MAX_SIDE = 1200

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('This file could not be read as an image.'))
    img.src = src
  })
}

/** Cut the chosen area out of the picture and return it as a JPEG blob (max 1200px). */
async function cropToBlob(src, area) {
  const img = await loadImage(src)
  const scale = Math.min(1, MAX_SIDE / Math.max(area.width, area.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(area.width * scale)
  canvas.height = Math.round(area.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Cropping failed.'))), 'image/jpeg', 0.9)
  })
}

/**
 * Crop dialog. `aspects` is a list of { label, value } choices; the first is the default.
 * Calls onDone(blob) with the cropped picture, or onCancel().
 */
export default function ImageCropper({ file, aspects, title = 'Crop photo', onDone, onCancel }) {
  const [src, setSrc] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(aspects[0].value)
  const [area, setArea] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setError('')
    return () => URL.revokeObjectURL(url)
  }, [file])

  const confirm = async () => {
    if (!area) return
    setBusy(true)
    try {
      onDone(await cropToBlob(src, area))
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <Modal title={title} onClose={onCancel} wide>
      <div className="crop-area">
        {src && (
          <Cropper image={src} crop={crop} zoom={zoom} aspect={aspect} maxZoom={4}
            onCropChange={setCrop} onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)} />
        )}
      </div>
      <div className="crop-controls">
        <label>
          Zoom
          <input type="range" min="1" max="4" step="0.01" value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        {aspects.length > 1 && (
          <div className="segmented" role="group" aria-label="Shape">
            {aspects.map((a) => (
              <button type="button" key={a.label} className={a.value === aspect ? 'active' : ''}
                onClick={() => setAspect(a.value)}>{a.label}</button>
            ))}
          </div>
        )}
      </div>
      {error && <div className="error-note">{error}</div>}
      <p className="muted">Drag the photo to position it, and use the slider or scroll to zoom.</p>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn" onClick={confirm} disabled={busy || !area}>
          {busy ? 'Cropping…' : 'Use this crop'}
        </button>
      </div>
    </Modal>
  )
}
