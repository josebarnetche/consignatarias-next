'use client'

import Link from 'next/link'

/* ============================================================
   Pricing API-first (todo en USD).
   - El observatorio del productor es GRATIS (moat + autoridad).
   - La caja es la API/MCP para instituciones (frigoríficos, traders,
     agtech, fondos, bancos). Starter barato para land-and-expand.
   - Consignataria: alcance con prueba, no "pagá por aparecer".
   ============================================================ */

interface ApiTier {
  name: string
  price: string
  period: string
  desc: string
  features: string[]
  highlight?: boolean
  cta: string
  href: string
}

const API_TIERS: ApiTier[] = [
  {
    name: 'Starter',
    price: 'USD 49',
    period: '/mes',
    desc: 'Para devs, analistas y una sola firma. Empezá barato.',
    features: [
      '10.000 requests/mes',
      'Endpoints: INMAG, categorías, USD, remates, directorios',
      'Acceso MCP (tools de lectura)',
      'Histórico completo',
      '1 webhook',
    ],
    cta: 'Empezar',
    href: '/enterprise',
  },
  {
    name: 'Growth',
    price: 'USD 299',
    period: '/mes',
    desc: 'Agtech, medios agro, fondos. Volumen + automatización.',
    features: [
      '100.000 requests/mes',
      'Webhooks ilimitados + alertas de precio (MCP write)',
      'Exports CSV/JSON',
      'Reporte semanal PDF + JSON',
      'Soporte prioritario',
    ],
    highlight: true,
    cta: 'Empezar',
    href: '/enterprise',
  },
  {
    name: 'Scale',
    price: 'A medida',
    period: '',
    desc: 'Bancos, agtech grande, exchanges. Volumen y SLA.',
    features: [
      'Volumen alto (500K → 5M requests)',
      'SLA + uptime garantizado',
      'Multi-usuario con roles',
      'Integración ERP / BI',
      'White-label opcional',
    ],
    cta: 'Hablemos',
    href: '/enterprise#acceso-institucional',
  },
]

function ApiCard({ tier }: { tier: ApiTier }) {
  const accent = tier.highlight
  return (
    <div
      className="terminal-panel flex flex-col relative"
      style={
        accent
          ? { borderColor: 'rgba(56,189,248,0.5)', boxShadow: '0 0 20px rgba(56,189,248,0.08)' }
          : { borderColor: 'rgba(56,189,248,0.28)' }
      }
    >
      {accent && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xxs font-terminal uppercase tracking-widest z-10"
          style={{ background: 'rgba(56,189,248,0.9)', color: '#000', borderRadius: '2px' }}
        >
          Más elegido
        </div>
      )}
      <div
        className="terminal-panel-header"
        style={{ color: '#38bdf8', borderBottomColor: 'rgba(56,189,248,0.25)' }}
      >
        API · {tier.name}
      </div>
      <div className="px-panel py-4 flex-1 flex flex-col">
        <div className="mb-1">
          <span className="text-2xl font-terminal tabular-nums" style={{ color: '#38bdf8' }}>
            {tier.price}
          </span>
          {tier.period && <span className="text-zinc-500 text-data ml-1">{tier.period}</span>}
        </div>
        <p className="text-zinc-500 text-data mb-4">{tier.desc}</p>
        <ul className="space-y-2 mb-6 flex-1">
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-data text-zinc-300">
              <span style={{ color: '#38bdf8' }} className="mt-0.5">+</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link
          href={tier.href}
          className="terminal-btn w-full text-center"
          style={{ borderColor: 'rgba(56,189,248,0.6)', color: '#38bdf8' }}
        >
          {tier.cta} →
        </Link>
      </div>
    </div>
  )
}

export default function PlanesToggle() {
  return (
    <div>
      {/* API / MCP — el corazón del pricing */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-label tracking-widest text-zinc-400">
          API / MCP — el precio del ganado argentino como servicio
        </p>
        <span className="text-xxs font-terminal text-zinc-500">Facturación en USD · anual –15%</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {API_TIERS.map((t) => (
          <ApiCard key={t.name} tier={t} />
        ))}
      </div>

      {/* Segunda fila: productor gratis + consignataria (alcance) */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Productor — gratis */}
        <div className="terminal-panel flex flex-col">
          <div
            className="terminal-panel-header"
            style={{ color: '#10b981', borderBottomColor: 'rgba(16,185,129,0.25)' }}
          >
            Productor · gratis
          </div>
          <div className="px-panel py-4 flex-1 flex flex-col">
            <div className="mb-1">
              <span className="text-2xl font-terminal tabular-nums text-zinc-100">$0</span>
              <span className="text-zinc-500 text-data ml-1">/siempre</span>
            </div>
            <p className="text-zinc-500 text-data mb-4">
              Todo el observatorio, sin costo. El productor no paga — es la razón por la
              que el dato es la referencia.
            </p>
            <ul className="space-y-2 mb-6 flex-1">
              {[
                'INMAG diario + precios por categoría',
                'Calendario unificado de remates',
                'Directorio de consignatarias y frigoríficos',
                'Calculadoras (neto en mano, ¿vendo ahora?)',
                'Alertas de precio por email',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-data text-zinc-300">
                  <span className="text-emerald-500 mt-0.5">+</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/login" className="terminal-btn w-full text-center">
              Crear cuenta gratis
            </Link>
          </div>
        </div>

        {/* Consignataria — alcance (prueba, no "pagá por aparecer") */}
        <div className="terminal-panel flex flex-col" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
          <div
            className="terminal-panel-header"
            style={{ color: '#fbbf24', borderBottomColor: 'rgba(245,158,11,0.25)' }}
          >
            Consignataria · alcance
          </div>
          <div className="px-panel py-4 flex-1 flex flex-col">
            <div className="mb-1">
              <span className="text-2xl font-terminal tabular-nums" style={{ color: '#fbbf24' }}>
                USD 39
              </span>
              <span className="text-zinc-500 text-data ml-1">/mes</span>
            </div>
            <p className="text-zinc-500 text-xxs mb-3">Prueba gratis · sin permanencia</p>
            <p className="text-zinc-500 text-data mb-4">
              Promocioná tus remates a la base de productores y destacá tu perfil. Se paga
              solo si te trae consultas — probalo antes.
            </p>
            <ul className="space-y-2 mb-6 flex-1">
              {[
                'Promoción de remates por email a la base de productores',
                'Perfil verificado y destacado (badge)',
                'Analytics de perfil (vistas, ranking)',
                'Landing propia + QR para catálogos',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-data text-zinc-300">
                  <span style={{ color: '#fbbf24' }} className="mt-0.5">+</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/enterprise#consignataria"
              className="terminal-btn w-full text-center"
              style={{ borderColor: 'rgba(245,158,11,0.6)', color: '#fbbf24' }}
            >
              Probar gratis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
