# IA para Cypher Design

**Spec**: `.specs/features/ia-cypher/spec.md`
**Status**: Approved (o usuário dispensou a aprovação do design: "Não precisa da validação do design.")

Segue a arquitetura de `.specs/features/fundacao-auth/design.md` (seam `LlmModule` com `ChatModelFactory`, AD-032) e usa as interfaces de `conexoes-schema` (`CryptoService`, `SchemaQueryService.get`, `ConnectionSchemaDto` com `sendExample`, AD-039), `dashboards-consultas` (`QueryService.run`, `validateReadOnlyCypher`, `DashboardAccessService`, `draft.ts`, `WidgetCard`, `WidgetEditorDialog`, `useWidgetResult`, AD-043 a AD-046), `compartilhamento` (`DbShareResolver`, Visualizador limitado a "pode ver", AD-048) e `widgets-graficos` (`WIDGET_VISUALIZATIONS`, `widgetMappingSchemas`, `suggestMapping`, `validateMapping`, `columnIndex`, AD-060 a AD-063). As decisões novas desta feature são AD-080 a AD-087 em `.specs/STATE.md`.

**Estado do código no momento deste design:** o repositório tem o scaffolding de `fundacao-auth` e a API de autenticação (schema inicial, health, hasher, sessões, throttle, login, guards). `conexoes-schema`, `dashboards-consultas`, `compartilhamento` e `widgets-graficos` ainda não foram implementadas. Este design parte do que os design.md e tasks.md delas definem. Quem implementar segue o código real quando ele divergir daqui e marca a diferença com `SPEC_DEVIATION`.

Divergências já visíveis no código: `apps/api/test/harness.ts` ainda não tem as opções `neo4j` e `shares` (chegam com `conexoes-schema` e `dashboards-consultas`); `packages/contracts/src/errors.ts` ainda não tem os códigos das features anteriores; `apps/web/src/features/` ainda não existe. Nenhum pacote `@langchain/*` está instalado: a T3 os instala.

---

## Architecture Overview

O backend ganha dois módulos. `llm` guarda a configuração do provedor (uma por instalação), cria o modelo de chat do LangChain e faz cada chamada com prazo, cancelamento, classificação de erro e log. `ai` monta o pedido do widget (schema + widget + texto), interpreta a resposta, valida e executa o Cypher pelo `QueryService` e corrige até 3 vezes. O web ganha a aba "LLM" de "Configurações" e o prompt rápido "Pedir à IA" em cada widget.

```mermaid
graph TD
    Web[apps/web<br/>aba LLM, Pedir à IA,<br/>editor do widget] -->|/api/llm-config*| LC[LlmSettingsController<br/>llm.manage]
    Web -->|GET /api/ai/status| AS[AiController<br/>ai.use]
    Web -->|POST /api/dashboards/:id/ai/widget<br/>resposta NDJSON| AW[AiController<br/>ai.use + assert edit]
    LC --> LS[LlmSettingsService]
    LS --> CR[CryptoService]
    LS --> PG[(PostgreSQL<br/>llm_settings)]
    LC --> CL[LlmClient]
    AW --> ACC[DashboardAccessService]
    AW --> GEN[AiWidgetService<br/>até 4 chamadas]
    GEN --> LS
    GEN --> SQ[SchemaQueryService.get]
    GEN --> PB[widget-prompt.ts<br/>puro]
    GEN --> RP[widget-reply.ts<br/>puro]
    GEN --> CL
    GEN --> QS[QueryService.run<br/>validação somente leitura,<br/>30 s, 5.000 linhas]
    CL --> F[ChatModelFactory<br/>token CHAT_MODEL_FACTORY]
    F -->|@langchain/openai, anthropic,<br/>google-genai, ollama| LLM[Provedor de LLM]
    QS --> GW[Neo4jGateway]
```

### Geração de um widget

```mermaid
sequenceDiagram
    participant W as Web (AskAiPanel)
    participant C as AiController
    participant A as DashboardAccessService
    participant G as AiWidgetService
    participant L as LlmClient
    participant Q as QueryService
    W->>C: POST /api/dashboards/:id/ai/widget { prompt, widget, connectionId? }
    C->>A: assert(user, id, 'edit') (+ @RequirePermission('ai.use'))
    C->>G: prepare(): snapshot da config, schema da conexão
    alt sem config / sem schema / corpo inválido
        C-->>W: 409 LLM_NOT_CONFIGURED | 409 SCHEMA_NOT_READ | 400 VALIDATION_ERROR (JSON)
    end
    C-->>W: 200 application/x-ndjson (cabeçalhos enviados)
    loop tentativa n = 1..4
        G-->>W: {"type":"attempt","attempt":n,"maxAttempts":4}
        G->>L: call(snapshot, mensagens, { signal, attempt: n })
        alt erro do provedor (chave, limite, 60 s, contexto, outro)
            G-->>W: {"type":"provider_error","code":...,"message":...} e fim
        end
        G->>G: parseWidgetReply → sem Cypher conta como falha (FIX-05)
        G->>Q: run({ cypher, connectionId, widgetId, signal })
        alt validação recusa ou Neo4j falha
            G->>G: correctionMessage(erro) → próxima tentativa (FIX-01, FIX-03, FIX-04)
        else NEO4J_UNAVAILABLE
            G-->>W: {"type":"stopped","message":"Não foi possível conectar ao banco <nome>"} e fim
        else ok (com ou sem linhas)
            G-->>W: {"type":"done", cypher, visualization, mapping, title, result, attempts: n}
        end
    end
    G-->>W: {"type":"failed", cypher: último, message: último erro, attempts: 4}
    Note over W,C: Cancelar ou sair aborta o fetch; o 'close' da requisição aborta o signal de L e de Q
```

