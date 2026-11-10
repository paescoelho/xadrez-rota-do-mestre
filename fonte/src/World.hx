package;

#if js
import UiJs as Ui;

/* Jogos da árvore genealógica (História do xadrez) que não são da família do chaturanga com motor próprio:
   Alquerque, Fierges, Damas brasileiras, Shogi, Go 9x9, Liubo (reconstrução), Mancala (oware), Pachisi,
   Senet, Tafl (hnefatafl) e Tablut. Todos seguem o mesmo modelo dos jogos antigos: página com história,
   regras e peças, e partida contra o computador em vários níveis. */
class WGame {
  public var id = ""; public var name = ""; public var era = "";
  public var story:Array<String> = []; public var rules:Array<String> = []; public var pieces:Array<Array<String>> = [];
  public var sides = ["Brancas", "Pretas"]; public var first = 1;
  public var dice = false; public var tossName = "varetas"; public var flipOk = true; public var passOk = false;
  public var levels = [1, 2, 3]; public var note:String = null; public var repLimit = 3; public var altOk = false; public var alt = false;
  public function new() {}
  public function init():Dynamic return null;
  public function moves(s:Dynamic):Array<Dynamic> return [];
  public function apply(s:Dynamic, m:Dynamic):Dynamic return s;
  /* fim de jogo: { w: vencedor (1, -1 ou 0), why: texto } ou null */
  public function over(s:Dynamic, ms:Array<Dynamic>):Dynamic return null;
  /* avaliação do ponto de vista do lado 1 */
  public function eval(s:Dynamic):Float return 0;
  public function forced(s:Dynamic, ms:Array<Dynamic>):Bool return false;
  public function tactical(s:Dynamic, m:Dynamic):Bool return false;
  public function order(s:Dynamic, ms:Array<Dynamic>):Array<Dynamic> return ms;
  /* [profundidade máxima, tempo em ms, ruído] por nível */
  public function cfg(level:Int):Array<Float> return [[0.0, 0, 0], [2.0, 300, 60], [4.0, 1000, 0], [8.0, 2500, 0], [40.0, 4500, 0]][level];
  public function src(m:Dynamic):Int return m.f;
  public function dst(m:Dynamic):Int return m.t;
  public function lastCells(s:Dynamic, m:Dynamic):Array<Int> return [src(m), dst(m)];
  public function label(s:Dynamic, m:Dynamic):String return "";
  public function key(s:Dynamic):String return null;
  public function svg(s:Dynamic, ui:Dynamic):String return "";
  public function ai(s:Dynamic, level:Int):Dynamic return World.search(this, s, level);
  public function status(s:Dynamic):String return null;
  public function choose(cands:Array<Dynamic>, done:Dynamic->Void) done(cands[0]);
  /* jogos de dados: lançamento real (moedas/varetas/búzios) -> [valor, probabilidade, jogada extra, faces] */
  public function toss():Array<Float> return [1, 1, 0, 0];
  public function rolls(s:Dynamic):Array<Array<Float>> return [];
  public function rollText(s:Dynamic):String return "";
  public function rollSvg(s:Dynamic):String return "";
  public function withRoll(s:Dynamic, r:Array<Float>):Dynamic { var c = Reflect.copy(s); c.roll = r[0]; c.ex = r[2] == 1; c.k = r[3]; return c; }
  public function pass(s:Dynamic):Dynamic { var c = Reflect.copy(s); c.roll = null; c.ex = false; c.turn = -(s.turn : Int); return c; }
}

class World {
  static var LIST:Array<WGame> = null;
  public static var LV = ["", "fácil", "normal", "forte", "mestre"];
  public static function all():Array<WGame> {
    if (LIST == null) LIST = [new Jump("alquerque"), new Jump("fierges"), new Jump("damas"), new Shogi(), new GoGame(), new Liubo(),
      new Oware(), new Pachisi(), new Senet(), new Tafl(true), new Tafl(false)];
    return LIST;
  }
  public static function get(id:String):WGame { for (x in all()) if (x.id == id) return x; return null; }

