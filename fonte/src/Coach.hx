package;

import Engine;
import Data;
import haxe.ds.Vector;


class Reason {
  public var tag:String; public var text:String;
  public function new(tag:String, text:String) { this.tag = tag; this.text = text; }
}
class Issue {
  public var concept:String; public var text:String; public var hard:Bool;
  public function new(concept:String, text:String, hard:Bool) { this.concept = concept; this.text = text; this.hard = hard; }
}
class Threat {
  public var sq:Int; public var type:Int; public var gain:Int; public var undefended:Bool;
  public function new(sq:Int, type:Int, gain:Int, undefended:Bool) { this.sq = sq; this.type = type; this.gain = gain; this.undefended = undefended; }
}
class Pin {
  public var pinned:Int = -1; public var behind:Int = -1; public var abs:Bool = false; public var skewer:Bool = false; public var front:Int = -1;
  public function new() {}
}
class Feedback {
  public var grade:String = ""; public var label:String = ""; public var icon:String = ""; public var sym:String = ""; public var color:Int = 0;
  public var san:String = ""; public var bestSan:String = ""; public var bestM:Int = -1; public var replyM:Int = -1; public var depth:Int = 0;
  public var evalBefore:Int = 0; public var evalAfter:Int = 0; public var loss:Float = 0; public var hasEval:Bool = false;
  public var problems:Array<String> = []; public var good:Array<String> = []; public var bestWhy:Array<String> = [];
  public var concept:String = null; public var altNote:String = null; public var headline:String = "";
  public var winBefore:Float = 50; public var winAfter:Float = 50; public var accuracy:Float = 100;
  public var sf:Bool = false;
  public var bestLine:String = ""; public var masters:Array<Array<Dynamic>> = null; public var masterNote:String = null; public var tip:String = null;
  public function new() {}
  public function isBad():Bool return grade == "inaccuracy" || grade == "mistake" || grade == "blunder";
}
class Note {
  public var san:String = ""; public var reasons:Array<String> = []; public var alerts:Array<String> = [];
  public function new() {}
}
class Hint {
  public var m:Int = -1; public var san:String = ""; public var reasons:Array<String> = []; public var alerts:Array<String> = []; public var score:Int = 0;
  public function new() {}
}

class Coach {
  static var THE = ["", "o peão", "o cavalo", "o bispo", "a torre", "a dama", "o rei"];
  static var YOUR = ["", "seu peão", "seu cavalo", "seu bispo", "sua torre", "sua dama", "seu rei"];
  static var THEIR = ["", "o peão adversário", "o cavalo adversário", "o bispo adversário", "a torre adversária", "a dama adversária", "o rei adversário"];
  static var DO = ["", "do peão", "do cavalo", "do bispo", "da torre", "da dama", "do rei"];
  static var NAME = ["", "peão", "cavalo", "bispo", "torre", "dama", "rei"];
  static var PTS = [0, 1, 3, 3, 5, 9, 0];
  static inline function fem(t:Int):Bool return t == 4 || t == 5;
  static inline function gen(t:Int, o:String, a:String):String return fem(t) ? a : o;
  static function cap1(x:String):String return x.charAt(0).toUpperCase() + x.substr(1);
  static function pontos(cp:Int):String { var n = Math.round(cp / 100); return n + (n == 1 ? " ponto" : " pontos"); }
  static function mateIn(s:Int):Int return Math.ceil((E.MATE - Math.abs(s)) / 2);
  static function sq(s:Int):String return E.sqName(s);
  static function centerDist(s:Int):Int return Std.int(Math.max(3 - (s & 7), (s & 7) - 4) + Math.max(3 - (s >> 3), (s >> 3) - 4));

  public static var CONCEPTS:Map<String, Array<String>> = new Map();
  public static var AN_NODES = 30000;
  public static var AN_TIME:Float = 3000;
  public static function concept(k:String):Array<String> return CONCEPTS.get(k);
  public static function theme(k:String):Array<String> return THEMES.get(k);
  public static function tip(k:String):String return TIPS.get(k);
  public static function init() {
    var c = CONCEPTS;
    c.set("hanging", ["Peça pendurada", "Antes de cada lance, pergunte: \"quem ataca o quê?\" e \"minhas peças estão protegidas?\". Peça atacada e sem proteção é a causa nº 1 de derrota entre iniciantes."]);
    c.set("threat", ["Responda às ameaças", "Depois de cada lance do adversário, descubra o que ele quer fazer. Se ele ameaça algo, você precisa mover, proteger, bloquear ou capturar o atacante."]);
    c.set("trade", ["Valor das peças", "Peão 1, cavalo 3, bispo 3, torre 5, dama 9. Troque quando receber o mesmo valor ou mais; evite dar uma peça maior por uma menor."]);
    c.set("mate", ["Ataque ao rei", "Xeque-mate vale mais que qualquer material. Antes de decidir, procure sempre: xeques, capturas e ameaças, nessa ordem, para os dois lados."]);
    c.set("kingSafety", ["Segurança do rei", "Cuidado com os pontos fracos em volta do rei (f7/f2, a diagonal da dama, linhas abertas). Um lance que parece inofensivo pode abrir o caminho para o mate."]);
    c.set("tactics", ["Táticas: xeques, capturas, ameaças", "A maioria das partidas até 1500 pontos termina por uma tática perdida. Antes de mover, olhe todos os xeques e capturas, seus e do adversário."]);
    c.set("center", ["Controle do centro", "Peões e peças em d4, e4, d5, e5 dão espaço e mobilidade. Peças centrais alcançam os dois lados do tabuleiro; peças nas bordas ficam isoladas."]);
    c.set("develop", ["Desenvolvimento", "Na abertura, cada lance deve trazer uma peça nova para o jogo: cavalos e bispos primeiro. Não mova a mesma peça duas vezes sem necessidade."]);
    c.set("castle", ["Roque", "Faça o roque cedo (em geral até o lance 10): o rei fica protegido atrás dos peões e a torre entra no jogo. Perder o direito de roque sem motivo é arriscado."]);
    c.set("queenEarly", ["Dama cedo demais", "A dama é forte, mas atacada por peças menores precisa fugir e você perde tempo. Desenvolva cavalos e bispos antes de tirar a dama."]);
    c.set("rim", ["Cavalo na borda", "No centro o cavalo domina até 8 casas; na borda, só 4, e no canto, apenas 2. Mande os cavalos para c3/f3 e c6/f6, e depois para o centro."]);
    c.set("pawns", ["Estrutura de peões", "Peões dobrados e isolados não têm proteção de outros peões e viram alvos no final. Cuide dos peões: eles não voltam atrás."]);
    c.set("kingShield", ["Escudo do rei", "Depois do roque, mantenha f, g e h (ou a, b e c) no lugar. Cada peão que avança abre uma porta para o ataque."]);
    c.set("activity", ["Atividade das peças", "Uma peça vale pelo que ela faz. Peças recuadas ou presas atrás de seus próprios peões valem menos que o número na tabela."]);
    c.set("endgameKing", ["Rei ativo no final", "Com poucas peças não há mais perigo de mate rápido. Leve o rei para o centro: ele vira uma peça de ataque e ajuda os peões."]);
    c.set("fork", ["Garfo", "Um garfo é um ataque simultâneo a duas peças. Cavalos e peões são ótimos garfeiros. Antes de mover, veja se a casa de destino deixa suas peças alinhadas a um cavalo adversário."]);
    c.set("pin", ["Cravada", "Quando uma peça não pode se mover porque deixaria uma peça mais valiosa (ou o rei) exposta, ela está cravada. Ataque peças cravadas com peões e fuja das cravadas contra a dama ou o rei."]);
    c.set("solid", ["Pensar em planos", "Quando não há tática, melhore sua pior peça: pergunte \"qual das minhas peças está fazendo menos?\" e leve-a para uma casa melhor."]);
  }

