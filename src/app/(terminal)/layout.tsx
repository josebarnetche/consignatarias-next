"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AuthButton from "@/components/auth/AuthButton";
import OnboardingPrompt from "@/components/onboarding/OnboardingPrompt";
import PageTransition from "@/components/ui/PageTransition";
import { createClient } from "@/lib/supabase-browser";

/* ------------------------------------------------------------------ */
/*  NAV TREE  (DESIGN-SYSTEM.md §3.1 — agrupar por modelo mental)      */
/* ------------------------------------------------------------------ */
// A leaf is a real destination. A group is a dropdown with leaves under it.
// Tags (`live`/`seo`/`pro`/`core`) surface intent on the most valuable items.
interface NavLeaf {
  label: string;
  href: string;
  /** Optional descriptive sub-line shown in the dropdown panel. */
  hint?: string;
  /** Visual emphasis tag. */
  tag?: "live" | "pro" | "core";
}

interface NavGroup {
  /** Group label shown in the bar (e.g. "MERCADO"). */
  label: string;
  /** Base route used for active-state matching (e.g. "/mercado"). */
  match: string;
  items: NavLeaf[];
}

interface NavLink {
  label: string;
  href: string;
}

// TERMINAL is a simple link (resuelve la doble puerta: /overview, no "/").
// The rest are grouped dropdowns. This lifts the buried assets out of the
// footer: /mercado/inmag (activo #1) + /mercado/arrendamiento (11k impr) into
// MERCADO, and /calculadora into HERRAMIENTAS.
const NAV_TERMINAL: NavLink = { label: "TERMINAL", href: "/overview" };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "MERCADO",
    match: "/mercado",
    items: [
      { label: "INMAG hoy", href: "/mercado/inmag", hint: "Precio de referencia", tag: "live" },
      { label: "Arrendamiento", href: "/mercado/arrendamiento", hint: "Valor del campo" },
      { label: "INMAG en USD", href: "/mercado/inmag-dolares", hint: "Serie dolarizada" },
      { label: "Maíz / Novillo", href: "/mercado/spread", hint: "Relación de canje" },
      { label: "Precios hoy", href: "/precios", hint: "Hacienda en pie" },
      { label: "Categorías", href: "/mercado", hint: "Terneros, novillos, vacas" },
      { label: "Internacional", href: "/mercado/internacional", hint: "Chicago (CME) USD/kg" },
    ],
  },
  {
    label: "REMATES",
    match: "/remates",
    items: [
      { label: "Calendario", href: "/remates", hint: "Todos los remates" },
      { label: "Hoy", href: "/remates/hoy" },
      { label: "Esta semana", href: "/remates/semana" },
      { label: "En vivo", href: "/remates/en-vivo", tag: "live" },
    ],
  },
  {
    label: "DIRECTORIO",
    match: "/consignatarias",
    items: [
      { label: "Frigoríficos", href: "/frigorificos", hint: "364 plantas SENASA" },
      { label: "Consignatarias", href: "/consignatarias", hint: "104 firmas" },
    ],
  },
  {
    label: "HERRAMIENTAS",
    match: "/calculadora",
    items: [
      { label: "Calculadora", href: "/calculadora", hint: "Net-back · ¿vendo ahora?", tag: "pro" },
      { label: "Comparar", href: "/comparar", hint: "Medios de pago" },
      { label: "Mi Ganado", href: "/mi-ganado", hint: "Valor de tu rodeo" },
      { label: "Exportar / Calendario", href: "/calendario-exportar" },
    ],
  },
  {
    label: "DESARROLLADORES",
    match: "/mcp",
    items: [
      { label: "MCP para IAs", href: "/mcp", hint: "El sitio como tools para agentes", tag: "live" },
      { label: "API Enterprise", href: "/api-docs", hint: "REST + API keys" },
    ],
  },
];

// Link de Planes fuera de los grupos: visible siempre (no enterrado en un dropdown).
const NAV_PLANES: NavLink = { label: "PLANES", href: "/planes" };

// Mobile: the scrollable bar can't host dropdowns, so we flatten to the highest-
// value destinations — INMAG (activo #1), Calculadora y Arrendamiento dejan de
// estar enterrados. Order = priority.
interface MobileNavLink extends NavLink {
  tag?: NavLeaf["tag"];
}
const MOBILE_NAV: MobileNavLink[] = [
  { label: "TERMINAL", href: "/overview" },
  { label: "INMAG", href: "/mercado/inmag", tag: "live" },
  { label: "ARRIENDO", href: "/mercado/arrendamiento" },
  { label: "PRECIOS", href: "/precios" },
  { label: "REMATES", href: "/remates" },
  { label: "FRIGORIF.", href: "/frigorificos" },
  { label: "CONSIGNAT.", href: "/consignatarias" },
  { label: "CALCULAR", href: "/calculadora", tag: "pro" },
  { label: "PLANES", href: "/planes", tag: "pro" },
];