### Onde as regras rodam

| Regra | Camada | Testada por |
| ----- | ------ | ----------- |
| Campos obrigatórios da configuração, URL base por provedor, tamanho do pedido | `packages/contracts/src/llm.ts`, `ai.ts` (zod) | testes de contrato |
| Chave obrigatória para OpenAI, Anthropic e Gemini, chave guardada mantida, 4 últimos caracteres, DTO sem chave | `LlmSettingsService` | testes de rota (PGlite) |
| Provedor → classe do LangChain, `maxRetries: 0` | `ChatModelFactory` | testes unitários da API (sem chamada de rede) |
| Prazo de 60 s, cancelamento, classificação do erro do provedor, log | `LlmClient`, `provider-error.ts` (puro) | testes unitários da API com o modelo falso |
| Schema no prompt, exemplo desligado, contexto do widget, mensagem de correção | `apps/api/src/ai/widget-prompt.ts` (puro) | testes unitários da API |
| Resposta sem Cypher, visualização desconhecida, mapeamento fora do formato, título | `apps/api/src/ai/widget-reply.ts` (puro) | testes unitários da API |
| Laço de até 4 chamadas, parada em erro do provedor, configuração fixada no início | `AiWidgetService` | testes de service e de rota (PGlite + `FakeNeo4jGateway` + modelo falso) |
| Mapeamento que cita coluna ausente → sugestão automática; sugestão incompleta → Tabela | `apps/web/src/features/ai/resolve-mapping.ts` (puro) | testes unitários do web |
| Aplicar no rascunho só em "done", descartar se o widget sumiu, abortar ao sair | `apps/web/src/features/ai/useAiGenerations.ts` | testes de tela com MSW |

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `CryptoService` | `apps/api/src/crypto/` (conexoes-schema) | `encrypt`/`decrypt` da chave de API (LLM-03) |
| `SchemaQueryService.get(connectionId)` | `apps/api/src/schema/schema-query.service.ts` (conexoes-schema) | Schema com `sendExample` por propriedade (AIQ-03, AIQ-04) |
| `QueryService.run`, `validateReadOnlyCypher` | `apps/api/src/queries/` (dashboards-consultas) | Mesma validação e limites para o Cypher gerado (AIQ-07, AIQ-08); ganha `signal` e `neo4jCode` (T9) |
| `DashboardAccessService.assert(user, id, 'edit')` | `apps/api/src/dashboard-access/` | AIQ-18; com o `DbShareResolver` de `compartilhamento`, o Visualizador nunca edita |
| `@RequirePermission('ai.use')`, `@RequirePermission('llm.manage')`, `can()` | `apps/api/src/auth/`, `packages/contracts/src/roles.ts` | As duas permissões já existem na matriz (Admin e Editor têm `ai.use`; só o Admin tem `llm.manage`) |
| `AppError`, `ZodValidationPipe`, `MESSAGES`, `ERROR_CODES` | `apps/api/src/common/`, `packages/contracts/src/` | Corpo `{ code, message, fieldErrors }` |
| `createTestApp` (opções `neo4j`, `shares`), `FakeNeo4jGateway`, `FakeShareResolver`, `FakeClock`, factories | `apps/api/test/` | Ganha a opção `chatModels` (T4) |
| `WIDGET_VISUALIZATIONS`, `VISUALIZATION_LABELS`, `widgetMappingSchemas`, `MAPPING_FIELD_LABELS` | `packages/contracts/src/widget-config.ts` (widgets-graficos) | Lista e formato que o prompt descreve e que a resposta precisa seguir |
| `suggestMapping`, `validateMapping`, `columnIndex` | `apps/web/src/features/widgets/mapping/` (widgets-graficos) | AIQ-30 |
| `draft.ts` (`updateWidget`), `useDashboardEditor`, `DashboardPage`, `WidgetCard`, `WidgetEditorDialog`, `useWidgetResult` | `apps/web/src/features/dashboards/`, `features/widgets/` | Aplicar o resultado no rascunho; semear o cache da prévia; menu do card; editor |
| `SETTINGS_TABS`, `SettingsPage`, `renderApp`, MSW `server` | `apps/web/src/features/settings/`, `src/test/` | Aba "LLM" e testes de tela |
| `ConnectionFormDialog` (senha "Deixe em branco para manter...") e `ConnectionRowActions` (confirmação) | `apps/web/src/features/connections/` | Padrão do campo de chave e da confirmação de remoção |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| PostgreSQL | Tabela `llm_settings` (uma linha), migração do drizzle-kit |
| Provedor de LLM | Só pelo `ChatModelFactory`, chamado só no backend (LLM-14); prazo de 60 s, `maxRetries: 0` |
| Neo4j do usuário | Só pelo `QueryService.run` (AD-045) |
| `ia-dashboard` | Reaproveita `LlmSettingsService.snapshot`, `LlmClient`, `serializeSchema` e `parseWidgetReply`/`normalizeWidgetReply` para cada widget, e o protocolo NDJSON |
| `interatividade` | FLT-20 acrescenta os filtros ao `buildWidgetMessages` (parâmetro opcional `filters`, ausente nesta feature) |

