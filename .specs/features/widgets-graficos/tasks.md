# Widgets e Gráficos Tasks

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas (screens sub-agent, imagens `*.running.png`, walk) está dispensada por AD-023: nenhuma task captura tela. A captura `captures/littlebee-dashboard.webp` continua sendo a referência de layout para quem implementa as telas.

Pré-requisito: `fundacao-auth`, `conexoes-schema`, `dashboards-consultas` e `compartilhamento` concluídas (`dashboardSaveSchema`, `WIDGET_VISUALIZATIONS`, `QueryResultDto`, `ResultValue`, `MESSAGES`, rotas `PUT`/`GET /api/dashboards/:id`, `createTestApp` com `shares`, `renderApp`, fixtures de dashboards, `WidgetCard`, `useWidgetResult`, `ResultTable`, `WidgetEditorDialog`, `draft.ts`, `DashboardPage` em edição, `src/lib/format.ts` com `formatDateTime`, tokens `--chart-1..5` em `theme.css`). Quem executa confere os nomes reais e marca `SPEC_DEVIATION` onde diferirem.

---

**Design**: `.specs/features/widgets-graficos/design.md`
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run contracts**: `pnpm --filter @ninbi/contracts test`
**Run api**: `pnpm --filter @ninbi/api test`
**Run web**: `pnpm --filter @ninbi/web test`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo script `test` roda `vitest run --reporter=verbose`. Todo nome de teste começa com o ID do requisito e contém, na ordem, as palavras da linha de `Proof` da sua check (sem o `✓`). Se o runner imprimir outro marcador de sucesso, a linha da check é corrigida a partir da saída real, nunca o teste.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012 (testes unitários das partes críticas, entre elas o mapeamento resultado para gráfico), AD-026 (testes rápidos sem serviço externo, nomes começando pelo ID do requisito, `--reporter=verbose`), AD-031 (nenhum `.tsx` com cor literal), e as matrizes aprovadas em `.specs/features/fundacao-auth/tasks.md` e `.specs/features/dashboards-consultas/tasks.md`. Strong defaults applied onde não há guia.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contratos (visualizações, `config` por visualização, mensagens) | unit | Uma configuração válida por visualização; cada forma inválida recusada com a mensagem exata | `packages/contracts/src/**/*.spec.ts` | `pnpm --filter @ninbi/contracts test` |
| API: rotas | integration (supertest + PGlite + `FakeShareResolver`) | Ida e volta de visualização e `config`; `config` inválido; `GET /api/map-config` com e sem variável, com e sem sessão | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Web: funções puras (mapeamento, dados de cada visualização, formatos) | unit | Todos os ramos; 1:1 com os ACs de VIZ, CHART, KPI, LIST e MAP; toda mensagem com o texto exato | `apps/web/src/features/widgets/mapping/*.test.ts`, `apps/web/src/lib/*.test.ts` | `pnpm --filter @ninbi/web test` |
| Web: componentes de visualização, card e painel | unit (Testing Library + jsdom + user-event + MSW + `mockElementSize`) | Gesto do critério quando há controle; elemento desenhado conferido antes de qualquer outra asserção; textos exatos | `apps/web/src/features/**/*.test.tsx` | `pnpm --filter @ninbi/web test` |
| Tema (`theme.css`) | unit (CSS lido como texto) | Regras do mapa e tokens dos gráficos nos dois temas | `apps/web/src/features/widgets/**/*.test.ts(x)` | `pnpm --filter @ninbi/web test` |

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
| 1 | Phase 1 - Contratos e API; Phase 2 - Regras de mapeamento | T1-T7 (7) | sonnet |
| 2 | Phase 3 - Visualizações | T8-T13 (6) | sonnet |
| 3 | Phase 4 - Card, gravação e painel | T14-T16 (3) | sonnet |

Todas as tasks têm testes, por isso todos os lotes são `sonnet`.

### Phase 1: Contratos e API

```
T1 → T2
T1 → T3
```

### Phase 2: Regras de mapeamento

```
T4 → T6
T5 → T6
T4 → T7
T5 → T7
```

### Phase 3: Visualizações

```
T8 → T9
T8 → T10
T8 → T13
T11
T12
```

### Phase 4: Card, gravação e painel

```
T14 → T16
T15 → T16
```

---

## Task Breakdown

### Phase 1 tasks: Contratos e API

### T1: Definir as visualizações e o formato do mapeamento

**What**: `packages/contracts/src/widget-config.ts` conforme o design: `WIDGET_VISUALIZATIONS` com os 10 valores (sai de `dashboards.ts` e é reexportado), `VISUALIZATION_LABELS`, `WidgetMapping`, `widgetMappingSchemas` e `widgetConfigSchema(v)` (colunas por nome, 1 a 200 caracteres; `series` com ao menos uma; `values` com até duas; opções booleanas; `TABLE` aceita `{}`), `MAPPING_FIELD_LABELS`, `MAPPING_OPTION_LABELS`, `MapConfigDto`. No `dashboardSaveSchema`, `visualization` vira `z.enum(WIDGET_VISUALIZATIONS)` e o widget ganha um `superRefine` que valida `config` pela visualização, com "Configuração da visualização inválida". Acréscimos em `MESSAGES` da tabela "Mensagens" do design. Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/widget-config.ts`
**Depends on**: None
**Reuses**: `dashboardSaveSchema`, `MESSAGES`, `zod`
**Requirement**: VIZ-01, VIZ-11, VIZ-15

**Done when**:

- [x] Testes em `packages/contracts/src/widget-config.spec.ts`: `VIZ-01 rótulos das visualizações na ordem da spec` (`WIDGET_VISUALIZATIONS.map(v => VISUALIZATION_LABELS[v])` é `Tabela, Lista, Área, Barras, Linha, Pizza, Radar, Radial, KPI, Mapa`), `VIZ-15 contrato aceita o mapeamento de cada visualização e recusa o que não combina` (um widget válido de cada uma das 10 visualizações passa no `dashboardSaveSchema`; `BAR` sem `x`, `BAR` com `series: []`, `LIST` com três `values`, `MAP` sem `lon` e `PIE` com `config: {}` são recusados com "Configuração da visualização inválida"; `visualization: 'PIZZA'` é recusado), `MESSAGES.chooseField('Eixo X')` é "Escolha Eixo X", `mappingColumnMissing('vendas')` é "A visualização não combina com o resultado: a coluna vendas não existe", `columnWithoutNumbers('vendas')` é "A coluna vendas não tem números", `categoriesCut(12, 30)` é "Mostrando 12 de 30 categorias", `invalidCoordinates(3)` é "3 linhas sem coordenadas válidas" e `invalidCoordinates(1)` é "1 linha sem coordenadas válidas"
- [x] Testes de contrato existentes de `dashboards-consultas` continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add widget visualizations and mapping config schemas`

