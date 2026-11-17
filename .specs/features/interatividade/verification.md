# Interatividade verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 41b2fc3
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `apps/web/src/features/filters/FilterEditorDialog.test.tsx` `FLT-01 Novo filtro abre o formulário com Rótulo, Parâmetro, Tipo e Valor padrão` | yes |
| C2 | `packages/contracts/src/filters.spec.ts` `FLT-02 tipos de filtro na ordem da spec`; `apps/web/src/features/filters/FilterEditorDialog.test.tsx` `FLT-02 campo Tipo oferece os seis tipos na ordem` | yes |
| C3 | `packages/contracts/src/filters.spec.ts` `FLT-03 parâmetro inválido, longo ou repetido é recusado com a mensagem`; `FilterEditorDialog.test.tsx` `FLT-03 parâmetro inválido mostra a mensagem no campo` | yes |
| C4 | `packages/contracts/src/filters.spec.ts` `FLT-04 rótulo vazio ou com mais de 40 caracteres é recusado`; `FilterEditorDialog.test.tsx` `FLT-04 rótulo vazio mostra Informe o rótulo no campo` | yes |
| C5 | `packages/contracts/src/filters.spec.ts` `FLT-05 filtro de seleção exige a origem das opções`; `FilterEditorDialog.test.tsx` `FLT-05 tipo de seleção pede Lista fixa ou Consulta Cypher` | yes |
| C6 | `apps/api/test/filters/filter-options.routes.spec.ts` `FLT-06 opções vêm da primeira coluna da consulta sob a validação somente leitura`; `FilterEditorDialog.test.tsx` `FLT-06 Carregar opções mostra os valores da consulta` | yes |
| C7 | `apps/web/src/features/filters/FilterBar.test.tsx` `FLT-07 dashboard abre com a barra de filtros no valor padrão` | yes |
| C8 | `apps/web/src/features/filters/FilterBar.test.tsx` `FLT-08 a mesma barra com os mesmos valores aparece em todas as abas` | yes |
| C9 | `apps/web/src/features/filters/DashboardFilters.test.tsx` `FLT-09 mudar o filtro executa de novo só os widgets que usam o parâmetro`; `apps/api/test/dashboards/filters.spec.ts` `FLT-09 cada widget traz os parâmetros que o Cypher usa` | yes |
| C10 | `apps/web/src/features/filters/DashboardFilters.test.tsx` `FLT-10 abrir outra aba executa os widgets com os valores atuais` | yes |
| C11 | `apps/api/test/queries/cypher-params.spec.ts` `FLT-11 parâmetro vazio chega ao Neo4j como null`; `apps/web/src/features/filters/filter-values.test.ts` `FLT-11 filtro vazio envia null` | yes |
| C12 | `apps/api/test/queries/cypher-params.spec.ts` `FLT-12 lista de valores chega ao Neo4j como lista`; `apps/web/src/features/filters/filter-values.test.ts` `FLT-12 seleção múltipla envia a lista dos valores` | yes |
| C13 | `apps/api/test/queries/cypher-params.spec.ts` `FLT-13 datas do intervalo chegam como datas do Cypher`; `apps/web/src/features/filters/filter-values.test.ts` `FLT-13 intervalo envia parametro_inicio e parametro_fim` | yes |
| C14 | `apps/web/src/features/filters/FilterControl.test.tsx` `FLT-14 texto e número aplicam o valor 500 ms depois da última tecla` | yes |
| C15 | `apps/web/src/features/filters/filter-session.test.tsx` `FLT-15 clearAll devolve todos os filtros ao valor padrão`; `FilterBar.test.tsx` `FLT-15 Limpar filtros devolve os valores padrão` | yes |
| C16 | `apps/web/src/features/filters/filter-values.test.ts` `FLT-16 widgetsUsingFilter conta os widgets de todas as abas`; `FilterEditorDialog.test.tsx` `FLT-16 Remover filtro pede confirmação com o número de widgets` | yes |
| C17 | `apps/api/test/dashboards/filters.spec.ts` `FLT-17 salvar grava os filtros com o dashboard`; `apps/web/src/features/dashboards/draft.test.ts` `FLT-17 rascunho leva os filtros ao salvar` | yes |
| C18 | `apps/web/src/features/filters/FilterBar.test.tsx` `FLT-18 Novo filtro, Editar filtro e Remover filtro só em edição para quem pode editar` | yes |
| C19 | `apps/web/src/features/widgets/WidgetEditorDialog.filters.test.tsx` `FLT-19 Executar no editor envia os valores atuais dos filtros` | yes |
| C20 | `apps/api/test/ai/ai-widget.route.spec.ts` `FLT-20 pedido ao LLM lista rótulo, parâmetro e tipo de cada filtro sem valores`; `apps/web/src/features/ai/useAiGenerations.test.tsx` `FLT-20 pedido à IA leva os filtros do rascunho sem valores` | yes |
| C21 | `apps/web/src/features/filters/FilterBar.test.tsx` `FLT-21 barra de filtros quebra em mais linhas` | yes |
| C22 | `apps/web/src/features/filters/FilterBar.test.tsx` `FLT-22 dashboard sem filtros não mostra a barra em visualização` | yes |
| C23 | `apps/web/src/features/refresh/RefreshControl.test.tsx` `RFR-01 Atualização automática oferece Desligada a 1 h`; `packages/contracts/src/filters.spec.ts` `RFR-01 intervalos de atualização na ordem da spec` | yes |
| C24 | `apps/web/src/features/refresh/useAutoRefresh.test.tsx` `RFR-02 intervalo vencido executa de novo os widgets da aba ativa` | yes |
| C25 | `apps/api/test/dashboards/filters.spec.ts` `RFR-03 intervalo padrão é gravado e devolvido com o dashboard`; `RefreshControl.test.tsx` `RFR-03 intervalo escolhido em edição e salvo vira o inicial` | yes |
| C26 | `apps/web/src/features/refresh/RefreshControl.test.tsx` `RFR-04 intervalo escolhido em visualização não grava o dashboard` | yes |
| C27 | `apps/web/src/features/refresh/useAutoRefresh.test.tsx` `RFR-05 aba do navegador oculta não executa atualizações` | yes |
| C28 | `apps/web/src/features/refresh/useAutoRefresh.test.tsx` `RFR-06 voltar a ficar visível com o intervalo já vencido executa uma atualização` | yes |
| C29 | `apps/web/src/features/refresh/useAutoRefresh.test.tsx` `RFR-07 modo de edição não executa atualizações automáticas` | yes |
| C30 | `apps/web/src/features/refresh/useAutoRefresh.test.tsx` `RFR-08 execução em andamento pula a atualização desse widget` | yes |
| C31 | `apps/web/src/features/widgets/WidgetCard.refresh.test.tsx` `RFR-09 atualização mantém os dados anteriores sem esqueleto` | yes |
| C32 | `apps/web/src/features/widgets/WidgetCard.refresh.test.tsx` `RFR-10 falha da atualização mantém os dados e mostra Não foi possível atualizar às` | yes |
| C33 | `apps/web/src/features/refresh/RefreshControl.test.tsx` `RFR-11 atualização terminada mostra Atualizado às` | yes |
| C34 | `apps/web/src/features/widgets/WidgetEditorDialog.filters.test.tsx` `XFL-01 editor oferece Ao clicar com filtro e coluna`; `packages/contracts/src/filters.spec.ts` `XFL-01 crossFilter aceita só filtros de seleção única, texto, número ou data e recusa KPI` | yes |
| C35 | `apps/web/src/features/filters/cross-filter.test.ts` `XFL-02 clickValue lê a coluna configurada na linha clicada`; `apps/web/src/features/widgets/CrossFilterCharts.test.tsx` `XFL-02 clicar em barra, ponto, fatia, eixo de radar e barra radial define o filtro`; `CrossFilterRows.test.tsx` `XFL-02 clicar em linha de lista, linha de tabela e marcador define o filtro` | yes |
| C36 | `apps/web/src/features/widgets/CrossFilterCharts.test.tsx` `XFL-03 filtro definido por clique aparece na barra e executa os widgets que usam o parâmetro` | yes |
| C37 | `apps/web/src/features/filters/cross-filter.test.ts` `XFL-04 selectedRows marca as linhas com o valor selecionado`; `CrossFilterCharts.test.tsx` `XFL-04 elemento selecionado fica destacado e os demais esmaecidos` | yes |
| C38 | `apps/web/src/features/filters/filter-session.test.tsx` `XFL-05 toggleClick no mesmo elemento esvazia o filtro`; `CrossFilterCharts.test.tsx` `XFL-05 clicar de novo no elemento esvazia o filtro e tira o destaque` | yes |
| C39 | `apps/web/src/features/filters/filter-session.test.tsx` `XFL-06 setValue pela barra remove a seleção do filtro`; `CrossFilterCharts.test.tsx` `XFL-06 mudar o filtro pela barra remove o destaque` | yes |
| C40 | `apps/web/src/features/widgets/CrossFilterCharts.test.tsx` `XFL-07 widget sem Ao clicar não muda filtro` | yes |
| C41 | `apps/web/src/features/widgets/CrossFilterCharts.test.tsx` `XFL-08 modo de edição não muda filtro por clique` | yes |
| C42 | `apps/web/src/features/dashboards/draft.test.ts` `XFL-09 removeFilter tira o Ao clicar dos widgets`; `packages/contracts/src/filters.spec.ts` `XFL-09 crossFilter para filtro inexistente é recusado` | yes |
| C43 | `apps/web/src/features/export/WidgetExportMenu.test.tsx` `EXP-01 menu do widget em visualização mostra Exportar CSV e Exportar PNG` | yes |
| C44 | `apps/web/src/features/export/csv.test.ts` `EXP-02 CSV tem cabeçalho e todas as linhas na ordem das colunas`; `WidgetExportMenu.test.tsx` `EXP-02 Exportar CSV baixa as 120 linhas com a página 1 visível` | yes |
| C45 | `apps/web/src/features/export/csv.test.ts` `EXP-03 CSV em UTF-8 com BOM, ponto e vírgula, vírgula decimal e datas dd/MM/aaaa` | yes |
| C46 | `apps/web/src/features/export/csv.test.ts` `EXP-04 texto com ponto e vírgula, aspas ou quebra de linha vai entre aspas` | yes |
| C47 | `apps/web/src/features/export/csv.test.ts` `EXP-05 texto que começa com igual, mais, menos ou arroba ganha apóstrofo` | yes |
| C48 | `apps/web/src/features/export/WidgetExportMenu.test.tsx` `EXP-06 Exportar PNG gera a imagem do card no dobro da resolução` | yes |
| C49 | `apps/web/src/features/export/csv.test.ts` `EXP-07 nome do arquivo troca caracteres especiais por hífen e leva a data`; `WidgetExportMenu.test.tsx` `EXP-07 arquivos baixados usam o título e a data` | yes |
| C50 | `apps/web/src/features/export/WidgetExportMenu.test.tsx` `EXP-08 exportar fica desabilitado carregando, sem dados ou com erro` | no - o caso "com erro" só cobre a primeira carga sem dados; após uma atualização automática que falha, `query.data` continua e a exportação fica habilitada (F1) |
| C51 | `apps/api/test/filters/filter-options.routes.spec.ts` `FLT-23 falha da consulta de opções responde com o erro da consulta`; `apps/web/src/features/filters/FilterControl.test.tsx` `FLT-23 falha das opções mostra Não foi possível carregar as opções e Tentar novamente` | yes |
| C52 | `apps/api/test/filters/filter-options.spec.ts` `FLT-24 mais de 1000 valores usa os primeiros 1000` | yes |
| C53 | `apps/web/src/features/filters/FilterControl.test.tsx` `FLT-25 intervalo invertido não aplica e mostra a mensagem`; `filter-values.test.ts` `FLT-25 intervalo invertido dá A data inicial é maior que a final` | yes |
| C54 | `apps/web/src/features/filters/FilterControl.test.tsx` `FLT-26 número inválido não aplica e mostra Digite um número`; `filter-values.test.ts` `FLT-26 texto que não é número dá Digite um número` | yes |
| C55 | `apps/web/src/features/filters/DashboardFilters.test.tsx` `FLT-27 só o resultado do valor mais recente aparece` | yes |
| C56 | `apps/api/test/queries/widget-params.spec.ts` `FLT-28 parâmetro que não é de um filtro é ignorado na execução do widget salvo` | yes |
| C57 | `apps/api/test/filters/filter-options.routes.spec.ts` `FLT-29 quem só vê carrega as opções do filtro salvo`; `apps/web/src/features/filters/FilterBar.test.tsx` `FLT-29 quem só vê muda o filtro e os widgets executam` | yes |
| C58 | `apps/api/test/dashboards/filters.spec.ts` `FLT-30 quem só vê recebe 403 ao gravar filtros`; `apps/api/test/filters/filter-options.routes.spec.ts` `FLT-30 quem só vê recebe 403 nas opções do rascunho` | yes |
| C59 | `apps/web/src/features/filters/filter-session.test.tsx` `FLT-31 duas sessões guardam valores, seleção e intervalo separados` | yes |
| C60 | `apps/web/src/features/filters/FilterControl.test.tsx` `XFL-10 valor fora das opções aparece no filtro de seleção única` | yes |
| C61 | `apps/web/src/features/refresh/useAutoRefresh.test.tsx` `RFR-12 mudar um filtro reinicia a contagem do intervalo` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (C50): depois de uma atualização automática que falha, o widget mantém `query.data` e "Exportar CSV" e "Exportar PNG" continuam habilitados, embora o estado seja de erro (EXP-08) | `apps/web/src/features/export/WidgetExportMenu.tsx:43-44` (`canExport` só olha `query.data`); `apps/web/src/features/widgets/WidgetCard.tsx:98-120` mostra dados e a falha juntos | `const canExport = !query.isError && result !== undefined && result.rows.length > 0`; acrescentar teste em que o refetch falha depois de dados carregados e os dois botões ficam desabilitados | b49a7af - C50 |
| F2: CSV troca qualquer texto que comece com data ISO pela data formatada e perde o resto: `2026-01-05 reunião` sai como `05/01/2026` (EXP-03/EXP-04 não cobrem texto) | `apps/web/src/features/export/csv.ts:18-19` (`DATE_PREFIX` sem âncora no fim); a API devolve temporais como texto (`apps/api/src/queries/result-value.ts:55`), por isso o cliente não distingue data de texto | Tipar temporais na API (ex.: `{ kind: 'date', value }`) e converter só esse tipo; enquanto isso, casar o valor inteiro (`^\d{4}-\d{2}-\d{2}$`, com hora opcional) e testar texto com prefixo de data | a51003d - C45 |
| F3: opções repetidas passam. `1` (número) e `'1'` (texto) entram ambos em `optionsFromResult` e viram a mesma chave na lista (FLT-24: "sem nulos/repetidos"). A lista fixa aceita valores repetidos | `apps/api/src/filters/filter-options.ts:24` (chave com `typeof`); `apps/web/src/features/filters/FilterControl.tsx:267` (`key={String(option)}` colide); `apps/web/src/features/filters/FilterEditorDialog.tsx:116-131` (`build()` não deduplica) e `packages/contracts/src/filters.ts:137-140` (schema sem unicidade) | Deduplicar por `String(option)` em `optionsFromResult` e em `build()`/schema da lista fixa; teste com `[1]` e `['1']` e com lista fixa `A`, `A` | 2efc745 - C52 |
| F4: número digitado no padrão brasileiro com ponto de milhar é aplicado sem aviso: `1.234` vira `1,234` e `1.000` vira `1` (FLT-26 só fixa "não é número") | `apps/web/src/features/filters/filter-values.ts:99-100` (`/^-?\d+(\.\d+)?$/` aceita ponto como decimal) | Sem vírgula, tratar `\d{1,3}(\.\d{3})+` como milhar (`1234`) ou recusar com "Digite um número"; teste com `1.234` | 06380b2 - AD-138 |

Observações sem falha de check (fora dos findings): a lista fixa guarda só texto, então um filtro de lista fixa sobre propriedade numérica envia `"10"` como string e não casa com `10` no Neo4j; a spec não fixa o tipo da lista fixa. O validador de somente leitura (`apps/api/src/queries/read-only-cypher.ts`) deixa passar `CALL apoc.create.node(...)`; a barreira real é o modo READ da sessão (`apps/api/src/neo4j/driver-neo4j.gateway.ts:98-100`), mesma regra de `dashboards-consultas`.

Own examples rodados no HEAD (arquivos descartáveis, apagados): CSV (texto com `;`, aspas, quebra; `=`/`-`/`@`; bigint negativo; JSON `-x`; cabeçalho com `;`), `parseNumberInput` (`1.234,5`, `1.234.567`, `1,000.5`, `-0,5`, `.5`, `1e3`), `filterParams` (intervalo com início só, multi vazio, número zero, texto vazio), `checkDateRange` com datas iguais, `toCypherParams` (inteiro negativo, float, lista de datas), `optionsFromResult` (1000 exatos, 1001 com repetido, nulos), toggle de seleção entre widgets, validador somente leitura (14 consultas).