---

## Components

### Contratos (`packages/contracts/src/`)

#### `llm.ts`
```typescript
export const LLM_PROVIDERS = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'OLLAMA', 'OPENAI_COMPATIBLE'] as const
export type LlmProvider = (typeof LLM_PROVIDERS)[number]
export const LLM_PROVIDER_LABELS: Record<LlmProvider, string>
//   'OpenAI', 'Anthropic', 'Google Gemini', 'Ollama', 'Compatível com OpenAI' (ordem de LLM-02)
export const PROVIDERS_REQUIRING_KEY: readonly LlmProvider[]       // OPENAI, ANTHROPIC, GOOGLE
export const PROVIDERS_REQUIRING_BASE_URL: readonly LlmProvider[]  // OLLAMA, OPENAI_COMPATIBLE
export const llmSettingsSchema   // { provider, model (trim 1-200), apiKey?: string (trim; '' = manter), baseUrl?: string (trim; '' = nenhuma; http/https) }
//   superRefine: baseUrl vazia com provedor de PROVIDERS_REQUIRING_BASE_URL → fieldErrors.baseUrl "Informe a URL base"
export interface LlmSettingsDto { configured: true; provider: LlmProvider; model: string; baseUrl: string | null; apiKeyLast4: string | null; updatedAt: string }
export type LlmSettingsResponse = LlmSettingsDto | { configured: false }
export interface LlmTestResultDto { ok: true }
export interface AiStatusDto { configured: boolean }
```
A regra de LLM-07 depende da chave guardada e roda no service; o formulário do web a repete com `hasStoredKey` só para mostrar a mensagem antes do envio.

#### `ai.ts`
```typescript
export const AI_PROMPT_MAX = 4000
export const AI_MAX_ATTEMPTS = 4                 // 1 geração + 3 correções (FIX-02)
export const aiWidgetRequestSchema               // { prompt (trim 1-4000), widgetId (uuid), connectionId?: uuid,
                                                 //   widget: { title (≤ 80), cypher (≤ 20.000 | null), visualization (string), config (record) } }
export type AiWidgetEvent =
  | { type: 'attempt'; attempt: number; maxAttempts: number }
  | { type: 'done'; attempts: number; cypher: string; visualization: WidgetVisualization;
      mapping: Record<string, unknown> | null; title: string; result: QueryResultDto }
  | { type: 'failed'; attempts: number; cypher: string | null; message: string }
  | { type: 'provider_error'; code: AiProviderErrorCode; message: string }
  | { type: 'stopped'; message: string }
export type AiProviderErrorCode = 'AI_PROVIDER_AUTH' | 'AI_PROVIDER_RATE_LIMIT' | 'AI_PROVIDER_TIMEOUT' | 'AI_PROVIDER_CONTEXT' | 'AI_PROVIDER_FAILED'
```
`visualization` do `widget` no pedido é texto livre: o rascunho pode ter um valor antigo, e o pedido não é gravado.

#### Mensagens (acréscimos em `MESSAGES`) e códigos

| Chave | Texto |
| ----- | ----- |
| `llmModelRequired` | "Informe o modelo" |
| `llmBaseUrlRequired` | "Informe a URL base" |
| `llmBaseUrlInvalid` | "Informe uma URL válida" |
| `llmApiKeyRequired` | "Informe a chave de API" |
| `llmKeepKeyHint` | "Deixe em branco para manter a chave atual" |
| `llmProviderOk` | "Provedor respondendo" |
| `llmRemoveConfirm` | "Remover a configuração do LLM? Os recursos de IA ficarão desligados." |
| `llmNotConfigured` | "Nenhum provedor de IA configurado" |
| `aiPromptPlaceholder` | "Descreva o que você quer ver" |
| `aiPromptTooLong` | "O pedido passa de 4.000 caracteres" |
| `aiSchemaNotRead` | "Leia o schema da conexão antes de usar a IA" |
| `aiGenerating(n)` | "Gerando... tentativa <n> de 4" |
| `aiNoCypher` | "A resposta da IA não contém uma consulta Cypher" |
| `aiProviderAuth` | "O provedor de IA recusou a chave configurada" |
| `aiProviderRateLimit` | "O provedor de IA recusou o pedido por limite de uso" |
| `aiProviderTimeout` | "O provedor de IA não respondeu em 60 s" |
| `aiProviderContext` | "O schema desta conexão não cabe no modelo configurado. Desligue exemplos longos em Conexões ou use um modelo com contexto maior." |
| `aiProviderFailed(msg)` | "Erro do provedor de IA: <msg>" |

`ERROR_CODES` ganha `LLM_NOT_CONFIGURED`, `LLM_PROVIDER_ERROR` (rota de teste) e `SCHEMA_NOT_READ`. Os códigos de `AiProviderErrorCode` só existem no evento NDJSON.

### Backend: `apps/api/src/llm/`

