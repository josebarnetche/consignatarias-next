"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

/* -----------------------------------------------------------------------------
 * Consignatarias showcase
 * "Wall of consignatarias" grid for the landing. Each active consignataria is a
 * tile (logo where we have one, name otherwise) linking to its profile — which
 * doubles as internal-link equity from the landing to every profile.
 * Tiles ripple a pixel shimmer in on hover; the canvas is lazily built on first
 * hover so mounting ~80 tiles stays cheap.
 * -------------------------------------------------------------------------- */

export type ShowcaseItem = {
  slug: string;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
};

// Shimmer palette for plain (no-logo) name tiles.
const NAME_PALETTES: string[][] = [
  ["#0070F0", "#3b9dff", "#7cc1ff"],
  ["#34d399", "#10b981", "#6ee7b7"],
  ["#38bdf8", "#0ea5e9", "#7dd3fc"],
  ["#a3e635", "#84cc16", "#bef264"],
];

/* -- brand-color helpers ------------------------------------------------- */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(hex: string, target: number, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(c + (target - c) * amt);
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
// Glitter tints: the brand color + brighter variants so it reads as colored
// pixels on the black tile (the color lives ONLY in the shimmer, not the bg).
function brandShimmer(hex: string): string[] {
  return [mix(hex, 255, 0.15), mix(hex, 255, 0.4), mix(hex, 255, 0.7)];
}

type Pixel = {
  x: number;
  y: number;
  color: string;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSize: number;
  maxSizeInt: number;
  delay: number;
  counter: number;
  counterStep: number;
  speed: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;
};

function PixelCanvas({ colors, gap = 6, speed = 35 }: { colors: string[]; gap?: number; speed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<number>(0);
  const lastFrameRef = useRef(performance.now());
  const reducedMotionRef = useRef(false);
  const builtRef = useRef(false);

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return null;
    const { width, height } = wrap.getBoundingClientRect();
    const w = Math.floor(width);
    const h = Math.floor(height);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h };
  }, []);

  // Build pixel objects lazily — only when a card is first hovered.
  const buildPixels = useCallback(() => {
    const dims = sizeCanvas();
    if (!dims) return;
    const { w, h } = dims;
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    const effectiveSpeed = reducedMotionRef.current ? 0 : Math.min(speed, 100) * 0.001;
    const pixels: Pixel[] = [];
    for (let x = 0; x < w; x += gap) {
      for (let y = 0; y < h; y += gap) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const dx = x - w / 2;
        const dy = y - h / 2;
        const delay = reducedMotionRef.current ? 0 : Math.sqrt(dx * dx + dy * dy);
        pixels.push({
          x, y, color,
          size: 0,
          sizeStep: Math.random() * 0.4,
          minSize: 0.5,
          maxSize: rand(0.5, 2),
          maxSizeInt: 2,
          delay,
          counter: 0,
          counterStep: Math.random() * 4 + (w + h) * 0.01,
          speed: rand(0.1, 0.9) * effectiveSpeed,
          isIdle: false,
          isReverse: false,
          isShimmer: false,
        });
      }
    }
    pixelsRef.current = pixels;
    builtRef.current = true;
  }, [colors, gap, speed, sizeCanvas]);

  const animate = useCallback((mode: "appear" | "disappear") => {
    cancelAnimationFrame(animationRef.current);
    if (mode === "appear" && !builtRef.current) buildPixels();
    const frameInterval = 1000 / 60;

    const loop = () => {
      animationRef.current = requestAnimationFrame(loop);
      const now = performance.now();
      const elapsed = now - lastFrameRef.current;
      if (elapsed < frameInterval) return;
      lastFrameRef.current = now - (elapsed % frameInterval);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pixels = pixelsRef.current;
      for (const p of pixels) {
        if (mode === "appear") {
          p.isIdle = false;
          if (p.counter <= p.delay) {
            p.counter += p.counterStep;
            continue;
          }
          if (p.size >= p.maxSize) p.isShimmer = true;
          if (p.isShimmer) {
            if (p.size >= p.maxSize) p.isReverse = true;
            else if (p.size <= p.minSize) p.isReverse = false;
            p.size += p.isReverse ? -p.speed : p.speed;
          } else {
            p.size += p.sizeStep;
          }
        } else {
          p.isShimmer = false;
          p.counter = 0;
          if (p.size <= 0) {
            p.isIdle = true;
            continue;
          }
          p.size -= 0.1;
        }
        const offset = p.maxSizeInt * 0.5 - p.size * 0.5;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x + offset, p.y + offset, p.size, p.size);
      }

      if (mode === "disappear" && pixels.every((p) => p.isIdle)) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    animationRef.current = requestAnimationFrame(loop);
  }, [buildPixels]);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sizeCanvas();
    const ro = new ResizeObserver(() => {
      builtRef.current = false; // rebuild on next hover at the new size
      sizeCanvas();
    });
    if (wrapRef.current) ro.observe(wrapRef.current);

    const card = wrapRef.current?.parentElement;
    const onEnter = () => animate("appear");
    const onLeave = () => animate("disappear");
    card?.addEventListener("mouseenter", onEnter);
    card?.addEventListener("mouseleave", onLeave);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationRef.current);
      card?.removeEventListener("mouseenter", onEnter);
      card?.removeEventListener("mouseleave", onLeave);
    };
  }, [sizeCanvas, animate]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="block opacity-70" />
    </div>
  );
}

