/* Rota do Mestre — camada pedagógica e de interface (incorporada da v22, 09.11.2026).
 * Este arquivo é inserido pelo web/build.js dentro do app.js gerado pelo Haxe, logo antes de Main.main(),
 * no mesmo escopo das classes (App, UiJs, Drills, Pages...). Só vale para a versão HTML5. */
/* v22: animacao verdadeira do lance do computador antes de alterar a posicao. */
var CpuPieceMotion=(function(){
 var api={durationDesktop:1350,durationMobile:1100};
 function locate(b,name){
  var sq=Engine.nameSq(name),c=sq&7,r=sq>>3;
  var col=b.flip?7-c:c,row=b.flip?r:7-r;
  return {col:col,row:row,index:row*8+col};
 }
 function play(g,uci,finish){
  var b=UiJs.board;
  if(!b||!b.root||!b.root.isConnected||!b.sqs||!uci||uci.length<4)return false;
  if(typeof window==='undefined'||!window.Element||!Element.prototype.animate)return false;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
  var root=b.root,fen=Engine.toFEN(g.pos);
  var sequence=[[uci.slice(0,2),uci.slice(2,4)]];
  // Durante o roque, a torre acompanha o rei; ambas continuam no mesmo tabuleiro.
  if(/^e[18][gc][18]$/.test(uci.slice(0,4))){
   var rank=uci.charAt(1);
   sequence.push(uci.charAt(2)==='g'?['h'+rank,'f'+rank]:['a'+rank,'d'+rank]);
  }
  var sqSize=root.getBoundingClientRect().width/8;
  if(!(sqSize>4))return false;
  var elements=[],animations=[],ended=false;
  for(var k=0;k<sequence.length;k++){
   var from=locate(b,sequence[k][0]),to=locate(b,sequence[k][1]);
   var cell=b.sqs[from.index];
   var original=cell&&cell.querySelector('.pc');
   if(!original){
    for(var z=0;z<elements.length;z++){elements[z].original.style.visibility='';elements[z].flying.remove();}
    return false;
   }
   var moving=original.cloneNode(false);
   moving.classList.remove('mv');moving.classList.add('cpu-flying-piece');
   moving.removeAttribute('style');moving.setAttribute('aria-hidden','true');
   moving.style.left=(from.col*12.5)+'%';moving.style.top=(from.row*12.5)+'%';
   moving.style.width='12.5%';moving.style.height='12.5%';
   root.appendChild(moving);
   original.style.visibility='hidden';
   elements.push({original:original,flying:moving});
   var dx=(to.col-from.col)*sqSize,dy=(to.row-from.row)*sqSize;
   var frames=[
    {transform:'translate3d(0,0,0) scale(1)',offset:0},
    {transform:'translate3d('+Math.round(dx*.52)+'px,'+Math.round(dy*.52-5)+'px,0) scale(1.075)',offset:.52},
    {transform:'translate3d('+dx+'px,'+dy+'px,0) scale(1)',offset:1}
   ];
   var dur=window.matchMedia&&window.matchMedia('(hover:hover) and (pointer:fine)').matches?api.durationDesktop:api.durationMobile;
   try{animations.push(moving.animate(frames,{duration:dur,easing:'cubic-bezier(.25,.45,.2,1)',fill:'forwards'}));}
   catch(e){
    for(var x=0;x<elements.length;x++){elements[x].original.style.visibility='';elements[x].flying.remove();}
    return false;
   }
  }
  function end(){
   if(ended)return;
   ended=true;
   for(var n=0;n<elements.length;n++){elements[n].original.style.visibility='';elements[n].flying.remove();}
   // Evita o segundo deslocamento disparado pelo desenho antigo apos a animacao real.
   if(App.G===g&&Engine.toFEN(g.pos)===fen){
    b.prevLast=Engine.nameSq(uci.slice(0,2))+','+Engine.nameSq(uci.slice(2,4));
    try{if(UiJs.boardTheme==='pixel'&&UiJs.chip)UiJs.chip('mv');else UiJs.sfx('mv');}catch(e){}
    finish();
   }
  }
  if(animations.length){
   animations[0].onfinish=end;
   animations[0].oncancel=end;
  }
  return true;
 }
 api.play=play;return api;
})();

// v14: o conteúdo recém-gerado fica no início do painel, não em ordem fixa.
// Mantém os mesmos nós e seus botões, apenas altera a ordem visual dos blocos.
App.promoteRecentGameInfo = function(g) {
	var root = UiJs.cur;
	if(!root || !root.children || !root.children.length) return;
	var nodes = Array.prototype.slice.call(root.children);
	var groups = [];
	var group = null;
	for(var i=0;i<nodes.length;i++) {
		var el = nodes[i];
		var heading = el.classList && el.classList.contains("h");
		if(heading || group == null) {
			group = {nodes:[], title: heading ? (el.textContent || "") : "", index: groups.length};
			groups.push(group);
		}
		group.nodes.push(el);
	}
	var kind = function(title) {
		if(/^(Aprendiz|Mentor) ·/i.test(title)) return "learner";
		if(/^Dica(?:\s|$)/i.test(title)) return "hint";
		if(/^Ameaça do adversário/i.test(title)) return "threat";
		if(/^Desequilíbrios/i.test(title)) return "imbalance";
		if(/^Seu lance/i.test(title)) return "feedback";
		if(/^Computador jogou/i.test(title)) return "cpu";
		if(/^Seu processo de pensamento/i.test(title)) return "process";
		return title ? "other:"+title : "status";
	};
	if(!g._feedSignatures) g._feedSignatures = {};
	if(!g._feedOrders) g._feedOrders = {};
	if(!g._feedSerial) g._feedSerial = 0;
	var initial = !g._feedReady;
	for(var j=0;j<groups.length;j++) {
		var item = groups[j];
		item.kind = kind(item.title);
		var parts = [];
		for(var k=0;k<item.nodes.length;k++) parts.push(item.nodes[k].textContent || "");
		item.signature = parts.join("\n");
		if(g._feedSignatures[item.kind] !== item.signature) {
			g._feedSignatures[item.kind] = item.signature;
			g._feedOrders[item.kind] = ++g._feedSerial;
		}
		item.order = g._feedOrders[item.kind] || 0;
	}
	// A resposta de um botão vence blocos de análises de jogadas anteriores.
	if(g._feedFocus) {
		for(var k=0;k<groups.length;k++) {
			if(groups[k].kind === g._feedFocus) {
				groups[k].order = g._feedOrders[g._feedFocus] = ++g._feedSerial;
				g._feedFocus = null;
				break;
			}
		}
	}
	if(!initial) {
		groups.sort(function(a,b) { return b.order - a.order || a.index - b.index; });
		for(var j=0;j<groups.length;j++) {
			var current = groups[j].nodes;
			for(var k=0;k<current.length;k++) root.appendChild(current[k]);
		}
	}
	g._feedReady = true;
};

/* ROTA DO MESTRE — MOTOR PEDAGÓGICO v15 • 07.11.2026
 * Camada incremental sobre a versão 14. Sem dependências de rede e sem migração destrutiva.
 * Pontuação interna é diagnóstica, NÃO é Elo FIDE.
 */
