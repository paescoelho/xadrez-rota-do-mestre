package;

#if flash
import UiFlash as Ui;
#else
import UiJs as Ui;
#end

/* História do xadrez: capítulos, figuras (linha do tempo, evolução das peças, a "dama louca")
   e cartões dos jogos ancestrais com a miniatura do tabuleiro e o botão Jogar. */
class History {
  /* ---------- miniaturas dos tabuleiros (SVG) ---------- */
  static function disc(x:Float, y:Float, r:Float, light:Bool):String
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (light ? "#f7efd9" : "#3a2212") + '" stroke="' + (light ? "#5b3a1e" : "#e9d3a6") + '" stroke-width="0.9"/>';
  static function board8(kind:String):String {
    var s = new StringBuf();
    s.add('<svg viewBox="0 0 80 80">');
    var plain = kind == "chaturanga" || kind == "shatranj" || kind == "makruk" || kind == "sittuyin";
    var base = kind == "shatranj" ? "#c9a36a" : (kind == "makruk" ? "#dcb877" : (kind == "sittuyin" ? "#d8b07a" : "#e3c792"));
    for (r in 0...8) for (f in 0...8) {
      var dk = ((r + f) & 1) == 1;
      var c = plain ? base : (kind == "medieval" ? (dk ? "#8f5f37" : "#ead9b0") : (dk ? "#b58863" : "#f0d9b5"));
      s.add('<rect x="' + f * 10 + '" y="' + r * 10 + '" width="10" height="10" fill="' + c + '"' + (plain ? ' stroke="#6d4512" stroke-width=".35"' : '') + '/>');
    }
    if (kind == "chaturanga") for (q in Ancient.MARKS) { var x = (q & 7) * 10; var y = (7 - (q >> 3)) * 10; s.add('<path d="M' + (x + 2) + ' ' + (y + 2) + 'l6 6M' + (x + 8) + ' ' + (y + 2) + 'l-6 6" stroke="#7a4e22" stroke-width=".7" opacity=".7"/>'); }
    if (kind == "sittuyin") {
      s.add('<path d="M0 80L80 0M0 0L80 80" stroke="#7a4e22" stroke-width=".8" opacity=".75"/>');
      for (f in 0...8) {
        var low = f < 4;
        s.add(disc(f * 10 + 5, (low ? 5 : 4) * 10 + 5, 2.5, true)); s.add(disc(f * 10 + 5, (low ? 3 : 2) * 10 + 5, 2.5, false));
        if (f == 0 || f == 7) { s.add(disc(f * 10 + 5, 75, 3.6, true)); s.add(disc(f * 10 + 5, 5, 3.6, false)); }
        else { s.add(disc(f * 10 + 5, 65, 3.6, true)); s.add(disc(f * 10 + 5, 15, 3.6, false)); }
      }
    } else {
    var pawnW = kind == "makruk" ? 5 : 6; var pawnB = kind == "makruk" ? 2 : 1;
    for (f in 0...8) {
      s.add(disc(f * 10 + 5, 75, 3.6, true)); s.add(disc(f * 10 + 5, 5, 3.6, false));
      s.add(disc(f * 10 + 5, pawnW * 10 + 5, 2.5, true)); s.add(disc(f * 10 + 5, pawnB * 10 + 5, 2.5, false));
    }
    }
    s.add('<rect x="0" y="0" width="80" height="80" fill="none" stroke="#3a2510" stroke-width="2"/></svg>');
    return s.toString();
  }
  static function board9(janggi:Bool):String {
    var s = new StringBuf();
    s.add('<svg viewBox="0 0 90 100"><rect width="90" height="100" fill="' + (janggi ? "#efd39c" : "#e9c98f") + '"/>');
    function X(f:Int):Float return 5 + f * 10;
    function Y(r:Int):Float return 5 + (9 - r) * 10;
    s.add('<g stroke="#5b3714" stroke-width=".7">');
    for (r in 0...10) s.add('<line x1="5" y1="' + Y(r) + '" x2="85" y2="' + Y(r) + '"/>');
    for (f in 0...9) {
      if (janggi || f == 0 || f == 8) s.add('<line x1="' + X(f) + '" y1="5" x2="' + X(f) + '" y2="95"/>');
      else s.add('<line x1="' + X(f) + '" y1="' + Y(0) + '" x2="' + X(f) + '" y2="' + Y(4) + '"/><line x1="' + X(f) + '" y1="' + Y(5) + '" x2="' + X(f) + '" y2="' + Y(9) + '"/>');
    }
    for (pr in [[0, 2], [7, 9]]) s.add('<line x1="' + X(3) + '" y1="' + Y(pr[0]) + '" x2="' + X(5) + '" y2="' + Y(pr[1]) + '"/><line x1="' + X(5) + '" y1="' + Y(pr[0]) + '" x2="' + X(3) + '" y2="' + Y(pr[1]) + '"/>');
    s.add('</g>');
    var a = janggi ? "#1d4f91" : "#b3261e"; var b = janggi ? "#b3261e" : "#1e1e1e";
    function pc(f:Int, r:Int, c:String, big:Bool) {
      var x = X(f); var y = Y(r); var rr = big ? 4.3 : 3.6;
      if (janggi) s.add('<polygon points="' + Xiangqi.oct(x, y, rr) + '" fill="#f6e7c6" stroke="' + c + '" stroke-width="1.1"/>');
      else s.add('<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="#f6e7c6" stroke="' + c + '" stroke-width="1.1"/>');
      s.add('<circle cx="' + x + '" cy="' + y + '" r="' + (rr * 0.42) + '" fill="' + c + '"/>');
    }
    for (side in [1, -1]) {
      var c = side == 1 ? a : b; var r0 = side == 1 ? 0 : 9;
      for (f in 0...9) if (!(janggi && f == 4)) pc(f, r0, c, false);
      if (janggi) pc(4, side == 1 ? 1 : 8, c, true);
      for (f in [1, 7]) pc(f, side == 1 ? 2 : 7, c, false);
      for (f in [0, 2, 4, 6, 8]) pc(f, side == 1 ? 3 : 6, c, false);
    }
    s.add('<rect x="0" y="0" width="90" height="100" fill="none" stroke="#3a2510" stroke-width="2"/></svg>');
    return s.toString();
  }
  static function card(id:String) {
    switch (id) {
      case "xiangqi": Ui.gameCard(board9(false), "Xiangqi", "China · forma atual desde os séculos X a XIII · rio, palácio e canhões", Xiangqi.info, function() Xiangqi.quick(false));
      case "janggi": Ui.gameCard(board9(true), "Janggi", "Coreia · primo do xiangqi, sem rio e com as diagonais do palácio", Xiangqi.infoJanggi, function() Xiangqi.quick(true));
      case "moderno": Ui.gameCard(board8("moderno"), "Xadrez moderno", "Desde 1475 · a dama e o bispo com o alcance de hoje", App.setupGame, App.setupGame);
      default:
        var g = Ancient.game(id);
        var sub = switch (id) {
          case "chaturanga": "Índia · século VI · tabuleiro sem cores, o ashtapada";
          case "shatranj": "Pérsia e mundo árabe · séculos VII a XV";
          case "medieval": "Europa · por volta de 1000 a 1475 · surge o tabuleiro bicolor";
          case "sittuyin": "Mianmar · soldados escalonados e promoção nas diagonais";
          default: "Tailândia · o parente vivo mais próximo do chaturanga";
        };
        Ui.gameCard(board8(id), g.name, sub, function() Ancient.info(id), function() Ancient.quick(id));
    }
  }

