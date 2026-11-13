package;

import haxe.ds.Vector;

class Undo {
  public var m:Int; public var cap:Int; public var castling:Int; public var ep:Int; public var half:Int; public var piece:Int;
  public var h1:Int; public var h2:Int;
  public function new(m:Int, cap:Int, castling:Int, ep:Int, half:Int, piece:Int, h1:Int, h2:Int) {
    this.m = m; this.cap = cap; this.castling = castling; this.ep = ep; this.half = half; this.piece = piece; this.h1 = h1; this.h2 = h2;
  }
}

class Pos {
  public var board:Vector<Int>;
  public var turn:Int = 1;
  public var castling:Int = 0;
  public var ep:Int = -1;
  public var half:Int = 0;
  public var full:Int = 1;
  public var king:Array<Int>;
  public var stack:Array<Undo>;
  public var h1:Int = 0;
  public var h2:Int = 0;
  public function new() {
    board = new Vector<Int>(64);
    for (i in 0...64) board[i] = 0;
    king = [0, 0];
    stack = [];
  }
  public function clone():Pos {
    var p = new Pos();
    for (i in 0...64) p.board[i] = board[i];
    p.turn = turn; p.castling = castling; p.ep = ep; p.half = half; p.full = full;
    p.king = [king[0], king[1]];
    p.h1 = h1; p.h2 = h2;
    return p;
  }
}

class Ctx {
  public var nodes:Int = 0;
  public var maxNodes:Int = 2000000000;
  public var repKeys:Map<String, Bool> = null;
  public var hist:Map<Int, Int> = null;
  public var deadline:Float;
  public var stop:Bool = false;
  public var killers:Array<Array<Int>>;
  public var pv:Array<Vector<Int>>;
  public var pvLen:Vector<Int>;
  public function new(timeMs:Float, ?maxNodes:Int) {
    deadline = Engine.now() + timeMs;
    if (maxNodes != null && maxNodes > 0) this.maxNodes = maxNodes;
    killers = []; pv = [];
    for (i in 0...(Engine.MAXPLY + 4)) {
      killers.push([0, 0]);
      var v = new Vector<Int>(Engine.MAXPLY + 4);
      for (j in 0...(Engine.MAXPLY + 4)) v[j] = 0;
      pv.push(v);
    }
    pvLen = new Vector<Int>(Engine.MAXPLY + 4);
    for (i in 0...(Engine.MAXPLY + 4)) pvLen[i] = 0;
  }
}

class Scored {
  public var m:Int; public var score:Int; public var pv:Array<Int>;
  public function new(m:Int, score:Int, pv:Array<Int>) { this.m = m; this.score = score; this.pv = pv; }
}

class Status {
  public var over:Bool = false;
  public var result:String = "";
  public var winner:Int = 0;
  public var check:Bool = false;
  public function new() {}
}

class Engine {
  public static inline var PAWN = 1; public static inline var KNIGHT = 2; public static inline var BISHOP = 3;
  public static inline var ROOK = 4; public static inline var QUEEN = 5; public static inline var KING = 6;
  public static var VAL:Array<Int> = [0, 100, 320, 330, 500, 900, 20000];
  public static inline var FLAG_EP = 1; public static inline var FLAG_CASTLE = 2; public static inline var FLAG_DP = 4;
  public static inline var MATE = 30000; public static inline var INF = 1000000; public static inline var MAXPLY = 64;
  public static inline var START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  public static inline function pType(p:Int):Int return p < 0 ? -p : p;
  public static inline function pColor(p:Int):Int return p > 0 ? 1 : (p < 0 ? -1 : 0);
  public static inline function sideIdx(c:Int):Int return c == 1 ? 0 : 1;
  public static function sqName(s:Int):String return "abcdefgh".charAt(s & 7) + Std.string((s >> 3) + 1);
  public static function nameSq(n:String):Int return (n.charCodeAt(0) - 97) + (Std.parseInt(n.charAt(1)) - 1) * 8;

  public static function now():Float {
    #if flash
    return flash.Lib.getTimer();
    #elseif js
    return Date.now().getTime();
    #else
    return Sys.time() * 1000;
    #end
  }

  public static var KNIGHT_T:Array<Array<Int>> = [];
  public static var KING_T:Array<Array<Int>> = [];
  public static var RAYS:Array<Array<Array<Int>>> = [];
  public static var CM:Array<Int> = [];
  public static var PSTW:Array<Vector<Int>> = [];
  public static var PSTB:Array<Vector<Int>> = [];
  public static var KEG_W:Vector<Int>;
  public static var KEG_B:Vector<Int>;
  static var inited = false;
  public static var ZK1:Vector<Int>; public static var ZK2:Vector<Int>;
  public static var ZC1:Vector<Int>; public static var ZC2:Vector<Int>;
  public static var ZE1:Vector<Int>; public static var ZE2:Vector<Int>;
  public static var ZS1:Int = 0; public static var ZS2:Int = 0;
  static var rngState:Int = 0x2545F491;
  static function rnd():Int { var x = rngState; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; rngState = x; return x; }
  public static inline var TT_BITS = 18;
  public static inline var TT_SIZE = 262144;
  public static var ttCheck:Vector<Int>; public static var ttMove:Vector<Int>; public static var ttScore:Vector<Int>; public static var ttDF:Vector<Int>;
  public static var history:Vector<Int>;
  public static function clearTT() {
    for (i in 0...TT_SIZE) { ttCheck[i] = 0; ttMove[i] = 0; ttScore[i] = 0; ttDF[i] = -1; }
    for (i in 0...8192) history[i] = 0;
  }

