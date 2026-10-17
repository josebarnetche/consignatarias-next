'use client'

import { useState } from 'react'
import { Frame } from './Frame'

export type ItemMapa = { nombre: string; href: string; dato?: string; detalle: string }
export type GrupoMapa = { id: string; nombre: string; bajada: string; items: ItemMapa[] }

/**
 * Todo el sitio en un lienzo, como un archivo de Figma: a la izquierda las "páginas"
 * (grupos), a la derecha los frames de la página elegida. Cada frame es una sección
 * real con su dato del día y su enlace. Todos los enlaces quedan en el HTML (los
 * grupos inactivos van ocultos con `hidden`, no se desmontan) para que el rastreador
 * reparta autoridad desde la home a cada sección.
 */
export default function MapaDelSitio({ grupos }: { grupos: GrupoMapa[] }) {
  const [activo, setActivo] = useState(grupos[0]?.id)
  const total = grupos.reduce((n, g) => n + g.items.length, 0)

  return (
    <section id="todo-el-sitio" className="max-w-7xl mx-auto px-6 pt-28 pb-12 scroll-mt-20">
      <div className="max-w-3xl">
        <p className="text-xxs font-medium text-accent">Todo lo que hay adentro</p>
        <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight text-ink text-balance">
          {total} herramientas del mercado ganadero. Abiertas.
        </h2>
        <p className="mt-4 text-lg text-zinc-400">
          Precios, remates, campos, sanidad y datos para empresas. Para el productor, gratis.
        </p>
      </div>

      <div className="mt-12 overflow-hidden rounded-2xl border border-terminal-border bg-terminal-panel md:grid md:grid-cols-[220px_1fr]">
        {/* Panel de páginas */}
        <div className="border-b border-terminal-border md:border-b-0 md:border-r">
          <p className="hidden px-4 pt-4 pb-2 text-xxs font-semibold text-zinc-500 md:block">Páginas</p>
          <div role="tablist" aria-label="Secciones del sitio" className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:p-2 md:pt-0">
            {grupos.map((g) => {
              const on = g.id === activo
              return (
                <button
                  key={g.id}
                  role="tab"
                  type="button"
                  aria-selected={on}
                  aria-controls={`mapa-${g.id}`}
                  onClick={() => setActivo(g.id)}
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    on ? 'bg-accent/10 font-medium text-accent' : 'text-zinc-400 hover:bg-zinc-900 hover:text-ink'
                  }`}
                >
                  <span className="whitespace-nowrap">{g.nombre}</span>
                  <span className={`text-xxs tabular-nums ${on ? 'text-accent' : 'text-zinc-500'}`}>{g.items.length}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Lienzo */}
        <div className="relative min-h-[420px]">
          <div className="lienzo-puntos absolute inset-0" aria-hidden="true" />
          {grupos.map((g) => (
            <div
              key={g.id}
              id={`mapa-${g.id}`}
              role="tabpanel"
              hidden={g.id !== activo}
              className="relative p-6 pt-10 sm:p-8 sm:pt-12"
            >
              <p className="mb-10 text-sm text-zinc-500">{g.bajada}</p>
              <div className="grid grid-cols-1 gap-x-5 gap-y-11 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((it) => (
                  <Frame key={it.href} nombre={it.nombre} href={it.href} className="group p-5 hover:-translate-y-0.5 transition-transform">
                    {it.dato && <p className="text-2xl font-semibold tabular-nums text-ink">{it.dato}</p>}
                    <p className={`${it.dato ? 'mt-1' : ''} text-sm leading-relaxed text-zinc-400`}>{it.detalle}</p>
                    <p className="mt-4 text-xs font-medium text-accent opacity-80 group-hover:opacity-100">
                      Abrir <span aria-hidden="true">→</span>
                    </p>
                  </Frame>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
