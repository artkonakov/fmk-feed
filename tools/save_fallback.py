#!/usr/bin/env python3
"""Принимает картинки от tools/render-fallbacks.html и кладёт их в
assets/map-fallback/. Только для локальной разработки: слушает localhost.

    python3 tools/save_fallback.py        # порт 8121
"""
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

OUT = Path(__file__).resolve().parent.parent / "assets" / "map-fallback"
NAME = re.compile(r"^(ru|en)-[A-Za-z]+-(light|dark)$")


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        name = parse_qs(urlparse(self.path).query).get("name", [""])[0]
        if not NAME.match(name):
            self.send_response(400)
            self._cors()
            self.end_headers()
            return
        data = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f"{name}.webp").write_bytes(data)
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(f"{name}: {len(data)} bytes".encode())


if __name__ == "__main__":
    print(f"saving to {OUT} on http://127.0.0.1:8121")
    HTTPServer(("127.0.0.1", 8121), Handler).serve_forever()
