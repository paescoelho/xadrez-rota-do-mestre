package;

#if js
import js.Browser;
import js.html.Element;

/* Interface HTML5 (DOM). Mesmo conjunto de funções da UiFlash. */
class UiJs {
  public static var board:BoardJ = null;
  public static var root:Element; public static var cur:Element; public static var panelEl:Element; static var mainEl:Element;
  static var topBar:Element; static var botBar:Element;
  public static var actionBar:Element; public static var chanceBar:Element;
  static var backFn:Void->Void = null;
  public static var isFlash = false;

  static inline function doc() return Browser.document;
  public static function el(tag:String, cls:String, ?parent:Element, ?text:String):Element {
    var e = doc().createElement(tag);
    if (cls != null && cls != "") e.className = cls;
    if (text != null) e.textContent = text;
    if (parent != null) parent.appendChild(e);
    return e;
  }
  public static function init(ready:Void->Void) {
    root = doc().getElementById("app");
    Browser.window.addEventListener("keydown", function(e:Dynamic) {
      if (e.key == "Escape" && backFn != null && doc().querySelector(".modal") == null) backFn();
    });
    ready();
  }

  /* ---------- abertura: vídeo 100% HTML5 (H.264 pelo WebCodecs em canvas + áudio Web Audio) ----------
     Sem elemento de vídeo: roda também nos visualizadores simplificados (WhatsApp, prévias de arquivo).
     O vídeo termina no escuro; o menu "acorda" a partir dele: a luz pisca e acende, a cor volta e os botões sobem. */
  public static function intro(done:Void->Void) {
    root.innerHTML = "";
    var ov = el("div", "intro", root);
    var cv:Dynamic = el("canvas", "introc", ov);
    var ctx:Dynamic = cv.getContext("2d");
    var tap = el("div", "introtap", ov);
    el("div", "introtitle", tap, "XADREZ");
    el("div", "introsub", tap, "Rota do Mestre");
    var go = el("div", "introgo", tap, "Toque para começar");
    var skip = el("button", "skip", ov, "Pular ›");
    var w:Dynamic = Browser.window;
    if (w.XLITE == true) { done(); awaken(null); return; }
    var frames:Array<String> = null;
    try { frames = haxe.Json.parse(doc().getElementById("introfr").textContent); } catch (e:Dynamic) {}
    /* duração real do vídeo, lida do índice dos quadros (último tempo + 1 quadro);
       "safe": trechos de legenda sobre fundo preto e a largura que ela ocupa; "black": onde o vídeo já escureceu */
    var DUR = 12.0; var END = 11.7; var safe:Array<Array<Float>> = [];
    try {
      var hx:Dynamic = haxe.Json.parse(doc().getElementById("introhdx").textContent);
      var ts:Array<Float> = hx != null ? hx.ts : null;
      if (ts != null && ts.length > 1) { var mx = 0.0; for (v in ts) if (v > mx) mx = v; DUR = (mx + mx / (ts.length - 1)) / 1e6; END = DUR - 0.12; }
      if (hx != null && hx.safe != null) safe = hx.safe;
      if (hx != null && hx.black != null && hx.black > DUR - 1.5) END = hx.black;
    } catch (e:Dynamic) {}
    var FPS = 8.0; var stills = false;
    if (frames != null && frames.length > 0 && frames.length < 30) { stills = true; FPS = frames.length / DUR; }
    var imgs:Array<Dynamic> = [];
    var finished = false; var ending = false; var started = false; var raf:Dynamic = null;
    var actx:Dynamic = null; var src:Dynamic = null; var gain:Dynamic = null; var t0 = 0.0; var useAudio = false; var tStart = 0.0;
    var lastDrawn = -1;
    var hd = false; var xhd:Dynamic = w.XHD;
    var abuf:Dynamic = null; var begunRef = [false];
    function startAudio() {
      if (abuf == null || src != null || finished || ending) return;
      try {
        gain = actx.createGain(); gain.connect(actx.destination);
        src = actx.createBufferSource(); src.buffer = abuf; src.connect(gain);
        var elapsed = (w.performance.now() - tStart) / 1000;
        t0 = actx.currentTime - elapsed; src.start(0, elapsed); useAudio = true;
      } catch (e:Dynamic) { useAudio = false; }
    }
    function size() {
      var dpr = Math.min(2, w.devicePixelRatio != null ? w.devicePixelRatio : 1);
      cv.width = Std.int(ov.clientWidth * dpr); cv.height = Std.int(ov.clientHeight * dpr);
    }
    function load(i:Int):Dynamic {
      if (frames == null || i < 0 || i >= frames.length) return null;
      if (imgs[i] == null) { var im:Dynamic = js.Syntax.code("new Image()"); im.src = "data:image/webp;base64," + frames[i]; imgs[i] = im; }
      return imgs[i];
    }
    function ready(im:Dynamic):Bool return im != null && im.complete == true && im.naturalWidth > 0;
    /* enquadramento: celular em pé = cobre a tela toda sem distorcer; nas legendas sobre o preto reduz só o
       necessário para a frase caber inteira (as faixas somem no preto); tela larga = vídeo inteiro com fundo desfocado */
    var curT = 0.0;
    function wide():Bool return cv.width / Math.max(1, cv.height) > 0.7;
    function inSafe(t:Float):Array<Float> { for (r in safe) if (t >= r[0] && t < r[1]) return r; return null; }
    function scaleFor(iw:Float, ih:Float, t:Float):Float {
      var cw:Float = cv.width; var ch:Float = cv.height;
      var cover = Math.max(cw / iw, ch / ih); var contain = Math.min(cw / iw, ch / ih);
      /* abertura 16:9 (computador): preenche a tela inteira em monitores de 3:2 a 21:10; fora disso, inteira com fundo desfocado */
      if (wide() && iw > ih) { var ar = cw / Math.max(1, ch); return (ar >= 1.45 && ar <= 2.15) ? cover : contain; }
      if (wide()) return contain;
      var r = inSafe(t);
      return r == null ? cover : Math.max(contain, Math.min(cover, cw / (iw * r[2])));
    }
    var bgc:Dynamic = null; var bgm:Dynamic = null;
    function backdrop(im:Dynamic, iw:Float, ih:Float) {
      var cw:Float = cv.width; var ch:Float = cv.height;
      if (bgc == null) { bgc = doc().createElement("canvas"); bgm = doc().createElement("canvas"); }
      /* fundo desfocado em duas etapas (miniatura -> média com desfoque -> tela): suave e barato */
      var tw = 24; var th = Std.int(Math.max(6, Math.round(24 * ch / cw)));
      var mw = 192; var mh = Std.int(Math.max(32, Math.round(192 * ch / cw)));
      if (bgc.width != tw || bgc.height != th) { bgc.width = tw; bgc.height = th; }
      if (bgm.width != mw || bgm.height != mh) { bgm.width = mw; bgm.height = mh; }
      var b:Dynamic = bgc.getContext("2d");
      var k = Math.max(tw / iw, th / ih);
      b.drawImage(im, (tw - iw * k) / 2, (th - ih * k) / 2, iw * k, ih * k);
      var mm:Dynamic = bgm.getContext("2d");
      mm.imageSmoothingEnabled = true;
      try { mm.filter = "blur(7px)"; } catch (e:Dynamic) {}
      mm.drawImage(bgc, -12, -12, mw + 24, mh + 24);
      try { mm.filter = "none"; } catch (e:Dynamic) {}
      ctx.imageSmoothingEnabled = true; ctx.drawImage(bgm, 0, 0, cw, ch);
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 0, cw, ch);
    }
    function place(im:Dynamic, iw:Float, ih:Float, t:Float, zoom:Float) {
      var cw:Float = cv.width; var ch:Float = cv.height;
      var k = scaleFor(iw, ih, t); if (inSafe(t) == null) k *= zoom;
      var dw = iw * k; var dh = ih * k;
      if (wide() && dw < cw - 2) backdrop(im, iw, ih);
      ctx.drawImage(im, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }
    function drawSrc(im:Dynamic, iw:Float, ih:Float) {
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height);
      place(im, iw, ih, curT, 1.0);
    }
    function drawImg(im:Dynamic, alpha:Float, ?zoom:Float = 1.0, ?at:Float = 0.0) {
      ctx.globalAlpha = alpha;
      place(im, im.naturalWidth, im.naturalHeight, at, zoom);
      ctx.globalAlpha = 1;
    }
    /* fim: o menu nasce do escuro (sem corte seco) */
    function wake() {
      if (finished) return; finished = true;
      if (raf != null) w.cancelAnimationFrame(raf);
      try { if (src != null) src.stop(); } catch (e:Dynamic) {}
      try { if (hd) xhd.stop(); } catch (e:Dynamic) {}
      imgs = [];
      done();
      awaken(actx);
    }
    /* escurece a imagem e abaixa o som juntos; no fim natural o vídeo já está no preto */
    function finish(fade:Float) {
      if (ending || finished) return; ending = true;
      skip.style.display = "none";
      try {
        if (gain != null) { var tt:Float = actx.currentTime; gain.gain.cancelScheduledValues(tt); gain.gain.setValueAtTime(gain.gain.value, tt); gain.gain.linearRampToValueAtTime(0.0001, tt + fade + 0.06); }
      } catch (e:Dynamic) {}
      var tr = "opacity " + fade + "s ease-in";
      cv.style.transition = tr; tap.style.transition = tr;
      cv.style.opacity = "0"; tap.style.opacity = "0";
      haxe.Timer.delay(wake, Std.int(fade * 1000) + 30);
    }
    function now():Float return useAudio ? (actx.currentTime - t0) : (w.performance.now() - tStart) / 1000;
    function frame(_:Dynamic) {
      if (finished) return;
      var t = now();
      /* o vídeo termina escurecendo: a saída acompanha esse escurecer, sem esperar o último quadro */
      if (t >= END) finish(Math.max(0.15, Math.min(0.35, DUR - t)));
      if (hd && xhd.failed() == true) { hd = false; for (k in 0...16) load(Std.int(t * FPS) + k); }
      if (hd) {
        curT = t;
        if (xhd.draw(t, drawSrc) == true) lastDrawn = Std.int(t * 30);
        raf = w.requestAnimationFrame(frame);
        return;
      }
      var fi = t * FPS; var i = Std.int(fi); var a = fi - i;
      if (i >= frames.length - 1) { i = frames.length - 1; a = 0; }
      for (k in 0...14) load(i + k);
      var j = i - 3; while (j >= 0 && imgs[j] != null) { imgs[j] = null; j--; }
      var cur = imgs[i]; var nxt = imgs[i + 1];
      if (ready(cur)) {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height);
        if (stills) {
          /* reserva sem WebCodecs: imagens em HD com aproximação lenta e fusão suave */
          var at = (i + 0.5) / FPS; var an = (i + 1.5) / FPS;
          if (wide()) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height); }
          drawImg(cur, 1, 1 + 0.07 * a, at);
          if (a > 0.72 && ready(nxt)) drawImg(nxt, (a - 0.72) / 0.28, 1.0, an);
          /* como o vídeo, termina no preto */
          if (t > DUR - 0.9) { ctx.fillStyle = "rgba(0,0,0," + Math.min(1, (t - (DUR - 0.9)) / 0.8) + ")"; ctx.fillRect(0, 0, cv.width, cv.height); }
        } else {
          drawImg(cur, 1, 1.0, i / FPS);
          if (a > 0 && ready(nxt)) drawImg(nxt, a, 1.0, (i + 1) / FPS);
        }
        lastDrawn = i;
      }
      raf = w.requestAnimationFrame(frame);
    }
    function start() {
      if (started) return; started = true;
      /* o título se dissolve na primeira cena */
      tap.style.transition = "opacity .6s ease-out"; tap.style.opacity = "0"; tap.style.pointerEvents = "none";
      size();
      /* áudio pelo Web Audio (não depende de player de mídia) */
      try {
        var AC:Dynamic = w.AudioContext != null ? w.AudioContext : w.webkitAudioContext;
        if (AC != null) {
          actx = js.Syntax.code("new ({0})()", AC);
          var b64:String = doc().getElementById("introau").textContent;
          var bin:String = w.atob(b64); var n = bin.length;
          var u8:Dynamic = js.Syntax.code("new Uint8Array({0})", n);
          for (k in 0...n) u8[k] = bin.charCodeAt(k);
          var onBuf = function(buf:Dynamic) { if (finished) return; abuf = buf; if (begunRef[0]) startAudio(); };
          var pr:Dynamic = actx.decodeAudioData(u8.buffer, onBuf, function(_) {});
          if (pr != null && pr.then != null) pr.then(null, function(_) {});
          if (actx.resume != null) actx.resume();
        }
      } catch (e:Dynamic) { useAudio = false; }
      /* HD pelo WebCodecs quando o aparelho suporta; senão, quadros WebP */
      var begun = false;
      function begin(useHd:Bool) {
        if (begun || finished) return; begun = true;
        hd = useHd;
        if (!hd) for (k in 0...16) load(k);
        tStart = w.performance.now();
        begunRef[0] = true;
        startAudio();
        raf = w.requestAnimationFrame(frame);
        /* segurança: se nenhum quadro aparecer em 4 s, segue para o menu */
        haxe.Timer.delay(function() if (!finished && lastDrawn < 0) finish(0.3), 4000);
      }
      try {
        if (xhd != null) { var pr:Dynamic = xhd.prepare(); pr.then(function(ok:Bool) begin(ok == true), function(_) begin(false)); }
        else begin(false);
      } catch (e:Dynamic) { begin(false); }
      haxe.Timer.delay(function() begin(false), 1500);
    }
    if (frames == null || frames.length == 0) { go.textContent = "Toque para entrar"; tap.onclick = function(_) finish(0.35); skip.onclick = function(_) finish(0.35); return; }
    /* pôster: primeira cena atrás do título */
    size();
    var p0 = load(0);
    function poster() if (!started && !finished && ready(p0)) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height); drawImg(p0, 1); }
    p0.onload = function(_) poster();
    p0.onerror = function(_) { go.textContent = "Toque para entrar"; frames = null; tap.onclick = function(_) finish(0.35); };
    w.addEventListener("resize", function(_) { if (finished) return; size(); poster(); });
    tap.onclick = function(_) start();
    skip.onclick = function(_) finish(0.45);
  }

  /* transição vídeo -> menu, contínua com o fim do filme (que apaga no preto, em preto e branco):
     a luz da luminária acende devagar e escorre de cima para baixo pela sala, a cena ainda em preto e branco;
     depois a cor volta, o título sobe do escuro e os botões entram em sequência; um brilho passa no "Jogar".
     Som no mesmo compasso: um grave que abre com a luz, um ar que cresce com a cor e um toque leve no brilho. */
  static function awaken(actx:Dynamic) {
    var w:Dynamic = Browser.window;
    var m:Dynamic = root.querySelector(".menu");
    if (m != null) {
      m.className += " wake";
      var its:Dynamic = m.querySelectorAll(".mitem");
      for (k in 0...its.length) its[k].style.animationDelay = Std.string(Math.round((1.05 + Math.min(k, 12) * 0.045) * 1000) / 1000) + "s";
    }
    var fx = el("div", "wakefx", root);
    try { if (w.CSS != null && w.CSS.registerProperty != null) fx.className += " rad"; } catch (e:Dynamic) {}
    el("i", "wk-gray", fx); el("i", "wk-dark", fx); el("i", "wk-lamp", fx);
    haxe.Timer.delay(function() if (fx.parentNode != null) fx.parentNode.removeChild(fx), 2700);
    if (actx == null) return;
    try {
      if (actx.resume != null) actx.resume();
      var t:Float = actx.currentTime + 0.05;
      var sr:Float = actx.sampleRate;
      var bus:Dynamic = actx.createGain(); bus.gain.value = 0.9; bus.connect(actx.destination);
      /* grave que abre junto com a luz */
      for (f in [[49.0, 0.16], [98.0, 0.07]]) {
        var o:Dynamic = actx.createOscillator(); o.type = "sine"; o.frequency.value = f[0];
        var g:Dynamic = actx.createGain();
        g.gain.setValueAtTime(0.0001, t + 0.1); g.gain.linearRampToValueAtTime(f[1], t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
        o.connect(g); g.connect(bus); o.start(t + 0.1); o.stop(t + 2.7);
      }
      /* ar que cresce enquanto a cor volta */
      var len = Std.int(sr * 2.6); var nb:Dynamic = actx.createBuffer(1, len, sr); var d:Dynamic = nb.getChannelData(0);
      for (i in 0...len) d[i] = Math.random() * 2 - 1;
      var ns:Dynamic = actx.createBufferSource(); ns.buffer = nb;
      var bp:Dynamic = actx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.6;
      bp.frequency.setValueAtTime(700, t + 0.2); bp.frequency.exponentialRampToValueAtTime(3800, t + 1.8);
      var ng:Dynamic = actx.createGain();
      ng.gain.setValueAtTime(0.0001, t + 0.2); ng.gain.exponentialRampToValueAtTime(0.028, t + 0.95); ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      ns.connect(bp); bp.connect(ng); ng.connect(bus); ns.start(t + 0.2); ns.stop(t + 2.5);
      /* toque leve quando o brilho passa no botão Jogar */
      var c = t + 1.8;
      for (f in [[1568.0, 0.03], [2349.3, 0.012]]) {
        var o:Dynamic = actx.createOscillator(); o.type = "sine"; o.frequency.value = f[0];
        var g:Dynamic = actx.createGain();
        g.gain.setValueAtTime(0.0001, c); g.gain.exponentialRampToValueAtTime(f[1], c + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, c + 1.5);
        o.connect(g); g.connect(bus); o.start(c); o.stop(c + 1.6);
      }
    } catch (e:Dynamic) {}
    haxe.Timer.delay(function() try actx.close() catch (e:Dynamic) {}, 4200);
  }

  /* ---------- menu principal ---------- */
  public static function menu(items:Array<Dynamic>, info:String) {
    backFn = null; board = null;
    root.innerHTML = "";
    var m = el("div", "menu", root);
    var top = el("div", "mtop", m);
    el("div", "mking", top, "♔");
    var tt = el("div", "mtitle", top);
    tt.innerHTML = [for (i in 0...6) '<span style="animation-delay:' + (0.15 + i * 0.09) + 's,' + (1.6 + i * 0.13) + 's,' + (i * 0.2) + 's">' + "XADREZ".charAt(i) + '</span>'].join("");
    tt.setAttribute("aria-label", "XADREZ");
    var orn = el("div", "morn", top); orn.innerHTML = ORN;
    el("div", "msub", top, "Rota do Mestre");
    if (info != null && info != "") el("div", "minfo", top, info);
    var g = el("div", "mgrid", m);
    for (it in items) mitem(g, it);
    /* linhas da grade: botões comuns em pares; Painel e História (os dois últimos) ganham linhas mais altas */
    var big = 0; var wide = 0; var half = 0;
    for (it in items) if (it.ico == "pnl" || it.ico == "hist") big++; else if (it.wide == true || it.lone == true) wide++; else half++;
    g.style.setProperty("--r2", Std.string(wide + Math.ceil(half / 2)));
    g.style.setProperty("--r3", Std.string(wide + Math.ceil(half / 3)));
    g.style.setProperty("--rb", Std.string(big));
    if (big > 0) g.className += " hasbig";
    var ft = el("div", "mfoot", m);
    ft.innerHTML = '<span class="sigk pc wN" aria-hidden="true"></span><span class="sig"><span class="sigby">criado por</span><span class="signm">Rodrigo Paes Coelho Santana</span></span><span class="sigk2 pc wN" aria-hidden="true"></span>';
  }

  static function mitem(g:Element, it:Dynamic) {
    if (it.ico == "pnl") { panelBtn(g, it); return; }
    if (it.ico == "hist") { histBtn(g, it); return; }
    var b = el("button", "mitem" + (it.wide == true ? " wide" : "") + (it.hl == true ? " hl" : "") + (it.hero == true ? " hero" : "") + (it.cont == true ? " cont" : "") + ((it.t : String).length > 16 && it.wide != true ? " lt" : "") + (it.ico == "evo" ? " evo" : "") + (it.ico == "radar" ? " evo rad" : "") + (it.ico == "ct" ? " ctb" : "") + (it.lone == true ? " lone" : ""), g);
    var txt = b;
    if (it.hero == true || it.ico != null) {
      if (it.hero == true) el("span", "mic pc wN", b);
      if (it.ico == "whats") { var ic = el("span", "mic mwa", b); ic.innerHTML = WA; }
      if (it.ico == "ct") { var ic = el("span", "mic mct", b); ic.innerHTML = CTI; }
      if (ICONS.exists(it.ico)) { var ic = el("span", "mic mico ic-" + it.ico, b); ic.innerHTML = ICONS.get(it.ico); }
      txt = el("span", "mtx", b); b.className += " irow";
    }
    el("span", "mt", txt, it.t);
    if (it.d != null) el("span", "md", txt, it.d);
    if (it.ico == "evo") { var ev = el("span", "mevo", b); ev.innerHTML = EVO; }
    if (it.ico == "radar") { var ev = el("span", "mevo mrad", b); ev.innerHTML = RAD; }
    var f:Void->Void = it.f;
    b.onclick = function(_) f();
  }
  /* ---------- Painel de evolução: "Sua constelação" ----------
     As 9 estrelas são os 9 eixos do seu perfil (dados reais); a linha tracejada azul é você no mês passado.
     Ao abrir, as estrelas acendem uma a uma e se ligam, o Elo conta até o valor atual e a barra corre até a meta;
     se você subiu no mês, passa uma estrela cadente. */
  static function panelBtn(g:Element, it:Dynamic) {
    var d:Dynamic = it.pnl;
    var b = el("button", "mitem wide pnl" + (it.hl == true ? " hl" : ""), g);
    var elo:Int = d.elo; var delta:Int = d.delta;
    var ax:Array<Dynamic> = d.ax; var pv:Array<Dynamic> = d.prev;
    var n = ax.length; var W = 160.0; var H = 80.0; var cx = 80.0; var cy = 42.0; var R = 33.0;
    function pt(i:Int, v:Float):String { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return (Math.round((cx + Math.cos(a) * R * v) * 10) / 10) + "," + (Math.round((cy + Math.sin(a) * R * v) * 10) / 10); }
    function vv(x:Dynamic):Float { var f:Float = x == null ? -1 : x; return f < 0 ? 0.22 : Math.max(0.12, f / 100); }
    var s = new StringBuf();
    s.add("<svg viewBox='0 0 160 80' preserveAspectRatio='xMidYMid meet' aria-hidden='true'>");
    s.add("<defs><linearGradient id='pnsh' x1='1' x2='0'><stop offset='0' stop-color='#fff'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></linearGradient></defs>");
    var seed = 7;
    function rnd():Float { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (k in 0...30) s.add("<circle class='pn-bg' cx='" + Math.round(rnd() * 160) + "' cy='" + Math.round(rnd() * 80) + "' r='" + (0.35 + rnd() * 0.5) + "' style='animation-delay:" + (Math.round(rnd() * 40) / 10) + "s'/>");
    for (k in 1...4) s.add("<polygon points='" + [for (i in 0...n) pt(i, k / 3)].join(" ") + "' fill='" + (k == 3 ? "rgba(243,217,140,.04)" : "none") + "' stroke='" + (k == 3 ? "#7a6a44" : "#4a3f2a") + "' stroke-width='" + (k == 3 ? ".7" : ".5") + "'/>");
    /* v35: raios do centro até cada eixo, para a teia ter estrutura mesmo sem dados */
    for (i in 0...n) { var e = pt(i, 1).split(","); s.add("<line x1='" + cx + "' y1='" + cy + "' x2='" + e[0] + "' y2='" + e[1] + "' stroke='#4a3f2a' stroke-width='.4'/><circle cx='" + e[0] + "' cy='" + e[1] + "' r='.9' fill='#8a7a52'/>"); }
    if (pv != null && pv.length == n) s.add("<polygon class='pn-prev' points='" + [for (i in 0...n) pt(i, vv(pv[i]))].join(" ") + "' fill='none' stroke='#7fb2d9' stroke-width='.7' stroke-dasharray='2 2'/>");
    s.add("<polygon class='pn-line' pathLength='1' points='" + [for (i in 0...n) pt(i, vv(ax[i]))].join(" ") + "' fill='rgba(243,217,140,.14)' stroke='#f3d98c' stroke-width='.9' stroke-linejoin='round'/>");
    for (i in 0...n) {
      var xy = pt(i, vv(ax[i])).split(",");
      var known = ax[i] != null && (ax[i] : Float) >= 0;
      s.add("<g class='pn-star' style='animation-delay:" + (1.0 + i * 0.13) + "s'><circle cx='" + xy[0] + "' cy='" + xy[1] + "' r='4.6' fill='#f3d98c' opacity='.16'/><circle cx='" + xy[0] + "' cy='" + xy[1] + "' r='" + (known ? 2.1 : 1.3) + "' fill='" + (known ? "#fff1c4" : "#a8966a") + "'/></g>");
    }
    if (delta > 0) s.add("<g class='pn-shoot'><path d='M0,0 l-18,9' stroke='url(#pnsh)' stroke-width='1.2' stroke-linecap='round'/><circle r='1.3' fill='#fff'/></g>");
    s.add("</svg>");
    var left = '<span class="pn-tx"><span class="mt">' + esc(it.t) + '</span>'
      + '<span class="pn-elo">' + (elo > 0 ? '<b class="pn-n">' + Std.string(d.from) + '</b>' : '')
      + (elo > 0 ? (delta != 0 ? '<i class="pn-up' + (delta < 0 ? ' dn' : '') + '">' + (delta > 0 ? "▲ " : "▼ ") + Std.int(Math.abs(delta)) + ' em ' + d.month + '</i>' : '<i class="pn-up eq">Elo estimado</i>') : '<i class="pn-up eq">Faça o Nivelamento</i>') + '</span>'
      + (elo > 0 ? '<span class="pn-goal"><i style="--p:' + Math.round(d.pct) + '%"></i></span><span class="pn-gl">meta ' + d.goal + '</span>' : '') + '</span>';
    var leg = '<span class="pn-cap">Sua constelação</span><span class="pn-leg"><i class="pn-lt"></i>hoje' + (pv != null && pv.length == n ? '<i class="pn-lp"></i>mês passado' : '') + '</span>';
    b.innerHTML = left + '<span class="pn-sky"><span class="pn-frame">' + s.toString() + leg + '</span></span>';
    var f:Void->Void = it.f;
    b.onclick = function(_) f();
    /* o Elo conta até o valor atual */
    if (elo > 0) {
      var nEl:Element = cast b.querySelector(".pn-n"); var from:Int = d.from; var t0 = -1.0;
      var reduce = false; try { reduce = Browser.window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e:Dynamic) {}
      if (reduce || from == elo) nEl.textContent = Std.string(elo);
      else {
        function step(ts:Float) {
          if (t0 < 0) t0 = ts + 1100;
          var k = Math.max(0, Math.min(1, (ts - t0) / 1400)); k = 1 - Math.pow(1 - k, 3);
          nEl.textContent = Std.string(Math.round(from + (elo - from) * k));
          if (k < 1 && nEl.isConnected) Browser.window.requestAnimationFrame(step);
        }
        Browser.window.requestAnimationFrame(step);
      }
    }
  }
  /* ---------- História do xadrez: "Pergaminho do tempo" ----------
     Pergaminho entre dois rolos com a linha do tempo (600 Índia, 800 Pérsia, 1475 Europa, hoje); uma luz percorre a
     história e, ao chegar em 1475, o fers persa se transforma na dama. Selo de lacre com o cavalo; ao tocar, o pergaminho se abre. */
  static function histBtn(g:Element, it:Dynamic) {
    var b = el("button", "mitem wide hstb" + (it.hl == true ? " hl" : ""), g);
    var eras = [["600", "wE", "", "Índia"], ["800", "wF", "", "Pérsia"], ["1475", "wF", "wQ", "Europa"], ["hoje", "wK", "", ""]];
    var h = new StringBuf();
    h.add('<span class="hs-tx"><span class="mt">' + esc(it.t) + '</span><span class="md">' + esc(it.d) + '</span></span>');
    h.add('<span class="hs-sc"><i class="hs-rod"></i><span class="hs-pa"><i class="hs-fib"></i><i class="hs-tl"></i><i class="hs-gl"></i>');
    var xs = [14, 38, 62, 86];
    for (k in 0...4) {
      var e = eras[k];
      h.add('<span class="hs-era e' + k + '" style="left:' + xs[k] + '%;animation-delay:' + [0.92, 2.29, 3.66, 5.03][k] + 's">');
      if (e[2] != "") h.add('<span class="pc ' + e[1] + ' hs-m1"></span><span class="pc ' + e[2] + ' hs-m2"></span>');
      else h.add('<span class="pc ' + e[1] + '"></span>');
      h.add('<i class="hs-dm"></i><b>' + e[0] + '</b></span>');
    }
    h.add('</span><i class="hs-rod"></i></span>');
    b.innerHTML = h.toString();
    var f:Void->Void = it.f;
    b.onclick = function(_) {
      if (b.classList.contains("open")) return;
      b.classList.add("open");
      haxe.Timer.delay(f, 380);
    };
  }
  /* segundo menu (Centro de Treino): mesmo visual do menu principal, com voltar e animação no topo */
  public static function hub(title:String, caption:String, back:Void->Void, items:Array<Dynamic>, info:String) {
    backFn = back; board = null; panelEl = null;
    root.innerHTML = "";
    var m = el("div", "menu hub", root);
    var hd = el("div", "hubhd", m);
    var b = el("button", "back", hd, "‹"); b.onclick = function(_) back();
    el("div", "hubt", hd, title);
    var hero = el("div", "cthero", m); hero.innerHTML = CT_HERO;
    el("div", "ctcap", m, caption);
    if (info != null && info != "") el("div", "minfo", m, info);
    var g = el("div", "mgrid", m);
    for (it in items) mitem(g, it);
  }

  /* ---------- Centro de Treino: uma mente aprendendo xadrez ----------
     Perfil de uma cabeça desenhado em ouro; dentro, um tabuleiro que se acende casa a casa (o aprendizado);
     fora, peças flutuando, ligadas à mente por sinapses por onde correm pulsos de luz. */
  /* perfil de cabeça (360x170), traçado sobre o desenho de referência: nuca, crânio, testa, nariz, lábios, queixo e pescoço */
  static var HEAD = "M92.82,166.98 C97.65,159 103.95,146.4 106.47,134.85 C108.15,128.55 107.73,121.2 106.26,117.63 C100.8,105.45 92.4,92.85 88.62,81.3 C85.05,70.8 83.58,59.25 86.1,46.65 C90.3,28.8 105,15.15 128.1,12.63 C147,10.53 168,15.15 180.6,30.9 C189,41.4 187.95,55.05 189.42,64.5 C191.1,71.85 199.5,78.15 203.28,84.45 C205.8,88.65 201.6,90.33 197.82,91.8 C193.62,93.27 194.04,97.05 194.04,99.57 C194.04,102.3 191.1,102.3 190.68,103.35 C192.15,105.03 195.3,105.03 194.88,107.55 C194.46,110.7 192.15,112.8 192.78,116.37 C193.2,120.15 194.46,128.55 189,128.97 C182.7,130.23 173.25,129.6 170.1,130.02 C167.58,130.44 166.53,132.33 165.9,134.85 L161.7,147.87 C160.86,150.6 161.28,152.7 162.33,154.17 L169.05,166.98";
  /* cérebro (lobos e cerebelo) dentro do crânio, e algumas dobras (giros) */
  static var BRAIN = "M99.12,76.05 C91.98,63.45 91.56,44.55 100.8,33 C111.3,20.4 130.2,17.25 147,18.93 C163.8,20.61 178.5,28.8 183.12,43.5 C186.06,52.95 184.38,63.45 178.5,69.75 C173.88,74.37 168,75.63 162.96,75.21 C159.18,79.41 152.25,81.93 146.58,79.83 C141.12,84.87 132.3,86.13 126.42,82.35 C119.7,86.13 109.62,85.29 105,80.67 C102.48,79.83 100.38,78.57 99.12,76.05 Z";
  static var GYRI = "M106.26,46.65 C114.66,38.67 125.16,44.97 133.98,36.57|M142.38,28.59 C150.78,37.41 160.86,31.53 170.52,39.51|M105.42,65.97 C116.34,59.25 127.26,68.49 137.76,60.09 C146.58,53.37 157.5,61.77 168.42,55.47|M144.48,46.65 C149.1,52.95 155.4,50.43 162.12,52.95|M113.4,76.05 C117.6,71.43 123.9,73.95 128.1,70.17".split("|");
  static var HEAD_I = "M6.75,30.04 C7.62,28.6 8.76,26.32 9.22,24.23 C9.52,23.09 9.44,21.76 9.18,21.11 C8.19,18.91 6.67,16.63 5.99,14.54 C5.34,12.64 5.07,10.55 5.53,8.27 C6.29,5.04 8.95,2.57 13.13,2.11 C16.55,1.73 20.35,2.57 22.63,5.42 C24.15,7.32 23.96,9.79 24.23,11.5 C24.53,12.83 26.05,13.97 26.73,15.11 C27.19,15.87 26.43,16.17 25.75,16.44 C24.99,16.71 25.06,17.39 25.06,17.85 C25.06,18.34 24.53,18.34 24.45,18.53 C24.72,18.83 25.29,18.83 25.21,19.29 C25.14,19.86 24.72,20.24 24.83,20.89 C24.91,21.57 25.14,23.09 24.15,23.17 C23.01,23.39 21.3,23.28 20.73,23.36 C20.27,23.43 20.08,23.77 19.97,24.23 L19.21,26.59 C19.06,27.08 19.13,27.46 19.32,27.73 L20.54,30.04";
  static var BRAIN_I = "M7.89,13.59 C6.59,11.31 6.52,7.89 8.19,5.8 C10.09,3.52 13.51,2.95 16.55,3.25 C19.59,3.56 22.25,5.04 23.09,7.7 C23.62,9.41 23.31,11.31 22.25,12.45 C21.41,13.29 20.35,13.51 19.44,13.44 C18.75,14.2 17.5,14.65 16.47,14.27 C15.49,15.19 13.89,15.41 12.83,14.73 C11.61,15.41 9.79,15.26 8.95,14.43 C8.49,14.27 8.11,14.05 7.89,13.59 Z";
  /* mesma cabeça em outra escala (ícone do botão) */
  static function scalePath(p:String, k:Float, ox:Float, oy:Float):String {
    return ~/(-?[0-9.]+),(-?[0-9.]+)/g.map(p, function(r) {
      var x = Math.round((Std.parseFloat(r.matched(1)) - 77) * k * 100 + ox * 100) / 100;
      var y = Math.round((Std.parseFloat(r.matched(2)) - 12) * k * 100 + oy * 100) / 100;
      return x + "," + y;
    });
  }
  /* ---------- Centro de Treino: uma mente aprendendo xadrez ----------
     Perfil de uma cabeça desenhado em ouro; dentro, um tabuleiro que se acende casa a casa (o aprendizado);
     fora, peças flutuando, ligadas à mente por sinapses por onde correm pulsos de luz. */
  static var CT_HERO = (function() {
    var s = new StringBuf();
    s.add("<div class='ctbox'><svg viewBox='0 0 360 170' preserveAspectRatio='xMidYMid meet' aria-hidden='true'>");
    s.add("<defs><radialGradient id='ctg' cx='50%' cy='50%' r='50%'><stop offset='0' stop-color='#ffe7a3' stop-opacity='.55'/><stop offset='1' stop-color='#ffe7a3' stop-opacity='0'/></radialGradient>");
    s.add("<linearGradient id='cth' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff3cf'/><stop offset='.55' stop-color='#f3d98c'/><stop offset='1' stop-color='#b8852f'/></linearGradient>");
    s.add("<linearGradient id='ctfill' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#dcb55c' stop-opacity='.02'/><stop offset='1' stop-color='#dcb55c' stop-opacity='.12'/></linearGradient>");
    s.add("<filter id='ctf' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='2'/></filter>");
    s.add("<clipPath id='ctbr'><path d='" + BRAIN + "'/></clipPath></defs>");
    s.add("<circle class='ctglow' cx='140' cy='52' r='60' fill='url(#ctg)'/>");
    s.add("<path d='" + HEAD + "' fill='url(#ctfill)' stroke='#f3d98c' stroke-width='3.4' opacity='.22' filter='url(#ctf)'/>");
    s.add("<path class='cthead' pathLength='1' d='" + HEAD + "' fill='none' stroke='url(#cth)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>");
    /* o cérebro é um tabuleiro: casas recortadas no formato do cérebro */
    s.add("<g class='ctbd'><g clip-path='url(#ctbr)'>");
    for (r in 0...9) for (c in 0...12) {
      var x = 90 + c * 8; var y = 16 + r * 8;
      s.add("<rect x='" + x + "' y='" + y + "' width='8.2' height='8.2' fill='" + (((r + c) & 1) == 0 ? "#efe3c4" : "#8a6236") + "' fill-opacity='" + (((r + c) & 1) == 0 ? ".5" : ".55") + "'/>");
    }
    /* o percurso do cavalo acende as casas: cada casa aprendida vira luz */
    var tour = [[2, 4], [3, 2], [5, 3], [7, 2], [9, 3], [10, 5], [8, 6], [6, 5], [4, 6]];
    for (k in 0...tour.length) {
      var x = 90 + tour[k][0] * 8; var y = 16 + tour[k][1] * 8;
      s.add("<rect class='ctsq' x='" + x + "' y='" + y + "' width='8.2' height='8.2' fill='#ffe08a' style='animation-delay:" + (1.6 + k * 0.42) + "s'/>");
    }
    s.add("</g>");
    for (g in GYRI) s.add("<path d='" + g + "' fill='none' stroke='#fff1c4' stroke-width='1' stroke-linecap='round' opacity='.45'/>");
    s.add("<path d='" + BRAIN + "' fill='none' stroke='#dcb55c' stroke-width='1.3' stroke-linejoin='round'/>");
    s.add("</g>");
    /* sinapses: das peças até a mente */
    var nodes = [[181.7, 38.7], [184.8, 57.2], [176, 72.9]];
    var links = ["M232,34 Q208,26 183,39", "M302,26 Q246,2 184,37", "M304,96 Q250,70 186,57", "M258,128 Q220,112 177,73"];
    for (k in 0...links.length) s.add("<path class='ctlink' pathLength='1' d='" + links[k] + "' stroke='#dcb55c' stroke-width='1.1' fill='none' opacity='.55' style='animation-delay:" + (1.3 + k * 0.15) + "s'/>");
    for (n in nodes) s.add("<circle class='ctnode' cx='" + n[0] + "' cy='" + n[1] + "' r='3.2' fill='#f3d98c'/>");
    for (k in 0...links.length) {
      s.add("<circle class='ctpulse' r='2.6' fill='#fff4cc' opacity='0'><animateMotion dur='2.4s' begin='" + (2.2 + k * 0.6) + "s' repeatCount='indefinite' path='" + links[k] + "'/>"
        + "<animate attributeName='opacity' values='0;1;1;0' keyTimes='0;.15;.8;1' dur='2.4s' begin='" + (2.2 + k * 0.6) + "s' repeatCount='indefinite'/></circle>");
    }
    /* centelha da ideia, no alto da cabeça */
    s.add("<path class='ctspark' d='M128,-5 L129.9,0.8 L135.6,2.8 L129.9,4.8 L128,10.4 L126.1,4.8 L120.4,2.8 L126.1,0.8 Z' fill='#fff1c4'/>");
    s.add("</svg>");
    var pcs:Array<Array<Dynamic>> = [["wN", 67.2, 5.9, 1.5], ["wQ", 85.0, 2.4, 1.7], ["wB", 86.1, 44.7, 1.9], ["wR", 71.1, 65.9, 2.1]];
    for (p in pcs) s.add("<span class='ctp pc " + p[0] + "' style='left:" + p[1] + "%;top:" + p[2] + "%;animation-delay:" + p[3] + "s," + ((p[3] : Float) + 0.7) + "s'></span>");
    s.add("</div>");
    return s.toString();
  })();
  /* ícones dos botões do menu (traço dourado, animação mínima) */
  static var IS = " stroke='#f3d98c' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'";
  static var IA = " fill='none'" + IS;
  static function ico(inner:String):String return "<svg viewBox='0 0 32 32' width='100%' height='100%' aria-hidden='true'>" + inner + "</svg>";
  static var CTI = (function() {
    var o = "<defs><clipPath id='ctbri'><path d='" + BRAIN_I + "'/></clipPath></defs>";
    o += "<path d='" + HEAD_I + "' fill='rgba(220,181,92,.12)'" + StringTools.replace(IS, "1.6", "1.35") + "/>";
    o += "<g clip-path='url(#ctbri)'>";
    for (r in 0...5) for (c in 0...6) {
      var x = Math.round((6.4 + c * 2.9) * 100) / 100; var y = Math.round((2.9 + r * 2.9) * 100) / 100;
      var lit = r == 2 && c == 3;
      o += "<rect" + (lit ? " class='ctil'" : "") + " x='" + x + "' y='" + y + "' width='2.95' height='2.95' fill='" + (lit || ((r + c) & 1) == 0 ? "#f3d98c" : "#6e5029") + "'" + (lit ? "" : " fill-opacity='" + (((r + c) & 1) == 0 ? ".85" : ".9") + "'") + "/>";
    }
    o += "</g><path d='" + BRAIN_I + "' fill='none' stroke='#f3d98c' stroke-width='.6' opacity='.8'/>";
    o += "<path class='ctid' d='M26.4,1.6 l.8,1.5 1.5,.8 -1.5,.8 -.8,1.5 -.8,-1.5 -1.5,-.8 1.5,-.8z' fill='#fff1c4'/>";
    return ico(o);
  })();
  public static var ICONS:Map<String, String> = [
    /* continuar: anel de progresso girando em volta do play */
    "cont" => ico("<circle cx='16' cy='16' r='12'" + IA + " opacity='.35'/><circle class='ia-arc' cx='16' cy='16' r='12'" + IA + " stroke-dasharray='22 54'/><path d='M13.4,11.2 L21.4,16 L13.4,20.8 Z' fill='#f3d98c'/>"),
    /* nivelamento: barras que sobem, com a coroa do nível */
    "lvl" => ico("<path d='M5,27 H27'" + IA + " opacity='.5'/><rect class='ia-bar' x='7' y='19' width='4' height='8' rx='1' fill='#f3d98c' style='animation-delay:0s'/><rect class='ia-bar' x='14' y='14' width='4' height='13' rx='1' fill='#f3d98c' style='animation-delay:.25s'/><rect class='ia-bar' x='21' y='8' width='4' height='19' rx='1' fill='#f3d98c' style='animation-delay:.5s'/><path class='ia-star' d='M23,1.6 l.8,1.6 1.7,.25 -1.25,1.2 .3,1.7 -1.55,-.8 -1.55,.8 .3,-1.7 -1.25,-1.2 1.7,-.25z' fill='#fff1c4'/>"),
    /* como pensar: lâmpada com um peão de luz dentro */
    "bulb" => ico("<path d='M11.2,21 C8.6,19.2 7.2,16.6 7.4,13.6 C7.8,8.8 11.6,5.4 16,5.4 C20.4,5.4 24.2,8.8 24.6,13.6 C24.8,16.6 23.4,19.2 20.8,21 L20.4,24 H11.6 Z'" + IA + "/><path d='M12.4,26.6 H19.6 M13.6,29 H18.4'" + IA + "/><g class='ia-glow'><circle cx='16' cy='12.4' r='2' fill='#fff1c4'/><path d='M14.2,19.6 C14.6,17.6 15,16 16,14.8 C17,16 17.4,17.6 17.8,19.6 Z' fill='#fff1c4'/></g><path class='ia-rays' d='M16,1 V2.6 M5.2,5.4 L6.4,6.6 M26.8,5.4 L25.6,6.6 M2,13.6 H3.6 M28.4,13.6 H30'" + IA + "/>"),
    /* mapa do pensamento: olho cujo olhar percorre o tabuleiro */
    "eye" => ico("<path d='M2.6,16 C6.4,9.6 11,6.6 16,6.6 C21,6.6 25.6,9.6 29.4,16 C25.6,22.4 21,25.4 16,25.4 C11,25.4 6.4,22.4 2.6,16 Z'" + IA + "/><g class='ia-look'><circle cx='16' cy='16' r='6' fill='rgba(220,181,92,.18)'" + IS + "/><rect x='13.2' y='13.2' width='2.8' height='2.8' fill='#f3d98c'/><rect x='16' y='16' width='2.8' height='2.8' fill='#f3d98c'/><circle cx='18.4' cy='13.4' r='1' fill='#fff7de'/></g>"),
    /* seu maior adversário: você (rei) diante do seu fantasma do passado */
    "ghost" => ico("<path d='M8.6,2.6 V7.4 M6.4,4.8 H10.8 M4,12.6 C3.4,8.4 13.8,8.4 13.2,12.6 L11.8,23.6 H5.4 Z M3.2,23.6 H14 L14.6,28 H2.6 Z M4,13 H13.2'" + " fill='rgba(243,217,140,.28)'" + IS + "/><g class='ia-past'><path d='M23.4,2.6 V7.4 M21.2,4.8 H25.6 M18.8,12.6 C18.2,8.4 28.6,8.4 28,12.6 L26.6,23.6 H20.2 Z M18,23.6 H28.8 L29.4,28 H17.4 Z M18.8,13 H28'" + IA + " stroke-dasharray='1.5 1.7'/></g><path class='ia-vs' d='M16,14.2 L17.6,15.8 16,17.4 14.4,15.8 Z' fill='#fff1c4'/>"),
    /* DNA enxadrista: dupla hélice com degraus que acendem */
    "dna" => ico("<path d='M10,3 C10,10 22,10 22,16 C22,22 10,22 10,29'" + IA + "/><path d='M22,3 C22,10 10,10 10,16 C10,22 22,22 22,29'" + IA + " opacity='.6'/><g class='ia-rung'><path d='M12,6 H20' stroke='#f3d98c' stroke-width='1.4' style='animation-delay:0s'/><path d='M13.4,11.6 H18.6' stroke='#f3d98c' stroke-width='1.4' style='animation-delay:.3s'/><path d='M13.4,20.4 H18.6' stroke='#f3d98c' stroke-width='1.4' style='animation-delay:.6s'/><path d='M12,26 H20' stroke='#f3d98c' stroke-width='1.4' style='animation-delay:.9s'/></g><rect x='14.6' y='14.6' width='2.8' height='2.8' fill='#fff1c4' transform='rotate(45 16 16)'/>")
  ];
  /* ornamento do título: filete que se abre do centro com um losango */
  static var ORN = "<svg viewBox='0 0 220 12' aria-hidden='true'><defs><linearGradient id='ornl' gradientUnits='userSpaceOnUse' x1='8' y1='0' x2='212' y2='0'><stop offset='0' stop-color='#c8963a' stop-opacity='0'/><stop offset='.42' stop-color='#f3d98c'/><stop offset='.58' stop-color='#f3d98c'/><stop offset='1' stop-color='#c8963a' stop-opacity='0'/></linearGradient></defs>"
    + "<path class='orn-l' d='M8,6 H96' stroke='url(#ornl)' stroke-width='1.2'/><path class='orn-l' d='M124,6 H212' stroke='url(#ornl)' stroke-width='1.2'/>"
    + "<path class='orn-d' d='M110,1 L115,6 L110,11 L105,6 Z' fill='none' stroke='#f3d98c' stroke-width='1.2'/><circle class='orn-c' cx='110' cy='6' r='1.6' fill='#fff1c4'/><circle cx='100' cy='6' r='1' fill='#dcb55c'/><circle cx='120' cy='6' r='1' fill='#dcb55c'/></svg>";
  static var WA = '<svg viewBox="0 0 32 32" width="100%" height="100%"><path fill="#25D366" d="M16 3C8.8 3 3 8.7 3 15.7c0 2.5.7 4.8 2 6.8L3.4 29l6.7-1.7c1.8 1 3.8 1.5 5.9 1.5 7.2 0 13-5.7 13-12.7S23.2 3 16 3z"/><path fill="#fff" d="M11.9 9.5c-.3-.6-.6-.6-.9-.6h-.8c-.3 0-.7.1-1.1.5-.4.4-1.4 1.4-1.4 3.4s1.5 3.9 1.7 4.2c.2.3 2.8 4.4 6.9 6 3.4 1.3 4.1 1.1 4.8 1 .8-.1 2.4-1 2.8-1.9.3-.9.3-1.7.2-1.9-.1-.2-.4-.3-.8-.5l-2.8-1.3c-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.3 1.6-.2.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1-2-2.3-2.2-2.7-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7l-1.3-3.1z"/></svg>';
  /* evolução do tabuleiro: ashtapada (Índia, séc. VI) -> chatrang (Pérsia) -> medieval (Europa) -> hoje */
  static var EVO = (function() {
    function grid(x:Int, kind:Int):String {
      var s = ""; var c = 8; var y0 = 4;
      for (r in 0...4) for (f in 0...4) {
        var dk = ((r + f) & 1) == 1;
        var col = switch (kind) { case 0: "#e3c792"; case 1: "#c9a36a"; case 2: dk ? "#8f5f37" : "#ead9b0"; default: dk ? "#b58863" : "#f0d9b5"; };
        s += '<rect x="' + (x + f * c) + '" y="' + (y0 + r * c) + '" width="' + c + '" height="' + c + '" fill="' + col + '"' + (kind <= 1 ? ' stroke="' + (kind == 0 ? "#7a4e22" : "#6d4512") + '" stroke-width=".45"' : '') + '/>';
      }
      if (kind == 0) for (p in [[0, 0], [3, 0], [0, 3], [3, 3]]) { var px = x + p[0] * c; var py = y0 + p[1] * c; s += '<path d="M' + (px + 1.6) + ' ' + (py + 1.6) + 'l4.8 4.8M' + (px + 6.4) + ' ' + (py + 1.6) + 'l-4.8 4.8" stroke="#7a4e22" stroke-width=".8"/>'; }
      /* um rei em cada tabuleiro: a peça que atravessou todas as épocas */
      var kx = x + 16; var ky = y0 + 16;
      s += '<g transform="translate(' + kx + ' ' + ky + ')"><circle r="6.3" fill="rgba(20,14,6,.55)"/><path d="M-3.4 3.2h6.8l-.7-4 1.6-2.4-2.3.9L0-4.4-2.0-2.3-4.3-3.2-2.7-.8z" fill="#f3d98c"/></g>';
      return s + '<rect x="' + x + '" y="' + y0 + '" width="32" height="32" fill="none" stroke="#dcb55c" stroke-width="1"/>';
    }
    function arrowAt(x:Int):String return '<path d="M' + x + ' 20h7m-2.6-2.6 2.6 2.6-2.6 2.6" stroke="#dcb55c" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    function label(x:Int, t:String):String return '<text x="' + (x + 16) + '" y="47" fill="#cdbf9a" font-size="7" text-anchor="middle" font-family="Georgia,serif">' + t + '</text>';
    return '<svg viewBox="0 0 170 52" width="100%" height="100%">' + grid(0, 0) + arrowAt(34) + grid(46, 1) + arrowAt(80) + grid(92, 2) + arrowAt(126) + grid(138, 3)
      + label(0, "Índia") + label(46, "Pérsia") + label(92, "Europa") + label(138, "hoje") + '</svg>';
  })();
  /* mini teia de aranha do Painel de evolução */
  static var RAD = (function() {
    var n = 8; var cx = 26.0; var cy = 26.0;
    function pt(i:Int, r:Float):String { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return (cx + Math.cos(a) * r) + "," + (cy + Math.sin(a) * r); }
    var rings = [for (k in 1...4) '<polygon points="' + [for (i in 0...n) pt(i, 21 * k / 3)].join(" ") + '" fill="none" stroke="#4a4232" stroke-width=".8"/>'].join("");
    var vals = [0.82, 0.55, 0.7, 0.45, 0.9, 0.6, 0.75, 0.5];
    var poly = '<polygon class="radp" points="' + [for (i in 0...n) pt(i, 21 * vals[i])].join(" ") + '" fill="rgba(243,217,140,.32)" stroke="#f3d98c" stroke-width="1.4"/>';
    var spark = '<polyline points="64,40 76,34 88,36 100,26 112,22 124,14" fill="none" stroke="#4cb871" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="124" cy="14" r="2.4" fill="#4cb871"/>';
    var axis = '<path d="M62 44h66M62 44V10" stroke="#4a4232" stroke-width=".8"/>';
    return '<svg viewBox="0 0 132 52" width="100%" height="100%">' + rings + poly + axis + spark + '</svg>';
  })();

  /* ---------- páginas ---------- */
  static function header(title:String, back:Void->Void):Element {
    backFn = back;
    root.innerHTML = "";
    var shell = el("div", "shell", root);
    var hd = el("div", "hdr", shell);
    if (back != null) { var b = el("button", "back", hd, "‹"); b.onclick = function(_) back(); }
    el("div", "htitle", hd, title);
    return shell;
  }
  public static function page(title:String, back:Void->Void) {
    board = null;
    var shell = header(title, back);
    mainEl = el("div", "main", shell);
    cur = el("div", "col", mainEl);
    panelEl = null;
  }
  public static function boardPage(title:String, back:Void->Void) {
    var shell = header(title, back);
    var bp = el("div", "bp", shell);
    var bc = el("div", "bcol", bp);
    actionBar = el("div", "game-actions", bc);
    topBar = el("div", "pbar", bc);
    var bd = el("div", "board", bc);
    botBar = el("div", "pbar", bc);
    chanceBar = el("div", "game-chance", bc);
    board = new BoardJ(bd);
    panelEl = el("div", "panel", bp);
    mainEl = panelEl;
    cur = el("div", "col", panelEl);
  }
  public static function panel(?keep:Bool = false) {
    if (panelEl == null) return;
    var st = panelEl.scrollTop;
    panelEl.innerHTML = "";
    cur = el("div", "col", panelEl);
    if (keep) panelEl.scrollTop = st;
  }
  public static function scrollTop() { if (mainEl != null) mainEl.scrollTop = 0; }
  public static function bars(top:String, bot:String, topOn:Bool, botOn:Bool) {
    if (topBar == null) return;
    var lostT = ""; var lostB = "";
    if (board != null && board.showLost) {
      var topCol = board.flip ? "w" : "b";
      lostT = lostHtml(board.fen, topCol); lostB = lostHtml(board.fen, topCol == "w" ? "b" : "w");
    }
    topBar.innerHTML = '<span class="pbt">' + esc(top) + '</span>' + lostT;
    botBar.innerHTML = '<span class="pbt">' + esc(bot) + '</span>' + lostB;
    topBar.className = "pbar" + (topOn ? " on" : "");
    botBar.className = "pbar" + (botOn ? " on" : "");
  }
  /* peças que um lado perdeu (comparando com a posição inicial) e a vantagem de material de quem está à frente */
  static var lostSeen = new Map<String, Int>();
  static function lostHtml(fen:String, col:String):String {
    var cnt = new Map<String, Int>();
    for (ch in fen.split(" ")[0].split("")) if (ch != "/" && Std.parseInt(ch) == null) { var k = (ch == ch.toUpperCase() ? "w" : "b") + ch.toUpperCase(); cnt.set(k, (cnt.exists(k) ? cnt.get(k) : 0) + 1); }
    function n(k:String):Int return cnt.exists(k) ? cnt.get(k) : 0;
    var init = ["Q" => 1, "R" => 2, "B" => 2, "N" => 2, "P" => 8];
    var val = ["Q" => 9, "R" => 5, "B" => 3, "N" => 3, "P" => 1];
    var other = col == "w" ? "b" : "w";
    var mat = 0; var omat = 0;
    for (t in ["Q", "R", "B", "N", "P"]) { mat += n(col + t) * val.get(t); omat += n(other + t) * val.get(t); }
    var h = "";
    var total = 0;
    for (t in ["Q", "R", "B", "N", "P"]) {
      var lost = init.get(t) - n(col + t);
      if (t == "P") { var extra = 0; for (u in ["Q", "R", "B", "N"]) { var e = n(col + u) - init.get(u); if (e > 0) extra += e; } lost = 8 - n(col + "P") - extra; }
      for (k in 0...lost) { total++; h += '<span class="pc ' + col + t + '"></span>'; }
    }
    var key = col; var seen = lostSeen.exists(key) ? lostSeen.get(key) : 0;
    if (total > seen && seen >= 0) h = ~/<span class="pc ([wb][QRBNP])"><\/span>$/.replace(h, '<span class="pc $1 nw"></span>');
    lostSeen.set(key, total);
    if (h == "" && mat <= omat) return "";
    return '<span class="lost">' + h + (mat > omat ? '<b class="adv">+' + (mat - omat) + '</b>' : '') + '</span>';
  }

  /* ---------- componentes ---------- */
  public static function h(t:String) el("div", "h", cur, t);
  public static function p(t:String, ?cls:String) el("div", "p" + (cls != null ? " " + cls : ""), cur, t);
  public static function ul(items:Array<String>, ?cls:String) {
    if (items == null || items.length == 0) return;
    var u = el("ul", "ul" + (cls != null ? " " + cls : ""), cur);
    for (x in items) el("li", "", u, x);
  }
  public static function btns(items:Array<Array<Dynamic>>) {
    var r = el("div", "btns", cur);
    for (it in items) {
      if (it == null) continue;
      var k:String = it.length > 2 ? it[2] : "";
      var b = el("button", "btn " + k, r, it[0]);
      var f:Void->Void = it[1];
      if (k == "off") untyped b.disabled = true;
      else b.onclick = function(_) f();
    }
  }
  public static function items(rows:Array<Dynamic>) {
    var l = el("div", "rows", cur);
    for (r in rows) {
      var b = el("button", "row" + (r.dis == true ? " dis" : "") + (r.ok == true ? " ok" : ""), l);
      var tx = el("div", "rt", b);
      el("div", "rtt", tx, r.t);
      if (r.d != null && r.d != "") el("div", "rtd", tx, r.d);
      if (r.r != null) el("div", "rr", b, r.r);
      var f:Void->Void = r.f;
      if (f != null && r.dis != true) b.onclick = function(_) f();
    }
  }
  public static function bar(label:String, pct:Float, cls:String, right:String) {
    var w = el("div", "bar", cur);
    var t = el("div", "bart", w);
    el("span", "", t, label); el("span", "barr", t, right);
    var tr = el("div", "bartr", w);
    var f = el("div", "barf " + cls, tr);
    f.style.width = Math.max(0, Math.min(100, pct)) + "%";
  }
  public static function chance(white:Float, text:String) {
    var w = el("div", "chance", cur);
    var tr = el("div", "chtr", w);
    var f = el("div", "chw", tr); f.style.width = Math.max(0, Math.min(100, white)) + "%";
    var label = el("div", "cht", w);
    if (App.G != null && chanceBar != null && cur == chanceBar) {
      var info = js.Browser.document.createElement("span"); info.textContent = text; label.appendChild(info);
      var turn = js.Browser.document.createElement("span"); turn.className = "turn-inline";
      var g = App.G;
      turn.textContent = g.over != null ? "Partida encerrada" : (g.pos.turn == g.human ? (Engine.inCheck(g.pos) ? "Sua vez · Xeque!" : "Sua vez · " + (g.human == 1 ? "Brancas" : "Pretas")) : "Vez do adversário");
      label.appendChild(turn);
    } else label.textContent = text;
  }
  public static function graph(vals:Array<Float>) {
    var n = vals.length; if (n < 2) return;
    var W = 600.0; var H = 160.0;
    var pts = [for (i in 0...n) (i * W / (n - 1)) + "," + (H - vals[i] * H / 100)];
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="graph">'
      + '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#30353c"/>'
      + '<polygon points="0,' + H + ' ' + pts.join(" ") + ' ' + W + ',' + H + '" fill="#efe9dc"/>'
      + '<line x1="0" y1="' + (H / 2) + '" x2="' + W + '" y2="' + (H / 2) + '" stroke="#dcb55c" stroke-width="1" stroke-dasharray="6 6"/>'
      + '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#dcb55c" stroke-width="2"/></svg>';
    var d = el("div", "graphw", cur); d.innerHTML = svg;
  }
  /* ---------- gráficos e controles do Painel de evolução e da tela Jogar ---------- */
  static function esc(s:String):String return StringTools.htmlEscape(s);
  /* teia de aranha: axes = [{label, val (0-100 ou -1 sem dados)}] */
  public static function radar(axes:Array<Dynamic>, ?cmp:Array<Dynamic>, ?nameA:String, ?nameB:String) {
    var n = axes.length; if (n < 3) return;
    var cx = 200.0; var cy = 178.0; var R = 118.0;
    function pt(i:Int, r:Float):Array<Float> { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    var s = new StringBuf();
    s.add('<svg viewBox="-26 0 452 356" class="radar" role="img" aria-label="Perfil enxadrístico">');
    for (k in 1...5) {
      var ring = [for (i in 0...n) { var p = pt(i, R * k / 4); p[0] + "," + p[1]; }];
      s.add('<polygon points="' + ring.join(" ") + '" fill="' + (k == 4 ? "rgba(220,181,92,.05)" : "none") + '" stroke="#39414c" stroke-width="1"/>');
    }
    for (i in 0...n) { var p = pt(i, R); s.add('<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#39414c" stroke-width="1"/>'); }
    for (k in [50, 100]) s.add('<text x="' + (cx + 4) + '" y="' + (cy - R * k / 100 + 11) + '" font-size="9.5" fill="#6d7681">' + k + '</text>');
    var poly = [for (i in 0...n) { var v:Float = axes[i].val; var p = pt(i, R * Math.max(0, v) / 100); p[0] + "," + p[1]; }];
    if (cmp != null) {
      var cp = [for (i in 0...n) { var v:Dynamic = i < cmp.length ? cmp[i] : null; var f:Float = v == null || v < 0 ? 0 : v; var p = pt(i, R * f / 100); p[0] + "," + p[1]; }];
      s.add('<polygon points="' + cp.join(" ") + '" fill="rgba(75,146,214,.16)" stroke="#4b92d6" stroke-width="2" stroke-dasharray="6 4" stroke-linejoin="round"/>');
    }
    s.add('<polygon class="rdata" points="' + poly.join(" ") + '" fill="rgba(220,181,92,.28)" stroke="#f3d98c" stroke-width="2.4" stroke-linejoin="round"/>');
    for (i in 0...n) {
      var v:Float = axes[i].val;
      if (v >= 0) { var p = pt(i, R * v / 100); s.add('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="' + (v >= 70 ? "#4cb871" : (v >= 45 ? "#f3d98c" : "#e3605a")) + '" stroke="#0b0d10" stroke-width="1.5"/>'); }
      var lp = pt(i, R + 26); var anchor = Math.abs(lp[0] - cx) < 12 ? "middle" : (lp[0] > cx ? "start" : "end");
      var dy = lp[1] < cy - R ? -2 : (lp[1] > cy + R ? 10 : 4);
      s.add('<text x="' + lp[0] + '" y="' + (lp[1] + dy - 6) + '" text-anchor="' + anchor + '" font-size="12.5" font-weight="700" fill="#ece6d6">' + esc(axes[i].label) + '</text>');
      s.add('<text x="' + lp[0] + '" y="' + (lp[1] + dy + 8) + '" text-anchor="' + anchor + '" font-size="11.5" fill="' + (v < 0 ? "#6d7681" : "#f3d98c") + '">' + (v < 0 ? "sem dados" : Math.round(v) + "") + '</text>');
    }
    s.add('</svg>');
    var d = el("div", "radarw", cur); d.innerHTML = s.toString();
    if (cmp != null) { var lg = el("div", "legend", cur); for (x in [[nameA, "#f3d98c"], [nameB, "#4b92d6"]]) { var it = el("span", "lg", lg); var dot = el("i", "", it); dot.style.background = x[1]; it.appendChild(doc().createTextNode(x[0] != null ? x[0] : "")); } }
  }
  /* linhas por mês: labels = meses; series = [{name, color, vals:Array<Null<Float>>}]; y entre lo e hi */
  public static function lines(labels:Array<String>, series:Array<Dynamic>, lo:Float, hi:Float, ?unit:String = "", ?goal:Null<Float>) {
    var n = labels.length; if (n == 0) return;
    var W = 400.0; var H = 210.0; var L = 40.0; var Rr = 22.0; var T = 14.0; var B = 30.0;
    var pw = W - L - Rr; var ph = H - T - B;
    function X(i:Int):Float return n == 1 ? L + pw / 2 : L + i * pw / (n - 1);
    function Y(v:Float):Float return T + ph - (v - lo) / (hi - lo) * ph;
    var s = new StringBuf();
    s.add('<svg viewBox="0 0 ' + W + ' ' + H + '" class="lchart" role="img" aria-label="Evolução por mês">');
    for (k in 0...5) {
      var v = lo + (hi - lo) * k / 4; var y = Y(v);
      s.add('<line x1="' + L + '" y1="' + y + '" x2="' + (W - Rr) + '" y2="' + y + '" stroke="#2b323c" stroke-width="1"/>');
      s.add('<text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10.5" fill="#7d8692">' + Math.round(v) + unit + '</text>');
    }
    if (goal != null && goal > lo && goal < hi) s.add('<line x1="' + L + '" y1="' + Y(goal) + '" x2="' + (W - Rr) + '" y2="' + Y(goal) + '" stroke="#dcb55c" stroke-width="1.2" stroke-dasharray="5 5" opacity=".8"/><text x="' + (W - Rr) + '" y="' + (Y(goal) - 5) + '" text-anchor="end" font-size="10.5" fill="#dcb55c">meta ' + Math.round(goal) + '</text>');
    var step = n > 8 ? 2 : 1;
    for (i in 0...n) if (i % step == 0 || i == n - 1) s.add('<text x="' + X(i) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="10.5" fill="#98a1ab">' + esc(labels[i]) + '</text>');
    for (sr in series) {
      var vals:Array<Dynamic> = sr.vals; var c:String = sr.color;
      var seg:Array<String> = []; var segs:Array<Array<String>> = [];
      for (i in 0...n) { var v = vals[i]; if (v == null) { if (seg.length > 0) segs.push(seg); seg = []; } else seg.push(X(i) + "," + Y(v)); }
      if (seg.length > 0) segs.push(seg);
      for (q in segs) if (q.length > 1) s.add('<polyline class="lpath" points="' + q.join(" ") + '" fill="none" stroke="' + c + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>');
      for (i in 0...n) { var v = vals[i]; if (v != null) s.add('<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="3.6" fill="' + c + '" stroke="#0b0d10" stroke-width="1.2"/>'); }
      var last = -1; for (i in 0...n) if (vals[i] != null) last = i;
      if (last >= 0) s.add('<text x="' + Math.min(W - Rr, X(last) + 2) + '" y="' + (Y(vals[last]) - 8) + '" text-anchor="' + (last == n - 1 && n > 1 ? "end" : "middle") + '" font-size="11" font-weight="700" fill="' + c + '">' + Math.round(vals[last]) + '</text>');
    }
    s.add('</svg>');
    var w = el("div", "lchartw", cur); w.innerHTML = s.toString();
    if (series.length > 1) { var lg = el("div", "legend", cur); for (sr in series) { var it = el("span", "lg", lg); var dot = el("i", "", it); dot.style.background = sr.color; it.appendChild(doc().createTextNode(sr.name)); } }
  }
  /* seletor compacto: rótulo + botões em grade. opts = [texto, ação, selecionado, subtítulo?] */
  public static function seg(label:String, opts:Array<Array<Dynamic>>, cols:Int, ?note:String) {
    var w = el("div", "seg", cur);
    if (label != null) el("div", "segl", w, label);
    var g = el("div", "segg", w); g.style.gridTemplateColumns = "repeat(" + cols + ",minmax(0,1fr))";
    for (o in opts) {
      var b = el("button", "sb" + (o[2] == true ? " on" : ""), g);
      el("span", "sbt", b, o[0]);
      if (o.length > 3 && o[3] != null && o[3] != "") el("span", "sbs", b, o[3]);
      var f:Void->Void = o[1]; b.onclick = function(_) f();
    }
    if (note != null && note != "") el("div", "segn", w, note);
  }
  /* temas de tabuleiro: list = [id, nome, clara, escura] */
  public static function swatches(label:String, list:Array<Array<String>>, sel:String, pick:String->Void) {
    var w = el("div", "seg theme-picker", cur);
    var current:Array<String> = null; for (t in list) if (current == null && t[0] == sel) current = t;
    el("div", "segl", w, label + (current != null ? " · " + current[1] : ""));
    var grid = el("div", "sw sw-labeled", w);
    var shortNames = ["turquesa" => "Turquesa", "pixel" => "Pixel Art", "pelourinho" => "Pelourinho", "praia" => "Praia", "sertao" => "Sertão", "origami" => "Origami", "bic" => "Caderno Bic", "nanquim" => "Nanquim", "praca" => "Praça", "daltonico" => "Daltônico"];
    for (t in list) {
      var active = t[0] == sel;
      var b:js.html.ButtonElement = cast el("button", "theme-tile" + (active ? " on" : ""), grid);
      b.type = "button"; b.title = t[1]; b.setAttribute("aria-label", t[1] + (active ? ", selecionado" : ""));
      b.setAttribute("aria-pressed", active ? "true" : "false");
      var preview = el("span", "theme-preview theme-preview-" + t[0], b);
      preview.style.background = "conic-gradient(" + t[2] + " 0 25%," + t[3] + " 0 50%," + t[2] + " 0 75%," + t[3] + " 0)";
      var check = el("span", "theme-check", preview, "✓"); check.setAttribute("aria-hidden", "true");
      el("span", "theme-name", b, shortNames.exists(t[0]) ? shortNames.get(t[0]) : t[1]);
      var id = t[0]; b.onclick = function(_) pick(id);
    }
  }
  /* cartão de jogo: miniatura do tabuleiro + nome + época + botão Jogar */
  public static function gameCard(svg:String, title:String, sub:String, onInfo:Void->Void, onPlay:Void->Void) {
    var c = el("div", "gcard", cur);
    var th = el("button", "gthumb", c); th.innerHTML = svg; th.setAttribute("aria-label", "Conhecer " + title);
    th.onclick = function(_) onInfo();
    var tx = el("button", "gtx", c); el("span", "gtt", tx, title); el("span", "gts", tx, sub);
    tx.onclick = function(_) onInfo();
    var b = el("button", "gplay", c); b.innerHTML = '<span class="gpi">▶</span>Jogar';
    b.onclick = function(_) onPlay();
  }
  /* agrupa componentes dentro de um cartão */
  public static function group(cls:String, fn:Void->Void) { var d = el("div", cls, cur); var old = cur; cur = d; fn(); cur = old; }
  /* bloco de HTML/SVG próprio (figuras da história) */
  public static function html(markup:String, ?cls:String) { var d = el("div", "fig" + (cls != null ? " " + cls : ""), cur); d.innerHTML = markup; }
  /* tema do tabuleiro escolhido pelo jogador (cores clara e escura) */
  public static var boardColors:Array<String> = null;
  /* tema do tabuleiro (classe bt-<id>: cores das peças, texturas e o modo pixel art) */
  public static var boardTheme:String = null;
  /* tipo de peça: "std" (clássicas com volume) ou "lux" (marfim e ébano); som das peças ligado/desligado */
  public static var pieceStyle:String = "std";
  public static var soundOn = true;
  /* sons 8-bit do tema pixel art (onda quadrada, bem baixinho) */
  static var chipCtx:Dynamic = null;
  static var noiseBuf:Dynamic = null;
  public static function audioUnlock() {
    try {
      if (chipCtx == null) chipCtx = js.Syntax.code("new (window.AudioContext||window.webkitAudioContext)()");
      var c:Dynamic = chipCtx; if (c.state == "suspended") c.resume();
    } catch (e:Dynamic) {}
  }
  /* som elegante do lance: "toque" de madeira (ruído filtrado + grave curto); captura com brilho suave; xeque com sino discreto */
  public static function sfx(kind:String) {
    if (!soundOn) return;
    try {
      audioUnlock();
      var c:Dynamic = chipCtx; if (c == null) return;
      if (noiseBuf == null) {
        var len = Std.int(c.sampleRate * 0.12); noiseBuf = c.createBuffer(1, len, c.sampleRate);
        var d:Dynamic = noiseBuf.getChannelData(0); for (i in 0...len) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
      var master:Dynamic = c.createGain(); master.gain.value = 0.55; master.connect(c.destination);
      function tok(t:Float, f:Float, low:Float, amp:Float) {
        var n:Dynamic = c.createBufferSource(); n.buffer = noiseBuf;
        var bp:Dynamic = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 1.4;
        var g:Dynamic = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(amp, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.12);
        var o:Dynamic = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(low, t); o.frequency.exponentialRampToValueAtTime(low * 0.62, t + 0.09);
        var og:Dynamic = c.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(amp * 0.9, t + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
        o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.13);
      }
      function bell(t:Float, f:Float, amp:Float, dur:Float) {
        var o:Dynamic = c.createOscillator(); o.type = "sine"; o.frequency.value = f;
        var g:Dynamic = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(amp, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
      }
      var t:Float = c.currentTime + 0.01;
      switch (kind) {
        case "cap": tok(t, 1300, 150, 0.5); tok(t + 0.035, 2400, 240, 0.18); bell(t + 0.05, 1568, 0.035, 0.45); bell(t + 0.09, 2093, 0.025, 0.5);
        case "chk": tok(t, 1800, 190, 0.42); bell(t + 0.04, 880, 0.05, 0.7); bell(t + 0.04, 1320, 0.03, 0.6);
        case "castle": tok(t, 1800, 200, 0.4); tok(t + 0.11, 1600, 180, 0.34);
        default: tok(t, 1900, 210, 0.42);
      }
    } catch (e:Dynamic) {}
  }
  public static function chip(kind:String) {
    try {
      if (!soundOn) return;
      audioUnlock();
      var c:Dynamic = chipCtx; if (c == null) return;
      var t:Float = c.currentTime + 0.01;
      var notes:Array<Array<Float>> = switch (kind) {
        case "cap": [[784, 0.05], [523, 0.05], [330, 0.09]];
        case "chk": [[659, 0.05], [880, 0.05], [1175, 0.08]];
        default: [[523, 0.04], [784, 0.06]];
      };
      for (n in notes) {
        var o:Dynamic = c.createOscillator(); var g:Dynamic = c.createGain();
        o.type = "square"; o.frequency.setValueAtTime(n[0], t);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.005); g.gain.setValueAtTime(0.045, t + n[1] - 0.01); g.gain.linearRampToValueAtTime(0.0001, t + n[1]);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + n[1] + 0.02);
        t += n[1];
      }
    } catch (e:Dynamic) {}
  }

  public static function stats(arr:Array<Array<String>>) {
    var g = el("div", "stats", cur);
    for (a in arr) { var s = el("div", "stat", g); el("div", "sv", s, a[0]); el("div", "sl", s, a[1]); }
  }
  public static function pre(text:String, fname:String) {
    var t:Dynamic = el("textarea", "pre", cur);
    t.value = text; t.readOnly = true; t.rows = 6;
    btns([["Copiar", function() {
      try { untyped navigator.clipboard.writeText(text); toast("Copiado."); } catch (e:Dynamic) { t.select(); untyped document.execCommand("copy"); toast("Copiado."); }
    }, "pri"], fname == null ? null : ["Baixar arquivo", function() {
      var a:Dynamic = doc().createElement("a");
      a.href = "data:text/plain;charset=utf-8," + StringTools.urlEncode(text); a.download = fname;
      doc().body.appendChild(a); a.click(); doc().body.removeChild(a);
    }]]);
  }
  public static function input(ph:String, label:String, cb:String->Void) {
    var t:Dynamic = el("textarea", "pre", cur);
    t.placeholder = ph; t.rows = 3;
    btns([[label, function() cb(t.value), "pri"]]);
  }
  public static function sep() el("div", "sep", cur);
  public static function node(tag:String, cls:String):Element return el(tag, cls, cur);
  public static function field(label:String, value:String, ph:String, type:String, cb:String->Void) {
    var w = el("label", "fld", cur);
    el("span", "fl", w, label);
    var i:Dynamic = el("input", "fi", w);
    i.type = type; i.value = value == null ? "" : value; i.placeholder = ph;
    i.oninput = function(_) cb(i.value);
  }
  public static function modal(title:String, text:String, b:Array<Array<Dynamic>>) {
    var ov = el("div", "modal", root);
    var box = el("div", "mbox", ov);
    el("div", "h", box, title);
    if (text != null) el("div", "p", box, text);
    var r = el("div", "btns", box);
    for (it in b) {
      var bt = el("button", "btn " + (it.length > 2 ? it[2] : ""), r, it[0]);
      var f:Void->Void = it[1];
      bt.onclick = function(_) { if (ov.parentNode != null) ov.parentNode.removeChild(ov); if (f != null) f(); };
    }
  }
  public static function toast(msg:String) {
    var t = el("div", "toast", root, msg);
    haxe.Timer.delay(function() if (t.parentNode != null) t.parentNode.removeChild(t), 2200);
  }
  public static function every(ms:Int, fn:Void->Void):Dynamic { var t = new haxe.Timer(ms); t.run = fn; return t; }
  public static function cancel(h:Dynamic) { if (h != null) (h : haxe.Timer).stop(); }
  public static function later(ms:Int, fn:Void->Void) haxe.Timer.delay(fn, ms);
}

/* tabuleiro: grade 8x8 + camada SVG para setas */
class BoardJ {
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
  public var onSel:Int->Void = null;
  public var theme:String = "";
  public var special:Array<Int> = [];
  var sel = -1;
  var prevLast:String = null; var prevCount = 0; var prevPcs:Array<String> = null;
  /* casas de peças indefesas (contorno âmbar), casa do lance sugerido (brilho dourado) e peças perdidas nas barras */
  public var hang:Array<Int> = null;
  public var sugg:Int = -1;
  public var showLost = false;
  var sqs:Array<Element> = [];
  var root:Element; var svg:Element;
  static var COLORS = ["#3aa35b", "#d9534f", "#3b82c4", "#e0b13a", "#e07b2a"];
  public function new(r:Element) {
    root = r;
    for (i in 0...64) {
      var s = UiJs.el("div", "sq", root);
      var k = i;
      s.onclick = function(_) click(k);
      sqs.push(s);
    }
    svg = Browser.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "arrows"); svg.setAttribute("viewBox", "0 0 800 800");
    root.appendChild(svg);
  }
  /* índice visual (0 = canto superior esquerdo) para casa (0 = a1) */
  inline function sqOf(i:Int):Int { var r = i >> 3; var c = i & 7; return flip ? (r * 8 + 7 - c) : ((7 - r) * 8 + c); }
  public function show(f:String) { fen = f; sel = -1; draw(); }
  public function clearSel() { sel = -1; }
  function pieceAt():Array<String> {
    var out = [for (i in 0...64) ""];
    var rows = fen.split(" ")[0].split("/");
    for (r in 0...8) {
      var c = 0; var row = rows[r];
      for (k in 0...row.length) {
        var ch = row.charAt(k);
        var n = Std.parseInt(ch);
        if (n != null) c += n;
        else { var sq = (7 - r) * 8 + c; out[sq] = (ch == ch.toUpperCase() ? "w" : "b") + ch.toUpperCase(); c++; }
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
    var pcs = pieceAt();
    var tg = blind ? [] : targets();
    var bt = theme == "" && UiJs.boardTheme != null ? UiJs.boardTheme : null;
    root.className = "board" + (theme != "" ? " " + theme : "") + (bt != null ? " bt-" + bt : "");
    if (UiJs.pieceStyle == "lux" && theme == "") root.className += " ps-lux";
    /* lance novo: a peça desliza em arco e assenta; som do lance; numa captura, a peça some em poeira dourada */
    var burst = -1; var mvTo = -1; var dxy:Array<Int> = null; var lostPc = "";
    var lk = last != null ? last[0] + "," + last[1] : "";
    var pcount = 0; for (c in fen.split(" ")[0].split("")) if (c != "/" && Std.parseInt(c) == null) pcount++;
    if (prevLast != null && lk != "" && lk != prevLast && prevPcs != null) {
      var f = last[0]; var t = last[1];
      var single = prevPcs[f] != "" && pcs[f] == "" && pcs[t] != "" && prevPcs[f].charAt(0) == pcs[t].charAt(0);
      if (single) {
        var capd = prevCount > 0 && pcount < prevCount;
        if (capd) { burst = t; lostPc = prevPcs[t] != "" && prevPcs[t].charAt(0) != pcs[t].charAt(0) ? prevPcs[t] : (pcs[t].charAt(0) == "w" ? "bP" : "wP"); }
        mvTo = t;
        function vc(q:Int):Int return flip ? 7 - (q & 7) : (q & 7);
        function vr(q:Int):Int return flip ? (q >> 3) : 7 - (q >> 3);
        dxy = [vc(f) - vc(t), vr(f) - vr(t)];
        var castle = pcs[t].charAt(1) == "K" && Math.abs((t & 7) - (f & 7)) == 2;
        if (bt == "pixel") UiJs.chip(check >= 0 ? "chk" : (capd ? "cap" : "mv"));
        else UiJs.sfx(check >= 0 ? "chk" : (capd ? "cap" : (castle ? "castle" : "mv")));
      }
    }
    prevLast = lk; prevCount = pcount; prevPcs = pcs;
    var bc = UiJs.boardColors;
    if (theme == "" && bc != null) { root.style.setProperty("--L", bc[0]); root.style.setProperty("--D", bc[1]); }
    else { root.style.removeProperty("--L"); root.style.removeProperty("--D"); }
    for (i in 0...64) {
      var s = sqOf(i); var e = sqs[i];
      var cls = "sq " + ((((s >> 3) + (s & 7)) & 1) == 1 ? "l" : "d");
      if (last != null && (s == last[0] || s == last[1])) cls += " lm";
      if (s == sel) cls += " sel";
      if (s == check) cls += " chk";
      if (hang != null && hang.indexOf(s) >= 0) cls += " hg";
      if (s == sugg) cls += " sg";
      if (special.indexOf(s) >= 0) cls += " x";
      e.className = cls;
      var html = "";
      for (m in marks) if (m[0] == s) html += '<div class="mk m' + m[1] + '"></div>';
      if (pcs[s] != "") html += s == mvTo ? '<div class="pc mv ' + pcs[s] + '" style="--dx:' + (dxy[0] * 100) + '%;--dy:' + (dxy[1] * 100) + '%"></div>' : '<div class="pc ' + pcs[s] + '"></div>';
      if (tg.indexOf(s) >= 0) html += pcs[s] != "" ? '<div class="cap"></div>' : '<div class="dot"></div>';
      if (s == burst) html += bt == "pixel" ? '<div class="pxb"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'
        : '<div class="dust"><div class="pc gh ' + lostPc + '"></div><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
      var r = i >> 3; var c = i & 7;
      if (c == 0) html += '<span class="cr">' + ((s >> 3) + 1) + '</span>';
      if (r == 7) html += '<span class="cf">' + "abcdefgh".charAt(s & 7) + '</span>';
      e.innerHTML = html;
    }
    var a = "";
    for (ar in arrows) {
      var p0 = cen(ar[0]); var p1 = cen(ar[1]);
      var col = COLORS[ar.length > 2 ? ar[2] : 0];
      var dx = p1[0] - p0[0]; var dy = p1[1] - p0[1]; var L = Math.sqrt(dx * dx + dy * dy);
      if (L < 1) continue;
      var ux = dx / L; var uy = dy / L;
      var ex = p1[0] - ux * 30; var ey = p1[1] - uy * 30;
      a += '<line x1="' + p0[0] + '" y1="' + p0[1] + '" x2="' + ex + '" y2="' + ey + '" stroke="' + col + '" stroke-width="18" stroke-linecap="round" opacity="0.82"/>';
      var hx = p1[0] - ux * 6; var hy = p1[1] - uy * 6;
      var bx = p1[0] - ux * 44; var by = p1[1] - uy * 44;
      a += '<polygon points="' + hx + ',' + hy + ' ' + (bx - uy * 26) + ',' + (by + ux * 26) + ' ' + (bx + uy * 26) + ',' + (by - ux * 26) + '" fill="' + col + '" opacity="0.82"/>';
    }
    svg.innerHTML = a;
  }
  function cen(s:Int):Array<Float> {
    var c = s & 7; var r = s >> 3;
    var x = flip ? 7 - c : c; var y = flip ? r : 7 - r;
    return [x * 100 + 50, y * 100 + 50];
  }
  function click(i:Int) {
    UiJs.audioUnlock();
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
    if (sel >= 0 && onSel != null) onSel(sel);
    draw();
  }
}
#end
