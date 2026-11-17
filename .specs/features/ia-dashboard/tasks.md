# IA para Dashboards Tasks

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas (screens sub-agent, imagens `*.running.png`, walk) está dispensada por AD-023: nenhuma task captura tela.

Pré-requisito: `fundacao-auth`, `conexoes-schema`, `dashboards-consultas`, `compartilhamento`, `widgets-graficos`, `ia-cypher` e `interatividade` concluídas (`createTestApp` com `neo4j`, `shares` e `chatModels`, `FakeNeo4jGateway`, `FakeShareResolver`, `FakeChatModelFactory`, `ScriptedChatModel`, `SchemaQueryService`, `QueryService` com `signal`, `DashboardAccessService` com `DbShareResolver`, `LlmSettingsService.snapshot`, `LlmClient`, `AiWidgetService`, `serializeSchema`, `buildWidgetMessages` com `filters`, `dashboardFilterSchema`, `dashboardFiltersSchema`, `filtersForPrompt`, `widget-config.ts`, `renderApp`, `DashboardPage`, `useDashboardEditor`, `draft.ts` com filtros, `DashboardGrid`, `DashboardTabsBar`, `WidgetCard`, `NewDashboardDialog`, `streamAiWidget`, `useAiStatus`, `resolveAiMapping`, `useAiGenerations`, `validateMapping`, fixtures de dashboards e de schema).

**Nenhum teste chama um provedor de LLM real.** Toda chamada passa pelo `FakeChatModelFactory` com o `ScriptedChatModel` de `ia-cypher` (AD-081): o roteiro traz a resposta do plano e depois as respostas de cada widget.

---

**Design**: `.specs/features/ia-dashboard/design.md`
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run contracts**: `pnpm --filter @ninbi/contracts test`
**Run api**: `pnpm --filter @ninbi/api test`
**Run web**: `pnpm --filter @ninbi/web test`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo script `test` roda `vitest run --reporter=verbose`. Todo nome de teste começa com o ID do requisito e contém, na ordem, as palavras da linha de `Proof` da sua check (sem o `✓`). Se o runner imprimir outro marcador de sucesso, a linha da check é corrigida a partir da saída real, nunca o teste.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012 (testes unitários das partes críticas), AD-026 (testes rápidos sem serviço externo; nomes com o ID do requisito; `--reporter=verbose`), AD-081 (modelo de chat falso), e as matrizes aprovadas de `fundacao-auth`, `dashboards-consultas`, `compartilhamento` e `ia-cypher`. Strong defaults applied onde não há guia.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contratos (schemas zod, mensagens) | unit | Toda regra de campo com o texto exato da mensagem; casos no limite; chaves descartadas | `packages/contracts/src/**/*.spec.ts` | `pnpm --filter @ninbi/contracts test` |
| Banco (schema Drizzle, migração) | integration (PGlite) | Migração aplica; enum; ordem por `seq`; cascata | `apps/api/test/database/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: funções puras (posição, prompt, plano, resolução) | unit | Todos os ramos; 1:1 com os ACs; cada ação e cada recusa listada no design | `apps/api/test/assistant/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: services e rotas | integration (supertest + PGlite + `FakeNeo4jGateway` + `FakeShareResolver` ou resolver real + `FakeChatModelFactory`) | Toda rota: sucesso + cada erro da tabela de erros do design + 403/404 por papel e alcance; cada saída do pedido (ok, sem ações, widget com erro, erro do provedor, cancelado) | `apps/api/test/{assistant,ai}/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Web: funções puras | unit | Todos os ramos; 1:1 com os ACs | `apps/web/src/features/**/*.test.ts` | `pnpm --filter @ninbi/web test` |
| Web: componentes, hooks e páginas | unit (Testing Library + jsdom + user-event + MSW) | Gesto do critério + o que a tela mostra; toda mensagem da spec com o texto exato | `apps/web/src/**/*.test.tsx` | `pnpm --filter @ninbi/web test` |

## Gate Check Commands

> Generated from the design - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task com testes de um só pacote | `pnpm --filter <pacote da task> test` (`@ninbi/contracts`, `@ninbi/api` ou `@ninbi/web`) |
| Full | Não usado nesta feature: não há teste de integração com serviço real | `pnpm test` |
| Build | Última task de cada fase | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

`pnpm test` na raiz é `pnpm -r test`.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Lotes de execução

| Lote | Fases | Tasks | Modelo |
| ---- | ----- | ----- | ------ |
| 1 | Phase 1 - Contratos e banco; Phase 2 - Conversa e regras puras na API | T1-T7 (7) | sonnet |
| 2 | Phase 3 - Pedido ao assistente na API; Phase 4 - Base do assistente no web | T8-T13 (6) | sonnet |
| 3 | Phase 5 - Painel, página e geração no web | T14-T18 (5) | sonnet |

Todas as tasks têm testes, por isso todos os lotes são `sonnet` (AD-037).

### Phase 1: Contratos e banco

```
T1 → T2
```

### Phase 2: Conversa e regras puras na API

```
T3
T4 → T7
T5
T6 → T7
```

### Phase 3: Pedido ao assistente na API

```
T8 → T9 → T10
```

### Phase 4: Base do assistente no web

```
T11 → T13
T12 → T13
```

### Phase 5: Painel, página e geração no web

```
T14 → T16
T15 → T16
T16 → T17 → T18
```

---

## Task Breakdown

### Phase 1 tasks: Contratos e banco

### T1: Definir os contratos do assistente

**What**: `packages/contracts/src/assistant.ts` conforme o design: `ASSISTANT_MESSAGE_MAX`, `ASSISTANT_HISTORY_LIMIT`, `ASSISTANT_MAX_NEW_WIDGETS`, `assistantDescriptionSchema`, `assistantMessageSchema`, `assistantDraftSchema` (só os campos de CHAT-05; `z.object` descarta o resto), `assistantRequestSchema`, `AssistantMessageDto`, `AssistantReplyDetails`, `AssistantAction`, `AssistantEvent`; acréscimos em `MESSAGES` (todas as chaves `assistant*` da tabela do design, com `assistantWidgetsCreated` no singular para 1). Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/assistant.ts`
**Depends on**: None
**Reuses**: `zod`, `MESSAGES`, `FILTER_TYPES`, `WidgetVisualization`, `QueryResultDto`, `DashboardFilter`, `AiProviderErrorCode`
**Requirement**: GEN-10, CHAT-06, CHAT-16

**Done when**:

- [x] Testes em `packages/contracts/src/assistant.spec.ts`: `GEN-10 descrição vazia ou com mais de 4.000 caracteres é recusada` (vazia e só espaços dão "Informe a descrição"; 4.001 caracteres dão "A descrição passa de 4.000 caracteres"; 4.000 passa), `CHAT-16 mensagem com mais de 4.000 caracteres dá A mensagem passa de 4.000 caracteres` (no caminho `message` de `assistantRequestSchema`; 4.000 passa), `CHAT-06 contexto do rascunho descarta valores e opções dos filtros e resultados` (filtro com `defaultValue` e `options`, widget com `result` e `config.crossFilter`: o objeto validado não tem essas chaves; `mapping` e `layout` ficam), `MESSAGES.assistantWidgetsCreated(1)` é "1 widget criado" e `(3)` é "3 widgets criados", `MESSAGES.assistantGeneratingWidget(2, 5)` é "Gerando widget 2 de 5"
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add assistant chat request, action and event contracts`

---

### T2: Criar a tabela da conversa

**What**: Em `apps/api/src/database/schema.ts`, o enum `assistant_role` e a tabela `assistant_messages` (`seq` identity, `dashboard_id` com `on delete cascade`, `user_id` com `on delete cascade`, `details` JSONB nulo, índice `(dashboard_id, user_id, seq)`) conforme "Data Models" do design; migração gerada com `drizzle-kit generate` em `apps/api/drizzle/`.
**Where**: `apps/api/src/database/schema.ts` (modify)
**Depends on**: T1
**Reuses**: `createTestDb()`, testes de schema existentes, factories de usuário e dashboard
**Requirement**: HIST-01

**Done when**:

- [x] Testes em `apps/api/test/database/assistant-messages-schema.spec.ts`: migrações aplicam no PGlite; `HIST-01 tabela assistant_messages guarda mensagens por dashboard e usuário` (duas linhas inseridas com o mesmo `created_at` saem por `seq` na ordem de inserção; `role` fora do enum é recusado; `dashboard_id` inexistente viola a chave estrangeira)
- [x] `drizzle-kit generate` não gera diferença depois do commit
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): add assistant messages table per dashboard and user`

---

### Phase 2 tasks: Conversa e regras puras na API

### T3: Ler e limpar a conversa

**What**: `AssistantHistoryService` (`list`, `recent`, `appendUser`, `appendAssistant`, `clear`) e `AssistantController` com `GET` e `DELETE /api/dashboards/:id/assistant/messages`, ambos com `@RequirePermission('ai.use')` e `assert(user, id, 'edit')`; `AssistantModule` registrado em `AppModule`.
**Where**: `apps/api/src/assistant/assistant-history.service.ts`
**Depends on**: T2
**Reuses**: `DashboardAccessService`, `@RequirePermission`, `Clock`, `createTestApp`, factories
**Requirement**: HIST-02, HIST-03, HIST-05, HIST-06, CHAT-17

**Done when**:

- [ ] Testes em `apps/api/test/assistant/assistant-history.spec.ts`: `HIST-02 conversa volta na ordem em que aconteceu` (três mensagens gravadas pelo service com o relógio parado saem na ordem de gravação, com `role`, `text` e `details`), `HIST-03 cada usuário vê só a própria conversa` (dois Editores com "pode editar" no mesmo dashboard: cada `GET` traz só as suas; o Admin, sem mensagens, recebe `[]`), `HIST-05 limpar apaga só as mensagens do usuário nesse dashboard` (`DELETE` 204; as do outro usuário e as do mesmo usuário em outro dashboard ficam), `HIST-06 excluir o dashboard apaga as conversas` (`DELETE /api/dashboards/:id` pelo dono: nenhuma linha do dashboard em `assistant_messages`), `CHAT-17 Visualizador e quem não edita recebem 403 na conversa` (Visualizador com compartilhamento `edit` e Editor com `view` recebem 403 no `GET` e no `DELETE`; quem não alcança recebe 404), `recent` devolve as últimas N em ordem cronológica
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): list and clear the assistant conversation per user`

---

### T4: Posicionar os widgets na grade

**What**: `apps/api/src/assistant/widget-placement.ts` com `placeWidget(occupied, wanted)` e `placeWidgets(occupied, wanted[])` conforme o design (limites de `w`, `h`, `x`, `y` padrão abaixo do último, desce até não sobrepor).
**Where**: `apps/api/src/assistant/widget-placement.ts`
**Depends on**: T1
**Reuses**: `WidgetLayoutDto`
**Requirement**: GEN-04

**Done when**:

- [ ] Testes em `apps/api/test/assistant/widget-placement.spec.ts`: `GEN-04 widgets ficam na grade de 12 colunas sem sobreposição e com no mínimo 2 por 2` (seis pedidos todos em `x: 0, y: 0` com `w` de 1 a 14 e `h` 0, 1 e 5: cada resultado tem `0 ≤ x`, `x + w ≤ 12`, `w ≥ 2`, `h ≥ 2`, e nenhum par se sobrepõe; um pedido sem posição fica abaixo do último ocupado; `x: 11, w: 4` vira `x: 8`; números quebrados são arredondados)
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): place assistant widgets on the 12-column grid without overlap`

---

### T5: Montar o pedido do plano

**What**: `apps/api/src/assistant/assistant-prompt.ts` com `serializeDraft` (refs `t*`, `w*`, `f*`, mapa de refs) e `buildAssistantMessages({ schema, draft, history, message })` conforme o design (regras do sistema com as 12 ações e seus formatos, visualizações e mapeamentos, schema por `serializeSchema`, conversa, rascunho e mensagem nova).
**Where**: `apps/api/src/assistant/assistant-prompt.ts`
**Depends on**: T1
**Reuses**: `serializeSchema`, o texto das visualizações de `buildWidgetMessages`, `@langchain/core/messages`, fixtures de schema
**Requirement**: CHAT-05, CHAT-06

**Done when**:

- [ ] Testes em `apps/api/test/assistant/assistant-prompt.spec.ts`: `CHAT-05 pedido traz schema, estrutura do rascunho, 20 mensagens recentes e a mensagem nova` (a mensagem de sistema tem `(:Pedido)` do schema e os 12 tipos de ação; a última `HumanMessage` tem `t1 "Vendas"`, `w1 "Total por mês"`, o Cypher, `BAR`, o mapeamento, posição e tamanho, `f1 "Categoria" $categoria SINGLE_SELECT` e a mensagem nova; a conversa entra como `HumanMessage` e `AIMessage` na ordem, com as mudanças da resposta), `CHAT-06 rascunho serializado não leva nada além da estrutura` (rascunho vindo de `assistantDraftSchema.parse` de um objeto com `defaultValue` `VALOR-DE-FILTRO-c41d` e `result` com `VALOR-DE-LINHA-5b2e`: nenhuma mensagem contém esses textos), refs seguem a ordem das abas, dos widgets e dos filtros
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): build the assistant plan prompt from schema, draft and history`

---

### T6: Interpretar a resposta do plano

**What**: `apps/api/src/assistant/assistant-reply.ts` com `parseAssistantReply(text)` conforme o design (cercas, primeiro objeto JSON balanceado, `reply` e `actions`; sem JSON, o texto vira a resposta sem ações).
**Where**: `apps/api/src/assistant/assistant-reply.ts`
**Depends on**: T1
**Reuses**: extração de objeto balanceado de `widget-reply.ts` (ia-cypher), sem duplicar se puder ser importada
**Requirement**: CHAT-12

**Done when**:

- [ ] Testes em `apps/api/test/assistant/assistant-reply.spec.ts`: `CHAT-12 texto sem JSON vira resposta sem ações` ("Este dashboard mostra vendas." dá `reply` com esse texto e `actions: []`), JSON em cerca ```` ```json ```` com texto antes e depois é lido, `actions` que não é lista vira `[]`, `reply` ausente vira `''`
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): parse the assistant plan reply`

---

### T7: Resolver as ações do plano contra o rascunho

**What**: `apps/api/src/assistant/resolve-actions.ts` com `resolveActions(draft, refs, rawActions, newId)` conforme o design: schema zod por tipo, lista fechada de 12 ações, simulação em ordem, refs do rascunho e de `create_tab` do plano, recusa da última aba, limite de 20 widgets novos com contagem, ids novos, posição por `placeWidgets`, `move_widget`/`resize_widget` como `set_layout`, filtros por `dashboardFilterSchema`/`dashboardFiltersSchema` e `validateReadOnlyCypher` nas opções `QUERY`, e uma descrição de `MESSAGES` por ação aceita.
**Where**: `apps/api/src/assistant/resolve-actions.ts`
**Depends on**: T4, T6, T1
**Reuses**: `placeWidgets`, `dashboardFilterSchema`, `dashboardFiltersSchema`, `validateReadOnlyCypher`, `WIDGET_VISUALIZATIONS`, `MESSAGES`
**Requirement**: GEN-03, GEN-12, CHAT-07, CHAT-09, CHAT-23, CHAT-24

**Done when**:

- [ ] Testes em `apps/api/test/assistant/resolve-actions.spec.ts`: `GEN-03 plano com abas, widgets e filtros vira ações com ids novos` (`rename_tab t1`, `create_tab {ref: "nova"}`, dois `create_widget` em `nova` e em `t1`, `create_filter` `SINGLE_SELECT`: ações com ids de `newId`, widgets na aba certa e com `prompt`), `CHAT-07 só as ações da lista fechada são aceitas` (`delete_dashboard` e `run_query` dão "Não aplicado: a ação <tipo> não é permitida"; `create_widget` sem `title` dá "veio com dados inválidos"; as demais ações do plano seguem), `CHAT-09 cada ação aceita gera a descrição da mudança` (uma de cada tipo: "Aba criada: ...", "Aba renomeada: A → B", "Widget criado: ...", "Widget alterado: ...", "Widget removido: ...", "Widget movido ou redimensionado: ...", "Filtro criado: ...", "Filtro removido: ...", "Dashboard renomeado: ..."), `CHAT-23 ação que cita widget, aba ou filtro inexistente é ignorada e informada` (`w9`, `t9`, `f9` e `w1` depois de `remove_widget w1` dão "Não aplicado: <ref> não existe"; as demais ações são aplicadas), `CHAT-24 remover a última aba é ignorado e informado` (rascunho com uma aba: "Não aplicado: o dashboard precisa de ao menos uma aba"; com duas abas, remover as duas aplica a primeira e recusa a segunda), `GEN-12 mais de 20 widgets novos ficam nos 20 primeiros e contam os descartados` (23 `create_widget`: 20 ações com os 20 primeiros títulos e `discardedWidgets: 3`), filtro com parâmetro repetido e opções `QUERY` com `CREATE` são recusados, `move_widget` e `resize_widget` saem como `set_layout` sem sobreposição
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): resolve assistant actions against the draft with a closed action list`

