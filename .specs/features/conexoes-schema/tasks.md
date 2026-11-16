# Conexões e Schema Tasks

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas (screens sub-agent, imagens `*.running.png`, walk) está dispensada por AD-023: nenhuma task captura tela.

Pré-requisito: `fundacao-auth` concluída (monorepo, harness `createTestApp`/`createTestDb`, harness de integração, `renderApp`, `SETTINGS_TABS`, `useTopBarAction`, dataset "Varejo" no Neo4j de dev).

---

**Design**: `.specs/features/conexoes-schema/design.md`
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run contracts**: `pnpm --filter @ninbi/contracts test`
**Run api**: `pnpm --filter @ninbi/api test`
**Run apiint**: `pnpm infra:up && pnpm --filter @ninbi/api test:int`
**Run web**: `pnpm --filter @ninbi/web test`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo script `test` e `test:int` roda `vitest run --reporter=verbose`. Todo nome de teste começa com o ID do requisito e contém, na ordem, as palavras da linha de `Proof` da sua check (sem o `✓`). Se o runner imprimir outro marcador de sucesso, a linha da check é corrigida a partir da saída real, nunca o teste.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012 (testes unitários das partes críticas), AD-026 (testes rápidos com PGlite e `FakeNeo4jGateway`; integração contra o `docker-compose.dev.yml`), e a matriz aprovada em `.specs/features/fundacao-auth/tasks.md`. Strong defaults applied onde não há guia.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contratos (schemas zod, mensagens) | unit | Toda regra de campo com o texto exato da mensagem; casos válidos | `packages/contracts/src/**/*.spec.ts` | `pnpm --filter @ninbi/contracts test` |
| API: funções puras (literal Cypher), cifra, leitor de schema | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: services e rotas | integration (supertest + PGlite + `FakeNeo4jGateway`) | Toda rota: sucesso + cada erro da tabela de erros do design + 403 por papel | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: driver real e corridas | integration (PostgreSQL e Neo4j do `docker-compose.dev.yml`) | Driver contra o Neo4j real; schema do "Varejo"; corridas CONN-22 e SCH-11 | `apps/api/test-int/**/*.int.spec.ts` | `pnpm infra:up && pnpm --filter @ninbi/api test:int` |
| Banco (schema Drizzle, migração) | integration (PGlite) | Migração aplica; índice único e cascata | `apps/api/test/database/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Web: componentes e páginas | unit (Testing Library + jsdom + user-event + MSW) | Gesto do critério + o que a tela mostra; toda mensagem da spec com o texto exato | `apps/web/src/**/*.test.tsx` | `pnpm --filter @ninbi/web test` |

## Gate Check Commands

> Generated from the design - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task com testes de um só pacote | `pnpm --filter <pacote da task> test` (`@ninbi/contracts`, `@ninbi/api` ou `@ninbi/web`) |
| Full | Task com teste de integração real | `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int` |
| Build | Última task de cada fase | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

`pnpm test` na raiz é `pnpm -r test`. Uma task de fim de fase que também tem teste de integração roda o Build e depois o Full.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Lotes de execução

| Lote | Fases | Tasks | Modelo |
| ---- | ----- | ----- | ------ |
| 1 | Phase 1 - Contratos e infraestrutura; Phase 2 - Leitura do schema | T1-T7 (7) | sonnet |
| 2 | Phase 3 - Rotas da API; Phase 4 - Conexões no web | T8-T13 (6) | sonnet |
| 3 | Phase 5 - Schema no web | T14-T17 (4) | sonnet |

### Phase 1: Contratos e infraestrutura

Contratos, cifra da senha, tabelas e o gateway do Neo4j. As quatro tasks são independentes entre si.

```
T1
T2
T3
T4
```

### Phase 2: Leitura do schema

```
T5 → T6 → T7
```

### Phase 3: Rotas da API

```
T8 → T9
T8 → T10
```

### Phase 4: Conexões no web

```
T11 → T12 → T13
```

### Phase 5: Schema no web

```
T14 → T17
T15 → T16 → T17
```

---

## Task Breakdown

### Phase 1 tasks: Contratos e infraestrutura

### T1: Definir os contratos de conexões e schema

**What**: `packages/contracts/src/connections.ts` com `connectionCreateSchema` (nome com `trim`, 1 a 80; URI com um dos seis esquemas, sem diferenciar maiúsculas, e host; banco opcional, vazio vira `null`; usuário obrigatório; senha obrigatória), `connectionUpdateSchema` (igual, senha opcional e vazia aceita), `exampleSettingSchema` (`kind: 'LABEL' | 'RELATIONSHIP'`, `element`, `property`, `sendExample`), os tipos `SchemaStatus`, `ConnectionDto`, `SchemaStateDto`, `SchemaPropertyDto`, `SchemaElementDto`, `ConnectionSchemaDto`; acréscimos em `MESSAGES` (todas as mensagens da tabela "Validação e mensagens" e de "Error Handling Strategy" do design, inclusive "Não foi possível conectar em 10 s", "A leitura do schema passou de 120 s", "Nenhuma conexão cadastrada", "Não foi possível carregar as conexões", "Não foi possível ler o schema", "Este banco não tem dados") e em `ERROR_CODES` (`CONNECTION_NAME_TAKEN`, `CONNECTION_NOT_FOUND`, `NEO4J_UNAVAILABLE`, `NEO4J_TIMEOUT`, `SCHEMA_PROPERTY_NOT_FOUND`). Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/connections.ts`
**Depends on**: None
**Reuses**: `zod`, `MESSAGES` e `ERROR_CODES` existentes
**Requirement**: CONN-10, CONN-11, CONN-12

**Done when**:

- [x] Testes: CONN-10 (aceita `neo4j://h`, `neo4j+s://h`, `neo4j+ssc://h`, `bolt://h:7687`, `bolt+s://h`, `bolt+ssc://h` e `BOLT://h`; recusa `http://h`, `h:7687`, `neo4j://` sem host e vazio, todos com "URI inválida"), CONN-11 (nome vazio e só espaços dão "Informe o nome"; 81 caracteres dão "O nome pode ter até 80 caracteres"; 80 passa), CONN-12 (banco `""` e `"  "` viram `null`; `"vendas"` fica), usuário e senha vazios com as mensagens; `connectionUpdateSchema` aceita senha vazia e ausente
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add connection and schema contracts`

---

### T2: Cifrar segredos e exigir `NINBI_ENCRYPTION_KEY`

**What**: `CryptoService` (AES-256-GCM, IV de 12 bytes, formato `v1:<iv>:<tag>:<cifra>` em base64) em `CryptoModule` global; `env.ts` passa a exigir `NINBI_ENCRYPTION_KEY` (ausente ou vazia: `Error('NINBI_ENCRYPTION_KEY não definida')`; não decodifica para 32 bytes: `'NINBI_ENCRYPTION_KEY deve ter 32 bytes em base64'`); `main.ts` exporta `bootstrap()` e, no erro, grava a mensagem com `Logger.error` e chama `process.exit(1)`; chave de teste fixa em `test.env` dos dois `vitest*.config.ts` da API; `apps/api/.env.example` e o serviço `app` do `docker-compose.yml` recebem um valor padrão de desenvolvimento (`${NINBI_ENCRYPTION_KEY:-<base64 de 32 bytes>}`) com comentário "troque em produção".
**Where**: `apps/api/src/crypto/crypto.service.ts`
**Depends on**: None
**Reuses**: `node:crypto`, `apps/api/src/config/env.ts`
**Requirement**: CONN-13, CONN-21

**Done when**:

- [x] Testes: CONN-13 (`encrypt('s3nh@-Neo4j')` começa com `v1:`, não contém o texto nem o seu base64, `decrypt` devolve o texto; duas cifras do mesmo texto diferem; cifra adulterada lança), CONN-21 (`bootstrap()` com env sem a chave grava "NINBI_ENCRYPTION_KEY não definida" no logger capturado e chama `process.exit(1)`, com `process.exit` substituído no teste; chave de 16 bytes dá a outra mensagem)
- [x] `docker compose -f docker-compose.yml config` mostra `NINBI_ENCRYPTION_KEY` no serviço `app`
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): encrypt secrets with aes-256-gcm and require the key at startup`

---

### T3: Criar as tabelas de conexões e schema

**What**: Em `apps/api/src/database/schema.ts`, os enums `schema_status` e `schema_element_kind` e as tabelas `connections`, `connection_schemas` e `schema_example_opt_outs` conforme "Data Models" do design (índice `connections_name_lower_uq` em `lower(name)`, chaves estrangeiras `on delete cascade`); migração gerada com `drizzle-kit generate` em `apps/api/drizzle/`.
**Where**: `apps/api/src/database/schema.ts` (modify)
**Depends on**: None
**Reuses**: `createTestDb()`
**Requirement**: CONN-18, CONN-22

**Done when**:

- [x] Testes em `apps/api/test/database/connections-schema.spec.ts`: migrações aplicam no PGlite; CONN-22 (inserir `Vendas` depois de `vendas` viola `connections_name_lower_uq`); CONN-18 (apagar a conexão apaga a linha de `connection_schemas` e as de `schema_example_opt_outs`); conexão nova nasce com `schema_status = 'NEVER'`
- [x] `drizzle-kit generate` não gera diferença depois do commit
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add connection, schema cache and example opt-out tables`

---

### T4: Criar o gateway do Neo4j e o fake de teste

**What**: Dependência `neo4j-driver` 5.x na API; `neo4j.gateway.ts` (interface `Neo4jGateway`, token `NEO4J_GATEWAY`, `Neo4jConnectionConfig`, `Neo4jReadResult`, `Neo4jTimeoutError`, `Neo4jGatewayError`), `driver-neo4j.gateway.ts` e `neo4j.module.ts` conforme o design (driver por operação, `defaultAccessMode: READ`, `executeRead` com `timeout`, `database: cfg.database ?? undefined`, prazo que fecha o driver e rejeita com `Neo4jTimeoutError`, erro do driver vira `Neo4jGatewayError` com a mesma `message`); `apps/api/test/fakes/fake-neo4j.gateway.ts` (`whenVerify`, `whenRead`, `release`, `calls`); `createTestApp` passa a registrar um `FakeNeo4jGateway` no token e devolvê-lo em `neo4j`.
**Where**: `apps/api/src/neo4j/driver-neo4j.gateway.ts`
**Depends on**: None
**Reuses**: harness `createTestApp`, `docker-compose.dev.yml` (Neo4j em `bolt://localhost:7688`, `neo4j` / `ninbi-dev-password`)
**Requirement**: CONN-08, CONN-09, CONN-12, SCH-12

**Done when**:

- [x] Teste rápido `apps/api/test/neo4j/driver-neo4j.gateway.spec.ts`: CONN-09 (um `net.createServer` que aceita e nunca responde; `verify` com `timeoutMs: 200` rejeita com `Neo4jTimeoutError` em menos de 2 s); porta fechada rejeita com `Neo4jGatewayError`
- [x] Teste de integração `apps/api/test-int/neo4j-gateway.int.spec.ts`: `verify` com as credenciais certas resolve; CONN-08 (senha errada rejeita com `Neo4jGatewayError` cuja `message` é a do Neo4j, sem a senha); CONN-12 (com `database: null`, `read('CALL db.info() YIELD name RETURN name')` devolve o banco padrão `neo4j`); SCH-12 (`read` com `CREATE (:NinbiWriteProbe)` rejeita e `MATCH (n:NinbiWriteProbe) RETURN count(n)` continua 0)
- [x] Gate check passes: `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `feat(api): add read-only neo4j gateway with timeouts and test fake`

---

### Phase 2 tasks: Leitura do schema

### T5: Converter valores do Neo4j em literal Cypher

**What**: `toCypherLiteral(value: unknown): string` e `escapeIdentifier(name: string): string` conforme as regras do design.
**Where**: `apps/api/src/schema/cypher-literal.ts`
**Depends on**: T4
**Reuses**: tipos de `neo4j-driver` (`Date`, `DateTime`, `LocalDateTime`, `Time`, `LocalTime`, `Duration`, `Point`, `Integer`)
**Requirement**: SCH-04, SCH-27

**Done when**:

- [x] Testes: SCH-27 (`new Date(2024, 1, 5)` do driver vira `date('2024-02-05')`; `DateTime` vira `datetime('...')` com fuso; `Point` 4326 vira `point({srid: 4326, x: -46.63, y: -23.55})`; `Point` 3D tem `z`; lista `[1, 'a']` vira `[1, 'a']`; mapa `{nome: 'Ana', 'tem espaço': 1}` vira `{nome: 'Ana', `tem espaço`: 1}`; aninhados), SCH-04 (string de 100.000 caracteres sai inteira entre aspas), aspas e barras escapadas (`O'Brien` → `'O\'Brien'`), `Integer` acima de 2^53 sem perda, `escapeIdentifier('a`b')` → `` `a``b` ``
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): convert neo4j values to cypher literals`

