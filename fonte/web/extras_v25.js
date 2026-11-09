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
 var n=UiJs.el('button','v25-nudge',null);n.innerHTML='<span aria-hidden="true">♥</span> Curtindo o treino? Apoie o projeto com um Pix';
 n.onclick=function(){V25.page(App.menu);};
 end.parentNode.insertBefore(n,end.nextSibling);
};

if(V25_UI){(function(){
 /* menu principal: "Apoiar o projeto" ocupa o lugar de "Jogar com amigo" na grade */
 var HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.5 1.1 4.3 2.4.4.6 1.6.6 2 0 .8-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#e3605a"/></svg>';
 var oMenu=UiJs.menu;
 UiJs.menu=function(items,info){
  var main=false;
  if(items&&items.length){for(var i=0;i<items.length;i++)if(items[i]&&items[i].t==='Jogar com amigo'){var o=items[i];items[i]={t:'Apoiar o projeto',d:'Ajude o jogo com um Pix',f:function(){V25.page(App.menu);},ico:'v25heart',lone:o.lone};main=true;}}
  var r=oMenu.apply(this,arguments);
  if(main)try{[].forEach.call(UiJs.root.querySelectorAll('.menu .mitem'),function(b){var t=b.querySelector('.mtx');if(t&&t.textContent.indexOf('Apoiar o projeto')===0&&!b.querySelector('.v25-mic')){var ic=document.createElement('span');ic.className='mic v25-mic';ic.innerHTML=HEART;b.insertBefore(ic,b.firstChild);b.classList.add('v25-item');}});}catch(e){}
  return r;
 };
 /* Conta e backup: seção no fim */
 var oAcc=V23.account;
 V23.account=function(){var r=oAcc.apply(this,arguments);try{UiJs.h('Apoiar o projeto');UiJs.p('O jogo é gratuito e de código aberto. Se quiser ajudar a melhorá-lo, contribua com um Pix de qualquer valor.','muted');UiJs.btns([['♥ Apoiar com Pix',function(){V25.page(V23.account);},'pri']]);}catch(e){}return r;};
 Pages.sync=V23.account;
 /* fim de partida */
 var oDraw=App.drawGame;App.drawGame=function(){var r=oDraw.apply(this,arguments);try{V25.endNudge();}catch(e){}return r;};
})();}
