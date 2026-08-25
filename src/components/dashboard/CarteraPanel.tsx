import { AlertTriangle, UserPlus, Trophy, Users } from 'lucide-react'
import type { Cartera } from '@/lib/reports/cartera'

/**
 * "Tu cartera" — el bloque que hace que valga la pena abrir el panel un martes.
 *
 * El resto del sistema le cuenta a la firma qué pasó en el sitio. Esto le cuenta qué
 * pasó en SU negocio: quién dejó de consignarle, a quién le sacó un cliente a la
 * competencia y de quién depende demasiado.
 *
 * Es lo único que su propio CRM no puede darle. Su sistema sabe a quién le facturó;
 * no sabe que el productor que dejó de llamarla está vendiendo en la casa de al lado.
 *
 * ORDEN DELIBERADO: primero lo que hay que hacer HOY (llamar a los que se están
 * yendo), después lo bueno, después el contexto. Un panel que arranca con una
 * felicitación no se vuelve a abrir.
 */

const num = (n: number) => n.toLocaleString('es-AR')

function Seccion({
  icono: Icono,
  titulo,
  color,
  children,
}: {
  icono: typeof Users
  titulo: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-2 flex items-center gap-2">
        <Icono className={`h-3.5 w-3.5 ${color}`} />
        <h4 className="text-xxs font-terminal uppercase tracking-widest text-zinc-400">{titulo}</h4>
      </div>
      {children}
    </div>
  )
}

export default function CarteraPanel({ c }: { c: Cartera }) {
  return (
    <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">
          Tu cartera en el Mercado
        </h3>
        <span className="text-xxs font-terminal text-zinc-600">
          Cañuelas · últimos {c.dias} días
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-300">
          {num(c.totalClientes)} remitentes
        </span>
        <span className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-300">
          {num(c.cabezas)} cabezas
        </span>
        <span
          className={`rounded px-2 py-1 text-xxs font-terminal ${
            c.concentracionTop5 > 50 ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-800/60 text-zinc-300'
          }`}
          title="Cuánto de tu volumen depende de tus 5 clientes más grandes"
        >
          Top 5 = {c.concentracionTop5}% del volumen
        </span>
      </div>

      {/* 1 · LO URGENTE */}
      {c.enRiesgo.length > 0 && (
        <Seccion icono={AlertTriangle} titulo={`Hace tiempo que no te consignan (${c.enRiesgo.length})`} color="text-amber-400">
          <ul className="space-y-1.5">
            {c.enRiesgo.slice(0, 8).map((r) => (
              <li
                key={r.nombre}
                className="rounded-terminal border border-amber-500/20 bg-amber-500/5 px-2.5 py-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-sm font-medium text-zinc-100">{r.nombre}</span>
                  <span className="font-terminal tabular-nums text-xs text-zinc-400">
                    {num(r.cabezas)} cab
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                  {r.localidad ? `${r.localidad} · ` : ''}
                  venía consignando cada {r.cadenciaDias} días; hace {r.diasSilencio} que no
                  opera con vos.
                  {r.seFueA ? (
                    <span className="text-negative"> Su última operación fue en {r.seFueA}.</span>
                  ) : (
                    <span className="text-zinc-500"> Puede que no tenga hacienda lista.</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          {c.enRiesgo.length > 8 && (
            <p className="mt-1.5 text-[10px] font-terminal text-zinc-600">
              y {c.enRiesgo.length - 8} más.
            </p>
          )}
        </Seccion>
      )}

      {/* 2 · LO GANADO */}
      {c.ganados.length > 0 && (
        <Seccion icono={UserPlus} titulo={`Le sacaste a la competencia (${c.ganados.length})`} color="text-positive">
          <ul className="space-y-1">
            {c.ganados.slice(0, 5).map((g) => (
              <li key={g.nombre} className="flex flex-wrap items-baseline gap-x-2 text-xs text-zinc-400">
                <span className="text-zinc-200">{g.nombre}</span>
                <span className="font-terminal tabular-nums text-zinc-500">{num(g.cabezas)} cab</span>
                <span className="text-zinc-600">← venía de {g.veniaDe}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {/* 3 · CONTEXTO */}
      {c.top.length > 0 && (
        <Seccion icono={Trophy} titulo="Tus mayores remitentes" color="text-amber-400">
          <ul className="space-y-1">
            {c.top.slice(0, 5).map((t) => (
              <li key={t.nombre} className="flex flex-wrap items-baseline gap-x-2 text-xs text-zinc-400">
                <span className="text-zinc-200">{t.nombre}</span>
                <span className="font-terminal tabular-nums text-zinc-500">
                  {num(t.cabezas)} cab · {t.pctDelVolumen}%
                </span>
                {t.localidad && <span className="text-zinc-600">{t.localidad}</span>}
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {c.nuevos.length > 0 && (
        <p className="mt-4 text-xs text-zinc-500">
          <span className="text-zinc-300">{c.nuevos.length}</span> remitentes te consignaron por
          primera vez en la ventana, sin registro previo con ninguna casa del Mercado.
        </p>
      )}

      <p className="mt-3 text-[10px] leading-snug text-zinc-600">
        Sale de las operaciones publicadas del Mercado Agroganadero, cruzando todas las
        casas. La lista de silencios compara a cada remitente contra <em>su propio</em> ritmo —y pide
        al menos un mes— así que un criador que vende una vez al año no aparece acá por
        estar seis meses sin operar. Un silencio no prueba que el cliente se haya ido:
        sólo cuando el Mercado lo muestra operando en otra casa se dice cuál. La ventana del Mercado es de unos tres meses:
        alcanza para ver ritmos cortos, no para probar que un cliente es nuevo de verdad.
      </p>
    </div>
  )
}
