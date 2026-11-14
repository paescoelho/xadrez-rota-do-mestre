# Lendas Vivas — especificação e prompt aprimorado
Versão: **76 · 14.11.2026** · Projeto: **Rota do Mestre**

## Prompt de implementação refinado

> Transforme os 24 adversários históricos do modo **Jogar › Lendas** em personagens visuais expressivos, inspirados nos estilos de jogo das pessoas representadas, sem alterar o motor, o cálculo de lances ou os outros modos. Cada personagem deve possuir um retrato caricatural personalizado, uma direção visual adequada à época e à personalidade enxadrística e microanimações contextuais durante a partida — por exemplo, respiração e inclinação ao pensar, movimento enérgico ao atacar, surpresa diante de uma boa jogada e celebração ou reação contida ao final. Coloque o retrato em um cartão elegante abaixo do tabuleiro no celular e integrado ao painel lateral no desktop. Substitua as mensagens de estado repetitivas por balões de fala curtos, contextualizados e escritos em português do Brasil, com tom individual para cada uma das 24 lendas. Preserve todos os dados pedagógicos e os controles originais em uma área recolhível, acessível por teclado e leitores de tela. Mantenha a experiência responsiva, leve, sem elementos intrusivos e com opção para reduzir/desativar animações. As imagens devem ser otimizadas e suportar cache offline. Não invente citações verdadeiras: as falas são dramatizações originais, não declarações históricas. A simulação respeita o repertório e os parâmetros existentes, sem alegar reproduzir a força real de cada pessoa. Implemente com testes de regressão, mantendo a compatibilidade com o GitHub Pages e com o build de código-fonte.

## Mapa de direção artística

| Lenda | Estilo | Direção emocional |
|---|---|---|
| Magnus Carlsen | 2 — Cartoon clássico | Confiança serena |
| Garry Kasparov | 5 — Graphic novel | Pressão dramática |
| Bobby Fischer | 10 — Pôster vintage | Precisão austera |
| Anatoly Karpov | 6 — Minimalista | Controle discreto |
| José Raúl Capablanca | 6 — Minimalista | Elegância |
| Alexander Alekhine | 3 — Charge de jornal | Combinações clássicas |
| Emanuel Lasker | 3 — Charge de jornal | Luta persistente |
| Mikhail Botvinnik | 1 — Pixel art | Método e estratégia |
| Mikhail Tal | 7 — Aquarela | Imaginação e caos |
| Tigran Petrosian | 6 — Minimalista | Profilaxia |
| Boris Spassky | 2 — Cartoon clássico | Versatilidade |
| Vasily Smyslov | 7 — Aquarela | Harmonia |
| Wilhelm Steinitz | 3 — Charge de jornal | Pioneirismo |
| Paul Morphy | 10 — Pôster vintage | Desenvolvimento e ataque |
| Vladimir Kramnik | 6 — Minimalista | Solidez |
| Viswanathan Anand | 2 — Cartoon clássico | Velocidade e cálculo |
| Fabiano Caruana | 2 — Cartoon clássico | Preparação |
| Hikaru Nakamura | 9 — Anime | Ritmo e agilidade |
| Ding Liren | 7 — Aquarela | Serenidade |
| Gukesh Dommaraju | 9 — Anime | Cálculo e concentração |
| Judit Polgár | 5 — Graphic novel | Ousadia |
| Viktor Korchnoi | 10 — Pôster vintage | Resistência |
| Henrique Mecking | 1 — Pixel art | Atividade e preparo |
| Alireza Firouzja | 9 — Anime | Energia e complicações |

## Estados e implementação

- Estados: introdução, pensando, lance da lenda, captura, xeque, boa jogada do usuário, imprecisão, final de partida, vitória, derrota e empate.
- 24 conjuntos de falas próprios definidos em `fonte/web/extras_v42.js`.
- O painel só aparece se `App.G.gKey` começar com `leg:`.
- As análises já existentes são recolhidas no painel **Ver comentários e análise detalhada**; não apagar nem reinterpretar comentários do motor.
- Respeitar `prefers-reduced-motion` e oferecer controle local voluntário para pausar movimentos.
- Os retratos são carregados de `docs/data/lendas-portraits.webp`, atlas 4×6 (24 retratos), com 1 requisição e cache PWA.
- A animação é dinâmica por CSS, acionada pelo estado do jogo; **não** é vídeo ou animação facial sincronizada com fala.
- As falas são **ficcionais** e não substituem avaliação técnica do motor.

## Arquivos

- `fonte/web/extras_v42.js`: lógica, estilos, personalidade, UI.
- `fonte/web/build.js`: inclusão no processo de compilação.
- `docs/data/app.js`: versão compilada usada no GitHub Pages.
- `docs/data/lendas-portraits.webp`: atlas de ilustrações.
- `docs/index.html` e `docs/sw.js`: versão e pré-cache.
