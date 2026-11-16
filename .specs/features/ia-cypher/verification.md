# ia-cypher verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 14b3668
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `apps/web/src/features/llm/LlmSettingsTab.test.tsx` `LLM-01 aba LLM mostra Provedor, Modelo, Chave de API e URL base` | yes |
| C2 | `packages/contracts/src/llm.spec.ts` `LLM-02 provedores na ordem OpenAI, Anthropic, Google Gemini, Ollama e Compatível com OpenAI` | yes |
| C3 | `apps/api/test/llm/llm-settings.spec.ts` `LLM-03 salvar grava a chave criptografada` | yes |
| C4 | `apps/api/test/llm/llm-settings.spec.ts` `LLM-04 nenhuma resposta da API contém a chave` | yes |
| C5 | `apps/api/test/llm/llm-settings.spec.ts` `LLM-05 salvar com a chave vazia mantém a chave guardada` | yes |
| C6 | `apps/api/test/llm/llm-settings.spec.ts` `LLM-06 URL base vazia responde 400 no campo baseUrl` | yes |
| C7 | `apps/api/test/llm/llm-settings.spec.ts` `LLM-07 provedor com chave obrigatória sem chave responde 400 no campo apiKey` | yes |
| C8 | `apps/api/test/llm/llm-settings.spec.ts` `LLM-08 modelo vazio responde 400 no campo model` | yes |
| C9 | `apps/api/test/llm/llm-test.spec.ts` `LLM-09 testar envia um pedido mínimo sem schema e responde ok` | yes |
| C10 | `apps/api/test/llm/llm-test.spec.ts` `LLM-10 teste com falha responde 422 com a mensagem do provedor` | yes |
| C11 | `apps/web/src/features/llm/LlmTestAndRemove.test.tsx` `LLM-11 Remover configuração pede confirmação` | yes |
| C12 | `apps/api/test/llm/llm-settings.spec.ts` `LLM-12 remover apaga provedor, modelo, URL base e chave` | yes |
| C13 | `apps/api/test/llm/llm-settings.spec.ts` `LLM-13 Editor e Visualizador recebem 403 na configuração do LLM` | yes |
| C14 | `apps/api/test/llm/chat-model.factory.spec.ts` `LLM-14 ChatModelFactory cria o modelo de cada provedor no backend`; `apps/web/src/features/llm/no-provider-calls.test.ts` `LLM-14 web não depende de pacote de provedor de LLM` | yes |
| C15 | `apps/api/test/ai/ai-widget.service.spec.ts` `LLM-15 troca de configuração durante a geração não muda o modelo da geração` | yes |
| C16 | `apps/api/test/ai/widget-prompt.spec.ts` `AIQ-01 pedido pede ao LLM Cypher, visualização, mapeamento e título` | yes |
| C17 | `apps/web/src/features/widgets/NewWidgetAi.test.tsx` `AIQ-02 Novo widget mostra Descreva o que você quer ver antes do editor de Cypher` | yes |
| C18 | `apps/api/test/ai/widget-prompt.spec.ts` `AIQ-03 schema no prompt traz labels, relacionamentos, pares e propriedades com tipos e exemplo inteiro` | yes |
| C19 | `apps/api/test/ai/widget-prompt.spec.ts` `AIQ-04 propriedade com envio desligado vai sem exemplo` | yes |
| C20 | `apps/api/test/ai/widget-prompt.spec.ts` `AIQ-05 pedido inclui o texto e o título, Cypher, visualização e mapeamento atuais` | yes |
| C21 | `apps/api/test/ai/ai-widget.service.spec.ts` `AIQ-06 nenhuma linha de resultado nem mensagem de execução chega ao provedor` | yes |
| C22 | `apps/api/test/ai/ai-widget.service.spec.ts` `AIQ-07 Cypher gerado passa pela validação somente leitura e pelos limites` | yes |
| C23 | `apps/api/test/ai/ai-widget.service.spec.ts` `AIQ-08 Cypher válido é executado na conexão do dashboard` | no - o teste exige o contrário do critério: linhas 177-180 geram com `body({ connectionId: other.id })` e assertam execução em `estoque`, ou seja, o `connectionId` do corpo é honrado (ver F1) |
| C24 | `apps/api/test/ai/ai-widget.service.spec.ts` `AIQ-09 geração bem-sucedida devolve Cypher, visualização, mapeamento, título e resultado` | yes |
| C25 | `apps/api/test/ai/ai-widget.service.spec.ts` `AIQ-10 resultado sem linhas conclui a geração` | yes |
| C26 | `apps/web/src/features/widgets/AskAiWidget.test.tsx` `AIQ-11 Editar widget depois da geração mostra o Cypher gerado` | yes |
| C27 | `apps/api/test/ai/ai-widget.route.spec.ts` `AIQ-12 resposta informa cada tentativa`; `apps/web/src/features/widgets/AskAiWidget.test.tsx` `AIQ-12 Pedir à IA fica desabilitado enquanto o widget gera` | yes |
| C28 | `apps/api/test/ai/ai-widget.service.spec.ts` `AIQ-13 cancelar para a geração sem nova chamada`; `apps/api/test/queries/query-service-ai.spec.ts` `AIQ-13 QueryService repassa o signal ao gateway` | yes |
| C29 | `packages/contracts/src/ai.spec.ts` `AIQ-14 pedido vazio é recusado` | yes |
| C30 | `packages/contracts/src/ai.spec.ts` `AIQ-15 pedido com mais de 4.000 caracteres dá a mensagem` | yes |
| C31 | `apps/web/src/features/widgets/AskAiWidget.test.tsx` `AIQ-16 sem provedor Pedir à IA fica desabilitado com Nenhum provedor de IA configurado` (cartão; o diálogo do Novo widget não cumpre, ver F4) | yes |
| C32 | `apps/api/test/ai/ai-widget.service.spec.ts` `AIQ-17 conexão sem schema lido responde Leia o schema da conexão antes de usar a IA` | yes |
| C33 | `apps/api/test/ai/ai-widget.route.spec.ts` `AIQ-18 Visualizador e quem não edita recebem 403 na geração` | yes |
| C34 | `apps/web/src/features/widgets/AskAiWidget.test.tsx` `AIQ-19 Pedir à IA aparece só para Admin e Editor em modo de edição` | no - o teste só cobre Admin e Editor (`role?: 'ADMIN' \| 'EDITOR'`, linha 65); nenhum caso de Visualizador verifica a ausência do item (ver F3) |
| C35 | `apps/api/test/ai/widget-reply.spec.ts` `AIQ-20 visualização desconhecida vira Tabela` | yes |
| C36 | `apps/web/src/features/ai/resolve-mapping.test.ts` `AIQ-30 mapeamento com coluna ausente vira a sugestão automática` | yes |
| C37 | `apps/api/test/ai/ai-widget.service.spec.ts` `FIX-01 Cypher recusado ou com falha volta ao LLM com o erro` | yes |
| C38 | `apps/api/test/ai/ai-widget.service.spec.ts` `FIX-02 no máximo 3 correções depois da primeira geração` | yes |
| C39 | `apps/api/test/ai/widget-prompt.spec.ts` `FIX-03 erro de sintaxe, semântica ou validação vai inteiro na correção` | yes |
| C40 | `apps/api/test/ai/widget-prompt.spec.ts` `FIX-04 erro de execução vai só com o código` | yes |
| C41 | `apps/api/test/ai/ai-widget.service.spec.ts` `FIX-05 resposta sem Cypher conta como tentativa que falhou` (o caso de resposta com Cypher dentro de texto falha, ver F2) | yes |
| C42 | `apps/api/test/ai/ai-widget.service.spec.ts` `FIX-06 quarta falha devolve o último Cypher e o erro` | yes |
| C43 | `apps/web/src/features/ai/useAiGenerations.test.tsx` `FIX-07 falha final mantém o widget do rascunho até Aplicar` | yes |
| C44 | `apps/api/test/ai/ai-widget.service.spec.ts` `FIX-08 correção que dá certo na terceira tentativa conclui a geração` | yes |
| C45 | `apps/api/test/llm/provider-error.spec.ts` `AIQ-21 erro 401 ou MODEL_AUTHENTICATION é chave recusada` | yes |
| C46 | `apps/api/test/llm/provider-error.spec.ts` `AIQ-22 erro 429 ou MODEL_RATE_LIMIT é limite de uso` | yes |
| C47 | `apps/api/test/llm/llm-client.spec.ts` `AIQ-23 chamada sem resposta em 60 s vira tempo esgotado` (usa prazo de 50 ms; o valor de 60 s só é provado pela constante `DEFAULT_LLM_CALL_TIMEOUT_MS`) | yes |
| C48 | `apps/api/test/llm/provider-error.spec.ts` `AIQ-24 contexto excedido vira a mensagem do schema` | yes |
| C49 | `apps/api/test/llm/provider-error.spec.ts` `AIQ-25 outro erro vira Erro do provedor de IA com a mensagem` | yes |
| C50 | `apps/api/test/ai/ai-widget.service.spec.ts` `AIQ-26 erro do provedor para a geração sem nova tentativa` | yes |
| C51 | `apps/api/test/llm/llm-client.spec.ts` `AIQ-27 log de cada chamada tem usuário, provedor, modelo, tentativa, duração e resultado sem chave nem schema` | yes |
| C52 | `apps/api/test/ai/ai-widget.service.spec.ts` `FIX-09 pedido de escrita esgota as correções com Somente consultas de leitura são permitidas` | yes |
| C53 | `apps/web/src/features/ai/useAiGenerations.test.tsx` `AIQ-28 sair do modo de edição para a geração` | yes |
| C54 | `apps/web/src/features/ai/useAiGenerations.test.tsx` `AIQ-29 widget removido durante a geração descarta o resultado` | yes |
| C55 | `apps/api/test/ai/ai-widget.service.spec.ts` `FIX-10 várias instruções contam como falha de validação com Envie uma consulta por vez` | yes |

