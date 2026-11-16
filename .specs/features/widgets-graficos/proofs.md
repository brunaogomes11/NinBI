# widgets-graficos proofs

**HEAD**: b9b2f4d
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 85 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run contracts / ✓ VIZ-01 rótulos das visualizações na ordem da spec` | pass |
| C1 | `run web / ✓ VIZ-01 seletor Visualização mostra as 10 opções na ordem` | pass |
| C2 | `run web / ✓ VIZ-02 escolher a visualização com resultado mostra os campos com a sugestão` | pass |
| C3 | `run web / ✓ VIZ-03 área, barras e linha sugerem eixo X não numérico e séries numéricas` | pass |
| C4 | `run web / ✓ VIZ-04 pizza e radial sugerem categoria e valor` | pass |
| C5 | `run web / ✓ VIZ-05 radar sugere eixo e todas as séries numéricas` | pass |
| C6 | `run web / ✓ VIZ-06 KPI sugere o primeiro valor numérico sem variação` | pass |
| C7 | `run web / ✓ VIZ-07 mapa sugere latitude, longitude e rótulo pelo nome da coluna` | pass |
| C8 | `run web / ✓ VIZ-08 lista sugere texto principal e dois valores numéricos` | pass |
| C9 | `run web / ✓ VIZ-09 mudar o mapeamento atualiza a prévia sem executar de novo` | pass |
| C10 | `run web / ✓ VIZ-10 sem resultado os campos ficam desabilitados com Execute a consulta para escolher as colunas` | pass |
| C11 | `run web / ✓ VIZ-11 validateMapping aponta o primeiro campo obrigatório vazio` | pass |
| C11 | `run web / ✓ VIZ-11 Aplicar com campo obrigatório vazio mostra Escolha` | pass |
| C12 | `run web / ✓ VIZ-12 coluna mapeada ausente dá A visualização não combina com o resultado` | pass |
| C12 | `run web / ✓ VIZ-12 card mostra A visualização não combina com o resultado` | pass |
| C13 | `run web / ✓ VIZ-13 coluna numérica sem números dá A coluna não tem números` | pass |
| C13 | `run web / ✓ VIZ-13 card mostra A coluna não tem números` | pass |
| C14 | `run web / ✓ VIZ-14 valor nulo ou texto em papel numérico vira ponto ausente` | pass |
| C15 | `run contracts / ✓ VIZ-15 contrato aceita o mapeamento de cada visualização e recusa o que não combina` | pass |
| C15 | `run api / ✓ VIZ-15 salvar grava a visualização e o mapeamento de cada widget` | pass |
| C15 | `run web / ✓ VIZ-15 Salvar envia a visualização e o mapeamento de cada widget` | pass |
| C15 | `run web / ✓ VIZ-15 Aplicar e Salvar gravam a visualização e o mapeamento` | pass |
| C16 | `run web / ✓ VIZ-16 widget novo nasce como Tabela` | pass |
| C16 | `run web / ✓ VIZ-16 editor de widget novo mostra Tabela` | pass |
| C17 | `run web / ✓ VIZ-17 números no formato 1.234,56 e datas em dd/MM/aaaa` | pass |
| C17 | `run web / ✓ VIZ-17 eixos e dica formatam números e datas` | pass |
| C18 | `run web / ✓ VIZ-18 gráficos usam os estados de carregando, sem dados e erro` | pass |
| C19 | `run web / ✓ CHART-01 um ponto por linha na ordem retornada` | pass |
| C19 | `run web / ✓ CHART-01 área, barras e linha desenham um ponto por linha` | pass |
| C20 | `run web / ✓ CHART-02 legenda mostra o nome de cada série quando há mais de uma` | pass |
| C21 | `run web / ✓ CHART-03 dica mostra o valor do eixo X e de cada série` | pass |
| C22 | `run web / ✓ CHART-04 Horizontal desenha as barras na horizontal` | pass |
| C23 | `run web / ✓ CHART-05 Empilhado empilha as séries` | pass |
| C24 | `run web / ✓ CHART-06 tickInterval pula rótulos que não cabem na largura` | pass |
| C24 | `run web / ✓ CHART-06 eixo X mostra só parte dos rótulos quando não cabem` | pass |
| C25 | `run web / ✓ CHART-07 primeira série usa o token chart-1` | pass |
| C26 | `run web / ✓ CHART-08 redimensionar o card redesenha o gráfico no novo tamanho` | pass |
| C27 | `run web / ✓ CHART-09 pizza desenha uma fatia por linha` | pass |
| C28 | `run web / ✓ CHART-10 Donut desenha o centro vazado` | pass |
| C29 | `run web / ✓ CHART-11 radar desenha um eixo por linha e um polígono por série` | pass |
| C30 | `run web / ✓ CHART-12 radial desenha uma barra por linha` | pass |
| C31 | `run web / ✓ CHART-13 mais de 12 categorias corta em 12 e informa o total` | pass |
| C31 | `run web / ✓ CHART-13 pizza com 30 linhas mostra Mostrando 12 de 30 categorias` | pass |
| C32 | `run web / ✓ CHART-14 dica da pizza mostra categoria e valor` | pass |
| C32 | `run web / ✓ CHART-14 dica do radar e do radial mostra categoria e valor` | pass |
| C33 | `run web / ✓ CHART-15 valor negativo na pizza vira ausente` | pass |
| C34 | `run web / ✓ KPI-01 KPI usa o valor da primeira linha` | pass |
| C34 | `run web / ✓ KPI-01 card de KPI mostra o título e o valor` | pass |
| C35 | `run web / ✓ KPI-02 variação positiva mostra chip com seta para cima e o valor em %` | pass |
| C36 | `run web / ✓ KPI-03 variação negativa mostra chip com seta para baixo` | pass |
| C37 | `run web / ✓ KPI-04 sem variação ou variação nula não mostra chip` | pass |
| C38 | `run web / ✓ KPI-05 valor não numérico aparece como texto` | pass |
| C39 | `run web / ✓ LIST-01 lista mantém a ordem e até dois valores` | pass |
| C39 | `run web / ✓ LIST-01 lista mostra texto principal e até dois valores na ordem` | pass |
| C40 | `run web / ✓ LIST-02 texto secundário aparece abaixo do principal em tom apagado` | pass |
| C41 | `run web / ✓ LIST-03 linhas rolam dentro do card com o título fixo` | pass |
| C42 | `run web / ✓ LIST-04 texto longo é cortado com reticências` | pass |
| C43 | `run web / ✓ MAP-01 um ponto por linha com latitude e longitude` | pass |
| C43 | `run web / ✓ MAP-01 mapa desenha um marcador por linha` | pass |
| C44 | `run web / ✓ MAP-02 rótulo de cada marcador aparece em um chip` | pass |
| C45 | `run web / ✓ MAP-03 coordenadas inválidas são descartadas e contadas` | pass |
| C45 | `run web / ✓ MAP-03 linha com latitude 200 é ignorada e avisada` | pass |
| C46 | `run web / ✓ MAP-04 nenhuma coordenada válida dá Nenhuma linha com coordenadas válidas` | pass |
| C46 | `run web / ✓ MAP-04 mapa sem coordenadas válidas mostra Nenhuma linha com coordenadas válidas` | pass |
| C47 | `run web / ✓ MAP-05 enquadramento contém todos os marcadores` | pass |
| C48 | `run web / ✓ MAP-06 passar o cursor no marcador mostra rótulo e coordenadas` | pass |
| C49 | `run api / ✓ MAP-07 endereço dos tiles vem de NINBI_MAP_TILE_URL com OpenStreetMap por padrão` | pass |
| C49 | `run web / ✓ MAP-07 mapa de tiles com zoom e arrasto no estilo do tema` | pass |
| C50 | `run web / ✓ LOOK-01 dashboard com área, listas, KPI e mapa usa os cards do tema e o gradiente da logo` | pass |
| C51 | `run web / ✓ LOOK-02 barras, linha, pizza, radar e radial usam a grade, as cores e a dica do tema` | pass |
| C52 | `run web / ✓ LOOK-03 widgets não escrevem cor literal e o tema claro define as cores dos gráficos` | pass |
| C53 | `run web / ✓ LOOK-04 menu do card de gráfico em edição tem Editar widget e Remover widget` | pass |
| C54 | `run web / ✓ CHART-16 uma linha só desenha um ponto visível` | pass |
| C55 | `run web / ✓ VIZ-19 trocar para visualização incompatível usa a sugestão da nova` | pass |
| C55 | `run web / ✓ VIZ-19 trocar Barras por Pizza substitui o mapeamento pela sugestão` | pass |
| C56 | `run web / ✓ VIZ-20 Cypher novo sem as colunas mapeadas mostra a mensagem no card` | pass |
| C57 | `run web / ✓ MAP-08 marcadores na mesma coordenada levam os dois rótulos` | pass |
| C57 | `run web / ✓ MAP-08 dois marcadores na mesma coordenada mostram os dois rótulos na dica` | pass |
| C58 | `run web / ✓ MAP-09 falha dos tiles mostra Não foi possível carregar o mapa de fundo` | pass |
| C59 | `run web / ✓ CHART-17 mais séries que cores repetem a paleta na mesma ordem` | pass |
| C60 | `run web / ✓ CHART-18 pizza só com zeros não tem dados` | pass |
| C60 | `run web / ✓ CHART-18 pizza só com zeros mostra A consulta não retornou dados` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run contracts` - exit 0