---

### Phase 3 tasks: Pedido ao assistente na API

### T8: Extrair o laço de geração de um widget

**What**: `AiWidgetService.generate(input)` conforme o design (o laço de AD-084 sem HTTP, com `onAttempt`, `filters`, `purpose` e o resultado `done`/`failed`/`stopped`/`provider_error`); `run` passa a chamar `generate` e traduzir o resultado em eventos, sem mudar o comportamento de `ia-cypher`. `LlmClient` aceita `purpose: 'assistant'` no log.
**Where**: `apps/api/src/ai/ai-widget.service.ts` (modify)
**Depends on**: None
**Reuses**: `AiWidgetService`, `LlmClient`, `FakeChatModelFactory`, `FakeNeo4jGateway`, testes de `ia-cypher`
**Requirement**: GEN-05, CHAT-08

**Done when**:

- [ ] Testes em `apps/api/test/ai/ai-widget.generate.spec.ts`: `GEN-05 generate valida, executa e corrige o Cypher do widget` (roteiro com `DELETE` e depois Cypher válido: resultado `done` com `attempts: 2`, o gateway recebeu só o válido, `onAttempt` recebeu 1 e 2), `CHAT-08 generate parte do widget atual e dos filtros` (a `HumanMessage` da 1ª chamada tem o título, o Cypher atual e `$categoria` do filtro), `failed` depois de 4 tentativas traz o último Cypher, `provider_error` para na 1ª chamada, o log sai com `purpose=assistant`
- [ ] Testes de `AiWidgetService` e da rota `.../ai/widget` de `ia-cypher` continuam verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `refactor(api): expose the ai widget generation loop for reuse`

---

### T9: Atender um pedido ao assistente

**What**: `AssistantService` com `prepare` (409 `LLM_NOT_CONFIGURED`, 409 `SCHEMA_NOT_READ` pela conexão do rascunho) e `run(prepared, emit, signal)` nos 6 passos do design: grava a mensagem do usuário, chama o plano, resolve as ações, gera cada widget por `generate` emitindo `widget`, executa o Cypher atual dos `update_widget` sem `prompt`, monta `details` e o texto, grava a resposta e emite `done`; erro do provedor e cancelamento terminam sem gravar resposta nem devolver ações; linha de log `assistant request ...` em `Logger('Assistant')`.
**Where**: `apps/api/src/assistant/assistant.service.ts`
**Depends on**: T8, T3, T5, T7
**Reuses**: `LlmSettingsService.snapshot`, `SchemaQueryService.get`, `LlmClient`, `AiWidgetService.generate`, `QueryService.run`, `AssistantHistoryService`, `filtersForPrompt`, `FakeChatModelFactory`, `FakeNeo4jGateway`, captura de log de `http-logging.spec.ts`
**Requirement**: GEN-03, GEN-05, GEN-06, GEN-07, GEN-09, GEN-13, CHAT-05, CHAT-06, CHAT-08, CHAT-09, CHAT-12, CHAT-22, CHAT-29, HIST-01

**Done when**:

- [ ] Testes em `apps/api/test/assistant/assistant.service.spec.ts` (service tirado do app de teste, eventos guardados num array): `GEN-03 geração cria abas, widgets e filtros devolvidos pelo LLM` (plano com uma aba nova, três widgets e um filtro: `done` traz `create_tab`, três `create_widget` com Cypher, visualização, mapeamento, título e `result`, e `create_filter`), `GEN-05 cada widget gerado passa pela validação, execução e autocorreção` (o 2º widget recebe `DELETE` e depois um Cypher válido: o gateway nunca recebe o `DELETE` e o widget sai com o válido), `GEN-06 widget que continua falhando entra com erro e o último Cypher e os demais seguem` (4 respostas inválidas para o 2º widget: ele sai com o 4º Cypher, `TABLE` e `error`; o 3º widget é gerado normalmente; `NEO4J_UNAVAILABLE` num widget também vira widget com erro), `GEN-07 resposta da geração informa quantos widgets foram criados e os títulos com erro` (`details.createdWidgets: 3` e `failedWidgets: ["Ranking de lojas"]`), `GEN-09 cancelar para a geração sem nova chamada nem resposta gravada` (abortar durante o 2º widget em `'hang'`: nenhum evento depois, nenhuma chamada nova ao modelo e só a mensagem do usuário em `assistant_messages`), `GEN-13 pedido ao assistente não grava o dashboard` (depois do `done`, `dashboards.version`, abas e widgets no banco são os de antes), `CHAT-05 assistente envia ao LLM só as 20 mensagens mais recentes` (com 25 mensagens gravadas, o plano recebe as 20 últimas antes da nova e a nova no fim), `CHAT-06 nenhuma linha de resultado nem valor de filtro chega ao provedor` (linhas do gateway com `VALOR-DE-LINHA-5b2e`, filtro com `defaultValue` `VALOR-DE-FILTRO-c41d` e opções `['OPCAO-77aa']` no corpo: nenhuma mensagem de `calls`, nem no segundo pedido com a conversa anterior, contém esses textos), `CHAT-08 ação que muda o Cypher passa pela validação, execução e autocorreção` (`update_widget w1` com `prompt`: a geração parte do widget atual e o Cypher novo foi executado; `update_widget` só com `visualization` não chama o modelo e traz `result` do Cypher atual), `CHAT-09 resposta do assistente traz a lista do que mudou` (`details.changes` na ordem das ações e o texto do `reply`), `CHAT-12 resposta sem ações não altera o rascunho` (`done` com `actions: []` e o texto do LLM gravado), `CHAT-22 falha do provedor no meio dos widgets não devolve ações nem grava resposta` (erro 429 no 2º widget: evento `provider_error` `AI_PROVIDER_RATE_LIMIT`, nenhum `done`, nenhuma resposta gravada), `CHAT-29 log de cada pedido tem usuário, dashboard, ações, widgets com erro e duração sem o texto` (linhas `result=ok` e `result=provider_error` com `user=`, `dashboard=`, `actions=`, `widgetErrors=`, `durationMs=`; nenhuma linha contém o texto da mensagem nem o Cypher), `HIST-01 mensagem do usuário e resposta do assistente ficam gravadas no PostgreSQL` (duas linhas, `USER` e `ASSISTANT`, com o texto e `details`)
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): answer assistant messages with planned and generated dashboard changes`

---

### T10: Expor o pedido ao assistente como resposta NDJSON

**What**: `POST /api/dashboards/:id/assistant/messages` no `AssistantController`: `@RequirePermission('ai.use')`, `assert(user, id, 'edit')`, `assistantRequestSchema`, `prepare` antes de qualquer byte (erros em JSON), depois 200 `application/x-ndjson` com `X-Accel-Buffering: no`, uma linha por `AssistantEvent`, `flushHeaders`, e `req.on('close')` abortando o pedido; `retryOf` reaproveita a mensagem do usuário quando é a mais recente dele e não tem resposta.
**Where**: `apps/api/src/assistant/assistant.controller.ts` (modify)
**Depends on**: T9
**Reuses**: `DashboardAccessService`, `ZodValidationPipe`, rota NDJSON de `AiController`, `createTestApp` com `neo4j`, `shares` e `chatModels`
**Requirement**: GEN-02, GEN-08, CHAT-16, CHAT-17, CHAT-21, CHAT-27

**Done when**:

- [ ] Testes em `apps/api/test/assistant/assistant.route.spec.ts`: `GEN-08 resposta informa o widget N de M em geração` (plano com dois widgets, o 1º corrigido uma vez: o corpo tem, na ordem, `accepted`, `planned` com `widgetsTotal: 2`, `widget` 1 de 2 tentativa 1, `widget` 1 de 2 tentativa 2, `widget` 2 de 2 tentativa 1 e `done`; `Content-Type` `application/x-ndjson`), `CHAT-16 mensagem longa responde 400 com A mensagem passa de 4.000 caracteres` (em `fieldErrors.message`, sem chamada ao modelo nem linha gravada), `CHAT-17 Visualizador e quem não edita recebem 403 no assistente` (Visualizador com compartilhamento `edit` e Editor com `view` recebem 403; quem não alcança recebe 404; dono e Admin recebem 200), `CHAT-27 conexão sem schema lido responde 409 com Leia o schema da conexão antes de usar a IA` (`SCHEMA_NOT_READ`, sem mensagem gravada), `CHAT-21 Tentar novamente reaproveita a mensagem sem gravar outra` (1º pedido com erro do provedor; 2º com `retryOf` igual ao id do `accepted`: uma só linha `USER` e o `done` gravado depois dela; `retryOf` de mensagem antiga grava uma nova), `GEN-02 dashboard criado por quem pede a geração é dele e entra no fim da sidebar` (Editor cria por `POST /api/dashboards`: `ownerId` é dele, o `GET /api/sidebar` termina nele e o pedido ao assistente nesse dashboard responde 200), sem provedor responde 409 `LLM_NOT_CONFIGURED` com "Nenhum provedor de IA configurado"
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): stream assistant answers as ndjson`

---

### Phase 4 tasks: Base do assistente no web

### T11: Ler a conversa e o stream do assistente

**What**: `src/features/assistant/api.ts` com `useAssistantMessages(dashboardId, enabled)` (chave `['assistant', dashboardId]`), `useClearAssistant(dashboardId)` e `streamAssistant(dashboardId, body, signal, onEvent)` com o leitor de NDJSON de `streamAiWidget` (extraído para `src/lib/ndjson.ts` se estiver dentro de `features/ai/api.ts`, mantendo os testes de `ia-cypher` verdes); handlers MSW padrão de `GET .../assistant/messages` devolvendo `[]` em `src/test/server.ts`.
**Where**: `apps/web/src/features/assistant/api.ts`
**Depends on**: T1
**Reuses**: `streamAiWidget`, `apiFetch`, `ApiError`, TanStack Query
**Requirement**: GEN-08

**Done when**:

- [ ] Testes em `assistant-api.test.ts` com MSW e `ReadableStream`: `GEN-08 leitura do NDJSON entrega accepted, widget e done na ordem` (linhas partidas entre pedaços chegam inteiras; a função devolve `done`), 409 `SCHEMA_NOT_READ` vira `ApiError` com `code` e `message`, `useClearAssistant` chama `DELETE` e esvazia o cache, abortar o `signal` rejeita com `AbortError`
- [ ] Testes de `ai-api.test.ts` de `ia-cypher` continuam verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): read the assistant conversation and its ndjson stream`

---

### T12: Aplicar as ações do assistente no rascunho

**What**: `src/features/assistant/apply-actions.ts` com `applyAssistantActions(draft, actions)` conforme o design, e `insertTab`/`insertWidget` acrescentadas a `draft.ts`; mapeamento por `resolveAiMapping` com `result`, ou o mapeamento que passa em `validateMapping`, senão `TABLE` com `{}`; ação sobre aba ou widget ausente é ignorada.
**Where**: `apps/web/src/features/assistant/apply-actions.ts`
**Depends on**: T1
**Reuses**: `draft.ts` (`renameTab`, `removeTab`, `updateWidget`, `removeWidget`, `setName`, `addFilter`, `updateFilter`, `removeFilter`), `resolveAiMapping`, `validateMapping`, fixtures de dashboards
**Requirement**: GEN-03, GEN-06, CHAT-23

**Done when**:

- [ ] Testes em `apply-actions.test.ts`: `GEN-03 aplicar as ações cria abas, widgets e filtros no rascunho` (aba nova com o id e o nome da ação; widgets com título, Cypher, visualização, mapeamento resolvido e layout; filtro novo; nome do dashboard), `GEN-06 widget com erro entra no rascunho com o último Cypher` (`create_widget` com `error` e `result: null`: o widget tem o Cypher da ação, `TABLE` e `{}`), `CHAT-23 ação sobre widget que saiu do rascunho é ignorada` (`update_widget` e `set_layout` de widget removido não mudam nada e não criam widget), `remove_filter` tira o `crossFilter` dos widgets que apontavam para ele, `update_widget` com `BAR` e mapeamento de coluna ausente vira a sugestão de `resolveAiMapping`, o rascunho original não é mutado
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): apply assistant actions to the dashboard draft`

---

### T13: Orquestrar os pedidos ao assistente

