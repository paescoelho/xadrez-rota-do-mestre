/* Rota do Mestre v63 — Treinador por voz (modo Mentor).
 * Desligado por padrão. Liga em Nova partida (cartão "Treinador por voz", com o Mentor escolhido) ou no botão 🔊 da partida.
 * Usa a voz em português do próprio aparelho (speechSynthesis): sem internet, sem custo, sem enviar nada.
 * Fala frases curtas: avaliação do seu lance, o lance do Mentor e a pergunta dele, a explicação depois de 20 s, xeque e resultado.
 */
var V36={on:false,rate:1,voice:null,ok:typeof window!=='undefined'&&'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined'};
V36.d=function(){var d=Profile.d;if(!d.v36)d.v36={on:false,rate:1};return d.v36;};
V36.enabled=function(){return V36.ok&&V36.d().on===true;};
V36.set=function(on){V36.d().on=!!on;Profile.save();if(on){V36.unlock();}else V36.stop();};
V36.pickVoice=function(){
 if(!V36.ok)return null;
 var vs=[];try{vs=speechSynthesis.getVoices()||[];}catch(e){}
 var pt=vs.filter(function(v){return /^pt/i.test(v.lang);});
 var br=pt.filter(function(v){return /BR/i.test(v.lang);});
 var pref=function(list){return list.filter(function(v){return /google|luciana|francisca|thalita|natural|online/i.test(v.name);})[0]||list[0]||null;};
 V36.voice=pref(br)||pref(pt)||null;return V36.voice;
};
if(V36.ok){try{V36.pickVoice();speechSynthesis.onvoiceschanged=function(){V36.pickVoice();};}catch(e){}}
V36.hasPt=function(){V36.pickVoice();return !!V36.voice;};
/* iPhone: a voz só sai depois de um toque; o primeiro toque fala um texto vazio para liberar */
V36.unlock=function(){if(!V36.ok)return;try{var u=new SpeechSynthesisUtterance(' ');u.volume=0;u.lang='pt-BR';speechSynthesis.speak(u);}catch(e){}};
V36.stop=function(){if(!V36.ok)return;try{speechSynthesis.cancel();}catch(e){}};
V36.say=function(txt,opt){
 if(!V36.enabled()||!txt)return;
 opt=opt||{};
 try{
  if(opt.cut)speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(String(txt).replace(/\s+/g,' ').trim());
  u.lang='pt-BR';if(V36.voice||V36.pickVoice())u.voice=V36.voice;
  u.rate=V36.d().rate||1;u.pitch=1;
  speechSynthesis.speak(u);
 }catch(e){}
};
/* SAN em português → fala: "Cxe5+" = "cavalo captura em e 5, xeque" (R rei, D dama, T torre, B bispo, C cavalo) */
V36.PIECE={R:'rei',D:'dama',T:'torre',B:'bispo',C:'cavalo',K:'rei',Q:'dama',N:'cavalo'};
V36.san=function(s){
 s=String(s||'').trim();if(!s)return '';
 var tail=/#$/.test(s)?', xeque-mate':(/\+$/.test(s)?', xeque':'');
 s=s.replace(/[+#!?]+$/,'');
 if(/^(O-O-O|0-0-0)$/.test(s))return 'roque grande'+tail;
 if(/^(O-O|0-0)$/.test(s))return 'roque pequeno'+tail;
 var promo='',pm=s.match(/[1-8]=?([RDTBCQN])$/);if(pm){promo=' e promove a '+(V36.PIECE[pm[1]]||'dama');s=s.replace(/=?[RDTBCQN]$/,'');}
 var piece='';if(/^[RDTBCKQN]/.test(s)){piece=V36.PIECE[s.charAt(0)];s=s.slice(1);}
 var cap=s.indexOf('x')>=0,sq=(s.match(/[a-h][1-8]$/)||[''])[0],sqTxt=sq?sq.charAt(0)+' '+sq.charAt(1):'';
 return (piece||'peão')+(cap?' captura em ':' ')+sqTxt+promo+tail;
};
V36.first=function(arr){return Array.isArray(arr)&&arr.length?String(arr[0]).replace(/\s*\(.*?\)\s*/g,' ').trim():'';};
V36.short=function(t,max){t=String(t||'').trim();max=max||140;if(t.length<=max)return t;var k=t.lastIndexOf('.',max);return (k>40?t.slice(0,k+1):t.slice(0,max).replace(/\s+\S*$/,'')+'.');};

/* ---------- leitura de ameaças (curta, como um treinador ao lado) ---------- */
V36.NM=['','peão','cavalo','bispo','torre','dama','rei'];
V36.MASC=[0,1,1,1,0,0,1];
/* peças de "side" que o outro lado ganha capturando (troca desfavorável incluída), da mais valiosa para a menos */
V36.hanging=function(pos,side){
 var out=[],b=pos.board;
 for(var sq=0;sq<64;sq++){var p=b[sq];if(!p||(p>0?1:-1)!==side)continue;var t=Math.abs(p);if(t===6)continue;
  var g=0;try{g=Engine.see(pos,sq,-side);}catch(e){}
  if(g>0&&(t>=2||g>=200))out.push({sq:sq,t:t,g:g});}
 out.sort(function(x,y){return y.t-x.t||y.g-x.g;});return out;
};
V36.pick=function(arr){return arr[Math.floor(Math.random()*arr.length)];};
V36.mine=function(h){var x=h[0],n=V36.NM[x.t];
 if(h.length>=2)return V36.pick(['Você tem '+(h.length===2?'duas':h.length===3?'três':h.length)+' peças ameaçadas. Analise com calma.','Atenção: '+(h.length===2?'duas':'várias')+' peças suas estão em perigo. Calma antes de mover.']);
 return V36.pick([(V36.MASC[x.t]?'Seu ':'Sua ')+n+' está '+(V36.MASC[x.t]?'ameaçado':'ameaçada')+'.','Cuidado com '+(V36.MASC[x.t]?'o seu ':'a sua ')+n+'.',(V36.MASC[x.t]?'Seu ':'Sua ')+n+' está em perigo. Proteja ou mova.']);};
V36.theirs=function(h){var x=h[0],n=V36.NM[x.t];
 if(h.length>=2)return 'Tem mais de uma peça dele desprotegida. Procure!';
 return V36.pick([(V36.MASC[x.t]?'O ':'A ')+n+' dele está '+(V36.MASC[x.t]?'desprotegido':'desprotegida')+'. Procure!','Olhe bem: dá para ganhar material.']);};
V36.GRADE={best:['Boa!','Muito bem!','Excelente lance!','Isso mesmo!'],great:['Ótimo lance!','Muito bom!'],good:['Bom lance.','Certo.'],book:['Lance de livro.','Boa abertura.'],forced:['Era o único lance.'],
 inaccuracy:['Hmm, havia algo melhor.','Dava para fazer melhor.'],mistake:['Cuidado, esse lance custou caro.','Esse não foi bom.'],blunder:['Ops! Esse foi um erro grave.','Opa, esse lance foi um erro sério.']};

/* ---------- o que falar a cada redesenho da partida ---------- */
V36.watch=function(){
 var g=App.G;if(!g||!g.adaptive||!V36.enabled())return;
 /* 1. seu lance: uma frase de avaliação + a ameaça que você criou */
 var fb=g.lastFb,rec=g.lastRec;
 if(fb&&rec&&g._v36fb!==rec){
  g._v36fb=rec;
  var t=V36.pick(V36.GRADE[fb.grade]||[fb.bad?'Cuidado.':'Bom lance.']);
  if(fb.bad&&(fb.grade==='mistake'||fb.grade==='blunder')&&fb.bestSan)t+=' Melhor era '+V36.san(fb.bestSan)+'.';
  else if(g._v36my&&g._v36my.rec===rec.san&&g._v36my.h.length){var x=g._v36my.h[0];t+=' E você ameaça '+(V36.MASC[x.t]?'o ':'a ')+V36.NM[x.t]+' dele!';}
  V36.say(t);
 }
 /* 2. lance do Mentor + como ficou a posição para você */
 var ck=String(g.cpuSan||'');
 if(g.cpuSan&&g._v36c!==ck&&g.over==null){
  g._v36c=ck;
  var mv=String(g.cpuSan).replace(/^\d+(\.|…|\.\.\.)\s*/,'');
  var line='Mentor jogou '+V36.san(mv)+'.',me=g.human,chk=false;
  try{chk=Engine.inCheck(g.pos);}catch(e){}
  if(chk)line=line.replace(/, xeque(-mate)?\.$/,'.')+' Você está em xeque!';
  else if(g.pos.turn===me){
   var mineH=V36.hanging(g.pos,me),theirH=V36.hanging(g.pos,-me);
   if(mineH.length)line+=' '+V36.mine(mineH);
   else if(theirH.length)line+=' '+V36.theirs(theirH);
  }
  V36.say(line);
 }
 /* 3. fim da partida */
 if(g.over!=null&&!g._v36end){g._v36end=1;var sc=g.over.score;V36.say(sc>=1?'Vitória! Parabéns.':(sc<=0?'Fim de partida. Vamos revisar e aprender com ela.':'Empate.'));}
};
(function(){
 if(typeof App==='undefined')return;
 var oD=App.drawGame;App.drawGame=function(){var r=oD.apply(this,arguments);try{V36.watch();V36.btn();}catch(e){}return r;};
 /* seu lance corta a fala anterior */
 var oP=App.playUser;App.playUser=function(){if(V36.enabled())V36.stop();var r=oP.apply(this,arguments);
  try{var g=App.G;if(g&&g.adaptive&&V36.enabled()&&g.pos.turn===-g.human&&g.lastRec)g._v36my={rec:g.lastRec.san,h:V36.hanging(g.pos,-g.human)};}catch(e){}
  return r;};
 var oN=App.newGame;App.newGame=function(){V36.stop();return oN.apply(this,arguments);};
 var oM=App.menu;App.menu=function(){V36.stop();return oM.apply(this,arguments);};
})();

/* ---------- botão 🔊 na partida (só com o Mentor) ---------- */
V36.btn=function(){
 var g=App.G,bar=UiJs.chanceBar;if(!g||!g.adaptive||!V36.ok||!bar)return;
 var b=bar.querySelector('.v36-hb');
 if(!b){b=document.createElement('button');b.type='button';b.className='v36-hb';bar.appendChild(b);bar.classList.add('v36-cb');
  b.onclick=function(){var on=!V36.enabled();if(on&&!V36.hasPt()){UiJs.toast('Seu aparelho não tem voz em português instalada.');return;}V36.set(on);V36.btn();
   UiJs.toast(on?'Treinador por voz ligado.':'Treinador por voz desligado.');if(on)V36.say('Pronto! Vou comentar a partida em voz alta.',{cut:true});};}
 var on=V36.enabled();b.classList.toggle('on',on);b.innerHTML=on?'🔊<span>Voz</span>':'🔇<span>Voz</span>';b.setAttribute('aria-label',on?'Desligar treinador por voz':'Ligar treinador por voz');
};

/* ---------- cartão em Nova partida (quando o Mentor está escolhido) ---------- */
(function(){
 if(typeof App==='undefined')return;
 var oS=App.setupGame;App.setupGame=function(){
  var r=oS.apply(this,arguments);
  try{
   var cur=UiJs.cur;if(!cur||!V36.ok)return r;
   if(App.opts&&App.opts.opp!==0)return r;
   var segs=cur.querySelectorAll('.seg'),first=segs[0];
   var c=document.createElement('div');c.className='v36-card'+(V36.enabled()?' on':'');
   c.innerHTML='<span class="v36-ic" aria-hidden="true"><i></i><i></i><i></i>🗣️</span><span class="v36-tx"><b>Treinador por voz</b><em>O Mentor comenta em voz alta seus lances e os dele.</em></span>'
    +'<span class="v36-sw" role="switch" aria-checked="'+(V36.enabled()?'true':'false')+'"><i></i></span>';
   c.onclick=function(){
    var on=!V36.enabled();
    if(on&&!V36.hasPt()){UiJs.toast('Seu aparelho não tem voz em português instalada.');return;}
    V36.set(on);c.classList.toggle('on',on);c.querySelector('.v36-sw').setAttribute('aria-checked',on?'true':'false');
    if(on)V36.say('Oi! Eu sou o Mentor. Vou comentar seus lances em voz alta.',{cut:true});else UiJs.toast('Treinador por voz desligado.');
   };
   if(first&&first.nextSibling)cur.insertBefore(c,first.nextSibling);else cur.insertBefore(c,cur.firstChild);
   cur.classList.add('v36-has');
  }catch(e){}
  return r;
 };
})();