  /* ---------- fatos ---------- */
  static function materialDiff(b:Vector<Int>, color:Int):Int {
    var s = 0;
    for (i in 0...64) { var p = b[i]; var t = E.pType(p); if (t != 0 && t != E.KING) s += (E.pColor(p) == color ? 1 : -1) * E.VAL[t]; }
    return s;
  }
  static function pvMaterialDelta(pos0:Pos, pv:Array<Int>, color:Int):Int {
    var P = pos0.clone(); var m0 = materialDiff(P.board, color);
    for (m in pv) E.makeMove(P, m);
    return materialDiff(P.board, color) - m0;
  }
  public static function threatsAgainst(pos:Pos, color:Int):Array<Threat> {
    var out:Array<Threat> = [];
    for (s in 0...64) {
      var p = pos.board[s];
      if (E.pColor(p) != color || E.pType(p) == E.KING) continue;
      var g = E.see(pos, s, -color);
      if (g > 0) out.push(new Threat(s, E.pType(p), g, E.attackerList(pos.board, s, color).length == 0));
    }
    return out;
  }
  static function attackTargets(b:Vector<Int>, s:Int):Array<Int> {
    var p = b[s]; var col = E.pColor(p); var t = E.pType(p); var out:Array<Int> = [];
    if (t == E.PAWN) {
      var nr = (s >> 3) + col; var f = s & 7;
      if (nr >= 0 && nr < 8) {
        if (f > 0 && E.pColor(b[nr * 8 + f - 1]) == -col) out.push(nr * 8 + f - 1);
        if (f < 7 && E.pColor(b[nr * 8 + f + 1]) == -col) out.push(nr * 8 + f + 1);
      }
    } else if (t == E.KNIGHT || t == E.KING) {
      for (x in (t == E.KNIGHT ? E.KNIGHT_T[s] : E.KING_T[s])) if (E.pColor(b[x]) == -col) out.push(x);
    } else {
      var d0 = t == E.BISHOP ? 4 : 0; var d1 = t == E.ROOK ? 4 : 8;
      for (d in d0...d1) for (x in E.RAYS[s][d]) { if (b[x] == 0) continue; if (E.pColor(b[x]) == -col) out.push(x); break; }
    }
    return out;
  }
  static function pinsFrom(b:Vector<Int>, s:Int):Array<Pin> {
    var p = b[s]; var col = E.pColor(p); var t = E.pType(p); var out:Array<Pin> = [];
    if (t != E.BISHOP && t != E.ROOK && t != E.QUEEN) return out;
    var d0 = t == E.BISHOP ? 4 : 0; var d1 = t == E.ROOK ? 4 : 8;
    for (d in d0...d1) {
      var first = -1;
      for (x in E.RAYS[s][d]) {
        if (b[x] == 0) continue;
        if (first < 0) { if (E.pColor(b[x]) != -col) break; first = x; }
        else {
          if (E.pColor(b[x]) == -col) {
            var X = E.pType(b[first]); var Y = E.pType(b[x]);
            if (X != E.KING && X != E.PAWN && (Y == E.KING || E.VAL[Y] > E.VAL[X])) { var pn = new Pin(); pn.pinned = first; pn.behind = x; pn.abs = Y == E.KING; out.push(pn); }
            else if (X != E.KING && E.VAL[X] > E.VAL[Y] && Y != E.PAWN) { var pn = new Pin(); pn.skewer = true; pn.front = first; pn.behind = x; out.push(pn); }
          }
          break;
        }
      }
    }
    return out;
  }
  static function pawnWeak(b:Vector<Int>, color:Int):Array<Int> {
    var cnt = [0, 0, 0, 0, 0, 0, 0, 0];
    for (i in 0...64) if (b[i] == E.PAWN * color) cnt[i & 7]++;
    var doubled = 0; var isolated = 0;
    for (f in 0...8) {
      if (cnt[f] > 1) doubled += cnt[f] - 1;
      if (cnt[f] > 0 && (f == 0 || cnt[f - 1] == 0) && (f == 7 || cnt[f + 1] == 0)) isolated += cnt[f];
    }
    return [doubled, isolated];
  }
  static function isPassedPawn(b:Vector<Int>, s:Int, color:Int):Bool {
    var f = s & 7; var r = s >> 3;
    for (i in 0...64) {
      if (b[i] != -E.PAWN * color) continue;
      var bf = i & 7; var br = i >> 3;
      if (Math.abs(bf - f) <= 1 && (color == 1 ? br > r : br < r)) return false;
    }
    return true;
  }
  static function undevelopedMinors(b:Vector<Int>, c:Int):Int {
    var n = 0;
    for (s in (c == 1 ? [1, 2, 5, 6] : [57, 58, 61, 62])) if (b[s] == c * E.KNIGHT || b[s] == c * E.BISHOP) n++;
    return n;
  }
  static function kingInCenter(pos:Pos, c:Int):Bool return pos.king[E.sideIdx(c)] == (c == 1 ? 4 : 60);
  static function castledSide(pos:Pos, c:Int):Bool {
    var k = pos.king[E.sideIdx(c)];
    return (c == 1 ? [6, 7, 2, 1, 0] : [62, 63, 58, 57, 56]).indexOf(k) >= 0;
  }

