package;

#if flash
import UiFlash as Ui;
#else
import UiJs as Ui;
#end

/* Mapa do seu pensamento: o jogo registra em quais peças você toca antes de jogar e cruza isso com
   a análise do treinador. Assim separa três erros diferentes:
   - não viu: o melhor lance era de uma peça em que você nem tocou (cegueira de candidatos);
   - viu e descartou: você tocou na peça certa, mas jogou outra (cálculo ou confiança);
   - peça certa, casa errada: moveu a peça certa para a casa errada (comparação de destinos).
   Junta também pressa, indecisão, recaptura no automático, relógio, tilt e ajudas usadas.
   A pesquisa com rastreamento ocular (projeto CEEGE, Bielefeld/INRIA) mostra que mestres concentram
   a atenção nas peças que decidem; aqui o toque na tela faz o papel do olhar. */
@:expose
class Mind {
  public static var PNAME = ["peão", "cavalo", "bispo", "torre", "dama", "rei"];
  public static var PFEM = [false, false, false, true, true, false];
  static inline var HX = "0123456789abcdefghijklmnopqrstuvwxyz";

  /* ---------- utilidades ---------- */
  public static function boardOf(fen:String):Array<String> {
    var out = [for (i in 0...64) ""];
    var rows = fen.split(" ")[0].split("/");
    for (r in 0...8) {
      var c = 0; var row = rows[r];
      for (k in 0...row.length) { var ch = row.charAt(k); var n = Std.parseInt(ch); if (n != null) c += n; else { out[(7 - r) * 8 + c] = ch; c++; } }
    }
    return out;
  }
  static function sq(name:String):Int return (name.charCodeAt(0) - 97) + (name.charCodeAt(1) - 49) * 8;
  static function ptype(ch:String):Int return ch == "" ? 0 : "pnbrqk".indexOf(ch.toLowerCase()) + 1;
  static function enc64(a:Array<Int>):String { var s = new StringBuf(); for (v in a) s.add(HX.charAt(v > 35 ? 35 : (v < 0 ? 0 : v))); return s.toString(); }
  public static function dec64(s:String):Array<Int> { var a = [for (i in 0...64) 0]; if (s == null) return a; for (i in 0...Std.int(Math.min(64, s.length))) a[i] = HX.indexOf(s.charAt(i)); return a; }
  public static function pieceTxt(t:Int, art:Bool):String { var i = t - 1; if (i < 0 || i > 5) return "peça"; return art ? (PFEM[i] ? "a " : "o ") + PNAME[i] : PNAME[i]; }
  static function mateIn(eb:Float, human:Int):Int {
    var v = eb * human;
    if (v < Engine.MATE - 200) return 0;
    return Std.int((Engine.MATE - v + 1) / 2);
  }

