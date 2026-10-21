/**
 * Los correos del agente. Puros: datos adentro, asunto + texto afuera.
 *
 * Voz: la de la casa, en plural y consultiva ("te escribimos", "lo estamos
 * ofreciendo"), firmada por el equipo. No firma José: él no lee estos hilos y un
 * correo con su nombre promete que sí.
 *
 * Cada asunto lleva la referencia del caso (`C-12` o `C-12-34`): es lo que
 * permite reconocer la respuesta aunque el cliente de correo pierda los
 * encabezados del hilo.
 */
import { COMISION_PCT, referencia, type DatosHacienda, type Lado } from './reglas'

export interface Correo {
  asunto: string
  texto: string
}

const FIRMA = ['', 'Saludos,', 'Equipo de consignatarias.com', 'www.consignatarias.com.ar'].join('\n')

const ETIQUETA_DATO: Record<string, string> = {
  cabezas: 'cuántas cabezas son',
  categoria: 'la categoría (novillos, vacas, terneros, vaquillonas...)',
  zona: 'en qué localidad y provincia está la hacienda',
}

const ars = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

function nombrePila(nombre: string | null | undefined): string {
  const n = (nombre ?? '').trim().split(/\s+/)[0] ?? ''
  if (n.length < 2 || /@|\d/.test(n)) return ''
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
}

const saludo = (nombre?: string | null) => {
  const n = nombrePila(nombre)
  return n ? `Hola ${n},` : 'Hola,'
}

/** "40 novillos en Saavedra, Buenos Aires" — la hacienda en una línea, sin datos de quién es. */
export function resumenHacienda(d: DatosHacienda): string {
  const cab = d.cabezas ? `${d.cabezas.toLocaleString('es-AR')} ` : ''
  const cat = d.categoria ?? 'cabezas'
  const lugar = [d.zona, d.provincia].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')
  return `${cab}${cat}${lugar ? ` en ${lugar}` : ''}`
}

function detalle(d: DatosHacienda): string {
  const filas = [
    d.cabezas ? `· Cabezas: ${d.cabezas.toLocaleString('es-AR')}` : null,
    d.categoria ? `· Categoría: ${d.categoria}` : null,
    d.peso_kg ? `· Peso aproximado: ${d.peso_kg} kg` : null,
    d.zona || d.provincia ? `· Zona: ${[d.zona, d.provincia].filter(Boolean).join(', ')}` : null,
    d.disponible ? `· Disponible: ${d.disponible}` : null,
    d.precio_pedido_kg ? `· Precio pretendido: ${ars(d.precio_pedido_kg)}/kg` : null,
  ]
  return filas.filter(Boolean).join('\n')
}

/** Al productor, cuando falta algo para poder ofrecer. */
export function pedirDatos(o: { leadId: number; nombre: string | null; lado: Lado; datos: DatosHacienda; faltan: string[]; recordatorio?: boolean }): Correo {
  const que = o.lado === 'vende' ? 'vender' : 'comprar'
  const lista = o.faltan.map((f) => `· ${ETIQUETA_DATO[f] ?? f}`).join('\n')
  const conocido = detalle(o.datos)
  return {
    asunto: `${o.recordatorio ? 'Seguimos con tu consulta' : 'Tu consulta en consignatarias.com'} · Ref. ${referencia(o.leadId)}`,
    texto: [
      saludo(o.nombre),
      '',
      o.recordatorio
        ? `Te escribimos la semana pasada por la hacienda que querías ${que} y nos faltan un par de datos para poder moverla.`
        : `Recibimos tu consulta para ${que} hacienda. Para buscarte ${o.lado === 'vende' ? 'comprador' : 'quién la tenga'} necesitamos:`,
      '',
      lista,
      ...(conocido ? ['', 'Lo que ya tenemos:', conocido] : []),
      '',
      'Respondé este correo con eso y nos ponemos a trabajar.',
      FIRMA,
    ].join('\n'),
  }
}

/** Al productor, cuando ya está todo y se empieza a ofrecer. */
export function avisoOfreciendo(o: { leadId: number; nombre: string | null; lado: Lado; datos: DatosHacienda }): Correo {
  const vende = o.lado === 'vende'
  return {
    asunto: `Ya estamos ${vende ? 'ofreciendo tu hacienda' : 'buscando la hacienda que pediste'} · Ref. ${referencia(o.leadId)}`,
    texto: [
      saludo(o.nombre),
      '',
      vende
        ? `Empezamos a ofrecer ${resumenHacienda(o.datos)} a compradores de la zona: frigoríficos, invernadores y consignatarias.`
        : `Empezamos a buscar ${resumenHacienda(o.datos)} entre productores y consignatarias de la zona.`,
      '',
      'Tus datos no los ve nadie hasta que una contraparte confirma por escrito que le interesa. Ahí te presentamos por este mismo correo y ustedes acuerdan precio y condiciones directamente.',
      '',
      'Si cambió algo (cantidad, categoría, si ya lo vendiste), respondé este correo y lo actualizamos. Si preferís que no lo ofrezcamos, respondé NO.',
      FIRMA,
    ].join('\n'),
  }
}

