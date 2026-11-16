# Dashboards e Consultas Specification

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Problem Statement

Com conexão e schema prontos, ainda não há onde montar nem ver um dashboard. Esta feature entrega o esqueleto do produto: dashboards privados, que cada usuário organiza na própria sidebar em grupos, com abas, uma grade em que os widgets são arrastados e redimensionados, um editor de Cypher por widget e a execução das consultas em modo somente leitura, com limites. O resultado aparece em um widget de tabela, o que já permite demonstrar um dashboard real antes dos gráficos e da IA.

## Goals

- [ ] Um Editor cria um dashboard com abas, adiciona widgets, escreve Cypher em um editor e vê o resultado em tabela.
- [ ] Nenhuma consulta altera o banco: Cypher de escrita é recusado antes de chegar ao Neo4j e também pelo modo de leitura da transação.
- [ ] O layout arrastado e redimensionado na grade é salvo e reaparece igual ao reabrir.
- [ ] Cada usuário vê na sidebar só os dashboards que alcança, na ordem e nos grupos que ele mesmo definiu.
- [ ] Um dashboard novo é privado: só o dono e os Admins o abrem.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Gráficos, KPI, lista e mapa | Feature `widgets-graficos` |
| Texto para Cypher e qualquer uso de IA | Features `ia-cypher` e `ia-dashboard` |
| Filtros globais, auto-refresh, cross-filtering, exportação | Feature `interatividade` |
| Construtor visual de queries | Excluído pelo usuário (AD-004) |
| Biblioteca de queries reutilizáveis | Não foi pedida; cada widget guarda o próprio Cypher |
| Importar e exportar dashboard como JSON | Não foi pedido |
| Histórico de versões e desfazer | Não foi pedido |
| Duplicar dashboard, mover widget entre abas, reordenar abas | Não foram pedidos |
| Compartilhar dashboards, equipes | Feature `compartilhamento` (AD-014) |
| Grupos dentro de grupos | Não foram pedidos; os grupos da sidebar têm um nível |
| Transferir a posse de um dashboard | Não foi pedido; o Admin já abre e edita qualquer dashboard |
| Cache de resultados | Não foi pedido |
| Link público e embed | Excluídos pelo usuário (AD-007) |
| Queries de escrita (formulários, ações) | As consultas são somente leitura |
| Visualização de grafo | Excluída pelo usuário (AD-009) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Layout | Grade com arrastar e redimensionar; várias abas por dashboard | AD-011 | y |
| Cypher visível e editável | Todo widget tem um editor de Cypher | AD-004 | y |
| Quem vê os dashboards | O dashboard é do criador e só ele vê, até compartilhar; o Admin abre e edita todos | AD-014, AD-015; usuário: "Privado, com compartilhamento" e "Vê e edita tudo" | y |
| Sidebar | Dashboards soltos e grupos recolhíveis opcionais; cada usuário ordena e agrupa a própria | AD-013; usuário: "Os dois" e "De cada usuário" | y |
| Quem cria dashboards | Admin e Editor; o Visualizador não cria nada | AD-015; usuário: "Editor cria; Visualizador só recebe" | y |
| Onde fica a organização da sidebar | Ordem e grupos no PostgreSQL, por usuário; grupo aberto ou recolhido fica no navegador | A organização acompanha a pessoa em qualquer navegador | y - delegado |
| Quem organiza a sidebar | Todos os papéis, inclusive o Visualizador | "De cada usuário"; organizar não cria dashboard | y - delegado |
| Grupos | Um nível só; nomes repetidos são aceitos; excluir um grupo solta os dashboards, sem apagá-los | O mais simples que atende "Comercial", "Logística", "Pessoal" | y - delegado |
| Ícone do dashboard na sidebar | O mesmo ícone para todos | Escolher ícone por dashboard não foi pedido | y - delegado |
| Dashboard sem acesso | Responde como "Dashboard não encontrado" | Não revela que o dashboard existe | y - delegado |
| Dashboards de usuário desativado | Continuam existindo; o Admin os abre e edita | Desativar não apaga trabalho | y - delegado |
| Somente leitura | Cypher de escrita é bloqueado | Default do orquestrador; um BI não deve alterar o banco | y - delegado |
| Como o bloqueio funciona | Duas barreiras: validação do texto no backend e transação em modo leitura no Neo4j | A validação dá mensagem clara; o modo leitura cobre o que o texto não revela (procedimentos) | y - delegado |
| Limites de execução | 30 s de tempo limite e 5.000 linhas por consulta, alteráveis por variável de ambiente da instalação | Protegem o Neo4j e o navegador; valores por instalação são mais simples que por conexão | y - delegado |
| Conexão do dashboard | Cada dashboard usa uma conexão, escolhida na criação e alterável na edição | Recomendação de Q1 de `conexoes-schema` | y - delegado |
| Edição simultânea | Quem salva por último sobre uma versão desatualizada é recusado e precisa recarregar | Evita perder em silêncio o trabalho de outra pessoa | y - delegado |
| Parâmetro sem valor | Um `$parametro` sem valor definido é enviado como `null` | Os filtros só chegam em `interatividade`; `null` não quebra a consulta | y - delegado |
| Widget criado à mão | O Editor cria um widget escrevendo o Cypher, sem IA | Consequência de AD-004: quem não configurou LLM ainda consegue usar o produto | y - delegado |
| Grade | 12 colunas; widget novo com 4 colunas por 4 linhas; mínimo de 2 por 2 | Convenção de grades de dashboard | y - delegado |
| Tabela | Ordenação por coluna e páginas de 50 linhas | O questionário sugeria tabela com ordenação e paginação | y - delegado |
| Erro para quem só pode ver | Vê uma mensagem genérica; quem pode editar vê a mensagem do Neo4j | Recomendação de Q3 de `fundacao-auth`: quem só vê não enxerga Cypher | y - delegado |
| Tamanho do Cypher | Até 20.000 caracteres | Um limite concreto para a validação de entrada | y - delegado |
| Edição e gravação | Modo "Editar" separado, com "Salvar" e "Descartar" explícitos | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |
| Onde o Admin encontra os dashboards dos outros | Aba "Dashboards" em "Configurações", só para Admin, com todos os dashboards e o dono de cada um | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Criar e abrir dashboards ⭐ MVP