---

### T2: Provar que o dashboard grava visualização e mapeamento

**What**: Testes de rota que salvam widgets com visualização e `config` e os leem de volta; qualquer ajuste em `DashboardsService` que eles revelarem (por exemplo, `config` não devolvido para quem só vê) entra nesta task.
**Where**: `apps/api/test/dashboards/widget-config.spec.ts`
**Depends on**: T1
**Reuses**: `createTestApp` com `shares`, `FakeShareResolver`, rotas `PUT` e `GET /api/dashboards/:id`
**Requirement**: VIZ-15

**Done when**:

- [x] Testes: `VIZ-15 salvar grava a visualização e o mapeamento de cada widget` (um `PUT` com widgets `BAR` `{ x: 'mes', series: ['vendas', 'custo'], stacked: true, horizontal: false }`, `PIE`, `MAP` e `TABLE`; o `GET` do dono devolve cada `visualization` e `config` iguais; o `GET` de quem tem compartilhamento `view` também recebe `visualization` e `config`, com `cypher: null`), `config` inválido para a visualização responde 400 com "Configuração da visualização inválida" e o dashboard continua na versão anterior
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `test(api): prove dashboards store widget visualization and mapping`

---

### T3: Entregar o endereço dos tiles do mapa

**What**: Em `apps/api/src/config/env.ts`, `NINBI_MAP_TILE_URL` (padrão `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; recusa valor sem `{z}`, `{x}` ou `{y}`) e `NINBI_MAP_ATTRIBUTION` (padrão `© OpenStreetMap`). `MapConfigModule` com `GET /api/map-config` → `MapConfigDto`, para qualquer usuário logado. `docker-compose.yml` repassa as duas variáveis ao serviço `app` com os mesmos padrões.
**Where**: `apps/api/src/map-config/map-config.controller.ts`
**Depends on**: T1
**Reuses**: `loadEnv`, `SessionGuard` global, `createTestApp`
**Requirement**: MAP-07

**Done when**:

- [x] Testes em `apps/api/test/map-config/map-config.spec.ts`: `MAP-07 endereço dos tiles vem de NINBI_MAP_TILE_URL com OpenStreetMap por padrão` (sem as variáveis: `tileUrl` `https://tile.openstreetmap.org/{z}/{x}/{y}.png` e `attribution` `© OpenStreetMap`; com `NINBI_MAP_TILE_URL=https://tiles.exemplo/{z}/{x}/{y}.png` e outra atribuição, a rota devolve as duas), Visualizador logado recebe 200, sem sessão a rota responde 401, `loadEnv` com `NINBI_MAP_TILE_URL=https://tiles.exemplo/mapa.png` lança erro que cita a variável
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): serve map tile url from installation environment`

---

### Phase 2 tasks: Regras de mapeamento

### T4: Formatar números e datas no padrão brasileiro

**What**: Em `apps/web/src/lib/format.ts`, `formatNumber`, `formatDate` e `formatValue` conforme o design (até duas casas, `1.234,56`; texto que começa com `AAAA-MM-DD` vira `DD/MM/AAAA` sem fuso; `bigint` com todos os dígitos e separador de milhar; `json` como texto; booleano "Sim"/"Não"; `null` "—").
**Where**: `apps/web/src/lib/format.ts` (modify)
**Depends on**: None
**Reuses**: `formatDateTime` existente, tipo `ResultValue`
**Requirement**: VIZ-17

**Done when**:

- [x] Testes em `apps/web/src/lib/format.test.ts`: `VIZ-17 números no formato 1.234,56 e datas em dd/MM/aaaa` (`1234.56` → "1.234,56"; `4999.95` → "4.999,95"; `20` → "20"; `0.125` → "0,13"; `-5` → "-5"; `'2024-02-05'` → "05/02/2024"; `'2024-02-05T23:30:00Z'` → "05/02/2024"; `{ kind: 'bigint', value: '9007199254740993' }` → "9.007.199.254.740.993"; `null` → "—"; `true` → "Sim"; `'Centro'` fica "Centro"); testes de `formatDateTime` continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): format numbers and dates in brazilian portuguese`

---

### T5: Sugerir, adaptar e validar o mapeamento

**What**: `mapping/columns.ts` (`toNumber`, `columnKinds`, `columnIndex`) e `mapping/suggest.ts` (`MappingDraft`, `suggestMapping`, `adaptMapping`, `validateMapping`) com as regras do design.
**Where**: `apps/web/src/features/widgets/mapping/suggest.ts`
**Depends on**: None
**Reuses**: `WidgetMapping`, `MAPPING_FIELD_LABELS`, `MESSAGES.chooseField` (T1), tipos `QueryResultDto` e `ResultValue`
**Requirement**: VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07, VIZ-08, VIZ-11, VIZ-19

**Done when**:

- [x] Testes em `suggest.test.ts` (resultado base `RETURN mes, vendas, custo` com `mes` texto): `VIZ-03 área, barras e linha sugerem eixo X não numérico e séries numéricas` (`x: 'mes'`, `series: ['vendas', 'custo']` nas três; com `RETURN ano, total`, todas numéricas, `x: 'ano'` e `series: ['total']`), `VIZ-04 pizza e radial sugerem categoria e valor` (`category: 'mes'`, `value: 'vendas'`), `VIZ-05 radar sugere eixo e todas as séries numéricas` (`axis: 'mes'`, `series: ['vendas', 'custo']`), `VIZ-06 KPI sugere o primeiro valor numérico sem variação` (`RETURN 4999.95 AS saldo, 20 AS variacao`: `value: 'saldo'`, `change: null`), `VIZ-07 mapa sugere latitude, longitude e rótulo pelo nome da coluna` (`nome, LAT, Lng`: `lat: 'LAT'`, `lon: 'Lng'`, `label: 'nome'`; `latitude, longitude` e `lat, long` também; sem coluna com esses nomes, `lat` e `lon` ficam `null`), `VIZ-08 lista sugere texto principal e dois valores numéricos` (`nome, categoria, total, variacao, qtd`: `primary: 'nome'`, `secondary: null`, `values: ['total', 'variacao']`), `VIZ-19 trocar para visualização incompatível usa a sugestão da nova` (`BAR` com `series: ['custo']` escolhido à mão → `LINE` mantém `['custo']`; `BAR` → `PIE` vira `category: 'mes'`, `value: 'vendas'`; `PIE` → `RADIAL` mantém; `KPI` → `MAP` vira a sugestão do mapa), `VIZ-11 validateMapping aponta o primeiro campo obrigatório vazio` (`BAR` com `x: null` dá `{ field: 'x', message: 'Escolha Eixo X' }`; `series: []` dá "Escolha Séries"; `MAP` sem `lon` dá "Escolha Longitude"; `LIST` sem `primary` dá "Escolha Texto principal"; `KPI` com `change: null` e `TABLE` são válidos)
- [x] Testes de `columns.test.ts`: coluna só de nulos é `other`; `bigint` conta como número; coluna com número e texto é `other`; `toNumber` de texto, booleano e `json` é `null`
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): suggest, adapt and validate widget column mapping`

---

### T6: Montar os dados de área, barras, linha, pizza, radar e radial

**What**: `mapping/chart-data.ts` com `Built<T>`, `checkColumns`, `buildCartesian`, `buildCategories`, `buildRadar`, `seriesColor`, `buildChartConfig` e `tickInterval`, conforme o design.
**Where**: `apps/web/src/features/widgets/mapping/chart-data.ts`
**Depends on**: T4, T5
**Reuses**: `columns.ts`, `formatValue`, `MESSAGES`
**Requirement**: VIZ-12, VIZ-13, VIZ-14, CHART-01, CHART-06, CHART-07, CHART-13, CHART-15, CHART-17, CHART-18

**Done when**:

- [x] Testes em `chart-data.test.ts`: `CHART-01 um ponto por linha na ordem retornada` (linhas `mar`, `jan`, `fev` saem nessa ordem com `xLabel` e `s0`, `s1`), `VIZ-12 coluna mapeada ausente dá A visualização não combina com o resultado` (`series: ['vendas']` num resultado `mes, total`: `error` com "A visualização não combina com o resultado: a coluna vendas não existe"; o mesmo para `x`, `category` e `axis`), `VIZ-13 coluna numérica sem números dá A coluna não tem números` (série só com textos e nulos: "A coluna vendas não tem números"; `value` da pizza também), `VIZ-14 valor nulo ou texto em papel numérico vira ponto ausente` (linha 2 com `null` e linha 3 com `'n/d'` têm `s0: null`; as outras ficam com os números), `CHART-07 primeira série usa o token chart-1` (`buildChartConfig(['vendas', 'custo'])` dá `s0` com `label: 'vendas'` e `color: 'var(--chart-1)'`, `s1` com `var(--chart-2)`), `CHART-17 mais séries que cores repetem a paleta na mesma ordem` (sete séries: `s5` é `var(--chart-1)` e `s6` é `var(--chart-2)`), `CHART-13 mais de 12 categorias corta em 12 e informa o total` (30 linhas em pizza, radial e radar: 12 itens e `notice` "Mostrando 12 de 30 categorias"; com 12 linhas, sem `notice`), `CHART-15 valor negativo na pizza vira ausente` (`A 10`, `B -5`, `C 3` dão os itens `A` e `C`), `CHART-18 pizza só com zeros não tem dados` (todos zero ou nulos dão `{ ok: false, reason: 'empty' }`), `CHART-06 tickInterval pula rótulos que não cabem na largura` (30 rótulos de 3 caracteres em 300 px dão `3`; 5 rótulos em 600 px dão `0`); resultado sem linhas dá `empty`
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): build chart data from query results`

---

### T7: Montar os dados do KPI, da lista e do mapa

**What**: `mapping/simple-data.ts` com `buildKpi`, `buildList`, `buildMapPoints` e `mapViewport`, conforme o design.
**Where**: `apps/web/src/features/widgets/mapping/simple-data.ts`
**Depends on**: T4, T5
**Reuses**: `columns.ts`, `Built<T>` de `chart-data.ts`, `formatValue`, `formatNumber`, `MESSAGES`
**Requirement**: KPI-01, KPI-02, KPI-03, KPI-04, KPI-05, LIST-01, MAP-01, MAP-03, MAP-04, MAP-05, MAP-08

**Done when**:

- [x] Testes em `simple-data.test.ts`: `KPI-01 KPI usa o valor da primeira linha` (duas linhas: `value` "4.999,95" da primeira), direção do KPI (`change` 20 → `up` e "20%"; 0 → `up`; -5 → `down` e "5%"; coluna ausente ou valor nulo → `change: null`; valor `'Centro'` fica "Centro"), `LIST-01 lista mantém a ordem e até dois valores` (três linhas na ordem, cada uma com `primary`, `secondary` e dois valores formatados), `MAP-01 um ponto por linha com latitude e longitude`, `MAP-03 coordenadas inválidas são descartadas e contadas` (latitude 200, longitude -181, `null` e `'abc'` são descartadas com `notice` "4 linhas sem coordenadas válidas"; uma só dá "1 linha sem coordenadas válidas"), `MAP-04 nenhuma coordenada válida dá Nenhuma linha com coordenadas válidas`, `MAP-05 enquadramento contém todos os marcadores` (São Paulo, Rio de Janeiro e Porto Alegre dão `bounds` com a menor e a maior latitude e longitude dos três; um ponto só dá `center` nele e `zoom: 10`), `MAP-08 marcadores na mesma coordenada levam os dois rótulos` (duas linhas com a mesma coordenada viram dois pontos, cada um com `sameSpotLabels` `['Loja A', 'Loja B']`)
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): build kpi, list and map data from query results`

---

### Phase 3 tasks: Visualizações

### T8: Desenhar área, barras e linha

**What**: `components/ui/chart.tsx` pelo CLI (`pnpm dlx shadcn@latest add chart`, que instala o `recharts`); `apps/web/src/test/element-size.ts` com `mockElementSize(width, height)` e `resizeTo(w, h)` (reaproveita o stub de `ResizeObserver` da grade se já existir); `charts/chart-theme.tsx` (`NinbiTooltip`, `GRID_PROPS`, `AXIS_PROPS`); e `CartesianChartView` conforme o design (gradiente roxo → ciano na área de uma série, legenda só com mais de uma série, `stackId` em "Empilhado", `layout="vertical"` em "Horizontal", `tickInterval` com a largura medida, `dot` com um ponto só, `connectNulls={false}`).
**Where**: `apps/web/src/features/widgets/charts/CartesianChartView.tsx`
**Depends on**: None
**Reuses**: `ChartContainer`, `ChartTooltip`, `ChartLegend` do shadcn; `buildCartesian`, `buildChartConfig`, `tickInterval`, `formatNumber`, `formatValue`
**Requirement**: CHART-01, CHART-02, CHART-03, CHART-04, CHART-05, CHART-06, CHART-08, CHART-16, VIZ-17

**Done when**:

- [x] Testes em `CartesianChartView.test.tsx` (600 × 300): `CHART-01 área, barras e linha desenham um ponto por linha` (três linhas: o caminho da área e o da linha passam por três pontos; barras com uma série têm três retângulos), `CHART-02 legenda mostra o nome de cada série quando há mais de uma` ("vendas" e "custo" na legenda; com uma série não há legenda), `CHART-03 dica mostra o valor do eixo X e de cada série` (`NinbiTooltip` com o `payload` do ponto `jan` mostra "jan", "vendas" "1.234,56" e "custo" "800"; o gráfico tem `.recharts-tooltip-wrapper`), `CHART-04 Horizontal desenha as barras na horizontal` (com `horizontal`, as categorias "jan", "fev", "mar" aparecem no eixo vertical e os números no horizontal), `CHART-05 Empilhado empilha as séries` (em barras e em área empilhadas, o retângulo ou a faixa da segunda série começa onde a primeira termina, na mesma posição do eixo X), `CHART-06 eixo X mostra só parte dos rótulos quando não cabem` (30 linhas em 300 px desenham 8 rótulos no eixo X), `CHART-08 redimensionar o card redesenha o gráfico no novo tamanho` (`resizeTo(800, 400)` deixa o `svg` com largura 800), `CHART-16 uma linha só desenha um ponto visível` (área e linha com uma linha desenham um círculo), `VIZ-17 eixos e dica formatam números e datas` (eixo Y mostra "1.000"; rótulo `'2024-02-05'` aparece como "05/02/2024")
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): draw area, bar and line charts with shadcn charts`

