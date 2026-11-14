import { useEffect, useState } from 'react'
import { ErrorNote, ProductGrid, Spinner, useFetch } from '../components/Bits.jsx'

export default function Products() {
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')

  // Wait until typing pauses before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text])

  const { data, loading, error } = useFetch(
    `/api/products/${search ? `?search=${encodeURIComponent(search)}` : ''}`)

  return (
    <>
      <div className="section-head">
        <h2>All products</h2>
        <input className="search" type="search" placeholder="Search products…" value={text}
          onChange={(e) => setText(e.target.value)} aria-label="Search products" />
      </div>
      <ErrorNote>{error}</ErrorNote>
      {loading && !data ? <Spinner /> : data && (
        <ProductGrid products={data}
          empty={search ? `Nothing matches “${search}”.` : 'No products yet.'} />
      )}
    </>
  )
}
