'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CategoryRow {
  category: string
  heads: string
  avg_price: string
  max_price: string
}

interface Props {
  consignatariaSlug: string
  consignatariaName: string
}

const EMPTY_CATEGORY: CategoryRow = { category: '', heads: '', avg_price: '', max_price: '' }

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
      .filter(c => c.category.trim())
      .map(c => ({
        category: c.category.trim(),
        heads: c.heads ? parseInt(c.heads) : undefined,
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
                <label className={labelClass}>Precio mín. ($/kg)</label>
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
                <label className={labelClass}>Precio prom. ($/kg)</label>
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
                <label className={labelClass}>Precio máx. ($/kg)</label>
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
                    <input
                      type="text"
                      value={cat.category}
                      onChange={e => updateCategory(i, 'category', e.target.value)}
                      placeholder="Ej: Novillos, Terneros, Vacas"
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeCategory(i)}
                      className="text-xxs font-terminal text-negative hover:underline flex-shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
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
                      <label className={labelClass}>Prom. ($/kg)</label>
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
                      <label className={labelClass}>Máx. ($/kg)</label>
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
            </div>
          )}
          {categories.length === 0 && (
            <div className="px-panel py-3">
              <span className="text-xxs font-terminal text-zinc-600">
                Opcional — agregá categorías para detallar precios por tipo de hacienda.
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
