'use client'

import { useState } from 'react'

export interface VitrinaProduct {
  id: number
  producto: string
  categoria: string | null
  estado: string | null
  unidad_venta: string | null
  unidades_por_bulto: number | null
  pedido_minimo: number | null
  precio_modo: string | null
  segmento: string | null
  interprovincial: boolean
}

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
]

const inputClass = 'w-full bg-terminal-bg border border-terminal-border text-zinc-200 text-xxs font-terminal px-2 py-1.5 rounded-terminal focus:outline-none focus:border-accent transition-colors'

/**
 * Bloque "Comprá al por mayor" (RFQ). El comprador elige productos + cantidad de
 * bultos, la provincia de entrega y sus datos. Gate §3.3: si la entrega es fuera
 * de la provincia del frigorífico y el establecimiento NO tiene tránsito federal
 * verificado, el envío interprovincial se deshabilita con copy honesto.
 */
export default function CompraMayorista({
  cuit,
  frigorificoName,
  frigoProvince,
  puedeInterprovincial,
  products,
}: {
  cuit: string
  frigorificoName: string
  frigoProvince: string
  puedeInterprovincial: boolean
  products: VitrinaProduct[]
}) {
  const [qty, setQty] = useState<Record<number, number>>({})
  const [provincia, setProvincia] = useState('')
  const [form, setForm] = useState({ nombre: '', empresa: '', whatsapp: '', email: '', tipo_comprador: '', mensaje: '' })
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const esOtraProvincia = provincia !== '' && provincia !== frigoProvince
  const bloqueadoPorGate = esOtraProvincia && !puedeInterprovincial
  const seleccionados = products.filter(p => (qty[p.id] || 0) > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (bloqueadoPorGate) return
    setSending(true)
    setFeedback(null)
    try {
      const producto_snapshot = seleccionados.map(p => ({ producto: p.producto, cantidad: qty[p.id], unidad: p.unidad_venta }))
      const res = await fetch(`/api/frigorificos/${cuit}/rfq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, provincia_entrega: provincia, producto_snapshot }),
      })
      const data = await res.json()
      if (!res.ok) { setFeedback({ type: 'err', msg: data.error || 'No se pudo enviar el pedido' }); return }
      setFeedback({ type: 'ok', msg: '¡Pedido enviado! El establecimiento te va a contactar con la cotización.' })
      setQty({}); setForm({ nombre: '', empresa: '', whatsapp: '', email: '', tipo_comprador: '', mensaje: '' })
    } catch { setFeedback({ type: 'err', msg: 'Error de conexión' }) }
    finally { setSending(false) }
  }

  return (
    <div className="terminal-panel" id="comprar-mayor">
      <div className="terminal-panel-header">
        <span className="text-zinc-200 text-label tracking-widest">COMPRÁ AL POR MAYOR</span>
      </div>
      <form onSubmit={handleSubmit} className="px-panel py-4 space-y-4">
        {/* Productos + cantidad de bultos */}
        <div className="space-y-2">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3 border-b border-terminal-border pb-2">
              <div className="min-w-0">
                <p className="text-data font-terminal text-zinc-200 truncate">{p.producto}</p>
                <p className="text-[10px] text-zinc-500 font-terminal">
                  {[p.estado, p.unidades_por_bulto ? `${p.unidades_por_bulto} u/bulto` : null, p.pedido_minimo && p.pedido_minimo > 1 ? `mín. ${p.pedido_minimo}` : null].filter(Boolean).join(' · ')}
                  {p.precio_modo === 'consultar' ? ' · Precio a consultar' : ''}
                </p>
              </div>
              <input
                type="number" min={0} inputMode="numeric"
                value={qty[p.id] || ''}
                onChange={e => setQty(q => ({ ...q, [p.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                className={`${inputClass} w-20 text-right`} placeholder="0"
                aria-label={`Cantidad de ${p.producto}`}
              />
            </div>
          ))}
        </div>

        {/* Provincia de entrega + gate */}
        <div>
          <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Provincia de entrega</label>
          <select value={provincia} onChange={e => setProvincia(e.target.value)} className={inputClass} required>
            <option value="">Elegí la provincia…</option>
            {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {bloqueadoPorGate && (
            <p className="text-[11px] text-warning font-terminal mt-2 leading-relaxed">
              Este establecimiento opera con habilitación provincial: sólo puede vender dentro de {frigoProvince}.
              Para compras interprovinciales, buscá frigoríficos con tránsito federal en el directorio.
            </p>
          )}
          {esOtraProvincia && puedeInterprovincial && (
            <p className="text-[11px] text-positive font-terminal mt-2">Habilitado para envío a {provincia} (tránsito federal verificado).</p>
          )}
        </div>

        {/* Datos del comprador */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Nombre</label><input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inputClass} /></div>
          <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Empresa / comercio</label><input type="text" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} className={inputClass} /></div>
          <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Email *</label><input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} /></div>
          <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">WhatsApp</label><input type="text" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className={inputClass} placeholder="+54 9 …" /></div>
          <div>
            <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Tipo de comprador</label>
            <select value={form.tipo_comprador} onChange={e => setForm(f => ({ ...f, tipo_comprador: e.target.value }))} className={inputClass}>
              <option value="">—</option>
              <option value="carniceria">Carnicería</option>
              <option value="distribuidor">Distribuidor</option>
              <option value="gastronomia">Gastronomía</option>
              <option value="mayorista">Mayorista</option>
            </select>
          </div>
        </div>
        <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Mensaje</label><textarea value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))} className={`${inputClass} resize-none`} rows={2} maxLength={2000} placeholder={`Ej: salamines de a 300-400 unidades para ${frigorificoName}`} /></div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={sending || bloqueadoPorGate || !form.email || !provincia}
            className="px-4 py-2 bg-accent/10 border border-accent/40 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-terminal"
          >
            {sending ? 'Enviando…' : 'Pedir cotización'}
          </button>
          {feedback && <span className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{feedback.msg}</span>}
        </div>
        <p className="text-[10px] text-zinc-600 font-terminal">Pedís una cotización, no comprás online. El establecimiento te contacta con el precio del día.</p>
      </form>
    </div>
  )
}
