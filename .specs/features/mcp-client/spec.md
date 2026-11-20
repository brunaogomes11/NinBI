# MCP Client Specification

**Approved**: 2026-11-20 - user: "pode"

## Problem Statement

O NinBI cria dashboards a partir de conexões SQL e Neo4j. Ferramentas MCP que expõem listas tabulares tipadas ainda precisam de um caminho para fornecer dados aos widgets. O primeiro piloto deve provar que widgets de servidores MCP diferentes podem funcionar no mesmo dashboard.

## Goals

- [ ] Cadastrar mais de um servidor MCP na mesma instância do NinBI.
- [ ] Descobrir ferramentas tabulares de leitura disponíveis em uma conexão e testar uma chamada.
- [ ] Criar manualmente um dashboard com widgets de servidores MCP diferentes e consultar cada fonte novamente ao reabrir o painel ou alterar um filtro vinculado.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Servidor MCP do NinBI para IAs externas criarem dashboards | Segunda capacidade do produto, com escopo próprio. |
| Chamar ferramentas que alteram dados no servidor de origem | O piloto usa ferramentas de leitura para alimentar widgets. |
| Criação de dashboards MCP pelo assistente | O piloto usa configuração e teste manuais na interface. |
| Junções entre resultados de diferentes fontes | O piloto valida a execução de chamadas e o consumo de resultados tabulares. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Permissões no NinBI | Reaproveitar as permissões de cadastro de conexões e de edição e visualização de dashboards. | O produto já tem papéis e regras para essas ações. | y — comportamento existente |
| Conexões por dashboard | Cada widget MCP usa a conexão selecionada para ele. Um painel pode reunir widgets de vários servidores. | Permite consultar várias fontes no mesmo painel. | y — Q1 |
| Servidor do piloto e autenticação | Servidor MCP escolhido para o teste, sem integração específica para uma marca. O NinBI chama o MCP, e o servidor cuida da autenticação que sua ferramenta exige no serviço de origem. | Valida o NinBI como cliente do MCP. A seleção do servidor e o transporte ficam para o design. | y — Q2, com interpretação registrada no contexto |
| Criação do widget | O Editor configura e testa o widget manualmente. | Permite validar descoberta, execução e salvamento pela interface. | y — Q3 |
| Formato tabular aceito | O Editor seleciona uma lista de registros planos declarada no `outputSchema` da ferramenta. O NinBI lê a lista correspondente em `structuredContent`. | O nome da lista pode variar entre ferramentas e o esquema informa os tipos das colunas mesmo com zero linhas. | y — Q4 |

**Open questions:** none.

## User Stories

### P1 — Cadastrar e descobrir ferramentas

**User Story** — Como Admin, quero cadastrar servidores MCP e consultar o catálogo de cada conexão para disponibilizar fontes de dados aos Editores.

**Why P1** — Cada conexão precisa apontar para a fonte certa antes de alimentar um widget.

**Acceptance Criteria**

1. WHEN o Admin cadastra uma segunda conexão MCP válida THEN o NinBI SHALL disponibilizar as duas conexões com identificadores distintos. [MCP-01]
2. WHEN o Admin solicita a descoberta de ferramentas de uma conexão MCP THEN o NinBI SHALL apresentar o catálogo retornado pelo servidor daquela conexão. [MCP-02]
3. IF uma descoberta falha por indisponibilidade do servidor THEN o NinBI SHALL indicar a falha de conexão. [MCP-03]
4. IF uma conta sem permissão de gerenciar conexões tenta cadastrar uma conexão MCP THEN o NinBI SHALL rejeitar o cadastro. [MCP-04]
5. IF o próprio endpoint MCP recusa a descoberta ou a execução por falta de autorização THEN o NinBI SHALL indicar que o servidor MCP exige autorização. [MCP-18]

**Independent Test** — Cadastrar dois servidores de teste com catálogos diferentes e conferir a descoberta em cada cadastro.

### P1 — Executar uma chamada tabular

**User Story** — Como Editor, quero consultar uma ferramenta de leitura com argumentos válidos para conferir os dados que meu widget pode mostrar.

