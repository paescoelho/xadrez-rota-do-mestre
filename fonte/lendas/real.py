# Repertório real das 24 lendas a partir das partidas (PgnMentor via rozim/ChessData; Gukesh via NateSolon/hans + Mundial 2024).
# Saída: book/<id>.json (posição -> lances do jogador com peso) e stats.json (estilo medido + aberturas mais jogadas).
import chess, chess.pgn, re, json, os, sys, collections, io

P = {  # id: (arquivo, regex do nome)
 'carlsen':('Carlsen',r'Carlsen'), 'kasparov':('Kasparov',r'Kasparov'), 'fischer':('Fischer',r'Fischer, Robert'),
 'karpov':('Karpov',r'Karpov, ?An'), 'capablanca':('Capablanca',r'Capablanca'), 'alekhine':('Alekhine',r'Alekhine'),
 'lasker':('Lasker',r'Lasker, Emanuel'), 'botvinnik':('Botvinnik',r'Botvinnik'), 'tal':('Tal',r'^Tal, Mi'),
 'petrosian':('Petrosian',r'Petrosian, Tigran'), 'spassky':('Spassky',r'Spassky'), 'smyslov':('Smyslov',r'Smyslov'),
 'steinitz':('Steinitz',r'Steinitz'), 'morphy':('Morphy',r'Morphy'), 'kramnik':('Kramnik',r'Kramnik'),
 'anand':('Anand',r'Anand'), 'caruana':('Caruana',r'Caruana'), 'nakamura':('Nakamura',r'Nakamura'),
 'ding':('Ding',r'Ding,? Liren'), 'gukesh':('Gukesh',r'Gukesh'), 'polgar':('PolgarJ',r'Polgar, ?Ju'),
 'korchnoi':('Korchnoi',r'Kortschnoj|Korchnoi'), 'mequinho':('Mecking',r'Mecking'), 'firouzja':('Firouzja',r'Firouzja'),
}
MAXPLY = 30
FAST = re.compile(r'blitz|rapid|bullet|armageddon|speed|titled|banter|online|chess\.com|lichess|playoff|tie.?break|blind', re.I)
SKIP = re.compile(r'simul|odds|exhib.*simul|clock simul|consult', re.I)

# nomes de aberturas do próprio jogo (UCI -> nome em português)
OPEN = []
for ln in open('/home/claude/v2/res/openings.txt', encoding='utf8'):
    p = ln.rstrip('\n').split('\t')
    if len(p) == 3: OPEN.append((p[2].split(' '), p[1]))
OPEN.sort(key=lambda x: -len(x[0]))
def opening(ucis):
    for line, name in OPEN:
        if len(line) <= len(ucis) and ucis[:len(line)] == line: return name
    return None
def family(name):
    if not name: return None
    return name.split(':')[0].strip()

def fnv(s):
    h = 0x811c9dc5
    for ch in s.encode('utf8'):
        h ^= ch; h = (h * 0x01000193) & 0xffffffff
    return format(h, 'x')
def key(b):
    f = b.fen().split(' ')
    return fnv(f[0] + ' ' + f[1] + ' ' + f[2])

