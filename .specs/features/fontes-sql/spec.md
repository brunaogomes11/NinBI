# Fontes SQL Specification

**Approved**: 2026-11-16 - user: "Aprovar"

## Problem Statement

O NinBI só consulta Neo4j (AD-002): o formulário de conexão recusa qualquer endereço que não seja `neo4j://` ou `bolt://`, e a consulta, o schema e a IA assumem Cypher. O usuário quer conectar direto em bancos relacionais, o primeiro deles o Postgres do Sortify, sem importar os dados para o Neo4j. Esta feature adiciona PostgreSQL, MySQL e SQL Server como tipos de conexão ao lado do Neo4j (AD-135): cadastro, execução de SQL somente leitura, leitura do schema e geração de consultas pela IA no dialeto do banco.

## Goals

- [ ] Um Admin cadastra uma conexão PostgreSQL, MySQL ou SQL Server e o NinBI prova host, porta, banco e credenciais antes de salvar.
- [ ] Um widget ligado a uma conexão SQL executa SQL somente leitura e os gráficos, filtros, exportação e cross-filtering funcionam com o resultado.
- [ ] O schema SQL (tabelas, colunas, chaves estrangeiras) é lido, guardado, visível e enviado à IA, que escreve a consulta no dialeto do banco.
- [ ] Tudo o que já funciona com Neo4j continua funcionando sem mudança.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Oracle, SQLite, MariaDB como alvo garantido, MongoDB, arquivos | O pedido é PostgreSQL, MySQL e SQL Server; os demais pedem outro driver |
| Importar dados de outros bancos para o Neo4j | O NinBI consulta o banco de origem ao vivo (AD-135) |
| Escrita no banco do usuário (INSERT, UPDATE, DELETE, DDL, procedures) | O NinBI é de leitura |
| Aceitar certificado autoassinado ou escolher o modo de SSL por banco | A caixa "Usar SSL" valida o certificado (AD-136) |
| Túnel SSH, proxy, conexão por socket Unix ou por pipe nomeado | Não foram pedidos |
| Consulta entre dois bancos ou conexões na mesma consulta | Cada widget usa uma conexão |
| Escolher quais schemas do banco ler | O NinBI lê todos os schemas de usuário |
| Tradução automática de Cypher para SQL ou entre dialetos | A consulta fica no idioma do tipo da conexão |
| Controlar colunas ou linhas por usuário dentro do banco SQL | A permissão é por dashboard (AD-014); o acesso ao banco é o do usuário da conexão |
| Strings entre `$$ ... $$` do PostgreSQL | O NinBI lê `$$` como texto comum; use aspas simples |
| Ajustar a spec de `ia-dashboard` | Feita à parte, depois desta feature; nada dela está implementado |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Bancos desta entrega | PostgreSQL, MySQL e SQL Server | Usuário: "o plano é começar com mysql, postgres, sql server" | y |
| Neo4j | Continua como um tipo de conexão; tudo o que existe segue igual | AD-135; o usuário não contestou ao ser avisado | n |
| Como informar o endereço | Seletor de tipo; SQL pede host e porta separados | AD-136; usuário escolheu "Tipo + host + porta" | y |
| Formulário do Neo4j | O tipo Neo4j mantém o campo "URI", com os seis esquemas de hoje | `neo4j://` e `bolt://` decidem roteamento e `+s`/`+ssc` decidem TLS; host, porta e uma caixa não guardam isso sem perda, e as conexões existentes ficariam alteradas | n |
| SSL | Caixa "Usar SSL", desmarcada por padrão; marcada, criptografa e valida o certificado | AD-136; usuário escolheu a caixa | y |
| Portas padrão | PostgreSQL 5432, MySQL 3306, SQL Server 1433, preenchidas ao escolher o tipo | Valores oficiais de cada banco | n |
| Banco (database) | Obrigatório nos três tipos SQL; no Neo4j segue opcional | O driver SQL precisa de um banco inicial | n |
| Tipo depois de criada | Não muda; para outro tipo, cria-se outra conexão | As consultas dos widgets estão no idioma do tipo | n |
| Versões | PostgreSQL 12+, MySQL 8.x, SQL Server 2017+ e Azure SQL | Versões em suporte; MariaDB não é garantida | n |
| Leitura forçada | PostgreSQL e MySQL em transação de leitura; os três terminam em `ROLLBACK`; um validador de texto barra o resto. O SQL Server não tem transação de leitura, então o validador e o `ROLLBACK` o protegem e o formulário recomenda um usuário só de leitura | O validador sozinho não cobre funções com efeito colateral; um usuário só de leitura é a defesa de verdade | n |
| Prazos e limites | Os mesmos do Neo4j: 10 s no teste de conexão, 120 s na leitura do schema, 30 s por consulta, 5.000 linhas, 20.000 caracteres | QRY-07 a QRY-09, CONN-09, SCH-10 | n |
| Parâmetros | `$nome` em todos os tipos; o servidor troca por parâmetros do driver, nunca por texto colado | O editor, os filtros e a IA já falam `$nome` | n |
| Parâmetro nulo | `$nome IS NULL` e `$nome IS NOT NULL` valem verdadeiro ou falso conforme o valor, sem ir ao banco | O PostgreSQL falha com parâmetro nulo sem tipo em `$1 IS NULL`; é o formato dos filtros vazios (FLT-11) | n |
| Lista como parâmetro | `$nome` com lista vira um parâmetro por item; use `col IN ($nome)` | O SQL não tem parâmetro de lista | n |
| Exemplo do schema | O primeiro valor não nulo entre até 100 linhas lidas de cada tabela | Ler a tabela inteira é lento; sem valor nas 100 linhas, a coluna fica "sem exemplo" | n |
| Nome das tabelas | `schema.tabela` no PostgreSQL e no SQL Server; só `tabela` no MySQL | O nome qualificado vale em qualquer consulta; no MySQL schema é o banco | n |
| Views | Entram no schema, marcadas "(visão)" | O usuário consulta views | n |
| Relações | Chaves estrangeiras, inclusive compostas | É a estrutura que a IA usa para os joins | n |
| Valores no resultado | Número vira número; inteiro que não cabe exato vira o `bigint` do Neo4j e decimal que não cabe vira texto; data vira `AAAA-MM-DD`; data e hora com fuso vira ISO 8601 em UTC; sem fuso, como gravada; binário vira `<binário N bytes>` | O resultado é JSON para gráficos e CSV | n |
| Colunas com o mesmo nome | A segunda e as seguintes ganham `_2`, `_3` | O resultado é uma linha por objeto, e o SQL permite nomes repetidos | n |
| Trocar a conexão do dashboard para outro tipo | Pede confirmação e avisa que as consultas precisam ser reescritas | As consultas existentes falhariam | n |
| Conexões e dashboards | Várias conexões; cada dashboard usa exatamente uma | Vale a regra de `conexoes-schema` | y |
| Credenciais | Senha criptografada no backend e omitida de toda resposta | Vale CONN-13 e CONN-14 | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Cadastrar uma conexão PostgreSQL, MySQL ou SQL Server ⭐ MVP

