import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import EnterpriseCalculator from './EnterpriseCalculator'
import { EnterpriseTierCTA } from './EnterpriseTierCTA'
import { PLATFORM_STATS } from '@/lib/platform-stats'

export const metadata: Metadata = {
  title: 'Enterprise — API y datos del mercado ganadero argentino',
  description:
    'API completa, webhooks, reportes y dashboards sobre el mercado ganadero argentino. 3 planes: Starter USD 99, Growth USD 500, Scale por volumen. Para apps agtech, frigoríficos, bancos y traders.',
  openGraph: {
    title: 'Enterprise',
    description:
      'API del mercado ganadero argentino. Starter USD 99, Growth USD 500, Scale request-based.',
    url: 'https://www.consignatarias.com.ar/enterprise',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/enterprise',
  },
}

const FAQ_ITEMS = [
  {
    question: '¿Qué endpoints incluye la API?',
    answer:
      `Índice INMAG (actual + histórico desde 2022), precios por categoría (novillos, novillitos, vaquillonas, vacas, toros, terneros), USD oficial y blue, calendario de remates (próximos, búsqueda, por consignataria/provincia), directorio de ${PLATFORM_STATS.consignatariasCanonical} consignatarias y ${PLATFORM_STATS.frigorificos} frigoríficos. Documentación completa en /api-docs.`,
  },
  {
    question: '¿Qué pasa si supero el límite de requests de mi plan?',
    answer:
      'Te avisamos por email cuando llegás al 80% del cupo. Si lo superás, te ofrecemos pasar al plan siguiente prorrateado por los días restantes del mes. No cortamos el servicio sin aviso.',
  },
  {
    question: '¿Cómo funcionan los webhooks?',
    answer:
      'Te enviamos POST a tu URL cuando ocurre: nuevo remate publicado, cambio diario de INMAG, alerta de precio configurada. Payload JSON firmado HMAC-SHA256. Reintentos automáticos con backoff exponencial. Logs visibles en tu dashboard.',
  },
  {
    question: '¿Cómo se entregan los reportes?',
    answer:
      'Reporte semanal en PDF (lectura del mercado, INMAG, USD, oferta por región, remates destacados) + JSON estructurado para procesamiento. Llega los lunes a las 9:00 ART por email + descargable desde tu dashboard.',
  },
  {
    question: '¿Cobran en USD o ARS?',
    answer:
      'Pago en USD vía transferencia bancaria internacional, USDT (red Tron o ETH), o factura local en ARS al tipo de cambio MEP del día de emisión. Contrato anual con 15% de descuento.',
  },
  {
    question: '¿Puedo probar antes de pagar?',
    answer:
      'Sí. Te damos una API key de prueba con cupo limitado (200 requests, 7 días) para que valides la integración. Sin tarjeta.',
  },
  {
    question: '¿Pueden firmar NDA?',
    answer:
      'Sí. Para Growth y Scale firmamos NDA estándar antes del onboarding. Para integraciones a medida, MSA + SOW.',
  },
]

const TIERS = [
  {
    name: 'Starter',
    tagline: 'Para apps y dev',
    price: '99',
    priceUnit: 'USD/mes',
    cycle: 'Mensual o anual (–15%)',
    description:
      'Apps en desarrollo, productos chicos, valorización de rodeos, dashboards internos. Lectura diaria suficiente.',
    requests: '1.000 req/mes',
    features: [
      'API key dedicada',
      'INMAG diario + serie histórica completa (desde 2015)',
      '16 sub-categorías oficiales MAG con corte por peso',
      'Calendario remates, directorios consignatarias + frigoríficos, USD',
      '1 webhook configurable',
      'Soporte por email (48h hábiles)',
      'Documentación + ejemplos Python/JS',
    ],
    cta: 'Probar Starter',
    ctaHref:
      'mailto:agro@memola.com.ar?subject=Enterprise%20Starter%20—%20Consignatarias.com.ar&body=Hola,%20queremos%20contratar%20el%20plan%20Starter.%0A%0AEmpresa%20o%20producto:%0AUso%20previsto:',
    accent: '#71717a',
    highlight: false,
  },
  {
    name: 'Growth',
    tagline: 'API + reportes + dashboards',
    price: '500',
    priceUnit: 'USD/mes',
    cycle: 'Mensual o anual (–15%)',
    description:
      'Apps en producción, frigoríficos, bancos, agroinsumos. Todo lo que necesitás para construir y operar.',
    requests: '50.000 req/mes',
    features: [
      'Todo lo del plan Starter',
      'Webhooks ilimitados',
      'Exports CSV/JSON bajo demanda',
      'Reporte semanal PDF + JSON',
      'Dashboards web personalizados',
      'Alertas configurables (INMAG, sub-categoría, USD, remates)',
      'Acceso al analista por email/Slack',
      'Lote-level transactional data (próximamente)',
      'SLA 99,8% — soporte en 4h hábiles',
    ],
    cta: 'Contratar Growth',
    ctaHref:
      'mailto:agro@memola.com.ar?subject=Enterprise%20Growth%20—%20Consignatarias.com.ar&body=Hola,%20queremos%20contratar%20el%20plan%20Growth.%0A%0AEmpresa:%0AUso%20previsto:',
    accent: '#38bdf8',
    highlight: true,
  },
  {
    name: 'Scale',
    tagline: 'Apps de alto volumen',
    price: 'desde 700',
    priceUnit: 'USD/mes',
    cycle: 'Por volumen · calculadora abajo',
    description:
      'Apps con miles de usuarios, integraciones con sistemas internos, múltiples equipos consumiendo la API.',
    requests: '100K → 5M req/mes',
    features: [
      'Todo lo del plan Growth',
      'Volume pricing (ver calculadora)',
      'Multi-usuario con roles y permisos',
      'Integración con ERP/BI/data warehouse',
      'White-label embed opcional',
      'CSM dedicado desde 500K req/mes',
      'SLA 99,9% — soporte en 1h hábil',
      'NDA + MSA disponibles',
    ],
    cta: 'Calcular volumen ↓',
    ctaHref: '#calculadora',
    accent: '#a78bfa',
    highlight: false,
  },
]

