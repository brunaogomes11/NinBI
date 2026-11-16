# IA para Cypher Specification

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Problem Statement

Escrever Cypher à mão exclui quem não conhece a linguagem, e o usuário decidiu que as consultas nascem da IA. Esta feature liga o NinBI a um provedor de LLM configurável e entrega o prompt rápido de cada widget: o usuário descreve o que quer ver, a IA escreve o Cypher e escolhe a visualização, o sistema valida, executa e corrige sozinho quando falha. O único dado do banco que sai para o provedor é o schema enriquecido.

## Goals

- [ ] Um Admin configura provedor, modelo e chave do LLM, e a chave nunca volta ao navegador.
- [ ] Um Editor descreve um widget em texto e recebe o widget pronto: Cypher somente leitura, executado, com visualização e título.
- [ ] Cypher que falha é corrigido pela IA até o limite de tentativas; esgotado o limite, o erro e o Cypher ficam no editor para ajuste manual.
- [ ] Nenhuma linha de resultado de consulta é enviada ao provedor.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Chat lateral e geração do dashboard inteiro | Feature `ia-dashboard` |
| IA explicando ou resumindo os dados de um widget | Exigiria enviar dados ao provedor, o que AD-005 proíbe |
| Construtor visual de queries | Excluído pelo usuário (AD-004) |
| Histórico de prompts por widget | Não foi pedido; o histórico de conversa é do chat de `ia-dashboard` |
| Resposta em streaming, token a token | Não foi pedida |
| Controle de custo ou cota de uso da IA por usuário | Não foi pedido |
| Geração de Cypher de escrita | As consultas são somente leitura |
| Correção por IA de Cypher escrito à mão | Não foi pedida; a autocorreção vale para o Cypher que a IA gerou |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Criação de consultas | Texto para Cypher pela IA; o Cypher fica visível e editável | AD-004 | y |
| Contexto enviado | Só o schema enriquecido: todos os tipos e um exemplo por propriedade, sem tamanho máximo | AD-005 | y |
| Provedor | Provedor e chave configuráveis, via LangChain | AD-006 | y |
| Cypher que falha | Autocorreção pela IA com limite de tentativas; depois, erro e Cypher para edição manual | Decisão do usuário | y |
| Onde a IA aparece nesta feature | Prompt rápido em cada widget | Decisão do usuário; o chat lateral é de `ia-dashboard` | y |
| Chave do LLM | Criptografada no backend; nunca vai ao navegador; as chamadas ao provedor saem do backend | Default do orquestrador | y - delegado |
| O que a IA devolve | Cypher, visualização, mapeamento e título do widget | O usuário quer a IA gerando dashboards inteiros; um widget sem visualização ficaria pela metade | y - delegado |
| Contexto do widget | Título, Cypher, visualização e mapeamento atuais do widget vão junto com o pedido | Permite "troque para barras" ou "some por mês"; nada disso é dado do banco | y - delegado |
| Onde o resultado vai | Para o rascunho do dashboard em modo de edição; nada é gravado antes de "Salvar" | Recomendação de Q1 de `dashboards-consultas` | y - delegado |
| Resultado vazio | Não conta como falha | Uma consulta correta pode não ter linhas | y - delegado |
| Tempo limite do provedor | 60 s por chamada | Um valor concreto; modelos locais são lentos | y - delegado |
| Tamanho do pedido | Até 4.000 caracteres | Limite de entrada concreto; não é o limite do schema, que não existe | y - delegado |
| Erros do provedor | Não há nova tentativa automática em erro do provedor (chave, limite de uso, tempo limite) | Tentar de novo não resolve e gasta a cota do usuário | y - delegado |
| Mapeamento inválido vindo da IA | O sistema usa a sugestão automática de `widgets-graficos` | A consulta já está certa; não vale gastar uma tentativa só pelo mapeamento | y - delegado |
| Quem usa a IA | Admin e Editor, nos dashboards que podem editar; o Visualizador nunca | AD-015; usuário: "Editor cria; Visualizador só recebe" | y |
| Onde fica a configuração | Na aba "LLM" da página "Configurações" | AD-016 | y |
| De quem é a configuração do LLM | Uma configuração por instalação, feita pelo Admin | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |
| Provedores do MVP | OpenAI, Anthropic, Google Gemini, Ollama e "Compatível com OpenAI" | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |
| Correções automáticas | 3 correções após a primeira geração, 4 chamadas no máximo | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |
| Erro do Neo4j enviado à IA | Mensagem inteira para erros de sintaxe e semântica; só o código para erros de execução | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Configurar o provedor de LLM ⭐ MVP