**What**: `useAssistant({ dashboardId, draft, setDraft, ensureEditing, editing })` conforme o design: um pedido por vez, `ensureEditing` antes de enviar, `accepted` e `done` no cache da conversa, `progress` pelos eventos `planned`/`widget`, aplicação inteira no `done` com a foto anterior, semente da prévia como `useAiGenerations`, `failure` em `provider_error`, `error` e erro HTTP, `retry` com `retryOf`, `cancel`, aborto com `editing` falso e ao desmontar, `undo` e `undoMessageId` enquanto `draft === after`.
**Where**: `apps/web/src/features/assistant/useAssistant.ts`
**Depends on**: T11, T12
**Reuses**: `streamAssistant`, `applyAssistantActions`, semente de cache de `useAiGenerations`, `renderHook`, `QueryClient` de teste, MSW em `ReadableStream`
**Requirement**: GEN-09, GEN-13, CHAT-10, CHAT-11, CHAT-14, CHAT-21, CHAT-22, CHAT-26, CHAT-27, CHAT-28

**Done when**:

- [ ] Testes em `useAssistant.test.tsx`: `GEN-09 Cancelar a geração aborta o pedido e deixa o rascunho como estava` (depois de `widget` 1 de 3, `cancel()`: `request.signal.aborted` no handler é verdadeiro e o rascunho é o mesmo objeto), `GEN-13 resultado da geração fica no rascunho sem gravar o dashboard` (depois do `done` o rascunho tem os widgets e nenhum `PUT /api/dashboards/:id` foi feito), `CHAT-10 hook oferece Desfazer só para a resposta mais recente que alterou o rascunho` (resposta com ações: `undoMessageId` é o id dela; resposta seguinte sem ações: continua o da anterior; resposta seguinte com ações: passa a ser a nova), `CHAT-11 Desfazer devolve o rascunho ao estado anterior à resposta` (`undo()` volta o mesmo objeto de antes e `undoMessageId` some), `CHAT-14 Cancelar durante a resposta aborta e não altera o rascunho` (antes de `planned`), `CHAT-21 falha do provedor mostra a mensagem e Tentar novamente reenvia a mesma mensagem` (`provider_error` `AI_PROVIDER_AUTH`: `failure` com "O provedor de IA recusou a chave configurada" e o id do `accepted`; `retry()` envia o mesmo texto com `retryOf`), `CHAT-22 falha do provedor depois do plano não altera o rascunho` (`planned`, `widget` e depois `provider_error`: o rascunho é o mesmo objeto), `CHAT-26 Descartar mantém a conversa e tira o Desfazer` (trocar o rascunho pelo salvo: `undoMessageId` some e o cache da conversa continua com as mensagens), `CHAT-27 schema não lido mostra a mensagem na conversa` (409 `SCHEMA_NOT_READ`: `failure` com "Leia o schema da conexão antes de usar a IA"), `CHAT-28 sair do dashboard para o pedido` (desmontar e `editing` falso abortam o pedido), `send` chama `ensureEditing` antes do `fetch`
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): orchestrate assistant requests with apply, undo and cancel`

---

### Phase 5 tasks: Painel, página e geração no web

### T14: Mostrar as mensagens da conversa

**What**: `AssistantMessageList` conforme o design, controlado por props (`status`, `messages`, `onReload`, `undoMessageId`, `onUndo`, `failure`, `onRetry`): esqueleto, erro com "Tentar novamente", estado vazio, mensagens em ordem com texto, mudanças, não aplicados, criados, com erro e descartados, "Desfazer" só na mensagem indicada, falha sob a mensagem do usuário com "Tentar novamente".
**Where**: `apps/web/src/features/assistant/AssistantMessageList.tsx`
**Depends on**: T1
**Reuses**: `MESSAGES`, shadcn `skeleton`, `button`
**Requirement**: GEN-07, GEN-12, CHAT-09, CHAT-10, CHAT-20, CHAT-21, HIST-07, HIST-08, HIST-09

**Done when**:

- [ ] Testes com gesto em `AssistantMessageList.test.tsx`: `HIST-07 conversa carregando mostra esqueleto`, `HIST-08 conversa que não carrega mostra Não foi possível carregar a conversa e Tentar novamente` (clicar chama `onReload`), `CHAT-20 conversa vazia mostra Descreva o que você quer ver ou mudar neste dashboard`, `CHAT-09 resposta mostra o texto e a lista do que mudou` (cada item de `changes` e de `notApplied` em uma linha), `GEN-07 resposta mostra os widgets criados e os títulos com erro` ("3 widgets criados" e "Widgets com erro: Ranking de lojas"), `GEN-12 resposta mostra quantos widgets foram descartados` ("3 widgets descartados: o limite é 20 por pedido"), `CHAT-10 Desfazer aparece só na resposta indicada` (duas respostas com mudanças e `undoMessageId` da segunda: um botão só, na segunda; clicar chama `onUndo`), `HIST-09 respostas antigas aparecem sem Desfazer` (sem `undoMessageId`: nenhum botão "Desfazer"), `CHAT-21 falha mostra a mensagem do provedor e Tentar novamente na mensagem do usuário` (clicar chama `onRetry`), mensagens na ordem recebida
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): show the assistant conversation messages`

---

### T15: Criar o campo de mensagem do assistente

**What**: `AssistantComposer` conforme o design, controlado por props (`value`, `onChange`, `onSubmit`, `onCancel`, `running`, `progress`, `disabledReason`): `textarea` "Mensagem", contador `n/4.000`, "Enviar" desabilitado vazio e acima do limite com a mensagem, Enter envia e Shift+Enter quebra linha, rodando com o campo desabilitado, "Pensando..." ou "Gerando widget N de M" e "Cancelar".
**Where**: `apps/web/src/features/assistant/AssistantComposer.tsx`
**Depends on**: T1
**Reuses**: `AskAiPanel` (padrão de contador e limite), `MESSAGES`, `ASSISTANT_MESSAGE_MAX`, shadcn `textarea`, `button`
**Requirement**: GEN-08, CHAT-13, CHAT-15, CHAT-16

**Done when**:

- [ ] Testes com gesto em `AssistantComposer.test.tsx`: `CHAT-15 Enviar fica desabilitado com a mensagem vazia` (vazio e só espaços; digitar "troque para linha" habilita; Enter com o campo vazio não chama `onSubmit`), `CHAT-16 mensagem com mais de 4.000 caracteres mostra A mensagem passa de 4.000 caracteres` (e "Enviar" desabilitado), `CHAT-13 durante a resposta o campo fica desabilitado e mostra Cancelar` (com `running` e sem `progress`: "Pensando..."; clicar em "Cancelar" chama `onCancel`), `GEN-08 durante a geração mostra Gerando widget N de M e Cancelar` (com `progress` `{ index: 2, total: 5 }`: "Gerando widget 2 de 5"), Shift+Enter quebra a linha sem enviar
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add the assistant message composer`

---

### T16: Montar o painel do assistente

**What**: `AssistantPanel` conforme o design: `aside` "Assistente" de largura fixa, cabeçalho com "Limpar conversa" (alert-dialog "Apagar toda a conversa deste dashboard?", "Apagar" e "Cancelar") e fechar, `AssistantMessageList` em área `flex-1 overflow-y-auto` que rola até a última mensagem a cada nova, `AssistantComposer` fixo embaixo; liga `useAssistantMessages`, `useClearAssistant` e o estado de `useAssistant` recebido por props.
**Where**: `apps/web/src/features/assistant/AssistantPanel.tsx`
**Depends on**: T14, T15, T11
**Reuses**: `AssistantMessageList`, `AssistantComposer`, `useAssistantMessages`, `useClearAssistant`, `useAiStatus`, shadcn `alert-dialog`, `button`
**Requirement**: HIST-04, HIST-05, CHAT-19

**Done when**:

- [ ] Testes com gesto em `AssistantPanel.test.tsx` (MSW): `HIST-04 Limpar conversa pede confirmação com Apagar toda a conversa deste dashboard?` ("Cancelar" fecha sem requisição), `HIST-05 confirmar a limpeza apaga a conversa do painel` (o `DELETE` sai e o painel mostra o estado vazio), `CHAT-19 conversa rola com a mais recente embaixo e o campo fixo` (a lista está num contêiner com `overflow-y-auto` e `flex-1`, o `textarea` fica fora dele, depois do contêiner; ao chegar uma mensagem nova, `scrollIntoView` é chamado no último item), sem provedor o composer fica desabilitado com "Nenhum provedor de IA configurado"
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): compose the assistant side panel`