#### `LlmSettingsService` / `LlmSettingsController`
- **Rotas** (`@RequirePermission('llm.manage')`, só Admin: LLM-13):

| Rota | Resposta |
| ---- | -------- |
| `GET /api/llm-config` | `LlmSettingsResponse` |
| `PUT /api/llm-config` `llmSettingsSchema` | 200 `LlmSettingsDto`; 400 `VALIDATION_ERROR` (`model`, `baseUrl`, `apiKey`) |
| `POST /api/llm-config/test` `llmSettingsSchema` | 200 `{ ok: true }`; 422 `LLM_PROVIDER_ERROR` com a mensagem do provedor (LLM-10); 400 |
| `DELETE /api/llm-config` | 204; a linha some (LLM-12) |

- **Gravar**: `apiKey` vazia ou ausente mantém `api_key_encrypted` e `api_key_last4` da linha (LLM-05); informada, grava `crypto.encrypt(apiKey)` e `apiKey.slice(-4)` (LLM-03, LLM-04). Provedor de `PROVIDERS_REQUIRING_KEY` sem chave informada nem guardada → 400 `fieldErrors.apiKey` "Informe a chave de API" (LLM-07). `baseUrl` vazia grava `null`. `INSERT ... ON CONFLICT (id) DO UPDATE` na linha `id = 1`.
- **DTO**: uma função só (`toLlmSettingsDto`) monta a resposta; nenhum campo carrega a chave (LLM-04).
- **Testar** (LLM-09): usa os valores do formulário, com a chave guardada quando `apiKey` vem vazia; envia uma única mensagem humana, "Responda apenas: ok", sem schema; qualquer resposta é sucesso. Não grava nada.
- **`snapshot(): Promise<LlmSnapshot | null>`**: lê a linha e decifra a chave uma vez (`{ provider, model, baseUrl, apiKey }`). Quem gera guarda o snapshot no início e o usa em todas as tentativas (LLM-15).
- **`GET /api/ai/status`** (`@RequirePermission('ai.use')`, no `AiController`): `{ configured }` sem mais nada (AIQ-16).

#### `ChatModelFactory`
- **Location**: `apps/api/src/llm/chat-model.factory.ts`; token `CHAT_MODEL_FACTORY`.
- **Interface**: `create(s: LlmSnapshot): BaseChatModel`.
- **Mapa**: `OPENAI` → `new ChatOpenAI({ model, apiKey, maxRetries: 0 })`; `ANTHROPIC` → `new ChatAnthropic({ model, apiKey, maxRetries: 0 })`; `GOOGLE` → `new ChatGoogleGenerativeAI({ model, apiKey, maxRetries: 0 })`; `OLLAMA` → `new ChatOllama({ model, baseUrl, maxRetries: 0 })`; `OPENAI_COMPATIBLE` → `new ChatOpenAI({ model, apiKey: apiKey ?? 'sem-chave', configuration: { baseURL: baseUrl }, maxRetries: 0 })`. `temperature: 0` em todos. `maxRetries: 0` cumpre "não há nova tentativa automática em erro do provedor".
- Os nomes exatos das opções vêm da versão instalada; a T3 confere e marca `SPEC_DEVIATION` onde mudarem.

#### `classifyProviderError` (puro)
- **Location**: `apps/api/src/llm/provider-error.ts`
- **Interface**: `classifyProviderError(err: unknown): { code: AiProviderErrorCode; message: string; providerMessage: string }`.
- **Ordem**: `LlmTimeoutError` (nosso) → `AI_PROVIDER_TIMEOUT`; `status`/`statusCode`/`response.status` 401 ou 403, ou `lc_error_code === 'MODEL_AUTHENTICATION'` → `AI_PROVIDER_AUTH`; 429 ou `MODEL_RATE_LIMIT` → `AI_PROVIDER_RATE_LIMIT`; `code`/`error.code` `context_length_exceeded`, ou mensagem que casa `/context length|context window|maximum context|prompt is too long|too many tokens|exceeds the maximum.*tokens|input token count/i` → `AI_PROVIDER_CONTEXT`; o resto → `AI_PROVIDER_FAILED` com `MESSAGES.aiProviderFailed(err.message)`.

#### `LlmClient`
- **Location**: `apps/api/src/llm/llm-client.ts`
- **Interface**: `call(s: LlmSnapshot, messages: BaseMessage[], ctx: { userId: string; purpose: 'widget' | 'test'; attempt: number | null; signal?: AbortSignal }): Promise<string>`.
- Cria o modelo pelo factory, chama `model.invoke(messages, { signal: AbortSignal.any([ctx.signal, timeout]) })` com `timeout = AbortSignal.timeout(LLM_CALL_TIMEOUT_MS)` (token, padrão `60_000`). O prazo vira `LlmTimeoutError`; o `signal` do usuário vira `LlmCancelledError`; outro erro sobe como `LlmProviderError` com o resultado de `classifyProviderError`. Devolve o texto da mensagem (`content` string, ou as partes de texto concatenadas).
- **Log (AIQ-27)**: `Logger('Ai')`, uma linha por chamada: `ai call purpose=<widget|test> user=<id> provider=<p> model=<m> attempt=<n|-> durationMs=<n> result=<ok|auth|rate_limit|timeout|context|failed|cancelled>`. Nunca grava chave, mensagens, schema nem resposta.

