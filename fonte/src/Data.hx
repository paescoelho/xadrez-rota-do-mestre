package;

import Engine;

/* Quebra-cabeça do banco Lichess (CC0): FEN antes do lance do adversário; moves[0] é o lance dele. */
class Puzzle {
  public var id:String; public var fen:String; public var moves:Array<String>; public var rating:Int; public var tags:Array<String>;
  public function new(id:String, fen:String, moves:Array<String>, rating:Int, tags:Array<String>) {
    this.id = id; this.fen = fen; this.moves = moves; this.rating = rating; this.tags = tags;
  }
  public function has(t:String):Bool return tags.indexOf(t) >= 0;
  public function hasAny(ts:Array<String>):Bool { if (ts == null || ts.length == 0) return true; for (t in ts) if (tags.indexOf(t) >= 0) return true; return false; }
}

class Puzzles {
  public static var list:Array<Puzzle> = [];
  public static var byId:Map<String, Puzzle> = new Map();
  static var loaded = false;
  /* os temas foram detectados automaticamente com os nomes do Lichess (mateIn1, fork, pin...) */
  public static function norm(t:String):String {
    if (t.length == 5 && t.indexOf("mate") == 0) return "mateIn" + t.charAt(4);
    if (t == "capture") return "hangingPiece";
    return t;
  }
  public static function load() {
    if (loaded) return;
    loaded = true;
    var txt = Res.get("lpuzzles");
    if (txt == null) return;
    for (line in txt.split("\n")) {
      var f = line.split("\t");
      if (f.length < 5) continue;
      var p = new Puzzle(f[0], f[1], f[2].split(" "), Std.parseInt(f[3]), [for (t in f[4].split(" ")) norm(t)]);
      list.push(p); byId.set(p.id, p);
    }
  }
  public static function get(id:String):Puzzle { load(); return byId.get(id); }
  /* sorteia n problemas com algum dos temas, numa faixa de pontuação, evitando os já vistos */
  public static function pick(tags:Array<String>, lo:Int, hi:Int, n:Int, avoid:Map<String, Bool>, ?minMoves:Int = 0):Array<Puzzle> {
    load();
    var nt = tags == null ? null : [for (t in tags) norm(t)];
    var a = lo; var b = hi;
    var c:Array<Puzzle> = [];
    for (round in 0...6) {
      c = [];
      for (p in list) {
        if (p.rating < a || p.rating > b) continue;
        if (!p.hasAny(nt)) continue;
        if (p.moves.length < minMoves) continue;
        if (avoid != null && avoid.exists(p.id)) continue;
        c.push(p);
      }
      if (c.length >= n) break;
      if (round == 3) avoid = null;
      a -= 150; b += 150;
    }
    var out:Array<Puzzle> = [];
    while (out.length < n && c.length > 0) out.push(c.splice(Std.random(c.length), 1)[0]);
    out.sort(function(x, y) return x.rating - y.rating);
    return out;
  }
  public static function count(tag:String):Int { load(); var n = 0; for (p in list) if (p.has(tag)) n++; return n; }
}

@:expose
class Book {
  static var names:Map<String, Array<String>> = new Map();
  static var prefix:Map<String, Bool> = new Map();
  static var loaded = false;
  public static var count = 0;
  static var maxLen = 0;
  /* explorador de partidas de mestres: chave FEN -> "uci:n:w:d ..." e melhor lance do Stockfish */
  static var explorer:Map<String, String> = null;
  static var sf:Map<String, String> = null;
  public static var explorerPositions = 0;

