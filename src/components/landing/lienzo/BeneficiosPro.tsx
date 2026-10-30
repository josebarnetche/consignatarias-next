import Link from 'next/link'
import { Frame } from './Frame'

const RESERVAR = 'https://calendar.app.google/gr2BXY1ooDMki8TK7'

/**
 * Los beneficios de PRO Consignataria, cada uno como un frame del lienzo con su
 * pieza visual. Cada promesa se verificó contra el código el 17-10-2026: sello ★ PRO
 * (lo "verificado" sale de reclamar el perfil, no de pagar), primera en el directorio
 * —provincias incluidas— y en el muro de la portada, remates resaltados en el
 * calendario y en sus fichas, primera en el newsletter semanal (el único canal que
 * envía de verdad, con registro de a cuántos les llegó), leads con nombre y contacto, el panel
 * "Quién te mira", widget de remates + landing /go con QR, y el cruce contra el
 * Mercado de Cañuelas SOLO para las firmas que operan ahí. La pre-oferta de lotes
 * NO va: es un piloto cerrado que se opera a mano.
 */
export default function BeneficiosPro({ citadas }: { citadas: string[] }) {
  return (
    <section id="pro" className="relative scroll-mt-20 border-y border-terminal-border">
      <div className="lienzo-puntos absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <p className="text-xxs font-medium text-accent">Formar parte · PRO Consignataria</p>
          <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight text-ink text-balance">
            Vos rematás. Que el mercado te encuentre lo hacemos nosotros.
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Ocho cosas que cambian el día que tu firma pasa a PRO.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-x-5 gap-y-12 md:grid-cols-6">
          {/* 1 — primera en el directorio */}
          <Frame nombre="01 · Primera en el directorio" className="p-6 md:col-span-4 md:row-span-2">
            <h3 className="text-2xl font-semibold text-ink">Tu firma, arriba de todo.</h3>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              Tu perfil con el sello ★ PRO, primero en el directorio —también en el de tu provincia— y en el muro de
              la portada. El productor que busca, te ve antes que al resto.
            </p>
            <ol className="mt-6 space-y-2" aria-hidden="true">
              <li className="flex items-center gap-4 rounded-lg border border-accent/40 bg-accent/[0.06] px-4 py-3">
                <span className="text-xs font-semibold tabular-nums text-accent">1</span>
                <span className="grid h-10 w-10 place-items-center rounded-md bg-accent text-xs font-bold text-white oscuro:text-zinc-950">TC</span>
                <span className="flex-1">
                  <span className="block font-semibold text-ink">Tu Consignataria</span>
                  <span className="block text-xxs text-zinc-500">3 remates este mes</span>
                </span>
                <span className="rounded-sm border border-accent/50 px-1.5 py-0.5 text-[0.625rem] font-bold text-accent">★ PRO</span>
              </li>
              {[2, 3, 4].map((n) => (
                <li key={n} className="flex items-center gap-4 px-4 py-3 opacity-70">
                  <span className="text-xs tabular-nums text-zinc-500">{n}</span>
                  <span className="h-10 w-10 rounded-md bg-zinc-800" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-2.5 w-1/2 rounded bg-zinc-800" />
                    <span className="block h-2 w-1/4 rounded bg-zinc-800/70" />
                  </span>
                </li>
              ))}
            </ol>
          </Frame>

          {/* 2 — remates destacados */}
          <Frame nombre="02 · Remates destacados" className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">Tus remates, resaltados en el calendario y en su ficha.</h3>
            <div className="mt-5 space-y-1.5 text-xs" aria-hidden="true">
              <div className="flex justify-between rounded-md px-3 py-2 text-zinc-500"><span>mar 21 · Otra firma</span><span>cría</span></div>
              <div className="flex justify-between rounded-md border border-accent/40 bg-accent/[0.07] px-3 py-2 font-medium text-ink"><span>jue 23 · Tu Consignataria</span><span className="text-accent">★</span></div>
              <div className="flex justify-between rounded-md px-3 py-2 text-zinc-500"><span>vie 24 · Otra firma</span><span>invernada</span></div>
            </div>
          </Frame>

          {/* 3 — newsletter semanal (el único canal que envía de verdad) */}
          <Frame nombre="03 · Primera en el newsletter" className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">Tus remates, primeros en el newsletter semanal.</h3>
            <div className="mt-4 space-y-1.5 rounded-md border border-terminal-border px-3 py-2.5 text-xxs" aria-hidden="true">
              <span className="block text-zinc-500">Remates de la semana</span>
              <span className="block font-medium text-ink">★ jue 23 · Tu Consignataria</span>
              <span className="block text-zinc-500">vie 24 · Otra firma</span>
            </div>
            <p className="mt-3 text-xxs text-zinc-500">Queda registrado a cuántos les llegó cada envío.</p>
          </Frame>

          {/* 4 — IAs. Desde v1.254.10 el MCP no ordena por plan: lo que PRO da acá es la
              medición (visitas desde asistentes), no un lugar en la respuesta de una IA. */}
          <Frame nombre="04 · Visitas desde las IAs" className="p-6 md:col-span-3">
            <h3 className="text-lg font-semibold text-ink">Sabé cuándo te encuentra una IA.</h3>
            <p className="mt-2 text-sm text-zinc-400">
              En tu panel ves cuántas visitas a tu ficha te llegaron desde ChatGPT, Copilot o Gemini.
            </p>
            {citadas.length > 0 && (
              <>
                <p className="mt-5 text-xxs text-zinc-500">Firmas que las IAs ya nombraron el último mes:</p>
                <div className="marquesina mt-2 overflow-hidden">
                  <div className="marquesina-pista gap-2">
                    {[...citadas, ...citadas].map((n, i) => (
                      <span key={`${n}-${i}`} className="mr-2 whitespace-nowrap rounded-md border border-terminal-border px-2.5 py-1 text-xs text-zinc-300">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Frame>

          {/* 5 — leads (la pre-oferta de lotes NO va: es un piloto cerrado, operado a mano) */}
          <Frame nombre="05 · Leads con nombre y contacto" className="p-6 md:col-span-3">
            <h3 className="text-lg font-semibold text-ink">El productor que te consulta, con nombre y contacto.</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Las consultas que entran por tu perfil y por tu página te llegan por mail y quedan en tu panel, con el
              teléfono o el email que dejó el productor.
            </p>
            <div className="mt-5 flex items-center gap-3" aria-hidden="true">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-400">JP</span>
              <span className="flex-1 space-y-1 text-xxs">
                <span className="block text-zinc-300">Juan P. · 60 novillitos para invernada</span>
                <span className="block font-medium text-positive">Nueva consulta · desde tu perfil</span>
              </span>
            </div>
          </Frame>

          {/* 6 — panel "Quién te mira" (sin ubicación geográfica ni identidad del visitante) */}
          <Frame nombre="06 · Quién te mira" className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">Cuántos te miran, qué día y por dónde llegan.</h3>
            <div className="mt-5 flex h-16 items-end gap-1" aria-hidden="true">
              {[30, 45, 38, 60, 52, 75, 68, 90, 82, 100].map((h, i) => (
                <span key={i} className="flex-1 rounded-sm bg-accent/70" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="mt-3 text-xxs text-zinc-500">Google · el calendario · el directorio · una IA · directo o QR</p>
          </Frame>

          {/* 7 — widget + landing con QR (la landing existe para toda firma reclamada; PRO le suma logo, sello y consultas) */}
          <Frame nombre="07 · Widget + landing con QR" className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">Tus remates en tu web, y tu página con QR para el catálogo.</h3>
            <div className="mt-4 grid w-16 grid-cols-5 gap-0.5" aria-hidden="true">
              {'1110110101011101010111011'.split('').map((b, i) => (
                <span key={i} className={`aspect-square ${b === '1' ? 'bg-ink' : ''}`} />
              ))}
            </div>
            <p className="mt-3 text-xxs text-zinc-500">Con PRO, tu página muestra tu logo y el sello, y recibe consultas.</p>
          </Frame>

          {/* 8 — Cañuelas: SOLO para firmas que operan en el Mercado Agroganadero */}
          <Frame nombre="08 · Contra el Mercado de Cañuelas" className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">Si operás en Cañuelas, tu negocio contra las otras casas.</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Tu cartera de remitentes, tu precio contra el promedio de las 22 casas, tu cuota y tu puesto.
            </p>
          </Frame>

        </div>

        {/* El CTA de PRO: grande y centrado, no un cuadrito al costado (pedido de Jose). */}
        <div className="frame frame-activo relative mx-auto mt-24 max-w-4xl rounded-3xl border-2 border-accent bg-terminal-panel px-6 py-14 text-center sm:px-14 sm:py-16 shadow-2xl shadow-accent/10">
          <span className="frame-nombre" aria-hidden="true"># PRO Consignataria</span>
          <p className="text-sm font-semibold text-accent">PRO Consignataria</p>
          <h3 className="mx-auto mt-4 max-w-2xl text-3xl sm:text-5xl font-semibold tracking-tight text-ink text-balance">
            Que el próximo productor que busque, te encuentre a vos.
          </h3>
          <p className="mt-8 whitespace-nowrap text-5xl sm:text-7xl font-semibold tracking-tight tabular-nums text-ink">
            ARS 45.000<span className="text-2xl font-normal text-zinc-500">/mes</span>
          </p>
          <p className="mt-3 text-sm text-zinc-500">Facturación mensual en pesos · sin permanencia · se cancela cuando quieras</p>

          <ul className="mx-auto mt-10 grid max-w-2xl gap-x-8 gap-y-3 text-left text-sm text-zinc-300 sm:grid-cols-2">
            {[
              'Sello ★ PRO en tu perfil',
              'Primera en el directorio y en el muro de la portada',
              'Remates resaltados en el calendario y en sus fichas',
              'Primera en el newsletter semanal, con registro de envíos',
              'Leads con nombre y contacto, por mail y en tu panel',
              'Quién te mira: vistas por día y por dónde llegan',
              'Widget de remates y página con QR',
              'Cruce contra el Mercado de Cañuelas, si operás ahí',
            ].map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span className="mt-0.5 font-bold text-accent" aria-hidden="true">✓</span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/planes#consignataria"
              className="w-full sm:w-auto rounded-xl bg-accent px-12 py-5 text-lg font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright transition-colors shadow-lg shadow-accent/25"
            >
              Activar PRO →
            </Link>
            <a
              href={RESERVAR}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto rounded-xl border border-zinc-700 px-8 py-5 text-base text-zinc-200 hover:border-accent hover:text-accent transition-colors"
            >
              Reservar una reunión
            </a>
          </div>
          <p className="mt-6 text-xs text-zinc-500">
            +1 millón de impresiones en Google desde marzo de 2026.
          </p>
          <span className="frame-sel" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    </section>
  )
}
