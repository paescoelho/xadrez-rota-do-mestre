/* ======================= v25: Apoiar o projeto (Pix) =======================
   Pix estático (BR Code do Banco Central) gerado dentro do jogo: funciona offline,
   sem servidor e sem taxa. O comentário "Xadrez GitHub" vai junto no código. */
var V25_UI=typeof document!=='undefined';
var V25={
 PIX:{key:'paescoelho@gmail.com',name:'RODRIGO PAES COELHO',city:'ALAGOINHAS',msg:'Xadrez GitHub',txid:'XADREZGITHUB'},
 VALUES:[5,10,20,50]
};
V25.d=function(){var d=Profile.d;if(!d.v25)d.v25={};return d.v25;};
/* campo EMV: id + tamanho (2 dígitos) + valor */
V25.f=function(id,v){v=String(v);return id+(v.length<10?'0':'')+v.length+v;};
V25.crc=function(s){var c=0xFFFF;for(var i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(var j=0;j<8;j++)c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF;}return ('000'+c.toString(16).toUpperCase()).slice(-4);};
V25.payload=function(val){
 var P=V25.PIX,f=V25.f;
 var s=f('00','01')
  +f('26',f('00','br.gov.bcb.pix')+f('01',P.key)+f('02',P.msg))
  +f('52','0000')+f('53','986')
  +(val>0?f('54',Number(val).toFixed(2)):'')
  +f('58','BR')+f('59',P.name.slice(0,25))+f('60',P.city.slice(0,15))
  +f('62',f('05',P.txid))
  +'6304';
 return s+V25.crc(s);
};
V25.svg=function(text){
 var q=V25QR(0,'M');q.addData(text);q.make();
 var n=q.getModuleCount(),m=2,d='';
 for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(q.isDark(r,c))d+='M'+(c+m)+' '+(r+m)+'h1v1h-1z';
 var w=n+2*m;
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+w+'" shape-rendering="crispEdges" role="img" aria-label="QR Code do Pix"><rect width="'+w+'" height="'+w+'" fill="#fff"/><path d="'+d+'" fill="#111"/></svg>';
};
V25.copy=function(t,ok){
 var done=function(){UiJs.toast(ok);};
 try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(done,function(){V25.copyOld(t);done();});return;}}catch(e){}
 V25.copyOld(t);done();
};
V25.copyOld=function(t){var a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.cssText='position:fixed;left:-9999px';document.body.appendChild(a);a.select();try{document.execCommand('copy');}catch(e){}a.remove();};

V25.page=function(back){
 back=back||App.menu;V25.back=back;
 UiJs.page('Apoiar o projeto',back);
 var cur=UiJs.cur;cur.classList.add('v25-pg');
 V25.d().seen=Date.now();Profile.save();
 var box=UiJs.el('div','v25-box',cur);
 box.innerHTML='<div class="v25-hd"><span class="v25-heart" aria-hidden="true">♥</span><b>O Rota do Mestre é gratuito e sem anúncios</b></div>'
  +'<p>Se o jogo está te ajudando a aprender, um Pix de qualquer valor ajuda a manter e melhorar: mais puzzles, novas lições, temas de tabuleiro e o treinador cada vez mais esperto.</p>';
 var sel=V25.sel==null?10:V25.sel;
 var vals=UiJs.el('div','v25-vals',box);
 V25.VALUES.forEach(function(v){var b=UiJs.el('button','v25-v'+(sel===v?' on':''),vals,'R$ '+v);b.onclick=function(){V25.sel=v;V25.page(back);};});
 var ob=UiJs.el('button','v25-v'+(sel===0?' on':''),vals,'Outro valor');ob.onclick=function(){V25.sel=0;V25.page(back);};
 var code=V25.payload(sel);
 var qr=UiJs.el('div','v25-qr',box);qr.innerHTML=V25.svg(code);
 UiJs.el('div','v25-cap',box,sel>0?'Pix de R$ '+sel+',00 · aponte a câmera do app do banco':'Você digita o valor no app do banco');
 var bt=UiJs.el('div','v25-bt',box);
 var c1=UiJs.el('button','btn pri',bt,'Copiar código Pix (copia e cola)');c1.onclick=function(){V25.copy(code,'Código Pix copiado. Cole no app do banco em "Pix copia e cola".');V25.d().copied=(V25.d().copied||0)+1;Profile.save();};
 var c2=UiJs.el('button','btn',bt,'Copiar chave');c2.onclick=function(){V25.copy(V25.PIX.key,'Chave Pix copiada.');};
 var inf=UiJs.el('div','v25-inf',box);
 inf.innerHTML='<span><i>Chave Pix</i>'+V25.PIX.key+'</span><span><i>Recebedor</i>Rodrigo Paes Coelho Santana</span><span><i>Mensagem</i>'+V25.PIX.msg+' <em>(vai junto no código)</em></span>';
 UiJs.p('Antes de confirmar, o app do banco mostra o nome do recebedor: confira. Não há cobrança, assinatura nem dados guardados: o código é gerado aqui mesmo, no seu aparelho.','muted');
 UiJs.p('Não pode contribuir? Tudo bem: o jogo continua completo. Compartilhar com um amigo que quer aprender xadrez também ajuda muito.','muted');
};