function Tile({ item, nameIndex }: { item: ShowcaseItem; nameIndex: number }) {
  const branded = item.logoUrl && item.brandColor;

  // Branded tile: BLACK background always, white logo. On hover only the pixel
  // glitter lights up in the firm's brand color (plus a subtle brand glow).
  if (branded) {
    const color = item.brandColor as string;
    return (
      <Link
        href={`/consignatarias/${item.slug}`}
        title={item.name}
        className="group relative grid place-items-center overflow-hidden px-4 py-6 min-h-[104px] isolate bg-[#0c0c0e] transition-shadow duration-300 hover:z-[2] hover:[box-shadow:0_8px_28px_-10px_var(--brand)]"
        style={{ ["--brand" as string]: color }}
      >
        <PixelCanvas colors={brandShimmer(color)} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.logoUrl as string}
          alt={item.name}
          loading="lazy"
          className="relative z-[1] max-h-14 max-w-[86%] w-auto object-contain [filter:brightness(0)_invert(1)] transition-transform duration-300 group-hover:scale-[1.07]"
        />
      </Link>
    );
  }

  // Plain name tile (no logo yet).
  return (
    <Link
      href={`/consignatarias/${item.slug}`}
      className="group relative grid place-items-center overflow-hidden bg-[#0c0c0e] px-4 py-6 min-h-[104px] isolate transition-shadow duration-300 hover:z-[2] hover:shadow-[0_8px_24px_-8px_rgba(0,112,240,0.25)]"
    >
      <PixelCanvas colors={NAME_PALETTES[nameIndex % NAME_PALETTES.length]} />
      <span className="relative z-[1] text-center text-xs font-medium leading-tight text-zinc-500 transition-colors duration-300 group-hover:text-zinc-100">
        {item.name}
      </span>
    </Link>
  );
}

export default function ConsignatariasShowcase({ items }: { items: ShowcaseItem[] }) {
  if (items.length === 0) return null;
  return (
    <section id="consignatarias" className="relative max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-10">
        <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-zinc-900 border border-white/10 text-zinc-400">
          El directorio
        </span>
        <h2 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-zinc-100">
          Las consignatarias más activas del mercado
        </h2>
        <p className="mt-2 text-sm text-zinc-500 max-w-xl mx-auto">
          Casas de remate con actividad reciente. No son clientes — es el directorio.
          Pasá el mouse y tocá cualquiera para ver su calendario y perfil.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-white/5 border border-white/5 rounded-lg overflow-hidden">
        {items.map((item, i) => (
          <Tile key={item.slug} item={item} nameIndex={i} />
        ))}
      </div>
    </section>
  );
}
