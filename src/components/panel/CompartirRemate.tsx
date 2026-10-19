'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { trackEvent } from '@/lib/analytics'
import { BotonPrimario, BotonSecundario } from './PanelUi'

/**
 * Compartir un remate (o la página de la firma) en un toque (18-10-2026).
 *
 * El QR se genera en el navegador (antes se pedía a un servicio externo y el PNG salía
 * de 140 px). Además arma una TARJETA de 1080×1350 —el formato de un estado de WhatsApp
 * o un post de Instagram— con la firma, el remate y el QR, lista para descargar o
 * mandar con el botón de compartir del celular. Todos los enlaces llevan UTM para que
 * la firma vea en su panel las visitas que le trajo.
 */

export interface QueCompartir {
  /** URL absoluta sin UTM. */
  url: string
  firma: string
  /** Rótulo chico arriba del título ("Próximo remate", "Mis remates"). */
  rotulo: string
  titulo: string
  /** Fecha, hora y lugar en una línea. */
  detalle?: string
  /** Nombre base de los archivos que se descargan. */
  archivo: string
  slugFirma: string
}

const conUtm = (url: string, fuente: string) =>
  `${url}${url.includes('?') ? '&' : '?'}utm_source=${fuente}&utm_medium=panel&utm_campaign=compartir`

/** Lee un color del tema ("29 78 216") y lo devuelve como rgb(). */
function token(nombre: string, porDefecto: string): string {
  if (typeof window === 'undefined') return porDefecto
  const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()
  return v ? `rgb(${v.split(/\s+/).join(',')})` : porDefecto
}

function partirEnLineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number, max: number): string[] {
  const palabras = texto.split(/\s+/)
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p
    if (ctx.measureText(prueba).width > ancho && actual) {
      lineas.push(actual)
      actual = p
    } else actual = prueba
  }
  if (actual) lineas.push(actual)
  if (lineas.length > max) {
    const cortadas = lineas.slice(0, max)
    cortadas[max - 1] = cortadas[max - 1].replace(/\s+\S*$/, '') + '…'
    return cortadas
  }
  return lineas
}

