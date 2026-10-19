'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { mensajeError } from '@/lib/ui/mensaje-error'
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

/** Un resultado ya cargado, para editarlo (18-10-2026). */
export interface ResultadoInicial {
  id: string
  auction_date: string
  auction_title: string
  location: string | null
  total_heads_offered: number | null
  total_heads_sold: number | null
  min_price: number | null
  average_price: number | null
  max_price: number | null
  category_results: { category: string; categoria_vr?: string; heads?: number; peso_kg?: number; avg_price?: number; max_price?: number }[] | null
  notes: string | null
}

/** Remates recientes de la firma sin resultado: elegir uno completa fecha, título y lugar. */
export interface RemateSugerido {
  date: string
  title: string
  location: string
}

interface Props {
  consignatariaSlug: string
  consignatariaName: string
  inicial?: ResultadoInicial
  sugeridos?: RemateSugerido[]
}

const txt = (n: number | null | undefined) => (n == null ? '' : String(n))

const EMPTY_CATEGORY: CategoryRow = { categoria_vr: '', category: '', heads: '', peso_kg: '', avg_price: '', max_price: '' }

/** La etiqueta que se guarda en `category`: la del desplegable, o el texto de "Otra". */
function nombreCategoria(c: CategoryRow): string {
  if (c.categoria_vr === OTRA) return c.category.trim()
  return etiquetaCategoria(c.categoria_vr) ?? ''
}

