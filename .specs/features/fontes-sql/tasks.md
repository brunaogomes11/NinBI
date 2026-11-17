# Fontes SQL Tasks

**Approved**: 2026-11-16 - user: "Aprovar"

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas (screens sub-agent, imagens `*.running.png`, walk) está dispensada por AD-023: nenhuma task captura tela; os componentes seguem o design system e as telas existentes.

Pré-requisito: `interatividade` concluída (esta feature toca os mesmos módulos de filtros, parâmetros e prompt) e as sete features anteriores. Quem executa confere os nomes reais (`ConnectionFormDialog`, `SchemaPage`, `CypherEditor`, `DashboardPage`, `FilterEditorDialog`, `useAiGenerations`, `createTestApp`, `FakeNeo4jGateway`, `SchemaReadOptions`) e marca `SPEC_DEVIATION` onde diferirem. A API mantém o nome `cypher` nos campos de consulta (AD-137). O NinBI não conecta em banco do usuário real nos testes: o PostgreSQL de teste é o do compose de dev.

---

**Design**: `.specs/features/fontes-sql/design.md`
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run contracts**: `pnpm --filter @ninbi/contracts test`
**Run api**: `pnpm --filter @ninbi/api test`
**Run web**: `pnpm --filter @ninbi/web test`
**Run apiint**: `pnpm --filter @ninbi/api test:int`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo script `test` roda `vitest run --reporter=verbose`. Todo nome de teste começa com o ID do requisito e contém, na ordem, as palavras da linha de `Proof` da sua check (sem o `✓`). Se o runner imprimir outro marcador de sucesso, a linha da check é corrigida a partir da saída real, nunca o teste. `apiint` pede `pnpm infra:up` (PostgreSQL e Neo4j do compose de dev).

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012, AD-026 (testes rápidos com PGlite e fakes, nomes começando pelo ID do requisito, `--reporter=verbose`), AD-031, e as matrizes aprovadas de `conexoes-schema` e `dashboards-consultas`. Strong defaults applied onde não há guia.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contratos (conexão por tipo, tokenizador SQL, parâmetros) | unit | Toda regra de campo com o texto exato da mensagem; casos no limite | `packages/contracts/src/**/*.spec.ts` | `pnpm --filter @ninbi/contracts test` |
| API: funções puras (validador, parâmetros, valores, literal, dialetos, leitor de schema com `FakeSqlGateway`, prompt) | unit | Todos os ramos; 1:1 com os ACs | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: gateways dos drivers | unit (cliente falso injetado) | Transação, prazo, limite de linhas, tipos, SSL; um teste por critério e por banco | `apps/api/test/sources/gateways/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: services e rotas | integration (supertest + PGlite + `FakeNeo4jGateway` + `FakeSqlGateway`) | Toda rota tocada: sucesso + cada erro do design + 403/404 | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: PostgreSQL real | integration (compose de dev) | Prazo, leitura-somente, schema, tipos, filtro vazio | `apps/api/test-int/*.int.spec.ts` | `pnpm --filter @ninbi/api test:int` |
| Banco (colunas novas, migração) | integration (PGlite) | Migração aplica; linhas antigas viram Neo4j | `apps/api/test/database/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Web: funções puras (rascunho, rótulos) | unit | Todos os ramos | `apps/web/src/features/**/*.test.ts` | `pnpm --filter @ninbi/web test` |
| Web: componentes e páginas | unit (Testing Library + jsdom + user-event + MSW) | Gesto do critério e o que a tela mostra; textos exatos | `apps/web/src/features/**/*.test.tsx` | `pnpm --filter @ninbi/web test` |
| Config, compose, tipos | none | - (gate de build) | - | build gate |

## Gate Check Commands

> Generated from the design - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task com testes de um só pacote | `pnpm --filter <pacote da task> test` |
| Full | Task com teste real contra o PostgreSQL | `pnpm --filter @ninbi/api test:int` (com `pnpm infra:up`) |
| Build | Última task de cada fase | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Lotes de execução

Fases empacotadas em lotes de cerca de 7 tasks (fases inteiras). Cada lote tem um worker; os lotes rodam em sequência.

| Lote | Fases | Tasks |
| ---- | ----- | ----- |
| 1 | 1 | T1 a T6 |
| 2 | 2 | T7 a T12 |
| 3 | 3 e 4 | T13 a T20 |
| 4 | 5 | T22 a T29 |
| 5 | 6 e 7 | T30 a T39 |

### Phase 1: Contratos e banco

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Blocos SQL puros

```
T6 → T7 → T8 → T9 → T10 → T11 → T12
```

### Phase 3: Fontes

```
T12 → T13 → T14 → T15 → T16
```

### Phase 4: Gateways dos drivers

```
T16 → T17 → T18 → T19 → T20
```

### Phase 5: Serviços da API

```
T20 → T22 → T23 → T24 → T25 → T26 → T27 → T28 → T29
```

### Phase 6: Web

```
T29 → T30 → T31 → T32 → T33 → T34 → T35 → T36 → T37 → T38
```

### Phase 7: Fechamento

```
T38 → T39
```

---

## Task Breakdown

### T1: Contratos da conexão por tipo

**What**: `packages/contracts/src/connections.ts`: `CONNECTION_TYPES` (`NEO4J`, `POSTGRES`, `MYSQL`, `SQLSERVER`, nessa ordem), `CONNECTION_TYPE_LABELS` ("Neo4j", "PostgreSQL", "MySQL", "SQL Server"), `SQL_DEFAULT_PORTS` (5432, 3306, 1433), `QueryLanguage`, `connectionLanguage(type)`; `ConnectionDto` com `type`, `host`, `port`, `ssl` e `uri` anulável; `connectionCreateSchema` e `connectionUpdateSchema` como união por `type` (ausente vale `NEO4J`, e o formato de hoje do Neo4j fica igual); campos SQL `host` (recusa vazio, com espaço ou `://`), `port` (inteiro de 1 a 65535), `database` obrigatório, `ssl` booleano, `username`, `password`. Mensagens em `MESSAGES`: "Host inválido", "Porta inválida", "Informe o banco". Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/connections.ts`
**Depends on**: None
**Reuses**: `connectionCreateSchema`, `MESSAGES`, `zod`
**Requirement**: SRC-01, SRC-03, SRC-09, SRC-10, SRC-11, SRC-19, SMG-01

**Done when**:

- [x] Teste `SRC-01 tipos de conexão na ordem da spec` em packages/contracts
- [x] Teste `SRC-03 porta padrão de cada tipo SQL` em packages/contracts
- [x] Teste `SRC-09 host vazio, com espaços ou com :// é recusado` em packages/contracts
- [x] Teste `SRC-10 porta fora de 1 a 65535 é recusada` em packages/contracts
- [x] Teste `SRC-11 banco vazio em conexão SQL é recusado` em packages/contracts
- [x] Teste `SRC-19 nome inválido de conexão SQL usa a mensagem do nome` em packages/contracts
- [x] Teste `SMG-01 criação sem tipo vale Neo4j e mantém a URI` em packages/contracts
- [x] Os testes de `connections.spec.ts` que existem continuam verdes sem mudar nenhuma expectativa (CONN-10 a CONN-12 de Neo4j)
- [x] Gate check passes: `pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add connection types with SQL host, port and SSL fields`

---

### T2: Contrato do schema relacional

**What**: `packages/contracts/src/schemas.ts`: `RelationalSchemaDto` (`kind: 'RELATIONAL'`, `tables` com `name`, `isView`, `columns` de `name`, `type`, `example`, `sendExample`, e `foreignKeys` de `from` e `to` com tabela e colunas), `SchemaDto = ConnectionSchemaDto | RelationalSchemaDto`, `isRelationalSchema(dto)`; `ExampleSetting` aceita `elementKind: 'TABLE'` com o nome da tabela e o da coluna. O DTO de grafo fica exatamente como hoje. Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/schemas.ts`
**Depends on**: T1
**Reuses**: `ConnectionSchemaDto`, `exampleSettingSchema`
**Requirement**: SCS-16

**Done when**:

- [x] Teste `SCS-16 ajuste de exemplo aceita o elemento TABLE` em packages/contracts
- [x] Os testes de `schemas.spec.ts` que existem continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add the relational schema dto and the TABLE example setting`

---

### T3: Tipo da conexão no dashboard

**What**: `packages/contracts/src/dashboards.ts`: `DashboardDto.connectionType: ConnectionType`. Só o tipo; o preenchimento é da T27.
**Where**: `packages/contracts/src/dashboards.ts`
**Depends on**: T2
**Reuses**: `ConnectionType` de `connections.ts`
**Requirement**: SMG-05

**Done when**:

- [x] `pnpm --filter @ninbi/contracts build` compila e os testes de contrato que existem continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: none
**Gate**: quick
**Model**: haiku
**Commit**: `feat(contracts): add connectionType to the dashboard dto`

---

### T4: Tokenizador de SQL

