# El Corredor: fuentes externas

**Estado al 02-11-2026.** Relevamos las seis fuentes que el benchmark contra USDA, MLA, QMS/AHDB, INAC y Rabobank marcó como faltantes: volumen físico (faena, stock, feedlot), exportación, contexto mundial, inflación y clima.

- **Incorporadas:** siete series, cada una con su parser, sus tests y su cache.
- **Con parser y sin cache:** una (FAO), porque la licencia no deja republicarla.
- **Descartada:** una (feedlot), porque no hay archivo oficial descargable.

Los módulos viven en `scripts/monthly-report/fuentes_nuevas/` y todavía **no están enchufados** al informe: `datos.py`, `informe.py` y la plantilla no se tocaron.

## Reglas comunes (`fuentes_nuevas/_base.py`)

1. **Nada sin procedencia.** Cada serie es una `SerieExterna` que lleva su `Procedencia`: organismo, URL exacta, fecha en que la bajamos, último período con dato, rezago y licencia. Si falta la URL o la fecha, no se construye.
2. **Si el formato cambió, se rompe.** Cada parser valida encabezados exactos, unidades, rangos plausibles, continuidad de meses y, cuando la fuente los publica, los totales de control. Si algo no cierra, levanta `FormatoCambiado` y dice qué esperaba y qué encontró. Ningún parser se "adapta" solo.
3. **Nunca se estima un faltante.** Un mes sin dato no aparece en la serie: no se interpola ni se arrastra el último valor. Las cuentas que hacemos (cocientes, anomalías, sumas de grupos de países) se declaran en `columnas` como cálculo propio sobre números publicados.
4. **Solo biblioteca estándar.** El XLSX se lee con `zipfile` y `xml.etree`. La única dependencia del sistema es `pdftotext` (poppler), y solo la necesita `faena.py`.

## Tabla de fuentes