### Backend: `apps/api/src/ai/`

#### `widget-prompt.ts` (puro)
- `serializeSchema(schema: ConnectionSchemaDto): string` (AIQ-03, AIQ-04): uma seção "Labels" com `(:Label)` e, por propriedade, `- nome: TIPO1 | TIPO2 = <exemplo inteiro>`; propriedade com `sendExample: false` ou sem exemplo sai sem `= ...`. Uma seção "Relacionamentos" com `[:TIPO]`, os pares `(:Origem)-[:TIPO]->(:Destino)` e as propriedades no mesmo formato. Ordem do DTO (alfabética). Nada é cortado (AD-005).
- `buildWidgetMessages({ schema, widget, prompt }): BaseMessage[]` (AIQ-01, AIQ-05): `SystemMessage` com as regras (só Cypher de leitura, uma instrução, nomes de coluna com `AS`, responder só um objeto JSON `{ "cypher", "visualization", "mapping", "title" }`, as 10 visualizações de `WIDGET_VISUALIZATIONS` com o formato do `mapping` de cada uma a partir de `MAPPING_FIELD_LABELS`, título até 80 caracteres em português) e o schema serializado; `HumanMessage` com o widget atual (título, Cypher, visualização e `config.mapping`, ou "nenhum") e o texto do usuário. Nenhum outro dado entra (AIQ-06).
- `correctionMessage(error: QueryErrorInfo): HumanMessage` (FIX-01, FIX-03, FIX-04): "A consulta falhou com o erro: <texto>. Corrija e responda de novo só com o objeto JSON." O texto é:
  - erro da validação (`QUERY_TOO_LONG`, `QUERY_MULTIPLE_STATEMENTS`, `QUERY_WRITE_BLOCKED`), `QUERY_TIMEOUT` e `aiNoCypher`: a mensagem inteira;
  - `QUERY_FAILED` com `neo4jCode` `Neo.ClientError.Statement.SyntaxError` ou `Neo.ClientError.Statement.SemanticError`: a mensagem inteira do Neo4j;
  - qualquer outro `QUERY_FAILED`: só o código (`Erro de execução no Neo4j: <neo4jCode>`, ou `Erro de execução no Neo4j` sem código). A mensagem de execução pode carregar valores do banco (AD-005).
- A conversa de uma geração é: sistema, pedido, e para cada correção a resposta anterior (`AIMessage`) seguida de `correctionMessage`.