  /* ---------- busca genérica (negamax com poda alfa-beta, aprofundamento iterativo e quiescência) ---------- */
  static inline var WIN = 1000000.0;
  static var deadline = 0.0; static var stopped = false; static var nodes = 0;
  public static function now():Float return haxe.Timer.stamp() * 1000;
  static function term(r:Dynamic, turn:Int, ply:Int):Float { var w:Int = r.w; return w == 0 ? 0 : (w == turn ? WIN - ply : -WIN + ply); }
  public static function search(gm:WGame, s:Dynamic, level:Int):Dynamic {
    var ms = gm.moves(s);
    if (ms.length == 0) return null;
    if (ms.length == 1) return ms[0];
    var c = gm.cfg(level);
    deadline = now() + c[1]; stopped = false; nodes = 0;
    ms = gm.order(s, ms);
    var best:Dynamic = ms[0]; var noise = c[2];
    var maxD = Std.int(c[0]);
    for (d in 1...maxD + 1) {
      var scores:Array<Float> = []; var alpha = -WIN * 2; var bD:Dynamic = null; var bS = -WIN * 2;
      for (m in ms) {
        var v = -negamax(gm, gm.apply(s, m), d - 1, -WIN * 2, noise > 0 ? WIN * 2 : -alpha, 1);
        if (stopped) break;
        scores.push(v);
        if (v > bS) { bS = v; bD = m; }
        if (v > alpha) alpha = v;
      }
      if (stopped && d > 1) break;
      if (bD == null) break;
      best = bD;
      if (noise > 0 && scores.length == ms.length) {
        var near = [for (i in 0...ms.length) if (scores[i] >= bS - noise) ms[i]];
        best = near[Std.random(near.length)];
      }
      var o = ms.copy(); o.remove(bD); o.unshift(bD); ms = o;
      if (bS >= WIN - 1000 || stopped) break;
    }
    return best;
  }
  static function negamax(gm:WGame, s:Dynamic, depth:Int, alpha:Float, beta:Float, ply:Int):Float {
    nodes++;
    if ((nodes & 127) == 0 && now() > deadline) stopped = true;
    if (stopped) return 0;
    var ms = gm.moves(s);
    var r = gm.over(s, ms);
    if (r != null) return term(r, s.turn, ply);
    if (depth <= 0) return quiesce(gm, s, ms, alpha, beta, ply, 0);
    ms = gm.order(s, ms);
    var best = -WIN * 2;
    for (m in ms) {
      var v = -negamax(gm, gm.apply(s, m), depth - 1, -beta, -alpha, ply + 1);
      if (stopped) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
  static function quiesce(gm:WGame, s:Dynamic, ms:Array<Dynamic>, alpha:Float, beta:Float, ply:Int, qd:Int):Float {
    var turn:Int = s.turn;
    var forced = gm.forced(s, ms);
    var stand = gm.eval(s) * turn;
    if (!forced) { if (stand >= beta) return stand; if (stand > alpha) alpha = stand; }
    if (qd >= 8) return stand;
    var best = forced ? -WIN * 2 : stand;
    var any = false;
    for (m in gm.order(s, ms)) {
      if (!forced && !gm.tactical(s, m)) continue;
      any = true;
      var s2 = gm.apply(s, m); var ms2 = gm.moves(s2); var r = gm.over(s2, ms2);
      var v = r != null ? -term(r, s2.turn, ply + 1) : -quiesce(gm, s2, ms2, -beta, -alpha, ply + 1, qd + 1);
      if (stopped) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return any ? best : stand;
  }
  /* jogos de dados: 1 = escolhe entre os melhores com sorte; 2 = melhor lance imediato; 3 = considera a resposta do adversário */
  public static function diceAI(gm:WGame, s:Dynamic, level:Int):Dynamic {
    var ms = gm.moves(s);
    if (ms.length == 0) return null;
    if (ms.length == 1) return ms[0];
    var me:Int = s.turn;
    var sc:Array<Float> = [];
    for (m in ms) {
      var s2 = gm.apply(s, m);
      sc.push(level >= 3 ? expect(gm, s2, me) : val(gm, s2, me));
    }
    var idx = [for (i in 0...ms.length) i]; idx.sort(function(a, b) return Reflect.compare(sc[b], sc[a]));
    if (level == 1) { var k = Std.int(Math.max(1, Math.ceil(ms.length / 2))); return ms[idx[Std.random(Std.int(Math.min(k, 3)))]]; }
    return ms[idx[0]];
  }
  static function val(gm:WGame, s:Dynamic, me:Int):Float { var r = gm.over(s, []); if (r != null) return (r.w : Int) * me * WIN; return gm.eval(s) * me; }
  static function expect(gm:WGame, s2:Dynamic, me:Int):Float {
    var r = gm.over(s2, []); if (r != null) return (r.w : Int) * me * WIN;
    if ((s2.turn : Int) == me) return gm.eval(s2) * me + 4;
    var tot = 0.0;
    for (rl in gm.rolls(s2)) {
      var s3 = gm.withRoll(s2, rl); var ms3 = gm.moves(s3);
      var worst = WIN * 2;
      if (ms3.length == 0) worst = gm.eval(gm.pass(s3)) * me;
      else for (m3 in ms3) { var v = val(gm, gm.apply(s3, m3), me); if (v < worst) worst = v; }
      tot += rl[1] * worst;
    }
    return tot;
  }

  /* ---------- páginas e partida ---------- */
  static var gm:WGame = null; static var g:Dynamic = null;
  public static function humanSide():Int return g != null ? (g.human : Int) : 1;
  public static function info(id:String) {
    if (id == "eurogames") { euro(); return; }
    gm = get(id); g = null;
    Ui.page(gm.name, Pages.history);
    Ui.p(gm.era, "gold");
    if (gm.note != null) Ui.p(gm.note, "warn small");
    for (p in gm.story) Ui.p(p, "");
    Ui.html(gm.svg(gm.init(), { thumb: true, sel: -1, targets: [], srcs: [], last: null, flip: false }), "wgthumb");
    Ui.h("Como se joga");
    Ui.ul(gm.rules);
    if (gm.pieces.length > 0) { Ui.h("As peças"); Ui.items([for (x in gm.pieces) { t: x[0], d: x[1] }]); }
    Ui.h("Jogar contra o computador");
    if (gm.id == "damas") Ui.p("Modo mestre: o computador pensa mais fundo e não alivia. Um desafio de verdade.", "gold small");
    for (k in 0...2) {
      var side = k == 0 ? gm.first : -gm.first;
      var nm = gm.sides[side == 1 ? 0 : 1];
      Ui.btns([for (lv in gm.levels) [nm + " · " + LV[lv], function() start(id, side, lv), k == 0 && lv == gm.levels[0] ? "pri" : ""]]);
    }
    if (gm.first == 1) Ui.p(gm.sides[0] + " começam.", "muted small"); else Ui.p(gm.sides[1] + " começam.", "muted small");
  }
  public static function quick(id:String) { var x = get(id); if (x == null) { info(id); return; } start(id, x.first, x.levels.length > 1 ? x.levels[1] : x.levels[0]); }
  public static function thumb(id:String):String { var x = get(id); return x.svg(x.init(), { thumb: true, sel: -1, targets: [], srcs: [], last: null, flip: false }); }

  static function start(id:String, human:Int, level:Int) {
    gm = get(id);
    var s = gm.init();
    g = { s: s, human: human, level: level, hist: [], log: [], over: null, busy: false, sel: -1, flip: human == -1 && gm.flipOk, keys: [], last: null, msg: null, end: null };
    var k = gm.key(s); if (k != null) (g.keys : Array<String>).push(k);
    draw(); next();
  }
  static function who(side:Int):String return side == g.human ? "Você" : "PC";
  static function next() {
    if (g == null || g.over != null) return;
    var s = g.s;
    if ((s.turn : Int) != (g.human : Int)) { cpu(); return; }
    if (gm.dice && s.roll != null) {
      var ms = gm.moves(s);
      var cur = g;
      if (ms.length == 0) { g.msg = "Nenhum lance possível com " + gm.rollText(s) + ": a vez passa."; draw(); Ui.later(1300, function() if (g == cur && g.over == null) passTurn()); }
      else if (ms.length == 1) { g.msg = "Só um lance possível: jogado automaticamente."; draw(); Ui.later(800, function() if (g == cur && g.over == null && g.s == s) play(ms[0])); }
    }
  }
  static function toss() {
    if (g == null || g.over != null || g.busy || (g.s.turn : Int) != (g.human : Int) || g.s.roll != null) return;
    g.s = gm.withRoll(g.s, gm.toss()); g.msg = null; g.sel = -1;
    draw(); next();
  }
  static function passTurn() {
    (g.log : Array<String>).push(who(g.s.turn) + ": sem lance" + (gm.dice ? " (" + gm.rollText(g.s) + ")" : " (passou)"));
    g.s = gm.pass(g.s); g.msg = null;
    var r = gm.over(g.s, gm.dice ? [] : gm.moves(g.s));
    if (r != null) finish(r);
    draw(); next();
  }
  static function cpu() {
    g.busy = true; draw();
    var cur = g;
    Ui.later(gm.dice ? 500 : 80, function() {
      if (g != cur || g.over != null) return;
      if (gm.dice && g.s.roll == null) {
        g.s = gm.withRoll(g.s, gm.toss()); draw();
        Ui.later(750, function() { if (g != cur || g.over != null) return; decide(); });
      } else decide();
    });
  }
  static function decide() {
    var m:Dynamic = gm.dice ? diceAI(gm, g.s, g.level) : gm.ai(g.s, g.level);
    g.busy = false;
    if (m == null) passTurn() else play(m);
  }
  static function play(m:Dynamic) {
    var s = g.s;
    (g.hist : Array<Dynamic>).push({ s: s, log: (g.log : Array<String>).copy(), keys: (g.keys : Array<String>).copy(), last: g.last });
    var lab = gm.label(s, m);
    (g.log : Array<String>).push(who(s.turn) + ": " + lab + (gm.dice ? " (" + gm.rollText(s) + ")" : ""));
    var s2 = gm.apply(s, m);
    g.last = [for (c in gm.lastCells(s, m)) if (c >= 0) c];
    g.s = s2; g.sel = -1; g.msg = null;
    var r = gm.over(s2, gm.dice ? [] : gm.moves(s2));
    if (r == null) {
      var k = gm.key(s2);
      if (k != null) {
        var n = 1; for (x in (g.keys : Array<String>)) if (x == k) n++;
        (g.keys : Array<String>).push(k);
        if (n >= gm.repLimit) r = { w: 0, why: "repetição de posição" };
      }
    }
    if (r != null) finish(r);
    draw(); next();
  }
  static function finish(r:Dynamic) {
    var w:Int = r.w;
    g.over = (w == 0 ? "Empate" : (w == (g.human : Int) ? "Você venceu!" : "O computador venceu.")) + " (" + r.why + ")";
    if (r.end != null) g.end = r.end;
    try { if (w != 0) UiJs.sfx(w == (g.human : Int) ? "chk" : "cap"); } catch (e:Dynamic) {}
  }
  static function pick(c:Int) {
    if (g == null || g.over != null || g.busy || (g.s.turn : Int) != (g.human : Int)) return;
    if (gm.dice && g.s.roll == null) { Ui.toast("Primeiro toque em Lançar " + gm.tossName + "."); return; }
    var ms = gm.moves(g.s);
    if (g.sel != -1) {
      var cand = [for (m in ms) if (gm.src(m) == (g.sel : Int) && gm.dst(m) == c) m];
      if (cand.length > 0) { humanChoose(cand); return; }
    }
    var direct = [for (m in ms) if (gm.src(m) == -1 && gm.dst(m) == c) m];
    if (direct.length > 0) { humanChoose(direct); return; }
    var has = false; for (m in ms) if (gm.src(m) == c) has = true;
    g.sel = has && g.sel != c ? c : -1;
    draw();
  }
  static function humanChoose(cand:Array<Dynamic>) {
    if (cand.length == 1) { play(cand[0]); return; }
    var cur = g;
    gm.choose(cand, function(m) if (g == cur && g.over == null) play(m));
  }
  static function undo() {
    var h:Array<Dynamic> = g.hist;
    if (h.length == 0 || g.busy) return;
    var st = h.pop();
    while ((st.s.turn : Int) != (g.human : Int) && h.length > 0) st = h.pop();
    g.s = st.s; g.log = st.log; g.keys = st.keys; g.last = st.last; g.over = null; g.sel = -1; g.msg = null; g.end = null;
    draw(); next();
  }
  static function draw() {
    if (g == null) return;
    var s = g.s;
    var my = g.over == null && !g.busy && (s.turn : Int) == (g.human : Int);
    var ms = my && (!gm.dice || s.roll != null) ? gm.moves(s) : [];
    var targets = (g.sel : Int) != -1 ? [for (m in ms) if (gm.src(m) == (g.sel : Int)) gm.dst(m)] : [];
    var srcs:Array<Int> = [];
    if ((g.sel : Int) == -1) for (m in ms) { var c = gm.src(m); if (c >= 0 && srcs.indexOf(c) < 0) srcs.push(c); var d = gm.dst(m); if (c == -1 && srcs.indexOf(d) < 0 && gm.dice) srcs.push(d); }
    var ui = { sel: g.sel, targets: targets, srcs: srcs, last: g.last, flip: g.flip, my: my, human: g.human, end: g.end, thumb: false };
    var cur = g;
    Ui.page(gm.name, function() { g = null; info(gm.id); });
    var d:Dynamic = Ui.node("div", "wgb wg-" + gm.id);
    d.innerHTML = gm.svg(s, ui);
    d.onclick = function(e:Dynamic) {
      var el:Dynamic = e.target.closest != null ? e.target.closest("[data-c]") : null;
      if (el == null || g != cur) return;
      pick(Std.parseInt(el.getAttribute("data-c")));
    };
    var human:Int = g.human;
    var cpuSide = -human;
    var mine = gm.sides[human == 1 ? 0 : 1]; var theirs = gm.sides[human == 1 ? 1 : 0];
    Ui.p("Computador (" + LV[g.level] + ") · " + theirs + ((s.turn : Int) == cpuSide && g.over == null ? (g.busy && !(gm.dice && s.roll != null) ? " · pensando…" : " · vez dele") : ""), (s.turn : Int) == cpuSide ? "gold small" : "muted small");
    Ui.p("Você · " + mine + (my ? " · sua vez" : ""), my ? "gold small" : "muted small");
    if (gm.dice && s.roll != null) {
      Ui.html(gm.rollSvg(s), "wgroll");
      Ui.p(((s.turn : Int) == human ? "Você tirou " : "O computador tirou ") + gm.rollText(s) + ((s.ex == true) ? " · joga de novo depois" : ""), "small");
    }
    var st = gm.status(s); if (st != null) Ui.p(st, "muted small");
    if (g.over != null) Ui.p(g.over, "big gold");
    else if (g.msg != null) Ui.p(g.msg, "warn small");
    else if (my && !gm.dice && ms.length > 0 && gm.forced(s, ms)) Ui.p("Captura obrigatória: as peças que podem capturar estão marcadas.", "warn small");
    var bs:Array<Array<Dynamic>> = [];
    if (my && gm.dice && s.roll == null) bs.push(["Lançar " + gm.tossName, toss, "pri wide"]);
    if (my && gm.passOk) bs.push(["Passar", function() { var m:Dynamic = { pass: true, f: -1, t: -2 }; play(m); }, ""]);
    if (g.over == null && !gm.dice) bs.push(["Desfazer", undo, (g.hist : Array<Dynamic>).length > 0 && !g.busy ? "" : "off"]);
    if (gm.flipOk) bs.push(["Virar", function() { g.flip = !g.flip; draw(); }]);
    if (gm.altOk) bs.push([gm.alt ? "Ideogramas" : "Letras", function() { gm.alt = !gm.alt; draw(); }]);
    bs.push(["Regras", function() Ui.modal(gm.name, gm.rules.join("\n\n"), [["Entendi", null, "pri"]])]);
    bs.push(["Nova partida", function() start(gm.id, g.human, g.level), g.over != null ? "pri" : ""]);
    Ui.btns(bs);
    var log:Array<String> = g.log;
    if (log.length > 0) { Ui.h("Lances"); Ui.ul(log.slice(-8), "small"); }
  }

  /* ---------- jogos de tabuleiro modernos (eurogames): só a história ---------- */
  public static function euro() {
    Ui.page("Jogos de tabuleiro modernos", Pages.history);
    Ui.p("Alemanha e mundo · desde 1983", "gold");
    for (p in EURO) Ui.p(p, "");
    Ui.h("Os quatro da árvore");
    Ui.items([
      { t: "Scotland Yard (1983)", d: "Dedução e perseguição: um jogador é o fugitivo Mr. X, escondido nos táxis, ônibus e metrô de Londres; os outros, juntos, tentam cercá-lo. Venceu o prêmio Spiel des Jahres de 1983." },
      { t: "Catan (1995)", d: "De Klaus Teuber: colonos produzem e trocam madeira, tijolo, lã, trigo e minério num mapa de hexágonos que muda a cada partida. Popularizou os eurogames no mundo." },
      { t: "Carcassonne (2000)", d: "De Klaus-Jürgen Wrede: cada um coloca uma peça quadrada de paisagem e forma estradas, cidades e campos medievais, marcando território com os seus meeples." },
      { t: "Terra Mystica (2012)", d: "Estratégia profunda e sem sorte: cada facção transforma o terreno de um mapa hexagonal para poder construir, numa disputa de economia e espaço." }
    ]);
    Ui.p("Estes jogos são marcas registradas e têm direitos autorais dos seus autores e editoras. Por isso ficam aqui como história, para você conhecer e procurar a versão original.", "muted small");
  }
  static var EURO = [
    "Na árvore, os jogos modernos aparecem como descendentes das Damas: herdaram a ideia do tabuleiro como território e das peças que disputam espaço. Na prática, eles formam uma família nova, nascida na Alemanha nos anos 1980 e 1990.",
    "Os eurogames trocaram a eliminação direta por economia, construção e pontos. Ninguém sai do jogo no meio, a sorte pesa pouco e as partidas cabem numa noite. O prêmio alemão Spiel des Jahres, criado em 1979, ajudou a transformar esses jogos em cultura de família.",
    "Como o xadrez, eles premiam o planejamento: escolher o que fazer agora pensando três rodadas à frente."
  ];

  /* ---------- utilidades de desenho ---------- */
  public static function hit(c:Int, x:Float, y:Float, w:Float, h:Float):String
    return '<rect data-c="' + c + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#000" fill-opacity="0" style="cursor:pointer"/>';
  public static function hitC(c:Int, x:Float, y:Float, r:Float):String
    return '<circle data-c="' + c + '" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#000" fill-opacity="0" style="cursor:pointer"/>';
  public static var DEFS = '<defs>'
    + '<radialGradient id="wgL" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f1e6cf"/><stop offset="1" stop-color="#c7b48e"/></radialGradient>'
    + '<radialGradient id="wgD" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#6e5640"/><stop offset=".5" stop-color="#2b1d12"/><stop offset="1" stop-color="#0d0805"/></radialGradient>'
    + '<radialGradient id="wgR" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ff8d7a"/><stop offset=".55" stop-color="#c3362a"/><stop offset="1" stop-color="#6e1610"/></radialGradient>'
    + '<radialGradient id="wgG" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#9fe0a6"/><stop offset=".55" stop-color="#2f8a43"/><stop offset="1" stop-color="#11431e"/></radialGradient>'
    + '<radialGradient id="wgS" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#5a3a1a" stop-opacity=".55"/><stop offset="1" stop-color="#5a3a1a" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="wgW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9c98c"/><stop offset=".5" stop-color="#d6ad6a"/><stop offset="1" stop-color="#b98a4b"/></linearGradient>'
    + '</defs>';
  /* peça redonda (disco) com sombra; king = coroa dourada */
  public static function disc(x:Float, y:Float, r:Float, light:Bool, king:Bool, ?fill:String):String {
    var s = '<circle cx="' + x + '" cy="' + (y + r * 0.14) + '" r="' + r + '" fill="rgba(0,0,0,.35)"/>';
    if (king) s += '<circle cx="' + x + '" cy="' + (y + r * 0.1) + '" r="' + r + '" fill="' + (fill != null ? fill : (light ? "url(#wgL)" : "url(#wgD)")) + '" stroke="' + (light ? "#6b4a22" : "#c8963a") + '" stroke-width="' + (r * 0.07) + '"/>';
    var yy = king ? y - r * 0.16 : y;
    s += '<circle cx="' + x + '" cy="' + yy + '" r="' + r + '" fill="' + (fill != null ? fill : (light ? "url(#wgL)" : "url(#wgD)")) + '" stroke="' + (light ? "#6b4a22" : "#c8963a") + '" stroke-width="' + (r * 0.07) + '"/>';
    s += '<circle cx="' + x + '" cy="' + yy + '" r="' + (r * 0.66) + '" fill="none" stroke="' + (light ? "rgba(107,74,34,.45)" : "rgba(200,150,58,.55)") + '" stroke-width="' + (r * 0.05) + '"/>';
    if (king) s += crown(x, yy, r * 0.5, light ? "#b07d2c" : "#f3d98c");
    return s;
  }
  public static function crown(x:Float, y:Float, k:Float, c:String):String
    return '<path d="M' + (x - k) + ',' + (y + k * .5) + ' L' + (x - k) + ',' + (y - k * .45) + ' L' + (x - k * .5) + ',' + (y + k * .05) + ' L' + x + ',' + (y - k * .7) + ' L' + (x + k * .5) + ',' + (y + k * .05) + ' L' + (x + k) + ',' + (y - k * .45) + ' L' + (x + k) + ',' + (y + k * .5) + ' Z" fill="' + c + '"/>';
  public static function marks(ui:Dynamic, pos:Int->Array<Float>, r:Float):String {
    if (ui.thumb == true) return "";
    var s = "";
    var last:Array<Int> = ui.last;
    if (last != null) for (c in last) { var p = pos(c); if (p != null) s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r * 1.08) + '" fill="rgba(240,200,60,.32)"/>'; }
    var sel:Int = ui.sel;
    if (sel >= 0) { var p = pos(sel); if (p != null) s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r * 1.08) + '" fill="none" stroke="#2e9d4c" stroke-width="' + (r * 0.16) + '"/>'; }
    var srcs:Array<Int> = ui.srcs;
    if (sel < 0 && srcs != null && ui.my == true) for (c in srcs) { var p = pos(c); if (p != null) s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r * 1.04) + '" fill="none" stroke="rgba(46,157,76,.55)" stroke-width="' + (r * 0.07) + '" stroke-dasharray="' + (r * 0.2) + ' ' + (r * 0.14) + '"/>'; }
    return s;
  }
  public static function targetMarks(ui:Dynamic, pos:Int->Array<Float>, r:Float):String {
    var s = "";
    var t:Array<Int> = ui.targets;
    if (t != null) for (c in t) { var p = pos(c); if (p != null) s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r * 0.32) + '" fill="rgba(30,130,55,.85)" stroke="#fff" stroke-width="' + (r * 0.05) + '"/>'; }
    return s;
  }
  /* varetas ou moedas lançadas: n peças, k com a face clara para cima */
  public static function sticks(n:Int, k:Int, kind:String):String {
    var s = new StringBuf();
    var w = n * 34 + 10;
    s.add('<svg viewBox="0 0 ' + w + ' 60" height="44">');
    for (i in 0...n) {
      var up = i < k; var x = 10 + i * 34;
      if (kind == "cowrie") {
        s.add('<ellipse cx="' + (x + 12) + '" cy="30" rx="12" ry="17" fill="' + (up ? "#fbf3e2" : "#e4d2ad") + '" stroke="#8a6a3a" stroke-width="1.5"/>');
        if (up) s.add('<path d="M' + (x + 12) + ',16 L' + (x + 12) + ',44" stroke="#5b3a17" stroke-width="2.4"/>' + [for (j in 0...5) '<path d="M' + (x + 9) + ',' + (19 + j * 5) + ' h6" stroke="#5b3a17" stroke-width="1"/>'].join(""));
        else s.add('<ellipse cx="' + (x + 9) + '" cy="25" rx="4" ry="5" fill="#f6ead0" opacity=".7"/>');
      } else {
        s.add('<rect x="' + x + '" y="6" width="24" height="48" rx="10" fill="' + (up ? "#f6ead0" : "#5b3a17") + '" stroke="#3a2410" stroke-width="1.5"/>');
        if (up) s.add('<path d="M' + (x + 6) + ',18 h12 M' + (x + 6) + ',30 h12 M' + (x + 6) + ',42 h12" stroke="#a87a3a" stroke-width="1.5"/>');
      }
    }
    s.add('</svg>');
    return s.toString();
  }
}

