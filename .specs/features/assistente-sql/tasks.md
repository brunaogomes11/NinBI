# Assistente SQL Tasks

**Approved**: 2026-11-17 - user: "Aprovar"

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas está dispensada por AD-023: nenhuma task captura tela. Pré-requisito: `fontes-sql` concluída (`SourceRegistry`, `Source.dialect`, `AiWidgetService.generate({dialect})`, `SchemaDto`, `serializeSchema` relacional). Quem executa confere os nomes reais e marca `SPEC_DEVIATION` onde diferirem.

---

**Design**: inline (feature média; as decisões estão nas Assumptions da spec)
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run api**: `pnpm --filter @ninbi/api test`
**Run web**: `pnpm --filter @ninbi/web test`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo nome de teste começa com o ID do requisito. Todo script `test` roda `vitest run --reporter=verbose`.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012, AD-026; matrizes de `fontes-sql` e `ia-dashboard`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| API: prompt e resolução de ações (funções puras) | unit | Todos os ramos; 1:1 com os ACs | `apps/api/test/assistant/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: serviço e rota do assistente | integration (supertest + PGlite + `FakeNeo4jGateway` + `FakeSqlGateway` + modelo roteirizado) | Cada caminho do critério, sucesso e falha | `apps/api/test/assistant/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Web: funções, hooks e página | unit (Testing Library + MSW) | Gesto do critério e o que a tela mostra | `apps/web/src/features/**/*.test.ts(x)` | `pnpm --filter @ninbi/web test` |
| Config e regressão | none | - (gate de build) | - | build gate |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task com testes de um só pacote | `pnpm --filter <pacote da task> test` |
| Full | Não usado | - |
| Build | Última task | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: API

```
T1 → T2 → T3 → T4
```

### Phase 2: Web e regressão

```
T4 → T5 → T6 → T7 → T8
```

---

## Task Breakdown

### T1: Prompt do assistente por banco

**What**: `buildAssistantMessages` recebe o schema como `SchemaDto` e o `dialect` da fonte (`Cypher`, `PostgreSQL`, `MySQL` ou `T-SQL`); o texto de sistema diz "um dashboard de dados em <banco>" (Neo4j, PostgreSQL, MySQL ou SQL Server) e serializa o schema com `serializeSchema` (que já trata o relacional); `serializeDraft` recebe a linguagem e mostra a consulta de cada widget como `SQL:` com bloco ```sql ou `Cypher:` com bloco ```cypher; a frase sobre "prompt" fala da consulta e não de Cypher. Sem a linguagem, o resultado é o de hoje.
**Where**: `apps/api/src/assistant/assistant-prompt.ts`
**Depends on**: None
**Reuses**: `serializeSchema`, `visualizationGuide` de `../ai/widget-prompt`
**Requirement**: ASQ-01, ASQ-02, ASQ-03, ASQ-04

**Done when**:

- [x] Teste `ASQ-01 plano para conexão SQL leva o schema relacional` em apps/api/test/assistant
- [x] Teste `ASQ-02 plano para conexão Neo4j leva o schema de grafo como antes` em apps/api/test/assistant
- [x] Teste `ASQ-03 sistema descreve o dashboard no banco da conexão` em apps/api/test/assistant
- [x] Teste `ASQ-04 rascunho mostra a consulta na linguagem da conexão` em apps/api/test/assistant
- [x] Os testes de `assistant-prompt.spec.ts` que existem seguem verdes sem mudar nenhuma expectativa de Neo4j
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): describe the assistant request in the language of the connection`

---

### T2: Validar as opções de filtro pelo tipo da conexão

**What**: `resolveActions` recebe um validador de consulta (`(query: string) => { ok: boolean }`) no lugar do `validateReadOnlyCypher` fixo, e `optionsAreReadOnly` o usa: uma ação de filtro com opções por consulta que o validador recusa é descartada como hoje.
**Where**: `apps/api/src/assistant/resolve-actions.ts`
**Depends on**: T1
**Reuses**: `optionsAreReadOnly`
**Requirement**: ASQ-08

**Done when**:

- [x] Teste `ASQ-08 filtro com consulta de opções é validado pelo tipo da conexão` em apps/api/test/assistant
- [x] Os testes de `resolve-actions.spec.ts` seguem verdes (o validador de Cypher é o padrão nos testes que não passam um)
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): validate assistant filter queries by connection type`

---

