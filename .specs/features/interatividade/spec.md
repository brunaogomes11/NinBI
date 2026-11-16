# Interatividade Specification

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Problem Statement

Um dashboard parado responde a uma pergunta só. O usuário decidiu que o MVP tem filtros globais ligados a parâmetros das consultas, auto-refresh com intervalo configurável, cross-filtering (clicar em um elemento filtra os outros widgets) e exportação de CSV e PNG por widget. Esta feature entrega essas quatro capacidades sobre os dashboards e widgets já existentes.

## Goals

- [ ] Um filtro global muda o valor de um `$parametro`, e só os widgets que usam esse parâmetro executam de novo, em todas as abas.
- [ ] O dashboard se atualiza sozinho no intervalo escolhido, sem empilhar execuções.
- [ ] Clicar em um elemento de um widget filtra os demais.
- [ ] Quem pode ver um dashboard exporta os dados de um widget em CSV e a imagem dele em PNG.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Drill-down (clicar e abrir detalhe ou outro dashboard) | Não foi pedido |
| Filtro por aba ou por widget | Os filtros são globais e valem para todas as abas (AD-011) |
| Tempo real por streaming ou websocket | O usuário escolheu auto-refresh por intervalo |
| Exportar o dashboard inteiro em PDF | Não foi pedido |
| Envio agendado por e-mail, alertas | Não foram pedidos |
| Exportar em Excel ou JSON | Não foi pedido; só CSV e PNG |
| Cache de resultados | Não foi pedido |
| Guardar os valores dos filtros entre sessões ou na URL | Não foi pedido; os filtros abrem no valor padrão |
| Link público com filtros | Sem link público (AD-007) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Interatividade do MVP | Filtros globais ligados a parâmetros, auto-refresh configurável, cross-filtering, CSV e PNG por widget | Decisão do usuário | y |
| Alcance dos filtros | Valem para todas as abas do dashboard | AD-011 | y |
| Quem usa | Quem pode ver o dashboard muda valores de filtro e intervalo de atualização e exporta; quem pode editar cria e edita filtros, "Ao clicar" e o intervalo padrão | AD-014: a permissão é por dashboard | y |
| Filtro vazio | Envia `null` no parâmetro | As consultas tratam com `$p IS NULL OR ...`; é o mesmo valor de um parâmetro sem filtro em `dashboards-consultas` | y - delegado |
| Intervalo de datas | Um filtro de intervalo alimenta dois parâmetros: `<parametro>_inicio` e `<parametro>_fim` | Cypher não tem tipo de intervalo | y - delegado |
| Valores entre sessões | Os filtros abrem sempre no valor padrão definido pelo Editor | O mais simples; guardar por usuário não foi pedido | y - delegado |
| Auto-refresh | Por dashboard; opções "Desligada", "10 s", "30 s", "1 min", "5 min", "15 min", "1 h"; o Editor define o padrão e qualquer usuário muda para a própria sessão | "Intervalo configurável"; por dashboard é mais simples que por widget; 10 s é o piso para não sobrecarregar o Neo4j | y - delegado |
| Auto-refresh com a aba do navegador oculta | Pausado | Não gasta consulta que ninguém vê | y - delegado |
| CSV | UTF-8 com BOM, separador `;`, vírgula decimal, datas em `dd/MM/aaaa`, todas as linhas do resultado atual | É o formato que o Excel em português abre sem ajuste | y - delegado |
| PNG | Imagem do card como está na tela (título e visualização, tema atual), no dobro da resolução | "PNG por widget" | y - delegado |
| Opções de filtro de seleção | Até 1.000 valores | Limite concreto; listas maiores pedem filtro de texto | y - delegado |
| Lugar da barra de filtros | O espaço dos chips da barra superior (AD-020) | A captura desenha chips nesse espaço | y - delegado |
| A IA conhece os filtros | O pedido à IA (`ia-cypher`) passa a incluir rótulo, parâmetro e tipo de cada filtro, sem valores | Sem isso a IA não usa os `$parametros`; não é dado do banco | y - delegado |
| Tipos de filtro | Seleção única, seleção múltipla, texto, número, data e intervalo de datas; opções por lista fixa ou consulta Cypher | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |
| Clique no cross-filtering | O Editor liga o widget a um filtro global; o clique muda o filtro e os widgets que usam o parâmetro executam de novo | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Filtros globais ⭐ MVP

