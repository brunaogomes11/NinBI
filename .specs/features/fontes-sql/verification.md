# fontes-sql verification

**Verdict**: FAIL (round 1; every finding is now closed, see Closed and the proofs rerun)
**Proofs**: `proofs.md` at d925f55
**Verifier**: independent sub-agent (author != verifier)

Scope: the 83 checks of `tasks.md ## Checks` against their named tests at HEAD d925f55, plus throwaway probes run at HEAD and then deleted. `proofs.md` was not rerun. The `proofs.md` header reads `HEAD: 9053c87`; the only commits between that SHA and d925f55 change `.specs/` files, so the code proofs still apply (see F11). The Test Coverage Matrix of `tasks.md` was not read, so the layer comparison is judged against each check's own claim.

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `packages/contracts/src/connections.spec.ts` `SRC-01 tipos de conexão na ordem da spec`; `apps/web/src/features/connections/ConnectionFormDialog.test.tsx` `SRC-01 Nova conexão oferece Neo4j, PostgreSQL, MySQL e SQL Server` | yes |
| C2 | `apps/web/src/features/connections/ConnectionFormDialog.test.tsx` `SRC-02 tipo SQL mostra host, porta, banco, usuário, senha e Usar SSL` | yes |
| C3 | `packages/contracts/src/connections.spec.ts` `SRC-03 porta padrão de cada tipo SQL`; `ConnectionFormDialog.test.tsx` `SRC-03 escolher o tipo preenche a porta padrão` | yes |
| C4 | `ConnectionFormDialog.test.tsx` `SRC-04 Neo4j mantém o formulário com URI` | yes |
| C5 | `apps/api/test/connections/connections-sql.spec.ts` `SRC-05 criar conexão SQL testa antes de salvar` | yes |
| C6 | `connections-sql.spec.ts` `SRC-06 teste que passa salva e a conexão aparece na lista` | yes |
| C7 | `connections-sql.spec.ts` `SRC-07 teste que falha não salva e devolve a mensagem do banco` | yes |
| C8 | `connections-sql.spec.ts` `SRC-08 banco SQL que não responde em 10 s devolve a mensagem de prazo` | no - overrides CONNECTION_VERIFY_TIMEOUT_MS to 100 ms and never asserts the 10 s default; the default is pinned only at `connections.spec.ts:148`, outside this check (F6) |
| C9 | `packages/contracts/src/connections.spec.ts` `SRC-09 host vazio, com espaços ou com :// é recusado` | no - asserts `'h '` (trailing space) is valid, because the schema trims before the space refusal (`packages/contracts/src/connections.ts:141-148`); criterion says spaces are refused (F5) |
| C10 | `connections.spec.ts` `SRC-10 porta fora de 1 a 65535 é recusada` | yes |
| C11 | `connections.spec.ts` `SRC-11 banco vazio em conexão SQL é recusado` | yes |
| C12 | `apps/api/test/sources/gateways/pg.gateway.spec.ts` `SRC-12 PostgreSQL com SSL criptografa e valida o certificado`; `mysql.gateway.spec.ts` `SRC-12 MySQL com SSL criptografa e valida o certificado`; `mssql.gateway.spec.ts` `SRC-12 SQL Server com SSL criptografa e valida o certificado` | yes |
| C13 | `pg.gateway.spec.ts` `SRC-13 PostgreSQL sem SSL abre a conexão sem criptografia`; `mysql.gateway.spec.ts` `SRC-13 MySQL sem SSL abre a conexão sem criptografia`; `mssql.gateway.spec.ts` `SRC-13 SQL Server sem SSL abre a conexão sem criptografia` | yes |
| C14 | `ConnectionFormDialog.test.tsx` `SRC-14 formulário SQL recomenda usuário só de leitura` | yes |
| C15 | `apps/web/src/features/connections/ConnectionsTab.test.tsx` `SRC-15 lista mostra o tipo e host:porta das conexões SQL` | yes |
| C16 | `ConnectionFormDialog.test.tsx` `SRC-16 edição mostra o tipo desabilitado`; `connections-sql.spec.ts` `SRC-16 trocar o tipo de uma conexão é recusado` | yes |
| C17 | `connections-sql.spec.ts` `SRC-17 editar conexão SQL sem senha mantém a senha e testa de novo` | yes |
| C18 | `connections-sql.spec.ts` `SRC-18 senha SQL fica criptografada e nunca volta na resposta` | yes |
| C19 | `packages/contracts/src/connections.spec.ts` `SRC-19 nome inválido de conexão SQL usa a mensagem do nome`; `connections-sql.spec.ts` `SRC-19 nome repetido de conexão SQL é recusado com a mensagem no campo` | yes |
| C20 | `connections-sql.spec.ts` `SRC-20 Editor e Visualizador recebem 403 ao gerir conexão SQL` | yes |
| C21 | `connections-sql.spec.ts` `SRC-21 mensagem do driver sobre SSL chega ao formulário` | yes |
| C22 | `apps/api/test/sources/source-registry.spec.ts` `SRC-22 registro sem fonte para um tipo falha com Driver não encontrado` | yes |
| C23 | `apps/web/src/features/widgets/WidgetEditorDialog.sql.test.tsx` `SQX-01 editor de conexão SQL mostra Consulta SQL com destaque de SQL` | yes |
| C24 | `WidgetEditorDialog.sql.test.tsx` `SQX-02 editor de conexão Neo4j mostra Consulta Cypher`; `apps/web/src/features/connections/api.test.ts` `SQX-02 rótulo e linguagem da consulta por tipo de conexão` | yes |
| C25 | `mysql.gateway.spec.ts` `SQX-03 MySQL consulta termina em ROLLBACK e fecha a conexão` | no - the named test covers the completed-result path only; when `maxRows` stops the read the gateway calls `connection.destroy()` with no ROLLBACK (`mysql.gateway.ts:246-249`), and `mysql.gateway.spec.ts:223-225` asserts that outcome (F4) |
| C26 | `pg.gateway.spec.ts` `SQX-04 PostgreSQL abre a transação em modo leitura`; `mysql.gateway.spec.ts` `SQX-04 MySQL abre a transação em modo leitura`; `apps/api/test-int/sql-pg.int.spec.ts` `SQX-04 PostgreSQL real recusa escrita em transação de leitura` | yes |
| C27 | `apps/api/test/queries/read-only-sql.spec.ts` `SQX-05 consulta que não começa por SELECT ou WITH é recusada` | yes |
| C28 | `read-only-sql.spec.ts` `SQX-06 palavra bloqueada fora de strings e comentários é recusada com a cláusula` | no - probes P5 and P8 at HEAD accept SQL whose blocked word (DELETE) is outside strings for the database but inside an unclosed quote for the validator (`#` comment in MySQL; `$a$`/`$$` quoting in PostgreSQL); the named test covers none of these lexical forms (F1) |
| C29 | `read-only-sql.spec.ts` `SQX-07 palavras bloqueadas valem sem diferenciar maiúsculas` | yes |
| C30 | `read-only-sql.spec.ts` `SQX-08 palavra bloqueada em string, comentário, identificador ou nome maior é aceita` | no - asserts acceptance of unquoted `t.set, t.update` and `u.delete ... u.into` (`read-only-sql.spec.ts:106-107`), which SQX-06 says are refused; probes P3, P4, P14 confirm acceptance (F2) |
| C31 | `read-only-sql.spec.ts` `SQX-09 mais de uma instrução separada por ponto e vírgula é recusada` | no - the named test covers plain `;` only; probes P5 to P8 accept a second statement hidden by a MySQL `#` comment, a MySQL backslash escape, or PostgreSQL `$$`/`$a$` quoting (F1) |
| C32 | `apps/api/test/queries/query.service.sql.spec.ts` `SQX-10 consulta que passa de 30 s mostra o tempo limite`; `pg.gateway.spec.ts` `SQX-10 PostgreSQL aplica o prazo e cancela ao estourar`; `mysql.gateway.spec.ts` `SQX-10 MySQL aplica o prazo e cancela ao estourar`; `mssql.gateway.spec.ts` `SQX-10 SQL Server aplica o prazo e cancela ao estourar`; `apps/api/test-int/sql-pg.int.spec.ts` `SQX-10 PostgreSQL real cancela consulta lenta` | yes |
| C33 | `query.service.sql.spec.ts` `SQX-11 resultado acima de 5.000 linhas devolve as primeiras e avisa`; `pg.gateway.spec.ts` `SQX-11 PostgreSQL para a leitura em maxRows` | yes |
| C34 | `read-only-sql.spec.ts` `SQX-12 consulta SQL com mais de 20.000 caracteres é recusada` | yes |
| C35 | `query.service.sql.spec.ts` `SQX-13 erro do banco SQL aparece a quem edita e genérico a quem só vê` | yes (the flag comes from `queries.controller.ts:92`, and its role mapping is shared with the TBL-12 suite) |
| C36 | `query.service.sql.spec.ts` `SQX-14 banco SQL inacessível mostra o nome da conexão` | yes |
| C37 | `apps/api/test/queries/sql-params.spec.ts` `SQX-15 $nome vira parâmetro do driver sem colar o valor`; `apps/api/test/sources/sql.source.spec.ts` `SQX-15 SqlSource envia ao gateway texto e valores separados` | yes |
| C38 | `packages/contracts/src/sql-tokens.spec.ts` `SQX-16 $nome em string, comentário ou identificador não é parâmetro`; `WidgetEditorDialog.sql.test.tsx` `SQX-16 parâmetros do widget SQL vêm do tokenizador SQL` | yes |
| C39 | `sql-params.spec.ts` `SQX-17 parâmetro sem valor vai como null` | no - `bindSqlParams` reads `params[token.value]` on a plain object (`sql-params.ts:96`), so `$constructor` and `$toString` with no value bind to inherited functions (probes B10, B11); the named test uses only `a` and `b` (F10) |
| C40 | `sql-params.spec.ts` `SQX-18 $nome IS NULL e IS NOT NULL viram condição constante` | yes |
| C41 | `sql-params.spec.ts` `SQX-19 lista vira um parâmetro por item e lista vazia vira NULL` | yes |
| C42 | `sql-params.spec.ts` `SQX-20 data AAAA-MM-DD vai como texto de data` | yes |
| C43 | `apps/api/test/queries/sql-result-value.spec.ts` `SQX-21 tipos do resultado SQL viram ResultValue`; `pg.gateway.spec.ts` `SQX-21 PostgreSQL converte data, data com hora e decimal`; `mysql.gateway.spec.ts` `SQX-21 MySQL converte data, data com hora e decimal`; `mssql.gateway.spec.ts` `SQX-21 SQL Server converte data, data com hora e decimal`; `sql-pg.int.spec.ts` `SQX-21 PostgreSQL real devolve os tipos da spec` | yes |
| C44 | `sql-result-value.spec.ts` `SQX-22 inteiro fora do intervalo vira bigint e decimal inexato vira texto` | no - the SQL Server path never yields text for an inexact decimal: `mssqlValue` passes the tedious `number` through (`mssql.gateway.ts:164-184`); probe gives `12345678901234567.89` becoming `12345678901234568`; the named test is helper-level only, and the MSSQL SQX-21 test asserts only `19.9` (F3) |
| C45 | `sql-result-value.spec.ts` `SQX-23 colunas repetidas ganham _2 e _3` | yes |
| C46 | `query.service.sql.spec.ts` `SQX-24 log de execução traz o tipo e não traz as linhas` | yes |
| C47 | `query.service.sql.spec.ts` `SQX-25 SQL enviado como texto por quem não edita responde 403` | yes |
| C48 | `apps/api/test/sources/sql.source.spec.ts` `SQX-26 erro de rede do driver é indisponibilidade` | yes (the message text is pinned by `query.service.sql.spec.ts` SQX-14) |
| C49 | `sql-result-value.spec.ts` `SQX-27 binário vira <binário N bytes>` | yes |
| C50 | `sql-params.spec.ts` `SQX-28 filtro vazio com IS NULL OR IN vira condição verdadeira`; `apps/api/test-int/sql-pg.int.spec.ts` `SQX-28 filtro vazio devolve todas as linhas no PostgreSQL real` | yes |
| C51 | `apps/api/test/schema/sql-schema-reader.spec.ts` `SCS-02 leitura guarda tabelas, views e colunas com o tipo` | yes |
| C52 | `apps/api/test/sources/dialects.spec.ts` `SCS-03 consultas de catálogo excluem os schemas do sistema`; `sql-pg.int.spec.ts` `SCS-03 PostgreSQL real lista só schemas de usuário com views e chaves estrangeiras` | yes |
| C53 | `sql-schema-reader.spec.ts` `SCS-04 exemplo é o primeiro valor não nulo das primeiras 100 linhas` | yes |
| C54 | `sql-schema-reader.spec.ts` `SCS-05 chave estrangeira composta vira par de tabela e colunas` | yes |
| C55 | `sql-schema-reader.spec.ts` `SCS-06 nome qualificado no PostgreSQL e no SQL Server e simples no MySQL` | yes |
| C56 | `sql-schema-reader.spec.ts` `SCS-07 tabela sem permissão de leitura fica sem exemplo e a leitura conclui` | yes |
| C57 | `sql-schema-reader.spec.ts` `SCS-08 catálogo ilegível falha a leitura com a mensagem do banco` | yes |
| C58 | `sql-schema-reader.spec.ts` `SCS-09 a leitura do schema só usa gateway.read`; `pg.gateway.spec.ts` `SQX-03 PostgreSQL consulta termina em ROLLBACK e fecha a conexão` | yes |
| C59 | `connections-sql.spec.ts` `SCS-01 criar conexão SQL inicia a leitura do schema` | yes |
| C60 | `apps/api/test/schema/schema-refresh-sql.spec.ts` `SCS-10 leitura grava no lugar do schema anterior e falha ou 120 s o mantém` | no - overrides SCHEMA_READ_TIMEOUT_MS to 500 ms; the 120 s default is pinned only at `schema-refresh.spec.ts:155`, outside this check (F6) |
| C61 | `schema-refresh-sql.spec.ts` `SCS-11 leitura em andamento não inicia outra` | yes |
| C62 | `apps/api/test/schema/schema-relational.spec.ts` `SCS-12 schema SQL sai em ordem alfabética com views e relações`; `apps/web/src/features/connections/TableSchemaView.test.tsx` `SCS-12 schema SQL mostra Tabelas com views marcadas e Relações` | yes |
| C63 | `TableSchemaView.test.tsx` `SCS-13 tabela selecionada mostra colunas e chaves estrangeiras` | yes |
| C64 | `apps/api/test/schema/sql-literal.spec.ts` `SCS-14 exemplo de texto, número e data vira literal SQL`; `TableSchemaView.test.tsx` `SCS-14 exemplo aparece como literal SQL` | yes |
| C65 | `TableSchemaView.test.tsx` `SCS-15 banco sem tabelas mostra Este banco não tem dados` | yes |
| C66 | `schema-refresh-sql.spec.ts` `SCS-16 escolha de exemplo por coluna sobrevive à atualização` | no - inserts the opt-out rows directly (`schema-refresh-sql.spec.ts:65-71`) and never calls the PUT endpoint, so a broken save still passes; the save is asserted only in the test titled SCS-12 in `schema-relational.spec.ts`, which is not in the proof set (F9) |
| C67 | `schema-refresh-sql.spec.ts` `SCS-17 log da leitura SQL traz tipo, tabelas e relações sem exemplos` | yes |
| C68 | `schema-refresh-sql.spec.ts` `SCS-18 conexão excluída durante a leitura descarta o resultado` | yes |
| C69 | `apps/api/test/ai/widget-prompt-dialect.spec.ts` `SAI-01 prompt pede consulta no dialeto do tipo` | yes |
| C70 | `widget-prompt-dialect.spec.ts` `SAI-02 prompt SQL leva tabelas, colunas, exemplos permitidos e chaves estrangeiras` | yes |
| C71 | `widget-prompt-dialect.spec.ts` `SAI-03 prompt de Neo4j segue como antes` | yes |
| C72 | `apps/api/test/ai/ai-widget-sql.spec.ts` `SAI-04 consulta SQL do modelo passa pelo validador antes de executar` | yes |
| C73 | `ai-widget-sql.spec.ts` `SAI-05 consulta SQL que falha pede correção com o erro do banco` | yes |
| C74 | `widget-prompt-dialect.spec.ts` `SAI-06 prompt descreve os parâmetros dos filtros em SQL` | yes |
| C75 | `apps/web/src/features/ai/useAiGenerations.test.tsx` `SAI-07 resultado da IA abre no editor do tipo da conexão` | no - the named test checks only the query-cache key (rows under the SQL key, nothing under the Cypher key) and never observes the editor; the editor assertion is in `SAI-07 consulta SQL gerada abre no editor Consulta SQL`, which proofs.md does not select (F7) |
| C76 | `apps/api/test/database/connections-schema.spec.ts` `SMG-01 migração marca as conexões existentes como Neo4j`; `packages/contracts/src/connections.spec.ts` `SMG-01 criação sem tipo vale Neo4j e mantém a URI` | no - the named migration test asserts type, URI, database, username and password, but nothing on the connection schema, which the criterion says stays equal (F8) |
| C77 | `apps/api/test/database/dashboards-schema.spec.ts` `SMG-02 migração mantém o texto das consultas` | yes |
| C78 | `apps/api/test/sources/neo4j.source.spec.ts` `SMG-03 Neo4jSource devolve o mesmo resultado que o QueryService devolvia`; `query.service.sql.spec.ts` `SMG-03 consulta Cypher passa pelo registro com o mesmo resultado` | yes |
| C79 | `pnpm test` (proofs.md Output, exit 0; not rerun) | yes |
| C80 | `apps/web/src/features/dashboards/DashboardConnectionSwitch.test.tsx` `SMG-05 trocar para outro tipo pede confirmação`; `apps/api/test/dashboards/dashboard-connection-type.spec.ts` `SMG-05 dashboard devolve o tipo da conexão` | yes |
| C81 | `DashboardConnectionSwitch.test.tsx` `SMG-06 Cancelar mantém a conexão anterior` | yes |
| C82 | `DashboardConnectionSwitch.test.tsx` `SMG-07 trocar para o mesmo tipo não pergunta` | yes |
| C83 | `apps/web/src/features/filters/FilterEditorDialog.test.tsx` `SMG-08 filtro mostra Consulta SQL ou Consulta Cypher pelo tipo` | yes |

