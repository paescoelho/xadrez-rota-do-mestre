package;

import Engine;
import Data;
import Brain;
#if flash
import UiFlash as Ui;
#else
import UiJs as Ui;
#end

/* Executor genérico de exercícios: problemas do Lichess, perguntas de um lance, erros próprios, linhas de repertório,
   cálculo às cegas e Puzzle Storm. */
class Run {
  public var title:String; public var tasks:Array<Dynamic>; public var i = 0; public var opts:Dynamic;
  public var res:Array<Dynamic> = []; public var pos:Pos; public var step = 0; public var t0 = 0.0;
  public var state = ""; public var msg = ""; public var cls = ""; public var color = 1; public var failed = false;
  public var shownFen:String = null; public var log:Array<String> = []; public var last:Array<Int> = null; public var arrows:Array<Array<Int>> = [];
  public var marks:Array<Array<Int>> = []; public var judging = false; public var gen = 0;
  public var lives = 3;
  public var stormEnd = 0.0; public var score = 0; public var streak = 0; public var rating = 0; public var errors = 0; public var timer:Dynamic = null;
  public function new() {}
}

class Drills {
  public static var R:Run = null;

  /* opts: { storm, placement, back:Void->Void, done:Array<Dynamic>->Void, noHint } */
  public static function run(title:String, tasks:Array<Dynamic>, opts:Dynamic) {
    if (tasks == null || tasks.length == 0) {
      Ui.page(title, opts.back);
      Ui.p("Não há exercícios disponíveis aqui agora.", "muted");
      Ui.btns([["Voltar", opts.back, "pri"]]);
      return;
    }
    var r = new Run();
    r.title = title; r.tasks = tasks; r.opts = opts;
    R = r;
    Ui.boardPage(title, function() quit());
    if (opts.rush == true) r.rating = Std.int(Math.max(400, (Profile.d.pzElo : Int) - 500));
    if (opts.storm == true) {
      r.rating = Std.int(Math.max(400, (Profile.d.pzElo : Int) - 350));
      r.stormEnd = App.now() + 180000;
      r.timer = Ui.every(250, stormTick);
    }
    startTask();
  }
  static function quit() {
    var r = R; R = null;
    if (r != null) { Ui.cancel(r.timer); r.gen++; }
    if (r != null && r.res.length > 0 && r.opts.storm != true && r.opts.done != null) { r.opts.done(r.res); return; }
    r.opts.back();
  }
  static function task():Dynamic return R.tasks[R.i];
  static function startTask() {
    var r = R; var t = task();
    r.pos = Engine.posFromFEN(t.fen); r.step = 0; r.failed = false; r.msg = ""; r.cls = ""; r.log = [];
    r.arrows = []; r.marks = []; r.last = null; r.shownFen = null; r.judging = false;
    r.gen++;
    var k:String = t.k;
    if (k == "pz") {
      r.color = -r.pos.turn;
      r.state = "wait";
      draw();
      var g = r.gen;
      Ui.later(r.opts.storm == true ? 250 : 650, function() {
        if (R != r || r.gen != g) return;
        autoMove(t.moves[0]);
        if (t.blind == true) r.shownFen = Engine.toFEN(r.pos);
        r.state = "play"; r.t0 = App.now();
        draw();
      });
      return;
    }
    if (k == "line") {
      r.color = t.color;
      r.state = "play"; r.t0 = App.now();
      if (r.pos.turn != r.color) autoMove(t.ucis[0]);
      draw();
      return;
    }
    r.color = r.pos.turn;
    r.state = "play"; r.t0 = App.now();
    draw();
  }
  static function autoMove(uci:String) {
    var r = R;
    var m = Engine.uciToMove(r.pos, uci);
    if (m < 0) return;
    var s = Engine.moveToSAN(r.pos, m);
    if (r.shownFen != null) r.log.push("Resposta: " + s);
    Engine.makeMove(r.pos, m); r.pos.stack = [];
    r.step++;
    if (r.shownFen == null) r.last = App.lastOf(uci);
  }
  static function draw() {
    var r = R; var t = task(); var b = Ui.board;
    if (b == null) return;
    b.fen = r.shownFen != null ? r.shownFen : Engine.toFEN(r.pos);
    b.flip = r.color == -1;
    b.last = r.shownFen != null ? null : r.last;
    b.check = r.shownFen != null ? -1 : App.checkSq(r.pos);
    b.arrows = r.arrows; b.marks = r.marks;
    b.blind = r.shownFen != null;
    b.legal = r.state == "play" && !r.judging ? App.legalUcis(r.pos) : null;
    b.onMove = onMove; b.onSquare = null;
    b.clearSel(); b.draw();
    var k:String = t.k;
    var head = r.opts.storm == true ? "Puzzle Storm" : (r.opts.rush == true ? "Puzzle Rush · problema " + (r.i + 1) : ("Exercício " + (r.i + 1) + " de " + r.tasks.length));
    if (t.rating != null && r.opts.placement != true && k != "line") head += " · " + t.rating;
    Ui.bars(head, (r.color == 1 ? "Brancas" : "Pretas") + " jogam" + (r.opts.storm == true ? "  ·  " + r.score + " pts" : ""), false, true);
    Ui.panel();
    if (r.opts.rush == true) Ui.p("Vidas: " + [for (i in 0...r.lives) "♥"].join(" ") + "  ·  acertos: " + r.score + "  ·  nível " + r.rating, "gold big");
    if (r.opts.storm == true) Ui.p("Tempo: " + stormLeft() + "  ·  acertos: " + r.score + "  ·  sequência: " + r.streak, "gold big");
    var prompt = "";
    if (k == "pz") prompt = t.blind == true ? "Cálculo sem mover as peças: as peças NÃO andam no tabuleiro. Jogue a sequência inteira de cabeça; as respostas aparecem só em texto." : ((r.color == 1 ? "Brancas" : "Pretas") + " jogam e ganham. Encontre o melhor lance.");
    else if (k == "q") prompt = t.q;
    else if (k == "mine") prompt = "Um erro seu de partida: encontre o lance mais indicado nesta posição.";
    else if (k == "line") prompt = t.title + " · " + t.name + ": jogue os lances do seu repertório.";
    if (r.state == "wait") prompt = "Observe o lance do adversário…";
    Ui.p(prompt, "");
    if (r.log.length > 0) Ui.p(r.log.join("  ·  "), "gold");
    if (r.judging) Ui.p("Conferindo seu lance…", "muted");
    if (r.msg != "") Ui.p(r.msg, r.cls);
    if (r.state == "ok" || r.state == "fail") explain(t);
    if (r.opts.storm == true) { Ui.btns([["Encerrar", stormEnd, "warn"]]); return; }
    var bs:Array<Array<Dynamic>> = [];
    if (r.state == "play") {
      if (r.opts.placement != true && r.opts.rush != true && r.opts.exam != true && k != "line") bs.push(["Dica", hint]);
      bs.push([r.opts.placement == true ? "Não sei" : "Ver solução", giveUp]);
    } else if (r.state == "ok" || r.state == "fail") {
      bs.push([r.i >= r.tasks.length - 1 ? "Concluir" : "Próximo", next, "pri"]);
      if (k == "pz" && r.opts.placement != true) bs.push(["Rever solução", replay]);
    }
    bs.push(["Sair", quit]);
    Ui.btns(bs);
  }
  static function explain(t:Dynamic) {
    var k:String = t.k;
    if (R.opts.placement == true) return;
    if (k == "pz") {
      var tags:Array<String> = t.tags;
      var names = [for (x in tags) if (Content.isMotif(x) || x == "endgame" || x == "opening") Content.themeName(x)];
      if (names.length > 0) Ui.p("Tema: " + names.join(", "), "gold");
      { var bm = Content.bestMotif(tags); if (bm != null) Ui.p(Content.themeName(bm) + ": " + Content.themeDesc(bm), "muted"); }
      Ui.p("Solução: " + solutionText(t), "muted");
    } else if (k == "q") {
      if (t.note != null) Ui.p(t.note, "muted");
    } else if (k == "mine") {
      if (t.why != null && t.why != "") Ui.p("Na partida: " + t.why, "muted");
    } else if (k == "line") {
      if (t.note != null) Ui.p(t.note, "gold");
    }
  }
  static function solutionText(t:Dynamic):String {
    var p = Engine.posFromFEN(t.fen); var out:Array<String> = [];
    var mv:Array<String> = t.moves;
    for (i in 0...mv.length) {
      var m = Engine.uciToMove(p, mv[i]); if (m < 0) break;
      var s = Engine.moveToSAN(p, m);
      if (i > 0) out.push((p.turn == 1 ? p.full + ". " : p.full + "… ") + s);
      Engine.makeMove(p, m);
    }
    return out.join(" ");
  }
  static function onMove(u4:String) {
    var r = R;
    if (r.state != "play" || r.judging) return;
    App.pickPromo(App.legalUcis(r.pos), u4, function(uci) check(uci));
  }
  static function isMateAfter(uci:String):Bool {
    var p = R.pos.clone(); var m = Engine.uciToMove(p, uci); if (m < 0) return false;
    Engine.makeMove(p, m);
    return Engine.inCheck(p) && Engine.legalMoves(p).length == 0;
  }
  static function check(uci:String) {
    var r = R; var t = task(); var k:String = t.k;
    if (k == "pz") {
      var mv:Array<String> = t.moves;
      var exp = mv[r.step];
      var ok = uci == exp || (r.step == mv.length - 1 && isMateAfter(uci));
      if (!ok) { fail("Não é isso."); return; }
      var s = App.san(Engine.toFEN(r.pos), uci);
      if (r.shownFen != null) r.log.push("Você: " + s);
      autoMoveUser(uci);
      if (r.step >= mv.length) { solved(r.shownFen != null ? "Correto! Você calculou a linha inteira." : "Correto!"); return; }
      r.state = "wait"; draw();
      var g = r.gen;
      Ui.later(r.opts.storm == true ? 200 : 450, function() {
        if (R != r || r.gen != g) return;
        autoMove(mv[r.step]); r.state = "play"; draw();
      });
      return;
    }
    if (k == "q") {
      var acc:Array<String> = t.accept;
      if (acc.indexOf(uci) >= 0) { autoMoveUser(uci); solved("Correto!"); }
      else { fail("Não é o lance esperado. Bons lances aqui: " + [for (a in acc) App.san(t.fen, a)].join(", ") + "."); }
      return;
    }
    if (k == "mine") {
      if (uci == t.best) { autoMoveUser(uci); solved("Correto! Esse é o lance mais indicado."); return; }
      r.judging = true; draw();
      var g = r.gen;
      Think.run({ cmd: "judge", fen: t.fen, uci: uci }, function(j:Dynamic) {
        if (R != r || r.gen != g) return;
        r.judging = false;
        var loss:Float = j.loss;
        if (loss <= 3) { autoMoveUser(uci); solved("Muito bom: tão bom quanto o lance indicado (" + App.san(t.fen, t.best) + ")."); }
        else fail("Ainda não. O mais indicado era " + App.san(t.fen, t.best) + ".");
      });
      return;
    }
    if (k == "line") {
      var ucis:Array<String> = t.ucis;
      var exp = ucis[r.step];
      if (uci != exp) {
        r.failed = true;
        r.msg = "No seu repertório o lance é " + App.san(Engine.toFEN(r.pos), exp) + " (seta). Jogue-o para continuar.";
        r.cls = "warn"; r.arrows = [App.arrow(exp, 0)];
        draw(); return;
      }
      r.arrows = []; r.msg = "";
      autoMoveUser(uci);
      if (r.step < ucis.length) { autoMove(ucis[r.step]); }
      if (r.step >= ucis.length) {
        if (r.failed) { r.state = "fail"; r.msg = "Linha concluída com erro: ela volta amanhã."; r.cls = "warn"; record(false); draw(); }
        else solved("Linha completa sem erros!");
        return;
      }
      draw();
    }
  }
  static function autoMoveUser(uci:String) {
    var r = R;
    var m = Engine.uciToMove(r.pos, uci); if (m < 0) return;
    Engine.makeMove(r.pos, m); r.pos.stack = []; r.step++;
    if (r.shownFen == null) r.last = App.lastOf(uci);
  }
  static function solved(msg:String) {
    var r = R;
    if (r.failed) { r.state = "fail"; r.msg = "Resolvido, mas com dica: conta como erro e volta para revisão."; r.cls = "warn"; record(false); }
    else { r.state = "ok"; r.msg = msg; r.cls = "good"; record(true); }
    if (r.opts.storm == true) { stormNext(r.state == "ok"); return; }
    if (r.opts.rush == true) { rushNext(r.state == "ok"); return; }
    draw();
  }
  static function fail(msg:String) {
    var r = R;
    r.state = "fail"; r.msg = msg; r.cls = "bad"; r.failed = true;
    record(false);
    if (r.opts.storm == true) { stormNext(false); return; }
    if (r.opts.rush == true) { rushNext(false); return; }
    var t = task();
    if (t.k == "pz" && r.shownFen == null) {
      var mv:Array<String> = t.moves;
      if (r.step < mv.length) r.arrows = [App.arrow(mv[r.step], 0)];
    }
    if (t.k == "q") { var acc:Array<String> = t.accept; r.arrows = [App.arrow(acc[0], 0)]; }
    if (t.k == "mine") r.arrows = [App.arrow(t.best, 0)];
    draw();
  }
  static function record(ok:Bool) {
    var r = R; var t = task(); var k:String = t.k;
    var ms = App.now() - r.t0;
    r.res.push({ id: t.id, ok: ok, ms: ms, dim: t.dim, rating: t.rating, k: k });
    if (r.opts.storm == true || r.opts.rush == true) return;
    if (r.opts.placement == true) { Profile.touch(); return; }
    if (t.srs == true) {
      Profile.srsResult(k == "line" ? "rep" : k, t.id, ok);
      if (k == "pz") { Profile.addDim("tatica", ok); var tg:Array<String> = t.tags; for (x in tg) Profile.addTheme(x, ok); }
      return;
    }
    if (k == "pz") Profile.recordPuzzle(t.id, t.rating, ok, t.tags, ms);
    else if (k == "line") { Profile.srsAdd("rep", t.id, null); if (ok) Profile.srsResult("rep", t.id, true); Profile.addDim("abertura", ok); Profile.save(); }
    else { Profile.addDim(t.dim, ok); Profile.addDim("tempo", ok && ms <= 45000); Profile.touch(); Profile.save(); }
  }
  static function hint() {
    var r = R; var t = task(); var k:String = t.k;
    r.failed = true;
    var u:String = null;
    if (k == "pz") u = t.moves[r.step];
    else if (k == "q") u = t.accept[0];
    else if (k == "mine") u = t.best;
    if (u != null) r.marks = [[Engine.nameSq(u.substr(0, 2)), 3]];
    r.msg = "Dica: a peça destacada é a que deve se mover. (Dica conta como erro e o exercício volta para revisão.)"; r.cls = "warn";
    if (k == "pz") { var tags:Array<String> = t.tags; var bm = Content.bestMotif(tags); if (bm != null) r.msg += " Tema: " + Content.themeName(bm) + "."; }
    draw();
  }
  static function giveUp() {
    var r = R;
    if (r.opts.placement == true) { fail("Sem problema: vamos para a próxima."); return; }
    fail("Veja a solução.");
  }
  static function next() {
    var r = R;
    if (r.i >= r.tasks.length - 1) { finishRun(); return; }
    r.i++;
    startTask();
  }
  static function replay() {
    var r = R; var t = task();
    var g = ++r.gen;
    r.pos = Engine.posFromFEN(t.fen); r.step = 0; r.shownFen = null; r.arrows = []; r.marks = []; r.log = [];
    var mv:Array<String> = t.moves;
    var st = r.state; r.state = "show";
    draw();
    var i = 0;
    function stepFn() {
      if (R != r || r.gen != g) return;
      if (i >= mv.length) { r.state = st; draw(); return; }
      autoMove(mv[i]); i++; draw();
      Ui.later(800, stepFn);
    }
    Ui.later(500, stepFn);
  }
  static function finishRun() {
    var r = R; R = null; Ui.cancel(r.timer);
    if (r.opts.done != null) { r.opts.done(r.res); return; }
    summary(r.title, r.res, r.opts.back);
  }
  public static function summary(title:String, res:Array<Dynamic>, back:Void->Void) {
    var ok = 0; for (x in res) if (x.ok) ok++;
    Ui.page(title, back);
    Ui.p("Você acertou " + ok + " de " + res.length + ".", "big gold");
    Ui.p("Pontuação de quebra-cabeças: " + Profile.d.pzElo, "");
    if (ok < res.length) Ui.p("Os que você errou voltam para revisão no momento certo para fixar (Táticas › Revisões do dia).", "muted");
    Ui.btns([["Voltar", back, "pri"]]);
  }

