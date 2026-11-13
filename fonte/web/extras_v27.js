/* Rota do Mestre v27 — contagem de acessos anônima (GoatCounter, sem cookies) e Painel do criador.
 * O painel abre com 5 toques seguidos na "Versão" do rodapé do menu. Ele mostra só números agregados:
 * visitantes por período, histórico por dia e por mês, o que foi usado no jogo e o tipo de aparelho.
 * Nenhum dado pessoal é coletado. Os aparelhos do criador ficam fora da contagem (marcados ao abrir o painel).
 * Para ligar: preencha V27.GC com o código do site no GoatCounter (ex.: 'rotadomestre') e ligue, nas configurações
 * do site no GoatCounter, "Allow adding visitor counts on your website" (é o que deixa o painel ler os totais). */
var V27={GC:'paescoelho',sent:{}};
V27.KEY='rdm-nao-contar';
V27.mine=function(){try{return localStorage.getItem(V27.KEY)==='1';}catch(e){return false;}};
V27.setMine=function(on){try{if(on)localStorage.setItem(V27.KEY,'1');else localStorage.removeItem(V27.KEY);}catch(e){}};
V27.web=function(){return typeof location!=='undefined'&&/^https?:$/.test(location.protocol)&&!/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);};
V27.active=function(){return !!V27.GC&&V27.web()&&!V27.mine();};
V27.base=function(){return 'https://'+V27.GC+'.goatcounter.com';};
/* o que é medido dentro do jogo (eventos anônimos, no máximo um de cada por sessão) */
V27.EV=[
 ['evento-sessao-celular','Sessões no celular','ap'],['evento-sessao-computador','Sessões no computador','ap'],['evento-sessao-app','Abriu como app instalado','ap'],
 ['evento-partida','Começou uma partida','uso'],['evento-centro-treino','Abriu o Centro de Treino','uso'],['evento-nivelamento','Abriu o Nivelamento','uso'],
 ['evento-laboratorio','Abriu o Laboratório do Pensamento','uso'],['evento-erros','Abriu Analisar erros','uso'],['evento-importou','Importou partidas','uso'],['evento-reconstrua','Reconstruiu uma posição','uso'],
 ['evento-historia','Abriu a História do xadrez','uso'],['evento-jogo-antigo','Jogou um jogo antigo','uso'],
 ['evento-pix','Abriu a tela do Pix','uso'],['evento-pix-copiado','Copiou o código Pix','uso']
];
V27.ev=function(path){
 if(!V27.active()||V27.sent[path])return;V27.sent[path]=1;
 try{var ss=sessionStorage.getItem('rdm-ev')||'';if(ss.indexOf('|'+path+'|')>=0)return;sessionStorage.setItem('rdm-ev',ss+'|'+path+'|');}catch(e){}
 var t=0;(function go(){if(window.goatcounter&&window.goatcounter.count){try{window.goatcounter.count({path:path,title:path,event:true});}catch(e){}}else if(t++<20)setTimeout(go,500);})();
};
V27.load=function(){
 if(!V27.active()||document.getElementById('gc-js'))return;
 var s=document.createElement('script');s.id='gc-js';s.async=true;s.src='https://gc.zgo.at/count.js';
 s.setAttribute('data-goatcounter',V27.base()+'/count');
 document.head.appendChild(s);
 var st=false;try{st=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}catch(e){}
 var mob=/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent||'')||(window.innerWidth<700);
 V27.ev(mob?'evento-sessao-celular':'evento-sessao-computador');if(st)V27.ev('evento-sessao-app');
};

/* ======================= leitura dos totais (contador público do GoatCounter) ======================= */
V27.num=function(x){if(x==null)return null;var n=parseInt(String(x).replace(/[^\d]/g,''),10);return isNaN(n)?null:n;};
V27.get=function(path,q){
 var u=V27.base()+'/counter/'+(path==='TOTAL'?'TOTAL':encodeURIComponent(path))+'.json'+(q?'?'+q:'');
 return fetch(u,{cache:'no-store'}).then(function(r){if(r.status===404)return 0;if(!r.ok)throw new Error('HTTP '+r.status);return r.json().then(function(j){return V27.num(j.count!=null?j.count:j.count_unique);});});
};
/* fila com poucas requisições ao mesmo tempo, para não sobrecarregar o serviço */
V27.pool=function(jobs,n){var out=new Array(jobs.length),i=0;function w(){if(i>=jobs.length)return Promise.resolve();var k=i++;return jobs[k]().then(function(v){out[k]=v;},function(e){out[k]=e;}).then(w);}var ws=[];for(var j=0;j<n;j++)ws.push(w());return Promise.all(ws).then(function(){return out;});};
V27.ds=function(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);};
V27.days=function(n){var out=[],t=new Date();t.setHours(12,0,0,0);for(var k=n;k>=0;k--){var d=new Date(t);d.setDate(t.getDate()-k);out.push(d);}return out;};

