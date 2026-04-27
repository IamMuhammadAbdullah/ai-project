import json
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from python.route_engine import calculate_routes


class ProjectHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
    }

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/routes":
            self.handle_routes(parsed.query)
            return
        super().do_GET()

    def handle_routes(self, query):
        params = parse_qs(query)
        start = params.get("start", [""])[0]
        end = params.get("end", [""])[0]
        traffic = params.get("traffic", ["normal"])[0]
        if not start or not end:
            self.send_json({"error": "start and end are required"}, status=400)
            return
        self.send_json(calculate_routes(start, end, traffic))

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    port = 5173
    server = ThreadingHTTPServer(("localhost", port), ProjectHandler)
    print(f"A* Traffic Route Planner running at http://localhost:{port}")
    server.serve_forever()


if __name__ == "__main__":
    mimetypes.add_type("text/javascript", ".mjs")
    main()
