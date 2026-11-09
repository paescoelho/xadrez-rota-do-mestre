package;

#if js
import Engine;
import Brain;
import Data;
import UiJs as Ui;

/* Partida contra um amigo pelo WhatsApp, sem servidor.
   Cada envio leva a partida inteira (lances, nomes, pontuações, empate/abandono) num link ou código.
   Quem abre o link vê a posição e responde com um toque. O treinador fica desligado durante a partida
   (jogo justo) e analisa os seus lances no fim. */
class Online {
  static inline var PFX = "XC1:";
  static var ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  static var cur:Dynamic = null;
  static var busy = false;
  static var flip:Null<Bool> = null;

  /* ---------- codificação: 2 caracteres por lance (+1 na promoção) ---------- */
  public static function encMoves(ucis:Array<String>):String {
    var s = new StringBuf();
    for (u in ucis) {
      s.add(ALPH.charAt(Engine.nameSq(u.substr(0, 2)))); s.add(ALPH.charAt(Engine.nameSq(u.substr(2, 2))));
      if (u.length > 4) s.add(u.charAt(4));
    }
    return s.toString();
  }
  /* refaz os lances conferindo a legalidade; null se algo não confere */
  public static function decMoves(m:String):Array<String> {
    var p = Engine.posFromFEN(Engine.START_FEN); var out:Array<String> = []; var i = 0;
    if (m == null) return out;
    while (i + 1 < m.length) {
      var a = ALPH.indexOf(m.charAt(i)); var b = ALPH.indexOf(m.charAt(i + 1)); i += 2;
      if (a < 0 || b < 0) return null;
      var u = Engine.sqName(a) + Engine.sqName(b);
      var cand = [for (x in App.legalUcis(p)) if (x.substr(0, 4) == u) x];
      if (cand.length == 0) return null;
      if (cand.length > 1) { if (i >= m.length) return null; u += m.charAt(i); i++; if (cand.indexOf(u) < 0) return null; }
      else u = cand[0];
      Engine.makeMove(p, Engine.uciToMove(p, u)); p.stack = []; out.push(u);
    }
    return out;
  }
  static function encode(g:Dynamic):String {
    var o = { v: 1, g: g.g, w: g.w, b: g.b, m: encMoves(g.ucis), r: g.r, d: g.d, t: Std.int(Date.now().getTime() / 1000) };
    return haxe.crypto.Base64.urlEncode(haxe.io.Bytes.ofString(haxe.Json.stringify(o)));
  }
  /* aceita o link, a mensagem inteira do WhatsApp ou só o código */
  public static function decode(text:String):Dynamic {
    if (text == null) return null;
    var re = ~/(?:XC1:|#xc=|[?&]xc=)([A-Za-z0-9_-]{20,})/;
    if (!re.match(text)) return null;
    try {
      var x:Dynamic = haxe.Json.parse(haxe.crypto.Base64.urlDecode(re.matched(1)).toString());
      if (x == null || x.g == null) return null;
      return x;
    } catch (e:Dynamic) { return null; }
  }

  /* ---------- armazenamento ---------- */
  static function games():Array<Dynamic> {
    if (Profile.d.online == null) Profile.d.online = [];
    return Profile.d.online;
  }
  static function find(gid:String):Dynamic { for (g in games()) if (g.g == gid) return g; return null; }
  static function store(g:Dynamic) {
    var a = games();
    if (a.indexOf(g) < 0) a.push(g);
    while (a.length > 30) { var k = -1; for (i in 0...a.length) if (a[i].res != null && a[i] != g) { k = i; break; } a.splice(k < 0 ? 0 : k, 1); }
    Profile.save();
  }
  static function posOf(g:Dynamic):Pos {
    var p = Engine.posFromFEN(Engine.START_FEN);
    for (u in (g.ucis : Array<String>)) { Engine.makeMove(p, Engine.uciToMove(p, u)); p.stack = []; }
    return p;
  }
  static function keysOf(g:Dynamic):Array<String> {
    var p = Engine.posFromFEN(Engine.START_FEN); var k = [Engine.posKey(p)];
    for (u in (g.ucis : Array<String>)) { Engine.makeMove(p, Engine.uciToMove(p, u)); p.stack = []; k.push(Engine.posKey(p)); }
    return k;
  }
  static function mine(g:Dynamic):Dynamic return g.me == 1 ? g.w : g.b;
  static function opp(g:Dynamic):Dynamic return g.me == 1 ? g.b : g.w;
  static function oppName(g:Dynamic):String { var o = opp(g); return o.n != null && o.n != "" ? o.n : "Seu amigo"; }
  static function myName():String { var n:String = Profile.d.name; if (n != null && n != "") return n; if (cur != null) { var m:String = mine(cur).n; if (m != null && m != "") return m; } return "Seu amigo"; }
  static function profName(?fallback:String):String { var n:String = Profile.d.name; return n != null && n != "" ? n : (fallback != null ? fallback : ""); }
  static function myElo():Int {
    var r = Profile.R("online");
    if (r.games > 0) return r.elo;
    var c:Int = Profile.combined()[0];
    return c;
  }
  static function newGid():String { var s = ""; for (i in 0...10) s += ALPH.charAt(Std.random(62)); return s; }
  public static function digits(p:String):String {
    if (p == null) return "";
    var d = ~/[^0-9]/g.replace(p, "");
    if (d.length == 10 || d.length == 11) d = "55" + d;
    return d;
  }
  public static function myTurnCount():Int {
    var n = 0;
    for (g in games()) if (g.sent != true || (g.res == null && posOf(g).turn == g.me)) n++;
    return n;
  }

  /* resultado: null em andamento; senão { score (meu ponto de vista), how } */
  static function status(g:Dynamic):Dynamic {
    var r:String = g.r;
    if (r == "rw") return { score: g.me == 1 ? 0.0 : 1.0, how: "Brancas abandonaram" };
    if (r == "rb") return { score: g.me == -1 ? 0.0 : 1.0, how: "Pretas abandonaram" };
    if (r == "da") return { score: 0.5, how: "empate combinado" };
    var p = posOf(g);
    var st = Engine.gameStatus(p, keysOf(g));
    if (!st.over) return null;
    return { score: st.winner == 0 ? 0.5 : (st.winner == g.me ? 1.0 : 0.0), how: App.howText(st.result) };
  }
  /* registra a pontuação uma única vez por partida */
  static function finalize(g:Dynamic) {
    var s = status(g);
    if (s == null || g.res != null) return;
    g.res = s;
    var myMoves = 0; for (i in 0...(g.ucis : Array<String>).length) if ((i % 2 == 0) == (g.me == 1)) myMoves++;
    var oe:Int = opp(g).e; var oppElo = oe != null && oe > 0 ? oe : 1200;
    if (myMoves >= 3) g.rc = Profile.recordRated("online", oppElo, s.score);
    Profile.addHistory({ t: Date.now().getTime(), col: g.me, res: s.score, opp: oppName(g) + (oe != null && oe > 0 ? " (" + oe + ")" : ""), oppElo: oppElo, cat: "online", tc: "",
      ucis: (g.ucis : Array<String>).copy(), how: s.how, rc: g.rc, rated: g.rc != null, human: true });
    Profile.touch(); Profile.save();
  }

  /* ---------- abrir link ou código recebido ---------- */
  public static function fromUrl():Bool {
    var h = js.Browser.location.hash + js.Browser.location.search;
    if (h.indexOf("xd=") >= 0) { haxe.Timer.delay(function() Dna.fromHash(h), 50); return true; }
    if (h.indexOf("xc=") < 0) return false;
    try { js.Browser.window.history.replaceState(null, "", js.Browser.location.pathname); } catch (e:Dynamic) {}
    openText(h, true);
    return true;
  }
  public static function listenHash() {
    js.Browser.window.addEventListener("hashchange", function(_) {
      var h = js.Browser.location.hash;
      if (h.indexOf("xd=") >= 0) { Dna.fromHash(h); return; }
      if (h.indexOf("xc=") >= 0) { try { js.Browser.window.history.replaceState(null, "", js.Browser.location.pathname); } catch (e:Dynamic) {} openText(h, false); }
    });
  }
  public static function openText(text:String, fromLink:Bool) {
    var x = decode(text);
    if (x == null) { if (fromLink) App.menu(); Ui.toast("Não encontrei uma jogada válida nesse texto."); return; }
    var ucis = decMoves(x.m);
    if (ucis == null) { if (fromLink) App.menu(); Ui.toast("A jogada recebida tem lances inválidos."); return; }
    var g = find(x.g);
    if (g == null) {
      var p = Engine.posFromFEN(Engine.START_FEN);
      for (u in ucis) { Engine.makeMove(p, Engine.uciToMove(p, u)); p.stack = []; }
      /* quem recebe é quem tem a vez; no abandono, é o outro lado; no empate aceito, quem ofereceu */
      var me = p.turn;
      var rr:String = x.r;
      if (rr == "rw") me = -1; else if (rr == "rb") me = 1; else if (rr == "da" && x.d != null && x.d != 0) me = x.d;
      g = { g: x.g, me: me, w: x.w, b: x.b, ucis: ucis, r: x.r, d: x.d, t: x.t, sent: true, recs: {}, res: null, created: Date.now().getTime() };
      var m = mine(g);
      m.n = profName(m.n); if (Profile.d.phone != null && Profile.d.phone != "") m.p = Profile.d.phone; m.e = myElo();
      store(g);
      show(g);
      if (Profile.d.name == null || Profile.d.name == "") Ui.toast("Dica: coloque seu nome em \"Jogar com amigo\" para seu amigo saber quem respondeu.");
      return;
    }
    var known:Array<String> = g.ucis;
    var prefix = true;
    for (i in 0...Std.int(Math.min(known.length, ucis.length))) if (known[i] != ucis[i]) { prefix = false; break; }
    var o:Dynamic = g.me == 1 ? x.b : x.w;
    var myo = opp(g);
    if (o.n != null && o.n != "") myo.n = o.n;
    if (o.e != null && o.e > 0) myo.e = o.e;
    if (o.p != null && o.p != "") myo.p = o.p;
    if (!prefix) {
      Ui.modal("A partida recebida não confere", "Os lances recebidos são diferentes dos que estão salvos aqui. Qual versão vale?", [
        ["Usar a recebida", function() { g.ucis = ucis; g.r = x.r; g.d = x.d; g.sent = true; g.res = null; store(g); finalize(g); show(g); }, "pri"],
        ["Manter a minha", function() show(g)]]);
      return;
    }
    if (ucis.length < known.length || (ucis.length == known.length && (x.r == null || x.r == "") && x.d == g.d)) {
      show(g);
      Ui.toast(ucis.length < known.length ? "Esse link é de uma jogada antiga. Mostrando a posição mais recente." : "Nenhuma novidade nessa jogada.");
      return;
    }
    g.ucis = ucis; g.r = x.r; g.d = x.d; g.t = x.t; g.sent = true;
    store(g); finalize(g);
    show(g);
  }

  /* ---------- envio pelo WhatsApp ---------- */
  public static function baseUrl():String {
    var loc = js.Browser.location;
    if (loc.protocol == "http:" || loc.protocol == "https:") return loc.origin + loc.pathname;
    var w:String = Profile.d.webUrl;
    if (w != null && StringTools.startsWith(w, "http")) return w.split("#")[0];
    return null;
  }
  static function lastMoveText(g:Dynamic):String {
    var u:Array<String> = g.ucis;
    if (u.length == 0) return null;
    var p = Engine.posFromFEN(Engine.START_FEN); var s = "";
    for (i in 0...u.length) {
      var m = Engine.uciToMove(p, u[i]);
      if (i == u.length - 1) s = (p.turn == 1 ? p.full + ". " : p.full + "... ") + Engine.moveToSAN(p, m);
      Engine.makeMove(p, m); p.stack = [];
    }
    return s;
  }
  static function message(g:Dynamic):String {
    cur = g;
    var me = myName(); var cor = g.me == 1 ? "Pretas" : "Brancas";
    var u:Array<String> = g.ucis;
    var lines:Array<String> = [];
    var st = status(g);
    if (st != null) {
      var sc:Float = st.score;
      lines.push("♟️ Fim da partida: " + (sc == 0.5 ? "empate" : (sc >= 1 ? me + " venceu" : oppName(g) + " venceu")) + " (" + st.how + ").");
    } else if (u.length <= 1) {
      lines.push("♟️ " + me + " te desafiou para uma partida de xadrez! Você joga de " + cor + ".");
      if (u.length == 1) lines.push("Primeiro lance: " + lastMoveText(g) + ". Sua vez!");
    } else lines.push("♟️ " + me + " jogou " + lastMoveText(g) + ". Sua vez (você joga de " + cor + ").");
    if (st == null && g.d == g.me) lines.push("🤝 " + me + " ofereceu empate.");
    var code = encode(g);
    var base = baseUrl();
    if (base != null) lines.push((st != null ? "Ver a partida: " : "Toque para jogar: ") + base + "#xc=" + code);
    else {
      lines.push("Para jogar: abra o Xadrez - Rota do Mestre › Jogar com amigo › Colar jogada e cole esta mensagem.");
      lines.push(PFX + code);
    }
    return lines.join("\n");
  }
  static function sendWhats(g:Dynamic) {
    var text = message(g);
    var ph = digits(opp(g).p);
    var url = "https://wa.me/" + ph + "?text=" + StringTools.urlEncode(text);
    g.sent = true; g.t = Std.int(Date.now().getTime() / 1000);
    store(g);
    var w:Dynamic = null;
    try { w = js.Browser.window.open(url, "_blank"); } catch (e:Dynamic) {}
    if (w == null) js.Browser.location.href = url;
    draw();
  }
  static function shareOther(g:Dynamic) {
    var text = message(g);
    var nav:Dynamic = js.Browser.navigator;
    var done = function() { g.sent = true; store(g); draw(); };
    if (nav.share != null) {
      try { var pr:Dynamic = nav.share({ text: text }); pr.then(function(_) done(), function(_) {}); return; } catch (e:Dynamic) {}
    }
    try { nav.clipboard.writeText(text); Ui.toast("Mensagem copiada: cole na conversa."); done(); } catch (e:Dynamic) { Ui.toast("Não foi possível copiar."); }
  }

  /* ---------- telas ---------- */
  public static function home() {
    cur = null;
    Ui.page("Jogar com amigo", App.menu);
    Ui.p("Desafie alguém pelo WhatsApp. Cada lance vira um link: seu amigo toca, joga e responde com um toque. Não precisa de conta nem de servidor, e funciona dentro do navegador do WhatsApp.", "");
    Ui.p("Jogo justo: durante a partida o treinador fica desligado. No fim, ele analisa os seus lances e monta a revisão.", "muted small");
    Ui.h("Seus dados");
    Ui.field("Seu nome", Profile.d.name, "Como seu amigo vai ver você", "text", function(v) { Profile.d.name = StringTools.trim(v); Profile.save(); });
    Ui.field("Seu WhatsApp (opcional)", Profile.d.phone, "DDD + número, ex.: 75 99999-0000", "tel", function(v) { Profile.d.phone = StringTools.trim(v); Profile.save(); });
    Ui.p("Com o seu número, a resposta do seu amigo já abre a conversa com você.", "muted small");
    var base = baseUrl();
    var loc = js.Browser.location;
    if (loc.protocol == "http:" || loc.protocol == "https:") Ui.p("Links ativos: o jogo está em " + loc.host + ", então seu amigo abre a partida com um toque.", "good small");
    else {
      Ui.field("Endereço do jogo na internet (opcional)", Profile.d.webUrl, "https://...", "url", function(v) { Profile.d.webUrl = StringTools.trim(v); Profile.save(); });
      Ui.p(base != null ? "Links ativos usando esse endereço." : "Sem endereço, a mensagem leva um código: seu amigo abre o jogo e cola a mensagem em \"Colar jogada\". Para links de um toque, publique este arquivo como index.html num site gratuito (GitHub Pages, Netlify ou Cloudflare Pages) e cole o endereço aqui.", base != null ? "good small" : "muted small");
    }
    Ui.btns([["Nova partida", newGame, "pri"], ["Colar jogada recebida", paste]]);
    var a = games().copy();
    a.sort(function(x, y) {
      var tx = (x.res == null ? 0 : 1); var ty = (y.res == null ? 0 : 1);
      if (tx != ty) return tx - ty;
      return Reflect.compare(y.t, x.t);
    });
    if (a.length > 0) {
      Ui.h("Suas partidas");
      Ui.items([for (g in a) {
        var p = posOf(g); var my = p.turn == g.me;
        var stt = g.res != null ? resText(g) : (!g.sent ? "falta enviar" : (my ? "sua vez" : "vez dele"));
        { t: oppName(g) + " · você de " + (g.me == 1 ? "Brancas" : "Pretas"), d: "Lance " + p.full + " · " + ago(g.t), r: stt, ok: g.res == null && (my || !g.sent), f: function() show(g) };
      }]);
    }
    var r = Profile.R("online");
    if (r.games > 0) Ui.p("Sua pontuação contra amigos: " + r.elo + (Profile.isProvisional("online") ? " (provisória)" : "") + " · " + r.w + "V " + r.d + "E " + r.l + "D", "gold small");
  }
  static function resText(g:Dynamic):String {
    var sc:Float = g.res.score;
    return sc >= 1 ? "vitória" : (sc <= 0 ? "derrota" : "empate");
  }
  static function ago(t:Dynamic):String {
    if (t == null) return "";
    var s = Date.now().getTime() / 1000 - (t : Float);
    if (s < 90) return "agora";
    if (s < 3600) return "há " + Math.round(s / 60) + " min";
    if (s < 86400) return "há " + Math.round(s / 3600) + " h";
    return "há " + Math.round(s / 86400) + (Math.round(s / 86400) == 1 ? " dia" : " dias");
  }
  static var newColor = 1;
  static var newPhone = "";
  static var newName = "";
  static function newGame() {
    Ui.page("Nova partida com amigo", home);
    Ui.h("Você joga de");
    Ui.btns([["Brancas", function() { newColor = 1; newGame(); }, newColor == 1 ? "sel" : ""], ["Pretas", function() { newColor = -1; newGame(); }, newColor == -1 ? "sel" : ""], ["Sorteio", function() { newColor = 0; newGame(); }, newColor == 0 ? "sel" : ""]]);
    Ui.h("Seu amigo");
    Ui.field("Nome (opcional)", newName, "Ex.: João", "text", function(v) newName = StringTools.trim(v));
    Ui.field("WhatsApp dele (opcional)", newPhone, "DDD + número", "tel", function(v) newPhone = StringTools.trim(v));
    Ui.p("Com o número, o convite abre direto na conversa dele. Sem número, o WhatsApp pergunta para quem enviar.", "muted small");
    Ui.btns([["Criar partida", function() {
      var me = newColor == 0 ? (Math.random() < 0.5 ? 1 : -1) : newColor;
      var mineSide = { n: Profile.d.name, e: myElo(), p: Profile.d.phone };
      var other = { n: newName, e: 0, p: newPhone };
      var g:Dynamic = { g: newGid(), me: me, w: me == 1 ? mineSide : other, b: me == 1 ? other : mineSide, ucis: [], r: "", d: 0, t: Std.int(Date.now().getTime() / 1000), sent: me == 1, recs: {}, res: null, created: Date.now().getTime() };
      store(g);
      newName = ""; newPhone = "";
      show(g);
    }, "pri"]]);
  }
  static function paste() {
    Ui.page("Colar jogada recebida", home);
    Ui.p("Na conversa do WhatsApp, toque e segure a mensagem do seu amigo › Copiar. Depois cole aqui (serve a mensagem inteira, o link ou só o código).", "");
    var nav:Dynamic = js.Browser.navigator;
    if (nav.clipboard != null && nav.clipboard.readText != null)
      Ui.btns([["Colar automaticamente", function() {
        try { var pr:Dynamic = nav.clipboard.readText(); pr.then(function(t:String) openText(t, false), function(_) Ui.toast("O navegador não deixou ler a área de transferência: cole no campo abaixo.")); }
        catch (e:Dynamic) { Ui.toast("Cole no campo abaixo."); }
      }, "pri"]]);
    Ui.input("Cole aqui a mensagem recebida", "Abrir jogada", function(t) openText(t, false));
  }

  /* ---------- partida ---------- */
  public static function show(g:Dynamic) {
    cur = g; busy = false; flip = null;
    Ui.boardPage("Contra " + oppName(g), home);
    draw();
  }
  static function draw() {
    var g = cur; var b = Ui.board;
    if (b != null) b.showLost = true;
    if (g == null || b == null) return;
    var p = posOf(g);
    var st = status(g);
    var myTurn = st == null && p.turn == g.me && g.sent == true && !busy;
    var u:Array<String> = g.ucis;
    b.fen = Engine.toFEN(p); b.flip = flip != null ? flip : g.me == -1;
    b.last = u.length > 0 ? App.lastOf(u[u.length - 1]) : null;
    b.check = App.checkSq(p); b.arrows = []; b.marks = []; b.blind = false; b.onSquare = null;
    b.legal = myTurn ? App.legalUcis(p) : null;
    b.onMove = onMove;
    b.clearSel(); b.draw();
    var o = opp(g);
    var oe:Int = o.e;
    var top = oppName(g) + (oe != null && oe > 0 ? " (" + oe + ")" : "") + (st == null && p.turn != g.me ? " · vez dele" : "");
    var bot = myName() + " (você)" + (myTurn ? " · sua vez" : "");
    if (b.flip != (g.me == -1)) Ui.bars(bot, top, myTurn, st == null && p.turn != g.me) else Ui.bars(top, bot, st == null && p.turn != g.me, myTurn);
    Ui.panel();
    if (st != null) {
      var sc:Float = st.score;
      Ui.p((sc >= 1 ? "Vitória!" : (sc <= 0 ? "Derrota." : "Empate.")) + " (" + st.how + ")", "big " + (sc >= 1 ? "good" : (sc <= 0 ? "bad" : "gold")));
      if (g.rc != null) {
        var rc:Array<Int> = g.rc; var d = rc[1] - rc[0];
        Ui.p("Amigos (WhatsApp): " + (rc[0] == 0 ? "" : rc[0] + " → ") + rc[1] + (rc[0] == 0 ? "" : " (" + (d >= 0 ? "+" : "") + d + ")") + (Profile.isProvisional("online") ? " · provisória" : ""), "gold");
      }
      if (!g.sent) Ui.btns([["Enviar resultado pelo WhatsApp", function() sendWhats(g), "pri"], ["Outro app / copiar", function() shareOther(g)]]);
      var crit = critical(g);
      Ui.btns([crit.length > 0 ? ["Revisão ativa (" + crit.length + ")", function() review(g), "pri"] : null, ["Ver PGN", function() pgn(g)], ["Revanche", function() rematch(g)], ["Minhas partidas", home]]);
      if (crit.length == 0) Ui.p(analysisCount(g) == 0 ? "Sem lances seus analisados neste aparelho." : "Nenhum erro grande seu nesta partida.", "muted small");
    } else if (!g.sent) {
      var lm = lastMoveText(g);
      Ui.p(u.length == 0 ? "Partida criada. Envie o convite: seu amigo joga de Brancas e começa." : "Seu lance " + lm + " ainda não foi enviado.", "gold");
      Ui.btns([["Enviar pelo WhatsApp", function() sendWhats(g), "pri"], ["Outro app / copiar", function() shareOther(g)], u.length > 0 && p.turn != g.me && g.r == "" ? ["Desfazer", function() undo(g)] : null]);
      if (g.d == g.me) Ui.p("Sua oferta de empate vai junto com o envio.", "muted small");
    } else if (myTurn) {
      var lm = lastMoveText(g);
      Ui.p(u.length == 0 ? "Sua vez: você começa de Brancas." : oppName(g) + " jogou " + lm + ". Sua vez!", "gold");
      if (Engine.inCheck(p)) Ui.p("Você está em xeque.", "warn");
      if (g.d == -g.me) {
        Ui.p(oppName(g) + " ofereceu empate.", "warn");
        Ui.btns([["Aceitar empate", function() { g.r = "da"; g.sent = false; store(g); finalize(g); draw(); }, "pri"], ["Recusar (é só jogar)", function() { g.d = 0; store(g); draw(); }]]);
      }
    } else {
      Ui.p("Aguardando " + oppName(g) + " jogar (" + ago(g.t) + "). Quando ele responder, toque no link da conversa ou cole a mensagem aqui.", "");
      Ui.btns([["Colar jogada recebida", paste, "pri"], ["Lembrar pelo WhatsApp", function() sendWhats(g)]]);
    }
    if (busy) Ui.p("Registrando…", "muted");
    if (st == null && u.length >= 2) {
      var bs:Array<Array<Dynamic>> = [];
      if (g.d != g.me) bs.push(["Oferecer empate", function() { g.d = g.me; if (g.sent && p.turn != g.me) g.sent = false; store(g); draw(); }]);
      bs.push(["Virar", function() { flip = !(flip != null ? flip : g.me == -1); draw(); }]);
      bs.push(["Abandonar", function() Ui.modal("Abandonar a partida?", "Conta como derrota e seu amigo recebe o resultado.", [["Abandonar", function() { g.r = g.me == 1 ? "rw" : "rb"; g.sent = false; store(g); finalize(g); draw(); }, "warn"], ["Continuar", null, "pri"]]), "warn"]);
      Ui.btns(bs);
    } else if (st == null) Ui.btns([["Virar", function() { flip = !(flip != null ? flip : g.me == -1); draw(); }]]);
    if (st == null) Ui.p("Jogo justo: treinador, dicas e desequilíbrios ficam desligados até o fim da partida.", "muted small");
    var sans:Array<String> = [];
    var q = Engine.posFromFEN(Engine.START_FEN);
    for (x in u) { var m = Engine.uciToMove(q, x); sans.push(Engine.moveToSAN(q, m)); Engine.makeMove(q, m); q.stack = []; }
    var ml = App.movesText(sans);
    if (ml != "") Ui.p(ml, "muted small");
    var op = Book.detect(u);
    if (op != null) Ui.p("Abertura: " + op[1] + " (" + op[0] + ")", "muted small");
  }
  static function onMove(u4:String) {
    var g = cur;
    var p = posOf(g);
    if (busy || p.turn != g.me || !g.sent || status(g) != null) return;
    App.pickPromo(App.legalUcis(p), u4, function(uci) {
      var fen = Engine.toFEN(p);
      var ply = (g.ucis : Array<String>).length;
      (g.ucis : Array<String>).push(uci);
      if (g.d == -g.me) g.d = 0;
      g.sent = false;
      store(g);
      finalize(g);
      draw();
      /* análise em segundo plano, mostrada só no fim (jogo justo) */
      Think.run({ cmd: "fb", fen: fen, uci: uci, ucis: (g.ucis : Array<String>).slice(0, ply) }, function(fb:Dynamic) {
        if (fb == null || fb.err != null) return;
        Reflect.setField(g.recs, Std.string(ply), { fen: fen, uci: uci, san: fb.san, best: fb.best, bestSan: fb.bestSan, loss: fb.loss, grade: fb.grade, acc: fb.accuracy,
          problems: fb.problems, bestWhy: fb.bestWhy, bestLine: fb.bestLine });
        if ((fb.grade == "mistake" || fb.grade == "blunder") && fb.best != null) {
          var why:Array<String> = fb.problems;
          Profile.srsAdd("mine", "o" + g.g + "_" + ply, { fen: fen, best: fb.best, played: uci, why: why != null && why.length > 0 ? why[0] : "" });
        }
        Profile.save();
        if (cur == g && status(g) != null) draw();
      });
    });
  }
  static function undo(g:Dynamic) {
    var u:Array<String> = g.ucis;
    if (g.sent || u.length == 0) return;
    var ply = u.length - 1;
    u.pop();
    Reflect.deleteField(g.recs, Std.string(ply));
    g.sent = true;
    store(g); draw();
  }
  static function analysisCount(g:Dynamic):Int return Reflect.fields(g.recs).length;
  static function critical(g:Dynamic):Array<Dynamic> {
    var out:Array<Dynamic> = [];
    for (k in Reflect.fields(g.recs)) { var r:Dynamic = Reflect.field(g.recs, k); if (r.best != null && r.best != r.uci && r.loss >= 6) out.push(r); }
    out.sort(function(a, b) return Reflect.compare(b.loss, a.loss));
    return out.slice(0, 3);
  }
  static function review(g:Dynamic) {
    var tasks:Array<Dynamic> = [for (r in critical(g)) { k: "mine", id: "rv" + g.g + r.uci, fen: r.fen, best: r.best, played: r.uci, why: r.problems != null && r.problems.length > 0 ? r.problems[0] : "", dim: "tatica", rating: 1200 }];
    Drills.run("Revisão da partida", tasks, { back: function() show(g) });
  }
  static function pgn(g:Dynamic) {
    var st = status(g);
    var rec = { t: (g.created != null ? g.created : Date.now().getTime()), col: g.me, res: st != null ? st.score : 0.5, opp: oppName(g), ucis: g.ucis, tc: "", human: true };
    Ui.page("PGN da partida", function() show(g));
    Ui.p("Cole no Lichess (Ferramentas › Importar partida) para a análise completa.", "muted");
    var t = Study.pgn(rec);
    if (st == null) t = StringTools.replace(StringTools.replace(t, " 1/2-1/2\n", " *\n"), '[Result "1/2-1/2"]', '[Result "*"]');
    Ui.pre(t, "partida-amigo.pgn");
  }
  static function rematch(g:Dynamic) {
    var me = -g.me;
    var mineSide = { n: profName(mine(g).n), e: myElo(), p: Profile.d.phone };
    var o = opp(g);
    var other = { n: o.n, e: o.e, p: o.p };
    var ng:Dynamic = { g: newGid(), me: me, w: me == 1 ? mineSide : other, b: me == 1 ? other : mineSide, ucis: [], r: "", d: 0, t: Std.int(Date.now().getTime() / 1000), sent: me == 1, recs: {}, res: null, created: Date.now().getTime() };
    store(ng);
    show(ng);
    Ui.toast("Revanche criada: agora você joga de " + (me == 1 ? "Brancas" : "Pretas") + ".");
  }
}
#end