/* ------------------------------------------------------------------ */
/*  CLOCK                                                              */
/* ------------------------------------------------------------------ */
function TerminalClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className="text-zinc-500">--:--:--</span>;

  const date = now.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const time = now.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <span className="tabular-nums text-zinc-400 text-data font-terminal tracking-wide">
      <span className="text-zinc-500 hidden sm:inline">{date.toUpperCase()}</span>
      <span className="mx-1.5 text-terminal-border hidden sm:inline">|</span>
      <span className="text-zinc-300">{time}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  HELPER: active-state matching                                      */
/* ------------------------------------------------------------------ */
function matchPath(pathname: string, href: string): boolean {
  if (href === "/overview" || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

// A group is active if any of its leaf hrefs (or its match base) matches.
function isGroupActive(pathname: string, group: NavGroup): boolean {
  if (matchPath(pathname, group.match)) return true;
  return group.items.some((it) => matchPath(pathname, it.href));
}

const TAG_STYLE: Record<NonNullable<NavLeaf["tag"]>, string> = {
  live: "border-positive text-positive",
  pro: "border-amber-400/60 text-amber-300",
  core: "border-zinc-500 text-zinc-300",
};

const TAG_LABEL: Record<NonNullable<NavLeaf["tag"]>, string> = {
  live: "LIVE",
  pro: "PRO",
  core: "NÚCLEO",
};

function NavTag({ tag }: { tag: NonNullable<NavLeaf["tag"]> }) {
  return (
    <span
      className={`ml-1.5 inline-flex items-center px-1 py-px text-[9px] leading-none font-terminal uppercase tracking-wider border rounded-[2px] ${TAG_STYLE[tag]}`}
    >
      {tag === "live" && <span className="status-dot-live mr-0.5" />}
      {TAG_LABEL[tag]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  DESKTOP DROPDOWN  (hover-intent + click/focus, Escape, outside)    */
/* ------------------------------------------------------------------ */
function NavDropdown({
  group,
  active,
}: {
  group: NavGroup;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click + Escape (keyboard accessible).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const clearTimers = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
  };

  const handleEnter = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), 80); // intent-delay
  };
  const handleLeave = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      ref={ref}
      className="relative flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          clearTimers();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        className={`relative flex items-center px-2 py-1.5 text-xxs font-terminal uppercase tracking-widest motion-hover ${
          active || open ? "text-accent" : "text-zinc-500 hover:text-zinc-100"
        }`}
      >
        {group.label}
        <span className="ml-1 text-[8px] opacity-70" aria-hidden>
          ▾
        </span>
        {active && (
          <span
            className="absolute bottom-0 left-1 right-1 h-px bg-accent"
            style={{ borderRadius: "1px" }}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="glass-panel animate-fade-in-up absolute left-0 top-full z-50 mt-1 min-w-[230px] py-1 shadow-panel"
        >
          {group.items.map((it) => (
            <Link
              key={it.href + it.label}
              href={it.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="group/item flex items-center justify-between gap-3 px-3 py-1.5 text-zinc-300 hover:bg-accent/[0.06] hover:text-zinc-100 motion-hover"
            >
              <span className="flex flex-col min-w-0">
                <span className="flex items-center text-data font-terminal">
                  {it.label}
                  {it.tag && <NavTag tag={it.tag} />}
                </span>
                {it.hint && (
                  <span className="text-xxs text-zinc-500 truncate">{it.hint}</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
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
  // Static values (updated on deploy) — no API call needed.
  // consignatarias = getAllProfiles().length (canonical registry, what the landing shows). Keep in sync.
  const [stats] = useState({ remates: 392, consignatarias: 104, provincias: 14 });

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
      {/* -- ACTIVITY BAR ------------------------------------------- */}
      <div className="activity-bar hidden md:flex justify-between">
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 tracking-widest uppercase">
            {stats.remates || '—'} REMATES
          </span>
          <span className="text-terminal-border">&middot;</span>
          <span className="text-zinc-500 tracking-widest uppercase">
            {stats.consignatarias || '—'} CONSIGNATARIAS
          </span>
          <span className="text-terminal-border">&middot;</span>
          <span className="text-zinc-500 tracking-widest uppercase">
            {stats.provincias || '—'} PROVINCIAS
          </span>
        </div>
        <div className="flex items-center">
          <span className="text-zinc-500">
            ULT. ACT. 14:00 ART
          </span>
        </div>
      </div>

      {/* -- HEADER BAR ------------------------------------------- */}
      <header className="border-b border-terminal-border bg-terminal-panel flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-12">
          {/* -- LEFT: Logo -- */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="live-indicator flex-shrink-0" />
              <span className="font-heading text-sm font-semibold tracking-wide text-zinc-100 group-hover:text-accent transition-colors">
                consignatarias.com.ar
              </span>
            </Link>

            {/* -- NAV (desktop) — TERMINAL link + grouped dropdowns -- */}
            <nav className="hidden md:flex items-center">
              <span className="text-terminal-border mr-3">|</span>
              {(() => {
                const active = matchPath(pathname, NAV_TERMINAL.href);
                return (
                  <Link
                    href={NAV_TERMINAL.href}
                    className={`relative px-2 py-1.5 text-xxs font-terminal uppercase tracking-widest motion-hover ${
                      active ? "text-accent" : "text-zinc-500 hover:text-zinc-100"
                    }`}
                  >
                    {NAV_TERMINAL.label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-1 right-1 h-px bg-accent"
                        style={{ borderRadius: "1px" }}
                      />
                    )}
                  </Link>
                );
              })()}
              {NAV_GROUPS.map((group) => (
                <span key={group.label} className="flex items-center">
                  <span className="text-terminal-border mx-1 text-xxs select-none">
                    /
                  </span>
                  <NavDropdown
                    group={group}
                    active={isGroupActive(pathname, group)}
                  />
                </span>
              ))}
              <span className="text-terminal-border mx-1 text-xxs select-none">/</span>
              <Link
                href={NAV_PLANES.href}
                className={`relative px-2 py-1.5 text-xxs font-terminal uppercase tracking-widest motion-hover ${
                  matchPath(pathname, NAV_PLANES.href) ? "text-amber-300" : "text-amber-400/80 hover:text-amber-300"
                }`}
              >
                {NAV_PLANES.label}
              </Link>
            </nav>
          </div>

          {/* -- RIGHT: Clock + Onboarding + Auth -- */}
          <div className="flex items-center gap-3">
            <TerminalClock />
            <span className="text-terminal-border hidden sm:inline">|</span>
            <OnboardingPrompt />
            <AuthButton />
          </div>
        </div>

        {/* -- Mobile nav -- */}
        <nav
          className="md:hidden relative flex items-center border-t border-terminal-border px-2 h-11 gap-0 overflow-x-auto"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Left gradient shadow for swipe hint */}
          <span
            className="pointer-events-none absolute left-0 top-0 bottom-0 z-10"
            style={{
              width: 24,
              background:
                "linear-gradient(to right, #16161d, transparent)",
            }}
          />
          {/* Right gradient shadow for swipe hint */}
          <span
            className="pointer-events-none absolute right-0 top-0 bottom-0 z-10"
            style={{
              width: 24,
              background:
                "linear-gradient(to left, #16161d, transparent)",
            }}
          />

          {MOBILE_NAV.map((item, i) => {
            const active = matchPath(pathname, item.href);
            return (
              <span key={item.href} className="flex items-center flex-shrink-0">
                {i > 0 && (
                  <span className="text-terminal-border mx-0.5 text-xxs select-none">
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
                  {item.tag && <NavTag tag={item.tag} />}
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
      </header>

      {/* -- MAIN CONTENT ----------------------------------------- */}
      {/* PageTransition (DESIGN-SYSTEM.md §5): cross-fade sutil del          */}
      {/* contenido en cambios de ruta — shell (header/footer) persistente.  */}
      {/* SSR-safe: el primer paint no anima; degrada a no-op con            */}
      {/* prefers-reduced-motion.                                            */}
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
      { label: "INMAG hoy", href: "/mercado/inmag" },
      { label: "INMAG en USD", href: "/mercado/inmag-dolares" },
      { label: "Precios hoy", href: "/precios" },
      { label: "Hacienda en pie", href: "/precios/hacienda-en-pie" },
      { label: "Maíz / Novillo", href: "/mercado/spread" },
      { label: "Categorías", href: "/mercado" },
      { label: "Arrendamiento", href: "/mercado/arrendamiento" },
    ],
  },
  {
    title: "Producto",
    links: [
      { label: "Remates", href: "/remates" },
      { label: "Consignatarias", href: "/consignatarias" },
      { label: "Frigoríficos", href: "/frigorificos" },
      { label: "Calculadora", href: "/calculadora" },
      { label: "Comparar", href: "/comparar" },
      { label: "Exportar", href: "/exportar" },
      { label: "Calendario", href: "/calendario-exportar" },
      { label: "Mi Ganado", href: "/mi-ganado" },
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
      { label: "Glosario", href: "/glosario" },
      { label: "API", href: "/api-docs" },
      { label: "Acceso institucional", href: "/enterprise#acceso-institucional" },
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
  const shareHref = `https://wa.me/?text=${encodeURIComponent(
    "Mirá este calendario de remates ganaderos: https://www.consignatarias.com.ar/remates"
  )}`;

  return (
    <footer className="border-t border-terminal-border bg-terminal-panel px-4 py-6">
      {/* Sitemap — 4 columnas */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 max-w-6xl mx-auto">
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

      {/* Baseline: copyright · share · contacto */}
      <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-terminal-border flex items-center justify-between text-xxs text-zinc-500 flex-wrap gap-2">
        <span>consignatarias.com.ar &copy; 2026</span>
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
          <span className="text-terminal-border">|</span>
          <span>agro@memola.com.ar</span>
        </div>
      </div>
    </footer>
  );
}
