package;

#if flash
import flash.display.*;
import flash.events.*;
import flash.text.*;
import flash.filters.GlowFilter;
import flash.filters.DropShadowFilter;
import flash.geom.Matrix;

/* Interface Flash (Ruffle). Mesmo conjunto de funções da UiJs. */
class C {
  public static inline var BG = 0x0b0d10; public static inline var CARD = 0x151920; public static inline var CARD2 = 0x1c222b; public static inline var LINE = 0x2b323c;
  public static inline var TX = 0xece6d6; public static inline var MU = 0x98a1ab; public static inline var GOLD = 0xdcb55c; public static inline var GOLD2 = 0xf3d98c;
  public static inline var GOOD = 0x4cb871; public static inline var BAD = 0xe3605a; public static inline var WARN = 0xe7a53c; public static inline var BLUE = 0x4b92d6;
}

class Scroll extends Sprite {
  public var content:Sprite; var msk:Shape;
  public var vw:Float; public var vh:Float; public var cursor:Float = 0; public var sy:Float = 0;
  var dragging = false; var startY = 0.0; var startS = 0.0;
  public function new(w:Float, h:Float) {
    super();
    vw = w; vh = h;
    graphics.beginFill(C.BG, 0.01); graphics.drawRect(0, 0, w, h); graphics.endFill();
    content = new Sprite(); addChild(content);
    msk = new Shape(); msk.graphics.beginFill(0); msk.graphics.drawRect(0, 0, w, h); msk.graphics.endFill();
    addChild(msk); content.mask = msk;
    addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent) { dragging = true; UiFlash.dragMoved = false; startY = stage.mouseY; startS = sy; });
    addEventListener(Event.ADDED_TO_STAGE, function(_) {
      stage.addEventListener(MouseEvent.MOUSE_MOVE, onMove);
      stage.addEventListener(MouseEvent.MOUSE_UP, onUp);
    });
    addEventListener(Event.REMOVED_FROM_STAGE, function(_) {
      if (stage != null) { stage.removeEventListener(MouseEvent.MOUSE_MOVE, onMove); stage.removeEventListener(MouseEvent.MOUSE_UP, onUp); }
    });
    addEventListener(MouseEvent.MOUSE_WHEEL, function(e:MouseEvent) { scrollTo(sy - e.delta * 30); });
  }
  function onMove(e:MouseEvent) {
    if (!dragging || stage == null) return;
    var dy = stage.mouseY - startY;
    if (Math.abs(dy) > 8) UiFlash.dragMoved = true;
    if (UiFlash.dragMoved) scrollTo(startS - dy);
  }
  function onUp(e:MouseEvent) dragging = false;
  public function clear() { content.removeChildren(); cursor = UiFlash.PAD; sy = 0; content.y = 0; }
  public function add(d:DisplayObject, h:Float, ?gap:Float = -1) {
    d.y = cursor; content.addChild(d);
    cursor += h + (gap < 0 ? UiFlash.GAP : gap);
  }
  public function maxS():Float return Math.max(0, cursor + UiFlash.PAD * 2 - vh);
  public function scrollTo(v:Float) { sy = Math.max(0, Math.min(maxS(), v)); content.y = -sy; }
}

class Btn extends Sprite {
  public function new(label:String, kind:String, fn:Void->Void, fs:Float, ?minW:Float = 0, ?h:Float = 0) {
    super();
    var bold = kind == "pri";
    var col = kind == "pri" ? 0x1b1406 : (kind == "sel" ? C.GOLD2 : (kind == "warn" ? 0xffb4ae : C.TX));
    var t = UiFlash.tf(label, 15, col, bold, 0);
    var hh = h > 0 ? h : 40 * fs;
    var w = Math.max(minW, t.width + 26 * fs);
    var g = graphics;
    if (kind == "pri") {
      var m = new Matrix(); m.createGradientBox(w, hh, Math.PI / 2);
      g.beginGradientFill(GradientType.LINEAR, [0xefcf7a, 0xc49434], [1, 1], [0, 255], m);
      g.lineStyle(1, 0xc49434);
    } else if (kind == "sel") { g.beginFill(0x2a2415); g.lineStyle(1, C.GOLD); }
    else if (kind == "warn") { g.beginFill(C.CARD2); g.lineStyle(1, 0x5a2c2a); }
    else { g.beginFill(C.CARD2); g.lineStyle(1, C.LINE); }
    g.drawRoundRect(0, 0, w, hh, 18 * fs, 18 * fs); g.endFill();
    t.x = (w - t.width) / 2; t.y = (hh - t.height) / 2;
    addChild(t);
    if (kind == "off") { alpha = 0.38; return; }
    buttonMode = true; useHandCursor = true; mouseChildren = false;
    addEventListener(MouseEvent.CLICK, function(_) { if (!UiFlash.dragMoved && fn != null) fn(); });
  }
}

class UiFlash {
  public static var board:BoardF = null;
  public static var dragMoved = false;
  public static var W:Float = 390; public static var H:Float = 780; public static var FS:Float = 1; public static var land = false;
  public static var PAD:Float = 12; public static var GAP:Float = 7;
  public static var isFlash = true;
  static var st:Stage; static var root:Sprite; static var over:Sprite;
  static var view:Scroll; static var panelView:Scroll;
  static var topBar:TextField; static var botBar:TextField;
  static var backFn:Void->Void = null;
  static var menuBmp:BitmapData = null;
  static var onMenu = false; static var lastMenu:Array<Dynamic> = null; static var lastInfo:String = null;

