# IA para Cypher Tasks

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas (screens sub-agent, imagens `*.running.png`, walk) está dispensada por AD-023: nenhuma task captura tela.

Pré-requisito: `fundacao-auth`, `conexoes-schema`, `dashboards-consultas`, `compartilhamento` e `widgets-graficos` concluídas (`createTestApp` com `neo4j` e `shares`, `FakeNeo4jGateway`, `FakeShareResolver`, `CryptoService`, `SchemaQueryService`, `connection_schemas`, `QueryService`, `validateReadOnlyCypher`, `DashboardAccessService` com `DbShareResolver`, `AppErrorFilter`, `SETTINGS_TABS`, `SettingsPage`, `renderApp`, `DashboardPage`, `useDashboardEditor`, `draft.ts`, `WidgetCard`, `WidgetEditorDialog`, `useWidgetResult`, `widget-config.ts`, `suggestMapping`, `validateMapping`, `columnIndex`, fixtures de dashboards e de schema).

**Nenhum teste chama um provedor de LLM real.** Toda chamada passa pelo `FakeChatModelFactory` com o `ScriptedChatModel` (T4); o factory real só é instanciado no teste dele, sem `invoke`.

---

**Design**: `.specs/features/ia-cypher/design.md`
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run contracts**: `pnpm --filter @ninbi/contracts test`
**Run api**: `pnpm --filter @ninbi/api test`
**Run web**: `pnpm --filter @ninbi/web test`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo script `test` roda `vitest run --reporter=verbose`. Todo nome de teste começa com o ID do requisito e contém, na ordem, as palavras da linha de `Proof` da sua check (sem o `✓`). Se o runner imprimir outro marcador de sucesso, a linha da check é corrigida a partir da saída real, nunca o teste.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012 (testes unitários das partes críticas), AD-026 (testes rápidos sem serviço externo; nomes com o ID do requisito; `--reporter=verbose`), AD-032 e AD-081 (modelo de chat falso), e as matrizes aprovadas de `fundacao-auth`, `dashboards-consultas` e `compartilhamento`. Strong defaults applied onde não há guia.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contratos (schemas zod, rótulos, mensagens) | unit | Toda regra de campo com o texto exato da mensagem; casos no limite | `packages/contracts/src/**/*.spec.ts` | `pnpm --filter @ninbi/contracts test` |
| Banco (schema Drizzle, migração) | integration (PGlite) | Migração aplica; check de linha única | `apps/api/test/database/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: funções puras (prompt, resposta, classificação de erro) | unit | Todos os ramos; 1:1 com os ACs; cada formato de erro listado no design | `apps/api/test/{llm,ai}/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: factory, client, services e rotas | integration (supertest + PGlite + `FakeNeo4jGateway` + `FakeShareResolver` + `FakeChatModelFactory`) | Toda rota: sucesso + cada erro da tabela de erros do design + 403/404 por papel e alcance; o laço de tentativas em cada saída | `apps/api/test/{llm,ai,queries}/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Web: funções puras | unit | Todos os ramos; 1:1 com os ACs | `apps/web/src/features/**/*.test.ts` | `pnpm --filter @ninbi/web test` |
| Web: componentes, hooks e páginas | unit (Testing Library + jsdom + user-event + MSW) | Gesto do critério + o que a tela mostra; toda mensagem da spec com o texto exato | `apps/web/src/**/*.test.tsx` | `pnpm --filter @ninbi/web test` |

## Gate Check Commands

> Generated from the design - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task com testes de um só pacote | `pnpm --filter <pacote da task> test` (`@ninbi/contracts`, `@ninbi/api` ou `@ninbi/web`) |
| Full | Não usado nesta feature: não há teste de integração com serviço real | `pnpm test` |
| Build | Última task de cada fase | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

`pnpm test` na raiz é `pnpm -r test`.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Lotes de execução

| Lote | Fases | Tasks | Modelo |
| ---- | ----- | ----- | ------ |
| 1 | Phase 1 - Contratos, banco e chamada ao provedor; Phase 2 - Configuração do LLM na API | T1-T7 (7) | sonnet |
| 2 | Phase 3 - Geração na API; Phase 4 - Aba LLM no web | T8-T14 (7) | sonnet |
| 3 | Phase 5 - Pedir à IA no web | T15-T20 (6) | sonnet |

Todas as tasks têm testes, por isso todos os lotes são `sonnet` (AD-037).

### Phase 1: Contratos, banco e chamada ao provedor

```
T1 → T2
T1 → T3
T3 → T4 → T5
```

### Phase 2: Configuração do LLM na API

```
T6 → T7
```

### Phase 3: Geração na API

```
T8 → T11
T9 → T11
T10 → T11
T11 → T12
```

### Phase 4: Aba LLM no web

```
T13 → T14
```

### Phase 5: Pedir à IA no web

```
T15 → T18
T16 → T18
T17 → T18
T18 → T19 → T20
```

---

## Task Breakdown

### Phase 1 tasks: Contratos, banco e chamada ao provedor

### T1: Definir os contratos da configuração do LLM

**What**: `packages/contracts/src/llm.ts` com `LLM_PROVIDERS`, `LLM_PROVIDER_LABELS` (ordem de LLM-02), `PROVIDERS_REQUIRING_KEY`, `PROVIDERS_REQUIRING_BASE_URL`, `llmSettingsSchema` (modelo `trim` 1 a 200; `apiKey` opcional; `baseUrl` opcional, `http`/`https`; `superRefine` da URL base por provedor), `LlmSettingsDto`, `LlmSettingsResponse`, `LlmTestResultDto`, `AiStatusDto`; acréscimos em `MESSAGES` (todas as chaves `llm*` da tabela de mensagens do design) e em `ERROR_CODES` (`LLM_NOT_CONFIGURED`, `LLM_PROVIDER_ERROR`). Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/llm.ts`
**Depends on**: None
**Reuses**: `zod`, `MESSAGES`, `ERROR_CODES`, padrão de `trim` de `schemas.ts`
**Requirement**: LLM-02, LLM-06, LLM-08

**Done when**:

- [x] Testes em `packages/contracts/src/llm.spec.ts`: `LLM-02 provedores na ordem OpenAI, Anthropic, Google Gemini, Ollama e Compatível com OpenAI` (rótulos de `LLM_PROVIDERS` na ordem), `LLM-06 Ollama e Compatível com OpenAI exigem URL base` (sem `baseUrl` ou só espaços dão "Informe a URL base" no caminho `baseUrl`; OpenAI sem URL passa; `ftp://x` dá "Informe uma URL válida"), `LLM-08 modelo vazio dá Informe o modelo` (vazio e só espaços; 201 caracteres recusados; 200 passa)
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add llm provider settings contracts`

---

### T2: Definir os contratos do pedido de widget à IA

**What**: `packages/contracts/src/ai.ts` com `AI_PROMPT_MAX = 4000`, `AI_MAX_ATTEMPTS = 4`, `aiWidgetRequestSchema` (prompt `trim` 1 a 4.000 com "O pedido passa de 4.000 caracteres"; `widgetId` UUID; `connectionId` opcional; `widget` com título até 80, Cypher até 20.000 ou `null`, `visualization` texto, `config` objeto), `AiWidgetEvent`, `AiProviderErrorCode`; acréscimos em `MESSAGES` (chaves `ai*` do design, `aiGenerating(n)` e `aiProviderFailed(msg)`) e `ERROR_CODES` (`SCHEMA_NOT_READ`). Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/ai.ts`
**Depends on**: T1
**Reuses**: `zod`, `QueryResultDto`, `WidgetVisualization`, `MESSAGES`
**Requirement**: AIQ-12, AIQ-14, AIQ-15