### T3: Schema, dialeto e validador pela conexão do rascunho

**What**: `prepare` carrega `SchemaDto` pela conexão do rascunho (sem `toGraphSchemaDto`), descobre o tipo e a fonte pelo `SourceRegistry`, mantém 409 `SCHEMA_NOT_READ` e 403 de conexão; guarda `dialect` e o validador da fonte em `PreparedAssistantRequest`; o plano usa `buildAssistantMessages` com o dialeto, `resolveActions` com `source.validate` e `generateWidget` repassa `dialect` ao `AiWidgetService.generate`. Remove `toGraphSchemaDto` de `schema-query.service.ts` se ficar sem uso.
**Where**: `apps/api/src/assistant/assistant.service.ts`
**Depends on**: T2
**Reuses**: `SourceRegistry`, `AiWidgetService.generate({dialect})`, `SchemaQueryService.get`
**Requirement**: ASQ-05, ASQ-09, ASQ-10

**Done when**:

- [x] Teste `ASQ-05 criar widget em conexão SQL pede a consulta no dialeto` em apps/api/test/assistant
- [x] Teste `ASQ-09 conexão SQL sem schema lido responde 409` em apps/api/test/assistant
- [x] Teste `ASQ-10 o tipo da conexão do rascunho decide schema e dialeto` em apps/api/test/assistant
- [x] Os testes de `assistant.service.spec.ts` e `assistant.route.spec.ts` de Neo4j seguem verdes
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): plan and generate assistant widgets for sql connections`

---

### T4: Executar, corrigir e falhar por widget em conexão SQL

**What**: Garante, com testes de rota usando `FakeSqlGateway`, que a consulta gerada passa por `source.validate`, é executada e corrigida pelo laço de `ia-cypher`; que "manter a consulta atual" executa pela conexão do rascunho; e que um widget SQL que não acerta entra com erro e a última consulta enquanto os demais seguem. Corrige o serviço só se um desses testes falhar.
**Where**: `apps/api/src/assistant/assistant.service.ts`
**Depends on**: T3
**Reuses**: `QueryService.run`, o laço de `generateWidget`
**Requirement**: ASQ-06, ASQ-07, ASQ-11

**Done when**:

- [x] Teste `ASQ-06 consulta SQL gerada é validada, executada e corrigida` em apps/api/test/assistant
- [x] Teste `ASQ-07 manter a consulta atual a executa pela conexão do rascunho` em apps/api/test/assistant
- [x] Teste `ASQ-11 widget SQL que falha entra com erro e a última consulta` em apps/api/test/assistant
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: opus
**Commit**: `test(api): prove assistant execution, correction and failure on sql connections`

---

### T5: Parâmetros dos widgets do assistente por linguagem

**What**: `applyAssistantActions(draft, actions, language = 'CYPHER')`: os `parameters` de cada widget criado ou alterado vêm de `extractParameterNames(query, language)`.
**Where**: `apps/web/src/features/assistant/apply-actions.ts`
**Depends on**: T4
**Reuses**: `extractParameterNames` de `@ninbi/contracts`
**Requirement**: ASQ-12

**Done when**:

- [x] Teste `ASQ-12 ações do assistente calculam parâmetros SQL` em apps/web/src
- [x] Os testes de `apply-actions.test.ts` seguem verdes
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): compute assistant widget parameters by query language`

---

### T6: Filtros do assistente pela linguagem

**What**: `UseAssistantOptions` ganha `language` (padrão `CYPHER`); `applyAssistantActions` recebe a linguagem e a descoberta dos widgets que usam um filtro usa `extractParameterNames(query, language)`.
**Where**: `apps/web/src/features/assistant/useAssistant.ts`
**Depends on**: T5
**Reuses**: `extractParameterNames`
**Requirement**: ASQ-13

**Done when**:

- [x] Teste `ASQ-13 filtros do assistente acham os widgets que usam o parâmetro em SQL` em apps/web/src
- [x] Os testes de `useAssistant.test.tsx` seguem verdes
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): find the widgets of a filter by query language in the assistant`

---

### T7: A página passa a linguagem ao assistente

**What**: `DashboardPage` passa a `useAssistant` a mesma `language` da conexão do rascunho que já passa ao editor de widget.
**Where**: `apps/web/src/features/dashboards/DashboardPage.tsx`
**Depends on**: T6
**Reuses**: a `language` já calculada na página
**Requirement**: ASQ-12

**Done when**:

- [x] Teste `ASQ-12 a página passa a linguagem da conexão ao assistente` em apps/web/src
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): pass the connection language to the assistant`

