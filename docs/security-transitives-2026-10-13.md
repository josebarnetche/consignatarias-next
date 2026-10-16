# Auditoría de dependencias transitivas — 13/10/2026

Base auditada: `09ea3f1787185b9f651bd44797180d7d7e5f0a08` de main, posterior al PR #55. Next.js permanece en 15.5.27. Se verificaron los logs de las corridas 38305310730, 38305310416 y 38305308518.

## Exposición y cambios mínimos

| Dependencia | Camino | Exposición observada | Corrección |
| --- | --- | --- | --- |
| source-map-js 1.2.1 | PostCSS 8.5.8; también hay PostCSS por Next.js | Procesamiento de mapas de fuentes durante construcción/desarrollo. El árbol `--prod` incluye PostCSS por Next, por lo que no se clasifica como exclusivamente dev por su ubicación. No se encontró código de aplicación que acepte mapas de fuentes de usuarios. | Override de versiones <1.2.2 a 1.2.2, compatible con los rangos existentes. |
| postcss-selector-parser 6.1.2 | Tailwind 3.4.19 y postcss-nested 6.2.0 | Build: analiza CSS/selectores del repositorio. No hay servicio de parsing CSS de usuarios. | Overrides limitados a ambos padres hacia 7.1.6. Cruza una versión mayor; se comprobó el CSS generado, sin migrar a Tailwind 4. |
| DOMPurify 3.3.3 | Dependencia opcional de jsPDF 4.2.1 | Dependencia de producción. Los generadores de PDF utilizan texto, tablas y dibujo; no se encontró `doc.html()`, import directo de DOMPurify ni sanitización DOM. No se demostró una ruta explotable de estas alertas. | Override limitado a jsPDF hacia 3.4.17, dentro de la serie 3.x. |

La falta de una ruta encontrada no prueba ausencia absoluta de riesgo. No se auditó el despliegue remoto ni se ejecutaron ataques en producción.

## Avisos revisados

- [source-map-js: bloqueo del event loop con offsets de mapas indexados](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), corregido en 1.2.2.
- [Parser: complejidad cuadrática de selectores planos](https://github.com/postcss/postcss-selector-parser/security/advisories/GHSA-rj75-hqrm-r3gf), corregido en 7.1.6.
- [Parser: recursión no controlada](https://github.com/advisories/GHSA-w9m9-85wc-3x92). El parche 6.1.3 no cubre el aviso anterior; por eso no basta subir solamente a 6.1.3.
- [DOMPurify: IN_PLACE y rawtext](https://github.com/cure53/DOMPurify/security/advisories/GHSA-6688-9rhm-gjv2), corregido en 3.4.16. La instalación usa 3.4.17 y el audit posterior no informa avisos para DOMPurify.

## Dependabot

Los logs confirman `security_update_not_possible`, sin dependencias conflictivas listadas; también informan `VulnerabilityAuditor: missing lockfile`. Esto es una pista del actualizador, no evidencia de que las versiones corregidas no existan. pnpm 10.30.2, fijado por `packageManager`, resolvió las tres versiones con overrides y regeneró el lockfile. No se modificó el gestor, no se suprimieron alertas ni se deshabilitó CI.

## Validación

- Instalación con `corepack pnpm install --frozen-lockfile` correcta.
- `pnpm check`: tipos, lint, refs de base de datos, manifiestos MCP, colores y 574 pruebas existentes correctos; lint mantiene 10 warnings preexistentes.
- Dos pruebas de integración adicionales generan el PDF de canon con el camino de la muestra y el parte semanal, y los leen con pdf-lib; el parte conserva sus dos páginas.
- `pnpm check` final: 56 archivos y 576 pruebas aprobadas, incluyendo las dos nuevas.
- `pnpm build`: exit 0, compilación y generación de las 4.409 páginas completadas. Sin credenciales de Supabase: algunas páginas usan el estado vacío previsto por la aplicación. Esto no valida datos ni integraciones autenticadas de producción. Se mantienen warnings existentes de lint y exports de las imágenes de Twitter.
- CSS completo de Tailwind, antes/después de los overrides, idéntico byte a byte. SHA-256: `2cf1ca7008e47ed3a8265a5caa7de7ecae77b4c6e235630a5e6adfa95f86227b`.
- `pnpm why` encuentra sólo source-map-js 1.2.2, postcss-selector-parser 7.1.6 y DOMPurify 3.4.17.
- `pnpm audit --json` posterior: ninguna alerta de estas tres dependencias. La auditoría global aún devuelve 82 alertas (2 low, 37 moderate, 43 high) en otras dependencias. No se presenta este trabajo como una limpieza global de seguridad.

## Seguimiento y mitigaciones

Las tres dependencias tienen corrección disponible y aplicada. Mantener builds sobre código revisado, no incorporar selectores o mapas de fuentes de usuarios al pipeline, y no introducir conversión de HTML no confiable en los PDF sin una revisión específica. Retirar los overrides cuando las dependencias padres resuelvan por sí mismas versiones corregidas y repetir las pruebas de CSS/PDF.

El PR #23 existente trata PostCSS directamente y sigue pendiente; este cambio no reemplaza todas sus correcciones. Auditar las alertas restantes separadamente según alcance y entradas alcanzables; no ignorarlas en bloque.
