package;

/* Conteúdo didático (validado com o Stockfish 19 na preparação): história, trilha, finais, repertórios e estruturas. */
class Content {
  public static var c:Dynamic = null;
  public static function load() {
    if (c != null) return;
    c = haxe.Json.parse(Res.get("content"));
  }
  public static function history():Array<Array<String>> { load(); return c.history; }
  public static function curios():Array<String> {
    load();
    var a:Array<String> = (c.curios : Array<String>).copy();
    for (x in EXTRA_CURIOS) a.push(x);
    return a;
  }
  public static function trail():Array<Dynamic> { load(); return c.trail; }
  public static function endgames():Array<Dynamic> { load(); return c.endgames; }
  public static function endgame(id:String):Dynamic { for (e in endgames()) if (e.id == id) return e; return null; }
  public static function reps():Array<Dynamic> { load(); return c.reps; }
  public static function rep(id:String):Dynamic { for (r in reps()) if (r.id == id) return r; return null; }
  public static function structs():Array<Dynamic> { load(); return c.structs; }
  public static function struct(id:String):Dynamic { for (s in structs()) if (s.id == id) return s; return null; }
  public static function placeX():Array<Dynamic> { load(); return c.placeX; }

  public static var EXTRA_CURIOS = [
    "O mate mais rápido possível acontece no segundo lance: 1.f3 e5 2.g4 Dh4#. É o chamado mate do louco.",
    "Depois de dois lances de cada lado já existem 197.281 partidas diferentes possíveis. O motor deste jogo confere esse número nos testes.",
    "A partida oficial mais longa foi Nikolić x Arsović, em Belgrado (1989): 269 lances e mais de 20 horas de jogo. Terminou empatada.",
    "O Comitê Olímpico Internacional reconhece o xadrez como esporte desde 1999, e a Olimpíada de Xadrez entre países é disputada desde 1927.",
    "Em 2024, o indiano Gukesh Dommaraju tornou-se, aos 18 anos, o mais jovem campeão mundial de xadrez clássico.",
    "A Partida Imortal (Anderssen x Kieseritzky, 1851) e a Partida do Século (Byrne x Fischer, 1956) estão na biblioteca de partidas-modelo deste jogo."
  ];

