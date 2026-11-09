package;

#if js
import World;

/* Senet (Egito): corrida de 30 casas com 4 varetas. Regras da reconstrução de Timothy Kendall (1978), a mais jogada hoje. */
class Senet extends WGame {
  static var SAFE = [25, 27, 28, 29];
  public function new() {
    super();
    id = "senet"; name = "Senet"; era = "Egito · por volta de 3100 a.C.";
    sides = ["Cones (claras)", "Carretéis (escuras)"]; dice = true; flipOk = false; tossName = "varetas";
    note = "As regras originais se perderam. Aqui se joga a reconstrução de Timothy Kendall (1978), a mais usada hoje.";
    story = [
      "O senet é um dos jogos de tabuleiro mais antigos do mundo: aparece em pinturas de túmulos egípcios de cerca de 3100 a.C. A rainha Nefertari foi pintada jogando senet, e o faraó Tutancâmon foi enterrado com quatro tabuleiros.",
      "Com o tempo o jogo ganhou sentido religioso: a passagem das peças pelas 30 casas lembrava a viagem da alma pelo mundo dos mortos. As últimas casas trazem símbolos como a água, perigosa, e a casa da beleza, por onde todos precisam passar.",
      "Na árvore ele aparece entre os primos antigos: não é ancestral do xadrez, mas mostra que, muito antes do chaturanga, as pessoas já se sentavam diante de um tabuleiro quadriculado."];
    rules = [
      "Cada lado tem 5 peças, que começam alternadas nas 10 primeiras casas. O percurso faz um S: 1 a 10 na fileira de cima, 11 a 20 voltando, 21 a 30 na de baixo.",
      "Lance as 4 varetas: o número de faces claras para cima é quanto você anda (nenhuma clara vale 5). Com 1, 4 ou 5 você joga de novo.",
      "Caindo numa casa com uma peça adversária sozinha, vocês trocam de lugar. Duas peças da mesma cor lado a lado se protegem, e três seguidas formam uma barreira que ninguém atravessa.",
      "A casa 26 (beleza) é obrigatória: toda peça precisa parar nela. Quem cai na 27 (água) volta para a casa 15. As casas 26, 28, 29 e 30 são seguras.",
      "Da casa 26 em diante, a peça sai do tabuleiro com o número exato que a leva além da 30. Vence quem tirar primeiro todas as 5 peças."];
    pieces = [["Cone", "As suas peças claras."], ["Carretel", "As peças escuras do adversário."], ["Varetas", "Quatro varetas com um lado claro e um escuro fazem o papel dos dados."]];
  }
  override public function init():Dynamic return { p: [0, 2, 4, 6, 8, 1, 3, 5, 7, 9], turn: 1, roll: null, ex: false, k: 0 };
  function occ(p:Array<Int>, x:Int):Int { for (i in 0...10) if (p[i] == x) return i < 5 ? 1 : -1; return 0; }
  function idx(p:Array<Int>, x:Int):Int { for (i in 0...10) if (p[i] == x) return i; return -1; }
  override public function moves(s:Dynamic):Array<Dynamic> {
    if (s.roll == null) return [];
    var p:Array<Int> = s.p; var me:Int = s.turn; var r:Int = s.roll; var out:Array<Dynamic> = [];
    var lo = me == 1 ? 0 : 5;
    for (i in lo...lo + 5) {
      var from = p[i]; if (from >= 30) continue;
      var t = from + r;
      if (t > 30) continue;
      if (from < 25 && t > 25) continue;
      if (t == 30 && from < 25) continue;
      if (t < 30) {
        var o = occ(p, t);
        if (o == me) continue;
        if (o == -me) { if (SAFE.indexOf(t) >= 0) continue; if (occ(p, t - 1) == -me || occ(p, t + 1) == -me) continue; }
      }
      var run = 0; var blocked = false;
      for (j in from + 1...t) { if (occ(p, j) == -me) { run++; if (run >= 3) blocked = true; } else run = 0; }
      if (blocked) continue;
      out.push({ f: from, t: t, i: i });
    }
    return out;
  }
  override public function apply(s:Dynamic, m:Dynamic):Dynamic {
    var p:Array<Int> = (s.p : Array<Int>).copy(); var t:Int = m.t; var i:Int = m.i;
    if (t < 30) { var j = idx(p, t); if (j >= 0) p[j] = m.f; }
    p[i] = t;
    if (t == 26) { var k = 14; while (k >= 0 && idx(p, k) >= 0) k--; p[i] = k < 0 ? 0 : k; }
    var me:Int = s.turn;
    return { p: p, turn: s.ex == true ? me : -me, roll: null, ex: false, k: 0 };
  }
  override public function over(s:Dynamic, ms:Array<Dynamic>):Dynamic {
    var p:Array<Int> = s.p; var a = 0; var b = 0;
    for (i in 0...10) if (p[i] >= 30) { if (i < 5) a++ else b++; }
    if (a == 5) return { w: 1, why: "os 5 cones saíram do tabuleiro" };
    if (b == 5) return { w: -1, why: "os 5 carretéis saíram do tabuleiro" };
    return null;
  }
  override public function eval(s:Dynamic):Float {
    var p:Array<Int> = s.p; var v = 0.0;
    for (i in 0...10) {
      var sd = i < 5 ? 1 : -1; var x = p[i];
      var val = x >= 30 ? 48.0 : x + (x >= 25 ? 4 : 0);
      if (x < 30 && x != 25 && (occ(p, x - 1) == sd || occ(p, x + 1) == sd)) val += 2.5;
      v += sd * val;
    }
    return v;
  }
  static var R = [[1, 4 / 16, 1, 1], [2, 6 / 16, 0, 2], [3, 4 / 16, 0, 3], [4, 1 / 16, 1, 4], [5, 1 / 16, 1, 0]];
  override public function rolls(s:Dynamic):Array<Array<Float>> return [for (r in R) [for (x in r) (x : Float)]];
  override public function toss():Array<Float> { var k = 0; for (i in 0...4) if (Math.random() < 0.5) k++; for (r in R) if (r[3] == k) return [for (x in r) (x : Float)]; return [5, 1 / 16, 1, 0]; }
  override public function rollText(s:Dynamic):String return Std.string(s.roll) + ((s.k : Int) == 0 ? " (nenhuma face clara)" : " (" + s.k + (s.k == 1 ? " face clara)" : " faces claras)"));
  override public function rollSvg(s:Dynamic):String return World.sticks(4, s.k, "stick");
  override public function label(s:Dynamic, m:Dynamic):String {
    var p:Array<Int> = s.p; var t:Int = m.t;
    if (t >= 30) return "casa " + ((m.f : Int) + 1) + " → sai";
    var sw = idx(p, t) >= 0 ? " (troca)" : "";
    return "casa " + ((m.f : Int) + 1) + " → " + (t + 1) + sw + (t == 26 ? " · caiu na água, volta à 15" : "");
  }
  override public function status(s:Dynamic):String {
    var p:Array<Int> = s.p; var a = 0; var b = 0;
    for (i in 0...10) if (p[i] >= 30) { if (i < 5) a++ else b++; }
    return "Fora do tabuleiro: cones " + a + " · carretéis " + b;
  }
  static function cellXY(i:Int):Array<Float> { var row = Std.int(i / 10); var col = row == 1 ? 9 - (i % 10) : i % 10; return [30 + col * 100 + 50, 30 + row * 100 + 50]; }
  static function cone(x:Float, y:Float, light:Bool):String {
    if (light) return '<ellipse cx="' + x + '" cy="' + (y + 32) + '" rx="30" ry="8" fill="rgba(0,0,0,.3)"/><path d="M' + x + ',' + (y - 36) + ' L' + (x + 26) + ',' + (y + 28) + ' Q' + x + ',' + (y + 38) + ' ' + (x - 26) + ',' + (y + 28) + ' Z" fill="url(#wgL)" stroke="#6b4a22" stroke-width="2.5"/><circle cx="' + x + '" cy="' + (y - 34) + '" r="7" fill="#f6ead0" stroke="#6b4a22" stroke-width="2"/>';
    return '<ellipse cx="' + x + '" cy="' + (y + 32) + '" rx="30" ry="8" fill="rgba(0,0,0,.3)"/><path d="M' + (x - 24) + ',' + (y - 30) + ' L' + (x + 24) + ',' + (y - 30) + ' L' + (x + 12) + ',' + y + ' L' + (x + 24) + ',' + (y + 30) + ' L' + (x - 24) + ',' + (y + 30) + ' L' + (x - 12) + ',' + y + ' Z" fill="url(#wgD)" stroke="#c8963a" stroke-width="2.5"/><path d="M' + (x - 24) + ',' + (y - 30) + ' L' + (x + 24) + ',' + (y - 30) + '" stroke="#e9cf8c" stroke-width="3"/>';
  }
  override public function svg(s:Dynamic, ui:Dynamic):String {
    var p:Array<Int> = s.p;
    var sb = new StringBuf();
    sb.add('<svg viewBox="0 0 1180 360">' + World.DEFS);
    sb.add('<rect x="0" y="0" width="1060" height="360" rx="20" fill="#5b3a17"/><rect x="14" y="14" width="1032" height="332" rx="12" fill="url(#wgW)"/>');
    for (i in 0...30) {
      var a = cellXY(i);
      sb.add('<rect x="' + (a[0] - 48) + '" y="' + (a[1] - 48) + '" width="96" height="96" rx="6" fill="' + (i == 14 || i >= 25 ? "#f1ddb0" : "#e9cf98") + '" stroke="#8a6232" stroke-width="2"/>');
      var gx = a[0]; var gy = a[1];
      var ink = "#7a4a1c";
      if (i == 14) sb.add('<g stroke="' + ink + '" stroke-width="5" fill="none" opacity=".75"><ellipse cx="' + gx + '" cy="' + (gy - 22) + '" rx="11" ry="14"/><path d="M' + gx + ',' + (gy - 8) + ' V' + (gy + 34) + ' M' + (gx - 20) + ',' + (gy - 2) + ' H' + (gx + 20) + '"/></g>');
      if (i == 25) sb.add('<g stroke="' + ink + '" stroke-width="5" fill="none" opacity=".75"><path d="M' + gx + ',' + (gy - 34) + ' V' + (gy + 6) + ' M' + (gx - 12) + ',' + (gy - 22) + ' H' + (gx + 12) + '"/><ellipse cx="' + gx + '" cy="' + (gy + 20) + '" rx="16" ry="14"/></g>');
      if (i == 26) sb.add('<path d="M' + (gx - 34) + ',' + (gy - 14) + ' q8.5,-12 17,0 t17,0 t17,0 t17,0 M' + (gx - 34) + ',' + (gy + 2) + ' q8.5,-12 17,0 t17,0 t17,0 t17,0 M' + (gx - 34) + ',' + (gy + 18) + ' q8.5,-12 17,0 t17,0 t17,0 t17,0" stroke="#2f6f9e" stroke-width="5" fill="none" opacity=".8"/>');
      if (i >= 27) { var nn = 30 - i; for (k in 0...nn) sb.add('<circle cx="' + (gx - (nn - 1) * 15 + k * 30) + '" cy="' + gy + '" r="8" fill="' + ink + '" opacity=".7"/>'); }
      if (ui.thumb != true) sb.add('<text x="' + (a[0] - 40) + '" y="' + (a[1] - 30) + '" font-size="16" fill="rgba(90,55,20,.55)" font-family="Georgia,serif">' + (i + 1) + '</text>');
    }
    sb.add('<path d="M1048,80 v200" stroke="#5b3a17" stroke-width="0"/>');
    sb.add(World.marks(ui, cellXY, 46));
    var offA = 0; var offB = 0;
    for (i in 0...10) { var x = p[i]; if (x >= 30) { if (i < 5) offA++ else offB++; continue; } var a = cellXY(x); sb.add(cone(a[0], a[1], i < 5)); }
    sb.add('<rect x="1070" y="14" width="104" height="332" rx="14" fill="rgba(0,0,0,.28)" stroke="rgba(220,181,92,.45)" stroke-width="2"/>');
    sb.add('<text x="1122" y="44" text-anchor="middle" font-size="18" fill="#e9cf8c" font-family="Georgia,serif">saída</text>');
    for (k in 0...offA) sb.add('<g transform="translate(1100 ' + (100 + k * 46) + ') scale(.55)">' + cone(0, 0, true) + '</g>');
    for (k in 0...offB) sb.add('<g transform="translate(1146 ' + (100 + k * 46) + ') scale(.55)">' + cone(0, 0, false) + '</g>');
    var tg:Array<Int> = ui.targets;
    if (tg != null) for (t in tg) { if (t >= 30) sb.add('<rect x="1072" y="16" width="100" height="328" rx="12" fill="rgba(30,130,55,.25)" stroke="#2e9d4c" stroke-width="4"/>'); else { var a = cellXY(t); sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="15" fill="rgba(30,130,55,.85)" stroke="#fff" stroke-width="3"/>'); } }
    if (ui.thumb != true) { for (i in 0...30) { var a = cellXY(i); sb.add(World.hit(i, a[0] - 50, a[1] - 50, 100, 100)); } sb.add(World.hit(30, 1070, 14, 104, 332)); }
    sb.add('</svg>');
    return sb.toString();
  }
}
#end