export default function ResultadoForm({ consignatariaSlug, consignatariaName, inicial, sugeridos = [] }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [auctionDate, setAuctionDate] = useState(inicial?.auction_date ?? '')
  const [auctionTitle, setAuctionTitle] = useState(inicial?.auction_title ?? '')
  const [location, setLocation] = useState(inicial?.location ?? '')
  const [headsOffered, setHeadsOffered] = useState(txt(inicial?.total_heads_offered))
  const [headsSold, setHeadsSold] = useState(txt(inicial?.total_heads_sold))
  const [minPrice, setMinPrice] = useState(txt(inicial?.min_price))
  const [avgPrice, setAvgPrice] = useState(txt(inicial?.average_price))
  const [maxPrice, setMaxPrice] = useState(txt(inicial?.max_price))
  const [notes, setNotes] = useState(inicial?.notes ?? '')
  const [categories, setCategories] = useState<CategoryRow[]>(
    inicial?.category_results?.length ? inicial.category_results.map((c) => ({
      categoria_vr: c.categoria_vr || OTRA,
      category: c.categoria_vr ? '' : c.category,
      heads: txt(c.heads),
      peso_kg: txt(c.peso_kg),
      avg_price: txt(c.avg_price),
      max_price: txt(c.max_price),
    })) : [{ ...EMPTY_CATEGORY }],
  )
  // Si eligió un remate de la lista, no hace falta mostrar fecha/título/lugar.
  const [aMano, setAMano] = useState(!!inicial || sugeridos.length === 0)
  const [masDatos, setMasDatos] = useState(!!(inicial && (inicial.total_heads_offered || inicial.min_price || inicial.max_price || inicial.notes)))
  const [borrando, setBorrando] = useState(false)

  function elegirRemate(i: string) {
    if (i === 'otro') {
      setAMano(true)
      setAuctionDate('')
      setAuctionTitle('')
      setLocation('')
      return
    }
    const r = sugeridos[Number(i)]
    if (!r) return
    setAMano(false)
    setAuctionDate(r.date)
    setAuctionTitle(r.title)
    setLocation(r.location)
  }

  async function borrar() {
    if (!inicial || !confirm('¿Borrar este resultado?')) return
    setBorrando(true)
    setError(null)
    try {
      const res = await fetch(`/api/auction-results/${inicial.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(mensajeError(data, 'No se pudo borrar'))
        setBorrando(false)
        return
      }
      router.push('/dashboard?tab=resultados')
      router.refresh()
    } catch {
      setError('Error de conexión')
      setBorrando(false)
    }
  }

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

    // Los totales salen solos del desglose si la firma no los cargó aparte: cabezas
    // vendidas = suma; precio promedio = promedio ponderado por cabezas.
    const conCabezas = categoryResults.filter((c) => c.heads)
    const sumaCabezas = conCabezas.reduce((t, c) => t + (c.heads ?? 0), 0)
    const conPrecio = conCabezas.filter((c) => c.avg_price)
    const pesoPrecio = conPrecio.reduce((t, c) => t + (c.heads ?? 0), 0)
    const promedioCalc = pesoPrecio ? conPrecio.reduce((t, c) => t + (c.avg_price ?? 0) * (c.heads ?? 0), 0) / pesoPrecio : null

    if (!auctionDate || !auctionTitle.trim()) {
      setError('Elegí el remate (o completá fecha y nombre).')
      setSubmitting(false)
      return
    }

    const body = {
      consignataria_slug: consignatariaSlug,
      auction_date: auctionDate,
      auction_title: auctionTitle.trim(),
      location: location.trim() || undefined,
      total_heads_offered: headsOffered ? parseInt(headsOffered) : null,
      total_heads_sold: headsSold ? parseInt(headsSold) : sumaCabezas || null,
      min_price: minPrice ? parseFloat(minPrice) : null,
      average_price: avgPrice ? parseFloat(avgPrice) : promedioCalc != null ? Math.round(promedioCalc) : null,
      max_price: maxPrice ? parseFloat(maxPrice) : null,
      category_results: categoryResults.length > 0 ? categoryResults : null,
      notes: notes.trim() || undefined,
    }

    try {
      const res = await fetch(inicial ? `/api/auction-results/${inicial.id}` : '/api/auction-results', {
        method: inicial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(mensajeError(data, 'Error al enviar'))
        setSubmitting(false)
        return
      }

      router.push('/dashboard?tab=resultados')
      router.refresh()
    } catch {
      setError('Error de conexión')
      setSubmitting(false)
    }
  }

  const CAMPO = 'mt-1.5 block w-full rounded-xl border border-terminal-border bg-terminal-bg/60 px-3.5 py-2.5 text-[0.9375rem] text-ink placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
  const ETIQUETA = 'block text-sm font-medium text-zinc-300'
  const TARJETA = 'rounded-2xl border border-terminal-border bg-terminal-panel p-5 sm:p-6'

  // Resumen en vivo de lo cargado en el desglose.
  const filas = categories.filter((c) => c.heads)
  const totalCab = filas.reduce((t, c) => t + (parseInt(c.heads) || 0), 0)
  const conPrecioVivo = filas.filter((c) => c.avg_price)
  const pesoVivo = conPrecioVivo.reduce((t, c) => t + (parseInt(c.heads) || 0), 0)
  const promVivo = pesoVivo ? Math.round(conPrecioVivo.reduce((t, c) => t + (parseFloat(c.avg_price) || 0) * (parseInt(c.heads) || 0), 0) / pesoVivo) : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/dashboard?tab=resultados" className="text-sm text-zinc-500 hover:text-ink">← Volver a Resultados</Link>
      <h1 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-ink">{inicial ? 'Editar resultado' : 'Cargar resultado'}</h1>
      <p className="mt-1 text-[0.9375rem] text-zinc-500">{consignatariaName} · cabezas y precio por categoría. Lleva un minuto.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* 1. El remate */}
        <section className={TARJETA}>
          <p className="text-base font-semibold text-ink">¿De qué remate?</p>
          {!inicial && sugeridos.length > 0 && (
            <select defaultValue="" onChange={(e) => elegirRemate(e.target.value)} className={CAMPO} aria-label="Remate">
              <option value="" disabled>Elegí uno de tus remates</option>
              {sugeridos.map((r, i) => (
                <option key={`${r.date}-${i}`} value={i}>{r.date.split('-').reverse().join('/')} · {r.title}</option>
              ))}
              <option value="otro">Otro remate (lo escribo yo)</option>
            </select>
          )}
          {!aMano && auctionTitle && (
            <p className="mt-3 text-sm text-zinc-400">{auctionDate.split('-').reverse().join('/')} · {auctionTitle}{location ? ` · ${location}` : ''}</p>
          )}
          {aMano && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className={ETIQUETA}>
                  Fecha
                  <input type="date" required value={auctionDate} onChange={(e) => setAuctionDate(e.target.value)} className={CAMPO} />
                </label>
                <label className={ETIQUETA}>
                  Lugar
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej. Mercedes" className={CAMPO} />
                </label>
              </div>
              <label className={ETIQUETA}>
                Nombre del remate
                <input required value={auctionTitle} onChange={(e) => setAuctionTitle(e.target.value)} placeholder="Ej. Remate de invernada" className={CAMPO} />
              </label>
            </div>
          )}
        </section>

        {/* 2. Cómo se vendió */}
        <section className={TARJETA}>
          <p className="text-base font-semibold text-ink">¿Cómo se vendió?</p>
          <p className="mt-0.5 text-sm text-zinc-500">Una línea por categoría. Precio en pesos por kilo vivo.</p>
          <div className="mt-4 space-y-3">
            {categories.map((cat, idx) => (
              <div key={idx} className="rounded-xl bg-zinc-800/30 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
                  <label className="col-span-2 text-xs text-zinc-400 sm:col-span-1">
                    Categoría
                    <select value={cat.categoria_vr} onChange={(e) => updateCategory(idx, 'categoria_vr', e.target.value)} className={CAMPO}>
                      <option value="">Elegí</option>
                      {CATEGORIAS_RESULTADO.map((c) => <option key={c.slug} value={c.slug}>{c.etiqueta}</option>)}
                      <option value={OTRA}>Otra</option>
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400">
                    Cabezas
                    <input type="number" min={1} inputMode="numeric" value={cat.heads} onChange={(e) => updateCategory(idx, 'heads', e.target.value)} className={CAMPO} />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Peso (kg)
                    <input type="number" min={1} max={1500} inputMode="numeric" value={cat.peso_kg} onChange={(e) => updateCategory(idx, 'peso_kg', e.target.value)} placeholder="Opcional" className={CAMPO} />
                  </label>
                  <label className="col-span-2 text-xs text-zinc-400 sm:col-span-1">
                    $/kg promedio
                    <input type="number" min={1} step="any" inputMode="decimal" value={cat.avg_price} onChange={(e) => updateCategory(idx, 'avg_price', e.target.value)} className={CAMPO} />
                  </label>
                </div>
                {cat.categoria_vr === OTRA && (
                  <input value={cat.category} onChange={(e) => updateCategory(idx, 'category', e.target.value)} placeholder="¿Qué categoría? Ej. Vaca con cría" aria-label="Nombre de la categoría" className={CAMPO} />
                )}
                {categories.length > 1 && (
                  <button type="button" onClick={() => removeCategory(idx)} className="mt-2 text-xs text-zinc-500 hover:text-negative">Quitar</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addCategory} className="mt-3 text-sm font-medium text-accent">+ Otra categoría</button>
          {totalCab > 0 && (
            <p className="mt-4 rounded-xl bg-accent/[0.06] px-4 py-3 text-sm text-zinc-300">
              Total: <strong className="text-ink">{totalCab.toLocaleString('es-AR')} cabezas</strong>
              {promVivo != null && <> · promedio <strong className="text-ink">${promVivo.toLocaleString('es-AR')}/kg</strong></>}
            </p>
          )}
        </section>

        {/* 3. Lo opcional, plegado */}
        <button type="button" onClick={() => setMasDatos(!masDatos)} className="text-sm font-medium text-accent" aria-expanded={masDatos}>
          {masDatos ? '− Menos datos' : '+ Más datos (cabezas ofrecidas, precios mínimo y máximo, notas)'}
        </button>
        {masDatos && (
          <section className={`${TARJETA} space-y-4`}>
            <div className="grid grid-cols-2 gap-3">
              <label className={ETIQUETA}>
                Cabezas ofrecidas
                <input type="number" min={0} value={headsOffered} onChange={(e) => setHeadsOffered(e.target.value)} className={CAMPO} />
              </label>
              <label className={ETIQUETA}>
                Cabezas vendidas
                <input type="number" min={0} value={headsSold} onChange={(e) => setHeadsSold(e.target.value)} placeholder={totalCab ? String(totalCab) : ''} className={CAMPO} />
              </label>
              <label className={ETIQUETA}>
                $/kg mínimo
                <input type="number" min={0} step="any" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={CAMPO} />
              </label>
              <label className={ETIQUETA}>
                $/kg máximo
                <input type="number" min={0} step="any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={CAMPO} />
              </label>
            </div>
            <label className={ETIQUETA}>
              $/kg promedio general
              <input type="number" min={0} step="any" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} placeholder={promVivo != null ? String(promVivo) : ''} className={CAMPO} />
            </label>
            <label className={ETIQUETA}>
              Notas
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Algo que quieras recordar de este remate" className={CAMPO} />
            </label>
          </section>
        )}

        {error && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative" role="alert">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" disabled={submitting} className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright disabled:opacity-50">
            {submitting ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Guardar resultado'}
          </button>
          {inicial && (
            <button type="button" onClick={borrar} disabled={borrando} className="ml-auto text-sm text-zinc-500 hover:text-negative disabled:opacity-50">
              {borrando ? 'Borrando…' : 'Borrar resultado'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
