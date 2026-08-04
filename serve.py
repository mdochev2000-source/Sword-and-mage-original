import base64
import http.server
import functools
import os

# Сървър БЕЗ кеширане — браузърът винаги получава последната версия на играта.
class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        # дебъг: POST /shot с dataURL на canvas -> _debug_shot.jpg (за визуални проверки от Claude)
        if self.path != '/shot':
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('ascii')
        data = base64.b64decode(body.split(',', 1)[1])
        with open('_debug_shot.jpg', 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *args):
        pass

os.chdir(os.path.dirname(os.path.abspath(__file__)))
# ThreadingHTTPServer: една висяща връзка да НЕ блокира останалите заявки
http.server.ThreadingHTTPServer(('0.0.0.0', 8741), NoCacheHandler).serve_forever()
