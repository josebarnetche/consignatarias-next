# Memo para el abogado: el servicio de contacto de consignatarias.com.ar

> **BORRADOR, no enviado.** Lo arma la sesión del agente para que José se lo lleve a un abogado. No es asesoramiento legal.
> Investigación de base, con fuentes: `docs/agente/decisiones-2026-10-22-siocal-arrendamiento-campos.md`.

**Sociedad:** Memola Medios SAS, dueña de consignatarias.com.ar, con domicilio fiscal en Córdoba.
**Fecha del borrador:** 22-10-2026.

## 1. Qué hace el servicio

Un sistema automatizado recibe pedidos de gente que quiere comprar o vender hacienda bovina. Los pedidos llegan por el formulario del sitio, por las demandas de compra o por un asistente vía MCP.

Con cada pedido, el sistema:
1. Le pide al interesado los datos mínimos: cabezas, categoría y zona.
2. Busca posibles contrapartes entre consignatarias, frigoríficos y otros productores que publicaron con nosotros.
3. Les manda una oferta por correo que describe el lote o el pedido, sin datos de contacto del interesado.
4. Si la contraparte responde **ACEPTO** por escrito, le pasa el contacto directo del interesado y presenta a las dos partes.

**Lo que el servicio no hace:**
- No negocia precio, plazo ni flete.
- No firma nada.
- No toma la hacienda.
- No cobra ni paga por cuenta de nadie.
- No emite liquidaciones ni DT-e.
- No garantiza el pago.

## 2. Cómo se cobra hoy y cómo podría cobrarse

| Modo | Texto que recibe la contraparte | Estado |
|---|---|---|
| **A éxito** | "si la operación se concreta, el servicio cuesta el 1% del bruto, a cargo de ustedes, y lo facturamos. Si no se concreta, no hay ningún cargo." | Lo que sale hoy |
| **Tarifa fija** | "cuesta $45.000 + IVA por contacto entregado, a cargo de ustedes, y lo facturamos al pasarlo. No depende de que la operación se concrete ni de su monto." | Preparado, apagado (`AGENTE_COBRO_HACIENDA=tarifa`). El monto es ESTIMADO |

El texto completo de la oferta y del recordatorio está en el anexo.

## 3. Lo que encontró la investigación (para que lo confirme o lo corrija)

1. **SIOCAL** (Res. SAGyP 103/2026, Anexo I).
   - El "consignatario/comisionista de ganados" (pt. 2.9) actúa según el art. 1335 CCyC, es decir, como mandatario.
   - La figura de corredor existe solo para granos (Anexo III, pt. 25).
   - No encontramos una categoría que capture a un vinculador que no actúa por cuenta de nadie.
   - El pt. 1.1 ("intervengan en el comercio") podría leerse en sentido amplio.
2. **Corretaje.**
   - Un % del bruto a éxito parece, por su contenido, un corretaje (art. 1345 CCyC).
   - Sin matrícula, la acción de cobro estaría en duda: art. 1346, y Ley 20.266 art. 33 según la Ley 25.028.
   - La jurisprudencia que encontramos es inmobiliaria.
3. **Riesgo comercial.** El pt. 4.6 del Anexo II pide a los inscriptos que no operen con no inscriptos que debían inscribirse. Una consignataria prudente podría negarse a contratarnos.
4. **Precedente Rosgan.** La plataforma organiza, y una consignataria inscripta factura la comisión.

## 4. Preguntas

1. ¿La obligación de inscribirse en el SIOCAL se limita a las categorías definidas, según el pt. 1.2? ¿O la DNCCA podría usar el pt. 1.1 contra un vinculador digital que no actúa por cuenta de nadie? ¿Conviene hacer una consulta formal?
2. Con el 1% del bruto a éxito, pactado con un ACEPTO escrito, ¿se recalifica la actividad como corretaje (art. 1345)? ¿Se puede cobrar en juicio sin matrícula?
3. Si hiciera falta matrícula, ¿cuál exige la jurisdicción de la sociedad (Córdoba) y alcanza a los semovientes?
4. Si se pasa a una tarifa fija por contacto entregado, ¿desaparece el encuadre de corretaje? ¿Qué cláusulas lo blindan? (Borrador en `02-condiciones-servicio-contacto.md`).
5. ¿Cómo se redacta un fee de originación con una consignataria inscripta, o con un corredor matriculado, sin violar el pt. 4.6 ni que cuente como compartir comisión o prestar el nombre? (Borradores en `03-…` y `04-…`).
6. En el texto que reciben las contrapartes decimos que no somos "consignataria ni mandataria". Antes decía "ni intermediaria". ¿Cuál de las dos es la correcta?
7. Factura e IVA: ¿con qué actividad se factura el servicio de contacto? ¿Va con IVA al 21%?

## 5. Lo que necesitamos de vuelta

- Para cada pregunta: sí, no o cómo redactarlo.
- Un OK, o una versión corregida, de las condiciones del anexo 02.
- Una recomendación entre tarifa fija, éxito con alianza o inscripción, con su costo aproximado.

## Anexo: textos reales

Fuente: `src/lib/agente/mensajes-contacto.ts` y `src/lib/agente/mensajes.ts`, v1.253.0.

> Les escribimos desde consignatarias.com. Un productor publicó con nosotros hacienda que puede interesarle a [firma]:
> · Cabezas … · Categoría … · Zona …
> Si quieren el contacto directo del productor, respondan ACEPTO. [texto del cobro según el modo, ver punto 2]
> consignatarias.com no es consignataria ni mandataria en la operación: no negociamos el precio, no cobramos ni pagamos por cuenta de nadie, no emitimos liquidaciones ni DT-e y no garantizamos el pago. Precio, plazo, flete y documentación los acuerdan las partes directamente.
> Antes de operar, verifiquen entre ustedes la inscripción vigente en el SIOCAL y el RENSPA del establecimiento.
> [pie de comunicación comercial y baja, Ley 25.326 art. 27 / Disp. 4/2009]

Recordatorio a los 3, 7 y 14 días, en el mismo hilo: "Si les interesa, respondan ACEPTO y les pasamos el contacto directo (servicio de contacto: 1% del bruto solo si la operación se concreta)."