  /* ---------- análise de uma partida (guardada no resumo do histórico) ---------- */
  public static function gameVision(g:Dynamic):Dynamic {
    var recs:Array<Dynamic> = g.recs; var human:Int = g.human;
    var ucis:Array<String> = g.ucis; var sans:Array<String> = g.sans;
    var v:Dynamic = { op: 0, nb: 0, sn: 0, bad: 0, nv: 0, vd: 0, ce: 0, imp: 0, ib: 0, br: 0, t0: 0, t0n: 0, ind: 0, idb: 0, rc: 0, rcb: 0, pr: 0, prb: 0, prs: 0, ae: 0, aem: 0, hp: 0, ok: 0 };
    var ct = [for (i in 0...6) [0, 0]]; var bk = [0, 0]; var qt = [0, 0]; var lg = [0, 0]; var wg = [0, 0];
    var look = [for (i in 0...64) 0]; var miss = [for (i in 0...64) 0];
    var moments:Array<Dynamic> = [];
    var prevBad = false;
    for (r in recs) {
      var fb:Dynamic = r.fb;
      var tp:Array<Array<Int>> = r.tp;
      if (fb == null || fb.grade == null || fb.grade == "forced" || fb.best == null || tp == null || tp.length == 0) { prevBad = false; continue; }
      var rel = function(s:Int) return human == 1 ? s : (s ^ 56);
      var touched:Array<Int> = [];
      for (t in tp) if (touched.indexOf(t[0]) < 0) touched.push(t[0]);
      var cands:Array<String> = r.cands;
      if (cands != null) for (c in cands) { var s = sq(c.substr(0, 2)); if (touched.indexOf(s) < 0) touched.push(s); }
      var played:String = r.uci; var best:String = fb.best;
      var pf = sq(played.substr(0, 2)); var bf = sq(best.substr(0, 2)); var bt = sq(best.substr(2, 2));
      var seen = touched.indexOf(bf) >= 0 || pf == bf;
      var isBad = fb.grade == "mistake" || fb.grade == "blunder";
      var isBest = played == best || (fb.loss != null && (fb.loss : Float) < 2);
      v.op++;
      if (isBest) v.ok++;
      for (s in touched) look[rel(s)]++;
      v.br += touched.length;
      v.t0 += tp[0][1]; v.t0n++;
      var ms:Float = r.ms != null ? r.ms : 99999;
      if (touched.length == 1 && ms < 3000) { v.imp++; if (isBad) v.ib++; }
      if (tp.length >= 4) { v.ind++; if (isBad) v.idb++; }
      var ply:Int = r.ply;
      if (ply > 0 && sans != null && sans[ply - 1] != null && sans[ply - 1].indexOf("x") >= 0 && ucis[ply - 1].substr(2, 2) == played.substr(2, 2)) { v.rc++; if (isBad) v.rcb++; }
      if (r.left != null && (r.left : Float) >= 0 && (r.left : Float) < 0.15) { v.pr++; if (isBad) v.prb++; if (!isBest && !seen) v.prs++; }
      if (r.help == true) v.hp++;
      if (prevBad) { v.ae++; if (!isBest && !seen) v.aem++; }
      if (!isBest) {
        var b = boardOf(r.fen);
        var t = ptype(b[bf]);
        v.nb++; if (seen) v.sn++;
        if (t >= 1) { ct[t - 1][0]++; if (!seen) ct[t - 1][1]++; }
        var back = ((bt >> 3) - (bf >> 3)) * human < 0;
        var cap = b[bt] != "";
        var dist = Math.max(Math.abs((bt & 7) - (bf & 7)), Math.abs((bt >> 3) - (bf >> 3)));
        if (back) { bk[0]++; if (!seen) bk[1]++; }
        if (!cap) { qt[0]++; if (!seen) qt[1]++; }
        if (dist >= 4) { lg[0]++; if (!seen) lg[1]++; }
        var far = true; for (s in touched) if (Math.abs((s & 7) - (bf & 7)) < 4) far = false;
        if (far) { wg[0]++; if (!seen) wg[1]++; }
        if (isBad) {
          v.bad++;
          var kind = !seen ? "nv" : (pf != bf ? "vd" : "ce");
          Reflect.setField(v, kind, Reflect.field(v, kind) + 1);
          if (!seen) miss[rel(bf)]++;
          moments.push({ no: r.no, san: r.san, bs: fb.bestSan, k: kind, l: Math.round(fb.loss), fen: r.fen, u: played, b: best, t: t, pt: ptype(b[pf]), mt: mateIn(fb.evalBefore, human), tc: touched.slice(0, 8) });
        }
      }
      prevBad = isBad;
    }
    moments.sort(function(a, b) return Reflect.compare(b.l, a.l));
    moments = moments.slice(0, 4);
    moments.sort(function(a, b) return a.no - b.no);
    v.ct = ct; v.bk = bk; v.qt = qt; v.lg = lg; v.wg = wg; v.lk = enc64(look); v.ms = enc64(miss); v.gm = moments;
    return v.op == 0 ? null : v;
  }