  /* cartão de um jogo do World (árvore genealógica) */
  static function wcard(id:String) {
    #if js
    var x = World.get(id); if (x == null) return;
    Ui.gameCard(World.thumb(id), x.name, x.era, function() World.info(id), function() World.quick(id));
    #end
  }

  /* ---------- figuras ---------- */
  static var TIMELINE:Array<Array<String>> = [
    ["séc. VI", "Índia", "Nasce o chaturanga"],
    ["séc. VII", "Pérsia e Arábia", "Chatrang e shatranj"],
    ["c. 1000", "Europa", "Chega pela Ibéria e pela Itália"],
    ["1283", "Castela", "Libro de los juegos, de Afonso X"],
    ["1475", "Valência", "A dama e o bispo ganham alcance"],
    ["1749", "Paris", "Philidor: \"os peões são a alma\""],
    ["1851", "Londres", "1º torneio internacional"],
    ["1886", "EUA", "1º Campeonato Mundial: Steinitz"],
    ["1924", "Paris", "Fundação da FIDE"],
    ["1972", "Reykjavik", "Fischer vence Spassky"],
    ["1997", "Nova York", "Deep Blue vence Kasparov"],
    ["2017", "Londres", "AlphaZero aprende sozinho"]
  ];
  #if !js
  static function timelineSvg():String {
    var s = new StringBuf(); var step = 37; var top = 22; var h = top + TIMELINE.length * step;
    s.add('<svg viewBox="0 0 400 ' + h + '" role="img" aria-label="Linha do tempo do xadrez">');
    s.add('<line x1="92" y1="' + (top - 8) + '" x2="92" y2="' + (h - 18) + '" stroke="#dcb55c" stroke-width="2" opacity=".55"/>');
    for (i in 0...TIMELINE.length) {
      var t = TIMELINE[i]; var y = top + i * step;
      var hi = i == 0 || i == 4 || i == 7 || i == 11;
      s.add('<text x="80" y="' + (y + 5) + '" text-anchor="end" font-size="13" font-weight="700" fill="' + (hi ? "#f3d98c" : "#dcb55c") + '" font-family="Georgia,serif">' + t[0] + '</text>');
      s.add('<circle cx="92" cy="' + y + '" r="' + (hi ? 6.5 : 4.5) + '" fill="' + (hi ? "#f3d98c" : "#151920") + '" stroke="#f3d98c" stroke-width="2"/>');
      s.add('<text x="108" y="' + (y + 1) + '" font-size="13" font-weight="600" fill="#ece6d6">' + StringTools.htmlEscape(t[2]) + '</text>');
      s.add('<text x="108" y="' + (y + 15) + '" font-size="11" fill="#98a1ab">' + t[1] + '</text>');
    }
    s.add('</svg>');
    return s.toString();
  }
  #end
  #if js
  /* árvore genealógica vetorial (v22); os botões "jogar" usam data-game (o onclick em linha não achava History) */
  public static function treePlay(id:String) {
    switch (id) {
      case "moderno": App.setupGame();
      case "xiangqi": Xiangqi.quick(false);
      case "janggi": Xiangqi.quick(true);
      case "eurogames": World.euro();
      case "chaturanga" | "shatranj" | "medieval" | "makruk" | "sittuyin": Ancient.quick(id);
      default: if (World.get(id) != null) World.quick(id) else World.info(id);
    }
  }
  static function genealogy():String {
    var nodes:Array<Array<Dynamic>> = [
      ["mancala", "Mancala", "África · Antiguidade", 24, 155, 150, 135, "", true],
      ["chaturanga", "Chaturanga", "Índia · séc. VI d.C.", 275, 145, 210, 160, "main", true],
      ["xiangqi", "Xiangqi", "China · séc. X d.C.", 14, 390, 140, 142, "", true],
      ["janggi", "Janggi", "Coreia", 165, 390, 140, 142, "", true],
      ["shatranj", "Shatranj", "Pérsia · séc. VII d.C.", 316, 390, 140, 142, "", true],
      ["makruk", "Makruk", "Tailândia · Mianmar", 467, 390, 140, 142, "", [["makruk", "makruk"], ["sittuyin", "sittuyin"]]],
      ["shogi", "Shogi", "Japão · séc. X–XV d.C.", 618, 390, 128, 142, "", true],
      ["chineses", "Origens chinesas antigas", "Go · Weiqi / Liubo", 15, 680, 145, 192, "", [["go", "go"], ["liubo", "liubo"]]],
      ["medieval", "Xadrez medieval", "Europa · séc. VIII–XV", 220, 710, 165, 150, "", true],
      ["alquerque", "Alquerque", "Norte da África · Espanha", 425, 710, 145, 150, "", true],
      ["fierges", "Fierges", "Precursor das damas", 600, 710, 145, 150, "", true],
      ["damas", "Damas", "Modo mestre · desafio", 600, 918, 145, 135, "", true],
      ["moderno", "Xadrez moderno", "Internacional · séc. XV d.C.", 275, 1110, 210, 165, "modern", true]
    ];
    var paths = [
      "M99 290 V350 H84 V390", "M150 290 V350 H235 V390", "M380 305 V365 H386 V390",
      "M380 305 V345 H531 V390", "M485 200 H720 Q738 200 738 218 V365 H682 V390",
      "M84 532 V680", "M235 532 V600 H87 V680", "M386 532 C386 620 302 625 302 710",
      "M386 532 C386 620 497 625 497 710", "M537 532 V640 H680 V710",
      "M680 860 V918", "M302 860 V1110", "M497 860 C497 985 405 1015 405 1110",
      "M672 1053 V1080 H634 V1094", "M87 872 V1072 H110 V1094"
    ];
    var out = '<div class="genealogy" aria-label="Árvore genealógica dos jogos de tabuleiro de estratégia">';
    out += '<div class="genealogy-title">ÁRVORE GENEALÓGICA</div><div class="genealogy-sub">DOS JOGOS DE TABULEIRO DE ESTRATÉGIA</div><div class="genealogy-legend">━ ligação histórica ou afinidade &nbsp; <b>▶ jogar</b> partida no aplicativo</div>';
    out += '<svg class="genealogy-lines" viewBox="0 0 760 1490" aria-hidden="true"><defs><marker id="genealogy-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#d7b46c"/></marker></defs>';
    for (d in paths) out += '<path d="' + d + '" fill="none" stroke="#d7b46c" stroke-width="2" opacity=".88" marker-end="url(#genealogy-arrow)"/>';
    out += '</svg>';
    for (n in nodes) {
      out += '<div class="genealogy-node ' + n[7] + '" style="left:' + n[3] + 'px;top:' + n[4] + 'px;width:' + n[5] + 'px;height:' + n[6] + 'px">';
      out += '<div class="genealogy-board" aria-hidden="true"></div><div class="genealogy-name">' + n[1] + '</div><div class="genealogy-desc">' + n[2] + '</div>';
      var bt:Dynamic = n[8];
      if (bt == true) out += '<button class="genealogy-play" type="button" data-game="' + n[0] + '">▶ jogar</button>';
      else if (bt != false && bt != null) {
        var arr:Array<Dynamic> = bt;
        out += '<div class="genealogy-plays">';
        for (x in arr) out += '<button class="genealogy-play sm" type="button" data-game="' + x[0] + '">▶ ' + x[1] + '</button>';
        out += '</div>';
      }
      out += '</div>';
    }
    var tags:Array<Array<Dynamic>> = [["Primo distante", 565, 188], ["Ancestral direto", 330, 348], ["Primos · Sudeste Asiático", 524, 362], ["Irmãos paralelos", 140, 355], ["Linhagem direta", 345, 655], ["Descendente direto", 290, 1058]];
    for (t in tags) out += '<span class="genealogy-tag" style="left:' + t[1] + 'px;top:' + t[2] + 'px">' + t[0] + '</span>';
    out += '<div class="genealogy-group" style="left:15px;top:1100px;width:190px;height:285px">PRIMOS ANTIGOS<div class="genealogy-small">';
    for (x in [["Pachisi", "▦", "pachisi"], ["Senet", "▤", "senet"], ["Tafl", "♜", "tafl"], ["Tablut", "♟", "tablut"]]) out += '<button type="button" class="genealogy-mini genealogy-go" data-game="' + x[2] + '"><span class="mini-icon">' + x[1] + '<i>▶</i></span>' + x[0] + '</button>';
    out += '</div></div>';
    out += '<div class="genealogy-group" style="left:530px;top:1100px;width:215px;height:285px">JOGOS MODERNOS<div class="genealogy-small">';
    for (x in [["Scotland Yard", "◎"], ["Carcassonne", "▣"], ["Catan", "⬡"], ["Terra Mystica", "✥"]]) out += '<button type="button" class="genealogy-mini genealogy-go info" data-game="eurogames"><span class="mini-icon">' + x[1] + '<i>i</i></span>' + x[0] + '</button>';
    out += '</div></div></div>';
    return out;
  }
  #end
  static var PIECES:Array<Array<String>> = [
    ["Raja (rei)", "Shah", "Rei", "wK", "Rei"],
    ["Mantri (conselheiro)", "Firzan (vizir)", "Fers, alferza", "wQ", "Dama"],
    ["Gaja (elefante)", "Fil, alfil", "Alfil", "wB", "Bispo"],
    ["Ashva (cavalo)", "Faras", "Cavalo", "wN", "Cavalo"],
    ["Ratha (carro)", "Rukh", "Roque", "wR", "Torre"],
    ["Padati (soldado)", "Baidaq", "Peão", "wP", "Peão"]
  ];
  static function piecesTable():String {
    var s = new StringBuf();
    s.add('<table class="pevo"><tr><th>Índia<br>séc. VI</th><th>Pérsia e Arábia</th><th>Europa medieval</th><th>Hoje</th></tr>');
    for (p in PIECES) s.add('<tr><td>' + p[0] + '</td><td>' + p[1] + '</td><td>' + p[2] + '</td><td><span class="pc ' + p[3] + '"></span>' + p[4] + '</td></tr>');
    s.add('</table><div class="figcap">Os nomes mudaram, mas a mesma peça atravessou 1.500 anos. O \"rukh\" persa virou o nosso \"roque\".</div>');
    return s.toString();
  }
  /* alcance da fers medieval x dama moderna, a partir de d4 num tabuleiro 8 x 8 */
  static function fersSvg():String {
    var s = new StringBuf();
    s.add('<svg viewBox="0 0 400 214" role="img" aria-label="Alcance da fers medieval e da dama moderna">');
    for (k in 0...2) {
      var ox = 12 + k * 200; var oy = 8; var c = 22;
      for (r in 0...8) for (f in 0...8) {
        var dk = ((r + f) & 1) == 1;
        var df = f - 3; var dr = r - 4;
        var reach = k == 0 ? (Math.abs(df) == 1 && Math.abs(dr) == 1) : ((df == 0 || dr == 0 || Math.abs(df) == Math.abs(dr)) && !(df == 0 && dr == 0));
        s.add('<rect x="' + (ox + f * c) + '" y="' + (oy + r * c) + '" width="' + c + '" height="' + c + '" fill="' + (dk ? "#8f5f37" : "#ead9b0") + '"/>');
        if (reach) s.add('<circle cx="' + (ox + f * c + c / 2) + '" cy="' + (oy + r * c + c / 2) + '" r="5.5" fill="' + (k == 0 ? "#e3605a" : "#4cb871") + '" opacity=".9"/>');
      }
      var x = ox + 3 * c + c / 2; var y = oy + 4 * c + c / 2;
      s.add('<circle cx="' + x + '" cy="' + y + '" r="9" fill="#f3d98c" stroke="#3a2212" stroke-width="2"/>');
      s.add('<rect x="' + ox + '" y="' + oy + '" width="' + (8 * c) + '" height="' + (8 * c) + '" fill="none" stroke="#3a2510" stroke-width="2"/>');
      s.add('<text x="' + (ox + 4 * c) + '" y="' + (oy + 8 * c + 16) + '" text-anchor="middle" font-size="12.5" font-weight="700" fill="' + (k == 0 ? "#e3605a" : "#4cb871") + '">' + (k == 0 ? "Fers medieval: 4 casas" : "Dama desde 1475: 27 casas") + '</text>');
    }
    s.add('</svg>');
    return s.toString();
  }

