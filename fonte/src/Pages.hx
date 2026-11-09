package;

import Engine;
import Data;
#if flash
import UiFlash as Ui;
#else
import UiJs as Ui;
#end

class Pages {
  static function menu() App.menu();

  /* ---------- plano do dia ---------- */
  public static function daily() {
    Ui.page("Plano do dia", App.training);
    var plan = Study.dailyPlan();
    var tot = 0; var done = 0;
    for (x in plan) { tot += x.min; if (Profile.dailyDone(x.id)) done++; }
    var st = Profile.streak();
    var mins:Int = Profile.d.dailyMin == null ? 30 : Profile.d.dailyMin;
    Ui.btns([for (m in [15, 30, 60]) [m + " min", function() { Profile.d.dailyMin = m; Profile.save(); daily(); }, m == mins ? "sel" : ""]]);
    Ui.p("Cerca de " + tot + " minutos, montado com base no seu nível e no seu mapa de fraquezas (o ponto mais fraco recebe mais tempo).", "muted");
    Ui.stats([[done + "/" + plan.length, "feitos hoje"], [Std.string(st), st == 1 ? "dia seguido" : "dias seguidos"], [Std.string(Profile.d.daily.best), "recorde"]]);
    Ui.items([for (x in plan) { t: (Profile.dailyDone(x.id) ? "✓ " : "") + x.t, d: x.d, r: x.min + " min", ok: Profile.dailyDone(x.id), f: function() dailyGo(x) }]);
    if (done == plan.length) Ui.p("Plano de hoje concluído. Volte amanhã para manter a sequência!", "good");
  }
  static function dailyGo(x:Dynamic) {
    var id:String = x.id;
    var fin = function(_:Dynamic) { Profile.markDaily(id); daily(); };
    switch (id) {
      case "srs": Drills.run("Revisões do dia", Study.srsTasks(25), { back: daily, done: fin });
      case "tactic": Drills.run("Tática do dia", Study.themeTasks(x.theme, x.n), { back: daily, done: fin });
      case "calc":
        if (x.t.indexOf("Storm") >= 0) Drills.run("Puzzle Storm", [Study.stormTask(Std.int(Math.max(400, (Profile.d.pzElo : Int) - 350)), null)], { storm: true, back: daily, done: fin });
        else Drills.run("Cálculo do dia", Study.calcTasks(4, (Profile.d.pzElo : Int) - 250, (Profile.d.pzElo : Int) + 100), { back: daily, done: fin });
      case "endgame": Drills.endgame(x.eg, daily, function(ok) { if (ok) Profile.markDaily(id); daily(); });
      case "opening":
        var t = Study.repDue(2);
        if (Study.myReps().length == 0) openings();
        else if (t.length == 0) { Profile.markDaily(id); Ui.toast("Nenhuma linha vence hoje."); daily(); }
        else Drills.run("Repertório", t, { back: daily, done: fin });
      case "game": App.opts.cat = (Profile.d.dailyMin : Int) >= 60 ? "classic" : "rapid"; App.opts.opp = 0; Profile.markDaily(id); App.setupGame();
      case "model":
        Profile.markDaily(id);
        var lvl:Int = Profile.combined()[0];
        var list = Models.of(lvl >= 1600 ? "Campeões mundiais" : "Clássicos");
        if (list.length == 0) list = Models.of("Clássicos");
        var gm = list[Std.random(list.length)];
        Drills.model(gm, gm.result == "0-1" ? -1 : 1, daily);
      default: daily();
    }
  }