  /* ---------- por que um lance é bom ---------- */
  public static function moveReasons(pos0:Pos, m:Int, score:Null<Int>):Array<Reason> {
    var R:Array<Reason> = []; var b0 = pos0.board; var us = pos0.turn; var them = -us;
    var from = m & 63; var to = (m >> 6) & 63; var promo = (m >> 12) & 7; var flag = m >> 15;
    var piece = E.pType(b0[from]);
    var capt = flag == E.FLAG_EP ? E.PAWN : E.pType(b0[to]);
    var posA = pos0.clone(); E.makeMove(posA, m);
    var bA = posA.board;
    var opening = pos0.full <= 12;
    var chk = E.inCheck(posA);
    var mated = chk && E.legalMoves(posA).length == 0;
    if (mated) R.push(new Reason("mate", "Dá xeque-mate. Fim de jogo!"));
    else if (score != null && score >= E.MATE - 100) { var n = mateIn(score); R.push(new Reason("mate", "Leva a xeque-mate forçado em " + n + (n == 1 ? " lance." : " lances."))); }
    if (promo != 0) R.push(new Reason("promo", "Promove o peão a " + NAME[promo] + ": uma peça nova e poderosa."));

    if (capt != 0) {
      var defenders = E.attackerList(b0, to, them).length;
      var recap = Std.int(Math.max(0, E.see(posA, to, them)));
      var net = E.VAL[capt] - recap;
      if (defenders == 0 && flag != E.FLAG_EP) R.push(new Reason("capture", "Captura " + THE[capt] + " em " + sq(to) + ", que estava sem proteção: material de graça."));
      else if (net >= 100) R.push(new Reason("capture", "Ganha material: captura " + THE[capt] + " em " + sq(to) + "; mesmo com a recaptura, a troca rende " + pontos(net) + " de vantagem."));
      else if (net > -100 && E.VAL[capt] >= 300) R.push(new Reason("trade", "Troca " + THE[piece] + " por " + THE[capt] + ", de valor equivalente, simplificando a posição."));
    }

    var tb0 = threatsAgainst(pos0, us); var tb1 = threatsAgainst(posA, us);
    var esc:Threat = null;
    for (t in tb0) if (t.sq == from) esc = t;
    var stillThreat = false;
    for (t in tb1) if (t.sq == to) stillThreat = true;
    if (esc != null && !stillThreat && capt == 0) R.push(new Reason("escape", "Tira " + THE[piece] + " de " + sq(from) + ", onde estava ameaçad" + gen(piece, "o", "a") + "."));
    for (t in tb0) {
      if (t.sq == from) continue;
      var still = false;
      for (u in tb1) if (u.sq == t.sq) still = true;
      if (!still) { R.push(new Reason("defend", "Resolve a ameaça contra " + THE[t.type] + " em " + sq(t.sq) + ".")); break; }
    }

    if (!mated) {
      var safe = Math.max(0, E.see(posA, to, them)) == 0;
      var targets:Array<Int> = [];
      for (x in attackTargets(bA, to)) {
        var X = E.pType(bA[x]);
        if (X == E.KING) { targets.push(x); continue; }
        var worth = E.attackerList(bA, x, them).length == 0 ? E.VAL[X] : Std.int(Math.max(0, E.VAL[X] - E.VAL[piece]));
        if (worth >= 300) targets.push(x);
      }
      if (targets.length >= 2 && safe) {
        var names:Array<String> = [];
        for (x in targets) names.push(THE[E.pType(bA[x])] + " em " + sq(x));
        R.push(new Reason("fork", "Garfo: ataca " + names.slice(0, 3).join(" e ") + " ao mesmo tempo. O adversário só consegue salvar um."));
      } else if (chk) R.push(new Reason("check", "Dá xeque, obrigando o adversário a responder."));
      else if (targets.length == 1 && safe && capt == 0) R.push(new Reason("threat", "Cria uma ameaça: ataca " + THE[E.pType(bA[targets[0]])] + " em " + sq(targets[0]) + "."));
      if (safe) {
        var pins = pinsFrom(bA, to);
        if (pins.length > 0) {
          var pn = pins[0];
          if (pn.skewer) R.push(new Reason("pin", "Espeto: a peça da frente (" + THE[E.pType(bA[pn.front])] + " em " + sq(pn.front) + ") precisa sair e " + THE[E.pType(bA[pn.behind])] + " em " + sq(pn.behind) + " fica exposta."));
          else if (pn.abs) R.push(new Reason("pin", "Crava " + THE[E.pType(bA[pn.pinned])] + " em " + sq(pn.pinned) + ": ele não pode se mover sem expor o rei."));
          else R.push(new Reason("pin", "Crava " + THE[E.pType(bA[pn.pinned])] + " em " + sq(pn.pinned) + ": se ele se mover, " + THE[E.pType(bA[pn.behind])] + " em " + sq(pn.behind) + " fica exposta."));
        }
      }
    }

    if (flag == E.FLAG_CASTLE) R.push(new Reason("castle", "Roque: protege o rei e coloca a torre em jogo com um único lance."));
    var initial = us == 1 ? [1, 2, 5, 6] : [57, 58, 61, 62];
    if ((piece == E.KNIGHT || piece == E.BISHOP) && initial.indexOf(from) >= 0 && capt == 0 && !chk) {
      var rim = (to & 7) == 0 || (to & 7) == 7;
      R.push(new Reason("develop", "Desenvolve " + THE[piece] + ": sai da casa inicial e entra no jogo" + (rim ? "." : ", com boa influência sobre o centro.")));
    }
    if (piece == E.PAWN && opening && [27, 28, 35, 36].indexOf(to) >= 0 && capt == 0) R.push(new Reason("center", "Ocupa o centro com um peão: ganha espaço e abre caminho para bispos e dama."));
    if (piece == E.ROOK && capt == 0 && flag != E.FLAG_CASTLE) {
      var f = to & 7; var own = 0; var opp = 0;
      for (i in 0...64) { if (b0[i] == E.PAWN * us && (i & 7) == f) own++; if (b0[i] == E.PAWN * them && (i & 7) == f) opp++; }
      if (own == 0 && f != (from & 7)) R.push(new Reason("rookfile", opp == 0 ? "Coloca a torre numa coluna aberta, onde ela ataca com todo o alcance." : "Coloca a torre numa coluna semiaberta, pressionando os peões adversários."));
    }
    if (piece == E.PAWN && capt == 0 && isPassedPawn(bA, to, us) && (us == 1 ? (to >> 3) : 7 - (to >> 3)) >= 4) R.push(new Reason("passed", "Avança um peão passado: nenhum peão adversário pode detê-lo, e ele ameaça virar dama."));
    if (piece == E.KING && flag != E.FLAG_CASTLE && E.isEndgame(pos0) && centerDist(to) < centerDist(from)) R.push(new Reason("kingEnd", "Aproxima o rei do centro: no final de jogo ele é uma peça ativa."));
    if (R.length == 0 && piece != E.PAWN && piece != E.KING) {
      var T = us == 1 ? E.PSTW : E.PSTB;
      if (T[piece][to] - T[piece][from] >= 15) R.push(new Reason("active", "Leva " + THE[piece] + " para uma casa mais ativa, com mais alcance."));
    }
    return R;
  }

  /* ---------- por que o lance foi pior ---------- */
  static function positionalIssues(pos0:Pos, m:Int, bestTags:Map<String, Bool>, posA:Pos):Array<Issue> {
    var out:Array<Issue> = []; var b = pos0.board; var us = pos0.turn;
    var from = m & 63; var to = (m >> 6) & 63; var flag = m >> 15;
    var t = E.pType(b[from]);
    var capture = b[to] != 0 || flag == E.FLAG_EP;
    var opening = pos0.full <= 12; var undev = undevelopedMinors(b, us);
    var initSq = (us == 1 ? [1, 2, 5, 6] : [57, 58, 61, 62]).indexOf(from) >= 0;
    var bt = function(tag:String) return bestTags.exists(tag);
    var developing = (t == E.KNIGHT || t == E.BISHOP) && initSq;
    function add(concept:String, text:String, hard:Bool) out.push(new Issue(concept, text, hard));

    if (t == E.QUEEN && opening && !capture && undev >= 2 && pos0.full <= 8)
      add("queenEarly", "Você tirou a dama cedo demais. Fora de casa ela vira alvo: o adversário ganha tempo atacando-a enquanto suas outras peças seguem paradas.", true);
    if (opening && !capture && (t == E.KNIGHT || t == E.BISHOP) && !initSq && undev >= 1 && (bt("develop") || bt("castle") || bt("center")))
      add("develop", "Você moveu " + THE[t] + " que já estava em jogo, enquanto ainda há " + undev + (undev == 1 ? " peça" : " peças") + " na casa inicial. Na abertura, cada lance deve trazer uma peça nova.", false);
    if (t == E.KNIGHT && !capture && ((to & 7) == 0 || (to & 7) == 7))
      add("rim", "O cavalo foi para a borda do tabuleiro, onde controla poucas casas (4 em vez de 8).", true);
    if (t == E.PAWN && opening && !capture && ((from & 7) == 0 || (from & 7) == 7) && undev >= 2)
      add("center", "Lance de peão de flanco (coluna a ou h): não ajuda no centro nem no desenvolvimento das peças.", true);
    if (pos0.full >= 7 && kingInCenter(pos0, us) && bt("castle") && flag != E.FLAG_CASTLE)
      add("castle", "Seu rei ainda está no centro e o roque estava disponível. Rei no centro vira alvo quando as colunas se abrem.", false);
    else if (t == E.KING && flag != E.FLAG_CASTLE && kingInCenter(pos0, us) && (pos0.castling & (us == 1 ? 3 : 12)) != 0 && pos0.full <= 20)
      add("castle", "Mover o rei assim faz você perder o direito de roque, e o rei fica no centro.", true);
    if (t == E.PAWN && castledSide(pos0, us) && !capture && Math.abs((from & 7) - (pos0.king[E.sideIdx(us)] & 7)) <= 1 && (us == 1 ? (from >> 3) == 1 : (from >> 3) == 6))
      add("kingShield", "Você mexeu num peão que protegia seu rei roqueado. Cada peão a menos na frente do rei abre uma porta ao ataque.", false);
    if (posA != null) {
      var w0 = pawnWeak(b, us); var w1 = pawnWeak(posA.board, us);
      if (w1[0] > w0[0]) add("pawns", "Esse lance cria peões dobrados (dois na mesma coluna), que se protegem mal.", false);
      else if (w1[1] > w0[1]) add("pawns", "Esse lance deixa um peão isolado, sem peões vizinhos para protegê-lo.", false);
    }
    if (!capture && (t == E.KNIGHT || t == E.BISHOP || t == E.ROOK) && (to >> 3) == (us == 1 ? 0 : 7) && (from >> 3) != (us == 1 ? 0 : 7) && posA != null) {
      var threatened = false;
      for (th in threatsAgainst(pos0, us)) if (th.sq == from) threatened = true;
      if (!threatened) add("activity", "Recuar " + THE[t] + " para a primeira fila tira " + gen(t, "ele", "ela") + " da ação e dá tempo ao adversário.", false);
    }
    if (E.isEndgame(pos0) && t != E.KING && bestTags.exists("kingEnd"))
      add("endgameKing", "No final de jogo o rei é peça de ataque: aproximá-lo do centro era mais útil.", false);
    if (opening && undev >= 1 && !developing && flag != E.FLAG_CASTLE && bt("develop") && out.length == 0)
      add("develop", "Ainda havia " + undev + (undev == 1 ? " peça" : " peças") + " na casa inicial. Priorize colocá-las em jogo antes de outros planos.", false);
    if (opening && bt("center") && out.length == 0 && !(t == E.PAWN && [27, 28, 35, 36].indexOf(to) >= 0) && !developing)
      add("center", "O centro (d4, e4, d5, e5) estava livre. Peões ali dão espaço às suas peças.", false);
    var seen = new Map<String, Bool>(); var res:Array<Issue> = [];
    for (x in out) { if (!seen.exists(x.concept)) { seen.set(x.concept, true); res.push(x); } }
    return res.slice(0, 2);
  }

