import LeadCapture from './LeadCapture'

/**
 * FrigorificoLeadCapture — captura de VENTA de hacienda a faena (venta directa a
 * frigorífico). Responde a la demanda real que llega a agro@ buscando "data de
 * frigoríficos": productores que quieren venderle a una planta y no saben a cuál
 * ni cómo contactarla. Lo estructuramos como lead y lo conectamos (comisión).
 * Si viene `frigorificoName`, la copy apunta a esa planta (perfil individual).
 */
export default function FrigorificoLeadCapture({
  source,
  frigorificoName,
}: {
  source: string
  frigorificoName?: string
}) {
  return (
    <LeadCapture
      source={source}
      variant="section"
      emoji="🥩"
      defaultIntent="vender"
      intents={[{ value: 'vender', label: 'Vender hacienda para faena' }]}
      askCategory
      quantityField="headCount"
      quantityLabel="Cabezas"
      askPrice
      priceLabel="A cuánto querés venderla ($/kg)"
      pricePlaceholder="Ej: 4500"
      badge="Venta a frigorífico"
      title={frigorificoName ? `¿Querés venderle a ${frigorificoName}?` : 'Vendé tu hacienda a un frigorífico'}
      subtitle={
        frigorificoName
          ? `Decinos qué tenés y a cuánto la querés vender. Te ponemos en contacto con ${frigorificoName} — o con el frigorífico que mejor pague tu categoría.`
          : 'Decinos qué categoría y cuántas cabezas tenés, y a cuánto querés vender. Te conseguimos el frigorífico que mejor paga y te ponemos en contacto.'
      }
      submitLabel="Conseguime el frigorífico →"
    />
  )
}