  /* ---------- trilha ---------- */
  public static function trail() {
    Ui.page("Trilha: do zero ao mestre", App.training);
    Ui.p("Dez etapas, do primeiro lance ao nível de mestre, no estilo do Método dos Passos: lições curtas, exercícios obrigatórios e uma prova (8 de 10) para avançar. O teste de nivelamento pode liberar etapas.", "muted");
    var tr = Content.trail();
    var rows:Array<Dynamic> = [];
    for (i in 0...tr.length) {
      var s:Dynamic = tr[i]; var ts = Profile.trailState(i);
      var un = Profile.stageUnlocked(i);
      var k = i;
      rows.push({ t: (ts.exam == true ? "✓ " : (un ? "" : "🔒 ")) + s.name, d: s.goal, r: ts.exam == true ? "aprovado" : (un ? stageProgress(i) : "bloqueada"), ok: ts.exam == true, dis: !un, f: function() stage(k) });
    }
    Ui.items(rows);
  }
  static function stageProgress(i:Int):String {
    var s:Dynamic = Content.trail()[i]; var ts = Profile.trailState(i);
    var n = 0; var tot = 0;
    var ls:Array<Dynamic> = s.lessons; var rd:Array<Int> = ts.read;
    tot += ls.length; n += rd.length;
    var tk:Array<Dynamic> = s.tasks; var pr:Array<Int> = ts.prog;
    for (j in 0...tk.length) { tot++; if (taskDone(i, j)) n++; }
    return Math.round(n * 100 / tot) + "%";
  }
  static function taskDone(i:Int, j:Int):Bool {
    var s:Dynamic = Content.trail()[i]; var t:Dynamic = (s.tasks : Array<Dynamic>)[j];
    var tp:String = t.t;
    if (tp == "eg") return Profile.egDone(t.id);
    if (tp == "md") { var md:Array<Dynamic> = Profile.d.model; Models.load(); for (x in md) { var gm = Models.list[x.g]; if (gm != null && gm.cat == t.cat && x.pct >= 50) return true; } return false; }
    var pr:Array<Int> = Profile.trailState(i).prog;
    return pr[j] == 1;
  }
  public static function stage(i:Int) {
    var s:Dynamic = Content.trail()[i]; var ts = Profile.trailState(i);
    Ui.page(s.name, trail);
    Ui.p(s.goal, "gold");
    Ui.h("Lições");
    var ls:Array<Array<String>> = s.lessons; var rd:Array<Int> = ts.read;
    Ui.items([for (j in 0...ls.length) { t: (rd.indexOf(j) >= 0 ? "✓ " : "") + ls[j][0], d: null, ok: rd.indexOf(j) >= 0, f: function() lesson(i, j) }]);
    Ui.h("Exercícios obrigatórios");
    var tk:Array<Dynamic> = s.tasks;
    var rows:Array<Dynamic> = [];
    for (j in 0...tk.length) {
      var t:Dynamic = tk[j];
      rows.push({ t: (taskDone(i, j) ? "✓ " : "") + t.label, d: taskHint(t), ok: taskDone(i, j), f: function() stageTask(i, j) });
    }
    Ui.items(rows);
    var allRead = rd.length >= ls.length;
    var allTasks = true; for (j in 0...tk.length) if (!taskDone(i, j)) allTasks = false;
    Ui.h("Prova da etapa");
    if (ts.exam == true) Ui.p("Aprovado (" + ts.best + "/10). " + (i < 5 ? "A próxima etapa está liberada." : "Você concluiu a trilha!"), "good");
    else if (!allRead || !allTasks) Ui.p("Leia todas as lições e conclua os exercícios para liberar a prova (10 problemas, precisa acertar 8).", "muted");
    Ui.btns([["Fazer a prova", function() exam(i), allRead && allTasks ? "pri" : "off"]]);
    if (!allRead || !allTasks) Ui.btns([["Fazer a prova mesmo assim (treino)", function() exam(i)]]);
  }
  static function taskHint(t:Dynamic):String {
    var tp:String = t.t;
    return switch (tp) {
      case "pz": "Precisa acertar 75%. Faixa " + t.min + "-" + t.max + ".";
      case "calc": "Sem mover as peças. Precisa acertar 75%.";
      case "eg": "Contra o motor, que defende perfeitamente.";
      case "rep": "Escolha seu repertório em Aberturas.";
      case "st": "Leia e resolva o exercício de " + t.n + " estruturas.";
      case "md": "Em Partidas de mestres › " + t.cat + ".";
      default: "";
    };
  }
  static function lesson(i:Int, j:Int) {
    var s:Dynamic = Content.trail()[i]; var ls:Array<Array<String>> = s.lessons;
    Ui.page(ls[j][0], function() stage(i));
    Ui.p(ls[j][1], "");
    var rd:Array<Int> = Profile.trailState(i).read;
    if (rd.indexOf(j) < 0) { rd.push(j); Profile.touch(); Profile.save(); }
    var bs:Array<Array<Dynamic>> = [];
    if (j < ls.length - 1) bs.push(["Próxima lição", function() lesson(i, j + 1), "pri"]);
    bs.push(["Voltar à etapa", function() stage(i)]);
    Ui.btns(bs);
  }
  static function stageTask(i:Int, j:Int) {
    var s:Dynamic = Content.trail()[i]; var t:Dynamic = (s.tasks : Array<Dynamic>)[j];
    var tp:String = t.t;
    var back = function() stage(i);
    var mark = function() { var pr:Array<Int> = Profile.trailState(i).prog; pr[j] = 1; Profile.save(); };
    switch (tp) {
      case "pz", "calc":
        Drills.run(t.label, Study.trailTasks(i, j), { back: back, done: function(res:Array<Dynamic>) {
          var ok = 0; for (x in res) if (x.ok) ok++;
          var pass = ok >= Math.ceil(res.length * 0.75);
          if (pass) mark();
          Ui.page(t.label, back);
          Ui.p("Você acertou " + ok + " de " + res.length + ".", "big " + (pass ? "good" : "bad"));
          Ui.p(pass ? "Exercício concluído!" : "Precisa de 75% para concluir. Os erros voltam nas revisões; tente de novo com outros problemas.", "");
          Ui.btns([["Voltar à etapa", back, "pri"], pass ? null : ["Tentar de novo", function() stageTask(i, j)]]);
        }});
      case "eg": Drills.endgame(t.id, back, function(ok) back());
      case "md": modelCat(t.cat);
      case "rep":
        if (Study.myReps().length == 0) { Ui.toast("Primeiro escolha seu repertório."); openings(); return; }
        var tasks = Study.repDue(3);
        if (tasks.length == 0) { var rs = Study.myReps(); tasks = [for (k in 0...3) Study.repTask(rs[k % rs.length], Std.int(k / rs.length))]; }
        Drills.run("Repertório", tasks, { back: back, done: function(res:Array<Dynamic>) { mark(); back(); } });
      case "st":
        var seen:Array<String> = Profile.d.stSeen == null ? [] : Profile.d.stSeen;
        if (seen.length >= t.n) { mark(); back(); return; }
        Ui.toast("Estude " + t.n + " estruturas (já estudou " + seen.length + ")."); structs();
      default: back();
    }
  }
  static function exam(i:Int) {
    var back = function() stage(i);
    Drills.run("Prova · " + Content.trail()[i].name, Study.trailExam(i), { back: back, done: function(res:Array<Dynamic>) {
      var ok = 0; for (x in res) if (x.ok) ok++;
      var ts = Profile.trailState(i);
      if (ok > ts.best) ts.best = ok;
      var pass = ok >= Study.EXAM_PASS;
      if (pass) ts.exam = true;
      Profile.touch(); Profile.save();
      Ui.page("Resultado da prova", back);
      Ui.p(ok + " de " + res.length + (pass ? " · aprovado!" : " · ainda não"), "big " + (pass ? "good" : "bad"));
      Ui.p(pass ? (i < 5 ? "Etapa concluída. A próxima está liberada." : "Você concluiu a trilha inteira. Agora é jogar partidas e torneios!") : "Precisa de " + Study.EXAM_PASS + " acertos. Revise as lições e os erros (eles voltam nas revisões) e tente de novo.", "");
      Ui.btns([["Voltar à trilha", trail, "pri"]]);
    }});
  }