  static function explainMistake(pos0:Pos, mine:Scored, best:Scored, bestSan:String, bestReasons:Array<Reason>):{problems:Array<String>, concept:String} {
    var us = pos0.turn; var them = -us; var m = mine.m;
    var from = m & 63; var to = (m >> 6) & 63;
    var piece = E.pType(pos0.board[from]);
    var A = pos0.clone(); E.makeMove(A, m);
    var problems:Array<String> = []; var concept:String = null;
    var bestTags = new Map<String, Bool>();
    for (r in bestReasons) bestTags.set(r.tag, true);

    if (mine.score <= -E.MATE + 100) {
      var n = mateIn(mine.score);
      problems.push("Seu lance permite xeque-mate em " + n + (n == 1 ? " lance." : " lances."));
      if (mine.pv.length > 1) problems.push("O adversário joga " + E.moveToSAN(A, mine.pv[1]) + " e a sua posição desmorona.");
      concept = "kingSafety";
    } else if (best.score >= E.MATE - 100 && mine.score < E.MATE - 100) {
      var n = mateIn(best.score);
      problems.push("Você tinha xeque-mate forçado em " + n + (n == 1 ? " lance" : " lances") + " com " + bestSan + ".");
      concept = "mate";
    }

    if (problems.length == 0) {
      var dMine = pvMaterialDelta(pos0, mine.pv, us); var dBest = pvMaterialDelta(pos0, best.pv, us);
      var lost = -dMine;
      if (lost >= 100 && dMine < dBest - 80 && mine.pv.length > 1) {
        var reply = mine.pv[1];
        var rf = reply & 63; var rt = (reply >> 6) & 63; var rflag = reply >> 15;
        var capSq = rflag == E.FLAG_EP ? rt - them * 8 : rt;
        var victim = E.pType(A.board[capSq]);
        var attacker = E.pType(A.board[rf]);
        var replySan = E.moveToSAN(A, reply);
        if (victim != 0 && capSq == to) {
          var defs = E.attackerList(A.board, to, us).length;
          if (defs == 0) problems.push(cap1(YOUR[piece]) + " em " + sq(to) + " ficou sem proteção: " + replySan + " captura de graça.");
          else problems.push(cap1(THEIR[attacker]) + " captura " + YOUR[piece] + " em " + sq(to) + " (" + replySan + "). Mesmo com proteção, a troca é desfavorável: você dá " + PTS[piece] + " e recebe " + PTS[attacker] + ".");
          concept = "hanging";
        } else if (victim != 0) {
          var wasThreat = false;
          for (th in threatsAgainst(pos0, us)) if (th.sq == capSq) wasThreat = true;
          var defsBefore = E.attackerList(pos0.board, capSq, us);
          if (wasThreat) { problems.push("Você ignorou uma ameaça: " + YOUR[victim] + " em " + sq(capSq) + " já estava atacad" + gen(victim, "o", "a") + " e continuou sem defesa suficiente (" + replySan + ")."); concept = "threat"; }
          else if (defsBefore.indexOf(from) >= 0) { problems.push("Seu lance tirou a proteção " + DO[victim] + " em " + sq(capSq) + ": agora " + replySan + " ganha " + gen(victim, "o ", "a ") + NAME[victim] + "."); concept = "hanging"; }
          else { problems.push("Seu lance deixou " + YOUR[victim] + " em " + sq(capSq) + " vulnerável: " + replySan + " captura " + gen(victim, "o", "a") + "."); concept = "hanging"; }
        } else {
          problems.push("Depois de " + replySan + ", uma sequência de trocas deixa você em desvantagem de material.");
          concept = "trade";
        }
        problems.push("Resultado: você perde cerca de " + pontos(lost) + " de material.");
      } else if (dBest - dMine >= 100 || (dBest >= 100 && bestTags.exists("capture"))) {
        problems.push("Você deixou passar uma oportunidade de ganhar material.");
        concept = "tactics";
      } else if (bestTags.exists("fork") || bestTags.exists("check") || bestTags.exists("pin")) {
        problems.push("Havia uma tática melhor na posição que você não aproveitou.");
        concept = bestTags.exists("fork") ? "fork" : (bestTags.exists("pin") ? "pin" : "tactics");
      }
    }
    if (problems.length == 0) {
      var pos = positionalIssues(pos0, m, bestTags, A);
      for (p in pos) problems.push(p.text);
      if (pos.length > 0) concept = pos[0].concept;
    }
    if (problems.length == 0) {
      problems.push("Não há uma perda concreta de material, mas a posição fica menos favorável do que com a alternativa.");
      concept = "solid";
    }
    return {problems: problems, concept: concept};
  }

  /* ---------- avaliação em texto ---------- */
  /* chance de vitória (modelo do Lichess): 50 + 50 * (2 / (1 + e^(-0.00368208 * cp)) - 1) */
  public static function winPct(cp:Float):Float {
    if (cp >= E.MATE - 200) return 100;
    if (cp <= -E.MATE + 200) return 0;
    var c = Math.max(-2000, Math.min(2000, cp));
    return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
  }
  /* precisão do lance (fórmula do Lichess) a partir da queda na chance de vitória */
  public static function moveAccuracy(drop:Float):Float {
    var a = 103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669;
    return Math.max(0, Math.min(100, a));
  }
  public static function evalText(wcp:Int):String {
    if (Math.abs(wcp) >= E.MATE - 100) return (wcp > 0 ? "Brancas" : "Pretas") + " dão mate em " + mateIn(wcp);
    var a = Math.abs(wcp); var side = wcp > 0 ? "Brancas" : "Pretas";
    var v = Math.round(wcp / 10) / 10;
    var num = (v > 0 ? "+" : "") + v;
    if (a < 30) return "Posição equilibrada (" + num + ")";
    if (a < 100) return side + " com leve vantagem (" + num + ")";
    if (a < 300) return side + " com vantagem clara (" + num + ")";
    return side + " com vantagem decisiva (" + num + ")";
  }
  static function setGrade(fb:Feedback, g:String) {
    fb.grade = g;
    switch (g) {
      case "best": fb.label = "Melhor jogada"; fb.icon = "!"; fb.sym = ""; fb.color = 0x1C7C4D;
      case "great": fb.label = "Ótimo lance"; fb.icon = "+"; fb.sym = ""; fb.color = 0x2D8A5A;
      case "good": fb.label = "Bom lance"; fb.icon = "+"; fb.sym = ""; fb.color = 0x5B8A3A;
      case "book": fb.label = "Lance de livro"; fb.icon = "L"; fb.sym = ""; fb.color = 0x5B8A3A;
      case "inaccuracy": fb.label = "Imprecisão"; fb.icon = "?!"; fb.sym = "?!"; fb.color = 0xA97C00;
      case "mistake": fb.label = "Erro"; fb.icon = "?"; fb.sym = "?"; fb.color = 0xD0680C;
      case "blunder": fb.label = "Gafe"; fb.icon = "??"; fb.sym = "??"; fb.color = 0xC0322B;
      default: fb.label = "Lance forçado"; fb.icon = "-"; fb.sym = ""; fb.color = 0x5A6870;
    }
  }
  /* limites do Lichess: imprecisão >= 5 pontos de chance, erro >= 10, gafe >= 15 */
  static function gradeOf(loss:Float):String {
    if (loss <= 1.0) return "best";
    if (loss <= 2.5) return "great";
    if (loss < 5) return "good";
    if (loss < 10) return "inaccuracy";
    if (loss < 15) return "mistake";
    return "blunder";
  }

