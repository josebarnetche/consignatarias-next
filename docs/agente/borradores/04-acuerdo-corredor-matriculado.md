# Acuerdo con un corredor matriculado: arrendamientos y venta de campos

> **BORRADOR, no enviado a ningún corredor.** Lo revisa un abogado (memo 01, pregunta 5).
> **Para qué:** abrir los dos tipos que hoy tienen bloqueo legal en el agente (`TIPOS.arrendamiento` y `TIPOS.campo`, `src/lib/agente/tipos.ts`). La comisión la cobra y la factura el corredor, con su matrícula. El sitio le cobra un **fee fijo**.
> **Nunca un porcentaje de su comisión:** cobrar una parte de los honorarios de un corredor es prestar la matrícula, y está sancionado:
> - Entre Ríos, Ley 9739, art. 47 c) y d);
> - Santa Fe, Ley 13.154, art. 14;
> - Buenos Aires, Ley 10.973, art. 53.
>
> **Un corredor por provincia.** Conviene empezar por Buenos Aires, donde la escala está verificada.

---

**ACUERDO DE SERVICIOS DE ORIGINACIÓN DIGITAL (INMUEBLES RURALES)**

Entre **Memola Medios SAS** (CUIT 30-71863222-2), titular de consignatarias.com.ar ("el Prestador"), y **[NOMBRE]**, corredor inmobiliario matriculado en [COLEGIO / PROVINCIA] con la matrícula N.º [ ] ("el Corredor"), se acuerda lo siguiente:

**1. Objeto.** El Prestador le acerca al Corredor personas que consultaron en consignatarias.com.ar por arrendar, tomar en arriendo, vender o comprar un campo en [PROVINCIA] y que aceptaron ser contactadas por un corredor ("Oportunidades"). El Corredor decide si las toma. Si las toma, interviene con su matrícula, pacta por escrito sus honorarios con las partes y emite su factura.

**2. Honorarios del Corredor.** Los fija el Corredor con las partes, dentro de la escala de su provincia. Como **referencia comercial** que el Corredor puede adoptar o no, el sitio publica:
- **Arrendamiento:** 0,8 meses de canon (20% menos que el mes habitual), llevados al piso y al tope de la escala provincial sobre el valor total del contrato. Esa es la función `comisionArrendamientoLegal`. En Buenos Aires el piso es 2% y el tope 4%.
- **Venta de campo:** 2,4% + IVA al vendedor (ESTIMADO). ⚠️ En Buenos Aires, si el Corredor también representa al comprador, la escala le exige cobrarle al menos 1,5%.

**3. Lo que el Prestador no hace.**
- No interviene en la negociación, no redacta contratos y no cobra honorarios de corretaje.
- **No recibe ninguna parte ni ningún porcentaje de los honorarios del Corredor.**

**4. Precio del servicio.** **Fee fijo por Oportunidad aceptada:** $[ ] + IVA (ESTIMADO). Alternativa: abono mensual de software de $[ ] + IVA.

**El fee no depende de que la operación se concrete ni de su monto.**

**5. Datos personales y bajas.** Igual que en el acuerdo con consignatarias (borrador 03, cláusula 5).

**6. Matrícula.**
- El Corredor declara que su matrícula está vigente y que puede ejercer en la provincia del campo.
- Si la matrícula se suspende, el Prestador deja de enviarle Oportunidades.

**7. Plazo, rescisión, ley y jurisdicción.** Igual que en el borrador 03.

---

**Antes de usarlo (no se toca código hasta que José decida):**
- **Quién paga el arrendamiento:** la investigación propone el arrendatario, con confianza media-baja. Lo decide el Corredor con las partes.
- **El plazo** pasa a ser un dato obligatorio del lead. El agente de campos ya lo pide.
- **El bloqueo legal en `tipos.ts`** se levanta solo cuando exista al menos un Corredor firmado. Hasta entonces, las Oportunidades se las pasa José a mano.
