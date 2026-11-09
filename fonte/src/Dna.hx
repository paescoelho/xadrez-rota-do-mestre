package;

import Engine;
import Brain;
import Data;
#if flash
import UiFlash as Ui;
#else
import UiJs as Ui;
#end

/* DNA enxadrista: o retrato de um jogador num mês, em poucos números.
   Serve para o fantasma "Seu maior adversário" (você de 3 meses atrás) e para o clone que você manda a um amigo.
   Campos: e Elo · ph erros a cada 100 lances (abertura, meio-jogo, final) · bl gafes a cada 100 · fa % de lances rápidos
   · fe quanto a pressa piora · tl quanto o tilt piora · ag % de capturas e xeques · cs/cn roque preferido e lance médio
   · qx % de partidas com troca de damas cedo · bp/bb/bq/bL/bw pontos cegos do Mapa do pensamento
   · ow/ob suas linhas de abertura (Brancas/Pretas) · ax os 9 eixos do radar · ms tempo médio por lance. */
@:expose
class Dna {
  static var ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  static inline var PFX = "XD1:";
  static var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  public static function monthLabel(k:String):String return k == null || k.length < 7 ? "" : MES[Std.parseInt(k.substr(5, 2)) - 1] + "/" + k.substr(2, 2);
  static function endOf(k:String):Float {
    var y = Std.parseInt(k.substr(0, 4)); var m = Std.parseInt(k.substr(5, 2));
    return new Date(m == 12 ? y + 1 : y, m == 12 ? 0 : m, 1, 0, 0, 0).getTime() - 1;
  }
  static function enc(ucis:Array<String>):String {
    var s = new StringBuf();
    for (u in ucis) { s.add(ALPH.charAt(Engine.nameSq(u.substr(0, 2)))); s.add(ALPH.charAt(Engine.nameSq(u.substr(2, 2)))); }
    return s.toString();
  }
  static function nf(x:Dynamic):String return StringTools.replace(Std.string(x), ".", ",");
  static function pc(a:Float, b:Float):Int return b <= 0 ? 0 : Std.int(Math.round(a * 100 / b));

