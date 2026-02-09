#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ListIp.py — Descubre IPv4 de un FQDN y las sube a FortiGate como Addresses (/32) y un Address Group.

- Autenticación FortiGate: Authorization: Bearer <token> (recomendado).
  Fallback: access_token en query si el equipo aún lo acepta.
- Crea Address con nombre EXACTO = IP, type=ipmask, subnet "IP 255.255.255.255".
- Asegura Address Group y añade todos los members (sin duplicar).
- Control de rate limit (evita 429) + reintentos/backoff.
- Descubrimiento DNS en ráfagas paralelas y siguiendo CNAMEs.

Requisitos (Ubuntu):
  sudo apt update && sudo apt install -y python3-dnspython python3-requests
"""

import argparse, csv, re, sys, time, json, warnings
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

import dns.resolver, dns.name, dns.query, dns.message, dns.rdatatype

# -------------------- DNS discovery --------------------
IPV4_RE = re.compile(r'^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$')
PUBLIC_RESOLVERS = ["8.8.8.8","8.8.4.4","1.1.1.1","1.0.0.1","9.9.9.9","208.67.222.222"]

def is_ipv4(x:str)->bool:
    """
    Summary:
        Valida si una cadena representa una IPv4 correcta (formato y rango 0-255).
    Params:
        x (str): Cadena a evaluar.
    Return:
        bool: True si la cadena es una IPv4 válida; False en caso contrario.
    """
    if not IPV4_RE.match(x): return False
    try:
        return all(0 <= int(p) <= 255 for p in x.split('.'))
    except: return False

def res_obj(ns_ip, timeout):
    """
    Summary:
        Construye un resolver DNS con servidor específico o configuración del sistema.
    Params:
        ns_ip (str|None): IP del nameserver a usar; si es None usa los resolvers del sistema.
        timeout (float): Tiempo máximo por consulta y vida total de la resolución.
    Return:
        dns.resolver.Resolver: Instancia configurada (sin caché).
    """
    r = dns.resolver.Resolver(configure=(ns_ip is None))
    if ns_ip: r.nameservers = [ns_ip]
    r.timeout = timeout
    r.lifetime = timeout
    try: r.cache = None
    except: pass
    return r

def resolve_A(domain, ns_ip, timeout):
    """
    Summary:
        Resuelve registros A de un dominio opcionalmente contra un resolver específico.
    Params:
        domain (str): FQDN a resolver.
        ns_ip (str|None): IP del resolver DNS; None para usar el del sistema.
        timeout (float): Tiempo máximo de resolución.
    Return:
        list[str]: Lista de IPv4 válidas obtenidas; lista vacía si no hay resultados/errores.
    """
    try:
        ans = res_obj(ns_ip, timeout).resolve(domain, 'A')
        return [r.address for r in ans if is_ipv4(r.address)]
    except: return []

def resolve_CNAME_target(domain, ns_ip, timeout):
    """
    Summary:
        Obtiene el target del CNAME de un dominio (si existe).
    Params:
        domain (str): FQDN a consultar.
        ns_ip (str|None): IP del resolver DNS; None para usar el del sistema.
        timeout (float): Tiempo máximo de resolución.
    Return:
        str|None: Target del CNAME sin punto final; None si no hay CNAME o error.
    """
    try:
        ans = res_obj(ns_ip, timeout).resolve(domain, 'CNAME')
        for r in ans:
            return str(r.target).rstrip('.')
    except: return None

def get_NS_names(domain, timeout):
    """
    Summary:
        Recupera los nombres de los servidores autoritativos (NS) del dominio.
    Params:
        domain (str): Dominio base (zona) a consultar.
        timeout (float): Tiempo máximo de resolución.
    Return:
        list[str]: Nombres FQDN de NS sin punto final; lista vacía si falla.
    """
    try:
        ans = dns.resolver.resolve(domain, 'NS', lifetime=timeout)
        return [str(r.target).rstrip('.') for r in ans]
    except: return []

def name_to_A_ips(host, timeout):
    """
    Summary:
        Resuelve un hostname a sus direcciones IPv4 mediante registros A.
    Params:
        host (str): Hostname/FQDN a resolver.
        timeout (float): Tiempo máximo de resolución.
    Return:
        list[str]: IPv4 válidas; lista vacía si no hay resultados.
    """
    try:
        ans = dns.resolver.resolve(host, 'A', lifetime=timeout)
        return [str(r.address) for r in ans if is_ipv4(str(r.address))]
    except: return []

def query_authoritative_direct(domain, ns_ip, timeout):
    """
    Summary:
        Consulta registros A directamente al servidor autoritativo via UDP/TCP.
    Params:
        domain (str): Dominio a consultar.
        ns_ip (str): IP del servidor autoritativo.
        timeout (float): Tiempo máximo por intento.
    Return:
        list[str]: IPv4 obtenidas (validas); lista vacía si no hay respuesta útil.
    """
    q = dns.message.make_query(dns.name.from_text(domain), dns.rdatatype.A)
    try:
        resp = dns.query.udp(q, ns_ip, timeout=timeout)
    except:
        try: resp = dns.query.tcp(q, ns_ip, timeout=timeout)
        except: return []
    if not resp or not resp.answer: return []
    ips = []
    for rr in resp.answer:
        if rr.rdtype == dns.rdatatype.A:
            for it in rr.items: ips.append(it.address)
        elif rr.rdtype == dns.rdatatype.CNAME:
            cname = str(rr.items[0].target).rstrip('.')
            ips += resolve_A(cname, ns_ip, timeout)
    return [ip for ip in ips if is_ipv4(ip)]

def worker(domain, task, timeout):
    """
    Summary:
        Ejecuta una tarea de resolución (sistema, público o autoritativo) para un dominio.
    Params:
        domain (str): FQDN a resolver.
        task (tuple): ('system'| 'public'| 'authoritative', valor) según tipo.
        timeout (float): Tiempo máximo por consulta.
    Return:
        tuple[str, list[str], str|None]: (fuente, ips, cname_target opcional).
    """
    typ, val = task
    if typ == 'system':
        return ('system', resolve_A(domain, None, timeout), resolve_CNAME_target(domain, None, timeout))
    if typ == 'public':
        return (val, resolve_A(domain, val, timeout), resolve_CNAME_target(domain, val, timeout))
    if typ == 'authoritative':
        return (f'auth:{val}', query_authoritative_direct(domain, val, timeout), None)
    return (str(task), [], None)

def append_txt(path:Path, ips):
    """
    Summary:
        Agrega (append) IPs al archivo de texto, una por línea, ordenadas.
    Params:
        path (Path): Ruta del archivo de salida .txt.
        ips (iterable[str]): Conjunto/lista de IPv4 a escribir.
    Return:
        None
    """
    if not ips: return
    with open(path, 'a', encoding='utf-8') as f:
        for ip in sorted(ips): f.write(ip + '\n')

def append_csv(path:Path, pairs, domain):
    """
    Summary:
        Registra en CSV las IP nuevas con timestamp, dominio y fuente.
    Params:
        path (Path): Ruta del archivo .csv.
        pairs (iterable[tuple[str,str]]): Tuplas (ip, source).
        domain (str): Dominio consultado.
    Return:
        None
    """
    if not pairs: return
    ts = datetime.now().isoformat()
    hdr = not path.exists()
    with open(path, 'a', newline='', encoding='utf-8') as cf:
        w = csv.writer(cf)
        if hdr: w.writerow(['timestamp','ip','domain','source'])
        for ip,src in pairs: w.writerow([ts, ip, domain, src])

def burst_once(domain, reps, timeout, workers, verbose):
    """
    Summary:
        Ejecuta una “ráfaga” de consultas DNS paralelas (sistema, públicos y autoritativos),
        sigue CNAMEs y consolida IPs encontradas con su(s) fuente(s).
    Params:
        domain (str): FQDN objetivo.
        reps (int): Repeticiones por resolver (para robustez).
        timeout (float): Timeout por consulta.
        workers (int): Máximo de hilos en el pool.
        verbose (bool): Si True, imprime detalles de la ráfaga.
    Return:
        dict[str, set[str]]: Mapa { ip: {fuentes...} } con todas las IPs halladas.
    """
    tasks=[('system',None)]
    for r in PUBLIC_RESOLVERS:
        for _ in range(reps): tasks.append(('public',r))

    ns_names = get_NS_names(domain, timeout)
    ns_ips = []
    for ns in ns_names:
        for ip in name_to_A_ips(ns, timeout):
            if ip not in ns_ips: ns_ips.append(ip)
    for ip in ns_ips:
        for _ in range(reps): tasks.append(('authoritative', ip))

    if verbose:
        print(f"[{datetime.now().isoformat()}] NS: {ns_names}  NS_IPs: {ns_ips}  Tareas: {len(tasks)}")

    found_ips = {}
    cname_targets = set()
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(worker, domain, t, timeout): t for t in tasks}
        for fut in as_completed(futures):
            try:
                src, ips, cname = fut.result()
            except:
                continue
            for ip in ips:
                found_ips.setdefault(ip,set()).add(str(src))
            if cname: cname_targets.add(cname)

    # Follow CNAMEs
    extra=[]
    for cname in cname_targets:
        extra.append(('system', None, cname))
        for r in PUBLIC_RESOLVERS:
            for _ in range(reps): extra.append(('public', r, cname))
        for ip in ns_ips:
            for _ in range(reps): extra.append(('authoritative', ip, cname))

    def cname_worker(src_kind, src_val, target):
        """
        Summary:
            Resuelve A para el target de un CNAME según la fuente (sistema/público/autoritativo).
        Params:
            src_kind (str): 'system' | 'public' | 'authoritative'.
            src_val (str|None): IP del resolver (público/autoritativo) o None para sistema.
            target (str): FQDN objetivo del CNAME.
        Return:
            tuple[str, list[str]]: (identificador de fuente, lista de IPs halladas).
        """
        if src_kind=='authoritative':
            return (f'auth:{src_val}', query_authoritative_direct(target, src_val, timeout))
        if src_kind=='public':
            return (src_val, resolve_A(target, src_val, timeout))
        return ('system', resolve_A(target, None, timeout))

    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(cname_worker, k, v, tgt): (k,v,tgt) for (k,v,tgt) in extra}
        for fut in as_completed(futures):
            try:
                src, ips = fut.result()
            except:
                continue
            for ip in ips:
                found_ips.setdefault(ip,set()).add(str(src))
    return found_ips

# -------------------- FortiGate REST helpers --------------------
class FortiGateRateLimiter:
    """
    Summary:
        Implementa un rate limiter simple con “token bucket” y espaciamiento mínimo entre llamadas
        para evitar respuestas 429 y cumplir un ritmo máximo.
    Params:
        calls_per_second (float): Máximo de llamadas por segundo.
        burst_size (int): Tokens iniciales/máximos para ráfagas cortas.
    Return:
        None
    """
    def __init__(self, calls_per_second=2.0, burst_size=5):
        """
        Summary:
            Inicializa el rate limiter calculando el intervalo mínimo y los tokens de ráfaga.
        Params:
            calls_per_second (float): Llamadas por segundo permitidas.
            burst_size (int): Tamaño de ráfaga (tokens).
        Return:
            None
        """
        self.min_interval = 1.0 / max(0.1, calls_per_second)
        self.burst_size = max(1, burst_size)
        self.tokens = self.burst_size
        self.last_check = time.time()
        self.last_call = 0.0

    def wait_if_needed(self):
        """
        Summary:
            Bloquea brevemente si no hay tokens o si no se ha cumplido el intervalo mínimo
            desde la última llamada.
        Params:
            None
        Return:
            None
        """
        now = time.time()
        elapsed = now - self.last_check
        self.tokens = min(self.burst_size, self.tokens + elapsed / self.min_interval)
        self.last_check = now
        if self.tokens < 1:
            time.sleep((1 - self.tokens) * self.min_interval)
            self.tokens = 1
        self.tokens -= 1
        since = now - self.last_call
        if since < self.min_interval:
            time.sleep(self.min_interval - since)
        self.last_call = time.time()

def fg_base_url(scheme, host):
    """
    Summary:
        Construye la URL base para el FortiGate a partir de esquema y host (o devuelve la pasada).
    Params:
        scheme (str): 'http' o 'https'.
        host (str): Hostname/IP (con o sin esquema). Puede incluir puerto.
    Return:
        str: URL base normalizada sin '/' final duplicado.
    """
    if host.startswith('http://') or host.startswith('https://'):
        return host.rstrip('/')
    return f"{scheme}://{host}"

def fg_headers(token):
    """
    Summary:
        Genera los headers HTTP para autenticación Bearer y JSON.
    Params:
        token (str): Token de API.
    Return:
        dict: Encabezados HTTP para requests.
    """
    return {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }

def fg_params(token, vdom):
    """
    Summary:
        Construye parámetros de query para compatibilidad legacy (access_token) y VDOM.
    Params:
        token (str): Token de API a incluir como access_token si aplica.
        vdom (str|None): Nombre de VDOM; si None no se envía.
    Return:
        dict: Parámetros de query a usar en las llamadas.
    """
    p = {'access_token': token} if token else {}
    if vdom: p['vdom'] = vdom
    return p

def session_with_headers(token):
    """
    Summary:
        Crea una sesión requests con encabezados Bearer preconfigurados.
    Params:
        token (str): Token de API.
    Return:
        requests.Session: Sesión lista para invocar APIs FortiGate.
    """
    s = requests.Session()
    s.headers.update(fg_headers(token))
    return s

def request_retry(session, method, url, *, params=None, json=None, verify=True,
                  max_retries=6, base_sleep=0.4, rate_limiter:FortiGateRateLimiter=None):
    """
    Summary:
        Ejecuta una request con control de rate limit y reintentos con backoff
        ante 429/5xx y un reintento ante 401.
    Params:
        session (requests.Session): Sesión HTTP.
        method (str): Método HTTP ('GET','POST','PUT','DELETE', etc.).
        url (str): URL absoluta.
        params (dict|None): Parámetros de query.
        json (dict|None): Payload JSON.
        verify (bool): Verificación SSL (True por defecto).
        max_retries (int): Reintentos máximos.
        base_sleep (float): Base para backoff exponencial.
        rate_limiter (FortiGateRateLimiter|None): Limitador opcional.
    Return:
        requests.Response: Respuesta HTTP (éxito o último intento con error conocido).
    """
    last = None
    for attempt in range(max_retries):
        try:
            if rate_limiter: rate_limiter.wait_if_needed()
            resp = session.request(method, url, params=params, json=json, verify=verify, timeout=20)
            if 200 <= resp.status_code < 300:
                return resp
            if resp.status_code == 401 and attempt < 1:
                time.sleep(base_sleep)
                continue
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(base_sleep * (2 ** attempt))
                continue
            return resp
        except requests.RequestException as e:
            last = e
            time.sleep(base_sleep * (2 ** attempt))
    if last:
        raise last
    return resp

def test_fg_connection(session, base, token, vdom, verify):
    """
    Summary:
        Verifica conectividad y credenciales contra el FortiGate (Bearer y fallback query).
    Params:
        session (requests.Session): Sesión HTTP con headers.
        base (str): URL base del FortiGate.
        token (str): Token de API.
        vdom (str|None): VDOM a usar.
        verify (bool): Verificación SSL.
    Return:
        tuple[bool, str]: (ok, mensaje explicativo).
    """
    r = None
    try:
        r = session.get(f"{base}/api/v2/cmdb/firewall/address",
                        params={'vdom': vdom} if vdom else None,
                        verify=verify, timeout=10)
        if r.status_code == 200:
            try:
                data = r.json()
                if data.get('http_status') == 200 or 'results' in data:
                    return True, "Conexión exitosa (Bearer)"
            except: pass
        if r.status_code == 401:
            r2 = requests.get(f"{base}/api/v2/cmdb/firewall/address",
                              params=fg_params(token, vdom),
                              headers={'Content-Type':'application/json'},
                              verify=verify, timeout=10)
            if r2.status_code == 200:
                try:
                    data2 = r2.json()
                    if data2.get('http_status') == 200 or 'results' in data2:
                        return True, "Conexión exitosa (access_token en query)"
                except: pass
            if r2.status_code == 401:
                return False, "401: token inválido/perfil/VDOM o interfaz sin HTTPS admin"
        if r.status_code == 429:
            return False, "Rate limit activo - espera"
        return False, f"Respuesta inesperada: {r.status_code}"
    except requests.exceptions.SSLError:
        return False, "SSL: usa --fg-insecure si el cert es self-signed"
    except requests.exceptions.ConnectionError:
        return False, f"No se puede conectar a {base}"
    except Exception as e:
        return False, f"Error de conexión: {e}"

def ensure_address(session, base, params, verify, name, ip, rate_limiter):
    """
    Summary:
        Asegura la existencia de un Address (type ipmask /32) con nombre = IP.
        Si no existe, lo crea.
    Params:
        session (requests.Session): Sesión HTTP.
        base (str): URL base del FortiGate.
        params (dict): Parámetros de query (vdom, access_token legacy).
        verify (bool): Verificación SSL.
        name (str): Nombre del Address (la IP).
        ip (str): Dirección IP a registrar (/32).
        rate_limiter (FortiGateRateLimiter): Control de ritmo de llamadas.
    Return:
        tuple[bool, str]: (ok, 'exists'|'created'|mensaje_error).
    """
    r = request_retry(session, "GET", f"{base}/api/v2/cmdb/firewall/address/{name}",
                      params=params, verify=verify, rate_limiter=rate_limiter)
    if r.status_code == 200:
        try:
            if r.json().get('http_status') == 200:
                return True, 'exists'
        except: pass
    payload = {
        "name": name,
        "type": "ipmask",
        "subnet": f"{ip} 255.255.255.255",
    }
    r = request_retry(session, "POST", f"{base}/api/v2/cmdb/firewall/address",
                      params=params, json=payload, verify=verify, rate_limiter=rate_limiter)
    if r.status_code in (200,201):
        try:
            if r.json().get('http_status') in (200,201):
                return True, 'created'
        except: pass
    return False, f"{r.status_code}: {r.text[:200]}"

def ensure_addrgrp(session, base, params, verify, group_name, rate_limiter):
    """
    Summary:
        Asegura la existencia de un Address Group; si no existe, lo crea vacío.
    Params:
        session (requests.Session): Sesión HTTP.
        base (str): URL base del FortiGate.
        params (dict): Parámetros de query (vdom, access_token legacy).
        verify (bool): Verificación SSL.
        group_name (str): Nombre del grupo a asegurar.
        rate_limiter (FortiGateRateLimiter): Control de ritmo de llamadas.
    Return:
        tuple[bool, str, dict|None]: (ok, 'exists'|'created'|error, objeto_grupo|None).
    """
    r = request_retry(session, "GET", f"{base}/api/v2/cmdb/firewall/addrgrp/{group_name}",
                      params=params, verify=verify, rate_limiter=rate_limiter)
    if r.status_code == 200:
        try:
            data = r.json()
            if data.get('http_status') == 200:
                results = data.get('results', [])
                if results: return True, 'exists', results[0]
        except: pass
    payload = {"name": group_name, "member": []}
    r = request_retry(session, "POST", f"{base}/api/v2/cmdb/firewall/addrgrp",
                      params=params, json=payload, verify=verify, rate_limiter=rate_limiter)
    if r.status_code in (200,201):
        try:
            if r.json().get('http_status') in (200,201):
                return True, 'created', {"name": group_name, "member": []}
        except: pass
    return False, f"{r.status_code}: {r.text[:200]}", None

def ensure_members_in_group(session, base, params, verify, group_name, member_names, rate_limiter):
    """
    Summary:
        Fusiona miembros existentes con la lista dada y actualiza el Address Group (sin duplicados).
    Params:
        session (requests.Session): Sesión HTTP.
        base (str): URL base del FortiGate.
        params (dict): Parámetros de query (vdom, access_token legacy).
        verify (bool): Verificación SSL.
        group_name (str): Nombre del Address Group a actualizar.
        member_names (list[str]): Nombres (IPs) a asegurar como miembros.
        rate_limiter (FortiGateRateLimiter): Control de ritmo de llamadas.
    Return:
        tuple[bool, str]: (ok, mensaje con total de miembros | detalle de error).
    """
    ok, _, grp = ensure_addrgrp(session, base, params, verify, group_name, rate_limiter)
    if not ok: return False, "No se pudo asegurar el grupo"

    existing = set()
    for m in (grp.get('member') or []):
        n = m.get('name')
        if n: existing.add(n)
    merged = sorted(existing.union(member_names))
    payload = {"name": group_name, "member": [{"name": n} for n in merged]}

    r = request_retry(session, "PUT", f"{base}/api/v2/cmdb/firewall/addrgrp/{group_name}",
                      params=params, json=payload, verify=verify, rate_limiter=rate_limiter)
    if r.status_code in (200,201):
        try:
            if r.json().get('http_status') in (200,201):
                return True, f"Total miembros: {len(merged)}"
        except: pass
    return False, f"{r.status_code}: {r.text[:200]}"

# -------------------- Main --------------------
def main():
    """
    Summary:
        Orquesta el flujo completo: parseo de argumentos, verificación de FortiGate,
        descubrimiento DNS en ráfagas, persistencia de IPs (txt/csv) y push a FortiGate
        (addresses y address group).
    Params:
        None
    Return:
        int: Código de salida del proceso (0 éxito; !=0 error).
    """
    ap = argparse.ArgumentParser()
    ap.add_argument('-d','--domain', required=True, help='FQDN a resolver')
    ap.add_argument('--out','-o', default='ips.txt')
    ap.add_argument('--csv', default='ips.csv')
    ap.add_argument('--workers', type=int, default=60)
    ap.add_argument('--reps', type=int, default=4)
    ap.add_argument('--bursts', type=int, default=6)
    ap.add_argument('--nochange', type=int, default=3)
    ap.add_argument('--timeout', type=float, default=2.0)
    ap.add_argument('-v','--verbose', action='store_true')

    # FortiGate
    ap.add_argument('--fg-host', required=True)
    ap.add_argument('--fg-token', required=True)
    ap.add_argument('--fg-vdom', default='root')
    ap.add_argument('--fg-scheme', default='https', choices=['http','https'])
    ap.add_argument('--fg-insecure', action='store_true')
    ap.add_argument('--fg-group', required=True)
    ap.add_argument('--fg-rate-limit', type=float, default=2.0)
    ap.add_argument('--fg-batch-size', type=int, default=10)
    ap.add_argument('--fg-batch-delay', type=float, default=5.0)
    args = ap.parse_args()

    domain = args.domain.strip()
    outp = Path(args.out); csvp = Path(args.csv)

    # ---- FortiGate conexión previa ----
    base = fg_base_url(args.fg_scheme, args.fg_host)
    verify = not args.fg_insecure
    if not verify:
        warnings.filterwarnings("ignore", message="Unverified HTTPS request")

    session = session_with_headers(args.fg_token)
    ok, msg = test_fg_connection(session, base, args.fg_token, args.fg_vdom, verify)
    if not ok:
        print(f"[FG] ERROR conexión: {msg}")
        print("      Revisa: token (REST API Admin), VDOM, interfaz con HTTPS admin y puerto.")
        return 1
    print(f"[FG] ✓ {msg}")

    # ---- DNS discovery ----
    existing = set(outp.read_text(encoding='utf-8').splitlines()) if outp.exists() else set()
    existing = {ip.strip() for ip in existing if is_ipv4(ip.strip())}

    nochange = 0
    newly_all = []
    print(f"[DNS] Descubriendo IPs para {domain}…")
    for b in range(1, args.bursts+1):
        if args.verbose: print(f"[{datetime.now().isoformat()}] Ráfaga {b}/{args.bursts}")
        found = burst_once(domain, args.reps, args.timeout, args.workers, args.verbose)
        new_pairs=[]
        for ip, sources in found.items():
            if ip not in existing:
                existing.add(ip)
                new_pairs.append((ip, ",".join(sorted(sources))))
        if new_pairs:
            append_txt(outp, [ip for ip,_ in new_pairs])
            append_csv(csvp, new_pairs, domain)
            newly_all.extend([ip for ip,_ in new_pairs])
            nochange = 0
            if args.verbose:
                for ip,src in sorted(new_pairs):
                    print(f"  + {ip} ({src})")
        else:
            nochange += 1
        if nochange >= args.nochange:
            if args.verbose: print(f"[DNS] {args.nochange} ráfagas sin novedad → fin.")
            break

    print(f"[DNS] Nuevas: {len(newly_all)} | Total únicas: {len(existing)}")

    # ---- FortiGate push ----
    rate_limiter = FortiGateRateLimiter(calls_per_second=args.fg_rate_limit, burst_size=5)
    params = fg_params(args.fg_token, args.fg_vdom)

    all_ips = sorted(existing)
    total = len(all_ips)
    names_for_group = []
    ok_count = 0
    err_count = 0

    print(f"[FG] Subiendo {total} IPs en batches de {args.fg_batch_size} …")
    for i in range(0, total, args.fg_batch_size):
        batch = all_ips[i:i+args.fg_batch_size]
        bnum = i // args.fg_batch_size + 1
        btots = (total + args.fg_batch_size - 1) // args.fg_batch_size
        print(f"[FG] Batch {bnum}/{btots} ({len(batch)} IPs)")

        for ip in batch:
            name = ip  # nombre exacto = IP
            ok_addr, state = ensure_address(session, base, params, verify, name, ip, rate_limiter)
            if not ok_addr:
                print(f"[FG]   ✗ {ip}: {state}")
                err_count += 1
            else:
                if args.verbose: print(f"[FG]   ✓ {ip}: {state}")
                names_for_group.append(name)
                ok_count += 1

        if i + args.fg_batch_size < total:
            time.sleep(args.fg_batch_delay)

    print(f"[FG] Addresses → OK: {ok_count} | Error: {err_count}")

    if names_for_group:
        print(f"[FG] Actualizando Address Group '{args.fg_group}' …")
        ok_grp, gmsg = ensure_members_in_group(session, base, params, verify,
                                               args.fg_group, names_for_group, rate_limiter)
        if ok_grp:
            print(f"[FG] ✓ Grupo actualizado: {gmsg}")
        else:
            print(f"[FG] ✗ Error grupo: {gmsg}")
    else:
        print("[FG] No hubo addresses válidos para agrupar.")

    return 0

if __name__ == '__main__':
    sys.exit(main())
