# Dashboards e Consultas Tasks

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas (screens sub-agent, imagens `*.running.png`, walk) está dispensada por AD-023: nenhuma task captura tela.

Pré-requisito: `fundacao-auth` e `conexoes-schema` concluídas (harness `createTestApp` com `neo4j`, `FakeNeo4jGateway`, harness de integração, `CryptoService`, `Neo4jGateway`, tabela `connections`, `renderApp`, `SETTINGS_TABS`, `useTopBarAction`, `Sidebar`, `HomePage`, `useConnections`, `ConnectionRowActions`, dataset "Varejo" no Neo4j de dev).

---

**Design**: `.specs/features/dashboards-consultas/design.md`
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run contracts**: `pnpm --filter @ninbi/contracts test`
**Run api**: `pnpm --filter @ninbi/api test`
**Run apiint**: `pnpm infra:up && pnpm --filter @ninbi/api test:int`
**Run web**: `pnpm --filter @ninbi/web test`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo script `test` e `test:int` roda `vitest run --reporter=verbose`. Todo nome de teste começa com o ID do requisito e contém, na ordem, as palavras da linha de `Proof` da sua check (sem o `✓`). Se o runner imprimir outro marcador de sucesso, a linha da check é corrigida a partir da saída real, nunca o teste.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012 (testes unitários das partes críticas: validação de Cypher somente leitura, permissões), AD-026 (testes rápidos com PGlite e `FakeNeo4jGateway`; integração contra o `docker-compose.dev.yml`), e as matrizes aprovadas em `.specs/features/fundacao-auth/tasks.md` e `.specs/features/conexoes-schema/tasks.md`. Strong defaults applied onde não há guia.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contratos (schemas zod, mensagens) | unit | Toda regra de campo com o texto exato da mensagem; casos válidos no limite | `packages/contracts/src/**/*.spec.ts` | `pnpm --filter @ninbi/contracts test` |
| API: funções puras (validador somente leitura, parâmetros, conversão de valores) | unit | Todos os ramos; cada cláusula bloqueada; cada região ignorada; 1:1 com os ACs | `apps/api/test/queries/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: services e rotas | integration (supertest + PGlite + `FakeNeo4jGateway` + `FakeShareResolver`) | Toda rota: sucesso + cada erro da tabela de erros do design + 403/404 por papel e alcance | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: Neo4j real e corridas | integration (PostgreSQL e Neo4j do `docker-compose.dev.yml`) | Transação de leitura, prazo, limite de linhas e banco inacessível no Neo4j real; EDIT-04 com gravações simultâneas | `apps/api/test-int/**/*.int.spec.ts` | `pnpm infra:up && pnpm --filter @ninbi/api test:int` |
| Banco (schema Drizzle, migração) | integration (PGlite) | Migração aplica; cascatas e `ON DELETE RESTRICT` | `apps/api/test/database/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Web: funções puras (tabela, rascunho, sidebar) | unit | Todos os ramos; 1:1 com os ACs | `apps/web/src/features/**/*.test.ts` | `pnpm --filter @ninbi/web test` |
| Web: componentes e páginas | unit (Testing Library + jsdom + user-event + MSW) | Gesto do critério + o que a tela mostra; toda mensagem da spec com o texto exato | `apps/web/src/**/*.test.tsx` | `pnpm --filter @ninbi/web test` |

## Gate Check Commands

> Generated from the design - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task com testes de um só pacote | `pnpm --filter <pacote da task> test` (`@ninbi/contracts`, `@ninbi/api` ou `@ninbi/web`) |
| Full | Task com teste de integração real | `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int` |
| Build | Última task de cada fase | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

`pnpm test` na raiz é `pnpm -r test`. Uma task de fim de fase que também tem teste de integração roda o Build e depois o Full.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Lotes de execução

| Lote | Fases | Tasks | Modelo |
| ---- | ----- | ----- | ------ |
| 1 | Phase 1 - Contratos e banco; Phase 2 - Dashboards e sidebar na API | T1-T7 (7) | sonnet |
| 2 | Phase 3 - Consultas na API; Phase 4 - Widget de tabela no web | T8-T14 (7) | sonnet |
| 3 | Phase 5 - Sidebar no web; Phase 6 - Página do dashboard | T15-T21 (7) | sonnet |
| 4 | Phase 7 - Edição do dashboard; Phase 8 - Administração | T22-T28 (7) | sonnet |

Todas as tasks têm testes, por isso todos os lotes são `sonnet`.

### Phase 1: Contratos e banco

As duas tasks são independentes entre si.

```
T1
T2
```

### Phase 2: Dashboards e sidebar na API

```
T3 → T4 → T5
T3 → T6
T7
```

### Phase 3: Consultas na API

```
T8 → T10
T9 → T10 → T11 → T12
```

### Phase 4: Widget de tabela no web

```
T13 → T14
```

### Phase 5: Sidebar no web

```
T15 → T16 → T17
T15 → T18
```

### Phase 6: Página do dashboard

```
T19 → T20
T21
```

### Phase 7: Edição do dashboard

```
T22 → T23 → T24
T23 → T25 → T27
T23 → T26
```

### Phase 8: Administração

```
T28
```

---

## Task Breakdown

### Phase 1 tasks: Contratos e banco

### T1: Definir os contratos de dashboards, sidebar e consultas

**What**: `packages/contracts/src/dashboards.ts` com `WIDGET_VISUALIZATIONS` (`['TABLE']`), `widgetLayoutSchema` (inteiros; `x ≥ 0`, `y ≥ 0`, `2 ≤ w ≤ 12`, `h ≥ 2`, `x + w ≤ 12`), `dashboardCreateSchema`, `dashboardSaveSchema` (ao menos uma aba; ids UUID), `sidebarLayoutSchema` (ids únicos), `queryRunSchema`, `widgetRunSchema`, e os tipos `WidgetDto`, `DashboardTabDto`, `DashboardDto`, `DashboardSummaryDto`, `SidebarDto`, `SidebarLayoutInput`, `ResultValue`, `QueryResultDto`, conforme "Data Models" do design; acréscimos em `MESSAGES` (tabela "Validação e mensagens" e "Error Handling Strategy" do design, com `queryTimeout(segundos)` e `rowsTruncated(limite)` formatando o número em pt-BR, e os textos da spec: "Nenhum dashboard ainda", "Escolha um dashboard na barra lateral", "Não foi possível carregar os dashboards", "Cadastre uma conexão antes de criar um dashboard", "Dashboard não encontrado", "Não foi possível salvar a organização", "Grupo vazio", "Não foi possível salvar. Tente novamente.", "Este dashboard foi alterado por outra pessoa. Recarregue para continuar.", "Descartar as alterações?", "Sair sem salvar as alterações?", "Esta aba está vazia", "Novo widget", "Executando...", "A consulta não retornou dados", "Não foi possível carregar este widget", "Widget sem consulta", "Somente consultas de leitura são permitidas", "Envie uma consulta por vez", "A consulta passa de 20.000 caracteres", "Não foi possível conectar ao banco <nome>", "Esta conexão é usada por N dashboard(s)") e em `ERROR_CODES` (`DASHBOARD_NOT_FOUND`, `DASHBOARD_VERSION_CONFLICT`, `WIDGET_NOT_FOUND`, `CONNECTION_IN_USE`, `QUERY_TOO_LONG`, `QUERY_MULTIPLE_STATEMENTS`, `QUERY_WRITE_BLOCKED`, `QUERY_TIMEOUT`, `QUERY_FAILED`). Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/dashboards.ts`
**Depends on**: None
**Reuses**: `zod`, `MESSAGES` e `ERROR_CODES` existentes, `connectionCreateSchema` (padrão de `trim`)
**Requirement**: DASH-06, SIDE-02, TAB-04, WDG-07, GRID-03, QRY-09

**Done when**:

- [x] Testes em `packages/contracts/src/dashboards.spec.ts`: DASH-06 (nome vazio e só espaços dão "Informe o nome do dashboard"; 81 caracteres dão "O nome pode ter até 80 caracteres"; 80 passa), SIDE-02 e TAB-04 (nome de grupo e de aba vazios dão "Informe o nome"; 41 caracteres dão "O nome pode ter até 40 caracteres"; 40 passa), WDG-07 (título vazio dá "Informe o título"; 81 dá "O título pode ter até 80 caracteres"), GRID-03 (`w: 1`, `h: 1`, `w: 13` e `x: 10, w: 4` são recusados; `w: 2, h: 2` e `x: 0, w: 12` passam), `QRY-09 Cypher com mais de 20000 caracteres no contrato` (`queryRunSchema` e o Cypher de widget com 20.001 caracteres dão "A consulta passa de 20.000 caracteres"; 20.000 passa), `dashboardSaveSchema` sem abas é recusado, `sidebarLayoutSchema` com um dashboard repetido é recusado, `MESSAGES.queryTimeout(30)` é "A consulta excedeu o tempo limite de 30 s" e `MESSAGES.rowsTruncated(5000)` é "Mostrando as primeiras 5.000 linhas"
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add dashboard, sidebar and query contracts`

---

### T2: Criar as tabelas de dashboards, abas, widgets e sidebar

**What**: Em `apps/api/src/database/schema.ts`, as tabelas `dashboards`, `dashboard_tabs`, `widgets` e `sidebar_layouts` conforme "Data Models" do design (`dashboards.connection_id` com `ON DELETE RESTRICT`; abas e widgets com `ON DELETE CASCADE`; índices); migração gerada com `drizzle-kit generate` em `apps/api/drizzle/`.
**Where**: `apps/api/src/database/schema.ts` (modify)
**Depends on**: None
**Reuses**: `createTestDb()`
**Requirement**: DASH-11, DASH-14, GRID-06

**Done when**:

- [x] Testes em `apps/api/test/database/dashboards-schema.spec.ts`: migrações aplicam no PGlite; DASH-11 (apagar o dashboard apaga as abas e os widgets dele); `DASH-14 chave estrangeira impede apagar conexão usada` (apagar a conexão de um dashboard viola a chave estrangeira); GRID-06 (um widget guarda `x`, `y`, `w`, `h` e `tab_id`); dashboard novo nasce com `version = 1`; `widgets.visualization` padrão `'TABLE'` e `config` padrão `{}`
- [x] `drizzle-kit generate` não gera diferença depois do commit
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): add dashboard, tab, widget and sidebar layout tables`

---

### Phase 2 tasks: Dashboards e sidebar na API

### T3: Decidir quem alcança, edita e exclui um dashboard

**What**: `DashboardAccessModule` com `DashboardShareResolver` (token `DASHBOARD_SHARE_RESOLVER`), `NoSharesResolver` como provider padrão e `DashboardAccessService` (`find`, `assert`, `sidebarDashboardIds`) com as regras do design (dono e Admin editam e excluem; compartilhamento `edit` edita; `view` só vê; sem acesso ou id inválido → 404 `DASHBOARD_NOT_FOUND`; falta `edit`/`delete` → 403 `FORBIDDEN`). `apps/api/test/fakes/fake-share-resolver.ts` (`grant(userId, dashboardId, 'view' | 'edit')`) e opção `shares` em `createTestApp`, que registra o fake no token e o devolve.
**Where**: `apps/api/src/dashboard-access/dashboard-access.service.ts`
**Depends on**: T2
**Reuses**: `can()` (`dashboards.all`), `AppError`, `createTestApp`
**Requirement**: DASH-13, DASH-17, DASH-19

**Done when**:

- [x] Testes em `apps/api/test/dashboards/dashboard-access.spec.ts` (linhas inseridas direto no banco): dono tem ver, editar e excluir; Admin tem os três num dashboard de outro; outro Editor e um Visualizador recebem `null` em `find` e 404 em `assert`; compartilhamento `view` dá só ver e `assert('edit')` lança 403; compartilhamento `edit` dá ver e editar, mas `assert('delete')` lança 403; id `nao-e-uuid` dá 404; `sidebarDashboardIds` devolve os próprios e os compartilhados em ordem de criação, sem os de outros donos
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add dashboard access service with share resolver seam`

