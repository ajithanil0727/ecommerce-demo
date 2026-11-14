import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorNote, Price, Spinner, useFetch } from '../components/Bits.jsx'
import { useCart, useToast } from '../context/AppContext.jsx'

export default function ProductDetail() {
  const { slug } = useParams()
  const { data: product, loading, error } = useFetch(`/api/products/${slug}/`)
  const [active, setActive] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const cart = useCart()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => { setActive(0); setQuantity(1) }, [slug])

  if (loading) return <Spinner />
  if (error || !product) {
    return <div className="empty"><h2>Product not found</h2><Link to="/products">Back to all products</Link></div>
  }

  const inCart = cart.items.find((i) => i.id === product.id)?.quantity || 0
  const available = product.stock - inCart
  const images = product.images

  const add = (thenCheckout) => {
    cart.add(product, quantity)
    if (thenCheckout) navigate('/cart')
    else toast(`Added ${quantity} × ${product.name} to your cart`)
    setQuantity(1)
  }

  return (
    <div className="detail">
      <div className="gallery">
        <div className="gallery-main">
          {images.length ? <img src={images[active]?.image} alt={product.name} /> : <span>No photo</span>}
        </div>
        {images.length > 1 && (
          <div className="gallery-thumbs">
            {images.map((img, index) => (
              <button type="button" key={img.id} className={index === active ? 'active' : ''}
                onClick={() => setActive(index)} aria-label={`Photo ${index + 1}`}>
                <img src={img.image} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="detail-info">
        <div className="tags">
          {product.category && <span className="tag tag-plain">{product.category}</span>}
          {product.events.map((e) => <span key={e.id} className="tag">{e.emoji} {e.name}</span>)}
        </div>
        <h1>{product.name}</h1>
        <div className="detail-price"><Price price={product.price} mrp={product.mrp} /></div>
        <p className="description">{product.description}</p>

        {product.stock === 0 ? (
          <ErrorNote>This item is sold out.</ErrorNote>
        ) : (
          <>
            <p className={product.stock <= 5 ? 'stock low' : 'stock'}>
              {product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
              {inCart > 0 && ` · ${inCart} already in your cart`}
            </p>
            {available > 0 ? (
              <div className="buy-row">
                <div className="qty">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity">−</button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(available, q + 1))}
                    aria-label="Increase quantity">+</button>
                </div>
                <button type="button" className="btn" onClick={() => add(false)}>Add to cart</button>
                <button type="button" className="btn btn-outline" onClick={() => add(true)}>Buy now</button>
              </div>
            ) : (
              <Link to="/cart" className="btn">All available stock is in your cart — view cart</Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
