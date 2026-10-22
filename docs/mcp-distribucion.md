# Distribución del MCP fuera de Google

> Estado verificado el **22-10-2026**. Con el OK de José del 22-10 ya se hicieron los pasos 1, 5, 6 (actualización) y 7, en su versión gratis, y la descripción del repo (paso 10). El resto espera su cuenta o su OK. El orden importa. Primero se mergea y despliega el PR que trae este archivo
> (server card, títulos y anotaciones nuevas en producción) y recién después se publica
> o se re-escanea en cada directorio. Si se hace al revés, los directorios vuelven a guardar la
> ficha vieja.

- **Server:** `ar.com.consignatarias/cattle-market`
- **Endpoint:** `https://www.consignatarias.com.ar/api/mcp` (Streamable HTTP, sin autenticación)
- **29 tools**: 26 de lectura y 3 de escritura (`create_price_alert`, `cattle_buying_request`, `market_match` con `registrar: true`), 16 prompts, resources y completions (v1.9.0).
- **Ficha para escáneres:** `https://www.consignatarias.com.ar/.well-known/mcp/server-card.json`
- **Página humana:** `https://www.consignatarias.com.ar/mcp`
- **Repo público:** `https://github.com/josebarnetche/consignatarias-next` (id `1167351861`)

## Dónde estamos hoy

