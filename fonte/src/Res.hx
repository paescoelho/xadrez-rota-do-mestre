package;

/* Dados de texto. No HTML5 ficam como texto puro na página (sem base64, ~1/4 menor);
   o Web Worker recebe uma cópia em self.XRES. No Flash vêm dos recursos do SWF. */
class Res {
  public static function get(name:String):String {
    #if js
    var x:Dynamic = js.Syntax.code("(typeof self !== 'undefined' && self.XRES) ? self.XRES[{0}] : null", name);
    if (x != null) return x;
    var d:Dynamic = js.Syntax.code("(typeof document !== 'undefined') ? document.getElementById('res_' + {0}) : null", name);
    if (d != null) return d.textContent;
    #end
    return haxe.Resource.getString(name);
  }
  public static var NAMES = ["content", "lpuzzles", "openings", "explorer", "models"];
  #if js
  /* prefixo do script do worker com os dados */
  public static function workerPrefix():String {
    var o:Dynamic = {};
    for (n in NAMES) { var v = get(n); if (v != null) Reflect.setField(o, n, v); }
    return "self.XRES=" + js.Syntax.code("JSON.stringify({0})", o) + ";\n";
  }
  #end
}