---

### T4: Criar, abrir e listar dashboards na API

**What**: `DashboardsService` e `DashboardsController`: `POST /api/dashboards` (`dashboards.create`; dono = usuário; uma aba "Aba 1"; conexão inexistente → 400 com `fieldErrors.connectionId` "Conexão não encontrada"), `GET /api/dashboards/:id` (`assert('view')`; `DashboardDto` com `permissions`, nome do dono e da conexão; `cypher: null` e `hasQuery` para quem não edita) e `GET /api/dashboards` (`dashboards.all`; `DashboardSummaryDto[]` em `localeCompare('pt-BR', { sensitivity: 'base' })`).
**Where**: `apps/api/src/dashboards/dashboards.controller.ts`
**Depends on**: T3, T1
**Reuses**: `DashboardAccessService`, `dashboardCreateSchema`, `@RequirePermission`, `ZodValidationPipe`
**Requirement**: DASH-05, DASH-06, DASH-12, DASH-13, DASH-17, DASH-18, DASH-20, DASH-21, DASH-22

**Done when**:

- [x] Testes em `apps/api/test/dashboards/dashboards.spec.ts`: `DASH-05 cria o dashboard com o usuário como dono e a aba Aba 1` (201; `GET` traz `ownerId` do Editor, uma aba "Aba 1" sem widgets e a conexão escolhida), DASH-06 (nome com 81 caracteres dá 400 com a mensagem em `fieldErrors.name`), `DASH-12 Visualizador recebe 403 ao criar dashboard`, `DASH-13 dashboard inexistente ou fora do alcance responde 404` (UUID inexistente e dashboard de outro Editor dão 404 com "Dashboard não encontrado"), `DASH-17 só o dono e os Admins alcançam um dashboard novo` (dono e Admin recebem 200; outro Editor e um Visualizador, 404), `DASH-18 permissões do dashboard dizem quem edita e quem exclui` (dono e Admin: `edit` e `delete` verdadeiros; compartilhamento `edit`: `edit` verdadeiro e `delete` falso; `view`: os dois falsos e `cypher: null` com `hasQuery: true`), `DASH-20 Admin lista todos os dashboards com dono, conexão e última alteração em ordem de nome` (`zeta`, `Álvaro`, `beta` de donos diferentes voltam `Álvaro`, `beta`, `zeta` com `ownerName`, `connectionName` e `updatedAt`), `DASH-21 Admin abre dashboard de outro usuário com permissão de edição`, `DASH-22 Editor e Visualizador recebem 403 na lista de todos`
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): create, open and list dashboards with per-dashboard access`

---

### T5: Salvar e excluir dashboards

**What**: `PUT /api/dashboards/:id` (`assert('edit')`; transação com `UPDATE ... WHERE version = $v RETURNING`; sem linha → 409 `DASHBOARD_VERSION_CONFLICT` ou 404; apaga e reinsere abas e widgets com os ids do rascunho; id que já pertence a outro dashboard → 400; `version + 1`; `updated_at = clock.now()`) e `DELETE /api/dashboards/:id` (`assert('delete')`; 204).
**Where**: `apps/api/src/dashboards/dashboards.service.ts` (modify)
**Depends on**: T4
**Reuses**: `dashboardSaveSchema`, `DashboardAccessService`, harness de integração
**Requirement**: EDIT-02, EDIT-04, GRID-06, DASH-11, DASH-19

**Done when**:

- [x] Testes rápidos: `EDIT-02 salvar grava nome, conexão, abas, widgets e layout de uma vez` (um `PUT` com nome novo, outra conexão, duas abas e três widgets; o `GET` devolve tudo igual, com as abas na ordem enviada e `version` 2), `GRID-06 salvar grava posição e tamanho de cada widget por aba` (`{x: 4, y: 0, w: 6, h: 3}` na aba 2 volta igual na aba 2), `EDIT-04 versão desatualizada responde 409` (dois `PUT` com `version: 1`: o segundo recebe 409 com "Este dashboard foi alterado por outra pessoa. Recarregue para continuar." e o banco fica com o primeiro), `DASH-11 excluir apaga abas e widgets` (204; `GET` dá 404; nenhuma aba nem widget dele sobra), `DASH-19 quem só vê recebe 403 ao alterar ou excluir` (compartilhamento `view` recebe 403 no `PUT` e no `DELETE`; compartilhamento `edit` recebe 403 no `DELETE`), widget com id de outro dashboard dá 400 sem alterar nada
- [x] Teste de integração `apps/api/test-int/dashboards.int.spec.ts`: `EDIT-04 duas gravações simultâneas da mesma versão dão um 200 e um 409`
- [x] Gate check passes: `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `feat(api): save whole dashboards with optimistic version and delete them`

---

### T6: Guardar a organização da sidebar por usuário

**What**: `SidebarService` e `SidebarController` (`sidebar.own`): `GET /api/sidebar` monta o `SidebarDto` a partir de `sidebar_layouts` (sem os dashboards que o usuário não alcança mais ou que sumiram; com os de `sidebarDashboardIds` que faltam no fim, soltos, em ordem de criação; nomes atuais) e `PUT /api/sidebar` substitui o documento do usuário (`ON CONFLICT (user_id) DO UPDATE`), descartando dashboards fora do alcance, e devolve o `SidebarDto`.
**Where**: `apps/api/src/sidebar/sidebar.service.ts`
**Depends on**: T3, T1
**Reuses**: `DashboardAccessService.sidebarDashboardIds`, `sidebarLayoutSchema`, `FakeShareResolver`
**Requirement**: DASH-01, DASH-05, DASH-11, SIDE-02, SIDE-10, SIDE-11, SIDE-13, SIDE-17

**Done when**:

- [x] Testes em `apps/api/test/sidebar/sidebar.spec.ts`: `DASH-01 sidebar devolve os dashboards alcançáveis na ordem e nos grupos gravados` (layout com B solto, grupo "Comercial" com A, e um compartilhado C fora do layout: volta B, "Comercial" [A], C), `DASH-05 dashboard novo entra no fim da sidebar do dono`, `DASH-11 dashboard apagado sai das sidebars` (some do `GET` do dono e de quem o tinha compartilhado, mesmo estando no layout gravado), `SIDE-02 grupo com nome inválido responde 400` (nome vazio e com 41 caracteres, mensagem em `fieldErrors`), `SIDE-10 gravar a sidebar de um usuário não muda a de outro`, `SIDE-11 outra sessão do mesmo usuário recebe a mesma sidebar` (segundo login do mesmo usuário vê os grupos e a ordem gravados), `SIDE-13 Admin, Editor e Visualizador gravam a própria sidebar` (os três recebem 200 no `PUT`), `SIDE-17 a última gravação da sidebar vale` (dois `PUT` seguidos com ordens diferentes: o `GET` traz a segunda), dashboard de outro dono enviado no `PUT` não aparece
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): store each user's sidebar order and groups`

---

### T7: Recusar a exclusão de conexão usada por dashboards

**What**: Em `ConnectionsService.delete`, contar os dashboards da conexão e responder 409 `CONNECTION_IN_USE` com "Esta conexão é usada por N dashboard(s)" quando N > 0; a violação da chave estrangeira (corrida) vira a mesma resposta.
**Where**: `apps/api/src/connections/connections.service.ts` (modify)
**Depends on**: T2
**Reuses**: `AppError`, testes de conexões de `conexoes-schema`
**Requirement**: DASH-14

**Done when**:

- [x] Teste: `DASH-14 excluir conexão usada responde 409 com o número de dashboards` (conexão com dois dashboards: 409 e "Esta conexão é usada por 2 dashboard(s)", a conexão continua); conexão sem dashboards continua dando 204
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): refuse deleting a connection used by dashboards`

---

### Phase 3 tasks: Consultas na API

### T8: Validar Cypher somente leitura

**What**: `validateReadOnlyCypher(cypher, maxLength = 20_000)` e `extractParameterNames(cypher)` com o tokenizador do design (strings `'` e `"` com escape, comentários `//` e `/* */`, crases com crase dobrada; ordem tamanho → várias instruções → cláusula; palavra depois de `.` ou `$` não é cláusula; pares `LOAD CSV` e `IN TRANSACTIONS`).
**Where**: `apps/api/src/queries/read-only-cypher.ts`
**Depends on**: T1
**Reuses**: `MESSAGES`
**Requirement**: QRY-02, QRY-03, QRY-04, QRY-05, QRY-09, QRY-10, QRY-15

**Done when**:

- [ ] Testes em `apps/api/test/queries/read-only-cypher.spec.ts`: `QRY-02 recusa cada cláusula bloqueada com a mensagem` (uma consulta por cláusula: `CREATE (n)`, `MATCH (n) MERGE (m)`, `MATCH (n) DETACH DELETE n`, `MATCH (n) SET n.a = 1`, `MATCH (n) REMOVE n.a`, `DROP INDEX i`, `ALTER DATABASE x SET ACCESS READ ONLY`, `RENAME ROLE a TO b`, `GRANT ROLE a TO b`, `DENY ...`, `REVOKE ...`, `LOAD CSV FROM 'x' AS l RETURN l`, `FOREACH (x IN [1] | ...)`, `CALL { ... } IN TRANSACTIONS`, cada uma com "Somente consultas de leitura são permitidas. Cláusula bloqueada: <cláusula>"), `QRY-03 cláusulas bloqueadas sem diferenciar maiúsculas` (`create`, `Create`, `load csv`), `QRY-04 palavra bloqueada em string, comentário ou crases é aceita` (`RETURN "CREATE" AS texto`, `RETURN 'it''s SET'`, `RETURN "a\"DELETE"`, `// CREATE` e `/* MERGE */` antes de `RETURN 1`, ``MATCH (n:`CREATE`) RETURN n``, `RETURN n.set`), `QRY-05 mais de uma instrução é recusada` (`RETURN 1; RETURN 2` dá "Envie uma consulta por vez"; `RETURN 1;` e `RETURN ';'` passam), `QRY-09 Cypher com mais de 20000 caracteres é recusado` (20.001 dá "A consulta passa de 20.000 caracteres"; vem antes das outras recusas), `QRY-15 CREATE dentro de um nome maior é aceito` (`RETURN n.created_at`, `CALL db.createLabel('X')`, `MATCH (n) WHERE n.resetting RETURN n`), QRY-10 (`extractParameterNames` de `MATCH (n) WHERE n.a = $loja AND n.b = $loja OR n.c = $ano RETURN '$texto'` é `['loja', 'ano']`)
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): validate read-only cypher outside strings and comments`

---

### T9: Converter valores do resultado sem perda

**What**: `toResultValue(value)` conforme as regras do design (`Integer` seguro vira número, fora de ±(2^53 − 1) vira `{ kind: 'bigint' }`; temporais e `Point` por `toString()`; nó, relacionamento, caminho, lista e mapa viram `{ kind: 'json' }` com inteiros em dígitos crus).
**Where**: `apps/api/src/queries/result-value.ts`
**Depends on**: T1
**Reuses**: tipos de `neo4j-driver` (`Integer`, `Node`, `Relationship`, `Path`, `Date`, `DateTime`, `Point`)
**Requirement**: TBL-06, TBL-08

**Done when**:

- [ ] Testes em `apps/api/test/queries/result-value.spec.ts`: `TBL-06 nó, relacionamento, lista e mapa viram texto JSON` (nó `:Loja {nome: 'Centro'}` vira `{ kind: 'json' }` cujo texto, lido com `JSON.parse`, é `{ labels: ['Loja'], properties: { nome: 'Centro' } }`; relacionamento `:FEZ`; lista `[1, 'a']`; mapa `{a: {b: 2}}`), `TBL-08 inteiro acima de 2^53 mantém todos os dígitos` (`Integer` `9007199254740993` vira `{ kind: 'bigint', value: '9007199254740993' }`; dentro de um mapa, o texto JSON contém `9007199254740993`), `Integer` 42 vira o número 42, `null` fica `null`, `Date` vira `'2024-02-05'`
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): convert neo4j result values to lossless json`