---

### T9: Desenhar pizza e donut

**What**: `PieChartView` conforme o design: uma fatia por item, `innerRadius` de 60% com "Donut", cor `var(--color-cN)`, `NinbiTooltip` com categoria e valor, `notice` abaixo do gráfico.
**Where**: `apps/web/src/features/widgets/charts/PieChartView.tsx`
**Depends on**: T8
**Reuses**: `chart-theme.tsx`, `mockElementSize`, `buildCategories`, `buildChartConfig`
**Requirement**: CHART-09, CHART-10, CHART-13, CHART-14

**Done when**:

- [x] Testes em `PieChartView.test.tsx` (600 × 300): `CHART-09 pizza desenha uma fatia por linha` (cinco categorias dão cinco setores), `CHART-10 Donut desenha o centro vazado` (com `donut`, o caminho de cada setor tem dois arcos, o de fora e o de dentro; sem `donut`, um só), `CHART-13 pizza com 30 linhas mostra Mostrando 12 de 30 categorias` (12 setores e o texto), `CHART-14 dica da pizza mostra categoria e valor` (`NinbiTooltip` do item "Centro" mostra "Centro" e "1.234,56")
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): draw pie and donut charts`

---

### T10: Desenhar radar e radial

**What**: `RadarChartView` e `RadialChartView` conforme o design (`PolarGrid` em `var(--border)`, um eixo por linha e um polígono por série; uma barra radial por item; `NinbiTooltip`; `notice`).
**Where**: `apps/web/src/features/widgets/charts/PolarChartViews.tsx`
**Depends on**: T8
**Reuses**: `chart-theme.tsx`, `mockElementSize`, `buildRadar`, `buildCategories`, `buildChartConfig`
**Requirement**: CHART-11, CHART-12, CHART-14

**Done when**:

- [x] Testes em `PolarChartViews.test.tsx` (600 × 300): `CHART-11 radar desenha um eixo por linha e um polígono por série` (cinco linhas e duas séries: cinco rótulos de eixo e dois polígonos), `CHART-12 radial desenha uma barra por linha` (cinco setores radiais; o de maior valor é o mais longo), `CHART-14 dica do radar e do radial mostra categoria e valor` (`NinbiTooltip` com os `payload` dos dois mostra a categoria e o valor formatado); radar com 30 linhas mostra "Mostrando 12 de 30 categorias"
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): draw radar and radial bar charts`

---

### T11: Desenhar o cartão de KPI

**What**: `KpiView` conforme o design: valor em destaque e chip de variação (`ArrowUp` com `bg-primary/15 text-accent-text` para alta, `ArrowDown` com `bg-destructive/15 text-destructive` para queda, ícone com `aria-label` "alta" ou "queda").
**Where**: `apps/web/src/features/widgets/KpiView.tsx`
**Depends on**: None
**Reuses**: `buildKpi`, shadcn `badge`, `lucide-react`
**Requirement**: KPI-02, KPI-03, KPI-04, KPI-05

**Done when**:

- [x] Testes em `KpiView.test.tsx` (resultado de `RETURN 4999.95 AS saldo, 20 AS variacao`): `KPI-02 variação positiva mostra chip com seta para cima e o valor em %` ("4.999,95" e o chip com o ícone "alta" e "20%"; variação 0 também mostra "alta"), `KPI-03 variação negativa mostra chip com seta para baixo` (-5 mostra o ícone "queda" e "5%", com a classe `text-destructive`), `KPI-04 sem variação ou variação nula não mostra chip`, `KPI-05 valor não numérico aparece como texto` (`'Centro'` aparece como "Centro")
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): draw kpi card with change chip`

---

### T12: Desenhar a lista

**What**: `ListView` conforme o design: `ul` com `overflow-y-auto` e `min-h-0`; texto principal e secundário à esquerda com `truncate` e `title`; até dois valores à direita com `tabular-nums`.
**Where**: `apps/web/src/features/widgets/ListView.tsx`
**Depends on**: None
**Reuses**: `buildList`
**Requirement**: LIST-01, LIST-02, LIST-03, LIST-04

**Done when**:

- [x] Testes em `ListView.test.tsx` (resultado de `RETURN nome, categoria, total, variacao`): `LIST-01 lista mostra texto principal e até dois valores na ordem` (uma `li` por linha, na ordem; nome à esquerda; "1.234,56" e "12" à direita), `LIST-02 texto secundário aparece abaixo do principal em tom apagado` (a categoria vem depois do nome, com `text-muted-foreground`), `LIST-03 linhas rolam dentro do card com o título fixo` (a `ul` tem `overflow-y-auto`; o título do card fica fora dela), `LIST-04 texto longo é cortado com reticências` (texto principal e secundário com `truncate` e `title` igual ao texto inteiro)
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): draw compact list widget`

---

### T13: Desenhar o mapa com marcadores

