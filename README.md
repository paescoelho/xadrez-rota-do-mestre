# Xadrez · Rota do Mestre

Treinador de xadrez em português: jogue contra o Aprendiz, resolva mais de 17 mil problemas reais e acompanhe como você pensa.
Roda no navegador (celular e computador), pode ser instalado como aplicativo e funciona sem internet depois da primeira visita.

## Estrutura do repositório

| Pasta | O que tem |
|---|---|
| `docs/` | **O site pronto** (é o que o GitHub Pages publica). Não precisa compilar nada. |
| `docs/baixar/` | O jogo inteiro em um só arquivo `.html` (completo e leve), para jogar offline sem instalar. |
| `fonte/` | Código-fonte (Haxe + JavaScript), dados, motor e mídia usados para gerar o site e as versões Flash. |

## Publicar no GitHub Pages (uma vez)

1. Envie todo o conteúdo deste pacote para o repositório. O upload pela página do GitHub aceita até 100 arquivos por vez; com o **GitHub Desktop** vai tudo de uma vez.
2. No repositório: **Settings › Pages › Build and deployment**.
3. Em *Source*, escolha **Deploy from a branch**. Em *Branch*, escolha **main** e a pasta **/docs**. Salve.
4. Em 1 ou 2 minutos o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

O arquivo `docs/.nojekyll` já está incluído: ele faz o GitHub publicar os arquivos como estão.

## Como o site funciona

- **Primeira visita:** baixa uns 12 MB (o GitHub entrega os textos compactados, então na prática vem bem menos) e mostra uma barra de progresso.
- **Depois:** um *service worker* guarda tudo no aparelho. O jogo abre na hora e funciona sem internet, inclusive o Stockfish.
- **Atualizações:** cada arquivo de dados tem uma marca de versão. Quando você publica uma versão nova, cada aparelho baixa só o que mudou.
- **Instalar:** em *Painel de evolução › Conta e backup › Instalar o app* (Android e computador). No iPhone, é por *Compartilhar › Adicionar à Tela de Início*.
- **Onde ficam os dados do jogador:**
  - o perfil, no `localStorage`;
  - as partidas sem limite e o registro lance a lance do Raio-X, no `IndexedDB`;
  - tudo também no backup em arquivo e, com login Google, na nuvem.
- **Conexão lenta ou economia de dados:** em 2G/3G, ou com economia de dados ativa, o site pula a abertura em vídeo.

## Ativar o login com Google (opcional)

O jogo nunca vê nem guarda a senha do Gmail: quem autentica é o Google. Vai no jogo só a configuração **pública** do Firebase.

1. Em https://console.firebase.google.com crie um projeto (plano gratuito Spark).
2. Em **Authentication › Sign-in method**, ative **Google**.
3. Em **Authentication › Settings › Authorized domains**, adicione `SEU-USUARIO.github.io`.
4. Em **Firestore Database**, crie o banco e cole as regras de `fonte/firestore.rules`.
5. Em **Configurações do projeto › Seus apps › Web**, copie o `firebaseConfig`.
6. Salve esse objeto como `fonte/web/firebase-config.json` (modelo em `fonte/web/firebase-config.example.json`), compile de novo e substitua a pasta `docs/`.

## Compilar (só para quem for mexer no código)