  /* ---------- montar o DNA a partir das partidas até uma data ---------- */
  public static function build(cut:Float):Dynamic {
    var all:Array<Dynamic> = Profile.d.hist;
    var gs:Array<Dynamic> = [for (h in all) if (h.t != null && (h.t : Float) <= cut && h.human != true) h];
    gs = gs.filter(function(h) return h.s != null && h.s.v != null && (h.s.v.op | 0) >= Mind.MIN_DECISIONS).slice(-40);
    var ss:Array<Dynamic> = [for (h in gs) h.s];
    if (ss.length < Mind.MIN_GAMES) return null;
    var n = 0; var bad = 0; var bl = 0; var ph = [[0, 0], [0, 0], [0, 0]]; var fast = [0, 0]; var slow = [0, 0]; var tilt = [0, 0];
    var caps = 0; var chk = 0; var castled = 0; var cnS = 0; var ks = 0; var qs = 0; var qE = 0; var msS = 0.0; var msK = 0;
    for (s in ss) {
      n += s.n; bad += s.bad; bl += s.bl; caps += s.caps; chk += s.chk;
      var p:Array<Array<Int>> = s.ph; for (i in 0...3) { ph[i][0] += p[i][0]; ph[i][1] += p[i][1]; }
      var f:Array<Int> = s.fast; fast[0] += f[0]; fast[1] += f[1];
      var sl:Array<Int> = s.slow; slow[0] += sl[0]; slow[1] += sl[1];
      var tl:Array<Int> = s.tilt; tilt[0] += tl[0]; tilt[1] += tl[1];
      if (s.cs != null && s.cs != "") { castled++; cnS += s.cn; if (s.cs == "k") ks++ else qs++; }
      if (s.qo != null && s.qo > 0 && s.qo <= 20) qE++;
      if (s.ms != null) { msS += s.ms; msK++; }
    }
    if (n < 10) return null;
    var base = bad / n;
    var d:Dynamic = { v: 1 };
    var mk = Profile.monthKey(cut);
    d.m = mk;
    d.n = Profile.d.name != null && Profile.d.name != "" ? Profile.d.name : "Você";
    var ev:Dynamic = Reflect.field(Profile.d.evo, mk);
    var elo = ev != null && ev.e != null && ev.e > 0 ? (ev.e : Int) : 0;
    if (elo <= 0) { var i = gs.length - 1; while (i >= 0 && elo <= 0) { var rc:Array<Int> = gs[i].rc; if (rc != null) elo = rc[1]; i--; } }
    if (elo <= 0) elo = Profile.d.adapt;
    d.e = elo;
    d.ph = [for (i in 0...3) ph[i][1] >= 6 ? Math.round(ph[i][0] * 1000 / ph[i][1]) / 10 : Math.round(base * 1000) / 10];
    d.bl = Math.round(bl * 1000 / n) / 10;
    d.fa = pc(fast[1], fast[1] + slow[1]);
    d.fe = fast[1] >= 8 && base > 0 ? Math.round(Math.max(0.6, Math.min(2.5, (fast[0] / fast[1]) / base)) * 100) / 100 : 1.2;
    d.tl = tilt[1] >= 4 && base > 0 ? Math.round(Math.max(1, Math.min(3, (tilt[0] / tilt[1]) / base)) * 100) / 100 : 1.3;
    d.ag = pc(caps + chk, n);
    d.cs = castled * 10 >= ss.length * 3 ? (qs > ks ? "q" : "k") : "";
    d.cn = castled > 0 ? Math.round(cnS / castled) : 10;
    d.qx = pc(qE, ss.length);
    d.ms = msK > 0 ? Math.round(msS / msK) : 15000;
    var vt = Mind.total(Mind.games(gs));
    var mr = Mind.missRates(vt);
    d.bp = mr.bp; d.bb = mr.bb; d.bq = mr.bq; d.bL = mr.bL; d.bw = mr.bw;
    d.vs = Mind.score(vt);
    /* linhas de abertura: as 12 primeiras meias-jogadas de cada partida, por cor */
    function lines(col:Int):Array<Array<Dynamic>> {
      var cnt = new Map<String, Int>();
      for (h in gs) { var u:Array<String> = h.ucis; if (h.col != col || u == null || u.length < 2) continue; var k = enc(u.slice(0, 12)); cnt.set(k, (cnt.exists(k) ? cnt.get(k) : 0) + 1); }
      var a:Array<Array<Dynamic>> = [for (k in cnt.keys()) [k, cnt.get(k)]];
      a.sort(function(x, y) return Reflect.compare(y[1], x[1]));
      return a.slice(0, 12);
    }
    d.ow = lines(1); d.ob = lines(-1);
    d.ax = [for (a in Evo.axesFor(gs, ev)) a.val];
    d.g = gs.length;
    return d;
  }
  /* guarda o retrato do mês atual (chamado depois de cada partida) */
  public static function snapshot() {
    try {
      var k = Profile.monthKey(Date.now().getTime());
      var x = build(Date.now().getTime());
      if (x == null) return;
      var ev:Dynamic = Reflect.field(Profile.d.evo, k);
      if (ev == null) { ev = {}; Reflect.setField(Profile.d.evo, k, ev); }
      ev.dna = x;
    } catch (e:Dynamic) {}
  }
  /* seus retratos dos meses anteriores (do mais antigo ao mais recente) */
  public static function past():Array<Dynamic> {
    var cur = Profile.monthKey(Date.now().getTime());
    var ms = new Map<String, Bool>();
    for (k in Reflect.fields(Profile.d.evo)) ms.set(k, true);
    for (h in (Profile.d.hist : Array<Dynamic>)) if (h.t != null) ms.set(Profile.monthKey(h.t), true);
    var keys = [for (k in ms.keys()) if (k < cur) k]; keys.sort(function(a, b) return a < b ? -1 : 1);
    var out:Array<Dynamic> = [];
    for (k in keys) {
      var ev:Dynamic = Reflect.field(Profile.d.evo, k);
      var x:Dynamic = ev != null && ev.dna != null ? ev.dna : build(endOf(k));
      if (x != null) out.push(x);
    }
    return out;
  }
  public static function now():Dynamic return build(Date.now().getTime() + 1000);

