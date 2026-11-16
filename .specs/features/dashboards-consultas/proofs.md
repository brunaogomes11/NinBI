# dashboards-consultas proofs

**HEAD**: 29c8631
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 154 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run api / ✓ DASH-01 sidebar devolve os dashboards alcançáveis na ordem e nos grupos gravados` | pass |
| C1 | `run web / ✓ DASH-01 sidebar mostra os dashboards soltos e os grupos na ordem da API` | pass |
| C2 | `run web / ✓ DASH-02 sem dashboards a página inicial mostra Nenhum dashboard ainda` | pass |
| C3 | `run web / ✓ DASH-03 esqueleto na sidebar enquanto a lista carrega` | pass |
| C4 | `run web / ✓ DASH-04 erro na sidebar mostra Não foi possível carregar os dashboards e Tentar novamente recarreg` | pass |
| C5 | `run api / ✓ DASH-05 cria o dashboard com o usuário como dono e a aba Aba 1` | pass |
| C5 | `run api / ✓ DASH-05 dashboard novo entra no fim da sidebar do dono` | pass |
| C5 | `run web / ✓ DASH-05 Novo dashboard cria o dashboard e abre a URL de edição` | pass |
| C5 | `run web / ✓ DASH-05 abrir com editar=1 mostra o dashboard já em modo de edição` | pass |
| C6 | `run contracts / ✓ DASH-06 nome do dashboard vazio ou com mais de 80 caracteres` | pass |
| C6 | `run web / ✓ DASH-06 nome inválido mostra a mensagem no campo Nome sem enviar` | pass |
| C7 | `run web / ✓ DASH-07 sem conexões mostra o aviso e mantém Criar desabilitado` | pass |
| C8 | `run web / ✓ DASH-08 clicar no dashboard da sidebar marca o item ativo` | pass |
| C8 | `run web / ✓ DASH-08 abrir o dashboard mostra a primeira aba em visualização` | pass |
| C9 | `run web / ✓ DASH-09 Novo dashboard aparece só para Admin e Editor` | pass |
| C10 | `run web / ✓ DASH-10 Excluir pede confirmação com o nome do dashboard` | pass |
| C11 | `run api / ✓ DASH-11 excluir apaga abas e widgets` | pass |
| C11 | `run api / ✓ DASH-11 dashboard apagado sai das sidebars` | pass |
| C11 | `run web / ✓ DASH-11 confirmar a exclusão tira o dashboard da sidebar e abre a página inicial` | pass |
| C12 | `run api / ✓ DASH-12 Visualizador recebe 403 ao criar dashboard` | pass |
| C13 | `run api / ✓ DASH-13 dashboard inexistente ou fora do alcance responde 404` | pass |
| C13 | `run web / ✓ DASH-13 URL de dashboard inexistente mostra Dashboard não encontrado com link para a página inicia` | pass |
| C14 | `run api / ✓ DASH-17 só o dono e os Admins alcançam um dashboard novo` | pass |
| C15 | `run api / ✓ DASH-18 permissões do dashboard dizem quem edita e quem exclui` | pass |
| C15 | `run web / ✓ DASH-18 Editar e Excluir aparecem só para quem pode` | pass |
| C16 | `run api / ✓ DASH-19 quem só vê recebe 403 ao alterar ou excluir` | pass |
| C17 | `run api / ✓ DASH-20 Admin lista todos os dashboards com dono, conexão e última alteração em ordem de nome` | pass |
| C17 | `run web / ✓ DASH-20 aba Dashboards mostra nome, dono, conexão e última alteração` | pass |
| C18 | `run api / ✓ DASH-21 Admin abre dashboard de outro usuário com permissão de edição` | pass |
| C18 | `run web / ✓ DASH-21 clicar no dashboard da aba Dashboards abre o dashboard com Editar` | pass |
| C19 | `run web / ✓ SIDE-01 Novo grupo cria um grupo no fim da sidebar` | pass |
| C20 | `run contracts / ✓ SIDE-02 nome do grupo vazio ou com mais de 40 caracteres` | pass |
| C20 | `run api / ✓ SIDE-02 grupo com nome inválido responde 400` | pass |
| C20 | `run web / ✓ SIDE-02 nome de grupo inválido mostra a mensagem no campo` | pass |
| C21 | `run web / ✓ SIDE-03 moveItem põe o item antes do alvo` | pass |
| C21 | `run web / ✓ SIDE-03 arrastar um dashboard o mantém na posição em que foi solto` | pass |
| C22 | `run web / ✓ SIDE-04 arrastar um dashboard para dentro de um grupo` | pass |
| C23 | `run web / ✓ SIDE-05 arrastar um dashboard para fora de um grupo` | pass |
| C24 | `run web / ✓ SIDE-06 arrastar um grupo move o grupo com os dashboards` | pass |
| C25 | `run web / ✓ SIDE-07 clicar no cabeçalho recolhe e expande o grupo` | pass |
| C26 | `run web / ✓ SIDE-08 renomear o grupo mostra o novo nome` | pass |
| C27 | `run web / ✓ SIDE-09 removeGroup solta os dashboards na posição do grupo` | pass |
| C27 | `run web / ✓ SIDE-09 Excluir grupo solta os dashboards na posição do grupo` | pass |
| C28 | `run api / ✓ SIDE-10 gravar a sidebar de um usuário não muda a de outro` | pass |
| C29 | `run api / ✓ SIDE-11 outra sessão do mesmo usuário recebe a mesma sidebar` | pass |
| C30 | `run web / ✓ SIDE-12 falha ao gravar volta o item e mostra Não foi possível salvar a organização` | pass |
| C31 | `run api / ✓ SIDE-13 Admin, Editor e Visualizador gravam a própria sidebar` | pass |
| C32 | `run web / ✓ SIDE-14 grupo sem dashboards mostra Grupo vazio` | pass |
| C33 | `run web / ✓ SIDE-15 nome longo é cortado com reticências e mostra o nome inteiro no title` | pass |
| C34 | `run web / ✓ SIDE-16 lista de dashboards e grupos rola na vertical` | pass |
| C35 | `run web / ✓ EDIT-01 Editar entra em modo de edição com Salvar e Descartar` | pass |
| C36 | `run api / ✓ EDIT-02 salvar grava nome, conexão, abas, widgets e layout de uma vez` | pass |
| C36 | `run web / ✓ EDIT-02 Salvar envia o rascunho inteiro e volta à visualização` | pass |
| C37 | `run web / ✓ EDIT-03 falha ao salvar mantém a edição e mostra Não foi possível salvar` | pass |
| C38 | `run api / ✓ EDIT-04 versão desatualizada responde 409` | pass |
| C38 | `run apiint / ✓ EDIT-04 duas gravações simultâneas da mesma versão dão um 200 e um 409` | pass |
| C38 | `run web / ✓ EDIT-04 409 mostra Este dashboard foi alterado por outra pessoa` | pass |
| C39 | `run web / ✓ EDIT-05 Descartar com alterações pede confirmação` | pass |
| C40 | `run web / ✓ EDIT-06 confirmar o descarte volta ao último estado salvo` | pass |
| C41 | `run web / ✓ EDIT-07 sair da página com alterações pede confirmação` | pass |
| C42 | `run web / ✓ EDIT-08 setName e setConnection alteram o rascunho` | pass |
| C42 | `run web / ✓ EDIT-08 alterar nome e conexão muda o rascunho` | pass |
| C43 | `run web / ✓ EDIT-09 Salvar fica desabilitado durante a gravação` | pass |
| C44 | `run web / ✓ TAB-01 clicar numa aba mostra os widgets dela e a marca como ativa` | pass |
| C45 | `run web / ✓ TAB-02 a primeira exibição de uma aba executa as consultas dos widgets dela` | pass |
| C46 | `run web / ✓ TAB-03 addTab nomeia a aba com o número de abas` | pass |
| C46 | `run web / ✓ TAB-03 Nova aba adiciona Aba N e a ativa` | pass |
| C47 | `run contracts / ✓ TAB-04 nome da aba vazio ou com mais de 40 caracteres` | pass |
| C47 | `run web / ✓ TAB-04 renomear a aba mostra o novo nome` | pass |
| C48 | `run web / ✓ TAB-05 Excluir aba com widgets pede confirmação com o nome e o número de widgets` | pass |
| C49 | `run web / ✓ TAB-06 Excluir aba fica desabilitado com uma aba só` | pass |
| C50 | `run web / ✓ TAB-07 aba sem widgets mostra Esta aba está vazia` | pass |
| C51 | `run web / ✓ TAB-08 barra de abas rola na horizontal sem quebrar linha` | pass |
| C52 | `run web / ✓ GRID-01 grade tem 12 colunas` | pass |
| C53 | `run web / ✓ GRID-02 arrastar um widget o põe na célula solta sem sobreposição` | pass |
| C54 | `run contracts / ✓ GRID-03 layout do widget fora dos limites da grade é recusado` | pass |
| C54 | `run web / ✓ GRID-03 redimensionar respeita 2 por 2 no mínimo e 12 colunas no máximo` | pass |
| C55 | `run web / ✓ GRID-04 em visualização não dá para arrastar nem redimensionar` | pass |
| C56 | `run web / ✓ GRID-05 addWidget põe o widget 4 por 4 abaixo do último` | pass |
| C56 | `run web / ✓ GRID-05 Novo widget adiciona um widget 4 por 4 no fim da aba e abre o editor` | pass |
| C57 | `run api / ✓ GRID-06 salvar grava posição e tamanho de cada widget por aba` | pass |
| C57 | `run web / ✓ GRID-06 posição e tamanho arrastados vão no Salvar` | pass |
| C58 | `run web / ✓ GRID-07 widget é um card do tema com o título no topo` | pass |
| C59 | `run web / ✓ WDG-01 Editar widget abre Título, editor de Cypher com realce, Executar e prévia` | pass |
| C60 | `run api / ✓ WDG-02 executa o Cypher enviado na conexão do dashboard` | pass |
| C60 | `run web / ✓ WDG-02 Executar mostra o resultado em tabela na prévia` | pass |
| C61 | `run web / ✓ WDG-03 falha na execução mostra o erro na prévia e mantém o Cypher` | pass |
| C62 | `run web / ✓ WDG-04 Executar fica desabilitado com o editor vazio` | pass |
| C63 | `run web / ✓ WDG-05 updateWidget troca título e Cypher` | pass |
| C63 | `run web / ✓ WDG-05 Aplicar fecha o editor e atualiza título e Cypher do widget` | pass |
| C64 | `run web / ✓ WDG-06 Cancelar fecha o editor sem alterar o widget` | pass |
| C65 | `run contracts / ✓ WDG-07 título do widget vazio ou com mais de 80 caracteres` | pass |
| C65 | `run web / ✓ WDG-07 título inválido recusa Aplicar com a mensagem no campo Título` | pass |
| C66 | `run web / ✓ WDG-08 Remover widget pede confirmação com o título` | pass |
| C67 | `run web / ✓ WDG-09 removeWidget tira o widget da aba` | pass |
| C67 | `run web / ✓ WDG-09 confirmar a remoção tira o widget do rascunho` | pass |
| C68 | `run web / ✓ WDG-10 durante a execução mostra Executando e Executar fica desabilitado` | pass |
| C69 | `run apiint / ✓ QRY-01 procedimento de escrita é recusado pela transação de leitura e nada é criado` | pass |
| C70 | `run api / ✓ QRY-02 recusa cada cláusula bloqueada com a mensagem` | pass |
| C70 | `run api / ✓ QRY-02 Cypher de escrita não chega ao Neo4j` | pass |
| C71 | `run api / ✓ QRY-03 cláusulas bloqueadas sem diferenciar maiúsculas` | pass |
| C72 | `run api / ✓ QRY-04 palavra bloqueada em string, comentário ou crases é aceita` | pass |
| C73 | `run api / ✓ QRY-05 mais de uma instrução é recusada` | pass |
| C74 | `run api / ✓ QRY-06 recusa de escrita do Neo4j mostra Somente consultas de leitura são permitidas` | pass |
| C74 | `run apiint / ✓ QRY-06 Neo4j real recusa CALL db.createLabel com a mensagem de leitura` | pass |
| C75 | `run api / ✓ QRY-07 consulta que passa do prazo responde A consulta excedeu o tempo limite` | pass |
| C75 | `run api / ✓ QRY-07 prazo padrão é 30 s` | pass |
| C75 | `run apiint / ✓ QRY-07 produto cartesiano no Neo4j real para no prazo` | pass |
| C76 | `run api / ✓ QRY-08 resultado com mais linhas que o limite devolve as primeiras e marca truncated` | pass |
| C76 | `run apiint / ✓ QRY-08 UNWIND de 6000 linhas devolve 5000` | pass |
| C76 | `run web / ✓ QRY-08 resultado cortado mostra Mostrando as primeiras 5.000 linhas` | pass |
| C77 | `run contracts / ✓ QRY-09 Cypher com mais de 20000 caracteres no contrato` | pass |
| C77 | `run api / ✓ QRY-09 Cypher com mais de 20000 caracteres é recusado` | pass |
| C78 | `run api / ✓ QRY-10 parâmetro sem valor é enviado como null` | pass |
| C79 | `run api / ✓ QRY-11 quem não pode editar recebe 403 ao executar texto` | pass |
| C80 | `run api / ✓ QRY-12 quem só vê executa o widget salvo pelo id` | pass |
| C81 | `run api / ✓ QRY-13 Neo4j inacessível mostra Não foi possível conectar ao banco` | pass |
| C81 | `run apiint / ✓ QRY-13 porta fechada mostra Não foi possível conectar ao banco` | pass |
| C82 | `run api / ✓ QRY-14 log de execução tem usuário, conexão, widget, duração, linhas e resultado sem as linhas` | pass |
| C83 | `run web / ✓ TBL-01 tabela tem uma coluna por chave na ordem do RETURN` | pass |
| C84 | `run web / ✓ TBL-02 clicar no cabeçalho alterna crescente, decrescente e original` | pass |
| C85 | `run web / ✓ TBL-03 números por valor, textos em ordem do português e nulos por último` | pass |
| C86 | `run web / ✓ TBL-04 mais de 50 linhas mostra Página X de Y e navega` | pass |
| C87 | `run web / ✓ TBL-05 linhas rolam dentro do card com cabeçalho fixo` | pass |
| C88 | `run api / ✓ TBL-06 nó, relacionamento, lista e mapa viram texto JSON` | pass |
| C88 | `run web / ✓ TBL-06 valor JSON aparece como texto na célula` | pass |
| C89 | `run web / ✓ TBL-07 valor nulo mostra travessão` | pass |
| C90 | `run api / ✓ TBL-08 inteiro acima de 2^53 mantém todos os dígitos` | pass |
| C90 | `run web / ✓ TBL-08 inteiro grande aparece com todos os dígitos` | pass |
| C91 | `run web / ✓ TBL-09 esqueleto no card enquanto a consulta roda` | pass |
| C92 | `run web / ✓ TBL-10 consulta sem linhas mostra A consulta não retornou dados` | pass |
| C93 | `run web / ✓ TBL-11 erro mostra a mensagem e Tentar novamente para quem edita` | pass |
| C94 | `run api / ✓ TBL-12 quem só vê recebe a mensagem genérica de erro` | pass |
| C94 | `run web / ✓ TBL-12 erro mostra Não foi possível carregar este widget para quem só vê` | pass |
| C95 | `run web / ✓ TBL-13 widget com erro não impede os demais` | pass |
| C96 | `run web / ✓ TBL-14 widget sem Cypher mostra Widget sem consulta` | pass |
| C97 | `run web / ✓ TBL-15 Atualizar executa de novo os widgets da aba ativa` | pass |
| C98 | `run api / ✓ DASH-14 chave estrangeira impede apagar conexão usada` | pass |
| C98 | `run api / ✓ DASH-14 excluir conexão usada responde 409 com o número de dashboards` | pass |
| C98 | `run web / ✓ DASH-14 excluir conexão usada mostra Esta conexão é usada por` | pass |
| C99 | `run web / ✓ DASH-15 dashboard excluído por outra pessoa mostra Dashboard não encontrado na próxima ação` | pass |
| C100 | `run web / ✓ DASH-16 dois cliques em Criar enviam um único pedido` | pass |
| C101 | `run web / ✓ TBL-16 colunas com o mesmo nome aparecem as duas` | pass |
| C102 | `run web / ✓ TBL-17 resultado que chega depois de trocar de aba ou sair é descartado` | pass |
| C103 | `run api / ✓ QRY-15 CREATE dentro de um nome maior é aceito` | pass |
| C104 | `run api / ✓ EDIT-10 quem edita executa o texto em outra conexão` | pass |
| C104 | `run web / ✓ EDIT-10 trocar a conexão executa de novo os widgets da aba ativa` | pass |
| C105 | `run api / ✓ QRY-16 quem não alcança recebe 404 ao executar widget` | pass |
| C106 | `run api / ✓ SIDE-17 a última gravação da sidebar vale` | pass |
| C107 | `run api / ✓ DASH-22 Editor e Visualizador recebem 403 na lista de todos` | pass |
| C107 | `run web / ✓ DASH-22 Visualizador em configuracoes dashboards vê a página de permissão` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run api` - exit 0

