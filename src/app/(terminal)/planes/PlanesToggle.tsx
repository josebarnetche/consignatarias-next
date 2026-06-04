'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import FreePlanStatus from './FreePlanStatus'
import ProPlanStatus from './ProPlanStatus'
import FounderSpotsRemaining from './FounderSpotsRemaining'
import NewsletterPreview from '@/components/marketing/NewsletterPreview'
import { trackProPromptClick } from '@/lib/analytics'

type Audience = 'productor' | 'consignataria'

function isAudience(v: string | null): v is Audience {
  return v === 'productor' || v === 'consignataria'
}

const PRODUCTOR_FREE_FEATURES = [
  'Calendario unificado de remates',
  'Directorio de consignatarias y frigoríficos',
  'INMAG diario y precios por categoría',
  'Búsqueda básica',
]

const PRODUCTOR_PRO_FEATURES = [
  'Calculadora neto en mano: comisión, gastos y flete descontados del bruto',
  'Calculadora «¿Vendo ahora?» con percentiles de 30 y 365 días',
  'Comparador con medios de pago y días de cobro de cada consignataria',
  'Histórico INMAG completo 2015→ + descarga CSV',
  'Estacionalidad: la década completa mes × año (z-score)',
  'Filtros avanzados de remates (rango de fechas, cabezas mínimas)',
  'Descargas El Corredor + El Oráculo',
]

const CONSIGNATARIA_FREE_FEATURES = [
  'Perfil básico en el directorio',
  'Calendario de remates',
  'Datos de mercado limitados',
]

const CONSIGNATARIA_PRO_FEATURES = [
  'Promoción de remates por email a +500 productores',
  'Perfil verificado y destacado',
  'Analytics de perfil (vistas)',
  'Remates con badge PRO',
  'Logo y descripción personalizada',
  'Landing personalizada (/go/tu-nombre)',
  'QR para catálogos y carteles',
  'Calendario sincronizable (Google, Outlook)',
  'Soporte prioritario',
]

const ENTERPRISE_FEATURES = [
  'Starter: API completa, 1K req/mes — USD 99',
  'Growth: + webhooks + reportes + dashboards, 50K req/mes — USD 500',
  'Scale: volumen por requests, 100K → 5M req/mes — desde USD 700',
  'Facturación USD · anual –15%',
]