  public static function init(ready:Void->Void) {
    st = flash.Lib.current.stage;
    st.scaleMode = StageScaleMode.SHOW_ALL;
    st.align = StageAlign.TOP;
    W = st.stageWidth; H = st.stageHeight;
    land = W > H;
    FS = land ? 1.22 : 1.0;
    PAD = 12 * FS; GAP = 7 * FS;
    var bg = new Shape(); bg.graphics.beginFill(C.BG); bg.graphics.drawRect(0, 0, W, H); bg.graphics.endFill();
    flash.Lib.current.addChild(bg);
    root = new Sprite(); flash.Lib.current.addChild(root);
    over = new Sprite(); flash.Lib.current.addChild(over);
    st.addEventListener(MouseEvent.MOUSE_DOWN, function(_) dragMoved = false, true);
    st.addEventListener(KeyboardEvent.KEY_DOWN, function(e:KeyboardEvent) {
      var k = e.keyCode;
      if ((k == 27 || k == 8) && backFn != null && over.numChildren == 0) backFn();
      var sv = panelView != null ? panelView : view;
      if (sv != null) { if (k == 40 || k == 34) sv.scrollTo(sv.sy + 120 * FS); if (k == 38 || k == 33) sv.scrollTo(sv.sy - 120 * FS); }
    });
    try {
      var l = new Loader();
      l.contentLoaderInfo.addEventListener(Event.COMPLETE, function(_) {
        var b:Bitmap = cast l.content; menuBmp = b.bitmapData;
        if (onMenu) menu(lastMenu, lastInfo);
      });
      l.loadBytes(haxe.Resource.getBytes("menubg").getData());
    } catch (e:Dynamic) {}
    ready();
  }
  static function focus() { try { st.focus = st; } catch (e:Dynamic) {} }

  /* texto sem símbolos que a fonte padrão do Ruffle pode não ter */
  public static function clean(s:String):String {
    if (s == null) return "";
    var r = [["✓ ", "• "], ["✗ ", "× "], ["⏱ ", ""], ["🔒 ", ""], ["⏮", "|<"], ["⏭", ">|"], ["◀", "<"], ["▶", ">"], ["→", "->"], ["›", ">"], ["…", "..."], ["—", "-"], ["♔", ""]];
    for (x in r) s = StringTools.replace(s, x[0], x[1]);
    return s;
  }
  public static function tf(text:String, size:Float, color:Int, bold:Bool, w:Float, ?italic:Bool = false, ?spacing:Float = 0):TextField {
    var t = new TextField();
    var f = new TextFormat("_sans", Std.int(size * FS), color, bold, italic);
    if (spacing != 0) f.letterSpacing = spacing;
    t.defaultTextFormat = f;
    t.selectable = false; t.mouseEnabled = false;
    t.multiline = w > 0; t.wordWrap = w > 0;
    if (w > 0) t.width = w;
    t.autoSize = TextFieldAutoSize.LEFT;
    t.text = clean(text);
    return t;
  }
  static function clsColor(cls:String):Int {
    if (cls == null) return C.TX;
    if (cls.indexOf("good") >= 0) return C.GOOD;
    if (cls.indexOf("bad") >= 0) return C.BAD;
    if (cls.indexOf("warn") >= 0) return C.WARN;
    if (cls.indexOf("gold") >= 0) return C.GOLD2;
    if (cls.indexOf("muted") >= 0) return C.MU;
    return C.TX;
  }
  static function clearAll() { root.removeChildren(); over.removeChildren(); board = null; view = null; panelView = null; onMenu = false; focus(); }

  /* ---------- abertura com o vídeo ---------- */
  public static function intro(done:Void->Void) {
    clearAll();
    var bg = new Sprite(); bg.graphics.beginFill(0); bg.graphics.drawRect(0, 0, W, H); bg.graphics.endFill(); root.addChild(bg);
    var vid = new Sprite(); root.addChild(vid);
    var tap = new Sprite();
    var m = new Matrix(); m.createGradientBox(W, H, 0, 0, 0);
    tap.graphics.beginGradientFill(GradientType.RADIAL, [0x50401a, 0x000000], [0.55, 0.92], [0, 200], m);
    tap.graphics.drawRect(0, 0, W, H); tap.graphics.endFill();
    var t1 = tf("XADREZ", land ? 64 : 54, C.GOLD2, true, 0, false, 10);
    t1.filters = [new GlowFilter(0xf0c860, 0.6, 18, 18, 2)];
    t1.x = (W - t1.width) / 2; t1.y = H * 0.36; tap.addChild(t1);
    var t2 = tf("Rota do Mestre", 20, C.GOLD2, false, 0, true, 2); t2.x = (W - t2.width) / 2; t2.y = t1.y + t1.height; tap.addChild(t2);
    var t3 = tf("Toque para começar", 16, C.GOLD2, false, 0); t3.x = (W - t3.width) / 2; t3.y = t2.y + t2.height + 50 * FS; tap.addChild(t3);
    var pill = new Shape(); pill.graphics.lineStyle(1, C.GOLD, 0.7); pill.graphics.drawRoundRect(t3.x - 22, t3.y - 9, t3.width + 44, t3.height + 18, 40, 40); tap.addChild(pill);
    var ph = 0.0;
    tap.addEventListener(Event.ENTER_FRAME, function(_) { ph += 0.08; t3.alpha = 0.6 + 0.4 * Math.sin(ph); });
    tap.buttonMode = true;
    root.addChild(tap);
    var skip = new Btn("Pular >", "", null, FS);
    skip.x = W - skip.width - 14 * FS; skip.y = H - skip.height - 16 * FS;
    var loader:Loader = null; var timer:haxe.Timer = null; var finished = false;
    function finish() {
      if (finished) return; finished = true;
      if (timer != null) timer.stop();
      if (loader != null) { try { loader.unloadAndStop(true); } catch (e:Dynamic) {} }
      done();
      flashFx();
    }
    skip.addEventListener(MouseEvent.CLICK, function(_) finish());
    root.addChild(skip);
    tap.addEventListener(MouseEvent.CLICK, function(_) {
      if (tap.parent != null) root.removeChild(tap);
      try {
        loader = new Loader();
        loader.contentLoaderInfo.addEventListener(Event.COMPLETE, function(_) {
          var vw:Float = loader.contentLoaderInfo.width; var vh:Float = loader.contentLoaderInfo.height;
          if (vw <= 0 || vh <= 0) { vw = 360; vh = 640; }
          var s = Math.max(W / vw, H / vh); /* cobre a tela toda, sem distorcer (corta as sobras) */
          loader.scaleX = loader.scaleY = s;
          loader.x = (W - vw * s) / 2; loader.y = (H - vh * s) / 2;
        });
        vid.addChild(loader);
        loader.loadBytes(haxe.Resource.getBytes("intro").getData());
        timer = haxe.Timer.delay(finish, 30300);
      } catch (e:Dynamic) { finish(); }
    });
  }
  /* clarão dourado: o fim do vídeo (luz forte) vira a luz do menu */
  static function flashFx() {
    var f = new Sprite();
    var m = new Matrix(); m.createGradientBox(W * 1.6, H * 1.2, 0, -W * 0.3, -H * 0.35);
    f.graphics.beginGradientFill(GradientType.RADIAL, [0xfffaf0, 0xf6dc90, 0xdcaa46, 0x000000], [1, 1, 0.6, 0], [0, 70, 140, 255], m);
    f.graphics.drawRect(0, 0, W, H); f.graphics.endFill();
    f.mouseEnabled = false;
    flash.Lib.current.addChild(f);
    var a = 1.0;
    f.addEventListener(Event.ENTER_FRAME, function(_) { a -= 0.028; f.alpha = a; if (a <= 0 && f.parent != null) f.parent.removeChild(f); });
  }

