import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import type { ConsignatariaProfile } from '@/lib/data/consignataria-slugs'
import { getDatosFirma, getDatosSitio } from '@/lib/propuesta/datos'
import { getDatosFunciones } from '@/lib/propuesta/funciones'
import { ALCANCE_GOOGLE } from '@/lib/data/alcance-google'
import { Presentacion } from './Presentacion'

const SITIO = 'https://www.consignatarias.com.ar'

const mesAnio = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

/** El PDF de la propuesta PRO de una firma, con sus datos de hoy. */
export async function generarPresentacionPro(profile: ConsignatariaProfile, contacto?: string): Promise<Buffer> {
  const slug = profile.canonicalSlug
  const [datos, sitio, f, qrDataUrl] = await Promise.all([
    getDatosFirma(profile),
    getDatosSitio(),
    getDatosFunciones(profile),
    QRCode.toDataURL(`${SITIO}/go/${slug}?utm_source=qr`, { margin: 1, width: 480, color: { dark: '#111827', light: '#ffffff' } }),
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
    />,
  )
}
