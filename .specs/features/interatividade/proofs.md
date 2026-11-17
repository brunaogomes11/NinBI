# interatividade proofs

**HEAD**: 3b82b19
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 101 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run web / ✓ FLT-01 Novo filtro abre o formulário com Rótulo, Parâmetro, Tipo e Valor padrão` | pass |
| C2 | `run contracts / ✓ FLT-02 tipos de filtro na ordem da spec` | pass |
| C2 | `run web / ✓ FLT-02 campo Tipo oferece os seis tipos na ordem` | pass |
| C3 | `run contracts / ✓ FLT-03 parâmetro inválido, longo ou repetido é recusado com a mensagem` | pass |
| C3 | `run web / ✓ FLT-03 parâmetro inválido mostra a mensagem no campo` | pass |
| C4 | `run contracts / ✓ FLT-04 rótulo vazio ou com mais de 40 caracteres é recusado` | pass |
| C4 | `run web / ✓ FLT-04 rótulo vazio mostra Informe o rótulo no campo` | pass |
| C5 | `run contracts / ✓ FLT-05 filtro de seleção exige a origem das opções` | pass |
| C5 | `run web / ✓ FLT-05 tipo de seleção pede Lista fixa ou Consulta Cypher` | pass |
| C6 | `run api / ✓ FLT-06 opções vêm da primeira coluna da consulta sob a validação somente leitura` | pass |
| C6 | `run web / ✓ FLT-06 Carregar opções mostra os valores da consulta` | pass |
| C7 | `run web / ✓ FLT-07 dashboard abre com a barra de filtros no valor padrão` | pass |
| C8 | `run web / ✓ FLT-08 a mesma barra com os mesmos valores aparece em todas as abas` | pass |
| C9 | `run contracts / ✓ FLT-09 extractParameterNames acha os parâmetros fora de strings e comentários` | pass |
| C9 | `run api / ✓ FLT-09 cada widget traz os parâmetros que o Cypher usa` | pass |
| C9 | `run web / ✓ FLT-09 relevantParams mantém só os parâmetros do widget` | pass |
| C9 | `run web / ✓ FLT-09 mudar o filtro executa de novo só os widgets que usam o parâmetro` | pass |
| C10 | `run web / ✓ FLT-10 abrir outra aba executa os widgets com os valores atuais` | pass |
| C11 | `run api / ✓ FLT-11 parâmetro vazio chega ao Neo4j como null` | pass |
| C11 | `run web / ✓ FLT-11 filtro vazio envia null` | pass |
| C11 | `run web / ✓ FLT-11 filtro vazio chega à execução como null` | pass |
| C12 | `run api / ✓ FLT-12 lista de valores chega ao Neo4j como lista` | pass |
| C12 | `run web / ✓ FLT-12 seleção múltipla envia a lista dos valores` | pass |
| C12 | `run web / ✓ FLT-12 marcar duas opções aplica a lista` | pass |
| C13 | `run api / ✓ FLT-13 datas do intervalo chegam como datas do Cypher` | pass |
| C13 | `run web / ✓ FLT-13 intervalo envia parametro_inicio e parametro_fim` | pass |
| C14 | `run web / ✓ FLT-14 texto e número aplicam o valor 500 ms depois da última tecla` | pass |
| C15 | `run web / ✓ FLT-15 clearAll devolve todos os filtros ao valor padrão` | pass |
| C15 | `run web / ✓ FLT-15 Limpar filtros devolve os valores padrão` | pass |
| C16 | `run web / ✓ FLT-16 widgetsUsingFilter conta os widgets de todas as abas` | pass |
| C16 | `run web / ✓ FLT-16 Remover filtro pede confirmação com o número de widgets` | pass |
| C17 | `run api / ✓ FLT-17 salvar grava os filtros com o dashboard` | pass |
| C17 | `run web / ✓ FLT-17 rascunho leva os filtros ao salvar` | pass |
| C17 | `run web / ✓ FLT-17 Aplicar e Salvar enviam o filtro novo no PUT` | pass |
| C18 | `run web / ✓ FLT-18 Novo filtro, Editar filtro e Remover filtro só em edição para quem pode editar` | pass |
| C19 | `run web / ✓ FLT-19 Executar no editor envia os valores atuais dos filtros` | pass |
| C20 | `run api / ✓ FLT-20 pedido ao LLM lista rótulo, parâmetro e tipo de cada filtro sem valores` | pass |
| C20 | `run web / ✓ FLT-20 pedido à IA leva os filtros do rascunho sem valores` | pass |
| C21 | `run web / ✓ FLT-21 barra de filtros quebra em mais linhas` | pass |
| C22 | `run web / ✓ FLT-22 dashboard sem filtros não mostra a barra em visualização` | pass |
| C23 | `run contracts / ✓ RFR-01 intervalos de atualização na ordem da spec` | pass |
| C23 | `run web / ✓ RFR-01 Atualização automática oferece Desligada a 1 h` | pass |
| C24 | `run web / ✓ RFR-02 intervalo vencido executa de novo os widgets da aba ativa` | pass |
| C25 | `run api / ✓ RFR-03 intervalo padrão é gravado e devolvido com o dashboard` | pass |
| C25 | `run web / ✓ RFR-03 intervalo padrão vai no payload` | pass |
| C25 | `run web / ✓ RFR-03 intervalo escolhido em edição e salvo vira o inicial` | pass |
| C26 | `run web / ✓ RFR-04 intervalo escolhido em visualização não grava o dashboard` | pass |
| C27 | `run web / ✓ RFR-05 aba do navegador oculta não executa atualizações` | pass |
| C28 | `run web / ✓ RFR-06 voltar a ficar visível com o intervalo já vencido executa uma atualização` | pass |
| C29 | `run web / ✓ RFR-07 modo de edição não executa atualizações automáticas` | pass |
| C30 | `run web / ✓ RFR-08 execução em andamento pula a atualização desse widget` | pass |
| C31 | `run web / ✓ RFR-09 atualização mantém os dados anteriores sem esqueleto` | pass |
| C32 | `run web / ✓ RFR-10 falha da atualização mantém os dados e mostra Não foi possível atualizar às` | pass |
| C33 | `run web / ✓ RFR-11 atualização terminada mostra Atualizado às` | pass |
| C34 | `run contracts / ✓ XFL-01 crossFilter aceita só filtros de seleção única, texto, número ou data e recusa KPI` | pass |
| C34 | `run web / ✓ XFL-01 editor oferece Ao clicar com filtro e coluna` | pass |
| C35 | `run web / ✓ XFL-02 clickValue lê a coluna configurada na linha clicada` | pass |
| C35 | `run web / ✓ XFL-02 clicar em barra, ponto, fatia, eixo de radar e barra radial define o filtro` | pass |
| C35 | `run web / ✓ XFL-02 clicar em linha de lista, linha de tabela e marcador define o filtro` | pass |
| C36 | `run web / ✓ XFL-03 filtro definido por clique aparece na barra e executa os widgets que usam o parâmetro` | pass |
| C37 | `run web / ✓ XFL-04 selectedRows marca as linhas com o valor selecionado` | pass |
| C37 | `run web / ✓ XFL-04 elemento selecionado fica destacado e os demais esmaecidos` | pass |
| C37 | `run web / ✓ XFL-04 linha e marcador selecionados ficam destacados` | pass |
| C38 | `run web / ✓ XFL-05 toggleClick no mesmo elemento esvazia o filtro` | pass |
| C38 | `run web / ✓ XFL-05 clicar de novo no elemento esvazia o filtro e tira o destaque` | pass |
| C39 | `run web / ✓ XFL-06 setValue pela barra remove a seleção do filtro` | pass |
| C39 | `run web / ✓ XFL-06 mudar o filtro pela barra remove o destaque` | pass |
| C40 | `run web / ✓ XFL-07 widget sem Ao clicar não muda filtro` | pass |
| C41 | `run web / ✓ XFL-08 modo de edição não muda filtro por clique` | pass |
| C42 | `run contracts / ✓ XFL-09 crossFilter para filtro inexistente é recusado` | pass |
| C42 | `run web / ✓ XFL-09 removeFilter tira o Ao clicar dos widgets` | pass |
| C42 | `run web / ✓ XFL-09 remover o filtro tira o Ao clicar do widget ao salvar` | pass |
| C43 | `run web / ✓ EXP-01 menu do widget em visualização mostra Exportar CSV e Exportar PNG` | pass |
| C44 | `run web / ✓ EXP-02 CSV tem cabeçalho e todas as linhas na ordem das colunas` | pass |
| C44 | `run web / ✓ EXP-02 Exportar CSV baixa as 120 linhas com a página 1 visível` | pass |
| C45 | `run web / ✓ EXP-03 CSV em UTF-8 com BOM, ponto e vírgula, vírgula decimal e datas dd/MM/aaaa` | pass |
| C46 | `run web / ✓ EXP-04 texto com ponto e vírgula, aspas ou quebra de linha vai entre aspas` | pass |
| C47 | `run web / ✓ EXP-05 texto que começa com igual, mais, menos ou arroba ganha apóstrofo` | pass |
| C48 | `run web / ✓ EXP-06 Exportar PNG gera a imagem do card no dobro da resolução` | pass |
| C49 | `run web / ✓ EXP-07 nome do arquivo troca caracteres especiais por hífen e leva a data` | pass |
| C49 | `run web / ✓ EXP-07 arquivos baixados usam o título e a data` | pass |
| C50 | `run web / ✓ EXP-08 exportar fica desabilitado carregando, sem dados ou com erro` | pass |
| C51 | `run api / ✓ FLT-23 falha da consulta de opções responde com o erro da consulta` | pass |
| C51 | `run web / ✓ FLT-23 falha das opções mostra Não foi possível carregar as opções e Tentar novamente` | pass |
| C52 | `run api / ✓ FLT-24 mais de 1000 valores usa os primeiros 1000` | pass |
| C53 | `run web / ✓ FLT-25 intervalo invertido dá A data inicial é maior que a final` | pass |
| C53 | `run web / ✓ FLT-25 intervalo invertido não aplica e mostra a mensagem` | pass |
| C54 | `run web / ✓ FLT-26 texto que não é número dá Digite um número` | pass |
| C54 | `run web / ✓ FLT-26 número inválido não aplica e mostra Digite um número` | pass |
| C55 | `run web / ✓ FLT-27 só o resultado do valor mais recente aparece` | pass |
| C56 | `run api / ✓ FLT-28 parâmetro que não é de um filtro é ignorado na execução do widget salvo` | pass |
| C57 | `run api / ✓ FLT-29 quem só vê carrega as opções do filtro salvo` | pass |
| C57 | `run web / ✓ FLT-29 quem só vê muda o filtro e os widgets executam` | pass |
| C58 | `run api / ✓ FLT-30 quem só vê recebe 403 ao gravar filtros` | pass |
| C58 | `run api / ✓ FLT-30 quem só vê recebe 403 nas opções do rascunho` | pass |
| C59 | `run web / ✓ FLT-31 duas sessões guardam valores, seleção e intervalo separados` | pass |
| C60 | `run web / ✓ XFL-10 valor fora das opções aparece no filtro de seleção única` | pass |
| C61 | `run web / ✓ RFR-12 mudar um filtro reinicia a contagem do intervalo` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run web` - exit 0

