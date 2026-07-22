import LeadCapture from './LeadCapture'

/**
 * CompraLeadCapture — sección de captura del lado COMPRADOR (feedlots, invernadores,
 * frigoríficos). Alimenta la otra punta del board de matching: sin compradores no
 * hay cruce. Se monta donde vive la demanda (p.ej. la página del spread maíz/novillo,
 * territorio de feedlots).
 */
export default function CompraLeadCapture({
  source,
  title = '¿Comprás hacienda? Te la conseguimos',
  subtitle = 'Decinos qué categoría, cuántas cabezas y hasta cuánto pagás. Te buscamos la hacienda que entre en ese número.',
}: {
  source: string
  title?: string
  subtitle?: string
}) {
  return (
    <LeadCapture
      source={source}
      variant="section"
      emoji="🛒"
      defaultIntent="comprar"
      intents={[
        { value: 'comprar', label: 'Comprar hacienda' },
        { value: 'vender', label: 'Vender hacienda' },
      ]}
      askCategory
      quantityField="headCount"
      quantityLabel="Cabezas"
      askPrice
      priceLabel="Hasta cuánto pagás ($/kg)"
      pricePlaceholder="Ej: 4200"
      badge="Poné tu precio"
      title={title}
      subtitle={subtitle}
      submitLabel="Buscame la hacienda →"
    />
  )
}
