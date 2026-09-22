# Publicar `ar.com.consignatarias/cattle-market` en el registry oficial MCP

Fuente de verdad: `registry.modelcontextprotocol.io` (backing: Anthropic, GitHub, PulseMCP, Microsoft).
Propaga a aggregators downstream (PulseMCP, Glama, marketplaces) que pullean ~1x/hora.

## Por qué calificamos (confirmado en docs oficiales)
- Server CERRADO: OK. El registry soporta closed-source siempre que el server sea "publicly accessible"
  (remoto no restringido a red privada). Nuestro endpoint streamable-http publico cumple.
- NO se necesita repo GitHub publico: usamos namespace de DOMINIO (reverse-DNS) via DNS TXT.
- El registry es "deliberately unopinionated": NO rankea. El ranking/curation ocurre downstream.

## Namespace
- Dominio: consignatarias.com.ar  ->  reverse-DNS: ar.com.consignatarias
- Nombre del server: ar.com.consignatarias/cattle-market
- El TXT de verificacion va en el APEX del dominio consignatarias.com.ar

## Requisitos previos (Jose)
1. Instalar CLI: `brew install mcp-publisher`  (o bajar binario del release de modelcontextprotocol/registry)
2. Acceso al panel DNS de consignatarias.com.ar para crear un TXT.

## Paso 1 - La clave (YA EXISTE — no regenerarla salvo que se haya perdido)

**La clave privada vive en `~/.mcp-keys/consignatarias-mcp.pem`.** El runbook original decía
`key.pem` dentro de esta carpeta; se movió fuera del repo. Si el archivo está, saltear al Paso 3.

Regenerarla INVALIDA el TXT del DNS y obliga a rehacer el Paso 2. Solo si se perdió:
```bash
mkdir -p ~/.mcp-keys
MY_DOMAIN="consignatarias.com.ar"
openssl genpkey -algorithm Ed25519 -out ~/.mcp-keys/consignatarias-mcp.pem
PUBLIC_KEY="$(openssl pkey -in ~/.mcp-keys/consignatarias-mcp.pem -pubout -outform DER | tail -c 32 | base64)"
echo "${MY_DOMAIN}. IN TXT \"v=MCPv1; k=ed25519; p=${PUBLIC_KEY}\""
```
El namespace está anclado al DOMINIO, así que perder la clave no pierde el nombre: se regenera
el par y se actualiza el TXT.

## Paso 2 - Crear el registro DNS TXT (Jose, en el panel DNS)
- Host/Name: @  (apex de consignatarias.com.ar)
- Tipo: TXT
- Valor: v=MCPv1; k=ed25519; p=<PUBLIC_KEY del paso 1>
- Esperar propagacion (verificar):
```bash
dig +short TXT consignatarias.com.ar | grep MCPv1
```

## Paso 3 - Login por DNS (demuestra control del dominio)
```bash
MY_DOMAIN="consignatarias.com.ar"
PRIVATE_KEY="$(openssl pkey -in ~/.mcp-keys/consignatarias-mcp.pem -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')"
mcp-publisher login dns --domain "${MY_DOMAIN}" --private-key "${PRIVATE_KEY}"
```

## Paso 4 - Publicar

**Se publica `mcp-registry/server.json`, el de ESTA carpeta** — hay que pararse acá.
Ojo: existe otro `server.json` en la raíz del repo con un `$schema` más nuevo
(`2025-10-17`, con `repository` en vez de `websiteUrl`). Publicar desde la raíz subiría
ese otro archivo. Es una divergencia vieja; hasta resolverla, **publicar siempre desde
`mcp-registry/`**.

```bash
cd <repo>/mcp-registry
mcp-publisher publish
```

## Verificar que quedo listado
```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=consignatarias" | jq
```

## Para actualizar (nuevas tools / cambio de endpoint)

- Subir `version` en server.json y volver a `mcp-publisher publish` (mismo login DNS).
- **Las tres copias tienen que quedar coherentes** (`mcp-registry/server.json`, `server.json`,
  `public/.well-known/mcp/server.json`). Chequeo rápido antes de publicar:

```bash
cd <repo> && python3 - <<'EOF'
import json, pathlib
for f in ['mcp-registry/server.json','server.json','public/.well-known/mcp/server.json']:
    d = json.loads(pathlib.Path(f).read_text())
    cap = '' if f.startswith('public/') else ('  ⚠ >100' if len(d['description']) > 100 else '  ok<=100')
    print(f"{f:44} v{d['version']:8} desc={len(d['description']):4}{cap}")
EOF
```

- **El cap de 100 caracteres es del REGISTRY, no del `.well-known`.** Ese último es la superficie
  de descubrimiento que lee un cliente MCP y admite una descripción larga: en 2026-09 se pisó por
  error con la versión corta de 99 y hubo que restaurarla. No las unifiques.

### Pendiente al 2026-09-22: publicar v1.4.0

`v1.4.0` está en el repo y **sin publicar**. Agrega `get_vr_historico` (serie de dispersión de
precios) y cambia la descripción, porque la anterior —"INMAG, precios, remates, directorio y valor
de la hectárea"— no cubría ese tipo de dato. Hasta que se corra el publish, el directorio muestra
la descripción de v1.3.0: el server funciona igual, pero un humano navegando el registry no se
entera de que existe la banda.

```bash
# 1. login (la clave está en ~/.mcp-keys/)
MY_DOMAIN="consignatarias.com.ar"
PRIVATE_KEY="$(openssl pkey -in ~/.mcp-keys/consignatarias-mcp.pem -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')"
mcp-publisher login dns --domain "${MY_DOMAIN}" --private-key "${PRIVATE_KEY}"

# 2. publicar desde mcp-registry/
cd <repo>/mcp-registry && mcp-publisher publish

# 3. verificar (propaga a aggregators en ~1h)
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=consignatarias" | jq '.servers[] | {name, version, description}'
```

## Ranking real (ocurre downstream, no en el registry)
El registry solo aloja metadata. Para figurar/rankear en los aggregators que consumen el registry:
- description rica y con keywords (indice novillo, precios hacienda, remates, arrendamiento, Argentina).
- websiteUrl apuntando a la landing con /api-docs.
- Mantener el endpoint sano (uptime): aggregators y clients pueden hacer health checks.
- Sumar submissions directas a PulseMCP / Glama despues (ellos igual pullean del registry, pero
  aceptan metadata extra: logo, categorias, ratings).