  /* ---------- Puzzle Rush: 3 vidas, dificuldade crescente ---------- */
  static function rushNext(ok:Bool) {
    var r = R;
    if (ok) { r.score++; r.rating += 60; } else { r.lives--; }
    if (r.lives <= 0) {
      R = null;
      var best:Int = Profile.d.rushBest; var rec = r.score > best;
      if (rec) Profile.d.rushBest = r.score;
      Profile.touch(); Profile.save();
      Ui.page("Puzzle Rush", r.opts.back);
      Ui.p(r.score + " acertos" + (rec ? " · novo recorde!" : ""), "big gold");
      Ui.p("Chegou até o nível " + r.rating + ". Recorde: " + Profile.d.rushBest + ".", "");
      Ui.btns([["Jogar de novo", function() run("Puzzle Rush", [Study.stormTask(Std.int(Math.max(400, (Profile.d.pzElo : Int) - 500)), null)], r.opts), "pri"], ["Voltar", r.opts.back]]);
      return;
    }
    if (!ok) { r.msg = "Errou: restam " + r.lives + (r.lives == 1 ? " vida." : " vidas."); }
    var avoid = new Map<String, Bool>(); for (x in r.res) avoid.set(x.id, true);
    r.tasks.push(Study.stormTask(r.rating, avoid));
    var keep = r.msg;
    r.i++;
    startTask();
    if (!ok) { r.msg = keep; r.cls = "bad"; draw(); }
  }

