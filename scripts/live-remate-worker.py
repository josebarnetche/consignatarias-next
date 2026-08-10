# -*- coding: utf-8 -*-
"""
live-remate-worker.py — TOOL OFF-VERCEL para el ticker de remate en vivo.

Captura el audio de un stream de remate (YouTube live), lo transcribe en chunks con
faster-whisper local, parsea (categoria, $/kg de cierre, cabezas) con la gramatica del
cantaleo, y escribe a Supabase (live_remate_session + live_remate_lot). El sitio (Vercel)
lo lee via /api/live-remate y lo muestra en <LiveRemateTicker>.

NO corre en Vercel (serverless): corre en una maquina/VPS persistente.

Uso live (manana):
  python live-remate-worker.py --url "https://youtube.com/watch?v=XXXX" \
      --session-id umc-hv-2026-06-30 --consignataria "UMC HV" --location "Villaguay, ER" --model small

Uso test (sobre un VOD, sin creds -> escribe live_state.json):
  python live-remate-worker.py --file jua_full.mp3 --session-id test --no-supabase

Env para Supabase: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
Requisitos: yt-dlp (con --js-runtimes node), ffmpeg, faster-whisper.

CAVEAT de vivo (medido): el computo corre a ~0.58x tiempo real en promedio (mantiene el
vivo) PERO chunks de silencio/musica pueden spikear a 3-4x. Mitigacion: modelo 'small' por
defecto + vad_filter (saltea no-habla) + budget por chunk. El ticker va ~30-60s detras del vivo.
"""
import argparse, glob, json, os, re, shutil, statistics, subprocess, sys, time, urllib.request

# ----------------------------- parser del cantaleo (inline, compacto) -----------------------------
INV = re.compile(r"invernad|para invernar|para criar|de cr[ií]a|liquidaci", re.I)
CLOSE = re.compile(r"vend(i|í|ido|ida|os|o)\b|\bfue\b|adjudic|va\s+dos", re.I)
ANIMAL = re.compile(r"\b(\d{1,3})\s+(?:l[ao]s\s+|son\s+)*(vacas?|vaquill\w+|terneros?|terneras?|novillos?|novillit\w+|toros?|cabezas?)", re.I)
SON_N  = re.compile(r"\bson\s+(\d{1,3})\b", re.I)  # "son 8 los novillos"
WORDS = {"un":1,"una":1,"uno":1,"dos":2,"tres":3,"cuatro":4,"cinco":5,"seis":6,"siete":7,"ocho":8,"nueve":9,"diez":10,
         "veinte":20,"treinta":30,"cuarenta":40,"cincuenta":50,"sesenta":60,"setenta":70,"ochenta":80,"noventa":90,
         "cien":100,"ciento":100,"doscientos":200,"trescientos":300,"cuatrocientos":400,"quinientos":500,
         "seiscientos":600,"setecientos":700,"ochocientos":800,"novecientos":900}

# Bandas de plausibilidad por categoria. DINAMICAS: si se pasa un INMAG de referencia
# (precio novillo Canuelas del dia), se expresan como multiplos de el -> generaliza a
# cualquier firma/fecha/inflacion. Sin referencia, caen a valores absolutos calibrados
# a JUA-mayo-2025 (solo sirven para ese rango de precios).
RATIOS = {  # (lo, hi) como multiplo del INMAG novillo de referencia
    "Terneros": (1.20, 2.10), "Terneras": (1.05, 1.75), "Novillitos": (1.05, 1.70),
    "Vaquillitas": (1.05, 1.75), "Novillos Gordos": (0.80, 1.25), "Novillos Invernada": (0.85, 1.35),
    "Toros": (0.55, 0.95), "Vacas Gordas": (0.60, 0.95),
    "Vacas Invernadas": (0.48, 0.78), "Vacas Conserva": (0.34, 0.58),
}
ABS = {  # fallback absoluto (JUA mayo 2025)
    "Terneros": (2000,4800), "Terneras": (2000,4800), "Novillitos": (2000,4800), "Vaquillitas": (2000,4800),
    "Novillos Gordos": (1250,2950), "Novillos Invernada": (1250,2950), "Toros": (1250,2950), "Vacas Gordas": (1250,2950),
    "Vacas Invernadas": (650,1850), "Vacas Conserva": (650,1850),
}
def band(cat, ref=None):
    if ref:
        r = RATIOS.get(cat)
        if r: return (int(r[0]*ref), int(r[1]*ref))
    return ABS.get(cat, (650, 4800))