def run(pid):
    fn, rx = P[pid]; rx = re.compile(rx)
    book = collections.defaultdict(lambda: collections.defaultdict(float)); seenN = collections.Counter()
    fam = {'w': collections.Counter(), 'b': collections.Counter()}
    first = {'w': collections.Counter(), 'b': collections.Counter()}
    st = dict(games=0, w=0, b=0, fast=0, moves=0, caps=0, chk=0, castled=0, cnS=0, ks=0, qs=0, qE=0, win=0, draw=0, loss=0, y0=9999, y1=0)
    seen = set()
    with open(f'pgn/{fn}.pgn', encoding='latin-1') as fh:
        while True:
            try: g = chess.pgn.read_game(fh)
            except Exception: continue
            if g is None: break
            h = g.headers
            if 'FEN' in h or h.get('SetUp') == '1' or h.get('Variant', 'Standard').lower() not in ('standard', ''): continue
            if SKIP.search(h.get('Event', '')): continue
            wn, bn = h.get('White', ''), h.get('Black', '')
            col = 'w' if rx.search(wn) else ('b' if rx.search(bn) else None)
            if not col or (col == 'w' and rx.search(bn)): continue
            mv = list(g.mainline_moves())
            if len(mv) < 10: continue
            sig = (wn, bn, h.get('Date'), ' '.join(m.uci() for m in mv[:40]))
            if sig in seen: continue  # partidas repetidas nas coleções
            seen.add(sig)
            wt = 0.5 if FAST.search(h.get('Event', '') + ' ' + h.get('TimeControl', '')) else 1.0
            st['games'] += 1; st[col] += 1; st['fast'] += wt < 1
            y = re.match(r'(\d{4})', h.get('Date', ''));
            if y and y.group(1) != '????':
                yy = int(y.group(1)); st['y0'] = min(st['y0'], yy); st['y1'] = max(st['y1'], yy)
            r = h.get('Result', '*')
            if r == '1/2-1/2': st['draw'] += 1
            elif (r == '1-0') == (col == 'w') and r in ('1-0', '0-1'): st['win'] += 1
            elif r in ('1-0', '0-1'): st['loss'] += 1
            b = chess.Board(); me = chess.WHITE if col == 'w' else chess.BLACK
            ucis = []; castled = None; qoff = 0
            for i, m in enumerate(mv):
                if b.turn == me:
                    if i < MAXPLY:
                        kk = key(b); book[kk][m.uci()] += wt; seenN[kk] += 1
                    st['moves'] += 1
                    if b.is_capture(m): st['caps'] += 1
                    if b.gives_check(m): st['chk'] += 1
                    if castled is None and b.is_castling(m):
                        castled = ('k' if b.is_kingside_castling(m) else 'q', b.fullmove_number)
                if i < 24: ucis.append(m.uci())
                b.push(m)
                if not qoff and not b.pieces(chess.QUEEN, chess.WHITE) and not b.pieces(chess.QUEEN, chess.BLACK): qoff = b.fullmove_number
            if castled:
                st['castled'] += 1; st['cnS'] += castled[1]; st['ks' if castled[0] == 'k' else 'qs'] += 1
            if qoff and qoff <= 20: st['qE'] += 1
            fm = family(opening(ucis))
            if fm: fam[col][fm] += wt
            first[col][ucis[0] if col == 'w' else ucis[1]] += wt
    # poda: posição vista ao menos 2 vezes; lance com pelo menos 3% das escolhas ali
    out = {}
    for k, ms in book.items():
        tot = sum(ms.values())
        if tot < 2: continue
        keep = [[u, round(w * 2)] for u, w in sorted(ms.items(), key=lambda x: -x[1]) if w / tot >= 0.03 and w >= 1]
        if keep: out[k] = [seenN[k]] + keep
    os.makedirs('book', exist_ok=True)
    json.dump(out, open(f'book/{pid}.json', 'w'), separators=(',', ':'))
    n = st['games']
    res = dict(n=n, nw=st['w'], nb=st['b'], y0=st['y0'], y1=st['y1'], pos=len(out),
        ag=round(100 * (st['caps'] + st['chk']) / max(1, st['moves'])),
        cs=('q' if st['qs'] > st['ks'] else 'k') if st['castled'] * 10 >= n * 3 else '',
        cn=round(st['cnS'] / st['castled']) if st['castled'] else 10,
        qx=round(100 * st['qE'] / max(1, n)),
        win=round(100 * st['win'] / max(1, n)), draw=round(100 * st['draw'] / max(1, n)),
        fw=[[f, round(100 * c / max(1, sum(fam['w'].values())))] for f, c in fam['w'].most_common(6)],
        fb=[[f, round(100 * c / max(1, sum(fam['b'].values())))] for f, c in fam['b'].most_common(6)],
        m1=[[u, round(100 * c / max(1, sum(first['w'].values())))] for u, c in first['w'].most_common(4)],
        r1=[[u, round(100 * c / max(1, sum(first['b'].values())))] for u, c in first['b'].most_common(6)])
    return res

if __name__ == '__main__':
    ids = sys.argv[1:] or list(P)
    allst = json.load(open('stats.json')) if os.path.exists('stats.json') else {}
    for pid in ids:
        allst[pid] = run(pid)
        s = allst[pid]
        print(pid, s['n'], f"({s['nw']}B/{s['nb']}P {s['y0']}-{s['y1']})", 'pos', s['pos'], 'ag', s['ag'], 'cs', s['cs'], s['cn'], 'qx', s['qx'], os.path.getsize(f'book/{pid}.json') // 1024, 'KB', flush=True)
    json.dump(allst, open('stats.json', 'w'), ensure_ascii=False, indent=0)