**User Story**: As a Editor, I want criar, abrir e excluir os meus dashboards so that eu tenha as minhas visões, privadas até eu compartilhar.

**Why P1**: O dashboard é o objeto central do produto, e nasce privado (AD-014).

**Acceptance Criteria**:

1. WHEN um usuário logado abre o app THEN o sistema SHALL mostrar na sidebar os dashboards que ele alcança, na ordem e nos grupos que ele definiu [DASH-01]
2. WHEN o usuário não alcança nenhum dashboard THEN o sistema SHALL mostrar "Nenhum dashboard ainda" na página inicial [DASH-02]
3. WHILE a lista de dashboards da sidebar carrega o sistema SHALL mostrar itens de esqueleto no lugar dela [DASH-03]
4. IF a lista de dashboards da sidebar não carrega THEN o sistema SHALL mostrar na sidebar "Não foi possível carregar os dashboards" com o botão "Tentar novamente" [DASH-04]
5. WHEN um Admin ou Editor envia "Novo dashboard" com nome e conexão THEN o sistema SHALL criar o dashboard com esse usuário como dono e uma aba "Aba 1", colocá-lo no fim da sidebar dele e abri-lo em modo de edição [DASH-05]
6. IF o nome do dashboard está vazio ou passa de 80 caracteres THEN o sistema SHALL recusar com a mensagem no campo "Nome" [DASH-06]
7. IF não há nenhuma conexão cadastrada THEN o sistema SHALL mostrar em "Novo dashboard" o aviso "Cadastre uma conexão antes de criar um dashboard" e manter o botão de criar desabilitado [DASH-07]
8. WHEN o usuário clica em um dashboard na sidebar THEN o sistema SHALL mostrá-lo em modo de visualização, na primeira aba, e marcar o item como ativo [DASH-08]
9. The system SHALL mostrar "Novo dashboard" só para Admin e Editor [DASH-09]
10. WHEN o dono ou um Admin usa "Excluir" em um dashboard THEN o sistema SHALL pedir confirmação com "Excluir o dashboard <nome>? Abas e widgets serão apagados. Esta ação não pode ser desfeita." [DASH-10]
11. WHEN a exclusão é confirmada THEN o sistema SHALL apagar o dashboard com suas abas e widgets, retirá-lo de todas as sidebars e mostrar a página inicial [DASH-11]
12. IF um Visualizador chama a criação de dashboard THEN o sistema SHALL responder 403 [DASH-12]
13. IF o dashboard pedido não existe ou o usuário não o alcança THEN o sistema SHALL responder 404 e mostrar "Dashboard não encontrado" com um link para a página inicial [DASH-13]
14. The system SHALL tratar todo dashboard como privado: só o dono e os Admins o alcançam, até um compartilhamento da feature `compartilhamento` [DASH-17]
15. The system SHALL mostrar "Editar" só para quem pode editar o dashboard e "Excluir" só para o dono e para Admins [DASH-18]
16. IF um usuário que alcança o dashboard mas não pode editá-lo chama a alteração ou a exclusão dele THEN o sistema SHALL responder 403 [DASH-19]
17. WHEN um Admin abre a aba "Dashboards" de "Configurações" THEN o sistema SHALL mostrar todos os dashboards da instalação com nome, dono, conexão e data da última alteração, em ordem alfabética de nome [DASH-20]
18. WHEN um Admin clica em um dashboard da aba "Dashboards" THEN o sistema SHALL abri-lo com permissão de edição [DASH-21]

