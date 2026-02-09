#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, re, shlex, tempfile, uuid, threading, subprocess, time, json
from pathlib import Path
from flask import Flask, request, render_template_string, send_file, jsonify, Response

# ================== Paths / Config ==================
BASE_DIR = Path(__file__).resolve().parent
IPS_TXT  = BASE_DIR / "ips.txt"          # lo lee para pintar total/descarga
LISTIP   = BASE_DIR / "ListIp.py"        # tu script que ya funciona
SECRET   = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-me")

app = Flask(__name__)
app.config.update(SECRET_KEY=SECRET)

# ================== Estado de ejecuciones ==================
# RUNS[run_id] = {"proc": Popen, "log": Path}
RUNS = {}

HOST_RE = re.compile(r"^https?://[A-Za-z0-9\.\-:%]+$")  # https://IP:puerto básico

# ================== Helpers ==================
def build_cmd(domain: str, fg_host: str, token: str, group: str) -> list[str]:
    """
    Construye el comando para lanzar ListIp.py con los parámetros del form.
    -u: unbuffered stdout/stderr para que los logs salgan en tiempo real.
    """
    py = shlex.quote(str(Path(os.sys.executable)))
    cmd = f"""
    {py} -u {shlex.quote(str(LISTIP))}
      -d {shlex.quote(domain)}
      --fg-host {shlex.quote(fg_host)}
      --fg-token {shlex.quote(token)}
      --fg-vdom root
      --fg-group {shlex.quote(group)}
      --workers 60 --reps 4 --bursts 6 --nochange 3 -v
      --fg-rate-limit 2 --fg-batch-size 10 --fg-batch-delay 5
      --fg-insecure
    """
    # Normaliza espacios y los parte tipo shell
    return shlex.split(" ".join(cmd.split()))