async function armarTarjeta(q: QueCompartir): Promise<Blob> {
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const acento = token('--accent', 'rgb(29,78,216)')
  const oscuro = 'rgb(9,9,11)'
  const claro = 'rgb(250,250,250)'
  const gris = 'rgb(161,161,170)'
  const familia = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'

  ctx.fillStyle = oscuro
  ctx.fillRect(0, 0, W, H)
  // Franja de color arriba.
  ctx.fillStyle = acento
  ctx.fillRect(0, 0, W, 14)

  ctx.textBaseline = 'top'
  ctx.fillStyle = gris
  ctx.font = `600 34px ${familia}`
  ctx.fillText(q.firma.toUpperCase(), 80, 96)

  ctx.fillStyle = acento
  ctx.font = `600 36px ${familia}`
  ctx.fillText(q.rotulo, 80, 170)

  ctx.fillStyle = claro
  ctx.font = `700 72px ${familia}`
  let y = 230
  for (const l of partirEnLineas(ctx, q.titulo, W - 160, 3)) {
    ctx.fillText(l, 80, y)
    y += 84
  }
  if (q.detalle) {
    ctx.fillStyle = gris
    ctx.font = `400 38px ${familia}`
    for (const l of partirEnLineas(ctx, q.detalle, W - 160, 2)) {
      y += 10
      ctx.fillText(l, 80, y)
      y += 44
    }
  }

  // QR sobre una placa blanca.
  const qr = await QRCode.toDataURL(conUtm(q.url, 'qr'), { width: 460, margin: 1, errorCorrectionLevel: 'M' })
  const img = new Image()
  await new Promise<void>((ok, mal) => {
    img.onload = () => ok()
    img.onerror = () => mal(new Error('qr'))
    img.src = qr
  })
  const lado = 500
  const qx = (W - lado) / 2
  const qy = H - lado - 230
  ctx.fillStyle = claro
  ctx.beginPath()
  ctx.roundRect(qx, qy, lado, lado, 36)
  ctx.fill()
  ctx.drawImage(img, qx + 20, qy + 20, lado - 40, lado - 40)

  ctx.fillStyle = claro
  ctx.font = `600 36px ${familia}`
  ctx.textAlign = 'center'
  ctx.fillText('Escaneá para ver el remate y consultar', W / 2, H - 190)
  ctx.fillStyle = gris
  ctx.font = `400 30px ${familia}`
  ctx.fillText(q.url.replace(/^https?:\/\//, ''), W / 2, H - 140)

  return new Promise((ok) => c.toBlob((b) => ok(b!), 'image/png'))
}

function descargar(blob: Blob, nombre: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export default function CompartirRemate({ q }: { q: QueCompartir }) {
  const [qr, setQr] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const texto = `${q.titulo}${q.detalle ? ` — ${q.detalle}` : ''}. Mirá el remate y consultá acá:`

  useEffect(() => {
    QRCode.toDataURL(conUtm(q.url, 'qr'), { width: 560, margin: 1 }).then(setQr).catch(() => setQr(null))
  }, [q.url])

  const avisar = (m: string) => {
    setAviso(m)
    setTimeout(() => setAviso(null), 2500)
  }

  async function compartir() {
    setTrabajando(true)
    try {
      const blob = await armarTarjeta(q)
      const archivo = new File([blob], `${q.archivo}.png`, { type: 'image/png' })
      const datos = { title: q.titulo, text: texto, url: conUtm(q.url, 'compartir'), files: [archivo] }
      if (navigator.canShare?.(datos)) {
        await navigator.share(datos)
      } else if (navigator.share) {
        await navigator.share({ title: q.titulo, text: texto, url: conUtm(q.url, 'compartir') })
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${conUtm(q.url, 'whatsapp')}`)}`, '_blank', 'noopener')
      }
      trackEvent('referral_whatsapp_share', { consignataria_slug: q.slugFirma, surface: 'panel_compartir' })
    } catch {
      /* el usuario cerró el menú de compartir */
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          {qr ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qr} alt="Código QR del remate" width={168} height={168} className="block h-[168px] w-[168px]" />
          ) : (
            <span className="block h-[168px] w-[168px]" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-medium text-accent">{q.rotulo}</p>
          <p className="mt-1 text-lg font-semibold leading-snug text-ink">{q.titulo}</p>
          {q.detalle && <p className="mt-1 text-sm text-zinc-500">{q.detalle}</p>}
          <p className="mt-3 break-all text-xs text-zinc-500">{q.url.replace(/^https?:\/\//, '')}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <BotonPrimario onClick={compartir} disabled={trabajando}>
          {trabajando ? 'Preparando…' : 'Compartir'}
        </BotonPrimario>
        <BotonSecundario href={`https://wa.me/?text=${encodeURIComponent(`${texto} ${conUtm(q.url, 'whatsapp')}`)}`} externo>
          Mandar por WhatsApp
        </BotonSecundario>
        <BotonSecundario
          disabled={trabajando}
          onClick={async () => {
            setTrabajando(true)
            try {
              descargar(await armarTarjeta(q), `${q.archivo}-tarjeta.png`)
              avisar('Tarjeta descargada: subila a tu estado o a Instagram.')
            } finally {
              setTrabajando(false)
            }
          }}
        >
          Descargar tarjeta
        </BotonSecundario>
        <BotonSecundario
          onClick={async () => {
            const png = await QRCode.toDataURL(conUtm(q.url, 'qr'), { width: 1200, margin: 2 })
            descargar(await (await fetch(png)).blob(), `${q.archivo}-qr.png`)
            avisar('QR descargado en alta calidad, para imprimir.')
          }}
        >
          Descargar QR
        </BotonSecundario>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(conUtm(q.url, 'link'))
          trackEvent('referral_link_copy', { consignataria_slug: q.slugFirma, surface: 'panel_compartir' })
          avisar('Link copiado.')
        }}
        className="w-full text-center text-sm text-accent hover:underline"
      >
        Copiar el link
      </button>
      {aviso && <p className="text-center text-sm text-positive" role="status">{aviso}</p>}
    </div>
  )
}
