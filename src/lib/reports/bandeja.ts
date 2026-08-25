/**
 * bandeja.ts — todo lo que la casa tiene que atender hoy, en una sola lista.
 *
 * POR QUÉ
 * El panel tenía la información repartida en cinco bloques: leads acá, cartera allá,
 * precio más abajo. Para saber qué hacer un martes a la mañana había que leer los
 * cinco y armar la conclusión uno mismo. Una herramienta que exige eso se abre dos
 * veces y después no se abre más.
 *
 * La bandeja invierte la carga: junta las señales de todas las fuentes, las ordena por
 * lo que está en juego, y arriba de todo queda lo que hay que hacer primero.
 *
 * CÓMO SE ORDENA
 * Por plata y urgencia, no por fecha. Un remitente de 400 cabezas que se está yendo
 * vale más que un lead de ayer sin datos. La prioridad es un número explícito
 * (`peso`) para que se pueda discutir y ajustar, en vez de quedar escondido en el
 * orden de un array.
 *
 * LO QUE NO HACE
 * No inventa entradas para llenar. Si no hay nada que atender, la bandeja lo dice y
 * listo — es preferible a una lista de tareas decorativas que enseñan a ignorarla.
 */

import type { Cartera } from './cartera'
import type { Benchmark } from './benchmark'
import type { Participacion } from './participacion'

export type TipoEntrada =
  | 'lead'
  | 'cliente_fuga'
  | 'cliente_ganado'
  | 'precio_bajo'
  | 'precio_alto'
  | 'cuota'
  | 'remate'
  | 'perfil'

export type Urgencia = 'urgente' | 'atencion' | 'buena' | 'info'

export interface EntradaBandeja {
  id: string
  tipo: TipoEntrada
  urgencia: Urgencia
  titulo: string
  detalle: string
  /** Prioridad calculada. Mayor = más arriba. */
  peso: number
  /** Adónde lleva la acción, si hay una. */
  href?: string
  accion?: string
  /** Dato duro para mostrar al costado (cabezas, %, etc.). */
  dato?: string
}

export interface Bandeja {
  entradas: EntradaBandeja[]
  urgentes: number
  /** Cabezas en juego entre los clientes que se están yendo. */
  cabezasEnRiesgo: number
}

export interface InsumosBandeja {
  cartera: Cartera | null
  benchmark: Benchmark | null
  participacion: Participacion | null
  leadsNuevos: Array<{ id: number; name: string; created_at: string; message: string | null }>
  /** Remates próximos ya cargados por la firma. */
  proximosRemates: Array<{ title: string; date: string }>
  /** Campos del perfil que faltan y que frenan el contacto. */
  faltaWhatsapp: boolean
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
}

/**
 * Arma la bandeja a partir de todo lo que el panel ya calculó.
 *
 * Es una función pura: recibe los resultados, no consulta nada. Así se puede razonar
 * y testear el orden de prioridades sin base de datos.
 */