**Independent Test**: Como Editor A, criar um dashboard e vê-lo na sidebar; como Editor B, não vê-lo na sidebar e receber "Dashboard não encontrado" pela URL; como Admin, abri-lo pela aba "Dashboards" de "Configurações".

---

### P1: Organizar a sidebar ⭐ MVP

**User Story**: As a usuário, I want ordenar meus dashboards e separá-los em grupos como "Comercial", "Logística" e "Pessoal" so that a minha sidebar tenha a organização que faz sentido para mim.

**Why P1**: Pedido do usuário (AD-013): cada pessoa é responsável pela organização da própria sidebar.

**Acceptance Criteria**:

1. WHEN o usuário usa "Novo grupo" e informa um nome THEN o sistema SHALL criar um grupo recolhível no fim da sidebar dele [SIDE-01]
2. IF o nome do grupo está vazio ou passa de 40 caracteres THEN o sistema SHALL recusar com a mensagem no campo [SIDE-02]
3. WHEN o usuário arrasta um dashboard para outra posição da sidebar THEN o sistema SHALL mantê-lo na posição em que foi solto [SIDE-03]
4. WHEN o usuário arrasta um dashboard para dentro de um grupo THEN o sistema SHALL mostrá-lo dentro do grupo, na posição em que foi solto [SIDE-04]
5. WHEN o usuário arrasta um dashboard para fora de um grupo THEN o sistema SHALL mostrá-lo como item solto, na posição em que foi solto [SIDE-05]
6. WHEN o usuário arrasta um grupo THEN o sistema SHALL mover o grupo com os dashboards dele para a posição em que foi solto [SIDE-06]
7. WHEN o usuário clica no cabeçalho de um grupo THEN o sistema SHALL recolher ou expandir o grupo [SIDE-07]
8. WHEN o usuário renomeia um grupo com um nome de 1 a 40 caracteres THEN o sistema SHALL mostrar o novo nome [SIDE-08]
9. WHEN o usuário usa "Excluir grupo" THEN o sistema SHALL remover o grupo e deixar os dashboards dele como itens soltos na posição do grupo, sem apagar nenhum dashboard [SIDE-09]
10. The system SHALL guardar a ordem e os grupos por usuário, sem alterar a sidebar de nenhum outro usuário [SIDE-10]
11. WHEN o usuário abre o app em outro navegador THEN o sistema SHALL mostrar a sidebar com a mesma ordem e os mesmos grupos [SIDE-11]
12. IF a gravação de uma mudança na sidebar falha THEN o sistema SHALL devolver o item à posição anterior e mostrar "Não foi possível salvar a organização" [SIDE-12]
13. The system SHALL permitir a organização da própria sidebar a Admin, Editor e Visualizador [SIDE-13]
14. WHEN um grupo não tem dashboards THEN o sistema SHALL mostrar "Grupo vazio" dentro dele [SIDE-14]
15. WHEN o nome de um dashboard ou de um grupo não cabe na largura da sidebar THEN o sistema SHALL cortá-lo com reticências e mostrar o nome inteiro ao passar o cursor [SIDE-15]
16. WHILE os itens passam da altura da sidebar o sistema SHALL rolar a lista de dashboards e grupos [SIDE-16]

**Independent Test**: Criar os grupos "Comercial" e "Pessoal", arrastar dois dashboards para dentro deles, reordenar, recolher um grupo; entrar em outro navegador e ver a mesma organização; entrar como outro usuário e ver a sidebar dele intacta.

---

### P1: Editar e salvar ⭐ MVP

**User Story**: As a Editor, I want alterar o dashboard em um modo de edição e só gravar quando eu decidir so that visualizadores não vejam trabalho pela metade.

**Why P1**: Todas as mudanças de layout, widget e aba passam por este fluxo.

**Acceptance Criteria**:

1. WHEN quem pode editar o dashboard usa "Editar" THEN o sistema SHALL entrar em modo de edição e mostrar "Salvar" e "Descartar" [EDIT-01]
2. WHEN o usuário usa "Salvar" THEN o sistema SHALL gravar de uma vez nome, conexão, abas, widgets e layout, e voltar ao modo de visualização [EDIT-02]
3. IF a gravação falha THEN o sistema SHALL manter o modo de edição com as alterações e mostrar "Não foi possível salvar. Tente novamente." [EDIT-03]
4. IF o dashboard foi salvo por outra pessoa depois que este usuário entrou em edição THEN o sistema SHALL recusar a gravação com "Este dashboard foi alterado por outra pessoa. Recarregue para continuar." [EDIT-04]
5. WHEN o usuário usa "Descartar" com alterações pendentes THEN o sistema SHALL pedir confirmação com "Descartar as alterações?" [EDIT-05]
6. WHEN o descarte é confirmado THEN o sistema SHALL voltar ao modo de visualização com o último estado salvo [EDIT-06]
7. WHEN o usuário tenta sair da página com alterações pendentes THEN o sistema SHALL pedir confirmação antes de sair [EDIT-07]
8. WHEN o usuário altera o nome ou a conexão do dashboard em modo de edição THEN o sistema SHALL aplicar a mudança ao rascunho [EDIT-08]
9. WHILE a gravação está em andamento o sistema SHALL manter "Salvar" desabilitado [EDIT-09]

**Independent Test**: Entrar em edição, mover um widget, usar "Descartar" e ver o layout antigo; repetir com "Salvar" e ver o layout novo após recarregar.

---

### P1: Abas ⭐ MVP

**User Story**: As a Editor, I want dividir o dashboard em abas so that cada assunto tenha a sua página.

**Why P1**: Várias abas por dashboard é decisão do usuário (AD-011).

**Acceptance Criteria**:

1. WHEN o usuário clica em uma aba THEN o sistema SHALL mostrar os widgets dela e marcá-la como ativa [TAB-01]
2. WHEN uma aba é mostrada pela primeira vez THEN o sistema SHALL executar as consultas dos widgets dela [TAB-02]
3. WHEN o usuário usa "Nova aba" em modo de edição THEN o sistema SHALL adicionar uma aba vazia chamada "Aba N", em que N é o número de abas, e ativá-la [TAB-03]
4. WHEN o usuário renomeia uma aba em modo de edição com um nome de 1 a 40 caracteres THEN o sistema SHALL mostrar o novo nome [TAB-04]
5. WHEN o usuário usa "Excluir aba" em uma aba com widgets THEN o sistema SHALL pedir confirmação com "Excluir a aba <nome> e seus N widgets?" [TAB-05]
6. WHILE o dashboard tem uma única aba o sistema SHALL manter "Excluir aba" desabilitado [TAB-06]
7. WHEN uma aba não tem widgets THEN o sistema SHALL mostrar "Esta aba está vazia" [TAB-07]
8. WHILE as abas não cabem na largura o sistema SHALL rolar a barra de abas na horizontal, sem quebrar em duas linhas [TAB-08]

**Independent Test**: Criar duas abas, renomear uma, pôr um widget em cada, salvar e alternar entre elas.

---

### P1: Grade de widgets ⭐ MVP

**User Story**: As a Editor, I want arrastar e redimensionar os widgets em uma grade so that eu ajuste o layout sem escrever configuração.

**Why P1**: É a forma de ajustar layout que o usuário escolheu (AD-011).

**Acceptance Criteria**:

1. The system SHALL dispor os widgets de cada aba em uma grade de 12 colunas [GRID-01]
2. WHEN o usuário arrasta um widget em modo de edição THEN o sistema SHALL posicioná-lo na célula onde foi solto e deslocar os demais para que nenhum se sobreponha [GRID-02]
3. WHEN o usuário arrasta a alça de um widget em modo de edição THEN o sistema SHALL redimensioná-lo em unidades da grade, entre 2 colunas por 2 linhas e 12 colunas de largura [GRID-03]
4. WHILE o dashboard está em modo de visualização o sistema SHALL não permitir arrastar nem redimensionar widgets [GRID-04]
5. WHEN o usuário usa "Novo widget" em modo de edição THEN o sistema SHALL adicionar ao fim da aba ativa um widget de 4 colunas por 4 linhas chamado "Novo widget" e abrir o editor dele [GRID-05]
6. WHEN o dashboard é salvo THEN o sistema SHALL gravar a posição e o tamanho de cada widget por aba [GRID-06]
7. The system SHALL desenhar cada widget como um card do tema de `fundacao-auth`, com o título no topo [GRID-07]

**Independent Test**: Arrastar e redimensionar três widgets, salvar, recarregar e ver o mesmo layout, sem conseguir arrastar fora do modo de edição.

---

### P1: Editor de Cypher do widget ⭐ MVP

**User Story**: As a Editor, I want escrever e testar o Cypher de um widget em um editor so that eu veja e controle a consulta por trás de cada widget.

**Why P1**: O Cypher visível e editável é decisão do usuário (AD-004).

**Acceptance Criteria**:

1. WHEN o usuário usa "Editar widget" em modo de edição THEN o sistema SHALL abrir o editor do widget com o campo "Título", o editor de Cypher com realce de sintaxe, o botão "Executar" e a prévia do resultado [WDG-01]
2. WHEN o usuário usa "Executar" THEN o sistema SHALL executar o Cypher do editor na conexão do dashboard e mostrar o resultado na prévia, em tabela [WDG-02]
3. IF a execução falha THEN o sistema SHALL mostrar na prévia a mensagem de erro e manter o Cypher no editor [WDG-03]
4. IF o editor de Cypher está vazio THEN o sistema SHALL manter "Executar" desabilitado [WDG-04]
5. WHEN o usuário usa "Aplicar" THEN o sistema SHALL fechar o editor e atualizar o widget no rascunho com o título e o Cypher informados [WDG-05]
6. WHEN o usuário usa "Cancelar" THEN o sistema SHALL fechar o editor sem alterar o widget [WDG-06]
7. IF o título está vazio ou passa de 80 caracteres THEN o sistema SHALL recusar "Aplicar" com a mensagem no campo "Título" [WDG-07]
8. WHEN o usuário usa "Remover widget" em modo de edição THEN o sistema SHALL pedir confirmação com "Remover o widget <título>?" [WDG-08]
9. WHEN a remoção é confirmada THEN o sistema SHALL retirar o widget do rascunho [WDG-09]
10. WHILE uma execução pedida por "Executar" está em andamento o sistema SHALL mostrar "Executando..." e manter "Executar" desabilitado [WDG-10]

**Independent Test**: Abrir o editor, escrever `MATCH (n) RETURN labels(n) AS label, count(*) AS total`, executar, ver a prévia, aplicar e ver o widget atualizado.

---

### P1: Execução somente leitura ⭐ MVP

**User Story**: As a Admin, I want que nenhuma consulta do NinBI escreva no banco e que nenhuma consulta rode sem limite so that o Neo4j de produção fique seguro.

**Why P1**: É a parte mais crítica da segurança e tem teste unitário obrigatório (AD-012).

**Acceptance Criteria**:

1. The system SHALL executar toda consulta em uma transação de modo leitura no Neo4j [QRY-01]
2. IF o Cypher contém, fora de strings, comentários e identificadores entre crases, uma das cláusulas `CREATE`, `MERGE`, `DELETE`, `SET`, `REMOVE`, `DROP`, `ALTER`, `RENAME`, `GRANT`, `DENY`, `REVOKE`, `LOAD CSV`, `FOREACH` ou `IN TRANSACTIONS` THEN o sistema SHALL recusar a consulta no backend, sem enviá-la ao Neo4j, com "Somente consultas de leitura são permitidas. Cláusula bloqueada: <cláusula>" [QRY-02]
3. The system SHALL reconhecer as cláusulas bloqueadas sem diferenciar maiúsculas de minúsculas [QRY-03]
4. WHEN uma palavra bloqueada aparece só dentro de uma string, de um comentário ou de um identificador entre crases THEN o sistema SHALL aceitar a consulta [QRY-04]
5. IF o texto contém mais de uma instrução separada por `;` THEN o sistema SHALL recusar com "Envie uma consulta por vez" [QRY-05]
6. IF o Neo4j recusa a consulta por tentativa de escrita em transação de leitura THEN o sistema SHALL mostrar "Somente consultas de leitura são permitidas" [QRY-06]
7. IF a consulta passa de 30 s THEN o sistema SHALL cancelá-la no Neo4j e mostrar "A consulta excedeu o tempo limite de 30 s" [QRY-07]
8. IF o resultado passa de 5.000 linhas THEN o sistema SHALL devolver as primeiras 5.000 e mostrar o aviso "Mostrando as primeiras 5.000 linhas" [QRY-08]
9. IF o Cypher passa de 20.000 caracteres THEN o sistema SHALL recusar com "A consulta passa de 20.000 caracteres" [QRY-09]
10. WHEN o Cypher usa um `$parametro` sem valor definido THEN o sistema SHALL executar a consulta com `null` nesse parâmetro [QRY-10]
11. IF um usuário que não pode editar o dashboard chama a execução de um Cypher enviado como texto THEN o sistema SHALL responder 403 [QRY-11]
12. The system SHALL oferecer a quem só pode ver o dashboard apenas a execução do Cypher salvo de um widget, identificado pelo widget, sem aceitar texto de consulta [QRY-12]
13. IF o Neo4j da conexão está inacessível THEN o sistema SHALL mostrar "Não foi possível conectar ao banco <nome da conexão>" [QRY-13]
14. The system SHALL registrar em log cada execução com usuário, conexão, widget, duração, número de linhas e resultado, sem as linhas retornadas [QRY-14]

**Independent Test**: No editor, `CREATE (n:Teste)` é recusado com a mensagem de cláusula bloqueada e nada é criado; `RETURN "CREATE" AS texto` executa; uma consulta de produto cartesiano grande para em 30 s.