  /* temas no padrão de nomes do Lichess */
  public static var THEMES:Array<Array<String>> = [
    ["mateIn1", "Mate em 1", "Um lance dá xeque-mate. Procure xeques que tiram todas as casas do rei."],
    ["mateIn2", "Mate em 2", "Dois lances até o mate; o primeiro força a resposta (xeque ou ameaça forte)."],
    ["mateIn3", "Mate em 3", "Sequência forçada de três lances. Calcule as respostas forçadas a cada xeque."],
    ["backRankMate", "Mate no corredor", "O rei preso na primeira fila pelos próprios peões leva mate de torre ou dama."],
    ["smotheredMate", "Mate sufocado", "O cavalo dá mate num rei cercado pelas próprias peças."],
    ["fork", "Garfo", "Uma peça ataca duas ao mesmo tempo; o adversário só salva uma."],
    ["pin", "Cravada", "A peça não pode sair sem expor o rei ou uma peça maior."],
    ["skewer", "Espeto", "Ataque em linha: a peça valiosa da frente sai e a de trás cai."],
    ["discoveredAttack", "Ataque descoberto", "Mover uma peça libera o ataque de outra que estava atrás dela."],
    ["doubleCheck", "Xeque duplo", "Duas peças dão xeque ao mesmo tempo: só o rei pode se mover."],
    ["hangingPiece", "Peça pendurada", "Capture a peça adversária sem defesa suficiente."],
    ["sacrifice", "Sacrifício", "Entregue material para ganhar algo maior: mate ou mais material."],
    ["promotion", "Promoção", "O peão chega à última fila e vira dama (ou outra peça)."],
    ["opening", "Tática na abertura", "Golpes que aparecem nos primeiros lances, quando o rei ainda está no centro."],
    ["middlegame", "Meio-jogo", "Táticas com muitas peças no tabuleiro."],
    ["endgame", "Final", "Táticas com poucas peças: rei ativo, peões passados e promoção."],
    ["oneMove", "Um lance", "A solução tem um único lance seu."],
    ["short", "Curto", "Dois lances seus."],
    ["long", "Longo", "Três lances seus: calcule a linha inteira antes de mover."],
    ["veryLong", "Muito longo", "Quatro ou mais lances seus."],
    ["advantage", "Vantagem", "A solução ganha material ou uma vantagem decisiva (não é mate)."],
    ["mate", "Mate", "A solução termina em xeque-mate."],
    ["mateIn4", "Mate em 4", "Quatro lances até o mate. Ache o primeiro xeque ou ameaça que tira a liberdade do rei."],
    ["mateIn5", "Mate em 5 ou mais", "Combinações longas de mate: calcule xeque por xeque."],
    ["anastasiaMate", "Mate de Anastácia", "Cavalo e torre (ou dama) prendem o rei na coluna da borda, bloqueado pelo próprio peão."],
    ["arabianMate", "Mate árabe", "Torre e cavalo no canto: o cavalo protege a torre e cobre a casa de fuga."],
    ["bodenMate", "Mate de Boden", "Dois bispos em diagonais cruzadas dão mate no rei roqueado na ala da dama."],
    ["doubleBishopMate", "Mate dos dois bispos", "Os dois bispos, lado a lado em diagonais, fecham todas as casas do rei."],
    ["dovetailMate", "Mate da cauda de andorinha", "A dama encosta no rei pela diagonal e as próprias peças dele bloqueiam a fuga."],
    ["hookMate", "Mate do gancho", "Torre, cavalo e peão formam um gancho: a torre dá mate protegida pelo cavalo."],
    ["deflection", "Desvio", "Obrigue uma peça defensora a sair do lugar que ela protegia."],
    ["attraction", "Atração", "Sacrifique para atrair o rei (ou uma peça) para uma casa ruim."],
    ["clearance", "Liberação", "Tire a sua própria peça do caminho para abrir linha ou casa para outra."],
    ["interference", "Interferência", "Coloque uma peça entre a defensora e a casa que ela protege."],
    ["intermezzo", "Lance intermediário", "Antes de recapturar, encaixe um lance mais forte (xeque ou ameaça)."],
    ["xRayAttack", "Raio X", "Uma peça ataca ou defende através de outra que está na mesma linha."],
    ["capturingDefender", "Eliminar o defensor", "Capture a peça que segura a defesa; depois o alvo cai."],
    ["trappedPiece", "Peça presa", "A peça adversária não tem casas de fuga: ataque e ganhe."],
    ["quietMove", "Lance silencioso", "Sem xeque nem captura, mas cria uma ameaça impossível de parar."],
    ["defensiveMove", "Lance defensivo", "O melhor lance evita a perda: defenda com precisão."],
    ["zugzwang", "Zugzwang", "O adversário é obrigado a jogar e qualquer lance piora a posição dele."],
    ["attackingF2F7", "Ataque a f2/f7", "O ponto mais fraco no começo da partida, defendido só pelo rei."],
    ["exposedKing", "Rei exposto", "Rei sem proteção de peões: abra linhas e ataque."],
    ["kingsideAttack", "Ataque na ala do rei", "Ataque ao rei roqueado do lado curto."],
    ["queensideAttack", "Ataque na ala da dama", "Ataque ao rei roqueado do lado longo."],
    ["advancedPawn", "Peão avançado", "Um peão perto da promoção decide a partida."],
    ["underPromotion", "Subpromoção", "Promover a cavalo, torre ou bispo, e não a dama, é o melhor."],
    ["enPassant", "En passant", "A captura especial do peão que avançou duas casas."],
    ["castling", "Roque", "O roque é o lance-chave da solução."],
    ["crushing", "Esmagador", "A solução ganha muito material ou a partida."],
    ["equality", "Igualar", "Você está pior: ache o lance que salva o equilíbrio."],
    ["pawnEndgame", "Final de peões", "Rei ativo, oposição e corrida de peões."],
    ["rookEndgame", "Final de torres", "O final mais comum da prática: torre ativa atrás do peão passado."],
    ["bishopEndgame", "Final de bispos", "Bispos e peões: cor das casas e rei ativo."],
    ["knightEndgame", "Final de cavalos", "Cavalos e peões: como os finais de peões, só que com garfos."],
    ["queenEndgame", "Final de damas", "Damas e peões: xeques perpétuos e peão passado."],
    ["queenRookEndgame", "Final de dama e torre", "Dama e torre contra dama e torre."],
    ["master", "Partidas de mestres", "Golpes tirados de partidas de jogadores titulados."],
    ["masterVsMaster", "Mestre x mestre", "Golpes de partidas entre dois mestres titulados."],
    ["superGM", "Supergrandes mestres", "Golpes de partidas da elite mundial."]
  ];
  /* grupos usados na lista de temas e no Woodpecker */
  public static var MATE_PATTERNS = ["backRankMate", "smotheredMate", "anastasiaMate", "arabianMate", "hookMate", "dovetailMate", "bodenMate", "doubleBishopMate"];
  public static var ADV_MOTIFS = ["deflection", "attraction", "clearance", "interference", "intermezzo", "xRayAttack", "capturingDefender", "trappedPiece", "quietMove", "defensiveMove", "zugzwang", "attackingF2F7", "exposedKing", "kingsideAttack", "queensideAttack", "advancedPawn", "underPromotion", "enPassant", "castling", "crushing", "equality"];
  public static var EG_TYPES = ["pawnEndgame", "rookEndgame", "bishopEndgame", "knightEndgame", "queenEndgame", "queenRookEndgame"];
  public static var MASTER_SETS = ["master", "masterVsMaster", "superGM"];
  public static var MOTIFS = ["mateIn1", "mateIn2", "mateIn3", "backRankMate", "fork", "pin", "skewer", "discoveredAttack", "hangingPiece", "sacrifice", "promotion", "smotheredMate", "doubleCheck"];
  /* qualquer tema com nome próprio (para mostrar "Tema: ..." depois do problema) */
  /* o tema mais específico de um problema (padrão de mate e golpes antes de "mate em N") */
  public static function bestMotif(tags:Array<String>):String {
    for (grp in [MATE_PATTERNS, ADV_MOTIFS, ["fork", "pin", "skewer", "discoveredAttack", "doubleCheck", "sacrifice", "hangingPiece", "promotion"], EG_TYPES]) for (x in tags) if (grp.indexOf(x) >= 0) return x;
    for (x in tags) if (isMotif(x)) return x;
    return null;
  }
  public static function isMotif(k:String):Bool return MOTIFS.indexOf(k) >= 0 || MATE_PATTERNS.indexOf(k) >= 0 || ADV_MOTIFS.indexOf(k) >= 0 || EG_TYPES.indexOf(k) >= 0 || k == "mateIn4" || k == "mateIn5";
  public static var PHASES = ["opening", "middlegame", "endgame", "oneMove", "short", "long", "veryLong", "advantage", "mate"];
  public static function themeName(k:String):String { for (t in THEMES) if (t[0] == k) return t[1]; return k; }
  public static function themeDesc(k:String):String { for (t in THEMES) if (t[0] == k) return t[2]; return ""; }