  /* ---------- livro de aberturas do fantasma ---------- */
  public static function bookMove(dna:Dynamic, ucis:Array<String>, pos:Pos):String {
    if (dna == null || ucis == null || ucis.length >= 12) return null;
    var lines:Array<Array<Dynamic>> = pos.turn == 1 ? dna.ow : dna.ob;
    if (lines == null || lines.length == 0) return null;
    var pre = enc(ucis);
    var opts = new Map<String, Int>(); var tot = 0;
    for (l in lines) {
      var code:String = l[0]; var c:Int = l[1];
      if (code.length >= pre.length + 2 && code.substr(0, pre.length) == pre) {
        var a = ALPH.indexOf(code.charAt(pre.length)); var b = ALPH.indexOf(code.charAt(pre.length + 1));
        if (a < 0 || b < 0) continue;
        var u = Engine.sqName(a) + Engine.sqName(b);
        opts.set(u, (opts.exists(u) ? opts.get(u) : 0) + c); tot += c;
      }
    }
    if (tot == 0 || Math.random() > 0.92) return null;
    var r = Math.random() * tot;
    for (u in opts.keys()) {
      r -= opts.get(u);
      if (r <= 0) {
        for (m in Engine.legalMoves(pos)) { var x = Engine.moveToUCI(m); if (x.substr(0, 4) == u) return x; }
        return null;
      }
    }
    return null;
  }