  /* ---------- soma das últimas partidas ---------- */
  public static var MIN_GAMES = 20;
  public static var MIN_DECISIONS = 5;
  public static function games(?list:Array<Dynamic>):Array<Dynamic> {
    var h:Array<Dynamic> = list != null ? list : Profile.d.hist;
    var o:Array<Dynamic> = [];
    for (x in h) if (x.s != null && x.s.v != null && (x.s.v.op | 0) >= MIN_DECISIONS) o.push(x);
    return o.slice(-30);
  }
  public static function total(gs:Array<Dynamic>):Dynamic {
    var keys = ["op", "nb", "sn", "bad", "nv", "vd", "ce", "imp", "ib", "br", "t0", "t0n", "ind", "idb", "rc", "rcb", "pr", "prb", "prs", "ae", "aem", "hp", "ok"];
    var t:Dynamic = {};
    for (k in keys) Reflect.setField(t, k, 0);
    var ct = [for (i in 0...6) [0, 0]]; var pairs:Dynamic = { bk: [0, 0], qt: [0, 0], lg: [0, 0], wg: [0, 0] };
    var look = [for (i in 0...64) 0]; var miss = [for (i in 0...64) 0];
    for (g in gs) {
      var v:Dynamic = g.s.v;
      for (k in keys) { var x:Dynamic = Reflect.field(v, k); if (x != null) Reflect.setField(t, k, Reflect.field(t, k) + x); }
      var c:Array<Array<Int>> = v.ct; for (i in 0...6) { ct[i][0] += c[i][0]; ct[i][1] += c[i][1]; }
      for (k in ["bk", "qt", "lg", "wg"]) { var a:Array<Int> = Reflect.field(pairs, k); var b:Array<Int> = Reflect.field(v, k); a[0] += b[0]; a[1] += b[1]; }
      var l = dec64(v.lk); var m = dec64(v.ms); for (i in 0...64) { look[i] += l[i]; miss[i] += m[i]; }
    }
    t.ct = ct; t.bk = pairs.bk; t.qt = pairs.qt; t.lg = pairs.lg; t.wg = pairs.wg; t.look = look; t.miss = miss; t.n = gs.length;
    return t;
  }
  /* 9º eixo do radar: visão de candidatos (0-100, -1 sem dados) */
  public static function score(t:Dynamic):Int {
    if (t == null || t.op < 15 || t.nb < 5) return -1;
    var seenF = t.sn / t.nb; var nvR = t.nv / t.op;
    var v = 0.55 * seenF * 100 + 0.45 * (100 - 700 * nvR);
    return Std.int(Math.max(3, Math.min(100, Math.round(v))));
  }
  public static function vision(?list:Array<Dynamic>):Int {
    var gs = games(list);
    if (gs.length < MIN_GAMES) return -1;
    return score(total(gs));
  }
  static function pc(a:Float, b:Float):Int return b <= 0 ? 0 : Std.int(Math.round(a * 100 / b));

  /* taxa de "não olhou" por categoria: -1 sem amostra */
  public static function missRates(t:Dynamic):Dynamic {
    function r(a:Array<Int>):Int return a[0] >= 3 ? pc(a[1], a[0]) : -1;
    var ct:Array<Array<Int>> = t.ct;
    return { bp: [for (c in ct) r(c)], bb: r(t.bk), bq: r(t.qt), bL: r(t.lg), bw: r(t.wg) };
  }

