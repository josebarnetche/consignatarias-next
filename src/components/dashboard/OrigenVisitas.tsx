import { Eye } from 'lucide-react'
import {
  DIAS_SEMANA,
  ORIGEN_LABEL,
  SECCION_LABEL,
  type OrigenVisitas as Datos,
} from '@/lib/reports/origen-visitas'

/**
 * "Quién te mira, cuándo y desde dónde" — el bloque de analytics del perfil.
 *
 * Es la promesa 06 de PRO Consignataria. Cada número sale de una tabla que se puede
 * auditar (`profile_views`, `ai_referrals`); lo que no se mide no se muestra: las
 * vistas de antes del 17-10-2026 no tienen origen y se dicen "sin dato", no se
 * reparten.
 */

function fmtDia(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export default function OrigenVisitas({ d }: { d: Datos }) {
  const max = Math.max(1, ...d.porDia.map((x) => x.vistas))
  const conOrigen = d.porOrigen.reduce((a, b) => a + b.vistas, 0)

  return (
    <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Eye className="h-3.5 w-3.5 text-accent" />
        <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">
          Quién te mira · últimos 30 días
        </h3>
      </div>

      {/* CUÁNDO */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-terminal tabular-nums font-bold text-zinc-100">
          {d.total.toLocaleString('es-AR')}
        </span>
        <span className="text-xs font-terminal text-zinc-500">
          vistas de tu perfil
          {d.diaFuerte !== null && <> · el día que más te miran es el {DIAS_SEMANA[d.diaFuerte]}</>}
        </span>
      </div>
      <div className="mt-3 flex h-16 items-end gap-px" role="img" aria-label="Vistas por día, últimos 30 días">
        {d.porDia.map((x) => (
          <span
            key={x.dia}
            title={`${fmtDia(x.dia)}: ${x.vistas} ${x.vistas === 1 ? 'vista' : 'vistas'}`}
            className={`flex-1 rounded-sm ${x.vistas > 0 ? 'bg-accent/70' : 'bg-zinc-800'}`}
            style={{ height: `${Math.max(4, (x.vistas / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-terminal text-zinc-600">
        <span>{fmtDia(d.porDia[0].dia)}</span>
        <span>hoy</span>
      </div>

      {/* DESDE DÓNDE */}
      <div className="mt-4 border-t border-terminal-border pt-3">
        <p className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">Desde dónde llegan</p>
        {conOrigen === 0 ? (
          <p className="text-xs text-zinc-500">
            Todavía no hay visitas con origen registrado. El origen se mide desde el 17 de octubre de 2026.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {d.porOrigen.map((o) => (
              <li key={o.origen} className="flex items-center gap-3 text-xs">
                <span className="w-44 shrink-0 text-zinc-300">{ORIGEN_LABEL[o.origen]}</span>
                <span className="h-2 flex-1 rounded-sm bg-zinc-800">
                  <span
                    className="block h-2 rounded-sm bg-accent/70"
                    style={{ width: `${(o.vistas / conOrigen) * 100}%` }}
                  />
                </span>
                <span className="w-10 text-right font-terminal tabular-nums text-zinc-400">{o.vistas}</span>
              </li>
            ))}
          </ul>
        )}
        {d.porSeccion.length > 0 && (
          <p className="mt-2 text-xxs text-zinc-500">
            Dentro del sitio:{' '}
            {d.porSeccion.map((s) => `${SECCION_LABEL[s.seccion]} (${s.vistas})`).join(' · ')}
          </p>
        )}
        {d.sinDato > 0 && (
          <p className="mt-2 text-[10px] text-zinc-600">
            {d.sinDato.toLocaleString('es-AR')} {d.sinDato === 1 ? 'vista es' : 'vistas son'} de antes de que midiéramos
            el origen y no se reparten.
          </p>
        )}
      </div>

      {/* LAS IAs */}
      <div className="mt-4 border-t border-terminal-border pt-3">
        <p className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          Desde asistentes de IA · últimos 90 días
        </p>
        {d.iasTotal === 0 ? (
          <p className="text-xs text-zinc-500">
            Ninguna visita a tu ficha llegó todavía desde ChatGPT, Copilot, Gemini u otra IA.
          </p>
        ) : (
          <>
            <p className="text-xs text-zinc-300">
              <span className="font-terminal tabular-nums text-zinc-100">{d.iasTotal}</span>{' '}
              {d.iasTotal === 1 ? 'persona llegó' : 'personas llegaron'} a tu ficha desde la respuesta de una IA.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {d.ias.map((m) => (
                <span key={m.motor} className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-400">
                  {m.motor} · {m.visitas}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-[10px] leading-snug text-zinc-600">
        Una visita anónima no tiene nombre: el quién con nombre y teléfono son tus leads.
        No contamos robots ni buscadores que rastrean el sitio.
      </p>
    </div>
  )
}
