# Las 3 decisiones abiertas del agente: investigación del 22-10-2026

> Tres investigaciones con fuentes, hechas en paralelo el 22-10-2026. **No es asesoramiento legal.** Es el material para que José decida y lo lleve a un abogado y a un corredor matriculado.
> Nada de esto cambia el código: `tipos.ts` y la oferta siguen igual hasta que José decida.

## 1. Hacienda: el "servicio de contacto" frente al SIOCAL

**Conclusión (confianza media)**
- **El SIOCAL no tiene una categoría que encaje.** Res. SAGyP 103/2026, Anexo I:
  - pt. 2.9: "consignatario/comisionista" es quien actúa según el art. 1335 CCyC, o sea como mandatario.
  - "Corredor" existe solo para granos (Anexo III, pt. 25).
  - No hay ninguna excepción para plataformas.
- **El riesgo real es el corretaje, no el SIOCAL.** Un 1% del bruto cobrado solo si la operación se cierra es, por su contenido, corretaje (art. 1345 CCyC).
  - Sin matrícula no hay acción para cobrar (art. 1346 CCyC; Ley 20.266 art. 33).
  - La jurisprudencia que niega el cobro al corredor no matriculado es inmobiliaria.
- **Riesgo comercial:** el pt. 4.6 (Anexo II) obliga a los inscriptos a no operar con no inscriptos "obligados a inscribirse". Una consignataria prudente podría no querer contratarnos.

**Precedente: Rosgan.** Las compraventas se hacen por consignatarios inscriptos, que cobran la comisión (5% al comitente, 4% al comprador). El mercado no garantiza la operación ni cobra la comisión.

**Alternativas**
- **A. Tarifa fija por contacto entregado, o suscripción, sin condición de éxito.** Es la salida más rápida.
- **B. Alianza con una consignataria inscripta**, que factura la comisión y nos paga un fee de originación (modelo Rosgan).
- **C. Inscribirnos como consignatario.** Es otro negocio: liquidaciones, fondos de terceros, DT-e.
- **D. Matrícula de corredor.** Exige título, garantía y una persona matriculada.

**Recomendación del informe**
- Pasar a A y explorar B en paralelo.
- No cobrar ningún 1% hasta que lo valide un abogado.
- Corregir "no es consignataria ni intermediaria" por "no es consignataria ni mandataria".

**Preguntas para el abogado**
1. Con el pt. 1.2, ¿la obligación de inscribirse se limita a las categorías definidas, o el pt. 1.1 ("intervenir en el comercio") alcanza a un vinculador digital? ¿Conviene una consulta formal a la DNCCA?
2. El 1% a éxito con ACEPTO escrito, ¿se recalifica como corretaje? ¿Se puede cobrar sin matrícula?
3. ¿Qué matrícula exige la jurisdicción de la sociedad, y alcanza a semovientes?
4. Con una tarifa fija por contacto o una suscripción, ¿desaparece el encuadre de corretaje? ¿Qué cláusulas lo blindan?
5. ¿Cómo se redacta un fee de originación con una consignataria sin violar el pt. 4.6 ni compartir comisión de forma irregular?

**Fuentes**
- Res. SAGyP 103/2026 (BO 06-07-2026): https://www.argentina.gob.ar/normativa/nacional/norma-427453/texto
- Res. 50/2025 (BO 15-04-2025).
- CCyC arts. 1335 y 1345-1352 (Infoleg).
- Ley 22.845.
- RG IGJ 2/2008.
- Reglamento de Rosgan: https://www.rosgan.com.ar/reglamento
- Microjuris, 24-11-2017.

**No verificado:** el monto actualizado de las multas, el encuadre de De Campo a Campo y si hay un padrón público del SIOCAL.

## 2. Arrendamiento: circuito, quién paga, tope por provincia

**Hallazgos**
- **Cobrar parte de la comisión de un corredor es prestar la matrícula, y está sancionado.**
  - Entre Ríos suspendió a una corredora por compartir honorarios con no habilitados (Ley 9739, art. 47; STJER 2017).
  - Santa Fe lo prohíbe (Ley 13.154, art. 14) y Buenos Aires también (Ley 10.973, art. 53).
  - Lo que el sitio puede cobrarle al corredor es un **fee fijo** por lead o por software, nunca un porcentaje de su comisión.
- **Publicar no es corretaje**, según la Cámara de Mar del Plata y fallos de Córdoba (El Día, 04-05-2025). El riesgo aparece si el agente negocia o redacta el contrato.
- **Topes y pisos por provincia**