```
 ✓ test/web/web.spec.ts > servir o web pela API > FND-01 serve o index.html do web em GET / 3719ms
 ✓ test/connections/connections-in-use.spec.ts > excluir conexão usada por dashboards > DASH-14 conexão sem dashboards continua dando 204 2626ms
 ✓ test/health/health.spec.ts > health > FND-04 health responde 503 com postgres down 2028ms
 ✓ test/auth/initial-password.spec.ts > senha definitiva depois da provisória > USR-06 confirmação diferente responde 400 e mantém o bloqueio 2652ms
 ✓ test/auth/initial-password.spec.ts > senha definitiva depois da provisória > USR-06 chamada sem senha provisória responde 409 1347ms

 Test Files  37 passed (37)
      Tests  201 passed (201)
   Start at  13:10:45
   Duration  88.89s (tests 79%, import 20%)

$ vitest run --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

`Run web` - exit 0

```
 ✓ src/features/dashboards/draft.test.ts > draft > GRID-06 setLayout grava posição e tamanho pelo id do widget 1ms
 ✓ src/features/dashboards/draft.test.ts > draft > EDIT-02 toSavePayload passa em dashboardSaveSchema e leva a version do DTO 6ms
 ✓ src/features/connections/ExampleToggle.test.tsx > ExampleToggle > SCH-22 desligar Enviar exemplo à IA mostra exemplo não enviado 294ms
 ✓ src/features/connections/ExampleToggle.test.tsx > ExampleToggle > SCH-24 controle Enviar exemplo à IA desabilitado para Editor 134ms

 Test Files  41 passed (41)
      Tests  214 passed (214)
   Start at  13:12:18
   Duration  41.45s (environment 30%, import 30%, tests 21%, setup 15%, transform 4%)

