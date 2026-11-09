import sqlite3, re, json, sys, collections
import chess
db = sys.argv[1]; out = sys.argv[2]
c = sqlite3.connect(db)
decks = {r[0]: r[1] for r in c.execute('select id,name from decks')}
MAP = {"Queen endgame":"queenEndgame","En Passant":"enPassant","Mate in 4":"mateIn4","Attacking f2 or f7":"attackingF2F7","One-move puzzle":"oneMove","Hook mate":"hookMate","Queen and Rook":"queenRookEndgame","Bodens mate":"bodenMate","Mate in 1":"mateIn1","Short puzzle":"short","Exposed king":"exposedKing","Rook endgame":"rookEndgame","Defensive move":"defensiveMove","Underpromotion":"underPromotion","Anastasias mate":"anastasiaMate","Capture the defender":"capturingDefender","Fork":"fork","Intermezzo":"intermezzo","Super GM games":"superGM","Long puzzle":"long","Equality":"equality","Back rank mate":"backRankMate","Advantage":"advantage","Trapped piece":"trappedPiece","Skewer":"skewer","Opening":"opening","Hanging piece":"hangingPiece","Interference":"interference","Dovetail mate":"dovetailMate","Mate in 3":"mateIn3","Smothered mate":"smotheredMate","Middlegame":"middlegame","Very long puzzle":"veryLong","Queenside attack":"queensideAttack","Mate in 5 or more":"mateIn5","Pin":"pin","Double check":"doubleCheck","Castling":"castling","Pawn endgame":"pawnEndgame","Promotion":"promotion","Sacrifice":"sacrifice","Master vs Master games":"masterVsMaster","Master games":"master","Crushing":"crushing","Kingside attack":"kingsideAttack","Knight endgame":"knightEndgame","Quiet move":"quietMove","Mate in 2":"mateIn2","Bishop endgame":"bishopEndgame","Endgame":"endgame","Zugzwang":"zugzwang","Checkmate":"mate","Clearance":"clearance","Arabian mate":"arabianMate","Attraction":"attraction","X-Ray attack":"xRayAttack","Double bishop mate":"doubleBishopMate","Discovered attack":"discoveredAttack","Deflection":"deflection","Advanced pawn":"advancedPawn"}
P = {}
bad = 0
for nid, flds, did in c.execute('select n.id, n.flds, c.did from notes n join cards c on c.nid=n.id'):
    f = flds.split('\x1f')
    if len(f) < 3: continue
    txt, rating, pid = f[0], f[1], f[2]
    m = re.search(r'\[FEN "([^"]+)"\]', txt)
    if not m: continue
    fen = m.group(1)
    dname = decks.get(did, '').split('\x1f')[-1]
    th = MAP.get(dname)
    if pid in P:
        if th: P[pid]['th'].add(th)
        continue
    line = txt[m.end():]
    line = re.sub(r'<[^>]+>', ' ', line)
    toks = [t for t in line.split() if not re.match(r'^\d+\.*$', t) and t not in ('...', '*', '1-0', '0-1')]
    toks = [re.sub(r'^\d+\.+', '', t) for t in toks]
    toks = [t for t in toks if t]
    b = chess.Board(fen)
    ucis = []
    try:
        for t in toks:
            mv = b.parse_san(t)
            ucis.append(mv.uci()); b.push(mv)
    except Exception as e:
        bad += 1; continue
    if len(ucis) < 2: bad += 1; continue
    P[pid] = {'fen': fen, 'u': ucis, 'r': int(rating), 'th': set([th] if th else [])}
print('ok', len(P), 'bad', bad)
with open(out, 'w') as fo:
    for pid, p in P.items():
        fo.write('\t'.join([pid, p['fen'], ' '.join(p['u']), str(p['r']), ' '.join(sorted(p['th']))]) + '\n')
cnt = collections.Counter(t for p in P.values() for t in p['th'])
print(cnt.most_common())
