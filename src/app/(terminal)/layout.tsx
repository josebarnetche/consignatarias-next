"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ThemeToggle";
import MobileMenu from "@/components/nav/MobileMenu";
import NavDropdown from "@/components/nav/NavDropdown";
import { buildNavGroups, isGroupActive, matchPath } from "@/lib/nav";
import OnboardingPrompt from "@/components/onboarding/OnboardingPrompt";
import PageTransition from "@/components/ui/PageTransition";
import SmartWelcome from "@/components/SmartWelcome";
import { createClient } from "@/lib/supabase-browser";
import { getAllProfiles } from "@/lib/data/consignataria-slugs";
import frigorificosResumen from "@/lib/data/frigorificos-summary.json";

// Cifras del menú calculadas desde los datos: escritas a mano quedaban viejas
// ("1.102 plantas", "104 firmas") apenas cambiaba el padrón o el directorio.
const TOTAL_FIRMAS = getAllProfiles().length;
const PLANTAS_HABILITADAS = (frigorificosResumen as { habilitados: number }).habilitados;

/* ------------------------------------------------------------------ */
/*  NAV — el árbol vive en lib/nav (uno solo para portada, terminal y   */
/*  teléfono). Acá solo se completan los totales del directorio.        */
/* ------------------------------------------------------------------ */
const NAV_GROUPS = buildNavGroups({ plantas: PLANTAS_HABILITADAS, firmas: TOTAL_FIRMAS });

/* ------------------------------------------------------------------ */
/*  CLOCK                                                              */
/* ------------------------------------------------------------------ */
function TerminalClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    // El reloj muestra solo HH:MM → alcanza con refrescar cada 30s (antes 1s
    // re-renderizaba el layout de todas las páginas del terminal cada segundo).
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className="text-zinc-500 text-data hidden sm:inline">--:--</span>;

  const time = now.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <span className="tabular-nums text-zinc-500 text-data font-terminal tracking-wide hidden sm:inline">
      {time}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  LAYOUT                                                             */