**User Story**: As a Admin, I want cadastrar um banco SQL informando tipo, host, porta, banco e credenciais so that os dashboards consultem esse banco sem que ninguém mais veja a senha.

**Why P1**: Sem conexão SQL não há consulta, schema nem IA.

**Acceptance Criteria**:

1. WHEN um Admin abre "Nova conexão" THEN o sistema SHALL mostrar o seletor "Tipo" com "Neo4j", "PostgreSQL", "MySQL" e "SQL Server" [SRC-01]
2. WHEN o Admin escolhe um tipo SQL THEN o sistema SHALL mostrar os campos "Nome", "Host", "Porta", "Banco", "Usuário", "Senha" e a caixa "Usar SSL" desmarcada [SRC-02]
3. WHEN o Admin escolhe um tipo SQL THEN o sistema SHALL preencher "Porta" com 5432 (PostgreSQL), 3306 (MySQL) ou 1433 (SQL Server) [SRC-03]
4. WHEN o Admin escolhe "Neo4j" THEN o sistema SHALL mostrar o formulário de hoje, com o campo "URI" e o "Banco" opcional [SRC-04]
5. WHEN um Admin envia "Nova conexão" SQL THEN o sistema SHALL testar a conexão com o banco antes de salvar [SRC-05]
6. WHEN o teste passa THEN o sistema SHALL salvar a conexão e mostrá-la na lista [SRC-06]
7. IF o teste falha THEN o sistema SHALL não salvar, manter o formulário preenchido e mostrar a mensagem de erro do banco [SRC-07]
8. IF o banco não responde ao teste em 10 s THEN o sistema SHALL mostrar "Não foi possível conectar em 10 s" [SRC-08]
9. IF "Host" está vazio, tem espaços ou contém `://` THEN o sistema SHALL recusar com "Host inválido" no campo [SRC-09]
10. IF "Porta" não é um inteiro de 1 a 65535 THEN o sistema SHALL recusar com "Porta inválida" no campo [SRC-10]
11. IF "Banco" está vazio em uma conexão SQL THEN o sistema SHALL recusar com "Informe o banco" no campo [SRC-11]
12. WHEN "Usar SSL" está marcada THEN o sistema SHALL abrir a conexão criptografada e validar o certificado do servidor [SRC-12]
13. WHILE "Usar SSL" está desmarcada o sistema SHALL abrir a conexão sem criptografia [SRC-13]
14. The system SHALL mostrar, no formulário de conexão SQL, o texto "Use um usuário com permissão só de leitura" [SRC-14]
15. WHEN a lista de conexões é mostrada THEN o sistema SHALL mostrar o tipo de cada conexão e, nas SQL, "host:porta" no lugar da URI [SRC-15]
16. WHEN um Admin edita uma conexão THEN o sistema SHALL mostrar o "Tipo" desabilitado [SRC-16]
17. WHEN um Admin edita uma conexão SQL e deixa "Senha" vazia THEN o sistema SHALL manter a senha guardada e testar a conexão de novo antes de gravar [SRC-17]
18. The system SHALL guardar a senha de toda conexão SQL criptografada no PostgreSQL do NinBI e omiti-la de toda resposta da API [SRC-18]
19. IF o nome está vazio, passa de 80 caracteres ou já pertence a outra conexão THEN o sistema SHALL recusar com a mensagem no campo "Nome", como em CONN-11 [SRC-19]
20. IF um Editor ou Visualizador chama a criação, edição ou exclusão de conexão SQL THEN o sistema SHALL responder 403 [SRC-20]