/* =====================================================================================
   Alquerque, Fierges e Damas brasileiras: o mesmo motor de saltos sobre um grafo de casas
   ===================================================================================== */
class Jump extends WGame {
  var kind:String;
  var W = 8; var H = 8; var N = 0;
  var X:Array<Int> = []; var Y:Array<Int> = []; var nb:Array<Array<Int>> = []; var at:Array<Int> = [];
  static var DX = [0, 1, 1, 1, 0, -1, -1, -1]; static var DY = [-1, -1, 0, 1, 1, 1, 0, -1];
  public function new(k:String) {
    super();
    kind = k; id = k;
    if (k == "alquerque") { W = 5; H = 5; }
    for (y in 0...H) for (x in 0...W) {
      if (k != "alquerque" && (x + y) % 2 == 0) { at.push(-1); continue; }
      at.push(N); X.push(x); Y.push(y); N++;
    }
    for (n in 0...N) {
      var row:Array<Int> = [];
      for (d in 0...8) {
        var x = X[n] + DX[d]; var y = Y[n] + DY[d];
        var ok = x >= 0 && y >= 0 && x < W && y < H;
        if (ok && k == "alquerque" && d % 2 == 1 && (X[n] + Y[n]) % 2 == 1) ok = false;
        if (ok && k != "alquerque" && d % 2 == 0) ok = false;
        row.push(ok ? at[y * W + x] : -1);
      }
      nb.push(row);
    }
    sides = ["Brancas", "Pretas"];
    if (k == "alquerque") {
      name = "Alquerque"; era = "Oriente Médio e Espanha · descrito no Libro de los juegos (1283)";
      story = [
        "O alquerque é um dos jogos de captura mais antigos que se conhecem. O nome vem do árabe al-qirq, e o tabuleiro de 5 x 5 pontos ligados por linhas aparece riscado em pedras muito antigas do Oriente Médio.",
        "Os árabes o levaram à Península Ibérica, e em 1283 o rei Afonso X de Castela registrou as regras no Libro de los juegos, o mesmo livro que guardou problemas de xadrez medieval.",
        "Na árvore, o alquerque é o elo entre o shatranj e as damas: quando alguém pôs as peças do alquerque num tabuleiro de xadrez, nasceu o fierges, o avô das damas."];
      rules = [
        "Cada um tem 12 peças. As peças andam um ponto ao longo das linhas, para a frente, para o lado ou na diagonal (onde houver linha), nunca para trás.",
        "Captura: salte uma peça adversária vizinha, ao longo de uma linha, para o ponto vazio logo depois dela. Pode encadear vários saltos, inclusive para trás.",
        "Capturar é obrigatório (a regra do Libro de los juegos).",
        "Vence quem capturar todas as peças do outro ou deixá-lo sem lances. 60 lances seguidos sem captura terminam empatados."];
      pieces = [["Peça", "Anda um ponto pelas linhas, para a frente ou para o lado; captura saltando em qualquer direção."]];
    } else if (k == "fierges") {
      name = "Fierges"; era = "França · por volta de 1100";
      story = [
        "Por volta do século XII, no sul da França, alguém pôs as peças do alquerque num tabuleiro de xadrez e passou a usar só as casas escuras. Nasceu o fierges, o primeiro jogo de damas.",
        "O nome vem da fers, a peça do xadrez medieval que andava uma casa na diagonal (o futuro bispo e a futura dama tiveram ancestrais assim). A peça que chegava ao fim do tabuleiro virava fers e passava a andar como ela: uma casa na diagonal, para qualquer lado.",
        "Capturar ainda não era obrigatório. A regra do \"jogo forçado\" só apareceu no século XVI, e com ela nasceram as damas modernas."];
      rules = [
        "12 peças para cada lado, nas casas escuras. As peças andam uma casa na diagonal para a frente e capturam saltando para a frente.",
        "A peça que chega à última fileira vira fers (dama), marcada com coroa: anda e captura uma casa na diagonal, para a frente ou para trás.",
        "Capturar não é obrigatório, e você pode parar uma sequência de saltos quando quiser.",
        "Vence quem capturar todas as peças do outro ou deixá-lo sem lances."];
      pieces = [["Peça", "Uma casa na diagonal para a frente; captura saltando para a frente."], ["Fers (dama)", "Uma casa na diagonal em qualquer direção; captura saltando uma peça vizinha."]];
    } else {
      name = "Damas"; era = "Europa desde o século XVI · aqui, as damas brasileiras";
      levels = [4];
      story = [
        "Quando a captura se tornou obrigatória, por volta de 1535, o fierges virou o jeu forcé, as damas modernas. Na Espanha, o jogo ganhou a dama que voa pela diagonal inteira, e essa versão se espalhou por Portugal, Brasil e boa parte do mundo.",
        "As damas brasileiras usam o tabuleiro de 8 x 8 com as regras das damas internacionais: peças capturam para trás, a dama anda e captura à distância e é obrigatório tomar o maior número possível de peças.",
        "Na árvore, as damas são o ponto de onde partem os jogos de tabuleiro modernos: territórios, capturas e estratégia sem sorte."];
      rules = [
        "12 peças para cada lado nas casas escuras. As Brancas começam. As peças andam uma casa na diagonal para a frente.",
        "Capturar é obrigatório: salte uma peça adversária vizinha (para a frente ou para trás) caindo na casa vazia depois dela. Se puder continuar saltando, continue.",
        "Lei da maioria: entre as capturas possíveis, é obrigatório escolher a que toma mais peças.",
        "A peça que termina o lance na última fileira vira dama. A dama anda quantas casas quiser na diagonal e captura à distância.",
        "Vence quem capturar todas as peças do outro ou deixá-lo sem lances. Só damas por 20 lances de cada lado, sem captura, é empate."];
      pieces = [["Peça", "Uma casa na diagonal para a frente; captura para a frente e para trás."], ["Dama", "Voa pela diagonal; captura à distância, caindo em qualquer casa vazia depois da peça tomada."]];
    }
  }
  override public function init():Dynamic {
    var b = [for (n in 0...N) 0];
    for (n in 0...N) {
      if (kind == "alquerque") {
        if (Y[n] <= 1 || (Y[n] == 2 && X[n] <= 1)) b[n] = -1;
        if (Y[n] >= 3 || (Y[n] == 2 && X[n] >= 3)) b[n] = 1;
      } else { if (Y[n] <= 2) b[n] = -1; if (Y[n] >= 5) b[n] = 1; }
    }
    return { b: b, turn: 1, q: 0 };
  }
  inline function fwd(side:Int):Int return side == 1 ? -1 : 1;
  function cap(b:Array<Int>, origin:Int, cur:Int, king:Bool, side:Int, taken:Array<Int>, path:Array<Int>, out:Array<Dynamic>) {
    var found = false;
    for (d in 0...8) {
      if (nb[cur][d] < 0) continue;
      if (!king || kind == "fierges") {
        if (kind == "fierges" && !king && DY[d] != fwd(side)) continue;
        var q = nb[cur][d];
        if (b[q] * side >= 0 || taken.indexOf(q) >= 0) continue;
        var r = nb[q][d]; if (r < 0) continue;
        if (b[r] != 0 && r != origin) continue;
        found = true;
        var t2 = taken.concat([q]); var p2 = path.concat([r]);
        if (kind == "fierges") out.push({ f: origin, t: r, c: t2, p: p2 });
        cap(b, origin, r, king, side, t2, p2, out);
      } else {
        var q = nb[cur][d];
        while (q >= 0 && (b[q] == 0 || q == origin)) q = nb[q][d];
        if (q < 0 || b[q] * side >= 0 || taken.indexOf(q) >= 0) continue;
        var r = nb[q][d];
        while (r >= 0 && (b[r] == 0 || r == origin)) {
          found = true;
          cap(b, origin, r, king, side, taken.concat([q]), path.concat([r]), out);
          r = nb[r][d];
        }
      }
    }
    if (!found && taken.length > 0 && kind != "fierges") out.push({ f: origin, t: cur, c: taken, p: path });
  }
  override public function moves(s:Dynamic):Array<Dynamic> {
    var b:Array<Int> = s.b; var side:Int = s.turn;
    var caps:Array<Dynamic> = [];
    for (n in 0...N) if (b[n] * side > 0) cap(b, n, n, b[n] * side == 2, side, [], [n], caps);
    if (caps.length > 0 && kind == "damas") {
      var mx = 0; for (m in caps) if ((m.c : Array<Int>).length > mx) mx = (m.c : Array<Int>).length;
      caps = [for (m in caps) if ((m.c : Array<Int>).length == mx) m];
    }
    if (caps.length > 0 && kind != "fierges") return caps;
    var out = caps;
    for (n in 0...N) {
      var p = b[n]; if (p * side <= 0) continue;
      var king = p * side == 2;
      for (d in 0...8) {
        var t = nb[n][d]; if (t < 0) continue;
        if (kind == "alquerque") { if (DY[d] == -fwd(side)) continue; if (b[t] == 0) out.push({ f: n, t: t, c: [], p: [n, t] }); }
        else if (kind == "damas" && king) { while (t >= 0 && b[t] == 0) { out.push({ f: n, t: t, c: [], p: [n, t] }); t = nb[t][d]; } }
        else { if (!king && DY[d] != fwd(side)) continue; if (b[t] == 0) out.push({ f: n, t: t, c: [], p: [n, t] }); }
      }
    }
    return out;
  }
  override public function apply(s:Dynamic, m:Dynamic):Dynamic {
    var b:Array<Int> = (s.b : Array<Int>).copy(); var f:Int = m.f; var t:Int = m.t;
    var p = b[f]; b[f] = 0;
    var cs:Array<Int> = m.c; for (c in cs) b[c] = 0;
    b[t] = p;
    if (kind != "alquerque" && (p == 1 || p == -1) && ((p == 1 && Y[t] == 0) || (p == -1 && Y[t] == H - 1))) b[t] = 2 * p;
    var man = p == 1 || p == -1;
    var q = cs.length > 0 || (man && kind != "alquerque") ? 0 : (s.q : Int) + 1;
    return { b: b, turn: -(s.turn : Int), q: q };
  }
  override public function over(s:Dynamic, ms:Array<Dynamic>):Dynamic {
    if (ms.length == 0) {
      var b:Array<Int> = s.b; var side:Int = s.turn; var any = false;
      for (p in b) if (p * side > 0) any = true;
      return { w: -side, why: any ? "sem lances" : "todas as peças capturadas" };
    }
    var q:Int = s.q;
    if (kind == "damas" && q >= 40) return { w: 0, why: "20 lances de cada lado só com damas" };
    if (kind == "fierges" && q >= 50) return { w: 0, why: "25 lances de cada lado só com damas" };
    if (kind == "alquerque" && q >= 60) return { w: 0, why: "60 lances sem captura" };
    return null;
  }
  override public function eval(s:Dynamic):Float {
    var b:Array<Int> = s.b; var sc = 0.0;
    var cnt = [0, 0];
    for (n in 0...N) {
      var p = b[n]; if (p == 0) continue;
      var side = p > 0 ? 1 : -1; var king = p * side == 2;
      cnt[side == 1 ? 0 : 1]++;
      var adv = side == 1 ? H - 1 - Y[n] : Y[n];
      var v = 0.0;
      if (kind == "damas") {
        v = king ? 330 : 100 + adv * 5 + (adv == 0 ? 6 : 0);
        if (X[n] >= 2 && X[n] <= 5 && Y[n] >= 2 && Y[n] <= 5) v += 4;
        if (!king && (X[n] == 0 || X[n] == 7)) v -= 3;
      } else if (kind == "fierges") v = king ? 175 : 100 + adv * 4;
      else { v = 100 + adv * 2; if (X[n] == 2 && Y[n] == 2) v += 4; }
      sc += side * v;
    }
    if (cnt[0] > cnt[1] && cnt[1] > 0) sc += 6 * (12 - cnt[1]);
    if (cnt[1] > cnt[0] && cnt[0] > 0) sc -= 6 * (12 - cnt[0]);
    return sc;
  }
  override public function forced(s:Dynamic, ms:Array<Dynamic>):Bool return kind != "fierges" && ms.length > 0 && (ms[0].c : Array<Int>).length > 0;
  override public function tactical(s:Dynamic, m:Dynamic):Bool return (m.c : Array<Int>).length > 0;
  override public function order(s:Dynamic, ms:Array<Dynamic>):Array<Dynamic> {
    var b:Array<Int> = s.b;
    var o = ms.copy();
    o.sort(function(a, c) { var x = (a.c : Array<Int>).length * 10 + (b[a.f] * (s.turn : Int) == 1 && (Y[a.t] == 0 || Y[a.t] == H - 1) ? 5 : 0); var y = (c.c : Array<Int>).length * 10 + (b[c.f] * (s.turn : Int) == 1 && (Y[c.t] == 0 || Y[c.t] == H - 1) ? 5 : 0); return y - x; });
    return o;
  }
  override public function cfg(level:Int):Array<Float> {
    return kind == "damas" ? [[0.0, 0, 0], [2.0, 300, 40], [4.0, 900, 0], [10.0, 2500, 0], [60.0, 5000, 0]][level] : [[0.0, 0, 0], [2.0, 300, 50], [4.0, 900, 0], [9.0, 2500, 0], [40.0, 4500, 0]][level];
  }
  function sqName(n:Int):String return kind == "alquerque" ? "abcde".charAt(X[n]) + (5 - Y[n]) : "abcdefgh".charAt(X[n]) + (8 - Y[n]);
  override public function label(s:Dynamic, m:Dynamic):String {
    var p:Array<Int> = m.p; var cs:Array<Int> = m.c;
    return cs.length == 0 ? sqName(m.f) + "-" + sqName(m.t) : [for (x in p) sqName(x)].join("x") + (cs.length > 1 ? " (" + cs.length + " peças)" : "");
  }
  override public function lastCells(s:Dynamic, m:Dynamic):Array<Int> return (m.p : Array<Int>).copy();
  override public function key(s:Dynamic):String return (s.b : Array<Int>).join(",") + "|" + s.turn;
  override public function status(s:Dynamic):String {
    var b:Array<Int> = s.b; var w = 0; var k = 0;
    for (p in b) { if (p > 0) w++; if (p < 0) k++; }
    return "Peças: Brancas " + w + " · Pretas " + k;
  }
  override public function svg(s:Dynamic, ui:Dynamic):String {
    var b:Array<Int> = s.b; var flip = ui.flip == true;
    var sb = new StringBuf();
    if (kind == "alquerque") {
      var step = 170.0; var m0 = 90.0; var size = m0 * 2 + step * 4;
      function P(n:Int):Array<Float> { var x = flip ? 4 - X[n] : X[n]; var y = flip ? 4 - Y[n] : Y[n]; return [m0 + x * step, m0 + y * step]; }
      sb.add('<svg viewBox="0 0 ' + size + ' ' + size + '">' + World.DEFS);
      sb.add('<rect x="6" y="6" width="' + (size - 12) + '" height="' + (size - 12) + '" rx="26" fill="url(#wgW)" stroke="#5b3714" stroke-width="10"/>');
      sb.add('<rect x="22" y="22" width="' + (size - 44) + '" height="' + (size - 44) + '" rx="16" fill="none" stroke="rgba(91,55,20,.35)" stroke-width="2"/>');
      sb.add('<g stroke="#4a2c0e" stroke-width="7" stroke-linecap="round">');
      for (n in 0...N) for (d in [2, 3, 4, 5]) { var t = nb[n][d]; if (t >= 0) { var a = P(n); var c = P(t); sb.add('<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + c[0] + '" y2="' + c[1] + '"/>'); } }
      sb.add('</g>');
      for (n in 0...N) { var a = P(n); sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="11" fill="#4a2c0e"/>'); }
      sb.add(World.marks(ui, P, 62));
      for (n in 0...N) if (b[n] != 0) { var a = P(n); sb.add(World.disc(a[0], a[1], 58, b[n] > 0, false)); }
      sb.add(World.targetMarks(ui, P, 62));
      if (ui.thumb != true) for (n in 0...N) { var a = P(n); sb.add(World.hitC(n, a[0], a[1], 82)); }
      sb.add('</svg>');
      return sb.toString();
    }
    var c = 100.0; var o = 34.0; var size = o * 2 + c * 8;
    function P(n:Int):Array<Float> { var x = flip ? 7 - X[n] : X[n]; var y = flip ? 7 - Y[n] : Y[n]; return [o + x * c + c / 2, o + y * c + c / 2]; }
    var lt = kind == "fierges" ? "#ead6ab" : "#f1dfba"; var dk = kind == "fierges" ? "#7d5330" : "#8a5b2e";
    sb.add('<svg viewBox="0 0 ' + size + ' ' + size + '">' + World.DEFS);
    sb.add('<rect x="0" y="0" width="' + size + '" height="' + size + '" rx="18" fill="#3a2410"/><rect x="10" y="10" width="' + (size - 20) + '" height="' + (size - 20) + '" rx="12" fill="url(#wgW)" opacity=".35"/>');
    for (y in 0...8) for (x in 0...8) sb.add('<rect x="' + (o + x * c) + '" y="' + (o + y * c) + '" width="' + c + '" height="' + c + '" fill="' + ((x + y) % 2 == 1 ? dk : lt) + '"/>');
    sb.add('<rect x="' + o + '" y="' + o + '" width="' + (c * 8) + '" height="' + (c * 8) + '" fill="none" stroke="#2a170a" stroke-width="3"/>');
    if (ui.thumb != true) for (x in 0...8) {
      var fx = flip ? 7 - x : x; var fy = flip ? 7 - x : x;
      sb.add('<text x="' + (o + x * c + c / 2) + '" y="' + (size - 9) + '" text-anchor="middle" font-size="20" fill="#e9cf8c" font-family="Georgia,serif">' + "abcdefgh".charAt(fx) + '</text>');
      sb.add('<text x="17" y="' + (o + x * c + c / 2 + 7) + '" text-anchor="middle" font-size="20" fill="#e9cf8c" font-family="Georgia,serif">' + (8 - fy) + '</text>');
    }
    sb.add(World.marks(ui, P, 44));
    for (n in 0...N) if (b[n] != 0) { var a = P(n); sb.add(World.disc(a[0], a[1], 38, b[n] > 0, b[n] == 2 || b[n] == -2)); }
    sb.add(World.targetMarks(ui, P, 44));
    if (ui.thumb != true) for (n in 0...N) { var a = P(n); sb.add(World.hit(n, a[0] - c / 2, a[1] - c / 2, c, c)); }
    sb.add('</svg>');
    return sb.toString();
  }
}

/* =====================================================================================
   Oware (abapa), a mancala mais jogada da África Ocidental
   ===================================================================================== */
class Oware extends WGame {
  public function new() {
    super();
    id = "mancala"; name = "Mancala (oware)"; era = "África · família de jogos com milhares de anos";
    sides = ["Você embaixo", "Em cima"]; flipOk = false;
    story = [
      "Mancala não é um jogo, é uma família: centenas de jogos de semear e colher sementes em covas, jogados na África, no Oriente Médio, na Ásia e no Caribe. A palavra vem do árabe naqala, mover.",
      "Tabuleiros de covas escavadas em pedra aparecem em sítios muito antigos da África e do Oriente Médio, e o jogo é ensinado de geração em geração até hoje. Em muitas regiões, contar e distribuir sementes era também uma forma de aprender matemática.",
      "Aqui se joga o oware (ou awalé), a versão mais difundida da África Ocidental, com duas fileiras de seis covas e 48 sementes. Como o xadrez, não tem sorte nenhuma: tudo é cálculo."];
    rules = [
      "Cada jogador tem as 6 covas do seu lado (o seu é o de baixo). Começa com 4 sementes em cada cova.",
      "Na sua vez, pegue todas as sementes de uma cova sua e distribua uma por cova, no sentido anti-horário (para a direita no seu lado). Se a cova de origem tiver 12 sementes ou mais, ela é pulada.",
      "Colheita: se a última semente cair numa cova do adversário e ela ficar com 2 ou 3 sementes, você colhe essas sementes, e também as das covas anteriores do adversário que tiverem 2 ou 3, em sequência.",
      "Não pode colher todas as sementes do adversário de uma vez (a colheita é anulada). Se o adversário ficar sem sementes, você é obrigado a jogar de modo a dar sementes a ele.",
      "Vence quem colher mais de 24 sementes. Se ninguém puder mais colher, cada um fica com as sementes do seu lado."];
    pieces = [["Semente", "Todas iguais: o que importa é em qual cova estão e quantas são."]];
  }
  override public function init():Dynamic return { p: [for (i in 0...12) 4], st: [0, 0], turn: 1, q: 0 };
  inline function mine(i:Int, side:Int):Bool return side == 1 ? i < 6 : i >= 6;
  function sow(p:Array<Int>, i:Int):Int { var n = p[i]; p[i] = 0; var j = i; while (n > 0) { j = (j + 1) % 12; if (j == i) continue; p[j]++; n--; } return j; }
  function rowSum(p:Array<Int>, side:Int):Int { var t = 0; for (i in 0...12) if (mine(i, side)) t += p[i]; return t; }
  override public function moves(s:Dynamic):Array<Dynamic> {
    var p:Array<Int> = s.p; var side:Int = s.turn;
    var all:Array<Dynamic> = [for (i in 0...12) if (mine(i, side) && p[i] > 0) { f: -1, t: i }];
    if (rowSum(p, -side) == 0) {
      var feed = [for (m in all) { var c = p.copy(); sow(c, m.t); rowSum(c, -side) > 0 ? m : null; }];
      all = [for (m in feed) if (m != null) m];
    }
    return all;
  }
  override public function apply(s:Dynamic, m:Dynamic):Dynamic {
    var p:Array<Int> = (s.p : Array<Int>).copy(); var side:Int = s.turn; var st:Array<Int> = (s.st : Array<Int>).copy();
    var last = sow(p, m.t);
    var got = 0; var c = p.copy(); var j = last;
    while (!mine(j, side) && (c[j] == 2 || c[j] == 3)) { got += c[j]; c[j] = 0; j = (j + 11) % 12; if (mine(j, side)) break; }
    if (got > 0 && rowSum(c, -side) > 0) { p = c; st[side == 1 ? 0 : 1] += got; }
    else got = 0;
    return { p: p, st: st, turn: -side, q: got > 0 ? 0 : (s.q : Int) + 1 };
  }
  override public function over(s:Dynamic, ms:Array<Dynamic>):Dynamic {
    var st:Array<Int> = s.st;
    if (st[0] > 24) return { w: 1, why: st[0] + " sementes a " + st[1] };
    if (st[1] > 24) return { w: -1, why: st[1] + " sementes a " + st[0] };
    if (st[0] == 24 && st[1] == 24) return { w: 0, why: "24 a 24" };
    if (ms.length == 0 || (s.q : Int) >= 100) {
      var p:Array<Int> = s.p; var a = st[0] + rowSum(p, 1); var b = st[1] + rowSum(p, -1);
      return { w: a > b ? 1 : (b > a ? -1 : 0), why: (ms.length == 0 ? "sem jogadas possíveis" : "100 jogadas sem colheita") + ": " + a + " a " + b + " sementes" };
    }
    return null;
  }
  override public function eval(s:Dynamic):Float {
    var st:Array<Int> = s.st; var p:Array<Int> = s.p;
    var v = (st[0] - st[1]) * 100.0;
    for (i in 0...12) { var x = p[i]; if (x == 1 || x == 2) v += (i < 6 ? -6 : 6); if (x > 11) v += (i < 6 ? 8 : -8); }
    v += (rowSum(p, 1) - rowSum(p, -1)) * 2;
    return v;
  }
  override public function cfg(level:Int):Array<Float> return [[0.0, 0, 0], [2.0, 200, 40], [6.0, 900, 0], [16.0, 2500, 0], [30.0, 4000, 0]][level];
  override public function src(m:Dynamic):Int return -1;
  override public function lastCells(s:Dynamic, m:Dynamic):Array<Int> return [m.t];
  override public function label(s:Dynamic, m:Dynamic):String { var i:Int = m.t; var p:Array<Int> = s.p; return "cova " + ((i % 6) + 1) + " (" + p[i] + (p[i] == 1 ? " semente)" : " sementes)"); }
  override public function key(s:Dynamic):String return (s.p : Array<Int>).join(",") + "|" + s.turn;
  override public function status(s:Dynamic):String { var st:Array<Int> = s.st; return "Colhidas: você " + (st[World.humanSide() == 1 ? 0 : 1]) + " · computador " + (st[World.humanSide() == 1 ? 1 : 0]) + " (vence quem passar de 24)"; }
  override public function svg(s:Dynamic, ui:Dynamic):String {
    var p:Array<Int> = s.p; var st:Array<Int> = s.st;
    var bottom = ui.human == -1 ? -1 : 1;
    var sb = new StringBuf();
    sb.add('<svg viewBox="0 0 1000 420">' + World.DEFS);
    sb.add('<rect x="6" y="20" width="988" height="380" rx="150" fill="#6b3f1d"/><rect x="18" y="32" width="964" height="356" rx="140" fill="url(#wgW)" opacity=".55"/>');
    sb.add('<rect x="18" y="32" width="964" height="356" rx="140" fill="none" stroke="#3a2008" stroke-width="4"/>');
    function pos(i:Int):Array<Float> {
      var lowRow = mine(i, bottom);
      var k = i % 6;
      var col = bottom == 1 ? (lowRow ? k : 5 - k) : (lowRow ? k : 5 - k);
      return [218 + col * 113, lowRow ? 280 : 140];
    }
    for (sd in [-1, 1]) {
      var x = sd == bottom ? 905 : 95; var n = st[sd == 1 ? 0 : 1];
      sb.add('<ellipse cx="' + x + '" cy="210" rx="62" ry="150" fill="#4a2810" stroke="#2a1405" stroke-width="3"/><ellipse cx="' + x + '" cy="214" rx="54" ry="140" fill="rgba(0,0,0,.25)"/>');
      sb.add(seeds(x, 210, n, 40, 120, 1000 + sd));
      sb.add('<text x="' + x + '" y="' + (sd == bottom ? 395 : 45) + '" text-anchor="middle" font-size="26" font-weight="700" fill="#fff1c4" font-family="Georgia,serif">' + n + '</text>');
    }
    if (ui.thumb != true && ui.last != null) for (c in (ui.last : Array<Int>)) { var a = pos(c); sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="54" fill="rgba(240,200,60,.35)"/>'); }
    for (i in 0...12) {
      var a = pos(i);
      sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="48" fill="#4a2810" stroke="#2a1405" stroke-width="3"/><circle cx="' + a[0] + '" cy="' + (a[1] + 4) + '" r="42" fill="rgba(0,0,0,.28)"/>');
      sb.add(seeds(a[0], a[1], p[i], 34, 34, i * 31 + 7));
      var lowRow = mine(i, bottom);
      sb.add('<text x="' + a[0] + '" y="' + (lowRow ? a[1] + 76 : a[1] - 60) + '" text-anchor="middle" font-size="24" font-weight="700" fill="' + (lowRow ? "#fff1c4" : "#e9cf8c") + '" font-family="Georgia,serif">' + p[i] + '</text>');
      if (ui.my == true && ui.srcs != null && (ui.srcs : Array<Int>).indexOf(i) >= 0) sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="51" fill="none" stroke="#2e9d4c" stroke-width="5" stroke-dasharray="10 7"/>');
      if (ui.thumb != true) sb.add(World.hitC(i, a[0], a[1], 54));
    }
    sb.add('</svg>');
    return sb.toString();
  }
  static function seeds(x:Float, y:Float, n:Int, rx:Float, ry:Float, seed:Int):String {
    var s = new StringBuf(); var k = seed;
    var cols = ["#efe3c4", "#d9c08e", "#c8a46a", "#f6ead0"];
    for (i in 0...Std.int(Math.min(n, 30))) {
      k = (k * 1103515245 + 12345) & 0x7fffffff;
      var a = (k % 1000) / 1000 * Math.PI * 2; k = (k * 1103515245 + 12345) & 0x7fffffff;
      var r = Math.sqrt((k % 1000) / 1000);
      var sx = x + Math.cos(a) * r * (rx - 9); var sy = y + Math.sin(a) * r * (ry - 9);
      s.add('<ellipse cx="' + Math.round(sx) + '" cy="' + Math.round(sy) + '" rx="9" ry="7" transform="rotate(' + (i * 37 % 180) + ' ' + Math.round(sx) + ' ' + Math.round(sy) + ')" fill="' + cols[i % 4] + '" stroke="#6b4a22" stroke-width="1.5"/>');
    }
    return s.toString();
  }
}

/* =====================================================================================
   Tafl (hnefatafl, regras de Copenhague simplificadas) e Tablut (Lineu, 1732)
   ===================================================================================== */
class Tafl extends WGame {
  var hnef:Bool; var n:Int; var throne:Int;
  public function new(h:Bool) {
    super();
    hnef = h; n = h ? 11 : 9; throne = Std.int(n * n / 2);
    sides = ["Defensores (rei)", "Atacantes"]; first = -1;
    if (h) {
      id = "tafl"; name = "Tafl (hnefatafl)"; era = "Escandinávia · época viking, séculos IV a XII";
      story = [
        "Antes de o xadrez chegar ao norte da Europa, os povos germânicos e os vikings jogavam tafl, uma família de jogos de cerco. O mais famoso é o hnefatafl, \"a mesa do rei\".",
        "O jogo é desigual de propósito: o rei e os seus defensores começam no centro, cercados por um exército duas vezes maior. O rei quer fugir para um dos cantos; os atacantes querem prendê-lo.",
        "Tabuleiros e peças de tafl aparecem em túmulos vikings e em sagas islandesas. Quando o xadrez chegou, por volta do ano 1100, tomou o lugar do tafl, e as regras antigas se perderam. As que se jogam hoje são reconstruções; aqui usamos as de Copenhague, simplificadas."];
      rules = [
        "Os atacantes (escuros, 24 peças) começam. Os defensores (claros, 12 peças) protegem o rei, que começa no trono, no centro.",
        "Todas as peças andam como a torre do xadrez: quantas casas quiserem na horizontal ou vertical, sem saltar. Só o rei pode parar no trono e nos quatro cantos.",
        "Captura: prenda uma peça adversária entre duas suas, na mesma linha ou coluna. Os cantos e o trono vazio também servem de \"parede\". Quem se mete entre duas peças não é capturado.",
        "O rei vence se chegar a um canto. Os atacantes vencem se cercarem o rei pelos quatro lados (o trono conta como lado). O rei não pode ser capturado na borda.",
        "Quem ficar sem lances perde. Repetir três vezes a mesma posição é empate."];
    } else {
      id = "tablut"; name = "Tablut"; era = "Lapônia (povo sámi) · registrado por Lineu em 1732";
      story = [
        "O tablut é a única variante de tafl cujas regras foram escritas por alguém que viu o jogo sendo jogado. Em 1732, o naturalista sueco Carl Linnaeus (Lineu), o pai da classificação das espécies, viajou pela Lapônia e anotou as regras num diário, em latim.",
        "O tabuleiro tem 9 x 9 casas. Os sámi chamavam os defensores de suecos e os atacantes de moscovitas. O rei, ou konakis, foge pelo tabuleiro para chegar à borda.",
        "O diário de Lineu foi traduzido para o inglês em 1811 com alguns erros, e por isso há várias versões das regras. Aqui usamos a mais jogada hoje."];
      rules = [
        "Os atacantes (escuros, 16 peças) começam. Os defensores (claros, 8 peças) protegem o rei, que começa no trono, no centro.",
        "Todas as peças andam como a torre do xadrez. Ninguém pode parar no trono nem passar por ele, a não ser o rei.",
        "Captura: prenda uma peça adversária entre duas suas, na mesma linha ou coluna. O trono vazio também serve de parede.",
        "O rei vence se chegar a qualquer casa da borda. Longe do trono, o rei é capturado como as outras peças (entre dois atacantes); no trono ou ao lado dele, precisa ser cercado pelos quatro lados.",
        "Quem ficar sem lances perde. Repetir três vezes a mesma posição é empate."];
    }
    pieces = [["Rei", hnef ? "Anda como torre; foge para um canto. Só ele para no trono e nos cantos." : "Anda como torre; foge para qualquer casa da borda."], ["Defensor", "Anda como torre; ajuda a proteger e a abrir caminho para o rei."], ["Atacante", "Anda como torre; cerca e captura."]];
  }
  inline function fx(c:Int):Int return c % n;
  inline function fy(c:Int):Int return Std.int(c / n);
  inline function cell(x:Int, y:Int):Int return (x < 0 || y < 0 || x >= n || y >= n) ? -1 : y * n + x;
  function corner(c:Int):Bool { var x = fx(c); var y = fy(c); return (x == 0 || x == n - 1) && (y == 0 || y == n - 1); }
  function restricted(c:Int):Bool return c == throne || (hnef && corner(c));
  function goal(c:Int):Bool { if (hnef) return corner(c); var x = fx(c); var y = fy(c); return x == 0 || y == 0 || x == n - 1 || y == n - 1; }
  override public function init():Dynamic {
    var b = [for (i in 0...n * n) 0];
    var m = Std.int(n / 2);
    if (hnef) {
      for (k in 3...8) { b[cell(k, 0)] = -1; b[cell(k, 10)] = -1; b[cell(0, k)] = -1; b[cell(10, k)] = -1; }
      for (q in [[5, 1], [5, 9], [1, 5], [9, 5]]) b[cell(q[0], q[1])] = -1;
      for (q in [[5, 3], [4, 4], [5, 4], [6, 4], [3, 5], [4, 5], [6, 5], [7, 5], [4, 6], [5, 6], [6, 6], [5, 7]]) b[cell(q[0], q[1])] = 1;
    } else {
      for (k in 3...6) { b[cell(k, 0)] = -1; b[cell(k, 8)] = -1; b[cell(0, k)] = -1; b[cell(8, k)] = -1; }
      for (q in [[4, 1], [4, 7], [1, 4], [7, 4]]) b[cell(q[0], q[1])] = -1;
      for (q in [[4, 2], [4, 3], [4, 5], [4, 6], [2, 4], [3, 4], [5, 4], [6, 4]]) b[cell(q[0], q[1])] = 1;
    }
    b[cell(m, m)] = 2;
    return { b: b, turn: -1, kc: false };
  }
  static var D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  override public function moves(s:Dynamic):Array<Dynamic> {
    var b:Array<Int> = s.b; var side:Int = s.turn; var out:Array<Dynamic> = [];
    for (c in 0...n * n) {
      if (b[c] * side <= 0) continue;
      var king = b[c] == 2;
      for (d in D) {
        var x = fx(c) + d[0]; var y = fy(c) + d[1];
        while (true) {
          var t = cell(x, y); if (t < 0 || b[t] != 0) break;
          if (restricted(t) && !king) break;
          out.push({ f: c, t: t });
          x += d[0]; y += d[1];
        }
      }
    }
    return out;
  }
  function hostile(b:Array<Int>, c:Int, side:Int):Bool {
    if (c < 0) return false;
    if (b[c] != 0) return (b[c] > 0 ? 1 : -1) == side;
    return restricted(c);
  }
  function kingSq(b:Array<Int>):Int { for (c in 0...n * n) if (b[c] == 2) return c; return -1; }
  override public function apply(s:Dynamic, m:Dynamic):Dynamic {
    var b:Array<Int> = (s.b : Array<Int>).copy(); var side:Int = s.turn; var t:Int = m.t;
    b[t] = b[m.f]; b[m.f] = 0;
    for (d in D) {
      var a = cell(fx(t) + d[0], fy(t) + d[1]); if (a < 0) continue;
      if (b[a] == 0 || b[a] == 2 || (b[a] > 0 ? 1 : -1) == side) continue;
      var c2 = cell(fx(t) + 2 * d[0], fy(t) + 2 * d[1]);
      if (hostile(b, c2, side)) b[a] = 0;
    }
    var kc = false;
    if (side == -1) {
      var k = kingSq(b);
      if (k >= 0) {
        function att(c:Int):Bool return c >= 0 && (b[c] == -1 || c == throne);
        var x = fx(k); var y = fy(k);
        var near = k == throne || Math.abs(x - fx(throne)) + Math.abs(y - fy(throne)) == 1;
        if (hnef) {
          var edge = x == 0 || y == 0 || x == n - 1 || y == n - 1;
          if (!edge && att(cell(x + 1, y)) && att(cell(x - 1, y)) && att(cell(x, y + 1)) && att(cell(x, y - 1))) kc = true;
        } else if (near) {
          if (att(cell(x + 1, y)) && att(cell(x - 1, y)) && att(cell(x, y + 1)) && att(cell(x, y - 1))) kc = true;
        } else {
          function h(c:Int):Bool return c >= 0 && (b[c] == -1 || (c == throne && b[c] == 0));
          if ((h(cell(x + 1, y)) && h(cell(x - 1, y))) || (h(cell(x, y + 1)) && h(cell(x, y - 1)))) kc = true;
        }
        if (kc) b[k] = 0;
      }
    }
    return { b: b, turn: -side, kc: kc };
  }
  override public function over(s:Dynamic, ms:Array<Dynamic>):Dynamic {
    if (s.kc == true) return { w: -1, why: "o rei foi capturado" };
    var b:Array<Int> = s.b; var k = kingSq(b);
    if (k >= 0 && goal(k)) return { w: 1, why: hnef ? "o rei chegou a um canto" : "o rei chegou à borda" };
    var att = 0; for (p in b) if (p == -1) att++;
    if (att == 0) return { w: 1, why: "todos os atacantes capturados" };
    if (ms.length == 0) return { w: -(s.turn : Int), why: "sem lances" };
    return null;
  }
  /* quantos lances de rei até a saída, olhando 2 lances adiante */
  function escapes(b:Array<Int>, k:Int):Array<Int> {
    var one = 0; var two = 0;
    for (d in D) {
      var x = fx(k) + d[0]; var y = fy(k) + d[1];
      while (true) {
        var t = cell(x, y); if (t < 0 || b[t] != 0) break;
        if (goal(t)) one++;
        else if (!restricted(t)) {
          for (e in D) {
            if (e[0] == -d[0] && e[1] == -d[1]) continue;
            var xx = fx(t) + e[0]; var yy = fy(t) + e[1];
            while (true) { var u = cell(xx, yy); if (u < 0 || b[u] != 0) break; if (goal(u)) { two++; break; } xx += e[0]; yy += e[1]; }
          }
        }
        x += d[0]; y += d[1];
      }
    }
    return [one, two];
  }
  override public function eval(s:Dynamic):Float {
    var b:Array<Int> = s.b; var def = 0; var att = 0;
    for (p in b) { if (p == 1) def++; if (p == -1) att++; }
    var v = def * 130.0 - att * 100.0;
    var k = kingSq(b); if (k < 0) return -100000;
    var e = escapes(b, k);
    v += e[0] >= 2 ? 3000 : e[0] * 600;
    v += Math.min(e[1], 4) * 70;
    var x = fx(k); var y = fy(k);
    for (d in D) { var c = cell(x + d[0], y + d[1]); if (c >= 0 && b[c] == -1) v -= 55; }
    var mid = (n - 1) / 2;
    v += (Math.abs(x - mid) + Math.abs(y - mid)) * 12;
    if (hnef) for (cc in [cell(1, 1), cell(1, n - 2), cell(n - 2, 1), cell(n - 2, n - 2)]) if (b[cc] == -1) v -= 25;
    return v;
  }
  override public function order(s:Dynamic, ms:Array<Dynamic>):Array<Dynamic> {
    var b:Array<Int> = s.b; var side:Int = s.turn; var k = kingSq(b);
    var sc = [for (m in ms) {
      var t:Int = m.t; var v = 0;
      if (b[m.f] == 2) v += goal(t) ? 100000 : 40;
      if (k >= 0 && Math.abs(fx(t) - fx(k)) + Math.abs(fy(t) - fy(k)) == 1) v += 30;
      for (d in D) { var a = cell(fx(t) + d[0], fy(t) + d[1]); if (a >= 0 && b[a] != 0 && b[a] != 2 && (b[a] > 0 ? 1 : -1) != side && hostile(b, cell(fx(t) + 2 * d[0], fy(t) + 2 * d[1]), side)) v += 500; }
      v;
    }];
    var idx = [for (i in 0...ms.length) i]; idx.sort(function(a, c) return sc[c] - sc[a]);
    return [for (i in idx) ms[i]];
  }
  override public function cfg(level:Int):Array<Float> return [[0.0, 0, 0], [1.0, 300, 60], [2.0, 1200, 0], [4.0, 3000, 0], [6.0, 4500, 0]][level];
  function nm(c:Int):String return "abcdefghijk".charAt(fx(c)) + (n - fy(c));
  override public function label(s:Dynamic, m:Dynamic):String { var b:Array<Int> = s.b; return (b[m.f] == 2 ? "Rei " : "") + nm(m.f) + "-" + nm(m.t); }
  override public function key(s:Dynamic):String return (s.b : Array<Int>).join("") + s.turn;
  override public function status(s:Dynamic):String { var b:Array<Int> = s.b; var d = 0; var a = 0; for (p in b) { if (p == 1) d++; if (p == -1) a++; } return "Defensores " + d + " + rei · Atacantes " + a; }
  override public function svg(s:Dynamic, ui:Dynamic):String {
    var b:Array<Int> = s.b; var flip = ui.flip == true;
    var c = 900.0 / n; var o = 30.0; var size = o * 2 + 900;
    function P(q:Int):Array<Float> { var x = flip ? n - 1 - fx(q) : fx(q); var y = flip ? n - 1 - fy(q) : fy(q); return [o + x * c + c / 2, o + y * c + c / 2]; }
    var sb = new StringBuf();
    sb.add('<svg viewBox="0 0 ' + size + ' ' + size + '">' + World.DEFS);
    sb.add('<rect width="' + size + '" height="' + size + '" rx="20" fill="#3b2a1a"/>');
    for (q in 0...n * n) {
      var a = P(q); var sp = restricted(q) || (!hnef && goal(q) && false);
      sb.add('<rect x="' + (a[0] - c / 2) + '" y="' + (a[1] - c / 2) + '" width="' + c + '" height="' + c + '" fill="' + (((fx(q) + fy(q)) % 2 == 0) ? "#e8d4a6" : "#dcc493") + '" stroke="#7a5a32" stroke-width="1.5"/>');
      if (sp) sb.add('<rect x="' + (a[0] - c / 2 + 4) + '" y="' + (a[1] - c / 2 + 4) + '" width="' + (c - 8) + '" height="' + (c - 8) + '" fill="#9c6b3a" opacity=".55"/><path d="M' + (a[0] - c * .3) + ',' + (a[1] - c * .3) + 'L' + (a[0] + c * .3) + ',' + (a[1] + c * .3) + 'M' + (a[0] + c * .3) + ',' + (a[1] - c * .3) + 'L' + (a[0] - c * .3) + ',' + (a[1] + c * .3) + '" stroke="#5b3714" stroke-width="3"/>');
    }
    if (!hnef) sb.add('<rect x="' + o + '" y="' + o + '" width="900" height="900" fill="none" stroke="#c8963a" stroke-width="5" stroke-dasharray="14 8" opacity=".8"/>');
    sb.add(World.marks(ui, P, c * 0.46));
    for (q in 0...n * n) if (b[q] != 0) { var a = P(q); sb.add(World.disc(a[0], a[1], c * 0.38, b[q] > 0, b[q] == 2)); }
    sb.add(World.targetMarks(ui, P, c * 0.46));
    if (ui.thumb != true) for (q in 0...n * n) { var a = P(q); sb.add(World.hit(q, a[0] - c / 2, a[1] - c / 2, c, c)); }
    sb.add('</svg>');
    return sb.toString();
  }
}
#end