var Mestre = {};
Mestre.now = function(){return HxOverrides.now() / 1000 * 1000;};
Mestre.clamp = function(v,a,b){return Math.max(a,Math.min(b,v));};
Mestre.theme = {
 mateIn1:["Observe as casas de fuga do rei e verifique cada xeque disponível.","Um mate só existe se todas as respostas legais forem eliminadas.","Liste os xeques e examine as defesas: capturar, bloquear ou fugir.","Priorize xeques que restringem o rei; confira peças que protegem o atacante.","Confira a posição após o lance: o rei fica em xeque e não há respostas legais."],
 mateIn2:["Comece pela ameaça mais forte, mas não despreze lances silenciosos.","Procure um primeiro lance que force respostas limitadas.","Calcule xeques, capturas e ameaças em cada ramificação.","Imagine a melhor resistência do adversário, não apenas a resposta evidente.","Verifique todas as defesas relevantes na árvore de variantes."],
 mateIn3:["Construa uma árvore de variantes, mantendo a posição mentalmente.","Encontre os lances forçados e identifique o elo fraco da defesa do rei.","Considere respostas alternativas do adversário para cada ameaça.","Calcule até o final antes de executar o primeiro lance.","Reproduza a solução e explique por que nenhuma defesa evita a conclusão."],
 fork:["Inspecione alvos importantes que possam ser atacados simultaneamente.","Procure casas onde uma única peça gere duas ameaças.","Verifique se os dois alvos são realmente vulneráveis após a resposta adversária.","Compare xeques duplos e ataques à dama, torres e peças indefesas.","Na variante, identifique o ataque simultâneo e a impossibilidade de salvar ambos os alvos."],
 pin:["Considere quais peças estão alinhadas com algo mais valioso atrás delas.","Investigue peças que não podem se afastar sem perda material ou xeque.","Observe diagonais e colunas com peças de valores diferentes.","Calcule como explorar a restrição de movimento da peça cravada.","Explique qual alvo está atrás da peça cravada e a consequência de sua movimentação."],
 skewer:["Procure duas peças importantes na mesma linha ou diagonal.","Observe se o alvo da frente será obrigado a sair da linha.","Busque xeques ou ataques que forcem o deslocamento do alvo principal.","Calcule como a peça atrás ficará exposta após o primeiro recuo.","Compare o ganho material da variante com os recursos defensivos disponíveis."],
 hangingPiece:["Faça um inventário: o que está atacado e quantas vezes é defendido?", "Uma peça sem proteção pode permitir um ganho imediato.","Compare capturas, defesas intermediárias e contra-ataques.","Verifique se a captura é taticamente segura antes de executá-la.","Calcule as respostas e confirme a vantagem material líquida."],
 discoveredAttack:["Examine peças alinhadas e obstáculos que podem se mover.","Ao retirar uma peça da linha, outra ameaça pode ser revelada.","Procure movimentos com ganho de tempo, preferencialmente com xeque.","Calcule a ameaça revelada e a criada pela peça que se desloca.","Reconstitua as duas ameaças da variante e a resposta mais forte do adversário."],
 sacrifice:["Material não é tudo: compare iniciativa, atividade e segurança do rei.","Antes de sacrificar, identifique quais recursos compensam a entrega.","Calcule a recaptura mais resistente do adversário.","Busque xeques forçados, recuperação de material ou compensação posicional duradoura.","Avalie a posição final da sequência, não apenas o primeiro lance atraente."],
 backRankMate:["Analise a mobilidade do rei atrás da própria cadeia de peões.","Uma última fileira enfraquecida costuma oferecer xeques forçados.","Procure se há casa de fuga ou defesa intermediária.","Cheque quais peças controlam a última fileira e protegem a peça atacante.","Confirme se o rei realmente não tem casa de fuga após a sequência."],
 endgame:["Ative o rei e observe a estrutura de peões.","Conte tempos de promoção e identifique peões passados.","Investigue oposição, zugzwang e casas críticas quando aplicável.","Calcule respostas defensivas e tente converter a menor vantagem.","Compare a posição final com critérios técnicos do tipo de final."],
 opening:["O objetivo é uma posição jogável, não memorizar lances isolados.","Considere centro, desenvolvimento e segurança do rei.","Compare desenvolvimento útil, pressão central e planos do adversário.","Não aceite automaticamente um lance popular: verifique a posição concreta.","Explique o plano da abertura e as estruturas que podem surgir."],
 long:["Anote mentalmente lances candidatos antes de calcular.","Separe ramos principais e respostas críticas.","Calcule até posições estáveis, sem interromper na primeira captura.","Reavalie o resultado de cada variante antes de decidir.","Identifique onde um lance intermediário altera sua conclusão."],
 veryLong:["Identifique o ponto crítico e não comece por movimentos aleatórios.","Calcule primeiro as respostas mais exigentes do adversário.","Reconstrua a posição mental a cada lance forçado.","Confronte o melhor candidato com uma segunda alternativa.","Confira a coerência da sequência completa e sua avaliação final."],
 default:["Antes de mover, verifique xeques, capturas e ameaças dos dois lados.","Identifique a peça menos ativa e os pontos vulneráveis da posição.","Formule pelo menos dois lances candidatos e compare consequências.","Calcule a melhor resposta do adversário em cada candidato.","Reproduza a linha crítica e explique o que mudou na posição."]
};
Mestre.dimGuides = {
 tatica:["VARREDURA TÁTICA","O que está indefeso? Quais xeques, capturas e ameaças são forçados?","Compare ganho material imediato com contra-ataques e defesas intermediárias."],
 calculo:["CÁLCULO PROFUNDO","Separe lances candidatos, calcule respostas forçadas e visualize a posição final.","Não interrompa a análise após um único lance atraente: examine a defesa mais forte."],
 finais:["TÉCNICA DE FINAIS","Ative o rei, compare estruturas de peões e conte os tempos críticos.","Confirme oposição, casas-chave, zugzwang ou atividade das peças conforme a posição."],
 abertura:["COMPREENSÃO DA ABERTURA","Coordene peças, dispute o centro e prepare a segurança do rei.","Conhecer a ideia do lance é mais importante do que reproduzir sua ordem de memória."],
 tempo:["GESTÃO DE TEMPO","Invista cálculo nas decisões irreversíveis e lances críticos.","Velocidade sem precisão não representa domínio de um exercício."],
 estrategia:["PLANEJAMENTO E PROFILAXIA","Identifique fraquezas permanentes, alvos estratégicos e planos adversários.","Antes de melhorar sua peça, pergunte qual seria o próximo plano do oponente."]
};
Mestre.tags = function(t){return Array.isArray(t.tags)?t.tags:[];};
Mestre.guide = function(t){var a=Mestre.tags(t);for(var i=0;i<a.length;i++)if(Mestre.theme[a[i]])return Mestre.theme[a[i]];return Mestre.theme[t.dim]||Mestre.theme.default;};
Mestre.line = function(t){
 var moves=t.k==="pz"?t.moves:t.k==="line"?t.ucis:t.k==="mine"?[t.best]:t.k==="q"?(t.accept||[]).slice(0,1):[];
 try{var p=Engine.posFromFEN(t.fen),out=[];for(var i=0;i<moves.length;i++){var m=Engine.uciToMove(p,moves[i]);if(m<0)break;out.push((p.turn===1?p.full+". ":p.full+"... ")+Engine.moveToSAN(p,m));Engine.makeMove(p,m);}return out.join("  ");}catch(e){return "Linha indisponível";}
};
Mestre.positionNote = function(t){
 var tags=Mestre.tags(t),name=tags.length?Content.themeName(tags[0]):t.dim==="abertura"?"Abertura":t.dim==="finais"?"Final":t.dim==="calculo"?"Cálculo":"Decisão";
 return name+" · dificuldade "+(t.rating||"não calibrada")+" (escala da base de exercícios).";
};
Mestre.detail = function(t,r){
 var guides=Mestre.guide(t),skill=Mestre.dimGuides[t.dim]||Mestre.dimGuides.tatica;
 var status=r.state==="ok"?"Solução independente, sem erro registrado.":r.failed?"Não demonstrou resolução independente nesta tentativa.":"Exercício finalizado.";
 var rows=["RESULTADO: "+status,"CONCEITO: "+Mestre.positionNote(t),"PASSO 1: "+skill[1],"PASSO 2: "+guides[1],"PASSO 3: "+guides[2],"PASSO 4: "+guides[3],"VERIFICAÇÃO: "+guides[4]];
 var line=Mestre.line(t);if(line)rows.push("LINHA REGISTRADA: "+line);
 if(t.k==="pz")rows.push("Esta é a linha registrada no banco de exercícios; outras soluções só podem ser aceitas após verificação técnica.");
 if(t.k==="q"&&t.accept&&t.accept.length>1)rows.push("Lances aceitos: "+t.accept.map(function(u){try{return App.san(t.fen,u);}catch(e){return u;}}).join(", ")+".");
 rows.push("AUTOAVALIAÇÃO: Qual era a ameaça adversária? Que outro candidato você examinou? Qual foi sua maior dificuldade?");
 return rows;
};
Mestre.explain = function(t,r){
 if(!UiJs.cur||!r||r.state!=="ok"&&r.state!=="fail")return;
 var guide=Mestre.dimGuides[t.dim]||Mestre.dimGuides.tatica;
 UiJs.p("TREINADOR · "+guide[0],"gold");
 UiJs.p(guide[1],"");
 var wrap=UiJs.el("details","master-details",UiJs.cur);
 UiJs.el("summary","",wrap,"Análise aprofundada · raciocínio, erros e linha completa");
 var content=UiJs.el("div","master-detail-body",wrap);
 Mestre.detail(t,r).forEach(function(line){UiJs.el("p","",content,line);});
};
Mestre.hint = function(r,t){
 r.hints=(r.hints||0)+1; r.failed=true;
 var step=Math.min(5,r.hints),guide=Mestre.guide(t),skill=Mestre.dimGuides[t.dim]||Mestre.dimGuides.tatica;
 var s=step===1?skill[1]:guide[step-1];
 if(step===4){var u=t.k==="pz"?t.moves[r.step]:t.k==="q"?t.accept[0]:t.k==="mine"?t.best:null;if(u){r.marks=[[Engine.nameSq(u.slice(0,2)),3]];s+=" A peça de referência está destacada.";}}
 if(step>=5){s+=" Linha registrada: "+Mestre.line(t);}
 r.msg="Dica "+step+"/5: "+s+" · Exercício marcado como assistido.";r.cls="warn";
 Drills.draw();
};
Mestre.reviewFens = function(t){
 var moves=t.k==="pz"?t.moves:t.k==="line"?t.ucis:t.k==="mine"?[t.best]:t.k==="q"?t.accept.slice(0,1):[];
 var p=Engine.posFromFEN(t.fen),out=[{fen:Engine.toFEN(p),label:"Posição inicial"}];
 for(var i=0;i<moves.length;i++){var m=Engine.uciToMove(p,moves[i]);if(m<0)break;var label=(p.turn==1?p.full+". ":p.full+"... ")+Engine.moveToSAN(p,m);Engine.makeMove(p,m);out.push({fen:Engine.toFEN(p),label:label});}
 return out;
};
Mestre.review = function(delta){var r=Drills.R;if(!r||r.state!=="ok"&&r.state!=="fail")return;var positions=r.reviewPositions||(r.reviewPositions=Mestre.reviewFens(Drills.task()));var at=r.reviewIndex===-1?positions.length-1:r.reviewIndex;r.reviewIndex=Mestre.clamp(at+delta,0,positions.length-1);Drills.draw();};
Mestre.reviewUI = function(r){
 if(r.state!=="ok"&&r.state!=="fail"||r.opts.storm||r.opts.rush)return;
 var t=Drills.task(),positions=r.reviewPositions||(r.reviewPositions=Mestre.reviewFens(t));if(positions.length<=1)return;
 var at=r.reviewIndex<0?positions.length-1:r.reviewIndex;
 UiJs.p("REVISÃO DE VARIANTES · "+positions[at].label,"gold small");
 UiJs.btns([["◀ Anterior",function(){Mestre.review(-1);},at===0?"off":""],["Próximo ▶",function(){Mestre.review(1);},at>=positions.length-1?"off":""],["Fechar revisão",function(){r.reviewIndex=-1;Drills.draw();}]]);
};
Mestre.clock = function(r){
 if(!r||r.opts.storm||r.opts.rush)return;
 if(!r.timerLabel||!r.timerLabel.isConnected){r.timerLabel=UiJs.el("div","master-clock",UiJs.cur);var parent=r.timerLabel.parentNode;parent.insertBefore(r.timerLabel,parent.firstChild);}
 var sec=(r.state==="wait"?0:Math.max(0,Math.floor(((r.endMs||Mestre.now())-r.t0)/1000))),clock=Math.floor(sec/60)+":"+(sec%60<10?"0":"")+(sec%60);
 r.timerLabel.textContent="◷  "+clock+(r.opts.adaptive?"  ·  Questão "+(r.i+1)+"/"+Mestre.adaptiveTarget:"")+"  ·  "+(r.opts.placement?"Avaliação sem dicas":"Treino com reflexão")+(r.opts.adaptive?"  ·  avaliação adaptativa":"")+(r.attempts>1?"  ·  tentativa "+r.attempts:"" );
};
Mestre.clearClock=function(r){if(r&&r.masterClock){window.clearInterval(r.masterClock);r.masterClock=null;}};

/* avaliação adaptativa: desempenho na primeira tentativa + dificuldade + eficiência; sem afirmação de Elo FIDE */
Mestre.adaptiveTarget=36;
Mestre.dims=["tatica","calculo","finais","tatica","abertura","calculo","tatica","finais","tatica","calculo","finais","tatica"];
Mestre.initialEstimate=function(){var prev=Profile.d.place&&Profile.d.place.est;if(prev&&Profile.d.place.method==="adaptive-v15")return Mestre.clamp(prev,600,2650);return Mestre.clamp(Profile.d.pzN>20?Profile.d.pzElo:1200,700,2200);};
Mestre.expected=function(s,d){return 1/(1+Math.pow(10,(d-s)/400));};
Mestre.ratingStep=function(rating,task,answer){var p=Mestre.expected(rating,task.rating||1200);var speed=answer.ms>0?Mestre.clamp(70000/answer.ms,0,1):.5;var y=answer.ok?.90+.10*speed:0;return Mestre.clamp(Math.round(rating+330*(y-p)),400,2900);};
Mestre.nextTask = function(r){
 var idx=r?r.res.length:0;var target=r?r.adaptiveRating:Mestre.initialEstimate();var dim=Mestre.dims[idx%Mestre.dims.length];
 var used=r?r.adaptiveUsed:Object.create(null);var old=Profile.d.placeSeen||[];
 var tags=dim==="calculo"?["long","veryLong","mateIn3"]:dim==="finais"?["endgame"]:null;
 if(dim==="abertura"){
   var qs=Content.placeX().filter(function(x){return x.cat==="opening"&&!used["place:"+x.fen]&&!old.includes("place:"+x.fen);});
   if(qs.length){qs.sort(function(a,b){return Math.abs(a.rating-target)-Math.abs(b.rating-target);});var x=qs[0];used["place:"+x.fen]=true;return {k:"q",id:"place:"+x.fen,fen:x.fen,accept:x.accept,q:x.q,rating:x.rating,dim:"abertura",note:"Compare o controle central, a atividade das peças e a segurança dos reis."};}
 }
 Puzzles.load();var candidates=Puzzles.list.filter(function(p){return !used[p.id]&&!old.includes(p.id)&&(!tags||p.hasAny(tags))&&(dim!=="calculo"||p.moves.length>=4);});
 if(!candidates.length)candidates=Puzzles.list.filter(function(p){return !used[p.id]&&(!tags||p.hasAny(tags));});
 if(!candidates.length)candidates=Puzzles.list.filter(function(p){return !used[p.id];});
 if(!candidates.length)return null;
 var near=candidates.filter(function(p){return Math.abs(p.rating-target)<=230;});if(near.length>=3)candidates=near;
 var pool=candidates.slice().sort(function(a,b){return Math.abs(a.rating-target)-Math.abs(b.rating-target);}).slice(0,40);
 var chosen=pool[Math.floor(Math.random()*Math.min(12,pool.length))];used[chosen.id]=true;
 return Study.pzTask(chosen,dim==="calculo",dim);
};
Mestre.placementResult=function(res){
 var estimate=1200,ct={tatica:[0,0],calculo:[0,0],finais:[0,0],abertura:[0,0],tempo:[0,0]},fast=0,good=0;
 for(var i=0;i<res.length;i++){var x=res[i],dm=ct[x.dim]||ct.tatica;dm[1]++;if(x.ok){dm[0]++;good++;if(x.ms>0&&x.ms<=70000)fast++;}estimate=Mestre.ratingStep(estimate,x,x);}
 ct.tempo=[fast,res.length];var dims={};Object.keys(ct).forEach(function(k){dims[k]=ct[k][1]?Math.round(100*ct[k][0]/ct[k][1]):null;});
 var complete=res.length>=30,coverage=Object.keys(ct).filter(function(k){return k!=="tempo"&&ct[k][1]>=3;}).length;
 return {day:Profile.today(),est:Math.round(estimate),dims:dims,step:estimate<850?1:estimate<1050?2:estimate<1250?3:estimate<1450?4:estimate<1650?5:estimate<1800?6:estimate<1950?7:estimate<2100?8:estimate<2250?9:10,ok:good,n:res.length,complete:complete,method:"adaptive-v15",coverage:coverage,efficiency:res.length?Math.round(100*fast/res.length):0,avgMs:res.length?Math.round(res.reduce(function(s,x){return s+x.ms;},0)/res.length):0};
};