**User Story**: As a Admin, I want informar provedor, modelo e chave do LLM so that a IA do NinBI use a conta que eu escolhi.

**Why P1**: Sem provedor não há IA (AD-006).

**Acceptance Criteria**:

1. WHEN um Admin abre a aba "LLM" de "Configurações" THEN o sistema SHALL mostrar os campos "Provedor", "Modelo", "Chave de API" e "URL base" [LLM-01]
2. The system SHALL oferecer em "Provedor" as opções "OpenAI", "Anthropic", "Google Gemini", "Ollama" e "Compatível com OpenAI" [LLM-02]
3. WHEN o Admin salva a configuração THEN o sistema SHALL guardar a chave criptografada no PostgreSQL [LLM-03]
4. The system SHALL omitir a chave de toda resposta da API e mostrar no campo só os 4 últimos caracteres dela [LLM-04]
5. WHEN o Admin salva deixando "Chave de API" vazia em uma configuração que já tem chave THEN o sistema SHALL manter a chave guardada [LLM-05]
6. IF o provedor é "Ollama" ou "Compatível com OpenAI" e "URL base" está vazia THEN o sistema SHALL recusar com a mensagem no campo "URL base" [LLM-06]
7. IF o provedor é "OpenAI", "Anthropic" ou "Google Gemini" e não há chave informada nem guardada THEN o sistema SHALL recusar com a mensagem no campo "Chave de API" [LLM-07]
8. IF "Modelo" está vazio THEN o sistema SHALL recusar com a mensagem no campo "Modelo" [LLM-08]
9. WHEN o Admin usa "Testar" THEN o sistema SHALL enviar ao provedor um pedido mínimo, sem schema, e mostrar "Provedor respondendo" quando ele responde [LLM-09]
10. IF o teste do provedor falha THEN o sistema SHALL mostrar a mensagem de erro do provedor [LLM-10]
11. WHEN o Admin usa "Remover configuração" THEN o sistema SHALL pedir confirmação com "Remover a configuração do LLM? Os recursos de IA ficarão desligados." [LLM-11]
12. WHEN a remoção é confirmada THEN o sistema SHALL apagar provedor, modelo, URL base e chave [LLM-12]
13. IF um Editor ou Visualizador chama a leitura ou a gravação da configuração do LLM THEN o sistema SHALL responder 403 [LLM-13]
14. The system SHALL fazer todas as chamadas ao provedor a partir do backend [LLM-14]

**Independent Test**: Configurar um provedor, usar "Testar", recarregar a página e ver só os 4 últimos caracteres da chave; a resposta da API não contém a chave.

---

### P1: Gerar um widget a partir de um texto ⭐ MVP

**User Story**: As a Editor, I want descrever em português o que quero ver e receber o widget pronto so that eu não precise escrever Cypher.

**Why P1**: É a forma de criar consultas que o usuário escolheu (AD-004).

**Acceptance Criteria**:

1. WHEN um Admin ou Editor que pode editar o dashboard, em modo de edição, usa "Pedir à IA" em um widget e envia um texto THEN o sistema SHALL pedir ao LLM o Cypher, a visualização, o mapeamento e o título do widget [AIQ-01]
2. WHEN o usuário usa "Novo widget" THEN o sistema SHALL oferecer o campo "Descreva o que você quer ver" antes do editor de Cypher [AIQ-02]
3. WHEN o sistema monta o pedido ao LLM THEN o sistema SHALL incluir o schema da conexão do dashboard: labels, tipos de relacionamento, pares de origem e destino, e cada propriedade com todos os tipos e o valor de exemplo inteiro [AIQ-03]
4. WHEN uma propriedade está com "Enviar exemplo à IA" desligado THEN o sistema SHALL incluí-la no pedido com os tipos e sem o exemplo [AIQ-04]
5. WHEN o sistema monta o pedido ao LLM THEN o sistema SHALL incluir o texto do usuário e o título, o Cypher, a visualização e o mapeamento atuais do widget [AIQ-05]
6. The system SHALL não enviar ao provedor nenhuma linha de resultado de consulta nem outro dado do banco além dos exemplos do schema [AIQ-06]
7. WHEN o LLM devolve um Cypher THEN o sistema SHALL aplicar a ele a mesma validação somente leitura e os mesmos limites de `dashboards-consultas` [AIQ-07]
8. WHEN o Cypher gerado passa na validação THEN o sistema SHALL executá-lo na conexão do dashboard [AIQ-08]
9. WHEN a execução dá certo THEN o sistema SHALL atualizar o widget no rascunho com o Cypher, a visualização, o mapeamento e o título gerados, e mostrar o resultado [AIQ-09]
10. WHEN a execução dá certo sem linhas THEN o sistema SHALL tratar a geração como concluída e mostrar "A consulta não retornou dados" no widget [AIQ-10]
11. WHEN o usuário abre "Editar widget" depois de uma geração THEN o sistema SHALL mostrar no editor o Cypher gerado, editável [AIQ-11]
12. WHILE a geração está em andamento o sistema SHALL mostrar "Gerando... tentativa N de 4" e o botão "Cancelar", e manter "Pedir à IA" desabilitado nesse widget [AIQ-12]
13. WHEN o usuário usa "Cancelar" durante a geração THEN o sistema SHALL parar a geração e deixar o widget como estava [AIQ-13]
14. IF o texto está vazio THEN o sistema SHALL manter o envio desabilitado [AIQ-14]
15. IF o texto passa de 4.000 caracteres THEN o sistema SHALL recusar com "O pedido passa de 4.000 caracteres" [AIQ-15]
16. IF não há provedor de IA configurado THEN o sistema SHALL manter "Pedir à IA" desabilitado com "Nenhum provedor de IA configurado" [AIQ-16]
17. IF a conexão do dashboard não tem schema lido THEN o sistema SHALL recusar com "Leia o schema da conexão antes de usar a IA" [AIQ-17]
18. IF um Visualizador, ou um usuário que não pode editar o dashboard, chama a geração por IA THEN o sistema SHALL responder 403 [AIQ-18]
19. The system SHALL mostrar "Pedir à IA" só para Admin e Editor, em modo de edição [AIQ-19]
20. IF a visualização devolvida não é uma das 10 do NinBI THEN o sistema SHALL usar a visualização "Tabela" [AIQ-20]
21. IF o mapeamento devolvido cita uma coluna que o resultado não tem THEN o sistema SHALL trocar o mapeamento pela sugestão automática de `widgets-graficos` para a visualização devolvida [AIQ-30]

**Independent Test**: No dataset de exemplo, pedir "total de itens por categoria em barras": o widget aparece com barras, e "Editar widget" mostra o Cypher gerado. Inspecionar o pedido enviado ao provedor e confirmar que só há schema, texto e configuração do widget.

---

### P1: Autocorreção do Cypher ⭐ MVP

**User Story**: As a Editor, I want que a IA corrija sozinha o Cypher que falha, e que eu assuma quando ela não conseguir so that um erro de sintaxe não me devolva ao zero.

**Why P1**: Decisão do usuário.

**Acceptance Criteria**:

1. IF o Cypher gerado é recusado pela validação ou falha na execução THEN o sistema SHALL enviar ao LLM o Cypher e o erro, pedindo a correção [FIX-01]
2. The system SHALL fazer no máximo 3 correções por pedido, depois da primeira geração [FIX-02]
3. WHEN o erro é de sintaxe ou de semântica do Cypher, ou vem da validação somente leitura THEN o sistema SHALL enviar ao LLM a mensagem inteira do erro [FIX-03]
4. WHEN o erro é de execução no Neo4j THEN o sistema SHALL enviar ao LLM só o código do erro, sem a mensagem [FIX-04]
5. IF a resposta do LLM não contém um Cypher THEN o sistema SHALL contá-la como uma tentativa que falhou [FIX-05]
6. IF a última correção permitida também falha THEN o sistema SHALL abrir o editor do widget com o último Cypher gerado e a mensagem do erro, para edição manual [FIX-06]
7. IF a última correção permitida também falha THEN o sistema SHALL manter o widget no rascunho como estava antes do pedido, até o usuário usar "Aplicar" [FIX-07]
8. WHEN uma correção dá certo THEN o sistema SHALL seguir como em uma geração que deu certo de primeira [FIX-08]

**Independent Test**: Com um provedor de teste que devolve Cypher inválido duas vezes e válido na terceira, o widget é criado e o contador mostra 3 tentativas; com um que sempre falha, o editor abre com o erro após 4 chamadas.

---

### P1: Falhas do provedor ⭐ MVP

**User Story**: As a Editor, I want entender quando o problema é o provedor de IA so that eu saiba se devo tentar de novo ou avisar o Admin.

**Why P1**: O provedor é uma dependência externa que o NinBI não controla.

**Acceptance Criteria**:

1. IF o provedor recusa a chave THEN o sistema SHALL parar a geração e mostrar "O provedor de IA recusou a chave configurada" [AIQ-21]
2. IF o provedor recusa o pedido por limite de uso THEN o sistema SHALL parar a geração e mostrar "O provedor de IA recusou o pedido por limite de uso" [AIQ-22]
3. IF o provedor não responde em 60 s THEN o sistema SHALL parar a geração e mostrar "O provedor de IA não respondeu em 60 s" [AIQ-23]
4. IF o provedor recusa o pedido por exceder o contexto do modelo THEN o sistema SHALL parar a geração e mostrar "O schema desta conexão não cabe no modelo configurado. Desligue exemplos longos em Conexões ou use um modelo com contexto maior." [AIQ-24]
5. IF o provedor falha por outro motivo THEN o sistema SHALL parar a geração e mostrar "Erro do provedor de IA:" seguido da mensagem dele [AIQ-25]
6. IF a geração para por falha do provedor THEN o sistema SHALL deixar o widget como estava e manter o texto do pedido no campo [AIQ-26]
7. The system SHALL registrar em log cada chamada ao provedor com usuário, provedor, modelo, número da tentativa, duração e resultado, sem a chave e sem o conteúdo do schema [AIQ-27]

**Independent Test**: Com uma chave inválida, pedir um widget: a mensagem de chave recusada aparece, o texto continua no campo e o widget não muda.

---

## Edge Cases

- IF o usuário pede em texto uma alteração de dados, como "apague os clientes inativos" THEN o sistema SHALL recusar todo Cypher de escrita gerado e, esgotadas as correções, mostrar "Somente consultas de leitura são permitidas" [FIX-09]
- WHEN o usuário sai do modo de edição ou do dashboard com uma geração em andamento THEN o sistema SHALL parar a geração [AIQ-28]
- IF o widget é removido do rascunho durante a geração THEN o sistema SHALL descartar o resultado [AIQ-29]
- WHEN o Admin troca a configuração de IA durante uma geração THEN o sistema SHALL concluir essa geração com a configuração antiga [LLM-15]
- IF o LLM devolve mais de uma instrução Cypher THEN o sistema SHALL tratar como falha de validação, com a mensagem "Envie uma consulta por vez" [FIX-10]

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | LLM-06 a LLM-08, AIQ-14, AIQ-15, AIQ-20, AIQ-30, FIX-05, FIX-10. O schema não tem tamanho máximo (AD-005); o excesso aparece como AIQ-24 |
| Failure / partial-failure states | FIX-01, FIX-06, FIX-07, AIQ-21 a AIQ-26 |
| Idempotency / retry / duplicate handling | FIX-02 (limite de correções), AIQ-12 (um pedido por widget por vez). Sem nova tentativa automática em erro do provedor (Assumptions) |
| Auth boundaries & rate limits | LLM-13, AIQ-18, AIQ-19 (papel global e permissão no dashboard). Rate limit próprio N/A because os usuários são logados e de confiança em uma instalação self-hosted; o limite do provedor aparece como AIQ-22 |
| Concurrency / ordering | AIQ-12, AIQ-28, AIQ-29, LLM-15 |
| Data lifecycle / expiry | LLM-12 (apagar configuração). Pedidos e respostas da IA não são guardados nesta feature |
| Observability | AIQ-27, AIQ-12 (tentativa N de 4) |
| External-dependency failure | AIQ-21 a AIQ-26 (provedor), FIX-01 e FIX-04 (Neo4j) |
| State-transition integrity | AIQ-09, AIQ-13, FIX-07 (o widget só muda quando a geração dá certo ou o usuário aplica) |