  /* ---------- análise: melhor lance + nota exata do lance jogado ---------- */
  public static function analyze(pos0:Pos, m:Int):{best:Scored, mine:Scored, depth:Int} {
    var r = E.searchBest(pos0.clone(), 20, AN_TIME, AN_NODES);
    var d = E.lastDepth;
    if (d < 1) d = 1;
    var mine:Scored = r.m == m ? r : E.rootOne(pos0.clone(), m, d, new Ctx(AN_TIME, AN_NODES));
    if (mine == null && d > 1) {
      d = d - 1;
      var b2 = E.rootOne(pos0.clone(), r.m, d, new Ctx(AN_TIME, AN_NODES));
      mine = E.rootOne(pos0.clone(), m, d, new Ctx(AN_TIME, AN_NODES));
      if (b2 != null) r = b2;
    }
    if (mine == null) mine = new Scored(m, r.score - 50, [m]);
    if (mine.score > r.score) r = new Scored(r.m, mine.score, r.pv);
    /* análise pré-calculada do Stockfish (posições da base de mestres) */
    var sfl = Book.sfMoves(pos0);
    if (sfl != null && sfl.length > 0) {
      var bm = E.uciToMove(pos0, sfl[0][0]);
      if (bm >= 0) {
        var bScore:Int = sfl[0][1];
        var uci = E.moveToUCI(m);
        var mineSF:Null<Int> = null;
        for (x in sfl) if (x[0] == uci) mineSF = x[1];
        var bestMine:Scored = bm == r.m ? r : (bm == m ? mine : E.rootOne(pos0.clone(), bm, d, new Ctx(AN_TIME, AN_NODES)));
        if (bestMine == null) bestMine = new Scored(bm, r.score, [bm]);
        if (mineSF == null) mineSF = bScore - Std.int(Math.max(0, bestMine.score - mine.score));
        /* lance popular entre mestres com nota quase igual vira a recomendação */
        var mm = Book.masterMoves(pos0);
        var chosen = bm; var chosenScore = bScore;
        if (mm != null && pos0.full <= 15) {
          var bmIsMaster = false;
          for (x in mm) { var sh:Float = x[2]; if (x[0] == sfl[0][0] && sh >= 0.05) bmIsMaster = true; }
          if (!bmIsMaster) for (x in mm) { var sh:Float = x[2]; if (sh < 0.08) continue; for (y in sfl) if (y[0] == x[0] && y[1] >= bScore - 30) { chosen = E.uciToMove(pos0, y[0]); chosenScore = Std.int(Math.max(y[1], bScore - 10)); break; } if (chosen != bm) break; }
        }
        var pvBest = chosen == bestMine.m ? bestMine.pv : (chosen == m ? mine.pv : [chosen]);
        if (chosen == bm) pvBest = bestMine.pv;
        var best = new Scored(chosen, chosenScore, pvBest);
        var mineOut = new Scored(m, Std.int(Math.min(mineSF, chosenScore)), mine.pv);
        if (m == chosen) mineOut = new Scored(m, chosenScore, mine.pv);
        sfUsed = true;
        return {best: best, mine: mineOut, depth: Std.int(Math.max(d, 11))};
      }
    }
    sfUsed = false;
    r = preferMaster(pos0, r, d, m == r.m ? null : mine);
    if (m == r.m) mine = r;
    return {best: r, mine: mine, depth: d};
  }
  public static var sfUsed = false;

  /* na abertura, se um lance popular entre mestres tiver nota quase igual, ele vira a recomendação */
  static function preferMaster(pos0:Pos, r:Scored, d:Int, mine:Scored):Scored {
    if (pos0.full > 15) return r;
    var mm = Book.masterMoves(pos0);
    if (mm == null) return r;
    var bestUci = E.moveToUCI(r.m);
    for (x in mm) if (x[0] == bestUci && x[2] >= 0.05) return r;
    var tried = 0;
    for (x in mm) {
      var sh:Float = x[2];
      if (sh < 0.08 || tried >= 3) continue;
      tried++;
      var mv = E.uciToMove(pos0, x[0]);
      if (mv < 0) continue;
      var sc = (mine != null && mine.m == mv) ? mine : E.rootOne(pos0.clone(), mv, d, new Ctx(1500, 15000));
      if (sc != null && sc.score >= r.score - 30) return new Scored(sc.m, Std.int(Math.max(sc.score, r.score - 10)), sc.pv);
    }
    return r;
  }

  public static function buildFeedback(pos0:Pos, m:Int, ucisBefore:Array<String>):Feedback {
    var legal = E.legalMoves(pos0); var san = E.moveToSAN(pos0, m, legal);
    var fb = new Feedback();
    fb.san = san;
    if (legal.length == 1) {
      setGrade(fb, "forced"); fb.headline = "Lance forçado"; fb.good = ["Era a única jogada legal."]; fb.bestSan = san; fb.bestM = m;
      return fb;
    }
    var an = analyze(pos0, m);
    var best = an.best; var mine = an.mine;
    var w = function(c:Int) return pos0.turn == 1 ? c : -c;
    var loss = winPct(best.score) - winPct(mine.score);
    if (loss < 0) loss = 0;
    var grade = gradeOf(loss);
    var bestSan = E.moveToSAN(pos0, best.m, legal);
    var uci = E.moveToUCI(m);
    var book = Book.inBook(ucisBefore.concat([uci]));
    var mm = Book.masterMoves(pos0);
    var masterShare = 0.0;
    if (mm != null) for (x in mm) if (x[0] == uci) masterShare = x[2];
    if (masterShare >= 0.05) book = true;
    var strongBook = masterShare >= 0.1 && mine.score > -E.MATE + 200;
    var bestReasons = moveReasons(pos0, best.m, best.score);
    var overrideIssues:Array<Issue> = null;
    if (pos0.full <= 12 && m != best.m && (grade == "great" || grade == "good" || grade == "best" || grade == "inaccuracy")) {
      var A0 = pos0.clone(); E.makeMove(A0, m);
      var tags = new Map<String, Bool>();
      for (r in bestReasons) tags.set(r.tag, true);
      var iss:Array<Issue> = [];
      for (x in positionalIssues(pos0, m, tags, A0)) if (x.hard) iss.push(x);
      if (iss.length > 0 && mine.score < best.score - 5) { grade = "inaccuracy"; overrideIssues = iss; }
    }
    if (overrideIssues == null && book && (grade == "inaccuracy" || grade == "good" || grade == "great") && loss < 10) grade = "book";
    if (strongBook && grade != "best") { grade = "book"; overrideIssues = null; }
    setGrade(fb, grade);
    fb.bestSan = bestSan; fb.bestM = best.m; fb.depth = an.depth; fb.hasEval = true;
    fb.evalBefore = w(best.score); fb.evalAfter = w(mine.score); fb.loss = loss;
    fb.replyM = mine.pv.length > 1 ? mine.pv[1] : -1;
    fb.winBefore = winPct(best.score); fb.winAfter = winPct(mine.score);
    fb.accuracy = moveAccuracy(fb.winBefore - fb.winAfter);
    fb.bestLine = lineSAN(pos0, best.pv, 4);
    fb.sf = sfUsed;
    if (mm != null) {
      fb.masters = mm;
      if (masterShare > 0) fb.masterNote = "Seu lance aparece em " + Math.round(masterShare * 100) + "% das partidas de mestres nesta posição.";
      else fb.masterNote = "Mestres não costumam jogar este lance aqui.";
    }
    for (r in bestReasons.slice(0, 3)) fb.bestWhy.push(r.text);
    var isBest = m == best.m || mine.score >= best.score - 5;
    if (!fb.isBad()) {
      for (r in moveReasons(pos0, m, mine.score).slice(0, 3)) fb.good.push(r.text);
      if (grade == "book") fb.good.insert(0, "Lance conhecido da teoria de aberturas.");
      if (fb.good.length == 0) fb.good.push("Lance sólido: mantém a posição equilibrada e sem riscos.");
      if (!isBest && best.score - mine.score >= 15) fb.altNote = "O motor prefere " + bestSan + ", mas a diferença é pequena.";
      fb.headline = grade == "best" ? "Excelente! Você achou o melhor lance." : (grade == "great" ? "Ótimo lance, quase igual ao melhor." : (grade == "book" ? "Lance de livro." : "Bom lance."));
    } else {
      var ex = overrideIssues != null ? {problems: [for (x in overrideIssues) x.text], concept: overrideIssues[0].concept} : explainMistake(pos0, mine, best, bestSan, bestReasons);
      fb.problems = ex.problems; fb.concept = ex.concept;
      fb.headline = grade == "inaccuracy" ? "Imprecisão: havia algo melhor." : (grade == "mistake" ? "Erro: esse lance custa caro." : "Gafe: um lance muito ruim.");
      if (fb.concept != null && TIPS.exists(fb.concept)) fb.tip = TIPS.get(fb.concept);
    }
    return fb;
  }

