package;

#if flash
import UiFlash as Ui;
#else
import UiJs as Ui;
#end

/* Jogos que deram origem ao xadrez, jogáveis contra o computador.
   Regras: chaturanga na reconstrução de H. J. R. Murray (gaja salta 2 casas na diagonal; afogar o rei dá vitória
   ao afogado, segundo al-Adli; rei despido perde); shatranj/chatrang como descrito por al-Adli e as-Suli (afogar dá
   vitória a quem afoga; rei despido perde, salvo se despir o outro no lance seguinte = empate); xadrez medieval
   europeu com as regras do shatranj e os nomes europeus; makruk tailandês (peões na 3ª fileira, promoção na 6ª,
   afogamento empata; regra de contagem simplificada). */
class Ancient {
  static inline var P = 1; static inline var N = 2; static inline var E = 3; static inline var R = 4;
  static inline var F = 5; static inline var K = 6; static inline var S = 7;
  static inline var WIN = 50000;

  public static var GAMES:Array<Dynamic> = [
    { id: "chaturanga", name: "Chaturanga", era: "Índia · por volta do século VI", board: "anc", marks: true,
      setup: "rnefkenr/pppppppp/8/8/8/8/PPPPPPPP/RNEFKENR", disp: "kfenrp", promo: 7, stale: "stalemated", bare: true, count: 0,
      names: ["", "Padati (soldado)", "Ashva (cavalo)", "Gaja (elefante)", "Ratha (carro de guerra)", "Mantri (conselheiro)", "Raja (rei)", ""],
      story: [
        "O chaturanga nasceu no norte da Índia, na época do Império Gupta, por volta do século VI. O nome em sânscrito quer dizer \"quatro partes\": as quatro divisões do exército indiano, infantaria, cavalaria, elefantes e carros de guerra.",
        "Era jogado no ashtapada, um tabuleiro de 8 x 8 casas sem cores alternadas, que já servia a um jogo de corrida. As casas marcadas com um X são tradição desse tabuleiro: o historiador H. J. R. Murray notou que elas coincidem com casas que os elefantes nunca alcançam.",
        "Nenhum livro com as regras completas sobreviveu. O que se joga hoje é uma reconstrução feita por historiadores a partir do shatranj, seu sucessor. A maior dúvida é o elefante: textos antigos descrevem três movimentos diferentes; aqui ele salta duas casas na diagonal, o movimento considerado mais antigo.",
        "O escritor árabe al-Adli, no século IX, registrou duas regras curiosas que vieram da Índia: quem fica afogado (sem lances, mas sem estar em xeque) vence a partida, e quem perde todas as peças, ficando só com o rei, perde."
      ],
      rules: [
        "Vence quem der xeque-mate no rei adversário (o raja).",
        "Afogamento: se você deixar o adversário sem lances sem dar xeque, ele vence! Cuidado no final.",
        "Rei despido: capturar todas as peças do adversário, deixando só o rei, também vence (se ele não puder despir o seu rei no lance seguinte; nesse caso é empate).",
        "Não há roque, nem avanço de duas casas do peão, nem captura en passant.",
        "O soldado que chega à última fileira vira mantri (conselheiro)."
      ] },
    { id: "shatranj", name: "Shatranj (chatrang)", era: "Pérsia e mundo árabe · séculos VII a XV", board: "anc", marks: false,
      setup: "rnefkenr/pppppppp/8/8/8/8/PPPPPPPP/RNEFKENR", disp: "kfenrp", promo: 7, stale: "stalemater", bare: true, count: 0,
      names: ["", "Baidaq (soldado)", "Faras (cavalo)", "Fil ou alfil (elefante)", "Rukh (carro)", "Firzan (vizir)", "Shah (rei)", ""],
      story: [
        "Da Índia o jogo chegou à Pérsia dos sassânidas, onde virou chatrang. Um poema persa conta que um rei indiano enviou o jogo ao rei Cosroes I como desafio: se os sábios persas não descobrissem as regras, a Pérsia pagaria tributo. O sábio Bozorgmehr decifrou o jogo e respondeu inventando o nard, ancestral do gamão.",
        "Depois da conquista árabe da Pérsia, no século VII, o jogo se espalhou pelo mundo islâmico com o nome de shatranj. O rei era o shah, e \"shah mat\" (o rei está indefeso) virou a nossa palavra xeque-mate.",
        "Foi a primeira grande era de mestres. Al-Adli e as-Suli (século X) escreveram livros, criaram problemas (os mansubat) e estudaram aberturas, as ta'biyat. As-Suli avaliava as peças assim: rukh 5, faras 3 e 1/3, firzan 1 e 2/3, alfil 1 e 1/4, soldado do centro 1 e 1/4.",
        "Sem dama e sem bispo de longo alcance, as partidas eram lentas e estratégicas. Por isso o afogamento e o rei despido valiam a vitória: eram jeitos de vencer finais que o xeque-mate sozinho não resolveria."
      ],
      rules: [
        "Vence quem der xeque-mate no shah.",
        "Afogamento: quem deixa o adversário sem lances vence.",
        "Rei despido: quem captura todas as peças do outro, deixando só o rei, vence, salvo se o outro puder despir o seu rei no lance seguinte (empate).",
        "Firzan anda uma casa na diagonal; o alfil salta exatamente duas casas na diagonal, por cima de qualquer peça.",
        "Sem roque, sem avanço duplo do peão; o soldado vira firzan na última fileira."
      ] },
    { id: "medieval", name: "Xadrez medieval europeu", era: "Europa · por volta de 1000 a 1475", board: "med", marks: false,
      setup: "rnefkenr/pppppppp/8/8/8/8/PPPPPPPP/RNEFKENR", disp: "kfbnrp", promo: 7, stale: "stalemater", bare: true, count: 0,
      names: ["", "Peão", "Cavalo", "Alfil (o futuro bispo)", "Roque (torre)", "Alferza ou fers (a futura dama)", "Rei", ""],
      story: [
        "Por volta do ano 1000 o jogo entrou na Europa pela Península Ibérica, governada pelos mouros, e pela Itália. As peças ganharam nomes europeus: o firzan virou fers ou alferza e, depois, regina (a rainha); o alfil manteve o nome no espanhol e no português e virou o bispo em outras línguas; o rukh virou roque.",
        "Os europeus passaram a pintar o tabuleiro com casas claras e escuras, como usamos até hoje, e o jogo virou parte da educação dos nobres. Em 1283, o rei Afonso X de Castela mandou fazer o Libro de los juegos, com mais de cem problemas de xadrez.",
        "As regras eram praticamente as do shatranj, com variações de região para região. Em 1475, na Espanha, a alferza ganhou o movimento da dama atual e o alfil passou a correr a diagonal inteira: nasceu o xadrez moderno, chamado na época de \"xadrez da dama louca\"."
      ],
      rules: [
        "Vence quem der xeque-mate. Como no shatranj, afogar o rei adversário e despir o rei também dão vitória.",
        "A alferza (fers) anda só uma casa na diagonal: ainda não é a dama poderosa de hoje.",
        "O alfil salta duas casas na diagonal. Aqui ele aparece com o desenho do bispo, que herdou o seu lugar.",
        "Sem roque e sem avanço duplo do peão; o peão vira alferza na última fileira."
      ] },
    { id: "makruk", name: "Makruk (xadrez tailandês)", era: "Tailândia · jogado até hoje", board: "anc", marks: false,
      setup: "rnsqksnr/8/pppppppp/8/8/PPPPPPPP/8/RNSKQSNR", disp: "kfsnrp", promo: 5, stale: "draw", bare: false, count: 64,
      names: ["", "Bia (concha de búzio)", "Ma (cavalo)", "", "Ruea (barco)", "Met (semente)", "Khun (senhor)", "Khon (nobre)"],
      story: [
        "O makruk é o parente vivo mais próximo do chaturanga. O jogo seguiu da Índia para o Sudeste Asiático e se manteve quase igual por séculos. Na Tailândia, ele é mais jogado do que o xadrez ocidental.",
        "As peças têm nomes do cotidiano: khun (senhor), met (semente ou caroço de fruta), khon (nobre, ou a máscara do teatro clássico tailandês), ma (cavalo), ruea (barco) e bia, as conchas de búzio usadas como peões. Quando promove, o bia é virado de cabeça para baixo: vira o bia ngai, a \"concha virada\".",
        "Os peões começam na terceira fileira e promovem logo na sexta. Os reis não ficam frente a frente: o khun branco começa em d1 e o preto em e8. O khon anda como o elefante de algumas regiões da Índia, uma casa na diagonal ou uma para a frente."
      ],
      rules: [
        "Vence quem der xeque-mate no khun. Afogamento é empate.",
        "Met: uma casa na diagonal. Khon: uma casa na diagonal ou uma casa para a frente.",
        "O bia anda uma casa para a frente, captura na diagonal e vira met ao chegar à sexta fileira.",
        "No final, a regra de contagem tailandesa dá empate a quem resiste; aqui ela foi simplificada: 64 lances de cada lado sem captura nem lance de peão terminam empatados."
      ] }
  ];
  public static var MARKS = [0, 3, 4, 7, 24, 31, 32, 39, 27, 28, 35, 36, 56, 59, 60, 63];
  public static function game(id:String):Dynamic { for (g in GAMES) if (g.id == id) return g; return null; }