  /* ---------- táticas ---------- */
  public static function tactics() {
    Ui.page("Táticas", App.training);
    var pz:Int = Profile.d.pzElo;
    var due = Profile.srsCount(null);
    var ss = Profile.srsStats();
    Ui.stats([[Std.string(pz), "pontuação"], [Std.string(due), "revisões hoje"], [Std.string(Profile.d.stormBest), "recorde Storm"]]);
    var back = tactics;
    var mine = 0; var cards:Array<Dynamic> = Profile.d.srs; for (c in cards) if (c.k == "mine" && c.st < 4) mine++;
    Ui.items([
      { t: "Revisões do dia", d: "Repetição espaçada (algoritmo FSRS): cada erro volta no dia em que você estaria esquecendo. " + ss[0] + " em aprendizado, " + ss[1] + " dominados.", r: due + "", f: function() Drills.run("Revisões do dia", Study.srsTasks(30), { back: back }) },
      { t: "Treino misto", d: "10 problemas perto da sua pontuação.", r: "10", f: function() Drills.run("Treino misto", Study.themeTasks(null, 10), { back: back }) },
      { t: "Trilhas por tema", d: "Garfo, cravada, mate no corredor... com seu acerto em cada tema.", r: "", f: themes },
      { t: "Puzzle Storm", d: "3 minutos, o máximo de acertos. Cada erro custa 10 segundos.", r: "3 min", f: function() Drills.run("Puzzle Storm", [Study.stormTask(Std.int(Math.max(400, pz - 350)), null)], { storm: true, back: back }) },
      { t: "Cálculo sem mover as peças", d: "As peças não andam: calcule a combinação inteira de cabeça.", r: "5", f: function() Drills.run("Cálculo às cegas", Study.calcTasks(5, pz - 250, pz + 100), { back: back }) },
      { t: "Puzzle Rush (3 vidas)", d: "Problemas cada vez mais difíceis, sem relógio. Três erros e acabou. Recorde: " + Profile.d.rushBest + ".", r: "", f: function() Drills.run("Puzzle Rush", [Study.stormTask(Std.int(Math.max(400, pz - 500)), null)], { rush: true, back: back }) },
      { t: "Escada de mates", d: "Mate em 1, depois em 2, depois em 3: 12 degraus.", r: "12", f: function() Drills.run("Escada de mates", Study.ladderTasks(), { back: back }) },
      { t: "Desafio por faixa", d: "Escolha a dificuldade, de 400 a 2600, e resolva 10 problemas.", r: "", f: bands },
      { t: "Woodpecker", d: "O mesmo conjunto de 30 problemas em ciclos, cada vez mais rápido.", r: woodInfo(), f: wood },
      { t: "Seus erros de partida", d: "Gafes e erros das suas partidas viram exercícios (estão nas revisões).", r: mine + "", f: function() {
        var t = [for (x in Study.srsTasks(200)) if (x.k == "mine") x];
        if (t.length == 0) { var all:Array<Dynamic> = []; for (c in cards) if (c.k == "mine") { var dd:Dynamic = c.data; all.push({ k: "mine", id: c.id, fen: dd.fen, best: dd.best, played: dd.played, why: dd.why, srs: true, dim: "tatica", rating: 1200 }); } t = all.slice(-10); }
        Drills.run("Seus erros", t, { back: back });
      } }
    ]);
  }
  static function bands() {
    Ui.page("Desafio por faixa", tactics);
    Ui.p("Escolha a faixa de dificuldade. A sua pontuação atual é " + Profile.d.pzElo + ".", "muted");
    var rows:Array<Dynamic> = [];
    var lo = 400;
    while (lo < 2600) { var a = lo; rows.push({ t: a + " a " + (a + 200), d: bandName(a), r: "10", f: function() Drills.run("Faixa " + a + "-" + (a + 200), Study.pzTasks(Puzzles.pick(null, a, a + 200, 10, Profile.seenMap()), false, "tatica"), { back: bands }) }); lo += 200; }
    Ui.items(rows);
  }
  static function bandName(a:Int):String return a < 800 ? "Iniciante" : (a < 1200 ? "Amador" : (a < 1600 ? "Clube" : (a < 2000 ? "Avançado" : (a < 2300 ? "Mestre" : "Grande mestre"))));
  static function woodInfo():String { var w:Dynamic = Profile.d.wood; return w == null ? "novo" : "ciclo " + (w.cycle + 1); }
  static function wood() {
    var w = Study.woodSet();
    var times:Array<Float> = w.times; var scores:Array<Int> = w.scores;
    var ids:Array<String> = w.ids; var n = ids.length;
    Ui.page("Woodpecker", tactics);
    Ui.p("Método dos pica-paus (Smith e Tikkanen): resolva o mesmo conjunto várias vezes. A meta de cada ciclo é a metade do tempo do anterior, sem perder acertos: os padrões viram reflexo.", "muted");
    Ui.p("Conjunto atual: " + (w.name != null ? w.name : "Misto no seu nível") + " · " + n + " problemas", "gold");
    var last = times.length > 0 ? times[times.length - 1] : 0.0;
    var goal = last > 0 ? Math.max(15000.0 * Math.max(1, n / 10), last / 2) : 0.0;
    var st:Array<Array<String>> = [[Std.string(times.length), times.length == 1 ? "ciclo feito" : "ciclos feitos"]];
    if (last > 0) st.push([fmtT(last), "último ciclo"]);
    if (goal > 0) st.push([fmtT(goal), "meta do próximo"]);
    Ui.stats(st);
    for (i in 0...times.length) {
      var ok = i == 0 || times[i] <= times[i - 1] / 2 + 30000;
      Ui.p("Ciclo " + (i + 1) + ": " + scores[i] + "/" + n + " em " + fmtT(times[i]) + (i > 0 ? (ok ? " · meta batida" : " · acima da meta") : ""), i > 0 && ok ? "good" : "");
    }
    if (times.length >= 6 || (times.length >= 3 && last <= 60000 * Math.max(1, n / 15))) Ui.p("Este conjunto já está automático. Comece um novo para aprender outros padrões.", "good");
    Ui.btns([["Começar ciclo " + (times.length + 1), function() {
      var t0 = App.now();
      Drills.run("Woodpecker · ciclo " + (times.length + 1), Study.woodTasks(), { back: wood, done: function(res:Array<Dynamic>) {
        var ok = 0; for (x in res) if (x.ok) ok++;
        if (res.length >= n) { times.push(App.now() - t0); scores.push(ok); w.cycle = times.length; Profile.save(); }
        wood();
      } });
    }, "pri"], ["Novo conjunto", woodNew]]);
  }
  static function fmtT(ms:Float):String { var sec = Math.round(ms / 1000); if (sec < 60) return sec + " s"; var m = Math.floor(sec / 60); var r = sec - m * 60; return m < 10 && r > 0 ? m + " min " + r + " s" : Math.round(sec / 60) + " min"; }
  static function woodNew() {
    Ui.page("Novo conjunto", wood);
    Ui.p("Escolha o tipo de problema e o tamanho. Conjuntos maiores dão mais padrões, mas cada ciclo precisa ser feito de uma vez para contar.", "muted");
    var kinds:Array<Array<Dynamic>> = [
      ["Misto no seu nível", null],
      ["Padrões de mate", Content.MATE_PATTERNS.concat(["mateIn2", "mateIn3"])],
      ["Golpes táticos", ["fork", "pin", "skewer", "discoveredAttack", "doubleCheck", "hangingPiece", "deflection", "attraction", "capturingDefender"]],
      ["Finais", Content.EG_TYPES.concat(["endgame"])],
      ["Golpes de mestres", Content.MASTER_SETS]
    ];
    for (kd in kinds) {
      Ui.h(kd[0]);
      Ui.btns([for (sz in [30, 60, 100]) [sz + " problemas", function() { Profile.d.wood = null; Study.woodSet(kd[1], sz, kd[0]); wood(); }]]);
    }
  }
  static function themes() {
    Ui.page("Trilhas por tema", tactics);
    Ui.p("Mais de 17 mil problemas reais do Lichess, em 60 temas. Domínio é a chance estimada de você já saber o padrão (acima de 95%, dominado); o número é quantos problemas há no tema.", "muted");
    var groups:Array<Array<Dynamic>> = [
      ["Golpes táticos básicos", ["hangingPiece", "fork", "pin", "skewer", "discoveredAttack", "doubleCheck", "sacrifice", "promotion"]],
      ["Mate em N lances", ["mateIn1", "mateIn2", "mateIn3", "mateIn4", "mateIn5"]],
      ["Padrões de mate com nome", Content.MATE_PATTERNS],
      ["Ideias avançadas", Content.ADV_MOTIFS],
      ["Finais por tipo", Content.EG_TYPES],
      ["Golpes de mestres", Content.MASTER_SETS],
      ["Fase e duração", Content.PHASES]
    ];
    for (gr in groups) {
      var rows:Array<Dynamic> = [];
      for (k in (gr[1] : Array<String>)) {
        var n = Puzzles.count(k); if (n < 5) continue;
        var pc = Profile.themePct(k);
        /* domínio estimado pelo Raio-X (HTML5); no Flash, o acerto simples */
        var dm:Int = #if js js.Syntax.code("(typeof V24!=='undefined'?V24.mastery({0}):-1)", k) #else -1 #end;
        rows.push({ t: (dm >= 95 ? "✓ " : "") + Content.themeName(k), d: Content.themeDesc(k), r: (dm >= 0 ? "domínio " + dm + "% · " : (pc < 0 ? "" : pc + "% · ")) + n, ok: dm >= 95, f: function() Drills.run(Content.themeName(k), Study.themeTasks(k, 10), { back: themes }) });
      }
      if (rows.length == 0) continue;
      Ui.h(gr[0]);
      Ui.items(rows);
    }
  }

