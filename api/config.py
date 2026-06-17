import json
from http.server import BaseHTTPRequestHandler

from app import COMPONENTS


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"components": COMPONENTS}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "public, max-age=300")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