/**
 * A la contraparte. NUNCA lleva quién es el productor: el contacto se entrega
 * cuando acepta la comisión por escrito.
 */
export function oferta(o: { leadId: number; ofertaId: number; lado: Lado; datos: DatosHacienda; contraparte: string }): Correo {
  const vende = o.lado === 'vende'
  return {
    asunto: `${vende ? 'Hacienda disponible' : 'Comprador buscando'}: ${resumenHacienda(o.datos)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      'Buenas,',
      '',
      // A otro lead se le habla de "ustedes"; a una firma o planta, por su nombre.
      o.contraparte === 'ustedes'
        ? vende
          ? 'Les escribimos desde consignatarias.com. Un productor nos pidió ayuda para vender hacienda que coincide con lo que ustedes buscan:'
          : 'Les escribimos desde consignatarias.com. Un comprador nos pidió ayuda para conseguir hacienda como la que ustedes ofrecen:'
        : vende
          ? `Les escribimos desde consignatarias.com. Un productor nos pidió ayuda para vender hacienda y pensamos que puede interesarle a ${o.contraparte}:`
          : `Les escribimos desde consignatarias.com. Un comprador nos pidió ayuda para conseguir hacienda y pensamos que ${o.contraparte} puede tenerla:`,
      '',
      detalle(o.datos),
      '',
      `Si les interesa, respondan este correo con la palabra ACEPTO y les pasamos el contacto directo del ${vende ? 'productor' : 'comprador'} para que acuerden entre ustedes. Aceptar significa que, si la operación se concreta, nos corresponde una comisión del ${COMISION_PCT}% sobre el bruto, a cargo de ustedes. Si no se concreta, no hay ningún cargo.`,
      '',
      'Si tienen preguntas sobre la hacienda, respondan y se las trasladamos al productor. Si no les interesa este tipo de consultas, respondan BAJA y no les escribimos más.',
      FIRMA,
    ].join('\n'),
  }
}

/** A las dos partes juntas, después de la aceptación. */
export function presentacion(o: {
  leadId: number
  ofertaId: number
  lado: Lado
  datos: DatosHacienda
  productor: { nombre: string | null; email: string | null; phone: string | null }
  contraparte: { nombre: string; email: string }
}): Correo {
  const p = o.productor
  const contactoProductor = [p.nombre, p.email, p.phone].filter(Boolean).join(' · ')
  return {
    asunto: `Les presentamos: ${resumenHacienda(o.datos)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      'Hola a los dos,',
      '',
      `${o.contraparte.nombre} confirmó que le interesa ${o.lado === 'vende' ? 'la hacienda' : 'el pedido'}:`,
      '',
      detalle(o.datos),
      '',
      `· Productor: ${contactoProductor}`,
      `· ${o.contraparte.nombre}: ${o.contraparte.email}`,
      '',
      'A partir de acá acuerdan precio, plazo y condiciones directamente entre ustedes; nosotros no intervenimos en eso.',
      '',
      'En unos días les escribimos para saber cómo siguió. Si cierran antes, respondan este correo contándonos cuántas cabezas y a qué precio, así lo registramos.',
      FIRMA,
    ].join('\n'),
  }
}