  /* linha em notação: "1. Cc3 Cf6 2. Cf3" */
  public static function lineSAN(pos0:Pos, pv:Array<Int>, n:Int):String {
    var P = pos0.clone(); var out = "";
    var k = 0;
    for (m in pv) {
      if (k >= n) break;
      var legal = E.legalMoves(P);
      if (legal.indexOf(m) < 0) break;
      var num = P.full;
      if (P.turn == 1) out += num + ". "; else if (k == 0) out += num + "... ";
      out += E.moveToSAN(P, m, legal) + " ";
      E.makeMove(P, m); k++;
    }
    return StringTools.trim(out);
  }

  /* sugestão prática para o próximo lance, ligada ao erro cometido */
  public static var TIPS:Map<String, String> = [
    "hanging" => "Antes de soltar a peça, pergunte: \"quem pode capturar esta peça na casa nova?\" Conte atacantes e defensores.",
    "threat" => "Depois de cada lance do adversário, faça a pergunta: \"o que ele está ameaçando agora?\" Só depois pense no seu plano.",
    "trade" => "Some os valores antes de trocar: você só deve entregar peça se receber igual ou mais.",
    "mate" => "Comece sempre olhando os xeques. Em posições de ataque, um xeque forte costuma decidir.",
    "kingSafety" => "Olhe as casas em volta do seu rei: alguma peça adversária consegue chegar nelas com xeque?",
    "tactics" => "Treine o hábito: xeques, capturas e ameaças, nessa ordem, para os dois lados.",
    "center" => "Na abertura, prefira lances de peão no centro (e4, d4, e5, d5) e de cavalos e bispos.",
    "develop" => "Conte suas peças em casa: enquanto houver cavalo ou bispo parado, priorize tirá-lo.",
    "castle" => "Tente fazer o roque até o lance 10. Rei seguro primeiro, ataque depois.",
    "queenEarly" => "Guarde a dama para depois dos cavalos e bispos. Ela vira alvo se sair cedo.",
    "rim" => "Cavalos rendem mais em c3, f3, c6, f6 e no centro.",
    "pawns" => "Antes de mexer um peão, pense: ele vai deixar uma casa fraca ou um peão sozinho?",
    "kingShield" => "Depois do roque, só avance os peões do rei com um motivo concreto.",
    "activity" => "Procure a peça que faz menos e dê a ela uma casa melhor.",
    "endgameKing" => "No final, o rei é uma peça forte: leve-o para o centro.",
    "fork" => "Antes de mover, veja se o cavalo adversário consegue atacar duas peças suas de uma vez.",
    "pin" => "Evite deixar peças alinhadas com o rei ou a dama numa mesma linha ou diagonal.",
    "solid" => "Quando não houver tática, melhore a pior peça e coloque torres em colunas abertas."
  ];

  /* ---------- plano para a posição ---------- */
  public static function plan(pos:Pos, color:Int):Array<String> {
    var out:Array<String> = []; var b = pos.board; var them = -color;
    var mine = threatsAgainst(pos, color);
    if (mine.length > 0) {
      var t = mine[0];
      out.push("Primeiro, cuide " + DO[t.type] + " em " + sq(t.sq) + ": " + gen(t.type, "ele", "ela") + " está ameaçad" + gen(t.type, "o", "a") + (t.undefended ? " e sem proteção." : "."));
    }
    var theirs = threatsAgainst(pos, them);
    if (theirs.length > 0) {
      var t = theirs[0];
      out.push("Há material para ganhar: " + THEIR[t.type] + " em " + sq(t.sq) + " está mal protegid" + gen(t.type, "o", "a") + ".");
    }
    var eg = E.isEndgame(pos);
    var undev:Array<String> = [];
    var home = color == 1 ? [1, 6, 2, 5] : [57, 62, 58, 61];
    for (s2 in home) if (b[s2] == color * E.KNIGHT || b[s2] == color * E.BISHOP) undev.push(NAME[E.pType(b[s2])] + " de " + sq(s2));
    var canCastle = (pos.castling & (color == 1 ? 3 : 12)) != 0;
    var kInCenter = kingInCenter(pos, color);
    if (!eg && pos.full <= 15) {
      if (undev.length > 0) out.push("Desenvolva as peças que estão em casa: " + undev.slice(0, 3).join(", ") + ".");
      var cen = color == 1 ? [27, 28] : [35, 36];
      var hasCenter = b[cen[0]] == color * E.PAWN || b[cen[1]] == color * E.PAWN;
      if (!hasCenter && pos.full <= 6) out.push("Ocupe o centro com um peão (" + (color == 1 ? "e4 ou d4" : "e5 ou d5") + ").");
      if (kInCenter && canCastle) out.push("Prepare o roque: libere as casas entre o rei e a torre" + (undev.length == 0 ? " e faça o roque já." : "."));
    } else if (!eg) {
      if (kInCenter && canCastle) out.push("Seu rei ainda está no centro: faça o roque antes de abrir o jogo.");
      // torre para coluna aberta
      var cnt = [for (i in 0...16) 0];
      for (i in 0...64) { if (b[i] == E.PAWN) cnt[i & 7]++; if (b[i] == -E.PAWN) cnt[8 + (i & 7)]++; }
      var openF = -1;
      for (f in [3, 4, 2, 5, 1, 6, 0, 7]) if (cnt[f] == 0 && cnt[8 + f] == 0) { var occupied = false; for (r in 0...8) if (b[r * 8 + f] == color * E.ROOK) occupied = true; if (!occupied) { openF = f; break; } }
      if (openF >= 0) {
        var hasRook = false; for (i in 0...64) if (b[i] == color * E.ROOK) hasRook = true;
        if (hasRook) out.push("Leve uma torre para a coluna " + "abcdefgh".charAt(openF) + ", que está aberta.");
      }
      // peão isolado adversário
      var off = them == 1 ? 0 : 8;
      for (i in 0...64) if (b[i] == them * E.PAWN) {
        var f = i & 7;
        if ((f == 0 || cnt[off + f - 1] == 0) && (f == 7 || cnt[off + f + 1] == 0)) { out.push("Alvo: o peão isolado adversário em " + sq(i) + " não tem peões vizinhos para protegê-lo."); break; }
      }
      // pior peça
      var worst = -1; var worstV = 99999;
      var T = color == 1 ? E.PSTW : E.PSTB;
      for (i in 0...64) { var p = b[i] * color; if (p == E.KNIGHT || p == E.BISHOP) { var v = T[p][i]; if (v < worstV) { worstV = v; worst = i; } } }
      if (worst >= 0 && worstV <= -10) out.push("Melhore sua peça mais passiva: " + THE[E.pType(b[worst])] + " em " + sq(worst) + ".");
    } else {
      var k = pos.king[E.sideIdx(color)];
      if (centerDist(k) >= 3) out.push("Final de jogo: leve o rei para o centro, ele agora é uma peça de ataque.");
      for (i in 0...64) if (b[i] == color * E.PAWN && isPassedPawn(b, i, color)) { out.push("Você tem um peão passado em " + sq(i) + ": empurre-o com apoio do rei e das peças."); break; }
      for (i in 0...64) if (b[i] == them * E.PAWN && isPassedPawn(b, i, them)) { out.push("Bloqueie o peão passado adversário em " + sq(i) + " com uma peça ou com o rei."); break; }
    }
    if (out.length == 0) out.push("Não há tática imediata. Melhore a pior peça e procure fraquezas no campo adversário.");
    return out.slice(0, 3);
  }

