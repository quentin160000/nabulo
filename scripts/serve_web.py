"""Sert un export web d'Expo (dist/) avec les routes sans .html.  python3 scripts/serve_web.py dist [port]"""
import http.server,os,sys
D=sys.argv[1]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=D,**k)
    def send_head(s):
        p=s.path.split('?')[0]
        if p!='/' and '.' not in os.path.basename(p) and os.path.exists(D+p+'.html'): s.path=p+'.html'
        return super().send_head()
PORT=int(sys.argv[2]) if len(sys.argv)>2 else 8099
http.server.ThreadingHTTPServer(('127.0.0.1',PORT),H).serve_forever()
