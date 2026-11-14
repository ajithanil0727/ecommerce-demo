import { Link } from 'react-router-dom'
import { ErrorNote, ProductGrid, Spinner } from '../components/Bits.jsx'
import { useStore } from '../context/AppContext.jsx'

export default function Home() {
  const { event, products, loading, error } = useStore()
  if (loading) return <Spinner />

  const heroStyle = event?.banner_image
    ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.6), rgba(0,0,0,.15)), url(${event.banner_image})` }
    : undefined

  return (
    <>
      <section className={`hero ${event ? 'hero-event' : ''}`} style={heroStyle}>
        {event && <span className="hero-emoji" aria-hidden="true">{event.emoji}</span>}
        <div>
          {event && <span className="hero-kicker">{event.name} special</span>}
          <h1>{event?.headline || 'Everything you need, delivered.'}</h1>
          <p>{event?.subheadline || 'Browse our full range of decor, fashion, food and more.'}</p>
          {event && <Link to="/products" className="btn btn-light">Browse the full store</Link>}
        </div>
      </section>

      <ErrorNote>{error}</ErrorNote>

      <div className="section-head">
        <h2>{event ? `${event.emoji} ${event.name} picks` : 'Our products'}</h2>
        <span className="muted">{products.length} item{products.length === 1 ? '' : 's'}</span>
      </div>
      <ProductGrid products={products}
        empty={event ? `No products are tagged for ${event.name} yet.` : 'No products yet.'} />
    </>
  )
}
