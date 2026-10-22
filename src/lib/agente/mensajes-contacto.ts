/**
 * Oferta de hacienda con el encuadre "servicio de contacto" — la que usa el motor
 * desde v1.244.0 (José: "avanzá con todo", 22-10-2026). Reemplaza a `oferta()` de
 * `mensajes.ts`, que queda solo como referencia. Conviene igual validarla con un
 * abogado (ver el riesgo SIOCAL abajo).
 *
 * Por qué (docs/agente/investigacion-comisionista-hacienda.md):
 *  · Intervenir en el comercio de hacienda exige inscripción en el SIOCAL
 *    (Res. SAGyP 50/2025, anexo Res. 103/2026; reemplazó al RUCA). No hay excepción
 *    para "solo poner en contacto".
 *  · Una "comisión sobre el bruto" puede leerse como corretaje sin matrícula y no
 *    ser cobrable. El encuadre más defendible es cobrar el SERVICIO DE CONTACTO,
 *    pactado por escrito antes de pasarlo, y dejar claro lo que NO hacemos: no
 *    negociamos precio, no cobramos ni pagamos por cuenta de nadie, no emitimos
 *    liquidaciones ni DT-e, no garantizamos el pago.
 *  · Ley 25.326 art. 27 / Disp. 4/2009: aviso de comunicación comercial y baja visible.
 *
 * El monto sigue siendo el que definió José (1% del bruto, solo si la operación se
 * concreta): lo que cambia es QUÉ se cobra y lo que se aclara, no cuánto.
 */
import { COMISION_PCT, referencia, type DatosHacienda, type Lado } from './reglas'
import { resumenHacienda, type Correo } from './mensajes'
import { PIE_COMERCIAL } from './mensajes-tipos'

const FIRMA = ['', 'Saludos,', 'Equipo de consignatarias.com', 'www.consignatarias.com.ar'].join('\n')

/** Lo que el servicio NO es. Va en toda oferta con este encuadre. */
/**
 * Cómo se cobra el servicio de contacto de hacienda. `exito` (lo que sale hoy): 1% del
 * bruto si la operación se concreta. `tarifa`: un monto fijo por contacto entregado,
 * sin condición de éxito — la salida que recomienda la investigación del 22-10-2026
 * (un % a éxito se parece a un corretaje, y sin matrícula puede no ser cobrable).
 * Se cambia con `AGENTE_COBRO_HACIENDA=tarifa` en Vercel: lo decide José.
 */
export type ModoCobro = 'exito' | 'tarifa'
export const MODO_COBRO_HACIENDA: ModoCobro = (process.env.AGENTE_COBRO_HACIENDA ?? '').toLowerCase() === 'tarifa' ? 'tarifa' : 'exito'
/**
 * Tarifa por contacto, + IVA. ESTIMADO: anclado al abono PRO Consignataria
 * (ARS 45.000/mes) — un contacto calificado vale para la firma lo que un mes de leads.
 * Se puede pisar con `AGENTE_TARIFA_CONTACTO_ARS`.
 */
export const TARIFA_CONTACTO_ARS = Number(process.env.AGENTE_TARIFA_CONTACTO_ARS) > 0 ? Math.round(Number(process.env.AGENTE_TARIFA_CONTACTO_ARS)) : 45_000

export const LO_QUE_NO_HACEMOS = [
  // "mandataria" y no "intermediaria": poner en contacto ES intermediar; lo que no
  // hacemos es actuar por cuenta de nadie (CCyC art. 1335; investigación del 22-10).
  'consignatarias.com no es consignataria ni mandataria en la operación: no negociamos el precio,',
  'no cobramos ni pagamos por cuenta de nadie, no emitimos liquidaciones ni DT-e y no garantizamos el pago.',
  'Precio, plazo, flete y documentación los acuerdan las partes directamente.',
].join(' ')

/** Lo que conviene que la contraparte verifique antes de operar (inscripción y sanidad). */
export const VERIFICAR = 'Antes de operar, verifiquen entre ustedes la inscripción vigente en el SIOCAL y el RENSPA del establecimiento.'

function detalleCorto(d: DatosHacienda): string {
  return [
    d.cabezas ? `· Cabezas: ${d.cabezas.toLocaleString('es-AR')}` : null,
    d.categoria ? `· Categoría: ${d.categoria}` : null,
    d.peso_kg ? `· Peso aproximado: ${d.peso_kg} kg` : null,
    d.zona || d.provincia ? `· Zona: ${[d.zona, d.provincia].filter(Boolean).join(', ')}` : null,
    d.disponible ? `· Disponible: ${d.disponible}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

/** La oferta que sale hoy a contrapartes. Un solo lugar: el motor y el tablero leen esto. */
export const ofertaHacienda = (o: Parameters<typeof ofertaServicioContacto>[0]) => ofertaServicioContacto(o)

export function textoCobro(modo: ModoCobro, tarifaArs = TARIFA_CONTACTO_ARS): string {
  return modo === 'tarifa'
    ? `Aceptar es contratar nuestro servicio de contacto: cuesta $${tarifaArs.toLocaleString('es-AR')} + IVA por contacto entregado, a cargo de ustedes, y lo facturamos al pasarlo. No depende de que la operación se concrete ni de su monto.`
    : `Aceptar es contratar nuestro servicio de contacto: si la operación se concreta, el servicio cuesta el ${COMISION_PCT}% del bruto, a cargo de ustedes, y lo facturamos. Si no se concreta, no hay ningún cargo.`
}

/** Lo mismo en una línea, para el recordatorio. */
export function cobroCorto(modo: ModoCobro = MODO_COBRO_HACIENDA, tarifaArs = TARIFA_CONTACTO_ARS): string {
  return modo === 'tarifa'
    ? `servicio de contacto: $${tarifaArs.toLocaleString('es-AR')} + IVA por contacto entregado`
    : `servicio de contacto: ${COMISION_PCT}% del bruto solo si la operación se concreta`
}

export function ofertaServicioContacto(o: { leadId: number; ofertaId: number; lado: Lado; datos: DatosHacienda; contraparte: string; modo?: ModoCobro }): Correo {
  const vende = o.lado === 'vende'
  const otro = vende ? 'productor' : 'comprador'
  return {
    asunto: `${vende ? 'Hacienda disponible' : 'Comprador buscando'}: ${resumenHacienda(o.datos)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      'Buenas,',
      '',
      // A otro lead se le habla de "ustedes"; a una firma o planta, por su nombre.
      o.contraparte === 'ustedes'
        ? vende
          ? 'Les escribimos desde consignatarias.com. Un productor publicó con nosotros hacienda que coincide con lo que ustedes buscan:'
          : 'Les escribimos desde consignatarias.com. Un comprador publicó con nosotros un pedido de hacienda como la que ustedes ofrecen:'
        : vende
          ? `Les escribimos desde consignatarias.com. Un productor publicó con nosotros hacienda que puede interesarle a ${o.contraparte}:`
          : `Les escribimos desde consignatarias.com. Un comprador publicó con nosotros un pedido que ${o.contraparte} puede cubrir:`,
      '',
      detalleCorto(o.datos),
      '',
      `Si quieren el contacto directo del ${otro}, respondan ACEPTO. ${textoCobro(o.modo ?? MODO_COBRO_HACIENDA)}`,
      '',
      LO_QUE_NO_HACEMOS,
      VERIFICAR,
      FIRMA,
      PIE_COMERCIAL,
    ].join('\n'),
  }
}
