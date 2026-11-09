package;

#if js
import World;
import UiJs as Ui;

/* Shogi (xadrez japonês): 9 x 9, promoções e o "lançamento" das peças capturadas (drops). */
class Shogi extends WGame {
  static var G6 = [[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [0, -1]];
  static var S5 = [[-1, 1], [0, 1], [1, 1], [-1, -1], [1, -1]];
  static var K8 = [[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1]];
  static var DG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  static var OR = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  static var STEPS:Array<Array<Array<Int>>> = [[], [[0, 1]], [], [[-1, 2], [1, 2]], S5, G6, [], [], K8, G6, G6, G6, G6, OR, DG];
  static var SLIDES:Array<Array<Array<Int>>> = [[], [], [[0, 1]], [], [], [], DG, OR, [], [], [], [], [], DG, OR];
  static var OK:Array<Array<Bool>> = null;
  static var VAL = [0, 100, 300, 380, 500, 580, 800, 980, 0, 620, 560, 560, 560, 1050, 1250];
  static var KJ = ["", "歩", "香", "桂", "銀", "金", "角", "飛", "玉", "と", "杏", "圭", "全", "馬", "龍"];
  static var LT = ["", "P", "L", "N", "S", "G", "B", "R", "K", "+P", "+L", "+N", "+S", "+B", "+R"];
  static var PT = ["", "Peão", "Lança", "Cavalo", "Prata", "Ouro", "Bispo", "Torre", "Rei", "Tokin", "Lança promovida", "Cavalo promovido", "Prata promovida", "Cavalo-dragão", "Rei-dragão"];
  public function new() {
    super();
    id = "shogi"; name = "Shogi"; era = "Japão · forma atual por volta do século XVI";
    sides = ["Sente (você embaixo)", "Gote"]; altOk = true; repLimit = 4;
    if (OK == null) {
      OK = [];
      for (t in 0...15) { var a = [for (i in 0...16) false]; for (st in STEPS[t]) a[(st[0] + 1) * 4 + st[1] + 1] = true; OK.push(a); }
    }
    story = [
      "O shogi chegou ao Japão vindo da China ou do Sudeste Asiático, por volta dos séculos X a XII, e é primo do xiangqi e do makruk. Peças de shogi do século XI foram encontradas no templo Kofuku-ji, em Nara.",
      "A forma atual, de 9 x 9 casas, se firmou por volta do século XVI. A grande novidade é única no mundo: a peça capturada muda de lado e pode voltar ao tabuleiro como sua, em qualquer casa vazia. Por isso as peças não têm cor; a direção da ponta mostra o dono.",
      "No período Edo, o xogunato patrocinava os melhores jogadores, e o título de Meijin passava de mestre para mestre. Hoje o shogi tem milhões de jogadores e profissionais famosos no Japão, como Sota Fujii."];
    rules = [
      "O objetivo é dar xeque-mate no rei. Sente (você, embaixo) começa.",
      "As peças andam como mostrado em \"As peças\". A ponta de cada peça aponta para o adversário.",
      "Promoção: ao entrar, sair ou andar dentro das três últimas fileiras, a peça pode promover (vira, com o ideograma em vermelho). Peão, lança e cavalo são obrigados a promover onde não poderiam mais andar.",
      "Peças capturadas vão para a sua mão. Na sua vez, em vez de mover, você pode colocar uma delas em qualquer casa vazia (toque nela e depois na casa).",
      "Não pode ter dois peões não promovidos na mesma coluna, nem dar xeque-mate colocando um peão da mão.",
      "Repetir a mesma posição quatro vezes é empate (sennichite)."];
    pieces = [["Rei (玉/王)", "Uma casa em qualquer direção."], ["Torre (飛)", "Quantas casas quiser na horizontal ou vertical. Promovida (龍): também uma casa na diagonal."],
      ["Bispo (角)", "Quantas casas quiser na diagonal. Promovido (馬): também uma casa na horizontal ou vertical."], ["General de ouro (金)", "Uma casa para a frente, nas diagonais da frente, para os lados ou para trás. Não promove."],
      ["General de prata (銀)", "Uma casa para a frente ou em qualquer diagonal. Promovido, anda como o ouro."], ["Cavalo (桂)", "Salta duas casas para a frente e uma para o lado; só para a frente. Promovido, anda como o ouro."],
      ["Lança (香)", "Quantas casas quiser só para a frente. Promovida, anda como o ouro."], ["Peão (歩)", "Uma casa para a frente, e captura assim também. Promovido (と, tokin), anda como o ouro."]];
  }
  inline function f(q:Int):Int return q % 9;
  inline function r(q:Int):Int return Std.int(q / 9);
  inline function at(x:Int, y:Int):Int return (x < 0 || y < 0 || x > 8 || y > 8) ? -1 : y * 9 + x;
  override public function init():Dynamic {
    var b = [for (i in 0...81) 0];
    var back = [2, 3, 4, 5, 8, 5, 4, 3, 2];
    for (x in 0...9) { b[at(x, 0)] = back[x]; b[at(x, 2)] = 1; b[at(x, 8)] = -back[x]; b[at(x, 6)] = -1; }
    b[at(1, 1)] = 6; b[at(7, 1)] = 7; b[at(1, 7)] = -7; b[at(7, 7)] = -6;
    return { b: b, h: [for (i in 0...16) 0], turn: 1 };
  }
  public function attacked(b:Array<Int>, sq:Int, by:Int):Bool {
    var x0 = f(sq); var y0 = r(sq);
    for (st in K8) {
      var a = at(x0 - st[0], y0 - st[1] * by);
      if (a >= 0 && b[a] * by > 0 && OK[b[a] * by][(st[0] + 1) * 4 + st[1] + 1]) return true;
    }
    for (dx in [-1, 1]) { var a = at(x0 - dx, y0 - 2 * by); if (a >= 0 && b[a] == 3 * by) return true; }
    for (dd in DG) {
      var x = x0 - dd[0]; var y = y0 - dd[1] * by;
      while (true) { var a = at(x, y); if (a < 0) break; if (b[a] != 0) { var t = b[a] * by; if (t == 6 || t == 13) return true; break; } x -= dd[0]; y -= dd[1] * by; }
    }
    for (dd in OR) {
      var x = x0 - dd[0]; var y = y0 - dd[1] * by;
      while (true) {
        var a = at(x, y); if (a < 0) break;
        if (b[a] != 0) { var t = b[a] * by; if (t == 7 || t == 14 || (t == 2 && dd[0] == 0 && dd[1] == 1)) return true; break; }
        x -= dd[0]; y -= dd[1] * by;
      }
    }
    return false;
  }
  function king(b:Array<Int>, side:Int):Int { for (q in 0...81) if (b[q] == 8 * side) return q; return -1; }
  function inCheck(b:Array<Int>, side:Int):Bool { var k = king(b, side); return k >= 0 && attacked(b, k, -side); }
  inline function zone(y:Int, side:Int):Bool return side == 1 ? y >= 6 : y <= 2;
  function pseudo(s:Dynamic):Array<Dynamic> {
    var b:Array<Int> = s.b; var h:Array<Int> = s.h; var side:Int = s.turn;
    var out:Array<Dynamic> = [];
    function add(fr:Int, to:Int, t:Int) {
      var ty = r(to); var promo = t <= 7 && t != 5;
      var last = side == 1 ? ty == 8 : ty == 0; var last2 = side == 1 ? ty >= 7 : ty <= 1;
      var must = ((t == 1 || t == 2) && last) || (t == 3 && last2);
      if (promo && (zone(r(fr), side) || zone(ty, side))) { out.push({ f: fr, t: to, pr: true, d: 0 }); if (!must) out.push({ f: fr, t: to, pr: false, d: 0 }); }
      else if (!must) out.push({ f: fr, t: to, pr: false, d: 0 });
    }
    for (q in 0...81) {
      var p = b[q]; if (p * side <= 0) continue;
      var t = p * side; var x = f(q); var y = r(q);
      for (st in STEPS[t]) { var to = at(x + st[0], y + st[1] * side); if (to >= 0 && b[to] * side <= 0) add(q, to, t); }
      for (dd in SLIDES[t]) {
        var xx = x + dd[0]; var yy = y + dd[1] * side;
        while (true) { var to = at(xx, yy); if (to < 0) break; if (b[to] * side > 0) break; add(q, to, t); if (b[to] != 0) break; xx += dd[0]; yy += dd[1] * side; }
      }
    }
    var base = side == 1 ? 0 : 8;
    var pawnFile = [for (i in 0...9) false];
    for (q in 0...81) if (b[q] == side) pawnFile[f(q)] = true;
    for (t in 1...8) {
      if (h[base + t] == 0) continue;
      for (q in 0...81) {
        if (b[q] != 0) continue;
        var y = r(q); var rel = side == 1 ? y : 8 - y;
        if ((t == 1 || t == 2) && rel == 8) continue;
        if (t == 3 && rel >= 7) continue;
        if (t == 1 && pawnFile[f(q)]) continue;
        out.push({ f: -1, t: q, pr: false, d: t });
      }
    }
    return out;
  }
  function make(s:Dynamic, m:Dynamic):Dynamic {
    var b:Array<Int> = (s.b : Array<Int>).copy(); var h:Array<Int> = (s.h : Array<Int>).copy(); var side:Int = s.turn;
    var base = side == 1 ? 0 : 8; var t:Int = m.t;
    if ((m.d : Int) > 0) { b[t] = side * (m.d : Int); h[base + (m.d : Int)]--; }
    else {
      var c = b[t];
      if (c != 0) { var ct = c < 0 ? -c : c; if (ct >= 9 && ct <= 12) ct = ct - 8; else if (ct == 13) ct = 6; else if (ct == 14) ct = 7; h[base + ct]++; }
      var p = b[m.f]; b[m.f] = 0;
      var pt = p * side;
      if (m.pr == true) pt = pt <= 4 ? pt + 8 : (pt == 6 ? 13 : 14);
      b[t] = pt * side;
    }
    return { b: b, h: h, turn: -side };
  }
  override public function moves(s:Dynamic):Array<Dynamic> {
    var side:Int = s.turn; var out:Array<Dynamic> = [];
    for (m in pseudo(s)) {
      var s2 = make(s, m);
      if (inCheck(s2.b, side)) continue;
      if ((m.d : Int) == 1 && inCheck(s2.b, -side)) {
        var any = false; for (m2 in pseudo(s2)) if (!inCheck(make(s2, m2).b, -side)) { any = true; break; }
        if (!any) continue;
      }
      out.push(m);
    }
    return out;
  }
  override public function apply(s:Dynamic, m:Dynamic):Dynamic return make(s, m);
  override public function over(s:Dynamic, ms:Array<Dynamic>):Dynamic {
    if (ms.length == 0) return { w: -(s.turn : Int), why: inCheck(s.b, s.turn) ? "xeque-mate" : "sem lances" };
    return null;
  }
  override public function eval(s:Dynamic):Float {
    var b:Array<Int> = s.b; var h:Array<Int> = s.h; var v = 0.0;
    for (q in 0...81) {
      var p = b[q]; if (p == 0) continue;
      var sd = p > 0 ? 1 : -1; var t = p * sd;
      var x = VAL[t];
      if (t == 1) x += (sd == 1 ? r(q) : 8 - r(q)) * 3;
      v += sd * x;
    }
    for (t in 1...8) { v += h[t] * VAL[t] * 1.12; v -= h[8 + t] * VAL[t] * 1.12; }
    for (sd in [1, -1]) {
      var k = king(b, sd); if (k < 0) continue;
      var guard = 0; var att = 0;
      for (st in K8) { var a = at(f(k) + st[0], r(k) + st[1]); if (a < 0) continue; if (b[a] * sd > 0) guard++; if (attacked(b, a, -sd)) att++; }
      v += sd * (guard * 14 - att * 22);
    }
    return v;
  }
  override public function tactical(s:Dynamic, m:Dynamic):Bool { var b:Array<Int> = s.b; return (m.d : Int) == 0 && b[m.t] != 0; }
  override public function order(s:Dynamic, ms:Array<Dynamic>):Array<Dynamic> {
    var b:Array<Int> = s.b;
    var sc = [for (m in ms) { var t:Int = m.t; var c = b[t]; var v = 0; if ((m.d : Int) == 0) { if (c != 0) v += VAL[c < 0 ? -c : c] * 10 - VAL[b[m.f] < 0 ? -b[m.f] : b[m.f]]; if (m.pr == true) v += 400; } else v -= 50; v; }];
    var idx = [for (i in 0...ms.length) i]; idx.sort(function(a, c) return sc[c] - sc[a]);
    return [for (i in idx) ms[i]];
  }
  override public function cfg(level:Int):Array<Float> return [[0, 0, 0], [1, 400, 90], [2, 1500, 0], [4, 3500, 0], [5, 5000, 0]][level];
  override public function src(m:Dynamic):Int return (m.d : Int) > 0 ? 1000 + (m.d : Int) : m.f;
  override public function lastCells(s:Dynamic, m:Dynamic):Array<Int> return (m.d : Int) > 0 ? [m.t] : [m.f, m.t];
  function sqn(q:Int):String return (9 - f(q)) + "abcdefghi".charAt(8 - r(q));
  override public function label(s:Dynamic, m:Dynamic):String {
    var b:Array<Int> = s.b;
    if ((m.d : Int) > 0) return PT[m.d] + " da mão em " + sqn(m.t);
    var t = b[m.f] < 0 ? -b[m.f] : b[m.f];
    return PT[t] + " " + sqn(m.f) + (b[m.t] != 0 ? "x" : "-") + sqn(m.t) + (m.pr == true ? " (promove)" : "");
  }
  override public function key(s:Dynamic):String return (s.b : Array<Int>).join(",") + "|" + (s.h : Array<Int>).join("") + s.turn;
  override public function choose(cands:Array<Dynamic>, done:Dynamic->Void) {
    var yes:Dynamic = null; var no:Dynamic = null;
    for (m in cands) if (m.pr == true) yes = m else no = m;
    if (yes == null || no == null) { done(cands[0]); return; }
    Ui.modal("Promover a peça?", "A peça entrou na zona de promoção.", [["Promover", function() done(yes), "pri"], ["Não promover", function() done(no)]]);
  }
  override public function status(s:Dynamic):String return inCheck(s.b, s.turn) ? ((s.turn : Int) == World.humanSide() ? "Seu rei está em xeque!" : "Xeque!") : null;
  function piece(x:Float, y:Float, t:Int, up:Bool, k:Float, sel:Bool):String {
    var sc = t == 8 ? 1.06 : (t == 1 || t == 9 ? 0.86 : (t == 2 || t == 3 || t == 10 || t == 11 ? 0.92 : 0.98));
    var kk = k * sc; var rot = up ? 0 : 180;
    var s = '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')">';
    s += '<path d="M0,' + (-46 * kk) + ' L' + (31 * kk) + ',' + (-31 * kk) + ' L' + (39 * kk) + ',' + (42 * kk) + ' L' + (-39 * kk) + ',' + (42 * kk) + ' L' + (-31 * kk) + ',' + (-31 * kk) + ' Z" fill="rgba(0,0,0,.3)" transform="translate(2 4)"/>';
    s += '<path d="M0,' + (-46 * kk) + ' L' + (31 * kk) + ',' + (-31 * kk) + ' L' + (39 * kk) + ',' + (42 * kk) + ' L' + (-39 * kk) + ',' + (42 * kk) + ' L' + (-31 * kk) + ',' + (-31 * kk) + ' Z" fill="#f4dfae" stroke="' + (sel ? "#2e9d4c" : "#7a5426") + '" stroke-width="' + (sel ? 6 : 2.5) + '"/>';
    var red = t >= 9;
    if (alt) s += '<text x="0" y="' + (12 * kk) + '" text-anchor="middle" font-size="' + (t >= 9 ? 30 : 38) * kk + '" font-weight="700" fill="' + (red ? "#b3261e" : "#1b1209") + '" font-family="Georgia,serif">' + LT[t] + '</text>';
    else s += '<text x="0" y="' + (16 * kk) + '" text-anchor="middle" font-size="' + (46 * kk) + '" font-weight="700" fill="' + (red ? "#b3261e" : "#1b1209") + '" font-family="\'Hiragino Mincho ProN\',\'Yu Mincho\',\'Noto Serif CJK JP\',\'Noto Serif CJK SC\',serif">' + KJ[t] + '</text>';
    return s + '</g>';
  }
  override public function svg(s:Dynamic, ui:Dynamic):String {
    var b:Array<Int> = s.b; var h:Array<Int> = s.h; var flip = ui.flip == true;
    var c = 100.0; var ox = 30.0; var oy = 120.0; var W = ox * 2 + 900; var H = oy * 2 + 900;
    function P(q:Int):Array<Float> { if (q < 0 || q >= 81) return null; var x = flip ? 8 - f(q) : f(q); var y = flip ? r(q) : 8 - r(q); return [ox + x * c + c / 2, oy + y * c + c / 2]; }
    var sb = new StringBuf();
    sb.add('<svg viewBox="0 0 ' + W + ' ' + H + '">' + World.DEFS);
    sb.add('<rect x="' + (ox - 16) + '" y="' + (oy - 16) + '" width="932" height="932" rx="10" fill="#c99a52"/><rect x="' + ox + '" y="' + oy + '" width="900" height="900" fill="#e8c27a"/>');
    sb.add('<g stroke="#4a2c0e" stroke-width="2.5">');
    for (i in 0...10) sb.add('<line x1="' + (ox + i * c) + '" y1="' + oy + '" x2="' + (ox + i * c) + '" y2="' + (oy + 900) + '"/><line x1="' + ox + '" y1="' + (oy + i * c) + '" x2="' + (ox + 900) + '" y2="' + (oy + i * c) + '"/>');
    sb.add('</g>');
    for (pp in [[3, 3], [6, 3], [3, 6], [6, 6]]) sb.add('<circle cx="' + (ox + pp[0] * c) + '" cy="' + (oy + pp[1] * c) + '" r="7" fill="#4a2c0e"/>');
    if (ui.thumb != true) {
      var last:Array<Int> = ui.last;
      if (last != null) for (q in last) { var a = P(q); if (a != null) sb.add('<rect x="' + (a[0] - 49) + '" y="' + (a[1] - 49) + '" width="98" height="98" fill="rgba(240,190,60,.35)"/>'); }
      var k = king(b, s.turn); if (k >= 0 && inCheck(b, s.turn)) { var a = P(k); sb.add('<rect x="' + (a[0] - 49) + '" y="' + (a[1] - 49) + '" width="98" height="98" fill="rgba(230,0,0,.4)"/>'); }
      var srcs:Array<Int> = ui.srcs;
      if ((ui.sel : Int) < 0 && srcs != null && ui.my == true) for (q in srcs) { var a = P(q); if (a != null) sb.add('<rect x="' + (a[0] - 46) + '" y="' + (a[1] - 46) + '" width="92" height="92" fill="none" stroke="rgba(46,157,76,.6)" stroke-width="3" stroke-dasharray="9 6"/>'); }
    }
    var sel:Int = ui.sel;
    for (q in 0...81) if (b[q] != 0) { var a = P(q); var p = b[q]; sb.add(piece(a[0], a[1], p < 0 ? -p : p, (p > 0) != flip, 0.98, q == sel)); }
    var tg:Array<Int> = ui.targets;
    if (tg != null) for (q in tg) { var a = P(q); if (a != null) sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="15" fill="rgba(30,130,55,.85)" stroke="#fff" stroke-width="3"/>'); }
    for (k in 0...2) {
      var side = (k == 0) != flip ? 1 : -1;
      var base = side == 1 ? 0 : 8;
      var y = k == 0 ? oy + 900 + 62 : oy - 62;
      var bottom = k == 0;
      sb.add('<rect x="' + ox + '" y="' + (y - 50) + '" width="900" height="100" rx="14" fill="rgba(0,0,0,.25)" stroke="rgba(220,181,92,.35)" stroke-width="2"/>');
      var xi = 0;
      for (t in [7, 6, 5, 4, 3, 2, 1]) {
        var n = h[base + t]; if (n == 0) continue;
        var x = ox + 64 + xi * 126;
        var isSel = bottom && sel == 1000 + t;
        sb.add(piece(x, y, t, bottom, 0.8, isSel));
        if (n > 1) sb.add('<circle cx="' + (x + 40) + '" cy="' + (y + 26) + '" r="18" fill="#2a1a0c" stroke="#f3d98c" stroke-width="2"/><text x="' + (x + 40) + '" y="' + (y + 34) + '" text-anchor="middle" font-size="22" font-weight="700" fill="#f3d98c">' + n + '</text>');
        if (bottom && ui.thumb != true) {
          if ((ui.sel : Int) < 0 && ui.my == true && ui.srcs != null && (ui.srcs : Array<Int>).indexOf(1000 + t) >= 0) sb.add('<rect x="' + (x - 46) + '" y="' + (y - 48) + '" width="92" height="96" fill="none" stroke="rgba(46,157,76,.6)" stroke-width="3" stroke-dasharray="9 6"/>');
          sb.add(World.hit(1000 + t, x - 55, y - 50, 110, 100));
        }
        xi++;
      }
      if (xi == 0) sb.add('<text x="' + (ox + 450) + '" y="' + (y + 9) + '" text-anchor="middle" font-size="26" fill="rgba(233,207,140,.55)" font-family="Georgia,serif">' + (bottom ? "sua mão" : "mão do adversário") + '</text>');
    }
    if (ui.thumb != true) for (q in 0...81) { var a = P(q); sb.add(World.hit(q, a[0] - 50, a[1] - 50, 100, 100)); }
    sb.add('</svg>');
    return sb.toString();
  }
}
#end
