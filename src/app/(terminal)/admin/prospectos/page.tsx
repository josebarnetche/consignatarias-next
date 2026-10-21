import Link from 'next/link'
import type { Metadata } from 'next'
import { AdminPageHeader, AdminSection, KpiRow, KpiCell, AdminEmpty } from '@/components/admin/kit'
import Stat from '@/components/ui/Stat'
import Badge from '@/components/ui/Badge'
import { whatsappLink } from '@/lib/leads/routing'
import { getDatosProspectos } from '@/lib/pro-adquisicion/datos'
import { envioHabilitado, guionWhatsapp, informeTexto, redactarInforme, type Prospecto } from '@/lib/pro-adquisicion/prospectos'
import { urlPropuesta, tokenPropuesta } from '@/lib/propuesta/token'
import { hoyArgentina } from '@/lib/remates-en-vivo'
import AccionesInforme from './AccionesInforme'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = { title: 'Prospectos PRO · Admin' }

/**
 * /admin/prospectos — qué firma está más cerca de pagar PRO y qué decirle.
 *
 *  1. El embudo PRO medido: firmas → contactables → con visitas → reclamadas → PRO → pagas.
 *  2. Las firmas no PRO ordenadas por puntaje (src/lib/pro-adquisicion/prospectos.ts):
 *     constancia de visitas, Google, demanda de su zona, operaciones del agente.
 *  3. Por firma, el informe ya redactado con sus números. Se copia o se abre en el
 *     correo; el botón "Enviar" sólo funciona con PRO_PROSPECTOS_ENVIO=on.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'
const nf = (n: number) => n.toLocaleString('es-AR')
const MOSTRAR = 40

function bloqueo(p: Prospecto): string | null {
  if (!p.m.email) return 'sin mail'
  if (p.m.dadaDeBaja) return 'se dio de baja'
  if (p.m.informeReciente) return 'ya recibió el informe este mes'
  return null
}

export default async function AdminProspectosPage() {
  const { prospectos, embudo: e, fallas } = await getDatosProspectos()
  const hoy = hoyArgentina()
  const encendido = envioHabilitado()
  const conPropuesta = !!tokenPropuesta('x')
  const lista = prospectos.slice(0, MOSTRAR)

  return (
    <>
      <AdminPageHeader
        title="Prospectos PRO"
        meta={encendido ? 'envío ENCENDIDO' : 'envío apagado'}
        description="Firmas que no son PRO, ordenadas por lo cerca que están de pagar. Cada una trae su informe redactado con números de la base. Nada sale sin que lo mandes vos."
        actions={
          <Link href="/admin/propuesta" className="terminal-btn text-xxs">
            Propuestas PRO
          </Link>
        }
      />

      {fallas.length > 0 && (
        <p className="terminal-panel px-panel py-2 text-xxs text-negative font-terminal">
          No se pudo leer: {fallas.join(', ')}. Esas métricas quedan fuera del puntaje y del informe.
        </p>
      )}

      <KpiRow cols={6}>
        <KpiCell>
          <Stat label="Firmas" value={nf(e.firmas)} sub={`${nf(e.conEmail)} con mail · ${nf(e.conTelefono)} con teléfono`} />
        </KpiCell>
        <KpiCell>
          <Stat label="Con visitas (30 d)" value={nf(e.conVistas30)} sub={`${nf(e.vistas30)} visitas a fichas`} />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Reclamaron la ficha"
            value={nf(e.reclamadas)}
            sub={`${nf(e.claims.total)} pedidos · ${e.claims.aprobados} aprobados · ${e.claims.rechazados} rechazados${e.claims.pendientes ? ` · ${e.claims.pendientes} pendientes` : ''}`}
          />
        </KpiCell>
        <KpiCell>
          <Stat label="PRO" value={nf(e.pro)} sub={`${nf(e.proPagas)} pagando por Rebill · ${nf(e.canceladas)} canceladas`} tone={e.proPagas > 0 ? 'positive' : 'neutral'} />
        </KpiCell>
        <KpiCell>
          <Stat label="Ofertas del agente a PRO" value={nf(e.ofertasAPro)} sub="operaciones de hacienda ofrecidas" />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Correos automáticos a firmas"
            value={nf(e.correosAFirmas)}
            sub={`${nf(e.respuestasDeFirmas)} con respuesta registrada`}
            tone={e.correosAFirmas > 0 && e.respuestasDeFirmas === 0 ? 'negative' : 'neutral'}
          />
        </KpiCell>
      </KpiRow>

      <AdminSection title={`Prospectos · ${lista.length} de ${prospectos.length}`} flush>
        {lista.length === 0 ? (
          <AdminEmpty>No hay firmas no PRO para mostrar.</AdminEmpty>
        ) : (
          <ol>
            {lista.map((p, i) => {
              const informe = redactarInforme(p, {
                appUrl: APP_URL,
                urlPropuesta: conPropuesta ? urlPropuesta(p.m.slug, {}, APP_URL) : null,
                hoy,
              })
              const texto = informeTexto(informe)
              const wa = whatsappLink(p.m.telefono, guionWhatsapp(p))
              return (
                <li key={p.m.slug} className="border-b border-terminal-border last:border-b-0">
                  <details>
                    <summary className="px-panel py-2 flex flex-wrap items-center gap-x-3 gap-y-1 cursor-pointer list-none">
                      <span className="w-6 text-xxs font-terminal text-zinc-500 tabular-nums">{i + 1}</span>
                      <span className="w-10 text-right text-data font-terminal tabular-nums text-ink">{p.puntaje}</span>
                      <span className="min-w-0 flex-1 truncate text-data font-terminal text-ink">{p.m.nombre}</span>
                      <span className="text-xxs font-terminal text-zinc-500">{p.m.provincia ?? 's/provincia'}</span>
                      <span className="w-24 text-right text-xxs font-terminal text-zinc-400 tabular-nums">
                        {p.m.vistas30 == null ? 's/d' : `${nf(p.m.vistas30)} vis · ${p.m.diasConVisitas30} d`}
                      </span>
                      {p.zona.casosVivos.length > 0 && <Badge tone="accent">{p.zona.casosVivos.length} op. en zona</Badge>}
                      {p.canal !== 'mail' && <Badge tone="warning">{p.canal === 'telefono' ? 'sólo teléfono' : 'sin contacto'}</Badge>}
                      {p.m.informeReciente && <Badge tone="neutral">informe enviado</Badge>}
                    </summary>
                    <div className="px-panel pb-3 space-y-2">
                      <ul className="text-xxs font-terminal text-zinc-400 space-y-0.5">
                        {p.motivos.map((m) => (
                          <li key={m}>· {m}</li>
                        ))}
                        {p.alertas.map((a) => (
                          <li key={a} className="text-warning">
                            ! {a}
                          </li>
                        ))}
                        {p.m.ultimoCorreo && (
                          <li>
                            · último correo automático: {p.m.ultimoCorreo.slice(0, 10)} ({p.m.correosPrevios} en total, {p.m.respuestasPrevias} respondidos)
                          </li>
                        )}
                      </ul>
                      <div className="flex flex-wrap items-center gap-3 text-xxs font-terminal">
                        <Link href={`/consignatarias/${p.m.slug}`} className="text-accent hover:underline" target="_blank">
                          Ficha
                        </Link>
                        <Link href={`/dashboard?como=${p.m.slug}`} className="text-accent hover:underline">
                          Ver su panel
                        </Link>
                        {informe.enlacePropuesta && (
                          <a href={informe.enlacePropuesta} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                            Su propuesta
                          </a>
                        )}
                        {p.m.email && <span className="text-zinc-400">{p.m.email}</span>}
                        {p.m.telefono && (
                          <a href={`tel:${p.m.telefono.replace(/[^\d+]/g, '')}`} className="text-zinc-300 hover:text-accent">
                            {p.m.telefono}
                          </a>
                        )}
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            WhatsApp →
                          </a>
                        )}
                      </div>
                      <div className="border border-terminal-border rounded-terminal p-2">
                        <p className="text-xxs font-terminal text-zinc-500 mb-1">Asunto: {informe.asunto}</p>
                        <pre className="whitespace-pre-wrap text-xxs text-zinc-300 font-terminal">{texto}</pre>
                      </div>
                      <AccionesInforme
                        slug={p.m.slug}
                        nombre={p.m.nombre}
                        email={p.m.email}
                        texto={texto}
                        asunto={informe.asunto}
                        envioHabilitado={encendido}
                        bloqueo={bloqueo(p)}
                      />
                    </div>
                  </details>
                </li>
              )
            })}
          </ol>
        )}
      </AdminSection>

      <p className="text-xxs font-terminal text-zinc-500 px-1">
        Puntaje: 3 por cada día distinto con visitas + visitas (hasta 3 por día) + 5 si suben mes contra mes + Google (hasta 10) + 4 por pedido de
        hacienda en su provincia y 2 en una limítrofe + 6 por operación abierta del agente en la zona + 2 por remate próximo (hasta 10) + 5 si está
        verificada o reclamada. Sin mail, la mitad. Las PRO no aparecen.
      </p>
    </>
  )
}
