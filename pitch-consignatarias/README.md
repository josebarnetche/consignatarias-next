# Pitch: Módulo Frigoríficos para consignatarias.com.ar

Propuesta para integrar un portal autenticado de frigoríficos dentro de consignatarias.com.ar, transformando el directorio estático de 364 frigoríficos en usuarios activos con watchlist de remates, alertas inteligentes, y un camino hacia marketplace.

## Documentos

| # | Archivo | Contenido |
|---|---------|-----------|
| 0 | [Resumen ejecutivo](00-resumen-ejecutivo.md) | La propuesta en 2 páginas — empezar por acá |
| 1 | [Oportunidad de mercado](01-oportunidad-mercado.md) | Investigación: industria de USD 14B, pain points, gaps competitivos |
| 2 | [Propuesta de producto](02-propuesta-producto.md) | Features detallados: registro, watchlist, alertas, panel, user stories |
| 3 | [Arquitectura de integración](03-arquitectura-integracion.md) | Schema SQL, rutas, middleware, componentes — cómo se construye dentro de la app existente |
| 4 | [Modelo de negocio](04-modelo-negocio.md) | Monetización en fases: gratis → freemium → marketplace |
| 5 | [Hoja de ruta](05-hoja-de-ruta.md) | Timeline semana a semana, equipo necesario, riesgos |
| 6 | [Por qué ahora](06-por-que-ahora.md) | Timing: exportaciones récord, SENASA 2026, cero competencia digital |

## Datos de soporte

| Archivo | Contenido |
|---------|-----------|
| [frigorificos_target.csv](frigorificos_target.csv) | Base de datos de 40+ frigoríficos con contacto, capacidad y ubicación |

## Investigación de base (en directorio padre)

Los siguientes documentos contienen la investigación profunda que sustenta esta propuesta:

- `layer1_demand_signals.md` — Análisis de demanda, search intent, gaps de mercado
- `layer2_business_models.md` — Modelos de negocio, unit economics, competencia
- `layer3_blockchain_token.md` — Visión largo plazo (tokenización, CarneCoin)
- `platform_layer1_transaction_flow.md` — Mecánica de transacciones actual (MAG, Rosgan, directa)
- `platform_layer2_value_proposition.md` — Value proposition, pricing, go-to-market playbook