  public static var SILMAN = [
    ["O que é um desequilíbrio", "Jeremy Silman ensina a planejar comparando as diferenças entre os dois lados: material, peças menores (bispo x cavalo), estrutura de peões, espaço, desenvolvimento, controle de colunas e casas, segurança do rei e iniciativa. O plano certo aumenta as suas vantagens e ataca as fraquezas do outro lado."],
    ["Como usar na partida", "Quando não houver tática (nenhum xeque, captura ou ameaça forte), liste os desequilíbrios, escolha a ala onde você é mais forte e procure a peça que está fazendo menos. Melhore essa peça primeiro."],
    ["Bispo x cavalo", "Bispos gostam de posições abertas e de peões nas duas alas. Cavalos gostam de posições fechadas e de casas fixas (postos avançados) que nenhum peão adversário pode atacar."],
    ["Espaço", "Quem tem mais espaço deve evitar trocas (o adversário fica apertado). Quem tem menos espaço deve trocar peças e buscar rupturas de peões."],
    ["Estrutura", "Peões isolados, dobrados e atrasados são alvos. Colunas semiabertas apontam para eles. Ao mexer um peão, pergunte que casa fica fraca para sempre."]
  ];
  public static var PROCESS = [
    ["1. O que o adversário quer?", "Depois de cada lance dele, pergunte: o que mudou? Que peça ele atacou, que linha abriu, que casa ganhou? Marque as ameaças antes de pensar no seu plano."],
    ["2. Xeques, capturas e ameaças", "Para os dois lados, nessa ordem. É o filtro que evita deixar peças de graça e encontra as táticas."],
    ["3. Liste 2 ou 3 candidatos", "Nunca jogue o primeiro lance que aparecer. Escreva (de cabeça) dois ou três candidatos e compare."],
    ["4. Calcule e confira", "Para cada candidato, imagine a melhor resposta do adversário. Antes de soltar a peça, faça a checagem final: \"este lance deixa algo pendurado?\""],
    ["5. Sem tática? Faça um plano", "Use os desequilíbrios: melhore a pior peça, ataque onde você tem mais espaço, crie ou bloqueie peões passados."]
  ];
}
