package;

import Engine;
import Data;

/* Geração de exercícios: trilha, nivelamento, plano diário, temas, revisões, repertório e partidas-modelo. */
class Study {
  /* ---------- tarefas ---------- */
  public static function pzTask(p:Puzzle, blind:Bool, dim:String):Dynamic {
    return { k: "pz", id: p.id, fen: p.fen, moves: p.moves, rating: p.rating, tags: p.tags, blind: blind, dim: dim };
  }
  public static function pzTasks(ps:Array<Puzzle>, blind:Bool, dim:String):Array<Dynamic> return [for (p in ps) pzTask(p, blind, dim)];
  public static function themeTasks(tag:String, n:Int):Array<Dynamic> {
    var r:Int = Profile.d.pzElo;
    var ps = Puzzles.pick(tag == null ? null : [tag], r - 200, r + 200, n, Profile.seenMap());
    return pzTasks(ps, false, tag == "endgame" ? "finais" : "tatica");
  }
  public static function calcTasks(n:Int, lo:Int, hi:Int):Array<Dynamic> {
    var ps = Puzzles.pick(["long", "veryLong", "mateIn3", "short"], lo, hi, n, Profile.seenMap(), 4);
    return pzTasks(ps, true, "calculo");
  }
  public static function ladderTasks():Array<Dynamic> {
    var seen = Profile.seenMap(); var out:Array<Dynamic> = [];
    var steps:Array<Array<Dynamic>> = [["mateIn1", 500, 1100], ["mateIn2", 900, 1600], ["mateIn3", 1300, 2200]];
    for (x in steps) out = out.concat(pzTasks(Puzzles.pick([x[0]], x[1], x[2], 4, seen), false, "tatica"));
    return out;
  }
  public static function stormTask(rating:Int, avoid:Map<String, Bool>):Dynamic {
    var ps = Puzzles.pick(null, rating - 60, rating + 60, 1, avoid);
    return pzTask(ps[0], false, "tatica");
  }

  /* ---------- trilha (6 etapas no estilo do Método dos Passos) ---------- */
  public static function trailTasks(stage:Int, ti:Int):Array<Dynamic> {
    var st:Dynamic = Content.trail()[stage];
    var t:Dynamic = (st.tasks : Array<Dynamic>)[ti];
    var tp:String = t.t;
    if (tp == "pz") return pzTasks(Puzzles.pick(t.tags, t.min, t.max, t.n, Profile.seenMap()), false, "tatica");
    if (tp == "calc") return calcTasks(t.n, t.min, t.max);
    return [];
  }
  public static function trailExam(stage:Int):Array<Dynamic> {
    var st:Dynamic = Content.trail()[stage];
    var tags:Array<String> = [];
    for (t in (st.tasks : Array<Dynamic>)) if (t.tags != null) for (x in (t.tags : Array<String>)) tags.push(x);
    var ex:Dynamic = st.exam;
    var blind = ex.calc == true;
    var ps = blind ? Puzzles.pick(["long", "veryLong", "short"], ex.min, ex.max, 10, Profile.seenMap(), 4)
                   : Puzzles.pick(tags.length > 0 ? tags : null, ex.min, ex.max, 10, Profile.seenMap());
    return pzTasks(ps, blind, blind ? "calculo" : "tatica");
  }
  public static inline var EXAM_PASS = 8;