```
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/widgets/WidgetEditorDialog.filters.test.tsx > WidgetEditorDialog com filtros > XFL-01 widget KPI não mostra Ao clicar
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/widgets/WidgetEditorDialog.filters.test.tsx > WidgetEditorDialog com filtros > XFL-01 widget KPI não mostra Ao clicar
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.
```

`Run contracts` - exit 0

```
 ✓ src/dashboards.spec.ts > dashboard contracts > SIDE-02 nome do grupo vazio ou com mais de 40 caracteres 3ms
 ✓ src/dashboards.spec.ts > dashboard contracts > TAB-04 nome da aba vazio ou com mais de 40 caracteres 4ms
 ✓ src/dashboards.spec.ts > dashboard contracts > WDG-07 título do widget vazio ou com mais de 80 caracteres 5ms
 ✓ src/dashboards.spec.ts > dashboard contracts > GRID-03 layout do widget fora dos limites da grade é recusado 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > QRY-09 Cypher com mais de 20000 caracteres no contrato 2ms
 ✓ src/dashboards.spec.ts > dashboard contracts > dashboardSaveSchema sem abas é recusado e com abas e widgets é aceito 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > sidebarLayoutSchema com um dashboard repetido é recusado 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > MESSAGES formata o prazo e o corte de linhas 21ms

 Test Files  10 passed (10)
      Tests  86 passed (86)
   Start at  01:36:59
   Duration  626ms (import 76%, transform 12%, tests 8%, worker 4%)

$ vitest run --reporter=verbose
```

`Run api` - exit 0

```
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem 4ms
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 chave que não tem 32 bytes não inicia o backend 1ms
 ✓ test/auth/permission.guard.spec.ts > PermissionGuard > ROLE-01 cada papel recebe 200 ou 403 conforme a matriz 5424ms
 ✓ test/health/health.spec.ts > health > FND-04 health responde 503 com postgres down 2552ms
 ✓ test/web/web.spec.ts > servir o web pela API > FND-01 serve o index.html do web em GET / 3037ms

 Test Files  64 passed (64)
      Tests  349 passed (349)
   Start at  01:37:01
   Duration  178.90s (tests 67%, import 33%)

$ vitest run --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```
