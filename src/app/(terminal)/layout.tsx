"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthButton from "@/components/auth/AuthButton";
import OnboardingPrompt from "@/components/onboarding/OnboardingPrompt";

/* ------------------------------------------------------------------ */
/*  NAV ITEMS                                                          */
/* ------------------------------------------------------------------ */
const NAV_ITEMS = [
  { label: "INICIO", href: "/overview" },
  { label: "REMATES", href: "/remates" },
  { label: "CONSIGNATARIAS", href: "/consignatarias" },
  { label: "FRIGORIFICOS", href: "/frigorificos" },
  { label: "MERCADO", href: "/mercado" },
  { label: "PLANES", href: "/planes" },
] as const;

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
/*  HELPER: check if a nav item is active                              */
/* ------------------------------------------------------------------ */
function isNavActive(pathname: string, href: string): boolean {
  if (href === "/overview") {
    return pathname === "/overview";
  }
  return pathname === href || pathname.startsWith(href + "/");
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

  return (
    <div className="bg-terminal-bg text-zinc-100 min-h-screen flex flex-col font-terminal text-sm">
      {/* -- ACTIVITY BAR ------------------------------------------- */}
      <div className="activity-bar hidden md:flex justify-between">
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 tracking-widest uppercase">
            366 REMATES
          </span>
          <span className="text-terminal-border">&middot;</span>
          <span className="text-zinc-500 tracking-widest uppercase">
            77 CONSIGNATARIAS
          </span>
          <span className="text-terminal-border">&middot;</span>
          <span className="text-zinc-500 tracking-widest uppercase">
            12 PROVINCIAS
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

            {/* -- NAV (desktop) -- */}
            <nav className="hidden md:flex items-center">
              <span className="text-terminal-border mr-3">|</span>
              {NAV_ITEMS.map((item, i) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <span key={item.href} className="flex items-center">
                    {i > 0 && (
                      <span className="text-terminal-border mx-1 text-xxs select-none">
                        /
                      </span>
                    )}
                    <Link
                      href={item.href}
                      className={`relative px-2 py-1.5 text-xxs font-terminal uppercase tracking-widest transition-colors duration-100 ${
                        active
                          ? "text-accent"
                          : "text-zinc-500 hover:text-zinc-100"
                      }`}
                    >
                      {item.label}
                      {/* Active bottom indicator */}
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

          {NAV_ITEMS.map((item, i) => {
            const active = isNavActive(pathname, item.href);
            return (
              <span key={item.href} className="flex items-center flex-shrink-0">
                {i > 0 && (
                  <span className="text-terminal-border mx-0.5 text-xxs select-none">
                    /
                  </span>
                )}
                <Link
                  href={item.href}
                  className={`relative px-2.5 py-2 text-xxs font-terminal uppercase tracking-widest transition-colors ${
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
      </header>

      {/* -- MAIN CONTENT ----------------------------------------- */}
      <main className="flex-1 min-h-0">{children}</main>

      {/* -- FOOTER ------------------------------------------------- */}
      <footer className="border-t border-terminal-border bg-terminal-panel px-4 py-4">
        {/* Tools row */}
        <div className="flex items-center justify-center gap-4 mb-3 pb-3 border-b border-terminal-border flex-wrap">
          <span className="text-xxs text-zinc-600 uppercase tracking-wider">Herramientas:</span>
          <Link href="/calculadora" className="text-xxs text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calculadora
          </Link>
          <Link href="/calendario-exportar" className="text-xxs text-zinc-400 hover:text-sky-400 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendario
          </Link>
          <Link href="/reporte-semanal" className="text-xxs text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reporte
          </Link>
          <Link href="/comparar" className="text-xxs text-zinc-400 hover:text-violet-400 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Comparar
          </Link>
          <Link href="/exportar" className="text-xxs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar
          </Link>
          <span className="text-terminal-border">|</span>
          <a
            href={`https://wa.me/?text=${encodeURIComponent('Mirá este calendario de remates ganaderos: https://www.consignatarias.com.ar/remates')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xxs text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Compartir
          </a>
        </div>
        
        {/* Main footer row */}
        <div className="flex items-center justify-between text-xxs text-zinc-500 flex-wrap gap-2">
          <span>consignatarias.com.ar &copy; 2026</span>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <Link href="/planes" className="hover:text-zinc-300 transition-colors">
              Planes
            </Link>
            <span className="text-terminal-border">|</span>
            <Link href="/api-docs" className="hover:text-zinc-300 transition-colors">
              API
            </Link>
            <span className="text-terminal-border">|</span>
            <Link href="/glosario" className="hover:text-zinc-300 transition-colors">
              Glosario
            </Link>
            <span className="text-terminal-border">|</span>
            <Link href="/quienes-somos" className="hover:text-zinc-300 transition-colors">
              Quiénes Somos
            </Link>
            <span className="text-terminal-border">|</span>
            <span>agro@memola.com.ar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