**User Story**: As a Editor, I want criar filtros ligados a parâmetros das consultas so that quem vê o dashboard mude período, categoria ou busca sem mexer no Cypher.

**Why P1**: Decisão do usuário; cross-filtering depende dos filtros.

**Acceptance Criteria**:

1. WHEN quem pode editar o dashboard usa "Novo filtro" em modo de edição THEN o sistema SHALL mostrar o formulário com "Rótulo", "Parâmetro", "Tipo" e "Valor padrão" [FLT-01]
2. The system SHALL oferecer em "Tipo" as opções "Seleção única", "Seleção múltipla", "Texto", "Número", "Data" e "Intervalo de datas" [FLT-02]
3. IF "Parâmetro" não começa com letra, tem caractere fora de letras, dígitos e `_`, passa de 40 caracteres ou repete o de outro filtro do dashboard THEN o sistema SHALL recusar com a mensagem no campo [FLT-03]
4. IF "Rótulo" está vazio ou passa de 40 caracteres THEN o sistema SHALL recusar com a mensagem no campo [FLT-04]
5. WHEN o tipo é de seleção THEN o sistema SHALL pedir a origem das opções: "Lista fixa" ou "Consulta Cypher" [FLT-05]
6. WHEN a origem é "Consulta Cypher" THEN o sistema SHALL usar como opções os valores da primeira coluna do resultado, sob a mesma validação somente leitura e os mesmos limites de `dashboards-consultas` [FLT-06]
7. WHEN o dashboard é aberto THEN o sistema SHALL mostrar a barra de filtros com cada filtro no valor padrão [FLT-07]
8. The system SHALL mostrar a mesma barra de filtros, com os mesmos valores, em todas as abas [FLT-08]
9. WHEN o usuário muda o valor de um filtro THEN o sistema SHALL executar de novo, na aba ativa, os widgets cujo Cypher usa o parâmetro do filtro, e só eles [FLT-09]
10. WHEN o usuário abre outra aba depois de mudar um filtro THEN o sistema SHALL executar os widgets dessa aba com os valores atuais dos filtros [FLT-10]
11. WHEN um filtro está vazio THEN o sistema SHALL enviar `null` no parâmetro dele [FLT-11]
12. WHEN um filtro "Seleção múltipla" tem valores THEN o sistema SHALL enviar no parâmetro a lista dos valores escolhidos [FLT-12]
13. WHEN um filtro "Intervalo de datas" tem valores THEN o sistema SHALL enviar a data inicial em `<parametro>_inicio` e a final em `<parametro>_fim`, como datas do Cypher [FLT-13]
14. WHEN o usuário digita em um filtro "Texto" ou "Número" THEN o sistema SHALL aplicar o valor 500 ms depois da última tecla [FLT-14]
15. WHEN o usuário usa "Limpar filtros" THEN o sistema SHALL devolver todos os filtros ao valor padrão [FLT-15]
16. WHEN quem pode editar o dashboard usa "Remover filtro" em modo de edição THEN o sistema SHALL pedir confirmação com "Remover o filtro <rótulo>? N widgets usam o parâmetro." [FLT-16]
17. WHEN o dashboard é salvo THEN o sistema SHALL gravar os filtros com o dashboard [FLT-17]
18. The system SHALL mostrar "Novo filtro", "Editar filtro" e "Remover filtro" só em modo de edição, a quem pode editar o dashboard [FLT-18]
19. WHEN o usuário usa "Executar" no editor de um widget THEN o sistema SHALL executar o Cypher com os valores atuais dos filtros [FLT-19]
20. WHEN o sistema monta um pedido ao LLM THEN o sistema SHALL incluir o rótulo, o parâmetro e o tipo de cada filtro do dashboard, sem os valores [FLT-20]
21. WHILE os filtros não cabem em uma linha o sistema SHALL quebrar a barra de filtros em mais linhas [FLT-21]
22. WHEN o dashboard não tem filtros THEN o sistema SHALL não mostrar a barra de filtros no modo de visualização [FLT-22]

