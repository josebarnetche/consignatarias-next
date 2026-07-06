# Avatar del remitente + BIMI — cómo hacer que el logo aparezca en el inbox

> 2026-07-06. El logo como "foto de perfil" del email NO se controla desde el HTML:
> lo controla el estándar **BIMI** (Brand Indicators for Message Identification) vía DNS.

## Estado actual
- SVG BIMI listo: **`https://www.consignatarias.com.ar/bimi-logo.svg`** (SVG Tiny-PS, 428 bytes,
  isotipo sobre carbón — generado desde `marca/logos/isotipo--primario.svg`).
- DMARC del dominio: `v=DMARC1; p=none;` ⚠️ **BLOCKER** — BIMI exige `p=quarantine` o `p=reject`.
- Sin registro BIMI todavía.

## Pasos (DNS del dominio consignatarias.com — a mano, 5 min)

1. **Endurecer DMARC** (prerequisito). Cambiar el TXT `_dmarc.consignatarias.com` a:
   ```
   v=DMARC1; p=quarantine; rua=mailto:agro@memola.com.ar; pct=100
   ```
   (Los envíos salen por Resend con SPF/DKIM alineados, así que quarantine no debería
   afectar el correo legítimo. Monitorear los reportes `rua` la primera semana.)

2. **Publicar el registro BIMI.** TXT en `default._bimi.consignatarias.com`:
   ```
   v=BIMI1; l=https://www.consignatarias.com.ar/bimi-logo.svg;
   ```

3. **Realidad por cliente:**
   - **Yahoo/AOL/Fastmail**: muestran el logo con los pasos 1-2. Gratis.
   - **Gmail**: exige además un **VMC** (Verified Mark Certificate, DigiCert/Entrust,
     ~USD 1.000-1.500/año, requiere MARCA REGISTRADA en INPI) o el más nuevo **CMC**
     (Common Mark Certificate, sin marca registrada pero con 12+ meses de uso del logo).
     Sin certificado, Gmail muestra la inicial "C" de siempre.
   - **Atajo sin costo para Gmail**: crear cuenta Google Workspace/gmail con
     noreply@consignatarias.com es inviable (Resend es el remitente), pero
     **Gravatar** (gravatar.com) con noreply@consignatarias.com y hola@consignatarias.com
     hace que algunos clientes (y CRMs) muestren el logo. 5 minutos, gratis — hacerlo ya.

## Decisión sugerida
Hoy: DMARC→quarantine + registro BIMI + Gravatar (gratis, cubre Yahoo/Fastmail/varios).
Cuando la marca esté registrada en INPI: evaluar CMC/VMC para Gmail.