---

### P1: Widget de tabela e estados do widget ⭐ MVP

**User Story**: As a usuário logado, I want ver o resultado de cada widget em uma tabela, e entender quando ele está carregando, vazio ou com erro so that o dashboard seja útil antes dos gráficos.

**Why P1**: É a visualização que torna esta feature demonstrável; a tabela é um dos widgets do MVP (AD-009).

**Acceptance Criteria**:

1. WHEN a consulta de um widget retorna linhas THEN o sistema SHALL mostrar uma tabela com uma coluna por chave do resultado, na ordem do `RETURN` [TBL-01]
2. WHEN o usuário clica no cabeçalho de uma coluna THEN o sistema SHALL ordenar todas as linhas do resultado por ela, alternando entre crescente, decrescente e ordem original [TBL-02]
3. The system SHALL ordenar números por valor, textos pela ordem alfabética do português e valores nulos por último [TBL-03]
4. WHEN o resultado tem mais de 50 linhas THEN o sistema SHALL mostrar 50 linhas por página, com "Página X de Y" e os botões de página anterior e seguinte [TBL-04]
5. WHILE a tabela passa da altura do card o sistema SHALL rolar as linhas dentro do card, com o cabeçalho fixo [TBL-05]
6. WHEN um valor é um nó, um relacionamento, uma lista ou um mapa THEN o sistema SHALL mostrá-lo como texto JSON [TBL-06]
7. WHEN um valor é nulo THEN o sistema SHALL mostrar "—" na célula [TBL-07]
8. The system SHALL mostrar números inteiros com todos os dígitos, sem arredondar valores acima de 2^53 [TBL-08]
9. WHILE a consulta de um widget está em andamento o sistema SHALL mostrar um esqueleto dentro do card [TBL-09]
10. WHEN a consulta de um widget não retorna linhas THEN o sistema SHALL mostrar "A consulta não retornou dados" no card [TBL-10]
11. IF a consulta de um widget falha THEN o sistema SHALL mostrar no card, para quem pode editar o dashboard, a mensagem de erro e o botão "Tentar novamente" [TBL-11]
12. IF a consulta de um widget falha THEN o sistema SHALL mostrar a quem só pode ver o dashboard "Não foi possível carregar este widget" e o botão "Tentar novamente" [TBL-12]
13. IF a consulta de um widget falha THEN o sistema SHALL continuar carregando e mostrando os demais widgets [TBL-13]
14. WHEN um widget não tem Cypher THEN o sistema SHALL mostrar "Widget sem consulta" no card [TBL-14]
15. WHEN o usuário usa "Atualizar" no dashboard THEN o sistema SHALL executar de novo as consultas dos widgets da aba ativa [TBL-15]

**Independent Test**: Um dashboard com três widgets: um com dados (ordenar e paginar), um sem linhas e um com Cypher inválido; os três estados aparecem lado a lado.

---

## Edge Cases

- IF um Admin tenta excluir uma conexão usada por algum dashboard THEN o sistema SHALL recusar com "Esta conexão é usada por N dashboard(s)" [DASH-14]
- IF o dashboard é excluído por outra pessoa enquanto está aberto THEN o sistema SHALL mostrar "Dashboard não encontrado" na próxima ação [DASH-15]
- IF "Novo dashboard" é enviado duas vezes em sequência THEN o sistema SHALL criar um único dashboard, mantendo o botão desabilitado durante o envio [DASH-16]
- WHEN duas colunas do resultado têm o mesmo nome THEN o sistema SHALL mostrar as duas, na ordem retornada [TBL-16]
- WHEN o usuário troca de aba ou sai do dashboard com consultas em andamento THEN o sistema SHALL descartar os resultados que chegarem depois [TBL-17]
- WHEN `CREATE` aparece como parte de um nome maior, como `created_at` THEN o sistema SHALL aceitar a consulta [QRY-15]
- IF a conexão do dashboard é trocada em edição THEN o sistema SHALL executar de novo, na conexão nova, os widgets da aba ativa [EDIT-10]
- IF um usuário que não alcança o dashboard chama a execução de um widget dele THEN o sistema SHALL responder 404 [QRY-16]
- WHEN o usuário arrasta itens da sidebar em duas janelas ao mesmo tempo THEN o sistema SHALL manter a organização da última gravação [SIDE-17]
- IF um Visualizador abre a aba "Dashboards" de "Configurações" ou chama a lista de todos os dashboards THEN o sistema SHALL responder 403 [DASH-22]

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | DASH-06, SIDE-02, SIDE-08, TAB-04, WDG-04, WDG-07, QRY-02 a QRY-05, QRY-08, QRY-09, GRID-03 |
| Failure / partial-failure states | DASH-04, SIDE-12, EDIT-03, WDG-03, TBL-11 a TBL-13, QRY-07, QRY-13 |
| Idempotency / retry / duplicate handling | DASH-16, EDIT-09, TBL-11 (tentar de novo é seguro: toda consulta é leitura) |
| Auth boundaries & rate limits | DASH-09, DASH-12, DASH-13, DASH-17 a DASH-22, QRY-11, QRY-12, QRY-16, SIDE-10, SIDE-13. Rate limit N/A because só usuários logados de uma instalação self-hosted executam consultas, e QRY-07 e QRY-08 limitam o custo de cada uma |
| Concurrency / ordering | EDIT-04, DASH-15, TBL-17, SIDE-17 |
| Data lifecycle / expiry | DASH-11 (apaga abas e widgets e sai de todas as sidebars), DASH-14, SIDE-09 (excluir grupo não apaga dashboard). Resultados não são guardados: sem cache |
| Observability | QRY-14 |
| External-dependency failure | QRY-07, QRY-13, TBL-13 (Neo4j); EDIT-03 (PostgreSQL) |
| State-transition integrity | EDIT-01, EDIT-02, EDIT-06 (visualização ↔ edição), GRID-04, TAB-06 |