/* Gancho de tela, preservando o roteamento e lógica já existentes. */
var _mOldMenu=UiJs.menu;
UiJs.menu=function(items,info){_mOldMenu(items,info);var menu=UiJs.root.querySelector('.menu'),footer=menu&&menu.querySelector('.mfoot');if(footer){var v=UiJs.el('span','menu-version',footer,'Versão: 09.11.2026');v.setAttribute('aria-label','Versão de 9 de novembro de 2026');}};
var _mOldTraining=App.training;
App.training=function(){_mOldTraining();var g=UiJs.root.querySelector('.menu.hub .mgrid');if(g){UiJs.mitem(g,{t:'Laboratório de alto rendimento',d:'Desafios progressivos · cálculo profundo · biblioteca dos mestres',f:Mestre.hub,wide:true,hl:true,ico:'ct'});}};
Mestre.training=function(){var base=Mestre.clamp(Profile.d.pzElo||1200,650,2650),seen=Profile.seenMap(),tasks=[];for(var i=0;i<18;i++){var rating=Mestre.clamp(base-180+i*65,500,2900),tags=i%4===0?["endgame"]:i%3===0?["long","veryLong"]:null,ps=Puzzles.pick(tags,rating-100,rating+120,1,seen,i%3===0?4:0);if(!ps.length)continue;var p=ps[0];seen.h[p.id]=true;tasks.push(Study.pzTask(p,i%3===0,i%4===0?"finais":i%3===0?"calculo":"tatica"));}Drills.run('Treino de alto rendimento',tasks,{back:App.training});};
Mestre.calculation=function(){var base=Mestre.clamp(Profile.d.pzElo||1200,700,2600);var p=Puzzles.pick(["long","veryLong","mateIn3"],Math.max(600,base-100),Math.min(2900,base+450),12,Profile.seenMap(),4);Drills.run('Cálculo profundo',Study.pzTasks(p,true,'calculo'),{back:App.training});};
Mestre.report=function(){UiJs.page('Relatório de domínio',App.training);var data=Profile.d.masterStats||[],recent=data.slice(-100),total=recent.length;if(!total){UiJs.p('Complete exercícios para construir um diagnóstico por competência.','muted');return;}var yes=recent.filter(function(x){return x.first;}).length,help=recent.filter(function(x){return x.hints>0;}).length;UiJs.stats([[Math.round(100*yes/total)+'%','acerto independente'],[String(total),'exercícios recentes'],[String(help),'com auxílio']]);var dims={};recent.forEach(function(x){var d=dims[x.dim]||(dims[x.dim]=[0,0,0]);d[0]++;if(x.first)d[1]++;d[2]+=x.ms||0;});Object.keys(dims).forEach(function(k){var d=dims[k];UiJs.bar(k+' · '+Math.round(d[2]/d[0]/1000)+'s de média',Math.round(d[1]/d[0]*100),'gold',d[1]+'/'+d[0]+' sem auxílio');});UiJs.p('Indicadores de prática: não são rating FIDE nem certificação de título. Resultados com ajuda não comprovam domínio.','muted');};

/* Exames: treino não desbloqueia, aprovação integral requer pré-requisitos. */
Pages.exam=function(i){
 var back=function(){Pages.stage(i);},stage=Content.trail()[i],ts=Profile.trailState(i),req=ts.read.length>=stage.lessons.length&&stage.tasks.every(function(t,j){return Pages.taskDone(i,j);});
 var tasks=Study.trailExam(i),min=Math.max(1,Math.ceil(tasks.length*(i<3?.8:.9))),requiredTests=i>=8?2:1;
 Drills.run((req?'Prova':'Simulado')+' · '+stage.name,tasks,{back:back,exam:true,examPractice:!req,done:function(res){
   if(res.length!==tasks.length){UiJs.page('Prova incompleta',back);UiJs.p('Esta prova foi interrompida e não altera a aprovação.','warn');UiJs.btns([['Voltar',back,'pri']]);return;}
   var ok=res.filter(function(x){return x.ok&&x.attempts===1&&x.hints===0;}).length;
   if(req&&ok>ts.best)ts.best=ok;
   if(req&&ok>=min){ts.masterPasses=(ts.masterPasses||0)+1;if(ts.masterPasses>=requiredTests)ts.exam=true;}
   if(req){Profile.touch();Profile.save();}
   UiJs.page('Resultado da '+(req?'prova':'simulação'),back);
   var pass=req&&ok>=min;UiJs.p(ok+' de '+res.length+(pass?' · critério atingido':' · critério não atingido'), 'big '+(pass?'good':'warn'));
   UiJs.p(!req?'Simulado: os pré-requisitos ainda não foram concluídos. Nenhuma etapa foi liberada.':ts.exam?'Etapa aprovada. Continue com desafios inéditos.':pass?'Boa prova! Para certificar esta etapa avançada, obtenha nova aprovação independente.':'Meta: '+min+' acertos independentes em '+tasks.length+'. Revise os erros e treine novamente.','');
   UiJs.p('Tentativas com ajuda ou erros não contam como domínio independente.','muted');
   UiJs.btns([['Voltar à trilha',Pages.trail,'pri']]);
 }});
};
var _mOldTrail=Pages.trail;
Pages.trail=function(){_mOldTrail();if(UiJs.cur)UiJs.p('Provas com exigência progressiva: 80% nas primeiras etapas; 90% nas demais. Etapas finais exigem duas aprovações independentes. Simulados não desbloqueiam etapas.','gold small');};

/* Nivelamento adaptativo: saída não grava testes incompletos. */
Pages.placementIntro=function(){
 UiJs.page('Nivelamento de precisão',Pages.menu);
 UiJs.p('Avaliação progressiva de 36 posições. A dificuldade aumenta ou diminui conforme o desempenho, com foco em tática, cálculo, finais e aberturas.','');
 UiJs.p('Cronômetro por exercício; a primeira resposta é a única que vale. Sem dicas. Respostas e tempos alimentam um diagnóstico INTERNO (não é Elo FIDE).','muted');
 UiJs.p('Se interromper a avaliação, o resultado parcial não será salvo. As explicações aparecem após cada resposta.','muted');
 var prev=Profile.d.place;if(prev){UiJs.p('Último diagnóstico: '+prev.est+' · '+prev.ok+'/'+prev.n+' posições'+(prev.method==='adaptive-v15'?' · adaptativo':' · método anterior'),'gold');UiJs.btns([['Consultar resultado anterior',function(){Pages.placementResult(prev);}]])};
 UiJs.btns([['Iniciar Nivelamento adaptativo',function(){
   var used=Object.create(null),target=Mestre.initialEstimate(),first=Mestre.nextTask(null);
   if(!first){UiJs.toast('Não foi possível selecionar um exercício.');return;}
   used[first.id]=true;
   Drills.run('Nivelamento adaptativo',[first],{placement:true,adaptive:true,back:Pages.placementIntro,done:function(res){
     if(res.length<Mestre.adaptiveTarget){UiJs.page('Avaliação interrompida',Pages.placementIntro);UiJs.p('Resultado parcial não registrado.','warn');UiJs.btns([['Voltar',Pages.placementIntro,'pri']]);return;}
     var result=Mestre.placementResult(res);Profile.d.place=result;
     Profile.d.placeSeen=(Profile.d.placeSeen||[]).concat(res.map(function(x){return x.id;})).slice(-300);
     if(Profile.d.pzN<15)Profile.d.pzElo=Mestre.clamp(result.est,500,2500);
     if(Profile.d.adapt===800&&Profile.d.hist.length===0)Profile.d.adapt=Mestre.clamp(result.est-100,500,1800);
     Profile.touch();Profile.save();Pages.placementResult(result);
   }});
   Drills.R.adaptiveRating=target;Drills.R.adaptiveUsed=used;Drills.R.targetTasks=Mestre.adaptiveTarget;
 },'pri']]);
};
var _mOldPlaceResult=Pages.placementResult;
Pages.placementResult=function(r){_mOldPlaceResult(r);if(r.method==='adaptive-v15'&&UiJs.cur){UiJs.h('Precisão do diagnóstico');UiJs.p('Tempo médio por posição: '+Math.round(r.avgMs/1000)+' s · eficiência indicativa: '+r.efficiency+'% · competências com 3+ questões: '+r.coverage+'/4.','gold');UiJs.p('O tempo altera levemente o resultado (até 10% do crédito de acerto). A estimativa não foi calibrada contra jogadores FIDE; NÃO mede força oficial nem confere título.','muted');UiJs.p(r.coverage<4?'Amostra desigual: alguns domínios precisam de mais questões.':'O resultado cobre os quatro domínios básicos, mas exige confirmação em avaliações futuras.','muted');}};