  /* ---------- pontos a desenvolver (ordenados por gravidade) ---------- */
  public static function gaps(t:Dynamic):Array<Dynamic> {
    var out:Array<Dynamic> = [];
    function add(sev:Float, title:String, why:String, tip:String, btn:String, f:Void->Void) out.push({ sev: sev, t: title, w: why, tip: tip, b: btn, f: f });
    var bad:Int = t.bad; var op:Int = t.op;
    if (op == 0) return out;
    var mr = missRates(t);
    if (bad >= 3) {
      var nvP = pc(t.nv, bad); var vdP = pc(t.vd, bad); var ceP = pc(t.ce, bad);
      if (nvP >= 35) add(nvP, "Cegueira de candidatos", nvP + "% dos seus erros foram lances que você nem considerou: o melhor lance era de uma peça em que você não tocou.",
        "Antes de tocar em qualquer peça, faça a varredura: passe por TODAS as suas peças, de uma ala à outra, e pergunte para cada uma \"tem xeque, captura ou ameaça?\". Só depois escolha 2 ou 3 candidatos.",
        "Treinar com processo", function() { App.opts.process = true; App.setupGame(); });
      if (vdP >= 30) add(vdP * 0.9, "Viu, mas descartou", vdP + "% dos erros: você chegou a tocar na peça do melhor lance e desistiu dela.",
        "O problema não é enxergar, é calcular até o fim. Quando um candidato parecer arriscado, conte as respostas forçadas do adversário (xeques e capturas) antes de descartar.",
        "Táticas de cálculo", function() Pages.tactics());
      if (ceP >= 25) add(ceP * 0.8, "Peça certa, casa errada", ceP + "% dos erros: você moveu a peça certa para a casa errada.",
        "Quando escolher a peça, compare pelo menos duas casas de destino: qual é mais segura, qual ataca mais, qual deixa a peça ativa por mais tempo.",
        "Partidas de mestres", function() Pages.models());
    }
    var bp:Array<Int> = mr.bp;
    var worst = -1; for (i in 0...6) if (bp[i] >= 0 && (worst < 0 || bp[i] > bp[worst])) worst = i;
    if (worst >= 0 && bp[worst] >= 45) {
      var nm = PNAME[worst]; var fem = PFEM[worst];
      add(bp[worst] * 0.85, "Seu ponto cego: " + (fem ? "a " : "o ") + nm, "Quando o melhor lance era " + (fem ? "da " : "do ") + nm + ", você não " + (fem ? "a" : "o") + " olhou em " + bp[worst] + "% das vezes.",
        worst == 1 ? "Cavalos enganam porque saltam: em toda posição, olhe as casas que cada cavalo alcança (dos dois lados) e procure garfos." :
        (worst == 0 ? "Peões também atacam e abrem linhas: antes de jogar, veja se algum avanço de peão ganha espaço, ameaça uma peça ou abre o rei adversário." :
        (worst == 5 ? "O rei também joga: no final, ative o rei; no meio-jogo, veja se um lance de rei sai de cravadas e xeques." :
        "Peças de longo alcance trabalham de longe: siga cada diagonal e cada coluna até o fim do tabuleiro antes de decidir.")),
        "Táticas", function() Pages.tactics());
    }
    if (mr.bb >= 50) add(mr.bb * 0.75, "Lances de recuo", "Quando o melhor era recuar uma peça, você não olhou em " + mr.bb + "% das vezes.",
      "Recuar não é perder tempo: muitas defesas e manobras fortes começam com um recuo. Inclua os lances para trás na sua varredura.", "Finais", function() Pages.endgames());
    if (mr.bq >= 55) add(mr.bq * 0.6, "Lances calmos", "O melhor lance sem captura passou despercebido em " + mr.bq + "% das vezes.",
      "Nem todo bom lance captura algo: depois de olhar xeques e capturas, procure o lance que melhora a pior peça ou cria uma ameaça.", "Estruturas", function() Pages.structs());
    if (mr.bw >= 55) add(mr.bw * 0.7, "A outra ala", "Em " + mr.bw + "% das vezes em que o melhor lance estava do outro lado do tabuleiro, você nem chegou perto dele.",
      "Você se fixa em um setor. A cada lance, olhe rapidamente o lado oposto antes de decidir.", "Como pensar", function() Pages.think());
    if (mr.bL >= 55) add(mr.bL * 0.6, "Lances longos", "Lances de 4 casas ou mais passaram despercebidos em " + mr.bL + "% das vezes.",
      "Siga cada linha das torres, dos bispos e da dama até a borda: lances longos mudam o jogo de lado.", "Táticas", function() Pages.tactics());
    if (t.imp >= 5 && t.ib * 100 / t.imp >= 15) add(pc(t.ib, t.imp) + 10, "Mão rápida", pc(t.imp, op) + "% dos lances você tocou só na peça que jogou, em menos de 3 s, e " + pc(t.ib, t.imp) + "% deles foram erros.",
      "Regra do \"sente nas mãos\" (Kotov): decida o lance com os olhos e só depois toque na peça.", "Treinar com processo", function() { App.opts.process = true; App.setupGame(); });
    var br = t.br / op;
    if (op >= 20 && br >= 4.5) add(35, "Atenção dispersa", "Você toca em média " + (Math.round(br * 10) / 10) + " peças por lance.",
      "Amadores olham quase todas as peças; mestres concentram a atenção nas que decidem. Comece pelas peças em contato (atacando ou atacadas) e pelas próximas dos reis.", "Como pensar", function() Pages.think());
    if (op >= 20 && br <= 1.25 && t.nv > 0) add(40, "Visão de túnel", "Em quase todos os lances você considera uma única peça (" + (Math.round(br * 10) / 10) + " por lance).",
      "Escolha sempre 2 ou 3 candidatos antes de jogar, de peças diferentes.", "Treinar com processo", function() { App.opts.process = true; App.setupGame(); });
    if (t.ind >= 5 && pc(t.idb, t.ind) >= 20) add(pc(t.idb, t.ind), "Indecisão", "Quando você troca de peça 4 vezes ou mais, erra " + pc(t.idb, t.ind) + "% dos lances.",
      "Indecisão costuma ser falta de critério. Compare só os 2 melhores candidatos, calcule cada um até o fim e escolha.", "Táticas", function() Pages.tactics());
    if (t.rc >= 4 && pc(t.rcb, t.rc) >= 15) add(pc(t.rcb, t.rc) + 5, "Recaptura no automático", pc(t.rcb, t.rc) + "% das suas recapturas foram erros.",
      "Antes de retomar uma peça, procure um lance intermediário: um xeque, uma ameaça maior ou uma captura melhor.", "Táticas", function() Pages.tactics());
    if (t.pr >= 4 && pc(t.prb, t.pr) >= 20) add(pc(t.prb, t.pr), "Visão sob pressão", "Com menos de 15% do tempo no relógio, " + pc(t.prb, t.pr) + "% dos lances são erros.",
      "Guarde tempo para a fase crítica: jogue a abertura no ritmo e treine o Rush para decidir rápido.", "Táticas", function() Pages.tactics());
    if (t.ae >= 5 && pc(t.aem, t.ae) >= 30) add(pc(t.aem, t.ae) * 0.8, "Depois de um erro", "No lance seguinte a um erro, você deixa de ver o melhor lance em " + pc(t.aem, t.ae) + "% das vezes.",
      "Errou? Pare 10 segundos antes do próximo lance e refaça a varredura do zero: a posição mudou.", "Como pensar", function() Pages.think());
    if (op >= 20 && t.hp * 100 / op >= 15) add(25, "Muletas", "Você pediu dica ou ameaça em " + pc(t.hp, op) + "% dos lances.",
      "Ajudas são ótimas para aprender, mas tente primeiro sozinho: faça a varredura e use a dica só para conferir.", "Jogar", function() App.setupGame());
    out.sort(function(a, b) return Reflect.compare(b.sev, a.sev));
    return out;
  }