  /* ---------- motor ---------- */
  static var v:Dynamic;
  static inline function pt(p:Int):Int return p < 0 ? -p : p;
  static inline function col(p:Int):Int return p > 0 ? 1 : (p < 0 ? -1 : 0);
  static inline function fl(s:Int):Int return s & 7;
  static inline function rk(s:Int):Int return s >> 3;
  static function parse(setup:String):Array<Int> {
    var b = [for (i in 0...64) 0];
    var map = ["p" => P, "n" => N, "e" => E, "r" => R, "f" => F, "q" => F, "k" => K, "s" => S];
    var rows = setup.split("/");
    for (r in 0...8) {
      var c = 0;
      for (k in 0...rows[r].length) {
        var ch = rows[r].charAt(k); var n = Std.parseInt(ch);
        if (n != null) { c += n; continue; }
        var lw = ch.toLowerCase();
        b[(7 - r) * 8 + c] = (ch == lw ? -1 : 1) * map.get(lw);
        c++;
      }
    }
    return b;
  }
  static function relRank(s:Int, side:Int):Int return side == 1 ? rk(s) : 7 - rk(s);
  static var KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  static var DG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  static var OR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  static inline function sqAt(f:Int, r:Int):Int return (f < 0 || f > 7 || r < 0 || r > 7) ? -1 : r * 8 + f;
  public static function gen(b:Array<Int>, side:Int):Array<Int> {
    var out:Array<Int> = [];
    for (s in 0...64) {
      var p = b[s]; if (p == 0 || col(p) != side) continue;
      var t = pt(p); var f = fl(s); var r = rk(s);
      function add(to:Int) { if (to < 0) return; var q = b[to]; if (q != 0 && col(q) == side) return; out.push(s | (to << 6)); }
      switch (t) {
        case 1:
          var to = sqAt(f, r + side);
          if (to >= 0 && b[to] == 0) out.push(s | (to << 6) | ((relRank(to, side) == (v.promo : Int) ? F : 0) << 12));
          for (df in [-1, 1]) { var c = sqAt(f + df, r + side); if (c >= 0 && b[c] != 0 && col(b[c]) == -side) out.push(s | (c << 6) | ((relRank(c, side) == (v.promo : Int) ? F : 0) << 12)); }
        case 2: for (d in KN) add(sqAt(f + d[0], r + d[1]));
        case 3: for (d in DG) add(sqAt(f + 2 * d[0], r + 2 * d[1]));
        case 5: for (d in DG) add(sqAt(f + d[0], r + d[1]));
        case 7: for (d in DG) add(sqAt(f + d[0], r + d[1])); add(sqAt(f, r + side));
        case 6: for (d in DG.concat(OR)) add(sqAt(f + d[0], r + d[1]));
        case 4:
          for (d in OR) {
            var ff = f + d[0]; var rr = r + d[1];
            while (true) {
              var to = sqAt(ff, rr); if (to < 0) break;
              if (b[to] == 0) out.push(s | (to << 6));
              else { if (col(b[to]) == -side) out.push(s | (to << 6)); break; }
              ff += d[0]; rr += d[1];
            }
          }
        default:
      }
    }
    return out;
  }
  /* a casa sq é atacada pelo lado `by`? */
  static function attacked(b:Array<Int>, sq:Int, by:Int):Bool {
    var f = fl(sq); var r = rk(sq);
    function is(s:Int, t:Int):Bool return s >= 0 && b[s] == by * t;
    for (d in KN) if (is(sqAt(f - d[0], r - d[1]), N)) return true;
    for (d in DG) {
      var s1 = sqAt(f + d[0], r + d[1]);
      if (is(s1, F) || is(s1, K) || is(s1, S)) return true;
      if (is(sqAt(f + 2 * d[0], r + 2 * d[1]), E)) return true;
    }
    for (d in OR) if (is(sqAt(f + d[0], r + d[1]), K)) return true;
    if (is(sqAt(f, r - by), S)) return true;
    if (is(sqAt(f - 1, r - by), P) || is(sqAt(f + 1, r - by), P)) return true;
    for (d in OR) {
      var ff = f + d[0]; var rr = r + d[1];
      while (true) {
        var s = sqAt(ff, rr); if (s < 0) break;
        if (b[s] != 0) { if (b[s] == by * R) return true; break; }
        ff += d[0]; rr += d[1];
      }
    }
    return false;
  }
  static function kingSq(b:Array<Int>, side:Int):Int { for (s in 0...64) if (b[s] == side * K) return s; return -1; }
  public static function inCheck(b:Array<Int>, side:Int):Bool { var k = kingSq(b, side); return k >= 0 && attacked(b, k, -side); }
  public static function make(b:Array<Int>, m:Int):Array<Int> {
    var n = b.copy(); var from = m & 63; var to = (m >> 6) & 63; var pr = (m >> 12) & 15;
    n[to] = pr != 0 ? col(b[from]) * pr : b[from]; n[from] = 0;
    return n;
  }
  public static function legal(b:Array<Int>, side:Int):Array<Int> return [for (m in gen(b, side)) if (!inCheck(make(b, m), side)) m];
  static function pieces(b:Array<Int>, side:Int):Int { var n = 0; for (p in b) if (p != 0 && col(p) == side && pt(p) != K) n++; return n; }

