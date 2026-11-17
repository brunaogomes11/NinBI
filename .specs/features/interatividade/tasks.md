# Interatividade Tasks

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas (screens sub-agent, imagens `*.running.png`, walk) está dispensada por AD-023: nenhuma task captura tela. Esta feature não tem captura própria; os chips da barra de filtros seguem os chips da captura de `fundacao-auth` (AD-020).

Pré-requisito: `fundacao-auth`, `conexoes-schema`, `dashboards-consultas`, `compartilhamento`, `widgets-graficos` e `ia-cypher` concluídas (`dashboardSaveSchema`, `DashboardDto`, `WidgetDto`, `queryRunSchema`, `widgetRunSchema`, `widget-config.ts`, `MESSAGES`, `ERROR_CODES`; `extractParameterNames` e o tokenizador em `apps/api/src/queries/read-only-cypher.ts`; `QueryService.run` com `params`, `maskErrors` e `signal`; `QueriesController`; `DashboardsService`; `DashboardAccessService.assert` com 403 `DASHBOARD_EDIT_FORBIDDEN`; `createTestApp` com `neo4j`, `shares` e `chatModels`; `aiWidgetRequestSchema`, `buildWidgetMessages`; no web `renderApp`, fixtures de dashboards, `mockElementSize`, `useWidgetResult`, `WidgetCard`, `WidgetVisualization` e as views, `mapping/*`, `ResultTable`/`table-rules.ts`, `draft.ts`, `useDashboardEditor`, `DashboardPage`, `WidgetEditorDialog`, `CypherEditor`, `useTopBarAction`, `useAiGenerations`, `src/lib/format.ts`). Quem executa confere os nomes reais e marca `SPEC_DEVIATION` onde diferirem.

---

**Design**: `.specs/features/interatividade/design.md`
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run contracts**: `pnpm --filter @ninbi/contracts test`
**Run api**: `pnpm --filter @ninbi/api test`
**Run web**: `pnpm --filter @ninbi/web test`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo script `test` roda `vitest run --reporter=verbose`. Todo nome de teste começa com o ID do requisito e contém, na ordem, as palavras da linha de `Proof` da sua check (sem o `✓`). Se o runner imprimir outro marcador de sucesso, a linha da check é corrigida a partir da saída real, nunca o teste.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012 (testes unitários das partes críticas, entre elas permissões e mapeamento resultado para gráfico), AD-026 (testes rápidos com PGlite e `FakeNeo4jGateway`, nomes começando pelo ID do requisito, `--reporter=verbose`), AD-031 (nenhum `.tsx` com cor literal), e as matrizes aprovadas em `.specs/features/dashboards-consultas/tasks.md` e `.specs/features/widgets-graficos/tasks.md`. Strong defaults applied onde não há guia.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contratos (filtros, intervalos, `crossFilter`, `params`, parâmetros do Cypher, mensagens) | unit | Toda regra de campo com o texto exato da mensagem; casos válidos no limite | `packages/contracts/src/**/*.spec.ts` | `pnpm --filter @ninbi/contracts test` |
| API: funções puras (`toCypherParams`, `optionsFromResult`, prompt da IA) | unit | Todos os ramos; 1:1 com os ACs | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: services e rotas | integration (supertest + PGlite + `FakeNeo4jGateway` + `FakeShareResolver`) | Toda rota tocada: sucesso + cada erro do design + 403/404 por alcance | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Banco (colunas novas, migração) | integration (PGlite) | Migração aplica; padrões `[]` e `0` | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Web: funções puras (valores, clique, sessão, rascunho, CSV) | unit | Todos os ramos; 1:1 com os ACs; toda mensagem com o texto exato | `apps/web/src/features/**/*.test.ts` | `pnpm --filter @ninbi/web test` |
| Web: hooks (`useAutoRefresh`) | unit (`renderHook` + `QueryClient` + timers falsos) | Cada transição: ligado, oculto, visível vencido, edição, em andamento, reinício | `apps/web/src/features/refresh/*.test.ts(x)` | `pnpm --filter @ninbi/web test` |
| Web: componentes e páginas | unit (Testing Library + jsdom + user-event + MSW + `mockElementSize`) | Gesto do critério e o que a tela mostra; requisições contadas por widget; textos exatos | `apps/web/src/features/**/*.test.tsx` | `pnpm --filter @ninbi/web test` |

## Gate Check Commands

> Generated from the design - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task com testes de um só pacote | `pnpm --filter <pacote da task> test` (`@ninbi/contracts`, `@ninbi/api` ou `@ninbi/web`) |
| Full | Não usado: esta feature não tem teste de integração real | - |
| Build | Última task de cada fase | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

`pnpm test` na raiz é `pnpm -r test`.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Lotes de execução

| Lote | Fases | Tasks | Modelo |
| ---- | ----- | ----- | ------ |
| 1 | Phase 1 - Contratos e API | T1-T7 (7) | sonnet |
| 2 | Phase 2 - Regras e estado no web; Phase 3 - Atualização automática | T8-T15 (8) | sonnet |
| 3 | Phase 4 - Filtros na tela | T16-T21 (6) | sonnet |
| 4 | Phase 5 - Clique e exportação | T22-T24 (3) | sonnet |

Todas as tasks têm testes, por isso todos os lotes são `sonnet`.

### Phase 1: Contratos e API

```
T1 → T3 → T5
T2 → T3
T1 → T4
T1 → T6
T1 → T7
```

### Phase 2: Regras e estado no web

```
T8 → T12
T9
T10
T11
```

### Phase 3: Atualização automática

```
T13 → T15
T14
```

### Phase 4: Filtros na tela

```
T16 → T17 → T18 → T19
T17 → T20
T18 → T21
```

### Phase 5: Clique e exportação

```
T22 → T23
T24
```

---

## Task Breakdown

### Phase 1 tasks: Contratos e API

### T1: Definir os contratos de filtros, intervalos e "Ao clicar"

**What**: `packages/contracts/src/filters.ts` conforme o design: `FILTER_TYPES`, `FILTER_TYPE_LABELS`, `CROSS_FILTER_TYPES`, `OPTION_SOURCE_LABELS`, `FILTER_OPTIONS_MAX`, tipos de valor, `FilterOptions`, `DashboardFilter`, `dashboardFilterSchema` (rótulo, parâmetro, origem das opções obrigatória nos tipos de seleção, valor padrão por tipo), `dashboardFiltersSchema` (parâmetros repetidos entre filtros, contando `_inicio`/`_fim`), `filterParameterNames`, `REFRESH_INTERVALS` e `REFRESH_INTERVAL_LABELS`, `QueryParamValue` e `queryParamsSchema`, `CrossFilterConfig`, `FilterOptionsDto`, `filterOptionsDraftSchema`, `FilterPromptInfo` e `filtersForPrompt`. Em `dashboards.ts`: `dashboardSaveSchema` com `filters` (padrão `[]`) e `refreshIntervalSec` (padrão `0`), `DashboardDto` com `filters` e `refreshIntervalSec`, `WidgetDto.parameters`, `params` de `queryRunSchema` e `widgetRunSchema` por `queryParamsSchema`. Em `widget-config.ts`: `crossFilter` opcional no `config` de toda visualização menos `KPI`; o `superRefine` do dashboard recusa `crossFilter` de filtro inexistente ou de tipo fora de `CROSS_FILTER_TYPES` com "Filtro do clique inválido". Mensagens da tabela do design em `MESSAGES`; `FILTER_NOT_FOUND` em `ERROR_CODES`. Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/filters.ts`
**Depends on**: None
**Reuses**: `dashboardSaveSchema`, `widgetConfigSchema`, `MESSAGES`, `zod`
**Requirement**: FLT-02, FLT-03, FLT-04, FLT-05, RFR-01, XFL-01, XFL-09

**Done when**:

- [x] Testes em `packages/contracts/src/filters.spec.ts`: `FLT-02 tipos de filtro na ordem da spec` (`FILTER_TYPES.map(t => FILTER_TYPE_LABELS[t])` é "Seleção única", "Seleção múltipla", "Texto", "Número", "Data", "Intervalo de datas"), `FLT-03 parâmetro inválido, longo ou repetido é recusado com a mensagem` (`1ano`, `ano-mes` e `ano mes` dão "O parâmetro começa com uma letra e usa só letras, dígitos e _"; 41 caracteres dá "O parâmetro pode ter até 40 caracteres" e 40 passa; dois filtros `categoria` dão "Este parâmetro já é usado por outro filtro" em `filters.1.parameter`; `periodo` de intervalo e outro filtro `periodo_inicio` também), `FLT-04 rótulo vazio ou com mais de 40 caracteres é recusado` ("   " dá "Informe o rótulo"; 41 caracteres dá "O rótulo pode ter até 40 caracteres"), `FLT-05 filtro de seleção exige a origem das opções` (`SINGLE_SELECT` e `MULTI_SELECT` com `options: null` são recusados; `STATIC` sem valores dá "Informe ao menos uma opção"; 1.001 valores dá "A lista pode ter até 1.000 opções"; `QUERY` com Cypher vazio dá "Informe a consulta das opções"; `TEXT` com `options: null` passa), valor padrão por tipo (`NUMBER` com `'abc'` e `DATE` com `'2024-13-01'` dão "Valor padrão inválido"; `DATE_RANGE` com início maior que o fim dá "A data inicial é maior que a final"), `RFR-01 intervalos de atualização na ordem da spec` (`REFRESH_INTERVALS.map(s => REFRESH_INTERVAL_LABELS[s])` é "Desligada", "10 s", "30 s", "1 min", "5 min", "15 min", "1 h"; `refreshIntervalSec: 20` é recusado), `XFL-01 crossFilter aceita só filtros de seleção única, texto, número ou data e recusa KPI` (`crossFilter` para filtros `SINGLE_SELECT`, `TEXT`, `NUMBER` e `DATE` passa; para `MULTI_SELECT` e `DATE_RANGE` e em widget `KPI` dá "Filtro do clique inválido"), `XFL-09 crossFilter para filtro inexistente é recusado` (`filterId` que não está em `filters` dá "Filtro do clique inválido"); `queryParamsSchema` aceita escalares, `{ kind: 'date', value: '2024-01-31' }`, listas e `null`, e recusa objeto qualquer; `filtersForPrompt` devolve só `label`, `parameter` e `type`
- [x] Testes de contrato existentes de `dashboards-consultas` e `widgets-graficos` continuam verdes (os dashboards sem `filters` nem `refreshIntervalSec` recebem os padrões)
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add dashboard filters, refresh intervals and cross-filter schemas`