**What**: `packages/contracts/src/sql-tokens.ts`: `tokenizeSql(sql): SqlToken[]` com `type` (`word`, `string`, `identifier`, `param`, `number`, `symbol`, `semicolon`), `value`, `start` e `end`. Comentários `--` e `/* */` ficam de fora; strings `'...'` com `''`, `N'...'` e `E'...'`; identificadores `"..."`, `[...]` e crases; parâmetro é `$` seguido de letra ou `_`, nunca `$1` nem `$$`. Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/sql-tokens.ts`
**Depends on**: T3
**Reuses**: a forma de `tokenizeCypher` em `cypher-tokens.ts`
**Requirement**: SQX-08, SQX-16

**Done when**:

- [x] Teste `SQX-08 comentários e strings de SQL ficam fora das palavras` em packages/contracts
- [x] Teste `SQX-16 $nome em string, comentário ou identificador não é parâmetro` em packages/contracts
- [x] Teste `SQX-16 $1 e $$ não são parâmetros e $nome é` em packages/contracts
- [x] Gate check passes: `pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): tokenize sql with positions`

---

### T5: Parâmetros por linguagem

**What**: `packages/contracts/src/cypher-tokens.ts`: `extractParameterNames(query, language: QueryLanguage = 'CYPHER')`; `'SQL'` usa `tokenizeSql`. Sem o segundo argumento, o resultado é o de hoje.
**Where**: `packages/contracts/src/cypher-tokens.ts`
**Depends on**: T4
**Reuses**: `tokenizeSql`
**Requirement**: SQX-16, SMG-03

**Done when**:

- [x] Teste `SMG-03 extractParameterNames sem linguagem segue o Cypher` em packages/contracts
- [x] `extractParameterNames('SELECT $a, $b', 'SQL')` devolve `['a', 'b']` sem repetir nomes
- [x] Gate check passes: `pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): extract parameter names by query language`

---

### T6: Migração das conexões por tipo

**What**: `apps/api/src/database/schema.ts` e a migração gerada `apps/api/drizzle/0006_fontes_sql.sql`: enum `connection_type`; `connections` ganha `type` (padrão `NEO4J`, não nulo), `host`, `port`, `ssl` (padrão `false`) e `uri` passa a aceitar nulo; o enum `schema_element_kind` ganha `TABLE`. Rodar `drizzle-kit generate` e conferir o SQL. Nenhuma linha existente é alterada além dos padrões.
**Where**: `apps/api/src/database/schema.ts`
**Depends on**: T5
**Reuses**: `connections`, `schemaElementKindEnum`, as migrações 0001 a 0005
**Requirement**: SMG-01, SMG-02

**Done when**:

- [x] Teste `SMG-01 migração marca as conexões existentes como Neo4j` em `apps/api/test/database/connections-schema.spec.ts` (insere uma linha no formato antigo antes da 0006, aplica a 0006 em PGlite e lê `type = NEO4J`, `host`, `port` nulos, `ssl = false`, `uri` e senha iguais)
- [x] Teste `SMG-02 migração mantém o texto das consultas` em `apps/api/test/database/dashboards-schema.spec.ts` (o `cypher` de um widget e o de um filtro seguem iguais)
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add connection type, host, port and ssl columns`

---

### T7: Validador de SQL somente leitura

**What**: `apps/api/src/queries/read-only-sql.ts`: `validateReadOnlySql(query): QueryCheck` com `QUERY_TOO_LONG`, `QUERY_NOT_SELECT`, `QUERY_MULTIPLE_STATEMENTS` e `QUERY_WRITE_BLOCKED`. Aceita só consulta que começa por `SELECT` ou `WITH` (ignorando espaços e comentários); recusa as palavras `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `EXEC`, `EXECUTE`, `CALL`, `COPY`, `SET`, `DO`, `INTO`, `DECLARE`, `WAITFOR`, `OPENROWSET`, `OPENQUERY`, `LOCK` e o par `FOR UPDATE`, sem diferenciar maiúsculas, fora de strings, comentários e identificadores, e não quando a palavra vem depois de `.` ou é parte de um nome maior. Mensagens: "Somente consultas de leitura são permitidas. Comece por SELECT ou WITH", "Somente consultas de leitura são permitidas. Cláusula bloqueada: <palavra>", "Envie uma consulta por vez", "A consulta passa de 20.000 caracteres".
**Where**: `apps/api/src/queries/read-only-sql.ts`
**Depends on**: T6
**Reuses**: `read-only-cypher.ts` (estrutura e códigos), `tokenizeSql`
**Requirement**: SQX-05, SQX-06, SQX-07, SQX-08, SQX-09, SQX-12

**Done when**:

- [x] Teste `SQX-05 consulta que não começa por SELECT ou WITH é recusada` em apps/api/test
- [x] Teste `SQX-06 palavra bloqueada fora de strings e comentários é recusada com a cláusula` em apps/api/test
- [x] Teste `SQX-07 palavras bloqueadas valem sem diferenciar maiúsculas` em apps/api/test
- [x] Teste `SQX-08 palavra bloqueada em string, comentário, identificador ou nome maior é aceita` em apps/api/test
- [x] Teste `SQX-09 mais de uma instrução separada por ponto e vírgula é recusada` em apps/api/test
- [x] Teste `SQX-12 consulta SQL com mais de 20.000 caracteres é recusada` em apps/api/test
- [x] Os testes de `read-only-cypher` continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): validate read-only sql queries`

---

### T8: Parâmetros do driver para SQL

**What**: `apps/api/src/queries/sql-params.ts`: `bindSqlParams(sql, params, style: 'dollar' | 'question' | 'at'): { text; values }`. Antes de tudo, `$nome IS NULL` e `$nome IS NOT NULL` viram `(1 = 1)` ou `(1 = 0)` conforme o valor ser nulo ou não; depois cada `$nome` vira `$1`, `?` ou `@p1` (no estilo `question` o valor entra uma vez por ocorrência, na ordem); lista vira um marcador por item separados por vírgula, e lista vazia vira `NULL`; `{ kind: 'date', value }` vira o texto `AAAA-MM-DD`; nome sem valor vai como `null`; `$` dentro de string, comentário ou identificador não é tocado.
**Where**: `apps/api/src/queries/sql-params.ts`
**Depends on**: T7
**Reuses**: `tokenizeSql` (posições), `cypher-params.ts` (forma dos valores)
**Requirement**: SQX-15, SQX-17, SQX-18, SQX-19, SQX-20, SQX-28

**Done when**:

- [x] Teste `SQX-15 $nome vira parâmetro do driver sem colar o valor` em apps/api/test
- [x] Teste `SQX-17 parâmetro sem valor vai como null` em apps/api/test
- [x] Teste `SQX-18 $nome IS NULL e IS NOT NULL viram condição constante` em apps/api/test
- [x] Teste `SQX-19 lista vira um parâmetro por item e lista vazia vira NULL` em apps/api/test
- [x] Teste `SQX-20 data AAAA-MM-DD vai como texto de data` em apps/api/test
- [x] Teste `SQX-28 filtro vazio com IS NULL OR IN vira condição verdadeira` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): bind sql parameters for postgres, mysql and sql server`

---

### T9: Valores do resultado SQL

**What**: `apps/api/src/queries/sql-result-value.ts`: `toSqlResultValue(value): ResultValue` (nulo, booleano, texto e número como vieram; `bigint` fora do intervalo seguro vira `{ kind: 'bigint' }`; decimal que não cabe exato vira texto; `Buffer` vira `<binário N bytes>`; objeto e lista viram `{ kind: 'json' }`) e `uniqueColumnNames(keys): string[]` (`_2`, `_3` a partir da segunda). Data e data com hora já chegam como texto do gateway.
**Where**: `apps/api/src/queries/sql-result-value.ts`
**Depends on**: T8
**Reuses**: `result-value.ts`, `ResultValue`
**Requirement**: SQX-21, SQX-22, SQX-23, SQX-27

**Done when**:

- [x] Teste `SQX-21 tipos do resultado SQL viram ResultValue` em apps/api/test
- [x] Teste `SQX-22 inteiro fora do intervalo vira bigint e decimal inexato vira texto` em apps/api/test
- [x] Teste `SQX-23 colunas repetidas ganham _2 e _3` em apps/api/test
- [x] Teste `SQX-27 binário vira <binário N bytes>` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): map sql values to result values`

---

### T10: Literal SQL do exemplo

**What**: `apps/api/src/schema/sql-literal.ts`: `toSqlLiteral(value): string | null`: texto e data entre aspas simples com `'` dobrado, número e booleano sem aspas, binário como `'<binário N bytes>'`, objeto como texto JSON entre aspas, nulo como `null` (sem exemplo).
**Where**: `apps/api/src/schema/sql-literal.ts`
**Depends on**: T9
**Reuses**: `cypher-literal.ts`
**Requirement**: SCS-14

**Done when**:

- [x] Teste `SCS-14 exemplo de texto, número e data vira literal SQL` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): render schema examples as sql literals`

---

### T11: Dialetos SQL

**What**: `apps/api/src/sources/dialects.ts`: `SqlDialect` e as constantes `POSTGRES_DIALECT`, `MYSQL_DIALECT` e `SQLSERVER_DIALECT` com `placeholder` (`dollar`, `question`, `at`), `quote(identifier)` (`"a"`, `` `a` ``, `[a]`, com o fechamento dobrado), `sampleQuery(table, n)` (`SELECT * FROM <t> LIMIT n` ou `SELECT TOP n * FROM <t>`), `qualifiedNames` (verdadeiro no PostgreSQL e no SQL Server), `catalogQueries.tables` e `.foreignKeys` (PostgreSQL por `pg_catalog` com `format_type`, MySQL e SQL Server por `INFORMATION_SCHEMA`/`sys`; cada uma exclui `information_schema`, `pg_catalog`, `pg_toast`, `sys`, `INFORMATION_SCHEMA`, `mysql` e `performance_schema`; no MySQL só o banco da conexão), `syntaxErrorCodes` (PostgreSQL `42601`, `42703`, `42P01`; MySQL `1064`, `1054`, `1146`; SQL Server `102`, `207`, `208`), `label` ("PostgreSQL", "MySQL", "T-SQL"), `defaultPort`.
**Where**: `apps/api/src/sources/dialects.ts`
**Depends on**: T10
**Reuses**: `SQL_DEFAULT_PORTS`
**Requirement**: SCS-03, SCS-06

**Done when**:

- [x] Teste `SCS-03 consultas de catálogo excluem os schemas do sistema` em apps/api/test
- [x] Teste `SCS-06 dialetos declaram nomes qualificados só no PostgreSQL e no SQL Server` em apps/api/test
- [x] Teste `quote` dobra o fechamento do identificador nos três dialetos e `sampleQuery` usa `LIMIT` ou `TOP` conforme o dialeto, em `apps/api/test/sources/dialects.spec.ts`
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): describe the three sql dialects`