---

### T6: Ler o schema enriquecido do Neo4j

**What**: `SchemaReader.read(cfg, { deadline, signal })` com as quatro consultas do design, só por `Neo4jGateway.read`, devolvendo `StoredSchema` (`apps/api/src/schema/types.ts`); exemplos convertidos por `toCypherLiteral`. Helper de teste `apps/api/test/fakes/schema-fixture.ts` que programa o `FakeNeo4jGateway` a partir de uma descrição compacta de labels, tipos, padrões e valores.
**Where**: `apps/api/src/schema/schema-reader.ts`
**Depends on**: T5
**Reuses**: `FakeNeo4jGateway`, `toCypherLiteral`, `escapeIdentifier`
**Requirement**: SCH-02, SCH-03, SCH-04, SCH-05, SCH-26

**Done when**:

- [x] Testes rápidos: SCH-02 (nó com labels `Pessoa` e `Cliente` dá a propriedade aos dois; `codigo` com `["String"]` numa linha e `["Long"]` em outra fica `["String", "Long"]` sem repetir; label sem propriedade aparece com lista vazia), SCH-03 (`` :`CONTEM` `` vira `CONTEM` com `quantidade: ["Long"]`), SCH-04 (o exemplo é o valor devolvido pela consulta de exemplo, inteiro; propriedade sem linha fica `example: null`), SCH-05 (`FEZ` guarda `{from: 'Cliente', to: 'Pedido'}`), SCH-26 (erro `Neo.ClientError.Security.Forbidden` do gateway sobe com a mesma mensagem)
- [x] Teste de integração `apps/api/test-int/schema-reader.int.spec.ts` contra o "Varejo": SCH-02 (`Pedido` tem `data` com `["Date"]` e `valorTotal`), SCH-03 (`CONTEM` tem `quantidade`), SCH-04 (o exemplo de `Pedido.codigo` existe: `MATCH (p:Pedido) WHERE p.codigo = <exemplo> RETURN count(p)` dá 1 ou mais), SCH-05 (`FEZ` liga `Cliente` a `Pedido`; `VENDIDO_EM` liga `Pedido` a `Loja`)
- [x] Gate check passes: `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `feat(api): read enriched schema with types, examples and patterns`

---

### T7: Controlar a leitura e gravar o cache do schema

**What**: `SchemaRefreshService` (`start`, `whenSettled`) com claim atômico em `connections`, leitura em segundo plano com prazo `SCHEMA_READ_TIMEOUT_MS` (padrão `120_000`, token sobrescrevível), gravação transacional que descarta se a conexão sumiu, substitui `connection_schemas`, poda opt-outs órfãos e marca `READY`; falha marca `FAILED` com a mensagem e mantém o documento; uma linha de log por leitura no formato do design. `SchemaModule` registra o serviço.
**Where**: `apps/api/src/schema/schema-refresh.service.ts`
**Depends on**: T6, T3, T2
**Reuses**: `SchemaReader`, `CryptoService.decrypt`, `Clock`, `createTestApp`
**Requirement**: SCH-06, SCH-09, SCH-10, SCH-11, SCH-14, SCH-23, SCH-25, SCH-28, SCH-29

**Done when**:

- [x] Testes (PGlite + fake): SCH-06 (segunda leitura troca o documento e `read_at` passa ao horário do `Clock`), SCH-09 (falha depois de uma leitura boa: documento e `read_at` anteriores ficam, `schema_status = 'FAILED'`, `schema_error` = mensagem do Neo4j), SCH-10 (leitura pendurada com prazo de 100 ms termina `FAILED` com "A leitura do schema passou de 120 s"; teste separado confere o padrão `120_000`), SCH-11 (com uma leitura pendurada, `start` devolve `READING` e o leitor foi chamado uma vez só), SCH-14 (a linha de log tem `connection=`, `durationMs=`, `labels=2`, `relationshipTypes=1`, `result=ok` e não contém nenhum exemplo; falha registra `result=failed`), SCH-23 (opt-out de `Cliente.email` sobrevive a uma releitura em que `email` continua), SCH-25 (propriedade nova não tem opt-out), SCH-28 (label `Antigo` que some leva junto o opt-out dele), SCH-29 (conexão apagada enquanto a leitura está pendurada: depois de `release`, nenhuma linha em `connection_schemas` e log `result=discarded`)
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): run schema reads with atomic claim, timeout and cache replace`

---

### Phase 3 tasks: Rotas da API

### T8: Listar e criar conexões

**What**: `ConnectionsService` e `ConnectionsController`: `GET /api/connections` (`connections.read`, ordem `lower(name), name`) e `POST /api/connections` (`connections.manage`): valida, recusa nome repetido, `verify` com `CONNECTION_VERIFY_TIMEOUT_MS` (padrão `10_000`), cifra a senha, insere; `Neo4jTimeoutError` → 422 `NEO4J_TIMEOUT`, `Neo4jGatewayError` → 422 `NEO4J_UNAVAILABLE` com a mensagem do Neo4j, violação do índice → 409 `CONNECTION_NAME_TAKEN` com `fieldErrors.name`; `toConnectionDto` sem senha.
**Where**: `apps/api/src/connections/connections.controller.ts`
**Depends on**: T7
**Reuses**: `Neo4jGateway`, `CryptoService`, `connectionCreateSchema`, `@RequirePermission`
**Requirement**: CONN-01, CONN-06, CONN-07, CONN-08, CONN-09, CONN-10, CONN-11, CONN-12, CONN-13, CONN-14, CONN-19, CONN-22