const VERTICALS = [
  {
    label: 'Apps agtech / gestión agronómica',
    plan: 'Starter o Growth',
    use: 'Valorización de rodeos con precios actualizados, integración de calendario de remates en gestión productiva, alertas de precio para asesores.',
  },
  {
    label: 'Frigoríficos',
    plan: 'Growth',
    use: 'Forecast de oferta semanal, scoring de consignatarias proveedoras, monitoreo de precios por categoría y región para decisiones de compra.',
  },
  {
    label: 'Bancos / financieras',
    plan: 'Growth o Scale',
    use: 'Pricing de líneas ganaderas, valuación de garantías hacienda, exposición sectorial, reportes para comité de riesgo.',
  },
  {
    label: 'Traders / acopiadores',
    plan: 'Growth',
    use: 'Calendario unificado de oferta, alertas de variación INMAG, comparables vs operaciones propias, lectura semanal del mercado.',
  },
  {
    label: 'Agroinsumos / genética / seguros',
    plan: 'Growth o Scale',
    use: 'Datos para pricing de productos, índices de referencia para coberturas paramétricas, presencia editorial frente a la base.',
  },
  {
    label: 'Gobierno / cámaras',
    plan: 'Scale',
    use: 'Datos de actividad sectorial, transparencia de mercado, insumos para reportes oficiales, dashboards públicos embebidos.',
  },
]

const COVERAGE = [
  { label: 'Remates indexados', value: `${PLATFORM_STATS.remates}+` },
  { label: 'Consignatarias', value: String(PLATFORM_STATS.consignatariasCanonical) },
  { label: 'Frigoríficos', value: String(PLATFORM_STATS.frigorificos) },
  { label: 'Provincias', value: String(PLATFORM_STATS.provincias) },
  { label: 'Sub-categorías MAG', value: '16' },
  { label: 'Histórico INMAG', value: '2015→hoy' },
]