---

### T10: Executar consultas com limites, erros traduzidos e log

**What**: `QueryService.run` conforme o design: validação, conexão (`CONNECTION_NOT_FOUND`), senha por `CryptoService.decrypt`, `null` nos parâmetros sem valor, `gateway.read` com `QUERY_TIMEOUT_MS` e `maxRows: QUERY_MAX_ROWS + 1`, corte com `truncated`, conversão por `toResultValue`, tabela de erros do design, `maskErrors`, uma linha de log por execução. Tokens `QUERY_TIMEOUT_MS` e `QUERY_MAX_ROWS` lidos de `NINBI_QUERY_TIMEOUT_MS` (padrão `30000`) e `NINBI_QUERY_MAX_ROWS` (padrão `5000`) em `env.ts`. Acrescenta `code?: string` a `Neo4jGatewayError` (preenchido com o `code` do erro do driver) e garante que `maxRows` corta em vez de lançar, se o gateway de `conexoes-schema` não fizer isso.
**Where**: `apps/api/src/queries/query.service.ts`
**Depends on**: T8, T9
**Reuses**: `Neo4jGateway`, `FakeNeo4jGateway`, `CryptoService`, `validateReadOnlyCypher`, `extractParameterNames`, `toResultValue`
**Requirement**: QRY-02, QRY-06, QRY-07, QRY-08, QRY-10, QRY-13, QRY-14

**Done when**:

- [ ] Testes em `apps/api/test/queries/query.service.spec.ts`: `QRY-02 Cypher de escrita não chega ao Neo4j` (`CREATE (n)` lança 400 `QUERY_WRITE_BLOCKED` e `fake.calls` fica vazio), `QRY-06 recusa de escrita do Neo4j mostra Somente consultas de leitura são permitidas` (fake rejeita com `Neo4jGatewayError` de `code` `Neo.ClientError.Statement.AccessMode`: 422 com a mensagem), `QRY-07 consulta que passa do prazo responde A consulta excedeu o tempo limite` (fake pendurado com `QUERY_TIMEOUT_MS` de 1.000 ms: 422 `QUERY_TIMEOUT` com "A consulta excedeu o tempo limite de 1 s" em menos de 3 s), `QRY-07 prazo padrão é 30 s` (sem as variáveis, os tokens valem `30000` e `5000`, e o `read` recebe `timeoutMs: 30000` e `maxRows: 5001`), `QRY-08 resultado com mais linhas que o limite devolve as primeiras e marca truncated` (`QUERY_MAX_ROWS` 3 e fake com 4 linhas: 3 linhas, `truncated: true`, `rowLimit: 3`), `QRY-10 parâmetro sem valor é enviado como null` (`WHERE n.uf = $uf` chega ao fake com `{ uf: null }`; com `params: { uf: 'SP' }` chega `'SP'`), `QRY-13 Neo4j inacessível mostra Não foi possível conectar ao banco` (`code` `ServiceUnavailable`: 422 "Não foi possível conectar ao banco Vendas"), `QRY-14 log de execução tem usuário, conexão, widget, duração, linhas e resultado sem as linhas` (linha com `user=`, `connection=`, `widget=`, `durationMs=`, `rows=2`, `result=ok`; não contém nenhum valor das linhas nem o Cypher; recusa registra `result=blocked`), outro erro do Neo4j dá 422 `QUERY_FAILED` com a mensagem original e, com `maskErrors`, "Não foi possível carregar este widget"
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): run read-only queries with timeout, row limit and logging`

---

### T11: Expor a execução por texto e por widget

**What**: `QueriesController`: `POST /api/dashboards/:id/query` (`assert('edit')`; `queryRunSchema`; `connectionId` opcional substitui a conexão do dashboard) e `POST /api/dashboards/:id/widgets/:widgetId/run` (`assert('view')`; Cypher e conexão salvos; widget de outro dashboard → 404 `WIDGET_NOT_FOUND`; widget sem Cypher → 400; `maskErrors` quando o usuário não pode editar).
**Where**: `apps/api/src/queries/queries.controller.ts`
**Depends on**: T10, T3
**Reuses**: `DashboardAccessService`, `QueryService`, `FakeShareResolver`
**Requirement**: WDG-02, QRY-11, QRY-12, QRY-16, TBL-12, EDIT-10

**Done when**:

- [ ] Testes em `apps/api/test/queries/queries.spec.ts`: `WDG-02 executa o Cypher enviado na conexão do dashboard` (o fake recebeu a URI da conexão do dashboard e o Cypher do corpo; a resposta traz `columns` e `rows`), `QRY-11 quem não pode editar recebe 403 ao executar texto` (compartilhamento `view` recebe 403 em `.../query`), `QRY-12 quem só vê executa o widget salvo pelo id` (compartilhamento `view` recebe 200 em `.../widgets/:wid/run` e o fake recebeu o Cypher salvo; o corpo não aceita `cypher`), `QRY-16 quem não alcança recebe 404 ao executar widget` (outro Editor recebe 404 nas duas rotas), `TBL-12 quem só vê recebe a mensagem genérica de erro` (fake rejeita com mensagem do Neo4j: quem só vê recebe "Não foi possível carregar este widget", o dono recebe a mensagem do Neo4j), `EDIT-10 quem edita executa o texto em outra conexão` (`connectionId` de outra conexão leva o fake à URI dela), widget de outro dashboard dá 404
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): expose query execution by text for editors and by widget for viewers`

---

### T12: Provar a execução contra o Neo4j real

**What**: Testes de integração em `apps/api/test-int/queries.int.spec.ts` que sobem o app com o gateway real, uma conexão para o Neo4j do compose de dev e um dashboard, e executam pelas rotas. Ajustes de código que esses testes revelarem (código real do erro de escrita, corte de `maxRows`) entram nesta task.
**Where**: `apps/api/test-int/queries.int.spec.ts`
**Depends on**: T11
**Reuses**: harness de integração, dataset "Varejo", `DriverNeo4jGateway`
**Requirement**: QRY-01, QRY-06, QRY-07, QRY-08, QRY-13

**Done when**:

- [ ] Testes: `QRY-01 procedimento de escrita é recusado pela transação de leitura e nada é criado` (`CALL db.createLabel('NinbiProbe')` passa no validador, falha no Neo4j, e `CALL db.labels()` não lista `NinbiProbe`), `QRY-06 Neo4j real recusa CALL db.createLabel com a mensagem de leitura` (422 com "Somente consultas de leitura são permitidas"), `QRY-07 produto cartesiano no Neo4j real para no prazo` (`NINBI_QUERY_TIMEOUT_MS` de 1.000 e `MATCH (a), (b), (c) RETURN count(*)`: 422 `QUERY_TIMEOUT` em menos de 10 s), `QRY-08 UNWIND de 6000 linhas devolve 5000` (`UNWIND range(1, 6000) AS i RETURN i`: 5.000 linhas e `truncated: true`), `QRY-13 porta fechada mostra Não foi possível conectar ao banco` (conexão inserida com `bolt://localhost:1`: 422 com o nome da conexão); `MATCH (l:Loja) RETURN l.nome AS nome ORDER BY nome` devolve 12 linhas
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `test(api): prove read-only execution, timeout and limits on real neo4j`

---

### Phase 4 tasks: Widget de tabela no web

### T13: Mostrar o resultado em tabela com ordenação e páginas

**What**: `src/features/widgets/table-rules.ts` (`compareValues`, `sortRows(rows, column, direction)`, `nextSort` crescente → decrescente → original, `paginate(rows, page, 50)`, `formatCell`) e `ResultTable` conforme o design (colunas na ordem de `columns`, inclusive repetidas; cabeçalho clicável com `aria-sort`; "Página X de Y", "Página anterior", "Próxima página"; contêiner `overflow-auto` com `thead` `sticky top-0`; "—" para nulo; aviso de corte com `MESSAGES.rowsTruncated(rowLimit)`). Fixtures `src/test/fixtures/dashboards.ts` com `QueryResultDto` de exemplo. Dependências do web desta feature instaladas aqui: `react-grid-layout`, `react-simple-code-editor`, `prismjs` (e `@types/prismjs`).
**Where**: `apps/web/src/features/widgets/ResultTable.tsx`
**Depends on**: T1
**Reuses**: shadcn `table`, `button`, tipos de `@ninbi/contracts`
**Requirement**: TBL-01, TBL-02, TBL-03, TBL-04, TBL-05, TBL-06, TBL-07, TBL-08, TBL-16, QRY-08

**Done when**:

- [ ] Testes de `table-rules.test.ts`: `TBL-03 números por valor, textos em ordem do português e nulos por último` (`[10, 9, null, 100]` crescente dá `9, 10, 100, null` e decrescente `100, 10, 9, null`; `['Ébano', 'abacate', 'Zebra', null]` crescente dá `abacate, Ébano, Zebra, null`; `bigint` `9007199254740993` fica depois de `9007199254740992`)
- [ ] Testes de `ResultTable.test.tsx` com gesto: `TBL-01 tabela tem uma coluna por chave na ordem do RETURN`, `TBL-02 clicar no cabeçalho alterna crescente, decrescente e original` (três cliques em "total" mostram a ordem crescente, a decrescente e a original, ordenando todas as linhas e não só a página), `TBL-04 mais de 50 linhas mostra Página X de Y e navega` (120 linhas: 50 linhas e "Página 1 de 3"; "Próxima página" mostra a linha 51 e "Página 2 de 3"; com 50 linhas não há paginação), `TBL-05 linhas rolam dentro do card com cabeçalho fixo` (contêiner com `overflow-auto`; `thead` com `sticky` e `top-0`), `TBL-06 valor JSON aparece como texto na célula`, `TBL-07 valor nulo mostra travessão` ("—"), `TBL-08 inteiro grande aparece com todos os dígitos` ("9007199254740993"), `TBL-16 colunas com o mesmo nome aparecem as duas`, `QRY-08 resultado cortado mostra Mostrando as primeiras 5.000 linhas`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add sortable, paginated result table`

---

### T14: Criar o card do widget e os estados da consulta

**What**: `src/features/dashboards/api.ts` com `runWidget` e `runQuery` (passam o `signal` ao `apiFetch`); `useWidgetResult` (chaves e `staleTime: Infinity` do design; não executa quando o widget não tem consulta); `WidgetCard` (card `bg-card rounded-card` com o título no topo; esqueleto; "A consulta não retornou dados"; erro com a `message` da API e "Tentar novamente"; "Widget sem consulta"; `ResultTable`).
**Where**: `apps/web/src/features/widgets/WidgetCard.tsx`
**Depends on**: T13
**Reuses**: `apiFetch`, `ApiError`, `ResultTable`, shadcn `card`, `skeleton`, `button`
**Requirement**: GRID-07, TBL-09, TBL-10, TBL-11, TBL-12, TBL-14

**Done when**:

- [ ] Testes com gesto em `WidgetCard.test.tsx`: `GRID-07 widget é um card do tema com o título no topo` (elemento com `bg-card` e `rounded-card` cujo primeiro texto é o título), `TBL-09 esqueleto no card enquanto a consulta roda`, `TBL-10 consulta sem linhas mostra A consulta não retornou dados`, `TBL-11 erro mostra a mensagem e Tentar novamente para quem edita` (422 com a mensagem do Neo4j mostra essa mensagem; clicar em "Tentar novamente" com o handler já em 200 mostra a tabela), `TBL-12 erro mostra Não foi possível carregar este widget para quem só vê` (widget de quem não edita, 422 com a mensagem genérica: mostra "Não foi possível carregar este widget" e "Tentar novamente", sem nenhum Cypher), `TBL-14 widget sem Cypher mostra Widget sem consulta` (nenhuma requisição sai)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): add widget card with loading, empty and error states`

---

### Phase 5 tasks: Sidebar no web

### T15: Listar dashboards e grupos na sidebar

**What**: `useSidebar` em `src/features/dashboards/api.ts`; `SidebarDashboards` dentro da lista rolável da `Sidebar` (esqueleto; erro com "Tentar novamente"; dashboards soltos e grupos; link para `/dashboards/<id>` com `aria-current="page"` e o gradiente no ativo; nome com `truncate` e `title`; cabeçalho do grupo como botão com `aria-expanded`, estado em `localStorage['ninbi-sidebar-collapsed']`; "Grupo vazio"; botões "Novo dashboard", só com `dashboards.create`, e "Novo grupo", ainda sem ação); `HomePage` passa a mostrar "Nenhum dashboard ainda" só quando a sidebar não tem dashboard, e "Escolha um dashboard na barra lateral" quando tem. Handler MSW padrão de `GET /api/sidebar` devolvendo a sidebar vazia em `renderApp`, para os testes de `fundacao-auth` seguirem verdes.
**Where**: `apps/web/src/features/sidebar/SidebarDashboards.tsx`
**Depends on**: T14
**Reuses**: `Sidebar`, `can()`, `NavLink`, fixtures de dashboards, padrão de esqueleto e erro de `UsersTab`
**Requirement**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-08, DASH-09, SIDE-07, SIDE-14, SIDE-15, SIDE-16

**Done when**:

- [ ] Testes com gesto: `DASH-01 sidebar mostra os dashboards soltos e os grupos na ordem da API`, `DASH-02 sem dashboards a página inicial mostra Nenhum dashboard ainda` (e, com um dashboard, mostra "Escolha um dashboard na barra lateral"), `DASH-03 esqueleto na sidebar enquanto a lista carrega`, `DASH-04 erro na sidebar mostra Não foi possível carregar os dashboards e Tentar novamente recarrega`, `DASH-08 clicar no dashboard da sidebar marca o item ativo` (URL vira `/dashboards/<id>`; o link fica com `aria-current="page"` e a classe do gradiente), `DASH-09 Novo dashboard aparece só para Admin e Editor` (Visualizador não vê; os três veem "Novo grupo"), `SIDE-07 clicar no cabeçalho recolhe e expande o grupo` (os dashboards do grupo somem e voltam; remontar mantém recolhido), `SIDE-14 grupo sem dashboards mostra Grupo vazio`, `SIDE-15 nome longo é cortado com reticências e mostra o nome inteiro no title` (classe `truncate` e `title` igual ao nome, para dashboard e para grupo), `SIDE-16 lista de dashboards e grupos rola na vertical` (o contêiner da lista tem `overflow-y-auto`)
- [ ] Testes SHELL-07 e de sidebar de `fundacao-auth` continuam verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): list dashboards and collapsible groups in the sidebar`

---

### T16: Reorganizar a sidebar arrastando

**What**: `src/features/sidebar/layout.ts` com `moveItem`, `addGroup`, `renameGroup` e `removeGroup` (puras, do design); arrastar nativo do HTML5 em `SidebarDashboards` (soltar sobre um item põe antes dele no mesmo contêiner; no cabeçalho do grupo, no fim do grupo; na faixa final, no fim e solto; grupo nunca entra em grupo); `useSaveSidebar` aplica a mudança na hora, envia `PUT /api/sidebar` e, em erro, volta ao layout anterior e mostra o toast "Não foi possível salvar a organização".
**Where**: `apps/web/src/features/sidebar/layout.ts`
**Depends on**: T15
**Reuses**: `SidebarDashboards`, `sonner`, `sidebarLayoutSchema`
**Requirement**: SIDE-03, SIDE-04, SIDE-05, SIDE-06, SIDE-09, SIDE-12

**Done when**:

- [ ] Testes de `layout.test.ts`: `SIDE-03 moveItem põe o item antes do alvo` (A, B, C: mover C antes de A dá C, A, B), `SIDE-09 removeGroup solta os dashboards na posição do grupo` (A, grupo [B, C], D vira A, B, C, D), grupo movido para dentro de grupo fica antes do grupo alvo
- [ ] Testes com gesto (`fireEvent.dragStart`, `dragOver`, `drop`): `SIDE-03 arrastar um dashboard o mantém na posição em que foi solto` (a ordem na tela muda e o `PUT` leva a ordem nova), `SIDE-04 arrastar um dashboard para dentro de um grupo` (soltar sobre um dashboard do grupo o põe antes dele, dentro do grupo; soltar no cabeçalho põe no fim do grupo), `SIDE-05 arrastar um dashboard para fora de um grupo` (soltar sobre um item solto o põe solto antes dele), `SIDE-06 arrastar um grupo move o grupo com os dashboards`, `SIDE-12 falha ao gravar volta o item e mostra Não foi possível salvar a organização` (`PUT` com 500: a ordem anterior volta à tela e o toast aparece)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): reorder sidebar dashboards and groups by drag and drop`

---

### T17: Criar, renomear e excluir grupos

**What**: `GroupDialogs`: "Novo grupo" abre o diálogo com o campo "Nome" (1 a 40, `sidebarLayoutSchema`) e cria o grupo no fim (`addGroup` com `crypto.randomUUID()`); o menu do grupo tem "Renomear grupo" (mesmo diálogo, preenchido) e "Excluir grupo" (`removeGroup`, sem confirmação); cada ação grava pela mesma rotina da T16.
**Where**: `apps/web/src/features/sidebar/GroupDialogs.tsx`
**Depends on**: T16
**Reuses**: `layout.ts`, `useSaveSidebar`, shadcn `dialog`, `dropdown-menu`, `form`
**Requirement**: SIDE-01, SIDE-02, SIDE-08, SIDE-09

**Done when**:

- [ ] Testes com gesto: `SIDE-01 Novo grupo cria um grupo no fim da sidebar` (digitar "Comercial" e salvar: o grupo aparece por último, com "Grupo vazio", e o `PUT` o contém), `SIDE-02 nome de grupo inválido mostra a mensagem no campo` (vazio dá "Informe o nome"; 41 caracteres dão "O nome pode ter até 40 caracteres"; nenhuma requisição sai), `SIDE-08 renomear o grupo mostra o novo nome` ("Comercial" vira "Vendas"), `SIDE-09 Excluir grupo solta os dashboards na posição do grupo` (os dois dashboards do grupo aparecem soltos onde o grupo estava; nenhum `DELETE` de dashboard sai)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): create, rename and delete sidebar groups`

---

### T18: Criar o diálogo "Novo dashboard"

**What**: `NewDashboardDialog` aberto por "Novo dashboard" da sidebar: "Nome" e "Conexão" (select com `useConnections`); sem conexões, o aviso "Cadastre uma conexão antes de criar um dashboard" e "Criar" desabilitado; "Criar" desabilitado durante o envio; `fieldErrors` no campo; sucesso invalida a sidebar e abre `/dashboards/<id>?editar=1`. Hook `useCreateDashboard` em `api.ts`. Enquanto a página do dashboard não existe (T19), o teste confere a URL.
**Where**: `apps/web/src/features/dashboards/NewDashboardDialog.tsx`
**Depends on**: T15
**Reuses**: `dashboardCreateSchema`, `useConnections`, `NewUserDialog` (padrão), shadcn `dialog`, `select`, `form`
**Requirement**: DASH-05, DASH-06, DASH-07, DASH-16

**Done when**:

- [ ] Testes com gesto: `DASH-05 Novo dashboard cria o dashboard e abre a URL de edição` (preencher "Vendas", escolher a conexão e criar envia `{ name, connectionId }`; a URL vira `/dashboards/<id>?editar=1`; a sidebar é buscada de novo), `DASH-06 nome inválido mostra a mensagem no campo Nome sem enviar` (vazio e 81 caracteres), `DASH-07 sem conexões mostra o aviso e mantém Criar desabilitado`, `DASH-16 dois cliques em Criar enviam um único pedido` (com a resposta pendente, "Criar" está desabilitado e o handler foi chamado uma vez)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): add new dashboard dialog`

---

### Phase 6 tasks: Página do dashboard

### T19: Abrir o dashboard em modo de visualização

**What**: Rota `/dashboards/:dashboardId` com `DashboardPage` (esqueleto; 404 → "Dashboard não encontrado" + link "Ir para a página inicial"; qualquer 404 `DASHBOARD_NOT_FOUND` posterior troca a página por essa mensagem; cabeçalho com o nome e "Atualizar"; "Editar" como ação da TopBar só com `permissions.edit`, ainda sem ação; menu "Mais ações" só com `permissions.delete`), `DashboardTabsBar` em visualização (abas na ordem, ativa com `aria-selected`, contêiner `overflow-x-auto whitespace-nowrap`), e `DashboardGrid` em visualização (`react-grid-layout` com `isDraggable` e `isResizable` falsos, `WidgetCard` por widget, "Esta aba está vazia"). Só a aba ativa monta os widgets; "Atualizar" invalida só as chaves da aba ativa; o `signal` cancela consultas ao sair da aba ou da página. Hook `useDashboard` em `api.ts`.
**Where**: `apps/web/src/features/dashboards/DashboardPage.tsx`
**Depends on**: T14, T15
**Reuses**: `WidgetCard`, `useWidgetResult`, `useTopBarAction`, shadcn `tabs`, `dropdown-menu`, `skeleton`, fixtures de dashboards
**Requirement**: DASH-08, DASH-13, DASH-15, DASH-18, TAB-01, TAB-02, TAB-07, TAB-08, GRID-04, TBL-13, TBL-15, TBL-17

