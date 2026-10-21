import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase-server'
import { getCronHealth } from '@/lib/ops'
import { AdminPageHeader, AdminSection, KpiRow, KpiCell, AdminEmpty } from '@/components/admin/kit'
import Stat from '@/components/ui/Stat'
import PorTipo from '@/components/admin/agente/PorTipo'
import Badge, { type BadgeTone } from '@/components/ui/Badge'
import { resumenHacienda } from '@/lib/agente/mensajes'
import { whatsappLink } from '@/lib/leads/routing'
import { COMISION_PCT, type EstadoCaso } from '@/lib/agente/reglas'
import { armarTablero, proximoPaso, ESTADO_LABEL, ORDEN_ESTADOS, type CasoFila, type OfertaFila } from '@/lib/agente/tablero'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = { title: 'Agente · Admin' }

/**
 * /admin/agente — el cerrador que trabaja los leads de hacienda solo
 * (src/lib/agente/motor.ts).
 *
 *   1. Plata: comisión potencial, en juego y cerrada (src/lib/agente/tablero.ts)
 *   2. Embudo de casos por estado y respuesta de las contrapartes
 *   3. Para llamar hoy: el productor que no contesta el mail, con WhatsApp en un clic
 *      (en el campo un llamado cierra más que tres correos)
 *   4. Casos vivos ordenados por plata, con el próximo paso
 *   5. Últimos correos que entraron y salieron
 *
 * La bitácora completa de cada caso sigue en /admin/leads?lead=N.
 */

const TZ = 'America/Argentina/Buenos_Aires'
const nf = (n: number) => n.toLocaleString('es-AR')
const ars = (n: number) => `$${nf(Math.round(n))}`
const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })

const TONO: Partial<Record<EstadoCaso, BadgeTone>> = {
  nuevo: 'accent',
  pidiendo_datos: 'warning',
  ofreciendo: 'accent',
  presentado: 'positive',
  cerrado: 'positive',
  escalado: 'warning',
}

interface MensajeFila {
  lead_id: number | null
  dir: 'in' | 'out'
  de: string
  para: string
  asunto: string
  creado_at: string
  clasificacion: { plantilla?: string; tipo?: string } | null
}