export default function EnterprisePage() {
  return (
    <>
      <SectionBreadcrumbSchema section="enterprise" sectionName="Enterprise" />
      <FAQPageSchema items={FAQ_ITEMS} />

      <div className="px-4 py-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2 py-0.5 text-xxs font-terminal uppercase tracking-widest"
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                borderRadius: '2px',
              }}
            >
              Enterprise
            </span>
            <span className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider">
              API + datos del mercado ganadero argentino
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-3 leading-tight">
            Una API para todo el mercado ganadero<br className="hidden md:block" />
            <span className="text-zinc-400"> argentino. Sin armar scraping propio.</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-3xl leading-relaxed">
            Tres planes pensados para distintas verticales: apps agtech en
            desarrollo, productos en producción y operadores de alto volumen.
            INMAG, precios por categoría, calendario de remates, directorios y
            webhooks — todo bajo un solo contrato.
          </p>
        </div>

        {/* Coverage strip */}
        <div className="terminal-panel mb-8">
          <div className="terminal-panel-header">Cobertura actual</div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-terminal-border">
            {COVERAGE.map((c) => (
              <div key={c.label} className="bg-terminal-panel px-4 py-3">
                <div className="text-zinc-100 text-lg font-terminal tabular-nums">
                  {c.value}
                </div>
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mt-1">
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="terminal-panel flex flex-col relative"
              style={
                tier.highlight
                  ? {
                      borderColor: `${tier.accent}80`,
                      boxShadow: `0 0 24px ${tier.accent}14`,
                    }
                  : { borderColor: `${tier.accent}40` }
              }
            >
              {tier.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xxs font-terminal uppercase tracking-widest z-10"
                  style={{
                    background: tier.accent,
                    color: '#000',
                    borderRadius: '2px',
                  }}
                >
                  Más elegido
                </div>
              )}
              <div
                className="terminal-panel-header flex items-center justify-between"
                style={{
                  color: tier.accent,
                  borderBottomColor: `${tier.accent}40`,
                }}
              >
                <span>{tier.name}</span>
                <span className="text-zinc-500 text-xxs font-terminal normal-case tracking-normal">
                  {tier.tagline}
                </span>
              </div>
              <div className="px-panel py-5 flex-1 flex flex-col">
                <div className="mb-1 flex items-baseline gap-1 flex-wrap">
                  <span className="text-zinc-500 text-data">USD</span>
                  <span
                    className="text-3xl font-terminal tabular-nums"
                    style={{ color: tier.accent }}
                  >
                    {tier.price}
                  </span>
                  <span className="text-zinc-500 text-data ml-1">/mes</span>
                </div>
                <p className="text-zinc-500 text-xxs mb-3">{tier.cycle}</p>
                <div className="mb-4 inline-block">
                  <span
                    className="px-2 py-0.5 text-xxs font-terminal tabular-nums"
                    style={{
                      background: `${tier.accent}14`,
                      border: `1px solid ${tier.accent}40`,
                      color: tier.accent,
                      borderRadius: '2px',
                    }}
                  >
                    {tier.requests}
                  </span>
                </div>
                <p className="text-zinc-400 text-data mb-5 leading-relaxed">
                  {tier.description}
                </p>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-data text-zinc-300"
                    >
                      <span className="mt-0.5" style={{ color: tier.accent }}>
                        +
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <EnterpriseTierCTA
                  tier={tier.name.toLowerCase() as 'starter' | 'growth' | 'scale'}
                  accent={tier.accent}
                  defaultCtaText={tier.cta}
                  defaultCtaHref={tier.ctaHref}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── Institutional DATA LICENSE — license the series, not just per-request API.
            The higher-ACV, sales-led offering (CEPEA/Bloomberg model). Gated by the
            published methodology (Pillar 1). Emerald accent to differentiate from the
            sky-accented per-request tiers above. ─────────────────────────────────── */}
        <div id="licencia-datos" className="terminal-panel mb-10 scroll-mt-24" style={{ borderColor: 'rgba(52,211,153,0.45)', boxShadow: '0 0 24px rgba(52,211,153,0.08)' }}>
          <div
            className="terminal-panel-header flex items-center justify-between"
            style={{ color: '#34d399', borderBottomColor: 'rgba(52,211,153,0.4)' }}
          >
            <span>Licencia de datos institucional</span>
            <span className="text-zinc-500 text-xxs font-terminal normal-case tracking-normal">
              la serie, no la API por request
            </span>
          </div>
          <div className="px-panel py-5">
            <p className="text-zinc-200 text-sm mb-2">
              Más allá del acceso por request: <span className="text-zinc-100 font-medium">licenciá la serie de referencia</span> del
              mercado ganadero argentino — para tu valuación, settlement o uso interno.
            </p>
            <p className="text-zinc-500 text-data leading-relaxed mb-6 max-w-3xl">
              El modelo de CEPEA (Brasil) y Bloomberg: el valor no es el endpoint, es la <span className="text-zinc-300">serie
              propietaria</span> y ser la referencia citable. Para instituciones que usan el dato como insumo de decisión,
              no como feature de una app. Pricing a medida (contrato anual) según alcance de uso y redistribución.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-6">
              <div>
                <div className="text-zinc-200 text-xxs font-terminal uppercase tracking-wider mb-2">Qué licenciás</div>
                <ul className="space-y-1.5 text-data text-zinc-400">
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> Serie INMAG completa (2015→hoy, 11 años) + overlay USD oficial y blue</li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> Datos lote-level transaccionales (haciinfo000007)</li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> Familia de índices propia (INMAG-USD, spreads, derivados)</li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> Entrega bulk / snapshots históricos / feed programado (sin rate-limit)</li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> Derecho de uso interno, valuación o redistribución (según contrato)</li>
                </ul>
              </div>
              <div>
                <div className="text-zinc-200 text-xxs font-terminal uppercase tracking-wider mb-2">Para qué</div>
                <ul className="space-y-1.5 text-data text-zinc-400">
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">›</span> <span><span className="text-zinc-300">Bancos</span> — valuación de hacienda como garantía (cattle-collateral lending)</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">›</span> <span><span className="text-zinc-300">Frigoríficos exportadores</span> — pricing y cobertura de compra</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">›</span> <span><span className="text-zinc-300">Exchanges / MATBA-ROFEX</span> — referencia de settlement para un contrato a futuro</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">›</span> <span><span className="text-zinc-300">Fintech / agtech</span> — el dato bajo el capó del producto</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">›</span> <span><span className="text-zinc-300">Research / prensa</span> — la serie citable con metodología</span></li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-terminal-border pt-4">
              <p className="text-zinc-500 text-data">
                Metodología publicada (v1.2) + cobertura declarada con honestidad —{' '}
                <a href="/metodologia" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">ver metodología →</a>
              </p>
              <a
                href="mailto:agro@memola.com.ar?subject=Licencia%20de%20datos%20institucional%20—%20consignatarias.com.ar&body=Hola,%20queremos%20evaluar%20una%20licencia%20de%20datos.%0A%0AInstituci%C3%B3n:%0ATipo%20(banco%20/%20frigor%C3%ADfico%20/%20exchange%20/%20fintech%20/%20otro):%0AUso%20previsto%20(valuaci%C3%B3n%20/%20settlement%20/%20interno%20/%20redistribuci%C3%B3n):%0ASeries%20de%20inter%C3%A9s%20(INMAG-USD%20/%20lote-level%20/%20%C3%ADndices):"
                className="terminal-btn whitespace-nowrap shrink-0"
                style={{ borderColor: 'rgba(52,211,153,0.6)', color: '#34d399' }}
              >
                Solicitar licencia de datos →
              </a>
            </div>
          </div>
        </div>

        {/* Scale calculator */}
        <div id="calculadora" className="mb-10 scroll-mt-24">
          <EnterpriseCalculator />
          <p className="text-zinc-500 text-xxs mt-3 text-center">
            Precios incluyen todo lo del plan Growth + features de Scale. Volumen ≤ 50K
            req/mes ya está cubierto por Growth (USD 500).
          </p>
        </div>

        {/* Verticals */}
        <div className="terminal-panel mb-8">
          <div className="terminal-panel-header">Por vertical</div>
          <div className="px-panel py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {VERTICALS.map((v) => (
              <div key={v.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-zinc-200 text-sm font-medium">
                    {v.label}
                  </div>
                  <span className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider whitespace-nowrap">
                    {v.plan}
                  </span>
                </div>
                <p className="text-zinc-500 text-data leading-relaxed">
                  {v.use}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stack note */}
        <div className="terminal-panel mb-8">
          <div className="terminal-panel-header">Stack RWA</div>
          <div className="px-panel py-5">
            <p className="text-zinc-400 text-data leading-relaxed mb-3">
              Consignatarias.com.ar es la capa de datos del mercado ganadero
              argentino. Para operaciones financieras sobre hacienda (CD+W
              tokenizados, Decreto 640/2024) trabajamos con{' '}
              <span className="text-zinc-200">miganado.com.ar</span>. Empresas
              que necesitan integrar ambos extremos —datos + instrumentos—
              pueden contratarlos en un único acuerdo.
            </p>
            <p className="text-zinc-500 text-xxs">
              Operado por Memola Medios SAS · CUIT 30-71863222-2
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="terminal-panel mb-8">
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

        {/* Bottom CTA */}
        <div
          className="terminal-panel"
          style={{
            borderColor: 'rgba(56, 189, 248, 0.4)',
            background:
              'linear-gradient(180deg, rgba(56,189,248,0.04), transparent)',
          }}
        >
          <div className="px-panel py-6 md:py-8 text-center">
            <p className="text-zinc-300 text-base md:text-lg font-heading mb-2">
              ¿No estás seguro qué plan necesitás?
            </p>
            <p className="text-zinc-500 text-data mb-5 max-w-xl mx-auto">
              Contanos qué problema querés resolver y armamos un piloto de 30
              días con los datos y reportes que correspondan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <a
                href="mailto:agro@memola.com.ar?subject=Enterprise%20—%20Consulta%20general&body=Hola,%20queremos%20conversar%20sobre%20Enterprise.%0A%0AEmpresa:%0AÁrea/Rol:%0AProblema%20a%20resolver:"
                className="terminal-btn"
                style={{ borderColor: 'rgba(56, 189, 248, 0.6)', color: '#38bdf8' }}
              >
                Conversemos →
              </a>
              <Link href="/api-docs" className="terminal-btn">
                Ver documentación API
              </Link>
            </div>
            <p className="text-zinc-500 text-xxs mt-5">
              agro@memola.com.ar · Respondemos en menos de 24h hábiles
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
