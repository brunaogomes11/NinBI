# dashboards-consultas verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 256725e
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `apps/api/test/sidebar/sidebar.spec.ts` `DASH-01 sidebar devolve os dashboards alcançáveis na ordem e nos grupos gravados` | yes |
| C2 | `apps/web/src/features/sidebar/SidebarDashboards.test.tsx` `DASH-02 sem dashboards a página inicial mostra Nenhum dashboard ainda` | yes |
| C3 | `apps/web/src/features/sidebar/SidebarDashboards.test.tsx` `DASH-03 esqueleto na sidebar enquanto a lista carrega` | yes |
| C4 | `apps/web/src/features/sidebar/SidebarDashboards.test.tsx` `DASH-04 erro na sidebar mostra Não foi possível carregar os dashboards e Tentar novamente recarrega` | yes |
| C5 | `apps/api/test/dashboards/dashboards.spec.ts` `DASH-05 cria o dashboard com o usuário como dono e a aba Aba 1` (+ `sidebar.spec.ts` `DASH-05 dashboard novo entra no fim da sidebar do dono`, `NewDashboardDialog.test.tsx` `DASH-05 Novo dashboard cria o dashboard e abre a URL de edição`) | yes |
| C6 | `packages/contracts/src/dashboards.spec.ts` `DASH-06 nome do dashboard vazio ou com mais de 80 caracteres` (+ `NewDashboardDialog.test.tsx` `DASH-06 nome inválido mostra a mensagem no campo Nome sem enviar`) | yes |
| C7 | `apps/web/src/features/dashboards/NewDashboardDialog.test.tsx` `DASH-07 sem conexões mostra o aviso e mantém Criar desabilitado` | yes |
| C8 | `apps/web/src/features/sidebar/SidebarDashboards.test.tsx` `DASH-08 clicar no dashboard da sidebar marca o item ativo` (+ `DashboardPage.test.tsx` `DASH-08 abrir o dashboard mostra a primeira aba em visualização`) | yes |
| C9 | `apps/web/src/features/sidebar/SidebarDashboards.test.tsx` `DASH-09 Novo dashboard aparece só para Admin e Editor (%s)` | yes |
| C10 | `apps/web/src/features/dashboards/DeleteDashboardDialog.test.tsx` `DASH-10 Excluir pede confirmação com o nome do dashboard` | yes |
| C11 | `apps/api/test/dashboards/dashboard-save.spec.ts` `DASH-11 excluir apaga abas e widgets` (+ `sidebar.spec.ts` `DASH-11 dashboard apagado sai das sidebars`, `DeleteDashboardDialog.test.tsx` `DASH-11 confirmar a exclusão tira o dashboard da sidebar e abre a página inicial`) | yes |
| C12 | `apps/api/test/dashboards/dashboards.spec.ts` `DASH-12 Visualizador recebe 403 ao criar dashboard` | yes |
| C13 | `apps/api/test/dashboards/dashboards.spec.ts` `DASH-13 dashboard inexistente ou fora do alcance responde 404` (+ `DashboardPage.test.tsx` `DASH-13 URL de dashboard inexistente mostra Dashboard não encontrado com link para a página inicial`) | yes |
| C14 | `apps/api/test/dashboards/dashboards.spec.ts` `DASH-17 só o dono e os Admins alcançam um dashboard novo` | yes |
| C15 | `apps/api/test/dashboards/dashboards.spec.ts` `DASH-18 permissões do dashboard dizem quem edita e quem exclui` (+ `DashboardPage.test.tsx` `DASH-18 Editar e Excluir aparecem só para quem pode`) | yes |
| C16 | `apps/api/test/dashboards/dashboard-save.spec.ts` `DASH-19 quem só vê recebe 403 ao alterar ou excluir` (+ `dashboard-access.spec.ts` `DASH-19 compartilhamento view dá só ver e assert edit lança 403`) | yes |
| C17 | `apps/api/test/dashboards/dashboards.spec.ts` `DASH-20 Admin lista todos os dashboards com dono, conexão e última alteração em ordem de nome` (+ `apps/web/src/features/dashboards/DashboardsTab.test.tsx` `DASH-20 aba Dashboards mostra nome, dono, conexão e última alteração`) | yes |
| C18 | `apps/api/test/dashboards/dashboards.spec.ts` `DASH-21 Admin abre dashboard de outro usuário com permissão de edição` (+ `DashboardsTab.test.tsx` `DASH-21 clicar no dashboard da aba Dashboards abre o dashboard com Editar`) | yes |
| C19 | `apps/web/src/features/sidebar/GroupDialogs.test.tsx` `SIDE-01 Novo grupo cria um grupo no fim da sidebar` | yes |
| C20 | `packages/contracts/src/dashboards.spec.ts` `SIDE-02 nome do grupo vazio ou com mais de 40 caracteres` (+ `apps/api/test/sidebar/sidebar.spec.ts` `SIDE-02 grupo com nome inválido responde 400`, `GroupDialogs.test.tsx` `SIDE-02 nome de grupo inválido mostra a mensagem no campo`) | yes |
| C21 | `apps/web/src/features/sidebar/layout.test.ts` `SIDE-03 moveItem põe o item antes do alvo` (+ `SidebarDrag.test.tsx` `SIDE-03 arrastar um dashboard o mantém na posição em que foi solto`) | yes |
| C22 | `apps/web/src/features/sidebar/layout.test.ts` `SIDE-04 moveItem põe o dashboard antes do alvo dentro do grupo e no fim do grupo` (+ `SidebarDrag.test.tsx` `SIDE-04 arrastar um dashboard para dentro de um grupo`) | yes |
| C23 | `apps/web/src/features/sidebar/layout.test.ts` `SIDE-05 moveItem solta o dashboard do grupo antes de um item solto` (+ `SidebarDrag.test.tsx` `SIDE-05 arrastar um dashboard para fora de um grupo`) | yes |
| C24 | `apps/web/src/features/sidebar/layout.test.ts` `SIDE-06 grupo movido para dentro de grupo fica antes do grupo alvo` (+ `SidebarDrag.test.tsx` `SIDE-06 arrastar um grupo move o grupo com os dashboards`) | yes |
| C25 | `apps/web/src/features/sidebar/SidebarDashboards.test.tsx` `SIDE-07 clicar no cabeçalho recolhe e expande o grupo` | yes |
| C26 | `apps/web/src/features/sidebar/GroupDialogs.test.tsx` `SIDE-08 renomear o grupo mostra o novo nome` | yes |
| C27 | `apps/web/src/features/sidebar/layout.test.ts` `SIDE-09 removeGroup solta os dashboards na posição do grupo` (+ `GroupDialogs.test.tsx` `SIDE-09 Excluir grupo solta os dashboards na posição do grupo`) | yes |
| C28 | `apps/api/test/sidebar/sidebar.spec.ts` `SIDE-10 gravar a sidebar de um usuário não muda a de outro` (+ `SIDE-10 dashboard de outro dono enviado no PUT não aparece`) | yes |
| C29 | `apps/api/test/sidebar/sidebar.spec.ts` `SIDE-11 outra sessão do mesmo usuário recebe a mesma sidebar` | yes |
| C30 | `apps/web/src/features/sidebar/SidebarDrag.test.tsx` `SIDE-12 falha ao gravar volta o item e mostra Não foi possível salvar a organização` | yes |
| C31 | `apps/api/test/sidebar/sidebar.spec.ts` `SIDE-13 Admin, Editor e Visualizador gravam a própria sidebar` | yes |
| C32 | `apps/web/src/features/sidebar/SidebarDashboards.test.tsx` `SIDE-14 grupo sem dashboards mostra Grupo vazio` | yes |
| C33 | `apps/web/src/features/sidebar/SidebarDashboards.test.tsx` `SIDE-15 nome longo é cortado com reticências e mostra o nome inteiro no title` (checagem de classe `truncate` e atributo `title`) | yes |
| C34 | `apps/web/src/features/sidebar/SidebarDashboards.test.tsx` `SIDE-16 lista de dashboards e grupos rola na vertical` (checagem de classe `overflow-y-auto`) | yes |
| C35 | `apps/web/src/features/dashboards/DashboardEditMode.test.tsx` `EDIT-01 Editar entra em modo de edição com Salvar e Descartar` | yes |
| C36 | `apps/api/test/dashboards/dashboard-save.spec.ts` `EDIT-02 salvar grava nome, conexão, abas, widgets e layout de uma vez` (+ `DashboardEditMode.test.tsx` `EDIT-02 Salvar envia o rascunho inteiro e volta à visualização`) | yes |
| C37 | `apps/web/src/features/dashboards/DashboardEditMode.test.tsx` `EDIT-03 falha ao salvar mantém a edição e mostra Não foi possível salvar` | yes |
| C38 | `apps/api/test/dashboards/dashboard-save.spec.ts` `EDIT-04 versão desatualizada responde 409` (+ `apps/api/test-int/dashboards.int.spec.ts` `EDIT-04 duas gravações simultâneas da mesma versão dão um 200 e um 409`, `DashboardEditMode.test.tsx` `EDIT-04 409 mostra Este dashboard foi alterado por outra pessoa`) | yes |
| C39 | `apps/web/src/features/dashboards/DashboardEditMode.test.tsx` `EDIT-05 Descartar com alterações pede confirmação` | yes |
| C40 | `apps/web/src/features/dashboards/DashboardEditMode.test.tsx` `EDIT-06 confirmar o descarte volta ao último estado salvo` | yes |
| C41 | `apps/web/src/features/dashboards/DashboardEditMode.test.tsx` `EDIT-07 sair da página com alterações pede confirmação` (cobre navegação interna; `beforeunload` não é testado) | yes |
| C42 | `apps/web/src/features/dashboards/draft.test.ts` `EDIT-08 setName e setConnection alteram o rascunho` (+ `DashboardEditMode.test.tsx` `EDIT-08 alterar nome e conexão muda o rascunho`) | yes |
| C43 | `apps/web/src/features/dashboards/DashboardEditMode.test.tsx` `EDIT-09 Salvar fica desabilitado durante a gravação` | yes |
| C44 | `apps/web/src/features/dashboards/DashboardPage.test.tsx` `TAB-01 clicar numa aba mostra os widgets dela e a marca como ativa` | yes |
| C45 | `apps/web/src/features/dashboards/DashboardPage.test.tsx` `TAB-02 a primeira exibição de uma aba executa as consultas dos widgets dela` | yes |
| C46 | `apps/web/src/features/dashboards/DashboardTabsEdit.test.tsx` `TAB-03 Nova aba adiciona Aba N e a ativa` (+ `draft.test.ts` `TAB-03 addTab nomeia a aba com o número de abas`) | yes |
| C47 | `packages/contracts/src/dashboards.spec.ts` `TAB-04 nome da aba vazio ou com mais de 40 caracteres` (+ `DashboardTabsEdit.test.tsx` `TAB-04 renomear a aba mostra o novo nome`) | yes |
| C48 | `apps/web/src/features/dashboards/DashboardTabsEdit.test.tsx` `TAB-05 Excluir aba com widgets pede confirmação com o nome e o número de widgets` | yes |
| C49 | `apps/web/src/features/dashboards/DashboardTabsEdit.test.tsx` `TAB-06 Excluir aba fica desabilitado com uma aba só` | yes |
| C50 | `apps/web/src/features/dashboards/DashboardPage.test.tsx` `TAB-07 aba sem widgets mostra Esta aba está vazia` | yes |
| C51 | `apps/web/src/features/dashboards/DashboardPage.test.tsx` `TAB-08 barra de abas rola na horizontal sem quebrar linha` (checagem de classes) | yes |
| C52 | `apps/web/src/features/dashboards/DashboardGrid.test.tsx` `GRID-01 grade tem 12 colunas` | yes |
| C53 | `apps/web/src/features/dashboards/DashboardGrid.test.tsx` `GRID-02 arrastar um widget o põe na célula solta sem sobreposição` | yes |
| C54 | `packages/contracts/src/dashboards.spec.ts` `GRID-03 layout do widget fora dos limites da grade é recusado` (+ `DashboardGrid.test.tsx` `GRID-03 redimensionar respeita 2 por 2 no mínimo e 12 colunas no máximo`) | yes |
| C55 | `apps/web/src/features/dashboards/DashboardPage.test.tsx` `GRID-04 em visualização não dá para arrastar nem redimensionar` | yes |
| C56 | `apps/web/src/features/dashboards/DashboardGrid.test.tsx` `GRID-05 Novo widget adiciona um widget 4 por 4 no fim da aba e abre o editor` (+ `draft.test.ts` `GRID-05 addWidget põe o widget 4 por 4 abaixo do último`) | yes |
| C57 | `apps/api/test/dashboards/dashboard-save.spec.ts` `GRID-06 salvar grava posição e tamanho de cada widget por aba` (+ `DashboardGrid.test.tsx` `GRID-06 posição e tamanho arrastados vão no Salvar`) | yes |
| C58 | `apps/web/src/features/widgets/WidgetCard.test.tsx` `GRID-07 widget é um card do tema com o título no topo` (checagem de classes) | yes |
| C59 | `apps/web/src/features/widgets/WidgetEditorDialog.test.tsx` `WDG-01 Editar widget abre Título, editor de Cypher com realce, Executar e prévia` | no - o teste afirma Título, realce e Executar, mas não afirma a prévia; sem `Preview` o teste passa |
| C60 | `apps/api/test/queries/queries.spec.ts` `WDG-02 executa o Cypher enviado na conexão do dashboard` (+ `WidgetEditorDialog.test.tsx` `WDG-02 Executar mostra o resultado em tabela na prévia`) | yes |
| C61 | `apps/web/src/features/widgets/WidgetEditorDialog.test.tsx` `WDG-03 falha na execução mostra o erro na prévia e mantém o Cypher` | yes |
| C62 | `apps/web/src/features/widgets/WidgetEditorDialog.test.tsx` `WDG-04 Executar fica desabilitado com o editor vazio` | yes |
| C63 | `apps/web/src/features/widgets/WidgetEditorDialog.test.tsx` `WDG-05 Aplicar fecha o editor e atualiza título e Cypher do widget` (+ `draft.test.ts` `WDG-05 updateWidget troca título e Cypher`) | yes |
| C64 | `apps/web/src/features/widgets/WidgetEditorDialog.test.tsx` `WDG-06 Cancelar fecha o editor sem alterar o widget` | yes |
| C65 | `packages/contracts/src/dashboards.spec.ts` `WDG-07 título do widget vazio ou com mais de 80 caracteres` (+ `WidgetEditorDialog.test.tsx` `WDG-07 título inválido recusa Aplicar com a mensagem no campo Título`) | yes |
| C66 | `apps/web/src/features/widgets/WidgetRemove.test.tsx` `WDG-08 Remover widget pede confirmação com o título` | yes |
| C67 | `apps/web/src/features/widgets/WidgetRemove.test.tsx` `WDG-09 confirmar a remoção tira o widget do rascunho` | yes |
| C68 | `apps/web/src/features/widgets/WidgetEditorDialog.test.tsx` `WDG-10 durante a execução mostra Executando e Executar fica desabilitado` | yes |
| C69 | `apps/api/test-int/queries.int.spec.ts` `QRY-01 procedimento de escrita é recusado pela transação de leitura e nada é criado` (a recusa é provada pelo 422; a parte "nada é criado" é fraca, ver F7) | yes |
| C70 | `apps/api/test/queries/read-only-cypher.spec.ts` `QRY-02 recusa cada cláusula bloqueada com a mensagem` (+ `apps/api/test/queries/query.service.spec.ts` `QRY-02 Cypher de escrita não chega ao Neo4j`) | yes |
| C71 | `apps/api/test/queries/read-only-cypher.spec.ts` `QRY-03 cláusulas bloqueadas sem diferenciar maiúsculas` | yes |
| C72 | `apps/api/test/queries/read-only-cypher.spec.ts` `QRY-04 palavra bloqueada em string, comentário ou crases é aceita` | yes |
| C73 | `apps/api/test/queries/read-only-cypher.spec.ts` `QRY-05 mais de uma instrução é recusada` | yes |
| C74 | `apps/api/test/queries/query.service.spec.ts` `QRY-06 recusa de escrita do Neo4j mostra Somente consultas de leitura são permitidas` (+ `apps/api/test-int/queries.int.spec.ts` `QRY-06 Neo4j real recusa CALL db.createLabel com a mensagem de leitura`) | yes |
| C75 | `apps/api/test/queries/query.service.spec.ts` `QRY-07 consulta que passa do prazo responde A consulta excedeu o tempo limite de 1 s` (+ `QRY-07 prazo padrão é 30 s`; `apps/api/test-int/queries.int.spec.ts` `QRY-07 produto cartesiano no Neo4j real para no prazo`) | no - nenhum teste prova o cancelamento no Neo4j: o teste de integração passa só pelo prazo do cliente, mesmo sem o `timeout` da transação (F2) |
| C76 | `apps/api/test/queries/query.service.spec.ts` `QRY-08 resultado com mais linhas que o limite devolve as primeiras e marca truncated` (+ `apps/api/test-int/queries.int.spec.ts` `QRY-08 UNWIND de 6000 linhas devolve 5000`, `ResultTable.test.tsx` `QRY-08 resultado cortado mostra Mostrando as primeiras 5.000 linhas`) | yes |
| C77 | `apps/api/test/queries/read-only-cypher.spec.ts` `QRY-09 Cypher com mais de 20000 caracteres é recusado` (+ `packages/contracts/src/dashboards.spec.ts` `QRY-09 Cypher com mais de 20000 caracteres no contrato`) | yes |
| C78 | `apps/api/test/queries/query.service.spec.ts` `QRY-10 parâmetro sem valor é enviado como null` | yes |
| C79 | `apps/api/test/queries/queries.spec.ts` `QRY-11 quem não pode editar recebe 403 ao executar texto` | yes |
| C80 | `apps/api/test/queries/queries.spec.ts` `QRY-12 quem só vê executa o widget salvo pelo id` | yes |
| C81 | `apps/api/test/queries/query.service.spec.ts` `QRY-13 Neo4j inacessível mostra Não foi possível conectar ao banco Vendas` (+ `apps/api/test-int/queries.int.spec.ts` `QRY-13 porta fechada mostra Não foi possível conectar ao banco`) | yes |
| C82 | `apps/api/test/queries/query.service.spec.ts` `QRY-14 log de execução tem usuário, conexão, widget, duração, linhas e resultado sem as linhas` | yes |
| C83 | `apps/web/src/features/widgets/ResultTable.test.tsx` `TBL-01 tabela tem uma coluna por chave na ordem do RETURN` | yes |
| C84 | `apps/web/src/features/widgets/ResultTable.test.tsx` `TBL-02 clicar no cabeçalho alterna crescente, decrescente e original` (+ `TBL-02 a ordenação vale para todas as linhas e não só para a página`) | yes |
| C85 | `apps/web/src/features/widgets/table-rules.test.ts` `TBL-03 números por valor, textos em ordem do português e nulos por último` | yes |
| C86 | `apps/web/src/features/widgets/ResultTable.test.tsx` `TBL-04 mais de 50 linhas mostra Página X de Y e navega` | yes |
| C87 | `apps/web/src/features/widgets/ResultTable.test.tsx` `TBL-05 linhas rolam dentro do card com cabeçalho fixo` (checagem de classes) | yes |
| C88 | `apps/api/test/queries/result-value.spec.ts` `TBL-06 nó, relacionamento, lista e mapa viram texto JSON` (+ `ResultTable.test.tsx` `TBL-06 valor JSON aparece como texto na célula`) | yes |
| C89 | `apps/web/src/features/widgets/ResultTable.test.tsx` `TBL-07 valor nulo mostra travessão` | yes |
| C90 | `apps/api/test/queries/result-value.spec.ts` `TBL-08 inteiro acima de 2^53 mantém todos os dígitos` (+ `ResultTable.test.tsx` `TBL-08 inteiro grande aparece com todos os dígitos`) | yes |
| C91 | `apps/web/src/features/widgets/WidgetCard.test.tsx` `TBL-09 esqueleto no card enquanto a consulta roda` | yes |
| C92 | `apps/web/src/features/widgets/WidgetCard.test.tsx` `TBL-10 consulta sem linhas mostra A consulta não retornou dados` | yes |
| C93 | `apps/web/src/features/widgets/WidgetCard.test.tsx` `TBL-11 erro mostra a mensagem e Tentar novamente para quem edita` | yes |
| C94 | `apps/api/test/queries/queries.spec.ts` `TBL-12 quem só vê recebe a mensagem genérica de erro` (+ `WidgetCard.test.tsx` `TBL-12 erro mostra Não foi possível carregar este widget para quem só vê`) | no - a API mascara só o erro do Neo4j; a recusa de cláusula bloqueada chega crua a quem só vê (F1); o teste web entrega a mensagem já mascarada, então não detecta vazamento |
| C95 | `apps/web/src/features/dashboards/DashboardPage.test.tsx` `TBL-13 widget com erro não impede os demais` | yes |
| C96 | `apps/web/src/features/widgets/WidgetCard.test.tsx` `TBL-14 widget sem Cypher mostra Widget sem consulta` | yes |
| C97 | `apps/web/src/features/dashboards/DashboardPage.test.tsx` `TBL-15 Atualizar executa de novo os widgets da aba ativa` | yes |
| C98 | `apps/api/test/connections/connections-in-use.spec.ts` `DASH-14 excluir conexão usada responde 409 com o número de dashboards` (+ `DASH-14 chave estrangeira impede apagar conexão usada` em `apps/api/test/database/dashboards-schema.spec.ts`; `apps/web/src/features/connections/ConnectionRowActions.test.tsx` `DASH-14 excluir conexão usada mostra Esta conexão é usada por`) | yes |
| C99 | `apps/web/src/features/dashboards/DashboardPage.test.tsx` `DASH-15 dashboard excluído por outra pessoa mostra Dashboard não encontrado na próxima ação` | yes |
| C100 | `apps/web/src/features/dashboards/NewDashboardDialog.test.tsx` `DASH-16 dois cliques em Criar enviam um único pedido` | yes |
| C101 | `apps/web/src/features/widgets/ResultTable.test.tsx` `TBL-16 colunas com o mesmo nome aparecem as duas` | yes |
| C102 | `apps/web/src/features/dashboards/DashboardPage.test.tsx` `TBL-17 resultado que chega depois de trocar de aba ou sair é descartado` (prova o aborto da requisição; a entrega tardia não é simulada, ver F10) | yes |
| C103 | `apps/api/test/queries/read-only-cypher.spec.ts` `QRY-15 CREATE dentro de um nome maior é aceito` | yes |
| C104 | `apps/api/test/queries/queries.spec.ts` `EDIT-10 quem edita executa o texto em outra conexão` (+ `apps/web/src/features/dashboards/DashboardEditMode.test.tsx` `EDIT-10 trocar a conexão executa de novo os widgets da aba ativa`) | yes |
| C105 | `apps/api/test/queries/queries.spec.ts` `QRY-16 quem não alcança recebe 404 ao executar widget` | yes |
| C106 | `apps/api/test/sidebar/sidebar.spec.ts` `SIDE-17 a última gravação da sidebar vale` (sequencial; a última gravação sobrescreve o documento inteiro) | yes |
| C107 | `apps/api/test/dashboards/dashboards.spec.ts` `DASH-22 Editor e Visualizador recebem 403 na lista de todos` (+ `apps/web/src/features/dashboards/DashboardsTab.test.tsx` `DASH-22 Visualizador em configuracoes dashboards vê a página de permissão`) | yes |