```
 ✓ src/schemas.spec.ts > newUserSchema > USR-14 e-mail com 121 caracteres é recusado no campo e 120 passa 0ms
 ✓ src/schemas.spec.ts > newUserSchema > USR-04 nome vazio, e-mail mal formado, papel inválido e senha curta 1ms
 ✓ src/schemas.spec.ts > newUserSchema > USR-04 dados válidos passam, com os três papéis 0ms
 ✓ src/schemas.spec.ts > changePasswordSchema > PWD-03 nova senha com menos de 8 caracteres 0ms
 ✓ src/schemas.spec.ts > changePasswordSchema > PWD-01 senha atual vazia é recusada e dados válidos passam 0ms
 ✓ src/schemas.spec.ts > initialPasswordSchema > USR-06 confirmação diferente e senha curta na senha definitiva 1ms
 ✓ src/schemas.spec.ts > resetPasswordSchema e changeRoleSchema > USR-07 senha provisória curta é recusada e válida passa 0ms
 ✓ src/schemas.spec.ts > resetPasswordSchema e changeRoleSchema > ROLE-05 papel inválido é recusado e papel válido passa 0ms

 Test Files  6 passed (6)
      Tests  67 passed (67)
   Start at  17:03:57
   Duration  540ms (import 52%, transform 37%, tests 7%, worker 3%)

$ vitest run --reporter=verbose
```

`Run web` - exit 0

```
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/dashboards/DashboardEditMode.test.tsx > DashboardPage em edição > VIZ-15 Salvar envia a visualização e o mapeamento de cada widget
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/dashboards/DashboardEditMode.test.tsx > DashboardPage em edição > VIZ-15 Salvar envia a visualização e o mapeamento de cada widget
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.
```

`Run api` - exit 0

```
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 chave que não tem 32 bytes não inicia o backend 2ms
 ✓ test/dashboards/widget-config.spec.ts > visualização e mapeamento do widget > VIZ-15 config inválido para a visualização responde 400 e mantém a versão 2815ms
 ✓ test/health/health.spec.ts > health > FND-04 health responde 503 com postgres down 2052ms
 ✓ test/auth/permission.guard.spec.ts > PermissionGuard > ROLE-01 cada papel recebe 200 ou 403 conforme a matriz 3617ms
 ✓ test/web/web.spec.ts > servir o web pela API > FND-01 serve o index.html do web em GET / 2840ms

 Test Files  47 passed (47)
      Tests  260 passed (260)
   Start at  17:04:50
   Duration  120.53s (tests 79%, import 21%)

$ vitest run --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```
