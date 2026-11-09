package;

import Brain;
import Data;

@:access(Pages) @:access(Drills) @:access(App)
@:keep @:access(Pages) @:access(Drills) @:access(App) @:access(Xiangqi) @:access(Ancient)
class Main {
  static function main() {
    #if js
    if (js.Syntax.code("typeof document === 'undefined'")) {
      var post:Dynamic = js.Syntax.code("self.postMessage.bind(self)");
      js.Syntax.code("self.onmessage = {0}", function(e:Dynamic) {
        var r = Brain.handle(e.data.q);
        post({ id: e.data.id, res: r });
      });
      return;
    }
    var src = js.Browser.document.getElementById("appjs");
    if (src != null && js.Syntax.code("typeof Worker !== 'undefined'") && js.Syntax.code("!/[?&]noworker/.test(location.search)")) Think.startWorker(Res.workerPrefix() + src.textContent);
    js.Syntax.code("window.XTD = {0}; window.XTA = {1}; window.XTB = {2}; window.XTP = {3}; window.XAN = {4}; window.XXQ = {5}", Drills, App, Brain, Pages, Ancient, Xiangqi);
    UiJs.init(App.start);
    #else
    try {
      if (flash.external.ExternalInterface.available) flash.external.ExternalInterface.addCallback("xt", function(c:String):String {
        try {
          switch (c) {
            case "menu": App.menu();
            case "newgame": App.newGame();
            case "tactics": Pages.tactics();
            case "endgames": Pages.endgames();
            case "models": Pages.models();
            case "profile": Pages.profile();
            case "trail": Pages.trail();
            case "openings": Pages.openings();
            case "daily": Pages.daily();
            case "sync": Pages.sync();
            case "history": Pages.history();
            case "think": Pages.think();
            case "structs": Pages.structDetail("iqp");
            case "eg": Drills.endgame("lucena", Pages.endgames);
            case "model": Models.load(); Drills.model(Models.list[0], 1, Pages.models);
            case "watch": Models.load(); Drills.model(Models.list[1], 0, Pages.models);
            case "storm": Drills.run("Puzzle Storm", [Study.stormTask(1000, null)], { storm: true, back: Pages.tactics });
            case "modal": App.resign();
            case "anc": Ancient.home();
            case "xq": Xiangqi.start(1, 2);
            case "chat": Ancient.info("chaturanga");
            case "chatplay": Ancient.start("chaturanga", 1, 2);
            case "toast": UiFlash.toast("Teste de aviso.");
            case "stage0": Pages.stage(0);
            case "placement": Pages.placementResult({ est: 1234, ok: 20, n: 30, step: 3, dims: { tatica: 70, calculo: 40, finais: 55, abertura: 80, tempo: 30 } });
            case "rep": Profile.d.rep.w = "italian"; Pages.repDetail("italian", "w");
            case "mixed": Drills.run("Treino misto", Study.themeTasks(null, 5), { back: Pages.tactics });
            case "game": { var g = App.G; return haxe.Json.stringify({ fen: Engine.toFEN(g.pos), busy: g.busy, fb: g.fbPending, over: g.over != null }); }
            case "pz": { var r = Drills.R; if (r == null) return "null"; var t = r.tasks[r.i]; return haxe.Json.stringify({ step: r.step, moves: t.moves, color: r.color, state: r.state }); }
            default:
          }
        } catch (e:Dynamic) { return "ERR " + Std.string(e); }
        return "ok";
      });
    } catch (e:Dynamic) {}
    UiFlash.init(App.start);
    #end
  }
}