| Directorio | Estado al 21-10 | Qué falta |
|---|---|---|
| Registry oficial (`registry.modelcontextprotocol.io`) | ✅ **Publicado v1.9.0 el 22-10** (latest), con `title`, íconos, `repository` y descripción en inglés | Nada |
| Glama (connector) | Listado, Healthy, 100% de uptime en 65 días, TDQS **A 3,8/5** sobre 28 tools (medido antes de v1.9.0; hoy son 29). **Sin reclamar** | Reclamarlo (paso 2) |
| Smithery | Listado desde el 04-10 como **"MCP-CATTLE-MARKET"**, con el escaneo viejo (24 tools, nombres anteriores), sin verificar | Renombrar, re-escanear y verificar (paso 3) |
| punkpeye/awesome-remote-mcp-servers | Listado en Agriculture, con el badge de Glama | Nada |
| Directorio de conectores de Claude | No | Enviar (paso 4) |
| mcpservers.org (wong2) | ✅ Enviado gratis el 22-10, revisión en ~2 semanas, aviso a agro@ | Esperar |
| mcp.so | Issue gratis [chatmcp/mcpso#4663](https://github.com/chatmcp/mcpso/issues/4663) abierto el 03-10, sin respuesta; actualizado a v1.9.0 el 22-10 | Esperar, o US$39 si José quiere |
| MCP Market | ✅ Enviado a la cola gratis el 22-10 (repo de GitHub), 4 a 6 semanas, aviso a agro@. La pestaña Remote MCP solo ofrece la opción paga (US$69) | Esperar |
| GitHub MCP registry (github.com/mcp, alimenta VS Code) | No | Mail (paso 8) |
| Docker MCP Catalog | No | **Bloqueado:** el repo no tiene licencia (paso 9) |
| PulseMCP | No se pudo confirmar: Cloudflare devuelve 403 | Cerrado a altas y a correcciones. Lo toma solo del registry cuando reabra |
| LobeHub, ChatGPT apps, Cursor directory | No | Más adelante (paso 10) |

**Cuál trae tráfico.** Ninguno publica cifras auditadas. Las cifras son las que declara cada
sitio: mcp.so dice 266.000 usuarios activos por mes y MCP Market, más de un millón de visitas
por mes. Lo que sí se mide del lado nuestro: hoy el único consumidor sostenido es anónimo, vía
Cloudflare, y el resto del uso viene de escáneres de registries.

Los dos canales con más uso real potencial son los que meten el server **dentro del cliente**,
no en una página web: el directorio de conectores de Claude y el registry oficial (lo leen Glama
y PulseMCP, y de él parte la curación de GitHub para VS Code).

Para atribuir cada alta, conviene anotar la fecha de cada envío y mirar `/admin/ops` la semana
siguiente. Las tools ya devuelven la fuente con `utm_source=mcp`.

---

## Paso 1 — Registry oficial: publicar v1.9.0

**Qué cambia.** No cambia ninguna tool: cambia la ficha.
- Suma `title` ("Consignatarias · Argentine Cattle Market").
- Suma `icons` (`/icon-512.png` y `/icon-192.png`).
- Suma `repository` con su id.
- `websiteUrl` pasa a apuntar a `/mcp`.
- La descripción pasa a inglés, porque los directorios que leen el registry se buscan en inglés.

`mcp-publisher validate` ya dio OK contra el registry el 21-10.

**Requiere:** la clave en `~/.mcp-keys/consignatarias-mcp.pem` (el TXT del apex ya está).

```bash
MY_DOMAIN="consignatarias.com.ar"
PRIVATE_KEY="$(openssl pkey -in ~/.mcp-keys/consignatarias-mcp.pem -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')"
mcp-publisher login dns --domain "${MY_DOMAIN}" --private-key "${PRIVATE_KEY}"
cd <repo>/mcp-registry && mcp-publisher publish
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=consignatarias" \
  | jq '.servers[] | {version: .server.version, title: .server.title, latest: ._meta["io.modelcontextprotocol.registry/official"].isLatest}'
```

**Qué aprueba José:** la descripción en inglés (98/100 caracteres):

> Argentine cattle market data: steer index since 2015, prices, auctions, land values, SENASA rules.

Si prefiere mantenerla en castellano, hay que cambiarla en `mcp-registry/server.json` y en
`server.json` antes de publicar. `pnpm check` controla el límite de 100. Alternativa en
castellano (89 caracteres):

> Mercado ganadero argentino: índice novillo desde 2015, precios, remates, tierra y SENASA.

---

## Paso 2 — Glama: reclamar el connector

**Para qué.** Reclamarlo habilita los health checks, la analítica de uso y la edición del listado.
- Es la única forma de ver quién usa el server desde Glama.
- Verificar el dominio cubre todos los connectors servidos desde `consignatarias.com.ar`.

**Cómo:**
1. Iniciar sesión en Glama y abrir
   `https://glama.ai/mcp/connectors/ar.com.consignatarias/cattle-market` → "claim ownership".
2. Glama da un token `glama_claim_<32 caracteres>`. No es secreto: es una prueba pública de dominio.
3. Reemplazar el contenido de `public/.well-known/glama.json` por:
   ```json
   {
     "$schema": "https://glama.ai/mcp/schemas/connector.json",
     "claim": "glama_claim_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
   }
   ```
   - El formato actual, `maintainers: [{ email }]`, está **deprecado** según el schema de Glama.
   - El archivo tiene que quedar publicado, porque Glama lo vuelve a chequear.
   - Alternativa sin deploy: un TXT en `_glama-claim.consignatarias.com.ar` con el mismo token.
4. Deploy y "verify" en el panel.

**Qué aprueba José:** la cuenta de Glama con la que se reclama, y el commit con el token.

**Mejora de TDQS sugerida por Glama** (no es un envío, queda para después): 29 tools está por
encima de 25, y el grupo de tierra se superpone.
- `calculate_farmland_rent` y `value_farmland_rent` calculan los dos el canon.
- Consolidarlas sube la nota de "Tool Count" y "Disambiguation".

---

## Paso 3 — Smithery: renombrar, re-escanear y verificar

Hoy figura como `jose-barnetche19/consignatarias-cattle-market`, con displayName
**"MCP-CATTLE-MARKET"** y la descripción "24 tools". Smithery pone su propio proxy delante
(`https://consignatarias-cattle-market--jose-barnetche19.run.tools`). Cuando no puede hacer
el handshake, lee la server card, que hasta este PR estaba vieja.

**3a. Re-escanear** (después del deploy de este PR):
```bash
npm i -g smithery@latest
smithery auth login
smithery mcp publish "https://www.consignatarias.com.ar/api/mcp" -n jose-barnetche19/consignatarias-cattle-market
```

**3b. Ficha.** Se edita desde el panel del server, en Settings, o por API:
```bash
curl -X PATCH "https://api.smithery.ai/servers/jose-barnetche19%2Fconsignatarias-cattle-market" \
  -H "Authorization: Bearer $SMITHERY_API_KEY" -H "Content-Type: application/json" \
  -d @smithery-ficha.json
```

`smithery-ficha.json`:
```json
{
  "displayName": "Consignatarias · Argentine Cattle Market",
  "homepage": "https://www.consignatarias.com.ar/mcp",
  "repositoryUrl": "https://github.com/josebarnetche/consignatarias-next",
  "description": "Argentina's cattle market as tools for AI agents, free and without quota. The daily steer index (INMAG) since 2015 in pesos and dollars, prices by category and the price band actually observed in lot sales (P10, median, P90), seasonality, and the gap against the US, Uruguay and Australia in USD per live kilo. Upcoming auctions, livestock brokers and 1,100+ licensed meat plants. Land value per hectare in 15 provinces and 52 zones, farmland rent indexed to steer kilos, and SENASA animal-health rules with the regulation cited. Anonymous buyer/seller matching for cattle and farmland. 29 tools, every answer with its source and date."
}
```

**3c. Verificación.** Está en Settings → Verification del server. El checklist no está documentado
en público. El campo `backlinkUrl` de la API sugiere una prueba por enlace. La página `/mcp` ya
enlaza a la ficha de Smithery, así que puede servir como `backlinkUrl`:
`https://www.consignatarias.com.ar/mcp`.

**Qué aprueba José:**
- El nombre visible y la descripción.
- Usar su API key de Smithery: no va al repo, va en una variable de entorno local.

---

## Paso 4 — Directorio de conectores de Claude

Es el envío con más uso real potencial, porque el server aparece dentro de Claude.

**Requisitos** (`https://www.claude.com/docs/connectors/building/submission`). Este PR deja todo
cumplido salvo lo que es de cuenta:
- URL https, sin autenticación (permitido para datos públicos). ✔
- Cada tool con `title` y `readOnlyHint`/`destructiveHint`. ✔ desde este PR. Antes, 10 tools caían
  al slug como título y `cattle_buying_request`, que escribe, se declaraba de solo lectura.
- Haberlo probado como conector personalizado en Claude.ai. Hacerlo antes de enviar:
  Configuración → Conectores → Agregar conector personalizado → endpoint de arriba.
- Documentación: `https://www.consignatarias.com.ar/mcp`
- Privacidad: `https://www.consignatarias.com.ar/privacidad` · Términos: `https://www.consignatarias.com.ar/terminos`
- Soporte: `agro@memola.com.ar` · Ícono: `https://www.consignatarias.com.ar/icon-512.png`

**Cómo:** `https://claude.ai/directory/manage` → "Submit new" → "MCP connector". Requiere un plan
pago de Claude. Los pasos del formulario son Connection, Tools, Listing, Use cases, Company,
Authentication ("no authentication"), Data handling, Test & launch, Compliance y Review.

**Textos para el formulario (Listing)**
- Nombre (≤100): `Consignatarias · Argentine Cattle Market`
- Frase (≤200): `Argentina's cattle market as tools: steer index since 2015, observed price bands, auctions, brokers, meat plants, land values and SENASA rules. Free, no quota, every figure sourced.`
- Categorías: Finance · Data & Analytics · Research (las que el formulario ofrezca más cerca).
- Slug: `consignatarias` (es permanente).
- Descripción (≤2.000):

> Consignatarias puts the Argentine cattle market inside Claude. Ask what a steer is worth today, whether this is a cheap month to buy, how wide prices opened this week, what 350 steers in Formosa are worth, or what a hectare costs in the Salado basin, and Claude answers with the figure, its date and its source.
>
> Market: the daily steer index (INMAG, volume-weighted, Mercado Agroganadero de Cañuelas) since 2015 in pesos and dollars; prices by category and sub-category; the price band actually observed in lot sales (P10, median, P90) and its history; seasonality in dollars; the gap against the US, Uruguay and Australia in USD per live kilo; the share of females in the slaughter as a herd-liquidation signal; macro context (official and parallel dollar, corn).
>
> Operations: upcoming auctions across Argentina, livestock broker directory and activity ranking, 1,100+ licensed meat plants (MAGYP/SENASA), lot valuation, farmland rent indexed to steer kilos, land value per hectare in 15 provinces and 52 zones, and the yield of a dollar invested in grazing land.
>
> Animal health: SENASA mandatory plans, the foot-and-mouth vaccination calendar, movement requirements, RENSPA validation and DT-e reference, each with the regulation cited, plus the 14 topics of the Good Livestock Practices guide.
>
> Three tools write: a price alert by email, a cattle buying request that returns matching auctions, and market_match when the person asks to be contacted (with explicit consent). Everything else is read-only. No account, no key, no quota. Every response ends with a ready-made citation line.

- **Use cases** (tres):
  1. "¿Cuánto vale hoy un lote de 350 novillos de 430 kg en Formosa?" → `value_cattle_lot`
  2. "¿Conviene comprar invernada en octubre o esperar?" → `price_seasonality` + `cattle_price_index`
  3. "¿Cuánto vale y cuánto renta un campo de 800 ha en la cuenca del Salado?" → `value_farmland` + `farmland_yield`
- **Data handling:**
  - Las tools de lectura no guardan datos personales; el origen se agrupa por un hash, no por IP.
  - `create_price_alert` y `cattle_buying_request` guardan el email que el usuario da para avisarle.
  - `market_match` con `registrar: true` y `consentimiento: true` guarda nombre y email o teléfono para que una persona lo contacte. Queda en revisión hasta que alguien verifique el contacto.

**Qué aprueba José:**
- Enviar con la cuenta de Memola.
- Los 7 compromisos de Compliance.
- Los textos de arriba.

---

## Paso 5 — mcpservers.org (wong2/awesome-mcp-servers)

El repo no acepta PRs: el alta es por formulario en `https://mcpservers.org/submit`.
- Gratis, con revisión en unas 2 semanas, o US$39 por revisión en 24 h con link dofollow.
- No exige repo.

| Campo | Valor |
|---|---|
| Server Name | Consignatarias · Argentine Cattle Market |
| Category | Finance |
| Short Description | Argentine cattle market as MCP tools: steer index since 2015, observed price bands, auctions, brokers, land values and SENASA rules. Free, no key. |
| Repository/Website | https://www.consignatarias.com.ar/mcp |
| Official MCP Registry Name | ar.com.consignatarias/cattle-market |
| Supports remote connections | Sí |
| Contact Email | agro@memola.com.ar |

**Qué aprueba José:** gratis o US$39.

---

## Paso 6 — mcp.so

El formulario (`https://mcp.so/submit`, pestaña "Remote Server") pide **Repository URL** y Name, y
solo mostró la opción paga: US$39, publicación inmediata y link dofollow. La vía gratis es un issue en
`https://github.com/chatmcp/mcpso/issues/new`. Entran varios por día, pero no hay evidencia de que
los mantenedores los procesen.

- Título: `Submit Remote MCP Server: Consignatarias · Argentine Cattle Market`
- Cuerpo:
  ```
  Name: Consignatarias · Argentine Cattle Market
  Endpoint (Streamable HTTP, no auth): https://www.consignatarias.com.ar/api/mcp
  Website: https://www.consignatarias.com.ar/mcp
  Repository: https://github.com/josebarnetche/consignatarias-next
  Official MCP Registry: ar.com.consignatarias/cattle-market
  Description: Argentina's cattle market as tools for AI agents: the daily steer index since 2015 in ARS and USD, observed price bands (P10/median/P90), seasonality, the gap vs the US, Uruguay and Australia, upcoming auctions, livestock brokers, 1,100+ meat plants, land value per hectare, SENASA animal-health rules and anonymous buyer/seller matching. 29 tools, free, no quota, every answer with its source and date.
  Categories: Finance, Agriculture, Data
  ```

**Qué aprueba José:**
- Issue gratis desde su cuenta de GitHub, o formulario de US$39.
- Abrir un issue en un repo de terceros.

---

## Paso 7 — MCP Market (mcpmarket.com)

`https://mcpmarket.com/submit`, pestaña "Remote MCP".
- Cola gratis de 4 a 6 semanas, o US$29 por salir en 24 h con badge y un link "Try Now".
- El campo visible pide la URL del repo de GitHub: `https://github.com/josebarnetche/consignatarias-next`.
- Avisan por email al publicar.
- No se pudo confirmar qué otros campos pide la pestaña Remote. Usar los textos del paso 5.

**Qué aprueba José:** gratis o US$29.

---

## Paso 8 — GitHub MCP registry (github.com/mcp → VS Code)

Es curado y no copia el registry oficial. Según el blog de GitHub, el camino es estar en el registry
oficial (paso 1) y escribir a `partnerships@github.com`. Borrador:

> **Asunto:** MCP Registry inclusion — ar.com.consignatarias/cattle-market
>
> Hi — we run consignatarias.com.ar, the reference data layer of the Argentine cattle market. Our remote MCP server is published in the official MCP Registry as `ar.com.consignatarias/cattle-market` (Streamable HTTP, no auth, 29 tools: daily steer index since 2015, observed price bands, auctions, brokers, land values, SENASA animal-health rules). It has 100% uptime on Glama over 65 days and an A tool-definition score. We'd like it to be considered for the GitHub MCP Registry. Endpoint: https://www.consignatarias.com.ar/api/mcp · Docs: https://www.consignatarias.com.ar/mcp · Repo: https://github.com/josebarnetche/consignatarias-next
>
> Memola Medios SAS — agro@memola.com.ar

**Qué aprueba José:** el mail. Sale de `agro@memola.com.ar`, por la regla de usar `.com.ar`.

---

## Paso 9 — Docker MCP Catalog (bloqueado)

Acepta servers remotos por PR a `github.com/docker/mcp-registry`:
- `servers/consignatarias/server.yaml` con `type: remote` y `remote: {transport_type: streamable-http, url: https://www.consignatarias.com.ar/api/mcp}`.
- `tools.json` (`[]`).
- `readme.md`.

Se arman con `task remote-wizard`. **Bloqueo:** su CONTRIBUTING pide una licencia que permita el
consumo (MIT o Apache), y `consignatarias-next` no tiene ninguna. Elegir licencia para el repo es
una decisión de José y no se tomó acá. El dato tiene su propia licencia (`/licencia-datos`) y eso
no cambia.

---

## Paso 10 — Para después

- **LobeHub:** CLI `@lobehub/market-cli`.
  - Pasos: `lhm login`, `lhm github connect`, `lhm plugin init --url https://www.consignatarias.com.ar/api/mcp` y `lhm plugin publish <gitUrl>`.
  - Exige un repo de GitHub y toma la ficha de ahí.
- **ChatGPT apps:** se sube en `platform.openai.com/plugins` con la opción "With MCP".
  - Requiere verificar la organización.
  - El token de dominio va en `/.well-known/openai-apps-challenge`.
  - Es el más pesado.
- **Cursor:** la página `/mcp` ya tiene el botón "Agregar a Cursor" (deeplink
  `cursor://anysphere.cursor-deeplink/mcp/install?name=consignatarias&config=<base64>`). No se
  pudo confirmar el mecanismo vigente de cursor.directory: respondió 429.
- **PulseMCP:** cerrado a altas y a correcciones. Toma lo del registry cuando reabra.
- **Descripción del repo en GitHub.** La actual dice "80 consignatarias… 347 remates" y está vieja;
  los directorios que leen el repo la muestran. Para actualizarla:
  ```bash
  gh repo edit josebarnetche/consignatarias-next \
    --description "Argentine cattle market data layer: daily steer index since 2015, auctions, brokers, meat plants, land values — site + remote MCP server (ar.com.consignatarias/cattle-market)." \
    --add-topic mcp --add-topic mcp-server --add-topic model-context-protocol --add-topic agriculture --add-topic cattle --add-topic argentina --add-topic livestock
  ```

---

## Prioridad y lo que aprueba José en cada uno

| # | Envío | Costo | Aprueba |
|---|---|---|---|
| 0 | Mergear y desplegar este PR | — | El merge |
| 1 | Registry oficial v1.9.0 | Gratis | La descripción en inglés y correr `mcp-publisher publish` |
| 2 | Reclamar Glama | Gratis | La cuenta de Glama y commitear el token en `glama.json` |
| 3 | Smithery: renombrar, re-escanear y verificar | Gratis | El nombre, la descripción y usar su API key |
| 4 | Directorio de conectores de Claude | Requiere un plan pago de Claude | Los textos, los 7 compromisos y enviar con la cuenta de Memola |
| 5 | mcpservers.org | Gratis o US$39 | Gratis o pago |
| 6 | mcp.so | Issue gratis o US$39 | Abrir el issue desde su GitHub, o pagar |
| 7 | MCP Market | Gratis (4 a 6 semanas) o US$29 | Gratis o pago |
| 8 | GitHub MCP registry | Gratis | El mail a partnerships@github.com |
| 9 | Docker MCP Catalog | Gratis | **Antes:** elegir una licencia para el repo |
| 10 | LobeHub, ChatGPT, descripción del repo | Gratis | Cada uno por separado |

## Mantenimiento

- Cambia una tool → se actualizan las cinco superficies (ver `CLAUDE.md`) **y** la server card.
  `pnpm check` falla si la server card no declara exactamente las tools del route.
  `src/app/api/mcp/mcp-superficies.test.ts` falla si `/llms.txt` o `/mcp` omiten alguna, o si
  una tool queda sin título.
- Cambia la ficha → se sube `version` en las tres copias del manifiesto, en la server card y en
  `SERVER_INFO` del route, y se republica (paso 1). Smithery se re-escanea aparte (paso 3a).