---

### T12: Leitor de schema SQL

**What**: `apps/api/src/schema/sql-schema-reader.ts`: `SqlSchemaReader.read(gateway, cfg, dialect, options): Promise<StoredRelationalSchema>` e os tipos `StoredRelationalSchema` em `types.ts` do mesmo diretório (documento com `kind: 'RELATIONAL'`, `tables` e `foreignKeys`). Lê tabelas e colunas e depois as chaves estrangeiras pelas consultas do dialeto, só por `gateway.read`; nomeia `schema.tabela` quando `dialect.qualifiedNames`; para cada tabela lê `dialect.sampleQuery(tabela, 100)` e guarda por coluna o primeiro valor não nulo como `toSqlLiteral`; erro nessa leitura deixa a tabela sem exemplos e segue; erro no catálogo falha a leitura com a mensagem do banco; respeita `deadline` e `signal`. Cria `apps/api/test/fakes/fake-sql.gateway.ts` (respostas roteirizadas por texto da consulta) para os testes.
**Where**: `apps/api/src/schema/sql-schema-reader.ts`
**Depends on**: T11
**Reuses**: `schema-reader.ts` (estrutura, `SchemaReadOptions`)
**Requirement**: SCS-02, SCS-04, SCS-05, SCS-06, SCS-07, SCS-08, SCS-09

**Done when**:

- [x] Teste `SCS-02 leitura guarda tabelas, views e colunas com o tipo` em apps/api/test
- [x] Teste `SCS-04 exemplo é o primeiro valor não nulo das primeiras 100 linhas` em apps/api/test
- [x] Teste `SCS-05 chave estrangeira composta vira par de tabela e colunas` em apps/api/test
- [x] Teste `SCS-06 nome qualificado no PostgreSQL e no SQL Server e simples no MySQL` em apps/api/test
- [x] Teste `SCS-07 tabela sem permissão de leitura fica sem exemplo e a leitura conclui` em apps/api/test
- [x] Teste `SCS-08 catálogo ilegível falha a leitura com a mensagem do banco` em apps/api/test
- [x] Teste `SCS-09 a leitura do schema só usa gateway.read` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): read tables, columns, examples and foreign keys of sql databases`

---

### T13: Contrato da fonte e erros

**What**: `apps/api/src/sources/source.ts`: `Source`, `SourceConnection`, `SourceResult`, `SourceReadOptions`, `PromptDialect`, `SourceTimeoutError`, `SourceGatewayError(message, code?)`; em `neo4j.gateway.ts`, `Neo4jTimeoutError` e `Neo4jGatewayError` passam a estender as novas, sem mudar `name` nem mensagem.
**Where**: `apps/api/src/sources/source.ts`
**Depends on**: T12
**Reuses**: `neo4j.gateway.ts`
**Requirement**: SRC-22

**Done when**:

- [x] Teste `SRC-22 erros do Neo4j são SourceTimeoutError e SourceGatewayError` em `apps/api/test/sources/source.spec.ts` (instanceof nos dois sentidos, `name` e `message` iguais aos de antes)
- [x] Os testes de `driver-neo4j.gateway.spec.ts` continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add the source contract and base source errors`

---

### T14: Registro de fontes

**What**: `apps/api/src/sources/source-registry.ts` e `sources.module.ts`: `SourceRegistry` recebe a lista de fontes por injeção, `for(type)` devolve a fonte e, se um tipo de `CONNECTION_TYPES` não tem fonte, a inicialização falha com `Driver não encontrado: <tipo>` no log. O módulo é global e substitui o `Neo4jModule` no `AppModule` mantendo `NEO4J_GATEWAY` exportado.
**Where**: `apps/api/src/sources/source-registry.ts`
**Depends on**: T13
**Reuses**: `neo4j.module.ts`
**Requirement**: SRC-22

**Done when**:

- [x] Teste `SRC-22 registro sem fonte para um tipo falha com Driver não encontrado` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add the source registry`

---

### T15: Fonte Neo4j

**What**: `apps/api/src/sources/neo4j.source.ts`: implementa `Source` para `NEO4J` embrulhando o que existe: `verify` pelo gateway, `validate` por `validateReadOnlyCypher`, `parameterNames` por `extractParameterNames(q, 'CYPHER')`, `run` por `toCypherParams`, o gateway e `toResultValue`, `readSchema` por `SchemaReader`, `dialect` "Cypher". Sem mudar lógica.
**Where**: `apps/api/src/sources/neo4j.source.ts`
**Depends on**: T14
**Reuses**: `validateReadOnlyCypher`, `toCypherParams`, `toResultValue`, `SchemaReader`, `FakeNeo4jGateway`
**Requirement**: SMG-03

**Done when**:

- [x] Teste `SMG-03 Neo4jSource devolve o mesmo resultado que o QueryService devolvia` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): wrap neo4j access in a source`

---

### T16: Fonte SQL

**What**: `apps/api/src/sources/sql.source.ts`: `SqlSource(type, gateway: SqlGateway, dialect)`. `verify` pelo gateway; `validate` por `validateReadOnlySql`; `parameterNames` por `extractParameterNames(q, 'SQL')`; `run` aplica `bindSqlParams` no estilo do dialeto e chama `gateway.read`, devolvendo `SourceResult` com `uniqueColumnNames`; `readSchema` por `SqlSchemaReader`; um `SourceGatewayError` com código de rede (`ECONNRESET`, `ETIMEDOUT`, `ESOCKET`, `ECONNREFUSED`, `EPIPE`, `08xxx`) é marcado como indisponibilidade. Define `SqlGateway` e `SqlConnectionConfig` em `apps/api/src/sources/gateways/sql.gateway.ts`.
**Where**: `apps/api/src/sources/sql.source.ts`
**Depends on**: T15
**Reuses**: `bindSqlParams`, `validateReadOnlySql`, `SqlSchemaReader`, `uniqueColumnNames`, `FakeSqlGateway`
**Requirement**: SQX-15, SQX-26

**Done when**:

- [x] Teste `SQX-26 erro de rede do driver é indisponibilidade` em apps/api/test
- [x] Teste `SQX-15 SqlSource envia ao gateway texto e valores separados` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): add the sql source`

---

### T17: Gateway PostgreSQL

**What**: `apps/api/src/sources/gateways/pg.gateway.ts`: `PgGateway implements SqlGateway` (instala `pg-cursor`). `verify` (`SELECT 1`) e `read`: uma conexão por operação, `BEGIN TRANSACTION READ ONLY`, `SET LOCAL statement_timeout`, leitura em fluxo por cursor até `maxRows`, `ROLLBACK`, fechamento da conexão (sem esperar quando o prazo estourou); o temporizador do gateway decide o prazo e cancela por `AbortSignal`. `ssl: true` abre com `ssl: { rejectUnauthorized: true }`, `false` com `ssl: false`. Os parsers de `date` e `timestamp` devolvem texto (`AAAA-MM-DD`, ISO sem `Z`), `timestamptz` vira ISO em UTC, `numeric` vira número exato ou texto, `bytea` chega como `Buffer`. A construção da configuração do cliente é uma função pura (`pgClientConfig`) e o cliente entra por uma fábrica injetável para os testes.
**Where**: `apps/api/src/sources/gateways/pg.gateway.ts`
**Depends on**: T16
**Reuses**: `DriverNeo4jGateway` (prazo, sinal, fechamento), `toSqlResultValue`
**Requirement**: SQX-03, SQX-04, SQX-10, SQX-11, SQX-21, SRC-12, SRC-13

**Done when**:

- [x] Teste `SQX-03 PostgreSQL consulta termina em ROLLBACK e fecha a conexão` em apps/api/test
- [x] Teste `SQX-04 PostgreSQL abre a transação em modo leitura` em apps/api/test
- [x] Teste `SQX-10 PostgreSQL aplica o prazo e cancela ao estourar` em apps/api/test
- [x] Teste `SQX-11 PostgreSQL para a leitura em maxRows` em apps/api/test
- [x] Teste `SQX-21 PostgreSQL converte data, data com hora e decimal` em apps/api/test
- [x] Teste `SRC-12 PostgreSQL com SSL criptografa e valida o certificado` em apps/api/test
- [x] Teste `SRC-13 PostgreSQL sem SSL abre a conexão sem criptografia` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): add the postgres gateway`

---

### T18: Gateway MySQL

**What**: `apps/api/src/sources/gateways/mysql.gateway.ts`: `MysqlGateway implements SqlGateway` (instala `mysql2`). Mesma forma do PostgreSQL: `START TRANSACTION READ ONLY`, `SET SESSION max_execution_time`, fluxo até `maxRows`, `ROLLBACK`, fechamento. `ssl: true` abre com `ssl: { rejectUnauthorized: true }`, `false` sem `ssl`. `dateStrings`/`typeCast` entregam `DATE` como `AAAA-MM-DD`, `DATETIME` como ISO sem `Z` e `TIMESTAMP` como ISO em UTC (sessão em `+00:00`); `DECIMAL` como número exato ou texto; `bigint` como `bigint`. `mysqlConnectionOptions` é função pura; a conexão entra por fábrica injetável.
**Where**: `apps/api/src/sources/gateways/mysql.gateway.ts`
**Depends on**: T17
**Reuses**: `PgGateway`
**Requirement**: SQX-03, SQX-04, SQX-10, SQX-11, SQX-21, SRC-12, SRC-13