/* ======================= Painel do criador ======================= */
V27.panel=function(){
 var first=!V27.mine();V27.setMine(true);
 UiJs.page('Painel do criador',App.menu);
 var cur=UiJs.cur;cur.classList.add('v27-pn');
 if(first)UiJs.toast('Este aparelho não entra mais na contagem de acessos.');
 var dev=UiJs.el('div','v27-dev',cur);
 function devTxt(){dev.innerHTML='<b>'+(V27.mine()?'Este aparelho é seu: não entra na contagem':'Este aparelho está sendo contado')+'</b><span>Abra este painel uma vez no seu celular e uma vez no seu computador: cada aparelho onde ele é aberto deixa de ser contado.</span>';
  var b=UiJs.el('button','btn',dev,V27.mine()?'Voltar a contar este aparelho':'Não contar este aparelho');b.onclick=function(){V27.setMine(!V27.mine());devTxt();};}
 devTxt();
 if(!V27.GC){
  UiJs.h('Contador ainda não ligado');
  UiJs.ul(['Crie uma conta grátis em goatcounter.com e escolha o código do site (ex.: rotadomestre).','Nas configurações do site no GoatCounter, ligue "Allow adding visitor counts on your website".','Envie o código para atualizar o jogo: a partir daí cada acesso ao site é contado, sem cookies e sem dados pessoais.']);
  return;
 }
 if(!V27.web())UiJs.p('Você está no arquivo offline: o painel lê os números pela internet, então funciona melhor no site.','warn small');
 var load=UiJs.el('div','v27-load',cur);load.textContent='Buscando os números…';
 var now=new Date(),month0=new Date(now.getFullYear(),now.getMonth()-12,1),months=[];for(var m=0;m<=12;m++)months.push(new Date(month0.getFullYear(),month0.getMonth()+m,1));
 var dd=V27.days(30);
 var jobs=[],P=[['Hoje','start='+V27.ds(now)],['7 dias','start=week'],['30 dias','start=month'],['12 meses','start=year'],['Desde o início','']];
 P.forEach(function(p){jobs.push(function(){return V27.get('TOTAL',p[1]);});});
 dd.forEach(function(d){jobs.push(function(){return V27.get('TOTAL','start='+V27.ds(d));});});
 months.forEach(function(d){jobs.push(function(){return V27.get('TOTAL','start='+V27.ds(d));});});
 V27.EV.forEach(function(e){jobs.push(function(){return V27.get(e[0],'start=month');});jobs.push(function(){return V27.get(e[0],'');});});
 V27.pool(jobs,4).then(function(r){
  if(!document.body.contains(load))return;
  var err=r.filter(function(x){return x instanceof Error;}).length;
  if(err===r.length){load.className='v27-load warn';load.innerHTML='Não foi possível ler os números. Confira se "Allow adding visitor counts on your website" está ligado no GoatCounter e se há internet.';return;}
  load.remove();
  var k=0,v=function(){var x=r[k++];return x instanceof Error?null:x;};
  var per=P.map(function(p){return [p[0],v()];});
  var cum=dd.map(function(){return v();}),cumM=months.map(function(){return v();});
  var evs=V27.EV.map(function(e){return {e:e,m:v(),t:v()};});
  var old=UiJs.cur;UiJs.cur=cur;
  var cards=UiJs.el('div','v27-cards',cur);
  per.forEach(function(p){cards.innerHTML+='<span><b>'+(p[1]==null?'—':p[1].toLocaleString('pt-BR'))+'</b>'+p[0]+'</span>';});
  UiJs.p('Visitantes do site. Os números do GoatCounter são atualizados a cada poucas horas, então os acessos mais recentes podem demorar a aparecer.','muted small');
  /* histórico por dia: diferença entre "desde o dia d" e "desde o dia seguinte" */
  var daily=[];for(var i=0;i<dd.length-1;i++){var a=cum[i],b=cum[i+1];daily.push(a!=null&&b!=null?Math.max(0,a-b):null);}daily.push(cum[dd.length-1]);
  V27.chart(cur,'Últimos 31 dias',dd.map(function(d){return d.getDate()+'/'+(d.getMonth()+1);}),daily);
  var monthly=[];for(var j=0;j<months.length-1;j++){var a2=cumM[j],b2=cumM[j+1];monthly.push(a2!=null&&b2!=null?Math.max(0,a2-b2):null);}monthly.push(cumM[months.length-1]);
  var MN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  V27.chart(cur,'Últimos 13 meses',months.map(function(d){return MN[d.getMonth()]+'/'+String(d.getFullYear()).slice(2);}),monthly);
  UiJs.h('Aparelhos (sessões)');
  V27.table(cur,evs.filter(function(x){return x.e[2]==='ap';}));
  UiJs.h('O que as pessoas usam no jogo');
  V27.table(cur,evs.filter(function(x){return x.e[2]==='uso';}));
  UiJs.p('Cada item conta no máximo uma vez por sessão de cada pessoa. É uma contagem anônima: não há como saber quem fez o quê.','muted small');
  UiJs.h('Detalhes no GoatCounter');
  UiJs.p('País, cidade aproximada, navegador, sistema, tamanho de tela e de onde as pessoas vieram (Google, WhatsApp, links) ficam no painel completo do GoatCounter, que pede o seu login.','');
  var a=UiJs.el('a','btn pri',cur,'Abrir o painel completo');a.href=V27.base()+'/';a.target='_blank';a.rel='noopener';
  UiJs.cur=old;
 });
};
V27.chart=function(cur,title,labels,vals){
 UiJs.h(title);
 var mx=Math.max.apply(null,vals.map(function(x){return x||0;}).concat([1])),n=vals.length,W=620,H=150,bw=W/n;
 var s='<svg viewBox="0 0 '+W+' '+(H+24)+'" class="v27-chart" role="img" aria-label="'+title+'">';
 vals.forEach(function(x,i){var h=x==null?0:Math.round((x/mx)*H);s+='<rect x="'+(i*bw+bw*0.15).toFixed(1)+'" y="'+(H-h)+'" width="'+(bw*0.7).toFixed(1)+'" height="'+Math.max(h,x?1:0)+'" rx="2" fill="'+(i===n-1?'#f3d98c':'#c8963a')+'"><title>'+labels[i]+': '+(x==null?'—':x)+'</title></rect>';
  if(n<=14||i%5===0||i===n-1)s+='<text x="'+(i*bw+bw/2).toFixed(1)+'" y="'+(H+16)+'" text-anchor="middle" font-size="11" fill="#98a1ab">'+labels[i]+'</text>';});
 s+='<text x="2" y="12" font-size="11" fill="#98a1ab">máx. '+mx+'</text></svg>';
 var d=UiJs.el('div','v27-ch',cur);d.innerHTML=s;
};
V27.table=function(cur,rows){
 var t='<table class="v27-tb"><tr><th></th><th>30 dias</th><th>Total</th></tr>';
 rows.forEach(function(x){t+='<tr><td>'+x.e[1]+'</td><td>'+(x.m==null?'—':x.m.toLocaleString('pt-BR'))+'</td><td>'+(x.t==null?'—':x.t.toLocaleString('pt-BR'))+'</td></tr>';});
 var d=UiJs.el('div','',cur);d.innerHTML=t+'</table>';
};