  /* ---------- Puzzle Storm: 3 minutos ---------- */
  static function stormLeft():String {
    var ms = R.stormEnd - App.now(); if (ms < 0) ms = 0;
    var s = Std.int(ms / 1000);
    return Std.int(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }
  static function stormTick() {
    var r = R;
    if (r == null || r.opts.storm != true) return;
    if (App.now() >= r.stormEnd) { stormEnd(); return; }
    Ui.bars("Puzzle Storm · " + stormLeft(), (r.color == 1 ? "Brancas" : "Pretas") + " jogam  ·  " + r.score + " pts", true, true);
  }
  static function stormNext(ok:Bool) {
    var r = R;
    if (ok) { r.score++; r.streak++; r.rating += 35; }
    else { r.streak = 0; r.errors++; r.stormEnd -= 10000; r.rating -= 20; }
    var avoid = new Map<String, Bool>(); for (x in r.res) avoid.set(x.id, true);
    r.tasks.push(Study.stormTask(r.rating, avoid));
    r.i++;
    startTask();
  }
  static function stormEnd() {
    var r = R; if (r == null) return;
    R = null; Ui.cancel(r.timer); r.gen++;
    var best:Int = Profile.d.stormBest;
    var rec = r.score > best;
    if (rec) Profile.d.stormBest = r.score;
    Profile.addDim("tempo", r.score >= 10);
    Profile.touch(); Profile.save();
    Ui.page("Puzzle Storm", r.opts.back);
    Ui.p(r.score + " acertos em 3 minutos" + (rec ? " · novo recorde!" : ""), "big gold");
    Ui.p("Erros: " + r.errors + " (cada erro custa 10 segundos). Recorde: " + Profile.d.stormBest + ".", "");
    if (r.opts.done != null) { var d:Dynamic->Void = r.opts.done; Ui.btns([["Continuar", function() d(r.res), "pri"]]); }
    else Ui.btns([["Jogar de novo", function() run("Puzzle Storm", [Study.stormTask(Std.int(Math.max(400, (Profile.d.pzElo : Int) - 350)), null)], r.opts), "pri"], ["Voltar", r.opts.back]]);
  }

  /* ---------- finais contra o motor ---------- */
  static var E:Dynamic = null;
  public static function endgame(id:String, back:Void->Void, ?done:Bool->Void) {
    var eg = Content.endgame(id);
    var pos = Engine.posFromFEN(eg.fen);
    E = { eg: eg, pos: pos, human: eg.human, keys: [Engine.posKey(pos)], moves: 0, busy: null, msg: "", cls: "", over: null, back: back, done: done, last: null, hint: null, gen: 0 };
    Ui.boardPage(eg.name, back);
    if (pos.turn != E.human) egCpu(); else egDraw();
  }
  static function goalText(eg:Dynamic):String {
    var n:Int = eg.moves;
    return switch ((eg.goal : String)) {
      case "mate": "Objetivo: dar xeque-mate em até " + n + " lances.";
      case "promote": "Objetivo: promover o peão (e manter a nova dama) em até " + n + " lances.";
      case "draw": "Objetivo: segurar o empate por " + n + " lances (ou forçar empate antes).";
      default: "Objetivo: vencer. Dê mate ou chegue ao lance " + n + " com vantagem decisiva.";
    };
  }
  static function egDraw() {
    var e = E; var b = Ui.board; var eg:Dynamic = e.eg;
    if (b == null) return;
    b.fen = Engine.toFEN(e.pos); b.flip = e.human == -1; b.last = e.last; b.check = App.checkSq(e.pos);
    b.arrows = e.hint != null ? [App.arrow(e.hint, 3)] : []; b.marks = []; b.blind = false; b.onSquare = null;
    b.legal = e.over == null && e.busy == null && e.pos.turn == e.human ? App.legalUcis(e.pos) : null;
    b.onMove = egMove; b.clearSel(); b.draw();
    Ui.bars("Motor (defesa perfeita)", "Você · lance " + e.moves + " de " + eg.moves, e.pos.turn != e.human, e.pos.turn == e.human);
    Ui.panel();
    Ui.p(goalText(eg), "gold");
    Ui.p(eg.tip, "");
    if (e.busy != null) Ui.p(e.busy, "muted");
    if (e.msg != "") Ui.p(e.msg, e.cls);
    var bs:Array<Array<Dynamic>> = [];
    if (e.over == null) bs.push(["Dica", egHint, e.busy == null ? "" : "off"]);
    bs.push(["Recomeçar", function() endgame(eg.id, e.back, e.done), e.over != null && e.over == false ? "pri" : ""]);
    if (e.over == true && e.done != null) bs.push(["Continuar", function() e.done(true), "pri"]);
    bs.push(["Sair", function() { E = null; if (e.done != null && e.over != true) e.done(false) else e.back(); }]);
    Ui.btns(bs);
  }
  static function egEnd(ok:Bool, msg:String) {
    var e = E;
    e.over = ok; e.msg = msg; e.cls = ok ? "good" : "bad"; e.busy = null;
    Profile.addDim("finais", ok);
    if (ok) Profile.setEgDone(e.eg.id); else { Profile.touch(); Profile.save(); }
    egDraw();
  }
  static function egMove(u4:String) {
    var e = E;
    if (e.over != null || e.busy != null || e.pos.turn != e.human) return;
    App.pickPromo(App.legalUcis(e.pos), u4, function(uci) {
      var m = Engine.uciToMove(e.pos, uci);
      var promo = uci.length > 4;
      Engine.makeMove(e.pos, m); e.pos.stack = []; e.keys.push(Engine.posKey(e.pos));
      e.last = App.lastOf(uci); e.moves++; e.hint = null; e.msg = "";
      var eg:Dynamic = e.eg; var goal:String = eg.goal;
      var st = Engine.gameStatus(e.pos, e.keys);
      if (st.over) {
        if (st.winner == e.human) { egEnd(true, "Xeque-mate! Objetivo cumprido em " + e.moves + " lances."); return; }
        if (goal == "draw") { egEnd(true, "Empate (" + App.howText(st.result) + "). Objetivo cumprido!"); return; }
        egEnd(false, "Empate (" + App.howText(st.result) + "): " + (st.result == "stalemate" ? "cuidado com o afogamento! Deixe sempre uma casa livre para o rei." : "a vantagem escapou."));
        return;
      }
      if (goal == "promote" && promo) {
        e.busy = "Conferindo a posição…"; egDraw();
        Think.run({ cmd: "eval", fen: Engine.toFEN(e.pos), keys: e.keys, nodes: 30000 }, function(r:Dynamic) {
          if (E != e) return;
          var sc:Float = r.score;
          if (sc <= -400) egEnd(true, "Promoveu e a vantagem é decisiva. Objetivo cumprido!");
          else egEnd(false, "Promoveu, mas a nova peça se perde ou a vantagem sumiu. Tente proteger a casa de promoção antes.");
        });
        return;
      }
      egCpu();
    });
  }
  static function egCpu() {
    var e = E;
    e.busy = "O motor está pensando…"; egDraw();
    Think.run({ cmd: "eg", fen: Engine.toFEN(e.pos), keys: e.keys }, function(r:Dynamic) {
      if (E != e || e.over != null) return;
      e.busy = null;
      if (r.uci == null) { egDraw(); return; }
      var m = Engine.uciToMove(e.pos, r.uci);
      var promo = (r.uci : String).length > 4;
      Engine.makeMove(e.pos, m); e.pos.stack = []; e.keys.push(Engine.posKey(e.pos)); e.last = App.lastOf(r.uci);
      var eg:Dynamic = e.eg; var goal:String = eg.goal; var lim:Int = eg.moves;
      var st = Engine.gameStatus(e.pos, e.keys);
      if (st.over) {
        if (st.winner == -e.human) { egEnd(false, "Você levou mate."); return; }
        if (goal == "draw") { egEnd(true, "Empate (" + App.howText(st.result) + "). Objetivo cumprido!"); return; }
        egEnd(false, "Empate (" + App.howText(st.result) + "): a vitória escapou."); return;
      }
      if (promo && goal == "draw") { egEnd(false, "O peão adversário promoveu."); return; }
      if (e.moves >= lim) {
        if (goal == "mate" || goal == "promote") { egEnd(false, "Acabaram os " + lim + " lances. Tente um plano mais direto (veja a dica do texto)."); return; }
        e.busy = "Conferindo a posição…"; egDraw();
        Think.run({ cmd: "eval", fen: Engine.toFEN(e.pos), keys: e.keys, nodes: 30000 }, function(rr:Dynamic) {
          if (E != e) return;
          var sc:Float = rr.score;
          if (goal == "draw") { if (sc >= -150) egEnd(true, "Você segurou " + lim + " lances e a posição continua empatada. Objetivo cumprido!"); else egEnd(false, "Você chegou ao lance " + lim + ", mas a posição ficou perdida."); }
          else { if (sc >= 500) egEnd(true, "A vitória está garantida (vantagem decisiva). Objetivo cumprido!"); else egEnd(false, "A vantagem diminuiu demais. Tente de novo trocando peças e avançando os peões."); }
        });
        return;
      }
      egDraw();
    });
  }
  static function egHint() {
    var e = E;
    if (e.busy != null || e.over != null) return;
    e.busy = "Procurando o melhor lance…"; egDraw();
    Think.run({ cmd: "eg", fen: Engine.toFEN(e.pos), keys: e.keys }, function(r:Dynamic) {
      if (E != e) return;
      e.busy = null; e.hint = r.uci; e.msg = r.uci != null ? "Sugestão do motor: " + r.san : ""; e.cls = "gold"; egDraw();
    });
  }

  /* ---------- partidas-modelo: assistir e adivinhar o lance ---------- */
  static var M:Dynamic = null;
  public static function model(g:ModelGame, side:Int, back:Void->Void) {
    M = { g: g, side: side, ply: 0, pos: Engine.posFromFEN(Engine.START_FEN), pts: 0, max: 0, n: 0, msg: "", cls: "", busy: false, back: back, arrows: [], last: null, gen: 0, imb: null, wait: false, done: false };
    Ui.boardPage(g.name(), back);
    if (side == 0) { mDraw(); return; }
    var start = g.moves.length > 24 ? 10 : 4;
    while (M.ply < start || (M.ply < g.moves.length && M.pos.turn != side)) mStep();
    mDraw();
  }
  static function mStep() {
    var g:ModelGame = M.g;
    if (M.ply >= g.moves.length) return;
    var u = g.moves[M.ply];
    var m = Engine.uciToMove(M.pos, u); if (m < 0) { M.ply = g.moves.length; return; }
    Engine.makeMove(M.pos, m); M.pos.stack = []; M.last = App.lastOf(u); M.ply++;
  }
  static function mGoto(n:Int) {
    var g:ModelGame = M.g;
    if (n < 0) n = 0; if (n > g.moves.length) n = g.moves.length;
    M.pos = Engine.posFromFEN(Engine.START_FEN); M.ply = 0; M.last = null;
    while (M.ply < n) mStep();
    M.imb = null; M.arrows = [];
    mDraw();
  }
  static function mDraw() {
    var g:ModelGame = M.g; var b = Ui.board;
    if (b == null) return;
    var guess = M.side != 0;
    b.fen = Engine.toFEN(M.pos); b.flip = M.side == -1; b.last = M.last; b.check = App.checkSq(M.pos);
    b.arrows = M.arrows; b.marks = []; b.blind = false; b.onSquare = null;
    b.legal = guess && !M.busy && !M.wait && !M.done && M.pos.turn == M.side ? App.legalUcis(M.pos) : null;
    b.onMove = mGuess; b.clearSel(); b.draw();
    Ui.bars(ModelGame.short(g.black) + " (Pretas)", ModelGame.short(g.white) + " (Brancas) · " + g.year, M.pos.turn == -1, M.pos.turn == 1);
    if (M.side == -1) Ui.bars(ModelGame.short(g.white) + " (Brancas) · " + g.year, ModelGame.short(g.black) + " (Pretas)", M.pos.turn == 1, M.pos.turn == -1);
    Ui.panel();
    if (g.desc != "") Ui.p(g.desc, "muted");
    var op = Book.detect(g.moves.slice(0, M.ply));
    if (M.ply > 0 && M.ply <= g.evals.length) {
      var mp:Int = M.ply; var ev:Float = g.evals[mp - 1];
      App.chanceOf(ev);
    }
    if (guess) {
      var pct = M.max > 0 ? Math.round(M.pts * 100 / M.max) : 0;
      Ui.p("Adivinhe o lance de " + (M.side == 1 ? "Brancas" : "Pretas") + " · pontos " + M.pts + " de " + M.max + " (" + pct + "%)", "gold");
      Ui.p("2 pontos = lance do mestre · 1 ponto = outro lance tão bom quanto, segundo o motor · 0 = pior.", "muted small");
      if (M.busy) Ui.p("Conferindo seu palpite…", "muted");
      if (M.msg != "") Ui.p(M.msg, M.cls);
      if (M.done) {
        var perf = Study.guessPerf(pct);
        Ui.p("Fim da partida (" + g.result + "). Desempenho estimado: " + perf + " (aproximação pelo percentual de pontos).", "big gold");
        Ui.btns([["Voltar", M.back, "pri"]]);
      } else Ui.btns([M.wait ? ["Continuar", mAdvance, "pri"] : null, ["Desequilíbrios", mImb], ["Sair", M.back]]);
    } else {
      Ui.p("Lance " + M.ply + " de " + g.moves.length + (M.ply > 0 ? " · " + lastSan() : ""), "gold");
      Ui.btns([["⏮", function() mGoto(0)], ["◀", function() mGoto((M.ply : Int) - 1)], ["▶", function() mGoto((M.ply : Int) + 1), "pri"], ["⏭", function() mGoto(g.moves.length)]]);
      Ui.btns([["Desequilíbrios", mImb], ["Sair", M.back]]);
    }
    if (M.imb != null) {
      Ui.h("Desequilíbrios (Silman) para " + (M.pos.turn == 1 ? "Brancas" : "Pretas"));
      var rows:Array<Array<Dynamic>> = M.imb.rows;
      for (r in rows) Ui.p(r[0] + ": " + r[2], r[1] == 1 ? "good" : (r[1] == -1 ? "bad" : ""));
      Ui.ul(M.imb.plan);
    }
    if (op != null) Ui.p("Abertura: " + op[1] + " (" + op[0] + ")", "muted small");
    Ui.p(g.white + " x " + g.black + " · " + g.year + " · " + g.result, "muted small");
  }
  static function lastSan():String {
    var g:ModelGame = M.g;
    var p = Engine.posFromFEN(Engine.START_FEN); var s = "";
    for (i in 0...M.ply) { var m = Engine.uciToMove(p, g.moves[i]); if (i == M.ply - 1) s = (p.turn == 1 ? p.full + ". " : p.full + "… ") + Engine.moveToSAN(p, m); Engine.makeMove(p, m); }
    return s;
  }
  static function mImb() {
    if (M.imb != null) { M.imb = null; mDraw(); return; }
    var m = M;
    Think.run({ cmd: "imb", fen: Engine.toFEN(M.pos), color: M.pos.turn }, function(r:Dynamic) { if (M != m) return; m.imb = r; mDraw(); });
  }
  static function mGuess(u4:String) {
    var m = M;
    if (m.busy || m.wait || m.done) return;
    App.pickPromo(App.legalUcis(m.pos), u4, function(uci) {
      var g:ModelGame = m.g;
      var master = g.moves[m.ply];
      var fen = Engine.toFEN(m.pos);
      var mSan = App.san(fen, master);
      m.max += 2; m.n++;
      if (uci == master) { m.pts += 2; m.msg = "+2 · Exatamente o lance do mestre: " + mSan + "."; m.cls = "good"; m.arrows = [App.arrow(master, 0)]; m.wait = true; mDraw(); return; }
      m.busy = true; mDraw();
      Think.run({ cmd: "judge", fen: fen, uci: uci }, function(j:Dynamic) {
        if (M != m) return;
        m.busy = false;
        var loss:Float = j.loss;
        if (loss <= 3) { m.pts += 1; m.msg = "+1 · " + App.san(fen, uci) + " também é bom, segundo o motor. O mestre jogou " + mSan + "."; m.cls = "gold"; }
        else { m.msg = "0 · " + App.san(fen, uci) + " perde " + App.pctTxt(loss) + " de chance. O mestre jogou " + mSan + "."; m.cls = "bad"; }
        m.arrows = [App.arrow(uci, 1), App.arrow(master, 0)];
        m.wait = true; mDraw();
      });
    });
  }
  static function mAdvance() {
    var m = M; var g:ModelGame = m.g;
    m.wait = false; m.arrows = []; m.msg = "";
    mStep();
    if (m.ply < g.moves.length) mStep();
    if (m.ply >= g.moves.length || (m.ply == g.moves.length - 1 && m.pos.turn != m.side)) {
      while (m.ply < g.moves.length && m.pos.turn != m.side) mStep();
    }
    if (m.ply >= g.moves.length) {
      m.done = true;
      var pct = m.max > 0 ? m.pts * 100 / m.max : 0;
      var md:Array<Dynamic> = Profile.d.model;
      md.push({ g: g.idx, side: m.side, pct: Math.round(pct), perf: Study.guessPerf(pct), n: m.n, t: Date.now().getTime() });
      while (md.length > 60) md.shift();
      Profile.touch(); Profile.save();
    }
    mDraw();
  }

  /* ---------- treino de aberturas com a base de mestres ---------- */
  static var X:Dynamic = null;
  public static function explorer(color:Int, back:Void->Void) {
    X = { pos: Engine.posFromFEN(Engine.START_FEN), color: color, ucis: [], msg: "", cls: "", last: null, arrows: [], hits: 0, n: 0, back: back, end: false };
    Ui.boardPage("Jogue como os mestres", back);
    if (color == -1) xAuto();
    xDraw();
  }
  static function xAuto() {
    var u = Book.pickMaster(X.pos, 0.05, 1.0);
    if (u == null) { X.end = true; return; }
    var m = Engine.uciToMove(X.pos, u);
    Engine.makeMove(X.pos, m); X.pos.stack = []; X.ucis.push(u); X.last = App.lastOf(u);
    if (Book.masterMoves(X.pos) == null) X.end = true;
  }
  static function xDraw() {
    var b = Ui.board;
    b.fen = Engine.toFEN(X.pos); b.flip = X.color == -1; b.last = X.last; b.check = -1; b.arrows = X.arrows; b.marks = []; b.blind = false; b.onSquare = null;
    b.legal = X.end ? null : App.legalUcis(X.pos); b.onMove = xMove; b.clearSel(); b.draw();
    Ui.bars("Base de mestres", "Acertos " + X.hits + " de " + X.n, false, true);
    Ui.panel();
    var op = Book.detect(X.ucis);
    if (op != null) Ui.p(op[1] + " (" + op[0] + ")", "gold");
    Ui.p(X.end ? "Fim da teoria da base nesta linha. Recomece para explorar outra." : "Jogue um lance que os mestres jogam nesta posição.", "");
    if (X.msg != "") Ui.p(X.msg, X.cls);
    var mm = Book.masterMoves(X.pos);
    if (mm != null && X.arrows.length > 0) {
      var rows:Array<String> = [];
      for (x in mm.slice(0, 4)) rows.push(App.san(Engine.toFEN(X.pos), x[0]) + ": " + Math.round(x[2] * 100) + "% das partidas (Brancas " + x[3] + "% · empate " + x[4] + "% · Pretas " + x[5] + "%)");
      Ui.ul(rows);
      var sf = Book.sfMoves(X.pos);
      if (sf != null) Ui.p("Stockfish 19 prefere " + App.san(Engine.toFEN(X.pos), sf[0][0]) + ".", "muted");
    }
    Ui.btns([["Recomeçar", function() explorer(X.color, X.back), X.end ? "pri" : ""], ["Trocar de cor", function() explorer(-(X.color : Int), X.back)], ["Sair", X.back]]);
  }
  static function xMove(u4:String) {
    App.pickPromo(App.legalUcis(X.pos), u4, function(uci) {
      var mm = Book.masterMoves(X.pos);
      var share = 0.0;
      if (mm != null) for (x in mm) if (x[0] == uci) share = x[2];
      X.n++;
      if (share >= 0.05) {
        X.hits++; X.arrows = []; X.msg = App.san(Engine.toFEN(X.pos), uci) + ": jogado em " + Math.round(share * 100) + "% das partidas de mestres."; X.cls = "good";
        var m = Engine.uciToMove(X.pos, uci);
        Engine.makeMove(X.pos, m); X.pos.stack = []; X.ucis.push(uci); X.last = App.lastOf(uci);
        if (Book.masterMoves(X.pos) == null) X.end = true; else xAuto();
        Profile.addDim("abertura", true);
      } else {
        X.msg = "Mestres quase não jogam esse lance aqui. Veja o que eles preferem:"; X.cls = "warn";
        X.arrows = mm == null ? [] : [for (x in mm.slice(0, 3)) App.arrow(x[0], 2)];
        Profile.addDim("abertura", false);
      }
      Profile.save();
      xDraw();
    });
  }
}