/* Acompanhamento das resoluções, dicas graduais, segunda tentativa e revisão de lances. */
var _mOldStart=Drills.startTask;
Drills.startTask=function(){var r=Drills.R;Mestre.clearClock(r);r.attempts=1;r.errorsCount=0;r.hints=0;r.reviewIndex=-1;r.reviewPositions=null;r.firstReply=null;r.timerLabel=null;r.forceFail=false;r.endMs=null;_mOldStart();if(!r.opts.storm&&!r.opts.rush){r.masterClock=window.setInterval(function(){if(Drills.R===r&&r.timerLabel&&r.state==='play')Mestre.clock(r);},1000);}};
var _mOldDraw=Drills.draw;
Drills.draw=function(){_mOldDraw();var r=Drills.R;if(!r||!UiJs.board)return;if(!r.opts.storm&&!r.opts.rush){Mestre.clock(r);if(r.reviewIndex>=0&&r.reviewPositions){var pos=r.reviewPositions[r.reviewIndex];UiJs.board.fen=pos.fen;UiJs.board.legal=null;UiJs.board.onMove=null;UiJs.board.last=null;UiJs.board.draw();}Mestre.reviewUI(r);if(r.opts.adaptive&&r.res.length<Mestre.adaptiveTarget&&r.state!=="play"){var buttons=UiJs.panelEl.querySelectorAll("button");buttons.forEach(function(b){if(b.textContent==="Concluir")b.textContent="Próximo";});}}};
var _mOldExplain=Drills.explain;
Drills.explain=function(t){_mOldExplain(t);Mestre.explain(t,Drills.R);};
Drills.hint=function(){var r=Drills.R;if(!r||r.state!=='play'||r.opts.placement||r.opts.exam)return;Mestre.hint(r,Drills.task());};
var _mOldFail=Drills.fail;
Drills.fail=function(msg){var r=Drills.R,t=Drills.task();if(!r)return; if(!r.firstReply)r.firstReply=Mestre.now()-r.t0;
 if(!r.forceFail&&!r.opts.placement&&!r.opts.exam&&!r.opts.rush&&!r.opts.storm&&r.state==='play'&&r.errorsCount===0&&(t.k==='pz'||t.k==='q'||t.k==='mine')){
  r.errorsCount=1;r.attempts=2;r.failed=true;r.msg='Primeira resposta incorreta. Reavalie as ameaças, compare candidatos e tente mais uma vez. A segunda tentativa é para aprender, sem recuperar a pontuação de acerto independente.';r.cls='warn';r.arrows=[];r.marks=[];Drills.draw();return;
 }
 r.errorsCount=(r.errorsCount||0)+1;_mOldFail(msg);
};
var _mOldGiveUp=Drills.giveUp;
Drills.giveUp=function(){if(Drills.R)Drills.R.forceFail=true;_mOldGiveUp();};
var _mOldSolved=Drills.solved;
Drills.solved=function(msg){var r=Drills.R;if(r&&!r.firstReply)r.firstReply=Mestre.now()-r.t0;if(r&&r.failed&&r.attempts>1)msg='Resolvido na segunda tentativa: avanço pedagógico, sem crédito de primeira resposta.';_mOldSolved(msg);};
var _mOldRecord=Drills.record;
Drills.record=function(ok){var r=Drills.R;if(!r)return;r.endMs=Mestre.now();_mOldRecord(ok);var last=r.res[r.res.length-1];if(!last)return;last.firstMs=r.firstReply==null?last.ms:r.firstReply;last.attempts=r.attempts||1;last.hints=r.hints||0;last.credit=ok&&last.attempts===1&&!last.hints?1:last.attempts>1&&!last.hints&&r.state==='fail'?0.4:0;
 if(!r.opts.placement&&!r.opts.storm&&!r.opts.rush){var h=Profile.d.masterStats||(Profile.d.masterStats=[]);h.push({day:Profile.today(),id:last.id,dim:last.dim,first:!!ok&&last.attempts===1&&last.hints===0,ms:last.ms,hints:last.hints,attempts:last.attempts,credit:last.credit});if(h.length>1200)h.splice(0,h.length-1200);Profile.save();}
};
var _mOldNext=Drills.next;
Drills.next=function(){var r=Drills.R;if(r&&r.opts.adaptive&&r.i===r.tasks.length-1&&r.res.length===r.tasks.length&&r.res.length<Mestre.adaptiveTarget){var prev=r.res[r.res.length-1];r.adaptiveRating=Mestre.ratingStep(r.adaptiveRating,r.tasks[r.i],prev);var task=Mestre.nextTask(r);if(task)r.tasks.push(task);} _mOldNext();};
var _mOldQuit=Drills.quit;
Drills.quit=function(){var r=Drills.R;Mestre.clearClock(r);if(r&&((r.opts.adaptive||r.opts.exam)&&r.res.length<r.tasks.length || r.opts.adaptive&&r.res.length<Mestre.adaptiveTarget)){Drills.R=null;UiJs.cancel(r.timer);r.gen++;r.opts.back();UiJs.toast('Teste interrompido: resultado parcial não salvo.');return;} _mOldQuit();};
var _mOldFinish=Drills.finishRun;
Drills.finishRun=function(){Mestre.clearClock(Drills.R);_mOldFinish();};

/* Cinco níveis também durante as partidas, além de Threat e avaliação existente. */
var _mOriginalGameHint=App.doHint;
App.doHint=function(){var g=App.G;if(g&&g.hint&&g.hintStage>=3&&g.hintStage<5&&g.over==null&&g.busy==null&&!g.fbPending&&g.pos.turn===g.human){g.hintStage++;g._feedFocus='hint';App.drawGame();return;}_mOriginalGameHint();};

/* Biblioteca off-line de raciocínio para todos os níveis. Cada tema tem um protocolo concreto de análise. */
Mestre.knowledge=[
 ['Candidatos e cálculo','calculo',['Faça um inventário de xeques, capturas e ameaças, mas inclua lances silenciosos que mudem a posição.','Escolha pelo menos dois candidatos; calcule o lance mais resistente do adversário para cada um.','Pare de calcular somente quando puder avaliar a posição resultante com material, segurança dos reis, atividade e estrutura.','Armadilha comum: considerar apenas a primeira resposta que confirma sua ideia.'],['Qual a principal ameaça adversária?','O que acontece após a resposta mais forte?','Como comparo as posições finais?']],
 ['Visão tática e padrões','tatica',['Procure peças sem defesa, alinhamentos em diagonais/colunas e defesas sobrecarregadas.','Verifique quais temas se combinam: cravada, desvio, lance intermediário ou ataque duplo.','Não declare vitória material antes de calcular o recurso de contrajogo.','Armadilha comum: associar uma posição ao primeiro padrão familiar e deixar de calcular.'],['Qual peça ou casa está vulnerável?','O tático é forçado?','Como o adversário pode recusar o sacrifício?']],
 ['Profilaxia','estrategia',['Antes de executar seu plano, imagine que a vez fosse do adversário.','Identifique o objetivo de sua última jogada e as rupturas de peões disponíveis.','Compare impedir a ideia adversária com criar uma ameaça mais forte.','Armadilha comum: confundir um lance defensivo passivo com profilaxia ativa.'],['Qual é a ameaça concreta?','Meu lance melhora ou restringe alguma peça?','Qual plano adversário fica impossível?']],
 ['Planos nas posições silenciosas','estrategia',['Avalie estrutura de peões, casas fracas, colunas abertas e peças menos ativas.','Escolha um alvo estratégico duradouro antes de selecionar o lance.','Estabeleça uma sequência de melhora das peças que não crie fraquezas novas.','Armadilha comum: jogar um lance de aparência ativa sem objetivo verificável.'],['Qual transformação estrutural me favorece?','Quem se beneficia das trocas?','Qual peça pior pode ser melhorada?']],
 ['Posições inferiores e resistência','finais',['Determine o problema mais urgente: rei, material, atividade ou estrutura.','Procure simplificações que aumentem as chances de defesa e recursos táticos de empate.','Busque contrajogo ativo quando a defesa puramente passiva não for suficiente.','Armadilha comum: desistir mentalmente de uma posição difícil antes de calcular recursos.'],['Há xeque perpétuo, afogamento ou fortaleza?','Qual troca dificulta a vitória rival?','Posso gerar uma ameaça concreta?']],
 ['Final de torres','finais',['A atividade da torre costuma ser decisiva; compare torres atrás dos peões passados.','Centralize o rei quando for seguro e evite passividade que prenda suas peças.','Domine princípios de corte do rei, atividade, defesa lateral e posições-padrão.','Armadilha comum: avançar um peão antes de garantir apoio da torre e do rei.'],['Minha torre está ativa?','O rei adversário está cortado?','Quando trocar peões favorece cada lado?']],
 ['Oposição e zugzwang','finais',['Em finais de peões, conte casas críticas, tempos e o direito de jogar.','Oposição não é um fim em si: sua utilidade depende da estrutura e das casas de acesso.','Verifique cuidadosamente se a jogada altera a paridade de tempos.','Armadilha comum: aplicar oposição mecanicamente a estruturas que exigem triangulação.'],['Quem vence a corrida de promoção?','Qual casa-chave é acessível?','Um tempo de reserva muda o resultado?']],
 ['Estruturas de peões','estrategia',['Determine cadeias, peões isolados, dobrados, atrasados e maiorias.','Identifique rupturas estratégicas antes de avançar peões permanentemente.','Avalie se a estrutura favorece bispos, cavalos ou torres.','Armadilha comum: criar uma fraqueza permanente por um ganho temporário de espaço.'],['Qual peão é uma fraqueza real?','Onde ocorrerá a ruptura?','Que peça domina as casas criadas?']],
 ['Iniciativa e compensação','tatica',['Uma peça sacrificada pode gerar atividade, tempo ou pressão sobre o rei, mas compensação deve ser demonstrada.','Examine a melhor devolução de material e os recursos defensivos adversários.','Não confunda possibilidade de ataque com ameaça forçada.','Armadilha comum: insistir em um ataque sem aumentar a participação das peças.'],['Qual é o preço material?','A iniciativa é sustentável?','A defesa pode simplificar a posição?']],
 ['Ataques contra o rei','tatica',['Conte atacantes e defensores na região do rei.','Investigue aberturas de linhas, pontos de entrada e casas de fuga.','Calcule xeques, mas não negligencie lances de quietude que aumentem a ameaça.','Armadilha comum: entregar material sem coordenação nem continuidade de ataque.'],['Há reforços disponíveis?','Quem controla as casas de fuga?','A defesa pode devolver material?']],
 ['Peça boa, peça ruim','estrategia',['Atividade vale mais que aparência: verifique casas úteis e alvos acessíveis.','Um bispo bloqueado pode tornar-se forte após uma ruptura; um cavalo bom depende de postos estáveis.','Planeje trocas de modo que a estrutura resultante favoreça suas peças restantes.','Armadilha comum: trocar a peça mais ativa apenas porque uma troca é possível.'],['Qual peça tem menos casas?','A troca favorece minha estrutura?','O posto avançado pode ser expulso?']],
 ['Finais com peão passado','finais',['Conte os tempos até promoção considerando xeques, bloqueios e apoio do rei.','Peões passados afastados podem criar desvios valiosos, mas também podem se tornar alvos.','Quando torres estão presentes, avalie o posicionamento atrás dos peões passados.','Armadilha comum: avançar sem verificar a possibilidade de bloqueio.'],['Qual rei alcança o peão?','Há tempos de espera?','Qual é a atividade das torres?']],
 ['Abertura sem memorização','abertura',['Desenvolva as peças de maneira coordenada e lute pelo centro, sem seguir regras mecanicamente.','Entenda planos típicos, estrutura de peões e segurança do rei.','Aprenda transposições e posições resultantes, não apenas sequências decoradas.','Armadilha comum: confiar em memória de variantes quando o adversário saiu da teoria.'],['Qual é a ameaça imediata?','Que estrutura surge após a troca central?','Qual é o plano de desenvolvimento?']],
 ['Decisão sob pressão','tempo',['Antes de gastar tempo, classifique a posição como rotineira ou crítica.','Reserve cálculo profundo para lances irreversíveis, táticas forçadas e decisões estratégicas com impacto.','Mesmo em apuro, faça uma verificação curta de xeques e ameaças adversárias.','Armadilha comum: jogar rápido para compensar o tempo perdido e acumular imprecisões.'],['O lance é irreversível?','Qual análise mínima evita um erro grave?','Estou escolhendo por evidência ou impulso?']],
 ['Conversão de vantagem','estrategia',['Aumente a restrição sobre o adversário antes de forçar ganhos táticos.','Evite conceder contrajogo desnecessário e compare trocas favoráveis.','Transfira a vantagem para finais mais simples quando a técnica justificar.','Armadilha comum: procurar mate imediato em posição onde o caminho mais seguro é melhorar as peças.'],['Qual é a vantagem concreta?','Como neutralizar o contrajogo?','Qual troca facilita a conversão?']],
 ['Defesa ativa e contrajogo','estrategia',['Localize a principal ameaça e liste respostas concretas.','Prefira defesa que desenvolva atividade quando a posição permitir.','Não hesite em devolver material se isso eliminar ameaças decisivas.','Armadilha comum: defender cada alvo isoladamente sem resolver a causa estratégica.'],['Posso criar uma ameaça maior?','Qual defensor está sobrecarregado?','Qual é o recurso mais resistente?']],
 ['Comparação de variantes','calculo',['Não avalie apenas o início de duas linhas; chegue a posições finais comparáveis.','Considere iniciativa, atividade, segurança dos reis, estrutura e material.','Separe avaliações concretas de impressões posicionais.','Armadilha comum: escolher a linha mais longa por parecer profunda.'],['Qual é a resposta crítica em cada linha?','Quais posições finais são estáveis?','Minha avaliação muda com uma troca?']],
 ['Treinamento deliberado','calculo',['Selecione deficiências específicas e exercícios adequados para corrigi-las.','Resolva primeiro sem ajuda, depois estude integralmente a variante e revise dias depois.','Aumente a dificuldade somente quando a competência se mostrar estável em posições novas.','Armadilha comum: repetir puzzles memorizados e interpretar familiaridade como domínio.'],['Que competência falhou?','O erro se repetiu em posição nova?','Qual exercício pode demonstrar transferência?']],
 ['Aproveitamento de colunas','estrategia',['Torres coordenadas em colunas abertas criam pressão que pode converter-se em invasão.','Controle as casas de entrada, sobretudo a sétima fileira, e verifique contrajogo.','Quando não há coluna aberta, investigue qual ruptura de peão pode criá-la.','Armadilha comum: duplicar torres em uma coluna sem ponto real de invasão.'],['Há casas de entrada?','Quem domina o único ponto de acesso?','Existe uma ruptura favorável?']],
 ['Espaço e restrição','estrategia',['Mais espaço pode gerar opções de manobra, mas peões avançados também criam alvos.','Identifique rupturas do lado com menos espaço e como impedi-las.','Melhore peças sem permitir uma libertação imediata do adversário.','Armadilha comum: avançar peões demais sem coordenação das peças.'],['Qual ruptura liberta a defesa?','Minha estrutura tem alvos?','Posso criar um segundo ponto de pressão?']]
];
Mestre.hub=function(){UiJs.page('Laboratório de alto rendimento',App.training);UiJs.p('Exigência progressiva com foco em cálculo, decisões independentes e estudo deliberado.','gold');UiJs.items([{t:'Desafio progressivo',d:'18 posições, dificuldade crescente e correção aprofundada',f:Mestre.training},{t:'Cálculo sem mover as peças',d:'12 posições longas; mantenha as variantes mentalmente',f:Mestre.calculation},{t:'Biblioteca dos mestres',d:Mestre.knowledge.length+' módulos de estudo técnico e estratégico',f:Mestre.library},{t:'Relatório de domínio',d:'Acompanhe precisão independente, tempo e competências',f:Mestre.report}]);};
Mestre.library=function(){UiJs.page('Biblioteca dos mestres',Mestre.hub);UiJs.p('Teoria aplicada: o que observar, como decidir e quais erros evitar. Escolha um tema para estudar e treinar.','muted');UiJs.items(Mestre.knowledge.map(function(m,i){return {t:(i+1)+'. '+m[0],d:m[2][0],f:function(){Mestre.libraryTopic(i);}};}));};
Mestre.libraryTopic=function(index){var m=Mestre.knowledge[index];UiJs.page(m[0],Mestre.library);UiJs.p('Competência: '+m[1],'gold');UiJs.h('Método profissional');m[2].forEach(function(t,i){UiJs.p((i+1)+'. '+t,'');});UiJs.h('Perguntas para sua próxima partida');UiJs.ul(m[3]);
 var bs=[];
 if(m[1]==='estrategia'){
   UiJs.p('Para estratégia posicional, as atividades práticas verificáveis disponíveis são o estudo de estruturas e as partidas-modelo; não vamos atribuir um gabarito tático a uma decisão estratégica.','muted');
   bs.push(['Estudar estruturas',Pages.structs,'pri'],['Analisar partidas de mestres',Pages.models]);
 }else{
   bs.push(['Treinar esta competência',function(){var base=Mestre.clamp(Profile.d.pzElo||1200,500,2600),tags=m[1]==='calculo'?['long','veryLong']:m[1]==='finais'?['endgame']:null;var ps=Puzzles.pick(tags,base-150,base+200,8,Profile.seenMap(),m[1]==='calculo'?4:0);Drills.run('Prática: '+m[0],Study.pzTasks(ps,m[1]==='calculo',m[1]),{back:function(){Mestre.libraryTopic(index);}});},'pri']);
 }
 bs.push(['Voltar',Mestre.library]);UiJs.btns(bs);
};