  /* ---------- teste de nivelamento: 30 posições ---------- */
  public static function placementTasks():Array<Dynamic> {
    var out:Array<Dynamic> = [];
    var avoid = new Map<String, Bool>();
    function add(ps:Array<Puzzle>, dim:String) for (p in ps) if (!avoid.exists(p.id)) { avoid.set(p.id, true); out.push(pzTask(p, false, dim)); }
    var tact = [["hangingPiece"], ["mateIn1"], ["fork"], ["pin"], ["mateIn2"], ["backRankMate"], ["discoveredAttack"], ["fork"], ["sacrifice"], ["skewer", "pin"], ["mateIn2"], ["sacrifice"]];
    var r = 600;
    for (t in tact) { add(Puzzles.pick(t, r - 60, r + 60, 1, avoid), "tatica"); r += 110; }
    for (rr in [1000, 1300, 1600, 1900]) add(Puzzles.pick(["long", "veryLong"], rr - 80, rr + 80, 1, avoid), "calculo");
    for (rr in [800, 1100, 1400, 1700]) add(Puzzles.pick(["endgame"], rr - 80, rr + 80, 1, avoid), "finais");
    for (x in Content.placeX()) {
      var cat:String = x.cat;
      out.push({ k: "q", id: "px" + out.length, fen: x.fen, accept: x.accept, q: x.q, rating: x.rating, dim: cat == "opening" ? "abertura" : (cat == "endgame" ? "finais" : (cat == "calc" ? "calculo" : "tatica")) });
    }
    for (pl in [6, 10]) { var t = openingTask(pl); if (t != null) out.push(t); }
    var rr = 900;
    while (out.length < 30) { var n = out.length; add(Puzzles.pick(null, rr - 100, rr + 100, 1, avoid), "tatica"); rr += 150; if (out.length == n && rr > 2400) break; }
    return out;
  }
  /* posição real de abertura: caminho popular pela base de mestres; aceita os lances que os mestres jogam */
  public static function openingTask(plies:Int):Dynamic {
    var p = Engine.posFromFEN(Engine.START_FEN); var ucis:Array<String> = [];
    for (i in 0...plies) {
      var u = Book.pickMaster(p, 0.15, 1.0);
      if (u == null) break;
      Engine.makeMove(p, Engine.uciToMove(p, u)); p.stack = []; ucis.push(u);
    }
    var mm = Book.masterMoves(p);
    if (mm == null) return null;
    var ok:Array<String> = [];
    for (x in mm) { var sh:Float = x[2]; if (sh >= 0.08) ok.push(x[0]); }
    return { k: "q", id: "op" + ucis.join(""), fen: Engine.toFEN(p), accept: ok, q: "Jogue um lance que os mestres jogam nesta abertura.", dim: "abertura", rating: 900 + plies * 50 };
  }
  public static function placementResult(res:Array<Dynamic>):Dynamic {
    var sum = 0.0; var n = 0; var sc = 0.0;
    var dims:Dynamic = {}; var cnt:Dynamic = {};
    var fast = 0; var tot = 0;
    for (r in res) {
      var dm:String = r.dim;
      var a:Array<Int> = Reflect.field(cnt, dm);
      if (a == null) { a = [0, 0]; Reflect.setField(cnt, dm, a); }
      if (r.ok) a[0]++;
      a[1]++;
      sum += r.rating; sc += r.ok ? 1 : 0; n++;
      tot++; if (r.ok && r.ms <= 45000) fast++;
    }
    for (k in Reflect.fields(cnt)) { var a:Array<Int> = Reflect.field(cnt, k); Reflect.setField(dims, k, Std.int(Math.round(a[0] * 100 / a[1]))); }
    Reflect.setField(dims, "tempo", tot > 0 ? Std.int(Math.round(fast * 100 / tot)) : 0);
    var p = n > 0 ? sc / n : 0.0;
    p = Math.max(0.05, Math.min(0.95, p));
    var dp = -400 * Math.log(1 / p - 1) / Math.log(10);
    var est = n > 0 ? Std.int(Math.round(sum / n + Math.max(-400, Math.min(400, dp)))) : 800;
    est = Std.int(Math.max(400, Math.min(2300, est)));
    var stp = est < 850 ? 1 : (est < 1050 ? 2 : (est < 1250 ? 3 : (est < 1450 ? 4 : (est < 1650 ? 5 : (est < 1800 ? 6 : (est < 1950 ? 7 : (est < 2100 ? 8 : (est < 2250 ? 9 : 10))))))));
    return { day: Profile.today(), est: est, dims: dims, step: stp, ok: Std.int(sc), n: n };
  }

