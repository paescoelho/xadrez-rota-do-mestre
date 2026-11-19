import json,sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
MODE={'ok':True};SEEN=[]
class H(BaseHTTPRequestHandler):
    def log_message(self,*a):pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin','*');self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type');self.send_header('Access-Control-Allow-Methods','POST, OPTIONS')
    def do_OPTIONS(self):
        self.send_response(204);self.cors();self.end_headers()
    def do_GET(self):
        if self.path.startswith('/modo/'):MODE['ok']=self.path.endswith('ok')
        d=json.dumps({'seen':SEEN}).encode();self.send_response(200);self.cors();self.end_headers();self.wfile.write(d)
    def do_POST(self):
        SEEN.append(self.headers.get('Authorization',''))
        if not MODE['ok']:
            self.send_response(500);self.cors();self.end_headers();return
        d=json.dumps({'iceServers':[{'urls':['stun:stun.cloudflare.com:3478']},{'urls':['turn:turn.cloudflare.com:3478?transport=udp','turns:turn.cloudflare.com:443?transport=tcp'],'username':'usuarioTemp','credential':'senhaTemp'}],'ttl':10800}).encode()
        self.send_response(200);self.cors();self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(d)
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),H).serve_forever()
