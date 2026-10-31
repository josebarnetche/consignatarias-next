import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { ALCANCE_GOOGLE } from '@/lib/data/alcance-google'

/**
 * Para empresas — la puerta única de lo que se paga (revisión de navegabilidad del
 * 17-10-2026). Antes había cinco páginas de venta sueltas (/pro, /para-consignatarias,
 * /enterprise, /mcp, /licencia-datos) sin un lugar que las ordenara. Esta las agrupa en
 * tres entradas según quién compra: la firma, quien usa el dato, y la institución.
 * Precios: los mismos de /planes (PRO Consignataria ARS 45.000/mes; API desde ARS 74.000).
 */
export const metadata: Metadata = {
  title: 'Para empresas: consignatarias, datos por API y uso institucional',
  description:
    'PRO Consignataria para firmas (ARS 45.000/mes), el dato del mercado ganadero por API y servidor MCP, e informes y licencia de datos para instituciones.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/para-empresas' },
}

const ENTRADAS = [
  {
    id: 'firma',
    kicker: 'Para tu firma',
    titulo: 'PRO Consignataria',
    texto: `Tu consignataria y tus remates, primero: tu firma primera en el directorio con el sello ★ PRO, remates resaltados en el calendario y primeros en el newsletter semanal y las consultas de productores con nombre y contacto. El sitio tuvo más de ${Math.floor(ALCANCE_GOOGLE.impresiones / 1_000_000)} millón de impresiones en Google desde marzo de 2026.`,
    precio: 'ARS 45.000/mes · sin permanencia',
    cta: { label: 'Ver PRO Consignataria', href: '/para-consignatarias' },
    links: [
      { label: 'Activar PRO', href: '/planes#consignataria' },
      { label: 'Guía: cómo abrir una consignataria', href: '/como-abrir-una-consignataria' },
    ],
  },
  {
    id: 'datos',
    kicker: 'Para quien usa el dato',
    titulo: 'Datos por API y MCP',
    texto:
      'El Valor de Referencia, el INMAG desde 2015, la dispersión de precios y el calendario de remates, dentro de tu sistema. Para bancos, aseguradoras, agtech, frigoríficos y agentes de IA. El servidor MCP es gratis para consultar.',
    precio: 'API desde ARS 74.000/mes · MCP gratis',
    cta: { label: 'Ver planes de API', href: '/enterprise' },
    links: [
      { label: 'Servidor MCP', href: '/mcp' },
      { label: 'Documentación de la API', href: '/api-docs' },
    ],
  },
  {
    id: 'institucional',
    kicker: 'Para instituciones',
    titulo: 'Informes y licencia de datos',
    texto:
      'El dato de una zona en un informe listo para presentar, y las condiciones para citar o redistribuir el dato del sitio en publicaciones, reportes o productos propios.',
    precio: 'A medida',
    cta: { label: 'Informes por zona', href: '/informes' },
    links: [
      { label: 'Licencia de datos', href: '/licencia-datos' },
      { label: 'Acceso institucional', href: '/enterprise#acceso-institucional' },
    ],
  },
]

export default function ParaEmpresasPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      <Breadcrumb items={[{ name: 'Para empresas' }]} />

      <header className="mt-4 mb-10 max-w-3xl">
        <p className="text-xxs uppercase tracking-widest text-accent mb-2">Para empresas</p>
        <h1 className="text-2xl sm:text-4xl font-semibold text-ink text-balance">
          El mercado ganadero, para tu firma, tu sistema o tu institución
        </h1>
        <p className="mt-3 text-zinc-400">
          Para el productor el sitio es gratis. Esto es lo que se paga, ordenado por quién lo usa.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {ENTRADAS.map((e, i) => (
          <section
            key={e.id}
            id={e.id}
            className={`flex flex-col rounded-terminal border bg-terminal-panel p-6 scroll-mt-24 ${
              i === 0 ? 'border-accent/50' : 'border-terminal-border'
            }`}
          >
            <p className="text-xxs font-medium text-accent">{e.kicker}</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">{e.titulo}</h2>
            <p className="mt-3 flex-1 text-data leading-relaxed text-zinc-400">{e.texto}</p>
            <p className="mt-5 text-sm font-semibold tabular-nums text-ink">{e.precio}</p>
            <Link
              href={e.cta.href}
              className={`mt-4 rounded-terminal px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                i === 0
                  ? 'bg-accent text-white oscuro:text-zinc-950 hover:bg-accent-bright'
                  : 'border border-zinc-700 text-zinc-200 hover:border-accent hover:text-accent'
              }`}
            >
              {e.cta.label} →
            </Link>
            <ul className="mt-4 space-y-1.5">
              {e.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-xs text-zinc-400 hover:text-accent underline-offset-2 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