def weight_in(t):
    m = re.search(r"(\d{3})\s*kilo", t)
    return int(m.group(1)) if (m and 150 <= int(m.group(1)) <= 750) else None

def detect_cat(t):
    t = t.lower()
    if re.search(r"novillit", t): return "Novillitos"
    if re.search(r"novillo", t):
        if INV.search(t): return "Novillos Invernada"
        w = weight_in(t)
        return "Novillos Invernada" if (w and w < 460) else "Novillos Gordos"
    if re.search(r"vaquill", t): return "Vaquillitas"
    if re.search(r"\bternera", t): return "Terneras"
    if re.search(r"\bternero", t): return "Terneros"
    if re.search(r"\btoro\b", t): return "Toros"
    if re.search(r"\bvaca", t):
        if re.search(r"conserv|manufactur", t): return "Vacas Conserva"
        if INV.search(t): return "Vacas Invernadas"
        return "Vacas Gordas"
    return None

def prices_in(t, lo, hi):
    t = t.lower(); vals = []
    for m in re.finditer(r"\b(\d{1,2})\.(\d{3})\b", t): vals.append(int(m.group(1))*1000 + int(m.group(2)))
    for m in re.finditer(r"\b(\d{4})\b", t): vals.append(int(m.group(1)))
    for m in re.finditer(r"(?:(\w+)\s+)?\bmil\b(?:\s+(\d{1,3}|\w+))?", t):
        base = WORDS.get(m.group(1), 1) if m.group(1) else 1
        tail = (int(m.group(2)) if (m.group(2) and m.group(2).isdigit()) else WORDS.get(m.group(2), 0)) if m.group(2) else 0
        vals.append(base*1000 + tail)
    return [v for v in vals if lo <= v <= hi]

def get_heads(t):
    m = ANIMAL.search(t)
    if m and 1 <= int(m.group(1)) <= 600: return int(m.group(1))
    m = SON_N.search(t)  # fallback: "son N ... animal"
    if m and 1 <= int(m.group(1)) <= 600: return int(m.group(1))
    return None

def parse_rolling(segs, ref=None):
    cur = None; heads = None; lots = []
    for i, (a, b, text) in enumerate(segs):
        c = detect_cat(text)
        if c:
            cur = c; h = get_heads(text)
            if h: heads = h
        if CLOSE.search(text) and cur:
            lo, hi = band(cur, ref)
            window = (segs[i-1][2] + " " if i > 0 else "") + text
            cands = prices_in(window, lo, hi)
            if cands: lots.append((round(a, 1), cur, max(cands), heads))
    # dedup: el ritual de cierre ("va una va dos" / "vendi") puede spannear segmentos y
    # disparar CLOSE 2x para la MISMA venta -> colapsar consecutivos de igual categoria
    # dentro de ~20s, quedandose con el precio mayor (el martillazo).
    merged = []
    for lot in lots:
        if merged and lot[1] == merged[-1][1] and abs(lot[0] - merged[-1][0]) < 20:
            if lot[2] > merged[-1][2]: merged[-1] = lot
            continue
        merged.append(lot)
    return merged