**Done when**:

- [x] Teste `SQX-03 MySQL consulta termina em ROLLBACK e fecha a conexão` em apps/api/test
- [x] Teste `SQX-04 MySQL abre a transação em modo leitura` em apps/api/test
- [x] Teste `SQX-10 MySQL aplica o prazo e cancela ao estourar` em apps/api/test
- [x] Teste `SQX-11 MySQL para a leitura em maxRows` em apps/api/test
- [x] Teste `SQX-21 MySQL converte data, data com hora e decimal` em apps/api/test
- [x] Teste `SRC-12 MySQL com SSL criptografa e valida o certificado` em apps/api/test
- [x] Teste `SRC-13 MySQL sem SSL abre a conexão sem criptografia` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): add the mysql gateway`

---

### T19: Gateway SQL Server

**What**: `apps/api/src/sources/gateways/mssql.gateway.ts`: `MssqlGateway implements SqlGateway` (instala `mssql`). O SQL Server não tem transação de leitura: `BEGIN TRANSACTION`, a consulta com parâmetros nomeados `@p1...`, `ROLLBACK` sempre; `requestTimeout` mais `request.cancel()` ao estourar o prazo ou o sinal; fluxo (`request.stream`) até `maxRows`. `ssl: true` abre com `encrypt: true` e `trustServerCertificate: false`, `false` com `encrypt: false`. `datetimeoffset` vira ISO em UTC, `datetime`, `datetime2` e `smalldatetime` viram ISO sem `Z`, `date` vira `AAAA-MM-DD`, `decimal` número exato ou texto, `varbinary` chega como `Buffer`; `{ kind: 'date' }` chega ao banco como `sql.Date`. `mssqlConfig` é função pura; a conexão entra por fábrica injetável.
**Where**: `apps/api/src/sources/gateways/mssql.gateway.ts`
**Depends on**: T18
**Reuses**: `PgGateway`
**Requirement**: SQX-03, SQX-10, SQX-11, SQX-21, SRC-12, SRC-13

**Done when**:

- [x] Teste `SQX-03 SQL Server consulta termina em ROLLBACK e fecha a conexão` em apps/api/test
- [x] Teste `SQX-03 SQL Server não tem modo leitura e depende do ROLLBACK e do validador` em apps/api/test
- [x] Teste `SQX-10 SQL Server aplica o prazo e cancela ao estourar` em apps/api/test
- [x] Teste `SQX-11 SQL Server para a leitura em maxRows` em apps/api/test
- [x] Teste `SQX-21 SQL Server converte data, data com hora e decimal` em apps/api/test
- [x] Teste `SRC-12 SQL Server com SSL criptografa e valida o certificado` em apps/api/test
- [x] Teste `SRC-13 SQL Server sem SSL abre a conexão sem criptografia` em apps/api/test
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): add the sql server gateway`

---

### T20: Teste real contra o PostgreSQL do compose

**What**: `apps/api/test-int/sql-pg.int.spec.ts`: cria o banco `ninbi_sql_fixture` no PostgreSQL do compose de dev, com as tabelas `clientes` e `pedidos` (chave estrangeira `pedidos.cliente_id`), uma view, uma tabela em outro schema e colunas de cada tipo da spec; roda `PgGateway` e `SqlSource` de verdade e apaga o banco no fim. Cobre prazo, escrita recusada em transação de leitura, leitura do schema, tipos e o filtro vazio.
**Where**: `apps/api/test-int/sql-pg.int.spec.ts`
**Depends on**: T19
**Reuses**: `apps/api/test-int/harness.ts`, `PgGateway`, `SqlSource`
**Requirement**: SQX-04, SQX-10, SQX-21, SQX-28, SCS-03

**Done when**:

- [x] Teste `SQX-28 filtro vazio devolve todas as linhas no PostgreSQL real` em apps/api/test-int
- [x] Teste `SQX-04 PostgreSQL real recusa escrita em transação de leitura` em apps/api/test-int
- [x] Teste `SCS-03 PostgreSQL real lista só schemas de usuário com views e chaves estrangeiras` em apps/api/test-int
- [x] Teste `SQX-21 PostgreSQL real devolve os tipos da spec` em apps/api/test-int
- [x] Teste `SQX-10 PostgreSQL real cancela consulta lenta` em apps/api/test-int
- [x] Requer `pnpm infra:up`
- [x] Gate check passes: `pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `test(api): exercise the postgres source against a real database`

---

### T22: QueryService pelo registro

**What**: `apps/api/src/queries/query.service.ts`: troca `NEO4J_GATEWAY`, `validateReadOnlyCypher`, `extractParameterNames` e `toCypherParams` por `SourceRegistry`. Lê o `type` da conexão, decifra a senha, monta `SourceConnection`, valida com `source.validate`, preenche com `null` os `source.parameterNames` sem valor, executa com `source.run` e aplica o limite de linhas e a tradução de erros por `SourceTimeoutError` e `SourceGatewayError` (código de rede indisponível; prazo; erro do banco `QUERY_FAILED`). `SOURCE_UNAVAILABLE` vale para SQL e `NEO4J_UNAVAILABLE` continua para Neo4j. O log ganha `type`.
**Where**: `apps/api/src/queries/query.service.ts`
**Depends on**: T20
**Reuses**: o corpo atual do serviço
**Requirement**: SQX-10, SQX-11, SQX-13, SQX-14, SQX-17, SQX-24, SQX-25, SMG-03

**Done when**:

- [x] Teste `SQX-10 consulta que passa de 30 s mostra o tempo limite` em apps/api/test
- [x] Teste `SQX-11 resultado acima de 5.000 linhas devolve as primeiras e avisa` em apps/api/test
- [x] Teste `SQX-13 erro do banco SQL aparece a quem edita e genérico a quem só vê` em apps/api/test
- [x] Teste `SQX-14 banco SQL inacessível mostra o nome da conexão` em apps/api/test
- [x] Teste `SQX-17 QueryService executa $nome sem valor com null` em apps/api/test
- [x] Teste `SQX-24 log de execução traz o tipo e não traz as linhas` em apps/api/test
- [x] Teste `SQX-25 SQL enviado como texto por quem não edita responde 403` em apps/api/test
- [x] Teste `SMG-03 consulta Cypher passa pelo registro com o mesmo resultado` em apps/api/test
- [x] Todos os testes de `apps/api/test/queries/` seguem verdes sem mudar expectativa de Neo4j
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: opus
**Commit**: `refactor(api): run queries through the source registry`

---

### T23: Código de erro do banco para a IA

**What**: `apps/api/src/common/app-error.ts` e o consumo: `neo4jCode` vira `dbCode`; `query.service.ts`, `ai-widget.service.ts` e `widget-prompt.ts` passam a usar `dbCode`. `errorText` escolhe o conjunto de códigos de sintaxe pelo dialeto: erro de sintaxe ou semântico segue com a mensagem, outro erro de execução segue só com o código.
**Where**: `apps/api/src/common/app-error.ts`
**Depends on**: T22
**Reuses**: `errorText` em `widget-prompt.ts`
**Requirement**: SQX-13

**Done when**:

- [x] Teste `SQX-13 dbCode segue ao prompt e erro de execução SQL vai só com o código` em apps/api/test
- [x] Os testes de `ai-widget` e de `queries-service-ai` seguem verdes (só a propriedade renomeada muda nas expectativas)
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `refactor(api): rename neo4jCode to dbCode`

---

### T24: ConnectionsService por tipo

**What**: `apps/api/src/connections/connections.service.ts`: `create` e `update` aceitam a união por `type`; testam pela fonte do tipo (`source.verify`) com o prazo de 10 s, gravam `type`, `host`, `port`, `ssl`, `uri` anulável e a senha cifrada; `update` recusa mudança de `type` com 422 `CONNECTION_TYPE_LOCKED` e "O tipo da conexão não muda"; falha de verificação e prazo viram 422 (`SOURCE_UNAVAILABLE`/`SOURCE_TIMEOUT` para SQL; os de hoje para Neo4j) com a mensagem do banco; `toConnectionDto` devolve `type`, `host`, `port`, `ssl`; `create` SQL inicia a leitura do schema. Atualiza em `connections.controller.ts` o que for preciso para as novas formas.
**Where**: `apps/api/src/connections/connections.service.ts`
**Depends on**: T23
**Reuses**: `create`, `update`, `verify` atuais
**Requirement**: SRC-05, SRC-06, SRC-07, SRC-08, SRC-16, SRC-17, SRC-18, SRC-19, SRC-20, SRC-21, SCS-01

**Done when**:

- [ ] Teste `SRC-05 criar conexão SQL testa antes de salvar` em apps/api/test
- [ ] Teste `SRC-06 teste que passa salva e a conexão aparece na lista` em apps/api/test
- [ ] Teste `SRC-07 teste que falha não salva e devolve a mensagem do banco` em apps/api/test
- [ ] Teste `SRC-08 banco SQL que não responde em 10 s devolve a mensagem de prazo` em apps/api/test
- [ ] Teste `SRC-16 trocar o tipo de uma conexão é recusado` em apps/api/test
- [ ] Teste `SRC-17 editar conexão SQL sem senha mantém a senha e testa de novo` em apps/api/test
- [ ] Teste `SRC-18 senha SQL fica criptografada e nunca volta na resposta` em apps/api/test
- [ ] Teste `SRC-19 nome repetido de conexão SQL é recusado com a mensagem no campo` em apps/api/test
- [ ] Teste `SRC-20 Editor e Visualizador recebem 403 ao gerir conexão SQL` em apps/api/test
- [ ] Teste `SRC-21 mensagem do driver sobre SSL chega ao formulário` em apps/api/test
- [ ] Teste `SCS-01 criar conexão SQL inicia a leitura do schema` em apps/api/test
- [ ] Os testes de `apps/api/test/connections/` de Neo4j seguem verdes (só a forma do DTO ganha os campos novos)
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): create and edit connections of every type`