---

### T8: Regressão do assistente com Neo4j

**What**: Sem código novo: roda `pnpm build && pnpm typecheck && pnpm lint && pnpm test` na raiz e corrige só o que a feature quebrou, sem mudar nenhuma expectativa de Neo4j.
**Where**: `package.json`
**Depends on**: T7
**Reuses**: `pnpm test`
**Requirement**: ASQ-14

**Done when**:

- [x] `pnpm build && pnpm typecheck && pnpm lint && pnpm test` passa na raiz
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build
**Model**: sonnet
**Commit**: `test: confirm the assistant behaves as before with neo4j`

---

## Checks

**C1** - O pedido do plano para uma conexão SQL leva tabelas, colunas com tipo, exemplos permitidos e chaves estrangeiras (ASQ-01, AC 1)
Proof: run api | ✓ ASQ-01 plano para conexão SQL leva o schema relacional

**C2** - O pedido do plano para Neo4j leva o schema de grafo como antes (ASQ-02, AC 2)
Proof: run api | ✓ ASQ-02 plano para conexão Neo4j leva o schema de grafo como antes

**C3** - O sistema descreve o dashboard como "de dados em PostgreSQL", "MySQL", "SQL Server" ou "Neo4j" pelo tipo (ASQ-03, AC 3)
Proof: run api | ✓ ASQ-03 sistema descreve o dashboard no banco da conexão

**C4** - O rascunho mostra `SQL:` com ```sql para conexão SQL e `Cypher:` com ```cypher para Neo4j (ASQ-04, AC 4)
Proof: run api | ✓ ASQ-04 rascunho mostra a consulta na linguagem da conexão

**C5** - Criar widget em conexão SQL pede a consulta no dialeto da conexão (ASQ-05, AC 5)
Proof: run api | ✓ ASQ-05 criar widget em conexão SQL pede a consulta no dialeto

**C6** - A consulta SQL gerada é validada, executada e corrigida pelas regras de `ia-cypher` (ASQ-06, AC 6)
Proof: run api | ✓ ASQ-06 consulta SQL gerada é validada, executada e corrigida

**C7** - Manter a consulta atual a executa pela conexão do rascunho (ASQ-07, AC 7)
Proof: run api | ✓ ASQ-07 manter a consulta atual a executa pela conexão do rascunho

**C8** - A consulta de opções de um filtro é validada pelo tipo da conexão e a ação é descartada se escreve (ASQ-08, AC 8)
Proof: run api | ✓ ASQ-08 filtro com consulta de opções é validado pelo tipo da conexão

**C9** - Conexão SQL sem schema lido responde 409 `SCHEMA_NOT_READ` (ASQ-09, AC 9)
Proof: run api | ✓ ASQ-09 conexão SQL sem schema lido responde 409

**C10** - O tipo da conexão do rascunho decide schema, dialeto e validação (ASQ-10, AC 10)
Proof: run api | ✓ ASQ-10 o tipo da conexão do rascunho decide schema e dialeto

**C11** - Widget SQL que falha entra com erro e a última consulta, e os demais seguem (ASQ-11, AC 11)
Proof: run api | ✓ ASQ-11 widget SQL que falha entra com erro e a última consulta

**C12** - As ações do assistente calculam os parâmetros do widget como SQL, e a página passa a linguagem (ASQ-12, AC 12)
Proof: run web | ✓ ASQ-12 ações do assistente calculam parâmetros SQL
Proof: run web | ✓ ASQ-12 a página passa a linguagem da conexão ao assistente

**C13** - Os filtros do assistente acham os widgets que usam o parâmetro lido como SQL (ASQ-13, AC 13)
Proof: run web | ✓ ASQ-13 filtros do assistente acham os widgets que usam o parâmetro em SQL

**C14** - Para Neo4j o assistente se comporta como antes (suíte inteira verde) (ASQ-14, AC 14)
Proof: `pnpm test`

**C15** - Cypher devolvido para uma conexão SQL falha na validação e é corrigido (ASQ-15, edge case)
Proof: run api | ✓ ASQ-06 consulta SQL gerada é validada, executada e corrigida

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** fase 1 (T1 a T4, opus) returned; fase 2 (T5 a T8, sonnet) em f4ed685
**Walked:** none
