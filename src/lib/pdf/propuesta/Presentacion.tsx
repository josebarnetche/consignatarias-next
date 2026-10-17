/* eslint-disable jsx-a11y/alt-text -- <Image> de @react-pdf no es un <img>: no tiene alt; el PDF lleva título y textos. */
/**
 * La presentación PRO Consignataria en PDF (17-10-2026).
 *
 * POR QUÉ ASÍ. La primera versión era la página web impresa con "Guardar como PDF":
 * dependía del navegador, cortaba capturas y salía distinta en cada máquina. Esto es un
 * PDF de verdad, armado en el servidor con @react-pdf/renderer: diapositivas A4
 * apaisadas, Inter embebida, y el mismo archivo para todos. Es el que se adjunta al
 * mail que pide la firma y el que baja el botón "Descargar PDF".
 *
 * Lo propio de la firma (sus remates en el calendario, el mail semanal con su remate
 * primero, su lugar en el directorio, su QR, sus números) se DIBUJA con sus datos. Lo
 * que muestra el panel por dentro va como captura con datos de ejemplo
 * (scripts/propuesta-capturas.mjs), rotulada así, porque la propuesta la puede pedir
 * cualquiera con un mail.
 */
import path from 'node:path'
import { Document, Page, View, Text, Image, Svg, Path, Rect, Polygon, Link, Font, StyleSheet } from '@react-pdf/renderer'
import { ISO_RING } from '@/lib/og/brand'
import { BENEFICIOS_PRO_CONSIGNATARIA } from '@/lib/pro-consignataria-beneficios'
import type { DatosFirma, DatosSitio } from '@/lib/propuesta/datos'
import type { DatosFunciones } from '@/lib/propuesta/funciones'
import { consultasDeRemate, type BusquedasFicha } from '@/lib/gsc/fichas'

const FUENTES = path.join(process.cwd(), 'src/fonts')
Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(FUENTES, 'Inter-400.woff'), fontWeight: 400 },
    { src: path.join(FUENTES, 'Inter-500.woff'), fontWeight: 500 },
    { src: path.join(FUENTES, 'Inter-600.woff'), fontWeight: 600 },
    { src: path.join(FUENTES, 'Inter-700.woff'), fontWeight: 700 },
  ],
})
// Sin cortes de palabra con guión: en una diapositiva se lee peor que un renglón corto.
Font.registerHyphenationCallback((w) => [w])

const CAPTURAS = path.join(process.cwd(), 'src/lib/pdf/propuesta/capturas')

/* Paleta de papel (ver lib/pdf/estilo-impreso.ts): fondo blanco, color en texto y
   líneas finas, rellenos casi blancos. El acento es el azul del tema claro del sitio. */
const C = {
  tinta: '#111827',
  texto: '#374151',
  gris: '#6b7280',
  linea: '#e5e7eb',
  papel: '#f8fafc',
  acento: '#1d4ed8',
  acentoSuave: '#eff6ff',
  pro: '#b45309',
  carbon: '#0b0b0f',
  carbonPanel: '#18181b',
  carbonLinea: '#27272a',
  ambar: '#fbbf24',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', backgroundColor: '#ffffff', paddingTop: 40, paddingBottom: 46, paddingHorizontal: 48, color: C.texto, fontSize: 10 },
  pie: { position: 'absolute', bottom: 20, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.gris, borderTopWidth: 0.5, borderTopColor: C.linea, paddingTop: 6 },
  kicker: { fontSize: 8.5, fontWeight: 600, color: C.acento, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  h1: { fontSize: 30, fontWeight: 700, color: C.tinta, lineHeight: 1.15 },
  h2: { fontSize: 21, fontWeight: 700, color: C.tinta, lineHeight: 1.2, marginBottom: 10 },
  p: { fontSize: 10.5, lineHeight: 1.55, color: C.texto },
  chico: { fontSize: 8, color: C.gris, lineHeight: 1.4 },
})

const n = (x: number) => x.toLocaleString('es-AR')

