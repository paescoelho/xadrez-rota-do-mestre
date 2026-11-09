package;

#if js
import World;

/* Liubo (China antiga). As regras se perderam; esta é uma reconstrução simples, para jogar,
   inspirada no tabuleiro TLV, nas seis varetas e na coruja (xiao) descritos nas fontes. */
class Liubo extends WGame {
  static var RING:Array<Array<Int>> = [[3, 6], [4, 6], [5, 6], [6, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 6]];
  static var SAFE = [0, 6, 12, 18];
  static inline var WATER = 24;
  static inline var GOAL = 3;
  public function new() {
    super();
    id = "liubo"; name = "Liubo"; era = "China · por volta de 1500 a.C. a 220 d.C.";
    sides = ["Marfim", "Laca"]; dice = true; flipOk = false; tossName = "varetas";
    note = "Ninguém sabe mais as regras do liubo. Esta é uma reconstrução livre para jogar, baseada no tabuleiro, nas varetas e na coruja descritos nas fontes antigas.";
    story = [
      "O liubo, \"seis varetas\", foi um dos jogos mais populares da China antiga, da dinastia Shang até o fim da dinastia Han, em 220 d.C. Imperadores jogavam liubo, e os imortais aparecem jogando em relevos de túmulos.",
      "Os tabuleiros tinham um desenho característico de marcas em forma de T, L e V, o padrão TLV, que também enfeita os espelhos de bronze da época. Cada jogador tinha seis peças, e uma delas podia virar a coruja (xiao), a peça mais forte. No centro ficava a água, onde se \"pescavam\" peixes.",
      "Depois da dinastia Han o jogo foi esquecido, e as regras se perderam. Na árvore, ele aparece com o go entre as origens chinesas antigas: jogos de tabuleiro muito anteriores ao xiangqi."];
    rules = [
      "Cada um tem 6 peças, que esperam fora do tabuleiro. As suas (marfim) entram pela marca T de baixo; as do adversário (laca), pela de cima.",
      "Lance as 6 varetas: o número de faces lisas para cima é quanto você anda; nenhuma lisa vale 6. Com 6 você joga de novo.",
      "As peças dão uma volta inteira no tabuleiro, no sentido anti-horário, e depois entram na água, no centro, com o número exato.",
      "Caindo sobre uma peça adversária sozinha, você a captura (ela volta para fora) e a sua peça vira coruja: daí em diante ninguém pode capturá-la. As quatro marcas T são seguras.",
      "Vence quem levar primeiro 3 peças até a água (pescar 3 peixes)."];
    pieces = [["Peça", "Bloco retangular que anda o valor das varetas."], ["Coruja (xiao)", "A peça que já capturou. Não pode ser capturada."], ["Varetas", "Seis varetas de bambu, lisas de um lado, fazem o papel dos dados."]];
  }
  override public function init():Dynamic return { p: [for (i in 0...12) -1], o: [for (i in 0...12) 0], turn: 1, roll: null, ex: false, k: 0 };
  inline function start(side:Int):Int return side == 1 ? 0 : 12;
  function ringOf(i:Int, pos:Int):Int return pos < 0 || pos >= WATER ? -1 : (start(i < 6 ? 1 : -1) + pos) % 24;
  override public function moves(s:Dynamic):Array<Dynamic> {
    if (s.roll == null) return [];
    var p:Array<Int> = s.p; var o:Array<Int> = s.o; var me:Int = s.turn; var v:Int = s.roll;
    var lo = me == 1 ? 0 : 6; var out:Array<Dynamic> = []; var seen:Array<Int> = [];
    for (i in lo...lo + 6) {
      var from = p[i]; if (from >= WATER || seen.indexOf(from) >= 0) continue;
      seen.push(from);
      var to = from < 0 ? v - 1 : from + v;
      if (to > WATER) continue;
      if (to < WATER) {
        var cell = (start(me) + to) % 24;
        var mine = 0; var them = 0; var owl = false;
        for (j in 0...12) if (p[j] >= 0 && p[j] < WATER && ringOf(j, p[j]) == cell) { if ((j < 6) == (me == 1)) mine++ else { them++; if (o[j] == 1) owl = true; } }
        if (mine > 0) continue;
        if (them > 0 && (them > 1 || owl || SAFE.indexOf(cell) >= 0)) continue;
      }
      out.push({ f: from < 0 ? 30 + (me == 1 ? 1 : 2) : (start(me) + from) % 24, t: to >= WATER ? WATER : (start(me) + to) % 24, i: i, to: to });
    }
    return out;
  }
  override public function apply(s:Dynamic, m:Dynamic):Dynamic {
    var p:Array<Int> = (s.p : Array<Int>).copy(); var o:Array<Int> = (s.o : Array<Int>).copy(); var me:Int = s.turn; var i:Int = m.i; var to:Int = m.to;
    p[i] = to;
    if (to < WATER) {
      var cell = (start(me) + to) % 24;
      for (j in 0...12) if ((j < 6) != (me == 1) && p[j] >= 0 && p[j] < WATER && ringOf(j, p[j]) == cell) { p[j] = -1; o[j] = 0; o[i] = 1; }
    }
    return { p: p, o: o, turn: s.ex == true ? me : -me, roll: null, ex: false, k: 0 };
  }
  override public function over(s:Dynamic, ms:Array<Dynamic>):Dynamic {
    var p:Array<Int> = s.p; var a = 0; var b = 0;
    for (i in 0...12) if (p[i] >= WATER) { if (i < 6) a++ else b++; }
    if (a >= GOAL) return { w: 1, why: "3 peixes pescados pelo marfim" };
    if (b >= GOAL) return { w: -1, why: "3 peixes pescados pela laca" };
    return null;
  }
  override public function eval(s:Dynamic):Float {
    var p:Array<Int> = s.p; var o:Array<Int> = s.o; var v = 0.0;
    var fin = [0, 0];
    for (i in 0...12) {
      var sd = i < 6 ? 1 : -1; var x = p[i];
      if (x >= WATER) { fin[i < 6 ? 0 : 1]++; continue; }
      var val = x < 0 ? 0.0 : x + 4.0 + (o[i] == 1 ? 6 : 0);
      v += sd * val;
    }
    v += (Math.min(fin[0], GOAL) - Math.min(fin[1], GOAL)) * 45;
    return v;
  }
  static var BIN = [1, 6, 15, 20, 15, 6, 1];
  override public function rolls(s:Dynamic):Array<Array<Float>> {
    var out:Array<Array<Float>> = [];
    for (v in 1...7) { var pr = v == 6 ? (BIN[6] + BIN[0]) / 64 : BIN[v] / 64; out.push([v, pr, v == 6 ? 1 : 0, v]); }
    return out;
  }
  override public function toss():Array<Float> { var k = 0; for (i in 0...6) if (Math.random() < 0.5) k++; var v = k == 0 ? 6 : k; return [v, 0, v == 6 ? 1 : 0, k]; }
  override public function rollText(s:Dynamic):String { var k:Int = s.k; return s.roll + (k == 0 ? " (nenhuma face lisa)" : " (" + k + (k == 1 ? " face lisa)" : " faces lisas)")); }
  override public function rollSvg(s:Dynamic):String return World.sticks(6, s.k, "stick");
  override public function label(s:Dynamic, m:Dynamic):String {
    var p:Array<Int> = s.p; var from = p[m.i]; var to:Int = m.to;
    if (from < 0) return "peça entra no tabuleiro";
    if (to >= WATER) return "peça chega à água: peixe pescado!";
    var o:Array<Int> = s.o;
    return "peça anda " + (to - from) + (o[m.i] == 1 ? " (coruja)" : "");
  }
  override public function status(s:Dynamic):String {
    var p:Array<Int> = s.p; var a = 0; var b = 0;
    for (i in 0...12) if (p[i] >= WATER) { if (i < 6) a++ else b++; }
    return "Peixes pescados: marfim " + a + " · laca " + b + " (vence quem pescar 3)";
  }
  static function xy(c:Int):Array<Float> {
    if (c == WATER) return [400, 400];
    if (c == 31) return [400, 790];
    if (c == 32) return [400, 10];
    if (c < 0 || c >= 24) return null;
    return [130 + RING[c][0] * 90, 130 + RING[c][1] * 90];
  }
  static function block(x:Float, y:Float, light:Bool, owl:Bool, k:Float):String {
    var s = '<rect x="' + (x - 22 * k + 3) + '" y="' + (y - 14 * k + 5) + '" width="' + (44 * k) + '" height="' + (28 * k) + '" rx="' + (5 * k) + '" fill="rgba(0,0,0,.35)"/>';
    s += '<rect x="' + (x - 22 * k) + '" y="' + (y - 14 * k) + '" width="' + (44 * k) + '" height="' + (28 * k) + '" rx="' + (5 * k) + '" fill="' + (light ? "url(#wgL)" : "url(#wgD)") + '" stroke="' + (light ? "#6b4a22" : "#e2b961") + '" stroke-width="2.5"/>';
    if (owl) s += '<circle cx="' + (x - 8 * k) + '" cy="' + y + '" r="' + (6 * k) + '" fill="#f3d98c" stroke="#5b3714" stroke-width="1.5"/><circle cx="' + (x + 8 * k) + '" cy="' + y + '" r="' + (6 * k) + '" fill="#f3d98c" stroke="#5b3714" stroke-width="1.5"/><circle cx="' + (x - 8 * k) + '" cy="' + y + '" r="' + (2.4 * k) + '" fill="#1b1209"/><circle cx="' + (x + 8 * k) + '" cy="' + y + '" r="' + (2.4 * k) + '" fill="#1b1209"/>';
    return s;
  }
  override public function svg(s:Dynamic, ui:Dynamic):String {
    var p:Array<Int> = s.p; var o:Array<Int> = s.o;
    var sb = new StringBuf();
    sb.add('<svg viewBox="-40 -60 880 920">' + World.DEFS);
    sb.add('<rect x="40" y="40" width="720" height="720" rx="22" fill="#2a120c"/><rect x="58" y="58" width="684" height="684" rx="14" fill="#5a1e14"/><rect x="58" y="58" width="684" height="684" rx="14" fill="none" stroke="#e2b961" stroke-width="3"/>');
    var gold = "#e9c46a";
    sb.add('<g stroke="' + gold + '" stroke-width="10" fill="none" stroke-linecap="square" opacity=".9">');
    sb.add('<rect x="310" y="310" width="180" height="180"/>');
    sb.add('<path d="M370,130 H430 M400,130 V200 M370,670 H430 M400,670 V600 M130,370 V430 M130,400 H200 M670,370 V430 M670,400 H600"/>');
    sb.add('<path d="M310,250 V310 H250 M490,250 V310 H550 M310,550 V490 H250 M490,550 V490 H550"/>');
    sb.add('<path d="M100,100 L160,160 M700,100 L640,160 M100,700 L160,640 M700,700 L640,640"/>');
    sb.add('</g>');
    sb.add('<rect x="320" y="320" width="160" height="160" fill="#1d4f6e" opacity=".9"/><path d="M335,360 q16,-14 32,0 t32,0 t32,0 t32,0 M335,400 q16,-14 32,0 t32,0 t32,0 t32,0 M335,440 q16,-14 32,0 t32,0 t32,0 t32,0" stroke="#8fc6e8" stroke-width="4" fill="none" opacity=".7"/>');
    sb.add('<rect x="130" y="130" width="540" height="540" fill="none" stroke="rgba(233,196,106,.35)" stroke-width="4" stroke-dasharray="6 10"/>');
    for (c in 0...24) { var a = xy(c); sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + (SAFE.indexOf(c) >= 0 ? 15 : 9) + '" fill="' + (SAFE.indexOf(c) >= 0 ? gold : "rgba(233,196,106,.65)") + '"/>'); }
    sb.add(World.marks(ui, xy, 34));
    var stacks = new Map<Int, Array<Int>>(); var wait = [0, 0]; var fish = [0, 0];
    for (i in 0...12) { var x = p[i]; if (x < 0) { wait[i < 6 ? 0 : 1]++; continue; } if (x >= WATER) { fish[i < 6 ? 0 : 1]++; continue; } var c = ringOf(i, x); if (!stacks.exists(c)) stacks.set(c, []); stacks.get(c).push(i); }
    for (c in stacks.keys()) { var a = xy(c); for (i in stacks.get(c)) sb.add(block(a[0], a[1], i < 6, o[i] == 1, 1.0)); }
    for (k in 0...wait[0]) sb.add(block(220 + k * 72, 805, true, false, 0.9));
    for (k in 0...wait[1]) sb.add(block(220 + k * 72, -5, false, false, 0.9));
    for (k in 0...fish[0]) sb.add(block(355 + k * 45, 450, true, false, 0.7));
    for (k in 0...fish[1]) sb.add(block(355 + k * 45, 352, false, false, 0.7));
    var tg:Array<Int> = ui.targets;
    if (tg != null) for (c in tg) { var a = xy(c); if (a != null) sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="16" fill="rgba(46,170,80,.9)" stroke="#fff" stroke-width="3"/>'); }
    if (ui.thumb != true) {
      for (c in 0...24) { var a = xy(c); sb.add(World.hitC(c, a[0], a[1], 42)); }
      sb.add(World.hit(WATER, 320, 320, 160, 160)); sb.add(World.hit(31, 160, 770, 480, 70)); sb.add(World.hit(32, 160, -40, 480, 70));
      var srcs:Array<Int> = ui.srcs;
      if ((ui.sel : Int) < 0 && srcs != null && ui.my == true && srcs.indexOf(31) >= 0) sb.add('<rect x="170" y="775" width="460" height="62" rx="12" fill="none" stroke="rgba(46,170,80,.7)" stroke-width="4" stroke-dasharray="12 8"/>');
      if ((ui.sel : Int) == 31) sb.add('<rect x="170" y="775" width="460" height="62" rx="12" fill="none" stroke="#2e9d4c" stroke-width="6"/>');
    }
    sb.add('</svg>');
    return sb.toString();
  }
}
#end