| Provincia | Norma | Escala | Base | Quién paga | Confianza |
|---|---|---|---|---|---|
| Buenos Aires | Ley 10.973, art. 54 | **1%–2% por parte, con mínimo y máximo obligatorios** | todo el plazo del contrato (sin plazo escrito, 2 años) | cada parte, o una sola paga todo | alta |
| Córdoba | Ley 9445, arts. 24-25 | libre pacto; escala supletoria del 5% | monto del contrato | arrendatario (supletorio) | media |
| Santa Fe | Ley 13.154 | libre pacto; el colegio de Rosario fija 3% + 3% | valor del contrato | ambas partes | media |
| Entre Ríos / La Pampa / Corrientes | — | sin escala rural verificada | — | — | baja |

- **0,8 meses de canon choca con la escala de Buenos Aires en los dos extremos:**
  - Contrato de 1 año: es el 6,7% del total y supera el tope del 4%.
  - Contrato de 4 años: es el 1,67% y queda **debajo del piso** del 2%.
- **Fórmula propuesta** (la cobra el matriculado):
  - `comisión = clamp(0,8 × canon mensual ; piso_prov × V ; tope_prov × V)`, con V = canon anual × años.
  - Buenos Aires: piso 2%, tope 4%. Córdoba: tope 5%. Santa Fe: tope 6%. Resto: tope interno del 4% hasta confirmar con el colegio.
  - Ejemplos en Buenos Aires: 1 año → 0,48 meses; 2-3 años → 0,8 meses; 5 años → 1,2 meses.
  - **El plazo pasa a ser un dato obligatorio del lead.**
- **Canon en especie** (kg de novillo, qq de soja): valuar el contrato en pesos el día de la firma con un precio publicado (INMAG o Cañuelas; pizarra de Rosario) y dejar escrita la fuente. No hay norma sobre esto.

**Recomendación del informe**
- **Desde ya:** publicación y conexión sin cobro a éxito (confianza alta).
- **Donde haya un corredor socio real:** firma y factura él, con la fórmula de arriba, y el sitio cobra un fee fijo (confianza media).
- **Quién paga, por defecto:** el arrendatario (confianza media-baja).

**Fuentes**
- Ley 10.973 (HCD PBA): https://intranet.hcdiputados-ba.gov.ar/refleg/sw10973.pdf
- Ley 13.154 (BO Santa Fe).
- COCIR, aranceles.
- Diario Judicial, 14-02-2017.
- El Día, 04-05-2025.
- Gotti, 26-08-2026.

## 3. Venta de campos: comisión

**Mercado**
- La comisión habitual es **3% + 3%** (vendedor y comprador) en Buenos Aires, Córdoba, Santa Fe, Entre Ríos y La Pampa.
- Topes legales:
  - Buenos Aires: 1,5%–3% por parte, con mínimo y máximo obligatorios.
  - Santa Fe: 6% en total.
  - Entre Ríos: el colegio publica 3% + 3% y lo declara de orden público.
- En operaciones grandes se negocia a 2–2,5% por lado. Esto sale de blogs, confianza baja.
- Las grandes (CAT, L.J. Ramos, Bullrich, Toribio Achával) no publican honorarios.
- **Actividad:** el índice InCAIR dio 56,86 en mayo de 2026 y 46,57 en julio, en baja. En los campos ganaderos el cierre está "más lento de lo habitual".
- **Moneda:** el precio se pacta en USD por hectárea.

**Propuesta del informe** (coherente con el 20% off de arrendamiento)
- **2,4% + IVA al vendedor** sobre el precio total en USD del boleto o la escritura. Se devenga con la operación cerrada.
- **Al comprador no se le cobra.** ⚠️ En Buenos Aires, si el corredor lo representa también, la escala exige un mínimo de 1,5% a esa parte.
- **Mínimo:** USD 5.000 + IVA. Es criterio propio, sin fuente.
- **Lo cobra y lo factura un corredor matriculado** de la provincia del campo. El sitio le cobra un fee fijo.
- **En el código, cuando José decida:**
  - `TIPOS.campo.comisionPct = 2.4`;
  - agregar `bloqueoLegal`, igual que en arrendamiento. Si no, `enviaAContrapartes('campo')` daría `true` apenas exista la comisión;
  - agregar `aCargoDe: 'vendedor'` y `minimoUsd: 5000`.

**Fuentes**
- Ley 10.973, art. 54.
- CUCICBA, 09-01-2026.
- Ley 13.154, art. 61.
- Colegio de Corredores de Entre Ríos, honorarios.
- Agrofy News, 22-06-2026 y 25-08-2026.

## Lo que cruza las tres

**El patrón que se repite es "software atrás, matriculado adelante":** el sitio cobra un fee fijo y la comisión la cobra y la factura quien tiene la habilitación. Así lo hace Rosgan con las consignatarias, y así lo exigen las leyes de corredores con la matrícula.
