import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { esAdmin } from '@/lib/propuesta/admin'
import PreofertasManager from '@/components/dashboard/PreofertasManager'
import OrigenVisitas from '@/components/dashboard/OrigenVisitas'
import CarteraPanel from '@/components/dashboard/CarteraPanel'
import BenchmarkMercado from '@/components/dashboard/BenchmarkMercado'
import { CARTERA_MUESTRA, BENCHMARK_MUESTRA, ORIGEN_VISITAS_MUESTRA } from '@/lib/reports/muestras'
import { PREOFERTA_EJEMPLO, OFERTAS_EJEMPLO, LEADS_EJEMPLO } from '@/lib/propuesta/muestras'
import ResultadoVsMercado from '@/components/dashboard/ResultadoVsMercado'
import { RESULTADO_VS_MERCADO_MUESTRA } from '@/lib/reports/muestras'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Capturas del panel para la presentación PDF (17-10-2026). Sólo admin.
 *
 * El PDF de la propuesta no puede renderizar componentes de React del sitio: necesita
 * imágenes. Esta página monta cada bloque del panel con datos de EJEMPLO a un ancho
 * fijo, y `scripts/propuesta-capturas.mjs` les saca foto a 2x y las guarda en
 * src/lib/pdf/propuesta/capturas/. Si cambia el panel, se corre el script de nuevo.
 */
function Bloque({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section data-captura={id} className="w-[880px] bg-terminal-bg p-6">
      <div className="pointer-events-none select-none">{children}</div>
    </section>
  )
}

export default async function CapturasPage() {
  if (!(await esAdmin())) notFound()
  return (
    <div className="capturas-root space-y-10 bg-terminal-panel p-10">
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.removeAttribute('data-theme')` }} />
      <style
        dangerouslySetInnerHTML={{
          __html: `body:has(.capturas-root) .fixed, body:has(.capturas-root) [class*='fixed'], nextjs-portal { display: none !important; }`,
        }}
      />

      <Bloque id="preoferta">
        <PreofertasManager slug="ejemplo" esPro inicial={[PREOFERTA_EJEMPLO]} ofertas={OFERTAS_EJEMPLO} />
      </Bloque>

      <Bloque id="consultas">
        <h2 className="text-lg font-semibold text-zinc-100">Leads · quién te buscó</h2>
        <p className="mb-3 text-sm text-zinc-400">Productores que dejaron sus datos o te contactaron desde tu perfil.</p>
        <ul className="divide-y divide-terminal-border rounded-terminal border border-terminal-border bg-terminal-panel text-sm">
          {LEADS_EJEMPLO.map(([nombre, contacto, msg, cuando]) => (
            <li key={nombre} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-ink">{nombre}</span>
                <span className="text-xs text-zinc-500">{cuando}</span>
              </div>
              <p className="text-xs font-semibold text-accent">{contacto}</p>
              <p className="mt-1 text-xs text-zinc-400">{msg}</p>
            </li>
          ))}
        </ul>
      </Bloque>

      <Bloque id="visitas">
        <OrigenVisitas d={ORIGEN_VISITAS_MUESTRA} />
      </Bloque>

      <Bloque id="precio">
        <ResultadoVsMercado resultados={RESULTADO_VS_MERCADO_MUESTRA} />
      </Bloque>

      <Bloque id="mercado">
        <CarteraPanel c={CARTERA_MUESTRA} />
        <BenchmarkMercado b={BENCHMARK_MUESTRA} />
      </Bloque>
    </div>
  )
}