if(typeof document!=='undefined'){(function(){
 setTimeout(function(){try{V27.load();}catch(e){}},1500);
 /* 5 toques seguidos (em até 3 segundos) na versão do rodapé abrem o painel */
 var oMenu=UiJs.menu;
 UiJs.menu=function(){
  var r=oMenu.apply(this,arguments);
  try{var v=UiJs.root.querySelector('.menu .menu-version');if(v){var n=0,t0=0;v.style.cursor='default';
   v.addEventListener('click',function(e){e.stopPropagation();var t=Date.now();if(t-t0>3000)n=0;if(!n)t0=t;n++;if(n>=5){n=0;V27.panel();}});}}catch(e){}
  return r;
 };
 /* eventos de uso */
 function hook(obj,name,ev){if(obj&&typeof obj[name]==='function'){var o=obj[name];obj[name]=function(){V27.ev(ev);return o.apply(this,arguments);};}}
 hook(App,'newGame','evento-partida');hook(App,'training','evento-centro-treino');hook(Pages,'placementIntro','evento-nivelamento');
 hook(History,'page','evento-historia');
 if(typeof World!=='undefined')hook(World,'start','evento-jogo-antigo');
 if(typeof Ancient!=='undefined')hook(Ancient,'start','evento-jogo-antigo');
 if(typeof Xiangqi!=='undefined')hook(Xiangqi,'start','evento-jogo-antigo');
 if(typeof V26!=='undefined'){hook(V26,'lab','evento-laboratorio');hook(V26,'rc','evento-reconstrua');
  var oi=V26.importText;V26.importText=function(t,s,done){return oi.call(this,t,s,function(o){if(o&&o.n>0)V27.ev('evento-importou');done(o);});};}
 if(typeof V25!=='undefined'){hook(V25,'page','evento-pix');var oc=V25.copy;V25.copy=function(t,ok){if(t&&t.indexOf('0002')===0)V27.ev('evento-pix-copiado');return oc.apply(this,arguments);};}
})();}
