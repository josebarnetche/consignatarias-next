'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIAS_RESULTADO, etiquetaCategoria } from '@/lib/reports/resultado-categorias'

/**
 * Fila del desglose. 17-10-2026: la categoría pasa de texto libre a un desplegable con
 * las categorías del Valor de Referencia (más "Otra", que conserva el texto libre) y se
 * suma el peso promedio por cabeza. Es lo que permite comparar el remate contra el VR
 * en el panel ("Tu precio contra el mercado"): con texto libre, "Vacas c/cría" o
 * "VACA CONS." no se podían cruzar. Los precios siguen en ARS por kg vivo, que es lo
 * que ya pedía el formulario y lo que mide el VR.
 */
interface CategoryRow {
  /** Slug del VR, o OTRA para texto libre. */
  categoria_vr: string
  /** Texto libre, sólo cuando categoria_vr === OTRA. */
  category: string
  heads: string
  peso_kg: string
  avg_price: string
  max_price: string
}

const OTRA = 'otra'

interface Props {
  consignatariaSlug: string
  consignatariaName: string
}

const EMPTY_CATEGORY: CategoryRow = { categoria_vr: '', category: '', heads: '', peso_kg: '', avg_price: '', max_price: '' }

/** La etiqueta que se guarda en `category`: la del desplegable, o el texto de "Otra". */
function nombreCategoria(c: CategoryRow): string {
  if (c.categoria_vr === OTRA) return c.category.trim()
  return etiquetaCategoria(c.categoria_vr) ?? ''
}