---

### T2: Mover o tokenizador de Cypher e os parâmetros para os contratos

**What**: `tokenizeCypher` e `extractParameterNames` saem de `apps/api/src/queries/read-only-cypher.ts` para `packages/contracts/src/cypher-tokens.ts`, sem mudar o comportamento; `validateReadOnlyCypher` passa a importar o tokenizador de `@ninbi/contracts`, e a API reexporta `extractParameterNames` de onde os seus chamadores já o importam.
**Where**: `packages/contracts/src/cypher-tokens.ts`
**Depends on**: None
**Reuses**: tokenizador de `dashboards-consultas` T8 e seus testes
**Requirement**: FLT-09

**Done when**:

- [x] Testes em `packages/contracts/src/cypher-tokens.spec.ts`: `FLT-09 extractParameterNames acha os parâmetros fora de strings e comentários` (`MATCH (n) WHERE n.c = $categoria AND n.d >= $periodo_inicio RETURN '$falso' // $comentario` dá `['categoria', 'periodo_inicio']`; `$categoria` repetido aparece uma vez; `` `$crase` `` não conta)
- [x] Testes de QRY-02 a QRY-05, QRY-09, QRY-10 e QRY-15 de `dashboards-consultas` continuam verdes sem mudança
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test && pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `refactor(contracts): share cypher tokenizer and parameter extraction`

---

### T3: Gravar filtros e intervalo com o dashboard

**What**: Migração do drizzle-kit com `dashboards.filters jsonb not null default '[]'` e `dashboards.refresh_interval_sec integer not null default 0`; `DashboardsService.save` grava os dois na mesma transação e checagem de `version`; `get` os devolve, com `options.cypher` `null` nos filtros "Consulta Cypher" para quem não pode editar, e cada `WidgetDto.parameters` = `extractParameterNames(cypher)` para todos os usuários.
**Where**: `apps/api/src/dashboards/dashboards.service.ts` (modify)
**Depends on**: T1, T2
**Reuses**: `createTestApp` com `shares`, `FakeShareResolver`, rotas `PUT` e `GET /api/dashboards/:id`
**Requirement**: FLT-09, FLT-17, FLT-30, RFR-03

**Done when**:

- [x] Testes em `apps/api/test/dashboards/filters.spec.ts`: `FLT-17 salvar grava os filtros com o dashboard` (um `PUT` com "Categoria" `SINGLE_SELECT` por consulta e "Período" `DATE_RANGE` com padrão; o `GET` do dono devolve os dois iguais e na ordem; apagar o dashboard não deixa filtro), `RFR-03 intervalo padrão é gravado e devolvido com o dashboard` (`refreshIntervalSec: 60` volta no `GET` de quem só vê; dashboard novo vem com `0` e `filters: []`), `FLT-30 quem só vê recebe 403 ao gravar filtros` (compartilhamento `view` faz `PUT` com um filtro novo: 403 `DASHBOARD_EDIT_FORBIDDEN` e o `GET` continua sem o filtro), `FLT-09 cada widget traz os parâmetros que o Cypher usa` (widget com `$categoria` e `$periodo_inicio` dá `parameters: ['categoria', 'periodo_inicio']` também para quem só vê, que recebe `cypher: null`; widget sem Cypher dá `[]`); quem só vê recebe `options.cypher: null` no filtro "Consulta Cypher"; filtro com parâmetro repetido no `PUT` responde 400 e o dashboard fica na versão anterior
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): store dashboard filters and refresh interval`

---

### T4: Converter os valores dos filtros em parâmetros do Cypher

**What**: `apps/api/src/queries/cypher-params.ts` com `toCypherParams` conforme o design (`{ kind: 'date' }` → `neo4j.types.Date`; inteiro seguro → `neo4j.int`; decimal fica; texto, booleano e `null` ficam; lista converte cada item), aplicado por `QueryService.run` depois de preencher com `null` os parâmetros sem valor.
**Where**: `apps/api/src/queries/cypher-params.ts`
**Depends on**: T1
**Reuses**: `QueryService`, `FakeNeo4jGateway`, `neo4j-driver`
**Requirement**: FLT-11, FLT-12, FLT-13

**Done when**:

- [x] Testes em `apps/api/test/queries/cypher-params.spec.ts`: `FLT-11 parâmetro vazio chega ao Neo4j como null` (`{ uf: null }` fica `null`; pelo `QueryService`, `$uf` sem valor chega ao fake como `null`), `FLT-12 lista de valores chega ao Neo4j como lista` (`['Eletrônicos', 'Livros']` chega ao fake como a mesma lista; `[2024, 2025]` vira dois `Integer`), `FLT-13 datas do intervalo chegam como datas do Cypher` (`{ periodo_inicio: { kind: 'date', value: '2025-01-01' }, periodo_fim: null }` chega ao fake com `neo4j.isDate(periodo_inicio)` verdadeiro e `toString()` "2025-01-01", e `periodo_fim` `null`); `10` vira `Integer` 10 e `10.5` fica `10.5`
- [x] Testes de `QueryService` de `dashboards-consultas` e `ia-cypher` continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): convert filter values into typed cypher parameters`

---

### T5: Ignorar na execução de widget salvo os parâmetros que não são de filtro

**What**: Em `QueriesController`, a rota `POST /api/dashboards/:id/widgets/:widgetId/run` mantém em `params` só os nomes de `filterParameterNames` dos filtros salvos do dashboard; o resto é descartado antes do `QueryService`. A rota `.../query` não muda.
**Where**: `apps/api/src/queries/queries.controller.ts` (modify)
**Depends on**: T3
**Reuses**: `DashboardsService`, `filterParameterNames`, `createTestApp`, `FakeNeo4jGateway`
**Requirement**: FLT-28

**Done when**:

- [x] Testes em `apps/api/test/queries/widget-params.spec.ts`: `FLT-28 parâmetro que não é de um filtro é ignorado na execução do widget salvo` (dashboard com o filtro `categoria` e widget `WHERE c.nome = $categoria AND n.uf = $uf`; `params: { categoria: 'Livros', uf: 'SP', extra: 1 }` chega ao fake como `{ categoria: 'Livros', uf: null }`, sem `extra`), filtro "Intervalo de datas" `periodo` deixa passar `periodo_inicio` e `periodo_fim`, a rota `.../query` de quem edita repassa `uf: 'SP'`
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): accept only filter parameters when running saved widgets`

---

### T6: Carregar as opções dos filtros por consulta

**What**: `apps/api/src/filters/filter-options.ts` com `optionsFromResult` (primeira coluna, sem nulos, `bigint` e `json` como texto, sem repetidos, os primeiros 1.000, `truncated`) e `FilterOptionsController` com `POST /api/dashboards/:id/filters/:filterId/options` (`assert('view')`, consulta salva, `maskErrors` para quem não edita, `STATIC` devolve os valores, 404 `FILTER_NOT_FOUND`) e `POST /api/dashboards/:id/filter-options` (`assert('edit')`, `filterOptionsDraftSchema`), ambos por `QueryService.run` com os parâmetros `null`.
**Where**: `apps/api/src/filters/filter-options.controller.ts`
**Depends on**: T1
**Reuses**: `QueryService`, `DashboardAccessService`, `DashboardsService`, `createTestApp`, `FakeNeo4jGateway`, `FakeShareResolver`
**Requirement**: FLT-06, FLT-23, FLT-24, FLT-29, FLT-30

**Done when**:

- [x] Testes em `apps/api/test/filters/filter-options.spec.ts` (puro): `FLT-24 mais de 1000 valores usa os primeiros 1000` (1.500 valores distintos dão 1.000, na ordem, com `truncated: true`; 1.000 dão `truncated: false`), nulos e repetidos descartados na ordem da primeira aparição, `bigint` vira o texto dos dígitos, só a primeira coluna conta
- [x] Testes em `apps/api/test/filters/filter-options.routes.spec.ts`: `FLT-06 opções vêm da primeira coluna da consulta sob a validação somente leitura` (filtro salvo `MATCH (c:Categoria) RETURN c.nome, c.id` com o fake devolvendo três linhas: `options` com os três nomes; consulta `CREATE (n) RETURN n` no rascunho responde 400 `QUERY_WRITE_BLOCKED` e não chega ao fake; o fake recebeu `timeoutMs` e `maxRows` de `QueryService`), `FLT-29 quem só vê carrega as opções do filtro salvo` (compartilhamento `view` recebe 200 com as opções), `FLT-30 quem só vê recebe 403 nas opções do rascunho`, `FLT-23 falha da consulta de opções responde com o erro da consulta` (fake rejeita: quem só vê recebe 422 com "Não foi possível carregar este widget", o dono recebe a mensagem do Neo4j), filtro inexistente dá 404 `FILTER_NOT_FOUND`, quem não alcança recebe 404 `DASHBOARD_NOT_FOUND`
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): load filter options from read-only cypher queries`