function Isotipo({ size = 20 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 512 512" style={{ width: size, height: size }}>
      <Path d={ISO_RING} fill={C.tinta} />
      <Rect x="379.7" y="168.1" width="118" height="118" fill={C.acento} />
    </Svg>
  )
}

function Estrella({ size = 8, color = C.pro }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: size, height: size }}>
      <Polygon points="12,2 15,9 22,9.3 16.5,14 18.5,21.5 12,17.3 5.5,21.5 7.5,14 2,9.3 9,9" fill={color} />
    </Svg>
  )
}

function SelloPro() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 0.75, borderColor: C.pro, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1.5 }}>
      <Estrella size={6.5} />
      <Text style={{ fontSize: 6.5, fontWeight: 700, color: C.pro }}>PRO</Text>
    </View>
  )
}

function Marca() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Isotipo size={18} />
      <Text style={{ fontSize: 11, fontWeight: 600, color: C.tinta }}>
        consignatarias<Text style={{ color: C.acento }}>.</Text>com<Text style={{ color: C.acento }}>.</Text>ar
      </Text>
    </View>
  )
}

function Diapo({ firma, children }: { firma: string; children: React.ReactNode }) {
  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      {children}
      <View style={s.pie} fixed>
        <Text>consignatarias.com.ar · Propuesta PRO Consignataria · {firma}</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  )
}

/** Marco de navegador alrededor de una captura o de un dibujo del sitio. */
function Ventana({ url, ejemplo, children }: { url: string; ejemplo?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ borderWidth: 0.75, borderColor: C.linea, borderRadius: 8, overflow: 'hidden', backgroundColor: '#ffffff' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.papel, borderBottomWidth: 0.75, borderBottomColor: C.linea, paddingHorizontal: 8, paddingVertical: 5 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#d1d5db' }} />
        ))}
        <Text style={{ flex: 1, fontSize: 7, color: C.gris, backgroundColor: '#ffffff', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 }}>{url}</Text>
        {ejemplo && <Text style={{ fontSize: 6.5, fontWeight: 700, color: C.pro, letterSpacing: 0.4 }}>DATOS DE EJEMPLO</Text>}
      </View>
      <View style={{ padding: 10 }}>{children}</View>
    </View>
  )
}

/** Diapositiva de una función: texto a la izquierda, lo que se ve a la derecha. */
function Funcion({
  firma,
  numero,
  titulo,
  texto,
  puntos,
  children,
}: {
  firma: string
  numero: number
  titulo: string
  texto: string
  puntos: string[]
  children: React.ReactNode
}) {
  return (
    <Diapo firma={firma}>
      <View style={{ flexDirection: 'row', gap: 28, flex: 1 }}>
        <View style={{ width: 230 }}>
          <Text style={s.kicker}>Función {String(numero).padStart(2, '0')}</Text>
          <Text style={s.h2}>{titulo}</Text>
          <Text style={s.p}>{texto}</Text>
          <View style={{ marginTop: 14, gap: 7 }}>
            {puntos.map((p) => (
              <View key={p} style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ width: 5, height: 5, backgroundColor: C.acento, marginTop: 4 }} />
                <Text style={{ fontSize: 9.5, lineHeight: 1.45, color: C.tinta, flex: 1 }}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
      </View>
    </Diapo>
  )
}

function Cifra({ valor, texto, detalle }: { valor: string; texto: string; detalle: string }) {
  return (
    <View style={{ flex: 1, borderTopWidth: 1.5, borderTopColor: C.acento, paddingTop: 10 }}>
      <Text style={{ fontSize: 26, fontWeight: 700, color: C.tinta }}>{valor}</Text>
      <Text style={{ fontSize: 10, color: C.tinta, marginTop: 4, lineHeight: 1.35 }}>{texto}</Text>
      <Text style={[s.chico, { marginTop: 4 }]}>{detalle}</Text>
    </View>
  )
}

const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })

export interface PresentacionProps {
  firma: string
  slug: string
  contacto?: string
  generado: string
  datos: DatosFirma
  sitio: DatosSitio
  f: DatosFunciones
  impresiones: { total: number; clics: number; desde: string; hasta: string }
  qrDataUrl: string
  linkActivar: string
  porMes: { mes: string; impresiones: number; parcial?: boolean }[]
  busquedas: BusquedasFicha | null
}

export function Presentacion(p: PresentacionProps) {
  const { firma, datos, sitio, f } = p
  let num = 0
  const capt = (id: string) => path.join(CAPTURAS, `${id}.png`)

  return (
    <Document title={`Propuesta PRO Consignataria — ${firma}`} author="Memola Medios SAS · consignatarias.com.ar" language="es-AR">
      {/* PORTADA */}
      <Page size="A4" orientation="landscape" style={[s.page, { justifyContent: 'space-between', paddingRight: 340 }]}>
        <Image src={path.join(process.cwd(), 'src/lib/pdf/propuesta/portada.jpg')} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 300, objectFit: 'cover' }} fixed />
        <Marca />
        <View>
          <Text style={s.kicker}>Propuesta comercial</Text>
          <Text style={{ fontSize: 42, fontWeight: 700, color: C.tinta, lineHeight: 1.1 }}>PRO Consignataria</Text>
          <Text style={{ fontSize: 20, color: C.texto, marginTop: 14 }}>Para {firma}</Text>
          {p.contacto ? <Text style={{ fontSize: 11, color: C.gris, marginTop: 6 }}>A la atención de {p.contacto}</Text> : null}
          <Text style={[s.p, { marginTop: 24, maxWidth: 470 }]}>
            Qué recibe la firma, cómo se ve dentro del sitio y para qué le sirve. Cada número indica su período y
            de dónde sale.
          </Text>
        </View>
        <View style={{ borderTopWidth: 0.5, borderTopColor: C.linea, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.chico}>{p.generado}</Text>
          <Text style={s.chico}>Memola Medios SAS · agro@memola.com.ar</Text>
        </View>
      </Page>

      {/* EL ALCANCE */}
      <Diapo firma={firma}>
        <Text style={s.kicker}>El sitio</Text>
        <Text style={[s.h1, { maxWidth: 620 }]}>Donde el productor busca precio, remate y consignataria</Text>
        <View style={{ flexDirection: 'row', gap: 22, marginTop: 34 }}>
          <Cifra valor={n(p.impresiones.total)} texto="veces que el sitio apareció en una búsqueda de Google" detalle={`${p.impresiones.desde} – ${p.impresiones.hasta} · Search Console`} />
          {sitio.ia90 !== null && <Cifra valor={n(sitio.ia90)} texto="visitas que llegaron desde ChatGPT, Copilot, Gemini y otras IAs" detalle="Últimos 90 días · registro propio" />}
          {f.destinatariosSemanal !== null && <Cifra valor={n(f.destinatariosSemanal)} texto="suscriptores reciben cada lunes el resumen de remates" detalle="A hoy · lista del newsletter semanal" />}
          <Cifra valor={n(sitio.proximosCalendario)} texto={`próximos remates en el calendario, de ${n(sitio.firmas)} consignatarias`} detalle="A hoy · calendario del sitio" />
        </View>
        <View style={{ marginTop: 30 }}>
          <Text style={[s.chico, { marginBottom: 8 }]}>Veces que el sitio apareció en Google, por mes</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, height: 120 }}>
            {p.porMes.map((m) => {
              const max = Math.max(...p.porMes.map((x) => x.impresiones))
              return (
                <View key={m.mes} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 7, color: C.gris, marginBottom: 3 }}>{Math.round(m.impresiones / 1000)} mil</Text>
                  <View style={{ width: '100%', height: Math.max(3, (m.impresiones / max) * 95), backgroundColor: m.parcial ? '#bfdbfe' : C.acento, borderRadius: 2 }} />
                  <Text style={{ fontSize: 7.5, color: C.texto, marginTop: 4 }}>{m.mes}</Text>
                </View>
              )
            })}
          </View>
          <Text style={[s.chico, { marginTop: 6 }]}>Marzo y el mes en curso, parciales.</Text>
        </View>
      </Diapo>

      {/* LA FIRMA HOY */}
      <Diapo firma={firma}>
        <Text style={s.kicker}>Su firma hoy</Text>
        <Text style={[s.h1, { maxWidth: 620 }]}>{firma} ya está en el sitio</Text>
        <Text style={[s.p, { marginTop: 10, maxWidth: 560 }]}>
          Esto es lo que el sitio registra hoy sobre la firma, sin PRO. PRO cambia dónde aparece y qué recibe de
          cada visita.
        </Text>
        <View style={{ flexDirection: 'row', gap: 22, marginTop: 30 }}>
          <Cifra valor={n(datos.proximos.length)} texto="remates próximos publicados en nuestro calendario" detalle="Desde hoy · calendario del sitio" />
          {datos.vistas30 !== null && <Cifra valor={n(datos.vistas30)} texto="visitas a su ficha" detalle="Últimos 30 días · registro propio" />}
          {datos.ia90 && <Cifra valor={n(datos.ia90.total)} texto="visitas a su ficha desde asistentes de IA" detalle="Últimos 90 días · registro propio" />}
          {datos.mag && (
            <Cifra
              valor={`${datos.mag.cuota.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`}
              texto={`de las cabezas del Mercado de Cañuelas · puesto ${datos.mag.puesto} de ${datos.mag.totalCasas}`}
              detalle="Últimos 30 días · lotes publicados por el MAG"
            />
          )}
        </View>
        {datos.proximos.length > 0 && (
          <View style={{ marginTop: 30, maxWidth: 560 }}>
            <Text style={[s.chico, { marginBottom: 6 }]}>Sus próximos remates en nuestro calendario</Text>
            {datos.proximos.slice(0, 5).map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: C.linea }}>
                <Text style={{ width: 70, fontSize: 9, color: C.gris }}>{fechaCorta(r.fecha)}</Text>
                <Text style={{ flex: 1, fontSize: 9.5, color: C.tinta }}>{r.titulo}{r.lugar ? ` · ${r.lugar}` : ''}</Text>
              </View>
            ))}
          </View>
        )}
      </Diapo>

      {/* LO QUE BUSCAN EN GOOGLE — sus búsquedas reales (Search Console, 90 días). */}
      {p.busquedas?.d90 && p.busquedas.d90.impresiones > 0 && (() => {
        const b = p.busquedas!.d90!
        const enVivo = consultasDeRemate(b.consultas)
        const fmtD = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
        return (
          <Diapo firma={firma}>
            <Text style={s.kicker}>Lo que buscan en Google sobre su firma</Text>
            <Text style={[s.h1, { maxWidth: 640 }]}>
              Su ficha apareció {n(b.impresiones)} veces en Google en 90 días
            </Text>
            <Text style={[s.p, { marginTop: 8, maxWidth: 600 }]}>
              Estas son las búsquedas reales que mostraron la ficha de {firma} en consignatarias.com.ar
              {enVivo.length > 0 ? `. ${n(enVivo.reduce((a, c) => a + c.impresiones, 0))} de ellas buscaban su remate en vivo. Es gente que ya lo está buscando: con PRO la ficha la recibe con su sello, sus próximos remates destacados y el formulario de consulta.` : '.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 28, marginTop: 20 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: C.tinta, paddingBottom: 4 }}>
                  <Text style={{ flex: 1, fontSize: 8, fontWeight: 600, color: C.tinta }}>Búsqueda</Text>
                  <Text style={{ width: 70, textAlign: 'right', fontSize: 8, fontWeight: 600, color: C.tinta }}>Apariciones</Text>
                  <Text style={{ width: 50, textAlign: 'right', fontSize: 8, fontWeight: 600, color: C.tinta }}>Clics</Text>
                </View>
                {b.consultas.slice(0, 8).map((c) => {
                  const vivo = enVivo.includes(c)
                  return (
                    <View key={c.query} style={{ flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.linea, backgroundColor: vivo ? C.acentoSuave : '#ffffff' }}>
                      <Text style={{ flex: 1, fontSize: 9.5, color: C.tinta, fontWeight: vivo ? 600 : 400 }}>{c.query}</Text>
                      <Text style={{ width: 70, textAlign: 'right', fontSize: 9.5, color: C.tinta }}>{n(c.impresiones)}</Text>
                      <Text style={{ width: 50, textAlign: 'right', fontSize: 9.5, color: C.gris }}>{n(c.clics)}</Text>
                    </View>
                  )
                })}
              </View>
              <View style={{ width: 200, gap: 18 }}>
                <Cifra valor={n(b.impresiones)} texto="veces que su ficha apareció en una búsqueda" detalle={`${fmtD(b.desde)} – ${fmtD(b.hasta)} · Search Console`} />
                <Cifra valor={n(b.clics)} texto="personas entraron a su ficha desde Google" detalle="Mismo período" />
              </View>
            </View>
          </Diapo>
        )
      })()}

      {/* 1 · CALENDARIO */}
      <Funcion
        firma={firma}
        numero={++num}
        titulo="Sus remates, resaltados en el calendario"
        texto="El productor que busca remate recorre el calendario por fecha. Los de una firma PRO salen marcados, con el sello, en todos los listados y en la ficha de cada remate."
        puntos={['Más ojos sobre cada remate, sin pagar pauta', 'Se nota frente a las otras casas que rematan el mismo día', 'Aplica a todos los remates que publica, sin cargarlos de nuevo']}
      >
        <Ventana url="consignatarias.com.ar/remates/semana">
          {f.calendario.map(({ remate, pro }, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderBottomWidth: i < f.calendario.length - 1 ? 0.5 : 0,
                borderBottomColor: C.linea,
                backgroundColor: pro ? C.acentoSuave : '#ffffff',
                borderLeftWidth: pro ? 2.5 : 0,
                borderLeftColor: C.acento,
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: pro ? 700 : 500, color: C.tinta }}>{remate.consignatariaName}</Text>
                  {pro && <SelloPro />}
                </View>
                <Text style={{ fontSize: 8, color: C.gris, marginTop: 2 }}>
                  {fechaCorta(remate.date)} · {remate.location}{remate.time ? ` · ${remate.time} hs` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 7.5, color: C.gris }}>Ver remate ›</Text>
            </View>
          ))}
        </Ventana>
      </Funcion>

      {/* 2 · MAIL SEMANAL */}
      <Funcion
        firma={firma}
        numero={++num}
        titulo="Una campaña de email por semana, con su remate primero"
        texto={`Cada lunes sale el resumen de remates de la semana${f.destinatariosSemanal ? ` a ${n(f.destinatariosSemanal)} suscriptores` : ''}. Los remates de las firmas PRO van arriba y destacados.`}
        puntos={['Su remate en la bandeja del productor, sin armar la campaña', 'Queda registrado a cuántos les llegó cada envío', 'Lo ve en su panel y en el reporte del mes']}
      >
        <View style={{ backgroundColor: C.carbon, borderRadius: 8, padding: 16 }}>
          <Text style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 1 }}>CIERRE SEMANAL · CALENDARIO</Text>
          <Text style={{ fontSize: 13, fontWeight: 700, color: '#fafafa', marginTop: 4 }}>Remates de la semana</Text>
          <Text style={{ fontSize: 7.5, color: '#71717a', marginTop: 2, marginBottom: 10 }}>
            {f.newsletter.semana} · {f.newsletter.total} remates programados en el país
          </Text>
          {f.newsletter.remates.slice(0, 5).map((r, i) => (
            <View
              key={i}
              style={{
                backgroundColor: C.carbonPanel,
                borderWidth: 0.75,
                borderColor: r.isPro ? C.ambar : C.carbonLinea,
                borderLeftWidth: r.isPro ? 2.5 : 0.75,
                borderRadius: 2,
                padding: 7,
                marginBottom: 5,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {r.isPro && <Estrella size={7} color={C.ambar} />}
                  <Text style={{ fontSize: 8.5, fontWeight: 600, color: r.isPro ? C.ambar : '#fafafa' }}>{r.consignataria}</Text>
                </View>
                <Text style={{ fontSize: 7, color: '#71717a' }}>{r.date.slice(8, 10)}/{r.date.slice(5, 7)}{r.time ? ` · ${r.time}` : ''}</Text>
              </View>
              <Text style={{ fontSize: 7.5, color: '#a1a1aa', marginTop: 2 }}>{r.title}</Text>
            </View>
          ))}
        </View>
      </Funcion>

      {/* 3 · DIRECTORIO + IA */}
      <Funcion
        firma={firma}
        numero={++num}
        titulo="Primera cuando buscan consignataria"
        texto={`En el directorio de ${f.provincia ?? 'su provincia'} y en el general, las firmas PRO van primero y con el sello. Cuando un asistente de IA consulta nuestro directorio, la respuesta también las pone adelante.`}
        puntos={['El productor que llega a la provincia la ve antes que al resto', 'Lo mismo cuando la búsqueda la hace una IA por el productor']}
      >
        <Ventana url={`consignatarias.com.ar/consignatarias`}>
          {f.directorio.map((d, i) => (
            <View
              key={d.slug}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                marginBottom: 5,
                borderRadius: 5,
                borderWidth: 0.75,
                borderColor: d.pro ? C.acento : C.linea,
                backgroundColor: d.pro ? C.acentoSuave : '#ffffff',
              }}
            >
              <Text style={{ width: 10, fontSize: 8, color: C.gris }}>{i + 1}</Text>
              <Text style={{ flex: 1, fontSize: 10, fontWeight: d.pro ? 700 : 500, color: C.tinta }}>{d.nombre}</Text>
              <Text style={{ fontSize: 7.5, color: C.gris }}>{d.remates} {d.remates === 1 ? 'remate próximo' : 'remates próximos'}</Text>
              {d.pro && <SelloPro />}
            </View>
          ))}
        </Ventana>
        <View style={{ marginTop: 10, backgroundColor: C.papel, borderRadius: 6, padding: 10, borderWidth: 0.5, borderColor: C.linea }}>
          <Text style={{ fontSize: 7, color: C.gris, marginBottom: 4 }}>Respuesta del directorio a un asistente de IA</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Estrella size={7} />
            <Text style={{ fontSize: 8, color: C.tinta, fontWeight: 600 }}>PRO · {firma} · Consignataria</Text>
          </View>
          {f.directorio.slice(1, 3).map((d) => (
            <Text key={d.slug} style={{ fontSize: 8, color: C.texto, marginTop: 2 }}>{d.nombre} · Consignataria</Text>
          ))}
        </View>
      </Funcion>

      {/* 4 · PRE-OFERTA */}
      <Funcion
        firma={firma}
        numero={++num}
        titulo="Pre-oferta: compradores identificados antes del martillo"
        texto="Desde su panel arma el remate, sube cada lote con su video y lo publica. El interesado mira el video y deja su oferta y su contacto; le llega por mail y queda en el panel."
        puntos={['Llega al remate sabiendo quién está interesado y en qué lote', 'El video trabaja por usted antes del día del remate', 'El contacto del interesado nunca se publica']}
      >
        <Ventana url="consignatarias.com.ar/dashboard · Pre-ofertas" ejemplo>
          <Image src={capt('preoferta')} style={{ width: '100%' }} />
        </Ventana>
      </Funcion>

      {/* 5 · CONSULTAS */}
      <Funcion
        firma={firma}
        numero={++num}
        titulo="Cada consulta, con nombre y contacto"
        texto="Los productores que le escriben desde su ficha o desde su página propia le llegan por mail y quedan en la bandeja del panel, con el teléfono o el email que dejaron."
        puntos={['Sin PRO se ve que hubo una consulta, pero no el contacto', 'Responde el mismo día, desde su teléfono']}
      >
        <Ventana url="consignatarias.com.ar/dashboard · Leads" ejemplo>
          <Image src={capt('consultas')} style={{ width: '100%' }} />
        </Ventana>
      </Funcion>

      {/* 6 · QUIÉN TE MIRA */}
      <Funcion
        firma={firma}
        numero={++num}
        titulo="Quién lo mira, qué día y desde dónde"
        texto="Las vistas de su ficha día por día, de dónde llegan (Google, el calendario, el directorio, una IA, directo o QR) y qué día lo miran más."
        puntos={['Sabe si un remate movió visitas a su ficha', 'Ve cuántas llegan desde ChatGPT, Copilot o Gemini', 'Elige el día para publicar y difundir']}
      >
        <Ventana url="consignatarias.com.ar/dashboard · Quién te mira" ejemplo>
          <Image src={capt('visitas')} style={{ width: '100%' }} />
        </Ventana>
      </Funcion>

      {/* 7 · CAÑUELAS (sólo si opera ahí) */}
      {datos.mag && (
        <Funcion
          firma={firma}
          numero={++num}
          titulo="Su negocio contra el Mercado de Cañuelas"
          texto="Cruzamos las operaciones que el Mercado Agroganadero publica lote por lote —las 22 casas, cada día de remate— contra las suyas."
          puntos={['Qué remitentes dejaron de consignarle', 'A qué precio vendió contra el promedio, categoría por categoría', 'Su cuota y su puesto entre las 22 casas']}
        >
          <Ventana url="consignatarias.com.ar/dashboard · Mercado" ejemplo>
            <Image src={capt('mercado')} style={{ width: '100%', maxHeight: 400, objectFit: 'contain', objectPosition: 'top' }} />
          </Ventana>
        </Funcion>
      )}

      {/* PRECIO CONTRA EL MERCADO (interior: sin dato del MAG) */}
      {!datos.mag && (
        <Funcion
          firma={firma}
          numero={++num}
          titulo="Su precio contra el mercado"
          texto="Carga los promedios de su remate por categoría y se los comparamos con el Valor de Referencia de esa semana: la banda de lo que se pagó de verdad por esa categoría y peso."
          puntos={['Sabe si vendió arriba o abajo de la mediana, categoría por categoría', 'Un número para mostrarle al remitente', 'La referencia está publicada y su método es abierto']}
        >
          <Ventana url="consignatarias.com.ar/dashboard · Tu precio contra el mercado" ejemplo>
            <Image src={capt('precio')} style={{ width: '100%' }} />
          </Ventana>
        </Funcion>
      )}

      {/* 8 · WIDGET + QR */}
      <Funcion
        firma={firma}
        numero={++num}
        titulo="Sus remates en su web y en sus catálogos"
        texto="Un widget que muestra sus próximos remates en su página web, actualizado solo, y un QR para el catálogo y la feria que lleva a su página en el sitio, con su logo, el sello y el formulario de consulta."
        puntos={['No hay que actualizar la web a mano', 'El QR convierte el catálogo impreso en consultas']}
      >
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
          <View style={{ alignItems: 'center' }}>
            <Image src={p.qrDataUrl} style={{ width: 120, height: 120 }} />
            <Text style={[s.chico, { marginTop: 4 }]}>consignatarias.com.ar/go/{p.slug}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Ventana url="su-sitio-web.com.ar">
              <Text style={{ fontSize: 9.5, fontWeight: 700, color: C.tinta, marginBottom: 6 }}>{firma} · próximos remates</Text>
              {datos.proximos.slice(0, 3).map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: C.linea }}>
                  <Text style={{ fontSize: 8.5, color: C.tinta, flex: 1 }}>{r.titulo}</Text>
                  <Text style={{ fontSize: 8, color: C.acento }}>{fechaCorta(r.fecha)}</Text>
                </View>
              ))}
              {datos.proximos.length === 0 && <Text style={s.chico}>Cuando publique un remate, aparece acá solo.</Text>}
            </Ventana>
          </View>
        </View>
      </Funcion>

      {/* 9 · REPORTE MENSUAL */}
      <Funcion
        firma={firma}
        numero={++num}
        titulo="Un reporte cada mes, sin entrar al sitio"
        texto="El primer día de cada mes le llega por mail el resumen del mes anterior."
        puntos={['Para mostrarle al socio qué devolvió la inversión', 'Con los mismos números que ve en el panel']}
      >
        <Ventana url="Bandeja de entrada · Tu mes en consignatarias.com.ar">
          {[
            ['Vistas de su perfil', datos.vistas30],
            ['Visitas desde asistentes de IA', datos.ia90?.total ?? null],
            ['Consultas recibidas', datos.consultas90],
          ].map(([k, v]) => (
            <View key={String(k)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: C.linea }}>
              <Text style={{ fontSize: 9.5, color: C.texto }}>{k}</Text>
              <Text style={{ fontSize: 12, fontWeight: 700, color: C.tinta }}>{typeof v === 'number' ? n(v) : '—'}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}>
            <Text style={{ fontSize: 9.5, color: C.texto }}>Envíos con sus remates</Text>
            <Text style={{ fontSize: 9.5, fontWeight: 600, color: C.tinta }}>newsletter semanal</Text>
          </View>
          <Text style={[s.chico, { marginTop: 4 }]}>Cifras de hoy de {firma}, como referencia del formato.</Text>
        </Ventana>
      </Funcion>

      {/* INVERSIÓN */}
      <Diapo firma={firma}>
        <View style={{ flexDirection: 'row', gap: 36, flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>Inversión</Text>
            <Text style={{ fontSize: 40, fontWeight: 700, color: C.tinta }}>
              ARS 45.000<Text style={{ fontSize: 16, fontWeight: 400, color: C.gris }}> /mes</Text>
            </Text>
            <Text style={[s.p, { marginTop: 8 }]}>Facturación mensual en pesos · sin permanencia · se cancela desde el panel, sin pedirlo a nadie.</Text>
            <Text style={[s.kicker, { marginTop: 26 }]}>Cómo empezamos</Text>
            {[
              'Reclamar la ficha de la firma en el sitio (verificamos que la pide la firma).',
              'Entrar con su email en consignatarias.com.ar/login: llega un enlace, sin contraseña.',
              'Activar PRO desde el enlace de abajo.',
              'Cargar remates y lotes desde el panel.',
            ].map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: C.acento, width: 12 }}>{i + 1}</Text>
                <Text style={{ fontSize: 10, color: C.tinta, flex: 1, lineHeight: 1.4 }}>{t}</Text>
              </View>
            ))}
            <Link src={p.linkActivar} style={{ marginTop: 22, alignSelf: 'flex-start', backgroundColor: C.acento, color: '#ffffff', fontSize: 11, fontWeight: 600, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 5, textDecoration: 'none' }}>
              Activar PRO
            </Link>
            <Text style={[s.chico, { marginTop: 8 }]}>{p.linkActivar.replace('https://', '')}</Text>
          </View>
          <View style={{ width: 300, backgroundColor: C.papel, borderRadius: 8, padding: 16, borderWidth: 0.5, borderColor: C.linea }}>
            <Text style={[s.kicker, { color: C.tinta }]}>Todo lo que incluye</Text>
            {BENEFICIOS_PRO_CONSIGNATARIA.map((b) => (
              <View key={b} style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <Svg viewBox="0 0 24 24" style={{ width: 8, height: 8, marginTop: 2 }}>
                  <Path d="M4 12.5l5 5L20 6.5" stroke={C.acento} strokeWidth={3.2} fill="none" />
                </Svg>
                <Text style={{ fontSize: 8.5, color: C.tinta, flex: 1, lineHeight: 1.4 }}>{b.replace('★ ', '')}</Text>
              </View>
            ))}
            <Text style={[s.chico, { marginTop: 14 }]}>Consultas: agro@memola.com.ar · o reserve una reunión en calendar.app.google/gr2BXY1ooDMki8TK7</Text>
          </View>
        </View>
      </Diapo>
    </Document>
  )
}
