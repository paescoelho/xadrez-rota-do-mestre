package;

#if flash
import flash.net.SharedObject;
#end

/* Perfil do aluno (v4): pontuações por ritmo, quebra-cabeças, repetição espaçada, trilha, plano diário e metas.
   Pontuação de partidas no padrão Elo da FIDE:
   - 5 primeiras partidas de cada ritmo: provisória = média dos adversários + diferença pelo resultado (limite ±400);
   - depois: R' = R + K (S - E), com E = 1 / (1 + 10^((Radv - R)/400));
   - K = 40 até 30 partidas, 20 depois, 10 a partir de 2400. */
@:expose
class Profile {
  public static inline var PROVISIONAL = 5;
  public static var d:Dynamic = null;
  public static var saveOk:Bool = true;
  public static var current:Dynamic = null;
  public static var CATS = ["std", "rapid", "classic", "online"];
  public static var CAT_NAMES = ["Sem relógio", "Rápida", "Clássica", "Amigos (WhatsApp)"];
  #if flash
  static var so:SharedObject = null;
  #end
  #if js
  static inline var KEY = "xadrez_treinador_v4";
  static inline var OLD_KEY = "xadrez_treinador_v3";
  #end

  static function emptyR():Dynamic return { elo: 0, games: 0, peak: 0, w: 0, d: 0, l: 0, provOpp: [], provScore: [] };
  static function fresh():Dynamic {
    return { v: 4, r: { std: emptyR(), rapid: emptyR(), classic: emptyR(), online: emptyR() }, hist: [], pzElo: 1200, pzN: 0, pzOk: 0, pzSeen: [],
      srs: [], trail: [for (i in 0...10) { read: [], prog: [0, 0, 0, 0, 0], exam: false, best: 0 }],
      place: null, dims: { tatica: [0, 0], calculo: [0, 0], finais: [0, 0], abertura: [0, 0], tempo: [0, 0] }, themes: {},
      daily: { day: -1, done: [], streak: 0, last: -1, best: 0 }, model: [], storm: 0, adapt: 800, rep: { w: null, b1: null, b2: null },
      eg: {}, current: null, wood: null, stormBest: 0, proc: [0, 0], intro: false, last: null, stSeen: [], online: [], name: "", phone: "", webUrl: "", dailyMin: 30, rushBest: 0, ladder: 0, evo: {}, bt: "turquesa", ghost: [], clones: [], ps: "lux", snd: true };
  }
  /* completa campos que faltam (dados antigos) */
  static function fix(x:Dynamic):Dynamic {
    var f = fresh();
    for (k in Reflect.fields(f)) if (Reflect.field(x, k) == null) Reflect.setField(x, k, Reflect.field(f, k));
    for (c in CATS) if (Reflect.field(x.r, c) == null) Reflect.setField(x.r, c, emptyR());
    for (k in Reflect.fields(f.dims)) if (Reflect.field(x.dims, k) == null) Reflect.setField(x.dims, k, [0, 0]);
    var tr:Array<Dynamic> = x.trail;
    while (tr.length < 10) tr.push({ read: [], prog: [0, 0, 0, 0, 0], exam: false, best: 0 });
    return x;
  }
  /* converte o perfil das versões anteriores */
  static function fromOld(o:Dynamic):Dynamic {
    var x = fresh();
    if (o == null) return x;
    if (o.elo != null) {
      x.r.std = { elo: o.elo, games: o.games, peak: o.peak, w: o.w, d: o.d, l: o.l, provOpp: o.provOpp != null ? o.provOpp : [], provScore: o.provScore != null ? o.provScore : [] };
      if (o.hist != null) x.hist = o.hist;
      if (o.pzElo != null) { x.pzElo = o.pzElo; x.pzN = o.pzN; x.pzOk = o.pzOk; }
      if (o.pzSeen != null) x.pzSeen = o.pzSeen;
    }
    return x;
  }