  /* ---------- dica em etapas ---------- */
  public static function hintNudge(pos0:Pos, h:Hint):String {
    var tags = [for (r in moveReasons(pos0, h.m, h.score)) r.tag];
    var has = function(t:String) return tags.indexOf(t) >= 0;
    if (h.score >= E.MATE - 100) return "Existe um xeque-mate forçado! Comece olhando todos os xeques.";
    if (threatsAgainst(pos0, pos0.turn).length > 0 && (has("escape") || has("defend"))) return "Uma peça sua está em perigo. Resolva isso antes de qualquer plano.";
    if (has("fork")) return "Procure um lance que ataque duas peças ao mesmo tempo.";
    if (has("capture")) return "Há uma captura que ganha material. Olhe as peças adversárias mal protegidas.";
    if (has("pin")) return "Procure uma cravada: uma peça adversária alinhada com outra mais valiosa.";
    if (has("check")) return "Um xeque pode ser forte aqui.";
    if (has("castle")) return "Pense na segurança do seu rei.";
    if (has("develop")) return "Pense em desenvolvimento: qual peça ainda não saiu de casa?";
    if (has("center")) return "Pense no centro do tabuleiro.";
    if (has("passed")) return "Seu peão passado pode avançar.";
    if (has("kingEnd")) return "No final, o rei precisa participar.";
    if (pos0.board[(h.m >> 6) & 63] != 0) return "Há uma captura interessante. Olhe as peças adversárias que você pode tomar e o que acontece depois.";
    var A = pos0.clone(); E.makeMove(A, h.m);
    if (E.inCheck(A)) return "Um xeque pode ser forte aqui.";
    if (E.pType(pos0.board[h.m & 63]) == E.PAWN) return "Pense num lance de peão que melhore sua posição.";
    return plan(pos0, pos0.turn)[0];
  }
  public static function pieceNudge(pos0:Pos, h:Hint):String {
    var from = h.m & 63;
    return "Mova " + THE[E.pType(pos0.board[from])] + " que está em " + sq(from) + ".";
  }

  /* ---------- desequilíbrios (estilo Silman): [fator, vantagem (1 você, -1 adversário, 0 igual), explicação] ---------- */
  static function mobility(pos:Pos, color:Int):Int {
    var P = pos.clone(); P.turn = color; P.ep = -1;
    var n = 0;
    for (m in E.genPseudo(P, false)) { var t = E.pType(P.board[m & 63]); if (t != E.PAWN && t != E.KING) n++; }
    return n;
  }
  static function kingDanger(pos:Pos, color:Int):Int {
    var b = pos.board; var k = pos.king[E.sideIdx(color)]; var danger = 0;
    var zone = E.KING_T[k].concat([k]);
    for (s in zone) danger += E.attackerList(b, s, -color).length;
    var fr = (k >> 3) + color; var kf = k & 7; var shield = 0;
    if (fr >= 0 && fr < 8) for (df in -1...2) { var f2 = kf + df; if (f2 < 0 || f2 > 7) continue; if (b[fr * 8 + f2] == E.PAWN * color) shield++; var f3 = fr + color; if (f3 >= 0 && f3 < 8 && b[f3 * 8 + f2] == E.PAWN * color) shield++; }
    var center = kingInCenter(pos, color) && (pos.castling & (color == 1 ? 3 : 12)) == 0 ? 2 : 0;
    return danger * 2 + center * 2 - shield;
  }
  static function spaceOf(pos:Pos, color:Int):Int {
    var b = pos.board; var n = 0;
    for (s in 0...64) {
      if (b[s] != E.PAWN * color) continue;
      var rel = color == 1 ? (s >> 3) : 7 - (s >> 3);
      if (rel >= 4) n += rel - 3;
      var nr = (s >> 3) + color; var f = s & 7;
      if (nr >= 0 && nr < 8) for (df in [-1, 1]) { var f2 = f + df; if (f2 < 0 || f2 > 7) continue; var rel2 = color == 1 ? nr : 7 - nr; if (rel2 >= 4) n++; }
    }
    return n;
  }
  public static function imbalances(pos:Pos, color:Int):Array<Array<Dynamic>> {
    var out:Array<Array<Dynamic>> = []; var b = pos.board; var them = -color;
    var md = materialDiff(b, color);
    var bp = [0, 0];
    for (s in 0...64) if (E.pType(b[s]) == E.BISHOP) bp[b[s] > 0 ? 0 : 1]++;
    var myB = bp[E.sideIdx(color)]; var thB = bp[E.sideIdx(them)];
    var mt = md >= 80 ? "Você tem cerca de " + pontos(md) + " a mais." : (md <= -80 ? "O adversário tem cerca de " + pontos(-md) + " a mais." : "Material igual.");
    if (myB >= 2 && thB < 2) mt += " Você tem o par de bispos, forte em posições abertas.";
    else if (thB >= 2 && myB < 2) mt += " O adversário tem o par de bispos.";
    out.push(["Material", md >= 80 ? 1 : (md <= -80 ? -1 : (myB >= 2 && thB < 2 ? 1 : (thB >= 2 && myB < 2 ? -1 : 0))), mt]);
    var w0 = pawnWeak(b, color); var w1 = pawnWeak(b, them);
    var pp0 = 0; var pp1 = 0;
    for (s in 0...64) { if (b[s] == E.PAWN * color && isPassedPawn(b, s, color)) pp0++; if (b[s] == E.PAWN * them && isPassedPawn(b, s, them)) pp1++; }
    var s0 = w0[0] + w0[1] - pp0 * 2; var s1 = w1[0] + w1[1] - pp1 * 2;
    var st = [];
    if (pp0 > 0) st.push("você tem " + pp0 + (pp0 == 1 ? " peão passado" : " peões passados"));
    if (pp1 > 0) st.push("o adversário tem " + pp1 + (pp1 == 1 ? " peão passado" : " peões passados"));
    if (w0[1] > 0) st.push("você tem " + w0[1] + (w0[1] == 1 ? " peão isolado" : " peões isolados"));
    if (w1[1] > 0) st.push("o adversário tem " + w1[1] + (w1[1] == 1 ? " peão isolado" : " peões isolados"));
    if (w0[0] > 0) st.push("você tem peões dobrados");
    if (w1[0] > 0) st.push("o adversário tem peões dobrados");
    out.push(["Estrutura de peões", s0 < s1 ? 1 : (s0 > s1 ? -1 : 0), st.length > 0 ? cap1(st.join("; ")) + "." : "Estruturas parecidas, sem fraquezas claras."]);
    var m0 = mobility(pos, color); var m1 = mobility(pos, them);
    out.push(["Atividade das peças", m0 > m1 + 4 ? 1 : (m1 > m0 + 4 ? -1 : 0), "Suas peças têm " + m0 + " lances possíveis; as do adversário, " + m1 + ". " + (m0 > m1 + 4 ? "Suas peças estão mais ativas." : (m1 > m0 + 4 ? "As peças adversárias estão mais ativas: melhore a sua pior peça." : "Atividade equilibrada."))]);
    var sp0 = spaceOf(pos, color); var sp1 = spaceOf(pos, them);
    out.push(["Espaço", sp0 > sp1 + 2 ? 1 : (sp1 > sp0 + 2 ? -1 : 0), sp0 > sp1 + 2 ? "Você controla mais casas no campo adversário: use o espaço para manobrar." : (sp1 > sp0 + 2 ? "O adversário tem mais espaço: busque trocas e rupturas de peões." : "Espaço equilibrado.")]);
    var k0 = kingDanger(pos, color); var k1 = kingDanger(pos, them);
    out.push(["Segurança do rei", k0 + 2 < k1 ? 1 : (k1 + 2 < k0 ? -1 : 0), k1 + 2 < k0 ? "Seu rei está mais exposto: cuidado com colunas abertas e peças apontando para ele." : (k0 + 2 < k1 ? "O rei adversário está mais exposto: considere levar peças para atacá-lo." : "Os dois reis estão razoavelmente seguros.")]);
    var u0 = undevelopedMinors(b, color); var u1 = undevelopedMinors(b, them);
    var t0 = threatsAgainst(pos, them).length; var t1 = threatsAgainst(pos, color).length;
    var ini = (u1 - u0) + (t0 - t1);
    var itxt = (u0 != u1 && pos.full <= 15) ? (u0 < u1 ? "Você está mais desenvolvido. " : "O adversário está mais desenvolvido. ") : "";
    if (t0 > 0) itxt += "Você ameaça " + t0 + (t0 == 1 ? " peça" : " peças") + ". ";
    if (t1 > 0) itxt += "O adversário ameaça " + t1 + (t1 == 1 ? " peça sua" : " peças suas") + ". ";
    if (itxt == "") itxt = "Ninguém tem a iniciativa clara.";
    out.push(["Iniciativa", ini > 0 ? 1 : (ini < 0 ? -1 : 0), StringTools.trim(itxt)]);
    return out;
  }
  public static function imbalancesFEN(fen:String, color:Int):Array<Array<Dynamic>> return imbalances(E.posFromFEN(fen), color);