/* lembrete discreto no fim da partida: no máximo 1 vez a cada 14 dias, só depois de 8 partidas, e nunca na mesma tela que a pausa recomendada */
V25.endNudge=function(){
 var g=App.G;if(!g||g.over==null||!UiJs.cur)return;
 if(UiJs.cur.querySelector('.v25-nudge')||UiJs.cur.querySelector('.v24-stop'))return;
 var d=V25.d(),hist=Profile.d.hist||[],now=Date.now();
 if(hist.length<8)return;
 if(d.nudgeG===g.__v24t&&g.__v24t){}else{if(d.nudge&&now-d.nudge<14*864e5)return;if(d.seen&&now-d.seen<30*864e5)return;d.nudge=now;d.nudgeG=g.__v24t||now;Profile.save();}
 var end=UiJs.cur.querySelector('.v24-end');if(!end)return;
 var n=UiJs.el('button','v25-nudge',null);n.innerHTML='<span aria-hidden="true">♥</span> Curtindo o treino? Apoie o projeto';
 n.onclick=function(){V25.page(App.menu);};
 end.parentNode.insertBefore(n,end.nextSibling);
};

if(V25_UI){(function(){
 /* menu principal: "Apoiar o projeto" ocupa o lugar de "Jogar com amigo" na grade */
 var HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.5 1.1 4.3 2.4.4.6 1.6.6 2 0 .8-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#e3605a"/></svg>';
 var oMenu=UiJs.menu;
 UiJs.menu=function(items,info){
  var main=false;
  if(items&&items.length){for(var i=0;i<items.length;i++)if(items[i]&&items[i].t==='Jogar com amigo'){var o=items[i];items[i]={t:'Apoiar o projeto',d:'Ajude o jogo a evoluir',f:function(){V25.page(App.menu);},ico:'v25heart',lone:o.lone};main=true;}}
  var r=oMenu.apply(this,arguments);
  if(main)try{[].forEach.call(UiJs.root.querySelectorAll('.menu .mitem'),function(b){var t=b.querySelector('.mtx');if(t&&t.textContent.indexOf('Apoiar o projeto')===0&&!b.querySelector('.v25-mic')){var ic=document.createElement('span');ic.className='mic v25-mic';ic.innerHTML=HEART;b.insertBefore(ic,b.firstChild);b.classList.add('v25-item');}});}catch(e){}
  return r;
 };
 /* Conta e backup: seção no fim */
 var oAcc=V23.account;
 V23.account=function(){var r=oAcc.apply(this,arguments);try{UiJs.h('Apoiar o projeto');UiJs.p('O jogo é gratuito e de código aberto. Se quiser ajudar a melhorá-lo, qualquer contribuição faz diferença.','muted');UiJs.btns([['♥ Apoiar o projeto',function(){V25.page(V23.account);},'pri']]);}catch(e){}return r;};
 Pages.sync=V23.account;
 /* fim de partida */
 var oDraw=App.drawGame;App.drawGame=function(){var r=oDraw.apply(this,arguments);try{V25.endNudge();}catch(e){}return r;};
})();}

