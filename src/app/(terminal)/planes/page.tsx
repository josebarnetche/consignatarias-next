import { Metadata } from 'next'
import PlanesTracker from './PlanesTracker'
import MobileStickyCTA from './MobileStickyCTA'
import PlatformStats from './PlatformStats'
import FreePlanStatus from './FreePlanStatus'
import ProPlanStatus from './ProPlanStatus'
import FounderSpotsRemaining from './FounderSpotsRemaining'
import SocialProofToast from './SocialProofToast'
import NewsletterPreview from '@/components/marketing/NewsletterPreview'
import { SaaSPricingSchema, FAQPageSchema, SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

// Pricing data for schema
const PRICING_PLANS = [
  {
    name: 'Gratuito',
    description: 'Presencia básica en el directorio de consignatarias argentinas.',
    price: 0,
    features: ['Perfil básico en el directorio', 'Calendario de remates', 'Datos de mercado limitados'],
  },
  {
    name: 'PRO',
    description: 'Promoción de cada remate por email a todos los suscriptores. Badge PRO, analytics y herramientas exclusivas.',
    price: 45000,
    features: ['Promoción de remates por email', 'Perfil verificado y destacado', 'Analytics de perfil', 'Remates con badge PRO', 'Landing personalizada', 'QR para catálogos', 'Calendario sincronizable'],
  },
  {
    name: 'Enterprise',
    description: 'Soluciones a medida para grandes operadores del mercado ganadero.',
    price: 0, // Contact for pricing
    features: ['Dashboard personalizado', 'API de datos de mercado', 'Integración personalizada', 'Soporte dedicado'],
  },
]

const FAQ_ITEMS = [
  {
    question: '¿Cómo funciona el pago?',
    answer: 'Procesamos pagos con tarjeta de crédito y débito a través de Rebill, plataforma certificada para pagos en Argentina y Latinoamérica. La suscripción se renueva automáticamente cada mes.',
  },
  {
    question: '¿Puedo cancelar en cualquier momento?',
    answer: 'Sí, podés cancelar tu suscripción en cualquier momento desde tu dashboard. El acceso PRO continúa hasta el final del período facturado.',
  },
  {
    question: '¿Qué incluye el perfil verificado?',
    answer: 'Tu perfil aparece con el badge PRO destacado en dorado, tus remates se muestran con tratamiento visual especial, y accedés a estadísticas de visitas a tu perfil.',
  },
  {
    question: '¿Vale la pena la inversión?',
    answer: 'Un solo comprador nuevo de tus remates te devuelve la inversión del año. Cada email llega a +500 productores activos buscando hacienda. El costo por contacto es menos de $90.',
  },
]

export const metadata: Metadata = {
  title: 'Planes y Precios | Consignatarias.com.ar',
  description:
    'Planes de suscripcion para consignatarias y frigorificos. Perfil verificado, badge PRO, analytics y mas.',
  openGraph: {
    title: 'Planes y Precios | Consignatarias.com.ar',
    description:
      'Destaca tu consignataria o frigorifico con un plan PRO. Perfil verificado, analytics y soporte prioritario.',
    url: 'https://www.consignatarias.com.ar/planes',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/planes',
  },
}

const FREE_FEATURES = [
  'Perfil basico en el directorio',
  'Calendario de remates',
  'Datos de mercado limitados',
]

const PRO_FEATURES = [
  'Promocion de remates por email a todos los suscriptores',
  'Perfil verificado y destacado',
  'Analytics de perfil (vistas)',
  'Remates con badge PRO',
  'Logo y descripcion personalizada',
  'Landing personalizada (/go/tu-nombre)',
  'QR para catalogos y carteles',
  'Calendario sincronizable (Google, Outlook)',
  'Soporte prioritario',
]

const ENTERPRISE_FEATURES = [
  'Dashboard personalizado',
  'API de datos de mercado',
  'Integracion personalizada',
  'Soporte dedicado',
]

export default function PlanesPage() {
  return (
    <>
      {/* Analytics: Track page view with conversion source */}
      <PlanesTracker />
      
      {/* SEO Schema Markup */}
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
          Elegi el plan que mejor se adapte a tu consignataria o frigorifico.
          Destaca tu perfil, accede a analytics y llega a mas productores.
        </p>
        
        {/* Dynamic Social Proof (Insight #70) */}
        <PlatformStats />
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4">
        {/* FREE */}
        <div className="terminal-panel flex flex-col overflow-visible">
          <div className="terminal-panel-header">Gratuito</div>
          <div className="px-panel py-4 flex-1 flex flex-col">
            <div className="mb-4">
              <span className="text-2xl font-terminal tabular-nums text-zinc-100">
                $0
              </span>
              <span className="text-zinc-500 text-data ml-1">/mes</span>
            </div>
            <p className="text-zinc-500 text-data mb-4">
              Presencia basica en el directorio de consignatarias.
            </p>
            <ul className="space-y-2 mb-6 flex-1">
              {FREE_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-data text-zinc-400"
                >
                  <span className="text-zinc-500 mt-0.5">--</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <FreePlanStatus />
          </div>
        </div>

        {/* PRO */}
        <div
          className="terminal-panel flex flex-col relative mt-6 md:mt-0"
          style={{
            borderColor: 'rgba(245, 158, 11, 0.5)',
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.08)',
          }}
        >
          {/* PRO badge */}
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xxs font-terminal uppercase tracking-widest z-10"
            style={{
              background: 'rgba(245, 158, 11, 0.9)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#000',
              borderRadius: '2px',
            }}
          >
            Recomendado
          </div>
          <div
            className="terminal-panel-header"
            style={{
              color: '#fbbf24',
              borderBottomColor: 'rgba(245, 158, 11, 0.3)',
            }}
          >
            PRO
          </div>
          <div className="px-panel py-4 flex-1 flex flex-col">
            <div className="mb-2">
              <span
                className="text-2xl font-terminal tabular-nums"
                style={{ color: '#fbbf24' }}
              >
                $1.500
              </span>
              <span className="text-zinc-500 text-data ml-1">/día</span>
            </div>
            <p className="text-zinc-600 text-xxs mb-3">
              $45.000/mes · Sin permanencia
            </p>
            {/* Price anchoring - comparison to traditional advertising */}
            <div className="mb-4 p-2 bg-zinc-900/50 border border-zinc-800 rounded text-xxs">
              <p className="text-zinc-500">
                <span className="line-through">Aviso diario: $200.000</span> · <span className="line-through">Cartel ruta: $150.000/mes</span>
              </p>
              <p className="text-zinc-400 mt-1">
                Tu remate llega a <span className="text-amber-400">+500 productores</span> por menos que un café por día.
              </p>
            </div>
            {/* Dynamic founder spots remaining (Insight #61b → CLOSER Audit 2026-03-19) */}
            <FounderSpotsRemaining />
            <ul className="space-y-2 mb-6 flex-1">
              {PRO_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-data text-zinc-300"
                >
                  <span style={{ color: '#fbbf24' }} className="mt-0.5">
                    +
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <ProPlanStatus />
          </div>
        </div>

        {/* ENTERPRISE */}
        <div className="terminal-panel flex flex-col">
          <div className="terminal-panel-header">Enterprise</div>
          <div className="px-panel py-4 flex-1 flex flex-col">
            <div className="mb-4">
              <span className="text-2xl font-terminal tabular-nums text-zinc-100">
                Contactar
              </span>
            </div>
            <p className="text-zinc-500 text-data mb-4">
              Soluciones a medida para grandes operadores del mercado ganadero.
            </p>
            <ul className="space-y-2 mb-6 flex-1">
              {ENTERPRISE_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-data text-zinc-400"
                >
                  <span className="text-accent mt-0.5">+</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href="mailto:agro@memola.com.ar?subject=Consulta%20Plan%20Enterprise"
              className="terminal-btn w-full text-center"
            >
              Contactar ventas
            </a>
          </div>
        </div>
      </div>

      {/* Trust Badges (Insight #62) */}
      <div className="mt-6 flex flex-wrap justify-center gap-4 md:gap-6">
        <div className="flex items-center gap-2 text-zinc-500 text-data">
          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Pago seguro via Rebill</span>
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
          <span>Cancela cuando quieras</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-data">
          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span>Tarjeta credito/debito</span>
        </div>
      </div>

      {/* Why PRO? Benefits (Insight #63) - with specific numbers */}
      <div className="mt-8 terminal-panel">
        <div className="terminal-panel-header">Por que elegir PRO?</div>
        <div className="px-panel py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-lg">📧</span>
              <span className="text-zinc-200 text-sm font-medium">+500 productores ven cada remate</span>
            </div>
            <p className="text-zinc-500 text-data">
              Cada remate que publiques llega por email a nuestra base activa. <span className="text-zinc-400">Un solo comprador nuevo te devuelve la inversión del año.</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-lg">📊</span>
              <span className="text-zinc-200 text-sm font-medium">Medí lo que importa</span>
            </div>
            <p className="text-zinc-500 text-data">
              Vistas de perfil, ranking provincial, comparacion con el rubro. Sabe si tu inversion en marketing esta funcionando.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-lg">🏆</span>
              <span className="text-zinc-200 text-sm font-medium">Primera impresion profesional</span>
            </div>
            <p className="text-zinc-500 text-data">
              Badge dorado, landing con QR para catalogos, calendario sincronizable. Los productores ven una consignataria seria.
            </p>
          </div>
        </div>
      </div>

      {/* Newsletter Preview - BATTLE recommendation */}
      <div className="mt-8 terminal-panel">
        <div className="terminal-panel-header">Así se ve tu remate en el email</div>
        <div className="px-panel py-6">
          <NewsletterPreview />
          <p className="text-center text-zinc-500 text-xs mt-4">
            Este email llega a +500 productores cada vez que publicás un remate
          </p>
        </div>
      </div>

      {/* FAQ / Details */}
      <div className="mt-8 terminal-panel">
        <div className="terminal-panel-header">Preguntas frecuentes</div>
        <div className="px-panel py-4 space-y-4 text-data">
          <div>
            <p className="text-zinc-300 mb-1">
              ¿Cómo funciona el pago?
            </p>
            <p className="text-zinc-500">
              Procesamos pagos con tarjeta de crédito y débito a través de
              Rebill, plataforma certificada para pagos en Argentina y
              Latinoamérica. La suscripción se renueva automáticamente cada mes.
            </p>
          </div>
          <div className="border-t border-terminal-border pt-4">
            <p className="text-zinc-300 mb-1">
              ¿Puedo cancelar en cualquier momento?
            </p>
            <p className="text-zinc-500">
              Sí, podés cancelar tu suscripción en cualquier momento desde tu
              dashboard. El acceso PRO continúa hasta el final del período
              facturado.
            </p>
          </div>
          <div className="border-t border-terminal-border pt-4">
            <p className="text-zinc-300 mb-1">
              ¿Qué incluye el perfil verificado?
            </p>
            <p className="text-zinc-500">
              Tu perfil aparece con el badge PRO destacado en dorado, tus
              remates se muestran con tratamiento visual especial, y accedés a
              estadísticas de visitas a tu perfil.
            </p>
          </div>
          <div className="border-t border-terminal-border pt-4">
            <p className="text-zinc-300 mb-1">
              ¿Cuánto tarda en activarse?
            </p>
            <p className="text-zinc-500">
              Inmediato. Una vez confirmado el pago, tu perfil PRO se activa
              automáticamente y tus remates empiezan a promocionarse en el
              próximo envío de newsletter.
            </p>
          </div>
          <div className="border-t border-terminal-border pt-4">
            <p className="text-zinc-300 mb-1">
              ¿Vale la pena la inversión?
            </p>
            <p className="text-zinc-500">
              <strong className="text-zinc-300">Un solo comprador nuevo te devuelve la inversión del año entero.</strong>{' '}
              Cada email llega a +500 productores activos buscando hacienda. 
              El costo por contacto es menos de $90 — menos que un café.
              Un novillo vendido a mejor precio paga 10 años de PRO.
            </p>
          </div>
        </div>
      </div>
      
      {/* Bottom spacer for mobile sticky CTA */}
      <div className="h-20 md:hidden" />
    </div>
    
    {/* Mobile Sticky CTA (Insight #64) */}
    <MobileStickyCTA />
    
    {/* Social Proof Toast - BATTLE recommendation */}
    <SocialProofToast />
    </>
  )
}
