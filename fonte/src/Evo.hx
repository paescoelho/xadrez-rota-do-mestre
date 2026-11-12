package;

#if flash
import UiFlash as Ui;
#else
import UiJs as Ui;
#end

/* Painel de evolução: perfil enxadrístico (teia de aranha), leitura do jogo (tendências, forças, fraquezas,
   preferências, dificuldades táticas, padrões de erro, uso do tempo), evolução mês a mês e dicas de treino.
   Tudo é calculado no aparelho, a partir das partidas, problemas e treinos já registrados no perfil. */
class Evo {
  /* temas de tabuleiro: id, nome, casa clara, casa escura */
  public static var BOARD_THEMES:Array<Array<String>> = [
    ["turquesa", "Turquesa", "#ffffff", "#1cc7b1"],
    ["pixel", "Pixel art 8-bit", "#ffe9a8", "#29adff"],
    ["pelourinho", "Pelourinho", "#f7e7c6", "#2f7fbf"],
    ["praia", "Praia baiana", "#f3dfb0", "#30c3c9"],
    ["sertao", "Sertão", "#e9b97a", "#8a4b26"],
    ["origami", "Origami", "#fffaf2", "#ef6f5c"],
    ["bic", "Caderno Bic", "#fdfdf8", "#a9c3e3"],
    ["nanquim", "Nanquim", "#f4efe4", "#8f897d"],
    ["praca", "Praça de concreto", "#cfccc5", "#3f4a52"],
    ["daltonico", "Daltônico (alto contraste)", "#f0f0f0", "#3d6e9e"]
  ];
  /* temas antigos (removidos) passam para o mais parecido */
  static var OLD = ["azul" => "turquesa", "contraste" => "daltonico", "jornal" => "nanquim", "terracota" => "sertao", "marmore" => "turquesa", "oliva" => "turquesa", "ardosia" => "turquesa", "madeira" => "turquesa", "nogueira" => "turquesa", "verde" => "turquesa", "ceu" => "turquesa", "lavanda" => "turquesa", "rubi" => "turquesa", "laranja" => "turquesa", "diagrama" => "nanquim"];
  public static function applyTheme() {
    #if js
    Profile.d.ps = "lux";
    Profile.d.snd = true;
    Ui.pieceStyle = "lux";
    Ui.soundOn = true;
    #end
    var id:String = Profile.d.bt;
    if (OLD.exists(id)) { id = OLD.get(id); Profile.d.bt = id; }
    for (t in BOARD_THEMES) if (t[0] == id) { Ui.boardColors = [t[2], t[3]]; Ui.boardTheme = id; return; }
    Ui.boardColors = null; Ui.boardTheme = null;
  }
  public static function setTheme(id:String) { Profile.d.bt = id; Profile.save(); applyTheme(); }
  public static function themeName():String { var id:String = Profile.d.bt; for (t in BOARD_THEMES) if (t[0] == id) return t[1]; return BOARD_THEMES[0][1]; }