/* ======================= v25: narração da História do xadrez ======================= */
V25.hist={a:null,url:null,on:false};
V25.histSrc=function(cb){
 var H=V25.hist;if(H.url){cb(H.url);return;}
 if(typeof window!=='undefined'&&window.XHISTAU){fetch(window.XHISTAU).then(function(r){if(!r.ok)throw 0;return r.blob();}).then(function(b){H.url=URL.createObjectURL(b);cb(H.url);}).catch(function(){cb(null);});return;}
 var e=document.getElementById('res_histau');if(!e||!e.textContent){cb(null);return;}
 try{var bin=atob(e.textContent.trim()),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);H.url=URL.createObjectURL(new Blob([u],{type:'audio/mpeg'}));cb(H.url);}catch(err){cb(null);}
};
V25.histPlay=function(){
 var H=V25.hist;
 V25.histSrc(function(u){
  if(!u||!H.on)return;
  if(!H.a){H.a=new Audio();H.a.preload='auto';H.a.onended=function(){V25.histBtn();};H.a.onpause=function(){V25.histBtn();};H.a.onplay=function(){V25.histBtn();};}
  if(H.a.src!==u)H.a.src=u;
  try{H.a.currentTime=0;}catch(e){}
  var p=H.a.play();if(p&&p.catch)p.catch(function(){V25.histBtn();});
 });
};
V25.histStop=function(){var H=V25.hist;H.on=false;if(H.a){try{H.a.pause();H.a.currentTime=0;}catch(e){}}};
V25.histBtn=function(){
 var b=document.querySelector('.v25-narr');if(!b)return;
 var a=V25.hist.a,playing=!!(a&&!a.paused&&!a.ended);
 b.innerHTML=playing?'<span aria-hidden="true">❚❚</span> Pausar narração':'<span aria-hidden="true">▶</span> Ouvir a narração';
 b.classList.toggle('on',playing);
};
V25.histPage=function(){
 var cur=UiJs.cur;if(!cur||cur.querySelector('.v25-narr'))return;
 var call=cur.querySelector('.callout')||cur.firstChild;
 var b=document.createElement('button');b.className='v25-narr';b.type='button';
 b.onclick=function(){var a=V25.hist.a;if(a&&!a.paused&&!a.ended){a.pause();V25.d().histMute=true;}else{V25.d().histMute=false;V25.hist.on=true;V25.histPlay();}Profile.save();V25.histBtn();};
 if(call&&call.parentNode===cur)call.appendChild(b);else cur.insertBefore(b,cur.firstChild);
 V25.histBtn();
};

