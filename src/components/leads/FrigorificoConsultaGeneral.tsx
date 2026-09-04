import LeadCapture from './LeadCapture'

/**
 * FrigorificoConsultaGeneral — reemplaza el fallback `mailto:agro@memola.com.ar`
 * crudo del bloque "CONSULTAR ESTE FRIGORIFICO" (visible cuando el perfil no
 * tiene contacto propio ni está verificado). Ese mailto no queda registrado en
 * ningún lado y ya generó consultas de negocio reales perdidas (Yamila Gómez,
 * maquila para Frigorífico VISIÓN, 2-sep-2026) o mal dirigidas (CVs, 14-ago-2026).
 * Usa el mismo pipeline que `FrigorificoLeadCapture` (POST /api/producer-leads,
 * re-ruteo automático a la planta si `source` empieza con `frigorifico:`, alerta
 * a José) pero con `intent=comprar` en vez de `vender`, para la consulta que NO
 * es venta de hacienda a faena (compra de productos, consulta comercial general).
 */
export default function FrigorificoConsultaGeneral({
  source,
  frigorificoName,
  province,
}: {
  source: string
  frigorificoName?: string
  province?: string
}) {
  return (
    <LeadCapture
      source={source}
      variant="card"
      emoji="✉️"
      defaultIntent="comprar"
      intents={[{ value: 'comprar', label: 'Comprar productos / consulta comercial' }]}
      presetProvince={province}
      badge="Consulta general"
      title={frigorificoName ? `¿Necesitás contactar a ${frigorificoName}?` : 'Consultar este frigorífico'}
      subtitle="Dejá tu consulta comercial y te conectamos. No es para búsqueda laboral ni envío de CV — esas consultas no las gestionamos."
      submitLabel="Enviar consulta →"
      ctaLabel="Enviar consulta →"
    />
  )
}
