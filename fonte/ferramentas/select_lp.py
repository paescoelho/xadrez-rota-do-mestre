import sys, random, collections, chess
random.seed(7)
allf, oldf, out = sys.argv[1], sys.argv[2], sys.argv[3]
PER = 250
PAT = {'anastasiaMate','arabianMate','backRankMate','bodenMate','doubleBishopMate','dovetailMate','hookMate','smotheredMate'}
rows = []
for line in open(allf):
    f = line.rstrip('\n').split('\t')
    rows.append({'id': f[0], 'fen': f[1], 'u': f[2].split(), 'r': int(f[3]), 'th': set(f[4].split()) if f[4] else set()})
def derive(p):
    b = chess.Board(p['fen'])
    for u in p['u']: b.push_uci(u)
    th = p['th']
    n = (len(p['u']) - 1 + 1) // 2  # jogadas do aluno
    if b.is_checkmate():
        th.add('mate'); th.add('mateIn%d' % min(n, 5) if n <= 4 else 'mateIn5')
    if n == 1: th.add('oneMove')
    elif n == 2: th.add('short')
    elif n == 3: th.add('long')
    else: th.add('veryLong')
    b0 = chess.Board(p['fen'])
    mat = sum(len(b0.pieces(t, c)) * v for t, v in [(chess.QUEEN, 9), (chess.ROOK, 5), (chess.BISHOP, 3), (chess.KNIGHT, 3)] for c in (True, False))
    if not th & {'opening', 'middlegame', 'endgame'}:
        th.add('endgame' if mat <= 14 else ('opening' if b0.fullmove_number <= 12 else 'middlegame'))
for p in rows: derive(p)
by = collections.defaultdict(list)
for p in rows:
    for t in p['th']: by[t].append(p)
chosen = {}
deck_themes = set()
for line in open(allf):
    for t in line.rstrip('\n').split('\t')[4].split(): deck_themes.add(t)
for t in sorted(deck_themes):
    lim = 320 if t in PAT else PER
    bucket = collections.defaultdict(list)
    for p in by[t]: bucket[min(13, max(0, (p['r'] - 400) // 200))].append(p)
    for k in bucket: random.shuffle(bucket[k])
    have = [p for p in by[t] if p['id'] in chosen]
    cnt = len(have)
    keys = sorted(bucket)
    while cnt < lim and any(bucket[k] for k in keys):
        for k in keys:
            if bucket[k] and cnt < lim:
                p = bucket[k].pop()
                if p['id'] not in chosen:
                    chosen[p['id']] = p; cnt += 1
old = []
oldids = set()
for line in open(oldf):
    f = line.rstrip('\n').split('\t')
    if len(f) < 5: continue
    old.append(line.rstrip('\n')); oldids.add(f[0])
n_new = 0
with open(out, 'w') as fo:
    for l in old: fo.write(l + '\n')
    for p in chosen.values():
        if p['id'] in oldids: continue
        fo.write('\t'.join([p['id'], p['fen'], ' '.join(p['u']), str(p['r']), ' '.join(sorted(p['th']))]) + '\n'); n_new += 1
print('old', len(old), 'new', n_new)
c = collections.Counter(t for p in chosen.values() for t in p['th'])
print(c.most_common())