def start_run(domain: str, fg_host: str, token: str, group: str) -> str:
    """
    Lanza el proceso y empieza a volcar stdout a un archivo temporal.
    Devuelve run_id para que el front se conecte al stream SSE.
    """
    run_id   = uuid.uuid4().hex
    log_path = Path(tempfile.gettempdir()) / f"run_{run_id}.log"

    if not LISTIP.exists():
        raise FileNotFoundError(f"No se encontró ListIp.py en {LISTIP}")

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"  # refuerzo anti-buffering

    # Lanza el proceso
    proc = subprocess.Popen(
        build_cmd(domain, fg_host, token, group),
        cwd=str(BASE_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,            # line-buffer en nuestro lado
        env=env
    )
    RUNS[run_id] = {"proc": proc, "log": log_path}

    # Hilo que bombea stdout al archivo de log (para poder "tailearlo")
    def _pump():
        with open(log_path, "w", encoding="utf-8") as lf:
            for line in proc.stdout:
                lf.write(line)
                lf.flush()
        proc.wait()
    threading.Thread(target=_pump, daemon=True).start()

    return run_id

# ================== Endpoints backend ==================
@app.post("/api/run")
def api_run():
    """
    Inicio de ejecución (AJAX). No redirige; devuelve run_id y el front abre el stream.
    """
    data = request.form or request.json or {}
    domain   = (data.get("domain")  or "").strip()
    fg_host  = (data.get("fg_host") or "").strip()
    token    = (data.get("token")   or "").strip()
    group    = (data.get("group")   or "").strip()

    errors = {}
    if len(domain) < 3: errors["domain"] = "Requerido"
    if not HOST_RE.match(fg_host): errors["fg_host"] = "Usa https://IP:puerto"
    if len(token) < 8:  errors["token"] = "Requerido"
    if len(group) < 2:  errors["group"] = "Requerido"
    if errors:
        return jsonify({"ok": False, "errors": errors}), 400

    try:
        run_id = start_run(domain, fg_host, token, group)
    except FileNotFoundError as e:
        return jsonify({"ok": False, "errors": {"_": str(e)}}), 500
    return jsonify({"ok": True, "run_id": run_id})

@app.get("/stream/<run_id>")
def stream(run_id: str):
    """
    Stream de logs en vivo (SSE). El front escucha y va pintando línea a línea.
    Envía un heartbeat cada ~15s para mantener la conexión.
    """
    if run_id not in RUNS:
        return "run_id not found", 404

    log_path: Path = RUNS[run_id]["log"]

    def sse_pack(obj: dict) -> str:
        return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"

    def event_stream():
        # Espera a que el archivo exista
        t0 = time.time()
        while not log_path.exists():
            time.sleep(0.1)
            if time.time() - t0 > 10:  # timeout razonable
                yield sse_pack({"type": "log", "payload": "[WARN] No se pudo abrir el log aún…"})
                break

        pos = 0
        last_heartbeat = time.time()

        # Tail “manual” del archivo
        with open(log_path, "r", encoding="utf-8") as f:
            while True:
                f.seek(pos)
                chunk = f.read()
                if chunk:
                    pos = f.tell()
                    for line in chunk.splitlines():
                        yield sse_pack({"type": "log", "payload": line})

                # Heartbeat para evitar timeouts de proxy/navegador
                if time.time() - last_heartbeat > 15:
                    yield sse_pack({"type": "ping", "ts": time.time()})
                    last_heartbeat = time.time()

                # ¿Terminó el proceso?
                proc = RUNS.get(run_id, {}).get("proc")
                if proc is not None and proc.poll() is not None:
                    yield f"event: done\ndata: finished\n\n"
                    break

                time.sleep(0.25)

    return Response(event_stream(), mimetype="text/event-stream")

@app.get("/result/<run_id>")
def result(run_id: str):
    """
    Devuelve total e ips.txt actuales y limpia el registro del run.
    """
    total, content = 0, ""
    if IPS_TXT.exists():
        lines = [x.strip() for x in IPS_TXT.read_text(encoding="utf-8").splitlines() if x.strip()]
        total = len(lines)
        content = "\n".join(lines)
    # Limpia el estado del run
    RUNS.pop(run_id, None)
    return jsonify({"total": total, "ips_txt": content})

@app.get("/download/ips")
def download_ips():
    if not IPS_TXT.exists():
        return "Aún no hay ips.txt", 404
    return send_file(IPS_TXT, as_attachment=True, download_name="ips.txt")

# ================== UI (inline) ==================
TPL = r"""
<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>FQDN → FortiGate</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
  body { background:#0c1222; color:#e6e6e6 }
  .card { background:#131a2b; border-color:#2a3450 }
  label.form-label{ color:#fff } /* títulos blancos */
  .form-control{ background:#0f1526; color:#e6e6e6; border-color:#2a3450 }
  .form-control:focus{ color:#e6e6e6; background:#0f1526; border-color:#3b4a7a; box-shadow:none }
  .btn-primary{ background:#2b5cff; border:0 }
  .mono{ font-family: ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace; white-space:pre-wrap }
  .logbox{ height:280px; overflow:auto; background:#0b1020; border:1px solid #263150; padding:10px }
  .minh420{ height:420px; overflow:auto; background:#0b1020; border:1px solid #263150; padding:10px }

  /* === Cambios solicitados: títulos en blanco === */
  h3, h5, h6 { color:#fff; }                         /* FQDN → FortiGate, ips.txt, Logs en vivo */
  .card.mb-3 .text-secondary { color:#fff !important; } /* "Total de IPs" en blanco (solo esa tarjeta) */
</style>
</head><body>
<div class="container-fluid py-4">
  <div class="row g-4">
    <!-- Formulario -->
    <div class="col-lg-5">
      <div class="card"><div class="card-body">
        <h3 class="mb-3">FQDN → FortiGate</h3>
        <p class="text-secondary">Convierte un FQDN en Addresses (/32) y los agrega a un Address Group en tu FortiGate.</p>

        <div class="mb-3">
          <label class="form-label">Dominio (FQDN)</label>
          <input id="domain" class="form-control" placeholder="">
          <div id="e_domain" class="text-danger small"></div>
        </div>

        <div class="mb-3">
          <label class="form-label">FG host (https://IP:puerto)</label>
          <input id="fg_host" class="form-control" placeholder="">
          <div id="e_fg_host" class="text-danger small"></div>
        </div>

        <div class="mb-3">
          <label class="form-label">Token</label>
          <input id="token" type="password" class="form-control" placeholder="">
          <div class="form-text">No se mostrará en la consola. Usa un token de REST API admin.</div>
          <div id="e_token" class="text-danger small"></div>
        </div>

        <div class="mb-3">
          <label class="form-label">Nombre del Address Group</label>
          <input id="group" class="form-control" placeholder="">
          <div id="e_group" class="text-danger small"></div>
        </div>

        <div class="d-flex align-items-center gap-2 mb-2">
          <button id="btnRun" class="btn btn-primary" type="button">Ejecutar</button>
          <div id="spinner" class="spinner-border spinner-border-sm text-light" role="status" style="display:none"></div>
          <a class="btn btn-secondary" href="/download/ips">Descargar ips.txt</a>
        </div>

        <!-- Barra de progreso -->
        <div class="progress" style="height: 10px;">
          <div id="bar"
               class="progress-bar progress-bar-striped progress-bar-animated"
               role="progressbar" style="width: 100%"></div>
        </div>
        <div class="small text-secondary mt-1">
          <span id="stage">Esperando…</span>
        </div>

        <hr class="my-4">
        <h6 class="mb-2">Logs en vivo</h6>
        <div id="log" class="logbox mono">Iniciando…</div>
      </div></div>
    </div>
    <!-- Resultados -->
    <div class="col-lg-7">
      <div class="card mb-3"><div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <div class="text-secondary">Total de IPs</div>
          <div id="total" class="display-6">{{ total }}</div>
        </div>
        <span class="badge bg-success">OK</span>
      </div></div>

      <div class="card"><div class="card-body">
        <div class="d-flex justify-content-between">
          <h5 class="mb-3">ips.txt</h5>
          <a class="btn btn-outline-light btn-sm" href="/download/ips">Descargar</a>
        </div>
        <pre id="ipsbox" class="mono minh420">{{ ips_txt }}</pre>
      </div></div>
    </div>
  </div>
</div>

<script>
const $ = (id)=>document.getElementById(id);

const els = {
  domain: $("domain"),
  fg_host: $("fg_host"),
  token: $("token"),
  group: $("group"),
  e_domain: $("e_domain"),
  e_fg_host: $("e_fg_host"),
  e_token: $("e_token"),
  e_group: $("e_group"),
  log: $("log"),
  total: $("total"),
  ipsbox: $("ipsbox"),
  btnRun: $("btnRun"),
  bar: $("bar"),
  stage: $("stage"),
  spinner: $("spinner"),
};

function clearErrors(){
  for (const k of ["e_domain","e_fg_host","e_token","e_group"]) els[k].textContent = "";
}
function setErr(id,msg){ els[id].textContent = msg || ""; }
function appendLog(line){
  els.log.textContent += (line + "\n");
  els.log.scrollTop = els.log.scrollHeight;
}

/* ======== Progreso: detecta patrones en logs ======== */
let prog = {burstNow:0, burstTot:null, batchNow:0, batchTot:null, phase:"idle"};
function resetProgress(){
  prog = {burstNow:0, burstTot:null, batchNow:0, batchTot:null, phase:"idle"};
  els.bar.className = "progress-bar progress-bar-striped progress-bar-animated";
  els.bar.style.width = "100%";       // indeterminado (animado)
  els.stage.textContent = "Esperando…";
}
function setDeterminate(pct, text){
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  els.bar.className = "progress-bar";
  els.bar.style.width = pct + "%";
  els.stage.textContent = text || "";
}
function setSuccess(){
  els.bar.className = "progress-bar bg-success";
  els.bar.style.width = "100%";
  els.stage.textContent = "Completado";
}

function updateProgressFromLine(line){
  // Ejemplos en tus logs:
  //   [2025-..] Ráfaga 3/10
  //   [FG] Procesando batch 2/7 (10 IPs)…
  let m = line.match(/Ráfaga\s+(\d+)\s*\/\s*(\d+)/i);
  if (m){
    prog.phase = "dns";
    prog.burstNow = parseInt(m[1],10);
    prog.burstTot = parseInt(m[2],10);
  }
  m = line.match(/Batch\s+(\d+)\s*\/\s*(\d+)/i);
  if (m){
    prog.phase = "push";
    prog.batchNow = parseInt(m[1],10);
    prog.batchTot = parseInt(m[2],10);
  }

  // cálculo de %: 50% DNS + 50% push (si ambos existen).
  let pct = 0;
  let haveDNS  = prog.burstTot && prog.burstTot > 0;
  let havePush = prog.batchTot && prog.batchTot > 0;

  if (!haveDNS && !havePush){
    // seguimos indeterminado
    return;
  }
  if (haveDNS && !havePush){
    pct = (prog.burstNow / prog.burstTot) * 60; // 60% hasta terminar DNS
    setDeterminate(pct, `Descubrimiento DNS ${prog.burstNow}/${prog.burstTot}`);
    return;
  }
  if (!haveDNS && havePush){
    pct = (prog.batchNow / prog.batchTot) * 100;
    setDeterminate(pct, `Subiendo a FortiGate ${prog.batchNow}/${prog.batchTot}`);
    return;
  }
  // ambos:
  let partDNS  = (prog.burstNow / prog.burstTot) * 60;
  let partPush = (prog.batchNow / prog.batchTot) * 40;
  pct = partDNS + partPush;
  setDeterminate(pct, `DNS ${prog.burstNow}/${prog.burstTot} · FG ${prog.batchNow}/${prog.batchTot}`);
}

/* ===================================================== */

els.btnRun.addEventListener("click", async () => {
  clearErrors();
  els.log.textContent = "Iniciando…\n";
  els.btnRun.disabled = true;
  els.spinner.style.display = "inline-block";
  resetProgress();

  const fd = new FormData();
  fd.append("domain", els.domain.value.trim());
  fd.append("fg_host", els.fg_host.value.trim());
  fd.append("token",  els.token.value.trim());
  fd.append("group",  els.group.value.trim());

  let res;
  try {
    res = await fetch("/api/run", { method:"POST", body: fd });
  } catch (e) {
    appendLog("Error conectando con el backend.");
    els.btnRun.disabled = false; els.spinner.style.display = "none"; return;
  }

  if (!res.ok) {
    const data = await res.json().catch(()=>({errors:{}}));
    const e = data.errors||{};
    if (e.domain)  setErr("e_domain",  e.domain);
    if (e.fg_host) setErr("e_fg_host", e.fg_host);
    if (e.token)   setErr("e_token",   e.token);
    if (e.group)   setErr("e_group",   e.group);
    appendLog("Corrige los campos marcados y vuelve a ejecutar.");
    els.btnRun.disabled = false; els.spinner.style.display = "none"; return;
  }

  const { run_id } = await res.json();
  appendLog("Ejecución iniciada. Mostrando logs…");

  // Abrimos SSE
  const es = new EventSource(`/stream/${run_id}`);
  es.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === "log") {
        appendLog(msg.payload);
        updateProgressFromLine(msg.payload);
      }
    } catch {
      appendLog(ev.data);
      updateProgressFromLine(ev.data);
    }
  };
  es.addEventListener("done", async ()=>{
    es.close();
    appendLog("Proceso finalizado. Obteniendo resultados…");
    const r = await fetch(`/result/${run_id}`);
    const j = await r.json();
    els.total.textContent = j.total;
    els.ipsbox.textContent = j.ips_txt;
    setSuccess();
    els.btnRun.disabled = false;
    els.spinner.style.display = "none";
  });
});
</script>
</body></html>
"""

@app.get("/")
def index():
    ips_text = IPS_TXT.read_text(encoding="utf-8") if IPS_TXT.exists() else ""
    total = len([x for x in ips_text.splitlines() if x.strip()])
    return render_template_string(TPL, ips_txt=ips_text, total=total)

# ================== Main ==================
if __name__ == "__main__":
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    port = int(os.environ.get("FLASK_PORT", "8080"))
    print(f" * Front en http://{host}:{port} (ListIp.py en {LISTIP})")
    app.run(host=host, port=port, debug=False)
