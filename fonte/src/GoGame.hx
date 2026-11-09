package;

#if js
import World;

/* Go (weiqi) 9 x 9, contagem por área (regras chinesas), komi 7. O computador usa Monte Carlo (MCTS). */
class GoGame extends WGame {
  static inline var N = 9; static inline var NN = 81;
  static var NB:Array<Array<Int>> = null;
  static var KOMI = 7.0;
  public function new() {
    super();
    id = "go"; name = "Go (weiqi)"; era = "China · mais de 2.500 anos";
    sides = ["Pretas", "Brancas"]; passOk = true; flipOk = false; repLimit = 99;
    if (NB == null) { NB = []; for (p in 0...NN) { var x = p % N; var y = Std.int(p / N); var a:Array<Int> = []; if (x > 0) a.push(p - 1); if (x < N - 1) a.push(p + 1); if (y > 0) a.push(p - N); if (y < N - 1) a.push(p + N); NB.push(a); } }
    story = [
      "O go, chamado weiqi na China, igo no Japão e baduk na Coreia, é o jogo de tabuleiro mais antigo que ainda se joga com regras quase iguais às originais. Textos chineses já o citam por volta do século IV a.C.",
      "Na árvore ele aparece entre as origens chinesas antigas, ao lado do liubo: não é ancestral do xadrez, mas é o grande primo de estratégia da Ásia. Era uma das quatro artes do cavalheiro chinês, com a música, a caligrafia e a pintura.",
      "As regras cabem em poucas linhas, mas o jogo é tão profundo que os computadores só venceram os melhores humanos em 2016, com o AlphaGo, quase vinte anos depois de o Deep Blue vencer Kasparov no xadrez.",
      "O tabuleiro oficial tem 19 x 19 linhas. Aqui você joga no 9 x 9, o tabuleiro de quem está aprendendo."];
    rules = [
      "As Pretas começam. Na sua vez, coloque uma pedra num ponto vazio (uma interseção das linhas). As pedras não se movem.",
      "Pedras da mesma cor ligadas pelas linhas formam um grupo. Os pontos vazios vizinhos são as liberdades. Um grupo sem liberdades é capturado e sai do tabuleiro.",
      "Não pode jogar onde o seu grupo ficaria sem liberdades (suicídio), a não ser que capture. Ko: não pode recapturar uma pedra na hora se isso repetir a posição anterior.",
      "Você pode passar. Dois passes seguidos terminam a partida.",
      "Pontuação por área: suas pedras vivas mais os pontos vazios cercados só por você. As Brancas recebem 7 pontos de compensação (komi) por jogarem em segundo. As pedras mortas são retiradas na contagem."];
    pieces = [["Pedra", "Fica onde foi colocada. Vive em grupo enquanto tiver liberdades."], ["Hoshi", "Os pontos marcados no tabuleiro: só referência para os olhos."]];
  }
  override public function init():Dynamic return { b: [for (i in 0...NN) 0], turn: 1, ko: -1, passes: 0, cap: [0, 0], mv: 0 };
  /* coloca a pedra em b (alterando b); devolve quantas capturou, ou -1 se for ilegal */
  static var mark:Array<Int> = [for (i in 0...81) 0]; static var stamp = 0;
  static var stack:Array<Int> = [for (i in 0...82) 0];
  static function libsOf(b:Array<Int>, p:Int, group:Array<Int>):Int {
    stamp++; var c = b[p]; var sp = 0; stack[sp++] = p; mark[p] = stamp; var libs = 0;
    var lstamp = stamp; group.resize(0);
    var seenLib:Array<Int> = [];
    while (sp > 0) {
      var q = stack[--sp]; group.push(q);
      for (n in NB[q]) {
        if (mark[n] == lstamp) continue;
        if (b[n] == 0) { mark[n] = lstamp; libs++; }
        else if (b[n] == c) { mark[n] = lstamp; stack[sp++] = n; }
      }
    }
    return libs;
  }
  static var grp:Array<Int> = [];
  public static function place(b:Array<Int>, p:Int, color:Int, ko:Int):Array<Int> {
    if (b[p] != 0 || p == ko) return null;
    b[p] = color;
    var taken = 0; var lastCap = -1;
    for (n in NB[p]) if (b[n] == -color) {
      if (libsOf(b, n, grp) == 0) { taken += grp.length; if (grp.length == 1) lastCap = grp[0]; for (q in grp) b[q] = 0; }
    }
    if (libsOf(b, p, grp) == 0) { b[p] = 0; return null; }
    var newKo = -1;
    if (taken == 1 && grp.length == 1) {
      var single = true; for (n in NB[p]) if (b[n] == color) single = false;
      if (single) newKo = lastCap;
    }
    return [taken, newKo];
  }
  override public function moves(s:Dynamic):Array<Dynamic> {
    var b:Array<Int> = s.b; var out:Array<Dynamic> = [];
    for (p in 0...NN) if (b[p] == 0 && p != (s.ko : Int)) { var c = b.copy(); if (place(c, p, s.turn, s.ko) != null) out.push({ f: -1, t: p }); }
    return out;
  }
  override public function apply(s:Dynamic, m:Dynamic):Dynamic {
    var side:Int = s.turn;
    if (m.pass == true) return { b: s.b, turn: -side, ko: -1, passes: (s.passes : Int) + 1, cap: s.cap, mv: (s.mv : Int) + 1 };
    var b:Array<Int> = (s.b : Array<Int>).copy(); var cap:Array<Int> = (s.cap : Array<Int>).copy();
    var r = place(b, m.t, side, s.ko);
    if (r == null) return s;
    cap[side == 1 ? 0 : 1] += r[0];
    return { b: b, turn: -side, ko: r[1], passes: 0, cap: cap, mv: (s.mv : Int) + 1 };
  }
  /* área: pedras + vazios cercados por uma só cor */
  static function area(b:Array<Int>):Array<Float> {
    var sc = [0.0, 0.0]; var seen = [for (i in 0...NN) false];
    for (p in 0...NN) {
      if (b[p] == 1) sc[0]++; else if (b[p] == -1) sc[1]++;
      else if (!seen[p]) {
        var reg:Array<Int> = []; var st = [p]; seen[p] = true; var bw = 0;
        while (st.length > 0) { var q = st.pop(); reg.push(q); for (n in NB[q]) { if (b[n] == 0 && !seen[n]) { seen[n] = true; st.push(n); } else if (b[n] == 1) bw |= 1; else if (b[n] == -1) bw |= 2; } }
        if (bw == 1) sc[0] += reg.length; else if (bw == 2) sc[1] += reg.length;
      }
    }
    return sc;
  }
  static function isEye(b:Array<Int>, p:Int, color:Int):Bool { for (n in NB[p]) if (b[n] != color) return false; return true; }
  /* partida aleatória até o fim; devolve o vencedor (1 Pretas, -1 Brancas) e deixa o tabuleiro final em b */
  static function playout(b:Array<Int>, turn:Int, ko:Int):Int {
    var passes = 0; var moves = 0; var empt:Array<Int> = [];
    while (passes < 2 && moves < 200) {
      empt.resize(0); for (p in 0...NN) if (b[p] == 0) empt.push(p);
      var played = false;
      while (empt.length > 0) {
        var i = Std.random(empt.length); var p = empt[i];
        empt[i] = empt[empt.length - 1]; empt.pop();
        if (isEye(b, p, turn)) continue;
        var r = place(b, p, turn, ko);
        if (r != null) { ko = r[1]; played = true; break; }
      }
      if (played) passes = 0 else { passes++; ko = -1; }
      turn = -turn; moves++;
    }
    var a = area(b);
    return a[0] - a[1] - KOMI > 0 ? 1 : -1;
  }
  /* pedras mortas estimadas com várias partidas aleatórias a partir da posição final */
  static function finalScore(b:Array<Int>):Dynamic {
    var own = [for (i in 0...NN) 0.0];
    var R = 160;
    for (k in 0...R) { var c = b.copy(); playout(c, k % 2 == 0 ? 1 : -1, -1); for (p in 0...NN) own[p] += c[p] != 0 ? c[p] : 0; }
    var clean = b.copy(); var dead = 0;
    for (p in 0...NN) if (b[p] != 0 && own[p] / R * b[p] < -0.35) { clean[p] = 0; dead++; }
    var a = area(clean);
    return { a: a, b: clean, dead: dead };
  }
  override public function over(s:Dynamic, ms:Array<Dynamic>):Dynamic {
    if ((s.passes : Int) < 2) return null;
    var fs = finalScore(s.b);
    var a:Array<Float> = fs.a;
    var bl = a[0]; var wh = a[1] + KOMI;
    return { w: bl > wh ? 1 : -1, why: "Pretas " + bl + " × Brancas " + wh + " (com komi " + KOMI + ")" + ((fs.dead : Int) > 0 ? "; pedras mortas retiradas: " + fs.dead : ""), end: fs.b };
  }
  override public function eval(s:Dynamic):Float { var a = area(s.b); return a[0] - a[1] - KOMI; }
  /* Monte Carlo com árvore (UCT) */
  override public function ai(s:Dynamic, level:Int):Dynamic {
    var me:Int = s.turn; var b0:Array<Int> = s.b;
    var empties = 0; for (p in b0) if (p == 0) empties++;
    var ms = moves(s);
    var cand = [for (m in ms) if (!isEye(b0, m.t, me)) m];
    if (cand.length == 0) return { pass: true, f: -1, t: -2 };
    var budget = [0.0, 450, 1600, 3600, 5000][level];
    var t0 = World.now();
    var nodes:Array<Dynamic> = [for (m in cand) { m: m, n: 0, w: 0.0 }];
    var total = 0;
    while (World.now() - t0 < budget && total < 60000) {
      var best:Dynamic = null; var bv = -1.0;
      for (nd in nodes) {
        var v = (nd.n : Int) == 0 ? 1e9 : (nd.w : Float) / (nd.n : Int) + 1.1 * Math.sqrt(Math.log(total + 1) / (nd.n : Int));
        if (v > bv) { bv = v; best = nd; }
      }
      var c = b0.copy(); var r = place(c, best.m.t, me, s.ko);
      var res = playout(c, -me, r[1]);
      best.n = (best.n : Int) + 1; if (res == me) best.w = (best.w : Float) + 1;
      total++;
    }
    var pick:Dynamic = nodes[0];
    for (nd in nodes) if ((nd.n : Int) > (pick.n : Int)) pick = nd;
    var rate = (pick.n : Int) > 0 ? (pick.w : Float) / (pick.n : Int) : 0.5;
    if ((s.passes : Int) >= 1) {
      var fs = finalScore(b0); var a:Array<Float> = fs.a;
      var lead = me == 1 ? a[0] - a[1] - KOMI : a[1] + KOMI - a[0];
      if (lead > 0) return { pass: true, f: -1, t: -2 };
    }
    if (rate < 0.04 && (s.mv : Int) > 30) return { pass: true, f: -1, t: -2 };
    if (level == 1 && Math.random() < 0.25) return cand[Std.random(cand.length)];
    return pick.m;
  }
  override public function src(m:Dynamic):Int return -1;
  override public function lastCells(s:Dynamic, m:Dynamic):Array<Int> return m.pass == true ? [] : [m.t];
  function nm(p:Int):String return "ABCDEFGHJ".charAt(p % N) + (N - Std.int(p / N));
  override public function label(s:Dynamic, m:Dynamic):String return m.pass == true ? "passou" : nm(m.t);
  override public function status(s:Dynamic):String { var c:Array<Int> = s.cap; return "Capturadas: Pretas " + c[0] + " · Brancas " + c[1] + " · komi " + KOMI + ((s.passes : Int) == 1 ? " · o outro lado passou" : ""); }
  override public function svg(s:Dynamic, ui:Dynamic):String {
    var b:Array<Int> = s.b; var c = 100.0; var o = 70.0; var size = o * 2 + c * 8;
    function P(p:Int):Array<Float> return p < 0 ? null : [o + (p % N) * c, o + Std.int(p / N) * c];
    var sb = new StringBuf();
    sb.add('<svg viewBox="0 0 ' + size + ' ' + size + '">' + World.DEFS);
    sb.add('<rect width="' + size + '" height="' + size + '" rx="18" fill="#dcb46c"/><rect width="' + size + '" height="' + size + '" rx="18" fill="url(#wgW)" opacity=".35"/>');
    sb.add('<g stroke="#3a2410" stroke-width="3">');
    for (i in 0...N) sb.add('<line x1="' + o + '" y1="' + (o + i * c) + '" x2="' + (o + 8 * c) + '" y2="' + (o + i * c) + '"/><line x1="' + (o + i * c) + '" y1="' + o + '" x2="' + (o + i * c) + '" y2="' + (o + 8 * c) + '"/>');
    sb.add('</g>');
    for (pp in [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]]) sb.add('<circle cx="' + (o + pp[0] * c) + '" cy="' + (o + pp[1] * c) + '" r="9" fill="#3a2410"/>');
    if (ui.thumb != true) for (i in 0...N) {
      sb.add('<text x="' + (o + i * c) + '" y="38" text-anchor="middle" font-size="24" fill="#5b3714" font-family="Georgia,serif">' + "ABCDEFGHJ".charAt(i) + '</text>');
      sb.add('<text x="30" y="' + (o + i * c + 8) + '" text-anchor="middle" font-size="24" fill="#5b3714" font-family="Georgia,serif">' + (N - i) + '</text>');
    }
    var end:Array<Int> = ui.end;
    for (p in 0...NN) if (b[p] != 0) {
      var a = P(p); var dead = end != null && end[p] == 0;
      sb.add('<circle cx="' + (a[0] + 3) + '" cy="' + (a[1] + 6) + '" r="46" fill="rgba(0,0,0,.3)"/><circle cx="' + a[0] + '" cy="' + a[1] + '" r="46" fill="' + (b[p] == 1 ? "url(#wgD)" : "url(#wgL)") + '" stroke="' + (b[p] == 1 ? "#000" : "#9a8a6a") + '" stroke-width="1.5"' + (dead ? ' opacity=".4"' : '') + '/>');
    }
    if (end != null) {
      var seen = [for (i in 0...NN) false];
      for (p in 0...NN) if (end[p] == 0 && !seen[p]) {
        var reg:Array<Int> = []; var st = [p]; seen[p] = true; var bw = 0;
        while (st.length > 0) { var q = st.pop(); reg.push(q); for (n in NB[q]) { if (end[n] == 0 && !seen[n]) { seen[n] = true; st.push(n); } else if (end[n] == 1) bw |= 1; else if (end[n] == -1) bw |= 2; } }
        if (bw == 1 || bw == 2) for (q in reg) { var a = P(q); sb.add('<rect x="' + (a[0] - 14) + '" y="' + (a[1] - 14) + '" width="28" height="28" fill="' + (bw == 1 ? "#1b1209" : "#f6ead0") + '" stroke="#5b3714" stroke-width="2"/>'); }
      }
    }
    if (ui.thumb != true && ui.last != null) for (p in (ui.last : Array<Int>)) { var a = P(p); if (a != null && b[p] != 0) sb.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="15" fill="none" stroke="' + (b[p] == 1 ? "#f3d98c" : "#b3261e") + '" stroke-width="5"/>'); }
    if (ui.thumb != true) for (p in 0...NN) { var a = P(p); sb.add(World.hit(p, a[0] - c / 2, a[1] - c / 2, c, c)); }
    sb.add('</svg>');
    return sb.toString();
  }
}
#end