export function construirBandeja(i: InsumosBandeja): Bandeja {
  const entradas: EntradaBandeja[] = []

  // 1 · LEADS SIN ATENDER — alguien levantó la mano y espera.
  for (const l of i.leadsNuevos) {
    const dias = diasDesde(l.created_at)
    entradas.push({
      id: `lead-${l.id}`,
      tipo: 'lead',
      // Un lead que espera hace más de dos días ya es una mala impresión.
      urgencia: dias >= 2 ? 'urgente' : 'atencion',
      titulo: `${l.name} te consultó`,
      detalle: l.message?.slice(0, 120) || 'Dejó sus datos desde tu perfil.',
      peso: 900 + dias * 10,
      href: '/dashboard?tab=leads',
      accion: 'Ver contacto',
      dato: dias === 0 ? 'hoy' : `hace ${dias}d`,
    })
  }

  // 2 · CLIENTES FUERA DE SU RITMO.
  //
  // EL TONO IMPORTA. Antes esto decía "Fulano dejó de consignarte", y eso afirma una
  // decisión que el productor puede no haber tomado: lo más probable es que no tenga
  // hacienda lista. Acusar a un cliente de irse cuando sólo está entre ciclos hace
  // que la casa desconfíe de la herramienta la primera vez que llama y le dicen
  // "pero si no tengo nada para mandar".
  //
  // Ahora se enuncia el hecho —cuántos días pasaron contra su ritmo habitual— y se
  // deja la interpretación abierta, salvo cuando el propio MAG muestra que el cliente
  // está operando en otra casa. Ahí sí es un hecho y se dice sin vueltas.
  for (const r of i.cartera?.enRiesgo.slice(0, 6) ?? []) {
    entradas.push({
      id: `fuga-${r.nombre}`,
      tipo: 'cliente_fuga',
      // Sólo es urgente si está probado que se fue a otra casa. Un silencio, por
      // largo que sea, es para preguntar — no para alarmarse.
      urgencia: r.seFueA ? 'urgente' : 'atencion',
      titulo: r.seFueA
        ? `${r.nombre} está operando en otra casa`
        : `${r.nombre}: ${r.diasSilencio} días sin consignarte`,
      detalle: r.seFueA
        ? `Te consignaba cada ${r.cadenciaDias} días. Hace ${r.diasSilencio} que no aparece con vos y su última operación fue en ${r.seFueA}.`
        : `Venía consignando cada ${r.cadenciaDias} días. Puede que no tenga hacienda lista — o que esté vendiendo por otro lado. Una llamada lo saca.`,
      // Las cabezas mandan, y que esté operando en otra casa pesa más que un silencio.
      peso: 1000 + r.cabezas + (r.seFueA ? 500 : 0),
      dato: `${r.cabezas.toLocaleString('es-AR')} cab`,
    })
  }

  // 3 · PRECIO POR DEBAJO DEL MERCADO — plata que se deja en la mesa.
  for (const f of i.benchmark?.debiles.slice(0, 2) ?? []) {
    entradas.push({
      id: `precio-bajo-${f.categoria}`,
      tipo: 'precio_bajo',
      urgencia: 'atencion',
      titulo: `Estás vendiendo ${f.categoria.toLowerCase()} por debajo del mercado`,
      detalle: `$${f.miPrecio.toLocaleString('es-AR')}/kg contra $${f.precioMercado.toLocaleString('es-AR')} del promedio, sobre ${f.lotes} lotes.`,
      peso: 700 + Math.abs(f.diffPct) * 10,
      dato: `${f.diffPct}%`,
    })
  }

  // 4 · PERDIENDO CUOTA.
  if (i.participacion?.significativo && i.participacion.deltaPuntos < 0) {
    entradas.push({
      id: 'cuota-baja',
      tipo: 'cuota',
      urgencia: 'atencion',
      titulo: 'Perdiste participación en el Mercado',
      detalle: `Pasaste de ${i.participacion.cuotaPrevia}% a ${i.participacion.cuota}% de las cabezas operadas en Cañuelas.`,
      peso: 650,
      dato: `${i.participacion.deltaPuntos} pts`,
    })
  }

  // 5 · SIN WHATSAPP — el contacto no existe hasta que esto se carga.
  if (i.faltaWhatsapp) {
    entradas.push({
      id: 'perfil-whatsapp',
      tipo: 'perfil',
      urgencia: 'atencion',
      titulo: 'Falta tu WhatsApp',
      detalle: 'Sin WhatsApp cargado, tu perfil no muestra el botón de contacto. Las firmas que lo tienen reciben tres veces más consultas.',
      peso: 600,
      href: '/dashboard?tab=editar',
      accion: 'Cargarlo',
    })
  }

  // 6 · LO BUENO — va abajo a propósito: se lee, no se acciona.
  for (const g of i.cartera?.ganados.slice(0, 3) ?? []) {
    entradas.push({
      id: `ganado-${g.nombre}`,
      tipo: 'cliente_ganado',
      urgencia: 'buena',
      titulo: `${g.nombre} empezó a consignarte`,
      detalle: `Venía operando en ${g.veniaDe}.`,
      peso: 400 + g.cabezas / 10,
      dato: `${g.cabezas.toLocaleString('es-AR')} cab`,
    })
  }

  for (const f of i.benchmark?.fuertes.slice(0, 1) ?? []) {
    entradas.push({
      id: `precio-alto-${f.categoria}`,
      tipo: 'precio_alto',
      urgencia: 'buena',
      titulo: `Vendés ${f.categoria.toLowerCase()} por encima del mercado`,
      detalle: `${f.diffPct}% arriba del promedio sobre ${f.lotes} lotes. Sirve para mostrarle a un productor.`,
      peso: 350,
      dato: `+${f.diffPct}%`,
    })
  }

  // 7 · AGENDA.
  for (const r of i.proximosRemates.slice(0, 2)) {
    const dias = -diasDesde(r.date)
    if (dias < 0) continue
    entradas.push({
      id: `remate-${r.date}-${r.title}`,
      tipo: 'remate',
      urgencia: 'info',
      titulo: r.title || 'Remate programado',
      detalle: dias === 0 ? 'Es hoy.' : `En ${dias} ${dias === 1 ? 'día' : 'días'}.`,
      peso: 300 - dias,
      href: '/dashboard?tab=remates',
      dato: new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
    })
  }

  entradas.sort((a, b) => b.peso - a.peso)

  return {
    entradas,
    urgentes: entradas.filter((e) => e.urgencia === 'urgente').length,
    cabezasEnRiesgo: (i.cartera?.enRiesgo ?? []).reduce((a, r) => a + r.cabezas, 0),
  }
}