  /* ---------- finais ---------- */
  public static function endgames() {
    Ui.page("Finais", App.training);
    Ui.p("Jogue contra o motor, que defende com perfeição. Essenciais primeiro; depois converter posições ganhas e defender posições piores.", "muted");
    var groups = [["essential", "Finais essenciais"], ["convert", "Converter vantagem"], ["defend", "Defender posições piores"]];
    for (gr in groups) {
      Ui.h(gr[1]);
      Ui.items([for (e in Content.endgames()) if (e.kind == gr[0]) { t: (Profile.egDone(e.id) ? "✓ " : "") + e.name, d: e.tip, ok: Profile.egDone(e.id), r: e.human == 1 ? "Brancas" : "Pretas", f: function() Drills.endgame(e.id, endgames) }]);
    }
  }

  /* ---------- aberturas ---------- */
  public static function openings() {
    Ui.page("Aberturas", App.training);
    var r:Dynamic = Profile.d.rep;
    Ui.p("Monte um repertório pequeno: 1 abertura de Brancas e 2 defesas de Pretas (contra 1.e4 e contra 1.d4). Cada linha vira um cartão de repetição espaçada.", "muted");
    var mine = Study.myReps();
    if (mine.length > 0) {
      var due = Study.repDue(2).length;
      Ui.btns([["Treinar linhas de hoje (" + due + ")", function() Drills.run("Repertório", Study.repDue(2), { back: openings }), due > 0 ? "pri" : "off"]]);
    }
    for (slot in [["w", "Brancas", "1"], ["b1", "Pretas contra 1.e4", "e4"], ["b2", "Pretas contra 1.d4", "d4"]]) {
      Ui.h(slot[1]);
      var cur:String = Reflect.field(r, slot[0]);
      var opts = [for (x in Content.reps()) if (repSlot(x) == slot[2]) x];
      Ui.items([for (x in opts) { t: (cur == x.id ? "✓ " : "") + x.name, d: (x.ideas : Array<String>)[0], ok: cur == x.id,
        r: cur == x.id ? Study.repLearned(x) + "/" + (x.lines : Array<Dynamic>).length : "escolher", f: function() repDetail(x.id, slot[0]) }]);
    }
    Ui.h("Treino livre");
    Ui.items([{ t: "Jogue como os mestres (Brancas)", d: "O computador responde com lances de mestres; você precisa achar lances que eles jogam.", f: function() Drills.explorer(1, openings) },
      { t: "Jogue como os mestres (Pretas)", d: "Mesma ideia, jogando de Pretas.", f: function() Drills.explorer(-1, openings) }]);
  }
  static function repSlot(x:Dynamic):String {
    if (x.side == 1) return "1";
    var l:Dynamic = (x.lines : Array<Dynamic>)[0]; var u:Array<String> = l.ucis;
    return u[0] == "e2e4" ? "e4" : "d4";
  }
  static function repDetail(id:String, slot:String) {
    var x = Content.rep(id);
    Ui.page(x.name, openings);
    var r:Dynamic = Profile.d.rep;
    var chosen = Reflect.field(r, slot) == id;
    Ui.h("Os planos por trás dos lances");
    Ui.ul(x.ideas);
    Ui.h("Linhas");
    var lines:Array<Dynamic> = x.lines;
    for (i in 0...lines.length) {
      var l = lines[i];
      Ui.p(l.name + ": " + lineSan(l.ucis), "gold");
      Ui.p(l.note, "muted");
    }
    if (chosen) Ui.btns([["Treinar todas as linhas", function() Drills.run(x.name, [for (i in 0...lines.length) Study.repTask(x, i)], { back: function() repDetail(id, slot) }), "pri"], ["Remover do repertório", function() { Reflect.setField(r, slot, null); Profile.save(); openings(); }]]);
    else Ui.btns([["Escolher para o meu repertório", function() { Reflect.setField(r, slot, id); Profile.save(); Ui.toast("Repertório atualizado."); openings(); }, "pri"]]);
  }
  public static function lineSan(ucis:Array<String>):String {
    var p = Engine.posFromFEN(Engine.START_FEN); var out:Array<String> = [];
    for (u in ucis) { var m = Engine.uciToMove(p, u); if (m < 0) break; out.push((p.turn == 1 ? p.full + "." : "") + Engine.moveToSAN(p, m)); Engine.makeMove(p, m); }
    return out.join(" ");
  }

