import { Metadata } from 'next'
import SubscribeButton from './SubscribeButton'
import PlanesTracker from './PlanesTracker'
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
        
        {/* Social Proof (Insight #61) */}
        <div className="mt-4 flex flex-wrap gap-4 text-data">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-terminal-border rounded">
            <span className="text-positive font-terminal tabular-nums">70+</span>
            <span className="text-zinc-500">consignatarias en el directorio</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-terminal-border rounded">
            <span className="text-sky-400 font-terminal tabular-nums">345+</span>
            <span className="text-zinc-500">remates trackeados</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-terminal-border rounded">
            <span className="text-amber-400 font-terminal tabular-nums">364</span>
            <span className="text-zinc-500">frigorificos registrados</span>
          </div>
        </div>
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
            <div className="text-data text-zinc-500 text-center py-2 border border-terminal-border"
              style={{ borderRadius: '2px' }}>
              Plan actual
            </div>
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
            <div className="mb-4">
              <span
                className="text-2xl font-terminal tabular-nums"
                style={{ color: '#fbbf24' }}
              >
                $45.000
              </span>
              <span className="text-zinc-500 text-data ml-1">/mes</span>
            </div>
            <p className="text-zinc-400 text-data mb-4">
              Cada remate que publiques lo enviamos por email a todos nuestros suscriptores. Todo el año.
            </p>
            {/* Early adopter badge (Insight #61b) */}
            <div className="mb-4 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-center">
              <span className="text-emerald-400 text-xxs font-terminal uppercase tracking-wider">
                🎁 Early adopter: precio congelado de por vida
              </span>
            </div>
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
            <SubscribeButton />
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

      {/* FAQ / Details */}
      <div className="mt-8 terminal-panel">
        <div className="terminal-panel-header">Preguntas frecuentes</div>
        <div className="px-panel py-4 space-y-4 text-data">
          <div>
            <p className="text-zinc-300 mb-1">
              Como funciona el pago?
            </p>
            <p className="text-zinc-500">
              Procesamos pagos con tarjeta de credito y debito a traves de
              Rebill, plataforma certificada para pagos en Argentina y
              Latinoamerica. La suscripcion se renueva automaticamente cada mes.
            </p>
          </div>
          <div className="border-t border-terminal-border pt-4">
            <p className="text-zinc-300 mb-1">
              Puedo cancelar en cualquier momento?
            </p>
            <p className="text-zinc-500">
              Si, podes cancelar tu suscripcion en cualquier momento desde tu
              dashboard. El acceso PRO continua hasta el final del periodo
              facturado.
            </p>
          </div>
          <div className="border-t border-terminal-border pt-4">
            <p className="text-zinc-300 mb-1">
              Que incluye el perfil verificado?
            </p>
            <p className="text-zinc-500">
              Tu perfil aparece con el badge PRO destacado en dorado, tus
              remates se muestran con tratamiento visual especial, y accedes a
              estadisticas de visitas a tu perfil.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
