# Servidor falso do Lichess (Board API) para testar a v83 sem rede. Segue a especificação oficial (lichess-org/api).
import json, queue, threading, time, random, sys, urllib.parse, re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import chess

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8950
TOK = 'tok_teste_123'
ME = {'id': 'rodrigo_t', 'username': 'Rodrigo_T'}
lock = threading.Lock()
ev_subs = []          # filas dos fluxos de eventos
games = {}            # id -> dict(board, subs, state...)
LOG = []
CFG = {'seek_accept': True, 'opp_draw_at': None, 'opp_gone': False, 'busy': False, 'r429': 0}
EVN = [0]

def push_event(e):
    with lock:
        for q in list(ev_subs): q.put(e)

def gstate(g):
    s = {'type': 'gameState', 'moves': ' '.join(g['uci']), 'wtime': int(g['wt']), 'btime': int(g['bt']), 'winc': g['inc'], 'binc': g['inc'], 'status': g['status']}
    if g.get('winner'): s['winner'] = g['winner']
    for k in ('wdraw', 'bdraw', 'wtakeback', 'btakeback'):
        if g.get(k): s[k] = True
    return s

def push_game(g, obj):
    with lock:
        for q in list(g['subs']): q.put(obj)

def new_game(gid, me_color, opp, rated=True, ai=None, clock=(600000, 0), fen=None):
    b = chess.Board(fen) if fen else chess.Board()
    opp_p = {'id': opp, 'name': opp.capitalize(), 'rating': 1210, 'title': None} if not ai else {'aiLevel': ai}
    me_p = {'id': ME['id'], 'name': ME['username'], 'rating': 1180}
    g = {'id': gid, 'board': b, 'uci': [], 'me': me_color, 'white': me_p if me_color == 'w' else opp_p, 'black': opp_p if me_color == 'w' else me_p,
         'status': 'started', 'wt': clock[0] if clock else 0, 'bt': clock[0] if clock else 0, 'inc': clock[1] if clock else 0, 'subs': [], 'rated': rated, 'clock': clock, 'last': time.time(), 'fen': fen}
    games[gid] = g
    push_event({'type': 'gameStart', 'game': {'gameId': gid, 'fullId': gid + 'abcd', 'color': 'white' if me_color == 'w' else 'black', 'fen': b.fen(),
        'isMyTurn': me_color == 'w', 'opponent': {'id': opp, 'username': opp, 'rating': 1210}, 'rated': rated, 'source': 'ai' if ai else 'lobby'}})
    if (b.turn == chess.WHITE) != (me_color == 'w'): threading.Timer(0.8, opp_move, [g]).start()
    return g

def finish(g, status, winner=None):
    g['status'] = status
    if winner: g['winner'] = winner
    push_game(g, gstate(g))
    rd = (-9 if winner and winner != g['me'] else (8 if winner == g['me'] else 0))
    push_event({'type': 'gameFinish', 'game': {'gameId': g['id'], 'ratingDiff': rd if g['rated'] else None, 'status': {'name': status}}})