  /* ---------- estruturas de peões ---------- */
  public static function structs() {
    Ui.page("Estruturas de peões", App.training);
    Ui.p("Cada estrutura tem planos típicos. Reconhecer a estrutura diz o que fazer quando não há tática.", "muted");
    var seen:Array<String> = Profile.d.stSeen == null ? [] : Profile.d.stSeen;
    Ui.items([for (s in Content.structs()) { t: (seen.indexOf(s.id) >= 0 ? "✓ " : "") + s.name, d: s.what, ok: seen.indexOf(s.id) >= 0, f: function() structDetail(s.id) }]);
  }
  static function structDetail(id:String) {
    var s = Content.struct(id);
    Ui.page(s.name, structs);
    Ui.p(s.what, "");
    Ui.h("Planos típicos");
    Ui.ul(s.plans);
    Ui.p("Como se chega: " + lineSan(s.ucis), "muted small");
    Ui.btns([["Exercício: encontre o plano", function() {
      Drills.run(s.name, [{ k: "q", id: "st_" + id, fen: s.fen, accept: s.accept, q: "Encontre um lance que segue o plano típico desta estrutura.", dim: "abertura", rating: 1300, note: (s.plans : Array<String>)[0] }],
        { back: function() structDetail(id), done: function(res:Array<Dynamic>) {
          var seen:Array<String> = Profile.d.stSeen == null ? [] : Profile.d.stSeen;
          if (seen.indexOf(id) < 0) seen.push(id);
          Profile.d.stSeen = seen; Profile.save();
          structDetail(id);
        } });
    }, "pri"], ["Voltar", structs]]);
  }

