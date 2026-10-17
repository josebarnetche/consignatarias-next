import Link from 'next/link'
import { Frame } from './Frame'
import { CANAL_LABEL, CANALES } from '@/lib/promotion'

const RESERVAR = 'https://calendar.app.google/gr2BXY1ooDMki8TK7'

/**
 * Los beneficios de PRO Consignataria, cada uno como un frame del lienzo con su
 * pieza visual. Todo lo que se promete existe en el producto (ver /planes →
 * 'Consignataria (alcance)': difusión por email, pre-oferta con video y leads,
 * perfil verificado y destacado, analytics de perfil, landing propia + QR). Los
 * canales de difusión salen de lib/promotion (lo que se registra de verdad).
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
              Perfil verificado con el sello ★ PRO, primero en el directorio, en el muro de la home y en las fichas de
              remate. El productor que busca, te ve antes que al resto.
            </p>
            <ol className="mt-6 space-y-2" aria-hidden="true">
              <li className="flex items-center gap-4 rounded-lg border border-accent/40 bg-accent/[0.06] px-4 py-3">
                <span className="text-xs font-semibold tabular-nums text-accent">1</span>
                <span className="grid h-10 w-10 place-items-center rounded-md bg-accent text-xs font-bold text-white oscuro:text-zinc-950">TC</span>
                <span className="flex-1">
                  <span className="block font-semibold text-ink">Tu Consignataria</span>
                  <span className="block text-xxs text-zinc-500">Verificada · 3 remates este mes</span>
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
            <h3 className="text-lg font-semibold text-ink">Tus remates, resaltados en el calendario.</h3>
            <div className="mt-5 space-y-1.5 text-xs" aria-hidden="true">
              <div className="flex justify-between rounded-md px-3 py-2 text-zinc-500"><span>mar 21 · Otra firma</span><span>cría</span></div>
              <div className="flex justify-between rounded-md border border-accent/40 bg-accent/[0.07] px-3 py-2 font-medium text-ink"><span>jue 23 · Tu Consignataria</span><span className="text-accent">★</span></div>
              <div className="flex justify-between rounded-md px-3 py-2 text-zinc-500"><span>vie 24 · Otra firma</span><span>invernada</span></div>
            </div>
          </Frame>

          {/* 3 — difusión auditada */}
          <Frame nombre="03 · Difusión que se puede auditar" className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">Tu remate llega al productor, y sabés a cuántos.</h3>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {CANALES.map((c) => (
                <li key={c} className="rounded-full border border-terminal-border px-2.5 py-1 text-xxs text-zinc-400">
                  {CANAL_LABEL[c]}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xxs text-zinc-500">Se registran los envíos que salieron, no el tamaño de la lista.</p>
          </Frame>

          {/* 4 — IAs */}
          <Frame nombre="04 · En la respuesta de las IAs" className="p-6 md:col-span-3">
            <h3 className="text-lg font-semibold text-ink">Aparecé cuando el productor le pregunta a una IA.</h3>
            <p className="mt-2 text-sm text-zinc-400">
              ChatGPT, Copilot y los agentes consultan nuestro dato del mercado. Las firmas con la ficha completa son
              las que nombran.
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

          {/* 5 — pre-oferta */}
          <Frame nombre="05 · Pre-oferta" className="p-6 md:col-span-3">
            <h3 className="text-lg font-semibold text-ink">Tus lotes con video, ofertados antes del remate.</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Publicás los lotes con su video y el interesado deja su oferta y su contacto. Llegás al martillo con
              compradores ya identificados.
            </p>
            <div className="mt-5 flex items-center gap-3" aria-hidden="true">
              <span className="grid h-14 w-20 place-items-center rounded-md bg-zinc-800">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-zinc-500"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
              </span>
              <span className="flex-1 space-y-1.5 text-xxs">
                <span className="block text-zinc-300">Lote 4 · 60 novillitos · 280 kg</span>
                <span className="block font-medium text-positive">2 ofertas nuevas</span>
              </span>
            </div>
          </Frame>

          {/* 6 — analytics */}
          <Frame nombre="06 · Analytics de tu perfil" className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">Quién te mira, cuándo y desde dónde.</h3>
            <div className="mt-5 flex h-16 items-end gap-1" aria-hidden="true">
              {[30, 45, 38, 60, 52, 75, 68, 90, 82, 100].map((h, i) => (
                <span key={i} className="flex-1 rounded-sm bg-accent/70" style={{ height: `${h}%` }} />
              ))}
            </div>
          </Frame>

          {/* 7 — landing + QR */}
          <Frame nombre="07 · Landing propia + QR" className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">Tu página para compartir, con QR para el catálogo y la feria.</h3>
            <div className="mt-4 grid w-16 grid-cols-5 gap-0.5" aria-hidden="true">
              {'1110110101011101010111011'.split('').map((b, i) => (
                <span key={i} className={`aspect-square ${b === '1' ? 'bg-ink' : ''}`} />
              ))}
            </div>
          </Frame>

          {/* 8 — precio */}
          <Frame nombre="08 · Sin permanencia" activo className="p-6 md:col-span-2 border-accent/50">
            <p className="text-xxs font-medium text-accent">PRO Consignataria</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">
              ARS 45.000<span className="text-base font-normal text-zinc-500">/mes</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">Facturación mensual en pesos. Se cancela cuando quieras.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/planes#consignataria"
                className="rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright transition-colors"
              >
                Activar PRO →
              </Link>
              <a
                href={RESERVAR}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-700 px-4 py-3 text-center text-sm text-zinc-200 hover:border-accent hover:text-accent transition-colors"
              >
                Reservar una reunión
              </a>
            </div>
          </Frame>
        </div>
      </div>
    </section>
  )
}
