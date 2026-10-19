# Cuenta de servicio de Google Search Console

> 17-10-2026 · Para el bloque **"Lo que buscan en Google sobre su firma"** (panel PRO,
> reporte mensual y PDF de la propuesta). El cron `/api/cron/gsc-fichas` la necesita
> para leer Search Console en producción.

## Por qué

Hoy los scripts de `scripts/` leen Search Console con un token OAuth
(`scripts/archive/oauth-token.json`). La app de Google está en modo *testing*, así que
**ese token vence cada 7 días** y hay que regenerarlo a mano (`node scripts/gsc-auth.mjs`).
En un cron de producción eso significa que deja de andar sin avisar.

Una **cuenta de servicio** es un usuario-robot de Google con una clave que no vence.
Se la agrega como usuario de la propiedad de Search Console y listo.

## Pasos (≈10 minutos)

### 1. Elegir o crear el proyecto de Google Cloud

1. Entrar a <https://console.cloud.google.com/> con la cuenta de Google que administra
   Search Console.
2. Arriba a la izquierda, en el selector de proyecto: usar el proyecto donde ya está la
   app OAuth de los scripts (el `client_id` de `scripts/archive/oauth-credentials.json`
   dice cuál es), o **Proyecto nuevo** → nombre `consignatarias-gsc`.

### 2. Habilitar la API de Search Console

1. Menú ☰ → **APIs y servicios** → **Biblioteca**.
2. Buscar **Google Search Console API** → **Habilitar**.

### 3. Crear la cuenta de servicio

1. Menú ☰ → **IAM y administración** → **Cuentas de servicio** → **+ Crear cuenta de servicio**.
2. Nombre: `gsc-fichas`. El ID queda como `gsc-fichas@<proyecto>.iam.gserviceaccount.com`.
3. **Crear y continuar**. Los pasos de *roles* y *acceso de usuarios* se saltean
   (no necesita ningún rol de Google Cloud: el permiso se lo da Search Console).
4. **Listo**.

### 4. Descargar la clave JSON

1. Entrar a la cuenta recién creada → pestaña **Claves** → **Agregar clave** →
   **Crear clave nueva** → **JSON** → **Crear**.
2. Se descarga un archivo `<proyecto>-xxxxxxxx.json`. **Es una contraseña**: no se sube
   al repo, no se manda por mail ni por WhatsApp. Guardarlo fuera de la carpeta del
   proyecto (por ejemplo en `~/.mcp-keys/`).

> Si la organización de Google Cloud bloquea la creación de claves
> (`iam.disableServiceAccountKeyCreation`), hay que desactivar esa política para el
> proyecto en **IAM y administración → Políticas de la organización**.

### 5. Darle acceso en Search Console

1. Entrar a <https://search.google.com/search-console> → propiedad
   **consignatarias.com.ar** (la de dominio, `sc-domain:consignatarias.com.ar`).
2. **Configuración** → **Usuarios y permisos** → **Agregar usuario**.
3. Email: el `client_email` del JSON (`gsc-fichas@<proyecto>.iam.gserviceaccount.com`).
4. Permiso: **Restringido** alcanza (sólo lee).

### 6. Cargarla en Vercel

Conviene cargarla en **base64**: así los saltos de línea de la clave privada no se rompen
al pegar.

```bash
base64 -i ~/.mcp-keys/<archivo>.json | tr -d '\n' | pbcopy
```

1. Vercel → proyecto **consignatarias-next** → **Settings** → **Environment Variables**.
2. Nombre: `GSC_SERVICE_ACCOUNT_JSON`. Valor: pegar (lo que copió el comando de arriba).
   También acepta el JSON pegado tal cual.
3. Entorno: **Production** (y Preview si se quiere probar ahí). Marcar como *Sensitive*.
4. **Save** y hacer un redeploy para que la función la tome.

### 7. Probar

Desde GitHub → **Actions** → **GSC por ficha (Lo que buscan en Google)** → **Run workflow**.
El paso debe responder `HTTP 200` con algo como
`"d28":{"fichas":62,...},"d90":{"fichas":65,...}`. Si responde
`GSC_SERVICE_ACCOUNT_JSON sin configurar`, la variable no llegó a la función (falta el
redeploy). Si da `403 User does not have sufficient permission`, falta el paso 5 o se
agregó en otra propiedad (tiene que ser la de dominio).

Para usarla también en local: agregar la misma línea a `.env.local`.
`scripts/gsc-fichas-local.mjs` la prefiere al token OAuth cuando está.
`scripts/gsc-report.mjs` lee el mismo JSON pero con otro nombre de variable
(`GSC_SA_KEY`): para que también deje de depender del token, cargar ahí el mismo valor.

## Si hay que revocarla

Google Cloud → Cuentas de servicio → `gsc-fichas` → **Claves** → borrar la clave. Crear
una nueva y repetir el paso 6. Quitarla de Search Console en **Usuarios y permisos**
corta el acceso de inmediato.