  public static function load() {
    d = null;
    try {
      #if flash
      so = SharedObject.getLocal("xadrez_treinador_v4", "/");
      var sd:Dynamic = so.data;
      if (sd.d != null) d = sd.d;
      else {
        try { var old = SharedObject.getLocal("xadrez_treinador_v2", "/"); d = fromOld(old.data); } catch (e:Dynamic) {}
      }
      #elseif js
      if (!hasStorage()) { saveOk = false; }
      else {
        var raw = js.Browser.window.localStorage.getItem(KEY);
        if (raw != null) d = haxe.Json.parse(raw);
        else { var old = js.Browser.window.localStorage.getItem(OLD_KEY); if (old != null) d = fromOld(haxe.Json.parse(old)); }
      }
      #end
    } catch (e:Dynamic) { saveOk = false; }
    if (d == null) d = fresh();
    d = fix(d);
    if (d.v11ThemeApplied != true) { d.bt = "turquesa"; d.ps = "lux"; d.v11ThemeApplied = true; save(); }
    current = d.current;
  }
  #if js
  static function hasStorage():Bool {
    try { var s = js.Browser.window.localStorage; s.setItem("__t", "1"); s.removeItem("__t"); return true; } catch (e:Dynamic) { return false; }
  }
  #end
  public static function save() {
    if (d == null) return;
    d.current = current;
    try snapMonth() catch (e:Dynamic) {}
    try {
      #if flash
      if (so == null) return;
      var sd:Dynamic = so.data; sd.d = d; so.flush();
      #elseif js
      js.Browser.window.localStorage.setItem(KEY, haxe.Json.stringify(d));
      #end
      saveOk = true;
    } catch (e:Dynamic) { saveOk = false; }
  }
  public static function reset() { d = fresh(); current = null; save(); }

  /* ---------- evolução mês a mês: guarda a última foto de cada mês ---------- */
  public static function monthKey(t:Float):String { var dt = Date.fromTime(t); var m = dt.getMonth() + 1; return dt.getFullYear() + "-" + (m < 10 ? "0" : "") + m; }
  static function snapMonth() {
    var v:Int = combined()[0];
    var dims = ["tatica", "calculo", "finais", "abertura", "tempo"];
    var hasAny = v > 0; for (k in dims) if (dimPct(k) >= 0) hasAny = true;
    if (!hasAny) return;
    var x:Dynamic = { e: v };
    for (k in dims) Reflect.setField(x, k, dimPct(k));
    var mk = monthKey(Date.now().getTime());
    var old:Dynamic = Reflect.field(d.evo, mk);
    if (old != null && old.dna != null) x.dna = old.dna;
    Reflect.setField(d.evo, mk, x);
  }

  /* ---------- código de sincronização / backup ---------- */
  public static function exportCode():String {
    return "XCT4:" + haxe.crypto.Base64.encode(haxe.io.Bytes.ofString(haxe.Json.stringify(d)));
  }
  public static function importCode(txt:String):Bool {
    try {
      txt = StringTools.trim(txt);
      var json = txt;
      if (txt.indexOf("XCT4:") == 0) json = haxe.crypto.Base64.decode(txt.substr(5)).toString();
      var x:Dynamic = haxe.Json.parse(json);
      if (x.v == 4) d = fix(x); else if (x.elo != null) d = fromOld(x); else return false;
      current = d.current;
      save();
      return true;
    } catch (e:Dynamic) { return false; }
  }

