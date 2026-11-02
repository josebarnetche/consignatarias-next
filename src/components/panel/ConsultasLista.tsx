'use client'

import Link from 'next/link'
import { whatsappLink } from '@/lib/leads/routing'
import { origenConsulta } from '@/lib/leads/pipeline'
import { Vacio } from './PanelUi'

export interface Consulta {
  id: number
  name: string
  phone: string | null
  email: string | null
  message: string | null
  source: string | null
  status: string | null
  created_at: string
}

/** "Juan Carlos Pérez" → "Juan C.": identifica sin entregar el contacto (FREE). */
function nombreCorto(n: string) {
  const p = n.trim().split(/\s+/)
  return p.length === 1 ? p[0] : `${p[0]} ${p[1][0].toUpperCase()}.`
}

function hace(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} días`
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' })
}

/**
 * Las consultas de la firma, como lista (18-10-2026). Antes era un pipeline de CRM
 * (nueva → contactada → ganada); con una consulta por mes era burocracia: lo que la
 * firma necesita es ver quién escribió y contestarle en un toque.
 *
 * En FREE la consulta se ve (cuándo, por dónde, qué escribió) pero el teléfono y el
 * email no llegan al navegador: el server los borra antes.
 */
export default function ConsultasLista({ consultas, esPro, max }: { consultas: Consulta[]; esPro: boolean; max?: number }) {
  if (consultas.length === 0) {
    return (
      <Vacio
        icono={<span aria-hidden="true">✉</span>}
        titulo="Todavía no hay consultas."
        texto="Cuando un productor te escriba desde tu perfil, desde la ficha de un remate o desde una pre-oferta, aparece acá y te llega por mail."
      />
    )
  }
  const lista = max ? consultas.slice(0, max) : consultas
  return (
    <ul className="divide-y divide-terminal-border">
      {lista.map((c) => {
        const wa = esPro ? whatsappLink(c.phone, `Hola ${c.name.split(' ')[0]}, te escribo por tu consulta en consignatarias.com.ar.`) : null
        return (
          <li key={c.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent" aria-hidden="true">
              {c.name.trim()[0]?.toUpperCase() ?? '?'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold text-ink">{esPro ? c.name : nombreCorto(c.name)}</span>
                <span className="text-xs text-zinc-500">{hace(c.created_at)} · {origenConsulta(c.source)}</span>
              </p>
              {c.message && <p className="mt-0.5 line-clamp-2 text-sm text-zinc-400">{c.message}</p>}
              {esPro && (c.phone || c.email) && (
                <p className="mt-0.5 text-xs text-zinc-500">{[c.phone, c.email].filter(Boolean).join(' · ')}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {esPro ? (
                <>
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full bg-positive px-4 py-2 text-sm font-semibold text-white oscuro:text-zinc-950">
                      WhatsApp
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="rounded-full bg-zinc-800/70 px-4 py-2 text-sm text-ink hover:bg-zinc-700/70">
                      Llamar
                    </a>
                  )}
                  {!wa && c.email && (
                    <a href={`mailto:${c.email}`} className="rounded-full bg-zinc-800/70 px-4 py-2 text-sm text-ink hover:bg-zinc-700/70">
                      Email
                    </a>
                  )}
                </>
              ) : (
                <Link href="/planes?audience=consignataria&from=consultas" className="rounded-full bg-accent/10 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/20">
                  Ver contacto
                </Link>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