---

## Requirement Traceability

<!-- TRACE:START -->

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| DASH-01 | P1: Criar e abrir dashboards | - | Pending |
| DASH-02 | P1: Criar e abrir dashboards | - | Pending |
| DASH-03 | P1: Criar e abrir dashboards | - | Pending |
| DASH-04 | P1: Criar e abrir dashboards | - | Pending |
| DASH-05 | P1: Criar e abrir dashboards | - | Pending |
| DASH-06 | P1: Criar e abrir dashboards | - | Pending |
| DASH-07 | P1: Criar e abrir dashboards | - | Pending |
| DASH-08 | P1: Criar e abrir dashboards | - | Pending |
| DASH-09 | P1: Criar e abrir dashboards | - | Pending |
| DASH-10 | P1: Criar e abrir dashboards | - | Pending |
| DASH-11 | P1: Criar e abrir dashboards | - | Pending |
| DASH-12 | P1: Criar e abrir dashboards | - | Pending |
| DASH-13 | P1: Criar e abrir dashboards | - | Pending |
| DASH-17 | P1: Criar e abrir dashboards | - | Pending |
| DASH-18 | P1: Criar e abrir dashboards | - | Pending |
| DASH-19 | P1: Criar e abrir dashboards | - | Pending |
| DASH-20 | P1: Criar e abrir dashboards | - | Pending |
| DASH-21 | P1: Criar e abrir dashboards | - | Pending |
| SIDE-01 | P1: Organizar a sidebar | - | Pending |
| SIDE-02 | P1: Organizar a sidebar | - | Pending |
| SIDE-03 | P1: Organizar a sidebar | - | Pending |
| SIDE-04 | P1: Organizar a sidebar | - | Pending |
| SIDE-05 | P1: Organizar a sidebar | - | Pending |
| SIDE-06 | P1: Organizar a sidebar | - | Pending |
| SIDE-07 | P1: Organizar a sidebar | - | Pending |
| SIDE-08 | P1: Organizar a sidebar | - | Pending |
| SIDE-09 | P1: Organizar a sidebar | - | Pending |
| SIDE-10 | P1: Organizar a sidebar | - | Pending |
| SIDE-11 | P1: Organizar a sidebar | - | Pending |
| SIDE-12 | P1: Organizar a sidebar | - | Pending |
| SIDE-13 | P1: Organizar a sidebar | - | Pending |
| SIDE-14 | P1: Organizar a sidebar | - | Pending |
| SIDE-15 | P1: Organizar a sidebar | - | Pending |
| SIDE-16 | P1: Organizar a sidebar | - | Pending |
| EDIT-01 | P1: Editar e salvar | - | Pending |
| EDIT-02 | P1: Editar e salvar | - | Pending |
| EDIT-03 | P1: Editar e salvar | - | Pending |
| EDIT-04 | P1: Editar e salvar | - | Pending |
| EDIT-05 | P1: Editar e salvar | - | Pending |
| EDIT-06 | P1: Editar e salvar | - | Pending |
| EDIT-07 | P1: Editar e salvar | - | Pending |
| EDIT-08 | P1: Editar e salvar | - | Pending |
| EDIT-09 | P1: Editar e salvar | - | Pending |
| TAB-01 | P1: Abas | - | Pending |
| TAB-02 | P1: Abas | - | Pending |
| TAB-03 | P1: Abas | - | Pending |
| TAB-04 | P1: Abas | - | Pending |
| TAB-05 | P1: Abas | - | Pending |
| TAB-06 | P1: Abas | - | Pending |
| TAB-07 | P1: Abas | - | Pending |
| TAB-08 | P1: Abas | - | Pending |
| GRID-01 | P1: Grade de widgets | - | Pending |
| GRID-02 | P1: Grade de widgets | - | Pending |
| GRID-03 | P1: Grade de widgets | - | Pending |
| GRID-04 | P1: Grade de widgets | - | Pending |
| GRID-05 | P1: Grade de widgets | - | Pending |
| GRID-06 | P1: Grade de widgets | - | Pending |
| GRID-07 | P1: Grade de widgets | - | Pending |
| WDG-01 | P1: Editor de Cypher do widget | - | Pending |
| WDG-02 | P1: Editor de Cypher do widget | - | Pending |
| WDG-03 | P1: Editor de Cypher do widget | - | Pending |
| WDG-04 | P1: Editor de Cypher do widget | - | Pending |
| WDG-05 | P1: Editor de Cypher do widget | - | Pending |
| WDG-06 | P1: Editor de Cypher do widget | - | Pending |
| WDG-07 | P1: Editor de Cypher do widget | - | Pending |
| WDG-08 | P1: Editor de Cypher do widget | - | Pending |
| WDG-09 | P1: Editor de Cypher do widget | - | Pending |
| WDG-10 | P1: Editor de Cypher do widget | - | Pending |
| QRY-01 | P1: Execução somente leitura | - | Pending |
| QRY-02 | P1: Execução somente leitura | - | Pending |
| QRY-03 | P1: Execução somente leitura | - | Pending |
| QRY-04 | P1: Execução somente leitura | - | Pending |
| QRY-05 | P1: Execução somente leitura | - | Pending |
| QRY-06 | P1: Execução somente leitura | - | Pending |
| QRY-07 | P1: Execução somente leitura | - | Pending |
| QRY-08 | P1: Execução somente leitura | - | Pending |
| QRY-09 | P1: Execução somente leitura | - | Pending |
| QRY-10 | P1: Execução somente leitura | - | Pending |
| QRY-11 | P1: Execução somente leitura | - | Pending |
| QRY-12 | P1: Execução somente leitura | - | Pending |
| QRY-13 | P1: Execução somente leitura | - | Pending |
| QRY-14 | P1: Execução somente leitura | - | Pending |
| TBL-01 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-02 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-03 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-04 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-05 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-06 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-07 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-08 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-09 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-10 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-11 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-12 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-13 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-14 | P1: Widget de tabela e estados do widget | - | Pending |
| TBL-15 | P1: Widget de tabela e estados do widget | - | Pending |
| DASH-14 | Edge Cases | - | Pending |
| DASH-15 | Edge Cases | - | Pending |
| DASH-16 | Edge Cases | - | Pending |
| TBL-16 | Edge Cases | - | Pending |
| TBL-17 | Edge Cases | - | Pending |
| QRY-15 | Edge Cases | - | Pending |
| EDIT-10 | Edge Cases | - | Pending |
| QRY-16 | Edge Cases | - | Pending |
| SIDE-17 | Edge Cases | - | Pending |
| DASH-22 | Edge Cases | - | Pending |