  /* ---------- menu ---------- */
  public static function menu(items:Array<Dynamic>, info:String) {
    clearAll(); backFn = null;
    onMenu = true; lastMenu = items; lastInfo = info;
    if (menuBmp != null) {
      var b = new Bitmap(menuBmp, PixelSnapping.AUTO, true);
      var s = Math.max(W / menuBmp.width, H / menuBmp.height);
      b.scaleX = b.scaleY = s;
      b.x = (W - menuBmp.width * s) / 2;
      b.y = land ? (H - menuBmp.height * s) * 0.55 : 0;
      root.addChild(b);
    }
    var glow = new Shape();
    var m = new Matrix(); m.createGradientBox(W * 1.4, H * 0.7, 0, -W * 0.2, -H * 0.3);
    glow.graphics.beginGradientFill(GradientType.RADIAL, [0xffecb4, 0xffecb4], [0.22, 0], [0, 255], m);
    glow.graphics.drawRect(0, 0, W, H); glow.graphics.endFill();
    root.addChild(glow);
    var y = 12 * FS;
    var king = new Shape();
    var ks = 40 * FS;
    Pieces.draw(king.graphics, 6, true, (W - ks) / 2, y, ks);
    king.filters = [new GlowFilter(0xffd278, 0.8, 16, 16, 2)];
    root.addChild(king);
    y += ks;
    var t1 = tf("XADREZ", land ? 44 : 40, C.GOLD2, true, 0, false, 8);
    t1.filters = [new GlowFilter(0xf0c860, 0.5, 14, 14, 2), new DropShadowFilter(2, 90, 0x5a3a08, 0.8, 2, 2)];
    t1.x = (W - t1.width) / 2; t1.y = y; root.addChild(t1);
    y += t1.height - 6 * FS;
    var t2 = tf("Rota do Mestre", 17, C.GOLD2, false, 0, true, 2); t2.x = (W - t2.width) / 2; t2.y = y; root.addChild(t2);
    y += t2.height + 4 * FS;
    if (info != null && info != "") {
      var t3 = tf(info, 12, 0xcfd6cf, false, 0);
      if (t3.width > W - 40) { t3 = tf(info, 12, 0xcfd6cf, false, W - 50); }
      var pl = new Shape(); pl.graphics.beginFill(0, 0.4); pl.graphics.lineStyle(1, C.GOLD, 0.3);
      pl.graphics.drawRoundRect((W - t3.width) / 2 - 12, y, t3.width + 24, t3.height + 6, 26, 26); pl.graphics.endFill();
      root.addChild(pl); t3.x = (W - t3.width) / 2; t3.y = y + 3; root.addChild(t3);
      y += t3.height + 14 * FS;
    }
    var band = new Shape(); var bm = new Matrix(); var bandH = 64 * FS; bm.createGradientBox(W, bandH, Math.PI / 2, 0, H - bandH);
    band.graphics.beginGradientFill(GradientType.LINEAR, [0, 0], [0, 0.88], [0, 200], bm); band.graphics.drawRect(0, H - bandH, W, bandH); band.graphics.endFill();
    root.addChild(band);
    var foot = tf("By Rodrigo Coelho", 13, C.GOLD, false, 0, true, 3);
    foot.filters = [new GlowFilter(C.GOLD, 0.35, 10, 10, 1)];
    foot.x = (W - foot.width) / 2; foot.y = H - foot.height - 8 * FS;
    var cols = land ? 3 : 2;
    var gw = Math.min(W - 28 * FS, land ? 900 : 560);
    var gx = (W - gw) / 2;
    var sv = new Scroll(W, foot.y - y - 6);
    sv.x = 0; sv.y = y; root.addChild(sv);
    view = sv;
    sv.cursor = 0;
    var cw = (gw - (cols - 1) * 8 * FS) / cols;
    var ih = 54 * FS;
    var col = 0; var rowY = 0.0;
    for (it in items) {
      var wide = it.wide == true;
      if (wide && col != 0) { col = 0; rowY += ih + 8 * FS; }
      var w = wide ? gw : cw;
      var b = new Sprite();
      var tmpD = it.d != null ? tf(it.d, 11.5, 0, false, w - 18 * FS) : null;
      var tmpT = tf((it.n != null ? it.n + "  " : "") + it.t, it.hero == true ? 18 : 15, 0, true, w - 18 * FS);
      var myH = wide ? Math.max(ih, 7 * FS + tmpT.height - 2 + (tmpD != null ? tmpD.height : 0) + 8 * FS) : ih;
      var hero = it.hero == true;
      if (hero) { var hm = new Matrix(); hm.createGradientBox(w, ih, Math.PI / 2); b.graphics.beginGradientFill(GradientType.LINEAR, [0xf3d98c, 0xc49434], [1, 1], [0, 255], hm); b.graphics.lineStyle(1, 0xf3d98c); }
      else { b.graphics.beginFill(it.hl == true ? 0x3c2c0c : 0x080c0b, it.hl == true ? 0.78 : 0.68); b.graphics.lineStyle(1, C.GOLD, it.hl == true ? 1 : 0.32); }
      b.graphics.drawRoundRect(0, 0, w, myH, 22 * FS, 22 * FS); b.graphics.endFill();
      var tt = tf((it.n != null ? it.n + "  " : "") + it.t, hero ? 18 : 15, hero ? 0x1b1406 : 0xf4ecd6, true, w - 18 * FS); tt.x = 10 * FS; tt.y = 7 * FS; b.addChild(tt);
      if (it.d != null) { var td = tf(it.d, 11.5, hero ? 0x3a2a0c : 0xaeb6b0, false, w - 18 * FS); td.x = 10 * FS; td.y = tt.y + tt.height - 2; b.addChild(td); }
      b.x = gx + (wide ? 0 : col * (cw + 8 * FS)); b.y = rowY;
      b.buttonMode = true; b.mouseChildren = false;
      var f:Void->Void = it.f;
      b.addEventListener(MouseEvent.CLICK, function(_) if (!dragMoved) f());
      sv.content.addChild(b);
      if (wide) { rowY += myH + 8 * FS; col = 0; }
      else { col++; if (col >= cols) { col = 0; rowY += ih + 8 * FS; } }
    }
    sv.cursor = rowY + (col != 0 ? ih + 8 * FS : 0) - PAD * 2;
    root.addChild(foot);
  }

