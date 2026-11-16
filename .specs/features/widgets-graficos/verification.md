# Widgets e Gráficos verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at af100cd
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `packages/contracts/src/widget-config.spec.ts` `VIZ-01 rótulos das visualizações na ordem da spec`; `VisualizationPanel.test.tsx` `VIZ-01 seletor Visualização mostra as 10 opções na ordem` | yes |
| C2 | `VisualizationPanel.test.tsx` `VIZ-02 escolher a visualização com resultado mostra os campos com a sugestão` | yes |
| C3 | `mapping/suggest.test.ts` `VIZ-03 área, barras e linha sugerem eixo X não numérico e séries numéricas` | yes |
| C4 | `mapping/suggest.test.ts` `VIZ-04 pizza e radial sugerem categoria e valor` | yes |
| C5 | `mapping/suggest.test.ts` `VIZ-05 radar sugere eixo e todas as séries numéricas` | yes |
| C6 | `mapping/suggest.test.ts` `VIZ-06 KPI sugere o primeiro valor numérico sem variação` | yes |
| C7 | `mapping/suggest.test.ts` `VIZ-07 mapa sugere latitude, longitude e rótulo pelo nome da coluna` | yes |
| C8 | `mapping/suggest.test.ts` `VIZ-08 lista sugere texto principal e dois valores numéricos` | yes |
| C9 | `VisualizationPanel.test.tsx` `VIZ-09 mudar o mapeamento atualiza a prévia sem executar de novo` | yes |
| C10 | `VisualizationPanel.test.tsx` `VIZ-10 sem resultado os campos ficam desabilitados com Execute a consulta para escolher as colunas` | yes |
| C11 | `mapping/suggest.test.ts` `VIZ-11 validateMapping aponta o primeiro campo obrigatório vazio`; `VisualizationPanel.test.tsx` `VIZ-11 Aplicar com campo obrigatório vazio mostra Escolha` | yes |
| C12 | `mapping/chart-data.test.ts` `VIZ-12 coluna mapeada ausente dá A visualização não combina com o resultado`; a variação ausente no KPI não é checada: `mapping/simple-data.test.ts` `KPI-02 variação 20 é alta...` (linhas 59-60 afirmam `change: null` com a coluna faltando) | no - KPI ignora a coluna de variação ausente (F2) |
| C13 | `mapping/chart-data.test.ts` `VIZ-13 coluna numérica sem números dá A coluna não tem números` | no - KPI `change` e `LIST values` não aplicam VIZ-13 (F3) |
| C14 | `mapping/chart-data.test.ts` `VIZ-14 valor nulo ou texto em papel numérico vira ponto ausente` | yes |
| C15 | `packages/contracts/src/widget-config.spec.ts` `VIZ-15 contrato aceita o mapeamento de cada visualização...`; `apps/api/test/dashboards/widget-config.spec.ts` `VIZ-15 salvar grava a visualização e o mapeamento de cada widget`; `DashboardEditMode.test.tsx` `VIZ-15 Salvar envia a visualização e o mapeamento de cada widget` | yes |
| C16 | `dashboards/draft.test.ts` `VIZ-16 widget novo nasce como Tabela`; `VisualizationPanel.test.tsx` `VIZ-16 editor de widget novo mostra Tabela` | yes |
| C17 | `lib/format.test.ts` `VIZ-17 números no formato 1.234,56 e datas em dd/MM/aaaa`; `charts/CartesianChartView.test.tsx` `VIZ-17 eixos e dica formatam números e datas` | yes |
| C18 | `WidgetVisualization.test.tsx` `VIZ-18 gráficos usam os estados de carregando, sem dados e erro` | yes - o estado vem do WidgetCard, comum a todas; o teste usa só BAR |
| C19 | `mapping/chart-data.test.ts` `CHART-01 um ponto por linha na ordem retornada`; `charts/CartesianChartView.test.tsx` `CHART-01 área, barras e linha desenham um ponto por linha` | yes |
| C20 | `charts/CartesianChartView.test.tsx` `CHART-02 legenda mostra o nome de cada série quando há mais de uma` | yes |
| C21 | `charts/CartesianChartView.test.tsx` `CHART-03 dica mostra o valor do eixo X e de cada série` | no - nenhum hover; o conteúdo é provado com payload montado à mão no NinbiTooltip (F9) |
| C22 | `charts/CartesianChartView.test.tsx` `CHART-04 Horizontal desenha as barras na horizontal` | yes |
| C23 | `charts/CartesianChartView.test.tsx` `CHART-05 Empilhado empilha as séries` | yes |
| C24 | `charts/CartesianChartView.test.tsx` `CHART-06 eixo X mostra só parte dos rótulos quando não cabem`; `mapping/chart-data.test.ts` `CHART-06 tickInterval pula rótulos que não cabem na largura` | yes |
| C25 | `mapping/chart-data.test.ts` `CHART-07 primeira série usa o token chart-1` | yes |
| C26 | `charts/CartesianChartView.test.tsx` `CHART-08 redimensionar o card redesenha o gráfico no novo tamanho` | yes |
| C27 | `charts/PieChartView.test.tsx` `CHART-09 pizza desenha uma fatia por linha` | no - conta os setores; o tamanho pela coluna de valor não é afirmado (F10) |
| C28 | `charts/PieChartView.test.tsx` `CHART-10 Donut desenha o centro vazado` | yes |
| C29 | `charts/PolarChartViews.test.tsx` `CHART-11 radar desenha um eixo por linha e um polígono por série` | yes |
| C30 | `charts/PolarChartViews.test.tsx` `CHART-12 radial desenha uma barra por linha` | yes |
| C31 | `mapping/chart-data.test.ts` `CHART-13 mais de 12 categorias corta em 12 e informa o total`; `charts/PieChartView.test.tsx` `CHART-13 pizza com 30 linhas mostra Mostrando 12 de 30 categorias`; `charts/PolarChartViews.test.tsx` `CHART-13 radar com 30 linhas mostra Mostrando 12 de 30 categorias` | yes |
| C32 | `charts/PieChartView.test.tsx` `CHART-14 dica da pizza mostra categoria e valor`; `charts/PolarChartViews.test.tsx` `CHART-14 dica do radar e do radial mostra categoria e valor` | no - sem hover; só o wrapper e o NinbiTooltip isolado (F9) |
| C33 | `mapping/chart-data.test.ts` `CHART-15 valor negativo na pizza vira ausente` | yes |
| C34 | `mapping/simple-data.test.ts` `KPI-01 KPI usa o valor da primeira linha`; `WidgetVisualization.test.tsx` `KPI-01 card de KPI mostra o título e o valor` | yes |
| C35 | `KpiView.test.tsx` `KPI-02 variação positiva mostra chip com seta para cima e o valor em %` | yes |
| C36 | `KpiView.test.tsx` `KPI-03 variação negativa mostra chip com seta para baixo` | yes |
| C37 | `KpiView.test.tsx` `KPI-04 sem variação ou variação nula não mostra chip` | yes |
| C38 | `KpiView.test.tsx` `KPI-05 valor não numérico aparece como texto` | yes |
| C39 | `ListView.test.tsx` `LIST-01 lista mostra texto principal e até dois valores na ordem`; `mapping/simple-data.test.ts` `LIST-01 lista mantém a ordem e até dois valores` | yes |
| C40 | `ListView.test.tsx` `LIST-02 texto secundário aparece abaixo do principal em tom apagado` | yes |
| C41 | `ListView.test.tsx` `LIST-03 linhas rolam dentro do card com o título fixo` | yes |
| C42 | `ListView.test.tsx` `LIST-04 texto longo é cortado com reticências` | yes |
| C43 | `map/MapView.test.tsx` `MAP-01 mapa desenha um marcador por linha`; `mapping/simple-data.test.ts` `MAP-01 um ponto por linha com latitude e longitude` | yes |
| C44 | `map/MapView.test.tsx` `MAP-02 rótulo de cada marcador aparece em um chip` | yes |
| C45 | `mapping/simple-data.test.ts` `MAP-03 coordenadas inválidas são descartadas e contadas`; `map/MapView.test.tsx` `MAP-03 linha com latitude 200 é ignorada e avisada` | yes |
| C46 | `mapping/simple-data.test.ts` `MAP-04 nenhuma coordenada válida dá Nenhuma linha com coordenadas válidas`; `WidgetVisualization.test.tsx` `MAP-04 mapa sem coordenadas válidas mostra Nenhuma linha com coordenadas válidas` | yes |
| C47 | `mapping/simple-data.test.ts` `MAP-05 enquadramento contém todos os marcadores` | no - testa só `mapViewport()`; o `FitViewport` que aplica o enquadramento não é exercitado (F11) |
| C48 | `map/MapView.test.tsx` `MAP-06 passar o cursor no marcador mostra rótulo e coordenadas` | yes |
| C49 | `apps/api/test/map-config/map-config.spec.ts` `MAP-07 endereço dos tiles vem de NINBI_MAP_TILE_URL com OpenStreetMap por padrão`; `map/MapView.test.tsx` `MAP-07 mapa de tiles com zoom e arrasto no estilo do tema` | yes |
| C50 | `WidgetVisualization.test.tsx` `LOOK-01 dashboard com área, listas, KPI e mapa usa os cards do tema e o gradiente da logo` | yes |
| C51 | `WidgetVisualization.test.tsx` `LOOK-02 barras, linha, pizza, radar e radial usam a grade, as cores e a dica do tema` | yes |
| C52 | `WidgetVisualization.test.tsx` `LOOK-03 widgets não escrevem cor literal e o tema claro define as cores dos gráficos` | yes - proxy: regex sobre os .tsx e `--chart-n` nos blocos de tema |
| C53 | `WidgetVisualization.test.tsx` `LOOK-04 menu do card de gráfico em edição tem Editar widget e Remover widget` | yes |
| C54 | `charts/CartesianChartView.test.tsx` `CHART-16 uma linha só desenha um ponto visível` | yes |
| C55 | `mapping/suggest.test.ts` `VIZ-19 trocar para visualização incompatível usa a sugestão da nova`; `VisualizationPanel.test.tsx` `VIZ-19 trocar Barras por Pizza substitui o mapeamento pela sugestão` | yes |
| C56 | `VisualizationPanel.test.tsx` `VIZ-20 Cypher novo sem as colunas mapeadas mostra a mensagem no card` | yes |
| C57 | `mapping/simple-data.test.ts` `MAP-08 marcadores na mesma coordenada levam os dois rótulos`; `map/MapView.test.tsx` `MAP-08 dois marcadores na mesma coordenada mostram os dois rótulos na dica` | yes |
| C58 | `map/MapView.test.tsx` `MAP-09 falha dos tiles mostra Não foi possível carregar o mapa de fundo` | yes |
| C59 | `mapping/chart-data.test.ts` `CHART-17 mais séries que cores repetem a paleta na mesma ordem` | yes |
| C60 | `mapping/chart-data.test.ts` `CHART-18 pizza só com zeros não tem dados`; `WidgetVisualization.test.tsx` `CHART-18 pizza só com zeros mostra A consulta não retornou dados` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (Major) A sugestão descarta uma coluna numérica que tem um único valor de texto. Com `[mes, vendas=[10,'n/d',30]]`, AREA sugere `series: []`; com `[nome, total=[10,'n/d',3]]`, PIE sugere `value: null`; com `saldo=[10,'n/d']`, KPI sugere `value: null`. Contradiz VIZ-14 e a premissa "valor não numérico em papel numérico é ausente" | `apps/web/src/features/widgets/mapping/columns.ts:13-22` (`every` sobre todos os não nulos); `suggest.ts:50-51`, `62`, `68`, `75`. Teste que fixa a regra: `mapping/columns.test.ts:22-23` ("coluna com número e texto é other") | Classificar a coluna como `number` quando há ao menos um valor numérico, deixando o tratamento de texto para os construtores (VIZ-14); ajustar `columns.test.ts:22-23` | e506202 - AD-133 |
| F2 (Major) VIZ-12 não vale para a coluna de variação do KPI: com `change: 'variacao'` inexistente o card mostra o KPI sem chip e sem aviso | `apps/web/src/features/widgets/mapping/simple-data.ts:31` (só `mapping.value` entra em `checkColumns`) e `:34-37` (ausente vira `null`). Teste que fixa o erro: `simple-data.test.ts:59-60` (`ok: true`, `change: null`) | Incluir `mapping.change` em `checkColumns` e trocar o teste de `:59-60` pela mensagem de VIZ-12 | 9fb1d4d - C12 |
| F3 (Major) VIZ-13 não vale para a coluna de variação do KPI nem para os valores da LISTA: `change` com `'x'` vira `null` sem aviso, e `values` com `'x'` aparece como texto | `simple-data.ts:31`, `:61-65` (`exists()` força `numeric: false`). Own example no HEAD: `buildKpi` com `change` só de texto retorna `ok: true`; `buildList` com `values: ['total']` só de texto retorna `ok: true`. O KPI `value` de texto fica como está por KPI-05 e não é achado | Passar `numeric: true` para `change` e para `values` em `checkColumns` | 9fb1d4d - C13 |
| F4 (Major) Formato de data reescreve qualquer texto que começa com `AAAA-MM-DD`, com perda de dados. `'2024-05-12-001'` vira `'12/05/2024'`; `'2024-05-12 Lote 7'` vira `'12/05/2024'`; `'2026-13-45'` vira `'45/13/2026'`. Afeta rótulos de eixo, categorias, listas e tabelas | `apps/web/src/lib/format.ts:31-35` (regex sem âncora de fim e sem validação) e `:41` (`formatValue`). `format.test.ts` só cobre datas puras | Converter só quando a string inteira for `AAAA-MM-DD` (com `T…` opcional) e a data for válida; senão devolver o texto original | b73f7cb - C17 |
| F5 (Minor) Sinal da variação do KPI calculado antes do arredondamento: `-0.001` vira `direction: 'down'` com rótulo `"0%"`, ou seja, chip "↓ 0%" | `apps/web/src/features/widgets/mapping/simple-data.ts:43-45` | Decidir o sinal pelo valor exibido (arredondado), ou não mostrar chip quando o valor exibido é zero | fa4d1ad - C36 |
| F6 (Minor) `formatNumber(-0.001)` sai `"-0"` em rótulos, dicas e KPI | `apps/web/src/lib/format.ts:27-29` (Intl pt-BR preserva o sinal do zero arredondado) | Normalizar `-0` para `0` depois do arredondamento | b73f7cb - C17 |
| F7 (Minor, provável, não reproduzido) O mapa reenquadra e recria os marcadores a cada render do pai: `buildMapPoints` é chamado inline, então `points` é um array novo a cada render. Zoom e arrasto do usuário se perdem em qualquer re-render do card (por exemplo, arrastar outro widget em edição) | `apps/web/src/features/widgets/WidgetVisualization.tsx:158-163` (chamada inline); `map/MapView.tsx:53-66` (`FitViewport`, `useEffect` com dependência `points`) e `:90-93` (`useMemo` de ícones recalculado) | Memoizar o resultado de `buildMapPoints` por `(result, mapping)` no `WidgetVisualization` (ou por `useMemo`), para que `points` mantenha a identidade | 1f3418b - C47 |
| F8 (Minor) O teste de corte de categorias afirma só o tamanho (12), não quais linhas aparecem. O critério diz "as 12 primeiras" | `mapping/chart-data.test.ts:148-159` | Afirmar a primeira e a última categoria exibidas (`c0` e `c11`) | c0e9c77 - C31 |
| F9 (Minor) Nenhum teste de gráfico dispara hover: a dica de área, barra, linha, pizza, radar e radial é provada só pelo `NinbiTooltip` isolado com payload montado à mão, mais a existência do `.recharts-tooltip-wrapper`, que existe sem conteúdo. Um gráfico com payload errado passa. Explica C21 e C32 | `charts/CartesianChartView.test.tsx:94-128`; `charts/PieChartView.test.tsx:64-78`; `charts/PolarChartViews.test.tsx:82-125`. O teste de hover existe só no mapa (`map/MapView.test.tsx`, MAP-06) | Disparar `mouseMove` sobre um ponto/fatia/barra e afirmar o texto da dica que o Recharts renderiza | d7091ec - C21, C32 |
| F10 (Minor) CHART-09 não afirma o tamanho da fatia: o teste conta os setores, não o ângulo proporcional ao valor. Explica C27 | `charts/PieChartView.test.tsx:34-36` | Afirmar que o sweep de cada setor é proporcional ao valor (como `PolarChartViews.test` faz para o radial) | 7357611 - C27 |
| F11 (Minor) MAP-05 não é exercitado no componente: `FitViewport` (que chama `fitBounds`/`setView`) não tem teste; só `mapViewport()` é testado. Explica C47 | `map/MapView.tsx:53-66`; `mapping/simple-data.test.ts:172-193` | Teste de componente que verifique o enquadramento aplicado (por exemplo, zoom e centro do mapa em `data-zoom`/`leaflet` após o render) | 868b74f - C47 |