  /* ---------- datas ---------- */
  public static function today():Int {
    var n = Date.now();
    var mid = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0);
    return Std.int(Math.floor(mid.getTime() / 86400000));
  }
  /* marca atividade de estudo no dia (sequência diária) */
  public static function touch() {
    var t = today(); var dl:Dynamic = d.daily;
    if (dl.last == t) return;
    dl.streak = (dl.last == t - 1) ? dl.streak + 1 : 1;
    dl.last = t;
    if (dl.streak > dl.best) dl.best = dl.streak;
    save();
  }
  public static function streak():Int { var dl:Dynamic = d.daily; return (dl.last == today() || dl.last == today() - 1) ? dl.streak : 0; }

  /* ---------- pontuação Elo ---------- */
  public static function R(cat:String):Dynamic return Reflect.field(d.r, cat == null ? "std" : cat);
  public static function expected(r:Float, opp:Float):Float return 1 / (1 + Math.pow(10, (opp - r) / 400));
  public static function kFactor(cat:String):Int { var r = R(cat); return r.games < 30 ? 40 : (r.elo >= 2400 ? 10 : 20); }
  public static function isProvisional(cat:String):Bool return R(cat).games < PROVISIONAL;
  static function performance(r:Dynamic):Int {
    var sumOpp = 0.0; var sc = 0.0; var po:Array<Int> = r.provOpp; var ps:Array<Float> = r.provScore;
    for (i in 0...po.length) { sumOpp += po[i]; sc += ps[i]; }
    var n = po.length; var p = sc / n;
    var dp = p <= 0.0 ? -400.0 : (p >= 1.0 ? 400.0 : -400 * Math.log(1 / p - 1) / Math.log(10));
    dp = Math.max(-400, Math.min(400, dp));
    return Std.int(Math.max(100, Math.round(sumOpp / n + dp)));
  }
  /* v67: pontuação Elo honesta e punitiva para derrotas.
     - Começa do seu Elo estimado (ou 800) e muda só pelo resultado: derrota SEMPRE tira pontos, vitória SEMPRE dá pontos.
     - K: 48 nas 5 primeiras partidas, 32 até 30 partidas, depois 20 (10 acima de 2400).
     - Derrota pesa 50% a mais e tira no mínimo 16 (provisória) ou 10 pontos; vitória dá no mínimo 2. */
  public static var START_DEFAULT = 800;
  public static function startElo():Int {
    var v = 0;
    try { var c:Array<Dynamic> = combined(); v = c[0]; } catch (e:Dynamic) {}
    if (v <= 0) v = START_DEFAULT;
    return Std.int(Math.max(400, Math.min(2000, v)));
  }
  public static function kOf(r:Dynamic):Int { var g:Int = r.games; return g < PROVISIONAL ? 48 : (g < 30 ? 32 : ((r.elo : Int) >= 2400 ? 10 : 20)); }
  public static function eloStep(r:Dynamic, opp:Int, score:Float):Int {
    var k = kOf(r);
    var delta = k * (score - expected(r.elo, opp));
    if (score <= 0) { delta *= 1.5; delta = Math.min(delta, (r.games : Int) < PROVISIONAL ? -16.0 : -10.0); }
    else if (score >= 1) delta = Math.max(delta, 2.0);
    return Std.int(Math.max(100, Math.round((r.elo : Float) + delta)));
  }
  public static function recordRated(cat:String, opp:Int, score:Float):Array<Int> {
    var r = R(cat);
    if ((r.games : Int) == 0 || (r.elo : Int) <= 0) r.elo = startElo();
    var before:Int = r.elo;
    var po:Array<Int> = r.provOpp; var ps:Array<Float> = r.provScore;
    if (po != null && po.length < PROVISIONAL) { po.push(opp); ps.push(score); }
    r.elo = eloStep(r, opp, score);
    r.games++;
    if (score >= 1) r.w++; else if (score <= 0) r.l++; else r.d++;
    if (r.elo > r.peak && r.games >= PROVISIONAL) r.peak = r.elo;
    r.v67 = true;
    touch();
    return [before, r.elo];
  }
  /* adversário adaptativo: sobe 60 quando você vence, desce 60 quando perde (alvo: ~50% de vitórias) */
  public static function adaptAfter(score:Float) {
    var a:Int = d.adapt;
    if (score >= 1) a += 60 else if (score <= 0) a -= 60;
    d.adapt = Std.int(Math.max(500, Math.min(2100, a)));
    save();
  }
  public static function addHistory(r:Dynamic) {
    var h:Array<Dynamic> = d.hist;
    h.push(r);
    while (h.length > 200) h.shift();
    save();
  }

  /* ---------- quebra-cabeças e mapa de fraquezas ---------- */
  public static function recordPuzzle(id:String, rating:Int, solved:Bool, themes:Array<String>, ms:Float):Array<Int> {
    var before:Int = d.pzElo;
    var k = d.pzN < 20 ? 40 : 20;
    d.pzElo = Std.int(Math.max(100, Math.round(d.pzElo + k * ((solved ? 1 : 0) - expected(d.pzElo, rating)))));
    d.pzN++; if (solved) d.pzOk++;
    var seen:Array<String> = d.pzSeen; seen.push(id); while (seen.length > 1500) seen.shift();
    if (themes != null) for (t in themes) addTheme(t, solved);
    addDim("tatica", solved);
    if (themes != null && (themes.indexOf("long") >= 0 || themes.indexOf("veryLong") >= 0 || themes.indexOf("mateIn3") >= 0)) addDim("calculo", solved);
    if (themes != null && themes.indexOf("endgame") >= 0) addDim("finais", solved);
    if (ms > 0) addDim("tempo", solved && ms <= 45000);
    if (!solved) srsAdd("pz", id, null);
    touch();
    save();
    return [before, d.pzElo];
  }
  public static function addTheme(t:String, ok:Bool) {
    var a:Array<Int> = Reflect.field(d.themes, t);
    if (a == null) { a = [0, 0]; Reflect.setField(d.themes, t, a); }
    if (ok) a[0]++; a[1]++;
  }
  public static function addDim(k:String, ok:Bool) {
    var a:Array<Int> = Reflect.field(d.dims, k);
    if (a == null) return;
    if (ok) a[0]++; a[1]++;
  }
  /* acerto por dimensão (0-100) ou -1 sem dados */
  public static function dimPct(k:String):Int {
    var a:Array<Int> = Reflect.field(d.dims, k);
    var pl:Dynamic = d.place;
    var base = (pl != null && Reflect.field(pl.dims, k) != null) ? Std.int(Reflect.field(pl.dims, k)) : -1;
    if (a == null || a[1] == 0) return base;
    var live = Std.int(Math.round(a[0] * 100 / a[1]));
    if (base < 0) return live;
    var w = Math.min(1, a[1] / 30);
    return Std.int(Math.round(base * (1 - w) + live * w));
  }
  public static function themePct(t:String):Int {
    var a:Array<Int> = Reflect.field(d.themes, t);
    return (a == null || a[1] == 0) ? -1 : Std.int(Math.round(a[0] * 100 / a[1]));
  }
  public static function weakestTheme(list:Array<String>):String {
    var best:String = null; var bv = 999.0;
    for (t in list) {
      var a:Array<Int> = Reflect.field(d.themes, t);
      var v = (a == null || a[1] < 3) ? 55.0 : a[0] * 100.0 / a[1];
      if (v < bv) { bv = v; best = t; }
    }
    return best;
  }
  public static function seenMap():Map<String, Bool> {
    var m = new Map<String, Bool>();
    var seen:Array<String> = d.pzSeen;
    for (x in seen) m.set(x, true);
    return m;
  }

  /* ---------- repetição espaçada (FSRS; INTERVALS fica para cartões antigos) ---------- */
  public static var INTERVALS = [1, 3, 7, 21];
  public static function srsAdd(kind:String, id:String, data:Dynamic) {
    var s:Array<Dynamic> = d.srs;
    for (c in s) if (c.id == id && c.k == kind) { c.st = 0; c.due = today() + 1; return; }
    s.push({ id: id, k: kind, due: today() + 1, st: 0, lap: 0, data: data });
    while (s.length > 600) s.shift();
  }
  public static function srsDue(kind:String):Array<Dynamic> {
    var t = today(); var out:Array<Dynamic> = [];
    var s:Array<Dynamic> = d.srs;
    for (c in s) if ((kind == null || c.k == kind) && c.st < 4 && c.due <= t) out.push(c);
    return out;
  }
  public static function srsCount(kind:String):Int return srsDue(kind).length;
  /* FSRS-5 (Free Spaced Repetition Scheduler, open-spaced-repetition): estabilidade S (dias até cair para 90% de lembrança)
     e dificuldade D (1 a 10) por cartão. Acerto = "Bom" (3), erro = "De novo" (1). Intervalo = S dias (retenção-alvo de 90%). */
  static var FW:Array<Float> = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  static function fsrsD0(g:Int):Float return Math.max(1, Math.min(10, FW[4] - Math.exp(FW[5] * (g - 1)) + 1));
  static function fsrsLevel(stab:Float):Int return stab < 3 ? 0 : (stab < 7 ? 1 : (stab < 21 ? 2 : (stab < 60 ? 3 : 4)));
  public static function fsrsReview(c:Dynamic, ok:Bool) {
    var g = ok ? 3 : 1; var t = today();
    var stab:Null<Float> = c.s; var dif:Null<Float> = c.df;
    if (stab == null || dif == null) {
      if (c.st == null || c.st == 0 || c.last == null) { stab = FW[g - 1]; dif = fsrsD0(g); }
      else { var iv = [1, 3, 7, 21, 60]; stab = iv[Std.int(Math.min(4, c.st))]; dif = 5; }
      if (c.last != null || (c.st != null && c.st > 0)) {
        /* cartão antigo (intervalos fixos): segue como revisão normal a partir da estimativa */
        var el = c.last != null ? Math.max(0, t - (c.last : Int)) : stab;
        stab = fsrsNext(stab, dif, el, g); dif = fsrsDiff(dif, g);
      }
    } else {
      var el:Float = c.last != null ? Math.max(0, t - (c.last : Int)) : stab;
      stab = fsrsNext(stab, dif, el, g); dif = fsrsDiff(dif, g);
    }
    c.s = Math.round(stab * 100) / 100; c.df = Math.round(dif * 100) / 100; c.last = t;
    var iv = Std.int(Math.max(1, Math.min(365, Math.round(stab))));
    if (!ok) { c.lap = (c.lap == null ? 0 : c.lap) + 1; iv = 1; }
    c.st = ok ? fsrsLevel(stab) : 0;
    c.due = t + iv;
  }
  static function fsrsDiff(d:Float, g:Int):Float {
    var dd = -FW[6] * (g - 3);
    var d1 = d + dd * (10 - d) / 9;
    var d2 = FW[7] * fsrsD0(4) + (1 - FW[7]) * d1;
    return Math.max(1, Math.min(10, d2));
  }
  static function fsrsNext(stab:Float, d:Float, el:Float, g:Int):Float {
    var r = Math.pow(1 + 19 / 81 * el / stab, -0.5);
    if (g == 1) {
      var sf = FW[11] * Math.pow(d, -FW[12]) * (Math.pow(stab + 1, FW[13]) - 1) * Math.exp(FW[14] * (1 - r));
      return Math.max(0.1, Math.min(stab, sf));
    }
    var hard = g == 2 ? FW[15] : 1.0; var easy = g == 4 ? FW[16] : 1.0;
    return stab * (Math.exp(FW[8]) * (11 - d) * Math.pow(stab, -FW[9]) * (Math.exp(FW[10] * (1 - r)) - 1) * hard * easy + 1);
  }
  public static function srsResult(kind:String, id:String, ok:Bool) {
    var s:Array<Dynamic> = d.srs;
    for (c in s) if (c.id == id && c.k == kind) fsrsReview(c, ok);
    touch();
    save();
  }
  public static function srsStats():Array<Int> {
    var s:Array<Dynamic> = d.srs; var learning = 0; var mastered = 0;
    for (c in s) if (c.st >= 4) mastered++ else learning++;
    return [learning, mastered, srsDue(null).length];
  }

  /* ---------- Elo único estimado ---------- */
  public static function combined():Array<Dynamic> {
    var parts:Array<Array<Dynamic>> = [];
    var bestGame = 0; var games = 0;
    for (c in CATS) { var r = R(c); if (r.games >= PROVISIONAL && r.elo > bestGame) bestGame = r.elo; games += r.games; }
    if (bestGame > 0) parts.push(["Partidas", bestGame, 0.5 * Math.min(1, games / 20)]);
    if (d.pzN >= 10) parts.push(["Quebra-cabeças", d.pzElo, 0.25 * Math.min(1, d.pzN / 60)]);
    var md:Array<Dynamic> = d.model;
    if (md.length > 0) {
      var s = 0.0; var n = 0;
      var i = md.length - 1;
      while (i >= 0 && n < 5) { s += md[i].perf; n++; i--; }
      parts.push(["Adivinhe o lance", Std.int(s / n), 0.15 * Math.min(1, md.length / 5)]);
    }
    var pl:Dynamic = d.place;
    if (pl != null) parts.push(["Teste de nivelamento", pl.est, parts.length == 0 ? 1.0 : 0.1]);
    var sw = 0.0; var sv = 0.0;
    for (p in parts) { sw += p[2]; sv += p[1] * p[2]; }
    var val = sw > 0 ? Std.int(Math.round(sv / sw)) : 0;
    return [val, parts];
  }
  public static var GOALS = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];
  public static function nextGoal(v:Int):Int { for (g in GOALS) if (g > v) return g; return 2600; }

  public static function category(r:Int):String {
    if (r <= 0) return "Sem pontuação";
    if (r < 1000) return "Iniciante";
    if (r < 1300) return "Amador";
    if (r < 1600) return "Jogador de clube";
    if (r < 1900) return "Avançado";
    if (r < 2200) return "Especialista";
    return "Elite";
  }

  /* ---------- trilha ---------- */
  public static function trailState(i:Int):Dynamic { var t:Array<Dynamic> = d.trail; return t[i]; }
  public static function stageUnlocked(i:Int):Bool { if (i == 0) return true; var pl:Dynamic = d.place; if (pl != null && pl.step - 1 >= i) return true; return trailState(i - 1).exam == true; }
  public static function egDone(id:String):Bool return Reflect.field(d.eg, id) == true;
  public static function setEgDone(id:String) { Reflect.setField(d.eg, id, true); touch(); save(); }
  /* plano diário: itens concluídos hoje */
  public static function dailyDone(id:String):Bool { var dl:Dynamic = d.daily; if (dl.day != today()) return false; var a:Array<String> = dl.done; return a.indexOf(id) >= 0; }
  public static function markDaily(id:String) {
    var dl:Dynamic = d.daily;
    if (dl.day != today()) { dl.day = today(); dl.done = []; }
    var a:Array<String> = dl.done; if (a.indexOf(id) < 0) a.push(id);
    touch(); save();
  }
}
