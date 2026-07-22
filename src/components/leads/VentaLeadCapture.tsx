import LeadCapture from './LeadCapture'

/**
 * VentaLeadCapture — sección de captura de VENTA de hacienda (negocio comisionista).
 * Centraliza la config/copy para reusar en las páginas de mercado de alta intención
 * (INMAG, categorías, ¿vendo ahora?). Si `presetCategory` viene, oculta el selector
 * de categoría (la página ya la sabe).
 */
export default function VentaLeadCapture({
  source,
  presetCategory,
}: {
  source: string
  presetCategory?: string
}) {
  return (
    <LeadCapture
      source={source}
      variant="section"
      emoji="🐂"
      defaultIntent="vender"
      intents={[
        { value: 'vender', label: 'Vender hacienda' },
        { value: 'comprar', label: 'Comprar hacienda' },
      ]}
      askCategory={!presetCategory}
      presetCategory={presetCategory}
      quantityField="headCount"
      quantityLabel="Cabezas"
      askPrice
      priceLabel="A cuánto querés venderla ($/kg)"
      pricePlaceholder="Ej: 4500"
      badge="Poné tu precio"
      title="Vendé tu hacienda al precio que buscás"
      subtitle="Decinos qué tenés y a cuánto la querés vender. Te conseguimos el comprador que pague eso — sin depender de una sola punta."
      submitLabel="Buscame comprador →"
    />
  )
}
