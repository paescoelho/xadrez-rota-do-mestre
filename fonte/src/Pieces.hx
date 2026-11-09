package;

import flash.display.Graphics;

/* Peças desenhadas como vetores (as fontes do Ruffle não têm os símbolos de xadrez). */
class Pieces {
  static function poly(g:Graphics, pts:Array<Float>, ox:Float, oy:Float, k:Float) {
    g.moveTo(ox + pts[0] * k, oy + pts[1] * k);
    var i = 2;
    while (i < pts.length) { g.lineTo(ox + pts[i] * k, oy + pts[i + 1] * k); i += 2; }
    g.lineTo(ox + pts[0] * k, oy + pts[1] * k);
  }
  static function shape(g:Graphics, pts:Array<Float>, ox:Float, oy:Float, k:Float) {
    g.beginFill(fillC);
    poly(g, pts, ox, oy, k);
    g.endFill();
  }
  static var fillC:Int = 0xFFFFFF;

  /* desenha a peça `t` (1 peão ... 6 rei) dentro do quadrado (x,y) de lado s */
  public static function draw(g:Graphics, t:Int, white:Bool, x:Float, y:Float, s:Float) {
    var k = s / 100;
    fillC = white ? 0xFBFAF6 : 0x1A1F23;
    var line = white ? 0x1E262B : 0x000000;
    g.lineStyle(white ? 2 : 1.5, line, 1);
    var base = [24.0, 84, 76, 84, 78, 92, 22, 92];
    switch (t) {
      case 1: // peão
        shape(g, [38.0, 50, 62, 50, 67, 70, 74, 84, 26, 84, 33, 70], x, y, k);
        g.beginFill(fillC); g.drawCircle(x + 50 * k, y + 34 * k, 13 * k); g.endFill();
        g.beginFill(fillC); g.drawCircle(x + 50 * k, y + 50 * k, 0.1); g.endFill();
        shape(g, base, x, y, k);
      case 2: // cavalo
        shape(g, [24.0, 84, 28, 66, 38, 54, 36, 46, 26, 52, 20, 47, 32, 28, 40, 22, 43, 11, 51, 19, 60, 21, 71, 36, 76, 60, 73, 84], x, y, k);
        g.lineStyle(0, 0, 0);
        g.beginFill(white ? 0x1E262B : 0xEDEDED); g.drawCircle(x + 48 * k, y + 33 * k, 2.6 * k); g.endFill();
        g.lineStyle(white ? 2 : 1.5, line, 1);
        shape(g, base, x, y, k);
      case 3: // bispo
        shape(g, [50.0, 18, 62, 34, 62, 48, 56, 56, 61, 70, 68, 82, 32, 82, 39, 70, 44, 56, 38, 48, 38, 34], x, y, k);
        g.beginFill(fillC); g.drawCircle(x + 50 * k, y + 13 * k, 6 * k); g.endFill();
        g.lineStyle(white ? 2 : 1.5, white ? 0x1E262B : 0xDDDDDD, 1);
        g.moveTo(x + 50 * k, y + 30 * k); g.lineTo(x + 50 * k, y + 44 * k);
        g.moveTo(x + 44 * k, y + 37 * k); g.lineTo(x + 56 * k, y + 37 * k);
        g.lineStyle(white ? 2 : 1.5, line, 1);
        shape(g, base, x, y, k);
      case 4: // torre
        shape(g, [30.0, 84, 33, 44, 29, 44, 29, 20, 39, 20, 39, 29, 45, 29, 45, 20, 55, 20, 55, 29, 61, 29, 61, 20, 71, 20, 71, 44, 67, 44, 70, 84], x, y, k);
        shape(g, base, x, y, k);
      case 5: // dama
        shape(g, [30.0, 84, 34, 56, 22, 28, 36, 46, 38, 20, 50, 44, 62, 20, 64, 46, 78, 28, 66, 56, 70, 84], x, y, k);
        for (c in [[22.0, 26], [38.0, 17], [50.0, 13], [62.0, 17], [78.0, 26]]) { g.beginFill(fillC); g.drawCircle(x + c[0] * k, y + c[1] * k, 4.5 * k); g.endFill(); }
        shape(g, base, x, y, k);
      case 7: // conselheiro (mantri, firzan, met)
        shape(g, base, x, y, k);
        shape(g, [31.0, 80, 41, 56, 59, 56, 69, 80], x, y, k);
        shape(g, [38.0, 56, 62, 56, 60, 50, 40, 50], x, y, k);
        g.beginFill(fillC); g.drawCircle(x + 50 * k, y + 38 * k, 15 * k); g.endFill();
        g.beginFill(fillC); g.drawCircle(x + 50 * k, y + 18 * k, 4.5 * k); g.endFill();
        g.lineStyle(white ? 2 : 1.5, white ? 0x1E262B : 0xEDEDED, 1);
        g.moveTo(x + 40 * k, y + 34 * k); g.curveTo(x + 50 * k, y + 39 * k, x + 60 * k, y + 34 * k);
        g.moveTo(x + 41 * k, y + 42 * k); g.curveTo(x + 50 * k, y + 46 * k, x + 59 * k, y + 42 * k);
      case 8: // elefante (gaja, alfil)
        shape(g, base, x, y, k);
        shape(g, [34.0, 80, 42, 66, 58, 66, 66, 80], x, y, k);
        g.beginFill(fillC); g.drawEllipse(x + 16 * k, y + 21 * k, 24 * k, 34 * k); g.endFill();
        g.beginFill(fillC); g.drawEllipse(x + 60 * k, y + 21 * k, 24 * k, 34 * k); g.endFill();
        g.beginFill(fillC); g.drawCircle(x + 50 * k, y + 37 * k, 17 * k); g.endFill();
        g.lineStyle(11 * k, line, 1);
        g.moveTo(x + 50 * k, y + 46 * k); g.curveTo(x + 46 * k, y + 60 * k, x + 54 * k, y + 68 * k);
        g.lineStyle(6 * k, fillC, 1);
        g.moveTo(x + 50 * k, y + 46 * k); g.curveTo(x + 46 * k, y + 60 * k, x + 54 * k, y + 68 * k);
        g.lineStyle(2.5 * k, white ? 0x1E262B : 0xEDEDED, 1);
        g.moveTo(x + 42 * k, y + 50 * k); g.curveTo(x + 38 * k, y + 57 * k, x + 31 * k, y + 57 * k);
        g.moveTo(x + 58 * k, y + 50 * k); g.curveTo(x + 62 * k, y + 57 * k, x + 69 * k, y + 57 * k);
        g.lineStyle(0, 0, 0);
        g.beginFill(white ? 0x1E262B : 0xEDEDED); g.drawCircle(x + 44 * k, y + 33 * k, 2 * k); g.drawCircle(x + 56 * k, y + 33 * k, 2 * k); g.endFill();
      case 9: // khon (makruk)
        shape(g, base, x, y, k);
        shape(g, [30.0, 80, 34, 69, 66, 69, 70, 80], x, y, k);
        shape(g, [36.0, 69, 39, 58, 61, 58, 64, 69], x, y, k);
        shape(g, [40.0, 58, 44, 44, 56, 44, 60, 58], x, y, k);
        shape(g, [46.0, 44, 50, 19, 54, 44], x, y, k);
      default: // rei
        shape(g, [30.0, 84, 34, 58, 30, 40, 70, 40, 66, 58, 70, 84], x, y, k);
        shape(g, [44.0, 8, 56, 8, 56, 16, 64, 16, 64, 24, 56, 24, 56, 40, 44, 40, 44, 24, 36, 24, 36, 16, 44, 16], x, y, k);
        shape(g, base, x, y, k);
    }
    g.lineStyle(0, 0, 0);
  }

  public static function arrow(g:Graphics, x1:Float, y1:Float, x2:Float, y2:Float, color:Int, w:Float) {
    var dx = x2 - x1; var dy = y2 - y1; var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    var ux = dx / len; var uy = dy / len;
    var hx = x2 - ux * w * 2.2; var hy = y2 - uy * w * 2.2;
    g.lineStyle(w, color, 0.85, false, flash.display.LineScaleMode.NORMAL, flash.display.CapsStyle.ROUND);
    g.moveTo(x1, y1); g.lineTo(hx, hy);
    g.lineStyle(0, 0, 0);
    g.beginFill(color, 0.85);
    g.moveTo(x2, y2);
    g.lineTo(hx - uy * w * 1.5, hy + ux * w * 1.5);
    g.lineTo(hx + uy * w * 1.5, hy - ux * w * 1.5);
    g.lineTo(x2, y2);
    g.endFill();
  }
}
