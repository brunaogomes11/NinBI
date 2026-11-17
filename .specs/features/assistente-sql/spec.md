# Assistente SQL Specification

**Approved**: 2026-11-17 - user: "Aprovar"

## Problem Statement

O assistente de chat (`ia-dashboard`) assume Neo4j: o prompt diz "dashboard de dados em Neo4j", o schema de uma conexão SQL chega a ele como um grafo vazio e os widgets saem pelo laço de geração sem dialeto. Numa conexão PostgreSQL, MySQL ou SQL Server ele pede Cypher, o validador de SQL recusa e o widget falha depois de 3 tentativas. Esta feature liga o assistente ao que `fontes-sql` entregou (AD-135, AD-137): schema relacional, dialeto, validação e execução pelo tipo da conexão.

## Goals

- [ ] Pedir um dashboard ao assistente numa conexão SQL gera widgets cujas consultas rodam e preenchem os gráficos.
- [ ] O assistente conhece o schema relacional da conexão e escreve no dialeto dela.
- [ ] Nada muda para quem usa o assistente com Neo4j.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar as ações do assistente, o limite de 20 mensagens ou o histórico | Só a linguagem da consulta muda |
| Mostrar ao usuário o tipo da conexão no chat | Não foi pedido |
| Renomear o campo `cypher` | Mantido por AD-137 |
| Atualizar o texto de `ia-dashboard/spec.md` | A spec antiga fala de Cypher; esta spec a complementa para SQL |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Comportamento com SQL | Igual ao do Neo4j, na linguagem e no dialeto da conexão | Nada de produto a decidir: só a linguagem muda | y - delegado |
| De onde vem o dialeto | `Source.dialect` da conexão do rascunho; o laço de geração já aceita `dialect` (T29 de `fontes-sql`) | Reaproveita AD-137 | y - delegado |
| Qual conexão vale | A do rascunho, como em AD-134 | O usuário pode trocar a conexão sem salvar | y - delegado |
| Rótulo da consulta no rascunho enviado ao LLM | `SQL:` e ```sql para SQL; `Cypher:` e ```cypher para Neo4j | Mantém o texto do Neo4j como está | n |
| Texto da spec de `ia-dashboard` | Fica como está; os critérios CHAT e GEN valem para SQL com a consulta no lugar do Cypher | Evita reescrever uma spec fechada | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: O assistente gera e altera widgets de conexões SQL ⭐ MVP

**User Story**: As a Editor, I want pedir ao assistente um dashboard ou uma mudança numa conexão SQL so that eu não escreva SQL à mão.

**Why P1**: Sem isso o assistente falha em qualquer conexão SQL.

**Acceptance Criteria**:

1. WHEN o rascunho usa uma conexão SQL THEN o sistema SHALL enviar ao LLM, no pedido do plano, o schema relacional da conexão: tabelas, colunas com tipo, os exemplos que o Admin não desligou e as chaves estrangeiras [ASQ-01]
2. WHEN o rascunho usa uma conexão Neo4j THEN o sistema SHALL enviar o schema de grafo, como hoje [ASQ-02]
3. WHEN o sistema monta o pedido do plano THEN o sistema SHALL descrever o assistente como o de "um dashboard de dados em <banco>", com <banco> igual a Neo4j, PostgreSQL, MySQL ou SQL Server conforme o tipo da conexão [ASQ-03]
4. WHEN o sistema serializa o rascunho para o LLM THEN o sistema SHALL mostrar a consulta de cada widget num bloco de código rotulado e cercado com a linguagem da conexão: `SQL:` e ```sql para SQL, `Cypher:` e ```cypher para Neo4j [ASQ-04]
5. WHEN uma ação cria ou altera a consulta de um widget de conexão SQL THEN o sistema SHALL pedir ao LLM a consulta no dialeto da conexão (PostgreSQL, MySQL ou T-SQL) pelo laço de geração de `ia-cypher` [ASQ-05]
6. WHEN o LLM devolve a consulta de um widget de conexão SQL THEN o sistema SHALL validá-la como SQL somente leitura, executá-la e, se falhar, corrigi-la pelas regras de `ia-cypher` [ASQ-06]
7. WHEN uma ação mantém a consulta atual de um widget, sem novo `prompt`, THEN o sistema SHALL executá-la pela conexão do rascunho, seja SQL ou Neo4j [ASQ-07]
8. WHEN o plano cria ou altera um filtro cujas opções vêm de uma consulta THEN o sistema SHALL validar o texto com o validador do tipo da conexão e descartar a ação se não for somente leitura [ASQ-08]
9. IF a conexão do rascunho não tem schema lido THEN o sistema SHALL responder 409 `SCHEMA_NOT_READ`, também quando ela é SQL [ASQ-09]
10. WHEN o rascunho usa uma conexão diferente da salva no dashboard THEN o sistema SHALL usar o tipo da conexão do rascunho para o schema, o dialeto e a validação [ASQ-10]
11. IF um widget de conexão SQL continua falhando depois das correções THEN o sistema SHALL criá-lo no rascunho em estado de erro, com a última consulta SQL no editor, e seguir com os demais widgets [ASQ-11]