/** Un solo recordatorio a la contraparte que no contestó la oferta, en el mismo hilo. */
export function recordatorioOferta(o: { leadId: number; ofertaId: number; lado: Lado; datos: DatosHacienda }): Correo {
  return {
    asunto: `Re: ${o.lado === 'vende' ? 'Hacienda disponible' : 'Comprador buscando'}: ${resumenHacienda(o.datos)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      'Buenas,',
      '',
      `Les reenvío la consulta de hace unos días por ${resumenHacienda(o.datos)}: ${o.lado === 'vende' ? 'la hacienda sigue disponible' : 'el comprador sigue buscando'}.`,
      '',
      `Si les interesa, respondan ACEPTO y les pasamos el contacto directo (comisión del ${COMISION_PCT}% sobre el bruto solo si la operación se concreta). Si no es para ustedes, con un "no" alcanza y no insistimos.`,
      FIRMA,
    ].join('\n'),
  }
}

/** Seguimiento de una presentación, a las dos partes. */
export function seguimiento(o: { leadId: number; ofertaId: number; datos: DatosHacienda; contraparte: string; vez: number }): Correo {
  return {
    asunto: `¿Cómo siguió? ${resumenHacienda(o.datos)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      'Hola,',
      '',
      `${o.vez === 0 ? 'Hace unos días' : 'Hace un tiempo'} los presentamos por ${resumenHacienda(o.datos)} con ${o.contraparte}. ¿Cómo siguió?`,
      '',
      'Con una línea alcanza:',
      '· "Cerramos X cabezas a $Y/kg" (o el total de la operación)',
      '· "Seguimos hablando"',
      '· "No se dio"',
      FIRMA,
    ].join('\n'),
  }
}

/** Al productor, cuando se agotaron las contrapartes. */
export function sinContraparte(o: { leadId: number; nombre: string | null; lado: Lado; datos: DatosHacienda; consultadas: number }): Correo {
  return {
    asunto: `Novedades de tu consulta · Ref. ${referencia(o.leadId)}`,
    texto: [
      saludo(o.nombre),
      '',
      `Ofrecimos ${resumenHacienda(o.datos)} a ${o.consultadas} ${o.consultadas === 1 ? 'contraparte' : 'contrapartes'} de la zona y por ahora ninguna confirmó interés.`,
      '',
      'Dejamos tu consulta abierta: si aparece alguien que busque esto, te avisamos. Si cambia algo (cantidad, categoría, precio pretendido), respondé este correo y la volvemos a ofrecer.',
      FIRMA,
    ].join('\n'),
  }
}

/** A la contraparte, cuando se registró el cierre. Es el pedido de cobro. */
export function avisoComision(o: { leadId: number; ofertaId: number; contraparte: string; datos: DatosHacienda; brutoArs: number; comisionArs: number }): Correo {
  return {
    asunto: `Operación registrada · comisión ${ars(o.comisionArs)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      'Buenas,',
      '',
      `Registramos la operación de ${resumenHacienda(o.datos)} que cerró ${o.contraparte}. ¡Felicitaciones!`,
      '',
      `· Bruto informado: ${ars(o.brutoArs)}`,
      `· Comisión acordada (${COMISION_PCT}%): ${ars(o.comisionArs)}`,
      '',
      'En los próximos días les llega la factura de Memola Medios SAS con los datos para el pago. Si algún número no coincide con lo que cerraron, respondan este correo y lo corregimos antes de facturar.',
      FIRMA,
    ].join('\n'),
  }
}

/** Respuesta a una pregunta de la contraparte, trasladada al productor (o al revés). */
export function traslado(o: { leadId: number; ofertaId: number; datos: DatosHacienda; aQuien: 'productor' | 'contraparte'; nombre: string | null; pregunta: string }): Correo {
  return {
    asunto: `Una consulta sobre ${resumenHacienda(o.datos)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      o.aQuien === 'productor' ? saludo(o.nombre) : 'Buenas,',
      '',
      o.aQuien === 'productor'
        ? 'Un interesado en tu hacienda pregunta:'
        : 'Le trasladamos su consulta al productor y esto es lo que respondió:',
      '',
      o.pregunta
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n'),
      '',
      o.aQuien === 'productor'
        ? 'Respondé este correo y se lo hacemos llegar. Tus datos siguen sin compartirse.'
        : 'Si con esto les interesa, respondan ACEPTO y les pasamos el contacto.',
      FIRMA,
    ].join('\n'),
  }
}

export function bajaConfirmada(): Correo {
  return {
    asunto: 'Listo, no te escribimos más',
    texto: ['Hola,', '', 'Te sacamos de nuestras consultas: no vas a recibir más correos nuestros por este tema.', FIRMA].join('\n'),
  }
}

/** Texto plano → HTML sobrio (el texto plano va igual como alternativa). */
export function aHtml(texto: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const bloques = texto.split(/\n{2,}/).map((b) => {
    const lineas = b.split('\n')
    if (lineas.every((l) => l.startsWith('> '))) {
      return `<blockquote style="margin:0 0 14px;padding:8px 12px;border-left:3px solid #d4d4d8;color:#3f3f46">${lineas.map((l) => esc(l.slice(2))).join('<br>')}</blockquote>`
    }
    return `<p style="margin:0 0 14px">${lineas.map(esc).join('<br>')}</p>`
  })
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#18181b;max-width:600px">${bloques.join('')}</div>`
}
