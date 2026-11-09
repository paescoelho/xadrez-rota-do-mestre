package;

#if js
import World;

/* Pachisi (Índia), na versão para dois jogadores: tabuleiro em cruz, 4 peças cada e 6 búzios. */
class Pachisi extends WGame {
  static inline var C = 180; /* centro (charkoni): 9 * 19 + 9 */
  static var LOOP:Array<Int> = null; static var PATH:Array<Array<Int>> = null; static var CASTLE:Array<Int> = null;
  static inline function id2(x:Int, y:Int):Int return y * 19 + x;
  public function new() {
    super();
    id = "pachisi"; name = "Pachisi"; era = "Índia · desde a Idade Média";
    sides = ["Vermelhas", "Verdes"]; dice = true; flipOk = false; tossName = "búzios";
    note = "Versão para dois jogadores, com as regras mais citadas do pachisi tradicional.";
    if (LOOP == null) {
      LOOP = [];
      for (y in 11...19) LOOP.push(id2(8, y)); LOOP.push(id2(9, 18)); var y = 18; while (y >= 11) { LOOP.push(id2(10, y)); y--; }
      for (x in 11...19) LOOP.push(id2(x, 10)); LOOP.push(id2(18, 9)); var x = 18; while (x >= 11) { LOOP.push(id2(x, 8)); x--; }
      y = 7; while (y >= 0) { LOOP.push(id2(10, y)); y--; } LOOP.push(id2(9, 0)); for (yy in 0...8) LOOP.push(id2(8, yy));
      x = 7; while (x >= 0) { LOOP.push(id2(x, 8)); x--; } LOOP.push(id2(0, 9)); for (xx in 0...8) LOOP.push(id2(xx, 10));
      PATH = [];
      var south:Array<Int> = [for (yy in 11...18) id2(9, yy)];
      var startS = LOOP.indexOf(id2(9, 18));
      for (k in 0...68) south.push(LOOP[(startS + k) % 68]);
      var yy = 17; while (yy >= 11) { south.push(id2(9, yy)); yy--; }
      var north:Array<Int> = []; yy = 7; while (yy >= 1) { north.push(id2(9, yy)); yy--; }
      var startN = LOOP.indexOf(id2(9, 0));
      for (k in 0...68) north.push(LOOP[(startN + k) % 68]);
      for (y2 in 1...8) north.push(id2(9, y2));
      PATH = [south, north];
      CASTLE = [id2(9, 18), id2(18, 9), id2(9, 0), id2(0, 9), id2(8, 15), id2(10, 15), id2(15, 10), id2(15, 8), id2(8, 3), id2(10, 3), id2(3, 8), id2(3, 10)];
    }
    story = [
      "O pachisi é o jogo nacional da Índia, jogado num pano bordado em forma de cruz. O nome vem do hindi pachis, vinte e cinco, o maior lance dos búzios.",
      "O imperador mogol Akbar, no século XVI, jogava pachisi em pátios de palácio desenhados no chão, com pessoas vestidas de cores diferentes fazendo o papel das peças.",
      "Do pachisi vieram jogos de corrida do mundo inteiro: o ludo inglês, o parchís espanhol e o Ludo que se joga no Brasil. Na árvore, ele aparece entre os primos antigos do xadrez, também nascido na Índia."];
    rules = [
      "Cada um tem 4 peças, que começam no centro (o charkoni). O percurso desce pelo meio do seu braço da cruz, dá a volta inteira no tabuleiro e sobe de novo pelo meio do seu braço até o centro.",
      "Jogue os 6 búzios. Conte quantos caem com a abertura para cima: 2, 3 e 4 valem isso mesmo, 5 vale 5, 6 vale 6, 1 vale 10 e nenhum vale 25.",
      "Os lances 6, 10 e 25 são lances de graça: dão direito a jogar de novo, e só com eles uma peça nova sai do centro.",
      "Caindo numa casa com peças adversárias, você as captura e elas voltam ao centro; capturar também dá outro lance. As casas marcadas com X são castelos: ali ninguém é capturado.",
      "Para voltar ao centro é preciso o número exato. Vence quem levar primeiro as 4 peças de volta ao centro."];
    pieces = [["Peça (cone)", "Anda o valor dos búzios pelo seu percurso. Várias peças suas podem dividir a mesma casa."], ["Búzios", "Seis conchas de cauri fazem o papel dos dados."]];
  }
  override public function init():Dynamic return { p: [for (i in 0...8) -1], turn: 1, roll: null, ex: false, k: 0 };
  inline function base(side:Int):Int return side == 1 ? 0 : 4;
  inline function path(side:Int):Array<Int> return PATH[side == 1 ? 0 : 1];
  function cellOf(i:Int, pos:Int):Int { var sd = i < 4 ? 1 : -1; return pos < 0 || pos >= 82 ? C : path(sd)[pos]; }
  function onLoop(pos:Int):Bool return pos >= 7 && pos < 75;
  override public function moves(s:Dynamic):Array<Dynamic> {
    if (s.roll == null) return [];
    var p:Array<Int> = s.p; var me:Int = s.turn; var v:Int = s.roll; var grace = v == 6 || v == 10 || v == 25;
    var out:Array<Dynamic> = []; var seen:Array<Int> = [];
    for (i in base(me)...base(me) + 4) {
      var from = p[i]; if (from >= 82 || seen.indexOf(from) >= 0) continue;
      seen.push(from);
      var to = from < 0 ? (grace ? 0 : -9) : from + v;
      if (to < 0 || to > 82) continue;
      if (to < 82) {
        var cell = path(me)[to];
        var enemy = false; for (j in base(-me)...base(-me) + 4) if (p[j] >= 0 && p[j] < 82 && cellOf(j, p[j]) == cell) enemy = true;
        if (enemy && CASTLE.indexOf(cell) >= 0) continue;
      }
      out.push({ f: from < 0 ? C : path(me)[from], t: to >= 82 ? C : path(me)[to], i: i, to: to });
    }
    return out;
  }
  override public function apply(s:Dynamic, m:Dynamic):Dynamic {
    var p:Array<Int> = (s.p : Array<Int>).copy(); var me:Int = s.turn; var to:Int = m.to; var i:Int = m.i;
    p[i] = to;
    var capt = false;
    if (to < 82) { var cell = path(me)[to]; for (j in base(-me)...base(-me) + 4) if (p[j] >= 0 && p[j] < 82 && cellOf(j, p[j]) == cell) { p[j] = -1; capt = true; } }
    return { p: p, turn: (s.ex == true || capt) ? me : -me, roll: null, ex: false, k: 0 };
  }
  override public function over(s:Dynamic, ms:Array<Dynamic>):Dynamic {
    var p:Array<Int> = s.p; var a = 0; var b = 0;
    for (i in 0...8) if (p[i] >= 82) { if (i < 4) a++ else b++; }
    if (a == 4) return { w: 1, why: "as 4 vermelhas voltaram ao centro" };
    if (b == 4) return { w: -1, why: "as 4 verdes voltaram ao centro" };
    return null;
  }
  override public function eval(s:Dynamic):Float {
    var p:Array<Int> = s.p; var v = 0.0;
    for (i in 0...8) {
      var sd = i < 4 ? 1 : -1; var x = p[i];
      var val = x < 0 ? 0.0 : (x >= 82 ? 110.0 : x + 6.0);
      if (x >= 0 && x < 82 && onLoop(x)) {
        var cell = cellOf(i, x);
        if (CASTLE.indexOf(cell) >= 0) val += 3;
        else for (j in 0...8) if ((j < 4 ? 1 : -1) != sd && p[j] >= 0 && onLoop(p[j])) {
          var them = path(-sd); var k = them.indexOf(cell, 7);
          if (k > p[j] && k - p[j] <= 10) { val -= 4; break; }
        }
      }
      v += sd * val;
    }
    return v;
  }
  static var VALS = [25, 10, 2, 3, 4, 5, 6];
  static var BIN = [1, 6, 15, 20, 15, 6, 1];
  override public function rolls(s:Dynamic):Array<Array<Float>> return [for (k in 0...7) [VALS[k], BIN[k] / 64, (VALS[k] == 6 || VALS[k] == 10 || VALS[k] == 25) ? 1 : 0, k]];
  override public function toss():Array<Float> { var k = 0; for (i in 0...6) if (Math.random() < 0.5) k++; var v = VALS[k]; return [v, BIN[k] / 64, (v == 6 || v == 10 || v == 25) ? 1 : 0, k]; }
  override public function rollText(s:Dynamic):String { var k:Int = s.k; return s.roll + " (" + (k == 0 ? "nenhum búzio aberto" : k + (k == 1 ? " búzio aberto" : " búzios abertos")) + ")" + ((s.roll : Int) == 6 || (s.roll : Int) == 10 || (s.roll : Int) == 25 ? " · lance de graça" : ""); }
  override public function rollSvg(s:Dynamic):String return World.sticks(6, s.k, "cowrie");
  override public function label(s:Dynamic, m:Dynamic):String {
    var to:Int = m.to; var p:Array<Int> = s.p; var from = p[m.i];
    if (from < 0) return "peça sai do centro";
    if (to >= 82) return "peça chega ao centro";
    return "peça anda " + (to - from) + " casas";
  }
  override public function status(s:Dynamic):String {
    var p:Array<Int> = s.p; var a = [0, 0, 0, 0];
    for (i in 0...8) { if (p[i] >= 82) a[i < 4 ? 0 : 1]++; if (p[i] < 0) a[i < 4 ? 2 : 3]++; }
    return "No centro para sair: vermelhas " + a[2] + ", verdes " + a[3] + " · Chegaram: vermelhas " + a[0] + ", verdes " + a[1];
  }
  static inline var Q = 46.0;
  static function xy(c:Int):Array<Float> return [10 + (c % 19) * Q + Q / 2, 10 + Std.int(c / 19) * Q + Q / 2];
  static function pawn(x:Float, y:Float, red:Bool, k:Float):String {
    var f = red ? "url(#wgR)" : "url(#wgG)"; var st = red ? "#4a0d08" : "#0b2a12";
    return '<ellipse cx="' + x + '" cy="' + (y + 14 * k) + '" rx="' + (15 * k) + '" ry="' + (5 * k) + '" fill="rgba(0,0,0,.35)"/><path d="M' + (x - 13 * k) + ',' + (y + 12 * k) + ' Q' + (x - 14 * k) + ',' + (y - 6 * k) + ' ' + x + ',' + (y - 18 * k) + ' Q' + (x + 14 * k) + ',' + (y - 6 * k) + ' ' + (x + 13 * k) + ',' + (y + 12 * k) + ' Z" fill="' + f + '" stroke="' + st + '" stroke-width="' + (1.8 * k) + '"/><circle cx="' + x + '" cy="' + (y - 17 * k) + '" r="' + (4 * k) + '" fill="#f3d98c" stroke="' + st + '" stroke-width="1.2"/>';
  }
  override public function svg(s:Dynamic, ui:Dynamic):String {
    var p:Array<Int> = s.p; var size = 20 + 19 * Q;
    var sb = new StringBuf();
    sb.add('<svg viewBox="0 0 ' + size + ' ' + size + '">' + World.DEFS);
    var arms = [[8, 11, 3, 8, "#7d1d16"], [11, 8, 8, 3, "#7d5a16"], [8, 0, 3, 8, "#1d5a2a"], [0, 8, 8, 3, "#20304f"]];
    for (a in arms) sb.add('<rect x="' + (10 + (a[0] : Int) * Q - 6) + '" y="' + (10 + (a[1] : Int) * Q - 6) + '" width="' + ((a[2] : Int) * Q + 12) + '" height="' + ((a[3] : Int) * Q + 12) + '" rx="8" fill="' + a[4] + '"/>');
    var cells:Array<Int> = LOOP.copy(); for (pp in PATH) for (c in pp) if (cells.indexOf(c) < 0) cells.push(c);
    for (c in cells) {
      var a = xy(c);
      sb.add('<rect x="' + (a[0] - Q / 2 + 2) + '" y="' + (a[1] - Q / 2 + 2) + '" width="' + (Q - 4) + '" height="' + (Q - 4) + '" rx="4" fill="' + ((c % 19 == 9 || Std.int(c / 19) == 9) ? "#f1dfb6" : "#e8d0a0") + '" stroke="#b08a4a" stroke-width="1.5"/>');
      if (CASTLE.indexOf(c) >= 0) sb.add('<path d="M' + (a[0] - 14) + ',' + (a[1] - 14) + ' L' + (a[0] + 14) + ',' + (a[1] + 14) + ' M' + (a[0] + 14) + ',' + (a[1] - 14) + ' L' + (a[0] - 14) + ',' + (a[1] + 14) + '" stroke="#7a4a1c" stroke-width="4"/>');
    }
    var cc = xy(C);
    sb.add('<rect x="' + (cc[0] - 1.5 * Q) + '" y="' + (cc[1] - 1.5 * Q) + '" width="' + (3 * Q) + '" height="' + (3 * Q) + '" rx="10" fill="#c8963a" stroke="#5b3714" stroke-width="3"/><rect x="' + (cc[0] - 1.5 * Q + 8) + '" y="' + (cc[1] - 1.5 * Q + 8) + '" width="' + (3 * Q - 16) + '" height="' + (3 * Q - 16) + '" rx="6" fill="none" stroke="#f3d98c" stroke-width="2"/>');
    sb.add(World.marks(ui, xy, Q * 0.48));
    var stacks = new Map<Int, Array<Int>>();
    var home = [0, 0]; var done = [0, 0];
    for (i in 0...8) { var x = p[i]; var k = i < 4 ? 0 : 1; if (x < 0) { home[k]++; continue; } if (x >= 82) { done[k]++; continue; } var c = cellOf(i, x); if (!stacks.exists(c)) stacks.set(c, []); stacks.get(c).push(i); }
    for (c in stacks.keys()) { var a = xy(c); var l = stacks.get(c); sb.add(pawn(a[0], a[1], l[0] < 4, 1.0)); if (l.length > 1) sb.add('<circle cx="' + (a[0] + 15) + '" cy="' + (a[1] - 14) + '" r="10" fill="#1b1209" stroke="#f3d98c" stroke-width="2"/><text x="' + (a[0] + 15) + '" y="' + (a[1] - 9) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#f3d98c">' + l.length + '</text>'); }
    for (k in 0...home[0]) sb.add(pawn(cc[0] - 36 + k * 24, cc[1] + 36, true, 0.7));
    for (k in 0...home[1]) sb.add(pawn(cc[0] - 36 + k * 24, cc[1] - 30, false, 0.7));
    for (k in 0...done[0]) sb.add(pawn(cc[0] - 26 + k * 17, cc[1] + 6, true, 0.55));
    for (k in 0...done[1]) sb.add(pawn(cc[0] - 26 + k * 17, cc[1] - 12, false, 0.55));
    var tg:Array<Int> = ui.targets;
    if (tg != null) for (c in tg) { var a = xy(c); sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="10" fill="rgba(30,130,55,.9)" stroke="#fff" stroke-width="2.5"/>'); }
    if (ui.thumb != true) { for (c in cells) { var a = xy(c); sb.add(World.hit(c, a[0] - Q / 2, a[1] - Q / 2, Q, Q)); } sb.add(World.hit(C, cc[0] - 1.5 * Q, cc[1] - 1.5 * Q, 3 * Q, 3 * Q)); }
    sb.add('</svg>');
    return sb.toString();
  }
}
#end
