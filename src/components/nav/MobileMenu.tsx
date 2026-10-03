"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * MobileMenu — el mapa completo del sitio en el teléfono.
 *
 * POR QUÉ EXISTE (revisión de navegabilidad, 02-10-2026). El header tenía dos
 * navegaciones desparejas: en escritorio, seis grupos con desplegable que llevan
 * a 35 destinos; en el teléfono, una tira horizontal plana de 12 enlaces. O sea
 * que 23 destinos NO tenían ninguna puerta de entrada desde el teléfono, entre
 * ellos dos que el usuario buscaba a mano: Frigoríficos y Remates en vivo.
 * Encima, la tira se desplaza en horizontal: la mitad de sus ítems quedaban
 * fuera de pantalla sin que nada avisara que había más.
 *
 * SEO. Google indexa la versión MÓVIL (mobile-first). Que el teléfono mostrara
 * 12 de 35 enlaces internos no era neutro: era la versión que Google tomaba como
 * la buena. Por eso este panel **se renderiza siempre en el HTML** y se oculta
 * con CSS, nunca se monta de forma condicional: el rastreador ve los 35 enlaces
 * como <a href> reales, estén el panel abierto o cerrado. No cambia ninguna URL,
 * ningún título ni ningún encabezado.
 */

interface Item {
  label: string;
  href: string;
  hint?: string;
  tag?: "live" | "pro" | "core" | "new";
}
interface Group {
  label: string;
  match: string;
  items: Item[];
}

export default function MobileMenu({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  // Al navegar, el panel se cierra solo: en un teléfono, quedarse abierto encima
  // del contenido recién cargado se siente como que el clic no funcionó.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape cierra. Mientras está abierto, el fondo no scrollea.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="menu-movil"
        aria-label={open ? "Cerrar el menú" : "Abrir el menú de secciones"}
        className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-2 text-xxs font-terminal uppercase tracking-widest text-zinc-300 hover:text-accent transition-colors"
      >
        <span aria-hidden="true" className="flex flex-col gap-[3px]">
          <span className="block w-3.5 h-px bg-current" />
          <span className="block w-3.5 h-px bg-current" />
          <span className="block w-3.5 h-px bg-current" />
        </span>
        Menú
      </button>

      {/* Velo. Solo decorativo: el cierre accesible es el botón y Escape. */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 top-[84px] z-40 bg-zinc-950/60 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* El panel vive SIEMPRE en el HTML (ver nota de SEO arriba). */}
      <div
        id="menu-movil"
        ref={panelRef}
        className={`md:hidden fixed left-0 right-0 top-[84px] z-50 max-h-[calc(100dvh-84px)] overflow-y-auto border-b border-terminal-border bg-terminal-panel transition-[transform,opacity] duration-150 ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        {...(open ? {} : { inert: "" as unknown as boolean })}
      >
        <nav aria-label="Secciones del sitio" className="px-3 py-3">
          {groups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-1">
              <h2 className="px-1 mb-1.5 text-xxs font-terminal uppercase tracking-widest text-zinc-500">
                {group.label}
              </h2>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-1 rounded px-2 py-2 text-[13px] leading-tight transition-colors ${
                          active
                            ? "bg-accent/10 text-accent"
                            : "text-zinc-300 hover:bg-zinc-900/60 hover:text-ink"
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.tag === "live" && (
                          <span className="status-dot-live flex-shrink-0" />
                        )}
                        {item.tag === "new" && (
                          <span className="flex-shrink-0 text-[9px] font-terminal uppercase tracking-wider text-accent">
                            nuevo
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