  /* ---------- partidas de mestres ---------- */
  public static function models() {
    Ui.page("Partidas de mestres", App.training);
    Models.load();
    Ui.p(Models.list.length + " partidas com análise do Stockfish 19 lance a lance, organizadas por tema, com uma seção de campeões mundiais. Em \"Adivinhe o lance\" você joga no lugar do mestre e ganha pontos; o desempenho estimado entra no seu Elo unificado.", "muted");
    var md:Array<Dynamic> = Profile.d.model;
    if (md.length > 0) { var s = 0.0; var n = 0; var i = md.length - 1; while (i >= 0 && n < 5) { s += md[i].perf; n++; i--; } Ui.p("Desempenho médio recente: " + Math.round(s / n) + " (" + md.length + " partidas)", "gold"); }
    Ui.items([for (c in Models.cats()) { t: c[0], d: null, r: c[1] + "", f: function() modelCat(c[0]) }]);
  }
  static function modelCat(cat:String) {
    Ui.page(cat, models);
    var md:Array<Dynamic> = Profile.d.model;
    Ui.items([for (g in Models.of(cat)) {
      var best = -1; for (x in md) if (x.g == g.idx && x.perf > best) best = x.perf;
      { t: g.name(), d: (g.title != "" ? ModelGame.short(g.white) + " x " + ModelGame.short(g.black) + " · " : "") + g.year + " · " + g.result + " · " + g.moves.length + " lances", r: best > 0 ? best + "" : "", f: function() modelGame(g) };
    }]);
  }
  static function modelGame(g:ModelGame) {
    Ui.page(g.name(), function() modelCat(g.cat));
    Ui.p(g.white + " x " + g.black + " · " + g.year + " · " + g.result, "gold");
    if (g.desc != "") Ui.p(g.desc, "");
    var win = g.result == "1-0" ? 1 : (g.result == "0-1" ? -1 : 1);
    var back = function() modelGame(g);
    Ui.btns([["Adivinhe o lance (" + (win == 1 ? "Brancas" : "Pretas") + ")", function() Drills.model(g, win, back), "pri"], ["Adivinhe (" + (win == 1 ? "Pretas" : "Brancas") + ")", function() Drills.model(g, -win, back)], ["Assistir", function() Drills.model(g, 0, back)]]);
  }

  /* ---------- nivelamento ---------- */
  public static function placementIntro() {
    Ui.page("Teste de nivelamento", menu);
    Ui.p("30 posições: táticas de dificuldade crescente, cálculo, finais e aberturas. Leva uns 20 minutos. Sem dicas: se não souber, toque em \"Não sei\".", "");
    Ui.p("No fim você recebe uma estimativa de força, o mapa de fraquezas (tática, cálculo, finais, abertura e tempo) e a etapa recomendada da trilha.", "muted");
    var pl:Dynamic = Profile.d.place;
    if (pl != null) { Ui.p("Último resultado: " + pl.est + " · etapa " + pl.step, "gold"); Ui.btns([["Ver resultado anterior", function() placementResult(pl)]]); }
    Ui.btns([["Começar o teste", function() Drills.run("Nivelamento", Study.placementTasks(), { placement: true, back: placementIntro, done: function(res:Array<Dynamic>) {
      var r = Study.placementResult(res);
      Profile.d.place = r;
      if (Profile.d.pzN < 15) Profile.d.pzElo = r.est;
      if (Profile.d.adapt == 800 && (Profile.d.hist : Array<Dynamic>).length == 0) Profile.d.adapt = Std.int(Math.max(500, Math.min(1800, r.est - 100)));
      Profile.touch(); Profile.save();
      placementResult(r);
    } }), "pri"]]);
  }
  static function placementResult(r:Dynamic) {
    Ui.page("Resultado do nivelamento", menu);
    Ui.stats([[Std.string(r.est), "força estimada"], [r.ok + "/" + r.n, "acertos"], [Std.string(r.step), "etapa sugerida"]]);
    Ui.h("Mapa de fraquezas");
    weakMap(r.dims);
    Ui.p("Etapa recomendada da trilha: " + Content.trail()[(r.step : Int) - 1].name + ". As etapas anteriores ficam liberadas.", "gold");
    Ui.p("O plano do dia usa este mapa para dar mais tempo ao seu ponto mais fraco.", "muted");
    Ui.btns([["Ir para a trilha", trail, "pri"], ["Plano do dia", daily], ["Menu", menu]]);
  }
  static function weakMap(dims:Dynamic) {
    for (i in 0...Study.DIMS.length) {
      var k = Study.DIMS[i];
      var v:Int = dims == null ? Profile.dimPct(k) : (Reflect.field(dims, k) == null ? -1 : Reflect.field(dims, k));
      Ui.bar(Study.DIM_NAMES[i], v < 0 ? 0 : v, v < 0 ? "" : (v >= 70 ? "good" : (v >= 45 ? "gold" : "bad")), v < 0 ? "sem dados" : v + "%");
    }
  }