  /* ---------- plano diário de 30 minutos, com peso nas fraquezas ---------- */
  public static var DIMS = ["tatica", "calculo", "finais", "abertura", "tempo"];
  public static var DIM_NAMES = ["Tática", "Cálculo", "Finais", "Abertura", "Tempo"];
  public static function weakestDim():String {
    var w = "tatica"; var wv = 999;
    for (dm in DIMS) { var v = Profile.dimPct(dm); if (v < 0) v = 60; if (v < wv) { wv = v; w = dm; } }
    return w;
  }
  /* plano de 15, 30 ou 60 minutos: o ponto mais fraco recebe mais tempo; o conteúdo muda com o nível */
  public static function dailyPlan():Array<Dynamic> {
    var mins:Int = Profile.d.dailyMin == null ? 30 : Profile.d.dailyMin;
    var lvl:Int = Profile.combined()[0];
    if (lvl <= 0) { var pl:Dynamic = Profile.d.place; lvl = pl != null ? pl.est : 800; }
    var out:Array<Dynamic> = [];
    var due = Profile.srsCount(null);
    var weak = weakestDim();
    var k = mins / 30.0;
    if (due > 0) out.push({ id: "srs", t: "Revisões do dia", d: due + " exercícios que você errou voltam hoje (repetição espaçada 1-3-7-21 dias).", min: Std.int(Math.max(3, 5 * k)) });
    var motifs = lvl < 1000 ? ["mateIn1", "hangingPiece", "fork", "pin", "mateIn2"] : Content.MOTIFS.slice(0, 10);
    var wt = Profile.weakestTheme(motifs);
    var nT = Std.int(Math.round((weak == "tatica" ? 12 : 8) * k));
    out.push({ id: "tactic", t: "Tática: " + Content.themeName(wt), d: nT + " problemas do seu tema mais fraco, perto da sua pontuação.", theme: wt, n: nT, min: Std.int(Math.min(15, (weak == "tatica" ? 10 : 7) * k)) });
    if (mins >= 30 && (weak == "calculo" || weak == "tempo" || lvl >= 1600 || mins >= 60))
      out.push({ id: "calc", t: weak == "tempo" ? "Puzzle Storm (3 min)" : "Cálculo sem mover as peças", d: weak == "tempo" ? "Resolva o máximo que puder em 3 minutos: treina a velocidade." : Std.int(4 * k) + " combinações calculadas de cabeça.", min: 5 });
    var egs = Content.endgames();
    var eg:Dynamic = null;
    for (e in egs) if (!Profile.egDone(e.id) && (lvl >= 1700 || e.kind == "essential")) { eg = e; break; }
    if (eg == null) eg = egs[Profile.today() % egs.length];
    if (mins >= 30 || weak == "finais") out.push({ id: "endgame", t: "Final: " + eg.name, d: "Jogue contra o motor até cumprir o objetivo." + (weak == "finais" ? " (seu ponto mais fraco)" : ""), eg: eg.id, min: weak == "finais" ? 8 : 5 });
    var rep:Dynamic = Profile.d.rep;
    if (rep.w != null || rep.b1 != null) out.push({ id: "opening", t: "Repertório", d: "Revise as linhas do seu repertório que vencem hoje.", min: 4 });
    else if (mins >= 30) out.push({ id: "opening", t: "Escolha seu repertório", d: "Monte seu repertório (1 abertura de Brancas + 2 defesas) e treine a primeira linha.", min: 4 });
    if (mins >= 60) out.push({ id: "model", t: "Partida de mestre", d: lvl >= 1600 ? "Adivinhe os lances de um campeão mundial." : "Adivinhe os lances de uma partida-modelo.", min: 10 });
    out.push({ id: "game", t: mins >= 60 ? "Uma partida clássica" : "Uma partida", d: (mins >= 60 ? "Partida 30+20" : "Partida rápida 10+5") + " contra o Aprendiz, com revisão ativa no fim.", min: mins >= 60 ? 20 : (mins >= 30 ? 10 : 6) });
    return out;
  }

  /* ---------- repetição espaçada ---------- */
  public static function srsTasks(limit:Int):Array<Dynamic> {
    var out:Array<Dynamic> = [];
    for (c in Profile.srsDue(null)) {
      if (out.length >= limit) break;
      var k:String = c.k;
      if (k == "pz") { var p = Puzzles.get(c.id); if (p != null) { var t = pzTask(p, false, "tatica"); t.srs = true; out.push(t); } }
      else if (k == "mine") { var dd:Dynamic = c.data; out.push({ k: "mine", id: c.id, fen: dd.fen, best: dd.best, played: dd.played, why: dd.why, srs: true, dim: "tatica", rating: 1200 }); }
      else if (k == "rep") { var t = repTaskById(c.id); if (t != null) { t.srs = true; out.push(t); } }
    }
    return out;
  }
  /* Woodpecker: o mesmo conjunto de 30 problemas em ciclos cada vez mais rápidos */
  public static function woodSet(?tags:Array<String>, ?n:Int = 30, ?name:String):Dynamic {
    var w:Dynamic = Profile.d.wood;
    if (w == null) {
      var r:Int = Profile.d.pzElo;
      var ps = Puzzles.pick(tags, r - 250, r + 50, n, Profile.seenMap());
      w = { ids: [for (p in ps) p.id], cycle: 0, times: [], scores: [], name: name };
      Profile.d.wood = w; Profile.save();
    }
    return w;
  }
  public static function woodTasks():Array<Dynamic> {
    var w = woodSet(); var out:Array<Dynamic> = [];
    for (id in (w.ids : Array<String>)) { var p = Puzzles.get(id); if (p != null) out.push(pzTask(p, false, "tatica")); }
    return out;
  }

