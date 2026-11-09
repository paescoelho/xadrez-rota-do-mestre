package;

import Engine;
import Data;
import Brain;
#if flash
import UiFlash as Ui;
#else
import UiJs as Ui;
#end

class Game {
  public var pos:Pos; public var ucis:Array<String> = []; public var sans:Array<String> = []; public var keys:Array<String> = [];
  public var human:Int = 1; public var adaptive = true; public var level = 2; public var elo = 800; public var oppName = "";
  public var cat = "std"; public var base = 0.0; public var inc = 0.0; public var clock:Array<Float> = [0, 0];
  public var turnStart = 0.0; public var flip = false;
  public var rated = true; public var coach = true; public var process = false;
  public var recs:Array<Dynamic> = [];
  public var lastFb:Dynamic = null; public var lastRec:Dynamic = null; public var fbPending = false; public var note:Dynamic = null; public var cpuSan = "";
  public var over:Dynamic = null; public var evalW:Null<Float> = null;
  public var busy:String = null; public var hint:Dynamic = null; public var hintStage = 0;
  public var phase = ""; public var marks:Array<Int> = []; public var cands:Array<String> = []; public var procRows:Dynamic = null;
  public var imb:Dynamic = null; public var unrated:String = null; public var rc:Array<Int> = null; public var peek:Dynamic = null;
  public var crit:Array<Dynamic> = null; public var acc:Float = -1;
  public var threat:Dynamic = null; public var anl:Dynamic = null;
  /* toques nas peças neste lance (Mapa do pensamento) e fantasma (DNA de outro jogador ou de você no passado) */
  public var tp:Array<Array<Int>> = []; public var ghost:Dynamic = null; public var gKey:String = null; public var gTilt = false;
  /* v22: foco do painel, modo Aprendiz e histórico de informações (sem valor inicial, como na v22) */
  public var _feedFocus:String; public var learner:Dynamic; public var _archive:Array<Dynamic>; public var _lastPanelSnapshot:Dynamic; public var _lastRenderedCount:Int;
  public function new() {}
}

@:expose
class App {
  public static var G:Game = null;
  static var clockTimer:Dynamic = null;
  public static var opts:Dynamic = { opp: 0, cat: "std", color: 1, coach: true, process: false };
  public static var CAT_LABEL = ["std" => "Sem relógio", "rapid" => "Rápida 10+5", "classic" => "Clássica 30+20", "online" => "Amigos (WhatsApp)"];

  public static function start() {
    Profile.load(); Content.load(); Brain.init(); Evo.applyTheme();
    #if js
    Online.listenHash();
    if (Online.fromUrl()) return;
    #end
    Ui.intro(menu);
  }
  public static inline function now():Float return haxe.Timer.stamp() * 1000;

