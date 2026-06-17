import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from app import COMPONENTS, simulate


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        params = parse_qs(urlparse(self.path).query)
        component = params.pop("component", [""])[0]

        if component not in COMPONENTS:
            self.send_error(404, "Unknown component")
            return

        body = json.dumps(simulate(component, params)).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
