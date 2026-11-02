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
import SiteFooter from "@/components/SiteFooter";
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

      {/* -- FOOTER — uno solo para el terminal y la portada (components/SiteFooter). */}
      {/* /overview es la pantalla de trabajo: solo la línea de base.              */}
      <SiteFooter compact={pathname === "/overview"} />
    </div>
  );
}