  #if js
  /* ---------- figuras ---------- */
  static function heat(vals:Array<Int>, rgb:String, title:String):String {
    var mx = 0; for (v in vals) if (v > mx) mx = v;
    var bc = Ui.boardColors; var L = bc != null ? bc[0] : "#f0d9b5"; var D = bc != null ? bc[1] : "#b58863";
    var s = new StringBuf();
    s.add('<div class="heat"><svg viewBox="0 0 168 178" role="img" aria-label="' + title + '">');
    for (r in 0...8) for (c in 0...8) {
      var sqi = (7 - r) * 8 + c; var x = 4 + c * 20; var y = 4 + r * 20;
      s.add('<rect x="' + x + '" y="' + y + '" width="20" height="20" fill="' + (((r + c) & 1) == 0 ? L : D) + '"/>');
      var v = vals[sqi];
      if (v > 0 && mx > 0) s.add('<rect x="' + x + '" y="' + y + '" width="20" height="20" fill="rgba(' + rgb + ',' + (Math.round((0.18 + 0.72 * v / mx) * 100) / 100) + ')"/>');
    }
    s.add('<rect x="4" y="4" width="160" height="160" fill="none" stroke="#dcb55c" stroke-width="1"/>');
    for (c in 0...8) s.add('<text x="' + (14 + c * 20) + '" y="175" text-anchor="middle" font-size="8" fill="#98a1ab">' + "abcdefgh".charAt(c) + '</text>');
    s.add('</svg><div class="heatt">' + title + '</div></div>');
    return s.toString();
  }