export default async function AdminAgentePage() {
  const db = createAdminClient()
  const [casosQ, ofertasQ, mensajesQ, crons] = await Promise.all([
    db.from('agente_casos').select('lead_id,lado,estado,datos,motivo,tandas,proximo_at,actualizado_at'),
    db.from('agente_ofertas').select('lead_id,tipo,nombre,estado,enviada_at,respondida_at,cierre'),
    db.from('agente_mensajes').select('lead_id,dir,de,para,asunto,creado_at,clasificacion').order('creado_at', { ascending: false }).limit(15),
    getCronHealth().catch(() => []),
  ])
  const fallo = casosQ.error || ofertasQ.error
  const t = armarTablero((casosQ.data ?? []) as CasoFila[], (ofertasQ.data ?? []) as OfertaFila[])
  const mensajes = (mensajesQ.data ?? []) as MensajeFila[]
  const corrida = crons.find((c) => c.workflow_name === 'agente')
  // Productores de los casos que esperan algo de ellos o de una contraparte que no contesta.
  const aLlamar = t.vivos.filter((c) => c.estado === 'pidiendo_datos' || (c.estado === 'ofreciendo' && c.respondidas === 0) || c.estado === 'presentado')
  const { data: tels } = aLlamar.length
    ? await db.from('producer_leads').select('id,name,phone').in('id', aLlamar.map((c) => c.lead_id))
    : { data: [] as Array<{ id: number; name: string | null; phone: string | null }> }
  const tel = new Map((tels ?? []).map((l) => [l.id, l]))
  const llamar = aLlamar
    .map((c) => ({ c, l: tel.get(c.lead_id) }))
    .filter((x) => x.l?.phone)
    .map(({ c, l }) => {
      const pila = (l!.name ?? '').trim().split(/\s+/)[0]
      const saludo = pila && !pila.includes('@') ? `Hola ${pila.charAt(0).toUpperCase()}${pila.slice(1).toLowerCase()}` : 'Hola'
      const guion =
        c.estado === 'pidiendo_datos'
          ? `${saludo}, te escribo de consignatarias.com por la hacienda que cargaste. Para ofrecerla me falta saber cuántas cabezas son, la categoría y la zona. ¿Me lo pasás por acá?`
          : c.estado === 'presentado'
            ? `${saludo}, te escribo de consignatarias.com. ¿Pudiste hablar con la contraparte que te presentamos? ¿Avanzaron?`
            : `${saludo}, te escribo de consignatarias.com. Estamos ofreciendo tu ${c.lado === 'vende' ? 'hacienda' : 'pedido de compra'} (${resumenHacienda(c.datos)}). ¿Sigue en pie? ¿Tenés un precio de referencia o una fecha?`
      return { c, phone: l!.phone!, wa: whatsappLink(l!.phone, guion), motivo: c.estado === 'pidiendo_datos' ? 'no mandó los datos' : c.estado === 'presentado' ? 'presentado: ¿avanzan?' : 'nadie contestó todavía' }
    })
  const ofs = t.ofertas

  return (
    <>
      <AdminPageHeader
        title="Agente"
        meta={corrida?.last_run_at ? `última corrida ${fecha(corrida.last_run_at)}` : 'sin corridas registradas'}
        description={`Trabaja los leads de hacienda hasta el cierre: pide datos, ofrece, presenta tras un ACEPTO escrito y cobra el ${COMISION_PCT}% a quien recibe el contacto. Precio y firma quedan entre las partes.`}
      />

      {fallo && (
        <p className="terminal-panel px-panel py-2 text-xxs text-negative font-terminal">
          No se pudieron leer los casos o las ofertas. Los números en cero no son reales.
        </p>
      )}

      <KpiRow cols={4}>
        <KpiCell>
          <Stat label="Comisión cerrada" value={ars(t.plata.cerrada)} tone={t.plata.cerrada > 0 ? 'positive' : 'neutral'} sub="informada por las partes" />
        </KpiCell>
        <KpiCell>
          <Stat label="En juego" value={ars(t.plata.enJuego)} sub={`${t.porEstado.presentado} presentados, negocian solos`} />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Potencial"
            value={ars(t.plata.potencial)}
            sub={`${COMISION_PCT}% del bruto estimado de los casos vivos${t.plata.sinEstimar ? ` · ${t.plata.sinEstimar} sin cabezas` : ''}`}
          />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Respuesta de contrapartes"
            value={ofs.tasaRespuesta == null ? null : `${Math.round(ofs.tasaRespuesta * 100)}%`}
            sub={`${ofs.respondidas} de ${ofs.enviadas} ofertas · ${ofs.aceptadas} ACEPTO · ${ofs.esperando} esperando`}
          />
        </KpiCell>
      </KpiRow>

      <PorTipo />

      <AdminSection title="Embudo">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {ORDEN_ESTADOS.map((e) => (
            <div key={e} className="font-terminal">
              <div className={`text-lg tabular-nums leading-none ${t.porEstado[e] ? 'text-ink' : 'text-zinc-600'}`}>{nf(t.porEstado[e])}</div>
              <div className="text-xxs text-zinc-500 mt-1">{ESTADO_LABEL[e]}</div>
            </div>
          ))}
        </div>
      </AdminSection>

      {llamar.length > 0 && (
        <AdminSection title={`Para llamar hoy · ${llamar.length}`} flush>
          <ol>
            {llamar.map(({ c, phone, wa, motivo }) => (
              <li key={c.lead_id} className="border-b border-terminal-border last:border-b-0 px-panel py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={`/admin/leads?lead=${c.lead_id}`} className="w-10 text-data font-terminal text-zinc-400 hover:text-accent tabular-nums">
                  #{c.lead_id}
                </Link>
                <span className="min-w-0 flex-1 truncate text-data font-terminal text-ink">{resumenHacienda(c.datos)}</span>
                <span className="text-xxs font-terminal text-zinc-500">{motivo}</span>
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="text-data font-terminal text-zinc-300 hover:text-accent tabular-nums">
                  {phone}
                </a>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="text-xxs font-terminal text-accent hover:underline">
                    WhatsApp →
                  </a>
                )}
              </li>
            ))}
          </ol>
        </AdminSection>
      )}

      <AdminSection title={`Casos vivos · ${t.vivos.length}`} flush>
        {t.vivos.length === 0 ? (
          <AdminEmpty>No hay casos abiertos. Cuando entre un lead de compra o venta de hacienda con 40 cabezas o más, el agente lo toma solo.</AdminEmpty>
        ) : (
          <ol>
            {t.vivos.map((c) => (
              <li key={c.lead_id} className="border-b border-terminal-border last:border-b-0 px-panel py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={`/admin/leads?lead=${c.lead_id}`} className="w-10 text-data font-terminal text-zinc-400 hover:text-accent tabular-nums">
                  #{c.lead_id}
                </Link>
                <Badge tone={TONO[c.estado] ?? 'neutral'}>{ESTADO_LABEL[c.estado]}</Badge>
                <span className="text-xxs font-terminal text-zinc-500">{c.lado === 'vende' ? 'vende' : 'compra'}</span>
                <span className="min-w-0 flex-1 truncate text-data font-terminal text-ink">{resumenHacienda(c.datos)}</span>
                <span className="text-xxs font-terminal text-zinc-500 tabular-nums">
                  {c.ofertas ? `${c.respondidas}/${c.ofertas} respondieron` : 'sin ofertas'}
                </span>
                <span className="w-28 text-right text-data font-terminal tabular-nums text-zinc-300">{c.comision == null ? '—' : ars(c.comision)}</span>
                <span className="basis-full sm:basis-auto sm:w-64 text-xxs font-terminal text-zinc-500 truncate">{proximoPaso(c)}</span>
              </li>
            ))}
          </ol>
        )}
      </AdminSection>

      <AdminSection title="Últimos correos" flush>
        {mensajes.length === 0 ? (
          <AdminEmpty>Todavía no salió ni entró ningún correo del agente.</AdminEmpty>
        ) : (
          <ol>
            {mensajes.map((m, i) => (
              <li key={i} className="border-b border-terminal-border last:border-b-0 px-panel py-1.5 flex items-center gap-3">
                <span className="w-20 text-xxs font-terminal text-zinc-500 tabular-nums">{fecha(m.creado_at)}</span>
                <Badge tone={m.dir === 'in' ? 'positive' : 'neutral'}>{m.dir === 'in' ? 'entró' : 'salió'}</Badge>
                <span className="w-40 truncate text-xxs font-terminal text-zinc-400">{m.dir === 'in' ? m.de : m.para}</span>
                <span className="min-w-0 flex-1 truncate text-data font-terminal text-ink">{m.asunto}</span>
                <span className="hidden sm:inline text-xxs font-terminal text-zinc-500">{m.clasificacion?.tipo ?? m.clasificacion?.plantilla ?? ''}</span>
              </li>
            ))}
          </ol>
        )}
      </AdminSection>
    </>
  )
}