  public static function load() {
    if (loaded) return;
    loaded = true;
    var txt = Res.get("openings");
    if (txt == null) return;
    for (line in txt.split("\n")) {
      var f = line.split("\t");
      if (f.length < 3) continue;
      var moves = f[2].split(" ");
      count++;
      if (moves.length > maxLen) maxLen = moves.length;
      var key = moves.join(" ");
      if (!names.exists(key)) names.set(key, [f[0], f[1]]);
      var pre = "";
      for (i in 0...moves.length) {
        pre = pre == "" ? moves[i] : pre + " " + moves[i];
        prefix.set(pre, true);
      }
    }
  }
  static function loadExplorer() {
    if (explorer != null) return;
    explorer = new Map(); sf = new Map();
    var txt = Res.get("explorer");
    if (txt == null) return;
    for (line in txt.split("\n")) {
      var f = line.split("|");
      if (f.length < 2) continue;
      explorer.set(f[0], f[1]);
      if (f.length > 2 && f[2] != "") sf.set(f[0], f[2]);
      explorerPositions++;
    }
  }
  /* análise pré-calculada do Stockfish 19: [uci, nota do ponto de vista de quem joga] */
  public static function sfMoves(pos:Pos):Array<Array<Dynamic>> {
    loadExplorer();
    var s = sf.get(Engine.explorerKey(pos));
    if (s == null || s == "") return null;
    return [for (p in s.split(" ")) { var f = p.split(":"); [f[0], Std.parseInt(f[1])]; }];
  }
  /* lances de mestres nesta posição: [uci, partidas, fração, %brancas, %empates, %pretas] */
  public static function masterMoves(pos:Pos):Array<Array<Dynamic>> {
    loadExplorer();
    var s = explorer.get(Engine.explorerKey(pos));
    if (s == null || s == "") return null;
    var out:Array<Array<Dynamic>> = [];
    var total = 0;
    var parts = s.split(" ");
    for (p in parts) total += Std.parseInt(p.split(":")[1]);
    for (p in parts) {
      var f = p.split(":");
      var n = Std.parseInt(f[1]); var w = Std.parseInt(f[2]); var d = Std.parseInt(f[3]);
      out.push([f[0], n, n / total, w, d, 100 - w - d]);
    }
    return out;
  }
  public static function pickMaster(pos:Pos, minShare:Float, sharp:Float):String {
    var mm = masterMoves(pos);
    if (mm == null) return null;
    var tot = 0.0; var opts:Array<Array<Dynamic>> = [];
    for (x in mm) { var sh:Float = x[2]; if (sh >= minShare) { var wgt = Math.pow(sh, sharp); opts.push([x[0], wgt]); tot += wgt; } }
    if (opts.length == 0) return null;
    var r = Math.random() * tot;
    for (o in opts) { r -= o[1]; if (r <= 0) return o[0]; }
    return opts[0][0];
  }
  public static function detect(ucis:Array<String>):Array<String> {
    load();
    var k = ucis.length < maxLen ? ucis.length : maxLen;
    while (k >= 1) {
      var key = ucis.slice(0, k).join(" ");
      if (names.exists(key)) return names.get(key);
      k--;
    }
    return null;
  }
  public static function inBook(ucis:Array<String>):Bool {
    load();
    if (ucis.length == 0 || ucis.length > 12) return false;
    return prefix.exists(ucis.join(" "));
  }
}

/* partidas-modelo com análise do Stockfish 19 lance a lance (nota em centipeões, ponto de vista das Brancas) */
class ModelGame {
  public var idx:Int = 0;
  public var cat:String; public var title:String; public var desc:String; public var white:String; public var black:String;
  public var year:String; public var result:String; public var moves:Array<String>; public var evals:Array<Int>;
  public function new() {}
  public function name():String return title != "" ? title : short(white) + " x " + short(black);
  public static function short(n:String):String { var i = n.indexOf(","); return i > 0 ? n.substr(0, i) : n; }
}
class Models {
  public static var list:Array<ModelGame> = [];
  static var loaded = false;
  public static function load() {
    if (loaded) return;
    loaded = true;
    var txt = Res.get("models");
    if (txt == null) return;
    for (line in txt.split("\n")) {
      var f = line.split("\t");
      if (f.length < 9) continue;
      var g = new ModelGame();
      g.idx = list.length;
      g.cat = f[0]; g.title = f[1]; g.desc = f[2]; g.white = f[3]; g.black = f[4]; g.year = f[5]; g.result = f[6];
      g.moves = f[7].split(" ");
      g.evals = [for (x in f[8].split(",")) Std.parseInt(x)];
      list.push(g);
    }
  }
  public static function cats():Array<Array<Dynamic>> {
    load();
    var out:Array<Array<Dynamic>> = []; var seen = new Map<String, Int>();
    for (g in list) {
      if (!seen.exists(g.cat)) { seen.set(g.cat, out.length); out.push([g.cat, 0]); }
      out[seen.get(g.cat)][1]++;
    }
    return out;
  }
  public static function of(cat:String):Array<ModelGame> { load(); return [for (g in list) if (g.cat == cat) g]; }
}