  /* ---------- resumo de cada partida (guardado no histórico) ---------- */
  static function phaseOf(fen:String, no:Int):Int {
    var b = fen.split(" ")[0]; var pcs = 0;
    for (i in 0...b.length) { var c = b.charAt(i).toLowerCase(); if (c == "n" || c == "b" || c == "r" || c == "q") pcs++; }
    if (pcs <= 6) return 2;
    return no <= 12 ? 0 : 1;
  }
  public static function summarize(g:Dynamic):Dynamic {
    var recs:Array<Dynamic> = g.recs;
    var n = 0; var bad = 0; var bl = 0;
    var ph = [[0, 0], [0, 0], [0, 0]];
    var fast = [0, 0]; var slow = [0, 0]; var low = [0, 0]; var msSum = 0.0; var msN = 0;
    var tilt = [0, 0]; var prevBad = false;
    var con:Dynamic = {};
    var caps = 0; var chk = 0;
    for (r in recs) {
      var fb:Dynamic = r.fb;
      if (fb == null || fb.grade == null || fb.grade == "forced") { prevBad = false; continue; }
      n++;
      var isBad = fb.grade == "mistake" || fb.grade == "blunder";
      if (isBad) bad++;
      if (fb.grade == "blunder") bl++;
      var p = phaseOf(r.fen, r.no); ph[p][1]++; if (isBad) ph[p][0]++;
      if (r.ms != null) {
        var ms:Float = r.ms; msSum += ms; msN++;
        if (ms < 5000) { fast[1]++; if (isBad) fast[0]++; } else { slow[1]++; if (isBad) slow[0]++; }
      }
      if (r.left != null && r.left >= 0 && r.left < 0.15) { low[1]++; if (isBad) low[0]++; }
      if (prevBad) { tilt[1]++; if (isBad) tilt[0]++; }
      prevBad = isBad;
      if (isBad && fb.concept != null) { var c:String = fb.concept; var o:Dynamic = Reflect.field(con, c); Reflect.setField(con, c, (o == null ? 0 : o) + 1); }
      var san:String = r.san;
      if (san != null) { if (san.indexOf("x") >= 0) caps++; if (san.indexOf("+") >= 0 || san.indexOf("#") >= 0) chk++; }
    }
    var sans:Array<String> = g.sans; var human:Int = g.human;
    var cs = ""; var cn = 0;
    for (i in 0...sans.length) {
      var mine = (i % 2 == 0) == (human == 1);
      if (mine && cs == "" && StringTools.startsWith(sans[i], "O-O")) { cs = StringTools.startsWith(sans[i], "O-O-O") ? "q" : "k"; cn = Std.int(i / 2) + 1; }
    }
    var qo = 0;
    for (r in recs) { var b:String = (r.fen : String).split(" ")[0]; if (b.indexOf("Q") < 0 && b.indexOf("q") < 0) { qo = r.no; break; } }
    var vis:Dynamic = null; try vis = Mind.gameVision(g) catch (e:Dynamic) {}
    return { v: vis, n: n, bad: bad, bl: bl, ph: ph, ms: msN > 0 ? Math.round(msSum / msN) : null, fast: fast, slow: slow, low: low, tilt: tilt, con: con, caps: caps, chk: chk, cs: cs, cn: cn, qo: qo };
  }

  /* ---------- perfil (0-100; -1 = sem dados) ---------- */
  /* OV/OVS: calcula o perfil de outro período (retrato do mês para o fantasma) */
  static var OV:Array<Dynamic> = null; static var OVS:Dynamic = null;
  static function hist():Array<Dynamic> return OV != null ? OV : Profile.d.hist;
  static function dim(k:String):Int {
    if (OV == null) return Profile.dimPct(k);
    if (OVS == null) return -1;
    var v:Dynamic = Reflect.field(OVS, k); return v == null ? -1 : v;
  }
  static function sums():Array<Dynamic> { var o:Array<Dynamic> = []; for (h in hist()) if (h.s != null) o.push(h.s); return o.slice(-30); }
  static function clamp(v:Float):Int return Std.int(Math.max(3, Math.min(100, Math.round(v))));
  /* erros (erro + gafe) por lance -> nota: 10% = 55, 2% = 91 */
  static function rateScore(bad:Float, n:Float):Int return n < 8 ? -1 : clamp(100 - 450 * bad / n);
  static function tot(f:Dynamic->Array<Int>):Array<Int> { var a = [0, 0]; for (s in sums()) { var x = f(s); a[0] += x[0]; a[1] += x[1]; } return a; }
  static function mix(a:Int, b:Int):Int return a < 0 ? b : (b < 0 ? a : Std.int(Math.round((a + b) / 2)));