**Independent Test**: Como Admin, cadastrar o Postgres do docker-compose de teste com tipo PostgreSQL, ver a conexão na lista com o tipo e `host:porta`, inspecionar a resposta da API sem a senha; repetir com senha errada e ver o erro do banco sem nada salvo.

---

### P1: Executar SQL somente leitura ⭐ MVP

**User Story**: As a Admin ou Editor, I want escrever SQL no editor do widget e ver o resultado so that eu monte gráficos e tabelas sobre o banco relacional.

**Why P1**: É o que entrega valor: dados do banco SQL em widgets.

**Acceptance Criteria**:

1. WHEN o dashboard usa uma conexão SQL THEN o sistema SHALL mostrar o editor de consulta como "Consulta SQL", com destaque de SQL [SQX-01]
2. WHEN o dashboard usa uma conexão Neo4j THEN o sistema SHALL mostrar o editor como "Consulta Cypher", como hoje [SQX-02]
3. The system SHALL executar toda consulta SQL em uma transação que termina em `ROLLBACK` [SQX-03]
4. WHERE a conexão é PostgreSQL ou MySQL the system SHALL abrir a transação em modo leitura [SQX-04]
5. IF a consulta não começa por `SELECT` ou `WITH`, ignorados espaços e comentários, THEN o sistema SHALL recusar sem enviá-la ao banco, com "Somente consultas de leitura são permitidas. Comece por SELECT ou WITH" [SQX-05]
6. IF a consulta contém, fora de strings, comentários e identificadores entre aspas, `[]` ou crases, uma das palavras `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `EXEC`, `EXECUTE`, `CALL`, `COPY`, `SET`, `DO`, `INTO`, `DECLARE`, `WAITFOR`, `OPENROWSET`, `OPENQUERY`, `LOCK` ou `FOR UPDATE` THEN o sistema SHALL recusar sem enviá-la ao banco, com "Somente consultas de leitura são permitidas. Cláusula bloqueada: <palavra>" [SQX-06]
7. The system SHALL reconhecer as palavras bloqueadas sem diferenciar maiúsculas de minúsculas [SQX-07]
8. WHEN uma palavra bloqueada aparece só dentro de uma string, de um comentário, de um identificador entre aspas, `[]` ou crases, ou como parte de um nome maior como `created_at` THEN o sistema SHALL aceitar a consulta [SQX-08]
9. IF o texto contém mais de uma instrução separada por `;` THEN o sistema SHALL recusar com "Envie uma consulta por vez" [SQX-09]
10. IF a consulta passa de 30 s THEN o sistema SHALL cancelá-la no banco e mostrar "A consulta excedeu o tempo limite de 30 s" [SQX-10]
11. IF o resultado passa de 5.000 linhas THEN o sistema SHALL devolver as primeiras 5.000 e mostrar o aviso "Mostrando as primeiras 5.000 linhas" [SQX-11]
12. IF a consulta passa de 20.000 caracteres THEN o sistema SHALL recusar com "A consulta passa de 20.000 caracteres" [SQX-12]
13. IF o banco recusa a consulta THEN o sistema SHALL mostrar a mensagem de erro do banco a quem pode editar o dashboard, e a mensagem genérica a quem só vê, como em TBL-12 [SQX-13]
14. IF o banco da conexão está inacessível THEN o sistema SHALL mostrar "Não foi possível conectar ao banco <nome da conexão>" [SQX-14]
15. WHEN a consulta usa `$nome` THEN o sistema SHALL enviar o valor ao banco como parâmetro do driver, sem colá-lo no texto da consulta [SQX-15]
16. WHEN `$nome` aparece só dentro de uma string, de um comentário ou de um identificador entre aspas, `[]` ou crases THEN o sistema SHALL não tratá-lo como parâmetro [SQX-16]
17. WHEN a consulta usa um `$nome` sem valor definido THEN o sistema SHALL executar com `null` nesse parâmetro [SQX-17]
18. WHEN a consulta contém `$nome IS NULL` ou `$nome IS NOT NULL` THEN o sistema SHALL trocar a expressão por uma condição sempre verdadeira ou sempre falsa, conforme o valor ser nulo ou não [SQX-18]
19. WHEN o valor de `$nome` é uma lista THEN o sistema SHALL enviar um parâmetro por item, de modo que `IN ($nome)` compare com cada item [SQX-19]
20. WHEN o valor de `$nome` é uma data `AAAA-MM-DD` THEN o sistema SHALL enviá-la ao banco como data [SQX-20]
21. WHEN o resultado tem números, textos, booleanos, datas, datas com hora, JSON, UUID ou nulos THEN o sistema SHALL devolvê-los como número, texto, booleano, `AAAA-MM-DD`, ISO 8601, o valor `json` que o Neo4j já usa, texto e `null` [SQX-21]
22. WHEN um inteiro não cabe exato em um número de JSON THEN o sistema SHALL devolvê-lo como o valor `bigint` que o Neo4j já usa, e um decimal que não cabe exato como texto decimal [SQX-22]
23. WHEN o resultado tem duas colunas com o mesmo nome THEN o sistema SHALL chamar a segunda de `<nome>_2`, a terceira de `<nome>_3` [SQX-23]
24. The system SHALL registrar em log cada execução com usuário, conexão, tipo, widget, duração, número de linhas e resultado, sem as linhas retornadas [SQX-24]
25. IF um usuário que não pode editar o dashboard chama a execução de SQL enviado como texto THEN o sistema SHALL responder 403, como em QRY-11 [SQX-25]

**Independent Test**: Num dashboard ligado ao Postgres de teste, criar um widget de tabela com `SELECT * FROM clientes` e ver as linhas; trocar por `DELETE FROM clientes` e ver a recusa sem nada apagado; usar `$cidade IS NULL OR cidade = $cidade` com um filtro e ver o resultado mudar.

---

### P1: Ler e ver o schema SQL ⭐ MVP

**User Story**: As a Admin ou Editor, I want que o NinBI leia do banco SQL as tabelas, colunas, tipos, exemplos e chaves estrangeiras so that a IA tenha o contexto e eu veja o que existe.

**Why P1**: É o único contexto do banco que a IA recebe (AD-005).

**Acceptance Criteria**:

1. WHEN uma conexão SQL é criada THEN o sistema SHALL ler o schema dela sem outra ação do usuário [SCS-01]
2. WHEN o schema SQL é lido THEN o sistema SHALL guardar, para cada tabela e view dos schemas de usuário, as colunas com o tipo de dado de cada uma [SCS-02]
3. WHEN o schema SQL é lido THEN o sistema SHALL deixar de fora os schemas do sistema (`information_schema`, `pg_catalog`, `pg_toast`, `sys`, `INFORMATION_SCHEMA`, `mysql`, `performance_schema`) [SCS-03]
4. WHEN o schema SQL é lido THEN o sistema SHALL guardar, para cada coluna, o primeiro valor não nulo entre até 100 linhas lidas da tabela, inteiro e sem cortar [SCS-04]
5. WHEN o schema SQL é lido THEN o sistema SHALL guardar cada chave estrangeira, inclusive composta, como o par de tabela e colunas de origem e de destino [SCS-05]
6. WHEN o schema SQL é lido THEN o sistema SHALL nomear as tabelas `schema.tabela` no PostgreSQL e no SQL Server e `tabela` no MySQL [SCS-06]
7. IF o usuário da conexão não pode ler uma tabela para o exemplo THEN o sistema SHALL listar a tabela e suas colunas com "sem exemplo" e concluir a leitura [SCS-07]
8. IF o usuário da conexão não pode ler o catálogo do banco THEN o sistema SHALL tratar como falha de leitura e mostrar a mensagem de erro do banco [SCS-08]
9. The system SHALL ler o schema SQL apenas com consultas de leitura, em transação que termina em `ROLLBACK` [SCS-09]
10. WHEN a leitura termina THEN o sistema SHALL gravar o schema com data e hora da leitura, no lugar do anterior, e manter o anterior se a leitura falha ou passa de 120 s, como em SCH-06, SCH-09 e SCH-10 [SCS-10]
11. IF chega um pedido de leitura para uma conexão com leitura em andamento THEN o sistema SHALL não iniciar outra, como em SCH-11 [SCS-11]
12. WHEN um Admin ou Editor abre o schema de uma conexão SQL THEN o sistema SHALL mostrar a lista "Tabelas", em ordem alfabética, com as views marcadas "(visão)", e a lista "Relações", com a data e hora da última leitura [SCS-12]
13. WHEN o usuário seleciona uma tabela THEN o sistema SHALL mostrar a tabela de colunas com "Coluna", "Tipo" e "Exemplo" e, abaixo, as chaves estrangeiras dela no formato `origem.coluna → destino.coluna` [SCS-13]
14. WHEN o exemplo é um texto, um número ou uma data THEN o sistema SHALL mostrá-lo como literal SQL: texto entre aspas simples, número sem aspas, data entre aspas simples [SCS-14]
15. WHEN o banco não tem nenhuma tabela THEN o sistema SHALL mostrar "Este banco não tem dados" [SCS-15]
16. WHEN um Admin desliga "Enviar exemplo à IA" em uma coluna THEN o sistema SHALL gravar a escolha e mantê-la nas atualizações em que a coluna continua existindo, como em SCH-22 e SCH-23 [SCS-16]
17. The system SHALL registrar em log cada leitura de schema SQL com conexão, tipo, duração, quantidade de tabelas e de relações e resultado, sem os exemplos [SCS-17]

**Independent Test**: Cadastrar o Postgres de teste com duas tabelas ligadas por chave estrangeira e conferir, na tela do schema, as colunas, os tipos, um exemplo real e a relação `pedidos.cliente_id → clientes.id`.

---

### P1: A IA escreve a consulta no dialeto do banco ⭐ MVP

**User Story**: As a Admin ou Editor, I want pedir um widget em texto e receber a consulta no idioma da conexão so that eu não escreva SQL à mão.

**Why P1**: A IA é o caminho principal para criar widgets (AD de `ia-cypher`).

**Acceptance Criteria**:

1. WHEN a IA gera um widget para uma conexão SQL THEN o sistema SHALL pedir ao modelo uma consulta no dialeto do tipo: PostgreSQL, MySQL ou T-SQL [SAI-01]
2. WHEN a IA gera um widget para uma conexão SQL THEN o sistema SHALL enviar ao modelo as tabelas, as colunas com o tipo, os exemplos que o Admin não desligou e as chaves estrangeiras [SAI-02]
3. WHEN a IA gera um widget para uma conexão Neo4j THEN o sistema SHALL pedir Cypher e enviar o schema do Neo4j, como hoje [SAI-03]
4. WHEN o modelo responde para uma conexão SQL THEN o sistema SHALL passar a consulta pelas regras de SQX-05 a SQX-09 antes de executá-la [SAI-04]
5. IF a consulta SQL gerada falha na execução THEN o sistema SHALL pedir ao modelo uma correção com a mensagem de erro do banco, com as mesmas tentativas e regras de `ia-cypher` [SAI-05]
6. WHEN o dashboard tem filtros THEN o sistema SHALL descrever ao modelo os parâmetros `$nome` e a forma de usá-los em SQL: `$nome IS NULL OR coluna = $nome` e `coluna IN ($nome)` [SAI-06]
7. WHEN o usuário vê o resultado da IA THEN o sistema SHALL mostrar a consulta no editor do tipo da conexão [SAI-07]

**Independent Test**: Pedir "total de pedidos por cliente" numa conexão Postgres e ver um `SELECT` com `JOIN` por `cliente_id` que roda e preenche o gráfico.

---

### P1: O que existe com Neo4j continua igual ⭐ MVP

**User Story**: As a usuário de um dashboard Neo4j, I want que nada mude para mim so that eu não perca o que já montei.

**Why P1**: Um dashboard que para de funcionar é regressão.

**Acceptance Criteria**:

1. WHEN a migração do banco do NinBI roda THEN o sistema SHALL marcar toda conexão existente como Neo4j, com URI, banco, usuário, senha e schema iguais [SMG-01]
2. WHEN a migração roda THEN o sistema SHALL manter o texto de toda consulta de widget e de filtro existente, sem alteração [SMG-02]
3. The system SHALL executar widgets, filtros, exportações e cross-filtering de conexões Neo4j com o mesmo resultado de antes da feature [SMG-03]
4. The system SHALL manter as regras de `conexoes-schema`, `dashboards-consultas`, `ia-cypher` e `interatividade` para conexões Neo4j [SMG-04]

**Independent Test**: Rodar a suíte de testes de API e web que existe antes da feature, sem alterações nas expectativas, e ver tudo passar.

---

### P2: Trocar a conexão de um dashboard para outro tipo

**User Story**: As a Editor, I want ser avisado ao trocar a conexão so that eu saiba que as consultas dos widgets vão precisar ser reescritas.

**Why P2**: Evita surpresa; não bloqueia o uso.

**Acceptance Criteria**:

1. WHEN um Editor escolhe, no dashboard com widgets ou filtros que têm consulta, uma conexão de outro tipo THEN o sistema SHALL perguntar "Trocar para <nome> (<tipo>)? As consultas estão escritas em <linguagem atual> e precisarão ser reescritas" com os botões "Trocar" e "Cancelar" [SMG-05]
2. WHEN o Editor usa "Cancelar" THEN o sistema SHALL manter a conexão anterior [SMG-06]
3. WHEN o Editor escolhe uma conexão do mesmo tipo THEN o sistema SHALL trocar sem perguntar [SMG-07]
4. WHEN um filtro de seleção tem origem "Consulta" THEN o sistema SHALL mostrar o rótulo "Consulta SQL" ou "Consulta Cypher" conforme o tipo da conexão do dashboard [SMG-08]

**Independent Test**: Num dashboard com widgets Cypher, trocar a conexão para o Postgres e ver a pergunta; cancelar e ver a conexão anterior.

---

## Edge Cases

- IF o driver do banco recusa a conexão por falta de SSL no servidor ou por SSL no cliente THEN o sistema SHALL mostrar a mensagem de erro do banco, como em SRC-07 [SRC-21]
- IF o banco SQL cai no meio de uma consulta THEN o sistema SHALL mostrar "Não foi possível conectar ao banco <nome da conexão>" e não manter conexão aberta [SQX-26]
- WHEN o resultado tem uma coluna binária THEN o sistema SHALL mostrar `<binário N bytes>` no lugar dos bytes [SQX-27]
- WHEN um filtro de seleção múltipla está vazio e a consulta usa `$ids IS NULL OR coluna IN ($ids)` THEN o sistema SHALL devolver todas as linhas [SQX-28]
- IF a conexão é excluída durante uma leitura de schema SQL THEN o sistema SHALL descartar o resultado, como em SCH-29 [SCS-18]
- IF o tipo da conexão não tem driver instalado THEN o sistema SHALL encerrar a inicialização do backend com "Driver não encontrado: <tipo>" no log [SRC-22]

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | SRC-09 a SRC-11, SRC-19, SQX-05 a SQX-09, SQX-12 |
| Failure / partial-failure states | SRC-07, SRC-08, SRC-21, SQX-10, SQX-13, SQX-14, SQX-26, SCS-07, SCS-08, SCS-10 (o schema anterior é mantido) |
| Idempotency / retry / duplicate handling | SCS-11, SAI-05. Criação duplicada de nome: SRC-19 (CONN-22 vale) |
| Auth boundaries & rate limits | SRC-20, SQX-25; o usuário do banco é de leitura (SRC-14, SQX-03, SQX-04). Rate limit N/A because só usuários logados de uma instalação self-hosted alcançam estas rotas, e SQX-10 e SQX-11 limitam o custo de cada consulta |
| Concurrency / ordering | SCS-11, SCS-18; edição simultânea de conexão: a última gravação vale (CONN regra herdada) |
| Data lifecycle / expiry | SCS-10 (substitui), SCS-16 (escolhas sobrevivem); exclusão da conexão apaga o schema (CONN-18 vale). O cache não expira |
| Observability | SQX-24, SCS-17 |
| External-dependency failure | SRC-07, SRC-08, SQX-10, SQX-14, SQX-26, SCS-08 (o banco SQL) |
| State-transition integrity | SCS-11 (lendo → lido ou falhou), SRC-16 (tipo não muda), SMG-05 a SMG-07 (troca de conexão de outro tipo) |

---

## Requirement Traceability

<!-- TRACE:START -->

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SRC-01 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-02 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-03 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-04 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-05 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-06 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-07 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-08 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-09 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-10 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-11 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-12 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-13 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-14 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-15 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-16 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-17 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-18 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-19 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-20 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-21 | P1: Cadastrar uma conexão SQL | - | Pending |
| SRC-22 | P1: Cadastrar uma conexão SQL | - | Pending |
| SQX-01 | P1: Executar SQL somente leitura | - | Pending |
| SQX-02 | P1: Executar SQL somente leitura | - | Pending |
| SQX-03 | P1: Executar SQL somente leitura | - | Pending |
| SQX-04 | P1: Executar SQL somente leitura | - | Pending |
| SQX-05 | P1: Executar SQL somente leitura | - | Pending |
| SQX-06 | P1: Executar SQL somente leitura | - | Pending |
| SQX-07 | P1: Executar SQL somente leitura | - | Pending |
| SQX-08 | P1: Executar SQL somente leitura | - | Pending |
| SQX-09 | P1: Executar SQL somente leitura | - | Pending |
| SQX-10 | P1: Executar SQL somente leitura | - | Pending |
| SQX-11 | P1: Executar SQL somente leitura | - | Pending |
| SQX-12 | P1: Executar SQL somente leitura | - | Pending |
| SQX-13 | P1: Executar SQL somente leitura | - | Pending |
| SQX-14 | P1: Executar SQL somente leitura | - | Pending |
| SQX-15 | P1: Executar SQL somente leitura | - | Pending |
| SQX-16 | P1: Executar SQL somente leitura | - | Pending |
| SQX-17 | P1: Executar SQL somente leitura | - | Pending |
| SQX-18 | P1: Executar SQL somente leitura | - | Pending |
| SQX-19 | P1: Executar SQL somente leitura | - | Pending |
| SQX-20 | P1: Executar SQL somente leitura | - | Pending |
| SQX-21 | P1: Executar SQL somente leitura | - | Pending |
| SQX-22 | P1: Executar SQL somente leitura | - | Pending |
| SQX-23 | P1: Executar SQL somente leitura | - | Pending |
| SQX-24 | P1: Executar SQL somente leitura | - | Pending |
| SQX-25 | P1: Executar SQL somente leitura | - | Pending |
| SQX-26 | P1: Executar SQL somente leitura | - | Pending |
| SQX-27 | P1: Executar SQL somente leitura | - | Pending |
| SQX-28 | P1: Executar SQL somente leitura | - | Pending |
| SCS-01 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-02 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-03 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-04 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-05 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-06 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-07 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-08 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-09 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-10 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-11 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-12 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-13 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-14 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-15 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-16 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-17 | P1: Ler e ver o schema SQL | - | Pending |
| SCS-18 | P1: Ler e ver o schema SQL | - | Pending |
| SAI-01 | P1: A IA escreve a consulta no dialeto | - | Pending |
| SAI-02 | P1: A IA escreve a consulta no dialeto | - | Pending |
| SAI-03 | P1: A IA escreve a consulta no dialeto | - | Pending |
| SAI-04 | P1: A IA escreve a consulta no dialeto | - | Pending |
| SAI-05 | P1: A IA escreve a consulta no dialeto | - | Pending |
| SAI-06 | P1: A IA escreve a consulta no dialeto | - | Pending |
| SAI-07 | P1: A IA escreve a consulta no dialeto | - | Pending |
| SMG-01 | P1: O que existe com Neo4j continua igual | - | Pending |
| SMG-02 | P1: O que existe com Neo4j continua igual | - | Pending |
| SMG-03 | P1: O que existe com Neo4j continua igual | - | Pending |
| SMG-04 | P1: O que existe com Neo4j continua igual | - | Pending |
| SMG-05 | P2: Trocar a conexão para outro tipo | - | Pending |
| SMG-06 | P2: Trocar a conexão para outro tipo | - | Pending |
| SMG-07 | P2: Trocar a conexão para outro tipo | - | Pending |
| SMG-08 | P2: Trocar a conexão para outro tipo | - | Pending |

<!-- TRACE:END -->

**Coverage:** 83 total, 0 mapped to tasks, 83 unmapped ⚠️ (Design e Tasks ainda não rodaram)

---

## Sources

- AD-135 e AD-136 em `.specs/STATE.md` - tipos de banco, formulário e SSL
- `.specs/features/conexoes-schema/spec.md` - cadastro, schema e as regras herdadas (CONN, SCH)
- `.specs/features/dashboards-consultas/spec.md` - execução somente leitura e limites (QRY, TBL)
- `.specs/features/ia-cypher/spec.md` - geração e autocorreção (AIQ, FIX)
- `.specs/features/interatividade/spec.md` - filtros e parâmetros (FLT, XFL)

---

## Success Criteria

- [ ] O Postgres do Sortify é cadastrado pela tela, com tipo, host, porta e SSL, e o schema aparece.
- [ ] Um widget de tabela e um gráfico rodam SQL sobre ele, e um filtro de seleção múltipla com `IN ($nome)` muda o resultado.
- [ ] Uma consulta com `DELETE` é recusada sem chegar ao banco.
- [ ] A suíte de testes que existe antes da feature passa sem mudar nenhuma expectativa Neo4j.
