import { Metadata } from 'next'
import { Suspense } from 'react'
import PlanesTracker from './PlanesTracker'
import MobileStickyCTA from './MobileStickyCTA'
import PlatformStats from './PlatformStats'
import SocialProofToast from './SocialProofToast'
import PlanesToggle from './PlanesToggle'
import { SaaSPricingSchema, FAQPageSchema, SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

// Pricing data for schema (modelo API-first, todo en USD).
const PRICING_PLANS = [
  {
    name: 'Productor (gratis)',
    description: 'Observatorio completo del mercado bovino argentino, sin costo: precios, remates, directorio, calculadoras y alertas.',
    price: 0,
    features: ['INMAG diario y precios por categoría', 'Calendario unificado de remates', 'Directorio de consignatarias y frigoríficos', 'Calculadoras (neto en mano, ¿vendo ahora?)', 'Alertas de precio por email'],
  },
  {
    name: 'API Starter',
    description: 'API/MCP del mercado ganadero argentino para devs, analistas y firmas. 10.000 req/mes.',
    price: 49,
    priceCurrency: 'USD',
    features: ['10.000 requests/mes', 'Endpoints INMAG, categorías, USD, remates, directorios', 'Acceso MCP (tools de lectura)', 'Histórico completo', '1 webhook'],
  },
  {
    name: 'API Growth',
    description: 'API + webhooks + alertas + reportes para agtech, medios agro y fondos. 100.000 req/mes.',
    price: 299,
    priceCurrency: 'USD',
    features: ['100.000 requests/mes', 'Webhooks ilimitados + alertas de precio (MCP write)', 'Exports CSV/JSON', 'Reporte semanal PDF+JSON', 'Soporte prioritario'],
  },
  {
    name: 'API Scale',
    description: 'Alto volumen + SLA para bancos, agtech grande y exchanges. A medida.',
    price: 999,
    priceCurrency: 'USD',
    features: ['Volumen alto (500K → 5M req)', 'SLA + uptime garantizado', 'Multi-usuario con roles', 'Integración ERP/BI', 'White-label opcional'],
  },
  {
    name: 'Consignataria (alcance)',
    description: 'Promoción de remates a la base de productores + perfil destacado. Prueba gratis.',
    price: 39,
    priceCurrency: 'USD',
    features: ['Promoción de remates por email', 'Perfil verificado y destacado', 'Analytics de perfil', 'Landing propia + QR'],
  },
]

const FAQ_ITEMS = [
  {
    question: '¿Qué es gratis y qué se paga?',
    answer:
      'El observatorio del productor es 100% gratis: precios INMAG, remates, directorio, calculadoras y alertas por email. Se paga solo el acceso programático a los datos (API + MCP) para apps, agentes IA, agtech, frigoríficos, traders, fondos y bancos; y opcionalmente el plan de alcance para consignatarias que quieren promocionar sus remates.',
  },
  {
    question: '¿Cómo funciona el pago?',
    answer:
      'Los planes de API y de alcance se facturan en USD (transferencia, USDT o factura ARS al MEP), con renovación mensual y 15% off en pago anual. El productor no paga nada.',
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
    'El observatorio es gratis para el productor. La API/MCP del mercado ganadero argentino desde USD 49/mes, para apps, agentes IA, agtech y análisis.',
  openGraph: {
    title: 'Planes y Precios',
    description:
      'Productor gratis. La API/MCP del ganado argentino desde USD 49/mes para apps y agentes.',
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
            El observatorio del mercado ganadero es <strong className="text-zinc-200">gratis</strong> para
            el productor: precios INMAG, remates, directorio y alertas. Se paga por dos cosas concretas:
            <strong className="text-zinc-200"> alcance</strong> (consignatarias que promocionan sus remates a
            productores) y <strong className="text-zinc-200"> la data por programa</strong> (empresas y agentes
            IA que la consumen vía API + MCP).
          </p>

          {/* Por qué pagar — por segmento */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
            <div className="rounded-lg border border-terminal-border bg-terminal-panel p-3">
              <p className="text-xxs font-terminal uppercase tracking-widest text-emerald-400 mb-1">Productor · gratis</p>
              <p className="text-data text-zinc-400">Datos, remates, directorio y alertas. No pagás nada.</p>
            </div>
            <div className="rounded-lg border border-terminal-border bg-terminal-panel p-3">
              <p className="text-xxs font-terminal uppercase tracking-widest text-amber-300 mb-1">Consignataria</p>
              <p className="text-data text-zinc-400">Alcance: promocioná tus remates a productores + perfil destacado.</p>
            </div>
            <div className="rounded-lg border border-terminal-border bg-terminal-panel p-3">
              <p className="text-xxs font-terminal uppercase tracking-widest text-sky-300 mb-1">Empresa · IA</p>
              <p className="text-data text-zinc-400">La data por API + MCP para tus apps y agentes.</p>
            </div>
          </div>

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
