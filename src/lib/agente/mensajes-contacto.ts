/**
 * BORRADOR — oferta de hacienda con el encuadre "servicio de contacto" (21-10-2026).
 *
 * NO lo usa el motor. Existe para que José lo compare con `oferta()` de
 * `mensajes.ts` (la que sale hoy) y decida, idealmente con un abogado.
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
export const LO_QUE_NO_HACEMOS = [
  'consignatarias.com no es consignataria ni intermediaria en la operación: no negociamos el precio,',
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

export function ofertaServicioContacto(o: { leadId: number; ofertaId: number; lado: Lado; datos: DatosHacienda; contraparte: string }): Correo {
  const vende = o.lado === 'vende'
  const otro = vende ? 'productor' : 'comprador'
  return {
    asunto: `${vende ? 'Hacienda disponible' : 'Comprador buscando'}: ${resumenHacienda(o.datos)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      'Buenas,',
      '',
      vende
        ? `Les escribimos desde consignatarias.com. Un productor publicó con nosotros hacienda que puede interesarle a ${o.contraparte}:`
        : `Les escribimos desde consignatarias.com. Un comprador publicó con nosotros un pedido que ${o.contraparte} puede cubrir:`,
      '',
      detalleCorto(o.datos),
      '',
      `Si quieren el contacto directo del ${otro}, respondan ACEPTO. Aceptar es contratar nuestro servicio de contacto: si la operación se concreta, el servicio cuesta el ${COMISION_PCT}% del bruto, a cargo de ustedes, y lo facturamos. Si no se concreta, no hay ningún cargo.`,
      '',
      LO_QUE_NO_HACEMOS,
      VERIFICAR,
      FIRMA,
      PIE_COMERCIAL,
    ].join('\n'),
  }
}