#### `widget-reply.ts` (puro)
- `parseWidgetReply(text): { ok: true; reply: RawWidgetReply } | { ok: false }`: tira cercas ```` ```json ```` ou ```` ``` ````, pega o primeiro objeto JSON balanceado e faz `JSON.parse`; sem objeto válido, aceita um bloco ```` ```cypher ```` como `{ cypher }`. `cypher` ausente, não texto ou vazio depois de `trim` → `{ ok: false }` (FIX-05).
- `normalizeWidgetReply(raw, current): NormalizedReply`: `visualization` fora de `WIDGET_VISUALIZATIONS` (sem diferenciar maiúsculas) → `'TABLE'` (AIQ-20); `TABLE` → `mapping: null`; `mapping` que não passa em `widgetMappingSchemas[visualization]` → `null` (o web sugere: AIQ-30); `title` com `trim`, cortado em 80; vazio → título atual do widget.

#### `AiWidgetService`
- **Location**: `apps/api/src/ai/ai-widget.service.ts`
- **Interfaces**:
  ```typescript
  prepare(user, dashboardId, body): Promise<PreparedGeneration>  // erros como AppError, antes do stream
  run(prepared, emit: (e: AiWidgetEvent) => void, signal: AbortSignal): Promise<void>
  ```
- **prepare**: `snapshot()` nulo → 409 `LLM_NOT_CONFIGURED` (AIQ-16); conexão = `body.connectionId ?? access.connectionId`; schema sem documento guardado → 409 `SCHEMA_NOT_READ` (AIQ-17; "lido" é ter documento, em qualquer estado: AD-085).
- **run**: para `n` de 1 a 4: `emit(attempt)`; `llm.call` (erro do provedor → `emit(provider_error)` e fim, sem nova tentativa: AIQ-21 a AIQ-25); `parseWidgetReply` (falha → erro `aiNoCypher`); `queryService.run({ userId, connectionId, cypher, widgetId, signal })` (AIQ-07, AIQ-08); sucesso → `emit(done)` com o resultado (AIQ-09, AIQ-10, FIX-08); `NEO4J_UNAVAILABLE` → `emit(stopped)` com a mensagem e fim; outro erro → guarda `lastCypher` e o erro e segue com `correctionMessage`. Depois da 4ª → `emit(failed)` com o último Cypher gerado (ou `null`) e a mensagem do último erro (FIX-02, FIX-06). Cancelado → para sem emitir.
- A rota nunca grava o dashboard: o resultado vai para o rascunho no navegador (FIX-07).

#### `AiController`
- `GET /api/ai/status` (`ai.use`).
- `POST /api/dashboards/:id/ai/widget` (`ai.use`; `assert(user, id, 'edit')`: AIQ-18). Valida o corpo, chama `prepare` e só então responde 200 `application/x-ndjson`, uma linha JSON por evento, com `res.flushHeaders()` e `res.write` a cada evento; `req.on('close')` aborta o `AbortController` da geração (AIQ-13, AIQ-28).

#### Acréscimos em `QueryService` (dashboards-consultas)
- `run` aceita `signal?: AbortSignal` e o repassa ao `Neo4jGateway.read`.
- O `AppError` de `QUERY_FAILED` ganha a propriedade `neo4jCode?: string` (do `Neo4jGatewayError.code`), que o `AppErrorFilter` não serializa.

### Testes: modelo de chat falso
- `apps/api/test/fakes/scripted-chat-model.ts`: `ScriptedChatModel extends SimpleChatModel` (`@langchain/core/language_models/chat_models`). Recebe um roteiro de itens `string | Error | 'hang'`; cada `_call(messages, options)` guarda as mensagens em `calls` e consome o próximo item: texto devolve, erro lança, `'hang'` espera até `options.signal` abortar ou `release()`. Sem item restante, lança `Error('roteiro esgotado')`.
- `FakeChatModelFactory` implementa `ChatModelFactory`: `script(...itens)`, `created: LlmSnapshot[]` (cada `create`), `model` (o último criado). `createTestApp({ chatModels })` registra o fake no token. Nenhum teste chama um provedor real (AD-081).

### Frontend

| Componente | Location | Interfaces / comportamento |
| ---------- | -------- | -------------------------- |
| `llmApi` | `src/features/llm/api.ts` | `useLlmSettings()`, `useSaveLlmSettings()`, `useTestLlmSettings()`, `useRemoveLlmSettings()` |
| `LlmSettingsTab` | `src/features/llm/LlmSettingsTab.tsx` | aba `llm` de `SETTINGS_TABS` (`available: true`, permissão `llm.manage`): campos "Provedor" (select com `LLM_PROVIDER_LABELS` na ordem: LLM-02), "Modelo", "Chave de API" (tipo senha, vazio; com chave guardada, o placeholder mostra `••••` + 4 últimos e a ajuda `llmKeepKeyHint`: LLM-04, LLM-05) e "URL base" (LLM-01); react-hook-form + `llmSettingsSchema`; `fieldErrors` da API no campo; "Salvar" desabilitado durante o envio; "Testar" mostra "Provedor respondendo" ou a mensagem do provedor (LLM-09, LLM-10); "Remover configuração" só com configuração salva |
| `RemoveLlmDialog` | `src/features/llm/RemoveLlmDialog.tsx` | alert-dialog com `llmRemoveConfirm`, "Remover" e "Cancelar" (LLM-11); confirmar chama `DELETE` e limpa o formulário (LLM-12) |
| `aiApi` | `src/features/ai/api.ts` | `useAiStatus()` (`GET /api/ai/status`, só com `ai.use`); `streamAiWidget(dashboardId, body, signal, onEvent): Promise<AiWidgetEvent>` lê o corpo com `getReader()` e `TextDecoder`, separa por `\n`, chama `onEvent` a cada linha e devolve o evento final; resposta não-2xx vira `ApiError` como no `apiFetch` |
| `resolve-mapping.ts` | `src/features/ai/resolve-mapping.ts` | `resolveAiMapping(visualization, mapping, result): { visualization; config }`: `TABLE` → `{}`; `mapping` nulo, que falha em `validateMapping` ou cita coluna com `columnIndex === -1` → `suggestMapping(visualization, result)`; sugestão que ainda falha em `validateMapping` → `{ visualization: 'TABLE', config: {} }` (AIQ-30, AD-086) |
| `useAiGenerations` | `src/features/ai/useAiGenerations.ts` | estado por widget `{ running: { attempt } } | { error: { message, prompt } }`; `start(widgetId, prompt)` monta o corpo com o widget e a conexão do rascunho e um `AbortController` por widget; `attempt` atualiza o contador; `done` aplica no rascunho por `updateWidget` (título, Cypher, visualização e config de `resolveAiMapping`) e semeia o cache `['query', dashboardId, connectionId, cypher]` com o resultado, sem nova consulta (AIQ-09, AIQ-10); se o widget não está mais no rascunho, descarta (AIQ-29); `failed` chama `onFailed(widgetId, { cypher, message })` sem tocar no rascunho (FIX-06, FIX-07); `provider_error` e `stopped` guardam a mensagem e o texto (AIQ-21 a AIQ-26); `cancel(widgetId)` aborta e volta ao estado anterior (AIQ-13); sair do modo de edição ou desmontar a página aborta todas (AIQ-28) |
| `AskAiPanel` | `src/features/ai/AskAiPanel.tsx` | `textarea` com `aria-label` e placeholder "Descreva o que você quer ver", contador `n/4.000`, "Enviar" desabilitado com texto vazio depois de `trim` (AIQ-14), acima de 4.000 mostra "O pedido passa de 4.000 caracteres" e desabilita (AIQ-15); rodando: "Gerando... tentativa N de 4" e "Cancelar" (AIQ-12); erro: a mensagem em `text-destructive` e o texto mantido (AIQ-26) |
| `WidgetCard` (modify) | `src/features/widgets/WidgetCard.tsx` | em edição e com `can(role, 'ai.use')`: item "Pedir à IA" no menu do card (AIQ-19) que abre o `AskAiPanel` dentro do card; sem provedor, o item fica desabilitado com "Nenhum provedor de IA configurado" (AIQ-16); desabilitado enquanto a geração desse widget roda (AIQ-12) |
| `WidgetEditorDialog` (modify) | `src/features/widgets/WidgetEditorDialog.tsx` | para o widget recém-criado por "Novo widget", o `AskAiPanel` aparece acima do editor de Cypher (AIQ-02); `done` fecha o diálogo e o widget fica atualizado no rascunho; aceita `initialCypher` e `initialError` para FIX-06 (o editor abre com o último Cypher e a mensagem na prévia; "Aplicar" grava como sempre) |
| `DashboardPage` (modify) | `src/features/dashboards/DashboardPage.tsx` | cria `useAiGenerations` no modo de edição e passa a cada `WidgetCard`; `onFailed` abre o `WidgetEditorDialog` do widget com `initialCypher`/`initialError` |

---

## Data Models

```typescript
// apps/api/src/database/schema.ts (acréscimos)
export const llmProviderEnum = pgEnum('llm_provider', ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'OLLAMA', 'OPENAI_COMPATIBLE'])