  /* ---------- tela principal ---------- */
  public static function page() {
    Ui.page("Mapa do seu pensamento", App.menu);
    var gs = games(); var t = total(gs);
    Ui.p("Cada toque numa peça mostra um lance que você considerou. Cruzando isso com a análise do treinador, o mapa separa quando você não viu o lance, quando viu e descartou, e quando escolheu a peça certa e errou a casa. São três problemas diferentes, com treinos diferentes.", "");
    var analisadas = gs.length;
    Ui.bar("Partidas válidas analisadas", Math.min(100, analisadas * 100 / MIN_GAMES), "gold", analisadas + " / " + MIN_GAMES);
    if (analisadas < MIN_GAMES) {
      Ui.p("Diagnóstico em formação: " + (MIN_GAMES - analisadas == 1 ? "falta 1 partida" : "faltam " + (MIN_GAMES - analisadas) + " partidas") + " para consolidar seu mapa mental e suas tendências de decisão.", "gold");
      Ui.p("Contam partidas concluídas contra o computador com pelo menos " + MIN_DECISIONS + " decisões suas analisadas. O sistema continua armazenando todos os dados; os gráficos e conclusões consolidados só aparecem após 20 partidas.", "muted small");
      Ui.p("Durante as partidas, mova e selecione peças normalmente: seus candidatos, erros e tempo de decisão serão utilizados no diagnóstico.", "muted");
      Ui.btns([["Jogar e continuar o mapeamento", App.setupGame, "pri"], ["Painel de evolução", Pages.profile]]);
      return;
    }
    if (t.op < 80) {
      Ui.p("São necessárias mais decisões analisadas para um diagnóstico confiável. Continue jogando: seus dados estão preservados.", "gold");
      Ui.btns([["Jogar", App.setupGame, "pri"]]);
      return;
    }
    var vs = score(t);
    Ui.stats([[vs >= 0 ? Std.string(vs) : "—", "visão de candidatos"], [pc(t.sn, t.nb) + "%", "melhores lances que você viu"], [Std.string(t.op), "lances mapeados"]]);
    Ui.p("Visão de candidatos é o 9º eixo do seu Perfil enxadrístico no Painel de evolução. " + gs.length + (gs.length == 1 ? " partida analisada" : " partidas analisadas") + ".", "muted small");

    Ui.h("Por que você erra");
    var bad:Int = t.bad;
    if (bad == 0) Ui.p("Nenhum erro grave nas partidas mapeadas. Excelente!", "good");
    else {
      Ui.bar("Não viu o lance (cegueira de candidatos)", pc(t.nv, bad), "bad", pc(t.nv, bad) + "%");
      Ui.bar("Viu a peça, mas descartou (cálculo)", pc(t.vd, bad), "warn", pc(t.vd, bad) + "%");
      Ui.bar("Peça certa, casa errada (comparação)", pc(t.ce, bad), "gold", pc(t.ce, bad) + "%");
      Ui.p(bad + (bad == 1 ? " erro grave analisado" : " erros graves analisados") + " (erros e gafes).", "muted small");
    }

    Ui.h("Onde você olha × onde você não olhou");
    Ui.html('<div class="heats">' + heat(t.look, "59,130,196", "Peças que você toca") + heat(t.miss, "227,96,90", "Melhores lances não vistos") + '</div>');
    Ui.p("Os dois tabuleiros estão do seu lado (sua primeira fileira embaixo). Quanto mais forte a cor, mais vezes.", "muted small");
    var miss:Array<Int> = t.miss; var look:Array<Int> = t.look;
    var wings = [0, 0, 0]; var lw = [0, 0, 0];
    for (i in 0...64) { var w = (i & 7) <= 2 ? 0 : ((i & 7) >= 5 ? 2 : 1); wings[w] += miss[i]; lw[w] += look[i]; }
    var tm = wings[0] + wings[1] + wings[2]; var tl = lw[0] + lw[1] + lw[2];
    if (tm >= 4) {
      var wn = ["ala da dama", "centro", "ala do rei"]; var wi = 0; for (i in 1...3) if (wings[i] > wings[wi]) wi = i;
      Ui.p("Seus pontos cegos se concentram na " + wn[wi] + " (" + pc(wings[wi], tm) + "% dos lances não vistos), onde você faz " + pc(lw[wi], tl) + "% dos seus toques.", wings[wi] * 100 / tm >= 50 ? "warn" : "");
    }

    Ui.h("O que passa despercebido");
    var mr = missRates(t); var rows:Array<String> = [];
    var bp:Array<Int> = mr.bp;
    var pl:Array<Array<Dynamic>> = [for (i in 0...6) if (bp[i] >= 0) [i, bp[i]]];
    pl.sort(function(a, b) return Reflect.compare(b[1], a[1]));
    for (x in pl) rows.push("Lances " + ((x[0] : Int) == 3 || (x[0] : Int) == 4 ? "da " : "do ") + PNAME[x[0]] + ": não olhou em " + x[1] + "% das vezes.");
    if (mr.bb >= 0) rows.push("Recuos: não olhou em " + mr.bb + "% das vezes.");
    if (mr.bq >= 0) rows.push("Lances calmos (sem captura): não olhou em " + mr.bq + "% das vezes.");
    if (mr.bL >= 0) rows.push("Lances longos (4 casas ou mais): não olhou em " + mr.bL + "% das vezes.");
    if (mr.bw >= 0) rows.push("Lances do outro lado do tabuleiro: não olhou em " + mr.bw + "% das vezes.");
    if (rows.length > 0) Ui.ul(rows, "small"); else Ui.p("Ainda faltam lances para medir as categorias.", "muted");

    Ui.h("Seu jeito de olhar");
    var st:Array<String> = [];
    st.push("Você considera em média " + (Math.round(t.br * 10 / t.op) / 10) + " peças por lance" + (t.br / t.op >= 4.5 ? " (atenção dispersa)." : (t.br / t.op <= 1.25 ? " (visão de túnel)." : ".")));
    if (t.t0n > 0) st.push("Leva " + (Math.round(t.t0 / t.t0n / 100) / 10) + " s, em média, até tocar na primeira peça.");
    st.push("Mão rápida: em " + pc(t.imp, t.op) + "% dos lances você tocou só na peça jogada, em menos de 3 s" + (t.imp > 0 ? "; " + pc(t.ib, t.imp) + "% deles foram erros." : "."));
    if (t.ind > 0) st.push("Indecisão: trocou de peça 4 vezes ou mais em " + t.ind + (t.ind == 1 ? " lance" : " lances") + ", com " + pc(t.idb, t.ind) + "% de erros.");
    if (t.rc > 0) st.push("Recapturas: " + t.rc + ", com " + pc(t.rcb, t.rc) + "% de erros.");
    if (t.pr > 0) st.push("Com o relógio apertado: " + pc(t.prb, t.pr) + "% de erros em " + t.pr + (t.pr == 1 ? " lance." : " lances."));
    if (t.ae > 0) st.push("Logo depois de um erro, deixou de ver o melhor lance em " + pc(t.aem, t.ae) + "% das vezes.");
    st.push("Ajudas (dica ou ameaça) em " + pc(t.hp, t.op) + "% dos lances.");
    var pr:Array<Int> = Profile.d.proc;
    if (pr[1] > 0) st.push("Treino do processo de pensamento: " + pc(pr[0], pr[1]) + "% dos passos certos.");
    Ui.ul(st, "small");

    /* visão partida a partida */
    if (gs.length >= 2) {
      var labels:Array<String> = []; var vals:Array<Dynamic> = []; var k = 0;
      for (g in gs.slice(-12)) {
        k++; var v:Dynamic = g.s.v;
        labels.push(Std.string(k));
        vals.push(v.nb >= 2 ? pc(v.sn, v.nb) : null);
      }
      Ui.h("Melhores lances vistos, partida a partida");
      Ui.lines(labels, [{ name: "% vistos", color: "#4b92d6", vals: vals }], 0, 100, "%");
    }

    Ui.h("Pontos a desenvolver");
    var gp = gaps(t);
    if (gp.length == 0) Ui.p("Nenhum ponto cego forte por enquanto. Continue jogando para o mapa ficar mais preciso.", "good");
    for (x in gp.slice(0, 5)) {
      Ui.group("rsec", function() {
        Ui.p(x.t, "gold");
        Ui.p(x.w, "small");
        Ui.p(x.tip, "muted small");
        var f:Void->Void = x.f;
        Ui.btns([[x.b + " ›", f]]);
      });
    }

    var ms = moments(gs);
    if (ms.length > 0) {
      Ui.h("Momentos que você não viu");
      Ui.items([for (m in ms.slice(0, 8)) { t: "Lance " + m.no + ": " + momentTxt(m), d: "Perdeu " + m.l + "% de chance de vitória.", r: "ver", f: function() view(m) }]);
      Ui.btns([["Treinar meus pontos cegos (" + Std.int(Math.min(10, ms.length)) + ")", function() drill(ms.slice(0, 10)), "pri"]]);
    }
  }
  public static function moments(gs:Array<Dynamic>):Array<Dynamic> {
    var out:Array<Dynamic> = [];
    var i = gs.length - 1;
    while (i >= 0 && out.length < 12) { var gm:Array<Dynamic> = gs[i].s.v.gm; if (gm != null) { var c = gm.copy(); c.reverse(); for (m in c) out.push(m); } i--; }
    return out;
  }
  public static function momentTxt(m:Dynamic):String {
    var t:Int = m.t; var mt:Int = m.mt;
    var what = mt > 0 ? "mate em " + mt + " com " + pieceTxt(t, true) : pieceTxt(t, true);
    var bs:String = m.bs;
    return switch (m.k) {
      case "nv": "havia " + (mt > 0 ? what : "um lance melhor com " + what) + " (" + bs + "), e você nem tocou " + (PFEM[t - 1] ? "nela." : "nele.");
      case "vd": "você tocou n" + (PFEM[t - 1] ? "a " : "o ") + PNAME[t - 1] + ", mas desistiu: " + bs + " era o melhor" + (mt > 0 ? " (mate em " + mt + ")." : ".");
      default: "peça certa, casa errada: " + (PFEM[t - 1] ? "a " : "o ") + PNAME[t - 1] + " ia melhor em " + bs + (mt > 0 ? " (mate em " + mt + ")." : ".");
    };
  }
  static function view(m:Dynamic) {
    Ui.boardPage("Momento não visto", page);
    var b = Ui.board; var human = Engine.posFromFEN(m.fen).turn;
    b.fen = m.fen; b.flip = human == -1; b.last = null; b.check = App.checkSq(Engine.posFromFEN(m.fen)); b.blind = false;
    b.marks = [for (s in (m.tc : Array<Int>)) [s, 2]];
    b.arrows = [App.arrow(m.u, 1), App.arrow(m.b, 0)]; b.legal = null; b.onMove = null; b.onSquare = null; b.clearSel(); b.draw();
    Ui.bars("Lance " + m.no + " · antes do seu " + m.san, "Azul: peças que você tocou", false, true);
    Ui.panel();
    Ui.p(momentTxt(m), m.k == "nv" ? "bad" : "warn");
    Ui.p("Seta vermelha: o lance que você jogou (" + m.san + "). Seta verde: o melhor (" + m.bs + "). Casas azuis: as peças que você considerou.", "small");
    Ui.p(m.k == "nv" ? "Esse é o erro mais traiçoeiro: não dá para calcular um lance que você nem considerou. A varredura de todas as peças antes de decidir resolve." :
      (m.k == "vd" ? "Você chegou perto: a peça estava na sua mão. Faltou calcular a ideia até o fim." : "Você escolheu a peça certa. Faltou comparar as casas de destino."), "muted small");
    Ui.btns([["Voltar ao mapa", page, "pri"]]);
  }