  /* ---------- avaliação do processo de pensamento ---------- */
  public static function realThreats(pos:Pos, color:Int):Array<Int> {
    var out = [for (t in threatsAgainst(pos, color)) t.sq];
    if (E.inCheck(pos) && pos.turn == color) out.push(pos.king[E.sideIdx(color)]);
    return out;
  }
  public static function processEval(fen:String, marked:Array<Int>, cands:Array<String>, played:String, best:String):Array<Array<Dynamic>> {
    var pos = E.posFromFEN(fen); var color = pos.turn;
    var real = realThreats(pos, color);
    var out:Array<Array<Dynamic>> = [];
    var found = [for (s in real) if (marked.indexOf(s) >= 0) s];
    var missed = [for (s in real) if (marked.indexOf(s) < 0) s];
    var extra = [for (s in marked) if (real.indexOf(s) < 0) s];
    if (real.length == 0 && marked.length == 0) out.push([1, "Ameaças: correto, nenhuma peça sua estava ameaçada."]);
    else if (missed.length == 0 && real.length > 0) out.push([1, "Ameaças: você encontrou todas (" + real.length + ")."]);
    else if (missed.length > 0) out.push([0, "Ameaças: faltou ver " + [for (s in missed) THE[E.pType(pos.board[s])] + " em " + sq(s)].join(", ") + "."]);
    if (extra.length > 0) out.push([0, "Você marcou " + extra.length + (extra.length == 1 ? " casa que não estava ameaçada." : " casas que não estavam ameaçadas.")]);
    if (cands.length < 2) out.push([0, "Liste pelo menos 2 lances candidatos: comparar é o que evita os erros."]);
    var bestSan = E.moveToSAN(pos, E.uciToMove(pos, best));
    if (cands.indexOf(best) >= 0) {
      out.push([1, "O lance mais indicado (" + bestSan + ") estava entre seus candidatos."]);
      if (played != best) out.push([0, "Você listou " + bestSan + " mas escolheu outro: compare os candidatos com mais calma antes de jogar."]);
    } else out.push([0, "O lance mais indicado (" + bestSan + ") não estava entre seus candidatos. Procure xeques, capturas e ameaças antes de escolher."]);
    return out;
  }

  /* ---------- temas dos quebra-cabeças ---------- */
  public static var THEMES:Map<String, Array<String>> = [
    "mate1" => ["Mate em 1", "Um único lance dá xeque-mate. Procure xeques que tiram todas as casas do rei."],
    "mate2" => ["Mate em 2", "Dois lances até o mate. O primeiro costuma forçar a resposta do adversário (xeque ou ameaça)."],
    "mate3" => ["Mate em 3", "Sequência forçada de três lances. Calcule as respostas forçadas a cada xeque."],
    "mate4" => ["Mate em 4", "Combinação longa: cada lance deve forçar a resposta."],
    "fork" => ["Garfo", "Uma peça ataca duas ao mesmo tempo; o adversário só salva uma."],
    "pin" => ["Cravada ou espeto", "Uma peça fica presa na linha de outra mais valiosa (ou do rei)."],
    "capture" => ["Ganhe material", "Há uma peça adversária mal protegida ou uma troca vantajosa."],
    "check" => ["Xeque forte", "Um xeque que força a resposta e prepara o ganho."],
    "threat" => ["Ameaça", "Um lance que cria uma ameaça difícil de defender."],
    "escape" => ["Salve a peça", "Sua peça está em perigo: tire-a com ganho de tempo."],
    "defend" => ["Defesa", "Encontre o lance que neutraliza a ameaça adversária."],
    "sacrifice" => ["Sacrifício", "Entregue material para ganhar algo maior: mate, tempo ou mais material."],
    "promo" => ["Promoção", "O peão chega à última fila e vira dama (ou outra peça)."],
    "tactic" => ["Tática", "Encontre a sequência que ganha vantagem."]
  ];

  public static function opponentNote(pos0:Pos, m:Int, humanColor:Int):Note {
    var n = new Note();
    n.san = E.moveToSAN(pos0, m);
    for (r in moveReasons(pos0, m, null).slice(0, 4)) n.reasons.push(r.text);
    var A = pos0.clone(); E.makeMove(A, m);
    if (E.inCheck(A) && E.legalMoves(A).length > 0) n.alerts.push("Você está em xeque: proteja o rei.");
    for (t in threatsAgainst(A, humanColor).slice(0, 3))
      n.alerts.push("Atenção: " + YOUR[t.type] + " em " + sq(t.sq) + " está " + (t.undefended ? "sem proteção e " : "") + "ameaçad" + gen(t.type, "o", "a") + ".");
    return n;
  }

  public static function buildHint(pos0:Pos):Hint {
    var h = new Hint();
    var r = E.searchBest(pos0.clone(), 20, AN_TIME, AN_NODES);
    r = preferMaster(pos0, r, E.lastDepth > 0 ? E.lastDepth : 1, null);
    h.m = r.m; h.score = r.score; h.san = E.moveToSAN(pos0, r.m);
    for (x in moveReasons(pos0, r.m, r.score).slice(0, 3)) h.reasons.push(x.text);
    if (h.reasons.length == 0) h.reasons.push("É o lance que o treinador considera mais seguro e ativo aqui.");
    for (t in threatsAgainst(pos0, pos0.turn).slice(0, 3)) h.alerts.push(cap1(YOUR[t.type]) + " em " + sq(t.sq) + " está ameaçad" + gen(t.type, "o", "a") + ".");
    return h;
  }
}
