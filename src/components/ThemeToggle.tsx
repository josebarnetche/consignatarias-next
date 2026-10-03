"use client";

import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  ThemeToggle — botón de cambio de tema (docs/PLAN-TEMA-WHITE.md)    */
/*  Sin librería (nada de next-themes): lee/escribe localStorage.theme */
/*  y alterna el atributo data-theme en <html>. El script inline en   */
/*  layout.tsx ya aplicó el tema correcto antes del primer paint —    */
/*  este componente solo sincroniza su propio estado visual al montar */
/*  y maneja el click.                                                 */
/* ------------------------------------------------------------------ */
// La barra del navegador en el celular toma el <meta name="theme-color"> (blanco
// por default en layout.tsx); tiene que acompañar al fondo del tema activo. Se
// lee del CSS ya aplicado para no duplicar el hex del token acá.
function syncThemeColor() {
  const bg = getComputedStyle(document.body).backgroundColor;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  // Empieza en null (no se sabe aún en server) para no desincronizar el HTML
  // SSR (claro por default) del primer render cliente — recién se fija en el
  // useEffect, que lee el atributo que el script inline del <head> ya puso.
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    syncThemeColor();
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {
        /* localStorage puede fallar en modo privado — el toggle visual ya corrió */
      }
    } else {
      document.documentElement.removeAttribute("data-theme");
      try {
        localStorage.setItem("theme", "light");
      } catch {
        /* idem */
      }
    }
    syncThemeColor();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-terminal border border-terminal-border text-zinc-400 hover:text-accent hover:border-accent/60 transition-colors ${className}`}
    >
      {/* Evita parpadeo de ícono incorrecto mientras isDark es null: se asume
          claro (el default) hasta que el effect confirme el real. */}
      {isDark ? (
        // Luna — tema oscuro activo, click para pasar a claro
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      ) : (
        // Sol — tema claro activo, click para pasar a oscuro
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
