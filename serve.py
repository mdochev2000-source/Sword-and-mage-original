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

    def log_message(self, *args):
        pass

os.chdir(os.path.dirname(os.path.abspath(__file__)))
# ThreadingHTTPServer: една висяща връзка да НЕ блокира останалите заявки
http.server.ThreadingHTTPServer(('0.0.0.0', 8741), NoCacheHandler).serve_forever()