Requisitos: [Haxe 4.3](https://haxe.org) e [Node.js](https://nodejs.org).

```
cd fonte
haxe build_js.hxml        # gera out/app.js
node web/build.js         # gera out/*.html (arquivo único) e site/ (PWA)
haxe build_celular.hxml   # Flash 390x780 (opcional)
haxe build_switch.hxml    # Flash 1280x720 (opcional)
```

Depois, copie o conteúdo de `fonte/site/` para `docs/`.

## O que há de novo

**v24: Raio-X do pensamento e site instalável**
- **Revisão de fundo:** depois de cada partida, o Stockfish revisa os seus lances em segundo plano. Isso só acontece quando não há partida em andamento.
- **Registro por lance:** guarda a perda de chance de vitória, a agudeza da posição (chance de resultado decisivo segundo o modelo vitória/empate/derrota do Stockfish), o tempo gasto, as peças tocadas e a fase.
- **Computador:** o mouse parado por meio segundo sobre uma peça sua conta como "olhar", e o perfil registra se foi toque ou mouse.
- **Raio-X** (Painel de evolução, Mapa do pensamento e fim de partida):
  - calma sob fogo e pressa em posições abertas;
  - estilo (você complica ou simplifica) e sorte (gafes não punidas);
  - calibração da certeza;
  - domínio por tema;
  - tilt com teste de embaralhamento (1.000 sorteios).
- **Aposta de certeza nos problemas** (50%, 70% ou 90%): mostra se a sua certeza bate com os acertos (nota de Brier).
- **Domínio por tema:** rastreamento bayesiano de conhecimento. O chute e o escorregão dependem da dificuldade do problema em relação ao seu rating; o tema conta como dominado acima de 95%. Aparece também em *Táticas › Trilhas por tema*.
- **Pergunte ao seu histórico:** erros, precisão, tempo ou sorte, separados por agudeza, fase, tempo gasto, peça, cor, "depois de um erro", relógio ou tipo de entrada.
- **Treino sugerido:** o ponto mais fraco vira um botão no Centro de Treino e no topo do Mapa do pensamento.
- **Pausa recomendada:** aparece depois de duas derrotas seguidas com queda de precisão.
- **Site PWA:** carregador com barra de progresso, cache offline, atualização só do que mudou e instalação.

**v23:** veja `fonte/LEIA-ME-v23.md`.
- Stockfish 19 no jogo e lances brilhantes.
- Banco de 17.618 problemas em 60 temas.
- Woodpecker por tema, revisão espaçada FSRS e trilha de padrões de mate.
- Treino de visão, relógio de estudo e conta/backup.

## Licença

Este projeto inclui o **Stockfish 19** (stockfish.js), que é **GPLv3**. Por isso o jogo é distribuído sob a GPLv3 (arquivo `LICENSE`).

Créditos de terceiros:
- **Problemas** (database.lichess.org): domínio público (CC0). A seleção por tema veio do projeto Lichesspecker.
- **FSRS:** algoritmo do projeto open-spaced-repetition (MIT), com implementação própria.
- **Fontes Cinzel:** SIL Open Font License.
- **Firebase JS SDK:** Apache 2.0, carregado do CDN do Google só quando o login está ativado.

Doações por Pix são compatíveis com a GPL.

## Apoiar o projeto (Pix)

O botão **♥ Apoiar o projeto** (botão no menu principal, no lugar de "Jogar com amigo", e tela *Conta e backup*) gera um Pix estático (BR Code do Banco Central) dentro do próprio jogo, com a mensagem "Xadrez GitHub". A chave, o nome e a cidade ficam em `fonte/web/extras_v25.js` (`V25.PIX`). O QR Code usa o *QR Code Generator* de Kazuhiko Arase (licença MIT).

## História do xadrez: 18 jogos para jogar

Na árvore genealógica e nos capítulos da História, cada jogo tem um botão para jogar contra o computador:
chaturanga, shatranj, xadrez medieval, makruk, sittuyin, xiangqi, janggi, shogi, go (9 × 9), liubo, mancala (oware),
pachisi, senet, tafl, tablut, alquerque, fierges e damas brasileiras (no modo mestre), além do xadrez moderno.
Os jogos modernos (Catan, Carcassonne, Scotland Yard, Terra Mystica) aparecem só como história, porque são marcas registradas
com direitos autorais dos seus autores.

## Laboratório do Pensamento (v26 · Fase A)

No menu, o **Laboratório do Pensamento** ocupa o lugar do "Mapa do seu pensamento" (o Mapa e o Raio-X continuam dentro dele).

- **Minhas partidas:** importa partidas terminadas por PGN colado, arquivo `.pgn`, ou pelo nome de usuário no Lichess e no Chess.com
  (últimas 30 partidas públicas). Valida cada lance (inclui roque, promoção, en passant, posição inicial por FEN, variantes entre parênteses,
  comentários com relógio `[%clk]`, notação longa e letras em português), recusa partidas inválidas com o motivo, ignora partidas sem resultado
  e não duplica partidas. Se a busca online for bloqueada pelo site, o jogo mostra o link para baixar o PGN e importar o arquivo.
- **Análise em segundo plano** com o Stockfish (só os seus lances), sem travar a tela; pausa enquanto o tabuleiro da partida está aberto.
- **Posições críticas:** até 3 por partida, onde a chance de vitória caiu 12 pontos ou mais. Cada uma recebe uma competência provável
  (peças sem defesa, ameaças do adversário, golpes táticos, mates, finais, conversão de vantagem, abertura, decisões posicionais),
  apresentada como hipótese automática, separada dos fatos medidos.
- **Reconstrua seu Pensamento:** Observe → Investigue (candidatos) → Decida (com justificativa opcional) → Compreenda (sua escolha,
  o lance da partida, o melhor lance verificado, a resposta crítica do adversário e a lição) → Comprove numa posição nova do mesmo tema.
  Só a posição nova conta como evidência de aprendizado.
- **Primeiras observações:** contagem por competência com o nível de confiança (menos de 5, 5, 10, 20 e 50 partidas analisadas)
  e a distinção entre erro isolado e padrão que se repete (3 partidas ou mais).
- Os dados ficam no aparelho (IndexedDB, banco `rota-do-mestre` versão 2, gaveta `imp`); a atualização do banco não apaga nada.
  Há botões para exportar as partidas em PGN e para apagar as importadas.

## Abertura em 16:9 no computador

Em tela larga (computador), a abertura usa uma versão 1920 × 1080 feita para o formato (`media/intro_hd16.*`):
as legendas aparecem em tamanho original sobre o preto e as cenas de xadrez ficam no centro com as laterais preenchidas
pelo próprio vídeo desfocado. No celular em pé continua a versão vertical 1080 × 1920. O site baixa só a versão da tela de quem acessa.

## Contagem de acessos e Painel do criador (v27)

- O site conta acessos de forma anônima pelo GoatCounter (sem cookies, sem dados pessoais). Fica desligado até
  `V27.GC` (em `fonte/web/extras_v27.js`) receber o código do site no GoatCounter. No GoatCounter, ligue também
  "Allow adding visitor counts on your website" (é o que permite ao painel ler os totais).
- **Painel do criador:** 5 toques seguidos na "Versão" do rodapé do menu. Mostra visitantes (hoje, 7 dias, 30 dias,
  12 meses, desde o início), histórico por dia (31 dias) e por mês (13 meses), sessões por tipo de aparelho e o que é usado
  no jogo (partidas, treino, laboratório, história, Pix). País, navegador e origem ficam no painel completo do GoatCounter.
- O aparelho em que o painel é aberto deixa de ser contado (botão para voltar a contar). O atalho só esconde o painel:
  como o código é público, os totais não são secretos; os detalhes ficam no painel do GoatCounter, que exige login.

## Avaliação de força mais crítica (v28)

- Problemas usam a escala de dificuldade do Lichess, que fica acima da força em partidas. Toda estimativa vinda de
  problemas é convertida para a escala de partidas: partida ≈ 0,8 × problema − 250 (conservador, não calibrado contra rating oficial).
- Nivelamento: as mesmas 36 posições adaptativas, mas começa mais fácil, o passo de adaptação diminui ao longo do teste e o
  resultado é a estimativa mais provável com todas as respostas (suposição inicial de iniciante). Acerto lento vale menos
  (mais de 90 s: 60%; mais de 3 min: 30%); errar uma posição bem abaixo do nível estimado pesa 2,5 vezes; perguntas de abertura com várias respostas aceitas pesam metade. Mostra a faixa provável.
- Elo combinado: partidas reais pesam mais; sem 10 partidas, o número fica limitado a 1000 + 20 por partida jogada.

## Avaliação ainda mais precisa (v29 · versão 10.11.2026)

- **Precisão nas partidas:** a precisão média dos seus lances (partidas do app analisadas no Raio-X e partidas importadas
  no Laboratório do Pensamento) vira uma estimativa de força por uma tabela conservadora (70% ≈ 750 · 78% ≈ 1050 ·
  84% ≈ 1400 · 89% ≈ 1750). Entra no Elo a partir de 3 partidas e, com 10 ou mais, passa a ser a parte de maior peso.
- **Sorte não conta:** problema de um lance só vale 70% do acerto; o Nivelamento prefere problemas de dois ou mais lances.
- **Revalidação:** nas questões 12, 24 e 33 entra um problema "gêmeo" de um acerto anterior (mesmo tema, ±80 de
  dificuldade). Errar o gêmeo faz o acerto original valer metade.
- **Tempo proporcional:** limite = 30 s + (dificuldade − 600)/10 s. Dentro do limite vale 100%, até o dobro 60%, acima 30%.
- **Inatividade:** depois de 21 dias sem treinar, −2 pontos por dia (máximo 150) e faixa provável mais larga.
  Recupera com 5 partidas ou um novo Nivelamento.
- **Notas por área:** tática, cálculo, finais e abertura. A nota geral do Nivelamento é 70% da estimativa com todas as
  respostas + 30% da pior área com pelo menos 5 questões. Aparecem no resultado do Nivelamento e no Painel.

## Partida mais limpa e tutorial de peças (v30)

- **Tela cheia no celular:** ao começar uma partida no celular, o jogo pede tela cheia ao navegador e volta ao normal ao sair
  da partida. No iPhone o Safari não permite isso numa página; o jogo avisa uma vez como adicionar à Tela de Início.
- **Sem a faixa de cima na partida:** a seta de voltar fica antes do botão Dica e o nome e a força do adversário ficam
  depois do Abandonar. O tabuleiro sobe e sobra mais espaço embaixo.
- **Treinar movimento das peças:** em "Aprenda antes de jogar", um tabuleiro com um exercício por peça (torre, bispo,
  dama, rei, cavalo e peão, com captura e promoção): a peça já vem selecionada e é preciso pegar todas as estrelas.
  O progresso fica salvo.

## Jogar online ao vivo (v31)

- No menu, **Jogar online · Convide um amigo** (ícone do WhatsApp animado) ocupa o lugar de "Meu DNA Enxadrista",
  que agora fica dentro de **Seu maior adversário**.
- Quem convida escolhe ritmo e cor, cria a sala e manda o link pelo WhatsApp (`?sala=CÓDIGO`). O amigo toca e cai
  direto no convite, sem abertura, sem instalar e sem cadastro. Relógio, empate, abandono, revanche com cores
  trocadas, aviso de adversário desconectado e retomada da partida depois de recarregar.
- Os lances passam pelo Firestore (Firebase, plano gratuito) com login anônimo. As regras ficam em
  `firebase/firestore.rules`: só os dois jogadores mexem na sala, e cada lance só vale de quem tem a vez.
- Projeto Firebase: `xadrez-whatsapp` (login anônimo e Google ativos, Firestore em São Paulo, regras publicadas).

### Ligar o jogo ao vivo
1. console.firebase.google.com › criar projeto (sem Google Analytics).
2. Authentication › Começar › Método de login › ativar **Anônimo** (e Google, para o login futuro).
3. Authentication › Configurações › Domínios autorizados › adicionar `paescoelho.github.io`.
4. Firestore Database › Criar banco › modo de produção › região `southamerica-east1`.
5. Firestore › Regras › colar o conteúdo de `firebase/firestore.rules` › Publicar.
6. Configurações do projeto › Seus apps › Web (`</>`) › registrar › copiar o `firebaseConfig` para `V31.FB`.
7. Opcional: Firestore › TTL › política no campo `expira` da coleção `salas` (apaga convites antigos).

## Conta, contas de xadrez e Aula da semana (v32)

- **Conta Google (opcional):** "Salvar progresso com Google" no Painel ou em Conta e backup. Quem jogava anônimo é
  promovido para a conta Google sem perder nada; o perfil vai para `users/{uid}` e as partidas para
  `users/{uid}/games` (mesclagem entre aparelhos herdada da v23). Botões para sair e para apagar os dados da nuvem.
- **Contas de xadrez:** usuário no Lichess e no Chess.com, salvos no perfil (e na nuvem). Ao abrir o jogo, no máximo a
  cada 3 horas, as partidas públicas novas são importadas e analisadas em segundo plano. Os ratings públicos são lidos
  uma vez por dia.
- **Entrar com Lichess:** OAuth 2 com PKCE (sem senha e sem segredo). O jogo lê só o nome e os ratings e revoga a
  autorização na hora; nenhuma chave do Lichess fica guardada. O Chess.com não tem login para apps: só o usuário.
- **Aula da semana:** o erro que mais se repete nas partidas de lá (últimas 2 semanas ou últimas 20 analisadas), a
  lição, as suas posições (treino guiado do Laboratório), 8 problemas do mesmo tema e as revisões do dia.
- **Seus erros viram cartões:** cada posição crítica das partidas importadas entra na revisão espaçada (FSRS).
- **Calibração do Elo:** rating de lá convertido para a escala daqui (Lichess ≈ 0,9 × rating − 350; Chess.com ≈
  0,95 × rating − 100). Lichess confirmado tem peso 1,6; não confirmado 0,5; Chess.com 0,6. Conversão aproximada.

## Tabuleiros temáticos (v33 · versão 12.11.2026)

Dez tabuleiros, nesta ordem, cada um com peças, textura, moldura e efeitos próprios:

1. **Turquesa (padrão) · Água:** a casa ondula quando a peça pousa, a captura espirra gotinhas, o xeque pulsa como água,
   o xeque-mate passa uma onda pelo tabuleiro e o lance tem um "plic" de gota bem baixinho.
2. **Pixel Art:** sons 8-bit, peças em quadros e explosão de pixels (como antes).
3. **Pelourinho:** casas nas cores dos casarões; fitinhas do Bonfim voam na captura.
4. **Praia baiana:** areia e mar; uma onda de espuma atravessa o tabuleiro no xeque.
5. **Sertão:** terra rachada; a peça capturada afunda e levanta poeira.
6. **Origami:** papel dobrado; a peça gira como papel e a capturada vira um passarinho que sai voando.
7. **Caderno Bic:** papel quadriculado e caneta azul; último lance circulado e captura com X rabiscado.
8. **Nanquim:** tinta e papel de arroz; mancha de tinta na captura e xeque como carimbo vermelho.
9. **Praça de concreto:** mesa de praça; no xeque-mate um pombo pousa no canto do tabuleiro.
10. **Daltônico:** alto contraste (azul e cinza-claro) e marcações por forma — molduras, cantos e listras —,
    sem depender de cor; animações curtas.

Os temas antigos (Madeira, Nogueira, Verde, Céu, Lavanda, Rubi, Laranja, Diagrama) passam automaticamente para o
Turquesa (Diagrama vai para o Nanquim). Todos os efeitos respeitam a opção "reduzir movimento" do aparelho.

## v34 — menus reorganizados (12.11.2026)
- Menu principal: Jogar · Jogar online · Centro de Treino · Seu maior adversário · Entrar com Google · Apoiar o projeto (lado a lado) + Painel de evolução e História do xadrez (grandes).
- "Continuar" fica dentro do Jogar, no topo da tela Nova partida; o botão Jogar ganha um selo ▶ quando há partida em andamento.
- Centro de Treino em 5 seções numeradas, com rolagem: Comece por aqui (Nivelamento, Como pensar) · Sua rotina (Plano do dia, Trilha) · Treinos por tema · Seus erros e seu pensamento (Analisar erros, Laboratório do Pensamento) · Alto rendimento.
- Novo "Analisar erros": contas Lichess/Chess.com, importação, Aula da semana e Reconstrua seu Pensamento, em sequência.
- Laboratório do Pensamento fica com Primeiras observações, Mapa do seu pensamento e Raio-X.

## v35 — Painel de evolução (12.11.2026)
- A constelação do botão Painel de evolução fica num quadro dentro do botão (moldura dourada), com título "Sua constelação", raios dos 9 eixos e legenda hoje / mês passado.

## v36 — quadro do Painel igual ao pergaminho (12.11.2026)
- O quadro da constelação tem a mesma altura e largura do pergaminho do botão História do xadrez.
- Sem o título: dentro do quadro ficam o ponto forte (verde, à esquerda), o que treinar (laranja, à direita), cada um com barrinha, e a legenda hoje / mês passado nos cantos de baixo.

## v37 — tela Conta Google enxuta (12.11.2026)
- Tela "Conta Google" em cartões: Google · Lichess e Chess.com (campos na própria tela) · Backup (Baixar / Restaurar…) · Instalar · "Mais opções" recolhido.
- Saiu o código de transferência (Flash/Switch) e a seção "Apoiar o projeto" repetida.
- O voltar respeita a origem: volta ao menu principal ou ao Painel de evolução, de onde a tela foi aberta.

## v38 (12.11.2026)
- Conta Google: "Conectado · sincronizado" em verde, com ponto pulsando; cartão e ícone com contorno verde.

## v39 (12.11.2026)
- Botão História do xadrez: ao tocar, os bastões abrem junto com o pergaminho (antes o papel esticava e passava por cima deles).

## v40 (12.11.2026)
- Centro de Treino: o botão "Analisar erros" virou "Analisar jogadas do Lichess e Chess", com a explicação "Conecte suas contas: o jogo importa as partidas e monta aulas sobre os seus erros".

## v41 (12.11.2026)
- Centro de Treino: "Analisar jogadas do Lichess e Chess" vai para o topo, como banner verde com animação (peças saindo do Lichess e do Chess.com, passando pela lupa: o erro vira acerto).
- "Estudo sério hoje" foi para a seção 2 · Sua rotina, acima do Plano do dia. A seção 4 virou "Seu pensamento".

## v42 (12.11.2026)
- Botão Jogar online (variação D): radar grande girando com o WhatsApp no centro, dois pontos (você e o amigo) que acendem quando a varredura passa, e selo vermelho AO VIVO no canto superior direito com a bolinha piscando.

## v43 (12.11.2026)
- Nova narração da História do xadrez (45 s).
- Jogar online: saiu o botão "Prefere jogar por mensagens?".

## v44 (12.11.2026)
- Tela Nova partida (Jogar) cabe sem rolar no celular: opções compactas, tabuleiros numa linha só (o nome aparece no título), textos de ajuda em até 2 linhas.
- Botão "Começar nova partida" e, no fim, "Continuar partida" (quando houver partida em andamento).

## v45 (12.11.2026)
- Nova partida: botões de opção mais baixos e tabuleiros maiores (2 fileiras de 5), ainda sem rolagem no celular.

## v46 (12.11.2026)
- "Aprenda antes de jogar" numa tela só no celular: peças em 2 colunas com textos curtos, "Como jogar" num quadro, botões Treinar movimento e Entendi lado a lado na base (o voltar fica na seta).

## v47 (12.11.2026)
- Ícone do botão Entrar com Google: G original numa casa escura quadrada com moldura dourada (sem fundo branco).

## v48 (13.11.2026)
- "Apoiar o projeto" virou "Apoio ou sugestão": numa tela só, sem rolar, com o Pix em cima e a caixa de sugestão embaixo (Ideia, Erro, Elogio, Outro; nome opcional; até 5 por dia).
- Painel do criador › Caixa de sugestões: só a conta Google do criador lê, marca como lida, guarda e apaga. Regra nova no firebase/firestore.rules (coleção sugestoes).

## v49 (13.11.2026)
- Apoio ou sugestão: o Pix cresce para ocupar o espaço livre da tela (QR maior em celulares mais altos), ainda sem rolar.

## v50 (13.11.2026)
- Painel do criador: os 5 toques na versão só abrem o painel quando o jogo está logado na conta Google do criador.

## v51 (13.11.2026)
- Computador: as explicações embaixo do nome dos botões voltam a aparecer em telas largas e baixas (notebooks).

## v52 (13.11.2026)
- Menu: Centro de Treino "Aprenda a pensar como um mestre"; História do xadrez "1.500 anos · 18 jogos ancestrais para jogar".

## v53 (13.11.2026)
- Jogar online: ligação pelo WhatsApp entre os dois jogadores (cada um libera o próprio número; só o adversário vê; apagado no fim), reações 👍 😮 😂 👏 🤝 🔥 no tabuleiro e partida para assistir ao vivo pelo link "?ver=CÓDIGO" (sem login, só ver; os jogadores veem quantos estão assistindo).
- Regras do Firestore: subcoleções privado, plateia e reacoes dentro de cada sala.

## v54 (13.11.2026)
- Tela Jogar online: aviso "Converse por áudio no WhatsApp durante a partida" no topo e, abaixo do botão de criar, um quadro com ligação pelo WhatsApp, partida para assistir, reações e um destaque para professores de xadrez.

## v55 (13.11.2026)
- Tela Jogar online refeita numa tela só, sem rolar: topo "Xadrez ao vivo com um amigo", 4 destaques (Áudio no WhatsApp, Assistir ao vivo, Reações, Ideal para aulas), nome, ritmo e cor compactos, botão grande de criar e código recebido na mesma linha.

## v56 (13.11.2026)
- Jogar online: no fim da tela, botões "Jogar via Lichess.org" (cinza-carvão com cavalo branco) e "Jogar via Chess.com" (verde com peão), marcados "Em desenvolvimento…", ainda sem ação (um toque mostra o aviso).

## v57 (13.11.2026)
- Jogar online: o nome fica salvo (último preenchido), também numa cópia à parte para não se perder; a tela do convite usa e grava o mesmo nome.
- Botões Lichess.org e Chess.com maiores, com brilho que passa, ícone que balança e contorno que acende, alternando entre os dois.

## v58 (13.11.2026)
- Jogar online: linha "ou jogue também em" separando os botões Lichess.org e Chess.com, que agora crescem até ocupar o espaço livre da tela (sem rolar).

## v59 (13.11.2026)
- Jogar online: sem o texto final "Jogo justo…"; os botões Lichess/Chess.com ganham esse espaço.

## v60 (13.11.2026)
- Jogar online: separador "Ou jogue também em" em selo dourado (letras Cinzel, losangos e brilho), com linhas douradas e uma luz que corre por elas.

## v61 (13.11.2026)
- Botão Jogar: "Jogue com Mentor ou contra IA".

## v62 (13.11.2026)
- Botão Jogar do menu sempre com "Jogue com Mentor ou contra IA".
- Nova partida: "Começar nova partida" e "Continuar partida" com a mesma altura fixa (56 px).
