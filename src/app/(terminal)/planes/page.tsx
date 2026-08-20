import Link from 'next/link'
import { getGuiaPremium, formatArs } from '@/lib/guias-premium'
import { Metadata } from 'next'
import { Suspense } from 'react'
import PlanesTracker from './PlanesTracker'
import PlatformStats from './PlatformStats'
import SocialProofToast from './SocialProofToast'
import PlanesToggle from './PlanesToggle'
import { SaaSPricingSchema, FAQPageSchema, SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

// Pricing data for schema. Todo en ARS (Rebill factura en ARS) — antes estaba en USD
// stale y SaaSPricingSchema lee `currency` (no `priceCurrency`), así que renderizaba
// los números USD etiquetados como ARS (ej. "ARS 49"). Ahora refleja los precios reales
// visibles en PlanesToggle (Starter 74.000 / Growth 451.000 / Scale a medida / PRO 45.000).
const PRICING_PLANS = [
  {
    name: 'Productor (gratis)',
    description: 'Observatorio completo del mercado bovino argentino, sin costo: precios, remates, directorio, calculadoras y alertas.',
    price: 0,
    currency: 'ARS',
    features: ['INMAG diario y precios por categoría', 'Calendario unificado de remates', 'Directorio de consignatarias y frigoríficos', 'Calculadoras (neto en mano, ¿vendo ahora?)', 'Alertas de precio por email'],
  },
  {
    name: 'API Starter',
    description: 'API/MCP del mercado ganadero argentino para devs, analistas y firmas. 10.000 req/mes.',
    price: 74000,
    currency: 'ARS',
    features: ['10.000 requests/mes', 'Endpoints INMAG, categorías, USD, remates, directorios', 'Acceso MCP (tools de lectura)', 'Histórico completo', '1 webhook'],
  },
  {
    name: 'API Growth',
    description: 'API + webhooks + alertas + reportes para agtech, medios agro y fondos. 100.000 req/mes.',
    price: 451000,
    currency: 'ARS',
    features: ['100.000 requests/mes', 'Webhooks ilimitados + alertas de precio (MCP write)', 'Exports CSV/JSON', 'Reporte semanal PDF+JSON', 'Soporte prioritario'],
  },
  {
    name: 'API Scale',
    description: 'Alto volumen + SLA para bancos, agtech grande y exchanges. A medida (cotización, desde el nivel Growth).',
    price: 451000,
    currency: 'ARS',
    custom: true,
    features: ['Volumen alto (500K → 5M req)', 'SLA + uptime garantizado', 'Multi-usuario con roles', 'Integración ERP/BI', 'White-label opcional'],
  },
  {
    name: 'Consignataria (alcance)',
    description: 'Promoción de remates a la base de productores + perfil verificado y destacado. Facturación mensual en ARS.',
    price: 45000,
    currency: 'ARS',
    features: ['Promoción de remates por email', 'Módulo de pre-oferta: lotes con video + captura de leads', 'Perfil verificado y destacado', 'Analytics de perfil', 'Landing propia + QR'],
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
      'Los planes de API y de alcance se facturan en ARS vía Rebill, con renovación mensual y 15% off en pago anual. El productor no paga nada.',
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

const GUIA = getGuiaPremium('abrir-una-consignataria')!

export const metadata: Metadata = {
  title: 'Planes y Precios',
  description:
    'El observatorio es gratis para el productor. La API/MCP del mercado ganadero argentino desde ARS 74.000/mes, para apps, agentes IA, agtech y análisis.',
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    title: 'Planes y Precios',
    description:
      'Productor gratis. La API/MCP del ganado argentino desde ARS 74.000/mes para apps y agentes.',
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
            Todo el mercado ganadero es <strong className="text-zinc-200">gratis</strong> para el productor:
            precios, remates, directorio y alertas. Se paga por tres cosas: las{' '}
            <strong className="text-amber-300">consignatarias</strong> que quieren que más productores vean
            sus remates, las <strong className="text-zinc-200">empresas o IAs</strong> que usan nuestros
            datos por API, y la <strong className="text-accent">guía</strong> para abrir y dirigir una
            consignataria, que es una compra única y no una suscripción.
          </p>

          {/* Por qué pagar — por segmento */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
            <div className="rounded-lg border border-terminal-border bg-terminal-panel p-3">
              <p className="text-xxs font-terminal uppercase tracking-widest text-accent mb-1">Productor · gratis</p>
              <p className="text-data text-zinc-400">Datos, remates, directorio y alertas. No pagás nada.</p>
            </div>
            <div className="rounded-lg border border-terminal-border bg-terminal-panel p-3">
              <p className="text-xxs font-terminal uppercase tracking-widest text-amber-300 mb-1">Consignataria</p>
              <p className="text-data text-zinc-400">Que más productores vean tus remates: se lo avisamos a toda la base + tu perfil destacado.</p>
            </div>
            <div className="rounded-lg border border-terminal-border bg-terminal-panel p-3">
              <p className="text-xxs font-terminal uppercase tracking-widest text-sky-300 mb-1">Empresa · IA</p>
              <p className="text-data text-zinc-400">La data por API + MCP para tus apps y agentes.</p>
            </div>
            <div className="rounded-lg border border-terminal-border bg-terminal-panel p-3">
              <p className="text-xxs font-terminal uppercase tracking-widest text-accent mb-1">Guía · pago único</p>
              <p className="text-data text-zinc-400">Cómo abrir y dirigir una consignataria. Se compra una vez, no vence.</p>
            </div>
          </div>

          <PlatformStats />
        </div>

        {/* Toggle + cards + audience-specific extras */}
        <Suspense fallback={<div className="h-[400px]" aria-hidden />}>
          <PlanesToggle />
        </Suspense>

        {/* La guía. Va DESPUÉS de los planes y visualmente separada: es otro tipo de
            compra —una sola vez, sin cuenta, sin renovación— y mezclarla con las
            suscripciones haría que el lector la evalúe con la vara equivocada. */}
        <section className="mt-8 terminal-panel border-accent/40">
          <div className="terminal-panel-header text-accent flex items-center justify-between">
            <span>Compra única · no es una suscripción</span>
            <span className="text-zinc-500">{formatArs(GUIA.priceArs)}</span>
          </div>
          <div className="px-panel py-5 grid md:grid-cols-[1fr_auto] gap-5 items-center">
            <div>
              <h2 className="text-zinc-100 text-base font-heading mb-1">{GUIA.title}</h2>
              <p className="text-zinc-400 text-data leading-relaxed mb-3">
                {GUIA.pages} páginas en siete partes: matrícula de martillero, SIOCAL, ARCA,
                SENASA, el riesgo de cobranza con los artículos del Código y seis defaults
                reales, la liquidación con los códigos que define ARCA, los números del
                negocio y el plan de marketing. Más un módulo de posicionamiento para la
                firma que ya opera.
              </p>
              <p className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider">
                Edición {GUIA.edicion} · actualizada al {GUIA.updatedAt} · factura A a pedido
              </p>
            </div>
            <Link
              href={`${GUIA.landing}?ref=planes`}
              className="shrink-0 bg-accent text-zinc-950 font-semibold text-sm rounded px-5 py-3 hover:brightness-110 text-center"
            >
              Ver la guía
            </Link>
          </div>
        </section>

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

      </div>

      <SocialProofToast />
    </>
  )
}