  /* ---------- utilidades ---------- */
  public static function legalUcis(p:Pos):Array<String> return [for (m in Engine.legalMoves(p)) Engine.moveToUCI(m)];
  public static function checkSq(p:Pos):Int return Engine.inCheck(p) ? p.king[Engine.sideIdx(p.turn)] : -1;
  public static function lastOf(uci:String):Array<Int> return uci == null ? null : [Engine.nameSq(uci.substr(0, 2)), Engine.nameSq(uci.substr(2, 2))];
  public static function san(fen:String, uci:String):String {
    var p = Engine.posFromFEN(fen); var m = Engine.uciToMove(p, uci);
    return m < 0 ? uci : Engine.moveToSAN(p, m);
  }
  public static function arrow(uci:String, col:Int):Array<Int> return [Engine.nameSq(uci.substr(0, 2)), Engine.nameSq(uci.substr(2, 2)), col];
  /* promoção: se houver mais de uma peça possível, pergunta */
  public static function pickPromo(legal:Array<String>, u4:String, cb:String->Void) {
    var c = [for (u in legal) if (u.substr(0, 4) == u4) u];
    if (c.length == 0) return;
    if (c.length == 1) { cb(c[0]); return; }
    Ui.modal("Promover para", null, [["Dama", function() cb(u4 + "q"), "pri"], ["Torre", function() cb(u4 + "r")], ["Bispo", function() cb(u4 + "b")], ["Cavalo", function() cb(u4 + "n")]]);
  }
  public static function howText(r:String):String {
    return switch (r) { case "mate": "xeque-mate"; case "stalemate": "afogamento"; case "material": "material insuficiente"; case "50": "regra dos 50 lances"; case "rep": "repetição tripla"; default: r; };
  }
  public static function pctTxt(x:Float):String return Std.string(Math.round(x)) + "%";
  public static function cpTxt(cp:Float):String {
    if (Math.abs(cp) >= Engine.MATE - 200) return cp > 0 ? "mate das Brancas" : "mate das Pretas";
    var v = Math.round(cp / 10) / 10;
    return (v > 0 ? "+" : "") + v;
  }
  public static function chanceOf(cpW:Float) {
    var w = Coach.winPct(cpW);
    Ui.chance(w, "Chances: Brancas " + pctTxt(w) + " · Pretas " + pctTxt(100 - w) + "  (" + cpTxt(cpW) + ")");
  }
  public static function gradeCls(g:String):String {
    return switch (g) { case "best", "great", "book", "forced": "good"; case "good": "good"; case "inaccuracy": "warn"; default: "bad"; };
  }
  static function clockTxt(ms:Float):String {
    if (ms < 0) ms = 0;
    var s = Std.int(ms / 1000); var m = Std.int(s / 60); s = s % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ---------- menu principal ---------- */
  public static function menu() {
    stopClock();
    var it:Array<Dynamic> = [];
    /* Jogar em destaque, fora da numeração; depois a rota na ordem ideal de evolução */
    it.push({ t: "Jogar", d: "Contra o computador, com treinador ao vivo", f: setupGame, wide: true, hero: true });
    if (G != null && G.over == null) { it[0].wide = false; it[0].d = "Com treinador ao vivo"; it.push({ t: "Continuar", d: G.oppName + " · " + CAT_LABEL.get(G.cat), f: showGame, hl: true, cont: true, ico: "cont" }); }
    else if (Profile.current != null) { it[0].wide = false; it[0].d = "Com treinador ao vivo"; it.push({ t: "Continuar", d: "Retomar a partida salva", f: restoreGame, hl: true, cont: true, ico: "cont" }); }
    var pl:Dynamic = Profile.d.place; var hist:Array<Dynamic> = Profile.d.hist;
    var dailyAll = true; for (x in Study.dailyPlan()) if (!Profile.dailyDone(x.id)) dailyAll = false;
    var next = (pl == null && hist.length == 0 && (Profile.d.pzN : Int) < 10) ? 1 : (!dailyAll ? 3 : 0);
    /* treinos agrupados no Centro de Treino (segundo menu) */
    var inTrain = next == 3;
    var route:Array<Dynamic> = [
      { t: "Nivelamento", d: (Profile.combined()[0] : Int) > 0 ? "Descubra seu nível" : "Comece pelo Nivelamento", f: Pages.placementIntro, ico: "lvl" },
      { t: "Centro de Treino", d: inTrain ? "Próximo passo: Plano do dia" : "Como pensar, trilha e treinos", f: training, ico: "ct", hl: inTrain }
    ];
    #if flash
    route.push({ t: "Como pensar", d: "Processo dos mestres", f: Pages.think });
    #end
    #if js
    route.push({ t: "Mapa do seu pensamento", d: "Analise seus GAPs", f: Mind.page, ico: "eye" });
    route.push({ t: "Seu maior adversário", d: "Você de 3 meses atrás", f: Dna.rival, ico: "ghost" });
    route.push({ t: "Meu DNA Enxadrista", d: "Exporte seu bot", f: Dna.home, ico: "dna" });
    var on = Online.myTurnCount();
    route.push({ t: "Jogar com amigo", d: on > 0 ? on + (on == 1 ? " partida esperando você" : " partidas esperando você") : "Online pelo WhatsApp", f: Online.home, hl: on > 0, ico: "whats" });
    #end
    if (route.length % 2 == 1) route[route.length - 1].lone = true;
    for (i in 0...route.length) {
      var r = route[i];
      if (i == 0 && next == 1) r.hl = true;
      it.push(r);
    }
    it.push({ t: "Painel de evolução", d: "Perfil em teia, evolução mês a mês e dicas", f: Pages.profile, wide: true, ico: "pnl", pnl: panelData() });
    it.push({ t: "História do xadrez", d: "1.500 anos · 6 jogos para jogar", f: Pages.history, wide: true, ico: "hist" });
    var cb = Profile.combined();
    var v:Int = cb[0];
    var info = v > 0 ? "Elo estimado " + v + " · meta " + Profile.nextGoal(v) : "Comece pelo Nivelamento";
    var st = Profile.streak();
    if (st > 0) info += " · " + st + (st == 1 ? " dia seguido" : " dias seguidos");
    #if js
    info = ""; /* o Elo fica no Painel de evolução e o convite ao Nivelamento no próprio botão */
    #end
    Ui.menu(it, info);
  }

  /* dados reais do botão Painel de evolução: Elo, variação no mês, meta e a constelação (radar de hoje e do mês passado) */
  static var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  static function panelData():Dynamic {
    var v:Int = Profile.combined()[0];
    var now = Date.now();
    var pm = new Date(now.getMonth() == 0 ? now.getFullYear() - 1 : now.getFullYear(), now.getMonth() == 0 ? 11 : now.getMonth() - 1, 15, 12, 0, 0);
    var ev:Dynamic = Reflect.field(Profile.d.evo, Profile.monthKey(pm.getTime()));
    var pe:Int = ev != null && ev.e != null ? ev.e : 0;
    var prevAx:Array<Dynamic> = ev != null && ev.dna != null ? ev.dna.ax : null;
    var goal = Profile.nextGoal(v); var lo = 0; for (gl in Profile.GOALS) if (gl <= v) lo = gl;
    return { elo: v, from: pe > 0 && v > 0 ? pe : (v > 0 ? Std.int(Math.max(0, v - 40)) : 0), delta: pe > 0 && v > 0 ? v - pe : 0, month: MES[now.getMonth()],
      goal: goal, pct: v > 0 ? Math.max(4, Math.min(100, (v - lo) * 100 / Math.max(1, goal - lo))) : 0,
      ax: [for (a in Evo.axes()) a.val], prev: prevAx };
  }

  /* ---------- Centro de Treino: segundo menu com os treinos ---------- */
  public static function training() {
    stopClock();
    var pl:Dynamic = Profile.d.place; var hist:Array<Dynamic> = Profile.d.hist;
    var dailyAll = true; for (x in Study.dailyPlan()) if (!Profile.dailyDone(x.id)) dailyAll = false;
    var placed = !(pl == null && hist.length == 0 && (Profile.d.pzN : Int) < 10);
    var it:Array<Dynamic> = [
      { t: "Como pensar", d: "Processo dos mestres", f: Pages.think },
      { t: "Trilha", d: "10 etapas até mestre", f: Pages.trail },
      { t: "Plano do dia", d: "15, 30 ou 60 min", f: Pages.daily },
      { t: "Táticas", d: "Temas, Storm, Rush", f: Pages.tactics },
      { t: "Finais", d: "Ganhar e defender", f: Pages.endgames },
      { t: "Aberturas", d: "Seu repertório", f: Pages.openings },
      { t: "Estruturas", d: "Planos de peões", f: Pages.structs },
      { t: "Partidas de mestres", d: "Adivinhe o lance", f: Pages.models }
    ];
    if (placed && !dailyAll) { it[2].hl = true; it[2].d = "Próximo passo"; }
    var info = !placed ? "Comece pelo Nivelamento no menu principal: ele ajusta os treinos ao seu nível"
      : (!dailyAll ? "Plano do dia é o seu próximo passo" : "Plano do dia concluído · siga a Trilha ou treine por tema");
    #if js
    Ui.hub("Centro de Treino", "Cada treino cria uma nova conexão.", menu, it, info);
    #else
    it.push({ t: "Voltar ao menu", d: "Menu principal", f: menu, wide: true });
    Ui.menu(it, info);
    #end
  }

  /* ---------- configuração da partida ---------- */
  public static function setupGame() {
    Ui.page("Nova partida", menu);
    var o:Dynamic = opts;
    var ad:Int = Profile.d.adapt;
    var opps:Array<Array<Dynamic>> = [["Mentor", 0, Std.string(ad)]];
    for (lv in 1...5) opps.push([Engine.LEVEL_NAMES[lv], lv, Std.string(Engine.LEVEL_ELO[lv])]);
    Ui.seg("Adversário", [for (x in opps) [x[0], function() { o.opp = x[1]; setupGame(); }, o.opp == x[1], x[2]]], 5,
      o.opp == 0 ? "Mentor: depois de cada lance do computador, toque na peça que ele moveu para ver o motivo da jogada. A força se adapta ao seu desempenho." : "Força fixa: bom para medir o seu progresso.");
    Ui.seg("Ritmo · cada um tem sua pontuação", [for (c in ["std", "rapid", "classic"]) [c == "std" ? "Sem relógio" : (c == "rapid" ? "Rápida 10+5" : "Clássica 30+20"), function() { o.cat = c; setupGame(); }, o.cat == c, ratingShort(c)]], 3);
    Ui.seg("Cor", [["Brancas", function() { o.color = 1; setupGame(); }, o.color == 1], ["Pretas", function() { o.color = -1; setupGame(); }, o.color == -1], ["Sorteio", function() { o.color = 0; setupGame(); }, o.color == 0]], 3);
    Ui.seg("Treinador", [["Comenta cada lance", function() { o.coach = true; setupGame(); }, o.coach], ["Só no fim", function() { o.coach = false; setupGame(); }, !o.coach],
      ["Processo de pensamento", function() { o.process = !o.process; setupGame(); }, o.process, o.process ? "ligado" : "desligado"]], 3,
      o.process ? "Antes de cada lance você marca as ameaças e 2 ou 3 candidatos; o treinador avalia como você pensou." : "Dica ou desfazer deixa a partida sem pontuação.");
    Ui.swatches("Tabuleiro", Evo.BOARD_THEMES, Profile.d.bt, function(id) { Evo.setTheme(id); setupGame(); });
    /* v21: aparência e som fixos para deixar mais espaço aos temas */
    if (Profile.d.ps != "lux" || Profile.d.snd != true) { Profile.d.ps = "lux"; Profile.d.snd = true; Profile.save(); }
    Evo.applyTheme();
    Ui.btns([["Começar partida", o.opp == 0 ? beginnerIntro : newGame, "pri wide"]]);
  }
  /* v21: regras básicas antes de jogar contra o Mentor */
  public static function beginnerIntro() {
    Ui.page("Aprenda antes de jogar", setupGame);
    Ui.p("Seu primeiro jogo de xadrez", "gold big");
    Ui.p("Objetivo: dar xeque-mate no rei adversário. Xeque é quando o rei está ameaçado; xeque-mate é quando ele não consegue escapar.");
    Ui.p("Você e o adversário jogam alternadamente. As brancas começam. Cada jogador tem 16 peças.", "muted");
    #if js
    var box = Ui.el("div", "intro-pieces", Ui.cur);
    for (x in [["♙", "Peão", "Avança uma casa; no primeiro movimento pode avançar duas. Captura uma casa na diagonal. Ao chegar ao fim, promove."], ["♖", "Torre", "Anda quantas casas quiser na horizontal ou vertical."], ["♘", "Cavalo", "Anda em L: duas casas numa direção e uma na perpendicular. Pode saltar peças."], ["♗", "Bispo", "Anda quantas casas quiser nas diagonais."], ["♕", "Dama", "Anda quantas casas quiser em qualquer direção."], ["♔", "Rei", "Anda uma casa em qualquer direção, mas nunca para uma casa atacada."]]) {
      var r = Ui.el("div", "intro-piece", box); Ui.el("span", "intro-glyph", r, x[0]); var t = Ui.el("div", "", r); Ui.el("strong", "", t, x[1]); Ui.el("div", "muted small", t, x[2]);
    }
    #end
    Ui.p("Como jogar: toque numa peça sua. O tabuleiro marca os destinos permitidos; toque na casa destacada para mover. As peças não podem atravessar outras, exceto o cavalo.", "gold");
    Ui.p("Dica mostra sugestões de lance, as ameaças do adversário e os desequilíbrios da posição. Depois de cada lance do computador, toque na peça que ele moveu para entender o motivo.", "muted");
    Ui.p("Regras especiais: roque protege o rei, en passant é uma captura especial de peão e promoção troca um peão ao alcançar a última fileira.", "muted small");
    Ui.btns([["Entendi · começar partida", newGame, "pri wide"], ["Voltar às opções", setupGame]]);
  }
  static function ratingShort(c:String):String {
    var r = Profile.R(c);
    return r.games == 0 ? "sem pontuação" : (r.elo + (Profile.isProvisional(c) ? "?" : ""));
  }

  public static function newGame() {
    var g = new Game();
    var o:Dynamic = opts;
    g.human = o.color == 0 ? (Math.random() < 0.5 ? 1 : -1) : o.color;
    g.adaptive = o.opp == 0; g.level = o.opp == 0 ? 0 : o.opp;
    g.elo = g.adaptive ? Profile.d.adapt : Engine.LEVEL_ELO[g.level];
    g.oppName = g.adaptive ? "Mentor" : Engine.LEVEL_NAMES[g.level];
    g.cat = o.cat; g.coach = o.coach; g.process = o.process;
    if (g.cat == "rapid") { g.base = 600000; g.inc = 5000; }
    if (g.cat == "classic") { g.base = 1800000; g.inc = 20000; }
    g.clock = [g.base, g.base];
    g.pos = Engine.posFromFEN(Engine.START_FEN);
    g.keys = [Engine.posKey(g.pos)];
    g.flip = g.human == -1;
    G = g;
    saveCurrent();
    showGame();
    if (g.pos.turn != g.human) haxe.Timer.delay(cpuMove, 400);
    else beginTurn();
  }
  /* duelo contra um fantasma: você de outro mês ou o clone de um amigo */
  public static function newGhostGame(dna:Dynamic, name:String, key:String, color:Int) {
    var g = new Game();
    var o:Dynamic = opts;
    g.human = color == 0 ? (Math.random() < 0.5 ? 1 : -1) : color;
    g.adaptive = false; g.level = 0; g.elo = dna.e; g.oppName = name;
    g.cat = o.cat; g.coach = o.coach; g.process = o.process;
    g.ghost = dna; g.gKey = key; g.rated = false; g.unrated = "Duelo: não muda o seu Elo, vale o placar.";
    if (g.cat == "rapid") { g.base = 600000; g.inc = 5000; }
    if (g.cat == "classic") { g.base = 1800000; g.inc = 20000; }
    g.clock = [g.base, g.base];
    g.pos = Engine.posFromFEN(Engine.START_FEN);
    g.keys = [Engine.posKey(g.pos)];
    g.flip = g.human == -1;
    G = g;
    saveCurrent();
    showGame();
    if (g.pos.turn != g.human) haxe.Timer.delay(cpuMove, 400);
    else beginTurn();
  }
  static function restoreGame() {
    var c:Dynamic = Profile.current;
    if (c == null) { menu(); return; }
    var g = new Game();
    g.human = c.human; g.adaptive = c.adaptive; g.level = c.level; g.elo = c.elo; g.oppName = c.oppName;
    g.cat = c.cat; g.base = c.base; g.inc = c.inc; g.clock = c.clock; g.rated = c.rated; g.coach = c.coach; g.process = c.process;
    g.unrated = c.unrated; g.ghost = c.ghost; g.gKey = c.gKey;
    g.pos = Engine.posFromFEN(Engine.START_FEN); g.keys = [Engine.posKey(g.pos)]; g.flip = g.human == -1;
    G = g;
    for (u in (c.ucis : Array<String>)) { var m = Engine.uciToMove(g.pos, u); if (m < 0) break; applyMove(m, u, Engine.moveToSAN(g.pos, m)); }
    showGame();
    if (g.pos.turn != g.human) cpuMove(); else beginTurn();
  }
  static function saveCurrent() {
    var g = G;
    if (g == null || g.over != null) { Profile.current = null; Profile.save(); return; }
    Profile.current = { ucis: g.ucis, human: g.human, adaptive: g.adaptive, level: g.level, elo: g.elo, oppName: g.oppName, cat: g.cat, base: g.base, inc: g.inc,
      clock: g.clock, rated: g.rated, coach: g.coach, process: g.process, unrated: g.unrated, ghost: g.ghost, gKey: g.gKey };
    Profile.save();
  }
  static function applyMove(m:Int, uci:String, s:String) {
    Engine.makeMove(G.pos, m); G.pos.stack = [];
    G.ucis.push(uci); G.sans.push(s); G.keys.push(Engine.posKey(G.pos));
  }
  static function tickClock() {
    var g = G;
    if (g.base <= 0) return;
    var i = g.pos.turn == 1 ? 0 : 1;
    g.clock[i] -= now() - g.turnStart;
    g.clock[i] += g.inc;
    g.turnStart = now();
  }
  static function stopClock() { Ui.cancel(clockTimer); clockTimer = null; }

  public static function showGame() {
    Ui.boardPage("Partida", menu);
    stopClock();
    if (G.base > 0 && G.over == null) clockTimer = Ui.every(250, clockTick);
    drawGame();
  }
  static function clockTick() {
    var g = G;
    if (g == null || g.over != null) { stopClock(); return; }
    drawBars();
    if (g.busy == null && !g.fbPending && g.pos.turn == g.human) {
      var i = g.human == 1 ? 0 : 1;
      if (g.clock[i] - (now() - g.turnStart) <= 0) { g.clock[i] = 0; finish(Engine.insufficient(g.pos) ? 0.5 : 0, "tempo esgotado"); }
    }
  }
  static function drawBars() {
    var g = G;
    var running = g.over == null && g.busy == null && !g.fbPending;
    function tm(c:Int):String {
      if (g.base <= 0) return "";
      var i = c == 1 ? 0 : 1; var v = g.clock[i];
      if (running && g.pos.turn == c && (c == g.human || g.busy != null)) v -= now() - g.turnStart;
      return "   ⏱ " + clockTxt(v);
    }
    #if js
    var hd = Ui.root != null ? Ui.root.querySelector(".hdr") : null;
    if (hd != null) {
      var opp = hd.querySelector(".game-opp");
      if (opp == null) { opp = js.Browser.document.createElement("span"); opp.className = "game-opp"; hd.appendChild(opp); }
      opp.textContent = g.oppName + " (" + g.elo + ")";
    }
    #end
    var top = g.oppName + " (" + g.elo + ")" + tm(-g.human);
    var me = "Você" + tm(g.human);
    var topOn = g.pos.turn != g.human && g.over == null; var botOn = g.pos.turn == g.human && g.over == null;
    if (g.flip != (g.human == -1)) Ui.bars(me, top, botOn, topOn) else Ui.bars(top, me, topOn, botOn);
  }
  static function beginTurn() {
    var g = G;
    g.turnStart = now(); g.tp = [];
    if (g.process && g.over == null) { g.phase = "threats"; g.marks = []; g.cands = []; }
    drawGame();
  }

  /* ---------- lances ---------- */
  static function userMove(u4:String) {
    var g = G;
    if (g.over != null || g.busy != null || g.fbPending || g.pos.turn != g.human || g.peek != null) return;
    pickPromo(legalUcis(g.pos), u4, function(uci) {
      if (g.process && g.phase == "cands") {
        if (g.cands.indexOf(uci) < 0) { if (g.cands.length >= 3) g.cands.shift(); g.cands.push(uci); }
        drawGame(); return;
      }
      if (g.process && g.phase == "threats") { Ui.toast("Primeiro marque as ameaças e toque em Pronto."); return; }
      playUser(uci);
    });
  }
  static function playUser(uci:String) {
    var g = G;
    g._feedFocus = null;
    var fenB = Engine.toFEN(g.pos); var ucisB = g.ucis.copy();
    var m = Engine.uciToMove(g.pos, uci);
    if (m < 0) return;
    var s = Engine.moveToSAN(g.pos, m);
    var spent = now() - g.turnStart;
    var left = g.base > 0 ? (g.clock[g.human == 1 ? 0 : 1] - spent) / g.base : -1.0;
    tickClock();
    var moveNo = g.pos.full;
    applyMove(m, uci, s);
    var rec:Dynamic = { ply: g.ucis.length - 1, no: moveNo, col: g.human, fen: fenB, uci: uci, san: s, fb: null, marks: g.marks.copy(), cands: g.cands.copy(), proc: g.process && g.phase == "play", ms: Math.round(spent), left: Math.round(left * 1000) / 1000, tp: g.tp.copy(), help: g.hint != null || g.threat != null };
    g.recs.push(rec);
    g.phase = ""; g.hint = null; g.hintStage = 0; g.imb = null; g.procRows = null; g.peek = null; g.note = null; g.threat = null;
    g.lastFb = null; g.lastRec = rec; g.fbPending = true;
    saveCurrent();
    drawGame();
    Think.run({ cmd: "fb", fen: fenB, uci: uci, ucis: ucisB }, function(fb:Dynamic) {
      rec.fb = fb;
      if (G != g) return;
      g.fbPending = false;
      if (fb != null && fb.err == null) {
        g.lastFb = fb;
        if (fb.hasEval) g.evalW = fb.evalAfter;
        if ((fb.grade == "mistake" || fb.grade == "blunder") && fb.best != null) {
          var why:Array<String> = fb.problems;
          Profile.srsAdd("mine", "m" + Std.int(Date.now().getTime() / 1000) + "_" + rec.ply, { fen: fenB, best: fb.best, played: uci, why: why != null && why.length > 0 ? why[0] : "" });
          Profile.save();
        }
        if (rec.proc && fb.best != null) {
          Think.run({ cmd: "proc", fen: fenB, marked: rec.marks, cands: rec.cands, played: uci, best: fb.best }, function(r:Dynamic) {
            if (G != g || r == null || r.rows == null) return;
            g.procRows = r.rows; rec.procRows = r.rows;
            var p:Array<Int> = Profile.d.proc; var okN = 0; var rows:Array<Array<Dynamic>> = r.rows;
            for (x in rows) if (x[0] == 1 || x[0] == true) okN++;
            p[0] += okN; p[1] += rows.length; Profile.save();
            drawGame();
          });
        }
      }
      if (!checkOver()) cpuMove(); else drawGame();
    });
  }
  static function cpuMove() {
    var g = G;
    if (g.over != null) return;
    g.busy = "O computador está pensando…"; g.turnStart = now();
    drawGame();
    var q:Dynamic = { cmd: "cpu", fen: Engine.toFEN(g.pos), keys: g.keys, human: g.human };
    if (g.ghost != null) { q.cmd = "ghost"; q.dna = g.ghost; q.ucis = g.ucis; q.tilt = g.gTilt; g.busy = g.oppName + " está pensando…"; }
    else if (g.adaptive || g.level < 4) q.elo = g.elo; else q.level = g.level;
    Think.run(q, function(r:Dynamic) {
      if (G != g || g.over != null) return;
      g.busy = null;
      if (r == null || r.uci == null) { checkOver(); drawGame(); return; }
      var m = Engine.uciToMove(g.pos, r.uci);
      if (m < 0) { drawGame(); return; }
      if (r.score != null) { var sc:Float = r.score; g.evalW = g.pos.turn == 1 ? sc : -sc; }
      if (g.ghost != null) g.gTilt = r.err == true;
      var completeComputerTurn = function() {
        if (G != g || g.over != null) return;
        g.busy = null;
        tickClock();
        g.cpuSan = (g.pos.turn == 1 ? g.pos.full + ". " : g.pos.full + "… ") + r.san;
        g.note = r.note;
        applyMove(m, r.uci, r.san);
        saveCurrent();
        if (!checkOver()) {
          beginTurn();
          #if js
          if (g.adaptive && g.ghost == null) js.Syntax.code("AprendizCoach.start({0},{1})", g, r);
          #end
        } else drawGame();
      };
      #if js
      g.busy = "O computador está movimentando a peça…";
      if (!js.Syntax.code("CpuPieceMotion.play({0},{1},{2})", g, r.uci, completeComputerTurn)) completeComputerTurn();
      #else
      completeComputerTurn();
      #end
    });
  }
  static function checkOver():Bool {
    var g = G;
    var st = Engine.gameStatus(g.pos, g.keys);
    if (!st.over) return false;
    var sc = st.winner == 0 ? 0.5 : (st.winner == g.human ? 1.0 : 0.0);
    finish(sc, howText(st.result));
    return true;
  }
  static function finish(score:Float, how:String) {
    var g = G;
    if (g.over != null) return;
    g.over = { score: score, how: how };
    g.busy = null; g.phase = "";
    stopClock();
    var userMoves = g.recs.length;
    #if js
    if (g.ghost != null && userMoves >= 3) Dna.record(g.gKey, score);
    #end
    if (g.rated && userMoves >= 3) g.rc = Profile.recordRated(g.cat, g.elo, score);
    else if (g.unrated == null) g.unrated = "Partida curta demais para valer pontos.";
    if (g.adaptive && userMoves >= 5) Profile.adaptAfter(score);
    var accs:Array<Float> = [];
    for (r in g.recs) if (r.fb != null && r.fb.accuracy != null && r.fb.grade != "forced") accs.push(r.fb.accuracy);
    if (accs.length > 0) { var s = 0.0; for (a in accs) s += a; g.acc = s / accs.length; }
    Profile.addHistory({ t: Date.now().getTime(), col: g.human, res: score, opp: g.oppName + " (" + g.elo + ")", oppElo: g.elo, cat: g.cat, tc: g.base > 0 ? Std.int(g.base / 1000) + "+" + Std.int(g.inc / 1000) : "",
      ucis: g.ucis.copy(), acc: g.acc >= 0 ? Math.round(g.acc) : null, how: how, rc: g.rc, rated: g.rc != null, s: Evo.summarize(g), gh: g.ghost != null ? g.gKey : null });
    Dna.snapshot();
    Profile.current = null; Profile.touch(); Profile.save();
    var cs = [for (r in g.recs) if (r.fb != null && r.fb.best != null && r.fb.best != r.uci && r.fb.loss >= 6) r];
    cs.sort(function(a, b) return Reflect.compare(b.fb.loss, a.fb.loss));
    g.crit = cs.slice(0, 3);
    g.crit.sort(function(a, b) return a.ply - b.ply);
    drawGame();
  }

  /* ---------- botões ---------- */
  static function doHint() {
    var g = G;
    if (g.over != null || g.busy != null || g.fbPending || g.pos.turn != g.human) return;
    g._feedFocus = "hint";
    if (g.rated) { g.rated = false; g.unrated = "Dica usada: esta partida não vale pontos."; saveCurrent(); }
    if (g.hint != null) { if (g.hintStage < 3) g.hintStage++; drawGame(); return; }
    g.busy = "O treinador está procurando uma dica…"; drawGame();
    Think.run({ cmd: "hint", fen: Engine.toFEN(g.pos) }, function(h:Dynamic) {
      if (G != g) return;
      g.busy = null; g.hint = h; g.hintStage = 1; drawGame();
    });
  }
  static function doThreat() {
    var g = G;
    if (g.over != null || g.busy != null || g.fbPending || g.pos.turn != g.human) return;
    g._feedFocus = "threat";
    if (g.rated) { g.rated = false; g.unrated = "Ajuda usada: esta partida não vale pontos."; saveCurrent(); }
    g.busy = "Procurando a ameaça do adversário…"; drawGame();
    Think.run({ cmd: "threat", fen: Engine.toFEN(g.pos) }, function(t:Dynamic) {
      if (G != g) return;
      g.busy = null; g.threat = t; drawGame();
    });
  }
  static function undo() {
    var g = G;
    if (g.over != null || g.busy != null || g.fbPending || g.recs.length == 0) return;
    if (g.rated) { g.rated = false; g.unrated = "Lance desfeito: esta partida não vale pontos."; }
    var last = g.recs.pop();
    var n:Int = last.ply;
    var ucis = g.ucis.slice(0, n);
    g.pos = Engine.posFromFEN(Engine.START_FEN); g.ucis = []; g.sans = []; g.keys = [Engine.posKey(g.pos)];
    for (u in ucis) applyMove(Engine.uciToMove(g.pos, u), u, Engine.moveToSAN(g.pos, Engine.uciToMove(g.pos, u)));
    g.lastFb = null; g.note = null; g.hint = null; g.procRows = null; g.peek = null; g.imb = null;
    saveCurrent();
    beginTurn();
  }
  static function doImb() {
    var g = G;
    if (g.busy != null || g.fbPending) return;
    g._feedFocus = g.imb == null ? "imbalance" : null;
    if (g.imb != null) { g.imb = null; drawGame(); return; }
    Think.run({ cmd: "imb", fen: Engine.toFEN(g.pos), color: g.human }, function(r:Dynamic) { if (G != g) return; g.imb = r; drawGame(); });
  }
  static function resign() {
    if (G.over != null) return;
    Ui.modal("Abandonar a partida?", "Conta como derrota.", [["Abandonar", function() finish(0, "abandono"), "warn"], ["Continuar jogando", null, "pri"]]);
  }
  static function toggleMark(s:Int) {
    var g = G;
    if (g.phase != "threats") return;
    var i = g.marks.indexOf(s);
    if (i >= 0) g.marks.splice(i, 1) else g.marks.push(s);
    drawGame();
  }

  /* ---------- desenho da partida ---------- */
  public static function drawGame() {
    var g = G; var b = Ui.board;
    if (b == null) return;
    var myTurn = g.over == null && g.busy == null && !g.fbPending && g.pos.turn == g.human;
    b.flip = g.flip; b.arrows = []; b.marks = [];
    if (g.peek != null) {
      b.fen = g.peek.fen; b.last = null; b.check = -1;
      b.arrows = [arrow(g.peek.uci, 1)];
      if (g.peek.fb != null && g.peek.fb.best != null && g.peek.fb.best != g.peek.uci) b.arrows.push(arrow(g.peek.fb.best, 0));
      b.legal = null;
    } else {
      b.fen = Engine.toFEN(g.pos);
      b.last = g.ucis.length > 0 ? lastOf(g.ucis[g.ucis.length - 1]) : null;
      b.check = checkSq(g.pos);
      b.legal = myTurn && g.phase != "threats" ? legalUcis(g.pos) : null;
      if (g.hint != null && g.hintStage >= 3 && myTurn) b.arrows.push(arrow(g.hint.uci, 3));
      if (g.hint != null && g.hintStage == 2 && myTurn) b.marks.push([Engine.nameSq(g.hint.uci.substr(0, 2)), 3]);
      for (s in g.marks) b.marks.push([s, 1]);
      if (g.threat != null && g.threat.uci != null && myTurn) b.arrows.push(arrow(g.threat.uci, 1));
      for (c in g.cands) b.arrows.push(arrow(c, 2));
    }
    b.blind = false;
    #if js
    b.showLost = true;
    b.sugg = g.peek == null && g.hint != null && g.hintStage >= 3 && myTurn ? Engine.nameSq(g.hint.uci.substr(2, 2)) : -1;
    b.hang = g.peek == null && myTurn && g.coach ? hanging(g.pos, g.human) : null;
    #end
    b.onMove = userMove;
    b.onSquare = (myTurn && g.phase == "threats") ? toggleMark : null;
    #if js
    b.onSel = myTurn && g.peek == null ? function(s:Int) { if (G == g && g.phase != "threats" && g.tp.length < 40) g.tp.push([s, Std.int(now() - g.turnStart)]); } : null;
    #end
    b.clearSel();
    b.draw();
    drawBars();

    #if js
    if (g._archive == null) g._archive = [];
    var previousSnapshot:Dynamic = g._lastPanelSnapshot != null ? g._lastPanelSnapshot : null;
    var moveCount = g.ucis.length;
    g._lastRenderedCount = moveCount;
    #end
    Ui.panel();
    #if js
    if (Ui.actionBar != null) Ui.actionBar.innerHTML = "";
    if (Ui.chanceBar != null) Ui.chanceBar.innerHTML = "";
    /* v21: provocação do Aprendiz, com prioridade máxima após cada lance do computador */
    if (g.adaptive && g.learner != null && g.peek == null && g.over == null && g.pos.turn == g.human) {
      var learnerStart = Ui.cur.children.length;
      js.Syntax.code("AprendizCoach.render({0})", g);
      eliteTag(learnerStart, "learner");
    }
    #end
    if (g.over != null) {
      var sc:Float = g.over.score;
      Ui.p((sc >= 1 ? "Vitória!" : (sc <= 0 ? "Derrota." : "Empate.")) + " (" + g.over.how + ")", "big " + (sc >= 1 ? "good" : (sc <= 0 ? "bad" : "gold")));
      if (g.rc != null) {
        var d = g.rc[1] - g.rc[0];
        var r = Profile.R(g.cat);
        Ui.p(CAT_LABEL.get(g.cat) + ": " + (g.rc[0] == 0 ? "" : g.rc[0] + " → ") + g.rc[1] + (g.rc[0] == 0 ? "" : " (" + (d >= 0 ? "+" : "") + d + ")") + (Profile.isProvisional(g.cat) ? "  · provisória (" + r.games + " de " + Profile.PROVISIONAL + " partidas)" : ""), "gold");
      } else if (g.unrated != null) Ui.p(g.unrated, "muted");
      if (g.acc >= 0) Ui.p("Sua precisão na partida: " + Math.round(g.acc) + "%", "");
      if (g.adaptive) Ui.p("Próxima força do Mentor: " + Profile.d.adapt, "muted");
      #if js
      if (g.ghost != null) Ui.p("Placar contra " + g.oppName + ": " + Dna.scoreTxt(g.gKey), "gold");
      var contadorMapa = Mind.games().length;
      Ui.p("Mapeamento mental e avaliação geral: " + contadorMapa + "/20 partidas analisadas" + (contadorMapa < 20 ? " · faltam " + (20 - contadorMapa) : " · amostra mínima concluída"), contadorMapa >= 20 ? "good small" : "gold small");
      var lv:Dynamic = (Profile.d.hist : Array<Dynamic>)[(Profile.d.hist : Array<Dynamic>).length - 1];
      if (lv != null && lv.s != null && lv.s.v != null) {
        var v:Dynamic = lv.s.v;
        if (v.nv > 0) Ui.p("Mapa do pensamento: em " + v.nv + (v.nv == 1 ? " lance" : " lances") + " o melhor era de uma peça em que você nem tocou.", "warn small");
        else if (v.op >= 5) Ui.p("Mapa do pensamento: nenhum erro grave por não ver o lance nesta partida.", "good small");
      }
      #end
      var nc = g.crit == null ? 0 : g.crit.length;
      var mapB:Array<Dynamic> = null;
      #if js mapB = ["Mapa do pensamento", Mind.page]; #end
      Ui.btns([nc > 0 ? ["Revisão ativa (" + nc + (nc == 1 ? " posição)" : " posições)"), startReview, "pri"] : null, ["Análise completa", analysis], mapB, ["Ver PGN", showPgn],
        g.ghost != null ? ["Revanche", function() newGhostGame(g.ghost, g.oppName, g.gKey, -g.human)] : null, ["Nova partida", setupGame, nc > 0 ? "" : "pri"], ["Menu", menu]]);
      if (nc == 0) Ui.p("Nenhum erro grande nesta partida: sem posições críticas para revisar.", "muted");
    } else if (g.busy != null) Ui.p(g.busy, "muted");
    else if (g.fbPending) Ui.p("O treinador está analisando seu lance…", "muted");
    else if (g.peek != null) { Ui.p("Posição antes do seu lance " + g.peek.san + ": seta vermelha = seu lance, verde = o mais indicado.", "gold"); Ui.btns([["Voltar à partida", function() { g.peek = null; drawGame(); }, "pri"]]); }
    else if (myTurn) {
      #if !js
      Ui.p(Engine.inCheck(g.pos) ? "Sua vez: você está em xeque!" : "Sua vez (" + (g.human == 1 ? "Brancas" : "Pretas") + ").", Engine.inCheck(g.pos) ? "warn" : "gold");
      #end
      /* v22: o indicador de turno fica ao lado das chances */
      if (g.process) {
        #if js var thinkingFrom = Ui.cur.children.length; #end
        if (g.phase == "threats") {
          Ui.p("Passo 1 · Ameaças: toque nas suas peças que o adversário está ameaçando (ou no seu rei, se estiver em xeque). Toque de novo para desmarcar.", "");
          Ui.btns([["Pronto (" + g.marks.length + " marcadas)", function() { g.phase = "cands"; drawGame(); }, "pri"], ["Nenhuma ameaça", function() { g.marks = []; g.phase = "cands"; drawGame(); }]]);
        } else if (g.phase == "cands") {
          Ui.p("Passo 2 · Candidatos: faça no tabuleiro 2 ou 3 lances que você considera (eles não são jogados). Depois escolha qual jogar.", "");
          if (g.cands.length > 0) {
            var bs:Array<Array<Dynamic>> = [for (c in g.cands) ["Jogar " + san(Engine.toFEN(g.pos), c), function() { g.phase = "play"; playUser(c); }, "pri"]];
            bs.push(["Limpar", function() { g.cands = []; drawGame(); }]);
            Ui.btns(bs);
          }
        }
        #if js eliteTag(thinkingFrom, "process"); #end
      }
    }
    if (g.over == null && g.peek == null) {
      var bs:Array<Array<Dynamic>> = [];
      bs.push(["Dica" + (g.hint != null && g.hintStage < #if js 5 #else 3 #end ? " +" : ""), doHint, myTurn ? "" : "off"]);
      bs.push(["Ameaça?", doThreat, myTurn && g.threat == null ? "" : "off"]);
      bs.push(["Desfazer", undo, myTurn && g.recs.length > 0 ? "" : "off"]);
      bs.push([g.imb != null ? #if js "Ocultar análise" #else "Ocultar desequilíbrios" #end : "Desequilíbrios", doImb, myTurn ? "" : "off"]);
      bs.push(["Virar", function() { g.flip = !g.flip; drawGame(); }]);
      bs.push(["Abandonar", resign, "warn"]);
      #if js
      var prevCur = Ui.cur;
      Ui.cur = Ui.actionBar != null ? Ui.actionBar : prevCur;
      Ui.btns(bs);
      Ui.cur = prevCur;
      #else
      Ui.btns(bs);
      #end
      if (g.unrated != null) Ui.p(g.unrated, "muted small");
    }
    if (g.peek == null && g.over == null) {
      if (g.evalW != null) {
        #if js
        var prevCur = Ui.cur;
        Ui.cur = Ui.chanceBar != null ? Ui.chanceBar : prevCur;
        chanceOf(g.evalW);
        Ui.cur = prevCur;
        #else
        chanceOf(g.evalW);
        #end
      }
    }
    /* comentário do treinador sobre o último lance */
    var fb = g.lastFb;
    if (fb != null && (g.coach || g.over != null) && g.peek == null) {
      var rec = g.lastRec;
      Ui.h("Seu lance " + rec.no + (rec.col == 1 ? ". " : "… ") + rec.san + " · " + fb.label);
      Ui.p(fb.headline, gradeCls(fb.grade));
      if (fb.bad) {
        Ui.ul(fb.problems, "bad");
        Ui.p("Mais indicado: " + fb.bestSan, "good");
        Ui.ul(fb.bestWhy);
        if (fb.bestLine != null && fb.bestLine != "") Ui.p("Linha: " + fb.bestLine, "muted");
        if (fb.conceptText != null) Ui.p(fb.conceptText[0] + ": " + fb.conceptText[1], "gold");
        else if (fb.tip != null) Ui.p(fb.tip, "gold");
      } else {
        Ui.ul(fb.good, "good");
        if (fb.altNote != null) Ui.p(fb.altNote, "muted");
      }
      var extra = "Chance antes " + pctTxt(fb.winBefore) + " → depois " + pctTxt(fb.winAfter) + " · precisão do lance " + pctTxt(fb.accuracy);
      Ui.p(extra + (fb.sf ? " · análise do Stockfish 19" : ""), "muted small");
      if (fb.masterNote != null) Ui.p(fb.masterNote, "muted small");
      #if js js.Syntax.code("EliteCoach.recommend({0})", g); #end
      if (fb.bad && g.over == null) Ui.btns([["Ver no tabuleiro", function() { g.peek = rec; drawGame(); }]]);
    }
    #if js var processFrom = Ui.cur.children.length; #end
    if (g.procRows != null && g.peek == null) {
      Ui.h("Seu processo de pensamento");
      var rows:Array<Array<Dynamic>> = g.procRows;
      for (r in rows) { var ok = r[0] == 1 || r[0] == true; Ui.p((ok ? "✓ " : "✗ ") + r[1], ok ? "good" : "bad"); }
    }
    #if js eliteTag(processFrom, "process"); #end
    if (g.note != null && g.over == null && g.peek == null #if js && !g.adaptive #end) {
      Ui.h("Computador jogou " + g.cpuSan);
      Ui.ul(g.note.reasons);
      Ui.ul(g.note.alerts, "warn");
    }
    #if js var threatFrom = Ui.cur.children.length; #end
    if (g.threat != null && myTurn) {
      Ui.h("Ameaça do adversário");
      var t = g.threat;
      if (t.check == true) Ui.p("Você está em xeque: a ameaça é imediata.", "warn");
      else if (t.none == true || t.gain < 80) Ui.p("Nenhuma ameaça séria: mesmo se você passasse a vez, ele não ganharia nada importante.", "good");
      else {
        var what = t.mate == true ? "dá xeque-mate" : (t.cap > 0 ? "captura " + ["", "um peão", "um cavalo", "um bispo", "uma torre", "a dama", "o rei"][t.cap] : (t.chk == true ? "dá um xeque forte" : "melhora muito a posição dele"));
        Ui.p("Se você ignorar, ele joga " + t.san + " e " + what + " (seta vermelha).", "bad");
        if (t.line != null && t.line != "") Ui.p("Linha: " + t.line, "muted small");
        Ui.p("Antes de escolher seu lance, confira se ele resolve essa ameaça.", "muted small");
      }
    }
    #if js eliteTag(threatFrom, "threat"); #end
    if (g.hint != null && myTurn) {
      #if js
      var hintFrom = Ui.cur.children.length;
      js.Syntax.code("EliteCoach.render({0})", g);
      eliteTag(hintFrom, "hint");
      #else
      Ui.h("Dica " + g.hintStage + " de 3");
      if (g.hintStage >= 1) Ui.p(g.hint.n1, "gold");
      if (g.hintStage >= 2) Ui.p(g.hint.n2, "gold");
      if (g.hintStage >= 3) { Ui.p("Lance sugerido: " + g.hint.san, "good"); Ui.ul(g.hint.reasons); }
      Ui.ul(g.hint.alerts, "warn");
      #end
    }
    #if js var imbalanceFrom = Ui.cur.children.length; #end
    if (g.imb != null && g.peek == null) {
      Ui.h("Desequilíbrios (método Silman)");
      var rows:Array<Array<Dynamic>> = g.imb.rows;
      for (r in rows) Ui.p(r[0] + ": " + r[2], r[1] == 1 ? "good" : (r[1] == -1 ? "bad" : ""));
      Ui.p("Plano sugerido:", "gold");
      Ui.ul(g.imb.plan);
    }
    #if js
    eliteTag(imbalanceFrom, "imbalance");
    /* ordena as novas mensagens antes de registrar o histórico e exibi-lo abaixo */
    js.Syntax.code("App.promoteRecentGameInfo({0})", g);
    /* a seção ativa é sempre a primeira; o histórico começa somente depois dela */
    if (Ui.panelEl != null && g.peek == null) {
      var activeParts:Array<String> = [];
      var nodes = Ui.panelEl.children;
      for (pi in 0...nodes.length) {
        var nd:Dynamic = nodes[pi];
        var pt:String = StringTools.trim(nd.innerText != null && nd.innerText != "" ? nd.innerText : (nd.textContent != null ? nd.textContent : ""));
        if (pt != "") activeParts.push(pt);
      }
      var activeText = activeParts.join("\n").substr(0, 4500);
      var signature = activeText;
      if (previousSnapshot != null && previousSnapshot.signature != signature && previousSnapshot.text != null && previousSnapshot.text != "") {
        var dup = false; for (e in g._archive) if (e.signature == previousSnapshot.signature) dup = true;
        if (!dup) {
          g._archive.unshift({ n: previousSnapshot.n, text: previousSnapshot.text, signature: previousSnapshot.signature });
          if (g._archive.length > 60) g._archive.resize(60);
        }
      }
      g._lastPanelSnapshot = { n: moveCount, text: activeText, signature: signature };
    }
    if (g._archive != null && g._archive.length > 0) {
      Ui.h("Histórico de informações anteriores");
      for (entry in g._archive) {
        var details = Ui.el("details", "game-history-entry", Ui.cur);
        Ui.el("summary", "", details, "Após " + entry.n + " meio-lances · tocar para rever");
        var pre = Ui.el("div", "game-history-text", details); pre.textContent = entry.text;
      }
    }
    #end
    var ml = movesText(g.sans);
    if (ml != "") Ui.p(ml, "muted small");
    var op = Book.detect(g.ucis);
    if (op != null) Ui.p("Abertura: " + op[1] + " (" + op[0] + ")", "muted small");
  }
  #if js
  /* v19: marca o bloco de ensino e a ordem de cada parte (o layout de 3 colunas reagrupa por bloco) */
  static function eliteTag(from:Int, group:String) {
    if (Ui.cur == null || Ui.cur.children == null) return;
    var items = Ui.cur.children;
    var ti = from;
    while (ti < items.length) { var it:js.html.Element = cast items[ti]; it.dataset.eliteGroup = group; it.dataset.eliteIndex = Std.string(ti - from); ti++; }
  }
  #end
  /* peças indefesas: atacadas pelo adversário e sem nenhuma defesa (o rei fica de fora: ele já tem o xeque) */
  public static function hanging(p:Pos, side:Int):Array<Int> {
    var out:Array<Int> = [];
    var b = p.board;
    for (sq in 0...64) {
      var pc = b[sq];
      if (pc == 0 || Engine.pColor(pc) != side || Engine.pType(pc) == Engine.KING) continue;
      if (!Engine.isAttacked(b, sq, -side)) continue;
      b[sq] = -pc; var defended = Engine.isAttacked(b, sq, side); b[sq] = pc;
      if (!defended) out.push(sq);
    }
    return out;
  }
  public static function movesText(sans:Array<String>):String {
    var s = "";
    for (i in 0...sans.length) { if (i % 2 == 0) s += (Std.int(i / 2) + 1) + ". "; s += sans[i] + " "; }
    return StringTools.trim(s);
  }
  static function showPgn() {
    var h:Array<Dynamic> = Profile.d.hist;
    var rec = h[h.length - 1];
    Ui.page("PGN da partida", showGame);
    Ui.p("Copie e cole no Lichess (Ferramentas › Importar partida) para analisar, ou guarde o arquivo.", "muted");
    Ui.pre(Study.pgn(rec), "partida.pgn");
    Ui.btns([["Voltar", showGame]]);
  }

  /* ---------- análise completa: gráfico, precisão dos dois lados e momentos decisivos ---------- */
  static var GRADES:Array<Array<Dynamic>> = [["Melhor ou excelente", 2], ["Bom", 5], ["Imprecisão", 10], ["Erro", 15], ["Gafe", 1000]];
  static function analysis() {
    var g = G;
    if (g.anl == null) {
      var fens:Array<String> = []; var p = Engine.posFromFEN(Engine.START_FEN); fens.push(Engine.toFEN(p));
      for (u in g.ucis) { Engine.makeMove(p, Engine.uciToMove(p, u)); p.stack = []; fens.push(Engine.toFEN(p)); }
      g.anl = { fens: fens, w: [], best: [], i: 0, running: false };
    }
    var a = g.anl;
    drawAnalysis();
    if (!a.running && a.i < (a.fens : Array<String>).length) {
      a.running = true;
      function step() {
        if (G != g) return;
        var fens:Array<String> = a.fens;
        if (a.i >= fens.length) { a.running = false; drawAnalysis(); return; }
        Think.run({ cmd: "anl", fen: fens[a.i] }, function(r:Dynamic) {
          if (G != g) return;
          (a.w : Array<Float>).push(r != null && r.w != null ? r.w : 0);
          (a.best : Array<String>).push(r != null ? r.best : null);
          if (r != null && r.sf == true) a.sfN = (a.sfN == null ? 0 : a.sfN) + 1;
          a.i++;
          if (a.i % 4 == 0 || a.i >= fens.length) drawAnalysis();
          step();
        });
      }
      step();
    }
  }
  static var anlShown = false;
  static function drawAnalysis() {
    var g = G; var a = g.anl;
    var fens:Array<String> = a.fens; var w:Array<Float> = a.w;
    Ui.page("Análise da partida", showGame);
    if (a.i < fens.length) { Ui.p("Analisando posição " + a.i + " de " + fens.length + "… (pode sair e voltar: a análise continua)", "muted"); Ui.bar("Progresso", a.i * 100 / fens.length, "gold", Math.round(a.i * 100 / fens.length) + "%"); }
    if (w.length < 2) return;
    var curve = [for (x in w) Coach.winPct(x)];
    Ui.h("Chance de vitória das Brancas, lance a lance");
    Ui.graph(curve);
    var n = w.length - 1;
    var cnt = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]; var accs:Array<Array<Float>> = [[], []];
    var moments:Array<Dynamic> = []; var brill:Array<Dynamic> = []; var nBr = [0, 0];
    var p = Engine.posFromFEN(Engine.START_FEN);
    for (k in 1...n + 1) {
      var s = (k % 2 == 1) ? 1 : -1; var si = s == 1 ? 0 : 1;
      var before = Coach.winPct(s * w[k - 1]); var after = Coach.winPct(s * w[k]);
      var loss = Math.max(0, before - after);
      var gi = 0; while (loss >= GRADES[gi][1]) gi++;
      cnt[si][gi]++;
      accs[si].push(Coach.moveAccuracy(loss));
      var u = g.ucis[k - 1]; var m = Engine.uciToMove(p, u);
      var sanTxt = (p.turn == 1 ? p.full + ". " : p.full + "... ") + Engine.moveToSAN(p, m);
      var bst:String = (a.best : Array<String>)[k - 1];
      if (loss >= 6 && bst != null && bst != u) moments.push({ k: k, loss: loss, san: sanTxt, side: s, best: bst, bestSan: Engine.moveToSAN(p, Engine.uciToMove(p, bst)), fen: fens[k - 1], uci: u });
      /* brilhante: o melhor lance (ou quase) que entrega material de verdade e mantém a posição boa */
      if (loss < 2 && before < 92 && after >= 45 && k < fens.length && sacrificed(fens[k], s)) { nBr[si]++; brill.push({ k: k, san: sanTxt, side: s, fen: fens[k - 1], uci: u }); }
      Engine.makeMove(p, m); p.stack = [];
    }
    function mean(x:Array<Float>):Float { if (x.length == 0) return 0; var t = 0.0; for (v in x) t += v; return t / x.length; }
    var me = g.human == 1 ? 0 : 1;
    Ui.stats([[Math.round(mean(accs[me])) + "%", "sua precisão"], [Math.round(mean(accs[1 - me])) + "%", "precisão do computador"], [Std.string(moments.length), "momentos decisivos"]]);
    Ui.h("Classificação dos lances (você · computador)");
    if (nBr[me] + nBr[1 - me] > 0) Ui.p("Brilhante (!!), sacrifício correto: " + nBr[me] + " · " + nBr[1 - me], "gold");
    for (gi in 0...GRADES.length) Ui.p(GRADES[gi][0] + ": " + cnt[me][gi] + " · " + cnt[1 - me][gi], gi <= 1 ? "good" : (gi == 2 ? "warn" : (gi >= 3 ? "bad" : "")));
    if (moments.length > 0) {
      moments.sort(function(x, y) return Reflect.compare(y.loss, x.loss));
      Ui.h("Momentos decisivos");
      Ui.items([for (mo in moments.slice(0, 6)) { t: mo.san + (mo.side == (g.human) ? " (você)" : " (computador)"), d: "Perdeu " + Math.round(mo.loss) + "% de chance. Melhor era " + mo.bestSan + ".", r: "ver", f: function() anlView(mo) }]);
    }
    var mine = [for (b in brill) if (b.side == g.human) b];
    if (mine.length > 0) {
      Ui.h("Seus lances brilhantes");
      Ui.items([for (b in mine) { t: b.san + " !!", d: "Você entregou material e o motor confirma: era o melhor caminho.", r: "ver", f: function() anlView({ san: b.san, fen: b.fen, uci: b.uci, best: b.uci, bestSan: b.san, loss: 0, brill: true }) }]);
    }
    var sfN:Int = a.sfN == null ? 0 : a.sfN;
    Ui.p(sfN >= fens.length - 1 ? "Notas do Stockfish 19 em todas as posições." : (sfN > 0 ? "Notas do Stockfish 19 em " + sfN + " de " + fens.length + " posições; nas demais, do motor do jogo." : "Notas do Stockfish 19 nas posições da base de aberturas; nas demais, do motor do jogo."), "muted small");
  }
  /* depois do lance de "side", o adversário ganha pelo menos uma peça menor (troca estática): houve entrega de material */
  static function sacrificed(fenAfter:String, side:Int):Bool {
    var p = Engine.posFromFEN(fenAfter);
    if (Engine.legalMoves(p).length == 0) return false;
    var best = 0;
    for (sq in 0...64) {
      var pc = p.board[sq];
      if (pc == 0 || Engine.pColor(pc) != side) continue;
      var t = Engine.pType(pc); if (t < 2 || t > 5) continue;
      var gn = Engine.see(p, sq, -side); if (gn > best) best = gn;
    }
    return best >= 250;
  }
  static function anlView(mo:Dynamic) {
    Ui.boardPage("Momento decisivo", drawAnalysis);
    var b = Ui.board;
    b.fen = mo.fen; b.flip = G.human == -1; b.last = null; b.check = checkSq(Engine.posFromFEN(mo.fen)); b.marks = []; b.blind = false;
    b.arrows = [arrow(mo.uci, 1), arrow(mo.best, 0)]; b.legal = null; b.onMove = null; b.onSquare = null; b.clearSel(); b.draw();
    Ui.bars("Antes do lance " + mo.san, "Vermelho: jogado · verde: melhor", false, true);
    Ui.panel();
    if (mo.brill == true) { b.arrows = [arrow(mo.uci, 0)]; b.draw(); Ui.bars("Antes do lance " + mo.san, "Seta verde: o seu lance brilhante", false, true); Ui.panel(); Ui.p(mo.san + " !! entrega material, mas o motor confirma que é o melhor lance.", "good"); Ui.p("Lances assim nascem de cálculo concreto: você viu além do valor das peças.", "muted"); Ui.btns([["Voltar à análise", drawAnalysis, "pri"]]); return; }
    Ui.p(mo.san + " perdeu " + Math.round(mo.loss) + "% de chance de vitória.", "bad");
    Ui.p("O melhor era " + mo.bestSan + " (seta verde).", "good");
    Ui.btns([["Voltar à análise", drawAnalysis, "pri"]]);
  }

  /* ---------- revisão ativa: 3 posições críticas ---------- */
  static var rv:Dynamic = null;
  static function startReview() {
    rv = { i: 0, tries: 0, state: "play", msg: "", ok: 0, judging: false };
    Ui.boardPage("Revisão ativa", showGame);
    drawReview();
  }
  static function drawReview() {
    var g = G; var c:Dynamic = g.crit[rv.i]; var b = Ui.board;
    b.fen = c.fen; b.flip = g.human == -1; b.last = null; b.marks = []; b.arrows = []; b.blind = false; b.onSquare = null;
    b.check = checkSq(Engine.posFromFEN(c.fen));
    b.legal = rv.state == "play" && !rv.judging ? legalUcis(Engine.posFromFEN(c.fen)) : null;
    b.onMove = reviewMove;
    if (rv.state != "play") { b.arrows = [arrow(c.uci, 1), arrow(c.fb.best, 0)]; }
    b.clearSel(); b.draw();
    Ui.bars("Posição crítica " + (rv.i + 1) + " de " + g.crit.length, "Você joga de " + (g.human == 1 ? "Brancas" : "Pretas"), false, true);
    Ui.panel();
    Ui.p("Lance " + c.no + ": na partida você jogou " + c.san + " e perdeu " + pctTxt(c.fb.loss) + " de chance de vitória. Encontre um lance melhor antes de ver a resposta.", "");
    if (rv.msg != "") Ui.p(rv.msg, rv.state == "ok" ? "good" : (rv.state == "fail" ? "bad" : "warn"));
    if (rv.judging) Ui.p("Conferindo seu lance…", "muted");
    if (rv.state != "play") {
      Ui.p("Mais indicado: " + c.fb.bestSan + " (seta verde). Seu lance na partida: seta vermelha.", "good");
      Ui.ul(c.fb.problems, "bad");
      Ui.ul(c.fb.bestWhy);
      if (c.fb.bestLine != null) Ui.p("Linha: " + c.fb.bestLine, "muted");
      var last = rv.i >= g.crit.length - 1;
      Ui.btns([[last ? "Concluir" : "Próxima posição", function() {
        if (last) { reviewEnd(); return; }
        rv.i++; rv.tries = 0; rv.state = "play"; rv.msg = ""; drawReview();
      }, "pri"]]);
    } else Ui.btns([["Mostrar resposta", function() { rv.state = "fail"; rv.msg = ""; drawReview(); }]]);
  }
  static function reviewMove(u4:String) {
    var c:Dynamic = G.crit[rv.i];
    pickPromo(legalUcis(Engine.posFromFEN(c.fen)), u4, function(uci) {
      if (uci == c.fb.best) { rv.state = "ok"; rv.ok++; rv.msg = "Isso! Você encontrou o lance mais indicado."; drawReview(); return; }
      if (uci == c.uci) { rv.tries++; rv.msg = "Esse foi o lance da partida. Procure outro."; if (rv.tries >= 2) rv.state = "fail"; drawReview(); return; }
      rv.judging = true; drawReview();
      Think.run({ cmd: "judge", fen: c.fen, uci: uci }, function(j:Dynamic) {
        rv.judging = false;
        var loss:Float = j.loss;
        if (loss <= 3) { rv.state = "ok"; rv.ok++; rv.msg = "Muito bom: " + san(c.fen, uci) + " é tão bom quanto o lance indicado."; }
        else { rv.tries++; rv.msg = san(c.fen, uci) + " também perde chance (" + pctTxt(loss) + "). " + (rv.tries >= 2 ? "Veja a resposta." : "Tente outra vez."); if (rv.tries >= 2) rv.state = "fail"; }
        drawReview();
      });
    });
  }
  static function reviewEnd() {
    Ui.page("Revisão concluída", showGame);
    Ui.p("Você acertou " + rv.ok + " de " + G.crit.length + " posições críticas.", "big gold");
    Ui.p("Os erros graves desta partida viraram exercícios: voltam em Táticas › Revisões do dia, no momento certo para fixar (algoritmo FSRS).", "");
    Ui.btns([["Nova partida", setupGame, "pri"], ["Menu", menu]]);
  }
}