Resumo: 104 yes, 3 no (C59, C75, C94).

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (medio, C94/TBL-12): quem só vê recebe a mensagem crua de recusa de cláusula bloqueada, sem mascarar | `apps/api/src/queries/query.service.ts:75` lança `AppError(400, check.code, check.message)` sem passar por `fail(..., maskErrors)`. Own example no HEAD: viewer com `POST .../widgets/<id>/run` em widget salvo com `CREATE (n:X)` recebe `400 QUERY_WRITE_BLOCKED "Somente consultas de leitura são permitidas. Cláusula bloqueada: CREATE"`. `apps/web/src/features/widgets/WidgetCard.tsx:58` exibe `query.error.message` sem checar permissão. `WidgetCard.test.tsx` TBL-12 entrega a mensagem já mascarada | Mascarar também o ramo de validação quando `maskErrors` (ou responder a mensagem genérica no controller para quem só vê). No web, mostrar `MESSAGES.widgetLoadFailed` quando não puder editar. Acrescentar teste em que o servidor devolve a mensagem crua e o card de quem só vê não a mostra | f1ec789 - C94 |
| F2 (medio, C75/QRY-07): nenhum teste prova o cancelamento no Neo4j | `apps/api/test-int/queries.int.spec.ts:89-99` afere só duração e mensagem; sem o `timeout` do `executeRead` (`apps/api/src/neo4j/driver-neo4j.gateway.ts:45-47`) o teste passaria, porque o prazo do cliente (`Promise.race`) também devolve 422 | Teste de integração que verifique no Neo4j real que a transação terminou após o prazo (ex.: `SHOW TRANSACTIONS` sem a consulta), e/ou teste unitário do gateway que confere `timeout` em `executeRead` | 69c9f8a - C75 |
| F3 (medio, C76/QRY-08): o limite de linhas é aplicado depois de bufferizar todo o resultado | `apps/api/src/neo4j/driver-neo4j.gateway.ts:45-51`: `executeRead` devolve `result.records` completo e só então `slice(0, opts.maxRows)`. Uma consulta de até 30 s pode trazer milhões de linhas para a memória do processo | Consumir o resultado em stream (`result.subscribe` ou `onNext`) e parar ao atingir `maxRows + 1`, mantendo o corte atual | 69c9f8a - C76 |
| F4 (baixo-medio, C70/C72, QRY-02/04): o validador recusa palavras-chave que não são cláusulas | Own examples no HEAD: `RETURN {set: 1} AS m`, `WITH 1 AS set RETURN set` e `MATCH (t) WHERE t.id IN transactions RETURN t` são recusados (`apps/api/src/queries/read-only-cypher.ts:102-112`, `findBlockedClause`). Probe com EXPLAIN no Neo4j local (`bolt://localhost:7688`) confirma que os três são sintaticamente válidos | Reconhecer a palavra só em posição de cláusula (início de cláusula, após `CALL {`, `}`, `;` ou ao início da consulta), ou aceitar `set:` como chave de mapa e `AS set`/`IN transactions` quando o contexto não for cláusula. Acrescentar casos a `read-only-cypher.spec.ts` | ccf1887 - C70 |
| F5 (baixo, C70, QRY-02): exceção de `.` aceita `1. CREATE` | Own example: `MATCH (n) WHERE n.a = 1. CREATE (m) RETURN m` é aceito pelo validador (`read-only-cypher.ts:87`, `afterDot`). Probe no Neo4j: SyntaxError, então não há escrita, mas a consulta chega ao banco contra o "sem enviá-la ao Neo4j" | `afterDot` só deve valer quando o `.` segue identificador, `)` ou `]`, não um dígito; ou rejeitar número com ponto final. Acrescentar caso ao teste QRY-02 | ccf1887 - C70 |
| F6 (baixo, C59/WDG-01): teste não afirma a prévia | `apps/web/src/features/widgets/WidgetEditorDialog.test.tsx:54-68` não verifica a prévia; o componente a renderiza em `WidgetEditorDialog.tsx:131` (`<Preview ...>`) | Afirmar a região da prévia (ex.: estado vazio ou `role` da prévia) ao abrir o editor | 446a887 - C59 |
| F7 (baixo, C69/QRY-01): "nada é criado" não é verificado de forma independente | `apps/api/test-int/queries.int.spec.ts:79` usa `db.labels()`, que pode não listar tokens criados por `db.createLabel`. A recusa já é provada pelo 422 (linha 75-76 do mesmo teste) | Verificar com uma escrita visível (ex.: `CREATE` em sessão de escrita de teste) que a contagem permanece 0, como já faz `neo4j-gateway.int.spec.ts` SCH-12 | 4b2144f - C69 |
| F8 (baixo, SIDE-02/TAB-04/WDG-07): erros de validação da API são indexados só pelo primeiro segmento do caminho | `apps/api/src/common/zod.pipe.ts:14` usa `issue.path[0]`; `apps/api/test/sidebar/sidebar.spec.ts:123` espera `fieldErrors.items`, enquanto o contrato espera `items.0.name` (`packages/contracts/src/dashboards.spec.ts:67`). O campo "Nome" fica sem referência no 400 (o web valida no cliente, então a UX atual não é afetada) | Manter o caminho completo ou mapear para o nome do campo, e ajustar `sidebar.spec.ts` | 35bce99 - AD-131 |
| F9 (baixo, higiene de teste): requisição sem handler MSW no teste EDIT-10 | Saída de `proofs.md` (`Run web`): `[MSW] Error: intercepted a request without a matching request handler: POST /api/dashboards/d-1/widgets/w-1/run` em `DashboardEditMode.test.tsx:303`. O teste passa mesmo assim, o que esconde chamadas inesperadas | Adicionar handler para a execução do widget no modo de visualização e configurar `onUnhandledRequest: 'error'` para falhar o teste | 96b6ec9 - C104 |
| F10 (baixo, C102/TBL-17): a entrega tardia do resultado não é simulada | `apps/web/src/features/dashboards/DashboardPage.test.tsx:301-339` prova o aborto (`signal.aborted`), mas o `delay('infinite')` nunca entrega resposta. Se o aborto fosse removido e o resultado tardio ignorado, o teste não cobriria | Acrescentar caso em que a resposta chega depois da troca de aba (com `signal` ignorado) e não aparece na tela | befca97 - C102 |
| F11 (baixo, QRY-09/WDG-07): limite de 20.000 caracteres conta unidades UTF-16 | `apps/api/src/queries/read-only-cypher.ts:121` usa `cypher.length`; `packages/contracts/src/dashboards.ts` usa `.max(...)` do zod (mesma contagem). Emojis e caracteres fora do BMP contam 2, o texto da spec diz "caracteres" | Aceito como decisão; registrar em spec ou contar por `[...cypher].length` nos dois pontos | 35bce99 - AD-132 |

Observacao sem finding: widgets podem ser salvos com Cypher de escrita (`packages/contracts/src/dashboards.ts` `widgetSchema.cypher` sem validação); a recusa só ocorre na execução. A spec não exige validação no salvamento, mas isso amplia o caso de F1.
