"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  NAV ITEMS                                                          */
/* ------------------------------------------------------------------ */
const NAV_ITEMS = [
  { label: "OVERVIEW", href: "/overview" },
  { label: "FRIGORIFICOS", href: "/frigorificos" },
  { label: "REMATES", href: "/remates" },
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

  if (!now) return <span className="text-slate-600">--:--:--</span>;

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
    <span className="tabular-nums text-slate-400 text-data font-terminal tracking-wide">
      <span className="text-slate-500">{date.toUpperCase()}</span>
      <span className="mx-1.5 text-terminal-border">|</span>
      <span className="text-slate-300">{time}</span>
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
  return (
    <div className="bg-terminal-bg text-slate-100 min-h-screen flex flex-col font-terminal text-xs">
      {/* -- HEADER BAR ------------------------------------------- */}
      <header className="border-b border-terminal-border bg-terminal-panel flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-10">
          {/* -- LEFT: Logo -- */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="inline-block w-2 h-2 bg-positive animate-pulse-live flex-shrink-0" />
              <span className="font-terminal text-sm font-semibold tracking-widest text-slate-100 group-hover:text-accent transition-colors">
                GANADO TERMINAL
              </span>
            </Link>

            {/* -- NAV -- */}
            <nav className="hidden md:flex items-center">
              <span className="text-terminal-border mr-3">|</span>
              {NAV_ITEMS.map((item, i) => (
                <span key={item.href} className="flex items-center">
                  {i > 0 && (
                    <span className="text-terminal-border mx-0.5 text-xxs select-none">
                      /
                    </span>
                  )}
                  <Link
                    href={item.href}
                    className="px-2 py-1 text-xxs font-terminal uppercase tracking-widest text-slate-500 hover:text-slate-100 transition-colors duration-100"
                  >
                    {item.label}
                  </Link>
                </span>
              ))}
            </nav>
          </div>

          {/* -- RIGHT: Clock + Badge -- */}
          <div className="flex items-center gap-4">
            <TerminalClock />

            <span className="terminal-tag-warning text-xxs">
              <span className="inline-block w-1 h-1 bg-warning mr-1.5 animate-pulse-live" />
              SAMPLE DATA
            </span>
          </div>
        </div>

        {/* -- Mobile nav -- */}
        <nav className="md:hidden flex items-center border-t border-terminal-border px-4 h-8 gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item, i) => (
            <span key={item.href} className="flex items-center flex-shrink-0">
              {i > 0 && (
                <span className="text-terminal-border mx-1 text-xxs select-none">
                  /
                </span>
              )}
              <Link
                href={item.href}
                className="px-1.5 py-0.5 text-xxs font-terminal uppercase tracking-widest text-slate-500 hover:text-slate-100 transition-colors"
              >
                {item.label}
              </Link>
            </span>
          ))}
        </nav>
      </header>

      {/* -- MAIN CONTENT ----------------------------------------- */}
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