---

## Requirement Traceability

<!-- TRACE:START -->

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LLM-01 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-02 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-03 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-04 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-05 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-06 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-07 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-08 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-09 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-10 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-11 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-12 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-13 | P1: Configurar o provedor de LLM | - | Pending |
| LLM-14 | P1: Configurar o provedor de LLM | - | Pending |
| AIQ-01 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-02 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-03 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-04 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-05 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-06 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-07 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-08 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-09 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-10 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-11 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-12 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-13 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-14 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-15 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-16 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-17 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-18 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-19 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-20 | P1: Gerar um widget a partir de um texto | - | Pending |
| AIQ-30 | P1: Gerar um widget a partir de um texto | - | Pending |
| FIX-01 | P1: Autocorreção do Cypher | - | Pending |
| FIX-02 | P1: Autocorreção do Cypher | - | Pending |
| FIX-03 | P1: Autocorreção do Cypher | - | Pending |
| FIX-04 | P1: Autocorreção do Cypher | - | Pending |
| FIX-05 | P1: Autocorreção do Cypher | - | Pending |
| FIX-06 | P1: Autocorreção do Cypher | - | Pending |
| FIX-07 | P1: Autocorreção do Cypher | - | Pending |
| FIX-08 | P1: Autocorreção do Cypher | - | Pending |
| AIQ-21 | P1: Falhas do provedor | - | Pending |
| AIQ-22 | P1: Falhas do provedor | - | Pending |
| AIQ-23 | P1: Falhas do provedor | - | Pending |
| AIQ-24 | P1: Falhas do provedor | - | Pending |
| AIQ-25 | P1: Falhas do provedor | - | Pending |
| AIQ-26 | P1: Falhas do provedor | - | Pending |
| AIQ-27 | P1: Falhas do provedor | - | Pending |
| FIX-09 | Edge Cases | - | Pending |
| AIQ-28 | Edge Cases | - | Pending |
| AIQ-29 | Edge Cases | - | Pending |
| LLM-15 | Edge Cases | - | Pending |
| FIX-10 | Edge Cases | - | Pending |

<!-- TRACE:END -->

**Coverage:** 55 total, 0 mapped to tasks, 55 unmapped ⚠️

---

## Sources

- Decisões do usuário - criação de queries por IA; LLM configurável via LangChain; Cypher visível e editável; autocorreção com limite; prompt rápido em cada widget.
- Decisão do usuário sobre o contexto - "O schema tem q ter um exemplo e todos os tipos"; "tirando tamanho maximo" (AD-005).
- `.specs/STATE.md` - AD-004, AD-005, AD-006, AD-014, AD-015, AD-016.
- Esta feature não tem captura própria: o prompt rápido e a aba "LLM" de "Configurações" usam o tema de `fundacao-auth`, e a composição é decisão do builder.

---

## Success Criteria

- [ ] No dataset de exemplo, um pedido simples ("total por categoria em barras") vira widget sem edição manual.
- [ ] Em nenhum teste o pedido enviado ao provedor contém linha de resultado.
- [ ] Toda falha termina em uma mensagem em português e em um widget intacto ou em um Cypher editável.