<!-- TRACE:END -->

**Coverage:** 107 total, 0 mapped to tasks, 107 unmapped ⚠️

---

## Sources

- Pedido original do usuário - "gerador de dashboard integrado ao Neo4j, com cypher queries".
- Pedido do usuário - "O usuário poderá separar na sidebar seus dashboards. Por exemplo, ele quer um dashboard do 'Comercial', um da 'Logística', um 'Pessoal'. Ele vai ser responsável pela organização da sidebar e de cada item de dentro do dashboard."
- `.specs/STATE.md` - AD-013 (sidebar por usuário), AD-014 (dashboards privados), AD-015 (papéis), AD-004 (Cypher visível e editável), AD-007 (só logados), AD-009 (tabela é widget do MVP), AD-011 (grade e abas), AD-012 (testes da validação somente leitura).
- Esta feature não tem captura própria. Os cards usam o tema de `fundacao-auth`, e os itens da sidebar usam o estilo de item que a captura de lá desenha; os grupos recolhíveis não estão na captura. A posição das abas, dos botões de edição e do editor do widget é decisão do builder, dentro do design system. A captura da referência volta a valer para a tela do dashboard em `widgets-graficos`.

---

## Success Criteria

- [ ] Um Editor monta um dashboard de duas abas e quatro widgets de tabela em menos de 10 minutos, só com Cypher.
- [ ] Nenhum Cypher de escrita da suíte de testes chega ao Neo4j.
- [ ] Quem não alcança um dashboard não o encontra na sidebar, pela URL nem pela API.
- [ ] Reorganizar a sidebar de um usuário nunca muda a de outro.