**Why P1** — O widget precisa receber valores com tipos conhecidos para usar a mesma tabela e os mesmos gráficos das outras fontes.

**Acceptance Criteria**

1. WHEN o Editor executa uma ferramenta habilitada com argumentos válidos THEN o NinBI SHALL disponibilizar as colunas com seus tipos e as linhas da resposta tabular. [MCP-05]
2. IF os argumentos divergem do contrato de entrada THEN o NinBI SHALL rejeitar a execução antes de chamar a ferramenta. [MCP-06]
3. IF a ferramenta solicitada está fora da seleção de ferramentas de leitura habilitadas THEN o NinBI SHALL rejeitar a chamada. [MCP-07]
4. IF a resposta diverge do contrato tabular aceito THEN o NinBI SHALL informar a incompatibilidade da resposta. [MCP-08]
5. WHEN a ferramenta retorna uma tabela tipada com zero linhas THEN o NinBI SHALL apresentar o estado de resultado vazio com as colunas disponíveis. [MCP-09]
6. IF a chamada excede o limite de execução THEN o NinBI SHALL retornar um erro de tempo limite ao solicitante. [MCP-10]
7. IF o resultado excede o limite de linhas do NinBI THEN o NinBI SHALL sinalizar que o resultado exibido é parcial. [MCP-11]
8. WHEN o Editor configura um widget MCP THEN o NinBI SHALL permitir que ele escolha a conexão, selecione a ferramenta e preencha seus argumentos manualmente. [MCP-19]
9. WHEN uma ferramenta MCP consulta um serviço de origem que exige autenticação THEN o NinBI SHALL fazer a chamada somente ao servidor MCP. [MCP-20]
10. WHEN o Editor configura a saída de uma ferramenta MCP THEN o NinBI SHALL permitir selecionar uma lista de registros planos com tipos de coluna declarados no `outputSchema`. [MCP-22]
11. WHEN uma ferramenta retorna mais de uma lista em `structuredContent` THEN o NinBI SHALL usar somente as linhas da lista selecionada para preencher o widget. [MCP-23]

**Independent Test** — Executar uma ferramenta de teste com uma resposta válida, uma saída vazia e uma saída que viole o contrato declarado.

### P1 — Salvar e atualizar o dashboard

**User Story** — Como Editor, quero salvar um widget alimentado por MCP e vinculá-lo a um filtro para consultar dados atuais ao reabrir o painel e alterar o filtro.

**Why P1** — A demonstração deve produzir um painel reutilizável.

**Acceptance Criteria**

1. WHEN o Editor salva um widget MCP válido THEN o NinBI SHALL persistir a configuração da chamada com a conexão, a ferramenta, os argumentos, a lista selecionada e o mapeamento de colunas e filtros. [MCP-12]
2. WHEN um usuário autorizado reabre o dashboard THEN o NinBI SHALL preencher a visualização com uma execução da chamada salva. [MCP-13]
3. WHEN um usuário autorizado muda um filtro vinculado THEN o NinBI SHALL reexecutar o widget afetado com o novo valor no argumento vinculado. [MCP-14]
4. IF a execução de um widget MCP falha THEN o NinBI SHALL apresentar o estado de erro naquele widget e manter acessíveis os demais widgets do painel. [MCP-15]
5. IF um usuário sem acesso ao dashboard tenta executar um widget salvo THEN o NinBI SHALL impedir a chamada MCP. [MCP-16]
6. WHEN um usuário abre ou filtra um dashboard já salvo THEN o NinBI SHALL executar a configuração persistida sem recorrer ao provedor de IA. [MCP-17]
7. WHEN um dashboard salvo tem widgets em duas conexões MCP distintas THEN o NinBI SHALL executar cada widget no servidor associado a ele. [MCP-21]