  public static function init() {
    if (inited) return;
    inited = true;
    var kn = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
    var kg = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (s in 0...64) {
      var f = s & 7; var r = s >> 3;
      KNIGHT_T.push([]); KING_T.push([]); RAYS.push([]);
      for (d in kn) { var nf = f + d[0]; var nr = r + d[1]; if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) KNIGHT_T[s].push(nr * 8 + nf); }
      for (d in kg) { var nf = f + d[0]; var nr = r + d[1]; if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) KING_T[s].push(nr * 8 + nf); }
      for (d in dirs) {
        var ray:Array<Int> = [];
        var nf = f + d[0]; var nr = r + d[1];
        while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) { ray.push(nr * 8 + nf); nf += d[0]; nr += d[1]; }
        RAYS[s].push(ray);
      }
    }
    ZK1 = new Vector<Int>(13 * 64); ZK2 = new Vector<Int>(13 * 64);
    for (i in 0...(13 * 64)) { ZK1[i] = rnd(); ZK2[i] = rnd(); }
    ZC1 = new Vector<Int>(16); ZC2 = new Vector<Int>(16);
    for (i in 0...16) { ZC1[i] = rnd(); ZC2[i] = rnd(); }
    ZE1 = new Vector<Int>(8); ZE2 = new Vector<Int>(8);
    for (i in 0...8) { ZE1[i] = rnd(); ZE2[i] = rnd(); }
    ZS1 = rnd(); ZS2 = rnd();
    ttCheck = new Vector<Int>(TT_SIZE); ttMove = new Vector<Int>(TT_SIZE); ttScore = new Vector<Int>(TT_SIZE); ttDF = new Vector<Int>(TT_SIZE);
    history = new Vector<Int>(8192);
    LMR = new Vector<Int>(64 * 64);
    for (d in 0...64) for (n in 0...64) LMR[d * 64 + n] = (d < 1 || n < 1) ? 0 : Std.int(0.4 + Math.log(d) * Math.log(n) / 2.3);
    clearTT();
    for (i in 0...64) CM.push(15);
    CM[0] = 13; CM[4] = 12; CM[7] = 14; CM[56] = 7; CM[60] = 3; CM[63] = 11;
    var src:Array<Array<Int>> = [[],
      [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
      [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
      [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
      [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
      [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
      [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]];
    var keg = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
    PSTW.push(new Vector<Int>(64)); PSTB.push(new Vector<Int>(64));
    for (t in 1...7) {
      var w = new Vector<Int>(64); var b = new Vector<Int>(64);
      for (s in 0...64) { var r = s >> 3; var f = s & 7; w[s] = src[t][(7 - r) * 8 + f]; b[s] = src[t][r * 8 + f]; }
      PSTW.push(w); PSTB.push(b);
    }
    KEG_W = new Vector<Int>(64); KEG_B = new Vector<Int>(64);
    for (s in 0...64) { var r = s >> 3; var f = s & 7; KEG_W[s] = keg[(7 - r) * 8 + f]; KEG_B[s] = keg[r * 8 + f]; }
  }

  /* ---------- posição ---------- */
  public static function posFromFEN(fen:String):Pos {
    var pos = new Pos();
    var parts = fen.split(" ");
    var rows = parts[0].split("/");
    for (i in 0...8) {
      var f = 0; var r = 7 - i;
      var row = rows[i];
      for (k in 0...row.length) {
        var ch = row.charAt(k);
        if (ch >= "1" && ch <= "8") f += Std.parseInt(ch);
        else {
          var lower = ch.toLowerCase();
          var c = (ch == lower) ? -1 : 1;
          var t = "pnbrqk".indexOf(lower) + 1;
          var sq = r * 8 + f;
          pos.board[sq] = t * c;
          if (t == 6) pos.king[c == 1 ? 0 : 1] = sq;
          f++;
        }
      }
    }
    pos.turn = parts[1] == "b" ? -1 : 1;
    var cs = parts.length > 2 ? parts[2] : "-";
    if (cs.indexOf("K") >= 0) pos.castling |= 1;
    if (cs.indexOf("Q") >= 0) pos.castling |= 2;
    if (cs.indexOf("k") >= 0) pos.castling |= 4;
    if (cs.indexOf("q") >= 0) pos.castling |= 8;
    pos.ep = (parts.length > 3 && parts[3] != "-") ? nameSq(parts[3]) : -1;
    pos.half = parts.length > 4 ? Std.parseInt(parts[4]) : 0;
    pos.full = parts.length > 5 ? Std.parseInt(parts[5]) : 1;
    computeHash(pos);
    return pos;
  }
  public static function computeHash(pos:Pos) {
    var a = 0; var b = 0;
    for (sq in 0...64) { var p = pos.board[sq]; if (p != 0) { a ^= ZK1[(p + 6) * 64 + sq]; b ^= ZK2[(p + 6) * 64 + sq]; } }
    a ^= ZC1[pos.castling]; b ^= ZC2[pos.castling];
    if (pos.ep >= 0) { a ^= ZE1[pos.ep & 7]; b ^= ZE2[pos.ep & 7]; }
    if (pos.turn == -1) { a ^= ZS1; b ^= ZS2; }
    pos.h1 = a; pos.h2 = b;
  }
  /* chave de posição usada no explorador de aberturas (FEN sem contadores; en passant só se capturável) */
  public static function explorerKey(pos:Pos):String {
    var f = toFEN(pos).split(" ");
    var ep = "-";
    if (pos.ep >= 0) {
      var file = pos.ep & 7; var r = pos.ep >> 3; var pr = r - pos.turn; var mine = PAWN * pos.turn;
      if ((file > 0 && pos.board[pr * 8 + file - 1] == mine) || (file < 7 && pos.board[pr * 8 + file + 1] == mine)) ep = f[3];
    }
    return f[0] + " " + f[1] + " " + f[2] + " " + ep;
  }
  public static function toFEN(pos:Pos):String {
    var s = "";
    var r = 7;
    while (r >= 0) {
      var e = 0;
      for (f in 0...8) {
        var p = pos.board[r * 8 + f];
        if (p == 0) { e++; continue; }
        if (e > 0) { s += e; e = 0; }
        var ch = "pnbrqk".charAt(pType(p) - 1);
        s += p > 0 ? ch.toUpperCase() : ch;
      }
      if (e > 0) s += e;
      if (r > 0) s += "/";
      r--;
    }
    var c = ((pos.castling & 1) != 0 ? "K" : "") + ((pos.castling & 2) != 0 ? "Q" : "") + ((pos.castling & 4) != 0 ? "k" : "") + ((pos.castling & 8) != 0 ? "q" : "");
    return s + " " + (pos.turn == 1 ? "w" : "b") + " " + (c == "" ? "-" : c) + " " + (pos.ep >= 0 ? sqName(pos.ep) : "-") + " " + pos.half + " " + pos.full;
  }
  public static function posKey(pos:Pos):String {
    var s = new StringBuf();
    for (i in 0...64) s.addChar(pos.board[i] + 70);
    var ep = "-";
    if (pos.ep >= 0) {
      var f = pos.ep & 7; var r = pos.ep >> 3; var pr = r - pos.turn; var mine = PAWN * pos.turn;
      if ((f > 0 && pos.board[pr * 8 + f - 1] == mine) || (f < 7 && pos.board[pr * 8 + f + 1] == mine)) ep = Std.string(pos.ep);
    }
    return s.toString() + pos.turn + "," + pos.castling + "," + ep;
  }

  /* ---------- ataques ---------- */
  public static function isAttacked(b:Vector<Int>, sq:Int, by:Int):Bool {
    var f = sq & 7; var r = sq >> 3;
    var pr = r - by;
    if (pr >= 0 && pr < 8) {
      if (f > 0 && b[pr * 8 + f - 1] == PAWN * by) return true;
      if (f < 7 && b[pr * 8 + f + 1] == PAWN * by) return true;
    }
    var kn = KNIGHT_T[sq];
    for (i in 0...kn.length) if (b[kn[i]] == KNIGHT * by) return true;
    var kg = KING_T[sq];
    for (i in 0...kg.length) if (b[kg[i]] == KING * by) return true;
    var rays = RAYS[sq];
    for (d in 0...4) {
      var ray = rays[d];
      for (i in 0...ray.length) { var p = b[ray[i]]; if (p != 0) { if (p == ROOK * by || p == QUEEN * by) return true; break; } }
    }
    for (d in 4...8) {
      var ray = rays[d];
      for (i in 0...ray.length) { var p = b[ray[i]]; if (p != 0) { if (p == BISHOP * by || p == QUEEN * by) return true; break; } }
    }
    return false;
  }
  public static function inCheck(pos:Pos):Bool return isAttacked(pos.board, pos.king[sideIdx(pos.turn)], -pos.turn);

  public static function leastAttackerSq(b:Vector<Int>, sq:Int, color:Int):Int {
    var f = sq & 7; var r = sq >> 3; var pr = r - color;
    if (pr >= 0 && pr < 8) {
      if (f > 0 && b[pr * 8 + f - 1] == PAWN * color) return pr * 8 + f - 1;
      if (f < 7 && b[pr * 8 + f + 1] == PAWN * color) return pr * 8 + f + 1;
    }
    for (t in KNIGHT_T[sq]) if (b[t] == KNIGHT * color) return t;
    var bish = -1; var rook = -1; var queen = -1;
    for (d in 4...8) for (s2 in RAYS[sq][d]) {
      var p = b[s2]; if (p == 0) continue;
      if (p == BISHOP * color) bish = s2; else if (p == QUEEN * color) queen = s2;
      break;
    }
    if (bish >= 0) return bish;
    for (d in 0...4) for (s2 in RAYS[sq][d]) {
      var p = b[s2]; if (p == 0) continue;
      if (p == ROOK * color) rook = s2; else if (p == QUEEN * color) queen = s2;
      break;
    }
    if (rook >= 0) return rook;
    if (queen >= 0) return queen;
    for (t in KING_T[sq]) if (b[t] == KING * color) return t;
    return -1;
  }
  public static function attackerList(b:Vector<Int>, sq:Int, color:Int):Array<Int> {
    var out:Array<Int> = [];
    var f = sq & 7; var r = sq >> 3; var pr = r - color;
    if (pr >= 0 && pr < 8) {
      if (f > 0 && b[pr * 8 + f - 1] == PAWN * color) out.push(pr * 8 + f - 1);
      if (f < 7 && b[pr * 8 + f + 1] == PAWN * color) out.push(pr * 8 + f + 1);
    }
    for (t in KNIGHT_T[sq]) if (b[t] == KNIGHT * color) out.push(t);
    for (t in KING_T[sq]) if (b[t] == KING * color) out.push(t);
    for (d in 0...8) for (s2 in RAYS[sq][d]) {
      var p = b[s2]; if (p == 0) continue;
      if (p == QUEEN * color || (d < 4 && p == ROOK * color) || (d >= 4 && p == BISHOP * color)) out.push(s2);
      break;
    }
    return out;
  }
  public static function see(pos:Pos, sq:Int, side:Int):Int {
    var b = new Vector<Int>(64);
    for (i in 0...64) b[i] = pos.board[i];
    var target = b[sq];
    if (target == 0 || pColor(target) == side) return 0;
    var gain:Array<Int> = [VAL[pType(target)]];
    var col = side;
    var from = leastAttackerSq(b, sq, col);
    if (from < 0) return 0;
    var aPiece = b[from]; var d = 0;
    do {
      d++;
      gain[d] = VAL[pType(aPiece)] - gain[d - 1];
      if (Math.max(-gain[d - 1], gain[d]) < 0) break;
      b[from] = 0; b[sq] = aPiece;
      col = -col;
      from = leastAttackerSq(b, sq, col);
      if (from >= 0) aPiece = b[from];
    } while (from >= 0);
    d--;
    while (d > 0) { gain[d - 1] = Std.int(-Math.max(-gain[d - 1], gain[d])); d--; }
    return gain[0];
  }

  static var _sg:Vector<Int> = new Vector<Int>(40);
  static var _ssq:Vector<Int> = new Vector<Int>(40);
  static var _spc:Vector<Int> = new Vector<Int>(40);
  /* saldo material da sequência de trocas iniciada pelo lance m (sem alocar) */
  public static function seeMove(pos:Pos, m:Int):Int {
    var b = pos.board; var from = m & 63; var to = (m >> 6) & 63;
    var aPiece = b[from]; var col = aPiece > 0 ? 1 : -1; var orig = b[to];
    _sg[0] = (m >> 15) == FLAG_EP ? 100 : (orig != 0 ? VAL[pType(orig)] : 0);
    var n = 0; var d = 0; var fsq = from;
    while (fsq >= 0 && d < 30) {
      d++;
      _sg[d] = VAL[pType(aPiece)] - _sg[d - 1];
      if (-_sg[d - 1] < 0 && _sg[d] < 0) break;
      _ssq[n] = fsq; _spc[n] = aPiece; n++;
      b[fsq] = 0; b[to] = aPiece;
      col = -col;
      fsq = leastAttackerSq(b, to, col);
      if (fsq >= 0) aPiece = b[fsq];
    }
    d--;
    while (d > 0) { var x = -_sg[d - 1]; var y = _sg[d]; _sg[d - 1] = -(x > y ? x : y); d--; }
    while (n > 0) { n--; b[_ssq[n]] = _spc[n]; }
    b[to] = orig;
    return _sg[0];
  }

  /* ---------- geração ---------- */
  static inline function mv(from:Int, to:Int, promo:Int, flag:Int):Int return from | (to << 6) | (promo << 12) | (flag << 15);

  public static function genPseudo(pos:Pos, capsOnly:Bool):Array<Int> {
    var moves:Array<Int> = [];
    genInto(pos, capsOnly, moves);
    return moves;
  }
  /* gera no vetor dado (reaproveitado pela busca) e devolve a quantidade */
  public static function genInto(pos:Pos, capsOnly:Bool, moves:Array<Int>):Int {
    var b = pos.board; var us = pos.turn; var n = 0;
    var dir = us * 8; var startRank = us == 1 ? 1 : 6; var promoRank = us == 1 ? 7 : 0;
    for (sq in 0...64) {
      var p = b[sq];
      if (p == 0 || (p > 0) != (us > 0)) continue;
      var t = p > 0 ? p : -p;
      if (t == PAWN) {
        var f = sq & 7; var r = sq >> 3; var to = sq + dir;
        if (b[to] == 0) {
          if ((to >> 3) == promoRank) { moves[n++] = mv(sq, to, QUEEN, 0); moves[n++] = mv(sq, to, ROOK, 0); moves[n++] = mv(sq, to, BISHOP, 0); moves[n++] = mv(sq, to, KNIGHT, 0); }
          else if (!capsOnly) {
            moves[n++] = mv(sq, to, 0, 0);
            if (r == startRank && b[to + dir] == 0) moves[n++] = mv(sq, to + dir, 0, FLAG_DP);
          }
        }
        var df = -1;
        while (df <= 1) {
          var nf = f + df;
          if (nf >= 0 && nf <= 7) {
            var tt = to + df; var cp = b[tt];
            if (cp != 0 && (cp > 0) != (us > 0)) {
              if ((tt >> 3) == promoRank) { moves[n++] = mv(sq, tt, QUEEN, 0); moves[n++] = mv(sq, tt, ROOK, 0); moves[n++] = mv(sq, tt, BISHOP, 0); moves[n++] = mv(sq, tt, KNIGHT, 0); }
              else moves[n++] = mv(sq, tt, 0, 0);
            } else if (cp == 0 && tt == pos.ep) moves[n++] = mv(sq, tt, 0, FLAG_EP);
          }
          df += 2;
        }
      } else if (t == KNIGHT || t == KING) {
        var tab = t == KNIGHT ? KNIGHT_T[sq] : KING_T[sq];
        for (i in 0...tab.length) {
          var to = tab[i]; var cp = b[to];
          if (cp == 0) { if (!capsOnly) moves[n++] = mv(sq, to, 0, 0); }
          else if ((cp > 0) != (us > 0)) moves[n++] = mv(sq, to, 0, 0);
        }
        if (t == KING && !capsOnly) {
          if (us == 1 && sq == 4) {
            if ((pos.castling & 1) != 0 && b[5] == 0 && b[6] == 0 && b[7] == ROOK && !isAttacked(b, 4, -1) && !isAttacked(b, 5, -1) && !isAttacked(b, 6, -1)) moves[n++] = mv(4, 6, 0, FLAG_CASTLE);
            if ((pos.castling & 2) != 0 && b[3] == 0 && b[2] == 0 && b[1] == 0 && b[0] == ROOK && !isAttacked(b, 4, -1) && !isAttacked(b, 3, -1) && !isAttacked(b, 2, -1)) moves[n++] = mv(4, 2, 0, FLAG_CASTLE);
          } else if (us == -1 && sq == 60) {
            if ((pos.castling & 4) != 0 && b[61] == 0 && b[62] == 0 && b[63] == -ROOK && !isAttacked(b, 60, 1) && !isAttacked(b, 61, 1) && !isAttacked(b, 62, 1)) moves[n++] = mv(60, 62, 0, FLAG_CASTLE);
            if ((pos.castling & 8) != 0 && b[59] == 0 && b[58] == 0 && b[57] == 0 && b[56] == -ROOK && !isAttacked(b, 60, 1) && !isAttacked(b, 59, 1) && !isAttacked(b, 58, 1)) moves[n++] = mv(60, 58, 0, FLAG_CASTLE);
          }
        }
      } else {
        var d0 = t == BISHOP ? 4 : 0; var d1 = t == ROOK ? 4 : 8;
        for (d in d0...d1) {
          var ray = RAYS[sq][d];
          for (i in 0...ray.length) {
            var to = ray[i]; var cp = b[to];
            if (cp == 0) { if (!capsOnly) moves[n++] = mv(sq, to, 0, 0); }
            else { if ((cp > 0) != (us > 0)) moves[n++] = mv(sq, to, 0, 0); break; }
          }
        }
      }
    }
    return n;
  }

  static inline function zx(pos:Pos, p:Int, sq:Int) { pos.h1 ^= ZK1[(p + 6) * 64 + sq]; pos.h2 ^= ZK2[(p + 6) * 64 + sq]; }
  public static function makeMove(pos:Pos, m:Int) {
    var b = pos.board; var from = m & 63; var to = (m >> 6) & 63; var promo = (m >> 12) & 7; var flag = m >> 15; var us = pos.turn;
    var piece = b[from]; var cap = b[to];
    pos.stack.push(new Undo(m, 0, pos.castling, pos.ep, pos.half, piece, pos.h1, pos.h2));
    if (flag == FLAG_EP) { var cs = to - us * 8; cap = b[cs]; b[cs] = 0; zx(pos, cap, cs); }
    else if (cap != 0) zx(pos, cap, to);
    pos.stack[pos.stack.length - 1].cap = cap;
    zx(pos, piece, from);
    b[from] = 0;
    var np = promo != 0 ? us * promo : piece;
    b[to] = np; zx(pos, np, to);
    if (flag == FLAG_CASTLE) {
      var rf = 0; var rt = 0;
      if (to == 6) { rf = 7; rt = 5; } else if (to == 2) { rf = 0; rt = 3; } else if (to == 62) { rf = 63; rt = 61; } else { rf = 56; rt = 59; }
      var rk = b[rf]; b[rt] = rk; b[rf] = 0; zx(pos, rk, rf); zx(pos, rk, rt);
    }
    if (piece == KING * us) pos.king[sideIdx(us)] = to;
    pos.h1 ^= ZC1[pos.castling]; pos.h2 ^= ZC2[pos.castling];
    pos.castling = pos.castling & CM[from] & CM[to];
    pos.h1 ^= ZC1[pos.castling]; pos.h2 ^= ZC2[pos.castling];
    if (pos.ep >= 0) { pos.h1 ^= ZE1[pos.ep & 7]; pos.h2 ^= ZE2[pos.ep & 7]; }
    pos.ep = flag == FLAG_DP ? ((from + to) >> 1) : -1;
    if (pos.ep >= 0) { pos.h1 ^= ZE1[pos.ep & 7]; pos.h2 ^= ZE2[pos.ep & 7]; }
    pos.half = (piece * us == PAWN || cap != 0) ? 0 : pos.half + 1;
    if (us == -1) pos.full++;
    pos.turn = -us;
    pos.h1 ^= ZS1; pos.h2 ^= ZS2;
  }
  public static function makeNull(pos:Pos) {
    pos.stack.push(new Undo(0, 0, pos.castling, pos.ep, pos.half, 0, pos.h1, pos.h2));
    if (pos.ep >= 0) { pos.h1 ^= ZE1[pos.ep & 7]; pos.h2 ^= ZE2[pos.ep & 7]; }
    pos.ep = -1;
    pos.turn = -pos.turn;
    pos.h1 ^= ZS1; pos.h2 ^= ZS2;
  }
  public static function unmakeNull(pos:Pos) {
    var u = pos.stack.pop();
    pos.turn = -pos.turn; pos.ep = u.ep; pos.h1 = u.h1; pos.h2 = u.h2;
  }
  public static function unmakeMove(pos:Pos) {
    var u = pos.stack.pop(); var m = u.m; var b = pos.board;
    var from = m & 63; var to = (m >> 6) & 63; var flag = m >> 15; var us = -pos.turn;
    pos.turn = us;
    if (us == -1) pos.full--;
    b[from] = u.piece;
    if (flag == FLAG_EP) { b[to] = 0; b[to - us * 8] = u.cap; } else b[to] = u.cap;
    if (flag == FLAG_CASTLE) {
      if (to == 6) { b[7] = b[5]; b[5] = 0; }
      else if (to == 2) { b[0] = b[3]; b[3] = 0; }
      else if (to == 62) { b[63] = b[61]; b[61] = 0; }
      else { b[56] = b[59]; b[59] = 0; }
    }
    if (u.piece == KING * us) pos.king[sideIdx(us)] = from;
    pos.castling = u.castling; pos.ep = u.ep; pos.half = u.half;
    pos.h1 = u.h1; pos.h2 = u.h2;
  }
  public static function legalMoves(pos:Pos):Array<Int> {
    var us = pos.turn; var ki = sideIdx(us); var out:Array<Int> = [];
    for (m in genPseudo(pos, false)) {
      makeMove(pos, m);
      if (!isAttacked(pos.board, pos.king[ki], -us)) out.push(m);
      unmakeMove(pos);
    }
    return out;
  }
  public static function perft(pos:Pos, depth:Int):Float {
    if (depth == 0) return 1;
    var ms = legalMoves(pos);
    if (depth == 1) return ms.length;
    var n:Float = 0;
    for (m in ms) { makeMove(pos, m); n += perft(pos, depth - 1); unmakeMove(pos); }
    return n;
  }

  /* ---------- notação ---------- */
  static var SAN_LETTER = ["", "", "C", "B", "T", "D", "R"];
  static var SAN_EN = ["", "", "N", "B", "R", "Q", "K"];
  public static var sanEnglish = false;
  public static function moveToSANEn(pos:Pos, m:Int):String {
    sanEnglish = true;
    var s = moveToSAN(pos, m);
    sanEnglish = false;
    return s;
  }
  public static function moveToUCI(m:Int):String {
    var promo = (m >> 12) & 7;
    return sqName(m & 63) + sqName((m >> 6) & 63) + (promo != 0 ? "nbrq".charAt(promo - 2) : "");
  }
  public static function uciToMove(pos:Pos, s:String):Int {
    for (m in legalMoves(pos)) if (moveToUCI(m) == s) return m;
    return -1;
  }
  public static function moveToSAN(pos:Pos, m:Int, ?legalIn:Array<Int>):String {
    var legal = legalIn != null ? legalIn : legalMoves(pos);
    var b = pos.board; var from = m & 63; var to = (m >> 6) & 63; var promo = (m >> 12) & 7; var flag = m >> 15;
    var t = pType(b[from]);
    var capture = b[to] != 0 || flag == FLAG_EP;
    var s = "";
    if (flag == FLAG_CASTLE) s = to > from ? "O-O" : "O-O-O";
    else if (t == PAWN) {
      s = capture ? "abcdefgh".charAt(from & 7) + "x" : "";
      s += sqName(to);
      if (promo != 0) s += "=" + (sanEnglish ? SAN_EN[promo] : SAN_LETTER[promo]);
    } else {
      s = sanEnglish ? SAN_EN[t] : SAN_LETTER[t];
      var sameFile = false; var sameRank = false; var any = false;
      for (o in legal) {
        if (o != m && ((o >> 6) & 63) == to && b[o & 63] == b[from]) {
          any = true;
          if (((o & 63) & 7) == (from & 7)) sameFile = true;
          if (((o & 63) >> 3) == (from >> 3)) sameRank = true;
        }
      }
      if (any) {
        if (!sameFile) s += "abcdefgh".charAt(from & 7);
        else if (!sameRank) s += Std.string((from >> 3) + 1);
        else s += sqName(from);
      }
      if (capture) s += "x";
      s += sqName(to);
    }
    makeMove(pos, m);
    if (inCheck(pos)) s += legalMoves(pos).length > 0 ? "+" : "#";
    unmakeMove(pos);
    return s;
  }

  /* ---------- fim de jogo ---------- */
  public static function insufficient(pos:Pos):Bool {
    var b = pos.board; var n = 0; var allBishopSame = true; var firstColor = -1;
    for (i in 0...64) {
      var t = pType(b[i]);
      if (t == 0 || t == KING) continue;
      if (t == PAWN || t == ROOK || t == QUEEN) return false;
      n++;
      if (t != BISHOP) allBishopSame = false;
      var c = ((i & 7) + (i >> 3)) & 1;
      if (firstColor < 0) firstColor = c; else if (c != firstColor) allBishopSame = false;
    }
    if (n <= 1) return true;
    return allBishopSame;
  }
  public static function gameStatus(pos:Pos, keys:Array<String>):Status {
    var st = new Status();
    var legal = legalMoves(pos); var chk = inCheck(pos);
    if (legal.length == 0) { st.over = true; if (chk) { st.result = "mate"; st.winner = -pos.turn; } else st.result = "stalemate"; return st; }
    if (insufficient(pos)) { st.over = true; st.result = "material"; return st; }
    if (pos.half >= 100) { st.over = true; st.result = "50"; return st; }
    if (keys != null) {
      var k = posKey(pos); var n = 0;
      for (x in keys) if (x == k) n++;
      if (n >= 3) { st.over = true; st.result = "rep"; return st; }
    }
    st.check = chk;
    return st;
  }

  /* ---------- avaliação ---------- */
  static var PASSED = [0, 10, 20, 35, 60, 100, 160, 0];
  static var _pc:Vector<Int> = new Vector<Int>(16);
  static var _ps0:Vector<Int> = new Vector<Int>(8);
  static var _ps1:Vector<Int> = new Vector<Int>(8);
  static var _rk0:Vector<Int> = new Vector<Int>(16);
  static var _rk1:Vector<Int> = new Vector<Int>(16);

  public static function isEndgame(pos:Pos):Bool {
    var n = 0; var b = pos.board;
    for (i in 0...64) { var t = pType(b[i]); if (t > 1 && t < 6) n += VAL[t]; }
    return n <= 2600;
  }
  static var KZ:Vector<Int> = null;
  static var MOBM = [0, 0, 4, 5, 2, 1, 0]; static var MOBE = [0, 0, 4, 5, 4, 2, 0]; static var MOB0 = [0, 0, 4, 6, 7, 13, 0];
  static var KAW = [0, 0, 2, 2, 3, 4, 0]; static var PHW = [0, 0, 1, 1, 2, 4, 0];
  static function initKZ() {
    KZ = new Vector<Int>(64 * 64);
    for (i in 0...(64 * 64)) KZ[i] = 0;
    for (k in 0...64) { KZ[k * 64 + k] = 1; for (t in KING_T[k]) KZ[k * 64 + t] = 1; }
  }
  /* avaliação gradual: mistura a nota de meio-jogo com a de final conforme o material que resta;
     soma material, casas, estrutura de peões, par de bispos, torres em colunas abertas,
     mobilidade das peças e pressão sobre o rei */
  static inline var EC_SIZE = 65536;
  static var ecKey:Vector<Int> = null; static var ecVal:Vector<Int> = null;
  /* a mesma posição aparece muitas vezes na busca: a nota fica guardada numa tabela pequena */
  public static function evaluate(pos:Pos):Int {
    if (ecKey == null) { ecKey = new Vector<Int>(EC_SIZE); ecVal = new Vector<Int>(EC_SIZE); for (i in 0...EC_SIZE) { ecKey[i] = 0; ecVal[i] = 0; } }
    var i = pos.h1 & (EC_SIZE - 1);
    if (ecKey[i] == pos.h2 && pos.h2 != 0) return ecVal[i];
    var v = evalFull(pos);
    ecKey[i] = pos.h2; ecVal[i] = v;
    return v;
  }
  public static function evalFull(pos:Pos):Int {
    var b = pos.board;
    if (KZ == null) initKZ();
    for (i in 0...16) _pc[i] = 0;
    var np0 = 0; var np1 = 0; var nr0 = 0; var nr1 = 0; var mg = 0; var eg = 0; var npmW = 0; var npmB = 0; var wb = 0; var bb = 0; var ph = 0;
    var wk = pos.king[0]; var bk = pos.king[1]; var zw = wk * 64; var zb = bk * 64;
    var atkW = 0; var cntW = 0; var atkB = 0; var cntB = 0;
    for (sq in 0...64) {
      var p = b[sq]; if (p == 0) continue;
      if (p > 0) {
        if (p == KING) continue;
        var v = VAL[p] + PSTW[p][sq]; mg += v; eg += v;
        if (p == PAWN) { _pc[sq & 7]++; _ps0[np0++] = sq; continue; }
        npmW += VAL[p]; ph += PHW[p];
        var mob = 0; var ka = 0;
        if (p == KNIGHT) {
          var tab = KNIGHT_T[sq];
          for (i in 0...tab.length) { var t = tab[i]; if (b[t] <= 0) { mob++; if (KZ[zb + t] != 0) ka++; } }
        } else {
          if (p == BISHOP) wb++; else if (p == ROOK) _rk0[nr0++] = sq;
          var d0 = p == BISHOP ? 4 : 0; var d1 = p == ROOK ? 4 : 8; var rays = RAYS[sq];
          for (d in d0...d1) {
            var ray = rays[d];
            for (i in 0...ray.length) { var t = ray[i]; var q = b[t]; if (q <= 0) { mob++; if (KZ[zb + t] != 0) ka++; } if (q != 0) break; }
          }
        }
        mob -= MOB0[p]; mg += MOBM[p] * mob; eg += MOBE[p] * mob;
        if (ka > 0) { cntW++; atkW += KAW[p] * ka; }
      } else {
        var t0 = -p; if (t0 == KING) continue;
        var v = VAL[t0] + PSTB[t0][sq]; mg -= v; eg -= v;
        if (t0 == PAWN) { _pc[8 + (sq & 7)]++; _ps1[np1++] = sq; continue; }
        npmB += VAL[t0]; ph += PHW[t0];
        var mob = 0; var ka = 0;
        if (t0 == KNIGHT) {
          var tab = KNIGHT_T[sq];
          for (i in 0...tab.length) { var t = tab[i]; if (b[t] >= 0) { mob++; if (KZ[zw + t] != 0) ka++; } }
        } else {
          if (t0 == BISHOP) bb++; else if (t0 == ROOK) _rk1[nr1++] = sq;
          var d0 = t0 == BISHOP ? 4 : 0; var d1 = t0 == ROOK ? 4 : 8; var rays = RAYS[sq];
          for (d in d0...d1) {
            var ray = rays[d];
            for (i in 0...ray.length) { var t = ray[i]; var q = b[t]; if (q >= 0) { mob++; if (KZ[zw + t] != 0) ka++; } if (q != 0) break; }
          }
        }
        mob -= MOB0[t0]; mg -= MOBM[t0] * mob; eg -= MOBE[t0] * mob;
        if (ka > 0) { cntB++; atkB += KAW[t0] * ka; }
      }
    }
    if (np0 == 0 && np1 == 0 && npmW <= 330 && npmB <= 330) return 0;
    if (wb >= 2) { mg += 30; eg += 45; }
    if (bb >= 2) { mg -= 30; eg -= 45; }
    for (i in 0...np0) {
      var sq = _ps0[i]; var f = sq & 7; var r = sq >> 3;
      if (_pc[f] > 1) { mg -= 8; eg -= 15; }
      if ((f > 0 ? _pc[f - 1] : 0) == 0 && (f < 7 ? _pc[f + 1] : 0) == 0) { mg -= 12; eg -= 15; }
      var passed = true;
      for (j in 0...np1) { var bs = _ps1[j]; var bf = bs & 7; if (bf >= f - 1 && bf <= f + 1 && (bs >> 3) > r) { passed = false; break; } }
      if (passed) { var pb = PASSED[r]; mg += pb >> 1; eg += pb + (pb >> 2); }
    }
    for (i in 0...np1) {
      var sq = _ps1[i]; var f = sq & 7; var r = sq >> 3;
      if (_pc[8 + f] > 1) { mg += 8; eg += 15; }
      if ((f > 0 ? _pc[8 + f - 1] : 0) == 0 && (f < 7 ? _pc[8 + f + 1] : 0) == 0) { mg += 12; eg += 15; }
      var passed = true;
      for (j in 0...np0) { var ws = _ps0[j]; var wf = ws & 7; if (wf >= f - 1 && wf <= f + 1 && (ws >> 3) < r) { passed = false; break; } }
      if (passed) { var pb = PASSED[7 - r]; mg -= pb >> 1; eg -= pb + (pb >> 2); }
    }
    for (i in 0...nr0) { var f = _rk0[i] & 7; if (_pc[f] == 0) { var o = _pc[8 + f] == 0 ? 20 : 10; mg += o; eg += o >> 1; } }
    for (i in 0...nr1) { var f = _rk1[i] & 7; if (_pc[8 + f] == 0) { var o = _pc[f] == 0 ? 20 : 10; mg -= o; eg -= o >> 1; } }
    /* rei: no meio-jogo vale o abrigo de peões e a pressão das peças inimigas; no final, a centralização */
    mg += PSTW[KING][wk] - PSTB[KING][bk];
    eg += KEG_W[wk] - KEG_B[bk];
    if ((wk >> 3) == 0) { var f = wk & 7; for (df in -1...2) { var nf = f + df; if (nf < 0 || nf > 7) continue; if (b[8 + nf] == PAWN) mg += 10; else if (b[16 + nf] == PAWN) mg += 5; } }
    if ((bk >> 3) == 7) { var f = bk & 7; for (df in -1...2) { var nf = f + df; if (nf < 0 || nf > 7) continue; if (b[48 + nf] == -PAWN) mg -= 10; else if (b[40 + nf] == -PAWN) mg -= 5; } }
    if (cntW >= 2) { var pen = (atkW * atkW) >> 1; mg += pen > 350 ? 350 : pen; }
    if (cntB >= 2) { var pen = (atkB * atkB) >> 1; mg -= pen > 350 ? 350 : pen; }
    if (ph > 24) ph = 24;
    var s = Std.int((mg * ph + eg * (24 - ph)) / 24);
    /* final ganho: empurra o rei fraco para o canto e aproxima o rei forte */
    if ((npmW + npmB) <= 2600 && (s > 250 || s < -250)) {
      var win = s > 0 ? 0 : 1; var wK = pos.king[win]; var lK = pos.king[1 - win];
      var lf = lK & 7; var lr = lK >> 3;
      var cd = Std.int(Math.max(3 - lf, lf - 4) + Math.max(3 - lr, lr - 4));
      var md = Std.int(Math.abs((wK & 7) - lf) + Math.abs((wK >> 3) - lr));
      var bonus = cd * 10 + (14 - md) * 4;
      s += win == 0 ? bonus : -bonus;
    }
    return (pos.turn == 1 ? s : -s) + 8;
  }

  /* ---------- busca ---------- */
  static inline var TT_EXACT = 0; static inline var TT_LOWER = 1; static inline var TT_UPPER = 2;
  static inline var BADCAP = -900000;
  static var LMR:Vector<Int>;
  static var mvBuf:Array<Array<Int>> = [for (i in 0...(MAXPLY + 8)) []];
  static var scBuf:Array<Array<Int>> = [for (i in 0...(MAXPLY + 8)) []];
  static var qtBuf:Array<Array<Int>> = [for (i in 0...(MAXPLY + 8)) []];
  static function scoreMoves(pos:Pos, moves:Array<Int>, n:Int, sc:Array<Int>, ply:Int, ctx:Ctx, ttm:Int) {
    var b = pos.board; var k = ctx.killers[ply]; var hb = pos.turn == 1 ? 0 : 4096;
    for (i in 0...n) {
      var m = moves[i]; var to = (m >> 6) & 63; var from = m & 63; var cap = b[to]; var promo = (m >> 12) & 7;
      var s = 0;
      if (m == ttm) s = 3000000;
      else if (cap != 0 || (m >> 15) == FLAG_EP) {
        var vv = cap != 0 ? VAL[pType(cap)] : 100; var av = VAL[pType(b[from])];
        s = vv * 10 - pType(b[from]);
        /* troca que perde material vai para o fim da fila */
        if (vv < av && promo == 0 && seeMove(pos, m) < 0) s += BADCAP; else s += 1000000;
        if (promo != 0) s += promo == QUEEN ? 900000 : -1500000;
      }
      else if (promo != 0) s = promo == QUEEN ? 1900000 : -500000 + promo;
      else if (k[0] == m) s = 900000;
      else if (k[1] == m) s = 899000;
      else s = history[hb + from * 64 + to];
      sc[i] = s;
    }
  }
  static inline function pickBest(moves:Array<Int>, sc:Array<Int>, from:Int, n:Int):Int {
    var bi = from; var bs = sc[from];
    for (j in (from + 1)...n) if (sc[j] > bs) { bs = sc[j]; bi = j; }
    if (bi != from) { var tm = moves[from]; moves[from] = moves[bi]; moves[bi] = tm; var ts = sc[from]; sc[from] = sc[bi]; sc[bi] = ts; }
    return moves[from];
  }
  static function updatePV(ctx:Ctx, ply:Int, m:Int) {
    ctx.pv[ply][ply] = m;
    var j = ply + 1;
    var end = ctx.pvLen[ply + 1];
    while (j < end) { ctx.pv[ply][j] = ctx.pv[ply + 1][j]; j++; }
    ctx.pvLen[ply] = Std.int(Math.max(ply + 1, end));
  }
  static inline function tick(ctx:Ctx) {
    if ((++ctx.nodes & 1023) == 0 && (now() > ctx.deadline || ctx.nodes > ctx.maxNodes)) ctx.stop = true;
  }
  /* as posições já vistas na partida viram hashes, para a busca enxergar repetição em qualquer profundidade */
  static function buildHist(ctx:Ctx) {
    var h = new Map<Int, Int>();
    ctx.hist = h;
    if (ctx.repKeys == null) return;
    var p = new Pos();
    for (key in ctx.repKeys.keys()) {
      if (key.length < 68) continue;
      for (i in 0...64) p.board[i] = key.charCodeAt(i) - 70;
      var t = key.substr(64).split(",");
      if (t.length < 3) continue;
      p.turn = Std.parseInt(t[0]) == -1 ? -1 : 1;
      var c = Std.parseInt(t[1]); p.castling = c == null ? 0 : c;
      var e = t[2] == "-" ? null : Std.parseInt(t[2]); p.ep = e == null ? -1 : e;
      computeHash(p);
      h.set(p.h1, p.h2);
    }
  }
  static function isDrawRep(pos:Pos, ply:Int, ctx:Ctx):Bool {
    var st = pos.stack; var h1 = pos.h1; var h2 = pos.h2; var lim = pos.half;
    var i = st.length - 1; var c = 1; var clean = true;
    while (i >= 0 && c <= lim) {
      var u = st[i];
      if (u.m == 0) { clean = false; break; }
      if ((c & 1) == 0 && u.h1 == h1 && u.h2 == h2) return true;
      i--; c++;
    }
    if (clean && lim >= ply && ctx.repKeys != null) {
      if (ctx.hist == null) buildHist(ctx);
      var v = ctx.hist.get(h1);
      if (v != null && v == h2) return true;
    }
    return false;
  }
  public static function quiesce(pos:Pos, alpha:Int, beta:Int, ply:Int, ctx:Ctx):Int {
    ctx.pvLen[ply] = ply;
    tick(ctx);
    if (ctx.stop) return 0;
    var stand = evaluate(pos);
    if (ply >= MAXPLY) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    var us = pos.turn; var ki = sideIdx(us); var b = pos.board;
    var moves = mvBuf[ply]; var sc = scBuf[ply];
    var n = genInto(pos, true, moves);
    scoreMoves(pos, moves, n, sc, ply, ctx, 0);
    var best = stand;
    for (i in 0...n) {
      var m = pickBest(moves, sc, i, n);
      if (sc[i] < -400000) break; /* só sobraram trocas que perdem material */
      var cap = b[(m >> 6) & 63];
      if (((m >> 12) & 7) == 0 && stand + (cap != 0 ? VAL[pType(cap)] : 100) + 200 < alpha) continue;
      makeMove(pos, m);
      if (isAttacked(pos.board, pos.king[ki], -us)) { unmakeMove(pos); continue; }
      var s2 = -quiesce(pos, -beta, -alpha, ply + 1, ctx);
      unmakeMove(pos);
      if (ctx.stop) return 0;
      if (s2 > best) {
        best = s2;
        if (s2 > alpha) { alpha = s2; updatePV(ctx, ply, m); }
        if (s2 >= beta) break;
      }
    }
    return best;
  }
  /* xeque direto da peça que se move (sem fazer o lance); xeque descoberto não é contado */
  static function directCheck(b:Vector<Int>, m:Int, ksq:Int):Bool {
    var from = m & 63; var to = (m >> 6) & 63; var p = b[from]; var promo = (m >> 12) & 7;
    var us = p > 0 ? 1 : -1; var t = promo != 0 ? promo : (p > 0 ? p : -p);
    var df = (ksq & 7) - (to & 7); var dr = (ksq >> 3) - (to >> 3);
    if (t == PAWN) return dr == us && (df == 1 || df == -1);
    var af = df < 0 ? -df : df; var ar = dr < 0 ? -dr : dr;
    if (t == KNIGHT) return (af == 1 && ar == 2) || (af == 2 && ar == 1);
    if (t == KING) return false;
    var line = df == 0 || dr == 0; var diag = af == ar;
    if (!(line && t != BISHOP) && !(diag && t != ROOK)) return false;
    var step = (dr > 0 ? 8 : (dr < 0 ? -8 : 0)) + (df > 0 ? 1 : (df < 0 ? -1 : 0));
    var s = to + step;
    while (s != ksq) { if (b[s] != 0 && s != from) return false; s += step; }
    return true;
  }
  static function hasPieces(pos:Pos, us:Int):Bool {
    var b = pos.board;
    for (i in 0...64) { var p = b[i] * us; if (p > PAWN && p < KING) return true; }
    return false;
  }
  public static function negamax(pos:Pos, depth:Int, alpha:Int, beta:Int, ply:Int, ctx:Ctx, ?noNull:Bool = false):Int {
    ctx.pvLen[ply] = ply;
    tick(ctx);
    if (ctx.stop) return 0;
    var us = pos.turn; var ki = sideIdx(us);
    /* empate por repetição ou 50 lances, em qualquer ponto da árvore */
    if (ply > 0 && pos.half >= 2 && (pos.half >= 100 || isDrawRep(pos, ply, ctx))) return 0;
    var chk = isAttacked(pos.board, pos.king[ki], -us);
    if (chk && ply < 40) depth++;
    if (depth <= 0 || ply >= MAXPLY - 2) return quiesce(pos, alpha, beta, ply, ctx);
    var pvNode = beta - alpha > 1;
    // tabela de transposição
    var idx = pos.h1 & (TT_SIZE - 1);
    var ttm = 0;
    if (ttCheck[idx] == pos.h2 && ttDF[idx] >= 0) {
      ttm = ttMove[idx];
      var td = ttDF[idx] >> 2; var tf = ttDF[idx] & 3;
      if (td >= depth && ply > 0) {
        var ts = ttScore[idx];
        if (ts > MATE - 200) ts -= ply; else if (ts < -MATE + 200) ts += ply;
        var cut = (tf == TT_EXACT) || (!pvNode && ((tf == TT_LOWER && ts >= beta) || (tf == TT_UPPER && ts <= alpha)));
        if (cut) {
          if (ttm != 0 && tf != TT_UPPER) { ctx.pv[ply][ply] = ttm; ctx.pvLen[ply] = ply + 1; }
          return ts;
        }
      }
    }
    var ev = 0;
    var sane = beta < MATE - 200 && beta > -MATE + 200 && alpha > -MATE + 200;
    if (!chk) {
      ev = evaluate(pos);
      if (!pvNode && sane && ply > 0) {
        /* posição já boa demais: o adversário não deixaria chegar aqui */
        if (depth <= 6 && ev - 85 * depth >= beta) return ev;
        /* posição ruim demais: só as capturas podem salvar */
        if (depth <= 2 && ev + 260 * depth < alpha) {
          var q = quiesce(pos, alpha, beta, ply, ctx);
          if (ctx.stop) return 0;
          if (q < alpha) return q;
        }
        /* lance nulo */
        if (!noNull && depth >= 3 && ev >= beta && hasPieces(pos, us)) {
          var R = 3 + (depth >> 2) + (ev - beta > 200 ? 1 : 0);
          makeNull(pos);
          var ns = -negamax(pos, depth - R, -beta, -beta + 1, ply + 1, ctx, true);
          unmakeNull(pos);
          if (ctx.stop) return 0;
          if (ns >= beta) return beta;
        }
      }
    }
    /* sem lance sugerido pela tabela, vale menos aprofundar */
    if (ttm == 0 && depth >= 5) depth--;
    var moves = mvBuf[ply]; var sc = scBuf[ply]; var qt = qtBuf[ply]; var nq = 0;
    var n = genInto(pos, false, moves);
    scoreMoves(pos, moves, n, sc, ply, ctx, ttm);
    var legal = 0; var best = -INF; var bestM = 0; var alpha0 = alpha;
    var k = ctx.killers[ply]; var hb = us == 1 ? 0 : 4096;
    var prune = !pvNode && !chk && sane && ply > 0;
    var futile = prune && depth <= 6 && ev + 110 + 95 * depth <= alpha;
    var lmp = 4 + depth * depth;
    var oks = pos.king[1 - ki];
    for (i in 0...n) {
      var m = pickBest(moves, sc, i, n);
      var msc = sc[i];
      var quiet = pos.board[(m >> 6) & 63] == 0 && ((m >> 12) & 7) == 0 && (m >> 15) != FLAG_EP;
      /* lances calmos muito atrás na fila, em profundidade rasa: nem tenta */
      if (prune && quiet && depth <= 5 && legal > lmp && best > -MATE + 200) continue;
      var gives = directCheck(pos.board, m, oks);
      /* sem esperança de alcançar alfa (lance calmo) ou troca que perde material em profundidade rasa */
      if (prune && legal > 0 && !gives && best > -MATE + 200 && (quiet ? futile : (depth <= 3 && msc < -400000))) continue;
      makeMove(pos, m);
      if (isAttacked(pos.board, pos.king[ki], -us)) { unmakeMove(pos); continue; }
      legal++;
      var s2:Int;
      if (legal == 1) s2 = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, ctx);
      else {
        var red = 0;
        if (depth >= 3 && legal >= 3 && quiet && !chk && !gives) {
          red = LMR[(depth > 63 ? 63 : depth) * 64 + (legal > 63 ? 63 : legal)];
          if (pvNode) red--;
          if (m == k[0] || m == k[1]) red--;
          if (msc > 6000) red--; else if (msc < -6000) red++;
          if (red < 0) red = 0; else if (red > depth - 2) red = depth - 2;
        }
        s2 = -negamax(pos, depth - 1 - red, -alpha - 1, -alpha, ply + 1, ctx);
        if (!ctx.stop && s2 > alpha && (red > 0 || s2 < beta)) s2 = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, ctx);
      }
      unmakeMove(pos);
      if (ctx.stop) return 0;
      if (s2 > best) {
        best = s2; bestM = m;
        if (s2 > alpha) { alpha = s2; updatePV(ctx, ply, m); }
        if (s2 >= beta) {
          if (quiet) {
            if (k[0] != m) { k[1] = k[0]; k[0] = m; }
            var bonus = depth * depth; if (bonus > 400) bonus = 400;
            var hi = hb + (m & 63) * 64 + ((m >> 6) & 63);
            history[hi] += bonus - Std.int(history[hi] * bonus / 16384);
            /* os lances calmos tentados antes e que não cortaram perdem crédito */
            for (j in 0...nq) { var q2 = qt[j]; var h2 = hb + (q2 & 63) * 64 + ((q2 >> 6) & 63); history[h2] -= bonus + Std.int(history[h2] * bonus / 16384); }
          }
          break;
        }
      }
      if (quiet && nq < 60) qt[nq++] = m;
    }
    if (legal == 0) return chk ? -MATE + ply : 0;
    // grava na tabela
    var flag = best >= beta ? TT_LOWER : (best > alpha0 ? TT_EXACT : TT_UPPER);
    var st = best;
    if (st > MATE - 200) st += ply; else if (st < -MATE + 200) st -= ply;
    if (ttCheck[idx] != pos.h2 || (ttDF[idx] >> 2) <= depth || flag == TT_EXACT) {
      ttCheck[idx] = pos.h2; ttMove[idx] = bestM != 0 ? bestM : ttm; ttScore[idx] = st; ttDF[idx] = (depth << 2) | flag;
    }
    return best;
  }
  public static function childPV(m:Int, ctx:Ctx):Array<Int> {
    var pv = [m];
    var j = 1;
    while (j < ctx.pvLen[1]) { pv.push(ctx.pv[1][j]); j++; }
    return pv;
  }
  static function isRep(pos:Pos, ctx:Ctx):Bool {
    return ctx.repKeys != null && ctx.repKeys.exists(posKey(pos));
  }
  /* nota exata (janela cheia) de um lance da raiz; devolve null se o tempo estourou */
  public static function rootOne(pos:Pos, m:Int, depth:Int, ctx:Ctx):Scored {
    makeMove(pos, m);
    var sc = 0; var pv = [m];
    if (isRep(pos, ctx)) { sc = 0; }
    else { sc = -negamax(pos, depth - 1, -INF, INF, 1, ctx); pv = childPV(m, ctx); }
    unmakeMove(pos);
    if (ctx.stop) return null;
    return new Scored(m, sc, pv);
  }
  public static function rootScores(pos:Pos, depth:Int, ctx:Ctx, moves:Array<Int>):Array<Scored> {
    var out:Array<Scored> = [];
    for (m in moves) {
      var r = rootOne(pos, m, depth, ctx);
      if (r == null) return null;
      out.push(r);
    }
    return out;
  }
  public static var lastDepth:Int = 0;
  public static var lastNodes:Int = 0;
  static var rsMove:Int = -1; static var rsScore:Int = 0; static var rsPv:Array<Int> = null;
  /* uma passada pela raiz com a janela [lo, hi]; o resultado fica em rsMove/rsScore/rsPv */
  static function rootSearch(pos:Pos, d:Int, lo:Int, hi:Int, order:Array<Int>, ctx:Ctx) {
    var alpha = lo; var first = true;
    rsMove = -1; rsScore = -INF; rsPv = null;
    for (m in order) {
      makeMove(pos, m);
      var sc:Int; var pv:Array<Int> = null;
      if (isRep(pos, ctx)) { sc = 0; pv = [m]; }
      else if (first) { sc = -negamax(pos, d - 1, -hi, -alpha, 1, ctx); if (sc > alpha) pv = childPV(m, ctx); }
      else {
        sc = -negamax(pos, d - 1, -alpha - 1, -alpha, 1, ctx);
        if (!ctx.stop && sc > alpha) { sc = -negamax(pos, d - 1, -hi, -alpha, 1, ctx); if (sc > alpha) pv = childPV(m, ctx); }
      }
      unmakeMove(pos);
      if (ctx.stop) return;
      first = false;
      if (sc > rsScore) { rsScore = sc; rsMove = m; rsPv = pv != null ? pv : [m]; }
      if (sc > alpha) alpha = sc;
      if (sc >= hi) return;
    }
  }
  public static function searchBest(pos:Pos, maxDepth:Int, timeMs:Float, ?maxNodes:Int, ?repKeys:Map<String, Bool>):Scored {
    var ctx = new Ctx(timeMs, maxNodes);
    ctx.repKeys = repKeys;
    var order = legalMoves(pos);
    if (order.length == 0) return null;
    var best = new Scored(order[0], 0, [order[0]]);
    var bestDepth = 0;
    for (d in 1...(maxDepth + 1)) {
      /* janela de aspiração: começa estreita em volta da nota anterior e abre se a nota escapar */
      var lo = -INF; var hi = INF; var delta = 30;
      if (d >= 4 && best.score > -MATE + 300 && best.score < MATE - 300) { lo = best.score - delta; hi = best.score + delta; }
      var done = false;
      while (true) {
        rootSearch(pos, d, lo, hi, order, ctx);
        if (ctx.stop) break;
        if (rsScore <= lo && lo > -INF) { delta *= 3; lo = delta > 800 ? -INF : rsScore - delta; }
        else if (rsScore >= hi && hi < INF) {
          delta *= 3; hi = delta > 800 ? INF : rsScore + delta;
          var no = [rsMove]; for (x in order) if (x != rsMove) no.push(x); order = no;
        }
        else { done = true; break; }
      }
      if (!done) {
        // aproveita a iteração parcial se o melhor lance já mudou com nota maior
        if (rsMove >= 0 && rsMove != best.m && rsScore > best.score && rsScore > lo && bestDepth > 0) best = new Scored(rsMove, rsScore, rsPv);
        break;
      }
      best = new Scored(rsMove, rsScore, rsPv);
      bestDepth = d;
      var no = [rsMove];
      for (x in order) if (x != rsMove) no.push(x);
      order = no;
      if (Math.abs(rsScore) > MATE - 100) break;
    }
    lastDepth = bestDepth;
    lastNodes = ctx.nodes;
    return best;
  }

  /* ---------- níveis do computador ---------- */
  /* níveis 1 a 3: adversário que erra como humano; 4: motor do jogo com busca completa;
     5 e 6: Stockfish (força limitada e força máxima) — sem ele, o motor do jogo com orçamento maior */
  public static var LEVEL_NAMES = ["", "Fácil", "Médio", "Difícil", "Mestre", "Grande Mestre", "Stockfish"];
  public static var LEVEL_ELO = [0, 800, 1200, 1600, 2000, 2500, 3200];
  public static var lastScore:Int = 0;
  public static var lastScoreValid:Bool = false;
  public static var LV_DEPTH = [0, 1, 2, 14, 30, 40, 40];
  public static var LV_NOISE = [0, 80, 80, 0, 0, 0, 0];
  public static var LV_NODES = [0, 0, 0, 1500, 20000, 250000, 700000];
  public static var LV_TIME:Array<Float> = [0, 3000, 3000, 4000, 6000, 7000, 9000];
  /* ---------- adversário que erra como humano (aproximação no estilo do Maia) ----------
     Em vez de ruído aleatório, o computador: (1) às vezes não enxerga as respostas do adversário
     (lê só um lance), com chance maior nos níveis baixos; (2) prefere lances "naturais" (capturas, xeques)
     e enxerga pior recuos e lances longos; (3) escolhe por sorteio ponderado, mais preciso quanto maior o Elo. */
  public static var HUMAN_NODES:Float = 1.0;
  public static var HUM_ADJ:Float = 0.2; public static var HUM_CAP:Float = 160;
  public static var HUM:Array<Float> = [70, 0.045, 0.18, 0.00015, 1.0];
  public static function chooseHuman(pos:Pos, elo:Int, keys:Array<String>):Int {
    var legal = legalMoves(pos);
    lastScoreValid = false;
    if (legal.length <= 1) return legal.length == 0 ? -1 : legal[0];
    var rep = new Map<String, Bool>();
    if (keys != null) for (k in keys) rep.set(k, true);
    /* v73: a busca e a avaliação novas deixariam estes adversários mais fortes que o rótulo;
       a precisão é ajustada para manter a força de cada nível (medido em partidas contra a versão anterior) */
    var ee = elo - Math.max(0, Math.min(HUM_CAP, (elo - 800) * HUM_ADJ));
    var x = Math.max(0, Math.min(1, (ee - 600) / 1400));
    var pBlind = Math.max(0.0, HUM[2] - (ee - 600) * HUM[3]);
    var blind = Math.random() < pBlind;
    var depth = blind ? 1 : (elo < 900 ? 1 : (elo < 1300 ? 2 : 3));
    var ctx = new Ctx(2500, 60000);
    ctx.repKeys = rep;
    var res = rootScores(pos, depth, ctx, legal);
    if (res == null) { var c2 = new Ctx(4000); c2.repKeys = rep; res = rootScores(pos, 1, c2, legal); }
    if (!blind && elo >= 1500) {
      var nodes = Std.int((15000 + (elo - 1500) * 400) * HUMAN_NODES);
      var best = searchBest(pos, 30, 3000, nodes, rep);
      if (best != null) for (r in res) if (r.m == best.m && best.score > r.score) r.score = best.score;
    }
    var T = Math.max(6, HUM[0] - (ee - 600) * HUM[1]);
    var bk = HUM[4];
    var w:Array<Float> = []; var mx = -1e9;
    var b = pos.board; var us = pos.turn;
    var vals:Array<Float> = [];
    for (r in res) {
      var m = r.m; var from = m & 63; var to = (m >> 6) & 63;
      var bias = 0.0;
      var cap = b[to] != 0 || (m >> 15) == FLAG_EP;
      if (cap) bias += (8 + 12 * (1 - x)) * bk;
      makeMove(pos, m);
      if (inCheck(pos)) bias += (6 + 8 * (1 - x)) * bk;
      unmakeMove(pos);
      var dr = ((to >> 3) - (from >> 3)) * us;
      if (dr < 0 && !cap) bias -= 18 * (1 - x) * bk;
      var t = pType(b[from]);
      var dist = Math.max(Math.abs((to & 7) - (from & 7)), Math.abs((to >> 3) - (from >> 3)));
      if ((t == BISHOP || t == ROOK || t == QUEEN) && dist >= 4 && !cap) bias -= 10 * (1 - x) * bk;
      var v = (Math.max(-1500, Math.min(1500, r.score)) + bias) / T;
      vals.push(v); if (v > mx) mx = v;
    }
    var tot = 0.0;
    for (v in vals) { var e = Math.exp(v - mx); w.push(e); tot += e; }
    var rr = Math.random() * tot; var pick = 0;
    for (i in 0...w.length) { rr -= w[i]; if (rr <= 0) { pick = i; break; } }
    lastScore = res[pick].score; lastScoreValid = true;
    return res[pick].m;
  }
  public static function chooseHumanFEN(fen:String, elo:Int, keys:Array<String>):String {
    var p = posFromFEN(fen);
    var m = chooseHuman(p, elo, keys);
    return m < 0 ? null : moveToUCI(m);
  }

  /* ---------- fantasma: joga com o DNA enxadrista de alguém (você no passado ou um amigo) ----------
     O DNA traz: Elo, erros a cada 100 lances por fase (abertura, meio-jogo, final), gafes, pressa, tilt,
     agressividade, roque preferido, troca de damas e os "pontos cegos" do Mapa do pensamento
     (tipos de peça, recuos, lances calmos, lances longos e a outra ala que a pessoa costuma não olhar).
     Em cada lance o fantasma decide primeiro se vai errar, na taxa medida daquela pessoa naquela fase;
     o erro cai de preferência onde ela não olha: o melhor lance "some" e ele escolhe um lance plausível pior. */
  public static var ghostErr = false;
  static function dnaF(d:Dynamic, f:String, def:Float):Float { var v:Dynamic = Reflect.field(d, f); return v == null ? def : (v : Float); }
  static function moveCat(pos:Pos, m:Int):Array<Int> {
    /* [tipo da peça, recuo, calmo, longo, ala] */
    var from = m & 63; var to = (m >> 6) & 63; var b = pos.board; var us = pos.turn;
    var t = pType(b[from]);
    var cap = b[to] != 0 || (m >> 15) == FLAG_EP;
    var back = ((to >> 3) - (from >> 3)) * us < 0 ? 1 : 0;
    var dist = Math.max(Math.abs((to & 7) - (from & 7)), Math.abs((to >> 3) - (from >> 3)));
    return [t, back, cap ? 0 : 1, dist >= 4 ? 1 : 0, (from & 7) <= 2 ? 0 : ((from & 7) >= 5 ? 2 : 1)];
  }
  public static function chooseGhost(pos:Pos, dna:Dynamic, keys:Array<String>, tilted:Bool):Int {
    var legal = legalMoves(pos);
    lastScoreValid = false; ghostErr = false;
    if (legal.length <= 1) return legal.length == 0 ? -1 : legal[0];
    var rep = new Map<String, Bool>();
    if (keys != null) for (k in keys) rep.set(k, true);
    var elo = Std.int(dnaF(dna, "e", 1000));
    var b = pos.board; var us = pos.turn;
    var minors = 0; for (i in 0...64) { var t = pType(b[i]); if (t >= KNIGHT && t <= QUEEN) minors++; }
    var phase = minors <= 6 ? 2 : (pos.full <= 12 ? 0 : 1);
    var ph:Array<Dynamic> = dna.ph;
    var rate = (ph != null && ph[phase] != null ? (ph[phase] : Float) : 12.0) / 100;
    /* pressa: lances rápidos têm outra taxa de erro */
    var fast = Math.random() * 100 < dnaF(dna, "fa", 30);
    if (fast) rate *= dnaF(dna, "fe", 1.2);
    if (tilted) rate *= Math.max(1, Math.min(3, dnaF(dna, "tl", 1.3)));
    var depth = elo < 900 ? 1 : (elo < 1300 ? 2 : 3);
    if (fast && depth > 1) depth--;
    var ctx = new Ctx(2500, 60000);
    ctx.repKeys = rep;
    var res = rootScores(pos, depth, ctx, legal);
    if (res == null) { var c2 = new Ctx(4000); c2.repKeys = rep; res = rootScores(pos, 1, c2, legal); }
    if (elo >= 1500) {
      var best = searchBest(pos, 30, 2500, Std.int((15000 + (elo - 1500) * 300) * HUMAN_NODES), rep);
      if (best != null) for (r in res) if (r.m == best.m && best.score > r.score) r.score = best.score;
    }
    var bestS = -INF; var bestM = res[0].m;
    for (r in res) if (r.score > bestS) { bestS = r.score; bestM = r.m; }
    /* ponto cego: quanto a pessoa deixa de olhar o tipo de lance que é o melhor aqui */
    var bc = moveCat(pos, bestM);
    var bp:Array<Dynamic> = dna.bp;
    var miss = 0.0; var mk = 0;
    if (bp != null && bp[bc[0] - 1] != null && (bp[bc[0] - 1] : Float) >= 0) { miss += (bp[bc[0] - 1] : Float); mk++; }
    if (bc[1] == 1 && dnaF(dna, "bb", -1) >= 0) { miss += dnaF(dna, "bb", 0); mk++; }
    if (bc[2] == 1 && dnaF(dna, "bq", -1) >= 0) { miss += dnaF(dna, "bq", 0); mk++; }
    if (bc[3] == 1 && dnaF(dna, "bL", -1) >= 0) { miss += dnaF(dna, "bL", 0); mk++; }
    var blindF = mk > 0 ? 0.6 + 1.2 * (miss / mk) / 100 : 1.0;
    rate = Math.max(0.01, Math.min(0.6, rate * blindF));
    var err = Math.random() < rate;
    var ag = dnaF(dna, "ag", 25); var cs:String = dna.cs; var cn = dnaF(dna, "cn", 9); var qx = dnaF(dna, "qx", 30);
    var canCastle = us == 1 ? (pos.castling & 3) != 0 : (pos.castling & 12) != 0;
    var pick = -1; var pickS = 0;
    if (err) {
      /* erro plausível: lances piores que o melhor, sem jogar fora tudo (a gafe pura vem na taxa de gafes) */
      var blR = Math.min(1, dnaF(dna, "bl", 3) / Math.max(1, rate * 100));
      var lo = Math.random() < blR ? 300 : 90; var hi = lo == 300 ? 1200 : 320;
      var pool:Array<Scored> = [for (r in res) if (r.m != bestM && bestS - r.score >= lo && bestS - r.score <= hi) r];
      if (pool.length == 0) pool = [for (r in res) if (r.m != bestM && bestS - r.score >= 60 && bestS - r.score <= 1500) r];
      if (pool.length > 0) {
        /* entre os errados, prefere os "naturais" (do mesmo jeito que a pessoa joga) */
        var ws:Array<Float> = []; var tot = 0.0;
        for (r in pool) {
          var c = moveCat(pos, r.m); var wv = 1.0;
          if (c[2] == 0) wv *= 1 + ag / 40;
          if (c[1] == 1) wv *= 0.5;
          wv *= Math.exp(-(bestS - r.score) / 400);
          ws.push(wv); tot += wv;
        }
        var rr = Math.random() * tot;
        for (i in 0...pool.length) { rr -= ws[i]; if (rr <= 0) { pick = pool[i].m; pickS = pool[i].score; break; } }
        if (pick < 0) { pick = pool[0].m; pickS = pool[0].score; }
        ghostErr = true;
      }
    }
    if (pick < 0) {
      /* lance bom no estilo da pessoa: sorteio entre os bons com as preferências dela */
      var T = Math.max(8, 55 - (elo - 600) * 0.03);
      var vals:Array<Float> = []; var mx = -1e9;
      for (r in res) {
        var m = r.m; var c = moveCat(pos, m); var bias = 0.0;
        if (c[2] == 0) bias += (ag - 25) * 0.9;
        makeMove(pos, m);
        if (inCheck(pos)) bias += (ag - 25) * 0.7;
        unmakeMove(pos);
        if ((m >> 15) == FLAG_CASTLE && canCastle) {
          var side = ((m >> 6) & 7) == 6 ? "k" : "q";
          if (cs == side) bias += pos.full >= cn - 2 ? 70 : 25; else if (cs == "") bias -= 20;
        }
        if (pType(b[m & 63]) == QUEEN && pType(b[(m >> 6) & 63]) == QUEEN) bias += (qx - 40) * 1.2;
        var v = (Math.max(-1500, Math.min(1500, r.score)) + bias) / T;
        if (bestS - r.score > 120) v -= 50;
        vals.push(v); if (v > mx) mx = v;
      }
      var w:Array<Float> = []; var tot = 0.0;
      for (v in vals) { var e = Math.exp(v - mx); w.push(e); tot += e; }
      var rr = Math.random() * tot; var k = 0;
      for (i in 0...w.length) { rr -= w[i]; if (rr <= 0) { k = i; break; } }
      pick = res[k].m; pickS = res[k].score;
      if (bestS - pickS >= 150) ghostErr = true;
    }
    lastScore = pickS; lastScoreValid = true;
    return pick;
  }

  /* versão para o JavaScript: recebe as chaves de posições já ocorridas como lista */
  public static function chooseWithKeys(pos:Pos, level:Int, keys:Array<String>):Int {
    var m = new Map<String, Bool>();
    if (keys != null) for (k in keys) m.set(k, true);
    return chooseComputerMove(pos, level, m);
  }
  public static function chooseComputerMove(pos:Pos, level:Int, ?repKeys:Map<String, Bool>):Int {
    var legal = legalMoves(pos);
    lastScoreValid = false;
    if (legal.length <= 1) return legal.length == 0 ? -1 : legal[0];
    if (level >= 3) {
      var r = searchBest(pos, LV_DEPTH[level], LV_TIME[level], LV_NODES[level], repKeys);
      if (r == null) return legal[0];
      lastScore = r.score; lastScoreValid = true;
      return r.m;
    }
    var depth = LV_DEPTH[level];
    var noise = LV_NOISE[level];
    var res:Array<Scored> = null;
    var d = depth;
    while (res == null && d >= 1) {
      var ctx = new Ctx(d == depth ? LV_TIME[level] : 6000);
      ctx.repKeys = repKeys;
      res = rootScores(pos, d, ctx, legal);
      d--;
    }
    if (res == null) { var r = searchBest(pos, 3, 3000, 0, repKeys); lastScore = r.score; lastScoreValid = true; return r.m; }
    var bestM = legal[0]; var bestS = -INF * 1.0; var bestRaw = 0;
    for (r in res) {
      var s:Float = r.score + (Math.random() * 2 - 1) * noise;
      if (s > bestS) { bestS = s; bestM = r.m; bestRaw = r.score; }
    }
    lastScore = bestRaw; lastScoreValid = true;
    return bestM;
  }
}

typedef E = Engine;
