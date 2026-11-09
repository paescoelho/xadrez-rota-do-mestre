package;

import Engine;
import Coach;
import Data;

/* Todo o cálculo pesado (motor e treinador). No HTML5 roda num Web Worker; no Flash, em seguida ao quadro atual. */
class Brain {
  public static var SCALE:Float = 1.0; /* orçamento de nós relativo (Flash é mais lento) */
  static var inited = false;
  public static function init() {
    if (inited) return;
    inited = true;
    Engine.init(); Coach.init();
    #if flash
    SCALE = 0.45;
    #end
    Coach.AN_NODES = Std.int(60000 * SCALE);
    Engine.HUMAN_NODES = SCALE;
  }
  static function keysMap(keys:Array<String>):Map<String, Bool> {
    var m = new Map<String, Bool>();
    if (keys != null) for (k in keys) m.set(k, true);
    return m;
  }
  public static function handle(q:Dynamic):Dynamic {
    init();
    var cmd:String = q.cmd;
    try {
      switch (cmd) {
        case "cpu": {
          var pos = Engine.posFromFEN(q.fen);
          var keys:Array<String> = q.keys;
          var m = -1;
          /* abertura: lances de mestres sorteados (variedade, como um humano que conhece teoria) */
          if (q.elo != null && pos.full <= 8 && Math.random() < 0.9) {
            var share = q.elo < 1000 ? 0.12 : 0.05;
            var u = Book.pickMaster(pos, share, 1.2);
            if (u != null) m = Engine.uciToMove(pos, u);
          }
          if (m < 0) m = q.elo != null ? Engine.chooseHuman(pos, q.elo, keys) : Engine.chooseWithKeys(pos, q.level, keys);
          if (m < 0) return { uci: null };
          var san = Engine.moveToSAN(pos, m);
          var note = q.human != null ? Coach.opponentNote(pos, m, q.human) : null;
          return { uci: Engine.moveToUCI(m), san: san, score: Engine.lastScoreValid ? Engine.lastScore : null, note: note };
        }
        case "ghost": {
          var pos = Engine.posFromFEN(q.fen);
          var dna:Dynamic = q.dna;
          Engine.lastScoreValid = false;
          var u = Dna.bookMove(dna, q.ucis, pos);
          var m = u != null ? Engine.uciToMove(pos, u) : -1;
          var err = false;
          if (m < 0 && pos.full <= 6 && Math.random() < 0.7) { var bu = Book.pickMaster(pos, 0.12, 1.2); if (bu != null) m = Engine.uciToMove(pos, bu); }
          if (m < 0) { m = Engine.chooseGhost(pos, dna, q.keys, q.tilt == true); err = Engine.ghostErr; }
          if (m < 0) return { uci: null };
          var note = q.human != null ? Coach.opponentNote(pos, m, q.human) : null;
          return { uci: Engine.moveToUCI(m), san: Engine.moveToSAN(pos, m), score: Engine.lastScoreValid ? Engine.lastScore : null, note: note, err: err, book: u != null };
        }
        case "fb": {
          var pos = Engine.posFromFEN(q.fen);
          var m = Engine.uciToMove(pos, q.uci);
          var fb = Coach.buildFeedback(pos, m, q.ucis);
          return fbObj(fb, pos);
        }
        case "hint": {
          var pos = Engine.posFromFEN(q.fen);
          var h = Coach.buildHint(pos);
          return { uci: Engine.moveToUCI(h.m), san: h.san, reasons: h.reasons, alerts: h.alerts, n1: Coach.hintNudge(pos, h), n2: Coach.pieceNudge(pos, h), score: h.score };
        }
        case "eval": {
          var pos = Engine.posFromFEN(q.fen);
          if (Engine.legalMoves(pos).length == 0) return { score: Engine.inCheck(pos) ? -Engine.MATE : 0, uci: null };
          var nodes:Int = q.nodes != null ? q.nodes : 40000;
          var r = Engine.searchBest(pos, 30, q.ms != null ? q.ms : 2500, Std.int(nodes * SCALE), keysMap(q.keys));
          return { score: r.score, uci: Engine.moveToUCI(r.m), san: Engine.moveToSAN(pos, r.m), line: Coach.lineSAN(pos, r.pv, 5) };
        }
        case "judge": {
          /* compara um lance com o melhor: perda em % de vitória */
          var pos = Engine.posFromFEN(q.fen);
          var m = Engine.uciToMove(pos, q.uci);
          if (m < 0) return { loss: 100 };
          var an = Coach.analyze(pos, m);
          var loss = Coach.winPct(an.best.score) - Coach.winPct(an.mine.score);
          return { loss: loss < 0 ? 0 : loss, best: Engine.moveToUCI(an.best.m), bestSan: Engine.moveToSAN(pos, an.best.m), score: an.mine.score, bestScore: an.best.score, line: Coach.lineSAN(pos, an.best.pv, 4) };
        }
        case "threat": {
          /* passa a vez (lance nulo) e vê o que o adversário faria: é a ameaça dele */
          var pos = Engine.posFromFEN(q.fen);
          if (Engine.inCheck(pos)) return { check: true };
          var base = Engine.searchBest(pos.clone(), 20, 900, Std.int(15000 * SCALE));
          var p2 = pos.clone(); Engine.makeNull(p2);
          var r = Engine.searchBest(p2.clone(), 20, 1200, Std.int(20000 * SCALE));
          if (r == null || r.m < 0) return { none: true };
          var gain = r.score + base.score;
          var m = r.m; var to = (m >> 6) & 63; var cap = p2.board[to];
          var san = Engine.moveToSAN(p2, m);
          var mate = r.score >= Engine.MATE - 200;
          var p3 = p2.clone(); Engine.makeMove(p3, m);
          var chk = Engine.inCheck(p3);
          return { san: san, uci: Engine.moveToUCI(m), gain: gain, mate: mate, cap: cap != 0 ? Engine.pType(cap) : 0, check: false, chk: chk, line: Coach.lineSAN(p2, r.pv, 3) };
        }
        case "anl": {
          /* análise completa: nota da posição e melhor lance (ponto de vista das Brancas) */
          var pos = Engine.posFromFEN(q.fen);
          var st = Engine.gameStatus(pos, null);
          if (st.over) return { w: st.result == "mate" ? (st.winner == 1 ? Engine.MATE : -Engine.MATE) : 0, best: null };
          var sfl = Book.sfMoves(pos);
          if (sfl != null && sfl.length > 0) { var sc:Int = sfl[0][1]; return { w: pos.turn == 1 ? sc : -sc, best: sfl[0][0], sf: true }; }
          var r = Engine.searchBest(pos, 20, 1500, Std.int(30000 * SCALE));
          return { w: pos.turn == 1 ? r.score : -r.score, best: Engine.moveToUCI(r.m), bestSan: Engine.moveToSAN(Engine.posFromFEN(q.fen), r.m) };
        }
        case "proc": return { rows: Coach.processEval(q.fen, q.marked, q.cands, q.played, q.best) };
        case "imb": {
          var pos = Engine.posFromFEN(q.fen);
          return { rows: Coach.imbalances(pos, q.color), plan: Coach.plan(pos, q.color) };
        }
        case "threats": {
          var pos = Engine.posFromFEN(q.fen);
          return { sq: Coach.realThreats(pos, pos.turn) };
        }
        case "eg": {
          var pos = Engine.posFromFEN(q.fen);
          if (Engine.legalMoves(pos).length == 0) return { uci: null };
          var r = Engine.searchBest(pos, 40, 2500, Std.int(150000 * SCALE), keysMap(q.keys));
          return { uci: Engine.moveToUCI(r.m), san: Engine.moveToSAN(pos, r.m), score: r.score };
        }
        default: return { err: "cmd" };
      }
    } catch (e:Dynamic) {
      return { err: Std.string(e) };
    }
  }
  static function fbObj(fb:Feedback, pos:Pos):Dynamic {
    return { grade: fb.grade, label: fb.label, sym: fb.sym, color: fb.color, san: fb.san, bestSan: fb.bestSan,
      best: fb.bestM >= 0 ? Engine.moveToUCI(fb.bestM) : null, reply: fb.replyM >= 0 ? Engine.moveToUCI(fb.replyM) : null,
      evalBefore: fb.evalBefore, evalAfter: fb.evalAfter, loss: fb.loss, hasEval: fb.hasEval,
      problems: fb.problems, good: fb.good, bestWhy: fb.bestWhy, concept: fb.concept, conceptText: fb.concept != null ? Coach.concept(fb.concept) : null,
      altNote: fb.altNote, headline: fb.headline, winBefore: fb.winBefore, winAfter: fb.winAfter, accuracy: fb.accuracy, sf: fb.sf,
      bestLine: fb.bestLine, masterNote: fb.masterNote, tip: fb.tip, bad: fb.isBad() };
  }
}

/* Despacho assíncrono */
class Think {
  #if js
  static var worker:js.html.Worker = null;
  static var cbs:Map<Int, Dynamic->Void> = new Map();
  static var nextId = 1;
  public static var mode = "sync";
  public static function startWorker(src:String) {
    try {
      var blob = new js.html.Blob([src], { type: "text/javascript" });
      var url = js.html.URL.createObjectURL(blob);
      worker = new js.html.Worker(url);
      worker.onmessage = function(e:Dynamic) {
        var id:Int = e.data.id;
        var cb = cbs.get(id); cbs.remove(id);
        if (cb != null) cb(e.data.res);
      };
      worker.onerror = function(e:Dynamic) { worker = null; mode = "sync"; };
      mode = "worker";
    } catch (e:Dynamic) { worker = null; mode = "sync"; }
  }
  #end
  public static var busy = 0;
  public static function run(q:Dynamic, cb:Dynamic->Void) {
    busy++;
    var done = function(r:Dynamic) { busy--; cb(r); };
    #if js
    if (worker != null) {
      var id = nextId++;
      cbs.set(id, done);
      worker.postMessage({ id: id, q: q });
      return;
    }
    #end
    haxe.Timer.delay(function() done(Brain.handle(q)), 40);
  }
}