**What**: Dependências `leaflet`, `react-leaflet` e `@types/leaflet`; `map/useMapConfig.ts` (`GET /api/map-config`, `staleTime: Infinity`) e handler MSW padrão em `renderApp`; `MapView` conforme o design (zoom com "Aumentar zoom" e "Diminuir zoom", arrasto, `TileLayer` com `className="ninbi-map-tiles"` e `crossOrigin="anonymous"`, marcadores `L.divIcon` em chip, `Tooltip` com `sameSpotLabels` e coordenadas, `fitBounds` ou `setView` com `mapViewport`, `data-zoom` no contêiner atualizado em `zoomend`, aviso de `tileerror` e de falha do `map-config`, `notice` no rodapé). Em `apps/web/src/styles/theme.css`, as regras `.leaflet-container` e `.dark .ninbi-map-tiles` do design, e o CSS do Leaflet importado.
**Where**: `apps/web/src/features/widgets/map/MapView.tsx`
**Depends on**: T8
**Reuses**: `buildMapPoints`, `mapViewport`, `formatNumber`, `mockElementSize`, `renderApp`, MSW
**Requirement**: MAP-01, MAP-02, MAP-03, MAP-06, MAP-07, MAP-08, MAP-09

**Done when**:

- [x] Testes em `MapView.test.tsx` (400 × 300; MSW devolve `tileUrl` `https://tiles.teste/{z}/{x}/{y}.png`): `MAP-01 mapa desenha um marcador por linha` (três lojas do "Varejo" dão três `.leaflet-marker-icon`), `MAP-02 rótulo de cada marcador aparece em um chip` (cada marcador mostra só o nome da loja, com `rounded-full`), `MAP-03 linha com latitude 200 é ignorada e avisada` (três marcadores e "1 linha sem coordenadas válidas"), `MAP-06 passar o cursor no marcador mostra rótulo e coordenadas` (`mouseOver` em "Centro" mostra "Centro" e "-23,55, -46,63"), `MAP-07 mapa de tiles com zoom e arrasto no estilo do tema` (os `img.leaflet-tile` usam `https://tiles.teste/`; o contêiner tem `leaflet-grab`; clicar em "Aumentar zoom" aumenta `data-zoom` em 1; a camada tem `ninbi-map-tiles`; `theme.css` lido como texto tem `.dark .ninbi-map-tiles` com `filter`), `MAP-08 dois marcadores na mesma coordenada mostram os dois rótulos na dica` (dois `.leaflet-marker-icon`; o cursor sobre um mostra "Loja A" e "Loja B"), `MAP-09 falha dos tiles mostra Não foi possível carregar o mapa de fundo` (evento `error` no primeiro `img.leaflet-tile`: o aviso aparece e os três marcadores continuam; `map-config` com 500 também mostra o aviso e os marcadores)
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): draw tile map with labeled markers`

---

### Phase 4 tasks: Card, gravação e painel

### T14: Mostrar cada visualização no card do widget

**What**: `WidgetVisualization` conforme o design (despacha por `visualization`; `TABLE` → `ResultTable`; `empty` → "A consulta não retornou dados"; `error` → a mensagem no corpo do card) e, em `WidgetCard`, a troca de `ResultTable` por `WidgetVisualization`, mantendo esqueleto, erro com "Tentar novamente", "Widget sem consulta" e o menu de edição. Teste de varredura de cor literal em `src/features/widgets/**/*.tsx`.
**Where**: `apps/web/src/features/widgets/WidgetVisualization.tsx`
**Depends on**: None
**Reuses**: `WidgetCard`, `ResultTable`, as seis views da Phase 3, as funções de `mapping/`, `renderApp`, fixtures de dashboards, `mockElementSize`
**Requirement**: VIZ-12, VIZ-13, VIZ-18, KPI-01, MAP-04, CHART-18, LOOK-01, LOOK-02, LOOK-03, LOOK-04

**Done when**:

- [x] Testes em `WidgetVisualization.test.tsx` e `WidgetCard.test.tsx` (MSW nas rotas de execução): `VIZ-12 card mostra A visualização não combina com o resultado` (widget `BAR` com `series: ['vendas']` e resultado `mes, total`), `VIZ-13 card mostra A coluna não tem números`, `VIZ-18 gráficos usam os estados de carregando, sem dados e erro` (widget `BAR`: esqueleto com a resposta pendente; zero linhas mostra "A consulta não retornou dados"; 422 mostra a mensagem e "Tentar novamente", e o clique com o handler em 200 desenha o gráfico), `KPI-01 card de KPI mostra o título e o valor` (título "Saldo" no topo do card e "4.999,95"), `MAP-04 mapa sem coordenadas válidas mostra Nenhuma linha com coordenadas válidas`, `CHART-18 pizza só com zeros mostra A consulta não retornou dados`, `LOOK-01 dashboard com área, listas, KPI e mapa usa os cards do tema e o gradiente da logo` (em `<html class="dark">`, os cards têm `bg-card` e `rounded-card`; a área de uma série tem um `linearGradient` com paradas em `var(--brand-purple)` e `var(--brand-cyan)`; o chip do KPI usa `text-accent-text`), `LOOK-02 barras, linha, pizza, radar e radial usam a grade, as cores e a dica do tema` (as linhas da grade de barras e linha têm `stroke` `var(--border)` e `stroke-dasharray` `3 3`; a grade do radar tem `var(--border)`; a primeira série ou fatia usa `var(--color-s0)` ou `var(--color-c0)`; os cinco têm `.recharts-tooltip-wrapper`), `LOOK-03 widgets não escrevem cor literal e o tema claro define as cores dos gráficos` (nenhum `.tsx` de `src/features/widgets/` contém `#` hexadecimal de cor, `rgb(`, `hsl(` ou `oklch(`; `theme.css` define `--chart-1` a `--chart-5` em `:root` e em `.dark`), `LOOK-04 menu do card de gráfico em edição tem Editar widget e Remover widget`; os testes de `WidgetCard` de `dashboards-consultas` continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): render each widget visualization inside the card`

---

### T15: Levar visualização e mapeamento no rascunho

**What**: Em `draft.ts`, `addWidget` nasce com `visualization: 'TABLE'` e `config: {}` (se ainda não nascer) e `updateWidget` aceita `visualization` e `config`; `fromDto` e `toSavePayload` mantêm os dois.
**Where**: `apps/web/src/features/dashboards/draft.ts` (modify)
**Depends on**: None
**Reuses**: testes de `draft.ts` e de `DashboardEditMode` de `dashboards-consultas`, `dashboardSaveSchema`
**Requirement**: VIZ-15, VIZ-16

**Done when**:

- [x] Testes: `VIZ-16 widget novo nasce como Tabela` (`addWidget` dá `visualization: 'TABLE'` e `config: {}`), `updateWidget` com `BAR` e o mapeamento leva os dois ao `toSavePayload`, que passa no `dashboardSaveSchema`, `VIZ-15 Salvar envia a visualização e o mapeamento de cada widget` (dashboard com um widget `BAR` e um `MAP`: entrar em edição, mudar o nome e clicar em "Salvar" envia um `PUT` com os dois widgets e seus `visualization` e `config` intactos)
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): keep widget visualization and mapping in the dashboard draft`

---

### T16: Escolher a visualização e mapear colunas no editor do widget

**What**: `components/ui/checkbox.tsx` pelo CLI do shadcn; `VisualizationPanel` conforme o design (select "Visualização"; campos de mapeamento; "Nenhuma" nos opcionais; caixas para "Séries" e "Valores"; opções "Empilhado", "Horizontal", "Donut"; sem resultado, campos desabilitados e "Execute a consulta para escolher as colunas"; troca de visualização por `adaptMapping`; prévia com `WidgetVisualization` sem nova consulta; "Aplicar" com `validateMapping` e "Escolha <campo>" no campo). `WidgetEditorDialog` guarda o último resultado de "Executar", mostra o painel abaixo do Cypher e, em "Aplicar", grava título, Cypher, `visualization` e `config: { mapping }` por `updateWidget`.
**Where**: `apps/web/src/features/widgets/VisualizationPanel.tsx`
**Depends on**: T14, T15
**Reuses**: `WidgetEditorDialog`, `runQuery`, `suggestMapping`, `adaptMapping`, `validateMapping`, `WidgetVisualization`, `VISUALIZATION_LABELS`, `MAPPING_FIELD_LABELS`, shadcn `select`, `checkbox`, `label`
**Requirement**: VIZ-01, VIZ-02, VIZ-09, VIZ-10, VIZ-11, VIZ-15, VIZ-16, VIZ-19, VIZ-20

**Done when**:

- [x] Testes com gesto em `VisualizationPanel.test.tsx` (dashboard em edição; `POST .../query` devolve `RETURN mes, vendas, custo` com três linhas): `VIZ-01 seletor Visualização mostra as 10 opções na ordem` (abrir o select mostra "Tabela", "Lista", "Área", "Barras", "Linha", "Pizza", "Radar", "Radial", "KPI", "Mapa"), `VIZ-02 escolher a visualização com resultado mostra os campos com a sugestão` (executar e escolher "Barras": "Eixo X" mostra `mes` e "Séries" tem `vendas` e `custo` marcadas; "Empilhado" e "Horizontal" aparecem; "Pizza" mostra "Donut"), `VIZ-09 mudar o mapeamento atualiza a prévia sem executar de novo` (desmarcar `custo` tira "custo" da legenda da prévia; o handler de `.../query` foi chamado uma vez), `VIZ-10 sem resultado os campos ficam desabilitados com Execute a consulta para escolher as colunas` (editar um widget salvo sem executar: "Barras" escolhida, campos desabilitados e o texto), `VIZ-11 Aplicar com campo obrigatório vazio mostra Escolha` (escolher "Mapa" num resultado sem `lat`: "Aplicar" mostra "Escolha Latitude" e o diálogo continua aberto), `VIZ-16 editor de widget novo mostra Tabela` ("Novo widget" abre o editor com "Visualização" em "Tabela"), `VIZ-19 trocar Barras por Pizza substitui o mapeamento pela sugestão` (em "Barras" deixar só `custo` em "Séries" e trocar para "Pizza": "Categoria" `mes` e "Valor" `vendas`), `VIZ-20 Cypher novo sem as colunas mapeadas mostra a mensagem no card` (widget `BAR` com `x: 'mes'`: trocar o Cypher por um que devolve `loja, total`, aplicar sem executar e o card mostra "A visualização não combina com o resultado: a coluna mes não existe"), `VIZ-15 Aplicar e Salvar gravam a visualização e o mapeamento` (escolher "Barras", aplicar e salvar: o `PUT` leva `visualization: 'BAR'` e `config.mapping` `{ x: 'mes', series: ['vendas', 'custo'], stacked: false, horizontal: false }`)
- [x] Testes do `WidgetEditorDialog` de `dashboards-consultas` continuam verdes
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): choose widget visualization and map columns in the editor`

---

## Checks

**C1** - O editor do widget mostra o seletor "Visualização" com "Tabela", "Lista", "Área", "Barras", "Linha", "Pizza", "Radar", "Radial", "KPI" e "Mapa", nessa ordem (VIZ-01, AC 1)
Proof: run contracts | ✓ VIZ-01 rótulos das visualizações na ordem da spec
Proof: run web | ✓ VIZ-01 seletor Visualização mostra as 10 opções na ordem

**C2** - Escolher uma visualização com resultado executado mostra os campos dela preenchidos com a sugestão (VIZ-02, AC 2)
Proof: run web | ✓ VIZ-02 escolher a visualização com resultado mostra os campos com a sugestão

**C3** - Área, barras e linha sugerem como eixo X a primeira coluna não numérica (ou a primeira, se todas são numéricas) e como séries as demais numéricas (VIZ-03, AC 3)
Proof: run web | ✓ VIZ-03 área, barras e linha sugerem eixo X não numérico e séries numéricas

**C4** - Pizza e radial sugerem a primeira coluna não numérica como categoria e a primeira numérica como valor (VIZ-04, AC 4)
Proof: run web | ✓ VIZ-04 pizza e radial sugerem categoria e valor

**C5** - Radar sugere a primeira coluna não numérica como eixo e todas as numéricas como séries (VIZ-05, AC 5)
Proof: run web | ✓ VIZ-05 radar sugere eixo e todas as séries numéricas

**C6** - KPI sugere a primeira coluna numérica como valor e deixa a variação sem coluna (VIZ-06, AC 6)
Proof: run web | ✓ VIZ-06 KPI sugere o primeiro valor numérico sem variação

**C7** - Mapa sugere `lat`/`latitude` e `lon`/`lng`/`long`/`longitude`, sem diferenciar maiúsculas, e a primeira coluna não numérica como rótulo (VIZ-07, AC 7)
Proof: run web | ✓ VIZ-07 mapa sugere latitude, longitude e rótulo pelo nome da coluna

**C8** - Lista sugere a primeira coluna não numérica como texto principal e as duas primeiras numéricas como valores (VIZ-08, AC 8)
Proof: run web | ✓ VIZ-08 lista sugere texto principal e dois valores numéricos

**C9** - Mudar um campo do mapeamento atualiza a prévia sem executar a consulta de novo (VIZ-09, AC 9)
Proof: run web | ✓ VIZ-09 mudar o mapeamento atualiza a prévia sem executar de novo

**C10** - Sem resultado executado, os campos de mapeamento ficam desabilitados com "Execute a consulta para escolher as colunas" (VIZ-10, AC 10)
Proof: run web | ✓ VIZ-10 sem resultado os campos ficam desabilitados com Execute a consulta para escolher as colunas