**Done when**:

- [x] Testes em `packages/contracts/src/ai.spec.ts`: `AIQ-14 pedido vazio é recusado` (vazio e só espaços), `AIQ-15 pedido com mais de 4.000 caracteres dá a mensagem` (4.001 caracteres dão "O pedido passa de 4.000 caracteres" no caminho `prompt`; 4.000 passa), `MESSAGES.aiGenerating(2)` é "Gerando... tentativa 2 de 4", `MESSAGES.aiProviderFailed('x')` é "Erro do provedor de IA: x", `widgetId` que não é UUID é recusado
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add ai widget request and stream event contracts`

---

### T3: Criar a tabela da configuração do LLM

**What**: Em `apps/api/src/database/schema.ts`, o enum `llm_provider` e a tabela `llm_settings` (linha única por `check (id = 1)`, `api_key_encrypted` e `api_key_last4` nulos, `updated_by` com `on delete set null`) conforme "Data Models" do design; migração gerada com `drizzle-kit generate` em `apps/api/drizzle/`.
**Where**: `apps/api/src/database/schema.ts` (modify)
**Depends on**: T1
**Reuses**: `createTestDb()`, testes de schema existentes
**Requirement**: LLM-03

**Done when**:

- [ ] Testes em `apps/api/test/database/llm-settings-schema.spec.ts`: migrações aplicam no PGlite; `LLM-03 tabela llm_settings aceita uma linha só` (`INSERT` com `id = 2` viola o check; segundo `INSERT` com `id = 1` viola a chave); provedor fora do enum é recusado
- [ ] `drizzle-kit generate` não gera diferença depois do commit
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add single-row llm settings table`

---

### T4: Criar o factory de modelos de chat e o modelo falso dos testes

**What**: Instalar em `apps/api` `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`, `@langchain/google-genai` e `@langchain/ollama`. `ChatModelFactory` (token `CHAT_MODEL_FACTORY`) com o mapa provedor → classe do design (`maxRetries: 0`, `temperature: 0`), `LlmSnapshot`, e `LlmModule` registrado em `AppModule`. Em `apps/api/test/fakes/`: `ScriptedChatModel` (estende `SimpleChatModel`; roteiro `string | Error | 'hang'`; `calls`; respeita `options.signal`; `release()`) e `FakeChatModelFactory` (`script`, `created`, `model`); `createTestApp({ chatModels })` registra o fake no token.
**Where**: `apps/api/src/llm/chat-model.factory.ts`
**Depends on**: T3
**Reuses**: `createTestApp`, padrão de `FakeNeo4jGateway`
**Requirement**: LLM-14

**Done when**:

- [ ] Testes em `apps/api/test/llm/chat-model.factory.spec.ts` (sem `invoke`, sem rede): `LLM-14 ChatModelFactory cria o modelo de cada provedor no backend` (OpenAI → `ChatOpenAI` com o modelo e `maxRetries` 0; Anthropic → `ChatAnthropic`; Google Gemini → `ChatGoogleGenerativeAI`; Ollama → `ChatOllama` com a URL base; Compatível com OpenAI → `ChatOpenAI` com `baseURL` igual à URL base)
- [ ] Testes do fake em `apps/api/test/llm/scripted-chat-model.spec.ts`: o roteiro devolve textos na ordem e lança o erro roteirizado; `calls` guarda as mensagens; `'hang'` termina quando o `signal` aborta
- [ ] Opções dos construtores conferidas contra os tipos instalados; diferenças do design marcadas com `SPEC_DEVIATION`
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): create langchain chat models per provider with a scripted test fake`

---

### T5: Chamar o provedor com prazo, cancelamento, classificação e log

**What**: `classifyProviderError` em `apps/api/src/llm/provider-error.ts` (ordem do design) e `LlmClient.call` em `apps/api/src/llm/llm-client.ts` com o token `LLM_CALL_TIMEOUT_MS` (padrão `60_000`), `AbortSignal.any`, `LlmTimeoutError`, `LlmCancelledError`, `LlmProviderError { code, message, providerMessage }` e a linha `ai call ...` em `Logger('Ai')`.
**Where**: `apps/api/src/llm/llm-client.ts`
**Depends on**: T4
**Reuses**: `FakeChatModelFactory`, `ScriptedChatModel`, captura de log de `http-logging.spec.ts`
**Requirement**: AIQ-21, AIQ-22, AIQ-23, AIQ-24, AIQ-25, AIQ-27

**Done when**:

- [ ] Testes em `apps/api/test/llm/provider-error.spec.ts`: `AIQ-21 erro 401 ou MODEL_AUTHENTICATION é chave recusada` ("O provedor de IA recusou a chave configurada"; também `status` 403 e `response.status` 401), `AIQ-22 erro 429 ou MODEL_RATE_LIMIT é limite de uso` ("O provedor de IA recusou o pedido por limite de uso"), `AIQ-24 contexto excedido vira a mensagem do schema` (`code: 'context_length_exceeded'`, "prompt is too long" e "maximum context length" dão a mensagem de AIQ-24 inteira), `AIQ-25 outro erro vira Erro do provedor de IA com a mensagem` (`Error('boom')` dá "Erro do provedor de IA: boom")
- [ ] Testes em `apps/api/test/llm/llm-client.spec.ts`: `AIQ-23 chamada sem resposta em 60 s vira tempo esgotado` (`'hang'` com prazo de 50 ms dá "O provedor de IA não respondeu em 60 s" e código `AI_PROVIDER_TIMEOUT`; o padrão lido sem sobrescrita é `60000`), abortar o `signal` do usuário dá `LlmCancelledError`, texto devolvido em partes é concatenado, `AIQ-27 log de cada chamada tem usuário, provedor, modelo, tentativa, duração e resultado sem chave nem schema` (linhas `result=ok` e `result=auth` com `user=`, `provider=`, `model=`, `attempt=`, `durationMs=`; nenhuma linha contém a chave `sk-teste-1234` nem o texto das mensagens)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): call llm providers with timeout, cancellation, error classes and logs`

---

### Phase 2 tasks: Configuração do LLM na API

### T6: Ler, gravar e remover a configuração do LLM

**What**: `LlmSettingsService` (`get`, `save`, `remove`, `snapshot`, `toLlmSettingsDto`) e `LlmSettingsController` (`GET`, `PUT` e `DELETE /api/llm-config`, `@RequirePermission('llm.manage')`) com as regras de "Gravar" do design (chave cifrada pelo `CryptoService`, 4 últimos, chave vazia mantém a guardada, chave obrigatória por provedor no campo `apiKey`); `AiController` com `GET /api/ai/status` (`@RequirePermission('ai.use')`) em `apps/api/src/ai/ai.controller.ts`, e `AiModule` registrado em `AppModule`.
**Where**: `apps/api/src/llm/llm-settings.service.ts`
**Depends on**: T5, T1
**Reuses**: `CryptoService`, `@RequirePermission`, `ZodValidationPipe`, `AppError`, `llmSettingsSchema`, `createTestApp`
**Requirement**: LLM-03, LLM-04, LLM-05, LLM-06, LLM-07, LLM-08, LLM-12, LLM-13, AIQ-16

**Done when**:

- [ ] Testes em `apps/api/test/llm/llm-settings.spec.ts`: `LLM-03 salvar grava a chave criptografada` (a coluna não contém `sk-teste-abcd1234` e `crypto.decrypt` devolve o valor), `LLM-04 nenhuma resposta da API contém a chave` (o corpo do `PUT` e do `GET` não contém a chave em texto; `apiKeyLast4` é `1234`), `LLM-05 salvar com a chave vazia mantém a chave guardada` (`PUT` com `apiKey: ''` e modelo novo: a chave decifrada continua a mesma e o modelo muda), `LLM-06 URL base vazia responde 400 no campo baseUrl` (Ollama e Compatível com OpenAI), `LLM-07 provedor com chave obrigatória sem chave responde 400 no campo apiKey` (OpenAI, Anthropic e Google Gemini sem chave nem guardada dão "Informe a chave de API"; com chave guardada, `apiKey` vazia passa; Ollama sem chave passa), `LLM-08 modelo vazio responde 400 no campo model`, `LLM-12 remover apaga provedor, modelo, URL base e chave` (`DELETE` 204; a tabela fica vazia; o `GET` devolve `{ configured: false }`), `LLM-13 Editor e Visualizador recebem 403 na configuração do LLM` (`GET`, `PUT`, `DELETE` e `POST .../test`), `AIQ-16 sem provedor o status vem desligado` (`GET /api/ai/status` dá `{ configured: false }` e, depois do `PUT`, `{ configured: true }` para o Editor; o Visualizador recebe 403)
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): read, save and remove the llm settings with an encrypted key`

---

### T7: Testar o provedor configurado

**What**: `POST /api/llm-config/test` no `LlmSettingsController`: valida com `llmSettingsSchema`, usa a chave guardada quando `apiKey` vem vazia, chama `LlmClient.call` com uma única `HumanMessage` "Responda apenas: ok" e `purpose: 'test'`; sucesso → 200 `{ ok: true }`; `LlmProviderError` → 422 `LLM_PROVIDER_ERROR` com `providerMessage`. Não grava nada.
**Where**: `apps/api/src/llm/llm-settings.controller.ts` (modify)
**Depends on**: T6
**Reuses**: `LlmClient`, `FakeChatModelFactory`
**Requirement**: LLM-09, LLM-10

**Done when**:

- [ ] Testes em `apps/api/test/llm/llm-test.spec.ts`: `LLM-09 testar envia um pedido mínimo sem schema e responde ok` (200 `{ ok: true }`; o modelo falso recebeu uma mensagem só, sem "Labels" nem nome de label do schema de exemplo; o factory foi criado com o provedor e o modelo do corpo e com a chave guardada quando `apiKey` veio vazia; nada mudou em `llm_settings`), `LLM-10 teste com falha responde 422 com a mensagem do provedor` (erro roteirizado "Incorrect API key provided" volta em `message`)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): test the llm provider with a minimal request`

---

### Phase 3 tasks: Geração na API

### T8: Montar o pedido do widget e a mensagem de correção

**What**: `apps/api/src/ai/widget-prompt.ts` com `serializeSchema`, `buildWidgetMessages` e `correctionMessage` conforme o design (formato do schema, regras do sistema com as 10 visualizações e o formato de cada mapeamento, widget atual, texto do usuário; regras de FIX-03 e FIX-04 para o texto do erro).
**Where**: `apps/api/src/ai/widget-prompt.ts`
**Depends on**: T2
**Reuses**: `ConnectionSchemaDto`, `WIDGET_VISUALIZATIONS`, `VISUALIZATION_LABELS`, `MAPPING_FIELD_LABELS`, `@langchain/core/messages`
**Requirement**: AIQ-01, AIQ-03, AIQ-04, AIQ-05, FIX-03, FIX-04

**Done when**:

- [ ] Testes em `apps/api/test/ai/widget-prompt.spec.ts`: `AIQ-01 pedido pede ao LLM Cypher, visualização, mapeamento e título` (a mensagem de sistema cita as chaves `cypher`, `visualization`, `mapping` e `title` e os 10 códigos de visualização), `AIQ-03 schema no prompt traz labels, relacionamentos, pares e propriedades com tipos e exemplo inteiro` (schema com `(:Pedido)`, `[:FEZ]`, par `(:Cliente)-[:FEZ]->(:Pedido)`, propriedade com tipos `String | Long` e um exemplo de 5.000 caracteres que aparece inteiro), `AIQ-04 propriedade com envio desligado vai sem exemplo` (a propriedade e os tipos aparecem; o exemplo `'ana@x.com'` não aparece em nenhuma mensagem), `AIQ-05 pedido inclui o texto e o título, Cypher, visualização e mapeamento atuais`, `FIX-03 erro de sintaxe, semântica ou validação vai inteiro na correção` (`QUERY_WRITE_BLOCKED`, `QUERY_MULTIPLE_STATEMENTS`, `QUERY_FAILED` com `Neo.ClientError.Statement.SyntaxError` e com `...SemanticError`: o texto inteiro está na mensagem), `FIX-04 erro de execução vai só com o código` (`QUERY_FAILED` com `Neo.ClientError.Statement.ArithmeticError` e mensagem "/ by zero em 42": a correção contém o código e não contém "42"; sem código, "Erro de execução no Neo4j")
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): build the ai widget prompt and correction messages`

---

### T9: Interpretar e normalizar a resposta da IA

**What**: `apps/api/src/ai/widget-reply.ts` com `parseWidgetReply` (cercas, primeiro objeto JSON balanceado, bloco `cypher` como alternativa; sem Cypher → `{ ok: false }`) e `normalizeWidgetReply` (visualização desconhecida → `TABLE`, mapeamento fora de `widgetMappingSchemas` → `null`, título cortado em 80 ou o atual).
**Where**: `apps/api/src/ai/widget-reply.ts`
**Depends on**: T2
**Reuses**: `WIDGET_VISUALIZATIONS`, `widgetMappingSchemas`
**Requirement**: AIQ-20, FIX-05

**Done when**:

- [ ] Testes em `apps/api/test/ai/widget-reply.spec.ts`: `FIX-05 resposta sem Cypher não é aceita` (texto livre, JSON sem `cypher`, `cypher` vazio e `cypher` numérico dão `{ ok: false }`; JSON dentro de cerca ```` ```json ```` e com texto antes e depois é aceito; bloco ```` ```cypher ```` sozinho é aceito), `AIQ-20 visualização desconhecida vira Tabela` (`"GRAPH"` e ausente dão `TABLE` com `mapping: null`; `"bar"` vira `BAR`), mapeamento de `BAR` sem `x` vira `null`, título com 120 caracteres é cortado em 80, título vazio fica com o título atual
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): parse and normalize the ai widget reply`

---

### T10: Repassar o cancelamento e o código do Neo4j no QueryService

**What**: Conforme AD-087, `QueryService.run` aceita `signal?: AbortSignal` e o repassa ao `Neo4jGateway.read`; o `AppError` de `QUERY_FAILED` ganha `neo4jCode?: string` (de `Neo4jGatewayError.code`), que o `AppErrorFilter` não serializa. Os testes de `QueryService` de `dashboards-consultas` continuam verdes.
**Where**: `apps/api/src/queries/query.service.ts` (modify)
**Depends on**: None
**Reuses**: `FakeNeo4jGateway`, testes de `QueryService` existentes
**Requirement**: AIQ-13, FIX-04

**Done when**:

- [ ] Testes em `apps/api/test/queries/query-service-ai.spec.ts`: `AIQ-13 QueryService repassa o signal ao gateway` (o `FakeNeo4jGateway` com `'hang'` termina quando o `signal` aborta, antes do prazo), `FIX-04 erro do Neo4j guarda o código sem serializá-lo` (o erro lançado tem `neo4jCode` `Neo.ClientError.Statement.ArithmeticError`; a resposta HTTP de `POST .../query` tem só `code` e `message`)
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): pass abort signal and neo4j error code through query service`

---

### T11: Gerar o widget com até três correções

**What**: `AiWidgetService` com `prepare` (snapshot da configuração; conexão do corpo ou do dashboard; 409 `LLM_NOT_CONFIGURED`; 409 `SCHEMA_NOT_READ` sem documento guardado) e `run` (laço de até 4 chamadas, eventos `attempt`, `done`, `failed`, `provider_error`, `stopped`; `NEO4J_UNAVAILABLE` para sem correção; cancelamento para sem emitir), conforme o design.
**Where**: `apps/api/src/ai/ai-widget.service.ts`
**Depends on**: T8, T9, T10
**Reuses**: `LlmSettingsService.snapshot`, `LlmClient`, `SchemaQueryService.get`, `QueryService.run`, `FakeChatModelFactory`, `FakeNeo4jGateway`, fixtures de schema
**Requirement**: AIQ-06, AIQ-07, AIQ-08, AIQ-09, AIQ-10, AIQ-13, AIQ-17, AIQ-26, FIX-01, FIX-02, FIX-05, FIX-06, FIX-08, FIX-09, FIX-10, LLM-15

**Done when**:

- [ ] Testes em `apps/api/test/ai/ai-widget.service.spec.ts` (service tirado do app de teste, eventos guardados num array): `AIQ-07 Cypher gerado passa pela validação somente leitura e pelos limites` (Cypher com 20.001 caracteres não chega ao gateway e a correção cita "A consulta passa de 20.000 caracteres"), `AIQ-08 Cypher válido é executado na conexão do dashboard` (o gateway recebeu o Cypher com a URI da conexão do dashboard; com `connectionId` no corpo, a dessa conexão), `AIQ-09 geração bem-sucedida devolve Cypher, visualização, mapeamento, título e resultado`, `AIQ-10 resultado sem linhas conclui a geração` (`done` com `rows: []` e uma chamada só), `AIQ-06 nenhuma linha de resultado nem mensagem de execução chega ao provedor` (linhas com `VALOR-DE-LINHA-7f3a` e erro de execução com `VALOR-DE-ERRO-91c2`: nenhuma mensagem em `calls` contém esses textos), `AIQ-13 cancelar para a geração sem nova chamada` (abortar durante a 1ª chamada em `'hang'`: nenhum evento depois de `attempt` 1 e o factory não recebe 2ª chamada; abortar durante a execução no gateway em `'hang'` também para), `AIQ-17 conexão sem schema lido responde Leia o schema da conexão antes de usar a IA` (409 `SCHEMA_NOT_READ`; com o estado `READING` e documento anterior, a geração segue), `AIQ-26 erro do provedor para a geração sem nova tentativa` (erro 401 na 1ª chamada: evento `provider_error` `AI_PROVIDER_AUTH`, uma chamada só, nenhum `failed`), `FIX-01 Cypher recusado ou com falha volta ao LLM com o erro` (a 2ª chamada recebe a resposta anterior e a correção com o erro), `FIX-02 no máximo 3 correções depois da primeira geração` (roteiro sempre inválido: 4 chamadas e 4 eventos `attempt`), `FIX-05 resposta sem Cypher conta como tentativa que falhou` (texto sem Cypher e depois Cypher válido: `done` com `attempts: 2`), `FIX-06 quarta falha devolve o último Cypher e o erro` (`failed` com o Cypher da 4ª resposta e a mensagem do 4º erro), `FIX-08 correção que dá certo na terceira tentativa conclui a geração` (`done` com `attempts: 3`), `FIX-09 pedido de escrita esgota as correções com Somente consultas de leitura são permitidas` (4 respostas com `DELETE`: `failed` com mensagem que contém "Somente consultas de leitura são permitidas"; o gateway nunca foi chamado), `FIX-10 várias instruções contam como falha de validação com Envie uma consulta por vez`, `LLM-15 troca de configuração durante a geração não muda o modelo da geração` (1ª chamada em `'hang'`, `PUT /api/llm-config` com outro modelo, `release()`: as chamadas seguintes usam o modelo criado com o snapshot antigo e o log mostra o modelo antigo), `NEO4J_UNAVAILABLE` dá `stopped` sem nova chamada, sem provedor dá 409 `LLM_NOT_CONFIGURED`
- [ ] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): generate a widget with the llm and self-correct up to three times`

---

### T12: Expor a geração como resposta NDJSON

**What**: `POST /api/dashboards/:id/ai/widget` no `AiController`: `@RequirePermission('ai.use')`, `assert(user, id, 'edit')`, `aiWidgetRequestSchema`, `prepare` antes de qualquer byte (erros em JSON), depois 200 `application/x-ndjson` com `X-Accel-Buffering: no`, uma linha por evento, `flushHeaders`, e `req.on('close')` abortando a geração.
**Where**: `apps/api/src/ai/ai.controller.ts` (modify)
**Depends on**: T11
**Reuses**: `DashboardAccessService`, `ZodValidationPipe`, `createTestApp` com `neo4j`, `shares` e `chatModels`
**Requirement**: AIQ-12, AIQ-15, AIQ-16, AIQ-18

**Done when**:

- [ ] Testes em `apps/api/test/ai/ai-widget.route.spec.ts`: `AIQ-12 resposta informa cada tentativa` (roteiro inválido e depois válido: o corpo tem as linhas `attempt` 1 e 2 com `maxAttempts: 4` antes de `done`; `Content-Type` `application/x-ndjson`), `AIQ-15 pedido longo responde 400` (4.001 caracteres: 400 com "O pedido passa de 4.000 caracteres" em `fieldErrors.prompt` e nenhuma chamada ao modelo), `AIQ-16 sem provedor a geração responde 409` (`LLM_NOT_CONFIGURED` com "Nenhum provedor de IA configurado"), `AIQ-18 Visualizador e quem não edita recebem 403 na geração` (Visualizador com compartilhamento `edit` e Editor com compartilhamento `view` recebem 403; quem não alcança recebe 404; dono e Admin recebem 200), o corpo de `done` traz `result.rows`
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): stream ai widget generation events as ndjson`

---

### Phase 4 tasks: Aba LLM no web

### T13: Mostrar e salvar a configuração na aba "LLM"

**What**: `src/features/llm/api.ts` (`useLlmSettings`, `useSaveLlmSettings`, `useTestLlmSettings`, `useRemoveLlmSettings`); `LlmSettingsTab` com "Provedor", "Modelo", "Chave de API" (vazia; com chave guardada, placeholder `••••` + 4 últimos e a ajuda "Deixe em branco para manter a chave atual") e "URL base"; react-hook-form + `llmSettingsSchema`, regra de chave obrigatória com `hasStoredKey`, `fieldErrors` da API no campo, "Salvar" desabilitado durante o envio. `SETTINGS_TABS` liga `llm` (`available: true`); conforme AD-086, a task atualiza o teste CFG-02 de `fundacao-auth` (o Admin vê "Conexões", "Usuários", "Dashboards" e "LLM", nessa ordem; o Editor não vê "LLM"), sem afrouxar asserções. Handler MSW padrão de `GET /api/llm-config` devolvendo `{ configured: false }` e de `GET /api/ai/status` devolvendo `{ configured: false }` em `src/test/server.ts`.
**Where**: `apps/web/src/features/llm/LlmSettingsTab.tsx`
**Depends on**: T7
**Reuses**: `SETTINGS_TABS`, `SettingsPage`, `ConnectionFormDialog` (padrão do campo de senha), `LLM_PROVIDER_LABELS`, shadcn `select`, `input`, `form`, `button`, `renderApp`
**Requirement**: LLM-01, LLM-02, LLM-04, LLM-05, LLM-06, LLM-07, LLM-08, LLM-14

**Done when**:

- [ ] Testes com gesto em `LlmSettingsTab.test.tsx` (Admin abre "Configurações" › "LLM"): `LLM-01 aba LLM mostra Provedor, Modelo, Chave de API e URL base`, `LLM-02 select Provedor oferece os cinco provedores na ordem`, `LLM-04 campo da chave mostra só os 4 últimos caracteres` (com `apiKeyLast4: '1234'`: o campo está vazio e mostra `••••1234`; nenhum texto da página tem outro trecho da chave), `LLM-05 salvar sem digitar a chave não envia chave` (mudar o modelo e salvar: o `PUT` leva `apiKey` vazia e a ajuda "Deixe em branco para manter a chave atual" está visível), `LLM-06 URL base vazia mostra Informe a URL base` (Ollama sem URL, sem requisição), `LLM-07 sem chave mostra Informe a chave de API no campo` (OpenAI sem chave guardada, sem requisição; 400 da API com `fieldErrors.apiKey` também aparece no campo), `LLM-08 modelo vazio mostra Informe o modelo`
- [ ] Teste `LLM-14 web não depende de pacote de provedor de LLM` em `src/features/llm/no-provider-calls.test.ts`: `apps/web/package.json` não tem dependência `@langchain/*`, `openai`, `@anthropic-ai/*` nem `@google/*`, e nenhum arquivo de `src/` contém `api.openai.com`, `api.anthropic.com` ou `generativelanguage.googleapis.com`
- [ ] Teste CFG-02 de `fundacao-auth` atualizado e verde
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): configure the llm provider in the settings llm tab`

---

### T14: Testar o provedor e remover a configuração

**What**: Na `LlmSettingsTab`, botão "Testar" (envia os valores do formulário; "Testando..." e desabilitado durante o envio; sucesso mostra "Provedor respondendo"; 422 mostra a `message` da API) e "Remover configuração" (só com configuração salva) que abre `RemoveLlmDialog` com "Remover a configuração do LLM? Os recursos de IA ficarão desligados.", "Remover" e "Cancelar"; confirmar chama `DELETE` e o formulário volta vazio.
**Where**: `apps/web/src/features/llm/RemoveLlmDialog.tsx`
**Depends on**: T13
**Reuses**: `useTestLlmSettings`, `useRemoveLlmSettings`, `ConnectionRowActions` (padrão de confirmação), shadcn `alert-dialog`
**Requirement**: LLM-09, LLM-10, LLM-11, LLM-12

**Done when**:

- [ ] Testes com gesto em `LlmTestAndRemove.test.tsx`: `LLM-09 Testar mostra Provedor respondendo` (o `POST .../test` leva provedor, modelo e URL do formulário), `LLM-10 Testar com falha mostra a mensagem do provedor` (422 com "Incorrect API key provided" aparece), `LLM-11 Remover configuração pede confirmação` (o texto exato; "Cancelar" fecha sem requisição), `LLM-12 confirmar a remoção limpa o formulário` (o `DELETE` sai; "Modelo" fica vazio e "Remover configuração" some)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): test the llm provider and remove its settings`

---

### Phase 5 tasks: Pedir à IA no web

### T15: Resolver o mapeamento devolvido pela IA

**What**: `apps/web/src/features/ai/resolve-mapping.ts` com `resolveAiMapping(visualization, mapping, result)` conforme o design (`TABLE` → `{}`; mapeamento nulo, inválido ou com coluna ausente → `suggestMapping`; sugestão incompleta → `TABLE`).
**Where**: `apps/web/src/features/ai/resolve-mapping.ts`
**Depends on**: T2
**Reuses**: `suggestMapping`, `validateMapping`, `columnIndex`
**Requirement**: AIQ-30

**Done when**:

- [ ] Testes em `resolve-mapping.test.ts`: `AIQ-30 mapeamento com coluna ausente vira a sugestão automática` (`BAR` com `x: 'mes'` e resultado com colunas `categoria`, `total`: devolve `x: 'categoria'`, `series: ['total']`), mapeamento válido com colunas presentes fica como veio, mapeamento `null` vira a sugestão, `PIE` com resultado sem coluna numérica vira `{ visualization: 'TABLE', config: {} }`, `TABLE` dá `config: {}`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): resolve the ai mapping against the query result`

---

### T16: Ler a resposta NDJSON da geração

**What**: `src/features/ai/api.ts` com `useAiStatus()` e `streamAiWidget(dashboardId, body, signal, onEvent)`: `fetch` com `credentials: 'include'`; não-2xx vira `ApiError` como no `apiFetch` (401 chama `onUnauthorized`); 2xx lê o corpo com `getReader()` e `TextDecoder`, junta pedaços até `\n`, chama `onEvent` por linha e devolve o último evento; corpo que termina sem evento final lança `ApiError` com "Ocorreu um erro inesperado. Tente novamente.".
**Where**: `apps/web/src/features/ai/api.ts`
**Depends on**: T2
**Reuses**: `apiFetch`, `ApiError`, `MESSAGES`
**Requirement**: AIQ-12

**Done when**:

- [ ] Testes em `ai-api.test.ts` com MSW e `ReadableStream`: `AIQ-12 leitura do NDJSON entrega cada tentativa na ordem` (linhas partidas no meio entre dois pedaços chegam inteiras; `onEvent` recebe `attempt` 1, `attempt` 2 e `done`; a função devolve `done`), 409 vira `ApiError` com `code` e `message`, corpo sem evento final lança a mensagem genérica, abortar o `signal` rejeita com `AbortError`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): read ai widget generation events from an ndjson stream`

---

### T17: Criar o painel "Pedir à IA"

**What**: `AskAiPanel` conforme o design: `textarea` "Descreva o que você quer ver", contador `n/4.000`, "Enviar" desabilitado com texto vazio, mensagem "O pedido passa de 4.000 caracteres" acima do limite, estado rodando com "Gerando... tentativa N de 4" e "Cancelar", estado de erro com a mensagem e o texto mantido. Componente controlado por props (`value`, `onChange`, `onSubmit`, `onCancel`, `running`, `attempt`, `error`).
**Where**: `apps/web/src/features/ai/AskAiPanel.tsx`
**Depends on**: T2
**Reuses**: `MESSAGES`, `AI_PROMPT_MAX`, shadcn `textarea`, `button`
**Requirement**: AIQ-12, AIQ-14, AIQ-15

**Done when**:

- [ ] Testes com gesto em `AskAiPanel.test.tsx`: `AIQ-14 Enviar fica desabilitado com o texto vazio` (vazio e só espaços; digitar "total por categoria" habilita), `AIQ-15 texto com mais de 4.000 caracteres mostra O pedido passa de 4.000 caracteres` (e "Enviar" desabilitado), `AIQ-12 durante a geração mostra Gerando tentativa N de 4 e Cancelar` (com `running` e `attempt: 3`: "Gerando... tentativa 3 de 4"; clicar em "Cancelar" chama `onCancel`; o `textarea` fica desabilitado)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add the ask ai prompt panel`

---

### T18: Orquestrar as gerações dos widgets no rascunho

**What**: `useAiGenerations({ dashboardId, draft, setDraft, editing, onFailed })` conforme o design: um `AbortController` por widget; `attempt` atualiza o contador; `done` aplica título, Cypher, visualização e `resolveAiMapping` por `updateWidget` e semeia o cache `['query', dashboardId, connectionId, cypher]`; widget ausente do rascunho descarta; `failed` chama `onFailed` sem tocar no rascunho; `provider_error`, `stopped` e erro HTTP (409 `SCHEMA_NOT_READ`, `LLM_NOT_CONFIGURED`) guardam a mensagem e o texto; `cancel` aborta; `editing` falso ou desmontar aborta todas.
**Where**: `apps/web/src/features/ai/useAiGenerations.ts`
**Depends on**: T15, T16, T17
**Reuses**: `streamAiWidget`, `resolveAiMapping`, `draft.ts` (`updateWidget`), TanStack Query `setQueryData`, fixtures de dashboards
**Requirement**: AIQ-09, AIQ-10, AIQ-13, AIQ-17, AIQ-26, AIQ-28, AIQ-29, FIX-07

**Done when**:

- [ ] Testes em `useAiGenerations.test.tsx` (`renderHook` com o `QueryClient` de teste e MSW em `ReadableStream`): `AIQ-09 resultado da IA atualiza o widget no rascunho e semeia o resultado` (o widget fica com o título, o Cypher, `BAR` e o mapeamento; `getQueryData` da chave da prévia tem as linhas; nenhuma chamada a `.../query`), `AIQ-10 geração sem linhas atualiza o widget com resultado vazio`, `AIQ-13 Cancelar aborta o pedido e deixa o widget como estava` (`request.signal.aborted` no handler é verdadeiro; o rascunho é o mesmo objeto), `AIQ-17 schema não lido mostra a mensagem no painel` (409 `SCHEMA_NOT_READ`: o estado do widget tem "Leia o schema da conexão antes de usar a IA"), `AIQ-26 falha do provedor mantém o texto e o widget` (`provider_error` `AI_PROVIDER_AUTH`: o estado guarda "O provedor de IA recusou a chave configurada" e o texto pedido; o rascunho não muda), `AIQ-28 sair do modo de edição para a geração` (`editing` passa a falso: o pedido é abortado), `AIQ-29 widget removido durante a geração descarta o resultado` (o widget sai do rascunho antes de `done`: nada é aplicado e nenhum widget novo aparece), `FIX-07 falha final mantém o widget do rascunho até Aplicar` (`failed`: `onFailed` recebe o Cypher e a mensagem; o rascunho não muda)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): orchestrate ai generations per widget in the draft`

---

### T19: Ligar "Pedir à IA" ao card do widget

**What**: Em `WidgetCard`, no modo de edição e com `can(role, 'ai.use')`, o item "Pedir à IA" no menu do card abre o `AskAiPanel` dentro do card, ligado ao `useAiGenerations` que o `DashboardPage` cria e repassa; sem provedor (`useAiStatus`), o item fica desabilitado com "Nenhum provedor de IA configurado"; durante a geração do widget, o item fica desabilitado. No `DashboardPage`, `onFailed` abre o `WidgetEditorDialog` do widget com `initialCypher` e `initialError` (o diálogo ganha as props nesta task).
**Where**: `apps/web/src/features/widgets/WidgetCard.tsx` (modify)
**Depends on**: T18
**Reuses**: `useAiGenerations`, `AskAiPanel`, `useAiStatus`, `useSession`, `can()`, `DashboardPage`, `WidgetEditorDialog`, fixtures de dashboards
**Requirement**: AIQ-01, AIQ-09, AIQ-10, AIQ-11, AIQ-12, AIQ-16, AIQ-19, FIX-06

**Done when**:

- [ ] Testes com gesto em `AskAiWidget.test.tsx` (página do dashboard em edição, MSW): `AIQ-01 Pedir à IA envia o texto e o widget atual` (digitar "total de itens por categoria em barras" e enviar: o corpo leva `prompt`, `widgetId` e `widget` com título, Cypher, visualização e `config` do rascunho), `AIQ-09 resultado da IA atualiza o widget no card e mostra o resultado` (o card mostra o título gerado e o gráfico de barras desenhado), `AIQ-10 geração sem linhas mostra A consulta não retornou dados`, `AIQ-11 Editar widget depois da geração mostra o Cypher gerado` (o editor de Cypher tem o texto gerado e aceita digitação), `AIQ-12 Pedir à IA fica desabilitado enquanto o widget gera` (com o stream aberto, o item do menu está desabilitado e o card mostra "Gerando... tentativa 1 de 4"), `AIQ-16 sem provedor Pedir à IA fica desabilitado com Nenhum provedor de IA configurado`, `AIQ-19 Pedir à IA aparece só para Admin e Editor em modo de edição` (fora da edição não aparece; Editor e Admin em edição veem), `FIX-06 falha final abre o editor com o último Cypher e o erro` (evento `failed`: o diálogo do widget abre com o Cypher no editor e a mensagem na prévia; "Aplicar" grava o Cypher no rascunho)
- [ ] Testes de `WidgetCard` e `DashboardPage` de `dashboards-consultas` e `widgets-graficos` continuam verdes
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): ask ai from the widget card in edit mode`

---

### T20: Oferecer a descrição no editor do widget novo

**What**: Em `WidgetEditorDialog`, quando o widget acabou de ser criado por "Novo widget" e o provedor está configurado, o `AskAiPanel` aparece acima do editor de Cypher com "Descreva o que você quer ver"; enviar usa o mesmo `useAiGenerations`; `done` fecha o diálogo com o widget atualizado; `failed` mantém o diálogo com o último Cypher no editor e a mensagem na prévia.
**Where**: `apps/web/src/features/widgets/WidgetEditorDialog.tsx` (modify)
**Depends on**: T19
**Reuses**: `AskAiPanel`, `useAiGenerations`, `useAiStatus`, `draft.addWidget`
**Requirement**: AIQ-02

**Done when**:

- [ ] Testes com gesto em `NewWidgetAi.test.tsx`: `AIQ-02 Novo widget mostra Descreva o que você quer ver antes do editor de Cypher` (clicar em "Novo widget": o campo aparece antes do `textarea` "Cypher" na ordem do documento; sem provedor, o campo não aparece e o editor abre como antes), enviar a descrição com `done` fecha o diálogo e o widget mostra o título gerado, `failed` deixa o diálogo aberto com o Cypher e a mensagem
- [ ] Testes de `WidgetEditorDialog` de `dashboards-consultas` e `widgets-graficos` continuam verdes
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): describe a new widget for the ai before writing cypher`

---

## Checks

**C1** - A aba "LLM" mostra "Provedor", "Modelo", "Chave de API" e "URL base" (LLM-01, AC 1)
Proof: run web | ✓ LLM-01 aba LLM mostra Provedor, Modelo, Chave de API e URL base

**C2** - "Provedor" oferece "OpenAI", "Anthropic", "Google Gemini", "Ollama" e "Compatível com OpenAI" (LLM-02, AC 2)
Proof: run contracts | ✓ LLM-02 provedores na ordem OpenAI, Anthropic, Google Gemini, Ollama e Compatível com OpenAI
Proof: run web | ✓ LLM-02 select Provedor oferece os cinco provedores na ordem

**C3** - Salvar guarda a chave criptografada no PostgreSQL (LLM-03, AC 3)
Proof: run api | ✓ LLM-03 tabela llm_settings aceita uma linha só
Proof: run api | ✓ LLM-03 salvar grava a chave criptografada

**C4** - Nenhuma resposta da API contém a chave; o campo mostra só os 4 últimos caracteres (LLM-04, AC 4)
Proof: run api | ✓ LLM-04 nenhuma resposta da API contém a chave
Proof: run web | ✓ LLM-04 campo da chave mostra só os 4 últimos caracteres

**C5** - Salvar com "Chave de API" vazia mantém a chave guardada (LLM-05, AC 5)
Proof: run api | ✓ LLM-05 salvar com a chave vazia mantém a chave guardada
Proof: run web | ✓ LLM-05 salvar sem digitar a chave não envia chave

**C6** - "Ollama" ou "Compatível com OpenAI" sem "URL base" é recusado com a mensagem no campo (LLM-06, AC 6)
Proof: run contracts | ✓ LLM-06 Ollama e Compatível com OpenAI exigem URL base
Proof: run api | ✓ LLM-06 URL base vazia responde 400 no campo baseUrl
Proof: run web | ✓ LLM-06 URL base vazia mostra Informe a URL base

**C7** - "OpenAI", "Anthropic" ou "Google Gemini" sem chave informada nem guardada é recusado no campo "Chave de API" (LLM-07, AC 7)
Proof: run api | ✓ LLM-07 provedor com chave obrigatória sem chave responde 400 no campo apiKey
Proof: run web | ✓ LLM-07 sem chave mostra Informe a chave de API no campo

**C8** - "Modelo" vazio é recusado com a mensagem no campo (LLM-08, AC 8)
Proof: run contracts | ✓ LLM-08 modelo vazio dá Informe o modelo
Proof: run api | ✓ LLM-08 modelo vazio responde 400 no campo model
Proof: run web | ✓ LLM-08 modelo vazio mostra Informe o modelo

**C9** - "Testar" envia um pedido mínimo, sem schema, e mostra "Provedor respondendo" (LLM-09, AC 9)
Proof: run api | ✓ LLM-09 testar envia um pedido mínimo sem schema e responde ok
Proof: run web | ✓ LLM-09 Testar mostra Provedor respondendo

**C10** - Teste com falha mostra a mensagem de erro do provedor (LLM-10, AC 10)
Proof: run api | ✓ LLM-10 teste com falha responde 422 com a mensagem do provedor
Proof: run web | ✓ LLM-10 Testar com falha mostra a mensagem do provedor

**C11** - "Remover configuração" pede confirmação com "Remover a configuração do LLM? Os recursos de IA ficarão desligados." (LLM-11, AC 11)
Proof: run web | ✓ LLM-11 Remover configuração pede confirmação

**C12** - Remover apaga provedor, modelo, URL base e chave (LLM-12, AC 12)
Proof: run api | ✓ LLM-12 remover apaga provedor, modelo, URL base e chave
Proof: run web | ✓ LLM-12 confirmar a remoção limpa o formulário

**C13** - Editor e Visualizador recebem 403 na leitura e na gravação da configuração do LLM (LLM-13, AC 13)
Proof: run api | ✓ LLM-13 Editor e Visualizador recebem 403 na configuração do LLM

**C14** - Todas as chamadas ao provedor saem do backend (LLM-14, AC 14)
Proof: run api | ✓ LLM-14 ChatModelFactory cria o modelo de cada provedor no backend
Proof: run web | ✓ LLM-14 web não depende de pacote de provedor de LLM

**C15** - Troca da configuração durante uma geração não muda a configuração dessa geração (LLM-15, edge case)
Proof: run api | ✓ LLM-15 troca de configuração durante a geração não muda o modelo da geração

**C16** - "Pedir à IA" pede ao LLM o Cypher, a visualização, o mapeamento e o título do widget (AIQ-01, AC 1)
Proof: run api | ✓ AIQ-01 pedido pede ao LLM Cypher, visualização, mapeamento e título
Proof: run web | ✓ AIQ-01 Pedir à IA envia o texto e o widget atual

**C17** - "Novo widget" oferece "Descreva o que você quer ver" antes do editor de Cypher (AIQ-02, AC 2)
Proof: run web | ✓ AIQ-02 Novo widget mostra Descreva o que você quer ver antes do editor de Cypher

**C18** - O pedido traz labels, tipos de relacionamento, pares e cada propriedade com todos os tipos e o exemplo inteiro (AIQ-03, AC 3)
Proof: run api | ✓ AIQ-03 schema no prompt traz labels, relacionamentos, pares e propriedades com tipos e exemplo inteiro

**C19** - Propriedade com "Enviar exemplo à IA" desligado vai com os tipos e sem o exemplo (AIQ-04, AC 4)
Proof: run api | ✓ AIQ-04 propriedade com envio desligado vai sem exemplo

**C20** - O pedido traz o texto do usuário e o título, o Cypher, a visualização e o mapeamento atuais do widget (AIQ-05, AC 5)
Proof: run api | ✓ AIQ-05 pedido inclui o texto e o título, Cypher, visualização e mapeamento atuais

**C21** - Nenhuma linha de resultado nem outro dado do banco além dos exemplos do schema vai ao provedor (AIQ-06, AC 6)
Proof: run api | ✓ AIQ-06 nenhuma linha de resultado nem mensagem de execução chega ao provedor

**C22** - O Cypher gerado passa pela validação somente leitura e pelos limites de `dashboards-consultas` (AIQ-07, AC 7)
Proof: run api | ✓ AIQ-07 Cypher gerado passa pela validação somente leitura e pelos limites

**C23** - Cypher gerado válido é executado na conexão do dashboard (AIQ-08, AC 8)
Proof: run api | ✓ AIQ-08 Cypher válido é executado na conexão do dashboard

**C24** - Execução com sucesso atualiza o widget no rascunho com Cypher, visualização, mapeamento e título, e mostra o resultado (AIQ-09, AC 9)
Proof: run api | ✓ AIQ-09 geração bem-sucedida devolve Cypher, visualização, mapeamento, título e resultado
Proof: run web | ✓ AIQ-09 resultado da IA atualiza o widget no rascunho e semeia o resultado
Proof: run web | ✓ AIQ-09 resultado da IA atualiza o widget no card e mostra o resultado

**C25** - Execução sem linhas conclui a geração e o widget mostra "A consulta não retornou dados" (AIQ-10, AC 10)
Proof: run api | ✓ AIQ-10 resultado sem linhas conclui a geração
Proof: run web | ✓ AIQ-10 geração sem linhas atualiza o widget com resultado vazio
Proof: run web | ✓ AIQ-10 geração sem linhas mostra A consulta não retornou dados

**C26** - "Editar widget" depois de uma geração mostra o Cypher gerado, editável (AIQ-11, AC 11)
Proof: run web | ✓ AIQ-11 Editar widget depois da geração mostra o Cypher gerado

**C27** - Durante a geração aparecem "Gerando... tentativa N de 4" e "Cancelar", e "Pedir à IA" fica desabilitado no widget (AIQ-12, AC 12)
Proof: run api | ✓ AIQ-12 resposta informa cada tentativa
Proof: run web | ✓ AIQ-12 leitura do NDJSON entrega cada tentativa na ordem
Proof: run web | ✓ AIQ-12 durante a geração mostra Gerando tentativa N de 4 e Cancelar
Proof: run web | ✓ AIQ-12 Pedir à IA fica desabilitado enquanto o widget gera

**C28** - "Cancelar" para a geração e deixa o widget como estava (AIQ-13, AC 13)
Proof: run api | ✓ AIQ-13 QueryService repassa o signal ao gateway
Proof: run api | ✓ AIQ-13 cancelar para a geração sem nova chamada
Proof: run web | ✓ AIQ-13 Cancelar aborta o pedido e deixa o widget como estava

**C29** - Texto vazio mantém o envio desabilitado (AIQ-14, AC 14)
Proof: run contracts | ✓ AIQ-14 pedido vazio é recusado
Proof: run web | ✓ AIQ-14 Enviar fica desabilitado com o texto vazio

**C30** - Texto com mais de 4.000 caracteres é recusado com "O pedido passa de 4.000 caracteres" (AIQ-15, AC 15)
Proof: run contracts | ✓ AIQ-15 pedido com mais de 4.000 caracteres dá a mensagem
Proof: run api | ✓ AIQ-15 pedido longo responde 400
Proof: run web | ✓ AIQ-15 texto com mais de 4.000 caracteres mostra O pedido passa de 4.000 caracteres

**C31** - Sem provedor configurado, "Pedir à IA" fica desabilitado com "Nenhum provedor de IA configurado" (AIQ-16, AC 16)
Proof: run api | ✓ AIQ-16 sem provedor o status vem desligado
Proof: run api | ✓ AIQ-16 sem provedor a geração responde 409
Proof: run web | ✓ AIQ-16 sem provedor Pedir à IA fica desabilitado com Nenhum provedor de IA configurado

**C32** - Conexão sem schema lido é recusada com "Leia o schema da conexão antes de usar a IA" (AIQ-17, AC 17)
Proof: run api | ✓ AIQ-17 conexão sem schema lido responde Leia o schema da conexão antes de usar a IA
Proof: run web | ✓ AIQ-17 schema não lido mostra a mensagem no painel

**C33** - Visualizador, ou quem não pode editar o dashboard, recebe 403 na geração; quem nem alcança recebe 404 (AD-044) (AIQ-18, AC 18)
Proof: run api | ✓ AIQ-18 Visualizador e quem não edita recebem 403 na geração

**C34** - "Pedir à IA" aparece só para Admin e Editor, em modo de edição (AIQ-19, AC 19)
Proof: run web | ✓ AIQ-19 Pedir à IA aparece só para Admin e Editor em modo de edição

**C35** - Visualização devolvida fora das 10 do NinBI vira "Tabela" (AIQ-20, AC 20)
Proof: run api | ✓ AIQ-20 visualização desconhecida vira Tabela

**C36** - Mapeamento que cita coluna ausente do resultado vira a sugestão automática de `widgets-graficos` (AIQ-30, AC 21)
Proof: run web | ✓ AIQ-30 mapeamento com coluna ausente vira a sugestão automática

**C37** - Cypher recusado ou com falha volta ao LLM com o Cypher e o erro (FIX-01, AC 1)
Proof: run api | ✓ FIX-01 Cypher recusado ou com falha volta ao LLM com o erro

**C38** - No máximo 3 correções depois da primeira geração (FIX-02, AC 2)
Proof: run api | ✓ FIX-02 no máximo 3 correções depois da primeira geração

**C39** - Erro de sintaxe, de semântica ou da validação vai inteiro ao LLM (FIX-03, AC 3)
Proof: run api | ✓ FIX-03 erro de sintaxe, semântica ou validação vai inteiro na correção

**C40** - Erro de execução no Neo4j vai ao LLM só com o código (FIX-04, AC 4)
Proof: run api | ✓ FIX-04 erro do Neo4j guarda o código sem serializá-lo
Proof: run api | ✓ FIX-04 erro de execução vai só com o código

**C41** - Resposta sem Cypher conta como tentativa que falhou (FIX-05, AC 5)
Proof: run api | ✓ FIX-05 resposta sem Cypher não é aceita
Proof: run api | ✓ FIX-05 resposta sem Cypher conta como tentativa que falhou

**C42** - Falhando a última correção, o editor abre com o último Cypher gerado e a mensagem do erro (FIX-06, AC 6)
Proof: run api | ✓ FIX-06 quarta falha devolve o último Cypher e o erro
Proof: run web | ✓ FIX-06 falha final abre o editor com o último Cypher e o erro

**C43** - Falhando a última correção, o widget fica no rascunho como estava até "Aplicar" (FIX-07, AC 7)
Proof: run web | ✓ FIX-07 falha final mantém o widget do rascunho até Aplicar

**C44** - Correção que dá certo segue como geração que deu certo de primeira (FIX-08, AC 8)
Proof: run api | ✓ FIX-08 correção que dá certo na terceira tentativa conclui a geração

**C45** - Provedor que recusa a chave para a geração com "O provedor de IA recusou a chave configurada" (AIQ-21, AC 1)
Proof: run api | ✓ AIQ-21 erro 401 ou MODEL_AUTHENTICATION é chave recusada

**C46** - Limite de uso para a geração com "O provedor de IA recusou o pedido por limite de uso" (AIQ-22, AC 2)
Proof: run api | ✓ AIQ-22 erro 429 ou MODEL_RATE_LIMIT é limite de uso

**C47** - Sem resposta em 60 s, a geração para com "O provedor de IA não respondeu em 60 s" (AIQ-23, AC 3)
Proof: run api | ✓ AIQ-23 chamada sem resposta em 60 s vira tempo esgotado

**C48** - Contexto excedido para a geração com a mensagem sobre o schema e o modelo (AIQ-24, AC 4)
Proof: run api | ✓ AIQ-24 contexto excedido vira a mensagem do schema

**C49** - Outra falha do provedor mostra "Erro do provedor de IA:" e a mensagem dele (AIQ-25, AC 5)
Proof: run api | ✓ AIQ-25 outro erro vira Erro do provedor de IA com a mensagem

**C50** - Falha do provedor deixa o widget como estava e o texto do pedido no campo, sem nova tentativa (AIQ-26, AC 6)
Proof: run api | ✓ AIQ-26 erro do provedor para a geração sem nova tentativa
Proof: run web | ✓ AIQ-26 falha do provedor mantém o texto e o widget

**C51** - Cada chamada ao provedor vai ao log com usuário, provedor, modelo, tentativa, duração e resultado, sem chave e sem schema (AIQ-27, AC 7)
Proof: run api | ✓ AIQ-27 log de cada chamada tem usuário, provedor, modelo, tentativa, duração e resultado sem chave nem schema

**C52** - Pedido de escrita esgota as correções e mostra "Somente consultas de leitura são permitidas" (FIX-09, edge case)
Proof: run api | ✓ FIX-09 pedido de escrita esgota as correções com Somente consultas de leitura são permitidas

**C53** - Sair do modo de edição ou do dashboard para a geração (AIQ-28, edge case)
Proof: run web | ✓ AIQ-28 sair do modo de edição para a geração

**C54** - Widget removido do rascunho durante a geração tem o resultado descartado (AIQ-29, edge case)
Proof: run web | ✓ AIQ-29 widget removido durante a geração descarta o resultado

**C55** - Mais de uma instrução Cypher é falha de validação com "Envie uma consulta por vez" (FIX-10, edge case)
Proof: run api | ✓ FIX-10 várias instruções contam como falha de validação com Envie uma consulta por vez

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** lote 1 (T1-T7, sonnet) sobre 587ea49 - em andamento.
**Walked:** dispensado por AD-023

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T2
          T1 ------→ T3 ------→ T4 ------→ T5
Phase 2:  T6 ------→ T7
Phase 3:  T8 ------→ T11
          T9 ------→ T11
          T10 -----→ T11 -----→ T12
Phase 4:  T13 -----→ T14
Phase 5:  T15 -----→ T18
          T16 -----→ T18
          T17 -----→ T18 -----→ T19 -----→ T20
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order: T1 to T20.
