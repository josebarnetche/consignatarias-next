#!/usr/bin/env bash
# Crea agente@consignatarias.com en Hostinger y deja la clave donde la usa el agente.
#
# Lo corre José (no el asistente): la clave se genera acá, va directo al Llavero y
# a Vercel, y no se imprime nunca. Uso, desde la raíz del repo:
#   bash scripts/agente/crear-casilla.sh
set -euo pipefail

ORDEN="OR858cf239bb3a3551c3bfd53a6ce2"   # correo de consignatarias.com (Free Business Email)
CASILLA="agente@consignatarias.com"
REPO="${REPO:-$HOME/consignatarias}"     # donde está linkeado el proyecto de Vercel

source "$HOME/Desktop/MEMOLA/infra/hostinger/env.sh"
: "${HOSTINGER_API_TOKEN:?no se cargó el token de Hostinger}"

# Clave: 24 caracteres con mayúscula, minúscula, número y símbolo (lo que pide Hostinger).
PASS=$(python3 -c "
import secrets,string
while True:
    p=''.join(secrets.choice(string.ascii_letters+string.digits+'!#%+=?') for _ in range(24))
    if any(c.islower() for c in p) and any(c.isupper() for c in p) and any(c.isdigit() for c in p) and any(c in '!#%+=?' for c in p): print(p); break")

echo "→ creando $CASILLA en Hostinger…"
BODY=$(python3 -c "import json,sys; print(json.dumps({'local_part':'agente','password':sys.argv[1]}))" "$PASS")
CODE=$(curl -sS -o /tmp/agente-casilla.json -w '%{http_code}' -X POST \
  "https://developers.hostinger.com/api/mail/v1/orders/$ORDEN/mailboxes" \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Content-Type: application/json' \
  -A 'memola-hapi/1.0' --data "$BODY")
echo "   HTTP $CODE"
# Hostinger a veces responde 500 y crea igual: se verifica listando.
curl -sS "https://developers.hostinger.com/api/mail/v1/orders/$ORDEN/mailboxes" \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -A 'memola-hapi/1.0' | grep -q "\"$CASILLA\"" \
  || { echo "✗ la casilla no aparece; respuesta:"; cat /tmp/agente-casilla.json; exit 1; }
rm -f /tmp/agente-casilla.json
echo "✓ casilla creada"

echo "→ guardando la clave en el Llavero (servicio hostinger-mail-consignatarias)…"
security add-generic-password -U -a "$CASILLA" -s hostinger-mail-consignatarias -w "$PASS"

echo "→ cargándola en Vercel (production) como AGENTE_IMAP_PASSWORD…"
cd "$REPO"
vercel env rm AGENTE_IMAP_PASSWORD production -y >/dev/null 2>&1 || true
printf '%s' "$PASS" | vercel env add AGENTE_IMAP_PASSWORD production >/dev/null
echo "✓ listo. El agente empieza a escribir en el próximo deploy."
