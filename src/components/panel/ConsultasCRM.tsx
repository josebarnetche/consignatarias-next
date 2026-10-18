'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { whatsappLink } from '@/lib/leads/routing'
import { ETAPAS, ETAPA_LABEL, etapaDe, origenConsulta, NOTAS_MAX, type Etapa } from '@/lib/leads/pipeline'
import { mensajeError } from '@/lib/ui/mensaje-error'
import { Marco, Vacio, fmt } from './PanelUi'

export interface Consulta {
  id: number
  name: string
  phone: string | null
  email: string | null
  message: string | null
  source: string | null
  status: string | null
  notes?: string | null
  contacted_at?: string | null
  updated_at?: string | null
  created_at: string
}

const TONO_ETAPA: Record<Etapa, string> = {
  new: 'bg-accent',
  contacted: 'bg-warning',
  converted: 'bg-positive',
  archived: 'bg-zinc-600',
}

/** Horas entre que llegó la consulta y la primera vez que se marcó contactada. */
function horasDeRespuesta(c: Consulta): number | null {
  if (!c.contacted_at) return null
  const h = (new Date(c.contacted_at).getTime() - new Date(c.created_at).getTime()) / 3_600_000
  return h >= 0 ? h : null
}

function mediana(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function duracion(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${Math.round(h)} h`
  return `${Math.round(h / 24)} días`
}

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

/** "Juan Carlos Fleitas" → "Juan C.": identifica sin entregar el contacto (FREE). */
function nombreCorto(n: string) {
  const p = n.trim().split(/\s+/)
  return p.length === 1 ? p[0] : `${p[0]} ${p[1][0].toUpperCase()}.`
}

/**
 * Las consultas de la firma como pipeline de CRM (19-10-2026): nueva → contactada →
 * ganada o descartada, con notas. El estado y la nota se guardan en
 * `consignataria_leads` (PATCH /api/consignatarias/[slug]/leads/[id]).
 *
 * En FREE la consulta se ve (fecha, origen, mensaje) y se puede ordenar, pero el
 * teléfono y el email no llegan al navegador: el server los borra antes.
 */
export default function ConsultasCRM({
  slug,
  inicial,
  esPro,
  soloLectura = false,
}: {
  slug: string
  inicial: Consulta[]
  esPro: boolean
  soloLectura?: boolean
}) {
  const [consultas, setConsultas] = useState(inicial)
  const [abierta, setAbierta] = useState<number | null>(null)

  const porEtapa = useMemo(() => {
    const m: Record<Etapa, Consulta[]> = { new: [], contacted: [], converted: [], archived: [] }
    for (const c of consultas) m[etapaDe(c.status)].push(c)
    return m
  }, [consultas])

  const respuesta = mediana(consultas.map(horasDeRespuesta).filter((h): h is number => h != null))
  const cerradas = porEtapa.converted.length + porEtapa.archived.length
  const conversion = cerradas > 0 ? Math.round((porEtapa.converted.length / cerradas) * 100) : null

  async function guardar(id: number, cambios: { status?: Etapa; notes?: string }) {
    const antes = consultas
    setConsultas((cs) =>
      cs.map((c) =>
        c.id === id
          ? {
              ...c,
              ...cambios,
              contacted_at: cambios.status && cambios.status !== 'new' && !c.contacted_at ? new Date().toISOString() : c.contacted_at,
            }
          : c,
      ),
    )
    const res = await fetch(`/api/consignatarias/${slug}/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cambios),
    }).catch(() => null)
    if (!res?.ok) {
      setConsultas(antes)
      const data = res ? await res.json().catch(() => ({})) : {}
      alert(mensajeError(data, 'No se pudo guardar. Probá de nuevo.'))
      return false
    }
    const fila = (await res.json()) as Partial<Consulta>
    setConsultas((cs) => cs.map((c) => (c.id === id ? { ...c, ...fila } : c)))
    return true
  }

  return (
    <div className="space-y-12">
      {/* Indicadores del pipeline */}
      <Marco nombre="Pipeline · consultas" cuerpo="p-0">
        <div className="grid grid-cols-2 divide-terminal-border sm:grid-cols-4 sm:divide-x">
          {ETAPAS.map((e) => (
            <div key={e} className="px-5 py-4">
              <span className="flex items-center gap-2 text-xxs text-zinc-500">
                <span className={`h-1.5 w-1.5 rounded-full ${TONO_ETAPA[e]}`} aria-hidden="true" />
                {ETAPA_LABEL[e]}
              </span>
              <span className="mt-1.5 block text-3xl font-semibold leading-none tabular-nums text-ink">{fmt(porEtapa[e].length)}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-terminal-border px-5 py-3 text-xxs text-zinc-500">
          <span>
            Tiempo de respuesta (mediana):{' '}
            <strong className="font-semibold text-zinc-300">{respuesta != null ? duracion(respuesta) : '—'}</strong>
          </span>
          <span>
            Consultas ganadas sobre cerradas:{' '}
            <strong className="font-semibold text-zinc-300">{conversion != null ? `${conversion} %` : '—'}</strong>
          </span>
          <span>Se cuentan las últimas {fmt(consultas.length)} consultas.</span>
        </div>
      </Marco>

      {!esPro && consultas.length > 0 && (
        <div className="rounded-lg border border-accent/30 bg-accent/[0.04] px-5 py-4 text-sm text-zinc-300">
          {consultas.length === 1 ? 'Tenés 1 consulta' : `Tenés ${fmt(consultas.length)} consultas`} con nombre y mensaje. El
          teléfono y el email de cada productor se ven con PRO.{' '}
          <Link href="/planes?audience=consignataria&from=consultas" className="font-semibold text-accent hover:underline">
            Activar PRO →
          </Link>
        </div>
      )}

      {consultas.length === 0 ? (
        <Vacio
          titulo="Todavía no recibiste consultas."
          texto="Llegan desde el formulario de tu perfil, desde tu página con QR y desde la ficha de cada remate. Cada una entra acá como “Nueva” y te avisamos por mail."
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-10 lg:grid-cols-4">
          {ETAPAS.map((e) => (
            <Marco key={e} nombre={`${ETAPA_LABEL[e]} · ${porEtapa[e].length}`} cuerpo="p-2">
              {porEtapa[e].length === 0 ? (
                <p className="px-3 py-6 text-center text-xxs text-zinc-600">Sin consultas</p>
              ) : (
                <ul className="space-y-2">
                  {porEtapa[e].map((c) => (
                    <TarjetaConsulta
                      key={c.id}
                      c={c}
                      esPro={esPro}
                      soloLectura={soloLectura}
                      abierta={abierta === c.id}
                      onAbrir={() => setAbierta(abierta === c.id ? null : c.id)}
                      onGuardar={(cambios) => guardar(c.id, cambios)}
                    />
                  ))}
                </ul>
              )}
            </Marco>
          ))}
        </div>
      )}
    </div>
  )
}

function TarjetaConsulta({
  c,
  esPro,
  soloLectura,
  abierta,
  onAbrir,
  onGuardar,
}: {
  c: Consulta
  esPro: boolean
  soloLectura: boolean
  abierta: boolean
  onAbrir: () => void
  onGuardar: (cambios: { status?: Etapa; notes?: string }) => Promise<boolean>
}) {
  const [nota, setNota] = useState(c.notes ?? '')
  const [guardando, setGuardando] = useState(false)
  const etapa = etapaDe(c.status)
  const wa = esPro ? whatsappLink(c.phone, `Hola ${c.name.split(' ')[0]}, te escribo por tu consulta en consignatarias.com.ar.`) : null

  return (
    <li className="rounded-lg border border-terminal-border bg-terminal-bg/40 p-3">
      <button type="button" onClick={onAbrir} className="block w-full text-left" aria-expanded={abierta}>
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-ink">{esPro ? c.name : nombreCorto(c.name)}</span>
          <span className="shrink-0 text-[0.625rem] tabular-nums text-zinc-500">{fecha(c.created_at)}</span>
        </span>
        <span className="mt-0.5 block text-[0.625rem] text-zinc-500">{origenConsulta(c.source)}</span>
        {c.message && <span className={`mt-1.5 block text-xs text-zinc-400 ${abierta ? '' : 'line-clamp-2'}`}>{c.message}</span>}
        {!abierta && c.notes && <span className="mt-1.5 block truncate text-[0.625rem] italic text-zinc-500">Nota: {c.notes}</span>}
      </button>

      {abierta && (
        <div className="mt-3 space-y-3 border-t border-terminal-border pt-3">
          {esPro ? (
            <div className="space-y-0.5 text-xs text-zinc-300">
              {c.phone && <p>{c.phone}</p>}
              {c.email && <p className="break-all">{c.email}</p>}
              {!c.phone && !c.email && <p className="text-zinc-500">No dejó teléfono ni email.</p>}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">El contacto se ve con PRO.</p>
          )}

          <div className="flex flex-wrap gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-md bg-positive px-2.5 py-1 text-xs font-semibold text-white oscuro:text-zinc-950">
                WhatsApp
              </a>
            )}
            {esPro && c.email && (
              <a href={`mailto:${c.email}`} className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200 hover:border-accent hover:text-accent">
                Email
              </a>
            )}
          </div>

          <label className="block">
            <span className="text-[0.625rem] text-zinc-500">Etapa</span>
            <select
              value={etapa}
              disabled={soloLectura}
              onChange={(e) => onGuardar({ status: e.target.value as Etapa })}
              className="mt-1 block w-full rounded-md border border-terminal-border bg-terminal-panel px-2 py-1.5 text-xs text-ink"
            >
              {ETAPAS.map((x) => (
                <option key={x} value={x}>
                  {ETAPA_LABEL[x]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[0.625rem] text-zinc-500">Nota (sólo la ves vos)</span>
            <textarea
              value={nota}
              disabled={soloLectura}
              maxLength={NOTAS_MAX}
              rows={3}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Qué hablaron, qué hacienda tiene, cuándo volver a llamar…"
              className="mt-1 block w-full resize-y rounded-md border border-terminal-border bg-terminal-panel px-2 py-1.5 text-xs text-ink placeholder:text-zinc-600"
            />
          </label>
          {!soloLectura && nota !== (c.notes ?? '') && (
            <button
              type="button"
              disabled={guardando}
              onClick={async () => {
                setGuardando(true)
                await onGuardar({ notes: nota })
                setGuardando(false)
              }}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white oscuro:text-zinc-950 disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar nota'}
            </button>
          )}
        </div>
      )}
    </li>
  )
}