Environment  jsdom was created 41 times · 132.03s total, 30% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

$ vitest run --reporter=verbose
```

`Run contracts` - exit 0

```
 ✓ src/dashboards.spec.ts > dashboard contracts > SIDE-02 nome do grupo vazio ou com mais de 40 caracteres 2ms
 ✓ src/dashboards.spec.ts > dashboard contracts > TAB-04 nome da aba vazio ou com mais de 40 caracteres 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > WDG-07 título do widget vazio ou com mais de 80 caracteres 2ms
 ✓ src/dashboards.spec.ts > dashboard contracts > GRID-03 layout do widget fora dos limites da grade é recusado 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > QRY-09 Cypher com mais de 20000 caracteres no contrato 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > dashboardSaveSchema sem abas é recusado e com abas e widgets é aceito 0ms
 ✓ src/dashboards.spec.ts > dashboard contracts > sidebarLayoutSchema com um dashboard repetido é recusado 0ms
 ✓ src/dashboards.spec.ts > dashboard contracts > MESSAGES formata o prazo e o corte de linhas 14ms

 Test Files  4 passed (4)
      Tests  58 passed (58)
   Start at  13:13:01
   Duration  414ms (import 66%, transform 20%, tests 9%, worker 4%)

$ vitest run --reporter=verbose
```

`Run apiint` - exit 0

```

    Isolate  9 workers spawned · ~143ms startup each (spawn + environment, per file)
             at least ~1.14s faster with isolate: false — reuses workers across files instead of one per file

$ node scripts/docker.mjs up
 Container ninbi-dev-postgres-1 Running 
 Container ninbi-dev-neo4j-1 Running 
 Container ninbi-dev-postgres-1 Waiting 
 Container ninbi-dev-neo4j-1 Waiting 
 Container ninbi-dev-neo4j-1 Healthy 
 Container ninbi-dev-postgres-1 Healthy 
$ vitest run --config vitest.int.config.ts --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.int.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```