# ----------------------------- salida (Supabase REST o JSON local) -----------------------------
class Sink:
    def __init__(self, use_supabase, session):
        self.session = session
        self.url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
        self.key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        self.on = bool(use_supabase and self.url and self.key)
        if use_supabase and not self.on:
            print("[sink] sin creds Supabase -> fallback a live_state.json", file=sys.stderr)

    def _post(self, table, rows, upsert=False):
        body = json.dumps(rows).encode()
        req = urllib.request.Request(f"{self.url}/rest/v1/{table}", data=body, method="POST")
        req.add_header("apikey", self.key); req.add_header("Authorization", f"Bearer {self.key}")
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "resolution=merge-duplicates" if upsert else "return=minimal")
        try:
            urllib.request.urlopen(req, timeout=10).read()
        except Exception as e:
            print(f"[sink] error POST {table}: {e}", file=sys.stderr)

    def heartbeat(self):
        row = {**self.session, "last_seen": _now_iso(), "status": "live"}
        if self.on: self._post("live_remate_session", [row], upsert=True)

    def emit_transcript(self, bloques):
        """Bloques de cantaleo tal como salieron de Whisper, con las pujas que se
        oyeron en cada uno. La tabla y el lado que los muestra ya existian; lo que
        faltaba era esto: nadie los escribia, por eso live_remate_transcript estaba
        en cero."""
        if not bloques: return
        rows = [{"session_id": self.session["id"], "audio_t": t, "texto": txt, "pujas": pujas}
                for (t, txt, pujas) in bloques]
        if self.on: self._post("live_remate_transcript", rows)

    def emit_lots(self, lots):
        if not lots: return
        rows = [{"session_id": self.session["id"], "audio_t": t, "categoria": c, "precio": p, "cabezas": h}
                for (t, c, p, h) in lots]
        if self.on: self._post("live_remate_lot", rows)
        else: self._dump_local(rows)

    _local = []
    def _dump_local(self, rows):
        self._local.extend(rows)
        by = {}
        for r in self._local:
            by.setdefault(r["categoria"], []).append(r["precio"])
        state = {"session": self.session, "n_lots": len(self._local),
                 "averages": {k: int(statistics.median(v)) for k, v in by.items()},
                 "recent": self._local[-12:]}
        json.dump(state, open("live_state.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

def _now_iso():
    # evita depender de tz; UTC ISO
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

# ----------------------------- captura de audio -> chunks -----------------------------
def start_capture(args, chdir):
    os.makedirs(chdir, exist_ok=True)
    for f in glob.glob(os.path.join(chdir, "*.wav")): os.remove(f)
    out = os.path.join(chdir, "c_%05d.wav")
    seg = ["-f", "segment", "-segment_time", str(args.chunk), "-ac", "1", "-ar", "16000"]
    if args.file:  # modo test: VOD -> split inmediato (bloqueante)
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",args.file,*seg,out], check=True)
        return None  # no hay proceso vivo
    # modo live: yt-dlp (stream) | ffmpeg segmenter (continuo)
    yt = subprocess.Popen(
        ["yt-dlp","--js-runtimes","node","-f","bestaudio","--quiet","--no-warnings","-o","-", args.url],
        stdout=subprocess.PIPE)
    ff = subprocess.Popen(
        ["ffmpeg","-y","-loglevel","error","-i","pipe:0",*seg,out], stdin=yt.stdout)
    # el parent cierra su copia del pipe: asi ffmpeg recibe EOF/SIGPIPE cuando yt-dlp corta
    if yt.stdout: yt.stdout.close()
    return (yt, ff)

# ----------------------------- loop principal -----------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url"); ap.add_argument("--file")
    ap.add_argument("--session-id", required=True)
    ap.add_argument("--consignataria", default=None); ap.add_argument("--location", default=None)
    ap.add_argument("--model", default="small")  # small = colchon para vivo
    ap.add_argument("--chunk", type=int, default=30)
    ap.add_argument("--inmag", type=float, default=None,
                    help="INMAG novillo de referencia del dia -> bandas dinamicas (generaliza a cualquier firma/fecha)")
    ap.add_argument("--no-supabase", action="store_true")
    args = ap.parse_args()
    if not (args.url or args.file): sys.exit("requiere --url (live) o --file (test)")

    from faster_whisper import WhisperModel
    print(f"[worker] cargando {args.model}...", file=sys.stderr)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    session = {"id": args.session_id, "youtube_url": args.url, "consignataria": args.consignataria,
               "location": args.location, "model": args.model}
    sink = Sink(not args.no_supabase, session)
    sink.heartbeat()

    chdir = os.path.join(os.path.dirname(os.path.abspath(args.file or ".")) or ".", f"chunks_{args.session_id}")
    procs = start_capture(args, chdir)
    live = procs is not None

    processed = set(); rolling = []; emitted = 0; fallo = False
    cur_cat = [None]  # categoria vigente, para acotar la banda de precios del bloque
    print("[worker] procesando...", file=sys.stderr)
    while True:
        chunks = sorted(glob.glob(os.path.join(chdir, "c_*.wav")))
        # en vivo: dejar el ultimo (puede estar escribiendose)
        todo = [c for c in (chunks[:-1] if live else chunks) if c not in processed]
        for ch in todo:
            idx = int(re.search(r"c_(\d+)\.wav", ch).group(1)); off = idx * args.chunk
            t0 = time.time()
            bloques = []
            try:
                segs, _ = model.transcribe(ch, language="es", vad_filter=True, beam_size=1)
                for s in segs:
                    txt = s.text.strip()
                    if not txt: continue
                    rolling.append((off + s.start, off + s.end, txt))
                    # Las pujas del bloque: los precios cantados, en orden de locución.
                    lo, hi = band(cur_cat[0], args.inmag) if cur_cat[0] else (1, 10**9)
                    bloques.append((round(off + s.start, 1), txt, prices_in(txt, lo, hi)))
                    c = detect_cat(txt)
                    if c: cur_cat[0] = c
            except Exception as e:
                print(f"[worker] chunk {idx} fallo: {e}", file=sys.stderr)
            sink.emit_transcript(bloques)
            processed.add(ch)
            lots = parse_rolling(rolling, args.inmag)
            if len(lots) > emitted:
                new = lots[emitted:]; emitted = len(lots)
                sink.emit_lots(new)
                for (_, c, p, h) in new:
                    print(f"  [{off:5d}s] {c:18} ${p}/kg  ({h or '?'} cab)  +{time.time()-t0:.0f}s")
        sink.heartbeat()
        # condicion de corte
        alive = live and procs[1].poll() is None
        if live and not alive and not chunks:
            # yt-dlp o ffmpeg murieron sin producir un solo chunk. Antes esto
            # giraba en falso para siempre: la sesion quedaba 'live', sin lotes,
            # sin transcript y sin ningun mensaje. Ahora se dice y se corta.
            print("[worker] LA CAPTURA MURIO SIN PRODUCIR AUDIO.", file=sys.stderr)
            print(f"         yt-dlp rc={procs[0].poll()} · ffmpeg rc={procs[1].poll()}", file=sys.stderr)
            print("         Revisar: que la URL sea una transmision EN CURSO, que yt-dlp este", file=sys.stderr)
            print("         actualizado y que 'node' exista (lo pide --js-runtimes node).", file=sys.stderr)
            fallo = True
            break
        if not alive and not todo and (chunks and all(c in processed for c in chunks) or not live):
            break
        time.sleep(2 if live else 0)

    # fin de sesion
    session_end = {**session, "status": "error" if fallo else "ended", "last_seen": _now_iso()}
    if sink.on: sink._post("live_remate_session", [session_end], upsert=True)
    print(f"[worker] fin. lotes emitidos: {emitted}", file=sys.stderr)
    if fallo: sys.exit(1)

if __name__ == "__main__":
    main()