export default function PlanesToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('audience')
  const audience: Audience = isAudience(raw) ? raw : 'productor'

  const setAudience = useCallback(
    (next: Audience) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('audience', next)
      router.replace(`/planes?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  return (
    <div>
      {/* Audience toggle */}
      <div className="mb-6 flex justify-center">
        <div
          className="inline-flex flex-wrap gap-1 border border-terminal-border bg-zinc-950 p-1 max-w-full"
          role="tablist"
          aria-label="Tipo de cuenta"
        >
          {(['productor', 'consignataria'] as const).map((a) => {
            const active = audience === a
            return (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setAudience(a)}
                className="px-3 sm:px-4 py-2 text-xxs font-terminal uppercase tracking-wider sm:tracking-widest transition-colors whitespace-nowrap"
                style={
                  active
                    ? {
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.5)',
                        color: '#38bdf8',
                      }
                    : {
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: '#a1a1aa',
                      }
                }
              >
                <span className="sm:hidden">{a === 'productor' ? 'Productor' : 'Consignataria'}</span>
                <span className="hidden sm:inline">
                  {a === 'productor' ? 'Soy productor / asesor' : 'Soy consignataria / frigorífico'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3-card grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {audience === 'productor' ? (
          <ProductorCards />
        ) : (
          <ConsignatariaCards />
        )}

        {/* Enterprise — visible en ambas vistas */}
        <EnterpriseCard />
      </div>

      {/* Audience-specific extras */}
      {audience === 'productor' ? <ProductorWhy /> : <ConsignatariaWhy />}
    </div>
  )
}

function ProductorWhy() {
  return (
    <div className="mt-8 terminal-panel">
      <div className="terminal-panel-header">Por qué PRO Usuario</div>
      <div className="px-panel py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-zinc-200 text-sm font-medium">
            Cuánto te queda neto
          </span>
          <p className="text-zinc-500 text-data">
            La calculadora pasa del bruto INMAG al neto en mano: comisión,
            gastos y flete descontados, en ARS, USD y $/kg. La plata real, no
            la teórica.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-zinc-200 text-sm font-medium">
            Cuándo y a quién vender
          </span>
          <p className="text-zinc-500 text-data">
            «¿Vendo ahora?» con percentiles de 30 y 365 días, y el comparador
            con medios de pago y días de cobro de cada consignataria. La
            decisión completa.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-zinc-200 text-sm font-medium">
            La década completa
          </span>
          <p className="text-zinc-500 text-data">
            Histórico INMAG 2015→ con descarga CSV, estacionalidad mes × año y
            las descargas El Corredor + El Oráculo. Material para una reunión,
            no para chusmear.
          </p>
        </div>
      </div>
    </div>
  )
}

function ConsignatariaWhy() {
  return (
    <>
      <div className="mt-8 terminal-panel">
        <div className="terminal-panel-header">Por qué elegir PRO</div>
        <div className="px-panel py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-zinc-200 text-sm font-medium">
              +500 productores ven cada remate
            </span>
            <p className="text-zinc-500 text-data">
              Cada remate que publiques llega por email a nuestra base activa.{' '}
              <span className="text-zinc-400">
                Un solo comprador nuevo te devuelve la inversión del año.
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-zinc-200 text-sm font-medium">
              Medí lo que importa
            </span>
            <p className="text-zinc-500 text-data">
              Vistas de perfil, ranking provincial, comparación con el rubro.
              Sabés si tu inversión en marketing está funcionando.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-zinc-200 text-sm font-medium">
              Primera impresión profesional
            </span>
            <p className="text-zinc-500 text-data">
              Badge dorado, landing con QR para catálogos, calendario
              sincronizable. Los productores ven una consignataria seria.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 terminal-panel">
        <div className="terminal-panel-header">Así se ve tu remate en el email</div>
        <div className="px-panel py-6">
          <NewsletterPreview />
          <p className="text-center text-zinc-500 text-xs mt-4">
            Este email llega a +500 productores cada vez que publicás un remate
          </p>
        </div>
      </div>
    </>
  )
}

/* ============================================================
   PRODUCTOR (demand-side) — Free + PRO Usuario ARS 7.900
   ============================================================ */
function ProductorCards() {
  return (
    <>
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
            Acceso básico al observatorio del mercado bovino argentino.
          </p>
          <ul className="space-y-2 mb-6 flex-1">
            {PRODUCTOR_FREE_FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-data text-zinc-400"
              >
                <span className="text-zinc-500 mt-0.5">--</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="terminal-btn w-full text-center"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </div>

      {/* PRO USUARIO — ARS 7.900 */}
      <div
        className="terminal-panel flex flex-col relative mt-6 md:mt-0"
        style={{
          borderColor: 'rgba(56, 189, 248, 0.5)',
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.08)',
        }}
      >
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xxs font-terminal uppercase tracking-widest z-10"
          style={{
            background: 'rgba(56, 189, 248, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#000',
            borderRadius: '2px',
          }}
        >
          Para vos
        </div>
        <div
          className="terminal-panel-header"
          style={{
            color: '#38bdf8',
            borderBottomColor: 'rgba(56, 189, 248, 0.3)',
          }}
        >
          PRO
        </div>
        <div className="px-panel py-4 flex-1 flex flex-col">
          <div className="mb-2">
            <span
              className="text-2xl font-terminal tabular-nums"
              style={{ color: '#38bdf8' }}
            >
              ARS $7.900
            </span>
            <span className="text-zinc-500 text-data ml-1">/mes</span>
          </div>
          <p className="text-zinc-500 text-xxs mb-4">
            Sin permanencia · cancelás cuando quieras
          </p>
          <p className="text-zinc-500 text-data mb-4">
            Acceso ilimitado para productores, asesores, contadores y brokers.
          </p>
          <ul className="space-y-2 mb-6 flex-1">
            {PRODUCTOR_PRO_FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-data text-zinc-300"
              >
                <span style={{ color: '#38bdf8' }} className="mt-0.5">
                  +
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/upgrade"
            onClick={() => trackProPromptClick('planes_pro_user_card', 'card')}
            className="terminal-btn w-full text-center"
            style={{
              borderColor: 'rgba(56, 189, 248, 0.6)',
              color: '#38bdf8',
            }}
          >
            Activar PRO →
          </Link>
        </div>
      </div>
    </>
  )
}

/* ============================================================
   CONSIGNATARIA (supply-side) — Free directorio + PRO $45.000
   ============================================================ */
function ConsignatariaCards() {
  return (
    <>
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
            Presencia básica de tu consignataria o frigorífico en el directorio.
          </p>
          <ul className="space-y-2 mb-6 flex-1">
            {CONSIGNATARIA_FREE_FEATURES.map((f) => (
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

      {/* PRO CONSIGNATARIA — ARS 45.000 */}
      <div
        className="terminal-panel flex flex-col relative mt-6 md:mt-0"
        style={{
          borderColor: 'rgba(245, 158, 11, 0.5)',
          boxShadow: '0 0 20px rgba(251, 191, 36, 0.08)',
        }}
      >
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
          <p className="text-zinc-500 text-xxs mb-3">
            $45.000/mes · Sin permanencia
          </p>
          <div className="mb-4 p-2 bg-zinc-900/50 border border-zinc-800 rounded text-xxs">
            <p className="text-zinc-500">
              <span className="line-through">Aviso diario: $200.000</span> ·{' '}
              <span className="line-through">Cartel ruta: $150.000/mes</span>
            </p>
            <p className="text-zinc-400 mt-1">
              Tu remate llega a{' '}
              <span className="text-amber-400">+500 productores</span> por
              menos que un café por día.
            </p>
          </div>
          <FounderSpotsRemaining />
          <ul className="space-y-2 mb-6 flex-1">
            {CONSIGNATARIA_PRO_FEATURES.map((f) => (
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
    </>
  )
}

/* ============================================================
   ENTERPRISE — visible en ambas vistas
   ============================================================ */
function EnterpriseCard() {
  return (
    <div
      className="terminal-panel flex flex-col"
      style={{ borderColor: 'rgba(56, 189, 248, 0.35)' }}
    >
      <div
        className="terminal-panel-header"
        style={{
          color: '#38bdf8',
          borderBottomColor: 'rgba(56, 189, 248, 0.25)',
        }}
      >
        Enterprise
      </div>
      <div className="px-panel py-4 flex-1 flex flex-col">
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-zinc-500 text-data">desde USD</span>
          <span
            className="text-2xl font-terminal tabular-nums"
            style={{ color: '#38bdf8' }}
          >
            99
          </span>
          <span className="text-zinc-500 text-data ml-1">/mes</span>
        </div>
        <p className="text-zinc-500 text-xxs mb-4">
          3 niveles · USD · anual –15%
        </p>
        <p className="text-zinc-500 text-data mb-4">
          API, datos y dashboards para apps, frigoríficos, bancos, traders y
          agroinsumos.
        </p>
        <ul className="space-y-2 mb-6 flex-1">
          {ENTERPRISE_FEATURES.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 text-data text-zinc-400"
            >
              <span style={{ color: '#38bdf8' }} className="mt-0.5">
                +
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/enterprise"
          className="terminal-btn w-full text-center"
          style={{
            borderColor: 'rgba(56, 189, 248, 0.6)',
            color: '#38bdf8',
          }}
        >
          Ver planes Enterprise →
        </Link>
      </div>
    </div>
  )
}
