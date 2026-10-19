import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import type { ConsignatariaProfile } from '@/lib/data/consignataria-slugs'
import { getDatosFirma, getDatosSitio } from '@/lib/propuesta/datos'
import { getDatosFunciones } from '@/lib/propuesta/funciones'
import { ALCANCE_GOOGLE } from '@/lib/data/alcance-google'
import { Presentacion, type FormatoPresentacion } from './Presentacion'
import { getBusquedasFicha } from '@/lib/gsc/fichas'
import { createServiceClient } from '@/lib/supabase'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const SITIO = 'https://www.consignatarias.com.ar'

/**
 * Capturas reales del panel de la firma, si alguien las sacó en esta máquina
 * (scripts/propuesta-capturas-firma.mjs → private/capturas-firmas/<slug>/<id>.png).
 * `private/capturas-firmas/` está fuera de git: llevan datos de la firma. En producción
 * no existen y la propuesta sale con las capturas de ejemplo.
 */
function capturasDeFirma(slug: string): Record<string, string> {
  const dir = path.join(process.cwd(), 'private/capturas-firmas', slug)
  if (!existsSync(dir)) return {}
  return Object.fromEntries(
    readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => [f.slice(0, -4), path.join(dir, f)]),
  )
}

const mesAnio = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

/** El PDF de la propuesta PRO de una firma, con sus datos de hoy. */
export async function generarPresentacionPro(
  profile: ConsignatariaProfile,
  contacto?: string,
  formato: FormatoPresentacion = 'a4',
): Promise<Buffer> {
  const slug = profile.canonicalSlug
  const db = createServiceClient()
  const [datos, sitio, f, qrDataUrl, busquedas] = await Promise.all([
    getDatosFirma(profile),
    getDatosSitio(),
    getDatosFunciones(profile),
    QRCode.toDataURL(`${SITIO}/go/${slug}?utm_source=qr`, { margin: 1, width: 480, color: { dark: '#111827', light: '#ffffff' } }),
    db ? getBusquedasFicha(db as unknown as Parameters<typeof getBusquedasFicha>[0], slug).catch(() => null) : Promise.resolve(null),
  ])
  const generado = new Date().toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  return renderToBuffer(
    <Presentacion
      firma={profile.displayName}
      slug={slug}
      contacto={contacto}
      generado={generado.charAt(0).toUpperCase() + generado.slice(1)}
      datos={datos}
      sitio={sitio}
      f={f}
      impresiones={{ total: ALCANCE_GOOGLE.impresiones, clics: ALCANCE_GOOGLE.clics, desde: mesAnio(ALCANCE_GOOGLE.desde), hasta: mesAnio(ALCANCE_GOOGLE.hasta) }}
      qrDataUrl={qrDataUrl}
      linkActivar={`${SITIO}/consignatarias/${slug}/activar`}
      porMes={[...ALCANCE_GOOGLE.porMes]}
      busquedas={busquedas}
      formato={formato}
      capturasReales={capturasDeFirma(slug)}
    />,
  )
}