**Done when**:

- [ ] Testes com gesto em `DashboardPage.test.tsx`: `DASH-08 abrir o dashboard mostra a primeira aba em visualização` (clicar no item da sidebar mostra a primeira aba selecionada, só os widgets dela e nenhum "Salvar"), `DASH-13 URL de dashboard inexistente mostra Dashboard não encontrado com link para a página inicial` (clicar no link abre `/`), `DASH-15 dashboard excluído por outra pessoa mostra Dashboard não encontrado na próxima ação` (depois de carregar, "Atualizar" recebe 404 `DASHBOARD_NOT_FOUND` e a página mostra a mensagem), `DASH-18 Editar e Excluir aparecem só para quem pode` (com `edit` e `delete` falsos nenhum aparece; com `edit` só "Editar"; com os dois, "Editar" e "Excluir" no menu), `TAB-01 clicar numa aba mostra os widgets dela e a marca como ativa`, `TAB-02 a primeira exibição de uma aba executa as consultas dos widgets dela` (abrir executa só os widgets da aba 1; clicar na aba 2 executa os dela; voltar à aba 1 não executa de novo), `TAB-07 aba sem widgets mostra Esta aba está vazia`, `TAB-08 barra de abas rola na horizontal sem quebrar linha` (`overflow-x-auto` e `whitespace-nowrap`), `GRID-04 em visualização não dá para arrastar nem redimensionar` (nenhum widget tem a classe de arrasto do `react-grid-layout` nem alça de redimensionar), `TBL-13 widget com erro não impede os demais` (três widgets: um com dados, um vazio, um com erro; os três estados aparecem), `TBL-15 Atualizar executa de novo os widgets da aba ativa` (só os da aba ativa são chamados de novo), `TBL-17 resultado que chega depois de trocar de aba ou sair é descartado` (com a consulta da aba 1 pendente, ir para a aba 2 aborta o pedido, `request.signal.aborted`; voltar mostra o resultado de um pedido novo; sair para `/` com consulta pendente também aborta)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): open dashboards with tabs and table widgets in view mode`

---

### T20: Excluir o dashboard com confirmação

**What**: `DeleteDashboardDialog` aberto por "Excluir" do menu "Mais ações": "Excluir o dashboard <nome>? Abas e widgets serão apagados. Esta ação não pode ser desfeita." com "Excluir" e "Cancelar"; confirmar chama `DELETE` (`useDeleteDashboard`), invalida a sidebar e abre `/`.
**Where**: `apps/web/src/features/dashboards/DeleteDashboardDialog.tsx`
**Depends on**: T19
**Reuses**: `ConnectionRowActions` (padrão), shadcn `alert-dialog`
**Requirement**: DASH-10, DASH-11

**Done when**:

- [ ] Testes com gesto: `DASH-10 Excluir pede confirmação com o nome do dashboard` (mostra o texto exato com "Vendas"; "Cancelar" fecha sem requisição), `DASH-11 confirmar a exclusão tira o dashboard da sidebar e abre a página inicial` (o `DELETE` sai, "Vendas" some da sidebar e a página inicial aparece)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): delete dashboards after confirmation`

---

### T21: Avisar que a conexão é usada por dashboards

**What**: Em `ConnectionRowActions`, um 409 `CONNECTION_IN_USE` ao confirmar "Excluir" mostra a `message` da API no diálogo, e a conexão continua na lista.
**Where**: `apps/web/src/features/connections/ConnectionRowActions.tsx` (modify)
**Depends on**: T7
**Reuses**: testes de `ConnectionRowActions` de `conexoes-schema`
**Requirement**: DASH-14

**Done when**:

- [ ] Teste com gesto: `DASH-14 excluir conexão usada mostra Esta conexão é usada por` (409 com "Esta conexão é usada por 2 dashboard(s)": a mensagem aparece e "Vendas" continua na lista)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): show when a connection is still used by dashboards`

---

### Phase 7 tasks: Edição do dashboard

### T22: Criar o rascunho do dashboard

**What**: `src/features/dashboards/draft.ts` com as funções puras do design (`fromDto`, `toSavePayload`, `addTab`, `renameTab`, `removeTab`, `addWidget`, `updateWidget`, `removeWidget`, `setLayout`, `setName`, `setConnection`, `isDirty`); ids novos por `crypto.randomUUID()` injetável no teste.
**Where**: `apps/web/src/features/dashboards/draft.ts`
**Depends on**: T1
**Reuses**: tipos e `dashboardSaveSchema` de `@ninbi/contracts`
**Requirement**: TAB-03, GRID-05, EDIT-08, WDG-05, WDG-09

**Done when**:

- [ ] Testes de `draft.test.ts`: `TAB-03 addTab nomeia a aba com o número de abas` (com duas abas, a nova é "Aba 3"; depois de excluir uma e adicionar, o nome segue o número de abas), `GRID-05 addWidget põe o widget 4 por 4 abaixo do último` (aba com widgets até `y + h = 7`: o novo é "Novo widget" em `{x: 0, y: 7, w: 4, h: 4}`; aba vazia: `y: 0`), `EDIT-08 setName e setConnection alteram o rascunho` (e `isDirty` passa a verdadeiro; voltar ao valor original volta a falso), `WDG-05 updateWidget troca título e Cypher`, `WDG-09 removeWidget tira o widget da aba`, `toSavePayload` passa em `dashboardSaveSchema` e leva a `version` do DTO
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add pure dashboard draft operations`

---

### T23: Entrar em edição, salvar e descartar

**What**: `useDashboardEditor` e a integração na `DashboardPage`: "Editar" entra em edição (também com `?editar=1`), mostra "Salvar" (ação da TopBar) e "Descartar", e os campos "Nome" e "Conexão" do dashboard; os widgets em edição executam por `runQuery` com o Cypher e a conexão do rascunho; "Salvar" envia `toSavePayload` (`useSaveDashboard`), fica desabilitado durante o envio e volta à visualização com o DTO novo; 500 mantém a edição com "Não foi possível salvar. Tente novamente."; 409 mostra a mensagem da API; "Descartar" com mudanças pede "Descartar as alterações?"; `useBlocker` e `beforeunload` pedem "Sair sem salvar as alterações?".
**Where**: `apps/web/src/features/dashboards/useDashboardEditor.ts`
**Depends on**: T22, T19
**Reuses**: `draft.ts`, `useConnections`, `useTopBarAction`, shadcn `alert-dialog`, `select`, `input`
**Requirement**: DASH-05, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, EDIT-09, EDIT-10

**Done when**:

- [ ] Testes com gesto em `DashboardEditMode.test.tsx`: `EDIT-01 Editar entra em modo de edição com Salvar e Descartar`, `DASH-05 abrir com editar=1 mostra o dashboard já em modo de edição` (sem `permissions.edit`, o parâmetro é ignorado), `EDIT-02 Salvar envia o rascunho inteiro e volta à visualização` (mudar o nome e salvar: o `PUT` leva `version`, nome, conexão, abas e widgets; "Editar" volta a aparecer com o nome novo), `EDIT-03 falha ao salvar mantém a edição e mostra Não foi possível salvar` (500: a mensagem aparece, o nome digitado continua e "Salvar" continua na tela), `EDIT-04 409 mostra Este dashboard foi alterado por outra pessoa`, `EDIT-05 Descartar com alterações pede confirmação` (sem alterações, "Descartar" sai direto), `EDIT-06 confirmar o descarte volta ao último estado salvo`, `EDIT-07 sair da página com alterações pede confirmação` (clicar em outro dashboard da sidebar mostra "Sair sem salvar as alterações?"; "Cancelar" fica; confirmar navega), `EDIT-08 alterar nome e conexão muda o rascunho` (o nome aparece no cabeçalho e a conexão no select antes de salvar), `EDIT-09 Salvar fica desabilitado durante a gravação`, `EDIT-10 trocar a conexão executa de novo os widgets da aba ativa` (os `POST .../query` levam o `connectionId` novo)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add dashboard edit mode with save, discard and leave guard`

---

### T24: Editar as abas

**What**: `DashboardTabsBar` em edição: "Nova aba" (`addTab`, ativa a nova); menu da aba com "Renomear aba" (diálogo "Nome", 1 a 40) e "Excluir aba" (desabilitado com uma aba só; com widgets, confirmação "Excluir a aba <nome> e seus N widgets?"; sem widgets, exclui direto).
**Where**: `apps/web/src/features/dashboards/DashboardTabsBar.tsx` (modify)
**Depends on**: T23
**Reuses**: `draft.ts`, shadcn `dropdown-menu`, `dialog`, `alert-dialog`
**Requirement**: TAB-03, TAB-04, TAB-05, TAB-06

**Done when**:

- [ ] Testes com gesto: `TAB-03 Nova aba adiciona Aba N e a ativa` (com uma aba, aparece "Aba 2" selecionada e vazia), `TAB-04 renomear a aba mostra o novo nome` ("Aba 1" vira "Vendas"; nome vazio mostra "Informe o nome" e 41 caracteres mostram "O nome pode ter até 40 caracteres"), `TAB-05 Excluir aba com widgets pede confirmação com o nome e o número de widgets` ("Excluir a aba Vendas e seus 3 widgets?"; confirmar tira a aba), `TAB-06 Excluir aba fica desabilitado com uma aba só`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add, rename and delete dashboard tabs in edit mode`

---

### T25: Arrastar e redimensionar widgets na grade

**What**: `DashboardGrid` em edição: 12 colunas, `compactType: 'vertical'`, sem sobreposição, `minW: 2`, `minH: 2`, `maxW: 12`, `isDraggable` e `isResizable` verdadeiros, alça de arrasto no título; `onLayoutChange` chama `setLayout` no rascunho; botão "Novo widget" (`addWidget` na aba ativa); hook `useContainerWidth` (ResizeObserver) que o teste fixa em 1.200 px. O editor do widget aberto por "Novo widget" é um marcador até a T26.
**Where**: `apps/web/src/features/dashboards/DashboardGrid.tsx` (modify)
**Depends on**: T23
**Reuses**: `react-grid-layout`, `draft.ts`, `WidgetCard`
**Requirement**: GRID-01, GRID-02, GRID-03, GRID-04, GRID-05, GRID-06

**Done when**:

- [ ] Testes com gesto em `DashboardGrid.test.tsx` (largura 1.200 px; `mousedown`, `mousemove`, `mouseup` na alça): `GRID-01 grade tem 12 colunas` (widget com `w: 6` ocupa metade da largura no estilo calculado), `GRID-02 arrastar um widget o põe na célula solta sem sobreposição` (arrastar A para cima de B: depois de salvar, o `PUT` traz A na coluna de destino e B deslocado para baixo, sem retângulos sobrepostos), `GRID-03 redimensionar respeita 2 por 2 no mínimo e 12 colunas no máximo` (puxar a alça para muito pequeno para em `w: 2, h: 2`; para muito largo, em `w: 12`), `GRID-04` continua valendo (fora da edição não há alça), `GRID-05 Novo widget adiciona um widget 4 por 4 no fim da aba e abre o editor` ("Novo widget" aparece abaixo do último e o editor abre), `GRID-06 posição e tamanho arrastados vão no Salvar`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): drag and resize widgets on a 12 column grid`

---

### T26: Editar o widget com o editor de Cypher

**What**: `CypherEditor` (`react-simple-code-editor` + `prismjs` com `prism-cypher`; `aria-label="Cypher"`; classes de token ligadas a variáveis do tema) e `WidgetEditorDialog` aberto por "Editar widget" do card em edição e por "Novo widget": "Título", Cypher, "Executar" (desabilitado vazio; "Executando..." e desabilitado durante a execução; `runQuery` com a conexão do rascunho), prévia com `ResultTable` ou a mensagem de erro, "Aplicar" (valida o título; `updateWidget`) e "Cancelar".
**Where**: `apps/web/src/features/widgets/WidgetEditorDialog.tsx`
**Depends on**: T23
**Reuses**: `ResultTable`, `runQuery`, `draft.ts`, shadcn `dialog`, `form`, `input`
**Requirement**: WDG-01, WDG-02, WDG-03, WDG-04, WDG-05, WDG-06, WDG-07, WDG-10

**Done when**:

- [ ] Testes com gesto: `WDG-01 Editar widget abre Título, editor de Cypher com realce, Executar e prévia` (o Cypher `MATCH (n) RETURN n` digitado gera elementos com a classe `token keyword` para `MATCH` e `RETURN`), `WDG-02 Executar mostra o resultado em tabela na prévia` (digitar `MATCH (n) RETURN labels(n) AS label, count(*) AS total` e executar: o `POST .../query` leva esse texto e a conexão do rascunho; a prévia mostra as colunas "label" e "total"), `WDG-03 falha na execução mostra o erro na prévia e mantém o Cypher` (400 com "Somente consultas de leitura são permitidas. Cláusula bloqueada: CREATE" aparece e o editor continua com o texto), `WDG-04 Executar fica desabilitado com o editor vazio`, `WDG-05 Aplicar fecha o editor e atualiza título e Cypher do widget` (o card mostra o título novo e executa o Cypher novo), `WDG-06 Cancelar fecha o editor sem alterar o widget`, `WDG-07 título inválido recusa Aplicar com a mensagem no campo Título` (vazio e 81 caracteres), `WDG-10 durante a execução mostra Executando e Executar fica desabilitado`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add widget editor with highlighted cypher and preview`

---

### T27: Remover widget com confirmação

**What**: Menu do `WidgetCard` em edição com "Editar widget" (abre o `WidgetEditorDialog`) e "Remover widget" (alert-dialog "Remover o widget <título>?"; confirmar chama `removeWidget` no rascunho).
**Where**: `apps/web/src/features/widgets/WidgetCard.tsx` (modify)
**Depends on**: T25
**Reuses**: `draft.ts`, shadcn `dropdown-menu`, `alert-dialog`
**Requirement**: WDG-08, WDG-09

**Done when**:

- [ ] Testes com gesto: `WDG-08 Remover widget pede confirmação com o título` ("Remover o widget Vendas por loja?"; "Cancelar" mantém o widget), `WDG-09 confirmar a remoção tira o widget do rascunho` (o card some e o `PUT` do "Salvar" não o contém); fora da edição o menu não aparece
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): remove widgets from the draft after confirmation`

---

### Phase 8 tasks: Administração

### T28: Listar todos os dashboards na aba "Dashboards"

**What**: Entrada `{ id: 'dashboards', label: 'Dashboards', permission: 'dashboards.all', available: true }` em `SETTINGS_TABS`, entre "Usuários" e "LLM"; `DashboardsTab` (tabela "Nome", "Dono", "Conexão", "Última alteração" com `formatDateTime`, na ordem da API; nome como link para `/dashboards/<id>`; esqueleto; erro com "Tentar novamente"); hook `useAllDashboards`. Atualiza, conforme AD-046, o teste CFG-02 de `fundacao-auth` (Admin vê "Conexões", "Usuários" e "Dashboards", nessa ordem; Editor vê só "Conexões").
**Where**: `apps/web/src/features/dashboards/DashboardsTab.tsx`
**Depends on**: T19
**Reuses**: `ConnectionsTab` e `UsersTab` (padrão), `SETTINGS_TABS`, `SettingsPage`, `formatDateTime`, `renderApp`
**Requirement**: DASH-20, DASH-21, DASH-22

**Done when**:

- [ ] Testes com gesto: `DASH-20 aba Dashboards mostra nome, dono, conexão e última alteração` (Admin abre "Configurações" › "Dashboards" e vê "Vendas", "Ana Souza", "Varejo" e "16/11/2026, 14:30" para `2026-11-16T17:30:00Z`, na ordem da resposta), `DASH-21 clicar no dashboard da aba Dashboards abre o dashboard com Editar` (dashboard de outro dono com `permissions.edit` verdadeiro mostra "Editar"), `DASH-22 Visualizador em configuracoes dashboards vê a página de permissão` (`/configuracoes/dashboards` como Visualizador mostra "Você não tem permissão para acessar esta página"; Editor também)
- [ ] Teste CFG-02 de `fundacao-auth` atualizado e verde
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): list all dashboards for admins in settings`

---

## Checks

**C1** - A sidebar mostra os dashboards que o usuário alcança, na ordem e nos grupos que ele definiu (DASH-01, AC 1)
Proof: run api | ✓ DASH-01 sidebar devolve os dashboards alcançáveis na ordem e nos grupos gravados
Proof: run web | ✓ DASH-01 sidebar mostra os dashboards soltos e os grupos na ordem da API

**C2** - Sem nenhum dashboard alcançável, a página inicial mostra "Nenhum dashboard ainda" (DASH-02, AC 2)
Proof: run web | ✓ DASH-02 sem dashboards a página inicial mostra Nenhum dashboard ainda

**C3** - Enquanto a lista da sidebar carrega, aparecem itens de esqueleto (DASH-03, AC 3)
Proof: run web | ✓ DASH-03 esqueleto na sidebar enquanto a lista carrega

**C4** - Falha ao carregar a lista mostra "Não foi possível carregar os dashboards" e "Tentar novamente" recarrega (DASH-04, AC 4)
Proof: run web | ✓ DASH-04 erro na sidebar mostra Não foi possível carregar os dashboards e Tentar novamente recarrega

**C5** - "Novo dashboard" com nome e conexão cria o dashboard com o usuário como dono e a aba "Aba 1", põe no fim da sidebar e abre em edição (DASH-05, AC 5)
Proof: run api | ✓ DASH-05 cria o dashboard com o usuário como dono e a aba Aba 1
Proof: run api | ✓ DASH-05 dashboard novo entra no fim da sidebar do dono
Proof: run web | ✓ DASH-05 Novo dashboard cria o dashboard e abre a URL de edição
Proof: run web | ✓ DASH-05 abrir com editar=1 mostra o dashboard já em modo de edição

**C6** - Nome do dashboard vazio ou com mais de 80 caracteres é recusado com a mensagem no campo "Nome" (DASH-06, AC 6)
Proof: run contracts | ✓ DASH-06 nome do dashboard vazio ou com mais de 80 caracteres
Proof: run web | ✓ DASH-06 nome inválido mostra a mensagem no campo Nome sem enviar

**C7** - Sem conexão cadastrada, "Novo dashboard" mostra "Cadastre uma conexão antes de criar um dashboard" com o botão de criar desabilitado (DASH-07, AC 7)
Proof: run web | ✓ DASH-07 sem conexões mostra o aviso e mantém Criar desabilitado

**C8** - Clicar num dashboard da sidebar o mostra em visualização, na primeira aba, com o item ativo (DASH-08, AC 8)
Proof: run web | ✓ DASH-08 clicar no dashboard da sidebar marca o item ativo
Proof: run web | ✓ DASH-08 abrir o dashboard mostra a primeira aba em visualização

**C9** - "Novo dashboard" aparece só para Admin e Editor (DASH-09, AC 9)
Proof: run web | ✓ DASH-09 Novo dashboard aparece só para Admin e Editor

**C10** - "Excluir" pede confirmação com "Excluir o dashboard <nome>? Abas e widgets serão apagados. Esta ação não pode ser desfeita." (DASH-10, AC 10)
Proof: run web | ✓ DASH-10 Excluir pede confirmação com o nome do dashboard

**C11** - Confirmar a exclusão apaga abas e widgets, tira o dashboard de todas as sidebars e mostra a página inicial (DASH-11, AC 11)
Proof: run api | ✓ DASH-11 excluir apaga abas e widgets
Proof: run api | ✓ DASH-11 dashboard apagado sai das sidebars
Proof: run web | ✓ DASH-11 confirmar a exclusão tira o dashboard da sidebar e abre a página inicial

**C12** - Visualizador que chama a criação de dashboard recebe 403 (DASH-12, AC 12)
Proof: run api | ✓ DASH-12 Visualizador recebe 403 ao criar dashboard

**C13** - Dashboard inexistente ou fora do alcance responde 404 e a tela mostra "Dashboard não encontrado" com link para a página inicial (DASH-13, AC 13)
Proof: run api | ✓ DASH-13 dashboard inexistente ou fora do alcance responde 404
Proof: run web | ✓ DASH-13 URL de dashboard inexistente mostra Dashboard não encontrado com link para a página inicial

**C14** - Um dashboard novo só é alcançado pelo dono e pelos Admins (DASH-17, AC 14)
Proof: run api | ✓ DASH-17 só o dono e os Admins alcançam um dashboard novo

**C15** - "Editar" aparece só para quem pode editar e "Excluir" só para o dono e Admins (DASH-18, AC 15)
Proof: run api | ✓ DASH-18 permissões do dashboard dizem quem edita e quem exclui
Proof: run web | ✓ DASH-18 Editar e Excluir aparecem só para quem pode

**C16** - Quem alcança mas não pode editar recebe 403 ao alterar ou excluir (DASH-19, AC 16)
Proof: run api | ✓ DASH-19 quem só vê recebe 403 ao alterar ou excluir

**C17** - A aba "Dashboards" mostra ao Admin todos os dashboards com nome, dono, conexão e última alteração, em ordem alfabética de nome (DASH-20, AC 17)
Proof: run api | ✓ DASH-20 Admin lista todos os dashboards com dono, conexão e última alteração em ordem de nome
Proof: run web | ✓ DASH-20 aba Dashboards mostra nome, dono, conexão e última alteração

**C18** - Clicar num dashboard da aba "Dashboards" o abre com permissão de edição para o Admin (DASH-21, AC 18)
Proof: run api | ✓ DASH-21 Admin abre dashboard de outro usuário com permissão de edição
Proof: run web | ✓ DASH-21 clicar no dashboard da aba Dashboards abre o dashboard com Editar

**C19** - "Novo grupo" com um nome cria um grupo recolhível no fim da sidebar (SIDE-01, AC 1)
Proof: run web | ✓ SIDE-01 Novo grupo cria um grupo no fim da sidebar

**C20** - Nome de grupo vazio ou com mais de 40 caracteres é recusado com a mensagem no campo (SIDE-02, AC 2)
Proof: run contracts | ✓ SIDE-02 nome do grupo vazio ou com mais de 40 caracteres
Proof: run api | ✓ SIDE-02 grupo com nome inválido responde 400
Proof: run web | ✓ SIDE-02 nome de grupo inválido mostra a mensagem no campo