/* ======================= v25: modo Mentor — balão com o motivo do lance do computador ======================= */
/* motivo simples quando a análise não aponta um tema tático */
V25.why=function(san,uci,ply){
 var p=/^[KQRBN]/.test(san)?san[0]:(/^O-O/.test(san)?'O':'P'),f=uci.charAt(2),early=ply<=16;
 if(p==='O')return 'Roque: coloca o rei em segurança e liga as torres.';
 if(/#/.test(san))return 'Xeque-mate.';
 if(/x/.test(san))return 'Captura material. Confira se a troca foi justa e se ficou alguma peça sua sem defesa.';
 if(/\+/.test(san))return 'Xeque: obriga você a cuidar do rei antes de qualquer outro plano.';
 if(/=/.test(san))return 'Promove o peão: ganha uma peça nova.';
 if(p==='P')return early?('cdef'.indexOf(f)>=0?'Disputa o centro com um peão e abre caminho para as peças.':'Ganha espaço na lateral e prepara o desenvolvimento.'):'Avança o peão para ganhar espaço ou mudar a estrutura. Veja que casas ele deixou de proteger.';
 if((p==='N'||p==='B')&&early)return 'Desenvolve uma peça para uma casa mais ativa, de onde ela controla o centro.';
 if(p==='Q'&&early)return 'A dama entra no jogo cedo: veja quais peças suas ela passa a atacar.';
 if(p==='K')return 'O rei muda de casa para ficar mais seguro ou mais ativo.';
 if(p==='R')return 'A torre busca uma coluna aberta ou uma fileira mais ativa.';
 return 'Reposiciona a peça para uma casa melhor: veja o que ela passou a atacar e o que deixou de defender.';
};
V25.tipOk=function(g){var t=g&&g.mentorTip;return !!(t&&App.G===g&&g.adaptive&&g.over==null&&g.peek==null&&g.pos.turn===g.human&&g.ucis.length===t.n);};
V25.tipIdx=function(b,sq){for(var i=0;i<64;i++){var r=i>>3,c=i&7,v=b.flip?(r*8+7-c):((7-r)*8+c);if(v===sq)return i;}return -1;};
V25.tipClose=function(){V25.tipOpen=false;var e=document.querySelector('.v25-tip');if(e)e.remove();};
V25.esc=function(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V25.tipShow=function(b){
 var g=App.G;if(!V25.tipOk(g)||!b||!b.root)return;
 var t=g.mentorTip,i=V25.tipIdx(b,t.sq);if(i<0)return;
 var old=b.root.querySelector('.v25-tip');if(old)old.remove();
 var note=t.note||{},rs=(Array.isArray(note.reasons)?note.reasons:[]).filter(Boolean).slice(0,2),al=(Array.isArray(note.alerts)?note.alerts:[]).filter(Boolean).slice(0,1);
 var h='<b>Por que '+V25.esc(t.san)+'?</b>';
 if(rs.length)h+='<ul>'+rs.map(function(x){return '<li>'+V25.esc(x)+'</li>';}).join('')+'</ul>';
 else h+='<p>'+V25.esc(t.why||'O lance melhora a posição: veja quais casas a peça passou a controlar e o que deixou de proteger.')+'</p>';
 if(al.length)h+='<p class="al">'+V25.esc(al[0])+'</p>';
 var e=document.createElement('div');e.className='v25-tip';e.setAttribute('role','status');e.innerHTML=h;
 b.root.appendChild(e);
 var W=b.root.clientWidth,S=W/8,r=i>>3,c=i&7,w=e.offsetWidth,hh=e.offsetHeight;
 var cx=(c+.5)*S,x=Math.max(4,Math.min(W-w-4,cx-w/2));
 var below=r*S-hh-10<2,y=below?(r+1)*S+10:r*S-hh-10;
 e.style.left=x+'px';e.style.top=y+'px';e.classList.add(below?'dn':'up');
 e.style.setProperty('--ax',(cx-x)+'px');
 V25.tipOpen=true;
};
V25.tipDecor=function(b){
 var g=App.G;if(!b||b!==UiJs.board||b!==V25.gameBoard||!b.sqs)return;
 if(!V25.tipOk(g)){if(b.root&&b.root.querySelector('.v25-tip'))V25.tipClose();return;}
 var i=V25.tipIdx(b,g.mentorTip.sq);if(i<0)return;
 var s=b.sqs[i];if(s&&!s.querySelector('.v25-q')){var q=document.createElement('span');q.className='v25-q';q.textContent='?';q.setAttribute('aria-label','Toque para ver o motivo do lance');s.appendChild(q);}
 if(V25.tipOpen&&!b.root.querySelector('.v25-tip'))V25.tipShow(b);
 if(!b.__v25){b.__v25=true;var pre=-1;
  var preSq=null;
  b.root.addEventListener('click',function(ev){pre=b.sel;preSq=ev.target&&ev.target.closest?ev.target.closest('.sq'):null;},true);
  b.root.addEventListener('click',function(ev){
   var gg=App.G,sq=preSq;preSq=null;
   if(!sq||!V25.tipOk(gg)){V25.tipClose();return;}
   var k=b.sqs.indexOf(sq),r=k>>3,c=k&7,v=b.flip?(r*8+7-c):((7-r)*8+c);
   if(v===gg.mentorTip.sq&&pre<0&&!V25.tipOpen)V25.tipShow(b);else V25.tipClose();
  });
 }
};

/* ======================= v25: barra da partida — Dica reúne sugestão, ameaça e desequilíbrios ======================= */
V25.actions=function(){
 var bar=UiJs.actionBar,g=App.G;if(!bar||!g)return;
 var bs=[].slice.call(bar.querySelectorAll('.btns .btn,.btns button'));if(!bs.length)return;
 var find=function(re){for(var i=0;i<bs.length;i++)if(re.test(bs[i].textContent.trim()))return bs[i];return null;};
 var dica=find(/^Dica/),ame=find(/^Amea/),des=find(/^Desfazer/),imb=find(/^(Desequil|Ocultar)/);
 if(!dica||dica.__v25)return;
 var mk=function(b){return b?{f:b.onclick,off:b.classList.contains('off'),t:b.textContent.trim()}:null;};
 var H=mk(dica),A=mk(ame),I=mk(imb);
 [ame,des,imb].forEach(function(b){if(b)b.remove();});
 dica.__v25=true;
 var more=/\+$/.test(H.t);
 dica.innerHTML='Dica<span class="v25-car" aria-hidden="true">▾</span>';
 dica.setAttribute('aria-haspopup','menu');
 dica.classList.toggle('off',H.off&&(!A||A.off)&&(!I||I.off));
 dica.onclick=function(ev){
  ev.stopPropagation();
  var open=bar.querySelector('.v25-pop');if(open){open.remove();return;}
  var p=document.createElement('div');p.className='v25-pop';p.setAttribute('role','menu');
  var add=function(o,lab,sub){if(!o)return;var x=document.createElement('button');x.type='button';x.className='v25-pi'+(o.off?' off':'');x.setAttribute('role','menuitem');x.innerHTML='<b>'+lab+'</b><span>'+sub+'</span>';x.onclick=function(e){e.stopPropagation();p.remove();if(!o.off&&o.f)o.f.call(this,e);};p.appendChild(x);};
  add(H,'Sugestão de lance',g.hint==null?'Uma pista de cada vez, até o lance':(more?'Mais uma pista':'Lance já revelado'));
  add(A,'Ameaça do adversário',A&&A.off&&g.threat!=null?'Já mostrada abaixo':'O que ele faria se fosse a vez dele');
  add(I,/^Ocultar/.test(I?I.t:'')?'Ocultar desequilíbrios':'Desequilíbrios','Material, peças, estrutura e rei');
  bar.appendChild(p);
  var r=dica.getBoundingClientRect(),br=bar.getBoundingClientRect();
  p.style.left=Math.max(0,r.left-br.left)+'px';p.style.top=(r.bottom-br.top+4)+'px';
  setTimeout(function(){var close=function(e){if(!p.contains(e.target)){p.remove();document.removeEventListener('click',close,true);}};document.addEventListener('click',close,true);},0);
 };
};

if(V25_UI){(function(){
 /* Mentor: em vez do painel a cada lance, guarda o motivo para o balão */
 if(typeof AprendizCoach!=='undefined'&&AprendizCoach){
  var oStop=AprendizCoach.stop;
  AprendizCoach.stop=function(g){if(g){g.mentorTip=null;}V25.tipClose();return oStop.apply(this,arguments);};
  AprendizCoach.start=function(g,r){
   oStop(g);if(g)g.mentorTip=null;V25.tipClose();
   if(!g||!r||!r.uci||g.over!=null||g.pos.turn!==g.human)return;
   g.mentorTip={sq:Engine.nameSq(r.uci.slice(2,4)),san:r.san||r.uci,note:g.note||r.note||{},n:g.ucis.length,why:V25.why(r.san||'',r.uci,g.ucis.length)};
   App.drawGame();
  };
 }
 var oBD=BoardJ.prototype.draw;
 BoardJ.prototype.draw=function(){var r=oBD.apply(this,arguments);try{V25.tipDecor(this);}catch(e){}return r;};
 var oDG=App.drawGame;App.drawGame=function(){V25.gameBoard=UiJs.board;var r=oDG.apply(this,arguments);try{V25.actions();}catch(e){}return r;};
 document.addEventListener('click',function(e){if(V25.tipOpen&&!(e.target.closest&&e.target.closest('.board')))V25.tipClose();},true);
 /* narração: começa ao entrar na História pelo menu e para ao voltar ao menu principal */
 var oHist=History.page;
 History.page=function(){
  var r=oHist.apply(this,arguments);
  try{var H=V25.hist;if(!H.visit){H.visit=true;if(!V25.d().histMute){H.on=true;V25.histPlay();}}V25.histPage();}catch(e){}
  return r;
 };
 var oMenu2=UiJs.menu;
 UiJs.menu=function(){V25.hist.visit=false;V25.histStop();return oMenu2.apply(this,arguments);};
})();}