  /* ---------- páginas ---------- */
  static function header(title:String, back:Void->Void) {
    clearAll();
    backFn = back;
    var hh = 46 * FS;
    var hd = new Sprite();
    var m = new Matrix(); m.createGradientBox(W, hh, Math.PI / 2);
    hd.graphics.beginGradientFill(GradientType.LINEAR, [0x141820, 0x0e1116], [1, 1], [0, 255], m);
    hd.graphics.drawRect(0, 0, W, hh); hd.graphics.endFill();
    hd.graphics.lineStyle(1, C.LINE); hd.graphics.moveTo(0, hh - 0.5); hd.graphics.lineTo(W, hh - 0.5);
    var x = 12 * FS;
    if (back != null) {
      var b = new Sprite();
      b.graphics.beginFill(0, 0.01); b.graphics.drawRect(0, 0, 46 * FS, hh); b.graphics.endFill();
      var a = new Shape(); a.graphics.lineStyle(3 * FS, C.GOLD); a.graphics.moveTo(24 * FS, 14 * FS); a.graphics.lineTo(15 * FS, hh / 2); a.graphics.lineTo(24 * FS, hh - 14 * FS);
      b.addChild(a); b.buttonMode = true;
      b.addEventListener(MouseEvent.CLICK, function(_) back());
      hd.addChild(b); x = 46 * FS;
    }
    var t = tf(title, 18, C.GOLD2, false, 0);
    if (t.width > W - x - 10) { t.autoSize = TextFieldAutoSize.NONE; t.width = W - x - 10; }
    t.x = x; t.y = (hh - t.height) / 2; hd.addChild(t);
    root.addChild(hd);
    return hh;
  }
  public static function page(title:String, back:Void->Void) {
    var hh = header(title, back);
    view = new Scroll(W, H - hh); view.y = hh; root.addChild(view);
    view.clear();
    panelView = null;
  }
  static var bx:Float = 0; static var by:Float = 0; static var bs:Float = 0;
  public static function boardPage(title:String, back:Void->Void) {
    var hh = header(title, back);
    var barH = 28 * FS;
    var size:Float; var px:Float; var py:Float; var pw:Float; var ph:Float;
    if (land) {
      size = H - hh - 2 * barH - 10;
      bx = 8; by = hh + barH + 2;
      px = bx + size + 10; py = hh; pw = W - px; ph = H - hh;
    } else {
      size = Math.min(W - 8, H - hh - 2 * barH - 230);
      bx = (W - size) / 2; by = hh + barH;
      px = 0; py = by + size + barH; pw = W; ph = H - py;
    }
    bs = size;
    topBar = tf("", 13.5, C.MU, false, 0); topBar.x = bx + 2; topBar.y = by - barH + 2; root.addChild(topBar);
    botBar = tf("", 13.5, C.MU, false, 0); botBar.x = bx + 2; botBar.y = by + size + 2; root.addChild(botBar);
    board = new BoardF(size);
    board.x = bx; board.y = by;
    root.addChild(board);
    var ln = new Shape(); ln.graphics.lineStyle(1, C.LINE);
    if (land) { ln.graphics.moveTo(px - 0.5, py); ln.graphics.lineTo(px - 0.5, H); } else { ln.graphics.moveTo(0, py + 0.5); ln.graphics.lineTo(W, py + 0.5); }
    root.addChild(ln);
    panelView = new Scroll(pw, ph); panelView.x = px; panelView.y = py; root.addChild(panelView);
    view = panelView;
    view.clear();
  }
  /* página com uma área de desenho própria (proporção largura/altura) e painel ao lado ou embaixo */
  public static var sideW:Float = 0; public static var sideH:Float = 0;
  public static function sidePage(title:String, back:Void->Void, aspect:Float):Sprite {
    var hh = header(title, back);
    var bw:Float; var bh:Float; var px:Float; var py:Float; var pw:Float; var ph:Float; var bx:Float; var by:Float;
    if (land) { bh = H - hh - 12; bw = bh * aspect; bx = 8; by = hh + 6; px = bx + bw + 10; py = hh; pw = W - px; ph = H - hh; }
    else { bw = W - 12; bh = bw / aspect; if (bh > H * 0.6) { bh = H * 0.6; bw = bh * aspect; } bx = (W - bw) / 2; by = hh + 6; px = 0; py = by + bh + 6; pw = W; ph = H - py; }
    var sp = new Sprite(); sp.x = bx; sp.y = by; root.addChild(sp);
    sideW = bw; sideH = bh;
    panelView = new Scroll(pw, ph); panelView.x = px; panelView.y = py; root.addChild(panelView);
    view = panelView; view.clear();
    return sp;
  }
  public static function panel(?keep:Bool = false) {
    if (panelView == null) return;
    var s = panelView.sy;
    panelView.clear();
    if (keep) panelView.scrollTo(s);
  }
  public static function scrollTop() { if (view != null) view.scrollTo(0); }
  public static function bars(top:String, bot:String, topOn:Bool, botOn:Bool) {
    if (topBar == null || board == null) return;
    setBar(topBar, top, topOn); setBar(botBar, bot, botOn);
  }
  static function setBar(t:TextField, s:String, on:Bool) {
    var f = t.defaultTextFormat; f.color = on ? C.GOLD2 : C.MU; f.bold = on;
    t.defaultTextFormat = f; t.text = clean(s); t.setTextFormat(f);
  }