---

### T17: Ligar o assistente à página do dashboard

**What**: No `DashboardPage`, o botão "Assistente" (`aria-pressed`) no cabeçalho só com `ai.use` e `permissions.edit`, o painel à direita num contêiner `flex` com a grade em `min-w-0 flex-1`, o estado aberto ou fechado em `localStorage['ninbi-assistant-open']` com try/catch, o painel fora da área das abas, `useAssistant` com `ensureEditing` do `useDashboardEditor`, e `assistantBusy` repassado para deixar "Pedir à IA" desabilitado em todos os widgets enquanto o assistente responde.
**Where**: `apps/web/src/features/dashboards/DashboardPage.tsx` (modify)
**Depends on**: T16, T13
**Reuses**: `AssistantPanel`, `useAssistant`, `useDashboardEditor`, `useAiGenerations`, `WidgetCard`, `DashboardTabsBar`, `can()`, `useSession`, `mockElementSize`, fixtures de dashboards
**Requirement**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-18, CHAT-25, CHAT-30, HIST-02

**Done when**:

- [ ] Testes com gesto em `AssistantDashboard.test.tsx` (página do dashboard, MSW): `CHAT-01 Assistente abre e fecha o painel à direita` (clicar abre o `aside` "Assistente", depois da grade na ordem do documento; clicar de novo fecha), `CHAT-02 painel aberto deixa a grade na largura restante` (painel e grade são irmãos num contêiner `flex`; a grade tem `min-w-0` e `flex-1`; o painel não tem `absolute` nem `fixed`; com `mockElementSize` de 816 px no contêiner da grade, a grade usa 816 px), `CHAT-03 painel volta aberto ou fechado como foi deixado neste navegador` (fechar, desmontar e abrir de novo: fechado; abrir, desmontar e abrir: aberto; `localStorage` que lança erro não quebra a página), `CHAT-04 enviar em visualização entra no modo de edição e aplica no rascunho` (fora da edição, enviar "troque para linha": a página entra em edição e o widget mostra a mudança do `done`), `CHAT-18 Assistente aparece só para Admin e Editor que podem editar` (Visualizador e Editor com "pode ver" não veem o botão; dono, Editor com "pode editar" e Admin veem), `CHAT-25 Pedir à IA fica desabilitado em todos os widgets enquanto o assistente responde` (com o stream aberto, o item "Pedir à IA" de cada card está desabilitado; depois do `done`, habilitado), `CHAT-30 trocar de aba mantém o painel aberto e a conversa` (trocar para a 2ª aba: o painel e as mensagens continuam na tela), `HIST-02 reabrir o dashboard mostra a conversa` (com o `GET` devolvendo duas mensagens, abrir a página com o painel aberto mostra as duas na ordem)
- [ ] Testes de `DashboardPage`, `WidgetCard` e `AskAiWidget` de `dashboards-consultas`, `widgets-graficos`, `ia-cypher` e `interatividade` continuam verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): open the assistant beside the dashboard grid`

---

### T18: Gerar o dashboard a partir de uma descrição

**What**: No `NewDashboardDialog`, para `ai.use`, a escolha "Em branco" ou "Descrever para a IA"; a segunda mostra "Nome", "Conexão" e "Descrição" validada por `assistantDescriptionSchema`, fica desabilitada sem provedor com "Nenhum provedor de IA configurado", e "Criar" chama `POST /api/dashboards` e navega para `/dashboards/<id>?editar=1` com `state: { assistantPrompt }`. No `DashboardPage`, `location.state.assistantPrompt` abre o painel, envia a descrição uma vez e limpa o estado.
**Where**: `apps/web/src/features/dashboards/NewDashboardDialog.tsx` (modify)
**Depends on**: T17
**Reuses**: `useCreateDashboard`, `useConnections`, `useAiStatus`, `assistantDescriptionSchema`, react-hook-form, shadcn `tabs` ou `radio`, `textarea`, `DashboardPage`, `useAssistant`
**Requirement**: GEN-01, GEN-02, GEN-10, GEN-11, GEN-14

**Done when**:

- [ ] Testes com gesto em `DescribeDashboard.test.tsx` (MSW): `GEN-01 Novo dashboard oferece Descrever para a IA com Nome, Conexão e Descrição` (as duas opções aparecem; "Em branco" continua com "Nome" e "Conexão" como antes), `GEN-10 Descrição vazia ou longa mostra a mensagem no campo` ("Informe a descrição" e "A descrição passa de 4.000 caracteres", sem `POST`), `GEN-11 sem provedor Descrever para a IA fica desabilitado com Nenhum provedor de IA configurado`, `GEN-02 Descrever para a IA cria o dashboard e abre o assistente com a descrição como primeira mensagem` (o `POST /api/dashboards` leva nome e conexão; a página abre em edição com o painel aberto; o `POST .../assistant/messages` leva a descrição como `message`; a mensagem aparece na conversa; a sidebar é invalidada; recarregar a página não envia de novo), `GEN-14 falha da geração inicial mantém o dashboard vazio em edição com o erro na conversa` (`provider_error` no stream: a página continua em edição com "Esta aba está vazia", a mensagem do provedor e "Tentar novamente" na conversa)
- [ ] Testes de `NewDashboardDialog` de `dashboards-consultas` continuam verdes
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): generate a whole dashboard from a description`

---

## Checks

**C1** - "Novo dashboard" oferece "Descrever para a IA" com "Nome", "Conexão" e "Descrição" (GEN-01, AC 1)
Proof: run web | ✓ GEN-01 Novo dashboard oferece Descrever para a IA com Nome, Conexão e Descrição

**C2** - "Descrever para a IA" cria o dashboard de quem pediu, no fim da sidebar dele, aberto em edição com o assistente aberto e a descrição como primeira mensagem (GEN-02, AC 2)
Proof: run api | ✓ GEN-02 dashboard criado por quem pede a geração é dele e entra no fim da sidebar
Proof: run web | ✓ GEN-02 Descrever para a IA cria o dashboard e abre o assistente com a descrição como primeira mensagem

**C3** - A geração cria no rascunho as abas, os widgets com Cypher, visualização, mapeamento e título, e os filtros devolvidos pelo LLM (GEN-03, AC 3)
Proof: run api | ✓ GEN-03 plano com abas, widgets e filtros vira ações com ids novos
Proof: run api | ✓ GEN-03 geração cria abas, widgets e filtros devolvidos pelo LLM
Proof: run web | ✓ GEN-03 aplicar as ações cria abas, widgets e filtros no rascunho