  /* ---------- repertório (1 de Brancas + 2 defesas) ---------- */
  public static function repTask(rep:Dynamic, li:Int):Dynamic {
    var l:Dynamic = (rep.lines : Array<Dynamic>)[li];
    return { k: "line", fen: Engine.START_FEN, id: rep.id + "#" + li, rep: rep.id, color: rep.side, ucis: l.ucis, name: l.name, note: l.note, title: rep.name, dim: "abertura", rating: 1000 };
  }
  public static function repTaskById(id:String):Dynamic {
    var i = id.indexOf("#"); if (i < 0) return null;
    var rep = Content.rep(id.substr(0, i)); if (rep == null) return null;
    var li = Std.parseInt(id.substr(i + 1));
    if (li >= (rep.lines : Array<Dynamic>).length) return null;
    return repTask(rep, li);
  }
  public static function myReps():Array<Dynamic> {
    var r:Dynamic = Profile.d.rep; var out:Array<Dynamic> = [];
    for (id in [r.w, r.b1, r.b2]) if (id != null) { var x = Content.rep(id); if (x != null) out.push(x); }
    return out;
  }
  /* linhas devidas hoje + até maxNew linhas novas */
  public static function repDue(maxNew:Int):Array<Dynamic> {
    var out:Array<Dynamic> = []; var nw = 0;
    var cards:Array<Dynamic> = Profile.d.srs;
    for (rep in myReps()) {
      var lines:Array<Dynamic> = rep.lines;
      for (i in 0...lines.length) {
        var cid = rep.id + "#" + i; var card:Dynamic = null;
        for (c in cards) if (c.k == "rep" && c.id == cid) card = c;
        if (card == null) { if (nw < maxNew) { out.push(repTask(rep, i)); nw++; } }
        else if (card.st < 4 && card.due <= Profile.today()) out.push(repTask(rep, i));
      }
    }
    return out;
  }
  public static function repLearned(rep:Dynamic):Int {
    var n = 0; var cards:Array<Dynamic> = Profile.d.srs;
    for (c in cards) if (c.k == "rep" && StringTools.startsWith(c.id, rep.id + "#") && c.st >= 1) n++;
    return n;
  }

  /* ---------- partidas-modelo ---------- */
  /* desempenho aproximado a partir dos pontos (como nas colunas "adivinhe o lance" de revistas) */
  public static function guessPerf(pct:Float):Int return Std.int(Math.max(600, Math.min(2500, Math.round(600 + 19 * pct))));

  /* ---------- PGN ---------- */
  public static function pgn(rec:Dynamic):String {
    var ucis:Array<String> = rec.ucis;
    if (ucis == null) return null;
    var dt = Date.fromTime(rec.t);
    var date = dt.getFullYear() + "." + StringTools.lpad(Std.string(dt.getMonth() + 1), "0", 2) + "." + StringTools.lpad(Std.string(dt.getDate()), "0", 2);
    var me = Profile.d.name != null && Profile.d.name != "" ? Profile.d.name : "Rodrigo Coelho"; var bot = rec.human == true ? rec.opp : "Computador " + rec.opp;
    var col:Int = rec.col;
    var sc:Float = rec.res;
    var res = sc >= 1 ? (col == 1 ? "1-0" : "0-1") : (sc <= 0 ? (col == 1 ? "0-1" : "1-0") : "1/2-1/2");
    var h = '[Event "' + (rec.human == true ? "Partida pelo WhatsApp" : "Xadrez - Rota do Mestre") + '"]\n[Site "Offline"]\n[Date "' + date + '"]\n[White "' + (col == 1 ? me : bot) + '"]\n[Black "' + (col == 1 ? bot : me) + '"]\n[Result "' + res + '"]\n';
    if (rec.tc != null && rec.tc != "") h += '[TimeControl "' + rec.tc + '"]\n';
    var p = Engine.posFromFEN(Engine.START_FEN); var body = "";
    for (u in ucis) {
      var m = Engine.uciToMove(p, u); if (m < 0) break;
      if (p.turn == 1) body += p.full + ". ";
      body += Engine.moveToSANEn(p, m) + " ";
      Engine.makeMove(p, m);
    }
    return h + "\n" + StringTools.trim(body) + " " + res + "\n";
  }
  public static function pgnAll():String {
    var h:Array<Dynamic> = Profile.d.hist; var out = "";
    for (r in h) { var s = pgn(r); if (s != null) out += s + "\n"; }
    return out;
  }
}
