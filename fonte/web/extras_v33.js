/* Rota do Mestre v33 — 10 tabuleiros temáticos com efeitos próprios (o visual está no CSS "v33: temas").
 * Ordem: Turquesa (padrão), Pixel Art, Pelourinho, Praia baiana, Sertão, Origami, Caderno Bic, Nanquim, Praça de concreto
 * e Daltônico. Aqui ficam só os efeitos que precisam de JavaScript: a onda no xeque-mate (Turquesa), o pombo que pousa
 * no xeque-mate (Praça), o "plic" de gota do Turquesa e a descrição do efeito no seletor de tabuleiro. */
var V33={lastMate:'',ctx:null,
 FX:{turquesa:'Água: a casa ondula quando a peça pousa, a captura espirra gotinhas, o xeque pulsa como água e o mate passa uma onda pelo tabuleiro.',
  pixel:'8-bit: sons de videogame antigo, peças que pousam em quadros e explosão de pixels na captura.',
  pelourinho:'Fitinhas do Bonfim coloridas voam a cada captura, nas cores dos casarões.',
  praia:'Uma onda de espuma atravessa o tabuleiro a cada xeque.',
  sertao:'A peça capturada afunda e levanta poeira de terra seca.',
  origami:'A peça gira como papel ao se mover; a capturada vira um passarinho de papel e sai voando.',
  bic:'Casas e setas desenhadas à caneta: o último lance é circulado e a captura ganha um X rabiscado.',
  nanquim:'Uma mancha de tinta se espalha na captura; o xeque vira um carimbo vermelho.',
  praca:'Clima de praça: no xeque-mate, um pombo pousa no canto do tabuleiro.',
  daltonico:'Alto contraste e marcações por forma (molduras, cantos e listras), sem depender de cor; animações curtas.'}};

/* efeitos de xeque-mate */
V33.isMate=function(fen){try{var p=Engine.posFromFEN(fen);return Engine.inCheck(p)&&Engine.legalMoves(p).length===0;}catch(e){return false;}};
(function(){
 if(typeof BoardJ==='undefined'||!BoardJ.prototype||!BoardJ.prototype.draw)return;
 var od=BoardJ.prototype.draw;
 BoardJ.prototype.draw=function(){
  var r=od.apply(this,arguments);
  try{
   var bt=UiJs.boardTheme;
   if(this.theme===''&&(bt==='turquesa'||bt==='praca')&&this.check>=0&&this.fen&&this._v33m!==this.fen&&V33.isMate(this.fen)){
    this._v33m=this.fen;var root=this.root,fx=document.createElement('div');
    fx.className='v33-fx '+(bt==='turquesa'?'wave':'pombo');root.appendChild(fx);
    setTimeout(function(){if(fx.parentNode)fx.parentNode.removeChild(fx);},bt==='praca'?7000:1800);
   }
  }catch(e){}
  return r;
 };
})();

/* som de gota do Turquesa (bem baixinho); xeque e outros sons continuam os de sempre */
V33.drop=function(big){
 try{
  if(!V33.ctx)V33.ctx=new (window.AudioContext||window.webkitAudioContext)();
  var c=V33.ctx;if(c.state==='suspended')c.resume();
  var one=function(t0,f0,f1,vol){
   var o=c.createOscillator(),g=c.createGain();o.type='sine';
   o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,t0+0.09);
   g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.16);
   o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+0.18);
  };
  var t=c.currentTime+0.01;
  one(t,1300,520,0.05);
  if(big){one(t+0.07,900,330,0.04);one(t+0.13,1600,700,0.025);}
  return true;
 }catch(e){return false;}
};
(function(){
 if(typeof UiJs==='undefined'||!UiJs.sfx)return;
 var os=UiJs.sfx;
 UiJs.sfx=function(kind){
  if(UiJs.boardTheme==='turquesa'&&UiJs.soundOn&&(kind==='mv'||kind==='cap'||kind==='castle')&&V33.drop(kind==='cap'))return;
  return os.apply(this,arguments);
 };
})();

/* seletor de tabuleiro: mostra o efeito do tema escolhido */
(function(){
 if(typeof App==='undefined'||!App.setupGame)return;
 var o=App.setupGame;
 App.setupGame=function(){
  var r=o.apply(this,arguments);
  try{
   var tp=UiJs.root.querySelector('.theme-picker'),id=Profile.d.bt;
   if(tp&&V33.FX[id]){var p=document.createElement('div');p.className='v33-fxd';p.textContent='✦ '+V33.FX[id];tp.appendChild(p);}
  }catch(e){}
  return r;
 };
})();