**C4** - Cada widget gerado fica na grade de 12 colunas, sem sobreposição e com no mínimo 2 colunas por 2 linhas (GEN-04, AC 4)
Proof: run api | ✓ GEN-04 widgets ficam na grade de 12 colunas sem sobreposição e com no mínimo 2 por 2

**C5** - Cada widget gerado passa pela validação somente leitura, pela execução e pela autocorreção de `ia-cypher` (GEN-05, AC 5)
Proof: run api | ✓ GEN-05 generate valida, executa e corrige o Cypher do widget
Proof: run api | ✓ GEN-05 cada widget gerado passa pela validação, execução e autocorreção

**C6** - Widget que continua falhando entra no rascunho com erro e o último Cypher, e os demais seguem (GEN-06, AC 6)
Proof: run api | ✓ GEN-06 widget que continua falhando entra com erro e o último Cypher e os demais seguem
Proof: run web | ✓ GEN-06 widget com erro entra no rascunho com o último Cypher

**C7** - A conversa mostra quantos widgets foram criados e o título de cada widget com erro (GEN-07, AC 7)
Proof: run api | ✓ GEN-07 resposta da geração informa quantos widgets foram criados e os títulos com erro
Proof: run web | ✓ GEN-07 resposta mostra os widgets criados e os títulos com erro

**C8** - Durante a geração aparecem "Gerando widget N de M" e "Cancelar" (GEN-08, AC 8)
Proof: run api | ✓ GEN-08 resposta informa o widget N de M em geração
Proof: run web | ✓ GEN-08 leitura do NDJSON entrega accepted, widget e done na ordem
Proof: run web | ✓ GEN-08 durante a geração mostra Gerando widget N de M e Cancelar

**C9** - "Cancelar" para a geração e deixa o rascunho como estava (GEN-09, AC 9)
Proof: run api | ✓ GEN-09 cancelar para a geração sem nova chamada nem resposta gravada
Proof: run web | ✓ GEN-09 Cancelar a geração aborta o pedido e deixa o rascunho como estava

**C10** - "Descrição" vazia ou com mais de 4.000 caracteres é recusada com a mensagem no campo (GEN-10, AC 10)
Proof: run contracts | ✓ GEN-10 descrição vazia ou com mais de 4.000 caracteres é recusada
Proof: run web | ✓ GEN-10 Descrição vazia ou longa mostra a mensagem no campo

**C11** - Sem provedor, "Descrever para a IA" fica desabilitado com "Nenhum provedor de IA configurado" (GEN-11, AC 11)
Proof: run web | ✓ GEN-11 sem provedor Descrever para a IA fica desabilitado com Nenhum provedor de IA configurado

**C12** - Com mais de 20 widgets, os 20 primeiros são criados e a conversa avisa quantos foram descartados (GEN-12, AC 12)
Proof: run api | ✓ GEN-12 mais de 20 widgets novos ficam nos 20 primeiros e contam os descartados
Proof: run web | ✓ GEN-12 resposta mostra quantos widgets foram descartados

**C13** - A geração fica no rascunho, sem gravar o dashboard antes de "Salvar" (GEN-13, AC 13)
Proof: run api | ✓ GEN-13 pedido ao assistente não grava o dashboard
Proof: run web | ✓ GEN-13 resultado da geração fica no rascunho sem gravar o dashboard

**C14** - O controle "Assistente" abre e fecha o painel de chat à direita (CHAT-01, AC 1)
Proof: run web | ✓ CHAT-01 Assistente abre e fecha o painel à direita

**C15** - Com o painel aberto, a grade usa a largura restante e o painel não cobre widgets (CHAT-02, AC 2)
Proof: run web | ✓ CHAT-02 painel aberto deixa a grade na largura restante

**C16** - Reabrir o dashboard mostra o painel aberto ou fechado como foi deixado nesse navegador (CHAT-03, AC 3)
Proof: run web | ✓ CHAT-03 painel volta aberto ou fechado como foi deixado neste navegador

**C17** - Enviar uma mensagem em modo de visualização coloca o dashboard em edição antes de aplicar (CHAT-04, AC 4)
Proof: run web | ✓ CHAT-04 enviar em visualização entra no modo de edição e aplica no rascunho

**C18** - O pedido ao LLM traz o schema, a estrutura do rascunho, as 20 mensagens mais recentes e a mensagem nova (CHAT-05, AC 5)
Proof: run api | ✓ CHAT-05 pedido traz schema, estrutura do rascunho, 20 mensagens recentes e a mensagem nova
Proof: run api | ✓ CHAT-05 assistente envia ao LLM só as 20 mensagens mais recentes

**C19** - Nenhuma linha de resultado, valor de filtro ou outro dado do banco além dos exemplos do schema vai ao provedor (CHAT-06, AC 6)
Proof: run contracts | ✓ CHAT-06 contexto do rascunho descarta valores e opções dos filtros e resultados
Proof: run api | ✓ CHAT-06 rascunho serializado não leva nada além da estrutura
Proof: run api | ✓ CHAT-06 nenhuma linha de resultado nem valor de filtro chega ao provedor

**C20** - Só as ações da lista fechada são aceitas (CHAT-07, AC 7)
Proof: run api | ✓ CHAT-07 só as ações da lista fechada são aceitas

**C21** - Ação que cria ou altera o Cypher de um widget passa pela validação, execução e autocorreção (CHAT-08, AC 8)
Proof: run api | ✓ CHAT-08 generate parte do widget atual e dos filtros
Proof: run api | ✓ CHAT-08 ação que muda o Cypher passa pela validação, execução e autocorreção

**C22** - A conversa mostra a resposta do assistente com a lista do que mudou (CHAT-09, AC 9)
Proof: run api | ✓ CHAT-09 cada ação aceita gera a descrição da mudança
Proof: run api | ✓ CHAT-09 resposta do assistente traz a lista do que mudou
Proof: run web | ✓ CHAT-09 resposta mostra o texto e a lista do que mudou

**C23** - A resposta mais recente que alterou o rascunho mostra "Desfazer" (CHAT-10, AC 10)
Proof: run web | ✓ CHAT-10 hook oferece Desfazer só para a resposta mais recente que alterou o rascunho
Proof: run web | ✓ CHAT-10 Desfazer aparece só na resposta indicada

**C24** - "Desfazer" devolve o rascunho ao estado anterior à resposta (CHAT-11, AC 11)
Proof: run web | ✓ CHAT-11 Desfazer devolve o rascunho ao estado anterior à resposta

**C25** - Resposta sem alterações mostra o texto e não altera o rascunho (CHAT-12, AC 12)
Proof: run api | ✓ CHAT-12 texto sem JSON vira resposta sem ações
Proof: run api | ✓ CHAT-12 resposta sem ações não altera o rascunho

**C26** - Enquanto o assistente responde, o campo fica desabilitado e "Cancelar" aparece (CHAT-13, AC 13)
Proof: run web | ✓ CHAT-13 durante a resposta o campo fica desabilitado e mostra Cancelar

**C27** - "Cancelar" durante uma resposta para o pedido e deixa o rascunho como estava (CHAT-14, AC 14)
Proof: run web | ✓ CHAT-14 Cancelar durante a resposta aborta e não altera o rascunho

**C28** - Mensagem vazia mantém o envio desabilitado (CHAT-15, AC 15)
Proof: run web | ✓ CHAT-15 Enviar fica desabilitado com a mensagem vazia

