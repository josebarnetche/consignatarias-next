"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavGroup, NavLeaf } from "@/lib/nav";

/**
 * Desplegable de un grupo del menú (lib/nav). Lo usan el terminal y la portada, así
 * los dos muestran el mismo menú. Hover con intención + clic/foco, Escape y clic
 * afuera cierran.
 */
const TAG_STYLE: Record<NonNullable<NavLeaf["tag"]>, string> = {
  live: "border-positive text-positive",
  pro: "border-accent/60 text-accent",
  core: "border-zinc-500 text-zinc-300",
  new: "border-accent/50 text-accent",
};

const TAG_LABEL: Record<NonNullable<NavLeaf["tag"]>, string> = {
  live: "LIVE",
  pro: "PRO",
  core: "NÚCLEO",
  new: "NUEVO",
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
export default function NavDropdown({
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
        className={`relative flex items-center px-2 py-1.5 text-xxs font-terminal uppercase tracking-widest motion-hover claro:text-sm claro:font-medium claro:px-3 claro:rounded-terminal ${
          active || open
            ? "text-accent claro:bg-accent/[0.07]"
            : "text-zinc-500 hover:text-zinc-100 claro:text-zinc-300 claro:hover:bg-zinc-900"
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

