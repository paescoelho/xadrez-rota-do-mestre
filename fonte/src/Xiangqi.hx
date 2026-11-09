package;

#if flash
import UiFlash as Ui;
import flash.display.*;
import flash.text.*;
#else
import UiJs as Ui;
#end

/* Xiangqi (xadrez chinês): tabuleiro de 9 x 10 pontos, peças nas intersecções, rio e palácio.
   Regras completas: general e conselheiros presos ao palácio, generais não podem se encarar na mesma coluna,
   elefante não cruza o rio e é bloqueado no "olho", cavalo é bloqueado na "perna", canhão captura saltando
   exatamente uma peça, soldado anda de lado depois do rio. Afogamento é derrota de quem não tem lances.
   Simplificação: xeque perpétuo e perseguição perpétua contam como empate por repetição. */
class Xiangqi {
  /* modo janggi (xadrez coreano): mesmo tabuleiro de 9 x 10 pontos, sem rio, com as diagonais do palácio */
  public static var jg = false;
  static inline var G = 1; static inline var A = 2; static inline var E = 3; static inline var H = 4;
  static inline var R = 5; static inline var C = 6; static inline var S = 7;
  static inline var WIN = 50000;
  static var VAL_XQ = [0, 0, 200, 200, 400, 900, 450, 100];
  static var VAL_JG = [0, 0, 300, 300, 500, 1300, 700, 200];
  static var VAL = VAL_XQ;
  static var RED = ["", "帥", "仕", "相", "傌", "俥", "炮", "兵"];
  static var BLK = ["", "將", "士", "象", "馬", "車", "砲", "卒"];
  static var PT = ["", "Gen", "Con", "Ele", "Cav", "Car", "Can", "Sol"];
  static var JG_CHO = ["", "楚", "士", "象", "馬", "車", "包", "卒"];
  static var JG_HAN = ["", "漢", "士", "象", "馬", "車", "包", "兵"];
  public static var JG_NAMES = ["", "General (gung)", "Guarda (sa)", "Elefante (sang)", "Cavalo (ma)", "Carro (cha)", "Canhão (po)", "Soldado (byeong/jol)"];
  static var JG_MOVES = ["",
    "Anda um ponto por qualquer linha do palácio, inclusive pelas diagonais desenhadas no X. Nunca sai do palácio. Começa no centro do palácio.",
    "Igual ao general: um ponto por qualquer linha do palácio, sem sair dele. Protege o general de perto.",
    "Anda um ponto reto e depois dois na diagonal, para fora (alcance maior que o do xiangqi). Pode ser bloqueado em qualquer ponto do caminho e atravessa o tabuleiro inteiro.",
    "Anda um ponto reto e depois um na diagonal, para fora, como no xiangqi. Se o ponto ao lado estiver ocupado, o movimento é bloqueado.",
    "Anda quantos pontos quiser na horizontal ou na vertical e também pelas diagonais do palácio. É a peça mais forte.",
    "Anda e captura sempre saltando exatamente uma peça. Não pode saltar outro canhão nem capturar canhão. Também usa as diagonais do palácio.",
    "Anda um ponto para a frente ou para os lados desde o começo. Dentro do palácio inimigo, também anda para a frente pelas diagonais."];
  public static var JG_STORY = [
    "O janggi é o xadrez da Coreia. Descende do xiangqi chinês, que chegou à península coreana provavelmente entre os séculos XI e XIII, e ganhou regras próprias ao longo da dinastia Joseon.",
    "O tabuleiro é o mesmo do xiangqi, mas sem o rio no meio: os elefantes atravessam o tabuleiro todo e os soldados andam para os lados desde o início. O general não fica na última linha, e sim no centro do palácio.",
    "As peças são octógonos, de tamanhos diferentes conforme a importância. Um lado é o Cho (azul ou verde, lembrando o reino Chu) e o outro o Han (vermelho), a mesma guerra entre Chu e Han que inspira o rio do xiangqi.",
    "O canhão é a peça mais curiosa: ele precisa saltar uma peça até para andar, e nunca salta nem captura outro canhão."];
  public static var JG_RULES = [
    "Vence quem der xeque-mate no general adversário. O Cho (azul) começa.",
    "Generais e guardas não saem do palácio, mas podem andar pelas diagonais do X.",
    "Carro, canhão e soldado também usam as diagonais do palácio.",
    "Não há regra de generais frente a frente; no janggi o jogador pode até passar a vez. Aqui, ficar sem lances legais termina empatado.",
    "As peças ficam na posição clássica \"cavalo-elefante, elefante-cavalo\"; nos torneios coreanos cada jogador escolhe uma de quatro arrumações."];
  public static var NAMES = ["", "General (帥/將)", "Conselheiro (仕/士)", "Elefante (相/象)", "Cavalo (傌/馬)", "Carro (俥/車)", "Canhão (炮/砲)", "Soldado (兵/卒)"];
  static var MOVES = ["",
    "Anda um ponto na horizontal ou na vertical, sem sair do palácio (o quadrado de 3 x 3 com o X). Os dois generais nunca podem ficar frente a frente na mesma coluna sem peças entre eles.",
    "Anda um ponto na diagonal, sempre dentro do palácio. Só alcança 5 pontos.",
    "Anda exatamente dois pontos na diagonal e não cruza o rio: é uma peça de defesa. Se o ponto do meio estiver ocupado (o \"olho do elefante\"), ele não passa.",
    "Anda um ponto reto e depois um na diagonal, para fora. Diferente do cavalo do xadrez, ele não salta: se o ponto reto ao lado estiver ocupado (a \"perna\"), o movimento é bloqueado.",
    "Anda quantos pontos quiser na horizontal ou na vertical, como a torre. É a peça mais forte.",
    "Anda como o carro, mas para capturar precisa saltar exatamente uma peça (de qualquer cor) no caminho, o \"anteparo\".",
    "Anda um ponto para a frente. Depois de cruzar o rio, também pode andar um ponto para os lados. Nunca volta e não promove."];

