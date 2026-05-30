import { Metadata } from 'next'
import { Suspense } from 'react'
import PlanesTracker from './PlanesTracker'
import MobileStickyCTA from './MobileStickyCTA'
import PlatformStats from './PlatformStats'
import SocialProofToast from './SocialProofToast'
import PlanesToggle from './PlanesToggle'
import { SaaSPricingSchema, FAQPageSchema, SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

// Pricing data for schema (all visible tiers across audiences)
const PRICING_PLANS = [
  {
    name: 'Gratuito',
    description: 'Acceso básico al observatorio del mercado bovino argentino y al directorio de consignatarias.',
    price: 0,
    features: ['Calendario unificado de remates', 'Directorio de consignatarias y frigoríficos', 'INMAG diario'],
  },
  {
    name: 'PRO Usuario',
    description: 'Las herramientas de decisión del que vende hacienda: cuánto te queda neto, cuándo conviene vender y a quién. Para productores, asesores, contadores y brokers.',
    price: 7900,
    priceCurrency: 'ARS',
    features: [
      'Calculadora neto en mano: comisión, gastos y flete descontados del bruto',
      'Calculadora «¿Vendo ahora?» con percentiles de 30 y 365 días',
      'Comparador con medios de pago y días de cobro de cada consignataria',
      'Histórico INMAG completo 2015→ con descarga en CSV',
      'Estacionalidad: la década completa mes × año (z-score)',
      'Filtros avanzados de remates (rango de fechas, cabezas mínimas)',
      'Descargas El Corredor + El Oráculo',
    ],
  },
  {
    name: 'PRO Consignataria',
    description: 'Promoción de cada remate por email a +500 productores. Badge PRO, analytics y herramientas para consignatarias y frigoríficos.',
    price: 45000,
    priceCurrency: 'ARS',
    features: ['Promoción de remates por email', 'Perfil verificado y destacado', 'Analytics de perfil', 'Remates con badge PRO', 'Landing personalizada', 'QR para catálogos', 'Calendario sincronizable'],
  },
  {
    name: 'Enterprise · Starter',
    description: 'API completa para apps en desarrollo. 1.000 req/mes.',
    price: 99,
    priceCurrency: 'USD',
    features: ['API key dedicada', 'Endpoints INMAG, categorías, USD, remates, directorios', 'Histórico completo', '1 webhook'],
  },
  {
    name: 'Enterprise · Growth',
    description: 'API + webhooks + reportes semanales + dashboards. 50K req/mes.',
    price: 500,
    priceCurrency: 'USD',
    features: ['Todo lo de Starter', 'Webhooks ilimitados', 'Exports CSV/JSON', 'Reporte semanal PDF+JSON', 'Dashboards personalizados', 'Alertas configurables', 'Analyst access'],
  },
  {
    name: 'Enterprise · Scale',
    description: 'Apps de alto volumen. Pricing por requests, 100K → 5M req/mes.',
    price: 700,
    priceCurrency: 'USD',
    features: ['Todo lo de Growth', 'Volume pricing', 'Multi-usuario con roles', 'Integración ERP/BI', 'White-label opcional', 'CSM desde 500K req/mes'],
  },
]

const FAQ_ITEMS = [
  {
    question: '¿Cuál es la diferencia entre PRO Usuario y PRO Consignataria?',
    answer:
      'PRO Usuario es para productores, asesores y contadores que quieren acceso ilimitado al observatorio (filtros, detalle de perfiles, descargas, archivo histórico). PRO Consignataria es para consignatarias y frigoríficos que quieren aparecer destacados en el directorio (badge dorado, promoción de remates por email, analytics). Son productos distintos con precios distintos — usá el toggle arriba para ver el que te corresponde.',
  },
  {
    question: '¿Cómo funciona el pago?',
    answer:
      'Procesamos pagos con tarjeta de crédito y débito a través de Rebill, plataforma certificada para Argentina y Latinoamérica. La suscripción se renueva automáticamente cada mes. Enterprise se factura en USD vía transferencia, USDT o factura ARS al MEP.',
  },
  {
    question: '¿Puedo cancelar en cualquier momento?',
    answer:
      'Sí, podés cancelar desde tu dashboard cuando quieras. El acceso PRO continúa hasta el final del período facturado.',
  },
  {
    question: '¿Cuánto tarda en activarse?',
    answer:
      'Inmediato. Una vez confirmado el pago, el plan se activa automáticamente.',
  },
]

export const metadata: Metadata = {
  title: 'Planes y Precios',
  description:
    'Planes para productores, consignatarias y empresas. PRO Usuario ARS $7.900/mes, PRO Consignataria ARS $45.000/mes, Enterprise desde USD 99/mes.',
  openGraph: {
    title: 'Planes y Precios',
    description:
      'Tres audiencias, tres planes. Productores, consignatarias y empresas con API.',
    url: 'https://www.consignatarias.com.ar/planes',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/planes',
  },
}

export default function PlanesPage() {
  return (
    <>
      <PlanesTracker />
      <SaaSPricingSchema plans={PRICING_PLANS} />
      <FAQPageSchema items={FAQ_ITEMS} />
      <SectionBreadcrumbSchema section="planes" sectionName="Planes y Precios" />

      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-heading text-zinc-100 mb-2">
            Planes y Precios
          </h1>
          <p className="text-zinc-400 text-sm max-w-2xl">
            Tres audiencias, tres precios. Elegí el toggle según seas
            productor/asesor o consignataria/frigorífico. Enterprise (API +
            datos para empresas) está disponible para ambos.
          </p>

          <PlatformStats />
        </div>

        {/* Toggle + cards + audience-specific extras */}
        <Suspense fallback={<div className="h-[400px]" aria-hidden />}>
          <PlanesToggle />
        </Suspense>

        {/* Trust badges — universales */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 text-zinc-500 text-data">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Pago seguro vía Rebill</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-data">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>SSL encriptado</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-data">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Cancelás cuando quieras</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-data">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Tarjeta crédito/débito</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 terminal-panel">
          <div className="terminal-panel-header">Preguntas frecuentes</div>
          <div className="px-panel py-4 space-y-4 text-data">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={item.question}
                className={i === 0 ? '' : 'border-t border-terminal-border pt-4'}
              >
                <p className="text-zinc-300 mb-1">{item.question}</p>
                <p className="text-zinc-500 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom spacer for mobile sticky CTA */}
        <div className="h-20 md:hidden" />
      </div>

      <Suspense fallback={null}>
        <MobileStickyCTA />
      </Suspense>
      <SocialProofToast />
    </>
  )
}
