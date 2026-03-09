"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  NAV ITEMS                                                          */
/* ------------------------------------------------------------------ */
const NAV_ITEMS = [
  { label: "INICIO", href: "/overview" },
  { label: "REMATES", href: "/remates" },
  { label: "CONSIGNATARIAS", href: "/consignatarias" },
  { label: "FRIGORIFICOS", href: "/frigorificos" },
  { label: "MERCADO", href: "/mercado" },
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

  if (!now) return <span className="text-zinc-600">--:--:--</span>;

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
          <span className="text-zinc-600">
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

          {/* -- RIGHT: Clock -- */}
          <div className="flex items-center gap-4">
            <TerminalClock />
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
    </div>
  );
}
