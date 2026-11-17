import chess,chess.pgn,re,sys,json
import real
V={chess.PAWN:1,chess.KNIGHT:3,chess.BISHOP:3,chess.ROOK:5,chess.QUEEN:9,chess.KING:0}
def mat(b,c): return sum(V[p.piece_type] for p in b.piece_map().values() if p.color==c)
pid=sys.argv[1];fn,rx=real.P[pid];rx=re.compile(rx)
n=sac=sacw=opp=0;atk=0
with open(f'pgn/{fn}.pgn',encoding='latin-1') as fh:
  while True:
    try:g=chess.pgn.read_game(fh)
    except Exception:continue
    if g is None:break
    h=g.headers
    if 'FEN' in h or real.SKIP.search(h.get('Event','')):continue
    col='w' if rx.search(h.get('White','')) else ('b' if rx.search(h.get('Black','')) else None)
    if not col:continue
    mv=list(g.mainline_moves())
    if len(mv)<20:continue
    me=chess.WHITE if col=='w' else chess.BLACK;r=h.get('Result')
    lost=(r=='0-1' and col=='w') or (r=='1-0' and col=='b')
    b=chess.Board();run=0;hit=False;mycs=None;opcs=None
    for i,m in enumerate(mv[:80]):
      if b.is_castling(m):
        side='k' if b.is_kingside_castling(m) else 'q'
        if b.turn==me: mycs=side
        else: opcs=side
      b.push(m)
      if b.turn==me:  # depois da resposta do adversário
        d=mat(b,me)-mat(b,not me)
        run=run+1 if d<=-2 else 0
        if run>=3 and i<70: hit=True
    n+=1
    if mycs and opcs and mycs!=opcs: opp+=1
    if hit:
      sac+=1
      if not lost: sacw+=1
print(json.dumps({'id':pid,'n':n,'sac':round(100*sac/n,1),'sacok':round(100*sacw/n,1),'opp':round(100*opp/n,1)}))
