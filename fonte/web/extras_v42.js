/* ROTA DO MESTRE · LENDAS VIVAS v76
 * Retratos caricaturais organizados por oito linguagens visuais e falas ficcionais
 * coerentes com o estilo das 24 lendas. Nada aqui é citação histórica.
 * O painel só aparece nos duelos com g.gKey="leg:<id>", mantendo
 * o motor, os lances, o feedback e os demais modos intactos.
 */
var V42={
 styles:{1:'Pixel art',2:'Cartoon clássico',3:'Charge de jornal',5:'Graphic novel',6:'Minimalista',7:'Aquarela',9:'Anime',10:'Pôster vintage'},
 // A ordem corresponde exatamente aos 24 registros do catálogo LENDAS.
 order:['carlsen','kasparov','fischer','karpov','capablanca','alekhine','lasker','botvinnik','tal','petrosian','spassky','smyslov','steinitz','morphy','kramnik','anand','caruana','nakamura','ding','gukesh','polgar','korchnoi','mequinho','firouzja'],
 // id -> [estilo, epíteto, frase de abertura, pensando, lance, ataque/xeque,
 //        captura, resistência, boa jogada do aluno, erro do aluno, vitória, derrota, empate, final]
 people:{
  carlsen:[2,'O conquistador dos finais','Não tenho pressa. O tabuleiro sempre conta a verdade.','Até a posição mais tranquila merece atenção.','Um pequeno detalhe. Talvez você ainda não tenha notado.','A pressão cresce casa por casa.','Uma troca útil pode mudar todo o final.','Ainda temos muitos lances pela frente.','Boa escolha. Gosto de adversários persistentes.','Você deixou uma casa para trás.','Foi um duelo de paciência.','Você soube aproveitar a sua oportunidade.','Duas vontades fortes. Um equilíbrio justo.','É nos finais que a paciência vale ouro.'],
  kasparov:[5,'A força da iniciativa','Prepare-se: pretendo disputar cada casa.','Procuro o momento de tomar a iniciativa.','Atividade! Minhas peças precisam respirar.','Agora você terá de responder às minhas ameaças.','Abrir linhas é abrir oportunidades.','Uma posição difícil exige energia, não desânimo.','Esse lance me obriga a recalcular.','O tempo da iniciativa é precioso: você me concedeu o seu.','A iniciativa decidiu nosso confronto.','Hoje você sustentou a pressão melhor do que eu.','A luta foi intensa até o último lance.','Mesmo no final, as peças precisam agir.'],
  fischer:[10,'Precisão absoluta','Cada lance precisa ter uma razão. Comecemos.','Procuro a continuação mais clara.','Prefiro precisão a truques.','Um erro de cálculo muda tudo.','O material só vale se as peças colaborarem.','Ainda existem lances objetivos.','Bom. Esse lance tem fundamento.','Uma imprecisão é tudo de que preciso.','A precisão prevaleceu.','Seu cálculo foi superior nesta partida.','Nenhum dos dois concedeu o essencial.','Nos finais, não há lugar para descuido.'],
  karpov:[6,'O mestre da restrição','Não preciso apressar a posição.','Busco a peça que menos espaço tem.','Reduzi suas opções mais uma vez.','Você verá: um ataque pode começar sem sacrifícios.','Trocar também é uma forma de restringir.','Minha posição ainda tem recursos.','Boa profilaxia. Você percebeu a ideia.','Às vezes uma casa perdida vale mais que um peão.','A posição ficou sem espaço para você.','Você encontrou liberdade onde eu via controle.','Foi uma batalha de pequenos detalhes.','Um bom final nasce de muitas decisões discretas.'],
  capablanca:[6,'O gênio da simplicidade','Vamos jogar com clareza: o simples costuma ser belo.','Procuro o caminho mais natural.','Uma peça melhor colocada faz toda a diferença.','O ataque funciona quando tudo está coordenado.','Simplificar não é desistir de vencer.','A posição ainda pede serenidade.','Elegante! Você encontrou o caminho simples.','Complicou o que poderia ser simples.','A técnica falou mais alto.','Você mereceu cada vantagem que construiu.','Um resultado equilibrado, sem desperdícios.','No final, a harmonia das peças decide.'],
  alekhine:[3,'O arquiteto das combinações','À primeira vista tudo está calmo. Só à primeira vista.','Procuro combinações escondidas na posição.','A sequência começa com um detalhe.','Uma ameaça pode preparar outra, ainda maior.','Essa troca abre possibilidades inesperadas.','As combinações também exigem paciência.','Muito bom. Você percebeu a armadilha.','Um cálculo incompleto oferece uma história inteira.','A combinação encontrou seu desfecho.','Você calculou mais longe desta vez.','Nenhuma combinação foi decisiva.','Um final também guarda surpresas táticas.'],
  lasker:[3,'O lutador incansável','A posição é uma coisa; o adversário é outra.','O lance mais incômodo nem sempre é o mais óbvio.','Quero colocar uma decisão difícil diante de você.','Seu rei precisa de respostas práticas.','Essa troca muda o caráter da luta.','Enquanto houver recursos, há jogo.','Você encontrou uma defesa muito boa.','Escolheu o caminho que mais me favorece.','Foi uma luta conquistada lance a lance.','Você manteve a cabeça fria.','Ambos resistimos. Era justo dividir.','O final exige coragem tanto quanto técnica.'],
  botvinnik:[1,'O estrategista científico','Um plano claro começa com uma avaliação correta.','Verifico estrutura, casas e coordenação.','Este lance serve ao plano de longo prazo.','Um ataque precisa ter fundamentos.','A troca melhora minha estrutura.','Revisar o plano é parte do método.','Seu raciocínio é consistente.','A estrutura da posição cobra esse deslize.','A preparação produziu resultados.','Sua estratégia foi superior.','Planos sólidos de ambos os lados.','No final, cada detalhe técnico importa.'],
  tal:[7,'O Mágico de Riga','Se o tabuleiro permitir, faremos magia.','Será que há uma combinação escondida aqui?','Interessante… a posição ficou mais viva!','O rei está convidado para uma aventura.','Uma peça a menos; talvez uma ideia a mais.','Gosto das posições em que tudo parece impossível.','Ora! Você também sabe criar complicações.','Abriu uma porta… e eu adoro portas abertas.','Que bela confusão. Desta vez funcionou!','Você sobreviveu ao meu labirinto. Admirável!','Nem todo incêndio precisa consumir o tabuleiro.','Mesmo com poucas peças, ainda há imaginação.'],
  petrosian:[6,'O guardião da profilaxia','Antes de pensar em vencer, vamos evitar perder.','Procuro a ameaça antes de ela existir.','Sua melhor ideia encontrou uma barreira.','Um ataque impedido já é uma conquista.','Trocar agora reduz seus planos.','Defender bem também é jogar ativamente.','Você neutralizou minha intenção.','Esse avanço deixou uma fraqueza desnecessária.','A prevenção construiu a vitória.','Você viu o perigo com antecedência.','Duas fortalezas bem construídas.','Nos finais, a segurança também ataca.'],
  spassky:[2,'O campeão universal','Vamos descobrir que tipo de partida teremos.','Cada posição pede uma linguagem diferente.','Posso jogar de várias maneiras.','Se houver iniciativa, eu a seguirei.','A troca é boa quando combina com o plano.','Consigo mudar de estratégia.','Bom lance. Você leu a posição corretamente.','Seu plano perdeu o equilíbrio.','Hoje a versatilidade fez diferença.','Você se adaptou melhor do que eu.','Foi um duelo de estilos equilibrados.','No final, precisamos mudar novamente de marcha.'],
  smyslov:[7,'A harmonia das peças','Quando as peças se entendem, o xadrez canta.','Escuto a posição em busca de harmonia.','Agora minhas peças conversam melhor.','A coordenação criou uma ameaça natural.','Uma boa troca deixa tudo mais claro.','Minha posição ainda pode encontrar equilíbrio.','Belo ritmo. Suas peças estão em sintonia.','Uma peça ficou fora da melodia.','A harmonia encontrou seu caminho.','Hoje suas peças cantaram mais alto.','O tabuleiro terminou em equilíbrio.','Os finais são música de câmara.'],
  steinitz:[3,'O pai do xadrez posicional','Nenhum ataque se justifica sem uma vantagem.','Examinarei cada fraqueza antes de avançar.','Uma vantagem pequena começa a tomar forma.','Agora há fundamento para atacar.','A troca conserva a vantagem acumulada.','É preciso defender com método.','Você encontrou uma melhora verdadeira.','Um princípio estratégico foi negligenciado.','A acumulação de vantagens decidiu.','Você demonstrou grande entendimento posicional.','Nenhum dos lados reuniu vantagem suficiente.','No final, princípios claros ainda governam.'],
  morphy:[10,'O prodígio do ataque','Desenvolva suas peças. Eu não pretendo esperar.','Procuro abrir linhas antes do seu roque.','Outra peça entrou na batalha.','O desenvolvimento rápido abre caminho ao ataque!','Com linhas abertas, cada tempo importa.','Ainda posso mobilizar minhas peças.','Muito bem! Você está atento ao desenvolvimento.','Perdeu um tempo. E tempo é precioso.','A atividade das peças decidiu.','Você encontrou um ataque mais rápido.','O desenvolvimento ficou equilibrado.','Mesmo no final, atividade é liberdade.'],
  kramnik:[6,'A muralha estratégica','Uma posição sólida pode ser muito ambiciosa.','Procuro uma estrutura difícil de romper.','Minha posição permanece firme.','Mesmo uma defesa sólida sabe contra-atacar.','Essa simplificação me favorece.','Não há motivo para perder a calma.','Você encontrou a fissura certa.','A estrutura exige mais paciência.','A solidez resistiu até o fim.','Você encontrou uma ruptura precisa.','Duas defesas mereceram respeito.','Sem pressa: os finais pedem exatidão.'],
  anand:[2,'O relâmpago do cálculo','O tabuleiro não espera. Vamos pensar bem e agir.','Calculo várias rotas antes de escolher.','Uma escolha rápida, mas não improvisada.','A posição ficou tática de repente.','Essa troca abre um caminho de cálculo.','Sempre há uma nova variante.','Boa! Você enxergou a ideia depressa.','O ritmo da posição não perdoa.','A precisão apareceu na hora certa.','Você foi mais rápido e mais exato.','Os cálculos se equilibraram.','Mesmo no final, vejo novas possibilidades.'],
  caruana:[2,'O arquiteto da preparação','A primeira vantagem pode nascer na abertura.','Procuro uma nuance da posição.','Esse detalhe faz parte do meu plano.','A preparação encontrou um momento tático.','A troca confirma um cálculo.','Vamos recalcular sem precipitação.','Excelente. Você não caiu na linha óbvia.','Este detalhe não passou despercebido.','O preparo encontrou sua recompensa.','Você trouxe uma ideia mais forte.','Nenhum dos dois surpreendeu o outro.','Ainda há muito cálculo para fazer.'],
  nakamura:[9,'O mestre da velocidade','Vamos nessa. O relógio também joga!','Rápido não significa descuidado.','Tenho outra ideia. Acompanhe o ritmo.','Agora a posição acelerou!','A troca deixa tudo mais tático.','Sem pânico. Ainda há truques.','Boa! Você respondeu na velocidade certa.','Opa, esse lance deixou uma oportunidade.','Desta vez fui mais ágil.','Você encontrou o lance preciso. Respeito!','Ninguém piscou primeiro. Empate.','Um final rápido ainda exige concentração.'],
  ding:[7,'O estrategista sereno','Vamos deixar a posição mostrar suas possibilidades.','Procuro profundidade sem pressa.','Uma decisão discreta pode ser decisiva.','O contra-ataque começa com paciência.','Essa troca revelou outra estrutura.','Ainda vejo caminhos para resistir.','Seu lance foi muito sensível à posição.','Um detalhe importante escapou.','A serenidade ajudou a vencer.','Você soube ser firme sob pressão.','A posição encontrou o equilíbrio.','No final, cada passo precisa de calma.'],
  gukesh:[9,'O campeão da nova geração','Cada posição merece toda a minha concentração.','Vou calcular mais um pouco.','Encontrei uma continuação profunda.','Agora precisamos ter coragem no cálculo.','A troca depende do que vem depois.','Uma posição ruim não encerra a partida.','Ótima visão! Você foi longe na variante.','O cálculo exige verificar a última resposta.','Consegui manter a concentração até o fim.','Hoje você calculou melhor. Parabéns.','Uma luta intensa sem vencedor.','Nos finais, a calma vale tanto quanto a energia.'],
  polgar:[5,'A ousadia do ataque','Não importa quem está à frente: vou jogar para vencer.','Procuro peças ativas e um rei vulnerável.','Minhas peças chegaram antes do convite.','É hora de jogar com coragem!','Uma troca pode ampliar o ataque.','Pressão faz parte da partida.','Muito forte! Você não recuou diante do desafio.','Hesitar diante do ataque custa caro.','A iniciativa valeu o esforço.','Você enfrentou o ataque com precisão.','Um duelo de coragem bem equilibrado.','Finais também exigem atitude.'],
  korchnoi:[10,'O resistente implacável','Não espere facilidades. Gosto de lutar.','Procuro o contra-ataque que você menos espera.','Resistir não significa ficar parado.','Minha defesa encontrou uma resposta ativa!','Essa captura muda o combate.','Ainda não acabou. Nem perto disso.','Você jogou com muita firmeza.','Uma vantagem exige saber defendê-la.','Ganhei porque continuei lutando.','Você mereceu vencer um adversário teimoso.','Nenhum de nós cedeu.','Resistir até o último peão também é arte.'],
  mequinho:[1,'O gênio brasileiro','Vamos jogar um xadrez de primeira.','A preparação revela boas oportunidades.','Gostei da atividade das minhas peças.','Agora a iniciativa pede precisão.','Uma troca bem calculada ajuda o plano.','Ainda há jogo. Vou buscar recursos.','Boa! Você enxergou longe.','Essa casa ficou disponível para mim.','Uma bela partida. Valeu a luta!','Você jogou muito bem. Meus parabéns!','Uma disputa equilibrada, lance a lance.','O final exige atenção redobrada.'],
  firouzja:[9,'A energia da nova geração','Quero uma partida cheia de possibilidades.','Estou procurando uma maneira de complicar.','Vamos aumentar o ritmo!','Agora a posição está incendiando!','Essa troca abriu novas ideias.','O jogo muda rápido. Ainda há chances.','Você respondeu com muita criatividade.','Uma posição aguda não perdoa distrações.','A ousadia funcionou desta vez.','Você administrou melhor as complicações.','Foi divertido disputar cada iniciativa.','Até o último peão pode criar confusão.']
 },
 last:null
};
V42.byGame=function(g){
 if(!g||!g.ghost||typeof g.gKey!=='string'||g.gKey.slice(0,4)!=='leg:')return null;
 var id=g.gKey.slice(4);
 if(!Object.prototype.hasOwnProperty.call(V42.people,id))return null;
 var p=typeof V74!=='undefined'&&V74.get?V74.get(id):null;
 if(!p)return null;
 return {id:id,p:p,words:V42.people[id],index:V42.order.indexOf(id)};
};
V42.choose=function(a,g){
 var l=g.ucis.length,pm=a.words,phase='opening',key='opening',kind='idle';
 var recent=g.sans&&g.sans.length?String(g.sans[g.sans.length-1]):'';
 var caps=Engine.toFEN(g.pos).split(' ')[0].replace(/[^prnbqkPRNBQK]/g,'').length;
 if(caps<=10)phase='endgame';else if(l>=24)phase='middle';
 if(g.over){
  key='over:'+g.over.score+':'+l;
  kind=g.over.score>=1?'sad':g.over.score<=0?'win':'calm';
  return {key:key,kind:kind,txt:pm[g.over.score>=1?11:g.over.score<=0?10:12],label:g.over.score>=1?'Você venceu':g.over.score<=0?'Lenda venceu':'Empate'};
 }
 if(g.peek){return {key:'peek:'+l,kind:'think',txt:'Observe o tabuleiro com calma. A melhor ideia nem sempre é a mais imediata.',label:'Análise da posição'};}
 if(l===0){return {key:'opening',kind:'idle',txt:pm[2],label:'Início do duelo'};}
 if(g.busy&&/movimentando|movendo/i.test(g.busy)){return {key:'move:'+l,kind:'attack',txt:pm[4],label:'Jogando'};}
 if(g.busy&&/pensando|calculando|analisando/i.test(g.busy)){return {key:'thinking:'+l,kind:'think',txt:pm[3],label:'Pensando'};}
 if(g.pos.turn===g.human){
  if(/[\+#]/.test(recent)){kind='attack';key='check:'+l;return {key:key,kind:kind,txt:pm[5],label:'Xeque no tabuleiro'};}
  if(/x/.test(recent)){kind='attack';key='capture:'+l;return {key:key,kind:kind,txt:pm[6],label:'Captura realizada'};}
  kind='confident';key='legend:'+l;
  return {key:key,kind:kind,txt:phase==='endgame'?pm[13]:pm[4],label:phase==='endgame'?'Final de partida':'A lenda jogou'};
 }
 if(g.lastFb&&!g.fbPending&&g.lastRec&&g.lastRec.ply===l-1){
  var grade=g.lastFb.grade;
  if(grade==='blunder'||grade==='mistake'){return {key:'mistake:'+l,kind:'attack',txt:pm[9],label:'Oportunidade percebida'};}
  if(grade==='great'||grade==='best'||grade==='good'){return {key:'good:'+l,kind:'surprise',txt:pm[8],label:'Boa jogada'};}
 }
 if(g.pos.turn!==g.human){return {key:'player:'+l,kind:'think',txt:phase==='endgame'?pm[13]:pm[3],label:'A lenda está avaliando'};}
 return {key:'quiet:'+l,kind:'idle',txt:pm[2],label:'Em jogo'};
};
V42.style=function(){
 if(document.getElementById('v42-style'))return;
 var c=document.createElement('style');c.id='v42-style';
 c.textContent=[
 '.v42-card{position:relative;overflow:hidden;border:1px solid rgba(228,189,109,.42);border-radius:15px;background:radial-gradient(circle at 10% 30%,rgba(213,160,69,.12),transparent 46%),linear-gradient(135deg,#1b212a,#10141b 77%);margin:3px 0 9px;padding:10px;box-shadow:0 8px 26px rgba(0,0,0,.22);color:#efe9de;box-sizing:border-box}',
 '.v42-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--v42-ac,#d6ac55)}',
 '.v42-meta{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:7px}',
 '.v42-meta b{font:700 10px/1.2 system-ui,sans-serif;color:#e5c788;letter-spacing:.065em;text-transform:uppercase}',
 '.v42-meta em{font:normal 10px/1.2 system-ui,sans-serif;color:#aeb6b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
 '.v42-scene{display:flex;align-items:center;gap:10px;min-width:0}',
 '.v42-portrait{width:90px;height:90px;flex:0 0 90px;border-radius:12px;background-image:url("data/lendas-portraits.webp");background-size:400% 600%;background-repeat:no-repeat;background-color:#30313c;border:1px solid rgba(255,221,148,.45);position:relative;isolation:isolate;box-shadow:0 5px 15px rgba(0,0,0,.38);animation:v42breathe 5s ease-in-out infinite;transform-origin:50% 85%}',
 '.v42-portrait:after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;box-shadow:inset 0 0 15px rgba(9,12,18,.23)}',
 '.v42-s1 .v42-portrait{image-rendering:pixelated}.v42-s3 .v42-portrait{filter:sepia(.27) contrast(1.08)}',
 '.v42-s5 .v42-portrait{filter:saturate(1.16) contrast(1.1)}.v42-s6 .v42-portrait{filter:saturate(.88)}',
 '.v42-s7 .v42-portrait{filter:saturate(1.18)}.v42-s9 .v42-portrait{filter:saturate(1.13) contrast(1.07)}',
 '.v42-s10 .v42-portrait{filter:sepia(.16) contrast(1.15)}',
 '.v42-phrase{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
 '.v42-name{font:700 13.5px/1.15 Georgia,serif;color:#f7d98d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
 '.v42-epithet{font:11px/1.15 system-ui,sans-serif;color:#bac2c1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
 '.v42-balloon{position:relative;background:#f3ecde;color:#26222b;padding:9px 11px;border-radius:11px 11px 11px 4px;min-height:44px;font:500 clamp(11px,2.9vw,13px)/1.35 system-ui,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.25);display:flex;align-items:center;animation:v42reveal .24s ease-out}',
 '.v42-balloon:before{content:"";position:absolute;left:-7px;top:50%;border-top:7px solid transparent;border-bottom:7px solid transparent;border-right:8px solid #f3ecde;transform:translateY(-50%)}',
 '.v42-foot{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:7px;font:10px/1.2 system-ui,sans-serif;color:#aaa799}',
 '.v42-foot span{border-radius:8px;padding:4px 6px;border:1px solid rgba(224,185,106,.2);background:rgba(234,195,120,.05)}',
 '.v42-foot strong{font-weight:600;color:#ddc78d}.v42-foot button{font:inherit;color:#c7bfa9;background:transparent;border:0;text-decoration:underline;padding:3px;margin-left:auto;cursor:pointer}',
 '.v42-details{border:1px solid rgba(205,170,112,.16);border-radius:11px;background:rgba(255,255,255,.025);margin:1px 0 9px;padding:5px 9px}',
 '.v42-details summary{cursor:pointer;font:11px/1.2 system-ui,sans-serif;color:#a9b0b5;list-style:auto;padding:4px 0}',
 '.v42-details .v42-more{padding:8px 0 3px}.v42-details .p,.v42-details .h,.v42-details .ul{margin-top:5px}',
 '.v42-fx{position:absolute;right:-4px;top:-9px;font-size:24px;filter:drop-shadow(0 1px 4px #000);pointer-events:none;animation:v42spark 1s ease-out infinite}',
 '.v42-thinking .v42-portrait{animation:v42think 2.7s ease-in-out infinite}.v42-attacking .v42-portrait{animation:v42attack .9s cubic-bezier(.1,.65,.3,1) 1,v42breathe 4s ease-in-out .9s infinite}',
 '.v42-surprised .v42-portrait{animation:v42surprise .65s ease-out 1,v42breathe 5s ease-in-out .65s infinite}',
 '.v42-victory .v42-portrait{animation:v42win .9s ease-out 1,v42breathe 5s ease-in-out .9s infinite}',
 '.v42-pressured .v42-portrait{animation:v42think 3s ease-in-out infinite}',
 '@keyframes v42breathe{0%,100%{transform:translateY(0) rotate(-.6deg)}50%{transform:translateY(-3px) rotate(.7deg)}}',
 '@keyframes v42think{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-3px) rotate(1deg)}}',
 '@keyframes v42attack{0%{transform:scale(.94) translateX(-5px)}32%{transform:scale(1.09) rotate(-3deg)}70%{transform:scale(1.03) rotate(1deg)}100%{transform:scale(1)}}',
 '@keyframes v42surprise{0%{transform:translateY(5px) scale(.95)}42%{transform:translateY(-7px) scale(1.07)}100%{transform:none}}',
 '@keyframes v42win{0%{transform:translateY(0)}45%{transform:translateY(-8px) scale(1.07)}100%{transform:none}}',
 '@keyframes v42spark{0%{transform:translateY(5px) scale(.5);opacity:0}40%{transform:translateY(-4px) scale(1.04);opacity:1}100%{transform:translateY(-12px) scale(.9);opacity:0}}',
 '@keyframes v42reveal{from{opacity:.6;transform:translateY(4px)}to{opacity:1;transform:none}}',
 '@media(max-width:420px){.v42-card{padding:7px;margin:2px 0 5px}.v42-meta{margin-bottom:4px}.v42-scene{gap:8px}.v42-portrait{width:72px;height:72px;flex-basis:72px}.v42-name{font-size:12.5px}.v42-epithet{font-size:10px}.v42-balloon{font-size:11px;padding:7px 8px;min-height:39px}.v42-foot{margin-top:5px;gap:4px;font-size:9px}}',
 '@media(max-height:660px){.v42-portrait{width:68px;height:68px;flex-basis:68px}.v42-foot{display:none}.v42-meta{margin-bottom:3px}.v42-balloon{padding:6px 8px}}',
 '@media(prefers-reduced-motion:reduce){.v42-card *, .v42-card *:before,.v42-card *:after{animation:none!important;transition:none!important}}',
 '.v42-still .v42-portrait,.v42-still .v42-fx,.v42-still .v42-balloon{animation:none!important}'
 ].join('\n');
 document.head.appendChild(c);
};
V42.reduced=function(){try{return localStorage.getItem('rdm-lendas-anim')==='0';}catch(e){return false;}};
V42.toggled=function(){try{localStorage.setItem('rdm-lendas-anim',V42.reduced()?'1':'0');}catch(e){}V42.render();};
V42.render=function(){
 var g=App.G,a=V42.byGame(g),cur=UiJs.cur;
 if(!a||!cur||!UiJs.panelEl||!UiJs.panelEl.contains(cur))return;
 V42.style();
 var state=V42.choose(a,g),idx=a.index,col=idx%4,row=(idx/4)|0,style=a.words[0];
 var tone={attack:'attacking',think:'thinking',surprise:'surprised',win:'victory',sad:'pressured',confident:'confident',calm:'',idle:''}[state.kind]||'';
 var card=UiJs.el('section','v42-card v42-s'+style+' '+(tone?'v42-'+tone:'')+(V42.reduced()?' v42-still':''),null);
 card.setAttribute('aria-label','Lendas Vivas: '+a.p.n);card.style.setProperty('--v42-ac',style===9?'#87a6f2':style===7?'#b8a9e7':style===1?'#72c4b1':'#dab466');
 var meta=UiJs.el('div','v42-meta',card);
 UiJs.el('b','',meta,'✦ Lendas Vivas');UiJs.el('em','',meta,state.label);
 var scene=UiJs.el('div','v42-scene',card);
 var pic=UiJs.el('div','v42-portrait',scene);
 pic.style.backgroundPosition=(col*100/3)+'% '+(row*100/5)+'%';pic.setAttribute('role','img');pic.setAttribute('aria-label','Retrato artístico de '+a.p.n+', estilo '+V42.styles[style]);
 if(state.kind==='attack'||state.kind==='win'||state.kind==='surprise')UiJs.el('span','v42-fx',pic,state.kind==='attack'?'⚡':state.kind==='win'?'✦':'!');
 var tx=UiJs.el('div','v42-phrase',scene);
 UiJs.el('div','v42-name',tx,a.p.c+' '+a.p.n);
 UiJs.el('div','v42-epithet',tx,a.words[1]);
 var bubble=UiJs.el('div','v42-balloon',tx,'“'+state.txt+'”');
 bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
 var foot=UiJs.el('div','v42-foot',card);
 UiJs.el('span','',foot,V42.styles[style]);
 UiJs.el('span','',foot,'♟ Estilo histórico simulado');
 var motion=UiJs.el('button','',foot,V42.reduced()?'Ativar animações':'Pausar animações');motion.type='button';motion.onclick=V42.toggled;
 if(cur.firstChild)cur.insertBefore(card,cur.firstChild);else cur.appendChild(card);
 // Mensagens antigas continuam disponíveis, mas deixam de competir visualmente.
 // Não recolhemos instruções obrigatórias dos passos guiados nem revisão de posições.
 if(g.process&&(g.phase==='threats'||g.phase==='cands')||g.peek)return;
 var messages=[].slice.call(cur.children).filter(function(el){
  return el!==card&&el.matches&&el.matches('div.p,div.h,ul.ul')&&!el.closest('.v42-card')&&!el.closest('.v42-details');
 });
 if(messages.length){
  var details=document.createElement('details');details.className='v42-details';
  var summary=document.createElement('summary');summary.textContent='Ver comentários e análise detalhada ('+messages.length+')';details.appendChild(summary);
  var more=UiJs.el('div','v42-more',details);
  messages.forEach(function(n){more.appendChild(n);});
  if(card.nextSibling)cur.insertBefore(details,card.nextSibling);else cur.appendChild(details);
 }
};
(function(){
 if(typeof App==='undefined'||typeof V74==='undefined')return;
 var draw=App.drawGame;
 App.drawGame=function(){var x=draw.apply(this,arguments);try{V42.render();}catch(e){if(window.console)console.warn('Lendas Vivas',e);}return x;};
 // Se o primeiro frame da partida for redesenhado por outra camada, o cartão acompanha.
 var show=App.showGame;
 App.showGame=function(){var x=show.apply(this,arguments);try{if(!document.querySelector('.v42-card'))V42.render();}catch(e){}return x;};
})();
