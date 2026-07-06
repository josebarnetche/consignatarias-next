'use client'

import Link from 'next/link'

/* ============================================================
   Pricing API-first (todo en ARS — Rebill factura en ARS).
   Dos productos DISTINTOS, visualmente separados:
   - API/MCP (cielo): el dato como servicio, para devs/instituciones.
   - PRO Consignataria (ámbar, el color del badge dorado): alcance.
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
    name: 'Starter · Conectá tu IA',
    price: 'ARS 74.000',
    period: '/mes',
    desc: 'Tu asistente (Claude, ChatGPT, Cursor) responde con el dato ganadero real. MCP incluido, sin programar.',
    features: [
      'Conector MCP listo para pegar + API REST',
      '10.000 requests/mes',
      'INMAG, precios, remates y directorios + histórico',
    ],
    cta: 'Empezar',
    href: '/enterprise',
  },
  {
    name: 'Growth',
    price: 'ARS 451.000',
    period: '/mes',
    desc: 'Para operar en producción: volumen, webhooks y reportes.',
    features: [
      '100.000 requests/mes',
      'Webhooks + alertas de precio',
      'Exports CSV/JSON + reporte semanal',
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
    desc: 'Volumen alto con SLA, para bancos y agtech grande.',
    features: [
      '100K → 5M requests/mes',
      'SLA + multi-usuario con roles',
      'Integración ERP/BI · white-label',
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
      {/* Productor — GRATIS, primero (es la base del modelo) */}
      <div
        className="terminal-panel flex flex-col md:flex-row md:items-center gap-4 mb-5 px-panel py-4"
        style={{ borderColor: 'rgba(56,189,248,0.35)' }}
      >
        <div className="flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-terminal tabular-nums text-accent">$0</span>
            <span className="text-sky-300 text-label tracking-widest">PRODUCTOR · GRATIS · SIEMPRE</span>
          </div>
          <p className="text-zinc-400 text-data mt-1 max-w-2xl">
            Todo el observatorio, sin costo: INMAG diario, precios por categoría, calendario de remates,
            directorio de consignatarias y frigoríficos, calculadoras y alertas. El productor no paga — es la
            razón por la que el dato es la referencia.
          </p>
        </div>
        <Link
          href="/login"
          className="terminal-btn text-center shrink-0"
          style={{ borderColor: 'rgba(56,189,248,0.6)', color: '#38bdf8' }}
        >
          Crear cuenta gratis con Google →
        </Link>
      </div>

      {/* API / MCP — el corazón del pricing */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-label tracking-widest text-zinc-400">
          <span className="inline-flex w-9 h-9 rounded bg-zinc-100 items-center justify-center align-middle mr-2" aria-hidden="true">
            <img src="/marca/iconos-color/agente-ia.png" alt="" className="w-6 h-6" />
          </span>
          API / MCP — conectá tu IA o tu sistema al dato ganadero
        </p>
        <span className="text-xxs font-terminal text-zinc-500">Facturación mensual en ARS vía Rebill · anual –15%</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {API_TIERS.map((t) => (
          <ApiCard key={t.name} tier={t} />
        ))}
      </div>

      {/* Consignataria — PRODUCTO APARTE (alcance, no data-service): ámbar como su badge */}
      <div className="mt-8 mb-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-terminal-border pt-6">
        <p className="text-label tracking-widest text-zinc-400">
          <span className="inline-flex w-9 h-9 rounded bg-zinc-100 items-center justify-center align-middle mr-2" aria-hidden="true">
            <img src="/marca/iconos-color/casa-remates.png" alt="" className="w-6 h-6" />
          </span>
          PRO Consignataria — más productores en tus remates
        </p>
        <span className="text-xxs font-terminal text-zinc-500">Facturación mensual en ARS vía Rebill</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Consignataria — alcance (prueba, no "pagá por aparecer") */}
        <div className="terminal-panel flex flex-col" style={{ borderColor: 'rgba(251,191,36,0.35)' }}>
          <div
            className="terminal-panel-header"
            style={{ color: '#fbbf24', borderBottomColor: 'rgba(251,191,36,0.25)' }}
          >
            PRO Consignataria · alcance
          </div>
          <div className="px-panel py-4 flex-1 flex flex-col">
            <div className="mb-1">
              <span className="text-2xl font-terminal tabular-nums" style={{ color: '#fbbf24' }}>
                ARS 45.000
              </span>
              <span className="text-zinc-500 text-data ml-1">/mes</span>
            </div>
            <p className="text-zinc-500 text-xxs mb-3">Prueba gratis · sin permanencia</p>
            <p className="text-zinc-500 text-data mb-4">
              Lo que obtenés:
            </p>
            <ul className="space-y-2 mb-6 flex-1">
              {[
                'Cada remate tuyo, por email a la base de productores',
                'Badge dorado + perfil destacado en el directorio',
                'Analytics: cuántos productores miran tu perfil',
                'Landing propia + QR para tus catálogos',
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
              style={{ borderColor: 'rgba(251,191,36,0.6)', color: '#fbbf24' }}
            >
              Probar gratis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