**Done when**:

- [ ] Testes rápidos: CONN-01 (Admin e Editor recebem `vendas`, `Analytics`, `Zeta` como `Analytics`, `vendas`, `Zeta` com `name`, `uri`, `database`, `schemaReadAt`), CONN-06 (com `verify` programado para falhar nada é salvo; o `verify` recebeu URI, banco, usuário e a senha digitada), CONN-07 (201 e a conexão aparece no `GET`), CONN-08 (422 com a mensagem do Neo4j e tabela vazia), CONN-09 (verify pendurado com prazo curto dá 422 "Não foi possível conectar em 10 s"; teste separado confere o padrão `10_000`), CONN-10 (`http://x` dá 400 com "URI inválida" em `fieldErrors.uri`), CONN-11 (nome `VENDAS` depois de `vendas` dá 409 com "Já existe uma conexão com este nome" em `fieldErrors.name`, sem chamar `verify`), CONN-12 (banco vazio: `verify` recebe `database: null` e a linha guarda `null`), CONN-13 (`password_encrypted` começa com `v1:` e não contém a senha), CONN-14 (o texto das respostas de `POST` e `GET` não contém a senha nem as chaves `password` e `passwordEncrypted`), CONN-19 (Editor e Visualizador recebem 403 no `POST`; Visualizador recebe 403 no `GET`)
- [ ] Teste de integração `apps/api/test-int/connections.int.spec.ts`: CONN-22 (dois `POST` simultâneos com o mesmo nome, `verify` do fake: um 201, um 409 com a mensagem no campo, uma linha só)
- [ ] Gate check passes: `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `feat(api): list and create neo4j connections with tested credentials`

---

### T9: Editar e excluir conexões

**What**: `PATCH /api/connections/:id` (senha vazia ou ausente mantém a guardada; `verify` com os dados novos e a senha efetiva antes de gravar; 404 `CONNECTION_NOT_FOUND`) e `DELETE /api/connections/:id` (204; cascata apaga schema e escolhas), ambos `connections.manage`.
**Where**: `apps/api/src/connections/connections.service.ts` (modify)
**Depends on**: T8
**Reuses**: `CryptoService.decrypt`, `connectionUpdateSchema`
**Requirement**: CONN-14, CONN-15, CONN-16, CONN-18, CONN-19

**Done when**:

- [ ] Testes: CONN-15 (`PATCH` com `password: ""` e sem `password`: `verify` recebe a senha original e `password_encrypted` decifra para ela), CONN-16 (`PATCH` mudando a URI com `verify` falhando: 422 e a linha continua com a URI antiga; passando: 200 e URI nova), CONN-18 (`DELETE` dá 204 e somem a conexão, `connection_schemas` e `schema_example_opt_outs` dela), CONN-19 (Editor e Visualizador recebem 403 no `PATCH` e no `DELETE`), CONN-14 (a resposta do `PATCH` não contém a senha), 404 para id inexistente
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): edit and delete connections keeping the stored password`

---

### T10: Expor o schema e a escolha de exemplo

**What**: `SchemaQueryService.get(id)` (DTO em ordem alfabética com `sendExample`) e `SchemaController`: `GET /api/connections/:id/schema` e `POST /api/connections/:id/schema/refresh` (`connections.read`, 202 com o estado), `PUT /api/connections/:id/schema/example-settings` (`connections.manage`; grava ou apaga o opt-out; 404 `SCHEMA_PROPERTY_NOT_FOUND`). `ConnectionsService.create` chama `refresh.start(id)` depois de inserir, sem esperar.
**Where**: `apps/api/src/schema/schema.controller.ts`
**Depends on**: T8
**Reuses**: `SchemaRefreshService`, `exampleSettingSchema`, schema-fixture
**Requirement**: SCH-01, SCH-07, SCH-08, SCH-11, SCH-13, SCH-15, SCH-22, SCH-24

**Done when**:

- [ ] Testes rápidos: SCH-01 (`POST /api/connections` e, depois de `whenSettled`, o `GET` do schema traz `status: 'READY'` e os labels do fixture, sem outra chamada), SCH-07 (com o fixture alterado, `POST .../refresh` e `whenSettled` trazem a propriedade nova e `readAt` novo), SCH-08 (com a leitura pendurada, `GET` e `POST .../refresh` devolvem `status: 'READING'`), SCH-13 (Visualizador recebe 403 em `GET .../schema` e em `POST .../refresh`; Editor recebe 200 e 202), SCH-15 (labels `Zeta`, `alfa`, `Beta` voltam `alfa`, `Beta`, `Zeta`; tipos e propriedades também em ordem), SCH-22 (Admin envia `sendExample: false` para `Cliente.email`, o `GET` mostra `sendExample: false` só nela; `true` volta), SCH-24 (Editor recebe 403 no `PUT`)
- [ ] Teste de integração `apps/api/test-int/schema-refresh.int.spec.ts`: SCH-11 (dois `POST .../refresh` simultâneos no PostgreSQL real com o leitor pendurado: os dois respondem `READING` e o leitor foi chamado uma vez)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `feat(api): expose schema, refresh and example settings routes`

---

### Phase 4 tasks: Conexões no web

### T11: Listar conexões na aba "Conexões"

**What**: `src/features/connections/api.ts` (`useConnections`), `ConnectionsTab` conforme o design (tabela "Nome", "URI", "Banco", "Última leitura do schema"; "Padrão do servidor"; "Nunca lido"; "Lendo schema..."; nome como link para `/configuracoes/conexoes/<id>`; esqueleto; erro com "Tentar novamente"; "Nenhuma conexão cadastrada"; "Nova conexão" na TopBar e "Editar"/"Excluir" por linha só para quem tem `connections.manage`, ainda sem ação); `formatDateTime` em `src/lib/format.ts`; `test.env.TZ = 'America/Sao_Paulo'` no `vitest.config.ts` do web; fixtures MSW em `src/test/fixtures/connections.ts`. Liga `available: true` na aba `conexoes` de `SETTINGS_TABS` e registra `ConnectionsTab` na `SettingsPage`. Atualiza, conforme AD-041, os testes de fundacao-auth ROLE-04 (Editor passa a ver "Configurações"; Visualizador continua sem ver) e CFG-02 (Admin vê "Conexões" e "Usuários", nessa ordem; Editor vê só "Conexões").
**Where**: `apps/web/src/features/connections/ConnectionsTab.tsx`
**Depends on**: T1
**Reuses**: `UsersTab` (padrão de tabela, esqueleto e erro), `useTopBarAction`, `can()`, `renderApp`
**Requirement**: CONN-01, CONN-02, CONN-03, CONN-04, CONN-05