**Independent Test**: Criar o filtro "Categoria" (`categoria`, seleção única por consulta), usar `$categoria` em dois de três widgets, mudar o valor e ver só os dois executarem de novo, nas duas abas.

---

### P1: Auto-refresh ⭐ MVP

**User Story**: As a usuário logado, I want que o dashboard se atualize sozinho em um intervalo so that eu acompanhe os dados sem recarregar.

**Why P1**: Decisão do usuário.

**Acceptance Criteria**:

1. WHEN o usuário abre o controle "Atualização automática" THEN o sistema SHALL oferecer "Desligada", "10 s", "30 s", "1 min", "5 min", "15 min" e "1 h" [RFR-01]
2. WHEN o intervalo escolhido passa THEN o sistema SHALL executar de novo os widgets da aba ativa [RFR-02]
3. WHEN quem pode editar o dashboard escolhe um intervalo em modo de edição e salva THEN o sistema SHALL usá-lo como intervalo inicial para todo usuário que abrir o dashboard [RFR-03]
4. WHEN um usuário escolhe um intervalo em modo de visualização THEN o sistema SHALL usá-lo só na sessão dele, sem gravar no dashboard [RFR-04]
5. WHILE a aba do navegador está oculta o sistema SHALL não executar atualizações automáticas [RFR-05]
6. WHEN a aba do navegador volta a ficar visível com o intervalo já vencido THEN o sistema SHALL executar uma atualização [RFR-06]
7. WHILE o dashboard está em modo de edição o sistema SHALL não executar atualizações automáticas [RFR-07]
8. IF a execução anterior de um widget ainda está em andamento quando o intervalo vence THEN o sistema SHALL pular essa atualização para esse widget [RFR-08]
9. WHILE uma atualização automática está em andamento o sistema SHALL manter os dados anteriores do widget na tela, sem esqueleto [RFR-09]
10. IF uma atualização automática de um widget falha THEN o sistema SHALL manter os dados anteriores e mostrar no card "Não foi possível atualizar às HH:mm" [RFR-10]
11. WHEN uma atualização termina THEN o sistema SHALL mostrar no dashboard "Atualizado às HH:mm:ss" [RFR-11]

**Independent Test**: Escolher "10 s", inserir um nó no Neo4j de exemplo por fora e ver o widget mudar em até 10 s; ocultar a aba do navegador e confirmar no log que as execuções param.

---

### P1: Cross-filtering ⭐ MVP

**User Story**: As a usuário logado, I want clicar em uma barra, fatia, linha ou marcador e ver os outros widgets filtrados por aquele valor so that eu explore os dados sem digitar.

**Why P1**: Decisão do usuário.

**Acceptance Criteria**:

1. WHEN quem pode editar o dashboard abre o editor de um widget que não é KPI THEN o sistema SHALL oferecer "Ao clicar", com a escolha de um filtro dos tipos "Seleção única", "Texto", "Número" ou "Data" e de uma coluna do resultado [XFL-01]
2. WHEN um usuário, em modo de visualização, clica em uma barra, ponto, fatia, eixo de radar, barra radial, linha de lista ou de tabela, ou marcador de um widget com "Ao clicar" configurado THEN o sistema SHALL definir o filtro escolhido com o valor da coluna configurada na linha clicada [XFL-02]
3. WHEN o filtro muda por clique THEN o sistema SHALL mostrar o novo valor na barra de filtros e executar de novo os widgets que usam o parâmetro, como em uma mudança feita na barra [XFL-03]
4. WHILE um elemento está selecionado por clique o sistema SHALL destacá-lo e esmaecer os demais elementos do mesmo widget [XFL-04]
5. WHEN o usuário clica de novo no elemento selecionado THEN o sistema SHALL esvaziar o filtro e remover o destaque [XFL-05]
6. WHEN o usuário muda ou limpa o filtro pela barra de filtros THEN o sistema SHALL remover o destaque do elemento selecionado [XFL-06]
7. WHEN o usuário clica em um widget sem "Ao clicar" configurado THEN o sistema SHALL não mudar nenhum filtro [XFL-07]
8. WHILE o dashboard está em modo de edição o sistema SHALL não mudar filtros por clique em elementos [XFL-08]
9. WHEN o filtro ligado a um "Ao clicar" é removido THEN o sistema SHALL remover a configuração "Ao clicar" dos widgets que o usavam [XFL-09]

**Independent Test**: Ligar um gráfico de barras por categoria ao filtro "Categoria"; clicar em uma barra e ver a lista e o KPI, que usam `$categoria`, mudarem; clicar de novo e ver tudo voltar.

---

### P1: Exportar CSV e PNG ⭐ MVP

**User Story**: As a usuário logado, I want baixar os dados de um widget em CSV e a imagem dele em PNG so that eu use o resultado em planilhas e apresentações.

**Why P1**: Decisão do usuário.

**Acceptance Criteria**:

1. WHEN um usuário que pode ver o dashboard abre o menu de um widget em modo de visualização THEN o sistema SHALL mostrar "Exportar CSV" e "Exportar PNG" [EXP-01]
2. WHEN o usuário usa "Exportar CSV" THEN o sistema SHALL baixar um arquivo com uma linha de cabeçalho e todas as linhas do resultado atual do widget, com as colunas na ordem do resultado [EXP-02]
3. The system SHALL gerar o CSV em UTF-8 com BOM, com `;` como separador, vírgula decimal nos números e datas em `dd/MM/aaaa` [EXP-03]
4. WHEN um valor de texto contém `;`, aspas ou quebra de linha THEN o sistema SHALL colocá-lo entre aspas e dobrar as aspas internas [EXP-04]
5. WHEN um valor de texto começa com `=`, `+`, `-` ou `@` THEN o sistema SHALL prefixá-lo com `'` no CSV [EXP-05]
6. WHEN o usuário usa "Exportar PNG" THEN o sistema SHALL baixar uma imagem do card como ele está na tela, com título e visualização, no tema atual e no dobro da resolução da tela [EXP-06]
7. The system SHALL nomear os arquivos como `<título do widget>-<aaaa-mm-dd>` com a extensão `.csv` ou `.png`, trocando por `-` os caracteres que não são letras, dígitos ou `-` [EXP-07]
8. WHILE o widget está carregando, sem dados ou com erro o sistema SHALL manter "Exportar CSV" e "Exportar PNG" desabilitados [EXP-08]

**Independent Test**: Exportar o CSV de uma tabela de 120 linhas com a página 1 visível: o arquivo tem 121 linhas e abre no Excel em colunas; exportar o PNG de um gráfico e comparar com a tela.

---

## Edge Cases