---

### T25: Atualização do schema pelo registro

**What**: `apps/api/src/schema/schema-refresh.service.ts`: a leitura passa a ser `source.readSchema`; grava o documento relacional ou de grafo no lugar do anterior; mantém o anterior em falha e em 120 s; um pedido com leitura em andamento devolve o estado; descarta o resultado se a conexão foi excluída; o apagamento de opt-outs de elementos que sumiram cobre `TABLE` por tabela e por coluna; o log traz `type`, duração e as contagens (tabelas e relações, ou labels e tipos de relacionamento), sem exemplos.
**Where**: `apps/api/src/schema/schema-refresh.service.ts`
**Depends on**: T24
**Reuses**: a máquina de estado atual
**Requirement**: SCS-10, SCS-11, SCS-16, SCS-17, SCS-18

**Done when**:

- [ ] Teste `SCS-10 leitura grava no lugar do schema anterior e falha ou 120 s o mantém` em apps/api/test
- [ ] Teste `SCS-11 leitura em andamento não inicia outra` em apps/api/test
- [ ] Teste `SCS-16 escolha de exemplo por coluna sobrevive à atualização` em apps/api/test
- [ ] Teste `SCS-17 log da leitura SQL traz tipo, tabelas e relações sem exemplos` em apps/api/test
- [ ] Teste `SCS-18 conexão excluída durante a leitura descarta o resultado` em apps/api/test
- [ ] Os testes de `apps/api/test/schema/` de Neo4j seguem verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: opus
**Commit**: `feat(api): refresh the schema of any connection type`

---

### T26: Consulta do schema relacional

**What**: `apps/api/src/schema/schema-query.service.ts`: `get` devolve `SchemaDto`: o grafo como hoje e, para conexão SQL, o `RelationalSchemaDto` em ordem alfabética (tabelas e colunas, `sendExample` por coluna pelos opt-outs `TABLE`) com as chaves estrangeiras; a atualização de `sendExample` aceita `TABLE`.
**Where**: `apps/api/src/schema/schema-query.service.ts`
**Depends on**: T25
**Reuses**: `get` e a tradução de opt-outs atuais
**Requirement**: SCS-12, SCS-16

**Done when**:

- [ ] Teste `SCS-12 schema SQL sai em ordem alfabética com views e relações` em apps/api/test
- [ ] Os testes de `schema-routes.spec.ts` de Neo4j seguem verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): serve the relational schema`

---

### T27: Tipo da conexão e parâmetros por linguagem no dashboard

**What**: `apps/api/src/dashboards/dashboards.service.ts`: `DashboardDto.connectionType` pela conexão do dashboard; `parameters` de cada widget por `extractParameterNames(widget.cypher, connectionLanguage(type))`.
**Where**: `apps/api/src/dashboards/dashboards.service.ts`
**Depends on**: T26
**Reuses**: `toDto` atual, `connectionLanguage`
**Requirement**: SMG-05, SQX-16

**Done when**:

- [ ] Teste `SMG-05 dashboard devolve o tipo da conexão` em apps/api/test
- [ ] Os testes de `apps/api/test/dashboards/` seguem verdes (só a forma do DTO ganha `connectionType`)
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): expose the connection type and language-aware parameters`

---

### T28: Prompt da IA por dialeto

**What**: `apps/api/src/ai/widget-prompt.ts`: `buildWidgetMessages` recebe `dialect` (`Cypher`, `PostgreSQL`, `MySQL`, `T-SQL`) e o texto de sistema pede a consulta no dialeto ("Você escreve consultas <dialeto> ..."); `serializeSchema` aceita `SchemaDto`: grafo como hoje, relacional como tabelas, colunas com tipo e exemplo permitido e `tabela.coluna → tabela.coluna`; `filtersText` descreve `$nome IS NULL OR coluna = $nome` e `coluna IN ($nome)` para SQL; `currentWidgetText` rotula o texto com a linguagem.
**Where**: `apps/api/src/ai/widget-prompt.ts`
**Depends on**: T27
**Reuses**: as funções atuais
**Requirement**: SAI-01, SAI-02, SAI-03, SAI-06

**Done when**:

- [ ] Teste `SAI-01 prompt pede consulta no dialeto do tipo` em apps/api/test
- [ ] Teste `SAI-02 prompt SQL leva tabelas, colunas, exemplos permitidos e chaves estrangeiras` em apps/api/test
- [ ] Teste `SAI-03 prompt de Neo4j segue como antes` em apps/api/test
- [ ] Teste `SAI-06 prompt descreve os parâmetros dos filtros em SQL` em apps/api/test
- [ ] Os testes de `widget-prompt.spec.ts` de Neo4j seguem verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): ask the model for the dialect of the connection`

---

### T29: IA gera por tipo de conexão

**What**: `apps/api/src/ai/ai-widget.service.ts`: `prepare` carrega o schema como `SchemaDto` e a fonte da conexão; `run` monta as mensagens com `source.dialect`; a consulta do modelo passa por `QueryService.run` (que valida com `source.validate`); falha de execução SQL gera a correção com o erro do banco pelas regras de `ia-cypher`; `done` devolve a consulta no campo `cypher`.
**Where**: `apps/api/src/ai/ai-widget.service.ts`
**Depends on**: T28
**Reuses**: o laço de tentativas atual
**Requirement**: SAI-04, SAI-05

**Done when**:

- [ ] Teste `SAI-04 consulta SQL do modelo passa pelo validador antes de executar` em apps/api/test
- [ ] Teste `SAI-05 consulta SQL que falha pede correção com o erro do banco` em apps/api/test
- [ ] Os testes de `ai-widget.service.spec.ts` e `ai-widget.route.spec.ts` seguem verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): generate widgets for sql connections`

---

### T30: Tipos e funções da conexão no web

**What**: `apps/web/src/features/connections/api.ts`: tipos `ConnectionDto` e de schema do contrato; `connectionTypeLabel(type)`, `defaultPortFor(type)`, `queryLabel(type)` ("Consulta SQL" ou "Consulta Cypher") e `queryLanguage(type)`; hooks de schema devolvem `SchemaDto`.
**Where**: `apps/web/src/features/connections/api.ts`
**Depends on**: T29
**Reuses**: `@ninbi/contracts`: `CONNECTION_TYPE_LABELS`, `SQL_DEFAULT_PORTS`, `connectionLanguage`
**Requirement**: SQX-02

**Done when**:

- [ ] Teste `SQX-02 rótulo e linguagem da consulta por tipo de conexão` em apps/web
- [ ] Os testes web existentes seguem verdes e `pnpm --filter @ninbi/web typecheck` compila
- [ ] Gate check passes: `pnpm --filter @ninbi/web typecheck && pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add connection type helpers`

---

### T31: Formulário de conexão por tipo

**What**: `apps/web/src/features/connections/ConnectionFormDialog.tsx`: seletor "Tipo"; tipo SQL mostra "Nome", "Host", "Porta" (preenchida pelo padrão do tipo), "Banco", "Usuário", "Senha", a caixa "Usar SSL" desmarcada e o texto "Use um usuário com permissão só de leitura"; "Neo4j" mostra o formulário de hoje; erros de campo com as mensagens do contrato; em edição o "Tipo" fica desabilitado; o envio manda `type`, `host`, `port` e `ssl`.
**Where**: `apps/web/src/features/connections/ConnectionFormDialog.tsx`
**Depends on**: T30
**Reuses**: o formulário atual, `zod` do contrato
**Requirement**: SRC-01, SRC-02, SRC-03, SRC-04, SRC-09, SRC-10, SRC-11, SRC-14, SRC-16

**Done when**:

- [ ] Teste `SRC-01 Nova conexão oferece Neo4j, PostgreSQL, MySQL e SQL Server` em apps/web
- [ ] Teste `SRC-02 tipo SQL mostra host, porta, banco, usuário, senha e Usar SSL` em apps/web
- [ ] Teste `SRC-03 escolher o tipo preenche a porta padrão` em apps/web
- [ ] Teste `SRC-04 Neo4j mantém o formulário com URI` em apps/web
- [ ] Teste `SRC-09 host inválido mostra a mensagem no campo` em apps/web
- [ ] Teste `SRC-10 porta inválida mostra a mensagem no campo` em apps/web
- [ ] Teste `SRC-11 banco vazio mostra Informe o banco` em apps/web
- [ ] Teste `SRC-14 formulário SQL recomenda usuário só de leitura` em apps/web
- [ ] Teste `SRC-16 edição mostra o tipo desabilitado` em apps/web
- [ ] Os testes de `ConnectionFormDialog.test.tsx` de Neo4j seguem verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): choose the connection type in the form`

---

### T32: Lista de conexões com tipo

**What**: `apps/web/src/features/connections/ConnectionsTab.tsx`: a lista mostra o tipo de cada conexão e, nas SQL, `host:porta` no lugar da URI.
**Where**: `apps/web/src/features/connections/ConnectionsTab.tsx`
**Depends on**: T31
**Reuses**: a tabela atual
**Requirement**: SRC-15

**Done when**:

- [ ] Teste `SRC-15 lista mostra o tipo e host:porta das conexões SQL` em apps/web
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): show the type and address of each connection`

---

### T33: Tela do schema relacional