  public static var STORY = [
    "O xiangqi é o xadrez da China e um dos jogos de tabuleiro mais jogados do mundo, praticado por milhões de pessoas nas praças e parques do país. O nome costuma ser traduzido como \"jogo do elefante\" ou \"jogo das figuras\".",
    "A origem exata é discutida. A hipótese mais aceita é que ele descende do chaturanga indiano, que chegou à China pelas rotas comerciais. O jogo já existia na dinastia Tang (séculos VII a X) e ganhou a forma atual, com o canhão, na dinastia Song (séculos X a XIII), quando a pólvora começava a ser usada na guerra.",
    "As peças são discos com ideogramas e ficam nas intersecções das linhas, não dentro das casas. No meio do tabuleiro corre o rio, onde muitas vezes se lê \"楚河 漢界\" (rio Chu, fronteira Han), lembrança da guerra entre os reinos Chu e Han, que terminou em 202 a.C. com a fundação da dinastia Han.",
    "Cada lado tem um palácio, o quadrado marcado com um X, de onde o general e seus conselheiros não podem sair. O vermelho começa a partida."];
  public static var RULES = [
    "Vence quem der xeque-mate no general adversário.",
    "Afogamento: quem fica sem lances perde (no xadrez seria empate).",
    "Os dois generais não podem ficar frente a frente na mesma coluna sem nenhuma peça entre eles.",
    "O vermelho começa. Não há roque, nem promoção: o soldado que chega ao fim só anda para os lados.",
    "Neste jogo, xeque ou perseguição repetidos para sempre terminam empatados por repetição (nas regras oficiais, quem repete perde)."];

  static inline function sq(f:Int, r:Int):Int return (f < 0 || f > 8 || r < 0 || r > 9) ? -1 : r * 9 + f;
  static inline function fl(s:Int):Int return s % 9;
  static inline function rk(s:Int):Int return Std.int(s / 9);
  static inline function pt(p:Int):Int return p < 0 ? -p : p;
  static inline function col(p:Int):Int return p > 0 ? 1 : (p < 0 ? -1 : 0);
  static function inPalace(f:Int, r:Int, side:Int):Bool return f >= 3 && f <= 5 && (side == 1 ? r <= 2 : r >= 7);
  static function ownHalf(r:Int, side:Int):Bool return side == 1 ? r <= 4 : r >= 5;