---

### T7: Descrever os filtros no pedido à IA

**What**: `aiWidgetRequestSchema` ganha `filters: FilterPromptInfo[]` (padrão `[]`, até 30; o zod descarta outras chaves); `buildWidgetMessages` recebe `filters` e acrescenta a seção "Filtros do dashboard" (uma linha `- <rótulo>: $<parâmetro> (<tipo>)` por filtro; `DATE_RANGE` com `$<p>_inicio` e `$<p>_fim`; "nenhum" sem filtros) e a regra de uso dos parâmetros na mensagem de sistema; `AiWidgetService` repassa os filtros do corpo.
**Where**: `apps/api/src/ai/widget-prompt.ts` (modify)
**Depends on**: T1
**Reuses**: `buildWidgetMessages`, `aiWidgetRequestSchema`, `FakeChatModelFactory`, `ScriptedChatModel`, `createTestApp` com `chatModels`
**Requirement**: FLT-20

**Done when**:

- [x] Testes em `apps/api/test/ai/widget-prompt.spec.ts` e na rota de `ia-cypher`: `FLT-20 pedido ao LLM lista rótulo, parâmetro e tipo de cada filtro sem valores` (`buildWidgetMessages` com "Categoria" `SINGLE_SELECT` e "Período" `DATE_RANGE` tem "Categoria", "$categoria", "Seleção única", "$periodo_inicio" e "$periodo_fim"; pela rota, um corpo com `filters: [{ label: 'Categoria', parameter: 'categoria', type: 'SINGLE_SELECT', defaultValue: 'MARCADOR-VALOR', value: 'MARCADOR-VALOR' }]` faz o modelo falso receber as mensagens sem "MARCADOR-VALOR"), sem filtros a seção diz "nenhum"; testes de AIQ-05 e AIQ-06 continuam verdes
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): describe dashboard filters in the ai widget prompt`

---

### Phase 2 tasks: Regras e estado no web

### T8: Calcular valores e parâmetros dos filtros

**What**: `apps/web/src/features/filters/filter-values.ts` com `isEmptyValue`, `defaultValues`, `filterParams`, `relevantParams`, `widgetsUsingFilter`, `parseNumberInput` e `checkDateRange`, conforme o design.
**Where**: `apps/web/src/features/filters/filter-values.ts`
**Depends on**: None
**Reuses**: tipos e `filterParameterNames` de `@ninbi/contracts`, `MESSAGES`
**Requirement**: FLT-09, FLT-11, FLT-12, FLT-13, FLT-16, FLT-25, FLT-26

**Done when**:

- [x] Testes em `filter-values.test.ts`: `FLT-11 filtro vazio envia null` (`TEXT` `''`, `SINGLE_SELECT` `null`, `MULTI_SELECT` `[]`, `NUMBER` `null` e `DATE_RANGE` sem datas dão `null` em cada nome, inclusive `periodo_inicio` e `periodo_fim`), `FLT-12 seleção múltipla envia a lista dos valores` (`['Livros', 'Jogos']` dá a mesma lista), `FLT-13 intervalo envia parametro_inicio e parametro_fim` (`{ start: '2025-01-01', end: '2025-03-31' }` dá `periodo_inicio` `{ kind: 'date', value: '2025-01-01' }` e `periodo_fim` `{ kind: 'date', value: '2025-03-31' }`; só o início dá `periodo_fim: null`; `DATE` dá `{ kind: 'date' }`), `FLT-09 relevantParams mantém só os parâmetros do widget` (params de `categoria`, `uf` e `periodo_inicio` com widget `['uf', 'categoria']` dá só `categoria` e `uf`, em ordem alfabética; widget sem parâmetros dá `{}`), `FLT-16 widgetsUsingFilter conta os widgets de todas as abas` (três widgets em duas abas, dois com `categoria`: 2; filtro de intervalo conta widget que usa só `periodo_fim`), `FLT-25 intervalo invertido dá A data inicial é maior que a final` (início `2025-03-01` e fim `2025-01-01`; datas iguais passam), `FLT-26 texto que não é número dá Digite um número` (`'abc'` e `'1,2,3'` dão a mensagem; `'1234,5'`, `'1.234,5'` e `'1234.5'` dão 1234.5; `''` dá `null`)
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): compute filter values and query parameters`

---

### T9: Calcular o valor do clique e as linhas selecionadas

**What**: `apps/web/src/features/filters/cross-filter.ts` com `clickValue` e `selectedRows`, conforme o design.
**Where**: `apps/web/src/features/filters/cross-filter.ts`
**Depends on**: None
**Reuses**: `toNumber` e `columnIndex` de `mapping/columns.ts`, tipos `QueryResultDto` e `ResultValue`
**Requirement**: XFL-02, XFL-04

**Done when**:

- [x] Testes em `cross-filter.test.ts` (resultado `RETURN categoria, total, dia` com três linhas): `XFL-02 clickValue lê a coluna configurada na linha clicada` (linha 1, coluna `categoria`, tipo `TEXT` dá "Livros"; coluna `total` em `NUMBER` dá 120.5; em `SINGLE_SELECT` dá 120.5 como número; coluna `dia` `'2025-02-03T10:00:00Z'` em `DATE` dá `'2025-02-03'`; célula `null` ou coluna ausente dá `undefined`; `bigint` em `TEXT` dá os dígitos), `XFL-04 selectedRows marca as linhas com o valor selecionado` (valor "Livros" em resultado com "Livros" nas linhas 0 e 2 dá `{0, 2}`; valor que não existe dá conjunto vazio)
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): derive cross-filter value and selected rows from results`

---

### T10: Gerar o CSV e o nome dos arquivos exportados

**What**: `apps/web/src/features/export/csv.ts` com `toCsv` e `exportFileName`, conforme o design e AD-107.
**Where**: `apps/web/src/features/export/csv.ts`
**Depends on**: None
**Reuses**: regra de data de `formatDate`, tipo `QueryResultDto`
**Requirement**: EXP-02, EXP-03, EXP-04, EXP-05, EXP-07

**Done when**:

- [x] Testes em `csv.test.ts`: `EXP-02 CSV tem cabeçalho e todas as linhas na ordem das colunas` (120 linhas dão 121 linhas separadas por `\r\n`; cabeçalho `loja;total;dia` na ordem de `columns`, inclusive coluna repetida), `EXP-03 CSV em UTF-8 com BOM, ponto e vírgula, vírgula decimal e datas dd/MM/aaaa` (o texto começa com `﻿`; `1234.56` sai `1234,56`; `-5` sai `-5`; `bigint` `9007199254740993` sai com todos os dígitos; `'2024-02-05'` e `'2024-02-05T23:30:00Z'` saem `05/02/2024`; `null` sai vazio; `true` sai "Sim"; "São Paulo" fica com o acento), `EXP-04 texto com ponto e vírgula, aspas ou quebra de linha vai entre aspas` (`a;b` → `"a;b"`; `diz "oi"` → `"diz ""oi"""`; `linha1\nlinha2` → `"linha1\nlinha2"`), `EXP-05 texto que começa com igual, mais, menos ou arroba ganha apóstrofo` (`=SOMA(A1)` → `'=SOMA(A1)`, `+1`, `-x` e `@cmd` também; cabeçalho `=x` também; número `-5` não), `EXP-07 nome do arquivo troca caracteres especiais por hífen e leva a data` ("Vendas por mês" em 16/11/2026 dá `Vendas-por-mês-2026-11-16.csv`; "Top/10: lojas" dá `Top-10--lojas-2026-11-16.png`)
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): build excel-friendly csv and export file names`

---

### T11: Levar filtros, intervalo e "Ao clicar" no rascunho

**What**: Em `draft.ts`, `DashboardDraft` ganha `filters` e `refreshIntervalSec`; `addFilter`, `updateFilter`, `removeFilter` (tira o `crossFilter` dos widgets que apontavam para o filtro), `setRefreshInterval` e `setCrossFilter`; `fromDto`, `toSavePayload` e `isDirty` consideram os campos novos.
**Where**: `apps/web/src/features/dashboards/draft.ts` (modify)
**Depends on**: None
**Reuses**: testes de `draft.ts` de `dashboards-consultas` e `widgets-graficos`, `dashboardSaveSchema`
**Requirement**: FLT-17, RFR-03, XFL-09

**Done when**:

- [x] Testes em `draft.test.ts`: `FLT-17 rascunho leva os filtros ao salvar` (`addFilter` e `updateFilter` aparecem em `toSavePayload`, que passa no `dashboardSaveSchema`; `isDirty` fica verdadeiro), `RFR-03 intervalo padrão vai no payload` (`setRefreshInterval(300)` leva `refreshIntervalSec: 300`), `XFL-09 removeFilter tira o Ao clicar dos widgets` (dois widgets com `crossFilter` para o filtro removido e um para outro filtro: os dois perdem `crossFilter`, o terceiro mantém; o `mapping` fica intacto); testes existentes de `draft.ts` continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): keep filters, refresh interval and click filters in the dashboard draft`