/* ROTA DO MESTRE — EDICAO 16 — curadoria estruturada e treinador em tres etapas
 * Fonte atualmente incorporada: 5.060 problemas Lichess legados (sem popularidade, sem desvio).
 * A colecao de 5.000 abaixo e escolhida DENTRO dessa fonte, sem alegar importacao de 6M.
 * Substituicao por exportacao oficial pode ser feita pelo curador offline complementar.
 */
var EliteBank={};
EliteBank.source='5.000 problemas selecionados da base local da v15 (curadoria estrutural, nao verificacao global da base Lichess).';
EliteBank.meta={};
EliteBank.score=function(p){
 var tags=p.tags||[],has=function(t){return tags.indexOf(t)>=0;};
 var score=Math.min(p.rating,2700)/30;
 if(has('veryLong'))score+=68;
 if(has('long'))score+=33;
 if(has('sacrifice'))score+=30;
 if(has('discoveredAttack'))score+=26;
 if(has('doubleCheck'))score+=32;
 if(has('smotheredMate'))score+=28;
 if(has('promotion'))score+=22;
 if(has('skewer'))score+=22;
 if(has('pin'))score+=18;
 if(has('fork'))score+=12;
 if(has('endgame'))score+=18;
 if(has('mateIn3')||has('mate3'))score+=32;
 if(has('mateIn4')||has('mate4'))score+=46;
 if(has('oneMove'))score-=26;
 if(has('mateIn1')||has('mate1'))score-=30;
 if(has('hangingPiece'))score-=7;
 if(has('backRankMate'))score-=9;
 score+=Math.min(8,Math.max(0,(p.moves.length-2)*2));
 return Math.round(score*10)/10;
};
EliteBank.load=function(){
 if(EliteBank.items)return;
 Puzzles.load();
 var dedup=Object.create(null),candidates=[];
 Puzzles.list.forEach(function(p){
  var key=p.fen+'|'+p.moves.join(' ');
  if(dedup[key])return;
  dedup[key]=true;
  candidates.push(p);
 });
 candidates.sort(function(a,b){return EliteBank.score(b)-EliteBank.score(a)||(a.id<b.id?-1:1);});
 EliteBank.items=candidates.slice(0,Math.min(5000,candidates.length));
 EliteBank.ids=Object.create(null);
 EliteBank.items.forEach(function(p,i){EliteBank.ids[p.id]=true;EliteBank.meta[p.id]={rank:i+1,score:EliteBank.score(p)};});
 EliteBank.counters={};['800','1200','1600','2000','2200','2500'].forEach(function(v){EliteBank.counters[v]=EliteBank.items.filter(function(p){return p.rating>=+v;}).length;});
};
EliteBank.tracks=[
 {id:'misto',name:'Desafio surpresa',tag:null,desc:'Sem indicar o motivo tatico; simula a necessidade de descobrir o que importa.'},
 {id:'calculo',name:'Cálculo profundo',tag:['long','veryLong'],desc:'Variantes com varias decisoes, visualizacao e precisao.'},
 {id:'sacrificio',name:'Sacrifícios e iniciativa',tag:['sacrifice'],desc:'Calcule compensacao, defesas e consequencias.'},
 {id:'finais',name:'Finais e técnica',tag:['endgame'],desc:'Rei ativo, peoes, conversao e resistencia.'},
 {id:'ataque',name:'Ataque e combinações',tag:['discoveredAttack','skewer','doubleCheck','fork','pin'],desc:'Motivos combinados e respostas criticas.'},
 {id:'mates',name:'Mates calculados',tag:['mate2','mate3','mate4','mateIn2','mateIn3','mateIn4'],desc:'Calcule a rede completa antes de executar.'},
 {id:'promocao',name:'Promoção e recursos',tag:['promotion'],desc:'Recursos raros de peoes e finais.'},
 {id:'muito',name:'Desafios de elite',tag:['veryLong','sacrifice','endgame'],desc:'Exige mais calculo; posições de rating mais alto da fonte local.'}
];
/* Verifica sequencias registradas com as regras do proprio motor do jogo. */
EliteBank.audit=function(){
 EliteBank.load();var good=0,fail=[];
 EliteBank.items.forEach(function(p){
  try{
   var board=Engine.posFromFEN(p.fen),ok=true;
   for(var i=0;i<p.moves.length;i++){
    var m=Engine.uciToMove(board,p.moves[i]);
    if(m<0){ok=false;break;}
    Engine.makeMove(board,m);
   }
   if(ok)good++;else fail.push(p.id);
  }catch(e){fail.push(p.id);}
 });
 return {total:EliteBank.items.length,valid:good,invalid:fail.length,examples:fail.slice(0,12)};
};
/* Trilhas adicionais sao ativadas quando a importacao oficial contem os temas correspondentes. */
EliteBank.tracks.push(
 {id:'defesa',name:'Defesa precisa',tag:['defensiveMove','equality'],desc:'Recursos para resistir, neutralizar ameacas e salvar posicoes dificeis.'},
 {id:'silenciosos',name:'Lances silenciosos',tag:['quietMove'],desc:'Solucoes nao-obvias que preparam ameacas sem xeque ou captura.'},
 {id:'mestres',name:'Partidas de grandes mestres',tag:['masterVsMaster','superGM'],desc:'Posicoes de partidas entre titulados ou de super-GMs.'},
 {id:'raros',name:'Recursos extraordinarios',tag:['zugzwang','underPromotion','intermezzo','interference'],desc:'Zugzwang, subpromocoes, lances intermediarios e interferencias.'}
);
EliteBank.randomSeed=function(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0);};
EliteBank.select=function(opts){
 EliteBank.load();opts=opts||{};
 var stage=opts.stage||0,lo=opts.lo||400,hi=opts.hi||2850,seen=Profile.seenMap(),used=Object.create(null),track=opts.track||null,n=opts.n||10;
 var pool=EliteBank.items.filter(function(p){
  if(p.rating<lo||p.rating>hi)return false;
  if(track&&track.tag&&!track.tag.some(function(x){return p.tags.indexOf(x)>=0;}))return false;
  if(stage>=8&&p.moves.length<3)return false;
  return true;
 });
 var novelty=function(p){var key=p.id;return seen&&seen.h&&seen.h[key]? -160:0;};
 pool.sort(function(a,b){
  var sa=EliteBank.score(a)+novelty(a),sb=EliteBank.score(b)+novelty(b);
  return sb-sa;
 });
 // Amostragem estratificada: evita que varias questoes quase identicas monopolizem a sessao.
 var themes=Object.create(null),selected=[];
 var seed=EliteBank.randomSeed((opts.track?opts.track.id:'misto')+':'+Date.now()+':'+(Profile.d.pzElo||0));
 var rand=function(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 var window=pool.slice(0,Math.max(250,n*65));
 while(selected.length<n&&window.length){
  var idx=Math.floor(rand()*Math.min(window.length,Math.max(70,n*12))),p=window.splice(idx,1)[0];
  var group=(p.tags||[]).find(function(t){return !['advantage','crushing','mate','middlegame','endgame','opening','short','long','veryLong','oneMove'].includes(t);})||'outro';
  if((themes[group]||0)>=Math.max(2,Math.ceil(n/3))&&window.length>n)continue;
  if(used[p.id])continue;
  themes[group]=(themes[group]||0)+1;used[p.id]=true;selected.push(p);
 }
 if(selected.length<n){for(var i=0;i<pool.length&&selected.length<n;i++)if(!used[pool[i].id]){used[pool[i].id]=true;selected.push(pool[i]);}}
 return selected;
};
EliteBank.stageBands=[
 [500,950],[750,1100],[950,1300],[1150,1500],[1350,1750],[1550,1950],
 [1750,2100],[1900,2250],[2050,2400],[2200,2500],[2300,2600],[2450,2700]
];
EliteBank.stage=function(i){
 if(i>Math.max(0,Profile.d.eliteStage||0)){UiJs.toast('Conclua a etapa anterior antes da prova desta etapa.');return;}
 var b=EliteBank.stageBands[i],task=EliteBank.select({stage:i+1,lo:b[0],hi:b[1],n:10});
 if(task.length<8){UiJs.toast('Nao ha posições suficientes nesta faixa.');return;}
 var back=EliteBank.hub;
 Drills.run('Trilha intensiva '+(i+1)+'/12',Study.pzTasks(task,i>=7,i>=7?'calculo':'tatica'),{back:back,exam:true,done:function(results){
  if(results.length!==task.length){UiJs.page('Etapa incompleta',back);UiJs.p('Sem pontuacao registrada.','warn');UiJs.btns([['Voltar',back,'pri']]);return;}
  var good=results.filter(function(x){return x.ok&&x.attempts===1&&(!x.hints);}).length;
  var min=i<3?8:i<7?9:9,passed=good>=min;
  if(passed){Profile.d.eliteStage=Math.max(Profile.d.eliteStage||0,i+1);Profile.save();}
  UiJs.page('Resultado do desafio',back);
  UiJs.p(good+'/'+task.length+' acertos independentes — '+(passed?'meta atingida':'revisao necessaria'),passed?'good big':'warn big');
  UiJs.p('Etapa '+(i+1)+': meta '+min+'/'+task.length+'. Esta trilha e pedagogica e nao corresponde a certificacao FIDE.','muted');
  UiJs.btns([['Voltar ao laboratorio',back,'pri']]);
 }});
};
EliteBank.practice=function(track){
 var level=Profile.d.pzElo||1200;
 var lo=track.id==='muito'?2200:Math.max(400,level-180),hi=track.id==='muito'?2700:Math.min(2750,level+340);
 var items=EliteBank.select({track:track,lo:lo,hi:hi,n:12});
 if(items.length<6)items=EliteBank.select({track:track,lo:400,hi:2700,n:12});
 Drills.run(track.name,Study.pzTasks(items,track.id==='calculo'||track.id==='muito',track.id==='finais'?'finais':track.id==='calculo'?'calculo':'tatica'),{back:EliteBank.hub});
};
EliteBank.hub=function(){
 EliteBank.load();UiJs.page('Biblioteca 5.000 · Alto rendimento',Mestre.hub);
 UiJs.p('Curadoria por complexidade, diversidade e objetivo de aprendizagem. '+EliteBank.items.length+' posições únicas disponíveis.','gold');
 UiJs.p(EliteBank.source,'muted small');
 UiJs.stats([[String(EliteBank.items.length),'posições selecionadas'],[String(EliteBank.counters['2200']),'rating 2200+'],[String(EliteBank.counters['2500']),'rating 2500+']]);
 UiJs.h('Desafios por competência');
 UiJs.items(EliteBank.tracks.filter(function(t){return !t.tag||EliteBank.items.some(function(p){return t.tag.some(function(tag){return p.tags.indexOf(tag)>=0;});});}).map(function(t){return {t:t.name,d:t.desc,f:function(){EliteBank.practice(t);}};}));
 UiJs.h('Escalada de dificuldade · 12 etapas');
 UiJs.p('Provas de dez posições. A faixa de rating aumenta com a progressao. Sem ajuda nas provas; resolucao independente obrigatoria.','muted');
 var unlocked=Math.max(0,Profile.d.eliteStage||0);
 UiJs.items(EliteBank.stageBands.map(function(b,i){return {t:(i+1)+'. '+(i<=unlocked?'◈ ':'🔒 ')+'Desafio '+(i+1),d:'Dificuldade da base '+b[0]+'–'+b[1]+' · '+(i<3?'8':'9')+'/10 acertos requeridos'+(i>unlocked?' · bloqueado':''),f:function(){EliteBank.stage(i);}};}));
 UiJs.h('Qualidade e limites');
 UiJs.p('Os ratings sao os do conjunto original, nao Elo oficial. A base local nao contem popularidade nem desvio de rating e nao comprova que estas sao as 5.000 melhores do Lichess. A curadoria completa da exportacao publica pode substituir este conjunto posteriormente.','muted small');
 UiJs.btns([['Voltar',Mestre.hub,'pri']]);
};
var _eliteOldHub=Mestre.hub;
Mestre.hub=function(){_eliteOldHub();if(UiJs.cur){UiJs.h('Curadoria de alta dificuldade');UiJs.items([{t:'Biblioteca seletiva · 5.000 desafios',d:'Trilhas e treinos por tecnica, calculo, finais e dificuldade',f:EliteBank.hub},{t:'Academia · aprender a pensar',d:EliteCoach.lesson.length+' métodos profissionais de análise em três etapas',f:function(){EliteCoach.methodLibrary();}}]);}};

var EliteCoach={};
EliteCoach.lesson=[
 ['Candidatos','Antes de escolher o primeiro lance atraente, encontre pelo menos duas possibilidades.','Compare respostas fortes, nao respostas cooperativas.','Calcule cada candidato ate uma posicao que voce consiga avaliar.'],
 ['Ameacas','Que mudaria se voce simplesmente passasse sua vez?','Procure xeques, capturas e ataques a pecas indefesas.','Resolva a ameaca sem abrir outra fraqueza maior.'],
 ['Lances intermediarios','Uma troca ou captura nao precisa ser imediata.','Verifique xeques, ameacas diretas e ataques de maior prioridade.','Calcule o lance intermedio e a resposta do adversario antes da recaptura.'],
 ['Seguranca do rei','Identifique diagonais, colunas e casas de fuga do rei.','Compare o numero de defensores e atacantes perto do rei.','Avalie o risco de abrir linhas antes de aceitar material.'],
 ['Atividade das pecas','Encontre sua peca menos ativa e a mais ativa do adversario.','Pergunte que casas e linhas cada peca pode atingir no futuro.','Melhore coordenacao sem perder tempos em manobras irrelevantes.'],
 ['Profilaxia','Qual seria o plano do adversario no lance seguinte?','Examine rupturas, invasoes e trocas que melhoram a posicao dele.','Considere um lance que restrinja o plano sem abandonar suas proprias chances.'],
 ['Estrutura','Quais peoes podem se tornar fracos ou passados?','Compare rupturas centrais e alvos estaveis.','Escolha seu plano depois de projetar a estrutura resultante.'],
 ['Finais','A atividade do rei pesa mais quando restam poucas pecas.','Conte tempos de promocao e identifique casas criticas.','A ordem de lances importa: verifique oposicao e zugzwang.'],
 ['Defesa ativa','Defender nao significa somente recuar.','Procure contra-ameacas, recursos de troca e resistencia.','Encontre a melhor resposta do oponente e verifique se existe alternativa defensiva.'],
 ['Cálculo disciplinado','Calcule o necessario, nao todas as jogadas possiveis.','Priorize xeques, capturas e ameacas, mas inclua ideias silenciosas.','Confira a posicao final e retorne ao lance inicial sem confundir as pecas.'],
 ['Iniciativa','Quem consegue criar ameacas sem perder tempos?','Avalie se sua vantagem dinamica compensa material ou estrutura.','A iniciativa termina se o adversario consolida: procure continuacoes concretas.'],
 ['Conversao','Em posicao favoravel, reduza contrajogo desnecessario.','Identifique qual troca facilita o objetivo e qual entrega atividade.','Prefira uma sequencia tecnicamente segura a um ataque arriscado sem necessidade.'],
 ['Precisao','Uma ideia plausivel pode falhar por um unico recurso tatico.','Procure a resposta mais desagradavel do adversario.','Antes de mover, faca uma verificacao final das pecas indefesas.'],
 ['Pensamento de mestre','Descreva a posicao antes de escolher uma jogada.','Liste desbalances: rei, material, estrutura, espaco, atividade e tempo.','A decisao deve combinar plano estrategico e calculo concreto.']
];

EliteCoach.lesson=EliteCoach.lesson.concat([
 ['Tensao de peoes','O que muda se a estrutura central for aberta agora?','Compare quem tem as pecas melhor colocadas para a abertura de linhas.','Calcule capturas alternativas e o resultado estrutural de cada uma.'],
 ['Casas fracas','Que casa nao pode mais ser defendida por um peao?','Identifique pecas capazes de ocupar ou controlar essa casa.','A fraqueza so se torna um alvo util quando ha uma rota concreta para explora-la.'],
 ['Postos avancados','Existe uma casa firme na metade adversaria?','Pergunte como a peca seria sustentada e se o oponente pode troca-la.','Avalie a atividade obtida contra o custo de manobra.'],
 ['Par de bispos','A posicao tem linhas que favorecem o trabalho dos dois bispos?','Compare o controle de diagonais longas e a estrutura que limita essas pecas.','Considere a troca somente depois de avaliar o tipo de posicao final.'],
 ['Bispo ruim','Algum bispo esta bloqueado pelos proprios peoes?','Encontre rupturas, diagonais alternativas ou trocas uteis.','Corrija a estrutura ou ative a peca antes de julga-la definitivamente ruim.'],
 ['Cavalo contra bispo','Posicao fechada ou aberta? O que favorece cada peca?','Conte postos avancados e diagonais livres.','A troca correta depende da estrutura resultante e das tarefas das pecas.'],
 ['Maioria de peoes','Onde existe superioridade numerica de peoes?','Avalie se a maioria pode criar um peao passado.','Uma maioria estatica nao garante vantagem se o rei estiver exposto.'],
 ['Peao isolado','O peao isolado e alvo estatico ou gera atividade dinamica?','Compare bloqueio, ruptura e ocupacao de casas centrais.','Explore a fraqueza quando a iniciativa adversaria perder forca.'],
 ['Peoes pendentes','A dupla de peoes centrais tem flexibilidade ou pontos fracos?','Investigue o momento de avancar um deles.','Trocas prematuras podem transformar a estrutura em peoes isolados.'],
 ['Peao passado','Qual peca deve bloquear ou apoiar o peao passado?','Conte tempos, casas de promocao e atividade do rei.','Empurre o peao no momento certo, evitando que fique preso ou seja capturado.'],
 ['Oposicao de reis','Quem controla as casas-chave na frente dos peoes?','Calcule a alternancia dos tempos e a oposicao.','Escolha a ordem que obriga o rei inimigo a ceder uma casa critica.'],
 ['Zugzwang','O adversario gostaria de passar a vez?','Identifique obrigacoes que pioram a posicao.','Guarde lances de espera para transferir a vez no momento adequado.'],
 ['Torre ativa','A torre esta atacando ou defendendo passivamente?','Procure colunas, setima fileira e ataque aos peoes por tras.','Em finais de torres, atividade pode compensar desvantagens materiais.'],
 ['Torre atras do passado','Quem controla a coluna do peao passado?','Compare torre por tras e torre pela frente.','A geometria e as casas de fuga decidem a tecnica correta no caso concreto.'],
 ['Fortalezas','Pode um lado materialmente inferior impedir todas as rupturas?','Encontre as casas de entrada do rei e das pecas pesadas.','Avaliacao de material sem plano de penetracao pode ser enganosa.'],
 ['Xeque perpetuo','O atacante tem sequencia de xeques sem escapar para mate?','Calcule as rotas disponiveis ao rei.','A possibilidade de perpetuo altera decisivamente a avaliacao de muitos ataques.'],
 ['Desvio de defensor','Que peca sustenta dois deveres importantes?','Encontre o movimento que a obriga a abandonar um dever.','Calcule se uma resposta intermediaria invalida a combinacao.'],
 ['Sobrecarga','Um defensor esta sendo solicitado para tarefas simultaneas?','Compare a importancia de cada alvo que ele protege.','Crie ameacas em ordem correta para tornar a defesa impossivel.'],
 ['Atracao','Uma captura pode trazer o rei ou outra peca a uma casa ruim?','Procure continuacoes forçadas depois da captura.','Verifique a compensacao final antes de entregar material.'],
 ['Interferencia','Existe uma linha de defesa que pode ser bloqueada?','Procure uma peca que possa se interpor com ganho de tempo.','A interferencia so funciona se o defensor nao tiver recurso intermediario.'],
 ['Raio X','Uma peca valiosa esconde um alvo mais vulneravel atras dela?','Observe diagonais e colunas com pecas alinhadas.','Calcule o deslocamento da peca principal e o ataque ao alvo oculto.'],
 ['Lance silencioso','Existe um lance sem xeque que cria uma ameaca irresistivel?','Compare posições depois de lances de espera e preparacao.','Nem toda solucao vencedora comeca com cheque ou captura.'],
 ['Restricao de pecas','Uma peca adversaria tem poucos movimentos ativos?','Encontre peoes e casas que restringem sua mobilidade.','O dominio posicional cresce quando o rival fica sem contra-jogo.'],
 ['Ruptura central','Quem se beneficia se o centro abrir neste momento?','Calcule a resposta do adversario apos cada ruptura candidata.','Abrir linhas contra um rei vulneravel exige verificacao tática.'],
 ['Ataque minoritario','Uma minoria de peoes pode criar alvo na maioria inimiga?','Localize possiveis rupturas de alas.','O alvo estrategico deve ser explorado antes que surja contra-ataque central.'],
 ['Consolidacao','A posicao favoravel ainda permite taticas adversarias?','Procure simplificacoes e casas de invasao.','Converta vantagem reduzindo recursos e preservando atividade.'],
 ['Transicoes','Como a troca altera o tipo de final?','Compare peoes, reis ativos e pecas restantes.','Uma troca pode ganhar material e perder um final: avalie depois da transicao.'],
 ['Mau peao bom peao','Qual peao se torna um objetivo de ataque realista?','Identifique defesa, mobilidade e acesso ao alvo.','Fraqueza so importa se puder ser explorada de modo concreto.'],
 ['Iniciativa por tempos','Qual lance ganha tempo atacando uma peca ou criando ameaca?','Compare o numero de jogadas necessarias para organizar cada lado.','A iniciativa e temporaria: transforme-a em vantagem estavel ou material.'],
 ['Rei no centro','O centro pode se abrir antes do roque?','Investigue cheques e colunas no centro.','Priorize seguranca concreta do rei em vez de completar mecanicamente a abertura.'],
 ['Erro de horizonte','Voce esta parando a variante cedo demais?','Prolongue a linha ate cessarem ameacas forçadas.','A ultima captura aparente pode esconder xeque ou recurso decisivo.'],
 ['Solucao resistente','A sua ideia so funciona se o adversario colaborar?','Escolha a defesa mais desagradavel para testar o plano.','Uma boa jogada resiste a resposta mais forte, nao a resposta mais comum.'],
 ['Arvore de variantes','Qual decisao cria ramos realmente diferentes?','Calcule primeiro o ramo mais forçado.','Evite recalcular a mesma linha: compare conclusoes entre ramos.'],
 ['Precisao em defesa','Uma pequena imprecisao transforma empate em derrota?','Verifique todos os xeques e ataques antes de procurar contrajogo.','Defesa precisa exige reconhecer quais trocas nao podem ser aceitas.'],
 ['Plano de longo prazo','Qual fraqueza continua existindo apos tres ou quatro trocas?','Compare plano proprio e plano contrario.','Reavalie o plano a cada alteracao estrutural, nao o execute cegamente.']
]);
EliteCoach.topicFor=function(g){
 var fen=Engine.toFEN(g.pos),p=EliteCoach.phase(fen);
 var incheck=Engine.inCheck(g.pos);
 var ids=incheck?[1,8,27,46]:p==='abertura'?[0,3,4,25,43]:p==='final'?[7,11,22,23,24,25,26,28,29]:[0,1,2,3,4,5,6,8,9,10,12,13,17,18,19,20,21,30,31,32,33,34,35,36,37,38,39,40,41,42,44,45];
 return EliteCoach.lesson[ids[EliteCoach.hash(fen)%ids.length]] || EliteCoach.lesson[0];
};
EliteCoach.methodLibrary=function(){
 UiJs.page('Academia · Aprenda a pensar',Mestre.hub);
 UiJs.p('Biblioteca de raciocinio: cada conceito apresenta tres camadas de orientacao. Nas partidas, o treinador escolhe uma delas de acordo com a fase da posicao.','gold');
 UiJs.items(EliteCoach.lesson.map(function(item,i){return {t:(i+1)+'. '+item[0],d:item[1],f:function(){EliteCoach.methodTopic(i);}};}));
};
EliteCoach.methodTopic=function(i){
 var item=EliteCoach.lesson[i];UiJs.page(item[0],EliteCoach.methodLibrary);
 UiJs.h('1 · Observe e formule hipoteses');UiJs.p(item[1]);
 UiJs.h('2 · Direcione a investigacao');UiJs.p(item[2]);
 UiJs.h('3 · Calcule e decida');UiJs.p(item[3]);
 UiJs.p('Aplique o metodo em tres posições distintas. A primeira resposta deve ser sem ajuda; a solucao so devera ser consultada apos tentar calcular.','muted');
 UiJs.btns([['Voltar a academia',EliteCoach.methodLibrary,'pri'],['Jogar para aplicar',App.setupGame]]);
};

EliteCoach.hash=function(s){return EliteBank.randomSeed(s||'');};
EliteCoach.phase=function(fen){
 var board=(fen||'').split(' ')[0]||'';
 var q=(board.match(/[qQrRbBnN]/g)||[]).length;
 return q>=10?'abertura':q<=5?'final':'meio-jogo';
};
EliteCoach.safe=function(x){return x==null?'':String(x);};
EliteCoach.socratic=function(g){
 var fen=Engine.toFEN(g.pos),phase=EliteCoach.phase(fen),incheck=Engine.inCheck(g.pos);
 if(incheck)return ['Voce esta em xeque. Quais tres respostas legais deve considerar: capturar, bloquear ou mover o rei?','Antes de pensar em atacar, verifique se o rei fica seguro apos cada resposta.'];
 if(phase==='abertura')return ['Antes de mover: quem controla o centro, quais pecas ainda nao se desenvolveram e qual rei esta mais exposto?','Escolha duas candidatas e calcule a resposta mais energica do adversario.'];
 if(phase==='final')return ['Quais peoes podem passar, onde o rei precisa estar e quem dispoe dos tempos decisivos?','Projete duas sequencias ate uma posicao com resultado pratico compreensivel.'];
 return ['Se seu adversario pudesse jogar duas vezes, qual seria sua maior ameaca?','Identifique duas jogadas candidatas, pecas indefesas e a melhor defesa do adversario.'];
};
EliteCoach.recommend=function(g){
 if(!g||!g.lastFb)return;
 var fb=g.lastFb,phase=EliteCoach.phase(g.lastRec?g.lastRec.fen:Engine.toFEN(g.pos));
 var intro=fb.bad?'Revise por que a sua escolha nao resistiu a resposta mais forte.':'Procure compreender a ideia, e nao somente memorizar um lance.';
 var notes=fb.bad?[
   '1. Localize a ameaca ou oportunidade que precisava ter visto antes de mover.',
   '2. Compare seu lance com a alternativa indicada usando as continuacoes verificadas acima.',
   '3. Anote o erro de raciocinio e tente encontrar o mesmo conceito em outra posicao.'
 ]:[
   '1. Explique qual problema seu lance resolveu e que nova possibilidade criou.',
   '2. Encontre a defesa mais exigente do adversario: o plano continua correto?',
   '3. Se pudesse repetir a posicao sem olhar, encontraria esse lance pelo mesmo raciocinio?'
 ];
 if(phase==='final')notes.push('Finais: considere atividade do rei, peoes passados e ordem dos tempos.');
 if(phase==='abertura')notes.push('Abertura: avalie desenvolvimento, seguranca dos reis e controle central.');
 UiJs.h('Treinador · aprendizado desta jogada');
 UiJs.p(intro,'gold');
 UiJs.ul(notes);
 if(fb.bad){UiJs.p('Desafio de recuperacao: antes da proxima jogada, indique duas ameacas do adversario e calcule duas respostas candidatas.','muted small');}
};
EliteCoach.render=function(g){
 var stage=Math.max(1,Math.min(3,g.hintStage||1)),hint=g.hint,lesson=EliteCoach.topicFor(g);
 UiJs.h('Dica '+stage+' de 3 · '+(stage===1?'PENSE':stage===2?'INVESTIGUE':'APRENDA'));
 if(stage===1){
  UiJs.p('Nao revele a resposta ainda. Investigue primeiro com as proprias ideias.','gold');
  UiJs.ul(EliteCoach.socratic(g));UiJs.p('Metodo de estudo · '+lesson[0]+': '+lesson[1],'muted small');
  UiJs.p('Exercicio mental: indique pelo menos 2 lances candidatos e uma defesa para cada um. So depois peca a segunda dica.','muted');
 }else if(stage===2){
  UiJs.p('Boa investigacao. Agora observe a peca destacada no tabuleiro, mas ainda nao revele a casa de destino.','gold');
  if(hint.n1)UiJs.p(EliteCoach.safe(hint.n1));
  if(hint.n2)UiJs.p(EliteCoach.safe(hint.n2));
  UiJs.p('Por que esta peca seria util? Que resposta do adversario poderia refutar sua primeira ideia?','muted');UiJs.p('Metodo de estudo · '+lesson[0]+': '+lesson[2],'muted small');
 }else{
  UiJs.p('Lance recomendado pela analise: '+EliteCoach.safe(hint.san),'good');
  if(hint.reasons&&hint.reasons.length){UiJs.h('Por que funciona');UiJs.ul(hint.reasons);}
  if(hint.alerts&&hint.alerts.length){UiJs.h('O que ainda exige cuidado');UiJs.ul(hint.alerts,'warn');}
  if(g._elitePV&&g._elitePV.line){UiJs.p('Apos '+EliteCoach.safe(hint.san)+', continuacao calculada pelo motor: '+EliteCoach.safe(g._elitePV.line),'gold');}
  else if(g._elitePVLoading)UiJs.p('Calculando uma variante critica para complementar a explicacao…','muted small');
  UiJs.h('Como pensar para encontrar esse lance');UiJs.p('Metodo de estudo · '+lesson[0]+': '+lesson[3],'gold');
  UiJs.ul(['1. Compare seu plano com a ameaca adversaria antes de agir.',
           '2. Examine pelo menos duas candidatas; calcule o recurso defensivo mais exigente.',
           '3. Confira a posicao resultante: material, atividade, seguranca do rei e contrajogo.',
           '4. Repita a analise sem setas para consolidar o metodo.']);
  UiJs.p('A sugestao e a variante derivam do motor local. As perguntas pedagógicas descrevem um metodo de analise, nao uma garantia de que todas as variantes foram verificadas.','muted small');
 }
};
App.doHint=function(){
 var g=App.G;if(!g||g.over!=null||g.busy!=null||g.fbPending||g.pos.turn!==g.human)return;
 g._feedFocus='hint';
 if(g.rated){g.rated=false;g.unrated='Dica utilizada: esta partida nao vale pontos.';App.saveCurrent();}
 if(g.hint){
  if(g.hintStage<3)g.hintStage++;
  if(g.hintStage===3){
   var fen=Engine.toFEN(g.pos);
   if(g._elitePVFen!==fen){
    g._elitePVFen=fen;g._elitePV=null;g._elitePVLoading=true;
    var after=Engine.posFromFEN(fen),move=Engine.uciToMove(after,g.hint.uci);
    if(move>=0)Engine.makeMove(after,move);
    Think.run({cmd:'eval',fen:Engine.toFEN(after),nodes:70000,ms:1800},function(result){
     if(App.G!==g||Engine.toFEN(g.pos)!==fen)return;
     g._elitePV=result;g._elitePVLoading=false;g._feedFocus='hint';App.drawGame();
    });
   }
  }
  App.drawGame();return;
 }
 g.busy='Preparando uma dica para voce raciocinar…';App.drawGame();
 var fen=Engine.toFEN(g.pos);
 Think.run({cmd:'hint',fen:fen},function(h){
  if(App.G!==g||Engine.toFEN(g.pos)!==fen)return;
  g.busy=null;
  if(!h||!h.uci){UiJs.toast('Analise indisponivel nesta posicao.');App.drawGame();return;}
  g.hint=h;g.hintStage=1;g._elitePV=null;g._elitePVFen=null;g._elitePVLoading=false;
  g._feedFocus='hint';App.drawGame();
 });
};
/* v19: três colunas fixas apenas no desktop. O tabuleiro nunca é movido.
   Conserva UiJs.panelEl e UiJs.actionBar; em telas móveis, o DOM original permanece intacto. */
var EliteDesktopLayout=(function(){
 var api={bp:null,bc:null,panel:null,actions:null,left:null,right:null,help:null,ready:false};
 api.desktop=function(){return typeof window!=="undefined"&&typeof window.matchMedia==="function"&&window.matchMedia("(hover:hover) and (pointer:fine) and (min-width:940px)").matches;};
 function make(tag,cls,text){var el=document.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;}
 api.unmount=function(){
  if(!api.bp)return;
  var bp=api.bp,bc=api.bc,panel=api.panel,actions=api.actions;
  // Restaurar a estrutura exata de UiJs.boardPage para telas pequenas.
  if(actions&&bc)bc.insertBefore(actions,bc.firstChild);
  if(bc)bp.insertBefore(bc,api.left||bp.firstChild);
  if(panel)bp.insertBefore(panel,api.right||null);
  if(api.left)api.left.remove();if(api.right)api.right.remove();
  if(bc){bc.style.transform='';bc.style.width='';var board=bc.querySelector('.board');if(board)board.style.width='';}
  bp.classList.remove('elite-three-column');
  api.bp=api.bc=api.panel=api.actions=api.left=api.right=api.help=null;api.ready=false;
 };
 api.init=function(){
  if(!api.desktop()){if(api.bp)api.unmount();return false;}
  var bc=document.querySelector('.bp > .bcol');
  if(!bc || !bc.querySelector('.board'))return false;
  var bp=bc.parentElement,panel=bp.querySelector(':scope > .panel');
  if(!panel)return false;
  if(api.bp===bp)return true;
  if(api.bp)api.unmount();
  var actions=bc.querySelector('.game-actions');
  if(!actions)return false;
  var left=make('aside','elite-left-column');left.setAttribute('aria-label','Ferramentas, dicas e ameaças');
  var leftTitle=make('div','elite-column-title','Ferramentas e dicas');
  var leftCaption=make('span','elite-column-caption','Pense, investigue e aprenda durante a partida');leftTitle.appendChild(leftCaption);
  var help=make('div','elite-left-help');help.setAttribute('aria-live','polite');
  left.appendChild(leftTitle);left.appendChild(actions);left.appendChild(help);
  var right=make('aside','elite-right-column');right.setAttribute('aria-label','Informações e histórico da partida');
  var rightTitle=make('div','elite-column-title','Análise da partida');
  rightTitle.appendChild(make('span','elite-column-caption','Avaliações recentes e histórico de lances'));
  right.appendChild(rightTitle);
  bp.insertBefore(left,bc);bp.appendChild(right);right.appendChild(panel);
  bp.classList.add('elite-three-column');
  api.bp=bp;api.bc=bc;api.panel=panel;api.actions=actions;api.left=left;api.right=right;api.help=help;api.ready=true;
  api.partition();return true;
 };
 api.partition=function(){
  if(!api.desktop()){if(api.bp)api.unmount();return;}
  if(!api.bp){api.init();return;}
  if(!api.bp.isConnected){api.bp=api.bc=api.panel=api.actions=api.left=api.right=api.help=null;api.ready=false;return;}
  var feed=api.panel.querySelector(':scope > .col');if(!feed)return;
  var left=api.help;left.replaceChildren();
  var candidates=Array.from(feed.children).filter(function(el){return el.dataset&&el.dataset.eliteGroup;});
  var batches=Object.create(null);
  candidates.forEach(function(el){var type=el.dataset.eliteGroup;
   if(!batches[type])batches[type]=[];
   batches[type].push(el);
  });
  var state=typeof App!=='undefined'&&App.G?App.G:null;
  var priority=state&&state._feedOrders||{};
  var typeOrder={learner:-1,hint:0,threat:1,imbalance:2,process:3};
  Object.keys(batches).sort(function(a,b){
   var na=priority[a]||0,nb=priority[b]||0;
   return nb-na || typeOrder[a]-typeOrder[b];
  }).forEach(function(type){
   // Restore the author's pedagogical sequence inside each block.
   batches[type].sort(function(a,b){return (+a.dataset.eliteIndex)-(+b.dataset.eliteIndex);});
   batches[type].forEach(function(el){left.appendChild(el);});
  });
  if(!candidates.length){left.appendChild(make('p','elite-left-empty','Toque em Dica para ver uma sugestão de lance, a ameaça do adversário ou os desequilíbrios da posição. No modo Mentor, toque na peça que o computador moveu para entender o motivo.'));}
  if(!feed.children.length){feed.appendChild(make('p','elite-right-empty','As explicações das jogadas, avaliações do treinador e histórico da partida aparecerão aqui conforme você jogar.'));}
  left.scrollTop=0;
  // Messages and previous snapshots remain preserved by the original feed, on the right.
 };
 api.reflow=function(){if(api.desktop())api.init();else api.unmount();};
 if(typeof window!=='undefined')window.addEventListener('resize',api.reflow,{passive:true});
 return api;
})();
var _eliteOriginalDrawGame=App.drawGame;
App.drawGame=function(){_eliteOriginalDrawGame();EliteDesktopLayout.partition();};
var _eliteOriginalShowGame=App.showGame;
App.showGame=function(){_eliteOriginalShowGame();EliteDesktopLayout.init();};
/* Acesso de diagnostico / verificacao manual sem alterar estado do jogo. */
if(typeof window!=='undefined'){window.RotaCuradoria=EliteBank;window.RotaTreinador=EliteCoach;window.RotaLayoutDesktop=EliteDesktopLayout;}


/* v21 — modo Aprendiz: reflexão após o lance do computador.
   A sequência não interrompe a partida e nunca exibe análise de uma posição antiga. */
var AprendizCoach=null;
if(typeof document!=='undefined'){
AprendizCoach=(function(){
 var api={};
 api.stop=function(g){
  if(!g)return;
  if(g._apprenticeTimers){g._apprenticeTimers.forEach(function(t){clearTimeout(t);});g._apprenticeTimers=[];}
  g.learner=null;
 };
 api.eligible=function(g,session){
  return !!(g&&App.G===g&&g.adaptive&&g.over==null&&g.peek==null&&g.pos.turn===g.human&&g.learner===session&&Engine.toFEN(g.pos)===session.fen);
 };
 api.start=function(g,r){
  api.stop(g);
  if(!g||!r||!r.uci||g.over!=null||g.pos.turn!==g.human)return;
  var note=g.note||{reasons:[],alerts:[]};
  var session={fen:Engine.toFEN(g.pos),move:r.san||r.uci,uci:r.uci,note:note,phase:1,started:Date.now()};
  g.learner=session;g._apprenticeTimers=[];
  g._feedFocus='learner';App.drawGame();
  function progress(p){
   if(!api.eligible(g,session))return;
   session.phase=p;g._feedFocus='learner';App.drawGame();
  }
  g._apprenticeTimers.push(setTimeout(function(){progress(2);},10000));
  g._apprenticeTimers.push(setTimeout(function(){progress(3);},20000));
 };
 api.render=function(g){
  var a=g.learner;if(!a)return;
  var h=UiJs.h('Mentor · '+(a.phase===1?'PENSE':a.phase===2?'INVESTIGUE':'COMPREENDA'));
  if(h)h.classList.add('learner-head');
  var box=UiJs.el('div','learner-prompt',UiJs.cur);box.setAttribute('role','status');
  UiJs.el('div','learner-phase',box,a.phase===1?'Primeiros 10 segundos · reflita':a.phase===2?'10–20 segundos · pista gradual':'Após 20 segundos · análise do lance');
  UiJs.el('h3','',box,'Mentor jogou '+a.move);
  if(a.phase===1){
   UiJs.el('p','learner-advice',box,'Por que o computador escolheu esse lance? Qual ameaça, casa importante ou peça ele tentou influenciar?');
   UiJs.el('p','learner-advice',box,'Antes de mover, encontre duas possíveis respostas e imagine o melhor contrajogo dele. Você pode jogar a qualquer momento.');
  } else if(a.phase===2){
   UiJs.el('p','learner-advice',box,'Olhe para as casas que a peça passou a controlar e para as que ela deixou de proteger. O que mudou na posição?');
   UiJs.el('p','learner-advice',box,'Compare material, segurança dos reis, atividade e ameaças. Qual é a resposta mais exigente que você pode encontrar?');
   UiJs.el('p','learner-detail',box,'Ainda não vamos revelar os motivos identificados: tente formular sua hipótese.');
  } else {
   UiJs.el('p','learner-advice',box,'Agora compare seu raciocínio com os motivos identificados na análise local deste lance:');
   var reasons=Array.isArray(a.note.reasons)?a.note.reasons.filter(Boolean):[];
   var alerts=Array.isArray(a.note.alerts)?a.note.alerts.filter(Boolean):[];
   if(reasons.length){var ul=UiJs.el('ul','',box);reasons.forEach(function(t){UiJs.el('li','',ul,t);});}
   else UiJs.el('p','learner-detail',box,'Não há um motivo tático único identificado. Verifique desenvolvimento, controle do centro, coordenação das peças e segurança do rei.');
   if(alerts.length){UiJs.el('p','learner-advice',box,'Atenção às consequências do lance:');var ul2=UiJs.el('ul','',box);alerts.forEach(function(t){UiJs.el('li','',ul2,t);});}
   UiJs.el('p','learner-detail',box,'Insight: avalie o plano do adversário, formule candidatos e calcule a resposta mais forte antes de decidir. Uma boa resposta não precisa ser a mais agressiva: deve atender à posição.');
  }
  UiJs.el('p','learner-foot',box,'Os tempos não bloqueiam o tabuleiro. Se você jogar antes, a explicação pendente é cancelada e a partida continua normalmente.');
 };
 return api;
})();
/* Limpar apenas a orientação temporizada ao sair da posição. */
var _aprendizOriginalPlayUser=App.playUser;
App.playUser=function(uci){if(App.G&&App.G.learner)AprendizCoach.stop(App.G);return _aprendizOriginalPlayUser(uci);};
var _aprendizOriginalUndo=App.undo;
App.undo=function(){if(App.G&&App.G.learner)AprendizCoach.stop(App.G);return _aprendizOriginalUndo();};
var _aprendizOriginalNewGame=App.newGame;
App.newGame=function(){if(App.G&&App.G.learner)AprendizCoach.stop(App.G);return _aprendizOriginalNewGame();};
var _aprendizOriginalShowGame=App.showGame;
App.showGame=function(){if(App.G&&App.G.adaptive)App.G.oppName='Mentor';return _aprendizOriginalShowGame();};
}
