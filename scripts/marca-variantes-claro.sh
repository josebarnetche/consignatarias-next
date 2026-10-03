#!/usr/bin/env bash
# Genera las variantes del TEMA CLARO de las imágenes de marca (public/marca/).
#
# La identidad v2.0 se dibujó para el terminal oscuro: xilografías en blanco sobre
# negro, renders nocturnos, íconos mono blancos. Sobre la página blanca del tema
# claro eso queda como una mancha negra (o invisible, en los mono blancos). Cada
# original X.ext tiene al lado su X-claro.ext; <ImagenTema> (src/components/ui)
# muestra una u otra según <html data-theme>.
#
# Tratamientos (uno por familia, elegidos mirando las hojas de contacto):
#   tinta    — invierte SOLO la luminosidad (canal L de Lab): blanco-sobre-negro
#              pasa a tinta-sobre-papel y el acento cielo queda azul. Xilografías,
#              patrones, infografías, íconos/glifos mono blancos, logos de IA.
#   niebla   — renders 3D nocturnos: invertirlos los vuelve un negativo de foto,
#              así que se levantan a una mañana con niebla (contraste sigmoidal,
#              más luz, menos saturación, velo del color de la página).
#   acento   — íconos/glifos COLOR (negro + cielo): el negro ya sirve sobre blanco;
#              el cielo (#38bdf8, 2:1 sobre blanco) pasa al azul del tema claro.
#   svg      — martillazo.svg: se cambian los hex por los del tema claro.
#
# Requiere ImageMagick 6 (`convert`). Idempotente: regenera todo cada vez.
# Uso: bash scripts/marca-variantes-claro.sh
set -euo pipefail
cd "$(dirname "$0")/../public/marca"

out() { local f="$1"; echo "${f%.*}-claro.${f##*.}"; }
# Misma calidad que el original (las variantes no deben pesar más que lo que reemplazan).
calidad() { case "$1" in *.jpg) identify -format '%Q' "$1" ;; *.webp) echo 78 ;; *) echo 90 ;; esac; }
originales() { find "$@" -maxdepth 1 -type f \( -name '*.jpg' -o -name '*.png' -o -name '*.webp' \) ! -name '*-claro.*' | sort; }

tinta() {
  local f="$1" o; o=$(out "$f")
  convert "$f" -colorspace Lab -channel R -negate +channel -colorspace sRGB -strip -quality "$(calidad "$f")" "$o"
}

niebla() {
  local f="$1" o; o=$(out "$f")
  convert "$f" -sigmoidal-contrast 3,0% -modulate 140,75 -fill '#eef1f5' -colorize 35% -strip -quality "$(calidad "$f")" "$o"
}

acento() {
  # Máscara = píxeles con saturación (el acento); fuera de ella queda igual.
  local f="$1" o; o=$(out "$f")
  convert "$f" \
    \( +clone -modulate 62,115,114 \) \
    \( -clone 0 -alpha off -colorspace HSL -channel G -separate +channel -threshold 25% -blur 0x0.6 \) \
    -compose over -composite -strip "$o"
}

n=0
for f in $(originales ilus patterns educativas iconos glifos ai) rel-alambrado.jpg; do tinta "$f"; n=$((n+1)); done
for f in $(originales renders features) feat-mcp.jpg hero-pampa.jpg hero-pampa.webp hero-pampa-mobile.webp; do niebla "$f"; n=$((n+1)); done
for f in $(originales iconos-color glifos-color); do acento "$f"; n=$((n+1)); done

# El rectángulo de fondo (#09090b, 1200x420) va transparente: en la home el
# martillazo flota sobre la foto de cabecera y un fondo blanco se vería como caja.
sed -e 's|<rect width="1200" height="420" fill="#09090b"/>|<rect width="1200" height="420" fill="none"/>|' \
    -e 's/#fafafa/#18181b/g' -e 's/#09090b/#ffffff/g' -e 's/#27272a/#e4e4e7/g' \
    -e 's/#71717a/#71717a/g' -e 's/#38bdf8/#1d4ed8/g' martillazo.svg > martillazo-claro.svg
n=$((n+1))
echo "✓ $n variantes -claro generadas en public/marca/"