- IF a consulta de opções de um filtro falha THEN o sistema SHALL mostrar no filtro "Não foi possível carregar as opções" com "Tentar novamente", sem afetar os demais filtros nem os widgets [FLT-23]
- IF a consulta de opções retorna mais de 1.000 valores THEN o sistema SHALL usar os primeiros 1.000 [FLT-24]
- IF a data inicial de um intervalo é maior que a final THEN o sistema SHALL não aplicar o filtro e mostrar "A data inicial é maior que a final" [FLT-25]
- IF o texto de um filtro "Número" não é um número THEN o sistema SHALL não aplicar o filtro e mostrar "Digite um número" [FLT-26]
- WHEN um filtro muda enquanto os widgets ainda executam com o valor anterior THEN o sistema SHALL mostrar só o resultado do valor mais recente [FLT-27]
- IF a execução de um widget salvo recebe um parâmetro que não pertence a um filtro do dashboard THEN o sistema SHALL ignorar esse parâmetro [FLT-28]
- WHEN um usuário que só pode ver o dashboard muda o valor de um filtro THEN o sistema SHALL aplicar o valor como faz para quem pode editar [FLT-29]
- IF um usuário que só pode ver o dashboard chama a criação, edição ou remoção de filtro THEN o sistema SHALL responder 403 [FLT-30]
- WHEN duas pessoas veem o mesmo dashboard compartilhado THEN o sistema SHALL manter os valores de filtro, a seleção por clique e o intervalo de atualização de cada uma só na sessão dela [FLT-31]
- WHEN o valor clicado em um cross-filter não está entre as opções de um filtro "Seleção única" THEN o sistema SHALL aplicar o valor mesmo assim e mostrá-lo no filtro [XFL-10]
- WHEN o usuário muda um filtro durante o auto-refresh THEN o sistema SHALL reiniciar a contagem do intervalo [RFR-12]

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | FLT-03, FLT-04, FLT-24 a FLT-26, FLT-28, EXP-04, EXP-05, EXP-07 |
| Failure / partial-failure states | FLT-23, RFR-10, EXP-08 |
| Idempotency / retry / duplicate handling | RFR-08 (não empilha execuções), FLT-14 (uma aplicação por digitação), FLT-27 |
| Auth boundaries & rate limits | FLT-18, FLT-28 a FLT-30, EXP-01. Rate limit: o piso de 10 s do auto-refresh (RFR-01) e RFR-08 limitam a carga; fora isso N/A because são os mesmos usuários logados e as mesmas rotas de `dashboards-consultas` |
| Concurrency / ordering | FLT-27, FLT-31, RFR-08, RFR-12 |
| Data lifecycle / expiry | FLT-17 (filtros gravados e apagados com o dashboard), RFR-04 (escolha só da sessão), XFL-09. Valores de filtro não são guardados |
| Observability | RFR-11; as execuções já são registradas por QRY-14 de `dashboards-consultas` |
| External-dependency failure | FLT-23, RFR-10 (Neo4j) |
| State-transition integrity | RFR-05 a RFR-07 (pausado ↔ ativo), XFL-04 a XFL-06 (selecionado ↔ limpo), XFL-08 |

---

## Requirement Traceability