export default function ResultadoForm({ consignatariaSlug, consignatariaName }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [auctionDate, setAuctionDate] = useState('')
  const [auctionTitle, setAuctionTitle] = useState('')
  const [location, setLocation] = useState('')
  const [headsOffered, setHeadsOffered] = useState('')
  const [headsSold, setHeadsSold] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [categories, setCategories] = useState<CategoryRow[]>([])

  function addCategory() {
    setCategories(prev => [...prev, { ...EMPTY_CATEGORY }])
  }

  function removeCategory(index: number) {
    setCategories(prev => prev.filter((_, i) => i !== index))
  }

  function updateCategory(index: number, field: keyof CategoryRow, value: string) {
    setCategories(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const categoryResults = categories
      .filter(c => nombreCategoria(c))
      .map(c => ({
        category: nombreCategoria(c),
        categoria_vr: c.categoria_vr && c.categoria_vr !== OTRA ? c.categoria_vr : undefined,
        heads: c.heads ? parseInt(c.heads) : undefined,
        peso_kg: c.peso_kg ? parseFloat(c.peso_kg) : undefined,
        avg_price: c.avg_price ? parseFloat(c.avg_price) : undefined,
        max_price: c.max_price ? parseFloat(c.max_price) : undefined,
      }))

    const body = {
      consignataria_slug: consignatariaSlug,
      auction_date: auctionDate,
      auction_title: auctionTitle.trim(),
      location: location.trim() || undefined,
      total_heads_offered: headsOffered ? parseInt(headsOffered) : null,
      total_heads_sold: headsSold ? parseInt(headsSold) : null,
      min_price: minPrice ? parseFloat(minPrice) : null,
      average_price: avgPrice ? parseFloat(avgPrice) : null,
      max_price: maxPrice ? parseFloat(maxPrice) : null,
      category_results: categoryResults.length > 0 ? categoryResults : null,
      notes: notes.trim() || undefined,
    }

    try {
      const res = await fetch('/api/auction-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al enviar')
        setSubmitting(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Error de conexión')
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full bg-zinc-900 border border-terminal-border rounded-terminal px-2 py-1.5 text-data font-terminal text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-accent'
  const labelClass = 'text-xxs font-terminal text-zinc-500 uppercase tracking-wider'

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">CARGAR RESULTADO</span>
          </div>
          <div className="px-panel py-3">
            <span className="text-data font-terminal text-zinc-300">{consignatariaName}</span>
          </div>
        </div>

        {/* Basic info */}
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">DATOS DEL REMATE</span>
          </div>
          <div className="px-panel py-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Fecha *</label>
                <input
                  type="date"
                  required
                  value={auctionDate}
                  onChange={e => setAuctionDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Ubicación</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Ciudad, Provincia"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Título *</label>
              <input
                type="text"
                required
                value={auctionTitle}
                onChange={e => setAuctionTitle(e.target.value)}
                placeholder="Ej: Remate especial de invernada"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Heads & Prices */}
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">CABEZAS Y PRECIOS</span>
          </div>
          <div className="px-panel py-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Cabezas ofrecidas</label>
                <input
                  type="number"
                  min="0"
                  value={headsOffered}
                  onChange={e => setHeadsOffered(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cabezas vendidas</label>
                <input
                  type="number"
                  min="0"
                  value={headsSold}
                  onChange={e => setHeadsSold(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Precio mín. ($/kg vivo)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Precio prom. ($/kg vivo)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={avgPrice}
                  onChange={e => setAvgPrice(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Precio máx. ($/kg vivo)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">DESGLOSE POR CATEGORÍA</span>
            <button
              type="button"
              onClick={addCategory}
              className="text-xxs font-terminal text-accent hover:underline"
            >
              + Agregar
            </button>
          </div>
          {categories.length > 0 && (
            <div className="divide-y divide-terminal-border">
              {categories.map((cat, i) => (
                <div key={i} className="px-panel py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={cat.categoria_vr}
                      onChange={e => updateCategory(i, 'categoria_vr', e.target.value)}
                      aria-label="Categoría"
                      className={`${inputClass} flex-1`}
                    >
                      <option value="" disabled>Elegí la categoría</option>
                      {CATEGORIAS_RESULTADO.map(c => (
                        <option key={c.slug} value={c.slug}>{c.etiqueta}</option>
                      ))}
                      <option value={OTRA}>Otra</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeCategory(i)}
                      className="text-xxs font-terminal text-negative hover:underline flex-shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                  {cat.categoria_vr === OTRA && (
                    <input
                      type="text"
                      value={cat.category}
                      onChange={e => updateCategory(i, 'category', e.target.value)}
                      placeholder="Ej: Vaca con cría, Vientres preñados"
                      aria-label="Nombre de la categoría"
                      className={inputClass}
                    />
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className={labelClass}>Cabezas</label>
                      <input
                        type="number"
                        min="0"
                        value={cat.heads}
                        onChange={e => updateCategory(i, 'heads', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Peso prom. (kg)</label>
                      <input
                        type="number"
                        min="0"
                        max="1500"
                        step="1"
                        value={cat.peso_kg}
                        onChange={e => updateCategory(i, 'peso_kg', e.target.value)}
                        placeholder="Opcional"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Prom. ($/kg vivo)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cat.avg_price}
                        onChange={e => updateCategory(i, 'avg_price', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Máx. ($/kg vivo)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cat.max_price}
                        onChange={e => updateCategory(i, 'max_price', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="px-panel py-2">
                <span className="text-xxs font-terminal text-zinc-500">
                  Precios en $ por kg vivo, como los mide el{' '}
                  <Link href="/metodologia/vr" className="text-accent hover:underline">Valor de Referencia</Link>.
                  Con el peso promedio por cabeza, tu precio se compara contra los lotes de ese mismo peso.
                  Si vendiste por cabeza, dejá el precio vacío y anotalo en observaciones.
                </span>
              </div>
            </div>
          )}
          {categories.length === 0 && (
            <div className="px-panel py-3">
              <span className="text-xxs font-terminal text-zinc-500">
                Opcional — agregá categorías para ver, en tu panel, cómo quedó cada una contra el Valor de Referencia.
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">OBSERVACIONES</span>
          </div>
          <div className="px-panel py-3">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre el remate..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="terminal-panel border-negative/30">
            <div className="px-panel py-2">
              <span className="text-xxs font-terminal text-negative">{error}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-accent text-black text-data font-terminal rounded-terminal hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Cargar resultado'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 border border-terminal-border text-zinc-400 text-data font-terminal rounded-terminal hover:border-zinc-500"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
