// Parser de la cartelera de O'Farrell (ivanofarrell.com.ar/remates).
// Una fila por remate: "<tags> <TÍTULO> DD/MM/AAAA HH:MM hs. <SEDE> + más info".
// La sede va DESPUÉS de la fecha; el scraper anterior miraba ±200 caracteres y mezclaba
// las sedes de los remates vecinos (todo caía en "Chaco" y georef lo mandaba a Santa Fe).

const TAGS = /^(?:(?:Remate Cabaña|Remate Invernada|Remate Online|Exposición|Televisado)\s+)+/;

// Sede (texto libre de la cartelera) → { location, province }. null = sede sin resolver.
export function sedeOFarrell(sede) {
  const s = (sede || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!s || /a definir/.test(s)) return null;
  if (/formosa/.test(s)) return { location: "Formosa, Formosa", province: "FORMOSA" };
  if (/machagai/.test(s)) return { location: "Machagai, Chaco", province: "CHACO" };
  if (/san martin|zapallar/.test(s)) return { location: "General San Martín, Chaco", province: "CHACO" };
  if (/santa sylvina/.test(s)) return { location: "Santa Sylvina, Chaco", province: "CHACO" };
  if (/campo gallo/.test(s)) return { location: "Campo Gallo, Santiago del Estero", province: "SANTIAGO DEL ESTERO" };
  if (/santiago del estero|celojao/.test(s)) return { location: "Celojao, Santiago del Estero", province: "SANTIAGO DEL ESTERO" };
  if (/salte|salta/.test(s)) return { location: "Salta, Salta", province: "SALTA" };
  return null;
}

export function parseOFarrellHtml(html) {
  const text = (html || "")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
  const out = [];
  for (const chunk of text.split("+ más info")) {
    const m = chunk.match(/^(.*?)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2})\s*hs\.?\s*(.*)$/);
    if (!m) continue;
    let head = m[1];
    const cut = Math.max(head.lastIndexOf("Físico "), head.lastIndexOf("Streaming "));
    if (cut >= 0) head = head.slice(cut).replace(/^(?:Físico|Streaming)\s+/, "");
    const title = head.replace(TAGS, "").trim();
    const [, , d, mo, y, hora, sede] = [m[0], m[1], m[2], m[3], m[4], m[5], m[6]];
    out.push({
      title,
      date: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`,
      time: hora.padStart(5, "0"),
      sede: sede.trim(),
      tv: /televisado/i.test(chunk),
      ...(sedeOFarrell(sede) || {}),
    });
  }
  return out;
}