llm_settings: {
  id: smallint pk check (id = 1)            // uma configuração por instalação
  provider: llmProviderEnum not null
  model: varchar(200) not null
  baseUrl: text null
  apiKeyEncrypted: text null                 // v1:<iv>:<tag>:<cifra> (CryptoService)
  apiKeyLast4: varchar(4) null               // LLM-04
  updatedBy: uuid null references users(id) on delete set null
  updatedAt: timestamptz not null
}
```

**Relationships**: nenhuma além de `updated_by`. Pedidos, respostas e tentativas da IA não são guardados (spec, Data lifecycle).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Editor ou Visualizador nas rotas de `/api/llm-config` | 403 `FORBIDDEN` | A aba "LLM" não aparece |
| Modelo vazio, URL base ausente, chave ausente | 400 `VALIDATION_ERROR` com `fieldErrors` | Mensagem no campo |
| "Testar" falha | 422 `LLM_PROVIDER_ERROR` com a mensagem do provedor | A mensagem abaixo do botão |
| Visualizador, ou quem só vê o dashboard, pede à IA | 403 (`ai.use` ou `assert('edit')`) | O botão não aparece |
| Dashboard fora do alcance | 404 `DASHBOARD_NOT_FOUND` (AD-044) | "Dashboard não encontrado" |
| Sem provedor configurado | 409 `LLM_NOT_CONFIGURED` | "Pedir à IA" desabilitado com "Nenhum provedor de IA configurado" |
| Conexão sem schema guardado | 409 `SCHEMA_NOT_READ` | "Leia o schema da conexão antes de usar a IA" no painel |
| Pedido vazio ou com mais de 4.000 caracteres | 400 `VALIDATION_ERROR` (`fieldErrors.prompt`) | Envio desabilitado / "O pedido passa de 4.000 caracteres" |
| Chave recusada, limite de uso, 60 s, contexto, outro | evento `provider_error`, sem nova tentativa | Mensagem da spec; texto fica no campo; widget intacto |
| Resposta sem Cypher, validação recusa, Neo4j falha | correção até 3 vezes | "Gerando... tentativa N de 4" |
| Quarta tentativa falha | evento `failed` | Editor aberto com o último Cypher e o erro; rascunho intacto |
| Banco Neo4j inacessível durante a geração | evento `stopped` | "Não foi possível conectar ao banco <nome>"; widget intacto |
| Usuário cancela, sai da edição ou do dashboard | `fetch` abortado → `close` → `signal` abortado | Widget como estava |
| Widget removido durante a geração | resultado descartado no web | Nada muda |

---

## Test Strategy

| Nível | O que cobre | Onde |
| ----- | ----------- | ---- |
| Contratos | provedores e rótulos, regras do formulário, tamanho do pedido, mensagens | `packages/contracts/src/{llm,ai}.spec.ts` |
| API pura | classificação de erro, prompt, schema serializado, correção, resposta | `apps/api/test/llm/*.spec.ts`, `apps/api/test/ai/*.spec.ts` |
| API factory | classe e opções de cada provedor, sem rede | `apps/api/test/llm/chat-model.factory.spec.ts` |
| API rápida (PGlite + `FakeNeo4jGateway` + `FakeShareResolver` + `FakeChatModelFactory`) | configuração, teste do provedor, geração inteira, permissões, log | `apps/api/test/llm/*.spec.ts`, `apps/api/test/ai/*.spec.ts` |
| Web | gesto + texto visível com MSW; leitura do NDJSON com `ReadableStream`; resolução do mapeamento | `apps/web/src/features/{llm,ai}/*.test.ts(x)`, `features/widgets/*.test.tsx` |

- **Nunca há chamada a provedor real.** O factory real só é instanciado no teste do próprio factory, que não chama `invoke`.
- **Prazo**: os testes sobrescrevem `LLM_CALL_TIMEOUT_MS` com 50 ms e usam `'hang'`; um teste separado confere o padrão `60000`.
- **AIQ-06**: o teste da geração põe no `FakeNeo4jGateway` linhas com o valor `VALOR-DE-LINHA-7f3a` e um erro de execução com `ArithmeticError` cuja mensagem contém `VALOR-DE-ERRO-91c2`; nenhuma mensagem de `ScriptedChatModel.calls` contém esses textos.
- **Cancelamento** no servidor é provado no `AiWidgetService` com `AbortController` (o supertest não fecha uma requisição no meio); no web, pelo `request.signal.aborted` no handler MSW.
- **NDJSON no MSW**: o handler responde `new HttpResponse(stream, { headers: { 'Content-Type': 'application/x-ndjson' } })` com um `ReadableStream` que o teste alimenta linha a linha, para ver o contador mudar.

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Features anteriores ainda não implementadas | `apps/api/src/{crypto,schema,queries,dashboard-access}/`, `apps/web/src/features/{dashboards,widgets}/` | Nomes reais podem diferir do design | Pré-requisito declarado em tasks.md; `SPEC_DEVIATION` onde diferirem |
| Formato dos erros dos SDKs de cada provedor | `provider-error.ts` | `lc_error_code`, `status` e textos de contexto excedido variam por pacote e versão; não confirmei todos | Classificação por várias pistas, na ordem do design; o resto cai em "Erro do provedor de IA: <mensagem>", que nunca esconde o erro; testes com os formatos conhecidos (status 401/429, `lc_error_code`, `context_length_exceeded`) |
| Nomes das opções dos construtores `@langchain/*` | `chat-model.factory.ts` | `apiKey`/`baseUrl`/`configuration.baseURL`/`maxRetries` podem ter mudado | A T3 instala as versões atuais, confere os tipos e ajusta; o teste do factory lê os campos da instância |
| `SimpleChatModel` como base do fake | `apps/api/test/fakes/scripted-chat-model.ts` | Se a classe mudou, o fake não compila | Alternativa: estender `BaseChatModel` com `_generate`; o roteiro e `calls` não mudam |
| Modelo devolve texto fora do JSON | `widget-reply.ts` | Gasta tentativas | Cercas, primeiro objeto balanceado e bloco `cypher` são aceitos; sem Cypher conta como tentativa (FIX-05) |
| Mensagem de erro de execução do Neo4j com dados | `widget-prompt.ts` | Vazaria valores ao provedor | Só sintaxe e semântica mandam a mensagem (FIX-03, FIX-04); teste com marcador em AIQ-06 |
| Consulta continua no Neo4j depois do cancelamento | `QueryService` | O `signal` fecha o driver no gateway, mas uma transação já enviada pode rodar até o prazo | O prazo de 30 s limita; o resultado é descartado |
| Provedor continua cobrando depois do cancelamento | `LlmClient` | Abortar o `fetch` não desfaz o uso já contado pelo provedor | Aceito; sem nova tentativa automática |
| Chave de 4 últimos caracteres em claro | `llm_settings.api_key_last4` | 4 caracteres da chave ficam legíveis no banco | É o que a tela mostra (LLM-04); o resto só cifrado |
| Proxy que bufferiza a resposta | instalação atrás de nginx | O contador só aparece no fim | `X-Accel-Buffering: no` na resposta; o resultado final não depende do streaming |
| Schema enorme | `serializeSchema` | Custo e estouro de contexto | AD-005 manda não cortar; o estouro vira AIQ-24 com a orientação de desligar exemplos |
| Testes existentes mudam | `SettingsPage.test.tsx` (CFG-02 de `fundacao-auth`), testes de `QueryService`, `WidgetCard`, `WidgetEditorDialog` | Aba "LLM" para o Admin; novos itens de menu | A T12 atualiza CFG-02 conforme AD-086 (o Admin vê "Conexões", "Usuários", "Dashboards" e "LLM", nessa ordem), sem afrouxar asserções; os demais continuam verdes |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Configuração do LLM | Uma linha `llm_settings`, chave cifrada e 4 últimos em coluna própria (AD-080) | Uma por instalação; mostrar os 4 últimos sem decifrar a cada leitura |
| Chamada ao provedor | `ChatModelFactory` + `LlmClient` com `maxRetries: 0`, 60 s por `AbortSignal`, classificação e log (AD-081) | Um só ponto de chamada para `ia-cypher` e `ia-dashboard`; testes com modelo falso roteirizado |
| Protocolo de resposta da IA | Objeto JSON em texto, sem `withStructuredOutput` nem tool calling (AD-082) | AD-006: prompts não dependem de recurso de um provedor só; Ollama e "Compatível com OpenAI" variam |
| Progresso | Resposta NDJSON na mesma requisição (AD-083) | Contador ao vivo sem job nem polling; cancelar é fechar a requisição |
| Erro enviado na correção | Mensagem inteira só para validação, sintaxe e semântica; código para execução; banco inacessível para sem correção (AD-084) | Spec FIX-03 e FIX-04; corrigir o Cypher não traz o banco de volta |
| Schema "lido" | Existe documento em `connection_schemas` (AD-085) | Uma leitura em andamento ou falha mantém o schema anterior, que serve à IA |
| Mapeamento | Resolvido no navegador com as funções de `widgets-graficos` (AD-086) | A sugestão automática já é pura e testada no web; o backend só garante o formato |
| `QueryService` | `signal` e `neo4jCode` (AD-087) | Cancelamento até o Neo4j e decisão de FIX-04 sem ler a mensagem |
