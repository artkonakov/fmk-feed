#!/usr/bin/env python3
"""Dev server for the Places on map prototype.

  python3 serve.py                 # http on 0.0.0.0:8010
  python3 serve.py --port 9000
  python3 serve.py --adb           # + adb reverse, phone opens http://localhost:8010
  python3 serve.py --https         # self-signed TLS, needed for geolocation over IP

Prints every address the phone can reach, marking USB/tethered interfaces.
"""

import argparse
import http.server
import ipaddress
import os
import shutil
import socket
import ssl
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CERT_DIR = ROOT / ".certs"


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static files, no caching (so a phone reload always gets fresh code)."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".webmanifest": "application/manifest+json",
        ".json": "application/json",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # One compact line per request; drop the noisy 200s for assets.
        status = args[1] if len(args) > 1 else ""
        if status == "200" and any(
            self.path.endswith(ext) for ext in (".png", ".svg", ".css", ".js")
        ):
            return
        sys.stderr.write(f"  {self.address_string()} {fmt % args}\n")


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def interfaces():
    """(name, ip, hint) for every IPv4 interface, via ifconfig on macOS."""
    found = []
    if shutil.which("ifconfig"):
        try:
            out = subprocess.run(
                ["ifconfig"], capture_output=True, text=True, timeout=5
            ).stdout
        except Exception:
            out = ""
        name = None
        for line in out.splitlines():
            if line and not line[0].isspace():
                name = line.split(":")[0]
            elif "inet " in line and name:
                parts = line.split()
                ip = parts[parts.index("inet") + 1]
                try:
                    addr = ipaddress.ip_address(ip)
                except ValueError:
                    continue
                if addr.is_loopback:
                    continue
                found.append((name, ip, hint_for(name, ip)))
    if not found:
        try:
            found.append(("host", socket.gethostbyname(socket.gethostname()), ""))
        except Exception:
            pass
    return found


def hint_for(name, ip):
    if name.startswith("bridge"):
        return "USB / кабель (iPhone или Android через USB)"
    if ip.startswith("172.20.10."):
        return "iPhone USB-модем (кабель)"
    if ip.startswith("169.254."):
        return "link-local"
    if name.startswith(("en", "eth")):
        return "Wi-Fi / Ethernet"
    return ""


def setup_adb(port):
    adb = shutil.which("adb")
    if not adb:
        print("  adb не найден — пропускаю --adb (brew install android-platform-tools)")
        return False
    devices = subprocess.run(
        [adb, "devices"], capture_output=True, text=True
    ).stdout.strip().splitlines()[1:]
    attached = [line.split()[0] for line in devices if line.strip().endswith("device")]
    if not attached:
        print("  adb: телефон не найден. Подключи кабелем и разреши отладку по USB.")
        return False
    result = subprocess.run(
        [adb, "reverse", f"tcp:{port}", f"tcp:{port}"], capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  adb reverse не сработал: {result.stderr.strip()}")
        return False
    print(f"  adb reverse готов для {attached[0]}")
    return True


def make_cert():
    CERT_DIR.mkdir(exist_ok=True)
    cert = CERT_DIR / "dev.pem"
    key = CERT_DIR / "dev-key.pem"
    if cert.exists() and key.exists():
        return cert, key
    if not shutil.which("openssl"):
        sys.exit("openssl не найден — --https недоступен")
    ips = [ip for _, ip, _ in interfaces()]
    san = ",".join(["DNS:localhost", "IP:127.0.0.1"] + [f"IP:{ip}" for ip in ips])
    subprocess.run(
        [
            "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
            "-keyout", str(key), "-out", str(cert), "-days", "365",
            "-subj", "/CN=places-on-map.local",
            "-addext", f"subjectAltName={san}",
        ],
        check=True,
        capture_output=True,
    )
    print(f"  сертификат создан: {cert.relative_to(ROOT)}")
    return cert, key


def main():
    # Keep the banner readable when stdout is a pipe (nohup, logs, IDE panes).
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

    parser = argparse.ArgumentParser(description="Places on map dev server")
    parser.add_argument("--port", type=int, default=8010)
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--adb", action="store_true", help="adb reverse для Android по кабелю")
    parser.add_argument("--https", action="store_true", help="самоподписанный TLS (нужен для геолокации по IP)")
    args = parser.parse_args()

    scheme = "https" if args.https else "http"
    server = Server((args.host, args.port), Handler)

    if args.https:
        cert, key = make_cert()
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert, key)
        server.socket = context.wrap_socket(server.socket, server_side=True)

    print(f"\n  Places on map · {ROOT.name}")
    print(f"  {scheme} на порту {args.port}\n")
    print(f"  На этом Mac:      {scheme}://localhost:{args.port}")

    for name, ip, hint in interfaces():
        tail = f"   ← {hint}" if hint else ""
        print(f"  {name:<10} {scheme}://{ip}:{args.port}{tail}")

    if args.adb:
        print()
        if setup_adb(args.port):
            print(f"  На телефоне:      {scheme}://localhost:{args.port}  (по кабелю)")

    if not args.https:
        print("\n  http по IP: геолокация будет заблокирована браузером.")
        print("  Нужна геолокация — запусти с --https (или --adb: localhost считается безопасным).")

    print("\n  Ctrl+C — остановить\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Остановлено")
        server.shutdown()


if __name__ == "__main__":
    main()