  /* ---------- componentes ---------- */
  static inline function cw():Float return view.vw - 2 * PAD;
  static function addTf(t:TextField, ?gap:Float = -1) { t.x = PAD; view.add(t, t.height, gap); }
  public static function h(t:String) { view.cursor += 6 * FS; addTf(tf(t, 14, C.GOLD, true, cw()), 2); }
  public static function p(t:String, ?cls:String) {
    var size = 15.0; var bold = false;
    if (cls != null && cls.indexOf("big") >= 0) { size = 19; bold = true; }
    if (cls != null && cls.indexOf("small") >= 0) size = 13;
    addTf(tf(t, size, clsColor(cls), bold, cw()));
  }
  public static function ul(items:Array<String>, ?cls:String) {
    if (items == null) return;
    var c = cls == null ? C.TX : clsColor(cls);
    for (x in items) {
      var s = new Sprite();
      var dot = tf("•", 15, c, false, 0); s.addChild(dot);
      var t = tf(x, 15, c, false, cw() - 16 * FS); t.x = 16 * FS; s.addChild(t);
      s.x = PAD; view.add(s, t.height, 3);
    }
    view.cursor += 4;
  }
  public static function btns(items:Array<Array<Dynamic>>) {
    var x = 0.0; var rowH = 40 * FS; var row = new Sprite(); var lines = 1;
    for (it in items) {
      if (it == null) continue;
      var k:String = it.length > 2 ? it[2] : "";
      var b = new Btn(it[0], k == null ? "" : k, it[1], FS);
      if (x > 0 && x + b.width > cw()) { x = 0; lines++; }
      b.x = x; b.y = (lines - 1) * (rowH + 7 * FS);
      row.addChild(b);
      x += b.width + 7 * FS;
    }
    row.x = PAD; view.cursor += 3 * FS;
    view.add(row, lines * rowH + (lines - 1) * 7 * FS, 10 * FS);
  }
  public static function items(rows:Array<Dynamic>) {
    for (r in rows) {
      var s = new Sprite();
      var w = cw();
      var rt:TextField = r.r != null && r.r != "" ? tf(r.r, 13, C.GOLD2, false, 0) : null;
      var tw = w - 24 * FS - (rt != null ? rt.width + 10 * FS : 0);
      var t = tf(r.t, 15, C.TX, true, tw); t.x = 12 * FS; t.y = 9 * FS; s.addChild(t);
      var hh = t.y + t.height;
      if (r.d != null && r.d != "") { var d = tf(r.d, 12.5, C.MU, false, tw); d.x = 12 * FS; d.y = hh; s.addChild(d); hh += d.height; }
      hh += 9 * FS;
      s.graphics.beginFill(C.CARD); s.graphics.lineStyle(1, C.LINE); s.graphics.drawRoundRect(0, 0, w, hh, 20 * FS, 20 * FS); s.graphics.endFill();
      if (r.ok == true) { s.graphics.lineStyle(); s.graphics.beginFill(C.GOOD); s.graphics.drawRect(0, 6, 3, hh - 12); s.graphics.endFill(); }
      if (rt != null) { rt.x = w - rt.width - 12 * FS; rt.y = (hh - rt.height) / 2; s.addChild(rt); }
      if (r.dis == true) s.alpha = 0.45;
      var f:Void->Void = r.f;
      if (f != null && r.dis != true) { s.buttonMode = true; s.mouseChildren = false; s.addEventListener(MouseEvent.CLICK, function(_) if (!dragMoved) f()); }
      s.x = PAD; view.add(s, hh, 6 * FS);
    }
  }
  public static function bar(label:String, pct:Float, cls:String, right:String) {
    var s = new Sprite(); var w = cw();
    var a = tf(label, 13, C.TX, false, 0); s.addChild(a);
    var b = tf(right, 13, C.MU, false, 0); b.x = w - b.width; s.addChild(b);
    var y = a.height + 2;
    s.graphics.beginFill(0x252b33); s.graphics.drawRoundRect(0, y, w, 9 * FS, 10, 10); s.graphics.endFill();
    var col = cls == "good" ? C.GOOD : (cls == "bad" ? C.BAD : (cls == "gold" ? C.GOLD : C.BLUE));
    var fw = w * Math.max(0, Math.min(100, pct)) / 100;
    if (fw > 0) { s.graphics.beginFill(col); s.graphics.drawRoundRect(0, y, fw, 9 * FS, 10, 10); s.graphics.endFill(); }
    s.x = PAD; view.add(s, y + 9 * FS);
  }
  public static function chance(white:Float, text:String) {
    var s = new Sprite(); var w = cw();
    s.graphics.beginFill(0x30353c); s.graphics.lineStyle(1, 0x444444); s.graphics.drawRect(0, 0, w, 10 * FS); s.graphics.endFill();
    s.graphics.lineStyle(); s.graphics.beginFill(0xf1ece0); s.graphics.drawRect(0, 0, w * Math.max(0, Math.min(100, white)) / 100, 10 * FS); s.graphics.endFill();
    var t = tf(text, 12.5, C.MU, false, w); t.y = 12 * FS; s.addChild(t);
    s.x = PAD; view.add(s, t.y + t.height);
  }
  public static function graph(vals:Array<Float>) {
    var n = vals.length; if (n < 2) return;
    var s = new Shape(); var w = cw(); var h = 120 * FS;
    s.graphics.beginFill(0x30353c); s.graphics.drawRect(0, 0, w, h); s.graphics.endFill();
    s.graphics.beginFill(0xefe9dc); s.graphics.moveTo(0, h);
    for (i in 0...n) s.graphics.lineTo(i * w / (n - 1), h - vals[i] * h / 100);
    s.graphics.lineTo(w, h); s.graphics.endFill();
    s.graphics.lineStyle(1, C.GOLD, 0.8); s.graphics.moveTo(0, h / 2); s.graphics.lineTo(w, h / 2);
    s.x = PAD; view.add(s, h);
  }
  /* versões simplificadas dos componentes novos do HTML5 */
  public static var boardColors:Array<String> = null;
  public static var boardTheme:String = null;
  public static function radar(axes:Array<Dynamic>) {
    for (a in axes) { var v:Float = a.val; bar(a.label, v < 0 ? 0 : v, v < 0 ? "" : (v >= 70 ? "good" : (v >= 45 ? "gold" : "bad")), v < 0 ? "sem dados" : Math.round(v) + ""); }
  }
  public static function lines(labels:Array<String>, series:Array<Dynamic>, lo:Float, hi:Float, ?unit:String = "", ?goal:Null<Float>) {
    for (sr in series) {
      var vals:Array<Dynamic> = sr.vals;
      p(sr.name + ": " + [for (i in 0...labels.length) if (vals[i] != null) labels[i] + " " + Math.round(vals[i]) + unit].join(" · "), "small");
    }
  }
  public static function seg(label:String, opts:Array<Array<Dynamic>>, cols:Int, ?note:String) {
    if (label != null) h(label);
    btns([for (o in opts) [o[0] + (o.length > 3 && o[3] != null && o[3] != "" ? " · " + o[3] : ""), o[1], o[2] == true ? "sel" : ""]]);
    if (note != null && note != "") p(note, "muted small");
  }
  public static function swatches(label:String, list:Array<Array<String>>, sel:String, pick:String->Void) {
    h(label);
    btns([for (t in list) [t[1], function() pick(t[0]), t[0] == sel ? "sel" : ""]]);
  }
  public static function gameCard(svg:String, title:String, sub:String, onInfo:Void->Void, onPlay:Void->Void) {
    items([{ t: title, d: sub, r: "jogar", f: onInfo }]);
  }
  public static function html(markup:String, ?cls:String) {}
  public static function group(cls:String, fn:Void->Void) fn();