  /* ---------- progresso ---------- */
  public static function profile() {
    Ui.page("Painel de evolução", menu);
    #if js
    var partidasValidas = Mind.games().length;
    var perfilPronto = partidasValidas >= Mind.MIN_GAMES;
    Ui.bar("Avaliação geral — partidas analisadas", Math.min(100, partidasValidas * 100 / Mind.MIN_GAMES), perfilPronto ? "good" : "gold", partidasValidas + " / " + Mind.MIN_GAMES);
    if (!perfilPronto) {
      Ui.p("Avaliação geral ainda não consolidada. " + (Mind.MIN_GAMES - partidasValidas == 1 ? "Falta 1 partida válida" : "Faltam " + (Mind.MIN_GAMES - partidasValidas) + " partidas válidas") + " para mapear seu padrão de decisões com maior consistência.", "gold");
      Ui.p("O Nivelamento e os exercícios continuam fornecendo estimativas independentes; os indicadores abaixo, quando disponíveis, são parciais. Histórico e backups permanecem acessíveis.", "muted small");
    } else {
      Ui.p("Amostra mínima atingida: seu mapa mental e perfil geral passam a exibir análises consolidadas das partidas recentes.", "good small");
    }
    #else
    var perfilPronto = true;
    #end
    var cb = Profile.combined(); var v:Int = cb[0];
    var goal = Profile.nextGoal(v);
    Ui.stats([[v > 0 ? Std.string(v) : "—", perfilPronto ? "Elo estimado" : "Elo indicativo"], [Profile.category(v), perfilPronto ? "nível estimado" : "nível provisório"], [Std.string(Profile.streak()), "dias seguidos"]]);
    if (v > 0) {
      var prev = 0; for (g in Profile.GOALS) if (g <= v) prev = g;
      Ui.bar("Meta " + goal, (v - prev) * 100 / (goal - prev), "gold", (goal - v) + " pontos para a meta");
      var parts:Array<Array<Dynamic>> = cb[1];
      Ui.p("O Elo estimado combina: " + [for (p in parts) p[0] + " " + p[1]].join(" · ") + ". É uma estimativa do treinador, não um rating oficial.", "muted small");
    } else Ui.p("Jogue partidas, resolva problemas ou faça o Nivelamento para ter a primeira estimativa.", "muted");

    if (perfilPronto) {
    Ui.h("Perfil enxadrístico");
    var ax = Evo.axes();
    Ui.radar(ax);
    Ui.p("De 0 a 100 em cada característica. Verde: ponto forte · dourado: em desenvolvimento · vermelho: prioridade.", "muted small");

    Ui.h("Leitura do seu jogo");
    for (sec in Evo.reading(ax)) {
      var items:Array<String> = sec[1];
      Ui.group("rsec", function() {
        Ui.p(sec[0], "gold");
        if (items.length > 0) Ui.ul(items, "small"); else Ui.p(sec[2], "muted");
      });
    }

    Ui.h("Evolução mês a mês");
    Evo.monthly(v);

    Ui.h("Como evoluir cada característica");
    var order = ax.copy();
    order.sort(function(a, b) { var x:Float = a.val < 0 ? 999 : a.val; var y:Float = b.val < 0 ? 999 : b.val; return Reflect.compare(x, y); });
    Ui.items([for (a in order) {
      var t = Evo.TIPS.get(a.k); var f:Void->Void = t[2];
      { t: a.label + (a.val >= 0 ? " · " + a.val : " · sem dados"), d: t[0], r: t[1] + " ›", f: f };
    }]);
    } else {
      Ui.h("Mapa geral de competências");
      Ui.p("Radar, tendências e recomendações de perfil serão calculados após 20 partidas analisadas. Isso evita conclusões baseadas em amostras pequenas.", "muted");
      #if js
      Ui.btns([["Continuar jogando", App.setupGame, "pri"], ["Mapa do pensamento", Mind.page]]);
      #end
    }
    var ss = Profile.srsStats();
    Ui.p("Revisões de erros: " + ss[2] + " para hoje · " + ss[0] + " em aprendizado · " + ss[1] + " dominadas.", "muted small");

    Ui.h("Partidas");
    var h:Array<Dynamic> = Profile.d.hist;
    var rows:Array<Dynamic> = [];
    var i = h.length - 1;
    while (i >= 0 && rows.length < 12) {
      var r = h[i]; var sc:Float = r.res;
      var dt = Date.fromTime(r.t);
      var k = i;
      rows.push({ t: (sc >= 1 ? "Vitória" : (sc <= 0 ? "Derrota" : "Empate")) + " · " + (r.col == 1 ? "Brancas" : "Pretas") + " · " + r.opp, d: dt.getDate() + "/" + (dt.getMonth() + 1) + " · " + App.CAT_LABEL.get(r.cat) + (r.how != null ? " · " + r.how : "") + (r.acc != null ? " · precisão " + r.acc + "%" : ""),
        r: r.ucis != null ? "PGN" : "", f: r.ucis != null ? function() pgnOne(k) : null });
      i--;
    }
    if (rows.length == 0) Ui.p("Nenhuma partida ainda.", "muted"); else Ui.items(rows);
    Ui.btns([["Exportar todas em PGN", pgnAll], ["Backup e sincronização", sync]]);
    Ui.sep();
    Ui.btns([["Apagar todo o progresso", function() Ui.modal("Apagar tudo?", "Pontuações, histórico, revisões e trilha serão apagados.", [["Apagar", function() { Profile.reset(); profile(); }, "warn"], ["Cancelar", null, "pri"]]), "warn"]]);
    if (!Profile.saveOk) Ui.p("Atenção: este navegador não está deixando salvar o progresso.", "bad");
  }
  static function pgnOne(i:Int) {
    var h:Array<Dynamic> = Profile.d.hist;
    Ui.page("PGN", profile);
    Ui.p("Cole no Lichess (Ferramentas › Importar partida) para análise completa.", "muted");
    Ui.pre(Study.pgn(h[i]), "partida.pgn");
  }
  static function pgnAll() {
    Ui.page("Todas as partidas (PGN)", profile);
    var t = Study.pgnAll();
    if (t == "") Ui.p("Nenhuma partida ainda.", "muted"); else Ui.pre(t, "minhas-partidas.pgn");
  }
  static function sync() {
    Ui.page("Backup e sincronização", profile);
    Ui.p("Copie este código e cole no outro aparelho (celular, Switch ou outro navegador) para levar todo o seu progresso.", "muted");
    Ui.pre(Profile.exportCode(), "xadrez-backup.txt");
    Ui.h("Importar de outro aparelho");
    Ui.input("Cole aqui o código (começa com XCT4:)", "Importar", function(s) {
      if (Profile.importCode(s)) { Ui.toast("Progresso importado."); profile(); } else Ui.toast("Código inválido.");
    });
  }