  public static function setup():Array<Int> {
    var b = [for (i in 0...90) 0];
    VAL = jg ? VAL_JG : VAL_XQ;
    if (jg) {
      var bk = [R, H, E, A, 0, A, E, H, R];
      for (f in 0...9) { b[sq(f, 0)] = bk[f]; b[sq(f, 9)] = -bk[f]; }
      b[sq(4, 1)] = G; b[sq(4, 8)] = -G;
      for (f in [1, 7]) { b[sq(f, 2)] = C; b[sq(f, 7)] = -C; }
      for (f in [0, 2, 4, 6, 8]) { b[sq(f, 3)] = S; b[sq(f, 6)] = -S; }
      return b;
    }
    var back = [R, H, E, A, G, A, E, H, R];
    for (f in 0...9) { b[sq(f, 0)] = back[f]; b[sq(f, 9)] = -back[f]; }
    for (f in [1, 7]) { b[sq(f, 2)] = C; b[sq(f, 7)] = -C; }
    for (f in [0, 2, 4, 6, 8]) { b[sq(f, 3)] = S; b[sq(f, 6)] = -S; }
    return b;
  }
  static var ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  static var DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  /* passo pela diagonal desenhada no palácio (um dos pontos é o centro) */
  static function palDiag(f:Int, r:Int, f2:Int, r2:Int):Bool {
    if (f < 3 || f > 5 || f2 < 3 || f2 > 5) return false;
    var top = r >= 7; if ((r2 >= 7) != top) return false;
    if (!top && (r > 2 || r2 > 2 || r < 0 || r2 < 0)) return false;
    if (top && (r > 9 || r2 > 9)) return false;
    if (Math.abs(f2 - f) != 1 || Math.abs(r2 - r) != 1) return false;
    var cr = top ? 8 : 1;
    return (f == 4 && r == cr) || (f2 == 4 && r2 == cr);
  }
  static function genJg(b:Array<Int>, side:Int):Array<Int> {
    var out:Array<Int> = [];
    for (s in 0...90) {
      var p = b[s]; if (p == 0 || col(p) != side) continue;
      var f = fl(s); var r = rk(s);
      function add(t:Int) { if (t < 0) return; if (b[t] != 0 && col(b[t]) == side) return; out.push(s | (t << 7)); }
      switch (pt(p)) {
        case 1, 2:
          for (d in ORTH) if (inPalace(f + d[0], r + d[1], side)) add(sq(f + d[0], r + d[1]));
          for (d in DIAG) if (inPalace(f + d[0], r + d[1], side) && palDiag(f, r, f + d[0], r + d[1])) add(sq(f + d[0], r + d[1]));
        case 3:
          for (d in ORTH) {
            var p1 = sq(f + d[0], r + d[1]); if (p1 < 0 || b[p1] != 0) continue;
            var es = d[0] != 0 ? [[d[0], 1], [d[0], -1]] : [[1, d[1]], [-1, d[1]]];
            for (e in es) {
              var p2 = sq(f + d[0] + e[0], r + d[1] + e[1]); if (p2 < 0 || b[p2] != 0) continue;
              add(sq(f + d[0] + 2 * e[0], r + d[1] + 2 * e[1]));
            }
          }
        case 4: for (d in ORTH) { var leg = sq(f + d[0], r + d[1]); if (leg < 0 || b[leg] != 0) continue;
            if (d[0] != 0) { add(sq(f + 2 * d[0], r + 1)); add(sq(f + 2 * d[0], r - 1)); } else { add(sq(f + 1, r + 2 * d[1])); add(sq(f - 1, r + 2 * d[1])); } }
        case 5:
          for (d in ORTH) {
            var ff = f + d[0]; var rr = r + d[1];
            while (true) { var t = sq(ff, rr); if (t < 0) break; if (b[t] == 0) out.push(s | (t << 7)); else { if (col(b[t]) == -side) out.push(s | (t << 7)); break; } ff += d[0]; rr += d[1]; }
          }
          for (d in DIAG) {
            var pf = f; var pr = r; var ff = f + d[0]; var rr = r + d[1];
            while (palDiag(pf, pr, ff, rr)) { var t = sq(ff, rr); if (b[t] == 0) out.push(s | (t << 7)); else { if (col(b[t]) == -side) out.push(s | (t << 7)); break; } pf = ff; pr = rr; ff += d[0]; rr += d[1]; }
          }
        case 6:
          for (d in ORTH) {
            var ff = f + d[0]; var rr = r + d[1]; var jumped = false;
            while (true) {
              var t = sq(ff, rr); if (t < 0) break;
              if (!jumped) { if (b[t] != 0) { if (pt(b[t]) == C) break; jumped = true; } }
              else if (b[t] == 0) out.push(s | (t << 7));
              else { if (col(b[t]) == -side && pt(b[t]) != C) out.push(s | (t << 7)); break; }
              ff += d[0]; rr += d[1];
            }
          }
          for (d in DIAG) {
            if (!palDiag(f, r, f + d[0], r + d[1]) || !palDiag(f + d[0], r + d[1], f + 2 * d[0], r + 2 * d[1])) continue;
            var m1 = sq(f + d[0], r + d[1]); if (b[m1] == 0 || pt(b[m1]) == C) continue;
            var t = sq(f + 2 * d[0], r + 2 * d[1]);
            if (b[t] == 0) out.push(s | (t << 7)); else if (col(b[t]) == -side && pt(b[t]) != C) out.push(s | (t << 7));
          }
        case 7:
          add(sq(f, r + side)); add(sq(f + 1, r)); add(sq(f - 1, r));
          for (dx in [-1, 1]) if (inPalace(f + dx, r + side, -side) && palDiag(f, r, f + dx, r + side)) add(sq(f + dx, r + side));
        default:
      }
    }
    return out;
  }
  public static function gen(b:Array<Int>, side:Int):Array<Int> {
    if (jg) return genJg(b, side);
    var out:Array<Int> = [];
    for (s in 0...90) {
      var p = b[s]; if (p == 0 || col(p) != side) continue;
      var f = fl(s); var r = rk(s);
      function add(t:Int) { if (t < 0) return; if (b[t] != 0 && col(b[t]) == side) return; out.push(s | (t << 7)); }
      switch (pt(p)) {
        case 1: for (d in ORTH) if (inPalace(f + d[0], r + d[1], side)) add(sq(f + d[0], r + d[1]));
        case 2: for (d in DIAG) if (inPalace(f + d[0], r + d[1], side)) add(sq(f + d[0], r + d[1]));
        case 3: for (d in DIAG) { var t = sq(f + 2 * d[0], r + 2 * d[1]); if (t >= 0 && ownHalf(r + 2 * d[1], side) && b[sq(f + d[0], r + d[1])] == 0) add(t); }
        case 4: for (d in ORTH) { var leg = sq(f + d[0], r + d[1]); if (leg < 0 || b[leg] != 0) continue;
            if (d[0] != 0) { add(sq(f + 2 * d[0], r + 1)); add(sq(f + 2 * d[0], r - 1)); } else { add(sq(f + 1, r + 2 * d[1])); add(sq(f - 1, r + 2 * d[1])); } }
        case 5, 6:
          for (d in ORTH) {
            var ff = f + d[0]; var rr = r + d[1]; var jumped = false;
            while (true) {
              var t = sq(ff, rr); if (t < 0) break;
              if (!jumped) {
                if (b[t] == 0) out.push(s | (t << 7));
                else { if (pt(p) == R) { if (col(b[t]) == -side) out.push(s | (t << 7)); break; } jumped = true; }
              } else if (b[t] != 0) { if (col(b[t]) == -side) out.push(s | (t << 7)); break; }
              ff += d[0]; rr += d[1];
            }
          }
        case 7:
          add(sq(f, r + side));
          if (!ownHalf(r, side)) { add(sq(f + 1, r)); add(sq(f - 1, r)); }
        default:
      }
    }
    return out;
  }
  static function genSq(b:Array<Int>, side:Int):Int { for (s in 0...90) if (b[s] == side * G) return s; return -1; }
  /* o lado `side` está em xeque (inclui generais frente a frente)? */
  public static function inCheck(b:Array<Int>, side:Int):Bool {
    var g = genSq(b, side); if (g < 0) return true;
    for (m in gen(b, -side)) if ((m >> 7) == g) return true;
    if (jg) return false;
    var o = genSq(b, -side);
    if (o >= 0 && fl(o) == fl(g)) {
      var lo = Std.int(Math.min(rk(o), rk(g))) + 1; var hi = Std.int(Math.max(rk(o), rk(g)));
      var clear = true; for (r in lo...hi) if (b[sq(fl(g), r)] != 0) { clear = false; break; }
      if (clear) return true;
    }
    return false;
  }
  public static function make(b:Array<Int>, m:Int):Array<Int> { var n = b.copy(); var f = m & 127; var t = m >> 7; n[t] = b[f]; n[f] = 0; return n; }
  public static function legal(b:Array<Int>, side:Int):Array<Int> return [for (m in gen(b, side)) if (!inCheck(make(b, m), side)) m];