  public static function stats(arr:Array<Array<String>>) {
    var s = new Sprite(); var n = arr.length; var g = 7 * FS; var w = (cw() - g * (n - 1)) / n; var hh = 0.0;
    var cells:Array<Sprite> = [];
    for (i in 0...n) {
      var c = new Sprite();
      var v = tf(arr[i][0], 20, C.GOLD2, true, w - 8); v.x = 4; v.y = 6 * FS;
      var fmt = v.getTextFormat(); fmt.align = TextFormatAlign.CENTER; v.setTextFormat(fmt);
      var l = tf(arr[i][1], 11.5, C.MU, false, w - 8); l.x = 4; l.y = v.y + v.height - 2;
      var fl = l.getTextFormat(); fl.align = TextFormatAlign.CENTER; l.setTextFormat(fl);
      c.addChild(v); c.addChild(l);
      hh = Math.max(hh, l.y + l.height + 6 * FS);
      c.x = i * (w + g); cells.push(c); s.addChild(c);
    }
    for (c in cells) { c.graphics.beginFill(C.CARD); c.graphics.lineStyle(1, C.LINE); c.graphics.drawRoundRect(0, 0, w, hh, 20 * FS, 20 * FS); c.graphics.endFill(); }
    s.x = PAD; view.add(s, hh);
  }
  public static function pre(text:String, fname:String) {
    var t = new TextField();
    t.defaultTextFormat = new TextFormat("_typewriter", Std.int(12 * FS), C.TX);
    t.multiline = true; t.wordWrap = true; t.selectable = true;
    t.width = cw(); t.height = 130 * FS;
    t.background = true; t.backgroundColor = 0x0f1216; t.border = true; t.borderColor = C.LINE;
    t.text = text;
    t.x = PAD; view.add(t, t.height);
    btns([["Copiar", function() { try { flash.system.System.setClipboard(text); toast("Copiado."); } catch (e:Dynamic) { toast("Não foi possível copiar."); } }, "pri"],
      fname == null ? null : ["Salvar arquivo", function() { try { new flash.net.FileReference().save(text, fname); } catch (e:Dynamic) { toast("Não foi possível salvar."); } }]]);
  }
  public static function input(ph:String, label:String, cb:String->Void) {
    var t = new TextField();
    t.defaultTextFormat = new TextFormat("_typewriter", Std.int(12 * FS), C.TX);
    t.type = TextFieldType.INPUT; t.multiline = true; t.wordWrap = true;
    t.width = cw(); t.height = 80 * FS;
    t.background = true; t.backgroundColor = 0x0f1216; t.border = true; t.borderColor = C.GOLD;
    t.x = PAD; view.add(t, t.height);
    p(ph, "muted small");
    btns([[label, function() cb(t.text), "pri"]]);
  }
  public static function sep() {
    var s = new Shape(); s.graphics.lineStyle(1, C.LINE); s.graphics.moveTo(0, 0); s.graphics.lineTo(cw(), 0);
    s.x = PAD; view.cursor += 6; view.add(s, 1, 10);
  }
  public static function modal(title:String, text:String, b:Array<Array<Dynamic>>) {
    var ov = new Sprite();
    ov.graphics.beginFill(0, 0.6); ov.graphics.drawRect(0, 0, W, H); ov.graphics.endFill();
    var bw = Math.min(W - 40, 420 * FS);
    var box = new Sprite();
    var t = tf(title, 16, C.GOLD, true, bw - 32); t.x = 16; t.y = 14; box.addChild(t);
    var y = t.y + t.height + 6;
    if (text != null) { var d = tf(text, 15, C.TX, false, bw - 32); d.x = 16; d.y = y; box.addChild(d); y += d.height + 8; }
    var x = 16.0;
    for (it in b) {
      var f:Void->Void = it[1];
      var bt = new Btn(it[0], it.length > 2 ? it[2] : "", function() { if (ov.parent != null) over.removeChild(ov); focus(); if (f != null) f(); }, FS);
      if (x > 16 && x + bt.width > bw - 16) { x = 16; y += bt.height + 8; }
      bt.x = x; bt.y = y; box.addChild(bt);
      x += bt.width + 8;
    }
    y += 40 * FS + 14;
    box.graphics.beginFill(0x161b22); box.graphics.lineStyle(1, C.GOLD); box.graphics.drawRoundRect(0, 0, bw, y, 26, 26); box.graphics.endFill();
    box.x = (W - bw) / 2; box.y = (H - y) / 2;
    ov.addChild(box);
    over.addChild(ov);
  }
  public static function toast(msg:String) {
    var s = new Sprite();
    var t = tf(msg, 14, C.GOLD2, false, 0);
    if (t.width > W - 60) t = tf(msg, 14, C.GOLD2, false, W - 60);
    s.graphics.beginFill(0x2a2415); s.graphics.lineStyle(1, C.GOLD); s.graphics.drawRoundRect(0, 0, t.width + 32, t.height + 16, 34, 34); s.graphics.endFill();
    t.x = 16; t.y = 8; s.addChild(t);
    s.x = (W - s.width) / 2; s.y = H - s.height - 34 * FS; s.mouseEnabled = false; s.mouseChildren = false;
    flash.Lib.current.addChild(s);
    haxe.Timer.delay(function() if (s.parent != null) s.parent.removeChild(s), 2200);
  }
  public static function every(ms:Int, fn:Void->Void):Dynamic { var t = new haxe.Timer(ms); t.run = fn; return t; }
  public static function cancel(h:Dynamic) { if (h != null) (h : haxe.Timer).stop(); }
  public static function later(ms:Int, fn:Void->Void) haxe.Timer.delay(fn, ms);
}

