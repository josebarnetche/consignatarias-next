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

## Paso 1 - Generar el par de claves y el TXT (Ed25519)
```bash
cd /Users/josebarnetche/consignatarias/mcp-registry
MY_DOMAIN="consignatarias.com.ar"
openssl genpkey -algorithm Ed25519 -out key.pem
PUBLIC_KEY="$(openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64)"
echo "${MY_DOMAIN}. IN TXT \"v=MCPv1; k=ed25519; p=${PUBLIC_KEY}\""
```
Guardar key.pem fuera de git (es la clave privada).

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
PRIVATE_KEY="$(openssl pkey -in key.pem -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')"
mcp-publisher login dns --domain "${MY_DOMAIN}" --private-key "${PRIVATE_KEY}"
```

## Paso 4 - Publicar
server.json ya esta en esta carpeta. Validar y publicar:
```bash
cd /Users/josebarnetche/consignatarias/mcp-registry
mcp-publisher publish
```

## Verificar que quedo listado
```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=consignatarias" | jq
```

## Para actualizar (nuevas tools / cambio de endpoint)
- Subir "version" en server.json y volver a `mcp-publisher publish` (mismo login DNS).

## Ranking real (ocurre downstream, no en el registry)
El registry solo aloja metadata. Para figurar/rankear en los aggregators que consumen el registry:
- description rica y con keywords (indice novillo, precios hacienda, remates, arrendamiento, Argentina).
- websiteUrl apuntando a la landing con /api-docs.
- Mantener el endpoint sano (uptime): aggregators y clients pueden hacer health checks.
- Sumar submissions directas a PulseMCP / Glama despues (ellos igual pullean del registry, pero
  aceptan metadata extra: logo, categorias, ratings).