  /* avaliação: material (valores de as-Suli adaptados), avanço dos peões e centralização */
  static var VAL = [0, 100, 330, 125, 500, 165, 0, 250];
  static function evalSide(b:Array<Int>, side:Int):Int {
    var sc = 0;
    for (s in 0...64) {
      var p = b[s]; if (p == 0) continue;
      var t = pt(p); var c = col(p);
      var x = VAL[t];
      var cf = 3.5 - Math.abs(fl(s) - 3.5); var cr = 3.5 - Math.abs(rk(s) - 3.5);
      if (t == N || t == F || t == S) x += Std.int((cf + cr) * 4);
      if (t == P) x += relRank(s, c) * 6 + Std.int(cf * 2);
      if (t == K) x += pieces(b, -c) <= 3 ? Std.int((cf + cr) * 6) : -Std.int(cr * 4);
      sc += c * x;
    }
    if (v.bare == true) {
      var mine = pieces(b, side); var theirs = pieces(b, -side);
      if (theirs == 0 && mine > 0) sc += side * 3000;
      if (mine == 0 && theirs > 0) sc -= side * 3000;
    }
    return sc * side;
  }
  static var nodes = 0; static var deadline = 0.0; static var stop = false;
  static function terminal(b:Array<Int>, side:Int, moves:Array<Int>, ply:Int):Null<Int> {
    if (moves.length == 0) {
      if (inCheck(b, side)) return -WIN + ply;
      var st:String = v.stale;
      return st == "stalemated" ? WIN - ply : (st == "stalemater" ? -WIN + ply : 0);
    }
    if (v.bare == true) {
      var mine = pieces(b, side); var theirs = pieces(b, -side);
      if (mine == 0 && theirs == 0) return 0;
      if (mine == 0 && theirs > 1) return -WIN + ply + 1;
    }
    return null;
  }
  static function order(b:Array<Int>, ms:Array<Int>):Array<Int> {
    var sc = [for (m in ms) { var to = (m >> 6) & 63; var cap = b[to] != 0 ? VAL[pt(b[to])] * 10 - VAL[pt(b[m & 63])] : 0; cap + (((m >> 12) & 15) != 0 ? 800 : 0); }];
    var idx = [for (i in 0...ms.length) i];
    idx.sort(function(a, c) return sc[c] - sc[a]);
    return [for (i in idx) ms[i]];
  }
  static function quiesce(b:Array<Int>, side:Int, alpha:Int, beta:Int, qd:Int):Int {
    nodes++;
    var stand = evalSide(b, side);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qd <= 0) return stand;
    var caps = [for (m in gen(b, side)) if (b[(m >> 6) & 63] != 0) m];
    for (m in order(b, caps)) {
      var nb = make(b, m); if (inCheck(nb, side)) continue;
      var sc = -quiesce(nb, -side, -beta, -alpha, qd - 1);
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  static function negamax(b:Array<Int>, side:Int, depth:Int, alpha:Int, beta:Int, ply:Int):Int {
    nodes++;
    if ((nodes & 1023) == 0 && haxe.Timer.stamp() * 1000 > deadline) stop = true;
    if (stop) return 0;
    var ms = legal(b, side);
    var t = terminal(b, side, ms, ply);
    if (t != null) return t;
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
  /* escolhe o lance do computador: nível 1 erra de propósito, 2 e 3 buscam mais fundo */
  static function think(b:Array<Int>, side:Int, level:Int):Int {
    var ms = legal(b, side);
    if (ms.length == 0) return -1;
    deadline = haxe.Timer.stamp() * 1000 + (level >= 3 ? 2500 : 1200);
    stop = false; nodes = 0;
    var maxD = level == 1 ? 2 : (level == 2 ? 4 : 7);
    ms = order(b, ms);
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
      best = bestD;
      ms.remove(best); ms.unshift(best);
      if (bestS >= WIN - 100) break;
    }
    if (level == 1 && Math.random() < 0.35) return ms[Std.random(ms.length)];
    return best;
  }

  /* ---------- partida ---------- */
  static var g:Dynamic = null;
  static function fenOf(b:Array<Int>):String {
    var d:String = v.disp; var letters = ["", d.charAt(5), d.charAt(3), d.charAt(2), d.charAt(4), d.charAt(1), d.charAt(0), d.charAt(2)];
    var rows:Array<String> = [];
    for (r in 0...8) {
      var row = ""; var e = 0;
      for (c in 0...8) {
        var p = b[(7 - r) * 8 + c];
        if (p == 0) { e++; continue; }
        if (e > 0) { row += e; e = 0; }
        var ch = letters[pt(p)];
        row += p > 0 ? ch.toUpperCase() : ch;
      }
      if (e > 0) row += e;
      rows.push(row);
    }
    return rows.join("/") + " w - - 0 1";
  }
  static function uciOf(m:Int):String {
    var s = Engine.sqName(m & 63) + Engine.sqName((m >> 6) & 63);
    if (((m >> 12) & 15) != 0) s += "f";
    return s;
  }
  static function moveName(b:Array<Int>, m:Int):String {
    var names:Array<String> = v.names;
    var t = pt(b[m & 63]);
    var nm = names[t]; var i = nm.indexOf(" ("); if (i > 0) nm = nm.substr(0, i);
    var cap = b[(m >> 6) & 63] != 0;
    return nm + " " + Engine.sqName(m & 63) + (cap ? "x" : "-") + Engine.sqName((m >> 6) & 63) + (((m >> 12) & 15) != 0 ? " (promove)" : "");
  }
  static function key(b:Array<Int>, side:Int):String return b.join(",") + side;

  public static function home() {
    Ui.page("Jogos que originaram o xadrez", Pages.history);
    Ui.p("Antes do xadrez moderno existiram outros jogos de tabuleiro com rei, cavalos, carros e soldados. Toque em um para conhecer a história, aprender as peças e jogar contra o computador.", "");
    var rows:Array<Dynamic> = [for (x in GAMES) { t: x.name, d: x.era, r: "jogar", f: function() info(x.id) }];
    rows.push({ t: "Xiangqi (xadrez chinês)", d: "China · forma atual desde a dinastia Song", r: "jogar", f: Xiangqi.info });
    Ui.items(rows);
    Ui.p("O shogi (Japão) também descende do chaturanga, com as peças capturadas voltando ao jogo; ele fica para uma próxima versão.", "muted small");
  }
  public static function info(id:String) {
    var x = game(id); v = x;
    Ui.page(x.name, Pages.history);
    Ui.p(x.era, "gold");
    for (s in (x.story : Array<String>)) Ui.p(s, "");
    Ui.h("Como se joga");
    Ui.ul(x.rules);
    Ui.h("As peças");
    var types = [K, F, x.id == "makruk" ? S : E, N, R, P];
    var names:Array<String> = x.names;
    Ui.items([for (t in types) { t: names[t], d: moveText(t), r: "ver", f: function() demo(id, t) }]);
    Ui.h("Jogar contra o computador");
    Ui.btns([["Brancas · fácil", function() start(id, 1, 1), "pri"], ["Brancas · normal", function() start(id, 1, 2)], ["Brancas · forte", function() start(id, 1, 3)]]);
    Ui.btns([["Pretas · fácil", function() start(id, -1, 1)], ["Pretas · normal", function() start(id, -1, 2)], ["Pretas · forte", function() start(id, -1, 3)]]);
  }
  public static function quick(id:String) start(id, 1, 2);
  static function moveText(t:Int):String {
    return switch (t) {
      case 6: "Uma casa em qualquer direção, como o rei de hoje. Sem roque.";
      case 5: "Uma casa na diagonal. É o ancestral fraco da dama.";
      case 3: "Salta exatamente duas casas na diagonal, por cima de qualquer peça. Alcança só 8 casas do tabuleiro.";
      case 7: "Uma casa na diagonal ou uma casa para a frente.";
      case 2: "Em L, saltando por cima das peças. Igual ao cavalo de hoje.";
      case 4: "Quantas casas quiser na horizontal ou na vertical. Era a peça mais forte.";
      case 1: v.id == "makruk" ? "Uma casa para a frente; captura na diagonal; vira met na sexta fileira." : "Uma casa para a frente (sem avanço duplo); captura na diagonal; promove na última fileira.";
      default: "";
    };
  }
  static function setBoard(fen:String, flip:Bool) {
    var b = Ui.board;
    b.theme = v.board; b.special = v.marks == true ? MARKS : [];
    b.fen = fen; b.flip = flip; b.arrows = []; b.blind = false;
  }
  static function demo(id:String, t:Int) {
    var x = game(id); v = x;
    var names:Array<String> = x.names;
    Ui.boardPage(names[t], function() info(id));
    var s = t == P ? 19 : 27;
    var bd = [for (i in 0...64) 0];
    bd[s] = t;
    if (t != K) { bd[4] = K; bd[60] = -K; }
    setBoard(fenOf(bd), false);
    var b = Ui.board;
    b.last = null; b.check = -1; b.legal = null; b.onSquare = null; b.onMove = null;
    b.marks = [for (m in gen(bd, 1)) if ((m & 63) == s) [(m >> 6) & 63, 0]];
    b.clearSel(); b.draw();
    Ui.bars(x.name, "Casas em verde: para onde a peça pode ir", false, true);
    Ui.panel();
    Ui.p(names[t], "gold big");
    Ui.p(moveText(t), "");
    var types = [K, F, x.id == "makruk" ? S : E, N, R, P];
    var i = types.indexOf(t);
    Ui.btns([["Próxima peça", function() demo(id, types[(i + 1) % types.length]), "pri"], ["Voltar", function() info(id)]]);
  }
  static function start(id:String, human:Int, level:Int) {
    var x = game(id); v = x;
    var b = parse(x.setup);
    g = { b: b, turn: 1, human: human, level: level, hist: [], log: [], over: null, pending: null, quiet: 0, keys: [key(b, 1)], last: null, busy: false, flip: human == -1 };
    Ui.boardPage(x.name, function() { g = null; info(id); });
    draw();
    if (g.turn != human) cpu();
  }
  static function draw() {
    if (g == null || Ui.board == null) return;
    var b = Ui.board;
    var bd:Array<Int> = g.b;
    setBoard(fenOf(bd), g.flip);
    b.last = g.last;
    b.check = inCheck(bd, g.turn) ? kingSq(bd, g.turn) : -1;
    var my = g.over == null && !g.busy && g.turn == g.human;
    b.legal = my ? [for (m in legal(bd, g.turn)) uciOf(m)] : null;
    b.marks = []; b.onSquare = null;
    b.onMove = onMove;
    b.clearSel(); b.draw();
    var names:Array<String> = v.names;
    var me = g.human == 1 ? "Brancas" : "Pretas";
    var lv = ["", "fácil", "normal", "forte"][g.level];
    Ui.bars("Computador (" + lv + ")" + (g.turn != g.human && g.over == null ? " · pensando" : ""), "Você · " + me + (my ? " · sua vez" : ""), g.turn != g.human, my);
    Ui.panel();
    if (g.over != null) Ui.p(g.over, "big gold");
    else if (g.busy) Ui.p("O computador está pensando…", "muted");
    else if (my) Ui.p(inCheck(bd, g.turn) ? "Sua vez: seu rei está em xeque!" : "Sua vez.", inCheck(bd, g.turn) ? "warn" : "gold");
    if (g.pending != null && g.over == null) Ui.p("Rei despido! Se o rei despido não capturar a última peça do outro agora, a partida acaba.", "warn");
    var bs:Array<Array<Dynamic>> = [];
    if (g.over == null) bs.push(["Desfazer", undo, (g.hist : Array<Dynamic>).length > 0 && !g.busy ? "" : "off"]);
    bs.push(["Virar", function() { g.flip = !g.flip; draw(); }]);
    bs.push(["Regras", function() Ui.modal(v.name, (v.rules : Array<String>).join("\n\n"), [["Entendi", null, "pri"]])]);
    bs.push(["Nova partida", function() start(v.id, g.human, g.level), g.over != null ? "pri" : ""]);
    Ui.btns(bs);
    var mw = pieces(bd, 1); var mb = pieces(bd, -1);
    Ui.p("Peças (sem o rei): Brancas " + mw + " · Pretas " + mb, "muted small");
    var log:Array<String> = g.log;
    if (log.length > 0) {
      var lines:Array<String> = [];
      var i = 0;
      while (i < log.length) { lines.push((Std.int(i / 2) + 1) + ". " + log[i] + (i + 1 < log.length ? " · " + log[i + 1] : "")); i += 2; }
      Ui.h("Lances");
      Ui.ul(lines.slice(-8), "small");
    }
  }
  static function onMove(u4:String) {
    if (g == null || g.over != null || g.busy || g.turn != g.human) return;
    var bd:Array<Int> = g.b;
    for (m in legal(bd, g.turn)) if (uciOf(m).substr(0, 4) == u4) { play(m); if (g.over == null) cpu(); return; }
  }
  static function play(m:Int) {
    var bd:Array<Int> = g.b;
    (g.hist : Array<Dynamic>).push({ b: bd, turn: g.turn, pending: g.pending, quiet: g.quiet, keys: (g.keys : Array<String>).copy(), last: g.last, log: (g.log : Array<String>).copy() });
    var mover:Int = g.turn;
    var cap = bd[(m >> 6) & 63] != 0; var pawn = pt(bd[m & 63]) == P;
    (g.log : Array<String>).push(moveName(bd, m));
    var nb = make(bd, m);
    g.b = nb; g.turn = -mover; g.last = [m & 63, (m >> 6) & 63];
    g.quiet = cap || pawn ? 0 : g.quiet + 1;
    (g.keys : Array<String>).push(key(nb, g.turn));
    judge(mover);
    draw();
  }
  static function sideName(s:Int):String return s == 1 ? "Brancas" : "Pretas";
  static function finish(winner:Int, why:String) {
    g.over = (winner == 0 ? "Empate" : (winner == g.human ? "Você venceu!" : "O computador venceu.")) + " (" + why + ")";
  }
  /* condições de fim de cada época */
  static function judge(mover:Int) {
    var bd:Array<Int> = g.b; var side:Int = g.turn;
    var ms = legal(bd, side);
    if (ms.length == 0) {
      if (inCheck(bd, side)) { finish(mover, "xeque-mate"); return; }
      var st:String = v.stale;
      if (st == "stalemated") finish(side, "afogamento: no chaturanga, quem fica afogado vence");
      else if (st == "stalemater") finish(mover, "afogamento: no shatranj, afogar o rei vence");
      else finish(0, "afogamento");
      return;
    }
    if (v.bare == true) {
      var pm = pieces(bd, mover); var ps = pieces(bd, side);
      if (g.pending != null) {
        var w:Int = g.pending; g.pending = null;
        if (pm == 0 && ps == 0) { finish(0, "dois reis despidos"); return; }
        if (pieces(bd, w) > 0 && pieces(bd, -w) == 0) { finish(w, "rei despido"); return; }
      }
      if (ps == 0 && pm > 0) {
        var canBare = false;
        if (pm == 1) for (m in ms) if (bd[(m >> 6) & 63] != 0 && col(bd[(m >> 6) & 63]) == mover) canBare = true;
        if (canBare) g.pending = mover else { finish(mover, "rei despido"); return; }
      }
      if (ps == 0 && pm == 0) { finish(0, "só restaram os reis"); return; }
    } else if (pieces(bd, 1) == 0 && pieces(bd, -1) == 0) { finish(0, "só restaram os reis"); return; }
    var k = key(bd, side); var n = 0;
    for (x in (g.keys : Array<String>)) if (x == k) n++;
    if (n >= 3) { finish(0, "repetição tripla"); return; }
    var cnt:Int = v.count;
    if (cnt > 0 && g.quiet >= cnt * 2) { finish(0, "contagem de " + cnt + " lances"); return; }
    if (cnt == 0 && g.quiet >= 140) { finish(0, "70 lances sem captura nem lance de peão"); return; }
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
    g.b = st.b; g.turn = st.turn; g.pending = st.pending; g.quiet = st.quiet; g.keys = st.keys; g.last = st.last; g.log = st.log; g.over = null;
    draw();
    if (g.turn != g.human) cpu();
  }
}