/* tabuleiro vetorial */
class BoardF extends Sprite {
  public var flip = false;
  public var fen:String = "";
  public var last:Array<Int> = null;
  public var arrows:Array<Array<Int>> = [];
  public var marks:Array<Array<Int>> = [];
  public var legal:Array<String> = null;
  public var blind = false;
  public var check = -1;
  public var onMove:String->Void = null;
  public var onSquare:Int->Void = null;
  public var theme:String = "";
  public var special:Array<Int> = [];
  var sel = -1; var S:Float; var q:Float;
  var sqL:Shape; var pcL:Shape; var arL:Shape; var coords:Array<TextField> = [];
  static var COLORS = [0x3aa35b, 0xd9534f, 0x3b82c4, 0xe0b13a, 0xe07b2a];
  public function new(size:Float) {
    super();
    S = size; q = size / 8;
    sqL = new Shape(); pcL = new Shape(); arL = new Shape();
    addChild(sqL); addChild(pcL);
    for (i in 0...16) { var t = UiFlash.tf("", 9.5, 0, true, 0); coords.push(t); addChild(t); }
    addChild(arL);
    graphics.beginFill(0, 0.01); graphics.drawRect(0, 0, S, S); graphics.endFill();
    mouseChildren = false; buttonMode = true;
    addEventListener(MouseEvent.CLICK, function(e:MouseEvent) {
      var c = Std.int(mouseX / q); var r = Std.int(mouseY / q);
      if (c < 0 || c > 7 || r < 0 || r > 7) return;
      click(r * 8 + c);
    });
  }
  inline function sqOf(i:Int):Int { var r = i >> 3; var c = i & 7; return flip ? (r * 8 + 7 - c) : ((7 - r) * 8 + c); }
  inline function vis(s:Int):Int { var c = s & 7; var r = s >> 3; return flip ? ((r) * 8 + 7 - c) : ((7 - r) * 8 + c); }
  public function show(f:String) { fen = f; sel = -1; draw(); }
  public function clearSel() { sel = -1; }
  function pieces():Array<Int> {
    var out = [for (i in 0...64) 0];
    var rows = fen.split(" ")[0].split("/");
    var map = ["p" => 1, "n" => 2, "b" => 3, "r" => 4, "q" => 5, "k" => 6, "f" => 7, "e" => 8, "s" => 9];
    for (r in 0...8) {
      var c = 0; var row = rows[r];
      for (k in 0...row.length) {
        var ch = row.charAt(k);
        var n = Std.parseInt(ch);
        if (n != null) c += n;
        else { var lw = ch.toLowerCase(); var t = map.get(lw); out[(7 - r) * 8 + c] = ch == lw ? -t : t; c++; }
      }
    }
    return out;
  }
  function targets():Array<Int> {
    var t:Array<Int> = [];
    if (sel < 0 || legal == null) return t;
    var fn = Engine.sqName(sel);
    for (u in legal) if (u.substr(0, 2) == fn) t.push(Engine.nameSq(u.substr(2, 2)));
    return t;
  }
  public function draw() {
    var g = sqL.graphics; g.clear();
    var pcs = pieces(); var tg = blind ? [] : targets();
    for (i in 0...64) {
      var s = sqOf(i); var x = (i & 7) * q; var y = (i >> 3) * q;
      var light = (((s >> 3) + (s & 7)) & 1) == 1;
      var sc = theme == "anc" ? 0xe3c792 : (theme == "med" ? (light ? 0xead9b0 : 0x8f5f37) : (light ? 0xf0d9b5 : 0xb58863));
      g.beginFill(sc); g.drawRect(x, y, q, q); g.endFill();
      if (theme == "anc") {
        g.lineStyle(1, 0x7a4e22, 0.6); g.drawRect(x, y, q, q);
        if (special.indexOf(s) >= 0) { g.lineStyle(1.6, 0x7a4e22, 0.7); g.moveTo(x + q * 0.18, y + q * 0.18); g.lineTo(x + q * 0.82, y + q * 0.82); g.moveTo(x + q * 0.82, y + q * 0.18); g.lineTo(x + q * 0.18, y + q * 0.82); }
        g.lineStyle();
      }
      if (last != null && (s == last[0] || s == last[1])) { g.beginFill(0xcdd25a, 0.5); g.drawRect(x, y, q, q); g.endFill(); }
      if (s == sel) { g.beginFill(0x14551e, 0.5); g.drawRect(x, y, q, q); g.endFill(); }
      for (m in marks) if (m[0] == s) { g.beginFill(COLORS[m[1]], 0.6); g.drawRect(x, y, q, q); g.endFill(); }
      if (s == check) {
        var mt = new Matrix(); mt.createGradientBox(q, q, 0, x, y);
        g.beginGradientFill(GradientType.RADIAL, [0xff0000, 0xe60000, 0xaa0000], [0.9, 0.5, 0], [0, 90, 185], mt);
        g.drawRect(x, y, q, q); g.endFill();
      }
    }
    var pg = pcL.graphics; pg.clear();
    for (i in 0...64) {
      var s = sqOf(i); var p = pcs[s];
      var x = (i & 7) * q; var y = (i >> 3) * q;
      if (p != 0) Pieces.draw(pg, p < 0 ? -p : p, p > 0, x, y, q);
      if (tg.indexOf(s) >= 0) {
        if (p != 0) { pg.lineStyle(q * 0.08, 0x14551e, 0.6); pg.drawCircle(x + q / 2, y + q / 2, q * 0.45); pg.lineStyle(); }
        else { pg.beginFill(0x14551e, 0.5); pg.drawCircle(x + q / 2, y + q / 2, q * 0.14); pg.endFill(); }
      }
    }
    for (k in 0...8) {
      var tr = coords[k]; var row = k; var s = sqOf(row * 8);
      tr.text = Std.string((s >> 3) + 1);
      var f = tr.getTextFormat(); f.color = (((s >> 3) + (s & 7)) & 1) == 1 ? 0xb58863 : 0xf0d9b5; tr.setTextFormat(f);
      tr.x = 1; tr.y = row * q;
      var tf = coords[8 + k]; var s2 = sqOf(56 + k);
      tf.text = "abcdefgh".charAt(s2 & 7);
      var f2 = tf.getTextFormat(); f2.color = (((s2 >> 3) + (s2 & 7)) & 1) == 1 ? 0xb58863 : 0xf0d9b5; tf.setTextFormat(f2);
      tf.x = (k + 1) * q - tf.width - 1; tf.y = S - tf.height;
    }
    var ag = arL.graphics; ag.clear();
    for (a in arrows) {
      var p0 = cen(a[0]); var p1 = cen(a[1]);
      Pieces.arrow(ag, p0[0], p0[1], p1[0], p1[1], COLORS[a.length > 2 ? a[2] : 0], q * 0.18);
    }
  }
  function cen(s:Int):Array<Float> {
    var v = vis(s);
    return [(v & 7) * q + q / 2, (v >> 3) * q + q / 2];
  }
  function click(i:Int) {
    if (UiFlash.dragMoved) return;
    var s = sqOf(i);
    if (onSquare != null) { onSquare(s); return; }
    if (legal == null || onMove == null) return;
    var fn = Engine.sqName(s);
    var hasFrom = false;
    for (u in legal) if (u.substr(0, 2) == fn) { hasFrom = true; break; }
    if (sel >= 0) {
      var from = Engine.sqName(sel);
      for (u in legal) if (u.substr(0, 4) == from + fn) { sel = -1; draw(); onMove(from + fn); return; }
    }
    sel = hasFrom && sel != s ? s : -1;
    draw();
  }
}
#end