## Own examples (rodados no HEAD, apagados depois)

Oito regras de custo foram testadas com valores que nenhum check nomeia. Resultados:

- Pizza com todas as linhas negativas dá "A consulta não retornou dados" (ok). Pizza com 13 linhas mostra 12 e "Mostrando 12 de 13 categorias" (ok). Área com série só de nulos não dá erro (ok). Coordenadas, bigint e o corte de categorias não tiveram achado.
- Falhas: F1 (três casos de sugestão), F2, F3 (três casos), F4 (três strings), F5 e F6.

Nenhum arquivo de teste de own examples foi commitado; o arquivo temporário `apps/web/src/features/widgets/mapping/zz-verifier-own.test.ts` foi removido.

## Verificação de regras de custo

- Mapeamento resultado para gráfico: F1 (sugestão), F8 (corte, asserção fraca). Séries, nulos, negativos e corte estão corretos no código.
- Variação do KPI: sinal correto para `0` e para negativos normais; F5 no arredondamento; F2 e F3 nas colunas.
- Coordenadas: `validCoordinate` aceita só finitos dentro de ±90/±180, com texto e nulo descartados e contados (ok, com teste de latitude 200 e longitude -181).
- Formatos: `1.234,56` correto; `dd/MM/aaaa` correto para datas puras, mas F4 e F6.
- Salvar: `visualization` e `config` são gravados (`toSavePayload`, `dashboards.service.ts:164-165`, `:269-270`), validados no contrato (`widgetSchema.superRefine`) e cobertos pelo teste de API e pelo PUT do `DashboardEditMode`. Sem achado.