  /* ---------- página ---------- */
  static function chap(title:String, paras:Array<String>) { Ui.h(title); for (p in paras) Ui.p(p, ""); }
  public static function page() {
    Ui.page("História do xadrez", App.menu);
    Ui.group("callout", function() {
      Ui.p("Uma história que se joga", "gold big");
      Ui.p("Os ancestrais e os primos do xadrez estão aqui com regras, peças e partidas contra o computador: 18 jogos, do senet dos faraós às damas, passando por chaturanga, shatranj, xiangqi, shogi e go.", "");
      Ui.p("Toque no tabuleiro para conhecer o jogo ou em Jogar para começar uma partida na hora.", "muted small");
    });
    #if js
    Ui.html(genealogy(), "genealogy-figure");
    var pl = Ui.cur.querySelectorAll(".genealogy-play,.genealogy-go");
    for (i in 0...pl.length) {
      var e:js.html.Element = cast pl.item(i); var id = e.getAttribute("data-game");
      e.onclick = function(_) treePlay(id);
    }
    #else
    Ui.html(timelineSvg());
    #end

    chap("Antes do xadrez", [
      "Jogos de tabuleiro são muito mais antigos que o xadrez. O senet egípcio e o Jogo Real de Ur, da Mesopotâmia, têm mais de 4.500 anos, mas eram corridas decididas por dados.",
      "Na Índia, o ashtapada, um tabuleiro de 8 x 8 casas sem cores, também servia a jogos de corrida. A grande invenção foi trocar a sorte dos dados por um exército em miniatura, em que cada peça tem um movimento próprio e a vitória depende só do raciocínio."]);

    wcard("senet");

    chap("Índia: o chaturanga (século VI)", [
      "O chaturanga nasceu no norte da Índia, na época do Império Gupta. Em sânscrito, o nome quer dizer \"quatro partes\": as divisões do exército, infantaria, cavalaria, elefantes e carros de guerra. Delas vieram o peão, o cavalo, o bispo e a torre.",
      "O rei (raja) tinha ao lado um conselheiro (mantri) fraco, que andava só uma casa na diagonal. Mais tarde surgiu uma versão para quatro jogadores com dados, o chaturaji, descrita pelo sábio al-Biruni por volta do ano 1030."]);
    card("chaturanga");

    chap("Pérsia: o chatrang e o desafio do rei", [
      "O jogo chegou à Pérsia dos sassânidas no século VI e virou chatrang. Um texto persa da época e, séculos depois, o Livro dos Reis de Ferdowsi contam que um rei indiano mandou o jogo como desafio: se os sábios persas não descobrissem as regras, a Pérsia pagaria tributo.",
      "O sábio Bozorgmehr decifrou o jogo e respondeu inventando o nard, ancestral do gamão."]);
    card("shatranj");

    chap("Mundo árabe: shatranj e os primeiros mestres", [
      "Com a expansão árabe no século VII, o jogo se espalhou de Bagdá à Península Ibérica com o nome de shatranj. Do persa \"shah\" (rei) veio o nosso xeque; de \"shah mat\", algo como \"o rei está indefeso\", veio xeque-mate. A palavra portuguesa \"xadrez\" vem do árabe ash-shatranj.",
      "Foi a primeira era de mestres. Al-Adli, no século IX, e as-Suli, no século X, escreveram livros, classificaram jogadores por força, estudaram aberturas (as ta'biyat) e criaram problemas, os mansubat. A lenda conta que as-Suli era tão forte que \"jogar como as-Suli\" virou elogio."]);
    Ui.p("Como cada peça mudou de nome ao viajar", "gold");
    Ui.html(piecesTable());

    chap("Rumo ao Oriente: os primos asiáticos", [
      "O chaturanga também foi para o leste e deu origem a uma família inteira de jogos. No Sudeste Asiático virou o makruk tailandês e o sittuyin birmanês. Na China surgiu o xiangqi, jogado nas intersecções das linhas, com rio, palácio e canhões.",
      "Do xiangqi nasceu o janggi coreano, sem rio e com as diagonais do palácio. No Japão, o shogi trouxe uma ideia única: as peças capturadas voltam ao jogo do lado de quem capturou."]);
    card("makruk");
    card("sittuyin");
    card("xiangqi");
    card("janggi");
    wcard("shogi");

    chap("China antiga: go e liubo", [
      "Na China, bem antes do xiangqi, já se jogava o go (weiqi), com pedras pretas e brancas disputando território nas intersecções de uma grade. Tem mais de 2.500 anos e é jogado até hoje; aqui ele aparece no tabuleiro pequeno, de 9 x 9.",
      "O liubo foi muito popular na época da dinastia Han, jogado com varetas no lugar de dados. As regras completas se perderam: o que se joga é uma reconstrução a partir de tabuleiros e textos antigos."]);
    wcard("go");
    wcard("liubo");

    chap("África, Índia e Escandinávia: outros jogos de estratégia", [
      "A mancala é uma família de jogos de semear sementes em covas, jogada em toda a África há milhares de anos; o oware, da África Ocidental, é uma das versões mais conhecidas.",
      "Na Índia, o pachisi é um jogo de corrida em cruz com búzios no lugar de dados, avô do ludo. No norte da Europa, os vikings jogavam o tafl: um rei cercado tenta fugir para um canto enquanto os atacantes tentam capturá-lo. O tablut, a versão da Lapônia, foi registrado pelo naturalista Lineu em 1732."]);
    wcard("mancala");
    wcard("pachisi");
    wcard("tafl");
    wcard("tablut");

    chap("Europa medieval", [
      "O xadrez entrou na Europa por volta do ano 1000, pela Ibéria e pela Itália. Um poema latino do mosteiro de Einsiedeln, na Suíça, escrito por volta de 997, é uma das primeiras descrições do jogo no continente.",
      "Foram os europeus que pintaram o tabuleiro com casas claras e escuras, por volta do século XII. Dessa época são as famosas peças de Lewis, esculpidas em marfim de morsa e encontradas numa ilha da Escócia em 1831.",
      "Em 1283, o rei Afonso X de Castela mandou fazer o Libro de los juegos, com mais de cem problemas de xadrez ilustrados. O jogo virou parte da educação dos nobres e até tema de sermões sobre a sociedade."]);
    card("medieval");

    chap("Do alquerque às damas", [
      "O alquerque, jogo de saltos sobre uma grade de linhas, veio do mundo árabe para a Espanha e aparece no Libro de los juegos de Afonso X, ao lado do xadrez.",
      "Por volta do século XII, no sul da França, alguém pôs as peças do alquerque num tabuleiro de xadrez: nasceu o fierges. Quando a captura passou a ser obrigatória, no século XVI, surgiram as damas modernas. Aqui as damas brasileiras jogam no modo mestre: o computador não alivia."]);
    wcard("alquerque");
    wcard("fierges");
    wcard("damas");

    chap("1475: a dama louca", [
      "No fim do século XV, provavelmente em Valência, a dama e o bispo ganharam o alcance de hoje. O jogo ficou muito mais rápido e agressivo, e na época foi chamado de \"xadrez da dama louca\".",
      "Em 1497, Luis Ramírez de Lucena publicou em Salamanca um dos primeiros livros de xadrez impressos. Em 1512, o português Pedro Damiano publicou em Roma um manual de sucesso, que deu nome à Defesa Damiano.",
      "O roque e a captura en passant se firmaram nos séculos seguintes: a Itália só adotou o en passant em 1880."]);
    Ui.html(fersSvg());
    card("moderno");

    chap("Cafés, salões e os primeiros astros", [
      "No século XVI, o padre espanhol Ruy López escreveu sobre a abertura que leva o seu nome. No século XVII, o italiano Gioachino Greco deixou partidas que ainda são estudadas.",
      "Em 1749, o francês Philidor, também compositor, publicou o livro em que diz que \"os peões são a alma do xadrez\". Em cafés como o de la Régence, em Paris, o jogo virou espetáculo público.",
      "Em 1849 surgiu o desenho de peças Staunton, usado até hoje em torneios. Em 1851, Londres recebeu o primeiro torneio internacional, vencido por Adolf Anderssen. Pouco depois, o americano Paul Morphy encantou a Europa com ataques brilhantes."]);

    chap("Os campeões do mundo", [
      "Em 1886, Wilhelm Steinitz venceu Johannes Zukertort e se tornou o primeiro campeão mundial oficial. Emanuel Lasker reinou por 27 anos, de 1894 a 1921, o recorde até hoje.",
      "Vieram depois Capablanca, Alekhine, Euwe, Botvinnik, Smyslov, Tal, Petrosian, Spassky, Fischer, Karpov, Kasparov, Kramnik, Anand e Magnus Carlsen, que reinou de 2013 a 2023 e tem a maior pontuação Elo da história. Em 2024, o indiano Gukesh D tornou-se, aos 18 anos, o campeão mundial mais jovem."]);

    chap("FIDE, Elo e o Dia do Xadrez", [
      "A Federação Internacional de Xadrez (FIDE) foi fundada em Paris em 20 de julho de 1924. Por isso 20 de julho é o Dia Internacional do Xadrez, reconhecido pela ONU em 2019.",
      "A pontuação usada no mundo inteiro foi criada pelo físico húngaro-americano Arpad Elo e adotada pela FIDE em 1970. Este jogo usa a mesma ideia para estimar a sua força."]);

    chap("Guerra Fria no tabuleiro", [
      "Em 1972, em Reykjavik, o americano Bobby Fischer venceu o soviético Boris Spassky e quebrou décadas de domínio soviético. O match virou notícia no mundo inteiro e levou milhões de pessoas a aprender xadrez."]);

    chap("Máquinas e inteligência artificial", [
      "Em 1997, o computador Deep Blue, da IBM, venceu o campeão mundial Garry Kasparov num match. Em 2017, o AlphaZero, da DeepMind, aprendeu xadrez sozinho, jogando contra si mesmo, e venceu os melhores programas da época.",
      "Hoje os motores são muito mais fortes que qualquer humano e viraram ferramenta de estudo. O treinador deste jogo usa um motor para avaliar cada lance."]);

    chap("Xadrez para todos", [
      "Com a internet, qualquer pessoa pode jogar a qualquer hora contra adversários do mundo todo. Em 2020, a pandemia e a série \"O Gambito da Rainha\" levaram milhões de novos jogadores ao xadrez online."]);

    chap("Jogos de tabuleiro modernos", [
      "Dos tabuleiros como território nasceu, nos anos 1980 e 1990, uma família nova: os eurogames, como Scotland Yard, Catan, Carcassonne e Terra Mystica. Eles trocaram a eliminação por economia, construção e pontos, e premiam o planejamento, como o xadrez."]);
    #if js
    Ui.btns([["Conhecer os jogos modernos", World.euro]]);
    #end

    chap("O Brasil no xadrez", [
      "Henrique Mecking, o Mequinho, gaúcho, tornou-se o primeiro grande mestre brasileiro em 1972, aos 20 anos. Nos anos 1970 esteve entre os melhores do mundo e disputou o Torneio de Candidatos ao título mundial."]);

    Ui.h("Curiosidades");
    Ui.ul(Content.curios());
  }
}