---

### T12: Guardar valores, seleção e intervalo na sessão da página

**What**: `apps/web/src/features/filters/filter-session.tsx` com `filterSessionReducer` (`setValue`, `clearAll`, `toggleClick`, `setInterval`, `syncFilters`, `paramsVersion`), `FilterSessionProvider` e `useFilterSession`, conforme o design.
**Where**: `apps/web/src/features/filters/filter-session.tsx`
**Depends on**: T8
**Reuses**: `defaultValues`
**Requirement**: FLT-15, FLT-31, XFL-05, XFL-06

**Done when**:

- [x] Testes em `filter-session.test.tsx`: `FLT-15 clearAll devolve todos os filtros ao valor padrão` (dois filtros alterados e uma seleção: os dois voltam ao padrão e a seleção some), `XFL-05 toggleClick no mesmo elemento esvazia o filtro` (primeiro clique define "Livros" e a seleção; o segundo com o mesmo widget, filtro e valor deixa o filtro `null` e sem seleção; clicar em outro valor troca), `XFL-06 setValue pela barra remove a seleção do filtro` (seleção em `categoria`: `setValue` em `categoria` a remove; `setValue` em outro filtro a mantém), `FLT-31 duas sessões guardam valores, seleção e intervalo separados` (dois `FilterSessionProvider` do mesmo dashboard: mudar valor, seleção e intervalo em um não muda o outro; um provider novo começa nos padrões e no intervalo do dashboard); `paramsVersion` aumenta a cada mudança de valor e não muda com `setInterval`; `syncFilters` põe o filtro novo no padrão
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): keep filter values and click selection in the page session`

---

### Phase 3 tasks: Atualização automática

### T13: Agendar a atualização automática

**What**: `apps/web/src/features/refresh/useAutoRefresh.ts` conforme o design: `setTimeout` do intervalo; sem timer com `0` ou `paused`; ao vencer com a aba do navegador oculta, espera o `visibilitychange` e executa uma vez; ao vencer visível, `refetchQueries` de cada chave com `{ cancelRefetch: false }` e reagenda; `resetKey` reinicia a contagem.
**Where**: `apps/web/src/features/refresh/useAutoRefresh.ts`
**Depends on**: None
**Reuses**: `QueryClient` do TanStack Query
**Requirement**: RFR-02, RFR-05, RFR-06, RFR-07, RFR-08, RFR-12

**Done when**:

- [x] Testes em `useAutoRefresh.test.tsx` (`renderHook` com um `QueryClient` e duas queries cujo `queryFn` conta chamadas; timers falsos): `RFR-02 intervalo vencido executa de novo os widgets da aba ativa` (10 s depois as duas chaves passadas executam uma vez cada; uma query fora de `queryKeys` não executa; 20 s, duas vezes), `RFR-05 aba do navegador oculta não executa atualizações` (com `document.hidden` verdadeiro, 30 s sem nenhuma chamada), `RFR-06 voltar a ficar visível com o intervalo já vencido executa uma atualização` (oculta por 25 s com intervalo de 10 s, ao ficar visível: uma chamada por chave, não três), `RFR-07 modo de edição não executa atualizações automáticas` (`paused` verdadeiro: 30 s sem chamada), `RFR-08 execução em andamento pula a atualização desse widget` (com o `queryFn` de uma chave pendente, o vencimento não chama esse `queryFn` de novo e chama o da outra), `RFR-12 mudar um filtro reinicia a contagem do intervalo` (aos 8 s o `resetKey` muda: nada aos 10 s, uma chamada aos 18 s); intervalo `0` não agenda nada
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): schedule dashboard auto-refresh with visibility and edit pauses`

---

### T14: Manter os dados do card durante e depois de uma atualização

**What**: Em `WidgetCard`, esqueleto só sem dados; nova execução com dados mantém os dados, sem esqueleto; erro com dados anteriores mostra os dados e "Não foi possível atualizar às HH:mm" (`formatClock` do `errorUpdatedAt`); erro sem dados continua o estado de erro. `formatClock` em `src/lib/format.ts`.
**Where**: `apps/web/src/features/widgets/WidgetCard.tsx` (modify)
**Depends on**: None
**Reuses**: `useWidgetResult`, "Atualizar" (TBL-15), `renderApp`, MSW, fixtures de dashboards, `mockElementSize`
**Requirement**: RFR-09, RFR-10

**Done when**:

- [x] Testes em `WidgetCard.refresh.test.tsx` (dashboard aberto, uma tabela de 3 linhas; nova execução por "Atualizar"): `RFR-09 atualização mantém os dados anteriores sem esqueleto` (com a segunda resposta pendente, as 3 linhas continuam e não há esqueleto; a resposta nova com 4 linhas troca a tabela), `RFR-10 falha da atualização mantém os dados e mostra Não foi possível atualizar às` (relógio em 14:05, segunda resposta 422: as 3 linhas continuam e o card mostra "Não foi possível atualizar às 14:05"); `formatClock` dá "14:05" e "14:05:09"; testes de TBL-09 a TBL-12 de `dashboards-consultas` continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): keep widget data while refreshing and report failed refresh`

---

### T15: Escolher o intervalo de atualização e mostrar a hora da última

**What**: `RefreshControl` no cabeçalho do dashboard, ao lado de "Atualizar": select "Atualização automática" com `REFRESH_INTERVAL_LABELS`; em visualização grava no `FilterSession`, em edição no rascunho por `setRefreshInterval`; "Atualizado às HH:mm:ss" quando as execuções da aba ativa terminam. `DashboardPage` monta o `FilterSessionProvider` e liga `useAutoRefresh` com o intervalo da sessão, `paused` em edição, `resetKey` = `paramsVersion` e as chaves da aba ativa.
**Where**: `apps/web/src/features/refresh/RefreshControl.tsx`
**Depends on**: T13
**Reuses**: `useAutoRefresh`, `FilterSessionProvider`, `draft.ts`, `useDashboardEditor`, `formatClock`, `renderApp`, MSW
**Requirement**: RFR-01, RFR-03, RFR-04, RFR-11

**Done when**:

- [x] Testes em `RefreshControl.test.tsx` (MSW conta as execuções por widget; timers falsos): `RFR-01 Atualização automática oferece Desligada a 1 h` (abrir o select mostra "Desligada", "10 s", "30 s", "1 min", "5 min", "15 min", "1 h"), `RFR-03 intervalo escolhido em edição e salvo vira o inicial` (em edição escolher "30 s" e "Salvar": o `PUT` leva `refreshIntervalSec: 30`; outro usuário que abre o dashboard com `refreshIntervalSec: 30` vê "30 s" e os widgets executam de novo 30 s depois), `RFR-04 intervalo escolhido em visualização não grava o dashboard` (escolher "10 s" em visualização: nenhum `PUT`; os widgets da aba executam de novo em 10 s; reabrir o dashboard volta ao intervalo salvo), `RFR-11 atualização terminada mostra Atualizado às` (relógio em 14:05:09, as execuções da aba terminam: "Atualizado às 14:05:09")
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): choose auto-refresh interval and show last update time`

---

### Phase 4 tasks: Filtros na tela

### T16: Desenhar o controle de cada tipo de filtro

**What**: `FilterControl` e `useFilterOptions` (`src/features/filters/api.ts`) conforme o design: chip com o rótulo e o controle do tipo; select de seleção única com "Nenhum" e o valor fora das opções como opção a mais; menu com caixas na seleção múltipla; texto e número aplicados 500 ms depois da última tecla, número inválido com "Digite um número"; data e intervalo com `<input type="date">`, intervalo invertido com "A data inicial é maior que a final"; opções de "Consulta Cypher" pela rota salva ou do rascunho, falha com "Não foi possível carregar as opções" e "Tentar novamente" só no chip.
**Where**: `apps/web/src/features/filters/FilterControl.tsx`
**Depends on**: None
**Reuses**: `parseNumberInput`, `checkDateRange`, `FILTER_OPTIONS_MAX`, shadcn `select`, `dropdown-menu`, `checkbox`, `input`, `renderApp`, MSW
**Requirement**: FLT-12, FLT-14, FLT-23, FLT-25, FLT-26, XFL-10

**Done when**:

- [x] Testes com gesto em `FilterControl.test.tsx` (`onChange` espião; timers falsos com `user-event` `advanceTimers`): `FLT-14 texto e número aplicam o valor 500 ms depois da última tecla` (digitar "Livr" e depois "os": aos 499 ms da última tecla nenhum `onChange`; aos 500 ms um só, com "Livros"; o mesmo em "Número" com `12,5` → 12.5), `FLT-26 número inválido não aplica e mostra Digite um número`, `FLT-25 intervalo invertido não aplica e mostra a mensagem` (início 2025-03-01 e fim 2025-01-01: "A data inicial é maior que a final" e nenhum `onChange`; corrigir o fim aplica), `FLT-12 marcar duas opções aplica a lista` (seleção múltipla: marcar "Livros" e "Jogos" chama `onChange` com `['Livros', 'Jogos']`), `FLT-23 falha das opções mostra Não foi possível carregar as opções e Tentar novamente` (rota de opções em 422: o chip mostra os dois textos e outro chip da mesma barra segue com as opções; "Tentar novamente" com a rota em 200 mostra as opções), `XFL-10 valor fora das opções aparece no filtro de seleção única` (valor "Brinquedos" que não está nas opções aparece como selecionado no chip); escolher "Nenhum" chama `onChange(null)`
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add filter controls for each filter type`

---

### T17: Mostrar a barra de filtros no topo do dashboard

**What**: `FilterBar` no slot novo da TopBar (`useTopBarFilters`, no mesmo mecanismo de `useTopBarAction`), conforme o design: um `FilterControl` por filtro, com o valor da sessão; "Limpar filtros"; `flex flex-wrap gap-2`; sem filtros e em visualização, nada; em edição, para quem pode editar, "Novo filtro" e, no menu de cada chip, "Editar filtro" e "Remover filtro". `DashboardPage` renderiza a barra para todas as abas.
**Where**: `apps/web/src/features/filters/FilterBar.tsx`
**Depends on**: T16
**Reuses**: `FilterControl`, `useFilterSession`, `useTopBarAction` (padrão), `TopBar`, `renderApp`, MSW, fixtures de dashboards
**Requirement**: FLT-07, FLT-08, FLT-15, FLT-18, FLT-21, FLT-22, FLT-29

**Done when**:

- [x] Testes com gesto em `FilterBar.test.tsx` (dashboard com duas abas e os filtros "Categoria" padrão "Livros" e "Busca" vazio): `FLT-07 dashboard abre com a barra de filtros no valor padrão` (a TopBar mostra "Categoria" com "Livros" e "Busca" vazio), `FLT-08 a mesma barra com os mesmos valores aparece em todas as abas` (mudar "Categoria" para "Jogos" e abrir a "Aba 2": a barra mostra "Jogos"), `FLT-15 Limpar filtros devolve os valores padrão` (com "Jogos" e "abc" em "Busca", "Limpar filtros" volta a "Livros" e vazio), `FLT-18 Novo filtro, Editar filtro e Remover filtro só em edição para quem pode editar` (em visualização nenhum dos três aparece para o dono; em edição os três aparecem; quem só vê nunca os vê), `FLT-21 barra de filtros quebra em mais linhas` (o contêiner dos chips tem `flex-wrap`), `FLT-22 dashboard sem filtros não mostra a barra em visualização` (sem "Limpar filtros" nem chips; em edição aparece só "Novo filtro"), `FLT-29 quem só vê muda o filtro e os widgets executam` (compartilhamento `view`: escolher "Jogos" faz o widget que usa `$categoria` executar com `{ categoria: 'Jogos' }`)
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): show global filter bar in the top bar`

---

### T18: Executar os widgets com os valores dos filtros

**What**: Em `useWidgetResult`, `params = relevantParams(parametros do widget, filterParams(filtros, valores))` na chave e no corpo: em visualização `['widget-run', dashboardId, version, widgetId, params]` com `WidgetDto.parameters`; em edição `['query', dashboardId, connectionId, cypher, params]` com `extractParameterNames(cypher)` e os filtros do rascunho. `runWidget` e `runQuery` enviam `params`.
**Where**: `apps/web/src/features/widgets/useWidgetResult.ts` (modify)
**Depends on**: T17
**Reuses**: `filterParams`, `relevantParams`, `extractParameterNames` de `@ninbi/contracts`, `useFilterSession`, `renderApp`, MSW
**Requirement**: FLT-09, FLT-10, FLT-11, FLT-27

**Done when**:

- [x] Testes com gesto em `DashboardFilters.test.tsx` (MSW de `.../widgets/:wid/run` grava `widgetId` e `params` de cada chamada; aba 1 com três widgets, dois com `parameters: ['categoria']`; aba 2 com um widget que usa `categoria`): `FLT-09 mudar o filtro executa de novo só os widgets que usam o parâmetro` (escolher "Jogos" gera duas chamadas, dos dois widgets com `categoria`, com `{ categoria: 'Jogos' }`; o terceiro não executa), `FLT-10 abrir outra aba executa os widgets com os valores atuais` (depois de escolher "Jogos", abrir a "Aba 2" executa o widget dela com `{ categoria: 'Jogos' }`), `FLT-11 filtro vazio chega à execução como null` (escolher "Nenhum" executa com `{ categoria: null }`), `FLT-27 só o resultado do valor mais recente aparece` (a resposta de "Jogos" fica pendente; escolher "Livros" e liberar as duas fora de ordem: o card mostra o resultado de "Livros"); em edição, um widget do rascunho com `$categoria` executa por `.../query` com `params: { categoria: 'Jogos' }`
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): run widgets with the current filter values`

---

### T19: Enviar os filtros do rascunho no pedido à IA

**What**: Em `useAiGenerations`, o corpo do pedido leva `filters: filtersForPrompt(rascunho.filters)`; o resultado da IA semeia o cache com a chave nova de T18 só quando o Cypher gerado não usa nenhum parâmetro de filtro, senão o widget executa com os valores atuais.
**Where**: `apps/web/src/features/ai/useAiGenerations.ts` (modify)
**Depends on**: T18
**Reuses**: `filtersForPrompt`, `streamAiWidget`, testes de `useAiGenerations` de `ia-cypher`, MSW
**Requirement**: FLT-20

**Done when**:

- [x] Testes em `useAiGenerations.test.tsx`: `FLT-20 pedido à IA leva os filtros do rascunho sem valores` (rascunho com "Categoria" padrão "Livros" e valor de sessão "Jogos": o corpo enviado tem `filters: [{ label: 'Categoria', parameter: 'categoria', type: 'SINGLE_SELECT' }]` e nenhum "Livros" nem "Jogos"), Cypher gerado sem parâmetro de filtro mostra o resultado da IA sem nova execução, Cypher gerado com `$categoria` executa por `.../query` com `{ categoria: 'Jogos' }`; testes de AIQ-09 e AIQ-10 continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): send dashboard filters with ai widget requests`

---

### T20: Criar, editar e remover filtros em modo de edição

**What**: `FilterEditorDialog` conforme o design ("Rótulo", "Parâmetro", "Tipo", "Valor padrão"; "Origem das opções" com "Lista fixa" e "Consulta Cypher" nos tipos de seleção; "Carregar opções" pela rota do rascunho; validação por `dashboardFilterSchema` e pelos parâmetros dos outros filtros; "Aplicar" no rascunho) e `RemoveFilterDialog` (`filterRemoveConfirm` com `widgetsUsingFilter`; confirmar chama `removeFilter`). Ligados aos botões da `FilterBar`.
**Where**: `apps/web/src/features/filters/FilterEditorDialog.tsx`
**Depends on**: T17
**Reuses**: `dashboardFilterSchema`, `FILTER_TYPE_LABELS`, `OPTION_SOURCE_LABELS`, `CypherEditor`, `FilterControl`, `draft.ts`, `widgetsUsingFilter`, react-hook-form, shadcn `dialog`, `alert-dialog`, `select`, `input`, `renderApp`, MSW
**Requirement**: FLT-01, FLT-02, FLT-03, FLT-04, FLT-05, FLT-06, FLT-16, FLT-17, XFL-09

**Done when**:

- [ ] Testes com gesto em `FilterEditorDialog.test.tsx` (dashboard em edição): `FLT-01 Novo filtro abre o formulário com Rótulo, Parâmetro, Tipo e Valor padrão`, `FLT-02 campo Tipo oferece os seis tipos na ordem`, `FLT-03 parâmetro inválido mostra a mensagem no campo` ("1ano" mostra "O parâmetro começa com uma letra e usa só letras, dígitos e _"; o parâmetro de outro filtro do rascunho mostra "Este parâmetro já é usado por outro filtro"; o diálogo continua aberto), `FLT-04 rótulo vazio mostra Informe o rótulo no campo`, `FLT-05 tipo de seleção pede Lista fixa ou Consulta Cypher` (escolher "Seleção única" mostra "Origem das opções" com as duas; "Texto" não mostra), `FLT-06 Carregar opções mostra os valores da consulta` ("Consulta Cypher" com `MATCH (c:Categoria) RETURN c.nome`: "Carregar opções" chama `.../filter-options` e mostra "Eletrônicos" e "Livros"), `FLT-17 Aplicar e Salvar enviam o filtro novo no PUT` (criar "Categoria" e salvar: o `PUT` leva o filtro com `parameter: 'categoria'`), `FLT-16 Remover filtro pede confirmação com o número de widgets` (dois widgets usam `$categoria`: "Remover o filtro Categoria? 2 widgets usam o parâmetro."; "Cancelar" mantém o filtro), `XFL-09 remover o filtro tira o Ao clicar do widget ao salvar` (widget com `crossFilter` para "Categoria": confirmar a remoção e salvar envia o widget sem `crossFilter`); "Editar filtro" abre o formulário preenchido e "Aplicar" troca o rótulo no chip
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): create, edit and remove dashboard filters`

---

### T21: Executar com os filtros e configurar "Ao clicar" no editor do widget

**What**: Em `WidgetEditorDialog`, "Executar" envia `params` com os valores atuais dos filtros do rascunho; seção "Ao clicar" para visualização que não é KPI: select "Filtro" com os filtros de `CROSS_FILTER_TYPES` e "Nenhum", select "Coluna" com as colunas do último resultado (desabilitado sem resultado); "Aplicar" grava `config.crossFilter` por `setCrossFilter`.
**Where**: `apps/web/src/features/widgets/WidgetEditorDialog.tsx` (modify)
**Depends on**: T18
**Reuses**: `filterParams`, `extractParameterNames`, `useFilterSession`, `setCrossFilter`, `CROSS_FILTER_TYPES`, `VisualizationPanel`, `renderApp`, MSW
**Requirement**: FLT-19, XFL-01

**Done when**:

- [ ] Testes com gesto em `WidgetEditorDialog.filters.test.tsx` (dashboard em edição com os filtros "Categoria" `SINGLE_SELECT` em "Jogos", "Tags" `MULTI_SELECT` e "Dia" `DATE`): `FLT-19 Executar no editor envia os valores atuais dos filtros` (Cypher com `$categoria`: "Executar" envia `.../query` com `params: { categoria: 'Jogos' }`), `XFL-01 editor oferece Ao clicar com filtro e coluna` (widget "Barras" executado com `RETURN categoria, total`: "Filtro" lista "Nenhum", "Categoria" e "Dia", sem "Tags"; "Coluna" lista `categoria` e `total`; escolher "Categoria" e `categoria`, aplicar e salvar envia `config.crossFilter` `{ filterId: <id de Categoria>, column: 'categoria' }`; widget "KPI" não mostra "Ao clicar"; sem resultado "Coluna" fica desabilitada); testes do `WidgetEditorDialog` de `dashboards-consultas`, `widgets-graficos` e `ia-cypher` continuam verdes
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): run widget editor with filter values and configure click filter`

---

### Phase 5 tasks: Clique e exportação

### T22: Filtrar pelo clique nos gráficos

**What**: `WidgetVisualization` recebe `crossFilter`, `interactive` (visualização, não edição) e a sessão; com `crossFilter` e `interactive`, calcula `selectedRows` e passa `onRowClick(rowIndex)` às views, que chamam `toggleClick` com `clickValue`. Em `CartesianChartView`, `PieChartView` e `PolarChartViews`, cada barra (`Cell`), ponto de área e linha (`dot` próprio), fatia, rótulo de eixo do radar (`tick` próprio) e barra radial tem `data-row-index`, `role="button"` e o clique; selecionado com `data-selected="true"` e opacidade 1, os demais `data-dimmed="true"` e opacidade `0.3`. `buildCartesian`, `buildCategories` e `buildRadar` passam a levar `rowIndex` em cada item.
**Where**: `apps/web/src/features/widgets/WidgetVisualization.tsx` (modify)
**Depends on**: None
**Reuses**: `clickValue`, `selectedRows`, `useFilterSession`, views e `mapping/chart-data.ts` de `widgets-graficos`, `mockElementSize`, `renderApp`, MSW
**Requirement**: XFL-02, XFL-03, XFL-04, XFL-05, XFL-06, XFL-07, XFL-08

**Done when**:

- [ ] Testes com gesto em `CrossFilterCharts.test.tsx` (600 × 300; dashboard com o filtro "Categoria", um gráfico de barras por categoria com `crossFilter` e uma lista e um KPI que usam `$categoria`): `XFL-02 clicar em barra, ponto, fatia, eixo de radar e barra radial define o filtro` (para cada uma das visualizações Barras, Linha, Área, Pizza, Radar e Radial, clicar no elemento de `data-row-index` 1 define "Categoria" com o valor da linha 1), `XFL-03 filtro definido por clique aparece na barra e executa os widgets que usam o parâmetro` (clicar na barra "Livros": o chip mostra "Livros" e a lista e o KPI executam com `{ categoria: 'Livros' }`), `XFL-04 elemento selecionado fica destacado e os demais esmaecidos` (a barra "Livros" tem `data-selected="true"`, as outras `data-dimmed="true"`), `XFL-05 clicar de novo no elemento esvazia o filtro e tira o destaque` (segundo clique: "Categoria" vazio, nenhum `data-dimmed`, widgets executam com `{ categoria: null }`), `XFL-06 mudar o filtro pela barra remove o destaque` (com a barra "Livros" selecionada, escolher "Jogos" na barra de filtros: nenhum `data-selected`), `XFL-07 widget sem Ao clicar não muda filtro` (clicar numa barra de um gráfico sem `crossFilter`: "Categoria" não muda e nenhuma execução sai), `XFL-08 modo de edição não muda filtro por clique` (em edição, clicar na barra não muda "Categoria")
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): cross-filter dashboard by clicking chart elements`

---

### T23: Filtrar pelo clique em listas, tabelas e marcadores

**What**: `ListView`, `ResultTable` e `MapView` recebem `onRowClick` e `selectedRows`: cada linha da lista, linha da tabela e marcador do mapa tem `data-row-index`, `role="button"` e o clique; destaque e esmaecimento como em T22. `buildList`, `buildMapPoints` e `sortRows` passam a levar o `rowIndex` da linha de origem (a tabela ordenada e paginada usa o índice original).
**Where**: `apps/web/src/features/widgets/ListView.tsx` (modify)
**Depends on**: T22
**Reuses**: `WidgetVisualization` (T22), `table-rules.ts`, `mapping/simple-data.ts`, `mockElementSize`, `renderApp`, MSW
**Requirement**: XFL-02, XFL-04

**Done when**:

- [ ] Testes com gesto em `CrossFilterRows.test.tsx`: `XFL-02 clicar em linha de lista, linha de tabela e marcador define o filtro` (lista: clicar na linha "Livros" define "Categoria" "Livros"; tabela ordenada por "total" decrescente na página 2: clicar numa linha define o valor da linha clicada, não o da posição original; mapa 400 × 300: clicar no marcador "Centro" com `crossFilter` na coluna `loja` define "Centro"), `XFL-04 linha e marcador selecionados ficam destacados` (a linha e o marcador clicados têm `data-selected="true"`, os demais `data-dimmed="true"`)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): cross-filter dashboard by clicking list rows, table rows and map markers`

---

### T24: Exportar CSV e PNG pelo menu do widget

**What**: Dependência `html-to-image`; `src/features/export/download.ts` (`downloadBlob`, `downloadDataUrl`); `WidgetExportMenu` no card em visualização, para todo usuário que vê o dashboard, com "Exportar CSV" e "Exportar PNG", desabilitados enquanto carrega, sem linhas, em erro sem dados ou sem consulta; CSV do resultado inteiro em cache por `toCsv`; PNG por `toPng(card, { pixelRatio: 2 * (devicePixelRatio || 1), filter })` sem os elementos com `data-export-ignore`; falha do PNG com o toast "Não foi possível exportar a imagem"; nomes por `exportFileName`.
**Where**: `apps/web/src/features/export/WidgetExportMenu.tsx`
**Depends on**: None
**Reuses**: `toCsv`, `exportFileName`, `WidgetCard`, `useWidgetResult`, shadcn `dropdown-menu`, `sonner`, `renderApp`, MSW, `mockElementSize`
**Requirement**: EXP-01, EXP-02, EXP-06, EXP-07, EXP-08

**Done when**:

- [ ] Testes com gesto em `WidgetExportMenu.test.tsx` (`URL.createObjectURL` espião que guarda o `Blob`; `html-to-image` simulado por `vi.mock`; relógio em 2026-11-16): `EXP-01 menu do widget em visualização mostra Exportar CSV e Exportar PNG` (para o dono e para quem só vê), `EXP-02 Exportar CSV baixa as 120 linhas com a página 1 visível` (tabela de 120 linhas na página 1: o `Blob` tem 121 linhas e começa com o BOM), `EXP-06 Exportar PNG gera a imagem do card no dobro da resolução` (`toPng` recebe o elemento do card, que contém o título e o gráfico, com `pixelRatio` 2 e `devicePixelRatio` 1, e 4 com `devicePixelRatio` 2; o botão do menu fica fora pelo `filter`; `toPng` rejeitando mostra "Não foi possível exportar a imagem"), `EXP-07 arquivos baixados usam o título e a data` (widget "Vendas por mês": `Vendas-por-mês-2026-11-16.csv` e `.png`), `EXP-08 exportar fica desabilitado carregando, sem dados ou com erro` (resposta pendente, zero linhas e 422 deixam os dois itens desabilitados; com dados, habilitados)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): export widget data as csv and card as png`

---

## Checks

**C1** - "Novo filtro" em modo de edição mostra o formulário com "Rótulo", "Parâmetro", "Tipo" e "Valor padrão" (FLT-01, AC 1)
Proof: run web | ✓ FLT-01 Novo filtro abre o formulário com Rótulo, Parâmetro, Tipo e Valor padrão

**C2** - "Tipo" oferece "Seleção única", "Seleção múltipla", "Texto", "Número", "Data" e "Intervalo de datas", nessa ordem (FLT-02, AC 2)
Proof: run contracts | ✓ FLT-02 tipos de filtro na ordem da spec
Proof: run web | ✓ FLT-02 campo Tipo oferece os seis tipos na ordem

**C3** - Parâmetro que não começa com letra, tem caractere fora de letras, dígitos e `_`, passa de 40 caracteres ou repete o de outro filtro é recusado com a mensagem no campo (FLT-03, AC 3)
Proof: run contracts | ✓ FLT-03 parâmetro inválido, longo ou repetido é recusado com a mensagem
Proof: run web | ✓ FLT-03 parâmetro inválido mostra a mensagem no campo

**C4** - Rótulo vazio ou com mais de 40 caracteres é recusado com a mensagem no campo (FLT-04, AC 4)
Proof: run contracts | ✓ FLT-04 rótulo vazio ou com mais de 40 caracteres é recusado
Proof: run web | ✓ FLT-04 rótulo vazio mostra Informe o rótulo no campo

**C5** - Tipo de seleção pede a origem das opções, "Lista fixa" ou "Consulta Cypher" (FLT-05, AC 5)
Proof: run contracts | ✓ FLT-05 filtro de seleção exige a origem das opções
Proof: run web | ✓ FLT-05 tipo de seleção pede Lista fixa ou Consulta Cypher

**C6** - Origem "Consulta Cypher" usa os valores da primeira coluna, sob a validação somente leitura e os limites de `dashboards-consultas` (FLT-06, AC 6)
Proof: run api | ✓ FLT-06 opções vêm da primeira coluna da consulta sob a validação somente leitura
Proof: run web | ✓ FLT-06 Carregar opções mostra os valores da consulta

**C7** - Abrir o dashboard mostra a barra de filtros com cada filtro no valor padrão (FLT-07, AC 7)
Proof: run web | ✓ FLT-07 dashboard abre com a barra de filtros no valor padrão

**C8** - A mesma barra, com os mesmos valores, aparece em todas as abas (FLT-08, AC 8)
Proof: run web | ✓ FLT-08 a mesma barra com os mesmos valores aparece em todas as abas

**C9** - Mudar um filtro executa de novo, na aba ativa, só os widgets cujo Cypher usa o parâmetro (FLT-09, AC 9)
Proof: run contracts | ✓ FLT-09 extractParameterNames acha os parâmetros fora de strings e comentários
Proof: run api | ✓ FLT-09 cada widget traz os parâmetros que o Cypher usa
Proof: run web | ✓ FLT-09 relevantParams mantém só os parâmetros do widget
Proof: run web | ✓ FLT-09 mudar o filtro executa de novo só os widgets que usam o parâmetro

**C10** - Abrir outra aba depois de mudar um filtro executa os widgets dela com os valores atuais (FLT-10, AC 10)
Proof: run web | ✓ FLT-10 abrir outra aba executa os widgets com os valores atuais

**C11** - Filtro vazio envia `null` no parâmetro (FLT-11, AC 11)
Proof: run api | ✓ FLT-11 parâmetro vazio chega ao Neo4j como null
Proof: run web | ✓ FLT-11 filtro vazio envia null
Proof: run web | ✓ FLT-11 filtro vazio chega à execução como null

**C12** - "Seleção múltipla" com valores envia a lista dos valores escolhidos (FLT-12, AC 12)
Proof: run api | ✓ FLT-12 lista de valores chega ao Neo4j como lista
Proof: run web | ✓ FLT-12 seleção múltipla envia a lista dos valores
Proof: run web | ✓ FLT-12 marcar duas opções aplica a lista

**C13** - "Intervalo de datas" envia a data inicial em `<parametro>_inicio` e a final em `<parametro>_fim`, como datas do Cypher (FLT-13, AC 13)
Proof: run api | ✓ FLT-13 datas do intervalo chegam como datas do Cypher
Proof: run web | ✓ FLT-13 intervalo envia parametro_inicio e parametro_fim

**C14** - "Texto" e "Número" aplicam o valor 500 ms depois da última tecla (FLT-14, AC 14)
Proof: run web | ✓ FLT-14 texto e número aplicam o valor 500 ms depois da última tecla

**C15** - "Limpar filtros" devolve todos os filtros ao valor padrão (FLT-15, AC 15)
Proof: run web | ✓ FLT-15 clearAll devolve todos os filtros ao valor padrão
Proof: run web | ✓ FLT-15 Limpar filtros devolve os valores padrão

**C16** - "Remover filtro" pede confirmação com "Remover o filtro <rótulo>? N widgets usam o parâmetro." (FLT-16, AC 16)
Proof: run web | ✓ FLT-16 widgetsUsingFilter conta os widgets de todas as abas
Proof: run web | ✓ FLT-16 Remover filtro pede confirmação com o número de widgets

**C17** - Salvar o dashboard grava os filtros com ele (FLT-17, AC 17)
Proof: run api | ✓ FLT-17 salvar grava os filtros com o dashboard
Proof: run web | ✓ FLT-17 rascunho leva os filtros ao salvar
Proof: run web | ✓ FLT-17 Aplicar e Salvar enviam o filtro novo no PUT

**C18** - "Novo filtro", "Editar filtro" e "Remover filtro" aparecem só em modo de edição, a quem pode editar (FLT-18, AC 18)
Proof: run web | ✓ FLT-18 Novo filtro, Editar filtro e Remover filtro só em edição para quem pode editar

**C19** - "Executar" no editor do widget usa os valores atuais dos filtros (FLT-19, AC 19)
Proof: run web | ✓ FLT-19 Executar no editor envia os valores atuais dos filtros

**C20** - O pedido ao LLM inclui rótulo, parâmetro e tipo de cada filtro, sem os valores (FLT-20, AC 20)
Proof: run api | ✓ FLT-20 pedido ao LLM lista rótulo, parâmetro e tipo de cada filtro sem valores
Proof: run web | ✓ FLT-20 pedido à IA leva os filtros do rascunho sem valores

**C21** - Filtros que não cabem em uma linha quebram a barra em mais linhas (FLT-21, AC 21)
Proof: run web | ✓ FLT-21 barra de filtros quebra em mais linhas

**C22** - Dashboard sem filtros não mostra a barra no modo de visualização (FLT-22, AC 22)
Proof: run web | ✓ FLT-22 dashboard sem filtros não mostra a barra em visualização

**C23** - O controle "Atualização automática" oferece "Desligada", "10 s", "30 s", "1 min", "5 min", "15 min" e "1 h" (RFR-01, AC 1)
Proof: run contracts | ✓ RFR-01 intervalos de atualização na ordem da spec
Proof: run web | ✓ RFR-01 Atualização automática oferece Desligada a 1 h

**C24** - Quando o intervalo passa, os widgets da aba ativa executam de novo (RFR-02, AC 2)
Proof: run web | ✓ RFR-02 intervalo vencido executa de novo os widgets da aba ativa

**C25** - Intervalo escolhido em edição e salvo é o inicial para todo usuário (RFR-03, AC 3)
Proof: run api | ✓ RFR-03 intervalo padrão é gravado e devolvido com o dashboard
Proof: run web | ✓ RFR-03 intervalo padrão vai no payload
Proof: run web | ✓ RFR-03 intervalo escolhido em edição e salvo vira o inicial

**C26** - Intervalo escolhido em visualização vale só na sessão, sem gravar no dashboard (RFR-04, AC 4)
Proof: run web | ✓ RFR-04 intervalo escolhido em visualização não grava o dashboard

**C27** - Com a aba do navegador oculta, nenhuma atualização automática executa (RFR-05, AC 5)
Proof: run web | ✓ RFR-05 aba do navegador oculta não executa atualizações

**C28** - Ao voltar a ficar visível com o intervalo vencido, executa uma atualização (RFR-06, AC 6)
Proof: run web | ✓ RFR-06 voltar a ficar visível com o intervalo já vencido executa uma atualização

**C29** - Em modo de edição, nenhuma atualização automática executa (RFR-07, AC 7)
Proof: run web | ✓ RFR-07 modo de edição não executa atualizações automáticas

**C30** - Execução anterior em andamento faz o widget pular a atualização (RFR-08, AC 8)
Proof: run web | ✓ RFR-08 execução em andamento pula a atualização desse widget

**C31** - Durante a atualização, o widget mantém os dados anteriores, sem esqueleto (RFR-09, AC 9)
Proof: run web | ✓ RFR-09 atualização mantém os dados anteriores sem esqueleto

**C32** - Atualização que falha mantém os dados e mostra "Não foi possível atualizar às HH:mm" (RFR-10, AC 10)
Proof: run web | ✓ RFR-10 falha da atualização mantém os dados e mostra Não foi possível atualizar às

**C33** - Atualização terminada mostra "Atualizado às HH:mm:ss" (RFR-11, AC 11)
Proof: run web | ✓ RFR-11 atualização terminada mostra Atualizado às

**C34** - O editor de widget que não é KPI oferece "Ao clicar" com um filtro de seleção única, texto, número ou data e uma coluna (XFL-01, AC 1)
Proof: run contracts | ✓ XFL-01 crossFilter aceita só filtros de seleção única, texto, número ou data e recusa KPI
Proof: run web | ✓ XFL-01 editor oferece Ao clicar com filtro e coluna

**C35** - Clicar em barra, ponto, fatia, eixo de radar, barra radial, linha de lista ou tabela, ou marcador de um widget com "Ao clicar" define o filtro com o valor da coluna na linha clicada (XFL-02, AC 2)
Proof: run web | ✓ XFL-02 clickValue lê a coluna configurada na linha clicada
Proof: run web | ✓ XFL-02 clicar em barra, ponto, fatia, eixo de radar e barra radial define o filtro
Proof: run web | ✓ XFL-02 clicar em linha de lista, linha de tabela e marcador define o filtro

**C36** - O filtro definido por clique aparece na barra e executa os widgets que usam o parâmetro (XFL-03, AC 3)
Proof: run web | ✓ XFL-03 filtro definido por clique aparece na barra e executa os widgets que usam o parâmetro

**C37** - O elemento selecionado fica destacado e os demais do mesmo widget esmaecidos (XFL-04, AC 4)
Proof: run web | ✓ XFL-04 selectedRows marca as linhas com o valor selecionado
Proof: run web | ✓ XFL-04 elemento selecionado fica destacado e os demais esmaecidos
Proof: run web | ✓ XFL-04 linha e marcador selecionados ficam destacados

**C38** - Clicar de novo no elemento selecionado esvazia o filtro e remove o destaque (XFL-05, AC 5)
Proof: run web | ✓ XFL-05 toggleClick no mesmo elemento esvazia o filtro
Proof: run web | ✓ XFL-05 clicar de novo no elemento esvazia o filtro e tira o destaque

**C39** - Mudar ou limpar o filtro pela barra remove o destaque (XFL-06, AC 6)
Proof: run web | ✓ XFL-06 setValue pela barra remove a seleção do filtro
Proof: run web | ✓ XFL-06 mudar o filtro pela barra remove o destaque

**C40** - Clicar em widget sem "Ao clicar" não muda nenhum filtro (XFL-07, AC 7)
Proof: run web | ✓ XFL-07 widget sem Ao clicar não muda filtro

**C41** - Em modo de edição, clicar em elementos não muda filtros (XFL-08, AC 8)
Proof: run web | ✓ XFL-08 modo de edição não muda filtro por clique

**C42** - Remover o filtro ligado a um "Ao clicar" remove a configuração dos widgets que o usavam (XFL-09, AC 9)
Proof: run contracts | ✓ XFL-09 crossFilter para filtro inexistente é recusado
Proof: run web | ✓ XFL-09 removeFilter tira o Ao clicar dos widgets
Proof: run web | ✓ XFL-09 remover o filtro tira o Ao clicar do widget ao salvar

**C43** - O menu do widget em visualização mostra "Exportar CSV" e "Exportar PNG" a quem vê o dashboard (EXP-01, AC 1)
Proof: run web | ✓ EXP-01 menu do widget em visualização mostra Exportar CSV e Exportar PNG

**C44** - "Exportar CSV" baixa um cabeçalho e todas as linhas do resultado atual, nas colunas na ordem do resultado (EXP-02, AC 2)
Proof: run web | ✓ EXP-02 CSV tem cabeçalho e todas as linhas na ordem das colunas
Proof: run web | ✓ EXP-02 Exportar CSV baixa as 120 linhas com a página 1 visível

**C45** - O CSV é UTF-8 com BOM, com `;`, vírgula decimal e datas em `dd/MM/aaaa` (EXP-03, AC 3)
Proof: run web | ✓ EXP-03 CSV em UTF-8 com BOM, ponto e vírgula, vírgula decimal e datas dd/MM/aaaa

**C46** - Texto com `;`, aspas ou quebra de linha vai entre aspas, com as aspas internas dobradas (EXP-04, AC 4)
Proof: run web | ✓ EXP-04 texto com ponto e vírgula, aspas ou quebra de linha vai entre aspas

**C47** - Texto que começa com `=`, `+`, `-` ou `@` ganha `'` na frente (EXP-05, AC 5)
Proof: run web | ✓ EXP-05 texto que começa com igual, mais, menos ou arroba ganha apóstrofo