  /* ---------- treino dos pontos cegos: refazer as posições não vistas ---------- */
  static var dr:Dynamic = null;
  static function drill(list:Array<Dynamic>) {
    dr = { l: list, i: 0, ok: 0, state: "play", msg: "", tries: 0, judging: false };
    Ui.boardPage("Treinar pontos cegos", page);
    drawDrill();
  }
  static function drawDrill() {
    var m:Dynamic = dr.l[dr.i]; var b = Ui.board; var p = Engine.posFromFEN(m.fen);
    b.fen = m.fen; b.flip = p.turn == -1; b.last = null; b.marks = []; b.arrows = []; b.blind = false; b.onSquare = null;
    b.check = App.checkSq(p);
    b.legal = dr.state == "play" && !dr.judging ? App.legalUcis(p) : null;
    b.onMove = drillMove;
    if (dr.state != "play") b.arrows = [App.arrow(m.u, 1), App.arrow(m.b, 0)];
    b.clearSel(); b.draw();
    var ls:Array<Dynamic> = dr.l;
    Ui.bars("Ponto cego " + (dr.i + 1) + " de " + ls.length, "Você joga de " + (p.turn == 1 ? "Brancas" : "Pretas"), false, true);
    Ui.panel();
    Ui.p("Na partida você jogou " + m.san + ". Antes de mover, faça a varredura: toque mentalmente em cada uma das suas peças e procure xeques, capturas e ameaças.", "");
    if (dr.msg != "") Ui.p(dr.msg, dr.state == "ok" ? "good" : (dr.state == "fail" ? "bad" : "warn"));
    if (dr.judging) Ui.p("Conferindo…", "muted");
    if (dr.state != "play") {
      Ui.p(momentTxt(m), "small");
      var last = dr.i >= ls.length - 1;
      Ui.btns([[last ? "Concluir" : "Próximo", function() {
        if (last) { Ui.page("Treino concluído", page); Ui.p("Você encontrou " + dr.ok + " de " + ls.length + " lances que tinha deixado passar.", "big gold"); Ui.p("Repita este treino depois de algumas partidas: os pontos cegos mudam conforme você evolui.", ""); Ui.btns([["Voltar ao mapa", page, "pri"], ["Menu", App.menu]]); return; }
        dr.i++; dr.state = "play"; dr.msg = ""; dr.tries = 0; drawDrill();
      }, "pri"]]);
    } else Ui.btns([["Mostrar resposta", function() { dr.state = "fail"; dr.msg = ""; drawDrill(); }]]);
  }
  static function drillMove(u4:String) {
    var m:Dynamic = dr.l[dr.i];
    App.pickPromo(App.legalUcis(Engine.posFromFEN(m.fen)), u4, function(uci) {
      if (uci == m.b) { dr.state = "ok"; dr.ok++; dr.msg = "Achou! Esse é o lance que tinha passado despercebido."; drawDrill(); return; }
      if (uci == m.u) { dr.tries++; dr.msg = "Esse foi o lance da partida. Procure outra peça."; if (dr.tries >= 2) dr.state = "fail"; drawDrill(); return; }
      dr.judging = true; drawDrill();
      Brain.Think.run({ cmd: "judge", fen: m.fen, uci: uci }, function(j:Dynamic) {
        dr.judging = false;
        var loss:Float = j.loss;
        if (loss <= 3) { dr.state = "ok"; dr.ok++; dr.msg = "Muito bom: " + App.san(m.fen, uci) + " é tão bom quanto o lance indicado."; }
        else { dr.tries++; dr.msg = App.san(m.fen, uci) + " ainda não é o melhor. " + (dr.tries >= 2 ? "Veja a resposta." : "Tente outra peça."); if (dr.tries >= 2) dr.state = "fail"; }
        drawDrill();
      });
    });
  }
  #end
}