| Serie (`id`) | Organismo y URL | Formato | Historia | Frecuencia y rezago | Último dato (02-11) | Licencia | Endpoint | Sin login | Estado |
|---|---|---|---|---|---|---|---|---|---|
| Faena por categoría, peso de res y producción (`faena-bovina-mensual`) | MAGyP, Subsecretaría de Ganadería (SENASA/DNCCA). [Informe mensual de faena (PDF)](https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_interes/informes/_archivos//000010=Faena%20y%20Producci%C3%B3n/000008_Informe_MENSUAL_de_faena_y_produccion_de_carne_bovina.pdf) | PDF → `pdftotext -raw` | Cada edición trae desde enero del año anterior: hoy 2025-01 a 2026-09 (21 meses). El cache se alarga mes a mes | Mensual; sale unos 13 días después del cierre | 2026-09 | CC BY 4.0 (términos de argentina.gob.ar, a los que remite magyp.gob.ar) | URL fija; el archivo se pisa cada mes | Sí | ✅ Incorporada, con cache |
| Stock bovino por categoría (`stock-bovino-categorias`) | MAGyP, en base a SIGSA-SENASA. [Serie de stock por provincia al 31-12 (XLSX)](https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_interes/informes/) | XLSX: una hoja por año y una serie larga | 2007-2025 (19 años; 2007-2011 marcados `estimado` por la propia fuente) | Anual, al 31-12; se publica en abril (unos 3 meses de rezago) | 2025 (50.920.790 cabezas) | Sin licencia declarada en el archivo; el mismo dato está como CC BY 4.0 en datos.magyp.gob.ar y argentina.gob.ar | **Frágil:** el nombre cambia todos los años y el anterior da 404. `descubrir_url()` lo busca en la página índice | Sí | ✅ Incorporada, con cache |
| Existencias en feedlot | SENASA: [informes 2021-22 (PDF)](https://www.argentina.gob.ar/senasa/mercados-y-estadisticas/estadisticas/animal-estadisticas/bovinos/bovinos-y-bubalinos-sector-primario) y tablero QlikSense desde oct-2022. También la Cámara Argentina de Feedlot | PDF con tablas en imagen; tablero interactivo | 2021-09 a 2022-07 en PDF | Mensual | No hay archivo después de 2022-07 | SENASA: CC BY 4.0. Cámara: todos los derechos reservados | No hay archivo | Tablero sin login, sin descarga | ❌ No incorporada |
| Exportaciones de carne bovina: t, US$ FOB y US$/t (`exportaciones-carne-bovina`) | INDEC, base de comercio exterior. `https://comex.indec.gob.ar/files/zips/exports_AAAA_M.zip` (los años disponibles están en `comexbe.indec.gob.ar/public-api/staticData`) | ZIP con CSV `;` (NCM × país × mes) y archivo de totales de control | 2002-01 a 2026-09 (297 meses) | Mensual; 45 a 50 días de rezago. El año en curso se reemplaza entero y es provisorio | 2026-09 | CC BY-SA 4.0, citando «Fuente: INDEC» y declarando los cambios | Estable desde 2002 | Sí | ✅ Incorporada, con cache |
| Exportaciones por destino (`exportaciones-carne-bovina-destinos`) | Mismo archivo del INDEC | Ídem | 2002-01 a 2026-09 | Ídem | 2026-09 | CC BY-SA 4.0 | Ídem | Sí | ✅ Incorporada, con cache |
| Índice de precios de la carne FAO, subíndice bovino (`fao-indice-carne`) | FAO. [Página del Meat Price Index](https://www.fao.org/markets-and-trade/commodities-overview/basic-foods/fao-meat-price-index/en) (XLSX) y [CSV del FFPI](https://www.fao.org/media/docs/worldfoodsituationlibraries/wfs-library/food_price_indices_data.csv) | XLSX y CSV | 1990-01 a 2026-09 (441 meses) | Mensual; se publica el primer viernes del mes siguiente. Los últimos meses son provisorios y se revisan | 2026-09 (el 06-11 sale octubre) | [Términos web de la FAO](https://www.fao.org/contact-us/terms/en/): solo uso **no comercial**. El uso comercial pide licencia | El nombre del XLSX cambia todos los meses; `link_xlsx()` lo busca en la página | Sí | 🟡 Parser y tests; **sin cache** (gitignorado) |
| IPC nacional (`ipc-nacional`) | INDEC. [`serie_ipc_divisiones.csv`](https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv). Alternativa: API de datos.gob.ar, id `148.3_INIVELNAL_DICI_M_26`, que va un mes atrasada | CSV `;` en latin-1 | 2016-12 a 2026-09 | Mensual; sale entre el 12 y el 15 del mes siguiente | 2026-09 | CC BY-SA 4.0 (INDEC) | Ruta `/ftp/cuadros` estable desde hace años | Sí | ✅ Incorporada, con cache |
| IPC empalmado desde 2006 (`ipc-empalmado-2006`) | **Composición propia de tres series oficiales** (API de datos.gob.ar): IPC San Luis `197.1_NIVEL_GENERAL_2014_0_13` (2006-01 a 2016-03), IPC-GBA INDEC `101.1_I2NG_2016_M_22` (2016-04 a 2016-11) e IPC nacional INDEC (desde 2016-12) | JSON | 2006-01 a 2026-09 (249 meses) | Mensual | 2026-09 | CC BY-SA 4.0 (INDEC) y CC BY 4.0 (datos.gob.ar) | Ids estables | Sí | ✅ Incorporada, con cache; **empalme declarado** |
| ENSO: ONI y RONI (`enso-oni`) | NOAA CPC: [ONI](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt) y [RONI](https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt) | Texto ASCII | DJF 1950 a JAS 2026 (920 trimestres móviles) | Mensual; el CPC actualiza la primera semana del mes. Los valores recientes se revisan | JAS 2026 (`periodo` 2026-08) | Dominio público (EE.UU., 17 U.S.C. §105) | Estable | Sí | ✅ Incorporada, con cache |
| Lluvia mensual contra la normal 1991-2020 en 16 estaciones (`lluvias-corredor-ganadero`) | Datos del SMN transmitidos en mensajes CLIMAT de la OMM, publicados por el DWD (Alemania): [`CLIMAT/monthly/qc/precipitation_total/recent/{wmo}.txt`](https://opendata.dwd.de/climate_environment/CDC/observations_global/CLIMAT/monthly/qc/precipitation_total/recent/) y las [normales 1991-2020](https://opendata.dwd.de/climate_environment/CDC/observations_global/CLIMAT/multi_annual/precipitation_total/1991_2020.txt) | CSV `;`, un archivo por estación | Ventana móvil: hoy 2024-01 a 2026-09. Hay historia más larga en `historical/`, todavía no incorporada | Mensual; unas 4 semanas de rezago | 2026-09 | [CC BY 4.0 (DWD)](https://opendata.dwd.de/climate_environment/CDC/Terms_of_use.txt) | Estable | Sí | ✅ Incorporada, con cache |

### Fuentes evaluadas y descartadas, con el motivo

- **Faena.** El dataset CKAN "indicadores mensuales sector bovino" y SIO Carnes quedaron congelados en 2019. La API de datos.gob.ar (`40.3_VC_0_M_15`, CC BY) trae solo el total de cabezas, va un mes atrasada y no coincide al decimal con el PDF: sirve de control, no reemplaza al PDF. El visualizador del MAGyP es un Power BI sin descarga. CICCRA es una cámara privada sin licencia abierta.
- **Stock a marzo.** Desde la Res. ex-MAGyP 105/2019 la serie oficial es al **31 de diciembre**, recalculada desde 2012. La serie a marzo (2008-2019, CSV en datos.magyp.gob.ar) quedó congelada y **no empalma** con la nueva: no se usa.
- **Feedlot.** SENASA dejó de publicar archivos en 2022-07. Desde entonces el dato vive solo en un tablero QlikSense: sacarlo de ahí sería scraping de una aplicación interactiva, sin términos claros. La Cámara Argentina de Feedlot no es fuente oficial, reserva los derechos y mide sobre la capacidad de sus socios, no sobre el total nacional. Caminos posibles:
  - (a) pedirle a SENASA, por la Ley 27.275, la serie mensual en CSV o en datos.magyp.gob.ar;
  - (b) citar a mano el número del tablero en el texto, con fecha y enlace.
- **Exportaciones.** En apis.datos.gob.ar, las series de carne bovina (`AGRO_0231/0232/0233`) terminan en 2019-08 y la vigente (`75.3_IC_0_M_10`) suma todas las especies. MAGyP publica solo PDF trimestrales. El informe del IPCVA es una reelaboración del INDEC con "cifras estimadas": queda como contraste, no como fuente.
- **IPC.** El INDEC 2007-2015 queda excluido por la intervención del organismo. El IPC CABA arranca recién en 2012-07.
- **Clima.**
  - La descarga de datos del SMN está detrás de un desafío de Cloudflare, que no salteamos, y su portal abierto no trae precipitación mensual.
  - El certificado TLS del SISSA/CRC-SAS llega incompleto y su API pide usuario.
  - INTA SIGA pide registro.
  - La URL de la ORA da 404 y la ORA publica mapas, no tablas.
  - NOAA GHCN-Daily tiene meses incompletos, así que sumarlos sería estimar.
  - El pronóstico probabilístico de ENSO no tiene datos descargables: IRI dejó de publicarlos y el CPC los da solo como imagen.

## Trampas que el informe tiene que respetar

- **Faena.**
  - No hay columna de terneros: la clasificación por dentición (Res. 32/2018) los incluye en novillito y vaquillona 2D.
  - El "% hembras" de la tabla de toneladas mide toneladas, no cabezas, y el parser no lo usa.
  - La edición nueva pisa los meses que repite, porque son provisorios.
- **Stock.**
  - Los años 2007-2011 son estimados por la fuente.
  - Los toritos aparecen recién en 2012 por cambio de clasificación: el salto no es biológico.
- **Exportaciones.**
  - Las toneladas son **peso producto**, no res con hueso, y no se convierten.
  - La partida 0202.20 incluye huesos de desposte que van a China: inflan las toneladas y bajan el US$/t. Va en una columna aparte.
  - Desde 2018 hay secreto estadístico: los montos ocultos están dentro del país 999, así que un país puede "desaparecer" un mes sin haber dejado de comprar.
- **FAO.** Argentina **no está** en la canasta del subíndice bovino, que se arma con Australia, EE.UU. y Brasil. Mide el precio internacional, no el del novillo argentino.
- **IPC empalmado.**
  - Antes de 2016-04 la serie refleja **San Luis**, una sola provincia con canasta base 2003.
  - Cualquier titular del estilo "el más caro o el más barato en 20 años" que dependa de un mes anterior a 2016-12 descansa en este empalme, y el pie del gráfico tiene que decirlo.
  - `deflactar()` marca `ipc_empalmado: true` en cada punto de ese tramo y no devuelve el mes que no tiene IPC.
- **ENSO.**
  - Según el aviso NWS PNS 26-05, desde el 01-02-2026 el índice operativo del CPC es el **RONI**, y el módulo clasifica la fase con él. Con RONI, 2024-25 y 2025-26 fueron La Niña; con ONI, neutrales.
  - `fase` aplica solo el umbral de ±0,5 del mes. `episodio` aplica la regla oficial de 5 trimestres consecutivos.
- **Lluvias.**
  - El NEA (Corrientes y Mercedes) queda sin serie usable: casi no transmite CLIMAT.
  - Una celda vacía es un mes no transmitido, no un cero.
  - El directorio `recent` todavía no pasó el control de calidad completo del DWD.

## Qué páginas del índice de 18 habilita cada serie

| Serie | Páginas |
|---|---|
| Faena, peso de res y producción | **9** Ciclo (faena, % hembras nacional mensual, peso medio) · 2 semáforo (volumen interanual) · 3 Qué cambió |
| Stock por categoría | **10** Stock y feedlot (solo stock; el feedlot queda sin dato) · 9 Ciclo (vacas sobre total) |
| Exportaciones (t, FOB, US$/t) | **13** Exportación · 14 Argentina vs el mundo (relación novillo/FOB, estilo RHE del INAC) |
| Exportaciones por destino | **13** Exportación (barras ordenadas por destino, sin torta) |
| FAO carne y bovina | **14** Argentina vs el mundo, **solo con licencia de la FAO**; sin ella, uso interno de contexto |
| IPC nacional y empalmado | **4** Precio en la historia (novillito real desde 2006) · 1 Tapa (récord en 20 años, con salvedad) |
| ENSO (ONI y RONI) | **15** Clima y forraje · 17 Perspectiva |
| Lluvias contra la normal | **15** Clima y forraje (mapa o tabla de % de la normal por estación) |

## Cómo se usan y se actualizan

```bash
cd scripts/monthly-report
python3 -m unittest discover -s fuentes_nuevas/tests -t .   # 92 tests, sin red
python3 -m fuentes_nuevas.faena --actualizar                 # idem stock, exportaciones, exportaciones_destinos, ipc, enso, lluvias, fao_carne
```

Desde el código se lee el cache, sin red:

```python
from fuentes_nuevas._base import cargar_cache
faena = cargar_cache("faena-bovina-mensual")   # SerieExterna: .puntos, .procedencia, .columnas
```

**Workflow futuro (no agregado en este PR).** El plan es un job mensual, `el-corredor-fuentes.yml`, que corra **antes** de `el-corredor-publish.yml`, por ejemplo el día 1 a las 12:00 UTC:

1. `actions/setup-python` con 3.12 y `apt-get install poppler-utils`, que hace falta para `faena`.
2. Correr cada `python3 -m fuentes_nuevas.<x> --actualizar` como paso separado, con `continue-on-error` por fuente. Un `FormatoCambiado` deja el cache anterior intacto y avisa por `cron-hook`/`ops_events`; no publica un hueco.
3. Correr los tests.
4. `git add scripts/monthly-report/cache/externa-*.json` (el `.gitignore` deja afuera a la FAO), y después commit y push.

**Calendario sugerido.**

- FAO: primer viernes del mes.
- IPC: alrededor del día 15.
- Faena: alrededor del día 13.
- Exportaciones del INDEC: alrededor del día 20, con el mes M−2.
- ENSO: primera semana del mes.
- Lluvias: fin de mes.
- Stock: una vez por año, en abril.

**Exportaciones** baja 25 ZIP, unos 100 MB. Para la corrida mensual alcanza con el año en curso más el anterior: hay que combinarlos con el cache existente usando `combinar()`.

## Licencias y atribución en el PDF

Cada gráfico que use una de estas series tiene que imprimir `procedencia.fuente` y `procedencia.fecha_dato` al pie, como ya hace `datos.py` con las series propias.

- **INDEC (CC BY-SA 4.0):** «Fuente: INDEC», y declarar las agregaciones (grupos de países, NCM sumadas). Lo que derivemos de esas series va con la misma licencia.
- **MAGyP / SENASA (CC BY 4.0):** citar al organismo.
- **DWD (CC BY 4.0):** «Fuente: SMN vía CLIMAT/OMM, publicado por el Deutscher Wetterdienst».
- **NOAA:** dominio público; igual se cita.
- **FAO:** no se publica sin licencia. Hay que pedirla a copyright@fao.org.