**C48** - "Exportar PNG" baixa a imagem do card como está na tela, com título e visualização, no dobro da resolução (EXP-06, AC 6)
Proof: run web | ✓ EXP-06 Exportar PNG gera a imagem do card no dobro da resolução

**C49** - Os arquivos se chamam `<título>-<aaaa-mm-dd>.csv` ou `.png`, com `-` no lugar do que não é letra, dígito ou `-` (EXP-07, AC 7)
Proof: run web | ✓ EXP-07 nome do arquivo troca caracteres especiais por hífen e leva a data
Proof: run web | ✓ EXP-07 arquivos baixados usam o título e a data

**C50** - Carregando, sem dados ou com erro, "Exportar CSV" e "Exportar PNG" ficam desabilitados (EXP-08, AC 8)
Proof: run web | ✓ EXP-08 exportar fica desabilitado carregando, sem dados ou com erro

**C51** - Falha da consulta de opções mostra no filtro "Não foi possível carregar as opções" e "Tentar novamente", sem afetar os demais (FLT-23, edge case)
Proof: run api | ✓ FLT-23 falha da consulta de opções responde com o erro da consulta
Proof: run web | ✓ FLT-23 falha das opções mostra Não foi possível carregar as opções e Tentar novamente

**C52** - Consulta de opções com mais de 1.000 valores usa os primeiros 1.000 (FLT-24, edge case)
Proof: run api | ✓ FLT-24 mais de 1000 valores usa os primeiros 1000

**C53** - Intervalo com data inicial maior que a final não é aplicado e mostra "A data inicial é maior que a final" (FLT-25, edge case)
Proof: run web | ✓ FLT-25 intervalo invertido dá A data inicial é maior que a final
Proof: run web | ✓ FLT-25 intervalo invertido não aplica e mostra a mensagem

**C54** - Texto que não é número em "Número" não é aplicado e mostra "Digite um número" (FLT-26, edge case)
Proof: run web | ✓ FLT-26 texto que não é número dá Digite um número
Proof: run web | ✓ FLT-26 número inválido não aplica e mostra Digite um número

**C55** - Com execuções do valor anterior ainda em andamento, só o resultado do valor mais recente aparece (FLT-27, edge case)
Proof: run web | ✓ FLT-27 só o resultado do valor mais recente aparece

**C56** - A execução de widget salvo ignora parâmetro que não é de um filtro do dashboard (FLT-28, edge case)
Proof: run api | ✓ FLT-28 parâmetro que não é de um filtro é ignorado na execução do widget salvo

**C57** - Quem só vê muda o valor de um filtro como quem edita (FLT-29, edge case)
Proof: run api | ✓ FLT-29 quem só vê carrega as opções do filtro salvo
Proof: run web | ✓ FLT-29 quem só vê muda o filtro e os widgets executam

**C58** - Quem só vê recebe 403 ao criar, editar ou remover filtro (FLT-30, edge case)
Proof: run api | ✓ FLT-30 quem só vê recebe 403 ao gravar filtros
Proof: run api | ✓ FLT-30 quem só vê recebe 403 nas opções do rascunho

**C59** - Valores de filtro, seleção por clique e intervalo ficam só na sessão de cada pessoa (FLT-31, edge case)
Proof: run web | ✓ FLT-31 duas sessões guardam valores, seleção e intervalo separados

**C60** - Valor clicado fora das opções de uma "Seleção única" é aplicado e aparece no filtro (XFL-10, edge case)
Proof: run web | ✓ XFL-10 valor fora das opções aparece no filtro de seleção única

**C61** - Mudar um filtro durante o auto-refresh reinicia a contagem do intervalo (RFR-12, edge case)
Proof: run web | ✓ RFR-12 mudar um filtro reinicia a contagem do intervalo

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** lote 1 (T1-T7, sonnet) sobre 0994860 - em andamento.
**Walked:** dispensado por AD-023

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T3 ------→ T5
          T2 ------→ T3
          T1 ------→ T4
          T1 ------→ T6
          T1 ------→ T7
Phase 2:  T8 ------→ T12
          T9
          T10
          T11
Phase 3:  T13 -----→ T15
          T14
Phase 4:  T16 -----→ T17 -----→ T18 -----→ T19
          T17 -----→ T20
          T18 -----→ T21
Phase 5:  T22 -----→ T23
          T24
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order: T1 to T24.