**C11** - Campo obrigatório sem coluna recusa "Aplicar" com "Escolha <campo>" (VIZ-11, AC 11)
Proof: run web | ✓ VIZ-11 validateMapping aponta o primeiro campo obrigatório vazio
Proof: run web | ✓ VIZ-11 Aplicar com campo obrigatório vazio mostra Escolha

**C12** - Mapeamento que cita coluna ausente do resultado mostra no card "A visualização não combina com o resultado: a coluna <nome> não existe" (VIZ-12, AC 12)
Proof: run web | ✓ VIZ-12 coluna mapeada ausente dá A visualização não combina com o resultado
Proof: run web | ✓ VIZ-12 card mostra A visualização não combina com o resultado

**C13** - Coluna em papel numérico sem nenhum número mostra no card "A coluna <nome> não tem números" (VIZ-13, AC 13)
Proof: run web | ✓ VIZ-13 coluna numérica sem números dá A coluna não tem números
Proof: run web | ✓ VIZ-13 card mostra A coluna não tem números

**C14** - Valor nulo ou não numérico em papel numérico vira ponto ausente, sem derrubar os demais (VIZ-14, AC 14)
Proof: run web | ✓ VIZ-14 valor nulo ou texto em papel numérico vira ponto ausente

**C15** - Salvar o dashboard grava a visualização e o mapeamento de cada widget (VIZ-15, AC 15)
Proof: run contracts | ✓ VIZ-15 contrato aceita o mapeamento de cada visualização e recusa o que não combina
Proof: run api | ✓ VIZ-15 salvar grava a visualização e o mapeamento de cada widget
Proof: run web | ✓ VIZ-15 Salvar envia a visualização e o mapeamento de cada widget
Proof: run web | ✓ VIZ-15 Aplicar e Salvar gravam a visualização e o mapeamento

**C16** - Um widget novo nasce com a visualização "Tabela" (VIZ-16, AC 16)
Proof: run web | ✓ VIZ-16 widget novo nasce como Tabela
Proof: run web | ✓ VIZ-16 editor de widget novo mostra Tabela

**C17** - Números aparecem como `1.234,56` e datas como `dd/MM/aaaa` em eixos, rótulos, dicas e KPI (VIZ-17, AC 17)
Proof: run web | ✓ VIZ-17 números no formato 1.234,56 e datas em dd/MM/aaaa
Proof: run web | ✓ VIZ-17 eixos e dica formatam números e datas

**C18** - Todas as visualizações usam os estados de carregando, sem dados e erro de `dashboards-consultas` (VIZ-18, AC 18)
Proof: run web | ✓ VIZ-18 gráficos usam os estados de carregando, sem dados e erro

**C19** - Área, barras e linha desenham um ponto por linha do resultado, na ordem retornada (CHART-01, AC 1)
Proof: run web | ✓ CHART-01 um ponto por linha na ordem retornada
Proof: run web | ✓ CHART-01 área, barras e linha desenham um ponto por linha

**C20** - Com mais de uma série, a legenda mostra o nome da coluna de cada série (CHART-02, AC 2)
Proof: run web | ✓ CHART-02 legenda mostra o nome de cada série quando há mais de uma

**C21** - A dica de um ponto ou barra mostra o valor do eixo X e o de cada série (CHART-03, AC 3)
Proof: run web | ✓ CHART-03 dica mostra o valor do eixo X e de cada série

**C22** - "Horizontal" em "Barras" desenha as barras na horizontal (CHART-04, AC 4)
Proof: run web | ✓ CHART-04 Horizontal desenha as barras na horizontal

**C23** - "Empilhado" em "Barras" ou "Área" com mais de uma série empilha as séries (CHART-05, AC 5)
Proof: run web | ✓ CHART-05 Empilhado empilha as séries

**C24** - Rótulos do eixo X que não cabem aparecem só em parte, sem sobreposição (CHART-06, AC 6)
Proof: run web | ✓ CHART-06 tickInterval pula rótulos que não cabem na largura
Proof: run web | ✓ CHART-06 eixo X mostra só parte dos rótulos quando não cabem

**C25** - As séries usam os tokens de gráfico do tema, com o ciano (`--chart-1`) na primeira (CHART-07, AC 7)
Proof: run web | ✓ CHART-07 primeira série usa o token chart-1

**C26** - Redimensionar o card redesenha o gráfico no novo tamanho (CHART-08, AC 8)
Proof: run web | ✓ CHART-08 redimensionar o card redesenha o gráfico no novo tamanho

**C27** - A pizza desenha uma fatia por linha, do tamanho da coluna de valor (CHART-09, AC 1)
Proof: run web | ✓ CHART-09 pizza desenha uma fatia por linha

**C28** - "Donut" desenha a pizza com o centro vazado (CHART-10, AC 2)
Proof: run web | ✓ CHART-10 Donut desenha o centro vazado

**C29** - O radar desenha um eixo por linha e um polígono por série (CHART-11, AC 3)
Proof: run web | ✓ CHART-11 radar desenha um eixo por linha e um polígono por série

**C30** - O radial desenha uma barra radial por linha, com o comprimento da coluna de valor (CHART-12, AC 4)
Proof: run web | ✓ CHART-12 radial desenha uma barra por linha

**C31** - Pizza, radar e radial com mais de 12 linhas desenham as 12 primeiras e mostram "Mostrando 12 de N categorias" (CHART-13, AC 5)
Proof: run web | ✓ CHART-13 mais de 12 categorias corta em 12 e informa o total
Proof: run web | ✓ CHART-13 pizza com 30 linhas mostra Mostrando 12 de 30 categorias

**C32** - A dica de fatia, eixo de radar ou barra radial mostra a categoria e o valor (CHART-14, AC 6)
Proof: run web | ✓ CHART-14 dica da pizza mostra categoria e valor
Proof: run web | ✓ CHART-14 dica do radar e do radial mostra categoria e valor

**C33** - Valor negativo na coluna de valor da pizza vira linha ausente (CHART-15, AC 7)
Proof: run web | ✓ CHART-15 valor negativo na pizza vira ausente

**C34** - O KPI mostra o título do card e, em destaque, o valor da primeira linha (KPI-01, AC 1)
Proof: run web | ✓ KPI-01 KPI usa o valor da primeira linha
Proof: run web | ✓ KPI-01 card de KPI mostra o título e o valor

**C35** - Variação maior ou igual a zero mostra chip com seta para cima e o valor em % (KPI-02, AC 2)
Proof: run web | ✓ KPI-02 variação positiva mostra chip com seta para cima e o valor em %

**C36** - Variação abaixo de zero mostra chip com seta para baixo e o valor em % (KPI-03, AC 3)
Proof: run web | ✓ KPI-03 variação negativa mostra chip com seta para baixo