**What**: `apps/web/src/features/connections/TableSchemaView.tsx` (novo) e a escolha em `SchemaPage.tsx`: para `RelationalSchemaDto` mostra a lista "Tabelas" em ordem, com views marcadas "(visão)", e a lista "Relações"; ao selecionar uma tabela, a tabela de colunas "Coluna", "Tipo" e "Exemplo" (literal SQL, "sem exemplo" quando nulo) e as chaves estrangeiras `origem.coluna → destino.coluna`; "Este banco não tem dados" quando não há tabela; o controle "Enviar exemplo à IA" por coluna, habilitado só para Admin; rolagem independente como no schema de grafo.
**Where**: `apps/web/src/features/connections/TableSchemaView.tsx`
**Depends on**: T32
**Reuses**: `SchemaPage`, `SchemaElementList`, `SchemaPropertiesTable`, `ExampleToggle`
**Requirement**: SCS-12, SCS-13, SCS-14, SCS-15, SCS-16

**Done when**:

- [ ] Teste `SCS-12 schema SQL mostra Tabelas com views marcadas e Relações` em apps/web
- [ ] Teste `SCS-13 tabela selecionada mostra colunas e chaves estrangeiras` em apps/web
- [ ] Teste `SCS-14 exemplo aparece como literal SQL` em apps/web
- [ ] Teste `SCS-15 banco sem tabelas mostra Este banco não tem dados` em apps/web
- [ ] Teste `SCS-16 Admin desliga Enviar exemplo à IA de uma coluna` em apps/web
- [ ] Os testes de `SchemaPage.test.tsx` de Neo4j seguem verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): browse the schema of sql connections`

---

### T34: Editor de consulta por linguagem

**What**: `apps/web/src/features/widgets/CypherEditor.tsx`: recebe `language`; `SQL` usa `tokenizeSql` para o destaque e o rótulo "Consulta SQL", `CYPHER` mantém o de hoje ("Consulta Cypher"). `WidgetEditorDialog.tsx` passa a linguagem da conexão do rascunho e calcula `parameters` por `extractParameterNames(query, language)`.
**Where**: `apps/web/src/features/widgets/CypherEditor.tsx`
**Depends on**: T33
**Reuses**: `tokenizeCypher`, `queryLabel`
**Requirement**: SQX-01, SQX-02, SQX-16

**Done when**:

- [ ] Teste `SQX-01 editor de conexão SQL mostra Consulta SQL com destaque de SQL` em apps/web
- [ ] Teste `SQX-02 editor de conexão Neo4j mostra Consulta Cypher` em apps/web
- [ ] Teste `SQX-16 parâmetros do widget SQL vêm do tokenizador SQL` em apps/web
- [ ] Os testes de `WidgetEditorDialog.test.tsx` seguem verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): edit queries in the language of the connection`

---

### T35: Regra de troca de conexão no rascunho

**What**: `apps/web/src/features/dashboards/draft.ts`: `connectionSwitchNeedsConfirm(draft, connections, nextId): boolean` (verdadeiro quando o tipo muda e há widget ou filtro de seleção com consulta) e `setConnection` segue trocando. Testado como função pura.
**Where**: `apps/web/src/features/dashboards/draft.ts`
**Depends on**: T34
**Reuses**: `setConnection`
**Requirement**: SMG-05, SMG-07

**Done when**:

- [ ] Teste de unidade `SMG-07 trocar para o mesmo tipo não pergunta` e `SMG-05 trocar para outro tipo com consulta pergunta` em `apps/web/src/features/dashboards/draft.test.ts`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): decide when a connection switch needs confirmation`

---

### T36: Confirmação ao trocar a conexão

**What**: `apps/web/src/features/dashboards/DashboardPage.tsx`: ao escolher outra conexão, se `connectionSwitchNeedsConfirm`, abre o diálogo "Trocar para <nome> (<tipo>)? As consultas estão escritas em <linguagem atual> e precisarão ser reescritas" com "Trocar" e "Cancelar"; "Cancelar" mantém a conexão anterior; do mesmo tipo troca direto.
**Where**: `apps/web/src/features/dashboards/DashboardPage.tsx`
**Depends on**: T35
**Reuses**: o seletor atual, o `ConfirmDialog` existente
**Requirement**: SMG-05, SMG-06, SMG-07

**Done when**:

- [ ] Teste `SMG-05 trocar para outro tipo pede confirmação` em apps/web
- [ ] Teste `SMG-06 Cancelar mantém a conexão anterior` em apps/web
- [ ] Teste `SMG-07 trocar para o mesmo tipo não pergunta` em apps/web
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): confirm switching to a connection of another type`

---

### T37: Rótulo da origem das opções do filtro

**What**: `apps/web/src/features/filters/FilterEditorDialog.tsx`: a origem "Consulta" mostra "Consulta SQL" ou "Consulta Cypher" pelo tipo da conexão do dashboard (`queryLabel`).
**Where**: `apps/web/src/features/filters/FilterEditorDialog.tsx`
**Depends on**: T36
**Reuses**: `queryLabel`
**Requirement**: SMG-08

**Done when**:

- [ ] Teste `SMG-08 filtro mostra Consulta SQL ou Consulta Cypher pelo tipo` em apps/web
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): label filter option queries by connection type`

---

### T38: Resultado da IA no editor do tipo

**What**: `apps/web/src/features/ai/useAiGenerations.ts`: ao receber o resultado da IA, o parâmetro de filtro usado é calculado com `extractParameterNames(event.cypher, language)` e a consulta abre no editor da linguagem da conexão.
**Where**: `apps/web/src/features/ai/useAiGenerations.ts`
**Depends on**: T37
**Reuses**: `extractParameterNames`, `queryLanguage`
**Requirement**: SAI-07

**Done when**:

- [ ] Teste `SAI-07 resultado da IA abre no editor do tipo da conexão` em apps/web
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): open ai results in the editor of the connection type`

---

### T39: Regressão do que existe com Neo4j

**What**: Sem código novo: roda a suíte inteira, o build, o typecheck e o lint. Corrige apenas o que a feature quebrou, sem mudar nenhuma expectativa de comportamento Neo4j (só a forma dos DTOs que ganharam campos).
**Where**: `package.json`
**Depends on**: T38
**Reuses**: `pnpm test`
**Requirement**: SMG-03, SMG-04

**Done when**:

- [ ] `pnpm build && pnpm typecheck && pnpm lint && pnpm test` passa na raiz
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build
**Model**: sonnet
**Commit**: `test: confirm neo4j behavior is unchanged after sql sources`

---

## Checks

**C1** - "Nova conexão" oferece o seletor "Tipo" com "Neo4j", "PostgreSQL", "MySQL" e "SQL Server" (SRC-01, AC 1)
Proof: run contracts | ✓ SRC-01 tipos de conexão na ordem da spec
Proof: run web | ✓ SRC-01 Nova conexão oferece Neo4j, PostgreSQL, MySQL e SQL Server

**C2** - Um tipo SQL mostra "Nome", "Host", "Porta", "Banco", "Usuário", "Senha" e a caixa "Usar SSL" desmarcada (SRC-02, AC 2)
Proof: run web | ✓ SRC-02 tipo SQL mostra host, porta, banco, usuário, senha e Usar SSL

**C3** - Escolher o tipo preenche a porta com 5432, 3306 ou 1433 (SRC-03, AC 3)
Proof: run contracts | ✓ SRC-03 porta padrão de cada tipo SQL
Proof: run web | ✓ SRC-03 escolher o tipo preenche a porta padrão

**C4** - O tipo Neo4j mostra o formulário de hoje, com o campo "URI" (SRC-04, AC 4)
Proof: run web | ✓ SRC-04 Neo4j mantém o formulário com URI

**C5** - Enviar uma conexão SQL testa a conexão com o banco antes de salvar (SRC-05, AC 5)
Proof: run api | ✓ SRC-05 criar conexão SQL testa antes de salvar

**C6** - Teste que passa salva a conexão e a mostra na lista (SRC-06, AC 6)
Proof: run api | ✓ SRC-06 teste que passa salva e a conexão aparece na lista

**C7** - Teste que falha não salva e mostra a mensagem do banco (SRC-07, AC 7)
Proof: run api | ✓ SRC-07 teste que falha não salva e devolve a mensagem do banco

**C8** - Banco que não responde em 10 s mostra "Não foi possível conectar em 10 s" (SRC-08, AC 8)
Proof: run api | ✓ SRC-08 banco SQL que não responde em 10 s devolve a mensagem de prazo

**C9** - Host vazio, com espaços ou com `://` é recusado com "Host inválido" (SRC-09, AC 9)
Proof: run contracts | ✓ SRC-09 host vazio, com espaços ou com :// é recusado
Proof: run web | ✓ SRC-09 host inválido mostra a mensagem no campo

**C10** - Porta fora de 1 a 65535 é recusada com "Porta inválida" (SRC-10, AC 10)
Proof: run contracts | ✓ SRC-10 porta fora de 1 a 65535 é recusada
Proof: run web | ✓ SRC-10 porta inválida mostra a mensagem no campo

**C11** - Banco vazio em conexão SQL é recusado com "Informe o banco" (SRC-11, AC 11)
Proof: run contracts | ✓ SRC-11 banco vazio em conexão SQL é recusado
Proof: run web | ✓ SRC-11 banco vazio mostra Informe o banco

**C12** - "Usar SSL" marcada abre a conexão criptografada e valida o certificado (SRC-12, AC 12)
Proof: run api | ✓ SRC-12 PostgreSQL com SSL criptografa e valida o certificado
Proof: run api | ✓ SRC-12 MySQL com SSL criptografa e valida o certificado
Proof: run api | ✓ SRC-12 SQL Server com SSL criptografa e valida o certificado