  static function strategy():Int {
    var md:Array<Dynamic> = OV != null ? [] : Profile.d.model; var sc = 0.0; var k = 0; var i = md.length - 1;
    while (i >= 0 && k < 8) { if (md[i].pct != null) { sc += md[i].pct; k++; } i--; }
    var model = k > 0 ? clamp(sc / k) : -1;
    var mid = tot(function(s) return [s.ph[1][0], s.ph[1][1]]);
    return mix(model, rateScore(mid[0], mid[1]));
  }
  static function timeScore():Int {
    var base = dim("tempo");
    var lw = tot(function(s) return [s.low[0], s.low[1]]);
    var fs = tot(function(s) return [s.fast[0], s.fast[1]]);
    var v = mix(base, mix(lw[1] >= 5 ? rateScore(lw[0], lw[1]) : -1, fs[1] >= 10 ? rateScore(fs[0], fs[1]) : -1));
    if (v < 0) return -1;
    var to = 0; var h = hist(); var i = h.length - 1; var k = 0;
    while (i >= 0 && k < 20) { if (h[i].how == "tempo esgotado") to++; i--; k++; }
    return clamp(v - to * 8);
  }
  static function precision():Int {
    var h = hist(); var sc = 0.0; var k = 0; var i = h.length - 1;
    while (i >= 0 && k < 10) { if (h[i].acc != null) { sc += h[i].acc; k++; } i--; }
    return k > 0 ? clamp(sc / k) : -1;
  }
  static function attention():Int {
    var n = 0; var bad = 0;
    for (s in sums()) { n += s.n; var c:Dynamic = s.con; for (k in ["threat", "hanging"]) { var x:Dynamic = Reflect.field(c, k); if (x != null) bad += x; } }
    var v = n < 8 ? -1 : clamp(100 - 900 * bad / n);
    var pr:Array<Int> = OV != null ? [0, 0] : Profile.d.proc;
    return mix(v, pr[1] >= 6 ? clamp(pr[0] * 100 / pr[1]) : -1);
  }
  public static function axesFor(gs:Array<Dynamic>, snap:Dynamic):Array<Dynamic> {
    OV = gs; OVS = snap;
    var a = try axes() catch (e:Dynamic) { OV = null; OVS = null; throw e; };
    OV = null; OVS = null;
    return a;
  }
  public static function axes():Array<Dynamic> {
    return [
      { k: "tat", label: "Tática", val: dim("tatica") },
      { k: "calc", label: "Cálculo", val: dim("calculo") },
      { k: "fin", label: "Finais", val: dim("finais") },
      { k: "abe", label: "Aberturas", val: dim("abertura") },
      { k: "est", label: "Estratégia", val: strategy() },
      { k: "tem", label: "Tempo", val: timeScore() },
      { k: "pre", label: "Precisão", val: precision() },
      { k: "ate", label: "Atenção", val: attention() },
      { k: "vis", label: "Visão", val: Mind.vision(hist()) }
    ];
  }
  static var STRONG = ["tat" => "você enxerga combinações e ganha material quando o adversário vacila.",
    "calc" => "você segura sequências longas de lances na cabeça.",
    "fin" => "você converte vantagens e defende finais com técnica.",
    "abe" => "você sai da abertura com posição saudável.",
    "est" => "você escolhe bons planos em posições calmas.",
    "tem" => "você decide bem mesmo com o relógio correndo.",
    "pre" => "seus lances ficam perto dos melhores do computador.",
    "ate" => "você responde às ameaças e quase não deixa peças soltas.",
    "vis" => "você enxerga os melhores lances: considera as peças certas antes de jogar."];
  static var WEAK = ["tat" => "táticas passam despercebidas; é aqui que mais pontos se perdem.",
    "calc" => "as sequências longas se perdem no meio do cálculo.",
    "fin" => "vantagens escapam no final ou finais iguais viram derrota.",
    "abe" => "a abertura deixa você atrás logo nos primeiros lances.",
    "est" => "em posições calmas falta um plano claro.",
    "tem" => "o relógio pesa: pressa demais ou tempo gasto no lugar errado.",
    "pre" => "muitos lances ficam longe dos melhores.",
    "ate" => "ameaças do adversário e peças desprotegidas custam caro.",
    "vis" => "os melhores lances passam despercebidos: você nem toca na peça que resolvia."];
  public static var TIPS:Map<String, Array<Dynamic>> = [
    "tat" => ["Faça um Storm ou um Rush por dia e revise os temas em que mais erra.", "Táticas", function() Pages.tactics()],
    "calc" => ["Resolva problemas longos (mate em 3, sequências de 4 lances ou mais) sem mexer nas peças antes de decidir.", "Táticas", function() Pages.tactics()],
    "fin" => ["Domine os finais básicos até jogá-los sem pensar; depois, os finais de torre, os mais comuns.", "Finais", function() Pages.endgames()],
    "abe" => ["Monte seu repertório, revise as linhas e jogue essas aberturas contra o computador.", "Aberturas", function() Pages.openings()],
    "est" => ["Estude as estruturas de peões e jogue \"Adivinhe o lance\" com partidas de mestres.", "Estruturas", function() Pages.structs()],
    "tem" => ["Jogue no ritmo Rápida 10+5 e treine o Rush: decidir bem com menos tempo.", "Jogar", function() App.setupGame()],
    "pre" => ["Jogue com o treinador comentando cada lance e refaça os erros no Plano do dia.", "Plano do dia", function() Pages.daily()],
    "ate" => ["Ligue o \"Treino do processo de pensamento\": antes de cada lance, marque as ameaças.", "Como pensar", function() Pages.think()],
    "vis" => ["Abra o Mapa do seu pensamento: veja onde estão seus pontos cegos e treine as posições que você não viu.", "Mapa do pensamento", function() { #if js Mind.page(); #else Pages.think(); #end }]];

  /* ---------- leitura do jogo ---------- */
  static function pct(a:Float, b:Float):Int return b <= 0 ? 0 : Std.int(Math.round(a * 100 / b));
  static var OPEN_W = ["e2e4" => "1.e4", "d2d4" => "1.d4", "c2c4" => "1.c4 (Inglesa)", "g1f3" => "1.Cf3 (Réti)"];
  static var OPEN_B_E4 = ["e7e5" => "1...e5", "c7c5" => "Siciliana", "e7e6" => "Francesa", "c7c6" => "Caro-Kann", "d7d5" => "Escandinava"];
  static var OPEN_B_D4 = ["d7d5" => "1...d5", "g8f6" => "Defesas índias (1...Cf6)", "e7e6" => "1...e6", "f7f5" => "Holandesa"];
  static function openings():Array<String> {
    var out:Array<String> = [];
    function top(filter:Dynamic->Bool, idx:Int, names:Map<String, String>):Array<Dynamic> {
      var cnt = new Map<String, Array<Float>>(); var tot = 0;
      for (h in hist()) { var u:Array<String> = h.ucis; if (u == null || u.length <= idx || !filter(h)) continue; var k = u[idx]; tot++; var a = cnt.get(k); if (a == null) { a = [0, 0]; cnt.set(k, a); } a[0]++; a[1] += h.res; }
      var best:String = null; var bn = 0.0;
      for (k in cnt.keys()) if (cnt.get(k)[0] > bn) { bn = cnt.get(k)[0]; best = k; }
      if (best == null || tot < 3) return null;
      var a = cnt.get(best);
      return [names.exists(best) ? names.get(best) : best, pct(a[0], tot), pct(a[1], a[0]), Std.int(a[0])];
    }
    var w = top(function(h) return h.col == 1, 0, OPEN_W);
    if (w != null) out.push("Com as Brancas você abre com " + w[0] + " em " + w[1] + "% das partidas e faz " + w[2] + "% dos pontos com ela.");
    var e = top(function(h) { var u:Array<String> = h.ucis; return h.col == -1 && u[0] == "e2e4"; }, 1, OPEN_B_E4);
    if (e != null) out.push("Contra 1.e4, sua resposta preferida é " + e[0] + " (" + e[1] + "%), com " + e[2] + "% dos pontos.");
    var d = top(function(h) { var u:Array<String> = h.ucis; return h.col == -1 && u[0] == "d2d4"; }, 1, OPEN_B_D4);
    if (d != null) out.push("Contra 1.d4, você costuma jogar " + d[0] + " (" + d[1] + "%), com " + d[2] + "% dos pontos.");
    return out;
  }
  public static function reading(ax:Array<Dynamic>):Array<Array<Dynamic>> {
    var sec:Array<Array<Dynamic>> = [];
    var known:Array<Dynamic> = [for (a in ax) if (a.val >= 0) a];
    known.sort(function(a, b) return Reflect.compare(b.val, a.val));
    var st = [for (a in known.slice(0, 2)) if (a.val >= 55) a.label + " (" + a.val + "): " + STRONG.get(a.k)];
    var wk = [for (a in known.slice(-2)) if (a.val < 70 && known.length >= 3) a.label + " (" + a.val + "): " + WEAK.get(a.k)];
    wk.reverse();
    sec.push(["Pontos fortes", st, "Ainda sem dados suficientes: complete o Nivelamento e jogue algumas partidas."]);
    sec.push(["Fraquezas a trabalhar", wk, "Ainda sem dados suficientes para apontar fraquezas."]);

    var ss = sums(); var n = 0; var caps = 0; var chk = 0; var castled = 0; var cnSum = 0; var ks = 0; var qs = 0; var qEarly = 0;
    for (s in ss) { n += s.n; caps += s.caps; chk += s.chk; if (s.cs != "") { castled++; cnSum += s.cn; if (s.cs == "k") ks++ else qs++; } if (s.qo > 0 && s.qo <= 20) qEarly++; }
    var tend:Array<String> = [];
    if (ss.length >= 3 && n > 0) {
      var aggr = (caps + chk) / n;
      tend.push(aggr > 0.36 ? "Estilo agressivo: muitas trocas e xeques (" + pct(caps + chk, n) + "% dos seus lances). Você gosta de partidas abertas e táticas."
        : (aggr < 0.2 ? "Estilo posicional: poucas trocas e xeques (" + pct(caps + chk, n) + "% dos lances). Você prefere manobrar e acumular pequenas vantagens."
        : "Estilo equilibrado: troca e ataca na medida (" + pct(caps + chk, n) + "% dos lances são capturas ou xeques)."));
      if (qEarly * 2 >= ss.length) tend.push("Você costuma trocar as damas cedo (antes do lance 20 em " + pct(qEarly, ss.length) + "% das partidas): gosta de simplificar.");
    }
    var h = hist(); var sc:Array<Float> = [for (x in h) x.res];
    if (sc.length >= 8) {
      var k = Std.int(Math.min(10, sc.length / 2)); var a = 0.0; var b = 0.0;
      for (i in sc.length - k...sc.length) a += sc[i];
      for (i in sc.length - 2 * k...sc.length - k) b += sc[i];
      var d = pct(a - b, k);
      tend.push(d > 8 ? "Fase em alta: nas últimas " + k + " partidas você fez " + pct(a, k) + "% dos pontos, contra " + pct(b, k) + "% nas " + k + " anteriores."
        : (d < -8 ? "Fase em baixa: " + pct(a, k) + "% dos pontos nas últimas " + k + " partidas, contra " + pct(b, k) + "% antes. Vale revisar os erros recentes." : "Resultados estáveis: cerca de " + pct(a, k) + "% dos pontos nas últimas " + k + " partidas."));
    }
    sec.push(["Tendências de jogo", tend, "Jogue pelo menos 20 partidas analisadas para consolidar as tendências do seu estilo."]);

    var pref = openings();
    if (castled > 0 && ss.length >= 3) pref.push("Roque em " + pct(castled, ss.length) + "% das partidas, em média no lance " + Math.round(cnSum / castled) + (qs > ks ? ", com preferência pelo roque grande." : ", quase sempre o roque pequeno."));
    else if (ss.length >= 3) pref.push("Você raramente faz o roque: o rei fica no centro e vira alvo. Roque até o lance 10 é a regra de ouro.");
    sec.push(["Preferências estratégicas", pref, "Jogue mais partidas para o painel identificar suas aberturas e seus planos favoritos."]);

    var con = new Map<String, Int>();
    for (s in ss) { var c:Dynamic = s.con; for (k in Reflect.fields(c)) con.set(k, (con.exists(k) ? con.get(k) : 0) + Std.int(Reflect.field(c, k))); }
    var ck = [for (k in con.keys()) k]; ck.sort(function(a, b) return con.get(b) - con.get(a));
    var tac:Array<String> = [];
    for (k in ck.slice(0, 3)) { var c = Coach.concept(k); if (c != null) tac.push(c[0] + ": " + con.get(k) + (con.get(k) == 1 ? " erro" : " erros") + " nas últimas partidas."); }
    var tl:Array<Array<Dynamic>> = [];
    for (k in Content.MOTIFS) { var p = Profile.themePct(k); if (p >= 0) tl.push([k, p]); }
    tl.sort(function(a, b) return Reflect.compare(a[1], b[1]));
    if (tl.length > 0) tac.push("Temas de problemas com menor acerto: " + [for (x in tl.slice(0, 3)) Content.themeName(x[0]) + " " + x[1] + "%"].join(", ") + ".");
    sec.push(["Dificuldades táticas", tac, "Resolva problemas em Táticas para mapear os temas mais difíceis."]);

    var err:Array<String> = [];
    if (n >= 15) {
      var names = ["abertura", "meio-jogo", "final"]; var rates = [for (i in 0...3) { var b = 0; var m = 0; for (s in ss) { b += s.ph[i][0]; m += s.ph[i][1]; } m >= 6 ? b / m : -1.0; }];
      var worst = -1; for (i in 0...3) if (rates[i] >= 0 && (worst < 0 || rates[i] > rates[worst])) worst = i;
      if (worst >= 0) err.push("Seus erros se concentram no " + names[worst] + ": " + Math.round(rates[worst] * 100) + " erros a cada 100 lances nessa fase.");
      var bl = 0; for (s in ss) bl += s.bl;
      err.push("Média de " + (Math.round(bl * 10 / ss.length) / 10) + " gafes por partida" + (bl == 0 ? ": excelente." : "."));
      var t = tot(function(s) return [s.tilt[0], s.tilt[1]]); var all = tot(function(s) return [s.bad, s.n]);
      if (t[1] >= 4 && all[1] > 0) {
        var after = t[0] / t[1]; var base = all[0] / all[1];
        if (after > base * 1.5 && after > 0.15) err.push("Depois de um erro, a chance de errar de novo no lance seguinte sobe para " + pct(t[0], t[1]) + "%. Respire antes de responder.");
        else err.push("Você se recupera bem dos próprios erros: raramente erra dois lances seguidos.");
      }
    }
    sec.push(["Padrões de erro", err, "Os padrões aparecem depois de umas 15 jogadas analisadas pelo treinador."]);

    var tm:Array<String> = [];
    var msS = 0.0; var msK = 0; for (s in ss) if (s.ms != null) { msS += s.ms; msK++; }
    if (msK > 0) tm.push("Você leva em média " + Math.round(msS / msK / 1000) + " s por lance.");
    var fs = tot(function(s) return [s.fast[0], s.fast[1]]); var sl = tot(function(s) return [s.slow[0], s.slow[1]]);
    if (fs[1] >= 8 && sl[1] >= 8) {
      var fr = fs[0] / fs[1]; var sr = sl[0] / sl[1];
      tm.push(fr > sr * 1.4 ? "Lances rápidos (menos de 5 s) erram " + pct(fs[0], fs[1]) + "% das vezes, contra " + pct(sl[0], sl[1]) + "% quando você pensa mais: a pressa está custando pontos."
        : "Você mantém a qualidade mesmo nos lances rápidos (" + pct(fs[0], fs[1]) + "% de erros, contra " + pct(sl[0], sl[1]) + "% nos lances pensados).");
    }
    var lw = tot(function(s) return [s.low[0], s.low[1]]);
    if (lw[1] >= 5) tm.push("Com menos de 15% do tempo no relógio, " + pct(lw[0], lw[1]) + "% dos seus lances são erros.");
    var to = 0; for (x in h) if (x.how == "tempo esgotado") to++;
    if (to > 0) tm.push(to + (to == 1 ? " partida perdida" : " partidas perdidas") + " por tempo esgotado.");
    sec.push(["Uso do tempo", tm, "O uso do tempo aparece depois de algumas partidas, principalmente com relógio (Rápida ou Clássica)."]);
    return sec;
  }

  /* ---------- evolução mês a mês ---------- */
  static var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  public static function monthly(cur:Int) {
    var evo:Dynamic = Profile.d.evo;
    var ms = new Map<String, Bool>();
    for (k in Reflect.fields(evo)) ms.set(k, true);
    for (x in hist()) if (x.t != null) ms.set(Profile.monthKey(x.t), true);
    var keys = [for (k in ms.keys()) k]; keys.sort(function(a, b) return a < b ? -1 : 1);
    keys = keys.slice(-12);
    if (keys.length == 0) { Ui.p("A linha do tempo começa com a sua primeira atividade registrada. Cada mês vira um ponto no gráfico.", "muted"); return; }
    var labels = [for (k in keys) MES[Std.parseInt(k.substr(5, 2)) - 1] + "/" + k.substr(2, 2)];
    var elo:Array<Dynamic> = []; var tat:Array<Dynamic> = []; var fin:Array<Dynamic> = []; var abe:Array<Dynamic> = []; var pre:Array<Dynamic> = [];
    for (k in keys) {
      var e:Dynamic = Reflect.field(evo, k);
      var ev:Null<Float> = e != null && e.e != null && e.e > 0 ? e.e : null;
      var last:Null<Float> = null; var accS = 0.0; var accN = 0;
      for (x in hist()) if (x.t != null && Profile.monthKey(x.t) == k) { var rc:Array<Int> = x.rc; if (rc != null) last = rc[1]; if (x.acc != null) { accS += x.acc; accN++; } }
      elo.push(ev != null ? ev : last);
      function dim(f:String):Dynamic { if (e == null) return null; var v:Dynamic = Reflect.field(e, f); return v == null || v < 0 ? null : v; }
      tat.push(dim("tatica")); fin.push(dim("finais")); abe.push(dim("abertura"));
      pre.push(accN > 0 ? accS / accN : null);
    }
    var ev = [for (v in elo) if (v != null) (v : Float)];
    if (ev.length > 0) {
      var lo = Math.floor((Lambda.fold(ev, Math.min, ev[0]) - 120) / 100) * 100; var hi = Math.ceil((Lambda.fold(ev, Math.max, ev[0]) + 120) / 100) * 100;
      if (hi - lo < 400) hi = lo + 400;
      Ui.p("Elo estimado por mês", "gold");
      Ui.lines(labels, [{ name: "Elo estimado", color: "#f3d98c", vals: elo }], Math.max(0, lo), hi, "", cur > 0 ? Profile.nextGoal(cur) : null);
    }
    var any = false; for (a in [tat, fin, abe, pre]) for (v in a) if (v != null) any = true;
    if (any) {
      Ui.p("Habilidades por mês (% de acerto e precisão)", "gold");
      Ui.lines(labels, [{ name: "Tática", color: "#4b92d6", vals: tat }, { name: "Finais", color: "#4cb871", vals: fin }, { name: "Aberturas", color: "#e7a53c", vals: abe }, { name: "Precisão nas partidas", color: "#e3605a", vals: pre }], 0, 100, "");
    }
    if (keys.length == 1) Ui.p("Este é o primeiro mês registrado: as linhas aparecem a partir do segundo mês.", "muted small");
  }
}