Count of `no` rows: 12 (C8, C9, C25, C28, C30, C31, C39, C44, C60, C66, C75, C76).

## Findings

| ID | Check | Severity | Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | C28, C31 | Major | The validator lexes MySQL `#` comments, MySQL backslash escapes and PostgreSQL `$$`/`$a$` quoting as strings, so a second statement and blocked words hide from SQX-06 and SQX-09. | At HEAD: `SELECT 1 # '\n; DELETE FROM t WHERE 1=1 #'` ok; `SELECT 'x\' , '; DELETE FROM t -- '` ok; `SELECT $$it's$$; DELETE FROM t` ok; `SELECT $a$'$a$; DELETE FROM t WHERE 1=1; SELECT '1'` ok. Lexing in `packages/contracts/src/sql-tokens.ts:55-119`, validator `apps/api/src/queries/read-only-sql.ts:93-125`. Backstops that hold today: mysql2 `execute` without multipleStatements (`mysql.gateway.ts:90, 131`), PG cursor extended protocol (`pg.gateway.ts:115`), read-only transactions (`pg.gateway.ts:187`, `mysql.gateway.ts:219`). SQL Server has no read-only transaction, but these lexical forms do not apply to it. | Make the tokenizer dialect-aware (`#` line comment and backslash escape for MySQL), and refuse dollar quoting or stop treating text after `$$` as an open quote. Add cases to `read-only-sql.spec.ts` and `sql-tokens.spec.ts`. | 426b517 |
| F2 | C30 | Minor | The validator exempts any word right after `.`, so unquoted `t.update`, `t.delete`, `u.into`, `t.set` and `public.delete` are accepted. SQX-06 says these are refused. The SQX-08 test enshrines the acceptance. No write path found, since no valid SQL puts a statement keyword after `.`. | `read-only-sql.ts:61-65, 70`; probes P3, P4, P14 accepted; `read-only-sql.spec.ts:106-107`. | Either drop the exemption and rewrite the test to use quoted names, or append a new criterion for qualified names (a spec change) and fix the spec text. | bb6a6fc |
| F3 | C44 | Major | SQL Server delivers `decimal`/`numeric` as a JS number, so an inexact decimal is rounded silently. SQX-22 says it must come back as decimal text. The deviation is recorded only in a code comment, not in the spec. | `mssql.gateway.ts:160-184` (`mssqlValue` passes `value` through for decimal). Probe: `mssqlValue(12345678901234567.89, 'decimal')` gives `12345678901234568`. `mssql.gateway.spec.ts:268` asserts only `19.9`. | Read DECIMAL/NUMERIC as text on SQL Server (driver option or a cast in the query), then add a test for `12345678901234567.89` returning text. Or record the deviation as a spec change with a new criterion. | 6388f9d (test 8e137ab) |
| F4 | C25 | Minor | MySQL stops the read at `maxRows` with `connection.destroy()` and no ROLLBACK, while SQX-03 says every query ends in ROLLBACK. The deviation is in a code comment only, and the test asserts it (`mysql.gateway.spec.ts:223-225`). The data risk is nil, because the server rolls back when the connection drops. | `mysql.gateway.ts:246-249`. | Record the deviation in SQX-03 of spec.md as a confirmed change and point the test at it, or drain and roll back before closing. | 6388f9d |
| F5 | C9 | Minor | The host check accepts a trailing space, because the schema calls `.trim()` before the space refusal. SRC-09 says "tem espaços" is refused. The contract test enshrines `'h '` as valid. | `packages/contracts/src/connections.ts:141-148`; `connections.spec.ts:155-170` (the `expected` line special-cases `'h '`). | Refuse whitespace on the raw value before trimming, and change the test so `'h '` is refused. Or record the trim as a spec change. | ae4dc35 |
| F6 | C8, C60 | Minor | The named timeout tests override the constants (10 s and 120 s) and never assert their defaults. The defaults are pinned only in `connections.spec.ts:148-149` and `schema-refresh.spec.ts:155`, outside these checks' proofs. | `connections-sql.spec.ts:122-137` (100 ms override); `schema-refresh-sql.spec.ts:118-167` (500 ms override). | Add `expect(DEFAULT_CONNECTION_VERIFY_TIMEOUT_MS).toBe(10_000)` and `expect(DEFAULT_SCHEMA_READ_TIMEOUT_MS).toBe(120_000)` to the named tests, or name the pinning tests in the checks. | 46ac411 |
| F7 | C75 | Minor | The SAI-07 test selected by the proof checks only the query cache. The editor assertion is in a sibling test that proofs.md does not select. | `apps/web/src/features/ai/useAiGenerations.test.tsx:437-463`; the editor check is at `:495-515`. | Add the textbox assertion (`Consulta SQL` with value SQL) to the selected test, or select the sibling test in the proof. | 14f9d62 |
| F8 | C76 | Minor | The SMG-01 migration test does not assert that the connection schema survives the migration, though the criterion lists "schema" among the fields that must stay equal. | `apps/api/test/database/connections-schema.spec.ts:75-96` (asserts type, URI, database, username, password only). | Seed a schema record before `applyFontesSql()` and assert it is unchanged after, or correct the criterion if "schema" means something the migration does not touch. | 29655bc |
| F9 | C66 | Minor | The SCS-16 named test seeds opt-out rows directly and never calls the PUT endpoint, so a broken save still passes it. The save is asserted only inside the test titled SCS-12 in `schema-relational.spec.ts` (PUT then GET with `sendExample: false`), which is not in the proof set. | `schema-refresh-sql.spec.ts:56-82`; `schema-relational.spec.ts` (PUT at roughly lines 22-30). | Drive the named test through `PUT .../example-settings` and assert the stored row, or add the save-asserting test to C66's proofs. | be7cfa5 |
| F10 | C39 | Minor | `bindSqlParams` reads `params[name]` on a plain object, so a `$` name that exists on `Object.prototype` and has no value binds to an inherited function instead of `null`. | `apps/api/src/queries/sql-params.ts:96`. Probes: `SELECT $constructor` with `{}` gives values `[Object]` (function); `SELECT $toString` gives `[toString]`. The named test uses only `a` and `b`. | Use `Object.hasOwn(params, name) ? params[name] : undefined` (or a null-prototype object), and add a `$constructor` case to `sql-params.spec.ts` SQX-17. | 62dea33 |
| F11 | Header | Minor | `proofs.md` says `**HEAD**: 9053c87`, but HEAD is d925f55. The only commits in between change `.specs/` files, so the code proofs hold; the gate reads `proofs.md` at HEAD and will refuse the mismatch. | `.specs/features/fontes-sql/proofs.md:3`; `git diff --stat 9053c87..HEAD` lists only `proofs.md` and `tasks.md`. | Rerun `check_proofs.py fontes-sql` at d925f55 so the header matches HEAD. | c0f0e78 (check_proofs rerun after the fixes: 132 pass, 0 fail) |