/* ------------------------------------------------------------------ */
export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Check auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // DISABLED: Cost optimization — use static values from build
  // Was: fetch('/api/stats/platform') on every page load
  // useEffect(() => {
  //   fetch('/api/stats/platform')
  //     .then(res => res.json())
  //     .then(data => {
  //       if (data.success) {
  //         setStats({
  //           remates: data.data.remates || 0,
  //           consignatarias: data.data.consignatarias || 0,
  //           provincias: data.data.provincias || 0,
  //         });
  //       }
  //     })
  //     .catch(() => {});
  // }, []);

  // (auth currently gates nothing in the primary nav; kept for future use)
  void isAuthenticated;

  return (
    <div className="bg-terminal-bg text-zinc-100 min-h-screen flex flex-col font-terminal text-sm">
      {/* -- HEADER BAR ------------------------------------------- */}
      <header className="border-b border-terminal-border bg-terminal-panel flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-10 claro:h-14 claro:px-6">
          {/* -- LEFT: Logo (marca — mono, minúscula, punto en accent) -- */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 group" title="consignatarias.com.ar — inicio">
              <span className="live-indicator-accent flex-shrink-0" />
              <span className="font-terminal text-[13px] claro:text-base font-semibold tracking-tight text-zinc-100 lowercase group-hover:text-accent transition-colors">
                consignatarias<span className="text-accent">.</span>com
              </span>
            </Link>

            {/* -- NAV (desktop) — dropdowns del mundo del productor -- */}
            <nav className="hidden md:flex items-center claro:ml-2 claro:gap-0.5">
              <span className="claro:hidden text-terminal-border mr-1">|</span>
              {NAV_GROUPS.map((group, i) => (
                <span key={group.label} className="flex items-center">
                  {i > 0 && (
                    <span className="claro:hidden text-terminal-border mx-1 text-xxs select-none">
                      /
                    </span>
                  )}
                  <NavDropdown
                    group={group}
                    active={isGroupActive(pathname, group)}
                  />
                </span>
              ))}
            </nav>
          </div>

          {/* -- RIGHT: Clock + Onboarding + Auth -- */}
          <div className="flex items-center gap-3">
            <Link
              href="/planes"
              className={`text-xxs claro:text-sm claro:font-medium font-terminal uppercase tracking-wider transition-colors hidden sm:inline ${
                matchPath(pathname, "/planes") ? "text-amber-300" : "text-zinc-500 hover:text-amber-300"
              }`}
            >
              Planes
            </Link>
            <span className="claro:hidden text-terminal-border hidden sm:inline">|</span>
            <span className="claro:hidden">
              <TerminalClock />
            </span>
            <span className="claro:hidden text-terminal-border hidden sm:inline">|</span>
            <ThemeToggle />
            <OnboardingPrompt />
            <AuthButton />
          </div>
        </div>

        {/* -- Mobile nav: menú fijo + tira de accesos rápidos que se desplaza -- */}
        <div className="md:hidden flex items-stretch border-t border-terminal-border">
          <div className="flex items-center border-r border-terminal-border">
            <MobileMenu groups={NAV_GROUPS} />
          </div>
        <nav
          className="relative flex flex-1 min-w-0 items-center px-2 h-11 gap-0 overflow-x-auto"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Left gradient shadow for swipe hint */}
          <span
            className="pointer-events-none absolute left-0 top-0 bottom-0 z-10"
            style={{
              width: 24,
              background:
                "linear-gradient(to right, rgb(var(--t-panel)), transparent)",
            }}
          />
          {/* Right gradient shadow for swipe hint */}
          <span
            className="pointer-events-none absolute right-0 top-0 bottom-0 z-10"
            style={{
              width: 24,
              background:
                "linear-gradient(to left, rgb(var(--t-panel)), transparent)",
            }}
          />

          {/* La tira repite los seis grupos del menú (lib/nav): el mismo mapa que
              en escritorio. El detalle de cada grupo está en el menú de la izquierda. */}
          {NAV_GROUPS.map((item, i) => {
            const active = isGroupActive(pathname, item);
            return (
              <span key={item.href} className="flex items-center flex-shrink-0">
                {i > 0 && (
                  <span className="claro:hidden text-terminal-border mx-0.5 text-xxs select-none">
                    /
                  </span>
                )}
                <Link
                  href={item.href}
                  className={`relative flex items-center px-2.5 py-2 text-xxs font-terminal uppercase tracking-widest transition-colors ${
                    active
                      ? "text-accent"
                      : "text-zinc-500 hover:text-zinc-100"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-1 right-1 h-px bg-accent"
                      style={{ borderRadius: "1px" }}
                    />
                  )}
                </Link>
              </span>
            );
          })}
        </nav>
        </div>
      </header>

      {/* -- MAIN CONTENT ----------------------------------------- */}
      {/* PageTransition (DESIGN-SYSTEM.md §5): cross-fade sutil del          */}
      {/* contenido en cambios de ruta — shell (header/footer) persistente.  */}
      {/* SSR-safe: el primer paint no anima; degrada a no-op con            */}
      {/* prefers-reduced-motion.                                            */}
      <SmartWelcome />
      <main className="flex-1 min-h-0">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* -- FOOTER — sitemap en 4 columnas (DESIGN-SYSTEM.md §3.4) ---- */}
      <SystemFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SYSTEM FOOTER  (DESIGN-SYSTEM.md §3.4)                             */
/*  Colapsa las 3 filas / ~28 links planos en 4 columnas con          */
/*  jerarquía. DATOS pesa más; trust-pages (glosario/manifiesto/      */
/*  quiénes-somos) bajan a EMPRESA. Sin links borrados; elimina el    */
/*  duplicado Reporte/Reporte-semanal y el redundante Calendario==/   */
/*  remates; agrega las legales. Hovers a `text-zinc-300` (token) —   */
/*  erradica los 4 colores crudos del footer anterior.                */
/* ------------------------------------------------------------------ */
interface FooterLink {
  label: string;
  href: string;
}
interface FooterColumn {
  title: string;
  /** DATOS lleva más peso visual (links a `text-zinc-300`). */
  emphasis?: boolean;
  links: FooterLink[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Datos",
    emphasis: true,
    links: [
      { label: "Precio por categoría y peso", href: "/vr" },
      { label: "Cuánto vale mi hacienda", href: "/valuar-hacienda" },
      { label: "INMAG hoy", href: "/mercado/inmag" },
      { label: "INMAG en USD", href: "/mercado/inmag-dolares" },
      { label: "Precios hoy", href: "/precios" },
      { label: "Hacienda en pie", href: "/precios/hacienda-en-pie" },
      { label: "Maíz / Novillo", href: "/mercado/spread" },
      { label: "Categorías", href: "/mercado" },
      // Anchor exacto en ~2.700 páginas: la señal interna más barata para la búsqueda madre.
      { label: "Índice novillo arrendamiento", href: "/mercado/arrendamiento" },
      { label: "Valor de la hectárea", href: "/campos/valuar" },
    ],
  },
  {
    title: "Producto",
    links: [
      { label: "Remates", href: "/remates" },
      { label: "Consignatarias", href: "/consignatarias" },
      { label: "Frigoríficos", href: "/frigorificos" },
      { label: "Proveedores", href: "/proveedores" },
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
  {
    title: "Empresa",
    links: [
      { label: "Quiénes somos", href: "/quienes-somos" },
      { label: "Metodología", href: "/metodologia" },
      { label: "El Corredor", href: "/el-corredor" },
      { label: "Reporte semanal", href: "/reporte-semanal" },
      { label: "Manifiesto", href: "/el-oraculo" },
      { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
      { label: "Guías", href: "/guias" },
      { label: "Buenas prácticas", href: "/buenas-practicas" },
      { label: "Glosario", href: "/glosario" },
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
  {
    title: "Legal",
    links: [
      { label: "Términos", href: "/terminos" },
      { label: "Privacidad", href: "/privacidad" },
      { label: "Aviso legal", href: "/aviso-legal" },
      { label: "Arrepentimiento", href: "/arrepentimiento" },
      { label: "Calidad", href: "/calidad" },
    ],
  },
];

function SystemFooter() {
  const pathname = usePathname();
  // /overview es la pantalla de trabajo: footer compacto (solo baseline),
  // sin el sitemap de 4 columnas (ese vive en las páginas de contenido/SEO).
  const compact = pathname === "/overview";
  const shareHref = `https://wa.me/?text=${encodeURIComponent(
    "Mirá este calendario de remates ganaderos: https://www.consignatarias.com.ar/remates"
  )}`;

  return (
    <footer className="border-t border-terminal-border bg-terminal-panel px-4 py-6">
      {/* Sitemap — 4 columnas (oculto en /overview) */}
      <div className={compact ? "hidden" : "grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 max-w-6xl mx-auto"}>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title} className="min-w-0">
            <h3 className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2 pb-1.5 border-b border-terminal-border">
              {col.title}
            </h3>
            <ul className="flex flex-col gap-1">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className={`text-xxs font-terminal motion-hover ${
                      col.emphasis
                        ? "text-zinc-300 hover:text-accent"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Baseline: marca · copyright · share · contacto */}
      <div className={`max-w-6xl mx-auto flex items-center justify-between text-xxs text-zinc-500 flex-wrap gap-2 ${compact ? "" : "mt-6 pt-4 border-t border-terminal-border"}`}>
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 512 512" aria-hidden="true" className="opacity-80">
            <path d="M 413.61 379.14 A 200 200 0 1 1 367.83 90.17 L 321.98 158.17 A 118 118 0 1 0 348.99 328.66 Z" fill="#fafafa" />
            <rect x="379.7" y="168.1" width="118" height="118" fill="#38bdf8" />
          </svg>
          <span className="font-terminal text-zinc-300 lowercase">
            consignatarias<span className="text-accent">.</span>com<span className="text-accent">.</span>ar
          </span>
          <span>&copy; {new Date().getFullYear()} · Memola Medios S.A.S.</span>
        </span>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <a
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-positive hover:text-zinc-100 motion-hover"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
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