  /* ---------- código para enviar ---------- */
  public static function encode(d:Dynamic):String return PFX + haxe.crypto.Base64.urlEncode(haxe.io.Bytes.ofString(haxe.Json.stringify(d)));
  public static function decode(text:String):Dynamic {
    if (text == null) return null;
    var re = ~/(?:XD1:|#xd=|[?&]xd=)([A-Za-z0-9_-]{20,})/;
    if (!re.match(text)) return null;
    try {
      var x:Dynamic = haxe.Json.parse(haxe.crypto.Base64.urlDecode(re.matched(1)).toString());
      if (x == null || x.v == null || x.e == null || x.ph == null) return null;
      return x;
    } catch (e:Dynamic) { return null; }
  }

  /* ---------- descrição em palavras ---------- */
  static var OPEN = ["e2e4" => "1.e4", "d2d4" => "1.d4", "c2c4" => "1.c4", "g1f3" => "1.Cf3", "e7e5" => "1...e5", "c7c5" => "a Siciliana", "e7e6" => "a Francesa", "c7c6" => "a Caro-Kann", "d7d5" => "1...d5", "g8f6" => "1...Cf6"];
  static function firstMove(lines:Array<Array<Dynamic>>, ply:Int):String {
    if (lines == null) return null;
    var cnt = new Map<String, Int>(); var tot = 0;
    for (l in lines) { var c:String = l[0]; if (c.length < (ply + 1) * 2) continue; var u = Engine.sqName(ALPH.indexOf(c.charAt(ply * 2))) + Engine.sqName(ALPH.indexOf(c.charAt(ply * 2 + 1))); var n:Int = l[1]; cnt.set(u, (cnt.exists(u) ? cnt.get(u) : 0) + n); tot += n; }
    var best:String = null; var bn = 0; for (k in cnt.keys()) if (cnt.get(k) > bn) { bn = cnt.get(k); best = k; }
    if (best == null) return null;
    return (OPEN.exists(best) ? OPEN.get(best) : best) + " (" + pc(bn, tot) + "%)";
  }
  public static function describe(d:Dynamic, who:String):Array<String> {
    var o:Array<String> = [];
    var w = firstMove(d.ow, 0); var b = firstMove(d.ob, 1);
    if (w != null || b != null) o.push("Aberturas: " + (w != null ? "de Brancas abre com " + w : "") + (w != null && b != null ? "; " : "") + (b != null ? "de Pretas responde com " + b : "") + ". Repete as linhas que " + who + " jogava.");
    var ph:Array<Float> = d.ph;
    var names = ["abertura", "meio-jogo", "final"]; var wi = 0; for (i in 1...3) if (ph[i] > ph[wi]) wi = i;
    o.push("Erra " + nf(ph[0]) + " · " + nf(ph[1]) + " · " + nf(ph[2]) + " lances a cada 100 (abertura · meio-jogo · final): o ponto fraco é o " + names[wi] + ".");
    o.push("Gafes: " + nf(d.bl) + " a cada 100 lances.");
    if (d.fa != null) o.push("Joga " + d.fa + "% dos lances em menos de 5 s" + ((d.fe : Float) > 1.3 ? ", e a pressa aumenta os erros." : "."));
    if ((d.tl : Float) > 1.5) o.push("Depois de um erro, entra em tilt: a chance de errar de novo sobe " + Math.round(((d.tl : Float) - 1) * 100) + "%.");
    var ag:Int = d.ag;
    o.push(ag >= 36 ? "Estilo agressivo: " + ag + "% dos lances são capturas ou xeques." : (ag < 20 ? "Estilo posicional: só " + ag + "% de capturas e xeques." : "Estilo equilibrado: " + ag + "% de capturas e xeques."));
    if (d.cs == "k") o.push("Faz o roque pequeno por volta do lance " + d.cn + "."); else if (d.cs == "q") o.push("Prefere o roque grande, por volta do lance " + d.cn + "."); else o.push("Raramente faz o roque.");
    var bp:Array<Int> = d.bp; var cego:Array<String> = [];
    if (bp != null) for (i in 0...6) if (bp[i] >= 45) cego.push((i == 3 || i == 4 ? "da " : "do ") + Mind.PNAME[i] + " (" + bp[i] + "%)");
    if (d.bb != null && d.bb >= 50) cego.push("os recuos (" + d.bb + "%)");
    if (d.bw != null && d.bw >= 55) cego.push("a outra ala (" + d.bw + "%)");
    if (cego.length > 0) o.push("Pontos cegos do mapa: não enxerga os lances " + cego.join(", ") + ". É ali que ele vai errar."); else o.push("Sem pontos cegos fortes registrados no Mapa do pensamento.");
    return o;
  }

  #if js
  /* ---------- placar dos duelos ---------- */
  static function duels():Array<Dynamic> { if (Profile.d.ghost == null) Profile.d.ghost = []; return Profile.d.ghost; }
  public static function record(key:String, res:Float) {
    var a = duels(); a.push({ t: Date.now().getTime(), k: key, r: res });
    while (a.length > 120) a.shift();
    Profile.save();
  }
  public static function scoreTxt(key:String, ?prefix:Bool = false):String {
    var w = 0; var dd = 0; var l = 0;
    for (x in duels()) if (prefix ? StringTools.startsWith(x.k, key) : x.k == key) { var r:Float = x.r; if (r >= 1) w++; else if (r <= 0) l++; else dd++; }
    return w + "V " + dd + "E " + l + "D";
  }
  static function clones():Array<Dynamic> { if (Profile.d.clones == null) Profile.d.clones = []; return Profile.d.clones; }

  /* ---------- Seu maior adversário ---------- */
  static var selK:String = null;
  public static function rival() {
    Ui.page("Seu maior adversário", App.menu);
    Ui.p("Você contra você de 3 meses atrás. O fantasma joga com o seu DNA daquele mês: as aberturas que você jogava, seus erros em cada fase, sua pressa, seu tilt e os pontos cegos do seu Mapa do pensamento. Ganhar dele é a prova concreta de que você evoluiu.", "");
    var me = now();
    if (me == null) {
      Ui.p("Para criar um clone mais fiel, o jogo exige 20 partidas analisadas (" + Mind.games().length + "/20 registradas). Jogue e volte aqui.", "gold");
      Ui.btns([["Jogar agora", App.setupGame, "pri"]]);
      return;
    }
    var ps = past();
    var cur = Profile.monthKey(Date.now().getTime());
    var target = Profile.monthKey(Date.now().getTime() - 90 * 86400000.0);
    var defK:String = null; for (x in ps) if (x.m <= target) defK = x.m;
    if (defK == null && ps.length > 0) defK = ps[0].m;
    if (selK == null || (selK != "hoje" && !Lambda.exists(ps, function(x) return x.m == selK))) selK = defK != null ? defK : "hoje";
    var opts:Array<Array<Dynamic>> = [];
    for (x in ps.slice(-3)) { var k:String = x.m; opts.push([monthLabel(k), function() { selK = k; rival(); }, selK == k, k == defK ? "≈ 3 meses" : null]); }
    opts.push(["Hoje", function() { selK = "hoje"; rival(); }, selK == "hoje", "espelho"]);
    Ui.seg("Qual você enfrentar", opts, opts.length);
    var ghost:Dynamic = me; for (x in ps) if (x.m == selK) ghost = x;
    var key = "past:" + (selK == "hoje" ? cur : selK);
    var lbl = selK == "hoje" ? "você de hoje" : "você em " + monthLabel(selK);
    if (ps.length == 0) Ui.p("Seu primeiro retrato mensal é deste mês. A partir do mês que vem, o fantasma do passado aparece aqui; por enquanto, enfrente o seu espelho.", "muted small");
    else if (selK != "hoje" && selK > target) Ui.p("Ainda não há retrato de 3 meses atrás; este é o mais antigo disponível.", "muted small");
    Ui.stats([[Std.string(ghost.e), lbl], [Std.string(me.e), "você hoje"], [scoreTxt(key), "placar"]]);
    Ui.h("Você hoje × " + lbl);
    var axNow = Evo.axes(); var axThen:Array<Dynamic> = ghost.ax;
    Ui.radar(axNow, selK == "hoje" ? null : axThen, "hoje", monthLabel(selK));
    if (selK != "hoje") {
      var ch:Array<String> = [];
      var dif:Array<Array<Dynamic>> = [];
      for (i in 0...axNow.length) { var a:Float = axNow[i].val; var b:Dynamic = axThen != null && i < axThen.length ? axThen[i] : null; if (a >= 0 && b != null && b >= 0) dif.push([axNow[i].label, Math.round(a - b)]); }
      dif.sort(function(x, y) return Reflect.compare(Math.abs(y[1]), Math.abs(x[1])));
      for (x in dif.slice(0, 4)) if (x[1] != 0) ch.push(x[0] + ": " + (x[1] > 0 ? "+" : "") + x[1] + " pontos.");
      var pn:Array<Float> = me.ph; var pt:Array<Float> = ghost.ph;
      ch.push("Erros a cada 100 lances no meio-jogo: " + nf(pt[1]) + " → " + nf(pn[1]) + ".");
      ch.push("Gafes a cada 100 lances: " + nf(ghost.bl) + " → " + nf(me.bl) + ".");
      if (me.vs >= 0 && ghost.vs != null && ghost.vs >= 0) ch.push("Visão de candidatos: " + ghost.vs + " → " + me.vs + ".");
      Ui.p("O que mudou", "gold");
      Ui.ul(ch, "small");
    }
    Ui.h("Como o fantasma vai jogar");
    Ui.ul(describe(ghost, "você"), "small");
    Ui.p("Os lances novos saem do motor do jogo guiado pelo seu DNA: ele erra na sua taxa, de preferência onde você não olhava.", "muted small");
    duelSetup(ghost, "Você · " + (selK == "hoje" ? "hoje" : monthLabel(selK)), key, rival, selK == "hoje" ? "Desafiar o seu espelho" : "Desafiar você de " + monthLabel(selK));
    var hist = [for (x in duels()) if (StringTools.startsWith(x.k, "past:")) x];
    if (hist.length > 0) Ui.p("Placar geral contra os seus fantasmas: " + scoreTxt("past:", true) + ".", "gold small");
  }
  static var duelColor = 0;
  static function duelSetup(dna:Dynamic, name:String, key:String, back:Void->Void, ?label:String) {
    var o:Dynamic = App.opts;
    Ui.seg("Você joga de", [["Brancas", function() { duelColor = 1; back(); }, duelColor == 1], ["Pretas", function() { duelColor = -1; back(); }, duelColor == -1], ["Sorteio", function() { duelColor = 0; back(); }, duelColor == 0]], 3);
    Ui.seg("Ritmo", [for (c in ["std", "rapid", "classic"]) [c == "std" ? "Sem relógio" : (c == "rapid" ? "Rápida 10+5" : "Clássica 30+20"), function() { o.cat = c; back(); }, o.cat == c]], 3);
    Ui.btns([[label != null ? label : "Desafiar " + name, function() App.newGhostGame(dna, name, key, duelColor), "pri wide"]]);
    Ui.p("O duelo não muda o seu Elo: vale o placar. O treinador comenta como numa partida normal, e o Mapa do pensamento continua registrando.", "muted small");
  }

  /* ---------- Meu DNA Enxadrista ---------- */
  public static function home() {
    Ui.page("Meu DNA Enxadrista", App.menu);
    Ui.p("Seu jogo vira um código: aberturas, erros por fase, pressa, tilt, estilo e pontos cegos. Mande pelo WhatsApp e seu amigo joga contra o seu clone, sem internet e sem servidor. Ele também pode mandar o dele para você.", "");
    Ui.field("Seu nome no DNA", Profile.d.name, "Como seu amigo vai ver o clone", "text", function(v) { Profile.d.name = StringTools.trim(v); Profile.save(); });
    var me = now();
    if (me == null) {
      Ui.p("Para gerar um DNA confiável, jogue pelo menos 20 partidas válidas contra o computador (" + Mind.games().length + "/20 registradas).", "gold");
      Ui.btns([["Jogar agora", App.setupGame, "pri"]]);
    } else {
      Ui.stats([[Std.string(me.e), "Elo do clone"], [Std.string(me.g), "partidas no DNA"], [me.vs >= 0 ? Std.string(me.vs) : "—", "visão de candidatos"]]);
      Ui.radar(Evo.axes());
      Ui.p("Como o seu clone joga", "gold");
      Ui.ul(describe(me, "você"), "small");
      Ui.h("Enviar o seu clone");
      Ui.btns([["Enviar pelo WhatsApp", function() sendWhats(me), "pri"], ["Enviar arquivo", function() sendFile(me)], ["Copiar código", function() copy(me)]]);
      Ui.p("O arquivo e a mensagem têm o mesmo código. Seu amigo abre o jogo › Meu DNA Enxadrista › Importar. O DNA é atualizado a cada partida: mande de novo quando quiser mostrar a sua evolução.", "muted small");
    }
    Ui.h("Clones recebidos");
    var cl = clones();
    if (cl.length == 0) Ui.p("Nenhum clone ainda. Peça para um amigo enviar o DNA dele.", "muted");
    else Ui.items([for (c in cl) { t: "Clone de " + c.n, d: "Elo " + c.e + " · DNA de " + monthLabel(c.m) + " · " + scoreTxt("clone:" + c.id), r: "jogar ›", f: function() clonePage(c) }]);
    Ui.h("Importar DNA de um amigo");
    var nav:Dynamic = js.Browser.navigator;
    var bs:Array<Array<Dynamic>> = [];
    if (nav.clipboard != null && nav.clipboard.readText != null)
      bs.push(["Colar automaticamente", function() {
        try { var pr:Dynamic = nav.clipboard.readText(); pr.then(function(t:String) importText(t), function(_) Ui.toast("Cole no campo abaixo.")); } catch (e:Dynamic) { Ui.toast("Cole no campo abaixo."); }
      }, "pri"]);
    bs.push(["Abrir arquivo", pickFile]);
    Ui.btns(bs);
    Ui.input("Cole aqui a mensagem ou o código XD1:…", "Importar", importText);
  }
  static function clonePage(c:Dynamic) {
    Ui.page("Clone de " + c.n, home);
    var dna:Dynamic = c.dna;
    Ui.stats([[Std.string(c.e), "Elo do clone"], [monthLabel(c.m), "DNA de"], [scoreTxt("clone:" + c.id), "seu placar"]]);
    var ax:Array<Dynamic> = dna.ax;
    var labels = ["Tática", "Cálculo", "Finais", "Aberturas", "Estratégia", "Tempo", "Precisão", "Atenção", "Visão"];
    if (ax != null) Ui.radar([for (i in 0...ax.length) { label: labels[i], val: ax[i] == null ? -1 : ax[i] }], [for (a in Evo.axes()) a.val], c.n, "você");
    Ui.p("Como " + c.n + " joga", "gold");
    Ui.ul(describe(dna, c.n), "small");
    duelSetup(dna, c.n, "clone:" + c.id, function() clonePage(c));
    Ui.sep();
    Ui.btns([["Remover clone", function() Ui.modal("Remover o clone de " + c.n + "?", "O placar continua salvo.", [["Remover", function() { clones().remove(c); Profile.save(); home(); }, "warn"], ["Cancelar", null, "pri"]]), "warn"]]);
  }
  public static function importText(t:String) {
    var x = decode(t);
    if (x == null) { Ui.toast("Não encontrei um DNA válido nesse texto."); return; }
    var nm:String = x.n != null && x.n != "" ? x.n : "Amigo";
    var id = nm.toLowerCase();
    var cl = clones(); var c:Dynamic = null;
    for (o in cl) if (o.id == id) c = o;
    if (c == null) { c = { id: id }; cl.push(c); }
    c.n = nm; c.e = x.e; c.m = x.m; c.dna = x; c.t = Date.now().getTime();
    Profile.save();
    Ui.toast("Clone de " + nm + " importado.");
    clonePage(c);
  }
  /* link recebido (#xd=...) */
  public static function fromHash(h:String):Bool {
    if (h == null || h.indexOf("xd=") < 0) return false;
    try { js.Browser.window.history.replaceState(null, "", js.Browser.location.pathname); } catch (e:Dynamic) {}
    importText(h);
    return true;
  }
  static function message(d:Dynamic):String {
    var code = encode(d);
    var lines = ["♟️ " + d.n + " te mandou o DNA enxadrista (Elo " + d.e + "). Jogue contra o clone!"];
    var base = Online.baseUrl();
    if (base != null) lines.push("Toque para importar: " + base + "#xd=" + code.substr(PFX.length));
    else lines.push("Abra o Xadrez · Rota do Mestre › Meu DNA Enxadrista › Importar e cole esta mensagem.");
    lines.push(code);
    return lines.join("\n");
  }
  static function fname(d:Dynamic):String {
    var n:String = d.n; n = ~/[^A-Za-z0-9]+/g.replace(n, "-").toLowerCase();
    return "dna-xadrez-" + (n == "" ? "jogador" : n) + ".txt";
  }
  static function sendWhats(d:Dynamic) {
    var url = "https://wa.me/?text=" + StringTools.urlEncode(message(d));
    var w:Dynamic = null;
    try { w = js.Browser.window.open(url, "_blank"); } catch (e:Dynamic) {}
    if (w == null) js.Browser.location.href = url;
  }
  static function sendFile(d:Dynamic) {
    var text = message(d); var fn = fname(d);
    var nav:Dynamic = js.Browser.navigator;
    try {
      var f:Dynamic = js.Syntax.code("new File([{0}], {1}, {type: 'text/plain'})", text, fn);
      if (nav.canShare != null && nav.canShare({ files: [f] })) {
        var pr:Dynamic = nav.share({ files: [f], title: "DNA enxadrista de " + d.n, text: "Meu clone no Xadrez · Rota do Mestre" });
        pr.then(function(_) {}, function(_) {});
        return;
      }
    } catch (e:Dynamic) {}
    var a:Dynamic = js.Browser.document.createElement("a");
    a.href = "data:text/plain;charset=utf-8," + StringTools.urlEncode(text); a.download = fn;
    js.Browser.document.body.appendChild(a); a.click(); js.Browser.document.body.removeChild(a);
    Ui.toast("Arquivo salvo: " + fn + ". Anexe na conversa do WhatsApp.");
  }
  static function copy(d:Dynamic) {
    var text = message(d);
    try { var nav:Dynamic = js.Browser.navigator; nav.clipboard.writeText(text); Ui.toast("Código copiado: cole na conversa."); } catch (e:Dynamic) { Ui.toast("Não foi possível copiar."); }
  }
  static function pickFile() {
    var inp:Dynamic = js.Browser.document.createElement("input");
    inp.type = "file"; inp.accept = ".txt,.xdna,text/plain";
    inp.onchange = function(_) {
      var f:Dynamic = inp.files != null && inp.files.length > 0 ? inp.files[0] : null;
      if (f == null) return;
      var rd:Dynamic = js.Syntax.code("new FileReader()");
      rd.onload = function(_) importText(rd.result);
      rd.readAsText(f);
    };
    inp.click();
  }
  #end
}
