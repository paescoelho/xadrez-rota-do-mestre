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
  (mais de 90 s: 60%; mais de 3 min: 30%); perguntas de abertura com várias respostas aceitas pesam metade. Mostra a faixa provável.
- Elo combinado: partidas reais pesam mais; sem 10 partidas, o número fica limitado a 1000 + 20 por partida jogada.