  /* ---------- como pensar ---------- */
  /* conselhos de grandes mestres: [quem, ideia, como aplicar na partida] */
  static var GM_TIPS:Array<Array<String>> = [
    ["Emanuel Lasker · campeão mundial de 1894 a 1921", "Quando encontrar um bom lance, procure um melhor.", "Achou um lance bom? Antes de jogar, gaste mais 10 segundos procurando um ainda melhor, principalmente xeques e capturas."],
    ["Alexander Kotov · \"Pense como um grande mestre\" (1971)", "Liste os lances candidatos antes de calcular e calcule cada um só uma vez.", "Escolha 2 ou 3 candidatos, analise um de cada vez até o fim e não fique pulando de um para o outro."],
    ["Benjamin Blumenfeld · regra de Blumenfeld", "Depois de decidir o lance, olhe o tabuleiro de novo como se fosse um iniciante.", "Antes de soltar a peça, pergunte: o que o adversário pode fazer de mais perigoso agora? Isso evita a maioria das gafes."],
    ["Aron Nimzowitsch · \"Meu sistema\" (1925)", "A ameaça costuma ser mais forte que a sua execução.", "Nem sempre capture na hora: manter a ameaça amarra as peças do adversário e limita as opções dele."],
    ["Aron Nimzowitsch", "Peão passado é um criminoso que deve ser mantido preso.", "Bloqueie o peão passado do adversário com uma peça, de preferência um cavalo, na casa à frente dele."],
    ["Siegbert Tarrasch", "Torres ficam atrás dos peões passados.", "Seu peão passado ou o do adversário: coloque a torre atrás dele, nunca na frente."],
    ["Savielly Tartakower", "A tática é saber o que fazer quando há algo a fazer; a estratégia, quando não há nada a fazer.", "Sem tática na posição, melhore a sua pior peça e escolha um alvo de longo prazo."],
    ["José Raúl Capablanca · campeão de 1921 a 1927", "Estude os finais primeiro.", "Os finais ensinam o valor real de cada peça e a atividade do rei. Dez minutos de finais por dia rendem mais que decorar aberturas."],
    ["Wilhelm Steinitz · primeiro campeão mundial", "Acumule pequenas vantagens; só ataque quando a posição justificar.", "Sem vantagem, não force o ataque: ganhe espaço, melhore as peças e crie fraquezas no campo adversário."],
    ["Bobby Fischer · campeão de 1972 a 1975", "As táticas brotam de uma posição superior.", "Se as combinações não aparecem, melhore a posição primeiro: elas surgem quando suas peças estão melhores."],
    ["Mikhail Tal · campeão de 1960 a 1961", "Leve o adversário para uma floresta escura, onde 2 + 2 = 5.", "Em posições complicadas, o adversário também erra. Se você calcula bem, a complicação é sua aliada."],
    ["Tigran Petrosian e Anatoly Karpov · mestres da profilaxia", "Antes de executar seu plano, impeça o plano do adversário.", "A cada lance, pergunte: o que ele quer fazer? Às vezes o melhor lance é o que tira a melhor jogada dele."],
    ["Mikhail Botvinnik · campeão em três períodos", "Analise as suas próprias partidas com rigor, sem o computador primeiro.", "Depois de cada partida, anote os momentos críticos e o que você pensou; só depois confira com o motor."],
    ["Mark Dvoretsky · treinador de campeões", "O cálculo se treina sem mexer as peças.", "Resolva problemas olhando o diagrama e anotando a solução inteira antes de conferir."],
    ["Garry Kasparov · campeão de 1985 a 2000", "A iniciativa vale material.", "Às vezes vale entregar um peão para desenvolver peças com ganho de tempo e manter o adversário se defendendo."],
    ["Magnus Carlsen · campeão de 2013 a 2023", "Partida igual não é empate: continue jogando.", "No final, mesmo com pouca vantagem, siga fazendo lances úteis. O adversário cansa e erra."],
    ["Judit Polgar · a maior jogadora da história", "Jogue de forma ativa e confie no seu cálculo.", "Prefira lances que criam ameaças e mantêm a iniciativa, mesmo que exijam cálculo preciso."],
    ["Regra dos mestres para o relógio", "Pense muito nos momentos críticos e pouco nos lances óbvios.", "Lance forçado ou recaptura: jogue rápido. Mudança de estrutura, troca de damas ou sacrifício: pare e calcule."]
  ];
  public static function think() {
    Ui.page("Como pensar", App.training);
    Ui.h("Processo de pensamento");
    for (x in Content.PROCESS) { Ui.p(x[0], "gold"); Ui.p(x[1], ""); }
    Ui.p("Ligue o \"Treino do processo de pensamento\" ao começar uma partida para o treinador avaliar estes passos.", "muted");
    Ui.h("Conselhos dos grandes mestres");
    Ui.p("Ideias de campeões e treinadores, com o jeito de aplicar cada uma na próxima partida.", "muted small");
    for (t in GM_TIPS) Ui.group("rsec", function() {
      Ui.p(t[0], "gold small");
      Ui.p(t[1], "big");
      Ui.p("Na prática: " + t[2], "small");
    });
    Ui.h("Desequilíbrios (Jeremy Silman)");
    for (x in Content.SILMAN) { Ui.p(x[0], "gold"); Ui.p(x[1], ""); }
    Ui.p("Na partida e nas partidas de mestres, o botão \"Desequilíbrios\" analisa a posição atual.", "muted");
    Ui.h("Princípios do treinador");
    var keys = [for (k in Coach.CONCEPTS.keys()) k];
    keys.sort(function(a, b) return a < b ? -1 : 1);
    for (k in keys) { var c = Coach.CONCEPTS.get(k); Ui.p(c[0], "gold"); Ui.p(c[1], ""); }
  }

  /* ---------- história ---------- */
  public static function history() History.page();

}