**Independent Test**: Numa conexão Postgres de teste, pedir "visão geral de pedidos por cliente" e ver widgets com SQL que roda; pedir "adicione um filtro de cidade" e ver o filtro e a consulta ajustada.

---

### P1: A tela do assistente entende SQL ⭐ MVP

**User Story**: As a Editor, I want que as mudanças do assistente atualizem a tela certa so that os widgets e filtros SQL fiquem coerentes.

**Why P1**: Os parâmetros e filtros do rascunho dependem da linguagem.

**Acceptance Criteria**:

1. WHEN o assistente cria ou altera widgets de um dashboard SQL THEN o sistema SHALL calcular os parâmetros de cada widget com o tokenizador de SQL [ASQ-12]
2. WHEN o assistente muda filtros ou widgets de um dashboard SQL THEN o sistema SHALL achar os widgets que usam cada filtro pelos `$nome` lidos como SQL, para atualizar o resultado guardado [ASQ-13]

**Independent Test**: Aplicar uma ação `create_widget` com `$cidade` num dashboard SQL e ver o parâmetro no widget.

---

### P1: Neo4j continua igual ⭐ MVP

**User Story**: As a usuário do assistente com Neo4j, I want que nada mude so that meus dashboards sigam funcionando.

**Why P1**: Regressão é falha.

**Acceptance Criteria**:

1. The system SHALL manter para conexões Neo4j o comportamento do assistente: pedido, schema, validação, execução e correção como antes desta feature [ASQ-14]

**Independent Test**: A suíte inteira, sem mudar expectativas de Neo4j.

---

## Edge Cases

- IF o LLM devolve Cypher para uma conexão SQL THEN o sistema SHALL tratar a falha de validação como em ASQ-06 e corrigir com a mensagem do validador [ASQ-15]

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | ASQ-06, ASQ-08, ASQ-15 (validador do tipo da conexão) |
| Failure / partial-failure states | ASQ-06, ASQ-11, ASQ-15; um widget que falha não derruba os demais |
| Idempotency / retry / duplicate handling | N/A because o assistente não ganha estado novo; o laço de correção é o de `ia-cypher` |
| Auth boundaries & rate limits | ASQ-09 e o 403 de conexão de AD-134 seguem iguais; rate limit N/A because vale o limite de mensagens de `ia-dashboard` |
| Concurrency / ordering | N/A because nenhuma gravação nova; um pedido por vez como hoje |
| Data lifecycle / expiry | N/A because nenhum dado novo é guardado |
| Observability | N/A because o log de execução de `fontes-sql` (SQX-24) já traz o tipo da conexão |
| External-dependency failure | ASQ-06, ASQ-11 (LLM e banco) |
| State-transition integrity | ASQ-10 (a conexão do rascunho decide) |

---

## Requirement Traceability

<!-- TRACE:START -->

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ASQ-01 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-02 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-03 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-04 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-05 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-06 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-07 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-08 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-09 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-10 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-11 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |
| ASQ-12 | P1: A tela do assistente entende SQL | - | Pending |
| ASQ-13 | P1: A tela do assistente entende SQL | - | Pending |
| ASQ-14 | P1: Neo4j continua igual | - | Pending |
| ASQ-15 | P1: O assistente gera e altera widgets de conexões SQL | - | Pending |

<!-- TRACE:END -->

**Coverage:** 15 total, 0 mapped to tasks, 15 unmapped ⚠️ (as tasks estão em `tasks.md`)

---

## Sources

- `.specs/features/ia-dashboard/spec.md` - o assistente (CHAT, GEN)
- `.specs/features/fontes-sql/spec.md` e `design.md` - fontes por tipo, dialeto (AD-135, AD-137)
- AD-134 - a conexão do rascunho vale

---

## Success Criteria

- [ ] No Postgres de teste, o assistente cria widgets cujas consultas rodam.
- [ ] A suíte inteira passa sem mudar expectativas de Neo4j.