**Independent Test** — Salvar um painel com widgets de dois servidores e um filtro de equipe. Atualizar os dados de uma fonte, reabrir o painel e conferir o servidor e os argumentos usados por cada widget.

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | MCP-06, MCP-08, MCP-10, MCP-11, MCP-22 e MCP-23. |
| Failure / partial-failure states | MCP-03, MCP-08 e MCP-15. |
| Idempotency / retry / duplicate handling | As chamadas de dados usam ferramentas de leitura habilitadas em MCP-07. Retentativa automática fica fora do piloto. |
| Auth boundaries & rate limits | MCP-04, MCP-07, MCP-16, MCP-18 e MCP-20. Limites adicionais por servidor ficam fora do piloto. |
| Concurrency / ordering | A visualização corresponde ao filtro atual conforme MCP-14. O resultado de uma solicitação anterior não pode substituir o resultado do filtro atual. |
| Data lifecycle / expiry | A configuração é persistida em MCP-12. O widget consulta a fonte ao reabrir em MCP-13. |
| Observability | MCP-03 e MCP-15 tornam falhas visíveis no fluxo existente. N/A para um produto novo de telemetria, pois o piloto valida a execução no NinBI. |
| External-dependency failure | MCP-03, MCP-08, MCP-10 e MCP-15. |
| State-transition integrity | MCP-12 a MCP-14 e MCP-21. A conexão persistida por widget determina o servidor de cada chamada. |

## Requirement Traceability

<!-- TRACE:START -->

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MCP-01 | Cadastrar e descobrir ferramentas | T1 | Implementing |
| MCP-02 | Cadastrar e descobrir ferramentas | T2 | Implementing |
| MCP-03 | Cadastrar e descobrir ferramentas | T2 | Implementing |
| MCP-04 | Cadastrar e descobrir ferramentas | T1 | Implementing |
| MCP-05 | Executar uma chamada tabular | T3 | Implementing |
| MCP-06 | Executar uma chamada tabular | T3 | Implementing |
| MCP-07 | Executar uma chamada tabular | T3 | Implementing |
| MCP-08 | Executar uma chamada tabular | T3 | Implementing |
| MCP-09 | Executar uma chamada tabular | T3 | Implementing |
| MCP-10 | Executar uma chamada tabular | T2 | Implementing |
| MCP-11 | Executar uma chamada tabular | T3 | Implementing |
| MCP-12 | Salvar e atualizar o dashboard | T4 | Implementing |
| MCP-13 | Salvar e atualizar o dashboard | - | Pending |
| MCP-14 | Salvar e atualizar o dashboard | - | Pending |
| MCP-15 | Salvar e atualizar o dashboard | - | Pending |
| MCP-16 | Salvar e atualizar o dashboard | T5 | Implementing |
| MCP-17 | Salvar e atualizar o dashboard | T5 | Implementing |
| MCP-18 | Cadastrar e descobrir ferramentas | T2 | Implementing |
| MCP-19 | Executar uma chamada tabular | T7 | Implementing |
| MCP-20 | Executar uma chamada tabular | T5 | Implementing |
| MCP-21 | Salvar e atualizar o dashboard | T5 | Implementing |
| MCP-22 | Executar uma chamada tabular | T7 | Implementing |
| MCP-23 | Executar uma chamada tabular | T3 | Implementing |

<!-- TRACE:END -->

**Coverage** — 23 critérios, 20 mapeados para tasks.

## Sources

- Conversa sobre o piloto do NinBI como cliente MCP e o servidor MCP do NinBI como etapa própria.
- [Conexões e esquema](../conexoes-schema/spec.md) e [dashboards e consultas](../dashboards-consultas/spec.md) — papéis e fluxo atual de conexões e execução.
- [Especificação MCP de ferramentas](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) — descoberta, chamadas e resultados estruturados.

## Success Criteria

- [ ] Duas conexões MCP cadastradas apresentam ferramentas dos respectivos servidores.
- [ ] Uma ferramenta com listas tipadas `chamados` e `equipes` alimenta um widget com a lista selecionada pelo Editor.
- [ ] Um dashboard salvo mostra widgets de dois servidores MCP e atualiza o widget afetado ao trocar o filtro.
- [ ] Uma indisponibilidade do servidor é visível no widget afetado.