**Done when**:

- [ ] Testes com gesto: CONN-01 (Admin e Editor abrem "Configurações" › "Conexões" e veem "Vendas", `neo4j+s://vendas.exemplo:7687`, "Padrão do servidor" e "16/11/2026, 14:30" para `2026-11-16T17:30:00Z`), CONN-02 (lista vazia mostra "Nenhuma conexão cadastrada"), CONN-03 (resposta pendente mostra linhas de esqueleto e nenhum nome), CONN-04 (500 mostra "Não foi possível carregar as conexões"; clicar em "Tentar novamente" com o handler já em 200 mostra a lista), CONN-05 (Admin vê "Nova conexão", "Editar" e "Excluir"; Editor não vê nenhum dos três)
- [ ] Testes ROLE-04 e CFG-02 de fundacao-auth atualizados e verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): list connections in the settings connections tab`

---

### T12: Criar o diálogo de conexão

**What**: `ConnectionFormDialog` em modo criar (aberto por "Nova conexão") e editar (aberto por "Editar"): "Nome", "URI", "Banco", "Usuário", "Senha"; na edição, campos preenchidos menos a senha, com a ajuda "Deixe em branco para manter a senha atual", e a senha vazia não é enviada; "Salvar" desabilitado durante o envio; `fieldErrors` no campo; erro `NEO4J_UNAVAILABLE`/`NEO4J_TIMEOUT` em alerta no diálogo, que continua aberto e preenchido; sucesso fecha e invalida a lista. Hooks `useCreateConnection` e `useUpdateConnection` em `api.ts`.
**Where**: `apps/web/src/features/connections/ConnectionFormDialog.tsx`
**Depends on**: T11
**Reuses**: `NewUserDialog` (padrão), `connectionCreateSchema`, `connectionUpdateSchema`, `dialog`, `form`
**Requirement**: CONN-06, CONN-07, CONN-08, CONN-09, CONN-10, CONN-11, CONN-15, CONN-16, CONN-20

**Done when**:

- [ ] Testes com gesto: CONN-07 (preencher os cinco campos e salvar envia nome, URI, banco, usuário e senha, e "Vendas" aparece na lista), CONN-08 (422 com "Neo.ClientError.Security.Unauthorized: The client is unauthorized" mostra essa mensagem e os campos continuam com o que foi digitado), CONN-09 (422 `NEO4J_TIMEOUT` mostra "Não foi possível conectar em 10 s"), CONN-10 (URI `http://x` mostra "URI inválida" no campo e nenhuma requisição sai), CONN-11 (409 mostra "Já existe uma conexão com este nome" no campo "Nome"; nome com 81 caracteres mostra "O nome pode ter até 80 caracteres" sem enviar), CONN-15 (editar mudando só o nome e com "Senha" vazia envia um corpo sem `password`), CONN-16 (edição com 422 mostra a mensagem do Neo4j e mantém o diálogo aberto), CONN-20 (com a resposta pendente, "Salvar" está desabilitado)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add create and edit connection dialog`

---

### T13: Excluir conexões com confirmação

**What**: `ConnectionRowActions`: "Editar" abre o `ConnectionFormDialog` da linha; "Excluir" abre o alert-dialog "Excluir a conexão <nome>? O schema guardado também será apagado." com "Excluir" e "Cancelar"; confirmar chama `DELETE` (`useDeleteConnection`) e invalida a lista.
**Where**: `apps/web/src/features/connections/ConnectionRowActions.tsx`
**Depends on**: T12
**Reuses**: `UserRowActions` (padrão), `alert-dialog`
**Requirement**: CONN-17, CONN-18

**Done when**:

- [ ] Testes com gesto: CONN-17 ("Excluir" na linha "Vendas" mostra "Excluir a conexão Vendas? O schema guardado também será apagado."; "Cancelar" fecha sem requisição), CONN-18 (confirmar envia `DELETE` e "Vendas" some da lista)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): delete connections after confirmation`

---

### Phase 5 tasks: Schema no web

### T14: Criar a lista de labels e tipos de relacionamento

**What**: `SchemaElementList` com os grupos "Labels" e "Tipos de relacionamento", itens na ordem recebida, clique seleciona (`onSelect({ kind, name })`), item selecionado com `aria-current="true"`, contêiner próprio com `overflow-y-auto`; fixtures `src/test/fixtures/schema.ts` (`ConnectionSchemaDto` com labels, tipos, padrões, exemplos de data, ponto, lista, mapa e texto longo, e uma propriedade sem exemplo).
**Where**: `apps/web/src/features/connections/SchemaElementList.tsx`
**Depends on**: T1
**Reuses**: tipos de `@ninbi/contracts`
**Requirement**: SCH-15, SCH-20

**Done when**:

- [ ] Testes com gesto: SCH-15 (os dois grupos mostram os nomes na ordem do DTO), clicar em "Pedido" chama `onSelect` com `{ kind: 'LABEL', name: 'Pedido' }` e marca o item, SCH-20 (o contêiner da lista tem `overflow-y-auto`)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add schema label and relationship type list`

---

### T15: Criar a tabela de propriedades do schema

**What**: `SchemaPropertiesTable` recebe um `SchemaElementDto` (e `patterns` quando é tipo de relacionamento): padrões no formato `(:Origem)-[:TIPO]->(:Destino)` acima da tabela; colunas "Propriedade", "Tipos" (tipos separados por vírgula), "Exemplo"; exemplo em célula `truncate` com `title` igual ao valor inteiro; "sem exemplo" quando `example` é `null`; contêiner `overflow-y-auto` e `thead` `sticky top-0`; slot da coluna "Enviar exemplo à IA" preenchido na T16.
**Where**: `apps/web/src/features/connections/SchemaPropertiesTable.tsx`
**Depends on**: T1
**Reuses**: `table`, fixtures de schema
**Requirement**: SCH-16, SCH-17, SCH-18, SCH-20, SCH-21, SCH-27

