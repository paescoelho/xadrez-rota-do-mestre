# Rota do Mestre — v23 (09.11.2026)

## O que entrou nesta versão

| Função | Onde fica | Observação |
|---|---|---|
| Stockfish 19 dentro do jogo | automático (análise da partida, "Adivinhe o lance", revisão ativa, Mapa do pensamento) | Só na versão completa em HTML5. A versão leve e o Flash usam o motor próprio do jogo. |
| Lances brilhantes (!!) na análise | Análise da partida | Sacrifício que o Stockfish confirma como melhor lance. |
| Banco de problemas: 5.060 → 17.618 | todos os modos de tática | 60 temas, incluindo 8 padrões de mate com nome, ideias avançadas e finais por tipo. |
| Trilhas por tema agrupadas | Táticas › Trilhas por tema | 7 grupos: básicos, mate em N, padrões de mate, ideias avançadas, finais, golpes de mestres, fase. |
| Woodpecker por tema e tamanho | Táticas › Woodpecker › Novo conjunto | Misto, mates, golpes, finais ou mestres; 30, 60 ou 100 problemas; meta de tempo por ciclo. |
| Repetição espaçada FSRS | Revisões do dia | Substitui os intervalos fixos 1-3-7-21 por estabilidade/dificuldade por cartão (FSRS-5). Cartões antigos são convertidos sozinhos. |
| Padrões de mate (trilha) | Centro de Treino | 8 padrões, lição curta + 6 problemas; 5 de 6 libera o próximo. |
| Treino de visão | Centro de Treino | Coordenadas (30 s), cor da casa (20 perguntas) e memória de posição (5 níveis). |
| Relógio de estudo sério | Centro de Treino e Painel de evolução | Conta só o tempo ativo em treino; partidas contam à parte. |
| Conta e backup | Painel de evolução › Conta e backup | Backup .json (baixar, mesclar, substituir, desfazer), código de transferência e login Google. |

## Como compilar

```
export PATH=/home/claude/flash/haxe:$PATH
haxe build_js.hxml && node web/build.js      # gera out/xadrez-treinador.html e -leve.html
haxe build_celular.hxml && haxe build_switch.hxml
```

Arquivos novos ou alterados: `web/extras_v23.js` (toda a camada nova), `web/build.js`, `web/template.html` (CSS v23),
`src/Content.hx`, `src/Drills.hx`, `src/Pages.hx`, `src/Study.hx`, `src/Profile.hx` (FSRS), `src/App.hx` (brilhantes), `res/lpuzzles.txt`.

## Ativar o login com Google (Firebase) — 10 minutos

O jogo nunca vê nem guarda a senha do Gmail: quem autentica é o Google. O que vai no jogo é só a configuração pública do Firebase.

1. Em https://console.firebase.google.com crie um projeto (plano gratuito Spark).
2. **Authentication › Sign-in method**: ative **Google**.
3. **Authentication › Settings › Authorized domains**: adicione o domínio do site, por exemplo `seuusuario.github.io`.
4. **Firestore Database**: crie o banco (modo produção) e cole as regras do arquivo `firestore.rules`.
5. **Configurações do projeto › Seus apps › Web (</>)**: registre um app e copie o objeto `firebaseConfig`.
6. Salve esse objeto como `web/firebase-config.json` (veja `web/firebase-config.example.json`) e rode o build de novo.

Depois disso, em **Painel de evolução › Conta e backup** aparece **Entrar com Google**. O login só funciona na versão
publicada no site (GitHub Pages); no arquivo baixado e aberto direto do computador, o jogo mostra o backup em arquivo.

Como os dados ficam na nuvem:
- `users/{uid}`: o perfil (sem as partidas), mesclado com o do aparelho a cada login, sem apagar nada;
- `users/{uid}/games/{data}`: uma partida por documento, sem o limite de 200 do aparelho.

## Licenças de terceiros

- **Stockfish 19** (via stockfish.js, Chess.com/Nathan Rugg): GPLv3. Ao distribuir o HTML completo, o código-fonte do
  jogo precisa estar disponível sob GPLv3 (o repositório público no GitHub atende).
- **Problemas do Lichess** (database.lichess.org): domínio público (CC0). A seleção por tema veio do projeto
  Lichesspecker (stephencz/lichesspecker), montado sobre os mesmos dados CC0.
- **FSRS-5**: algoritmo do projeto open-spaced-repetition (MIT); implementação própria em Haxe.
- **Firebase JS SDK**: carregado do CDN do Google só quando o login está ativado (Apache 2.0).