**C13** - "Usar SSL" desmarcada abre a conexão sem criptografia (SRC-13, AC 13)
Proof: run api | ✓ SRC-13 PostgreSQL sem SSL abre a conexão sem criptografia
Proof: run api | ✓ SRC-13 MySQL sem SSL abre a conexão sem criptografia
Proof: run api | ✓ SRC-13 SQL Server sem SSL abre a conexão sem criptografia

**C14** - O formulário SQL mostra "Use um usuário com permissão só de leitura" (SRC-14, AC 14)
Proof: run web | ✓ SRC-14 formulário SQL recomenda usuário só de leitura

**C15** - A lista mostra o tipo de cada conexão e `host:porta` nas SQL (SRC-15, AC 15)
Proof: run web | ✓ SRC-15 lista mostra o tipo e host:porta das conexões SQL

**C16** - Na edição o "Tipo" fica desabilitado, e a API recusa a mudança de tipo (SRC-16, AC 16)
Proof: run web | ✓ SRC-16 edição mostra o tipo desabilitado
Proof: run api | ✓ SRC-16 trocar o tipo de uma conexão é recusado

**C17** - Editar uma conexão SQL com a senha vazia mantém a senha e testa de novo (SRC-17, AC 17)
Proof: run api | ✓ SRC-17 editar conexão SQL sem senha mantém a senha e testa de novo

**C18** - A senha da conexão SQL é guardada criptografada e omitida de toda resposta (SRC-18, AC 18)
Proof: run api | ✓ SRC-18 senha SQL fica criptografada e nunca volta na resposta

**C19** - Nome vazio, com mais de 80 caracteres ou repetido é recusado com a mensagem no campo "Nome" (SRC-19, AC 19)
Proof: run contracts | ✓ SRC-19 nome inválido de conexão SQL usa a mensagem do nome
Proof: run api | ✓ SRC-19 nome repetido de conexão SQL é recusado com a mensagem no campo

**C20** - Editor e Visualizador recebem 403 ao criar, editar ou excluir conexão SQL (SRC-20, AC 20)
Proof: run api | ✓ SRC-20 Editor e Visualizador recebem 403 ao gerir conexão SQL

**C21** - A mensagem do driver sobre SSL chega ao formulário (SRC-21, AC edge case)
Proof: run api | ✓ SRC-21 mensagem do driver sobre SSL chega ao formulário

**C22** - Tipo sem fonte registrada faz a inicialização falhar com "Driver não encontrado: <tipo>" (SRC-22, AC edge case)
Proof: run api | ✓ SRC-22 registro sem fonte para um tipo falha com Driver não encontrado

**C23** - O editor de conexão SQL mostra "Consulta SQL" com destaque de SQL (SQX-01, AC 1)
Proof: run web | ✓ SQX-01 editor de conexão SQL mostra Consulta SQL com destaque de SQL

**C24** - O editor de conexão Neo4j mostra "Consulta Cypher" (SQX-02, AC 2)
Proof: run web | ✓ SQX-02 editor de conexão Neo4j mostra Consulta Cypher
Proof: run web | ✓ SQX-02 rótulo e linguagem da consulta por tipo de conexão

**C25** - Toda consulta SQL roda em transação que termina em `ROLLBACK` (SQX-03, AC 3)
Proof: run api | ✓ SQX-03 PostgreSQL consulta termina em ROLLBACK e fecha a conexão
Proof: run api | ✓ SQX-03 MySQL consulta termina em ROLLBACK e fecha a conexão
Proof: run api | ✓ SQX-03 SQL Server consulta termina em ROLLBACK e fecha a conexão
Proof: run api | ✓ SQX-03 SQL Server não tem modo leitura e depende do ROLLBACK e do validador

**C26** - No PostgreSQL e no MySQL a transação abre em modo leitura (SQX-04, AC 4)
Proof: run api | ✓ SQX-04 PostgreSQL abre a transação em modo leitura
Proof: run api | ✓ SQX-04 MySQL abre a transação em modo leitura
Proof: run apiint | ✓ SQX-04 PostgreSQL real recusa escrita em transação de leitura

**C27** - Consulta que não começa por `SELECT` ou `WITH` é recusada antes do banco (SQX-05, AC 5)
Proof: run api | ✓ SQX-05 consulta que não começa por SELECT ou WITH é recusada

**C28** - Palavra bloqueada fora de strings, comentários e identificadores é recusada com "Cláusula bloqueada: <palavra>" (SQX-06, AC 6)
Proof: run api | ✓ SQX-06 palavra bloqueada fora de strings e comentários é recusada com a cláusula

**C29** - As palavras bloqueadas valem sem diferenciar maiúsculas de minúsculas (SQX-07, AC 7)
Proof: run api | ✓ SQX-07 palavras bloqueadas valem sem diferenciar maiúsculas

**C30** - Palavra bloqueada só em string, comentário, identificador ou nome maior é aceita (SQX-08, AC 8)
Proof: run api | ✓ SQX-08 palavra bloqueada em string, comentário, identificador ou nome maior é aceita
Proof: run contracts | ✓ SQX-08 comentários e strings de SQL ficam fora das palavras

**C31** - Mais de uma instrução separada por `;` é recusada com "Envie uma consulta por vez" (SQX-09, AC 9)
Proof: run api | ✓ SQX-09 mais de uma instrução separada por ponto e vírgula é recusada

**C32** - Consulta que passa de 30 s é cancelada com "A consulta excedeu o tempo limite de 30 s" (SQX-10, AC 10)
Proof: run api | ✓ SQX-10 consulta que passa de 30 s mostra o tempo limite
Proof: run api | ✓ SQX-10 PostgreSQL aplica o prazo e cancela ao estourar
Proof: run api | ✓ SQX-10 MySQL aplica o prazo e cancela ao estourar
Proof: run api | ✓ SQX-10 SQL Server aplica o prazo e cancela ao estourar
Proof: run apiint | ✓ SQX-10 PostgreSQL real cancela consulta lenta

**C33** - Resultado acima de 5.000 linhas devolve as primeiras 5.000 e o aviso (SQX-11, AC 11)
Proof: run api | ✓ SQX-11 resultado acima de 5.000 linhas devolve as primeiras e avisa
Proof: run api | ✓ SQX-11 PostgreSQL para a leitura em maxRows
Proof: run api | ✓ SQX-11 MySQL para a leitura em maxRows
Proof: run api | ✓ SQX-11 SQL Server para a leitura em maxRows

**C34** - Consulta SQL com mais de 20.000 caracteres é recusada (SQX-12, AC 12)
Proof: run api | ✓ SQX-12 consulta SQL com mais de 20.000 caracteres é recusada

**C35** - Erro do banco aparece a quem edita e mascarado a quem só vê (SQX-13, AC 13)
Proof: run api | ✓ SQX-13 erro do banco SQL aparece a quem edita e genérico a quem só vê
Proof: run api | ✓ SQX-13 dbCode segue ao prompt e erro de execução SQL vai só com o código

**C36** - Banco inacessível mostra "Não foi possível conectar ao banco <nome>" (SQX-14, AC 14)
Proof: run api | ✓ SQX-14 banco SQL inacessível mostra o nome da conexão

**C37** - `$nome` vai ao banco como parâmetro do driver, sem colar o valor no texto (SQX-15, AC 15)
Proof: run api | ✓ SQX-15 $nome vira parâmetro do driver sem colar o valor
Proof: run api | ✓ SQX-15 SqlSource envia ao gateway texto e valores separados

**C38** - `$nome` dentro de string, comentário ou identificador não é parâmetro (SQX-16, AC 16)
Proof: run contracts | ✓ SQX-16 $nome em string, comentário ou identificador não é parâmetro
Proof: run contracts | ✓ SQX-16 $1 e $$ não são parâmetros e $nome é
Proof: run web | ✓ SQX-16 parâmetros do widget SQL vêm do tokenizador SQL

**C39** - `$nome` sem valor executa com `null` (SQX-17, AC 17)
Proof: run api | ✓ SQX-17 parâmetro sem valor vai como null
Proof: run api | ✓ SQX-17 QueryService executa $nome sem valor com null

**C40** - `$nome IS NULL` e `$nome IS NOT NULL` viram condição sempre verdadeira ou sempre falsa (SQX-18, AC 18)
Proof: run api | ✓ SQX-18 $nome IS NULL e IS NOT NULL viram condição constante

**C41** - Valor em lista vira um parâmetro por item, e `IN ($nome)` compara com cada item (SQX-19, AC 19)
Proof: run api | ✓ SQX-19 lista vira um parâmetro por item e lista vazia vira NULL

**C42** - Data `AAAA-MM-DD` vai ao banco como data (SQX-20, AC 20)
Proof: run api | ✓ SQX-20 data AAAA-MM-DD vai como texto de data

**C43** - Números, textos, booleanos, datas, datas com hora, JSON, UUID e nulos voltam nos tipos da spec (SQX-21, AC 21)
Proof: run api | ✓ SQX-21 tipos do resultado SQL viram ResultValue
Proof: run api | ✓ SQX-21 PostgreSQL converte data, data com hora e decimal
Proof: run api | ✓ SQX-21 MySQL converte data, data com hora e decimal
Proof: run api | ✓ SQX-21 SQL Server converte data, data com hora e decimal
Proof: run apiint | ✓ SQX-21 PostgreSQL real devolve os tipos da spec

**C44** - Inteiro fora do intervalo seguro vira `bigint` e decimal inexato vira texto (SQX-22, AC 22)
Proof: run api | ✓ SQX-22 inteiro fora do intervalo vira bigint e decimal inexato vira texto

**C45** - Colunas com o mesmo nome ganham `_2`, `_3` (SQX-23, AC 23)
Proof: run api | ✓ SQX-23 colunas repetidas ganham _2 e _3

