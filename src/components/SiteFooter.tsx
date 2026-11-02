import Link from "next/link";

/**
 * EL footer del sitio — uno solo para el terminal (layout de `(terminal)`) y la portada.
 *
 * Hasta la v1.255.1 había dos: el SystemFooter del terminal (sitemap en 4 columnas) y uno
 * propio de la portada con 15 enlaces sueltos, cada uno con su criterio. Ahora los dos
 * pintan este componente, igual que el menú lee de `src/lib/nav.ts`.
 *
 * Reglas:
 * - Las guías van agrupadas por tema (Vender, Campos, Sanidad, Glosario), no en una lista
 *   plana: el footer sale en ~2.700 páginas y es el enlazado interno más barato que hay.
 * - Afuera a propósito: Preofertas (piloto cerrado el 16-07-2026), Upgrade (301 a /planes)
 *   y Manifiesto / El Oráculo (no es una puerta para el productor).
 * - Sin hooks: lo renderiza un layout de cliente y una página de servidor. El modo
 *   compacto (/overview, solo la línea de base) lo decide quien lo usa.
 * - Colores con tokens: el logo usa `fill-ink` / `fill-accent` para que responda al tema.
 */

interface FooterLink {
  label: string;
  href: string;
}
interface FooterGroup {
  /** Subtítulo dentro de una columna (las guías por tema). */
  titulo?: string;
  links: FooterLink[];
}
interface FooterColumn {
  title: string;
  /** Datos lleva más peso visual. */
  emphasis?: boolean;
  /** Ocupa dos columnas en pantallas anchas. */
  ancha?: boolean;
  groups: FooterGroup[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Datos",
    emphasis: true,
    groups: [
      {
        links: [
          { label: "Precio por categoría y peso", href: "/vr" },
          { label: "Cuánto vale mi hacienda", href: "/valuar-hacienda" },
          { label: "INMAG hoy", href: "/mercado/inmag" },
          { label: "Novillo en dólares", href: "/mercado/novillo-historico" },
          { label: "Precios hoy", href: "/precios" },
          { label: "Hacienda en pie", href: "/precios/hacienda-en-pie" },
          { label: "Maíz / Novillo", href: "/mercado/spread" },
          { label: "Categorías", href: "/mercado" },
          // Anchor exacto en ~2.700 páginas: la señal interna más barata para la búsqueda madre.
          { label: "Índice novillo arrendamiento", href: "/mercado/arrendamiento" },
          { label: "Valor de la hectárea", href: "/campos/valuar" },
        ],
      },
    ],
  },
  {
    title: "Producto",
    groups: [
      {
        links: [
          { label: "Remates", href: "/remates" },
          { label: "Consignatarias", href: "/consignatarias" },
          { label: "Frigoríficos", href: "/frigorificos" },
          { label: "Proveedores", href: "/proveedores" },
          { label: "Panel", href: "/overview" },
          { label: "Calculadora", href: "/calculadora" },
          { label: "Comparar", href: "/comparar" },
          { label: "Exportar", href: "/exportar" },
          { label: "Calendario", href: "/calendario-exportar" },
          { label: "Mi Ganado", href: "/mi-ganado" },
          { label: "Campos", href: "/campos" },
          { label: "Publicar un campo", href: "/campos/publicar" },
          { label: "DT-e", href: "/dte" },
          { label: "Planes", href: "/planes" },
        ],
      },
    ],
  },
  {
    title: "Guías",
    ancha: true,
    groups: [
      {
        titulo: "Vender",
        links: [
          { label: "Cómo vender hacienda", href: "/como-vender-hacienda" },
          { label: "Remate, directa o consignación", href: "/vender-en-remate-vs-venta-directa-vs-consignacion" },
          { label: "Cómo leer una liquidación", href: "/como-leer-una-liquidacion-de-hacienda" },
          { label: "Comisión de una consignataria", href: "/cuanto-cobra-de-comision-una-consignataria" },
          { label: "Precio de tranquera", href: "/precio-de-tranquera" },
        ],
      },
      {
        titulo: "Campos",
        links: [
          { label: "Cómo comprar un campo", href: "/como-comprar-un-campo" },
          { label: "Cómo vender un campo", href: "/como-vender-un-campo" },
          { label: "Cómo se tasa un campo", href: "/como-se-tasa-un-campo" },
          { label: "Cómo se calcula el canon", href: "/como-se-calcula-el-canon-de-arrendamiento" },
        ],
      },
      {
        titulo: "Sanidad",
        links: [
          { label: "Calendario sanitario bovino", href: "/calendario-sanitario-bovino" },
          { label: "Qué es el RENSPA", href: "/que-es-el-renspa" },
          { label: "Qué es el DT-e", href: "/que-es-el-dte" },
          { label: "Buenas prácticas", href: "/buenas-practicas" },
        ],
      },
      {
        titulo: "Glosario",
        links: [
          { label: "Glosario ganadero", href: "/glosario" },
          { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
          { label: "Todas las guías", href: "/guias" },
        ],
      },
    ],
  },
  {
    title: "Empresa",
    groups: [
      {
        links: [
          { label: "Quiénes somos", href: "/quienes-somos" },
          { label: "Metodología", href: "/metodologia" },
          { label: "Calidad de datos", href: "/calidad" },
          { label: "El Corredor", href: "/el-corredor" },
          { label: "Parte semanal", href: "/informes/parte-semanal" },
          { label: "Para empresas", href: "/para-empresas" },
          { label: "API", href: "/api-docs" },
          { label: "MCP para IAs", href: "/mcp" },
          { label: "Acceso institucional", href: "/enterprise#acceso-institucional" },
          // Red de dominios de Memola (GSC 16-09-2026): la.com.ar, bovinos, ganado y semen tienen sus
          // páginas en "URL is unknown to Google" / "Discovered - not indexed" porque ningún sitio
          // rastreado las enlaza. Este footer sale en ~2.700 páginas que Google recorre a diario.
          { label: "LA CADENA — tokenización", href: "https://la.com.ar/" },
          { label: "bovinos.com.ar", href: "https://bovinos.com.ar/" },
          { label: "ganado.com.ar", href: "https://ganado.com.ar/" },
          { label: "semen.com.ar", href: "https://semen.com.ar/" },
          { label: "Memola Medios", href: "https://memola.com.ar/" },
        ],
      },
    ],
  },
  {
    title: "Legal",
    groups: [
      {
        links: [
          { label: "Términos", href: "/terminos" },
          { label: "Privacidad", href: "/privacidad" },
          { label: "Aviso legal", href: "/aviso-legal" },
          { label: "Botón de arrepentimiento", href: "/arrepentimiento" },
        ],
      },
    ],
  },
];

const SHARE_HREF = `https://wa.me/?text=${encodeURIComponent(
  "Mirá este calendario de remates ganaderos: https://www.consignatarias.com.ar/remates"
)}`;

function FooterAnchor({ link, emphasis }: { link: FooterLink; emphasis?: boolean }) {
  const className = `text-xxs font-terminal motion-hover ${
    emphasis ? "text-zinc-300 hover:text-accent" : "text-zinc-500 hover:text-zinc-300"
  }`;
  if (link.href.startsWith("http")) {
    return (
      <a href={link.href} className={className}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export default function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className="border-t border-terminal-border bg-terminal-panel px-4 py-6">
      {/* Sitemap por columnas (oculto en el modo compacto) */}
      <div
        className={
          compact
            ? "hidden"
            : "grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 max-w-6xl mx-auto"
        }
      >
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title} className={`min-w-0 ${col.ancha ? "col-span-2" : ""}`}>
            <h3 className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2 pb-1.5 border-b border-terminal-border">
              {col.title}
            </h3>
            <div className={col.ancha ? "grid grid-cols-2 gap-x-4 gap-y-3" : ""}>
              {col.groups.map((g, i) => (
                <div key={g.titulo ?? i} className="min-w-0">
                  {g.titulo && (
                    <h4 className="text-xxs font-terminal text-zinc-400 mb-1">{g.titulo}</h4>
                  )}
                  <ul className="flex flex-col gap-1">
                    {g.links.map((link) => (
                      <li key={link.href + link.label}>
                        <FooterAnchor link={link} emphasis={col.emphasis} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Línea de base: marca · copyright · compartir · contacto */}
      <div
        className={`max-w-6xl mx-auto flex items-center justify-between text-xxs text-zinc-500 flex-wrap gap-2 ${
          compact ? "" : "mt-6 pt-4 border-t border-terminal-border"
        }`}
      >
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 512 512" aria-hidden="true" className="opacity-80">
            <path
              d="M 413.61 379.14 A 200 200 0 1 1 367.83 90.17 L 321.98 158.17 A 118 118 0 1 0 348.99 328.66 Z"
              className="fill-ink"
            />
            <rect x="379.7" y="168.1" width="118" height="118" className="fill-accent" />
          </svg>
          <span className="font-terminal text-zinc-300 lowercase">
            consignatarias<span className="text-accent">.</span>com<span className="text-accent">.</span>ar
          </span>
          <span>&copy; {new Date().getFullYear()} · Memola Medios S.A.S.</span>
        </span>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <a
            href={SHARE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-positive hover:text-zinc-100 motion-hover"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Compartir
          </a>
          <span className="claro:hidden text-terminal-border">|</span>
          <span>agro@memola.com.ar</span>
        </div>
      </div>
    </footer>
  );
}