**C37** - Sem coluna de variação, ou com variação nula, o KPI não mostra chip (KPI-04, AC 4)
Proof: run web | ✓ KPI-04 sem variação ou variação nula não mostra chip

**C38** - Valor de KPI não numérico aparece como texto (KPI-05, AC 5)
Proof: run web | ✓ KPI-05 valor não numérico aparece como texto

**C39** - A lista mostra uma linha por linha do resultado, com o texto principal à esquerda e até dois valores à direita, na ordem retornada (LIST-01, AC 1)
Proof: run web | ✓ LIST-01 lista mantém a ordem e até dois valores
Proof: run web | ✓ LIST-01 lista mostra texto principal e até dois valores na ordem

**C40** - O texto secundário aparece abaixo do principal, em tom mais apagado (LIST-02, AC 2)
Proof: run web | ✓ LIST-02 texto secundário aparece abaixo do principal em tom apagado

**C41** - A lista rola dentro do card, com o título fixo (LIST-03, AC 3)
Proof: run web | ✓ LIST-03 linhas rolam dentro do card com o título fixo

**C42** - Texto que não cabe na linha é cortado com reticências (LIST-04, AC 4)
Proof: run web | ✓ LIST-04 texto longo é cortado com reticências

**C43** - O mapa mostra um marcador por linha, na latitude e longitude da linha (MAP-01, AC 1)
Proof: run web | ✓ MAP-01 um ponto por linha com latitude e longitude
Proof: run web | ✓ MAP-01 mapa desenha um marcador por linha

**C44** - O rótulo de cada marcador aparece num chip (MAP-02, AC 2)
Proof: run web | ✓ MAP-02 rótulo de cada marcador aparece em um chip

**C45** - Linhas com coordenada fora dos limites, nula ou não numérica não viram marcador e o card mostra "N linhas sem coordenadas válidas" (MAP-03, AC 3)
Proof: run web | ✓ MAP-03 coordenadas inválidas são descartadas e contadas
Proof: run web | ✓ MAP-03 linha com latitude 200 é ignorada e avisada

**C46** - Sem nenhuma coordenada válida, o card mostra "Nenhuma linha com coordenadas válidas" (MAP-04, AC 4)
Proof: run web | ✓ MAP-04 nenhuma coordenada válida dá Nenhuma linha com coordenadas válidas
Proof: run web | ✓ MAP-04 mapa sem coordenadas válidas mostra Nenhuma linha com coordenadas válidas

**C47** - O mapa enquadra a região que contém todos os marcadores (MAP-05, AC 5)
Proof: run web | ✓ MAP-05 enquadramento contém todos os marcadores

**C48** - Passar o cursor sobre um marcador mostra uma dica com o rótulo e as coordenadas (MAP-06, AC 6)
Proof: run web | ✓ MAP-06 passar o cursor no marcador mostra rótulo e coordenadas

**C49** - O mapa é de tiles, com zoom e arrasto, escuro no tema escuro e claro no claro, com o servidor de tiles da variável de ambiente (MAP-07, AC 7)
Proof: run api | ✓ MAP-07 endereço dos tiles vem de NINBI_MAP_TILE_URL com OpenStreetMap por padrão
Proof: run web | ✓ MAP-07 mapa de tiles com zoom e arrasto no estilo do tema

**C50** - Um dashboard com área, listas, KPI e mapa usa os cards do tema escuro com a paleta da logo no lugar dos verdes da captura (LOOK-01, AC 1)
Proof: run web | ✓ LOOK-01 dashboard com área, listas, KPI e mapa usa os cards do tema e o gradiente da logo

**C51** - Barras, linha, pizza, radar e radial usam as mesmas cores de série, grade e dica do gráfico de área (LOOK-02, AC 2)
Proof: run web | ✓ LOOK-02 barras, linha, pizza, radar e radial usam a grade, as cores e a dica do tema

**C52** - No tema claro, os widgets usam os tokens do tema claro, sem cor escrita nos componentes (LOOK-03, AC 3)
Proof: run web | ✓ LOOK-03 widgets não escrevem cor literal e o tema claro define as cores dos gráficos

**C53** - O menu de um card em modo de edição mostra "Editar widget" e "Remover widget" (LOOK-04, AC 4)
Proof: run web | ✓ LOOK-04 menu do card de gráfico em edição tem Editar widget e Remover widget

**C54** - Área ou linha com uma única linha desenham um ponto visível (CHART-16, edge case)
Proof: run web | ✓ CHART-16 uma linha só desenha um ponto visível

**C55** - Trocar para uma visualização em que o mapeamento atual não serve aplica a sugestão da nova (VIZ-19, edge case)
Proof: run web | ✓ VIZ-19 trocar para visualização incompatível usa a sugestão da nova
Proof: run web | ✓ VIZ-19 trocar Barras por Pizza substitui o mapeamento pela sugestão

**C56** - Depois que o Cypher muda e as colunas mapeadas somem, o card mostra a mensagem de VIZ-12 (VIZ-20, edge case)
Proof: run web | ✓ VIZ-20 Cypher novo sem as colunas mapeadas mostra a mensagem no card

**C57** - Dois marcadores na mesma coordenada aparecem os dois, e a dica mostra os dois rótulos (MAP-08, edge case)
Proof: run web | ✓ MAP-08 marcadores na mesma coordenada levam os dois rótulos
Proof: run web | ✓ MAP-08 dois marcadores na mesma coordenada mostram os dois rótulos na dica

**C58** - Se os tiles não carregam, os marcadores aparecem sobre o fundo do tema com "Não foi possível carregar o mapa de fundo" (MAP-09, edge case)
Proof: run web | ✓ MAP-09 falha dos tiles mostra Não foi possível carregar o mapa de fundo

**C59** - Com mais séries que tokens de cor, as cores se repetem na mesma ordem (CHART-17, edge case)
Proof: run web | ✓ CHART-17 mais séries que cores repetem a paleta na mesma ordem

**C60** - Pizza com todos os valores zero mostra "A consulta não retornou dados" (CHART-18, edge case)
Proof: run web | ✓ CHART-18 pizza só com zeros não tem dados
Proof: run web | ✓ CHART-18 pizza só com zeros mostra A consulta não retornou dados

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** lote 1 (T1-T7, sonnet) sobre 2e3e5ae - em andamento.
**Walked:** dispensado por AD-023

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2
          T1 ------→ T3
Phase 2:  T4 ------→ T6
          T5 ------→ T6
          T4 ------→ T7
          T5 ------→ T7
Phase 3:  T8 ------→ T9
          T8 ------→ T10
          T8 ------→ T13
          T11
          T12
Phase 4:  T14 -----→ T16
          T15 -----→ T16
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order: T1 to T16.