**C21** - Arrastar um dashboard para outra posição o mantém onde foi solto (SIDE-03, AC 3)
Proof: run web | ✓ SIDE-03 moveItem põe o item antes do alvo
Proof: run web | ✓ SIDE-03 arrastar um dashboard o mantém na posição em que foi solto

**C22** - Arrastar um dashboard para dentro de um grupo o mostra no grupo, na posição solta (SIDE-04, AC 4)
Proof: run web | ✓ SIDE-04 arrastar um dashboard para dentro de um grupo

**C23** - Arrastar um dashboard para fora de um grupo o mostra solto, na posição solta (SIDE-05, AC 5)
Proof: run web | ✓ SIDE-05 arrastar um dashboard para fora de um grupo

**C24** - Arrastar um grupo move o grupo com os dashboards dele (SIDE-06, AC 6)
Proof: run web | ✓ SIDE-06 arrastar um grupo move o grupo com os dashboards

**C25** - Clicar no cabeçalho de um grupo recolhe ou expande o grupo (SIDE-07, AC 7)
Proof: run web | ✓ SIDE-07 clicar no cabeçalho recolhe e expande o grupo

**C26** - Renomear um grupo com 1 a 40 caracteres mostra o novo nome (SIDE-08, AC 8)
Proof: run web | ✓ SIDE-08 renomear o grupo mostra o novo nome

**C27** - "Excluir grupo" remove o grupo e deixa os dashboards soltos na posição dele, sem apagar nenhum (SIDE-09, AC 9)
Proof: run web | ✓ SIDE-09 removeGroup solta os dashboards na posição do grupo
Proof: run web | ✓ SIDE-09 Excluir grupo solta os dashboards na posição do grupo

**C28** - A organização é guardada por usuário, sem alterar a sidebar de outro (SIDE-10, AC 10)
Proof: run api | ✓ SIDE-10 gravar a sidebar de um usuário não muda a de outro

**C29** - Em outro navegador, a sidebar tem a mesma ordem e os mesmos grupos (SIDE-11, AC 11)
Proof: run api | ✓ SIDE-11 outra sessão do mesmo usuário recebe a mesma sidebar

**C30** - Falha ao gravar uma mudança na sidebar devolve o item à posição anterior e mostra "Não foi possível salvar a organização" (SIDE-12, AC 12)
Proof: run web | ✓ SIDE-12 falha ao gravar volta o item e mostra Não foi possível salvar a organização

**C31** - Admin, Editor e Visualizador organizam a própria sidebar (SIDE-13, AC 13)
Proof: run api | ✓ SIDE-13 Admin, Editor e Visualizador gravam a própria sidebar

**C32** - Grupo sem dashboards mostra "Grupo vazio" (SIDE-14, AC 14)
Proof: run web | ✓ SIDE-14 grupo sem dashboards mostra Grupo vazio

**C33** - Nome que não cabe é cortado com reticências e mostra o nome inteiro ao passar o cursor (SIDE-15, AC 15)
Proof: run web | ✓ SIDE-15 nome longo é cortado com reticências e mostra o nome inteiro no title

**C34** - A lista de dashboards e grupos rola quando passa da altura da sidebar (SIDE-16, AC 16)
Proof: run web | ✓ SIDE-16 lista de dashboards e grupos rola na vertical

**C35** - "Editar" entra em modo de edição e mostra "Salvar" e "Descartar" (EDIT-01, AC 1)
Proof: run web | ✓ EDIT-01 Editar entra em modo de edição com Salvar e Descartar

**C36** - "Salvar" grava de uma vez nome, conexão, abas, widgets e layout e volta à visualização (EDIT-02, AC 2)
Proof: run api | ✓ EDIT-02 salvar grava nome, conexão, abas, widgets e layout de uma vez
Proof: run web | ✓ EDIT-02 Salvar envia o rascunho inteiro e volta à visualização

**C37** - Falha na gravação mantém a edição com as alterações e mostra "Não foi possível salvar. Tente novamente." (EDIT-03, AC 3)
Proof: run web | ✓ EDIT-03 falha ao salvar mantém a edição e mostra Não foi possível salvar

**C38** - Gravação sobre versão desatualizada é recusada com "Este dashboard foi alterado por outra pessoa. Recarregue para continuar." (EDIT-04, AC 4)
Proof: run api | ✓ EDIT-04 versão desatualizada responde 409
Proof: run apiint | ✓ EDIT-04 duas gravações simultâneas da mesma versão dão um 200 e um 409
Proof: run web | ✓ EDIT-04 409 mostra Este dashboard foi alterado por outra pessoa

**C39** - "Descartar" com alterações pendentes pede "Descartar as alterações?" (EDIT-05, AC 5)
Proof: run web | ✓ EDIT-05 Descartar com alterações pede confirmação

**C40** - Confirmar o descarte volta à visualização com o último estado salvo (EDIT-06, AC 6)
Proof: run web | ✓ EDIT-06 confirmar o descarte volta ao último estado salvo

**C41** - Sair da página com alterações pendentes pede confirmação (EDIT-07, AC 7)
Proof: run web | ✓ EDIT-07 sair da página com alterações pede confirmação

**C42** - Alterar nome ou conexão em edição muda o rascunho (EDIT-08, AC 8)
Proof: run web | ✓ EDIT-08 setName e setConnection alteram o rascunho
Proof: run web | ✓ EDIT-08 alterar nome e conexão muda o rascunho

**C43** - "Salvar" fica desabilitado durante a gravação (EDIT-09, AC 9)
Proof: run web | ✓ EDIT-09 Salvar fica desabilitado durante a gravação

**C44** - Clicar numa aba mostra os widgets dela e a marca como ativa (TAB-01, AC 1)
Proof: run web | ✓ TAB-01 clicar numa aba mostra os widgets dela e a marca como ativa

**C45** - A primeira exibição de uma aba executa as consultas dos widgets dela (TAB-02, AC 2)
Proof: run web | ✓ TAB-02 a primeira exibição de uma aba executa as consultas dos widgets dela

**C46** - "Nova aba" em edição adiciona uma aba vazia "Aba N", com N = número de abas, e a ativa (TAB-03, AC 3)
Proof: run web | ✓ TAB-03 addTab nomeia a aba com o número de abas
Proof: run web | ✓ TAB-03 Nova aba adiciona Aba N e a ativa

**C47** - Renomear uma aba com 1 a 40 caracteres mostra o novo nome (TAB-04, AC 4)
Proof: run contracts | ✓ TAB-04 nome da aba vazio ou com mais de 40 caracteres
Proof: run web | ✓ TAB-04 renomear a aba mostra o novo nome

**C48** - "Excluir aba" numa aba com widgets pede "Excluir a aba <nome> e seus N widgets?" (TAB-05, AC 5)
Proof: run web | ✓ TAB-05 Excluir aba com widgets pede confirmação com o nome e o número de widgets

**C49** - Com uma única aba, "Excluir aba" fica desabilitado (TAB-06, AC 6)
Proof: run web | ✓ TAB-06 Excluir aba fica desabilitado com uma aba só

**C50** - Aba sem widgets mostra "Esta aba está vazia" (TAB-07, AC 7)
Proof: run web | ✓ TAB-07 aba sem widgets mostra Esta aba está vazia

**C51** - A barra de abas rola na horizontal, sem quebrar em duas linhas (TAB-08, AC 8)
Proof: run web | ✓ TAB-08 barra de abas rola na horizontal sem quebrar linha

**C52** - Os widgets de cada aba ficam numa grade de 12 colunas (GRID-01, AC 1)
Proof: run web | ✓ GRID-01 grade tem 12 colunas

**C53** - Arrastar um widget em edição o põe na célula solta e desloca os demais sem sobreposição (GRID-02, AC 2)
Proof: run web | ✓ GRID-02 arrastar um widget o põe na célula solta sem sobreposição

**C54** - Redimensionar em edição respeita de 2 colunas por 2 linhas a 12 colunas de largura (GRID-03, AC 3)
Proof: run contracts | ✓ GRID-03 layout do widget fora dos limites da grade é recusado
Proof: run web | ✓ GRID-03 redimensionar respeita 2 por 2 no mínimo e 12 colunas no máximo

**C55** - Em visualização não dá para arrastar nem redimensionar widgets (GRID-04, AC 4)
Proof: run web | ✓ GRID-04 em visualização não dá para arrastar nem redimensionar

**C56** - "Novo widget" adiciona ao fim da aba ativa um widget 4×4 "Novo widget" e abre o editor dele (GRID-05, AC 5)
Proof: run web | ✓ GRID-05 addWidget põe o widget 4 por 4 abaixo do último
Proof: run web | ✓ GRID-05 Novo widget adiciona um widget 4 por 4 no fim da aba e abre o editor

**C57** - Salvar grava posição e tamanho de cada widget por aba (GRID-06, AC 6)
Proof: run api | ✓ GRID-06 salvar grava posição e tamanho de cada widget por aba
Proof: run web | ✓ GRID-06 posição e tamanho arrastados vão no Salvar

**C58** - Cada widget é um card do tema com o título no topo (GRID-07, AC 7)
Proof: run web | ✓ GRID-07 widget é um card do tema com o título no topo

**C59** - "Editar widget" abre o editor com "Título", Cypher com realce, "Executar" e a prévia (WDG-01, AC 1)
Proof: run web | ✓ WDG-01 Editar widget abre Título, editor de Cypher com realce, Executar e prévia

**C60** - "Executar" roda o Cypher do editor na conexão do dashboard e mostra o resultado em tabela na prévia (WDG-02, AC 2)
Proof: run api | ✓ WDG-02 executa o Cypher enviado na conexão do dashboard
Proof: run web | ✓ WDG-02 Executar mostra o resultado em tabela na prévia

**C61** - Falha na execução mostra o erro na prévia e mantém o Cypher no editor (WDG-03, AC 3)
Proof: run web | ✓ WDG-03 falha na execução mostra o erro na prévia e mantém o Cypher

**C62** - Com o editor vazio, "Executar" fica desabilitado (WDG-04, AC 4)
Proof: run web | ✓ WDG-04 Executar fica desabilitado com o editor vazio

**C63** - "Aplicar" fecha o editor e atualiza título e Cypher do widget no rascunho (WDG-05, AC 5)
Proof: run web | ✓ WDG-05 updateWidget troca título e Cypher
Proof: run web | ✓ WDG-05 Aplicar fecha o editor e atualiza título e Cypher do widget

**C64** - "Cancelar" fecha o editor sem alterar o widget (WDG-06, AC 6)
Proof: run web | ✓ WDG-06 Cancelar fecha o editor sem alterar o widget

**C65** - Título vazio ou com mais de 80 caracteres recusa "Aplicar" com a mensagem no campo "Título" (WDG-07, AC 7)
Proof: run contracts | ✓ WDG-07 título do widget vazio ou com mais de 80 caracteres
Proof: run web | ✓ WDG-07 título inválido recusa Aplicar com a mensagem no campo Título

**C66** - "Remover widget" pede "Remover o widget <título>?" (WDG-08, AC 8)
Proof: run web | ✓ WDG-08 Remover widget pede confirmação com o título