  static function evalSide(b:Array<Int>, side:Int):Int {
    var sc = 0;
    for (s in 0...90) {
      var p = b[s]; if (p == 0) continue;
      var t = pt(p); var c = col(p); var x = VAL[t];
      var f = fl(s); var r = rk(s); var adv = c == 1 ? r : 9 - r;
      if (t == S) x += adv >= 5 ? 90 + (4 - Std.int(Math.abs(f - 4))) * 10 : adv * 5;
      if (t == H || t == C) x += (4 - Std.int(Math.abs(f - 4))) * 6 + (t == H ? adv * 4 : 0);
      if (t == R) x += adv >= 5 ? 20 : 0;
      sc += c * x;
    }
    return sc * side;
  }
  static var nodes = 0; static var deadline = 0.0; static var stop = false;
  static function order(b:Array<Int>, ms:Array<Int>):Array<Int> {
    var sc = [for (m in ms) b[m >> 7] != 0 ? VAL[pt(b[m >> 7])] * 10 - VAL[pt(b[m & 127])] : 0];
    var idx = [for (i in 0...ms.length) i]; idx.sort(function(a, c) return sc[c] - sc[a]);
    return [for (i in idx) ms[i]];
  }
  static function quiesce(b:Array<Int>, side:Int, alpha:Int, beta:Int, qd:Int):Int {
    nodes++;
    var stand = evalSide(b, side);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qd <= 0) return stand;
    for (m in order(b, [for (m in gen(b, side)) if (b[m >> 7] != 0) m])) {
      if (pt(b[m >> 7]) == G) return WIN;
      var nb = make(b, m); if (inCheck(nb, side)) continue;
      var sc = -quiesce(nb, -side, -beta, -alpha, qd - 1);
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  static function negamax(b:Array<Int>, side:Int, depth:Int, alpha:Int, beta:Int, ply:Int):Int {
    nodes++;
    if ((nodes & 511) == 0 && haxe.Timer.stamp() * 1000 > deadline) stop = true;
    if (stop) return 0;
    var ms = legal(b, side);
    if (ms.length == 0) return -WIN + ply;
    if (depth <= 0) return quiesce(b, side, alpha, beta, 4);
    var best = -WIN * 2;
    for (m in order(b, ms)) {
      var sc = -negamax(make(b, m), -side, depth - 1, -beta, -alpha, ply + 1);
      if (stop) return 0;
      if (sc > best) best = sc;
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    return best;
  }
  public static function think(b:Array<Int>, side:Int, level:Int):Int {
    var ms = order(b, legal(b, side));
    if (ms.length == 0) return -1;
    deadline = haxe.Timer.stamp() * 1000 + (level >= 3 ? 2500 : 1200);
    stop = false; nodes = 0;
    var maxD = level == 1 ? 2 : (level == 2 ? 3 : 6);
    var best = ms[0];
    for (d in 1...maxD + 1) {
      var bestD = -1; var bestS = -WIN * 2; var alpha = -WIN * 2;
      for (m in ms) {
        var s = -negamax(make(b, m), -side, d - 1, -WIN * 2, -alpha, 1);
        if (stop) break;
        if (s > bestS) { bestS = s; bestD = m; }
        if (s > alpha) alpha = s;
      }
      if (stop || bestD < 0) break;
      best = bestD; ms.remove(best); ms.unshift(best);
      if (bestS >= WIN - 100) break;
    }
    if (level == 1 && Math.random() < 0.3) return ms[Std.random(ms.length)];
    return best;
  }

  /* ---------- telas ---------- */
  static var g:Dynamic = null;
  static var latin = false;
  static var ideo = false;
  /* figuras das peças (desenho próprio), centradas em (0,0), cabem num disco de raio 35 */
  static function icon(t:Int, c:String):String {
    var bg = "#f6e7c6";
    return switch (t) {
      case 1: '<path d="M-22 12V-9l11 11L0-20 11 2 22-9v21z" fill="' + c + '"/><rect x="-23" y="14" width="46" height="7" rx="2" fill="' + c + '"/><circle cx="0" cy="-22" r="4" fill="' + c + '"/><circle cx="-22" cy="-11" r="3.5" fill="' + c + '"/><circle cx="22" cy="-11" r="3.5" fill="' + c + '"/><circle cx="0" cy="3" r="4" fill="' + bg + '"/>';
      case 2: '<circle cx="0" cy="-13" r="7" fill="' + c + '"/><path d="M-9-21h18v-4h-18z" fill="' + c + '"/><path d="M-16 21l6-25h20l6 25z" fill="' + c + '"/><path d="M0-3v22M-6 6h12" stroke="' + bg + '" stroke-width="2.5"/>';
      case 3: '<ellipse cx="-15" cy="-5" rx="8" ry="11" fill="' + c + '"/><ellipse cx="15" cy="-5" rx="8" ry="11" fill="' + c + '"/><circle cx="0" cy="-5" r="12" fill="' + c + '"/><path d="M0 4c0 9-3 13 3 18" stroke="' + c + '" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-6 5c-2 5-5 7-9 7M6 5c2 5 5 7 9 7" stroke="' + bg + '" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="-5" cy="-8" r="2" fill="' + bg + '"/><circle cx="5" cy="-8" r="2" fill="' + bg + '"/>';
      case 4: '<path d="M-13 22v-12c-7-4-9-13-4-20l9-11 3 6c11-2 20 8 19 20l-2 17z" fill="' + c + '"/><path d="M-8-12l-5-9" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/><circle cx="-4" cy="-6" r="2.4" fill="' + bg + '"/><path d="M-17-1c-2 2-1 4 1 4" stroke="' + bg + '" stroke-width="2" fill="none"/><path d="M4-15c5 2 8 7 9 13" stroke="' + bg + '" stroke-width="2" fill="none" stroke-linecap="round"/>';
      case 5: '<path d="M-22-14h44l-4 16h-36z" fill="' + c + '"/><path d="M-18-20h36" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/><circle cx="-12" cy="10" r="10" fill="' + c + '"/><circle cx="12" cy="10" r="10" fill="' + c + '"/><circle cx="-12" cy="10" r="3" fill="' + bg + '"/><circle cx="12" cy="10" r="3" fill="' + bg + '"/><path d="M-12 2v16M-20 10h16M12 2v16M4 10h16" stroke="' + bg + '" stroke-width="1.8"/>';
      case 6: '<g transform="rotate(-24)"><rect x="-24" y="-7" width="40" height="13" rx="5" fill="' + c + '"/><rect x="14" y="-9" width="8" height="17" rx="2" fill="' + c + '"/><circle cx="-24" cy="-1" r="5" fill="' + c + '"/></g><circle cx="-2" cy="12" r="11" fill="' + c + '"/><circle cx="-2" cy="12" r="4" fill="' + bg + '"/><path d="M-2 2v20M-12 12h20" stroke="' + bg + '" stroke-width="1.8"/>';
      case 7: '<path d="M14-27l5 9h-10z" fill="' + c + '"/><path d="M14-19v42" stroke="' + c + '" stroke-width="4"/><circle cx="-6" cy="-14" r="7" fill="' + c + '"/><path d="M-15-17h18" stroke="' + c + '" stroke-width="3"/><ellipse cx="-6" cy="8" rx="11" ry="14" fill="' + c + '"/><path d="M-6-3v22M-14 8h16" stroke="' + bg + '" stroke-width="2.2"/>';
      default: "";
    };
  }
  static function key(b:Array<Int>, side:Int):String return b.join(",") + side;
  public static function info() { jg = false; showInfo(); }
  public static function infoJanggi() { jg = true; showInfo(); }
  public static function quick(janggi:Bool) { jg = janggi; start(1, 2); }
  static function nm(t:Int):String return jg ? JG_NAMES[t] : NAMES[t];
  static function mv(t:Int):String return jg ? JG_MOVES[t] : MOVES[t];
  static function title():String return jg ? "Janggi (xadrez coreano)" : "Xiangqi (xadrez chinês)";
  static function back() if (jg) infoJanggi() else info();
  static function sideName(s:Int):String return jg ? (s == 1 ? "azuis (Cho)" : "vermelhas (Han)") : (s == 1 ? "vermelhas" : "pretas");
  static function showInfo() {
    Ui.page(title(), Pages.history);
    Ui.p(jg ? "Coreia · regras firmadas na dinastia Joseon (1392 a 1897)" : "China · forma atual desde a dinastia Song (séculos X a XIII)", "gold");
    for (s in (jg ? JG_STORY : STORY)) Ui.p(s, "");
    Ui.h("Como se joga");
    Ui.ul(jg ? JG_RULES : RULES);
    Ui.h("As peças");
    Ui.p("As peças aparecem como figuras. Na partida, o botão de troca mostra os ideogramas originais ou letras.", "muted small");
    Ui.items([for (t in [G, A, E, H, R, C, S]) { t: nm(t), d: mv(t), r: "ver", f: function() demo(t) }]);
    Ui.h("Jogar contra o computador (você escolhe o lado)");
    var a = jg ? "Azuis" : "Vermelhas"; var b = jg ? "Vermelhas" : "Pretas";
    Ui.btns([[a + " · fácil", function() start(1, 1), "pri"], [a + " · normal", function() start(1, 2)], [a + " · forte", function() start(1, 3)]]);
    Ui.btns([[b + " · fácil", function() start(-1, 1)], [b + " · normal", function() start(-1, 2)], [b + " · forte", function() start(-1, 3)]]);
  }
  /* desenho do tabuleiro em SVG: 9 x 10 pontos, rio, palácios e marcas dos canhões e soldados */
  static function boardSvg(b:Array<Int>, flip:Bool, sel:Int, targets:Array<Int>, last:Array<Int>, marks:Array<Int>, chk:Int):String {
    function X(f:Int):Float return 50 + (flip ? 8 - f : f) * 100;
    function Y(r:Int):Float return 50 + (flip ? r : 9 - r) * 100;
    var s = new StringBuf();
    s.add('<svg viewBox="0 0 900 1000" class="xqsvg"><rect x="0" y="0" width="900" height="1000" rx="18" fill="' + (jg ? "#efd39c" : "#e9c98f") + '"/>');
    s.add('<g stroke="#5b3714" stroke-width="3" fill="none">');
    for (r in 0...10) s.add('<line x1="50" y1="' + Y(r) + '" x2="850" y2="' + Y(r) + '"/>');
    for (f in 0...9) {
      if (f == 0 || f == 8 || jg) s.add('<line x1="' + X(f) + '" y1="50" x2="' + X(f) + '" y2="950"/>');
      else { s.add('<line x1="' + X(f) + '" y1="' + Y(0) + '" x2="' + X(f) + '" y2="' + Y(4) + '"/><line x1="' + X(f) + '" y1="' + Y(5) + '" x2="' + X(f) + '" y2="' + Y(9) + '"/>'); }
    }
    for (pr in [[0, 2], [7, 9]]) { s.add('<line x1="' + X(3) + '" y1="' + Y(pr[0]) + '" x2="' + X(5) + '" y2="' + Y(pr[1]) + '"/><line x1="' + X(5) + '" y1="' + Y(pr[0]) + '" x2="' + X(3) + '" y2="' + Y(pr[1]) + '"/>'); }
    s.add('<rect x="44" y="44" width="812" height="912" stroke-width="6"/></g>');
    var ry = (Y(4) + Y(5)) / 2;
    if (!jg) s.add('<text x="250" y="' + (ry + 22) + '" font-size="58" fill="#7a4a1c" text-anchor="middle" font-family="serif" opacity=".75">楚 河</text><text x="650" y="' + (ry + 22) + '" font-size="58" fill="#7a4a1c" text-anchor="middle" font-family="serif" opacity=".75">漢 界</text>');
    if (last != null) for (q in last) s.add('<rect x="' + (X(fl(q)) - 46) + '" y="' + (Y(rk(q)) - 46) + '" width="92" height="92" fill="rgba(205,170,40,.38)" rx="10"/>');
    for (q in marks) s.add('<circle cx="' + X(fl(q)) + '" cy="' + Y(rk(q)) + '" r="30" fill="rgba(58,163,91,.7)"/>');
    for (q in 0...90) {
      var p = b[q]; if (p == 0) continue;
      var c = jg ? (p > 0 ? "#1d4f91" : "#b3261e") : (p > 0 ? "#b3261e" : "#1e1e1e"); var t = pt(p);
      var x = X(fl(q)); var y = Y(rk(q));
      var k = jg ? (t == G ? 1.08 : (t == A || t == S ? 0.82 : 0.95)) : 1.0;
      if (q == chk) s.add('<circle cx="' + x + '" cy="' + y + '" r="48" fill="rgba(230,0,0,.45)"/>');
      if (jg) {
        s.add('<polygon points="' + oct(x, y + 4, 44 * k) + '" fill="rgba(60,30,5,.35)"/><polygon points="' + oct(x, y, 44 * k) + '" fill="#f6e7c6" stroke="' + (q == sel ? "#2e7d32" : "#6b4a22") + '" stroke-width="' + (q == sel ? 7 : 3) + '"/>');
        s.add('<polygon points="' + oct(x, y, 36 * k) + '" fill="none" stroke="' + c + '" stroke-width="2.5"/>');
      } else {
        s.add('<circle cx="' + x + '" cy="' + (y + 4) + '" r="43" fill="rgba(60,30,5,.35)"/><circle cx="' + x + '" cy="' + y + '" r="43" fill="#f6e7c6" stroke="' + (q == sel ? "#2e7d32" : "#6b4a22") + '" stroke-width="' + (q == sel ? 7 : 3) + '"/>');
        s.add('<circle cx="' + x + '" cy="' + y + '" r="35" fill="none" stroke="' + c + '" stroke-width="2.5"/>');
      }
      if (!latin && !ideo) s.add('<g transform="translate(' + x + ' ' + y + ') scale(' + (1.02 * k) + ')">' + icon(t, c) + '</g>');
      else if (latin) s.add('<text x="' + x + '" y="' + (y + 12) + '" font-size="32" font-weight="700" fill="' + c + '" text-anchor="middle" font-family="sans-serif">' + PT[t] + '</text>');
      else s.add('<text x="' + x + '" y="' + (y + 17) + '" font-size="50" font-weight="700" fill="' + c + '" text-anchor="middle" font-family="\'Noto Serif CJK SC\',\'Songti SC\',\'STSong\',serif">' + (jg ? (p > 0 ? JG_CHO[t] : JG_HAN[t]) : (p > 0 ? RED[t] : BLK[t])) + '</text>');
    }
    for (q in targets) s.add('<circle cx="' + X(fl(q)) + '" cy="' + Y(rk(q)) + '" r="' + (b[q] != 0 ? 46 : 14) + '" fill="' + (b[q] != 0 ? "none" : "rgba(20,85,30,.7)") + '" stroke="rgba(20,85,30,.8)" stroke-width="' + (b[q] != 0 ? 7 : 0) + '"/>');
    s.add('</svg>');
    return s.toString();
  }
  /* octógono das peças do janggi */
  public static function oct(x:Float, y:Float, r:Float):String {
    return [for (i in 0...8) { var a = Math.PI / 8 + i * Math.PI / 4; (Math.round((x + Math.cos(a) * r) * 10) / 10) + "," + (Math.round((y + Math.sin(a) * r) * 10) / 10); }].join(" ");
  }
  /* mostra a página com o tabuleiro (HTML: SVG; Flash: desenho vetorial ao lado do painel) */
  static function showBoard(title:String, back:Void->Void, b:Array<Int>, flip:Bool, sel:Int, targets:Array<Int>, last:Array<Int>, marks:Array<Int>, chk:Int, onPick:Int->Void) {
    #if flash
    var sp = Ui.sidePage(title, back, 0.9);
    drawFlash(sp, b, flip, sel, targets, last, marks, chk, onPick);
    #else
    Ui.page(title, back);
    boardNode(boardSvg(b, flip, sel, targets, last, marks, chk), onPick, flip);
    #end
  }
  #if flash
  static function drawFlash(sp:Sprite, b:Array<Int>, flip:Bool, sel:Int, targets:Array<Int>, last:Array<Int>, marks:Array<Int>, chk:Int, onPick:Int->Void) {
    var bw:Float = UiFlash.sideW; var k = bw / 900;
    var g = sp.graphics;
    function X(f:Int):Float return (50 + (flip ? 8 - f : f) * 100) * k;
    function Y(r:Int):Float return (50 + (flip ? r : 9 - r) * 100) * k;
    g.beginFill(0xe9c98f); g.drawRoundRect(0, 0, 900 * k, 1000 * k, 30 * k, 30 * k); g.endFill();
    g.lineStyle(Math.max(1, 3 * k), 0x5b3714);
    for (r in 0...10) { g.moveTo(X(0), Y(r)); g.lineTo(X(8), Y(r)); }
    for (f in 0...9) {
      if (f == 0 || f == 8) { g.moveTo(X(f), Y(0)); g.lineTo(X(f), Y(9)); }
      else { g.moveTo(X(f), Y(0)); g.lineTo(X(f), Y(4)); g.moveTo(X(f), Y(5)); g.lineTo(X(f), Y(9)); }
    }
    for (pr in [[0, 2], [7, 9]]) { g.moveTo(X(3), Y(pr[0])); g.lineTo(X(5), Y(pr[1])); g.moveTo(X(5), Y(pr[0])); g.lineTo(X(3), Y(pr[1])); }
    g.lineStyle(Math.max(2, 6 * k), 0x5b3714); g.drawRect(44 * k, 44 * k, 812 * k, 912 * k); g.lineStyle();
    var rv = UiFlash.tf("RIO   ·   FRONTEIRA", 16, 0x7a4a1c, true, 0);
    rv.x = (900 * k - rv.width) / 2; rv.y = (Y(4) + Y(5)) / 2 - rv.height / 2; rv.alpha = 0.7; sp.addChild(rv);
    if (last != null) for (q in last) { g.beginFill(0xcdaa28, 0.38); g.drawRoundRect(X(fl(q)) - 46 * k, Y(rk(q)) - 46 * k, 92 * k, 92 * k, 20 * k, 20 * k); g.endFill(); }
    for (q in marks) { g.beginFill(0x3aa35b, 0.7); g.drawCircle(X(fl(q)), Y(rk(q)), 30 * k); g.endFill(); }
    for (q in 0...90) {
      var p = b[q]; if (p == 0) continue;
      var c = p > 0 ? 0xb3261e : 0x1e1e1e; var t = pt(p); var x = X(fl(q)); var y = Y(rk(q));
      if (q == chk) { g.beginFill(0xe60000, 0.45); g.drawCircle(x, y, 48 * k); g.endFill(); }
      g.beginFill(0x3c1e05, 0.35); g.drawCircle(x, y + 4 * k, 43 * k); g.endFill();
      g.lineStyle(q == sel ? 7 * k : 3 * k, q == sel ? 0x2e7d32 : 0x6b4a22); g.beginFill(0xf6e7c6); g.drawCircle(x, y, 43 * k); g.endFill();
      g.lineStyle(2.5 * k, c); g.drawCircle(x, y, 35 * k); g.lineStyle();
      if (latin) { var tx = UiFlash.tf(PT[t], 12, c, true, 0); tx.x = x - tx.width / 2; tx.y = y - tx.height / 2; sp.addChild(tx); }
      else iconFlash(g, t, c, x, y, k);
    }
    for (q in targets) {
      if (b[q] != 0) { g.lineStyle(7 * k, 0x14551e, 0.8); g.drawCircle(X(fl(q)), Y(rk(q)), 46 * k); g.lineStyle(); }
      else { g.beginFill(0x14551e, 0.7); g.drawCircle(X(fl(q)), Y(rk(q)), 14 * k); g.endFill(); }
    }
    if (onPick != null) {
      sp.buttonMode = true; sp.mouseChildren = false;
      sp.addEventListener(flash.events.MouseEvent.CLICK, function(_) {
        var fx = Math.round((sp.mouseX / k - 50) / 100); var ry = Math.round((sp.mouseY / k - 50) / 100);
        if (fx < 0 || fx > 8 || ry < 0 || ry > 9) return;
        onPick(sq(Std.int(flip ? 8 - fx : fx), Std.int(flip ? ry : 9 - ry)));
      });
    }
  }
  /* as mesmas figuras do HTML5, desenhadas com vetores */
  static function iconFlash(g:Graphics, t:Int, c:Int, x0:Float, y0:Float, k:Float) {
    var bg = 0xf6e7c6;
    function P(pts:Array<Float>, col:Int) { g.beginFill(col); g.moveTo(x0 + pts[0] * k, y0 + pts[1] * k); var i = 2; while (i < pts.length) { g.lineTo(x0 + pts[i] * k, y0 + pts[i + 1] * k); i += 2; } g.endFill(); }
    function O(cx:Float, cy:Float, r:Float, col:Int) { g.beginFill(col); g.drawCircle(x0 + cx * k, y0 + cy * k, r * k); g.endFill(); }
    function L(x1:Float, y1:Float, x2:Float, y2:Float, w:Float, col:Int) { g.lineStyle(w * k, col); g.moveTo(x0 + x1 * k, y0 + y1 * k); g.lineTo(x0 + x2 * k, y0 + y2 * k); g.lineStyle(); }
    function EL(cx:Float, cy:Float, rx:Float, ry:Float, col:Int) { g.beginFill(col); g.drawEllipse(x0 + (cx - rx) * k, y0 + (cy - ry) * k, 2 * rx * k, 2 * ry * k); g.endFill(); }
    switch (t) {
      case 1: P([-22, 12, -22, -9, -11, 2, 0, -20, 11, 2, 22, -9, 22, 12], c); P([-23, 14, 23, 14, 23, 21, -23, 21], c); O(0, -22, 4, c); O(-22, -11, 3.5, c); O(22, -11, 3.5, c); O(0, 3, 4, bg);
      case 2: O(0, -13, 7, c); P([-9, -25, 9, -25, 9, -21, -9, -21], c); P([-16, 21, -10, -4, 10, -4, 16, 21], c); L(0, -3, 0, 19, 2.5, bg); L(-6, 6, 6, 6, 2.5, bg);
      case 3: EL(-15, -5, 8, 11, c); EL(15, -5, 8, 11, c); O(0, -5, 12, c);
        g.lineStyle(7 * k, c); g.moveTo(x0, y0 + 4 * k); g.curveTo(x0 - 1 * k, y0 + 15 * k, x0 + 3 * k, y0 + 22 * k); g.lineStyle();
        L(-6, 5, -14, 12, 2.5, bg); L(6, 5, 14, 12, 2.5, bg); O(-5, -8, 2, bg); O(5, -8, 2, bg);
      case 4: P([-13, 22, -13, 10, -19, 4, -21, -4, -17, -10, -8, -21, -5, -15, 3, -16, 10, -12, 15, -4, 14, 5, 12, 22], c); L(-8, -12, -13, -21, 5, c); O(-4, -6, 2.4, bg);
      case 5: P([-22, -14, 22, -14, 18, 2, -18, 2], c); L(-18, -20, 18, -20, 4, c); O(-12, 10, 10, c); O(12, 10, 10, c); O(-12, 10, 3, bg); O(12, 10, 3, bg);
        L(-12, 2, -12, 18, 1.8, bg); L(-20, 10, -4, 10, 1.8, bg); L(12, 2, 12, 18, 1.8, bg); L(4, 10, 20, 10, 1.8, bg);
      case 6:
        var a = -24 * Math.PI / 180; var ca = Math.cos(a); var sa = Math.sin(a);
        function R(pts:Array<Float>):Array<Float> { var o:Array<Float> = []; var i = 0; while (i < pts.length) { o.push(pts[i] * ca - pts[i + 1] * sa); o.push(pts[i] * sa + pts[i + 1] * ca); i += 2; } return o; }
        P(R([-24, -7, 16, -7, 16, 6, -24, 6]), c); P(R([14, -9, 22, -9, 22, 8, 14, 8]), c);
        var bc = R([-24, -1]); O(bc[0], bc[1], 5, c);
        O(-2, 12, 11, c); O(-2, 12, 4, bg); L(-2, 2, -2, 22, 1.8, bg); L(-12, 12, 8, 12, 1.8, bg);
      case 7: P([14, -27, 19, -18, 9, -18], c); L(14, -19, 14, 23, 4, c); O(-6, -14, 7, c); L(-15, -17, 3, -17, 3, c); EL(-6, 8, 11, 14, c); L(-6, -3, -6, 19, 2.2, bg); L(-14, 8, 2, 8, 2.2, bg);
      default:
    }
  }
  #end
  #if js
  static function boardNode(svg:String, onPick:Int->Void, flip:Bool) {
    var d:Dynamic = Ui.node("div", "xq");
    d.innerHTML = svg;
    if (onPick != null) d.onclick = function(e:Dynamic) {
      var rc = d.firstChild.getBoundingClientRect();
      var x = (e.clientX - rc.left) / rc.width * 900; var y = (e.clientY - rc.top) / rc.height * 1000;
      var fx = Math.round((x - 50) / 100); var ry = Math.round((y - 50) / 100);
      if (fx < 0 || fx > 8 || ry < 0 || ry > 9) return;
      var f = flip ? 8 - fx : fx; var r = flip ? ry : 9 - ry;
      onPick(sq(Std.int(f), Std.int(r)));
    };
  }
  #end
  static function demo(t:Int) {
    var b = [for (i in 0...90) 0];
    var at = t == G || t == A ? sq(4, 1) : (t == E ? (jg ? sq(4, 4) : sq(2, 2)) : (t == S ? sq(4, 5) : sq(4, 4)));
    if (jg && t == R) at = sq(3, 0);
    if (t == A) at = sq(4, 1);
    b[at] = t;
    if (t != G) { b[jg ? sq(5, 0) : sq(3, 0)] = G; }
    b[sq(5, 9)] = -G;
    if (t == C) { b[sq(4, 7)] = -S; b[sq(4, 8)] = -R; }
    if (t == H) b[sq(4, 5)] = S;
    var marks = [for (m in gen(b, 1)) if ((m & 127) == at) m >> 7];
    showBoard(nm(t), back, b, false, at, [], null, marks, -1, null);
    Ui.p(nm(t), "gold big");
    Ui.p(mv(t), "");
    if (t == C) Ui.p(jg ? "No exemplo, o canhão salta o soldado: pode parar em qualquer ponto livre depois dele ou capturar o carro." : "No exemplo, o canhão pode capturar o carro preto saltando o soldado.", "muted");
    if (jg && t == R) Ui.p("No exemplo, o carro usa também a diagonal do palácio.", "muted");
    if (t == H) Ui.p("No exemplo, o soldado em cima do cavalo bloqueia a \"perna\": os dois saltos para cima ficam proibidos.", "muted");
    if (t == S) Ui.p(jg ? "No janggi o soldado anda para a frente e para os lados desde o começo." : "No exemplo, o soldado já cruzou o rio e pode andar para os lados.", "muted");
    var ts = [G, A, E, H, R, C, S]; var i = ts.indexOf(t);
    Ui.btns([["Próxima peça", function() demo(ts[(i + 1) % ts.length]), "pri"], ["Voltar", back]]);
  }
  static function start(human:Int, level:Int) {
    var b = setup();
    g = { b: b, turn: 1, human: human, level: level, hist: [], log: [], over: null, keys: [key(b, 1)], last: null, busy: false, sel: -1, flip: human == -1 };
    draw();
    if (g.turn != human) cpu();
  }
  static function draw() {
    if (g == null) return;
    var bd:Array<Int> = g.b;
    var my = g.over == null && !g.busy && g.turn == g.human;
    var lg = my ? legal(bd, g.turn) : [];
    var targets = g.sel >= 0 ? [for (m in lg) if ((m & 127) == g.sel) m >> 7] : [];
    var chk = inCheck(bd, g.turn) ? genSq(bd, g.turn) : -1;
    var lv = ["", "fácil", "normal", "forte"][g.level];
    showBoard(jg ? "Janggi" : "Xiangqi", function() { g = null; back(); }, bd, g.flip, g.sel, targets, g.last, [], chk, function(s) pick(s, lg));
    Ui.p("Computador (" + lv + ")" + (g.turn != g.human && g.over == null ? " · pensando…" : ""), g.turn != g.human ? "gold small" : "muted small");
    Ui.p("Você · " + sideName(g.human) + (my ? " · sua vez" : ""), my ? "gold small" : "muted small");
    if (g.over != null) Ui.p(g.over, "big gold");
    else if (my && chk >= 0) Ui.p("Seu general está em xeque!", "warn");
    var bs:Array<Array<Dynamic>> = [];
    if (g.over == null) bs.push(["Desfazer", undo, (g.hist : Array<Dynamic>).length > 0 && !g.busy ? "" : "off"]);
    bs.push(["Virar", function() { g.flip = !g.flip; draw(); }]);
    #if flash
    bs.push([latin ? "Figuras" : "Letras", function() { latin = !latin; draw(); }]);
    #else
    bs.push([!latin && !ideo ? "Ideogramas" : (ideo ? "Letras" : "Figuras"), function() { if (!latin && !ideo) ideo = true else if (ideo) { ideo = false; latin = true; } else latin = false; draw(); }]);
    #end
    bs.push(["Regras", function() Ui.modal(jg ? "Janggi" : "Xiangqi", (jg ? JG_RULES : RULES).join("\n\n"), [["Entendi", null, "pri"]])]);
    bs.push(["Nova partida", function() start(g.human, g.level), g.over != null ? "pri" : ""]);
    Ui.btns(bs);
    var log:Array<String> = g.log;
    if (log.length > 0) {
      var lines:Array<String> = []; var i = 0;
      while (i < log.length) { lines.push((Std.int(i / 2) + 1) + ". " + log[i] + (i + 1 < log.length ? " · " + log[i + 1] : "")); i += 2; }
      Ui.h("Lances"); Ui.ul(lines.slice(-6), "small");
    }
  }
  static function pick(s:Int, lg:Array<Int>) {
    if (g == null || g.over != null || g.busy || g.turn != g.human) return;
    var bd:Array<Int> = g.b;
    if (g.sel >= 0) for (m in lg) if ((m & 127) == g.sel && (m >> 7) == s) { g.sel = -1; play(m); if (g.over == null) cpu(); return; }
    g.sel = (bd[s] != 0 && col(bd[s]) == g.human && g.sel != s) ? s : -1;
    draw();
  }
  static function name(s:Int):String return "abcdefghi".charAt(fl(s)) + (rk(s) + 1);
  static function play(m:Int) {
    var bd:Array<Int> = g.b; var mover:Int = g.turn;
    (g.hist : Array<Dynamic>).push({ b: bd, turn: g.turn, keys: (g.keys : Array<String>).copy(), last: g.last, log: (g.log : Array<String>).copy() });
    var f = m & 127; var t = m >> 7;
    var pn = nm(pt(bd[f])); pn = pn.substr(0, pn.indexOf(" ("));
    (g.log : Array<String>).push(pn + " " + name(f) + (bd[t] != 0 ? "x" : "-") + name(t));
    var nb = make(bd, m);
    g.b = nb; g.turn = -mover; g.last = [f, t];
    (g.keys : Array<String>).push(key(nb, g.turn));
    var ms = legal(nb, g.turn);
    if (ms.length == 0) {
      var w = mover == g.human;
      if (jg && !inCheck(nb, g.turn)) g.over = "Empate (sem lances legais)";
      else g.over = (w ? "Você venceu!" : "O computador venceu.") + (inCheck(nb, g.turn) ? " (xeque-mate)" : " (afogamento: no xiangqi, quem fica sem lances perde)");
    } else {
      var k = key(nb, g.turn); var n = 0; for (x in (g.keys : Array<String>)) if (x == k) n++;
      if (n >= 3) g.over = "Empate (repetição)";
      else { var any = false; for (q in nb) if (q != 0 && pt(q) != G && pt(q) != A && (jg || pt(q) != E)) any = true; if (!any) g.over = "Empate (sem peças de ataque)"; }
    }
    draw();
  }
  static function cpu() {
    if (g == null || g.over != null) return;
    g.busy = true; draw();
    var cur = g;
    Ui.later(60, function() {
      if (g != cur) return;
      var m = think(g.b, g.turn, g.level);
      g.busy = false;
      if (m >= 0) play(m) else draw();
    });
  }
  static function undo() {
    var h:Array<Dynamic> = g.hist;
    if (h.length == 0 || g.busy) return;
    var st = h.pop();
    while (st.turn != g.human && h.length > 0) st = h.pop();
    g.b = st.b; g.turn = st.turn; g.keys = st.keys; g.last = st.last; g.log = st.log; g.over = null; g.sel = -1;
    draw();
    if (g.turn != g.human) cpu();
  }
}