def opp_move(g):
    if g['status'] != 'started': return
    b = g['board']
    if b.is_game_over(): return
    mv = list(b.legal_moves)
    # prefere roque e capturas para exercitar o jogo; roque sai no formato "rei captura torre" (e8h8)
    cs = [m for m in mv if b.is_castling(m)]
    m = cs[0] if cs else random.choice(mv)
    u = b.uci(m, chess960=True) if b.is_castling(m) else m.uci()
    b.push(m); g['uci'].append(u)
    side = 'bt' if g['me'] == 'w' else 'wt'
    g[side] = max(0, g[side] - 700) + g['inc'] * 1000
    g['wdraw'] = g['bdraw'] = False
    n = len(g['uci'])
    if CFG['opp_draw_at'] and n >= CFG['opp_draw_at']:
        g['bdraw' if g['me'] == 'w' else 'wdraw'] = True; CFG['opp_draw_at'] = None
    if b.is_checkmate(): finish(g, 'mate', 'b' if b.turn == chess.WHITE else 'w'); return
    if b.is_stalemate(): finish(g, 'stalemate'); return
    push_game(g, gstate(g))
    if CFG['opp_gone'] and n >= 6:
        push_game(g, {'type': 'opponentGone', 'gone': True, 'claimWinInSeconds': 3})

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    def do_OPTIONS(self):
        LOG.append('OPTIONS ' + self.path)
        if not self.path.startswith('/api/'):
            self.send_response(404); self.end_headers(); return
        self.send_response(204); self.cors(); self.end_headers()
    def body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return dict(urllib.parse.parse_qsl(self.rfile.read(n).decode())) if n else {}
    def j(self, obj, code=200):
        d = json.dumps(obj).encode(); self.send_response(code); self.cors()
        self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(d))); self.end_headers(); self.wfile.write(d)
    def authed(self):
        if self.headers.get('Authorization') != 'Bearer ' + TOK:
            self.j({'error': 'No such token'}, 401); return False
        return True
    def stream(self, q, first=(), until=None, ka=1.0):
        self.send_response(200); self.cors(); self.send_header('Content-Type', 'application/x-ndjson'); self.end_headers()
        try:
            for o in first: self.wfile.write((json.dumps(o) + '\n').encode()); self.wfile.flush()
            while True:
                try:
                    o = q.get(timeout=ka)
                    if o is None: return
                    self.wfile.write((json.dumps(o) + '\n').encode())
                except queue.Empty:
                    self.wfile.write(b'\n')
                self.wfile.flush()
                if until and until(): return
        except (BrokenPipeError, ConnectionResetError):
            return
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); qs = dict(urllib.parse.parse_qsl(u.query)); p = u.path
        LOG.append('GET ' + p)
        if p == '/oauth':
            assert qs.get('code_challenge_method') == 'S256' and qs.get('code_challenge')
            LOG.append('scope=' + qs.get('scope', ''))
            loc = qs['redirect_uri'] + '?' + urllib.parse.urlencode({'code': 'liu_code', 'state': qs['state']})
            self.send_response(302); self.send_header('Location', loc); self.end_headers(); return
        if p == '/api/account':
            if not self.authed(): return
            return self.j({**ME, 'perfs': {'rapid': {'rating': 1180, 'games': 40}, 'classical': {'rating': 1250, 'games': 12}, 'blitz': {'rating': 1100, 'games': 90, 'prov': False}}})
        if p == '/api/stream/event':
            if not self.authed(): return
            if CFG['r429'] > 0:
                CFG['r429'] -= 1; return self.j({'error': 'Too many requests. Try again later.'}, 429)
            q = queue.Queue(); EVN[0] += 1
            with lock:
                for old in ev_subs: old.put(None)
                ev_subs.append(q)
            first = [{'type': 'gameStart', 'game': {'gameId': gid, 'opponent': {'username': 'velho'}, 'isMyTurn': True}} for gid, g in games.items() if g['status'] == 'started' and g.get('old')]
            try: self.stream(q, first, ka=2)
            finally:
                with lock:
                    if q in ev_subs: ev_subs.remove(q)
            return
        m = re.match(r'/api/board/game/stream/(\w+)$', p)
        if m:
            if not self.authed(): return
            g = games.get(m.group(1))
            if not g: return self.j({'error': 'not found'}, 404)
            q = queue.Queue()
            with lock: g['subs'].append(q)
            full = {'type': 'gameFull', 'id': g['id'], 'rated': g['rated'], 'speed': 'rapid' if g['clock'] else 'correspondence',
                    'white': g['white'], 'black': g['black'], 'initialFen': g['fen'] or 'startpos', 'state': gstate(g)}
            if g['clock']: full['clock'] = {'initial': g['clock'][0], 'increment': g['clock'][1] * 1000}
            else: full['daysPerTurn'] = 3
            try: self.stream(q, [full], until=lambda: g.get('cut'))
            finally:
                with lock:
                    if q in g['subs']: g['subs'].remove(q)
                g['cut'] = False
            return
        m = re.match(r'/game/export/(\w+)$', p)
        if m:
            g = games[m.group(1)]
            pgn = chess.pgn_text if False else None
            import chess.pgn
            game = chess.pgn.Game.from_board(g['board'])
            game.headers['White'] = g['white'].get('name', 'Stockfish'); game.headers['Black'] = g['black'].get('name', 'Stockfish')
            game.headers['Site'] = 'https://lichess.org/' + g['id']; game.headers['Event'] = 'Rated rapid game'
            d = str(game).encode(); self.send_response(200); self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Content-Type', 'application/x-chess-pgn'); self.end_headers(); self.wfile.write(d); return
        if p == '/log': return self.j(LOG)
        if p.startswith('/test/'):
            cmd = p[6:]
            if cmd == 'incoming':
                push_event({'type': 'challenge', 'challenge': {'id': 'inc1', 'challenger': {'id': 'amigo', 'name': 'Amigo', 'rating': 1300}, 'destUser': {'id': ME['id']}, 'rated': True, 'timeControl': {'type': 'clock', 'limit': 300, 'increment': 3}}})
            if cmd == 'cut':
                for g in games.values(): g['cut'] = True
            if cmd.startswith('cfg'):
                CFG.update(json.loads(urllib.parse.unquote(qs.get('j', '{}'))))
            if cmd == 'promo':
                new_game('promo001', 'w', 'adversario', fen='7k/P7/8/8/8/8/8/K7 w - - 0 1')
            if cmd == 'mate1':
                new_game('mate0001', 'w', 'adversario', fen='6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1')
            if cmd == 'corr':
                new_game('corr0001', 'w', 'adversario', clock=None)
            if cmd == 'flag':
                for g in list(games.values()):
                    if g['status'] == 'started' and not g.get('old'): finish(g, 'outoftime', 'b' if g['me'] == 'w' else 'w')
            if cmd == 'revoke':
                globals()['TOK'] = 'outro_token'
            if cmd == 'evn':
                return self.j({'n': EVN[0]})
            if cmd == 'oldgame':
                g = new_game('old1', 'w', 'velho'); g['old'] = True
            return self.j({'ok': True})
        self.j({'error': 'not found ' + p}, 404)
    def do_DELETE(self):
        LOG.append('DELETE ' + self.path)
        self.send_response(204); self.cors(); self.end_headers()
    def do_POST(self):
        p = urllib.parse.urlparse(self.path).path; b = self.body()
        LOG.append('POST ' + p + ' ' + json.dumps(b))
        if p == '/api/token':
            if b.get('code') == 'liu_code' and b.get('code_verifier') and b.get('grant_type') == 'authorization_code':
                return self.j({'token_type': 'Bearer', 'access_token': TOK, 'expires_in': 31536000})
            return self.j({'error': 'invalid'}, 400)
        if not self.authed(): return
        if p == '/api/board/seek':
            t = float(b.get('time', 0)) * 60 + 40 * int(b.get('increment', 0))
            if t < 480: return self.j({'error': {'global': ['Invalid time control']}}, 400)
            if CFG['busy']: return self.j({'error': 'You are already playing Adversario'}, 403)
            self.send_response(200); self.cors(); self.send_header('Content-Type', 'application/x-ndjson'); self.end_headers()
            try:
                for i in range(3): time.sleep(0.5); self.wfile.write(b'\n'); self.wfile.flush()
            except Exception: return
            if CFG['seek_accept']:
                gid = 'seek%d' % random.randint(100, 999)
                new_game(gid, random.choice(['w', 'b']), 'adversario', rated=b.get('rated') == 'true', clock=(int(float(b['time']) * 60000), int(b['increment'])))
            return
        if p == '/api/challenge/ai':
            gid = 'ai%d' % random.randint(100, 999)
            new_game(gid, 'w', 'stockfish', rated=False, ai=int(b['level']), clock=(int(b['clock.limit']) * 1000, int(b['clock.increment'])))
            return self.j({'id': gid, 'fullId': gid + 'xxxx', 'player': 'white'}, 201)
        m = re.match(r'/api/challenge/(\w+)/(accept|decline|cancel)$', p)
        if m:
            if m.group(2) == 'accept':
                new_game(m.group(1), 'b', 'amigo', rated=True, clock=(300000, 3))
            return self.j({'ok': True})
        m = re.match(r'/api/challenge/(\w+)$', p)
        if m:
            user = m.group(1); cid = 'ch%d' % random.randint(100, 999)
            self.send_response(200); self.cors(); self.send_header('Content-Type', 'application/x-ndjson'); self.end_headers()
            self.wfile.write((json.dumps({'challenge': {'id': cid, 'status': 'created'}}) + '\n').encode()); self.wfile.flush()
            time.sleep(1.2)
            if user == 'recusa':
                self.wfile.write((json.dumps({'done': 'declined'}) + '\n').encode()); return
            new_game(cid, 'w', user, rated=b.get('rated') == 'true', clock=(int(b['clock.limit']) * 1000, int(b['clock.increment'])))
            self.wfile.write((json.dumps({'done': 'accepted'}) + '\n').encode()); return
        m = re.match(r'/api/board/game/(\w+)/(.+)$', p)
        if m:
            g = games.get(m.group(1)); act = m.group(2)
            if not g: return self.j({'error': 'not found'}, 404)
            if act.startswith('move/'):
                u = act[5:]; bd = g['board']
                try: mv = chess.Move.from_uci(u)
                except Exception: return self.j({'error': 'bad move'}, 400)
                if (bd.turn == chess.WHITE) != (g['me'] == 'w') or mv not in bd.legal_moves: return self.j({'error': 'Not your turn, or game already over'}, 400)
                bd.push(mv); g['uci'].append(u)
                side = 'wt' if g['me'] == 'w' else 'bt'
                if len(g['uci']) > 2: g[side] = max(0, g[side] - 1500) + g['inc'] * 1000
                g['wdraw'] = g['bdraw'] = False
                if bd.is_checkmate(): finish(g, 'mate', g['me']); return self.j({'ok': True})
                push_game(g, gstate(g))
                threading.Timer(0.6, opp_move, [g]).start()
                return self.j({'ok': True})
            if act == 'resign': finish(g, 'resign', 'b' if g['me'] == 'w' else 'w'); return self.j({'ok': True})
            if act == 'abort':
                if len(g['uci']) >= 2: return self.j({'error': 'too late'}, 400)
                finish(g, 'aborted'); return self.j({'ok': True})
            if act == 'draw/yes':
                if g.get('bdraw' if g['me'] == 'w' else 'wdraw'): finish(g, 'draw')
                else: g['wdraw' if g['me'] == 'w' else 'bdraw'] = True; push_game(g, gstate(g))
                return self.j({'ok': True})
            if act == 'draw/no':
                g['wdraw'] = g['bdraw'] = False; push_game(g, gstate(g)); return self.j({'ok': True})
            if act == 'chat':
                push_game(g, {'type': 'chatLine', 'room': 'player', 'username': ME['username'], 'text': b.get('text', '')})
                threading.Timer(0.4, lambda: push_game(g, {'type': 'chatLine', 'room': 'player', 'username': 'Adversario', 'text': 'Igualmente!'})).start()
                return self.j({'ok': True})
            if act == 'claim-victory': finish(g, 'timeout', g['me']); return self.j({'ok': True})
            return self.j({'ok': True})
        self.j({'error': 'not found ' + p}, 404)

ThreadingHTTPServer.daemon_threads = True
ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