**Done when**:

- [ ] Testes: SCH-16 (cabeçalhos "Propriedade", "Tipos", "Exemplo"; a linha `codigo` mostra `String, Long` e `'P-0001'`), SCH-17 (`CONTEM` mostra `(:Pedido)-[:CONTEM]->(:Produto)`), SCH-18 (propriedade com `example: null` mostra "sem exemplo"), SCH-20 (contêiner com `overflow-y-auto`; `thead` com `sticky` e `top-0`), SCH-21 (exemplo de 5.000 caracteres está numa célula com `truncate` e `title` igual ao valor inteiro), SCH-27 (`date('2024-02-05')`, `point({srid: 4326, x: -46.63, y: -23.55})`, `[1, 2]` e `{nome: 'Ana'}` aparecem exatamente assim)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add schema properties table with types and examples`

---

### T16: Ligar e desligar "Enviar exemplo à IA"

**What**: Componente `switch` do shadcn (`pnpm dlx shadcn@latest add switch` em `apps/web`); `ExampleToggle` com `aria-label="Enviar exemplo à IA"`, habilitado só com `connections.manage`; mudar chama `PUT .../schema/example-settings` (`useSetExampleSetting`) e, desligado, a linha mostra "exemplo não enviado"; coluna "Enviar exemplo à IA" na `SchemaPropertiesTable`.
**Where**: `apps/web/src/features/connections/ExampleToggle.tsx`
**Depends on**: T15
**Reuses**: `switch`, `can()`
**Requirement**: SCH-22, SCH-24

**Done when**:

- [ ] Testes com gesto: SCH-22 (Admin desliga o controle de `email`; o `PUT` leva `{ kind: 'LABEL', element: 'Cliente', property: 'email', sendExample: false }` e a linha mostra "exemplo não enviado"), SCH-24 (para Editor o controle está desabilitado; para Admin, habilitado)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): toggle sending property examples to the ai`

---

### T17: Compor a página do schema

**What**: `SchemaPage` na rota `/configuracoes/conexoes/:connectionId` (registrada em `router.tsx`, dentro das guardas de `connections.read`): título com o nome da conexão, "Última leitura: <data>", botão "Atualizar schema" (`useRefreshSchema`); `useConnectionSchema` com `refetchInterval: 2000` enquanto `READING`; "Lendo schema..." e botão desabilitado enquanto `READING`; alerta "Não foi possível ler o schema" + `error` em `FAILED`, com o schema anterior visível; "Este banco não tem dados" quando há leitura e nenhum label; layout de duas colunas com `SchemaElementList` e `SchemaPropertiesTable` rolando cada uma por conta própria; primeiro label selecionado ao abrir.
**Where**: `apps/web/src/features/connections/SchemaPage.tsx`
**Depends on**: T14, T16, T11
**Reuses**: `SchemaElementList`, `SchemaPropertiesTable`, `ExampleToggle`, `formatDateTime`
**Requirement**: SCH-07, SCH-08, SCH-09, SCH-15, SCH-19, SCH-20

**Done when**:

- [ ] Testes com gesto: SCH-15 (clicar no nome "Vendas" na aba Conexões abre a página com "Labels", "Tipos de relacionamento" e "Última leitura: 16/11/2026, 14:30"), SCH-07 (clicar em "Atualizar schema" envia o `POST`; quando o `GET` passa a `READY` com `readAt` novo, a data nova aparece), SCH-08 (com `status: 'READING'`, aparece "Lendo schema..." e o botão está desabilitado), SCH-09 (`FAILED` com `error` "Neo.ClientError.Security.Forbidden" mostra "Não foi possível ler o schema", a mensagem e os labels anteriores), SCH-19 (`READY` sem labels mostra "Este banco não tem dados"), SCH-20 (a página põe lista e tabela em colunas irmãs, cada uma com `overflow-y-auto`, e só a tabela tem cabeçalho `sticky`)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): add schema page with refresh and read status`

---

## Checks

**C1** - Admin e Editor veem na aba "Conexões" nome, URI, banco e data e hora da última leitura do schema (CONN-01, AC 1)
Proof: run api | ✓ CONN-01 lista conexões com nome, URI, banco e última leitura em ordem de nome
Proof: run web | ✓ CONN-01 aba Conexões mostra nome, URI, banco e última leitura para Admin e Editor

**C2** - Sem conexão cadastrada, a aba mostra "Nenhuma conexão cadastrada" (CONN-02, AC 2)
Proof: run web | ✓ CONN-02 sem conexões mostra Nenhuma conexão cadastrada

**C3** - Enquanto a lista carrega, aparecem linhas de esqueleto (CONN-03, AC 3)
Proof: run web | ✓ CONN-03 linhas de esqueleto enquanto a lista carrega

**C4** - Falha ao carregar mostra "Não foi possível carregar as conexões" e "Tentar novamente" recarrega (CONN-04, AC 4)
Proof: run web | ✓ CONN-04 erro mostra Não foi possível carregar as conexões e Tentar novamente recarrega

**C5** - "Nova conexão", "Editar" e "Excluir" aparecem só para Admin (CONN-05, AC 5)
Proof: run web | ✓ CONN-05 Nova conexão, Editar e Excluir só aparecem para Admin

**C6** - "Nova conexão" testa a conexão no Neo4j antes de salvar (CONN-06, AC 6)
Proof: run api | ✓ CONN-06 testa a conexão no Neo4j antes de salvar

**C7** - Teste aprovado salva a conexão e ela aparece na lista (CONN-07, AC 7)
Proof: run api | ✓ CONN-07 teste aprovado salva a conexão e ela aparece na lista
Proof: run web | ✓ CONN-07 nova conexão enviada aparece na lista

**C8** - Teste reprovado não salva, mantém o formulário e mostra a mensagem do Neo4j (CONN-08, AC 8)
Proof: run api | ✓ CONN-08 teste reprovado não salva e devolve a mensagem do Neo4j
Proof: run apiint | ✓ CONN-08 senha errada rejeita com a mensagem do Neo4j
Proof: run web | ✓ CONN-08 erro do Neo4j aparece com o formulário preenchido

**C9** - Neo4j sem resposta em 10 s mostra "Não foi possível conectar em 10 s" (CONN-09, AC 9)
Proof: run api | ✓ CONN-09 verify encerra no prazo com Neo4jTimeoutError
Proof: run api | ✓ CONN-09 Neo4j sem resposta no prazo devolve Não foi possível conectar em 10 s
Proof: run api | ✓ CONN-09 prazo padrão do teste de conexão é 10 s
Proof: run web | ✓ CONN-09 prazo esgotado mostra Não foi possível conectar em 10 s

**C10** - URI fora dos seis esquemas é recusada com "URI inválida" no campo (CONN-10, AC 10)
Proof: run contracts | ✓ CONN-10 aceita os seis esquemas de URI e recusa os demais com URI inválida
Proof: run api | ✓ CONN-10 URI inválida responde 400 no campo uri
Proof: run web | ✓ CONN-10 URI inválida mostra a mensagem no campo sem enviar

**C11** - Nome vazio, com mais de 80 caracteres ou repetido é recusado com a mensagem no campo "Nome" (CONN-11, AC 11)
Proof: run contracts | ✓ CONN-11 nome vazio ou com mais de 80 caracteres
Proof: run api | ✓ CONN-11 nome repetido sem diferenciar maiúsculas responde 409 no campo name
Proof: run web | ✓ CONN-11 nome repetido mostra Já existe uma conexão com este nome no campo Nome

**C12** - "Banco" vazio usa o banco padrão do servidor (CONN-12, AC 12)
Proof: run contracts | ✓ CONN-12 banco vazio vira null
Proof: run api | ✓ CONN-12 banco vazio conecta sem banco e guarda null
Proof: run apiint | ✓ CONN-12 sem banco a sessão usa o banco padrão do servidor

**C13** - A senha da conexão fica cifrada no PostgreSQL (CONN-13, AC 13)
Proof: run api | ✓ CONN-13 cifra AES-256-GCM no formato v1 e decifra de volta
Proof: run api | ✓ CONN-13 senha guardada cifrada no PostgreSQL

**C14** - Nenhuma resposta da API contém a senha (CONN-14, AC 14)
Proof: run api | ✓ CONN-14 nenhuma resposta da API contém a senha
Proof: run api | ✓ CONN-14 resposta da edição não contém a senha

**C15** - Editar com "Senha" vazia mantém a senha guardada (CONN-15, AC 15)
Proof: run api | ✓ CONN-15 senha vazia na edição mantém a senha guardada
Proof: run web | ✓ CONN-15 editar com Senha vazia não envia senha

**C16** - Salvar a edição testa a conexão de novo antes de gravar (CONN-16, AC 16)
Proof: run api | ✓ CONN-16 edição testa a conexão de novo antes de gravar
Proof: run web | ✓ CONN-16 edição reprovada mostra o erro do Neo4j

**C17** - "Excluir" pede confirmação com "Excluir a conexão <nome>? O schema guardado também será apagado." (CONN-17, AC 17)
Proof: run web | ✓ CONN-17 Excluir pede confirmação com o nome da conexão

**C18** - Confirmar a exclusão apaga a conexão e o schema guardado (CONN-18, AC 18)
Proof: run api | ✓ CONN-18 excluir apaga a conexão e o schema guardado
Proof: run web | ✓ CONN-18 confirmar a exclusão tira a conexão da lista

**C19** - Editor e Visualizador recebem 403 ao criar, editar ou excluir conexão (CONN-19, AC 19)
Proof: run api | ✓ CONN-19 Editor e Visualizador recebem 403 ao criar conexão
Proof: run api | ✓ CONN-19 Editor e Visualizador recebem 403 ao editar e excluir conexão

**C20** - Durante o teste e a gravação, o botão de salvar fica desabilitado (CONN-20, AC 20)
Proof: run web | ✓ CONN-20 Salvar fica desabilitado durante o teste e a gravação

**C21** - Sem `NINBI_ENCRYPTION_KEY`, o backend não inicia e loga "NINBI_ENCRYPTION_KEY não definida" (CONN-21, edge case)
Proof: run api | ✓ CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem

**C22** - Dois envios simultâneos com o mesmo nome salvam uma conexão e recusam a outra no campo "Nome" (CONN-22, edge case)
Proof: run apiint | ✓ CONN-22 criação simultânea com o mesmo nome salva uma só

**C23** - Criar a conexão lê o schema sem outra ação do usuário (SCH-01, AC 1)
Proof: run api | ✓ SCH-01 criar a conexão lê o schema sem outra ação

**C24** - Cada label guarda as propriedades com todos os tipos encontrados (SCH-02, AC 2)
Proof: run api | ✓ SCH-02 cada label guarda as propriedades com todos os tipos
Proof: run apiint | ✓ SCH-02 schema do Varejo traz os labels com propriedades e tipos

**C25** - Cada tipo de relacionamento guarda as propriedades com todos os tipos encontrados (SCH-03, AC 3)
Proof: run api | ✓ SCH-03 cada tipo de relacionamento guarda as propriedades com todos os tipos
Proof: run apiint | ✓ SCH-03 schema do Varejo traz CONTEM com quantidade

**C26** - Cada propriedade guarda um exemplo real e inteiro (SCH-04, AC 4)
Proof: run api | ✓ SCH-04 exemplo é o primeiro valor não nulo inteiro
Proof: run api | ✓ SCH-04 literal não corta texto longo
Proof: run apiint | ✓ SCH-04 exemplo do Varejo existe no banco

**C27** - Cada tipo de relacionamento guarda os pares de origem e destino (SCH-05, AC 5)
Proof: run api | ✓ SCH-05 tipo de relacionamento guarda os pares de origem e destino
Proof: run apiint | ✓ SCH-05 Varejo liga Cliente a Pedido por FEZ

**C28** - A leitura grava o schema com data e hora, no lugar do anterior (SCH-06, AC 6)
Proof: run api | ✓ SCH-06 leitura substitui o schema anterior com data e hora

**C29** - "Atualizar schema" lê o schema de novo (SCH-07, AC 7)
Proof: run api | ✓ SCH-07 Atualizar schema lê de novo
Proof: run web | ✓ SCH-07 clicar em Atualizar schema mostra a nova data de leitura

**C30** - Durante a leitura aparece "Lendo schema..." e o botão fica desabilitado (SCH-08, AC 8)
Proof: run api | ✓ SCH-08 estado READING durante a leitura
Proof: run web | ✓ SCH-08 Lendo schema com o botão desabilitado

**C31** - Falha na leitura mantém o schema anterior e mostra "Não foi possível ler o schema" com a mensagem do Neo4j (SCH-09, AC 9)
Proof: run api | ✓ SCH-09 falha mantém o schema anterior e guarda a mensagem do Neo4j
Proof: run web | ✓ SCH-09 falha mostra Não foi possível ler o schema com a mensagem e o schema anterior

**C32** - Leitura que passa de 120 s é cancelada e tratada como falha (SCH-10, AC 10)
Proof: run api | ✓ SCH-10 leitura além do prazo é cancelada e vira falha
Proof: run api | ✓ SCH-10 prazo padrão da leitura é 120 s

**C33** - Pedido de leitura com outra em andamento não inicia outra e devolve o estado em andamento (SCH-11, AC 11)
Proof: run api | ✓ SCH-11 pedido durante leitura em andamento devolve o estado sem nova leitura
Proof: run apiint | ✓ SCH-11 pedidos simultâneos iniciam uma leitura só

**C34** - O schema é lido só com transações de leitura (SCH-12, AC 12)
Proof: run apiint | ✓ SCH-12 leitura usa transação de leitura e recusa escrita

**C35** - Visualizador recebe 403 na leitura e na consulta do schema (SCH-13, AC 13)
Proof: run api | ✓ SCH-13 Visualizador recebe 403 na leitura e na consulta do schema

**C36** - Cada leitura gera log com conexão, duração, contagens e resultado, sem exemplos (SCH-14, AC 14)
Proof: run api | ✓ SCH-14 log da leitura tem conexão, duração, contagens e resultado sem exemplos

**C37** - O schema mostra labels e tipos em ordem alfabética com a data da última leitura (SCH-15, AC 15)
Proof: run api | ✓ SCH-15 schema volta com labels e tipos em ordem alfabética
Proof: run web | ✓ SCH-15 schema mostra labels e tipos na ordem e a data da última leitura

**C38** - Selecionar um label ou tipo mostra a tabela "Propriedade", "Tipos", "Exemplo" (SCH-16, AC 16)
Proof: run web | ✓ SCH-16 selecionar um label mostra Propriedade, Tipos e Exemplo

**C39** - Tipo de relacionamento mostra os pares no formato `(:Origem)-[:TIPO]->(:Destino)` (SCH-17, AC 17)
Proof: run web | ✓ SCH-17 tipo de relacionamento mostra (:Origem)-[:TIPO]->(:Destino)

**C40** - Propriedade sem exemplo mostra "sem exemplo" (SCH-18, AC 18)
Proof: run web | ✓ SCH-18 propriedade sem exemplo mostra sem exemplo

**C41** - Banco sem labels mostra "Este banco não tem dados" (SCH-19, AC 19)
Proof: run web | ✓ SCH-19 banco sem labels mostra Este banco não tem dados

**C42** - Lista e tabela rolam de forma independente, com cabeçalho da tabela fixo (SCH-20, AC 20)
Proof: run web | ✓ SCH-20 lista e tabela rolam separadas com cabeçalho fixo

**C43** - Exemplo que não cabe mostra o começo e o valor inteiro ao passar o cursor (SCH-21, AC 21)
Proof: run web | ✓ SCH-21 exemplo longo truncado mostra o valor inteiro no title

**C44** - Admin desliga "Enviar exemplo à IA" e a propriedade fica marcada "exemplo não enviado" (SCH-22, AC 22)
Proof: run api | ✓ SCH-22 Admin desliga o envio do exemplo e o schema mostra sendExample false
Proof: run web | ✓ SCH-22 desligar Enviar exemplo à IA mostra exemplo não enviado

**C45** - A escolha de cada propriedade que continua existindo sobrevive à atualização do schema (SCH-23, AC 23)
Proof: run api | ✓ SCH-23 escolha sobrevive à atualização do schema

**C46** - O controle "Enviar exemplo à IA" só fica habilitado para Admin (SCH-24, AC 24)
Proof: run api | ✓ SCH-24 Editor recebe 403 ao mudar Enviar exemplo à IA
Proof: run web | ✓ SCH-24 controle Enviar exemplo à IA desabilitado para Editor

**C47** - Propriedade nova chega com "Enviar exemplo à IA" ligado (SCH-25, AC 25)
Proof: run api | ✓ SCH-25 propriedade nova chega com envio do exemplo ligado

**C48** - Sem permissão nos procedimentos de schema, a leitura falha e mostra a mensagem do Neo4j (SCH-26, edge case)
Proof: run api | ✓ SCH-26 sem permissão nos procedimentos a leitura falha com a mensagem do Neo4j

**C49** - Datas, pontos, listas e mapas são guardados e mostrados como literal Cypher (SCH-27, edge case)
Proof: run api | ✓ SCH-27 data, ponto, lista e mapa viram literal Cypher
Proof: run web | ✓ SCH-27 exemplo aparece como literal Cypher

**C50** - Label que deixa de existir sai do schema com as escolhas dele (SCH-28, edge case)
Proof: run api | ✓ SCH-28 label removido sai do schema com as escolhas dele

**C51** - Conexão excluída durante a leitura descarta o resultado (SCH-29, edge case)
Proof: run api | ✓ SCH-29 conexão excluída durante a leitura descarta o resultado

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** lote 1 (T1-T7, sonnet) sobre fae0714 - em andamento.
**Walked:** dispensado por AD-023

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1   T2   T3   T4
Phase 2:  T5 ------→ T6 ------→ T7
Phase 3:  T8 ------→ T9
          T8 ------→ T10
Phase 4:  T11 -----→ T12 -----→ T13
Phase 5:  T14 -----------------→ T17
          T15 -----→ T16 -----→ T17
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order: T1 to T17.