## Advisory notes

- ADVISORY on C50 (SQX-18, SQX-28): `bindSqlParams` given `ids: []` writes `(1 = 0) OR id IN (NULL)` and returns no rows, since an empty list is not null. The front-end path holds (`apps/web/src/features/filters/filter-values.ts` `isEmptyValue` sends `null` for empty lists), so SQX-28 holds end to end. Probe B9.
- ADVISORY on SQX-23: `uniqueColumnNames(['a','a','a_2'])` gives `['a','a_3','a_2']`. The spec says the second becomes `<nome>_2`, and it is silent on a collision with a real `a_2`. Probe.
- ADVISORY on `toSqlResultValue`: a `Date` object becomes JSON-quoted text (`"\"2024-01-15T10:30:00.000Z\""`). The shipped gateways convert dates before this function, so it is not reachable today. Probe.
- Own examples that held at HEAD: `SELECT 1 FROM t WHERE x = 'a' -- INSERT` accepted; a comment followed by `; DELETE` refused; `FOR /* x */ UPDATE` refused; a blocked word in a CTE refused; `'it''s DELETE'` accepted; `bindSqlParams` with a repeated `$a` (dollar, at, question), a single-item list, `$a IS NULL` inside a string or comment, and `IS NULL` with a comment between the tokens, all as the spec states.
- Probes were run from a throwaway spec file at HEAD and deleted; `git status` is clean apart from this file.