**C29** - Mensagem com mais de 4.000 caracteres é recusada com "A mensagem passa de 4.000 caracteres" (CHAT-16, AC 16)
Proof: run contracts | ✓ CHAT-16 mensagem com mais de 4.000 caracteres dá A mensagem passa de 4.000 caracteres
Proof: run api | ✓ CHAT-16 mensagem longa responde 400 com A mensagem passa de 4.000 caracteres
Proof: run web | ✓ CHAT-16 mensagem com mais de 4.000 caracteres mostra A mensagem passa de 4.000 caracteres

**C30** - Visualizador, ou quem não pode editar o dashboard, recebe 403 no chat (CHAT-17, AC 17)
Proof: run api | ✓ CHAT-17 Visualizador e quem não edita recebem 403 na conversa
Proof: run api | ✓ CHAT-17 Visualizador e quem não edita recebem 403 no assistente

**C31** - O controle "Assistente" aparece só para Admin e Editor que podem editar o dashboard (CHAT-18, AC 18)
Proof: run web | ✓ CHAT-18 Assistente aparece só para Admin e Editor que podem editar

**C32** - A conversa rola com a mais recente embaixo e o campo de mensagem fixo (CHAT-19, AC 19)
Proof: run web | ✓ CHAT-19 conversa rola com a mais recente embaixo e o campo fixo

**C33** - Conversa vazia mostra "Descreva o que você quer ver ou mudar neste dashboard" (CHAT-20, AC 20)
Proof: run web | ✓ CHAT-20 conversa vazia mostra Descreva o que você quer ver ou mudar neste dashboard

**C34** - Mensagem do usuário e resposta do assistente ficam no PostgreSQL, ligadas ao dashboard e ao usuário (HIST-01, AC 1)
Proof: run api | ✓ HIST-01 tabela assistant_messages guarda mensagens por dashboard e usuário
Proof: run api | ✓ HIST-01 mensagem do usuário e resposta do assistente ficam gravadas no PostgreSQL

**C35** - Reabrir o dashboard mostra a conversa do usuário nesse dashboard, na ordem (HIST-02, AC 2)
Proof: run api | ✓ HIST-02 conversa volta na ordem em que aconteceu
Proof: run web | ✓ HIST-02 reabrir o dashboard mostra a conversa

**C36** - Cada usuário vê só a própria conversa (HIST-03, AC 3)
Proof: run api | ✓ HIST-03 cada usuário vê só a própria conversa

**C37** - "Limpar conversa" pede confirmação com "Apagar toda a conversa deste dashboard?" (HIST-04, AC 4)
Proof: run web | ✓ HIST-04 Limpar conversa pede confirmação com Apagar toda a conversa deste dashboard?

**C38** - Confirmar a limpeza apaga as mensagens desse usuário nesse dashboard (HIST-05, AC 5)
Proof: run api | ✓ HIST-05 limpar apaga só as mensagens do usuário nesse dashboard
Proof: run web | ✓ HIST-05 confirmar a limpeza apaga a conversa do painel

**C39** - Excluir um dashboard apaga todas as conversas dele (HIST-06, AC 6)
Proof: run api | ✓ HIST-06 excluir o dashboard apaga as conversas

**C40** - Enquanto a conversa carrega, o painel mostra um esqueleto (HIST-07, AC 7)
Proof: run web | ✓ HIST-07 conversa carregando mostra esqueleto

**C41** - Conversa que não carrega mostra "Não foi possível carregar a conversa" com "Tentar novamente" (HIST-08, AC 8)
Proof: run web | ✓ HIST-08 conversa que não carrega mostra Não foi possível carregar a conversa e Tentar novamente

**C42** - Ao reabrir o dashboard, as respostas antigas aparecem sem "Desfazer" (HIST-09, AC 9)
Proof: run web | ✓ HIST-09 respostas antigas aparecem sem Desfazer

**C43** - Falha do provedor mostra a mensagem de `ia-cypher` na conversa e "Tentar novamente" na mensagem do usuário (CHAT-21, edge case)
Proof: run api | ✓ CHAT-21 Tentar novamente reaproveita a mensagem sem gravar outra
Proof: run web | ✓ CHAT-21 falha do provedor mostra a mensagem e Tentar novamente reenvia a mesma mensagem
Proof: run web | ✓ CHAT-21 falha mostra a mensagem do provedor e Tentar novamente na mensagem do usuário

**C44** - Falha do provedor depois de parte das ações deixa o rascunho como estava (CHAT-22, edge case)
Proof: run api | ✓ CHAT-22 falha do provedor no meio dos widgets não devolve ações nem grava resposta
Proof: run web | ✓ CHAT-22 falha do provedor depois do plano não altera o rascunho

**C45** - Ação que cita widget, aba ou filtro inexistente é ignorada, as demais são aplicadas e a resposta informa (CHAT-23, edge case)
Proof: run api | ✓ CHAT-23 ação que cita widget, aba ou filtro inexistente é ignorada e informada
Proof: run web | ✓ CHAT-23 ação sobre widget que saiu do rascunho é ignorada

**C46** - Ação que removeria a última aba é ignorada e informada (CHAT-24, edge case)
Proof: run api | ✓ CHAT-24 remover a última aba é ignorado e informado

**C47** - Enquanto o assistente responde, "Pedir à IA" fica desabilitado em todos os widgets (CHAT-25, edge case)
Proof: run web | ✓ CHAT-25 Pedir à IA fica desabilitado em todos os widgets enquanto o assistente responde

**C48** - "Descartar" mantém a conversa e remove o "Desfazer" (CHAT-26, edge case)
Proof: run web | ✓ CHAT-26 Descartar mantém a conversa e tira o Desfazer

**C49** - Conexão sem schema lido recusa o pedido com "Leia o schema da conexão antes de usar a IA" (CHAT-27, edge case)
Proof: run api | ✓ CHAT-27 conexão sem schema lido responde 409 com Leia o schema da conexão antes de usar a IA
Proof: run web | ✓ CHAT-27 schema não lido mostra a mensagem na conversa

**C50** - Geração inicial que falha antes do primeiro widget deixa o dashboard criado, vazio e em edição, com o erro na conversa (GEN-14, edge case)
Proof: run web | ✓ GEN-14 falha da geração inicial mantém o dashboard vazio em edição com o erro na conversa

**C51** - Trocar de aba com o painel aberto mantém o painel e a conversa (CHAT-30, edge case)
Proof: run web | ✓ CHAT-30 trocar de aba mantém o painel aberto e a conversa

**C52** - Sair do dashboard com um pedido em andamento para o pedido (CHAT-28, edge case)
Proof: run web | ✓ CHAT-28 sair do dashboard para o pedido

**C53** - Cada pedido vai ao log com usuário, dashboard, ações aplicadas, widgets com erro e duração, sem o texto das mensagens (CHAT-29, edge case)
Proof: run api | ✓ CHAT-29 log de cada pedido tem usuário, dashboard, ações, widgets com erro e duração sem o texto

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** lote 1 (T1-T7, sonnet) sobre o commit de fechamento da interatividade - em andamento.
**Walked:** dispensado por AD-023

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T2
Phase 2:  T3
          T4 ------→ T7
          T5
          T6 ------→ T7
Phase 3:  T8 ------→ T9 ------→ T10
Phase 4:  T11 -----→ T13
          T12 -----→ T13
Phase 5:  T14 -----→ T16
          T15 -----→ T16 -----→ T17 -----→ T18
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order: T1 to T18.