<!-- TRACE:START -->

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FLT-01 | P1: Filtros globais | - | Pending |
| FLT-02 | P1: Filtros globais | - | Pending |
| FLT-03 | P1: Filtros globais | - | Pending |
| FLT-04 | P1: Filtros globais | - | Pending |
| FLT-05 | P1: Filtros globais | - | Pending |
| FLT-06 | P1: Filtros globais | - | Pending |
| FLT-07 | P1: Filtros globais | - | Pending |
| FLT-08 | P1: Filtros globais | - | Pending |
| FLT-09 | P1: Filtros globais | - | Pending |
| FLT-10 | P1: Filtros globais | - | Pending |
| FLT-11 | P1: Filtros globais | - | Pending |
| FLT-12 | P1: Filtros globais | - | Pending |
| FLT-13 | P1: Filtros globais | - | Pending |
| FLT-14 | P1: Filtros globais | - | Pending |
| FLT-15 | P1: Filtros globais | - | Pending |
| FLT-16 | P1: Filtros globais | - | Pending |
| FLT-17 | P1: Filtros globais | - | Pending |
| FLT-18 | P1: Filtros globais | - | Pending |
| FLT-19 | P1: Filtros globais | - | Pending |
| FLT-20 | P1: Filtros globais | - | Pending |
| FLT-21 | P1: Filtros globais | - | Pending |
| FLT-22 | P1: Filtros globais | - | Pending |
| RFR-01 | P1: Auto-refresh | - | Pending |
| RFR-02 | P1: Auto-refresh | - | Pending |
| RFR-03 | P1: Auto-refresh | - | Pending |
| RFR-04 | P1: Auto-refresh | - | Pending |
| RFR-05 | P1: Auto-refresh | - | Pending |
| RFR-06 | P1: Auto-refresh | - | Pending |
| RFR-07 | P1: Auto-refresh | - | Pending |
| RFR-08 | P1: Auto-refresh | - | Pending |
| RFR-09 | P1: Auto-refresh | - | Pending |
| RFR-10 | P1: Auto-refresh | - | Pending |
| RFR-11 | P1: Auto-refresh | - | Pending |
| XFL-01 | P1: Cross-filtering | - | Pending |
| XFL-02 | P1: Cross-filtering | - | Pending |
| XFL-03 | P1: Cross-filtering | - | Pending |
| XFL-04 | P1: Cross-filtering | - | Pending |
| XFL-05 | P1: Cross-filtering | - | Pending |
| XFL-06 | P1: Cross-filtering | - | Pending |
| XFL-07 | P1: Cross-filtering | - | Pending |
| XFL-08 | P1: Cross-filtering | - | Pending |
| XFL-09 | P1: Cross-filtering | - | Pending |
| EXP-01 | P1: Exportar CSV e PNG | - | Pending |
| EXP-02 | P1: Exportar CSV e PNG | - | Pending |
| EXP-03 | P1: Exportar CSV e PNG | - | Pending |
| EXP-04 | P1: Exportar CSV e PNG | - | Pending |
| EXP-05 | P1: Exportar CSV e PNG | - | Pending |
| EXP-06 | P1: Exportar CSV e PNG | - | Pending |
| EXP-07 | P1: Exportar CSV e PNG | - | Pending |
| EXP-08 | P1: Exportar CSV e PNG | - | Pending |
| FLT-23 | Edge Cases | - | Pending |
| FLT-24 | Edge Cases | - | Pending |
| FLT-25 | Edge Cases | - | Pending |
| FLT-26 | Edge Cases | - | Pending |
| FLT-27 | Edge Cases | - | Pending |
| FLT-28 | Edge Cases | - | Pending |
| FLT-29 | Edge Cases | - | Pending |
| FLT-30 | Edge Cases | - | Pending |
| FLT-31 | Edge Cases | - | Pending |
| XFL-10 | Edge Cases | - | Pending |
| RFR-12 | Edge Cases | - | Pending |

<!-- TRACE:END -->

**Coverage:** 61 total, 0 mapped to tasks, 61 unmapped ⚠️

---

## Sources

- Decisão do usuário - interatividade no MVP: filtros globais ligados a parâmetros das queries, auto-refresh com intervalo configurável, cross-filtering (clicar num elemento filtra os outros widgets), exportar CSV e PNG por widget.
- `.specs/STATE.md` - AD-007 (só logados), AD-011 (filtros globais valem para todas as abas), AD-014 (permissão por dashboard).
- Esta feature não tem captura própria. A captura de `fundacao-auth` desenha chips na barra superior; os filtros ocupam esse espaço (AD-020), no estilo desses chips.

---

## Success Criteria

- [ ] Mudar um filtro nunca executa um widget que não usa o parâmetro.
- [ ] Com auto-refresh em "10 s" por uma hora, nenhum widget tem duas execuções simultâneas.
- [ ] O CSV exportado abre no Excel em português com colunas, acentos e números corretos.