**C46** - Cada execução é registrada com usuário, conexão, tipo, widget, duração, linhas e resultado, sem as linhas (SQX-24, AC 24)
Proof: run api | ✓ SQX-24 log de execução traz o tipo e não traz as linhas

**C47** - SQL enviado como texto por quem não edita o dashboard recebe 403 (SQX-25, AC 25)
Proof: run api | ✓ SQX-25 SQL enviado como texto por quem não edita responde 403

**C48** - Queda do banco no meio da consulta mostra a mensagem de banco inacessível (SQX-26, AC edge case)
Proof: run api | ✓ SQX-26 erro de rede do driver é indisponibilidade

**C49** - Coluna binária aparece como `<binário N bytes>` (SQX-27, AC edge case)
Proof: run api | ✓ SQX-27 binário vira <binário N bytes>

**C50** - Filtro de seleção múltipla vazio com `$ids IS NULL OR coluna IN ($ids)` devolve todas as linhas (SQX-28, AC edge case)
Proof: run api | ✓ SQX-28 filtro vazio com IS NULL OR IN vira condição verdadeira
Proof: run apiint | ✓ SQX-28 filtro vazio devolve todas as linhas no PostgreSQL real

**C51** - A leitura guarda tabelas e views dos schemas de usuário com colunas e tipos (SCS-02, AC 2)
Proof: run api | ✓ SCS-02 leitura guarda tabelas, views e colunas com o tipo

**C52** - Os schemas do sistema ficam de fora (SCS-03, AC 3)
Proof: run api | ✓ SCS-03 consultas de catálogo excluem os schemas do sistema
Proof: run apiint | ✓ SCS-03 PostgreSQL real lista só schemas de usuário com views e chaves estrangeiras

**C53** - O exemplo de cada coluna é o primeiro valor não nulo entre até 100 linhas (SCS-04, AC 4)
Proof: run api | ✓ SCS-04 exemplo é o primeiro valor não nulo das primeiras 100 linhas

**C54** - Cada chave estrangeira, inclusive composta, é guardada como par de tabela e colunas (SCS-05, AC 5)
Proof: run api | ✓ SCS-05 chave estrangeira composta vira par de tabela e colunas

**C55** - As tabelas se chamam `schema.tabela` no PostgreSQL e no SQL Server e `tabela` no MySQL (SCS-06, AC 6)
Proof: run api | ✓ SCS-06 dialetos declaram nomes qualificados só no PostgreSQL e no SQL Server
Proof: run api | ✓ SCS-06 nome qualificado no PostgreSQL e no SQL Server e simples no MySQL

**C56** - Tabela sem permissão de leitura fica listada sem exemplo e a leitura conclui (SCS-07, AC 7)
Proof: run api | ✓ SCS-07 tabela sem permissão de leitura fica sem exemplo e a leitura conclui

**C57** - Catálogo ilegível falha a leitura com a mensagem do banco (SCS-08, AC 8)
Proof: run api | ✓ SCS-08 catálogo ilegível falha a leitura com a mensagem do banco

**C58** - A leitura do schema só usa consultas de leitura em transação que termina em `ROLLBACK` (SCS-09, AC 9)
Proof: run api | ✓ SCS-09 a leitura do schema só usa gateway.read
Proof: run api | ✓ SQX-03 PostgreSQL consulta termina em ROLLBACK e fecha a conexão

**C59** - Uma conexão SQL criada tem o schema lido sem outra ação (SCS-01, AC 1)
Proof: run api | ✓ SCS-01 criar conexão SQL inicia a leitura do schema

**C60** - A leitura grava no lugar do anterior e a falha ou os 120 s mantêm o anterior (SCS-10, AC 10)
Proof: run api | ✓ SCS-10 leitura grava no lugar do schema anterior e falha ou 120 s o mantém

**C61** - Pedido de leitura com leitura em andamento não inicia outra (SCS-11, AC 11)
Proof: run api | ✓ SCS-11 leitura em andamento não inicia outra

**C62** - O schema mostra "Tabelas" em ordem, views marcadas "(visão)", e "Relações", com a data da leitura (SCS-12, AC 12)
Proof: run api | ✓ SCS-12 schema SQL sai em ordem alfabética com views e relações
Proof: run web | ✓ SCS-12 schema SQL mostra Tabelas com views marcadas e Relações

**C63** - A tabela selecionada mostra "Coluna", "Tipo", "Exemplo" e as chaves estrangeiras `origem.coluna → destino.coluna` (SCS-13, AC 13)
Proof: run web | ✓ SCS-13 tabela selecionada mostra colunas e chaves estrangeiras

**C64** - O exemplo é mostrado como literal SQL (SCS-14, AC 14)
Proof: run api | ✓ SCS-14 exemplo de texto, número e data vira literal SQL
Proof: run web | ✓ SCS-14 exemplo aparece como literal SQL

**C65** - Banco sem tabelas mostra "Este banco não tem dados" (SCS-15, AC 15)
Proof: run web | ✓ SCS-15 banco sem tabelas mostra Este banco não tem dados

**C66** - A escolha de "Enviar exemplo à IA" por coluna é gravada e sobrevive à atualização (SCS-16, AC 16)
Proof: run contracts | ✓ SCS-16 ajuste de exemplo aceita o elemento TABLE
Proof: run api | ✓ SCS-16 escolha de exemplo por coluna sobrevive à atualização
Proof: run web | ✓ SCS-16 Admin desliga Enviar exemplo à IA de uma coluna

**C67** - Cada leitura SQL é registrada com conexão, tipo, duração e contagens, sem exemplos (SCS-17, AC 17)
Proof: run api | ✓ SCS-17 log da leitura SQL traz tipo, tabelas e relações sem exemplos

**C68** - Conexão excluída durante a leitura descarta o resultado (SCS-18, AC edge case)
Proof: run api | ✓ SCS-18 conexão excluída durante a leitura descarta o resultado

**C69** - O prompt pede a consulta no dialeto do tipo: PostgreSQL, MySQL ou T-SQL (SAI-01, AC 1)
Proof: run api | ✓ SAI-01 prompt pede consulta no dialeto do tipo

**C70** - O prompt leva tabelas, colunas com tipo, exemplos permitidos e chaves estrangeiras (SAI-02, AC 2)
Proof: run api | ✓ SAI-02 prompt SQL leva tabelas, colunas, exemplos permitidos e chaves estrangeiras

**C71** - Para Neo4j o prompt pede Cypher e leva o schema como antes (SAI-03, AC 3)
Proof: run api | ✓ SAI-03 prompt de Neo4j segue como antes

**C72** - A consulta do modelo passa pelas regras de SQX-05 a SQX-09 antes de executar (SAI-04, AC 4)
Proof: run api | ✓ SAI-04 consulta SQL do modelo passa pelo validador antes de executar

**C73** - Consulta SQL que falha pede correção ao modelo com o erro do banco (SAI-05, AC 5)
Proof: run api | ✓ SAI-05 consulta SQL que falha pede correção com o erro do banco

**C74** - O prompt descreve os parâmetros dos filtros e a forma de usá-los em SQL (SAI-06, AC 6)
Proof: run api | ✓ SAI-06 prompt descreve os parâmetros dos filtros em SQL

**C75** - O resultado da IA abre no editor do tipo da conexão (SAI-07, AC 7)
Proof: run web | ✓ SAI-07 resultado da IA abre no editor do tipo da conexão

**C76** - A migração marca toda conexão existente como Neo4j, com URI, banco, usuário, senha e schema iguais (SMG-01, AC 1)
Proof: run api | ✓ SMG-01 migração marca as conexões existentes como Neo4j
Proof: run contracts | ✓ SMG-01 criação sem tipo vale Neo4j e mantém a URI

**C77** - A migração mantém o texto de toda consulta de widget e de filtro (SMG-02, AC 2)
Proof: run api | ✓ SMG-02 migração mantém o texto das consultas

**C78** - Widgets, filtros, exportações e cross-filtering de Neo4j dão o mesmo resultado de antes (SMG-03, AC 3)
Proof: run api | ✓ SMG-03 Neo4jSource devolve o mesmo resultado que o QueryService devolvia
Proof: run api | ✓ SMG-03 consulta Cypher passa pelo registro com o mesmo resultado
Proof: run contracts | ✓ SMG-03 extractParameterNames sem linguagem segue o Cypher

**C79** - As regras das features anteriores seguem valendo para Neo4j (suíte inteira verde) (SMG-04, AC 4)
Proof: `pnpm test`

**C80** - Trocar para outra conexão de tipo diferente, com consulta, pergunta "Trocar para <nome> (<tipo>)? ..." (SMG-05, AC 1)
Proof: run web | ✓ SMG-05 trocar para outro tipo pede confirmação
Proof: run api | ✓ SMG-05 dashboard devolve o tipo da conexão

**C81** - "Cancelar" mantém a conexão anterior (SMG-06, AC 2)
Proof: run web | ✓ SMG-06 Cancelar mantém a conexão anterior

**C82** - Trocar para o mesmo tipo não pergunta (SMG-07, AC 3)
Proof: run web | ✓ SMG-07 trocar para o mesmo tipo não pergunta

**C83** - A origem "Consulta" do filtro mostra "Consulta SQL" ou "Consulta Cypher" pelo tipo da conexão (SMG-08, AC 4)
Proof: run web | ✓ SMG-08 filtro mostra Consulta SQL ou Consulta Cypher pelo tipo

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** MySQL e SQL Server sem container; só o PostgreSQL do compose tem teste real, e o usuário testa os outros dois à mão contra um banco remoto (user: "não precisa, só o postgres e eu vou pegar um banco remoto pra testar"). T21 removida.
**Dispatched:** lotes 1 a 3 returned; lote 4 (T22 a T29, opus) em 9e90c65
**Walked:** none