**C67** - Confirmar a remoção tira o widget do rascunho (WDG-09, AC 9)
Proof: run web | ✓ WDG-09 removeWidget tira o widget da aba
Proof: run web | ✓ WDG-09 confirmar a remoção tira o widget do rascunho

**C68** - Durante a execução pedida por "Executar", aparece "Executando..." e o botão fica desabilitado (WDG-10, AC 10)
Proof: run web | ✓ WDG-10 durante a execução mostra Executando e Executar fica desabilitado

**C69** - Toda consulta roda numa transação de leitura: um procedimento de escrita é recusado pelo Neo4j e nada é criado (QRY-01, AC 1)
Proof: run apiint | ✓ QRY-01 procedimento de escrita é recusado pela transação de leitura e nada é criado

**C70** - Cada cláusula bloqueada fora de strings, comentários e crases é recusada no backend, sem chegar ao Neo4j, com "Somente consultas de leitura são permitidas. Cláusula bloqueada: <cláusula>" (QRY-02, AC 2)
Proof: run api | ✓ QRY-02 recusa cada cláusula bloqueada com a mensagem
Proof: run api | ✓ QRY-02 Cypher de escrita não chega ao Neo4j

**C71** - As cláusulas bloqueadas são reconhecidas sem diferenciar maiúsculas (QRY-03, AC 3)
Proof: run api | ✓ QRY-03 cláusulas bloqueadas sem diferenciar maiúsculas

**C72** - Palavra bloqueada só em string, comentário ou crases é aceita (QRY-04, AC 4)
Proof: run api | ✓ QRY-04 palavra bloqueada em string, comentário ou crases é aceita

**C73** - Mais de uma instrução separada por `;` é recusada com "Envie uma consulta por vez" (QRY-05, AC 5)
Proof: run api | ✓ QRY-05 mais de uma instrução é recusada

**C74** - Recusa de escrita pelo Neo4j mostra "Somente consultas de leitura são permitidas" (QRY-06, AC 6)
Proof: run api | ✓ QRY-06 recusa de escrita do Neo4j mostra Somente consultas de leitura são permitidas
Proof: run apiint | ✓ QRY-06 Neo4j real recusa CALL db.createLabel com a mensagem de leitura

**C75** - Consulta acima de 30 s é cancelada e mostra "A consulta excedeu o tempo limite de 30 s" (QRY-07, AC 7)
Proof: run api | ✓ QRY-07 consulta que passa do prazo responde A consulta excedeu o tempo limite
Proof: run api | ✓ QRY-07 prazo padrão é 30 s
Proof: run apiint | ✓ QRY-07 produto cartesiano no Neo4j real para no prazo

**C76** - Resultado acima de 5.000 linhas devolve as primeiras 5.000 com o aviso "Mostrando as primeiras 5.000 linhas" (QRY-08, AC 8)
Proof: run api | ✓ QRY-08 resultado com mais linhas que o limite devolve as primeiras e marca truncated
Proof: run apiint | ✓ QRY-08 UNWIND de 6000 linhas devolve 5000
Proof: run web | ✓ QRY-08 resultado cortado mostra Mostrando as primeiras 5.000 linhas

**C77** - Cypher acima de 20.000 caracteres é recusado com "A consulta passa de 20.000 caracteres" (QRY-09, AC 9)
Proof: run contracts | ✓ QRY-09 Cypher com mais de 20000 caracteres no contrato
Proof: run api | ✓ QRY-09 Cypher com mais de 20000 caracteres é recusado

**C78** - Um `$parametro` sem valor é enviado como `null` (QRY-10, AC 10)
Proof: run api | ✓ QRY-10 parâmetro sem valor é enviado como null

**C79** - Quem não pode editar recebe 403 ao executar Cypher enviado como texto (QRY-11, AC 11)
Proof: run api | ✓ QRY-11 quem não pode editar recebe 403 ao executar texto

**C80** - Quem só vê executa apenas o Cypher salvo de um widget, pelo id, sem enviar texto (QRY-12, AC 12)
Proof: run api | ✓ QRY-12 quem só vê executa o widget salvo pelo id

**C81** - Neo4j inacessível mostra "Não foi possível conectar ao banco <nome da conexão>" (QRY-13, AC 13)
Proof: run api | ✓ QRY-13 Neo4j inacessível mostra Não foi possível conectar ao banco
Proof: run apiint | ✓ QRY-13 porta fechada mostra Não foi possível conectar ao banco

**C82** - Cada execução gera log com usuário, conexão, widget, duração, linhas e resultado, sem as linhas (QRY-14, AC 14)
Proof: run api | ✓ QRY-14 log de execução tem usuário, conexão, widget, duração, linhas e resultado sem as linhas

**C83** - A tabela tem uma coluna por chave do resultado, na ordem do `RETURN` (TBL-01, AC 1)
Proof: run web | ✓ TBL-01 tabela tem uma coluna por chave na ordem do RETURN

**C84** - Clicar no cabeçalho ordena todas as linhas, alternando crescente, decrescente e ordem original (TBL-02, AC 2)
Proof: run web | ✓ TBL-02 clicar no cabeçalho alterna crescente, decrescente e original

**C85** - Números ordenam por valor, textos pela ordem do português e nulos por último (TBL-03, AC 3)
Proof: run web | ✓ TBL-03 números por valor, textos em ordem do português e nulos por último

**C86** - Acima de 50 linhas, a tabela mostra 50 por página com "Página X de Y" e os botões de página (TBL-04, AC 4)
Proof: run web | ✓ TBL-04 mais de 50 linhas mostra Página X de Y e navega

**C87** - As linhas rolam dentro do card com o cabeçalho fixo (TBL-05, AC 5)
Proof: run web | ✓ TBL-05 linhas rolam dentro do card com cabeçalho fixo

**C88** - Nó, relacionamento, lista e mapa aparecem como texto JSON (TBL-06, AC 6)
Proof: run api | ✓ TBL-06 nó, relacionamento, lista e mapa viram texto JSON
Proof: run web | ✓ TBL-06 valor JSON aparece como texto na célula

**C89** - Valor nulo mostra "—" (TBL-07, AC 7)
Proof: run web | ✓ TBL-07 valor nulo mostra travessão

**C90** - Inteiros aparecem com todos os dígitos, sem arredondar acima de 2^53 (TBL-08, AC 8)
Proof: run api | ✓ TBL-08 inteiro acima de 2^53 mantém todos os dígitos
Proof: run web | ✓ TBL-08 inteiro grande aparece com todos os dígitos

**C91** - Enquanto a consulta roda, o card mostra um esqueleto (TBL-09, AC 9)
Proof: run web | ✓ TBL-09 esqueleto no card enquanto a consulta roda

**C92** - Consulta sem linhas mostra "A consulta não retornou dados" (TBL-10, AC 10)
Proof: run web | ✓ TBL-10 consulta sem linhas mostra A consulta não retornou dados

**C93** - Para quem pode editar, falha mostra a mensagem de erro e "Tentar novamente" (TBL-11, AC 11)
Proof: run web | ✓ TBL-11 erro mostra a mensagem e Tentar novamente para quem edita

**C94** - Para quem só vê, falha mostra "Não foi possível carregar este widget" e "Tentar novamente" (TBL-12, AC 12)
Proof: run api | ✓ TBL-12 quem só vê recebe a mensagem genérica de erro
Proof: run web | ✓ TBL-12 erro mostra Não foi possível carregar este widget para quem só vê

**C95** - Um widget com erro não impede os demais de carregar e aparecer (TBL-13, AC 13)
Proof: run web | ✓ TBL-13 widget com erro não impede os demais

**C96** - Widget sem Cypher mostra "Widget sem consulta" (TBL-14, AC 14)
Proof: run web | ✓ TBL-14 widget sem Cypher mostra Widget sem consulta

**C97** - "Atualizar" executa de novo os widgets da aba ativa (TBL-15, AC 15)
Proof: run web | ✓ TBL-15 Atualizar executa de novo os widgets da aba ativa

**C98** - Excluir conexão usada por dashboards é recusado com "Esta conexão é usada por N dashboard(s)" (DASH-14, edge case)
Proof: run api | ✓ DASH-14 chave estrangeira impede apagar conexão usada
Proof: run api | ✓ DASH-14 excluir conexão usada responde 409 com o número de dashboards
Proof: run web | ✓ DASH-14 excluir conexão usada mostra Esta conexão é usada por

**C99** - Dashboard excluído por outra pessoa mostra "Dashboard não encontrado" na próxima ação (DASH-15, edge case)
Proof: run web | ✓ DASH-15 dashboard excluído por outra pessoa mostra Dashboard não encontrado na próxima ação

**C100** - "Novo dashboard" enviado duas vezes cria um só, com o botão desabilitado durante o envio (DASH-16, edge case)
Proof: run web | ✓ DASH-16 dois cliques em Criar enviam um único pedido

**C101** - Duas colunas com o mesmo nome aparecem as duas, na ordem retornada (TBL-16, edge case)
Proof: run web | ✓ TBL-16 colunas com o mesmo nome aparecem as duas

**C102** - Resultados que chegam depois de trocar de aba ou sair do dashboard são descartados (TBL-17, edge case)
Proof: run web | ✓ TBL-17 resultado que chega depois de trocar de aba ou sair é descartado

**C103** - `CREATE` dentro de um nome maior, como `created_at`, é aceito (QRY-15, edge case)
Proof: run api | ✓ QRY-15 CREATE dentro de um nome maior é aceito

**C104** - Trocar a conexão em edição executa de novo, na conexão nova, os widgets da aba ativa (EDIT-10, edge case)
Proof: run api | ✓ EDIT-10 quem edita executa o texto em outra conexão
Proof: run web | ✓ EDIT-10 trocar a conexão executa de novo os widgets da aba ativa

**C105** - Quem não alcança o dashboard recebe 404 ao executar um widget dele (QRY-16, edge case)
Proof: run api | ✓ QRY-16 quem não alcança recebe 404 ao executar widget

**C106** - Com arrastes em duas janelas, vale a organização da última gravação (SIDE-17, edge case)
Proof: run api | ✓ SIDE-17 a última gravação da sidebar vale

**C107** - Visualizador na aba "Dashboards" ou na lista de todos os dashboards recebe 403 (DASH-22, edge case)
Proof: run api | ✓ DASH-22 Editor e Visualizador recebem 403 na lista de todos
Proof: run web | ✓ DASH-22 Visualizador em configuracoes dashboards vê a página de permissão

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** lote 1 (T1-T7, sonnet) sobre 5123dd7 - em andamento.
**Walked:** dispensado por AD-023

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8

Phase 1:  T1   T2
Phase 2:  T3 ------→ T4 ------→ T5
          T3 ------→ T6
          T7
Phase 3:  T8 ------→ T10
          T9 ------→ T10 -----→ T11 -----→ T12
Phase 4:  T13 -----→ T14
Phase 5:  T15 -----→ T16 -----→ T17
          T15 -----→ T18
Phase 6:  T19 -----→ T20
          T21
Phase 7:  T22 -----→ T23 -----→ T24
          T23 -----→ T25 -----→ T27
          T23 -----→ T26
Phase 8:  T28
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order: T1 to T28.