Contagem: 53 `yes`, 2 `no` (C23, C34).

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (Média). O corpo do pedido aceita `connectionId` e a geração usa essa conexão em vez da do dashboard: o schema (com exemplos) dela vai ao provedor e o Cypher roda nela. Contraria AIQ-03 e AIQ-08, e o teste de AIQ-08 assegura o comportamento errado | `apps/api/src/ai/ai-widget.service.ts:59` (`input.body.connectionId ?? input.dashboardConnectionId`); `packages/contracts/src/ai.ts:17`; `apps/web/src/features/ai/useAiGenerations.ts:111`; `apps/api/test/ai/ai-widget.service.spec.ts:177-180` | Remover `connectionId` de `aiWidgetRequestSchema` e usar sempre `dashboardConnectionId` em `prepare`; retirar o envio em `useAiGenerations.ts`; trocar a segunda metade do teste AIQ-08 por uma asserção de que `connectionId` no corpo é ignorado | |
| F2 (Média). Resposta com Cypher válido dentro de bloco ```cypher é recusada quando o texto tem um objeto JSON antes. A primeira `{...}` vence mesmo sem chave `cypher`, e a conta vira tentativa falha (FIX-05). Own examples rodados no HEAD (arquivo temporário, já apagado): `'Use {"x": 1} como referência.\n```cypher\nMATCH (n) RETURN n AS n\n```'` dá `ok: false`; `'{"title": "Vendas"}\n```cypher\n...'` dá `ok: false` | `apps/api/src/ai/widget-reply.ts:199-202` (`const raw = object ?? (fenced ...)`) | Usar o objeto só quando `cypher` é string não vazia; senão cair no bloco ```cypher```. Acrescentar teste com prosa + JSON antes do bloco | |
| F3 (Baixa). Teste de AIQ-19 não cobre o Visualizador na UI: a ausência de "Pedir à IA" para ele não é provada. O código parece correto (`apps/web/src/features/dashboards/DashboardPage.tsx:169`, `canUseAi` em `:331`) | `apps/web/src/features/widgets/AskAiWidget.test.tsx:65` (`role?: 'ADMIN' \| 'EDITOR'`), `:228-242` | Incluir `'VIEWER'` no tipo de `open()` e afirmar que em modo de edição não há item "Pedir à IA" no menu | |
| F4 (Média). Sem provedor, o diálogo "Novo widget" esconde o campo "Descreva o que você quer ver" em vez de mantê-lo desabilitado com "Nenhum provedor de IA configurado" (AIQ-16). O teste `NewWidgetAi.test.tsx` linhas 105-109 fixa essa ausência | `apps/web/src/features/dashboards/DashboardPage.tsx:378-379` (`ai` só com `configured === true`); `apps/web/src/features/widgets/WidgetEditorDialog.tsx:233` (`{ai && (...)}`); `apps/web/src/features/widgets/NewWidgetAi.test.tsx:109` | Renderizar o `AskAiPanel` sempre que `canUseAi`, com envio desabilitado e a mensagem `MESSAGES.llmNotConfigured` quando não houver provedor; ajustar o teste | |
| F5 (Baixa). "Testar" sem chave digitada usa a chave guardada com o provedor e a `baseUrl` que vierem no corpo. Um Admin pode mandar a chave para um host de sua escolha (ex.: "Compatível com OpenAI" com URL própria). Fora de LLM-09, que não cobre isso | `apps/api/src/llm/llm-settings.service.ts:100-116` (`snapshotFor`); `apps/api/src/llm/llm-settings.controller.ts:197-203` | Reusar a chave guardada só quando provedor e URL base forem os guardados; caso contrário exigir a chave digitada | |

Não verificado (sem finding): se o SDK do provedor ecoa a chave na mensagem de erro, ela vai ao navegador por AIQ-25 e LLM-10 (`providerMessage`). O teste AIQ-27 prova só que o log não tem a chave. Também não rodei a suíte inteira nem os testes de integração (Docker); os resultados vêm do `proofs.md` e da leitura dos testes.

Teste temporário de own examples criado em `apps/api/test/ai/zz-own-examples.spec.ts` e apagado depois; nada foi commitado.
