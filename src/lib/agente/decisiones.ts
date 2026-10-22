/**
 * Lo que el agente no puede resolver porque es decisión de José: la lista que
 * abre /admin/agente. Se arma desde el código (TIPOS, interruptores) para que no
 * quede desactualizada: cuando una decisión se toma y se refleja en el código,
 * desaparece sola de la lista.
 */
import { TIPOS, tieneComision, type TipoOperacion } from './tipos'

export type Gravedad = 'legal' | 'plata' | 'producto'

export interface Decision {
  id: string
  gravedad: Gravedad
  titulo: string
  detalle: string
  /** Dónde está la evidencia o el borrador. */
  ref: string
}

export interface Estado {
  /** `AGENTE_TIPOS` está en 'on'. */
  tiposActivos: boolean
  /** La oferta de hacienda que sale hoy incluye el precio pedido por el productor. */
  ofertaMuestraPrecioPedido: boolean
  /** La oferta a contrapartes lleva el aviso de comunicación comercial. */
  ofertaConPieComercial: boolean
  /** Encuadre actual del cobro de hacienda. */
  encuadreHacienda: 'comision' | 'servicio_contacto'
  /** Pedidos del MCP / demandas de compra en needs_review esperando que alguien verifique el contacto. */
  pendientesVerificacion?: number
}

export function decisionesPendientes(e: Estado): Decision[] {
  const d: Decision[] = []

  if (e.encuadreHacienda === 'comision') {
    d.push({
      id: 'siocal',
      gravedad: 'legal',
      titulo: 'Hacienda: el 1% como "comisión" sin inscripción en el SIOCAL',
      detalle:
        'Intervenir en el comercio de hacienda exige SIOCAL (Res. SAGyP 50/2025, Res. 103/2026). Una comisión sin inscripción puede no ser cobrable. Hay un borrador con el encuadre "servicio de contacto". Conviene validarlo con un abogado.',
      ref: 'docs/agente/investigacion-comisionista-hacienda.md · src/lib/agente/mensajes-contacto.ts',
    })
  }

  else {
    d.push({
      id: 'siocal-abogado',
      gravedad: 'legal',
      titulo: 'Hacienda: el encuadre "servicio de contacto" está aplicado, falta validarlo con un abogado',
      detalle:
        'Desde v1.244.0 la oferta cobra el servicio de contacto (1% si se concreta), aclara que no intermediamos ni garantizamos el pago y pide verificar SIOCAL/RENSPA. Sigue sin inscripción propia en el SIOCAL: que un abogado confirme el encuadre.',
      ref: 'docs/agente/investigacion-comisionista-hacienda.md · src/lib/agente/mensajes-contacto.ts',
    })
  }

  for (const t of Object.keys(TIPOS) as TipoOperacion[]) {
    const c = TIPOS[t]
    if (c.bloqueoLegal) {
      d.push({ id: `bloqueo-${t}`, gravedad: 'legal', titulo: `${c.label}: no sale a contrapartes`, detalle: c.bloqueoLegal, ref: 'docs/agente/investigacion-inmobiliaria-rural.md' })
    } else if (!tieneComision(t) && c.contrapartes.length > 0) {
      d.push({ id: `comision-${t}`, gravedad: 'plata', titulo: `${c.label}: comisión sin definir`, detalle: `Base posible: ${c.baseComision}.`, ref: 'src/lib/agente/tipos.ts' })
    }
  }

  if (TIPOS.arrendamiento.bloqueoLegal) {
    d.push({
      id: 'arrendamiento-quien-paga',
      gravedad: 'plata',
      titulo: 'Arrendamiento: quién paga los 0,8 meses y el tope por provincia',
      detalle:
        'En un contrato de 1 año, 0,8 meses equivale a ~6,7% del contrato: pasa el máximo bonaerense (4% entre las partes) y el 5% de Córdoba. Si sigue, calcularlo sobre el total del contrato con el tope de cada provincia.',
      ref: 'docs/agente/investigacion-inmobiliaria-rural.md',
    })
  }

  if (e.ofertaMuestraPrecioPedido) {
    d.push({
      id: 'precio-pedido',
      gravedad: 'plata',
      titulo: 'La oferta le muestra a la contraparte el precio pedido por el productor',
      detalle: 'Es su piso, y la contraparte lo ve antes de negociar. La regla de /lotes es no publicarlo nunca. Sacarlo es una línea en mensajes.ts.',
      ref: 'src/lib/agente/mensajes.ts → detalle()',
    })
  }

  if (!e.ofertaConPieComercial) {
    d.push({
      id: 'pie-comercial',
      gravedad: 'legal',
      titulo: 'A la oferta le falta el aviso de comunicación comercial',
      detalle: 'Ley 25.326 art. 27 y Disp. 4/2009: correo no pedido, con baja visible y aviso de que es comercial. La BAJA ya está; falta el aviso.',
      ref: 'src/lib/agente/mensajes-tipos.ts → conPieComercial()',
    })
  }

  if (!e.tiposActivos) {
    d.push({
      id: 'agente-tipos',
      gravedad: 'producto',
      titulo: 'Leads de campo y tasación: el agente está listo pero apagado',
      detalle: 'Con AGENTE_TIPOS=on les escribe solo a quienes consultaron (datos o calificación) y pasa el caso a José. Nunca escribe a contrapartes.',
      ref: 'src/lib/agente/campos-agente.ts',
    })
  }

  if (e.pendientesVerificacion) {
    const n = e.pendientesVerificacion
    d.push({
      id: 'verificar-contactos',
      gravedad: 'plata',
      titulo: `${n} ${n === 1 ? 'pedido espera' : 'pedidos esperan'} que verifiques el contacto`,
      detalle:
        'Los cargó un agente externo (MCP) o entraron como demanda de compra: el mail puede no ser de quien dice. El agente no les escribe hasta que en /admin/leads marques "Contacto verificado → al agente", o los descartes.',
      ref: '/admin/leads (pestaña Sin trabajar, estado A revisar)',
    })
  }

  const orden: Record<Gravedad, number> = { legal: 0, plata: 1, producto: 2 }
  return d.sort((a, b) => orden[a.gravedad] - orden[b.gravedad])
}

/**
 * El estado real, leído del código que corre: se arma una oferta de prueba y se
 * mira qué dice. Cuando alguien cambia la plantilla, la decisión sale sola.
 */
export function estadoActual(o: {
  tiposActivos: boolean
  ofertaDePrueba: (d: { precio_pedido_kg: number }) => string
  pendientesVerificacion?: number
}): Estado {
  const texto = o.ofertaDePrueba({ precio_pedido_kg: 9_876 })
  return {
    tiposActivos: o.tiposActivos,
    ofertaMuestraPrecioPedido: /9\.?876/.test(texto),
    ofertaConPieComercial: /comunicaci[oó]n comercial/i.test(texto),
    // El motor usa `M.oferta` (encuadre comisión); el borrador `ofertaServicioContacto` no está conectado.
    encuadreHacienda: /servicio de contacto/i.test(texto) ? 'servicio_contacto' : 'comision',
    pendientesVerificacion: o.pendientesVerificacion ?? 0,
  }
}
