# ia-cypher proofs

**HEAD**: f8589dc
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 91 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run web / ✓ LLM-01 aba LLM mostra Provedor, Modelo, Chave de API e URL base` | pass |
| C2 | `run contracts / ✓ LLM-02 provedores na ordem OpenAI, Anthropic, Google Gemini, Ollama e Compatível com OpenAI` | pass |
| C2 | `run web / ✓ LLM-02 select Provedor oferece os cinco provedores na ordem` | pass |
| C3 | `run api / ✓ LLM-03 tabela llm_settings aceita uma linha só` | pass |
| C3 | `run api / ✓ LLM-03 salvar grava a chave criptografada` | pass |
| C4 | `run api / ✓ LLM-04 nenhuma resposta da API contém a chave` | pass |
| C4 | `run web / ✓ LLM-04 campo da chave mostra só os 4 últimos caracteres` | pass |
| C5 | `run api / ✓ LLM-05 salvar com a chave vazia mantém a chave guardada` | pass |
| C5 | `run web / ✓ LLM-05 salvar sem digitar a chave não envia chave` | pass |
| C6 | `run contracts / ✓ LLM-06 Ollama e Compatível com OpenAI exigem URL base` | pass |
| C6 | `run api / ✓ LLM-06 URL base vazia responde 400 no campo baseUrl` | pass |
| C6 | `run web / ✓ LLM-06 URL base vazia mostra Informe a URL base` | pass |
| C7 | `run api / ✓ LLM-07 provedor com chave obrigatória sem chave responde 400 no campo apiKey` | pass |
| C7 | `run web / ✓ LLM-07 sem chave mostra Informe a chave de API no campo` | pass |
| C8 | `run contracts / ✓ LLM-08 modelo vazio dá Informe o modelo` | pass |
| C8 | `run api / ✓ LLM-08 modelo vazio responde 400 no campo model` | pass |
| C8 | `run web / ✓ LLM-08 modelo vazio mostra Informe o modelo` | pass |
| C9 | `run api / ✓ LLM-09 testar envia um pedido mínimo sem schema e responde ok` | pass |
| C9 | `run web / ✓ LLM-09 Testar mostra Provedor respondendo` | pass |
| C10 | `run api / ✓ LLM-10 teste com falha responde 422 com a mensagem do provedor` | pass |
| C10 | `run web / ✓ LLM-10 Testar com falha mostra a mensagem do provedor` | pass |
| C11 | `run web / ✓ LLM-11 Remover configuração pede confirmação` | pass |
| C12 | `run api / ✓ LLM-12 remover apaga provedor, modelo, URL base e chave` | pass |
| C12 | `run web / ✓ LLM-12 confirmar a remoção limpa o formulário` | pass |
| C13 | `run api / ✓ LLM-13 Editor e Visualizador recebem 403 na configuração do LLM` | pass |
| C14 | `run api / ✓ LLM-14 ChatModelFactory cria o modelo de cada provedor no backend` | pass |
| C14 | `run web / ✓ LLM-14 web não depende de pacote de provedor de LLM` | pass |
| C15 | `run api / ✓ LLM-15 troca de configuração durante a geração não muda o modelo da geração` | pass |
| C16 | `run api / ✓ AIQ-01 pedido pede ao LLM Cypher, visualização, mapeamento e título` | pass |
| C16 | `run web / ✓ AIQ-01 Pedir à IA envia o texto e o widget atual` | pass |
| C17 | `run web / ✓ AIQ-02 Novo widget mostra Descreva o que você quer ver antes do editor de Cypher` | pass |
| C18 | `run api / ✓ AIQ-03 schema no prompt traz labels, relacionamentos, pares e propriedades com tipos e exemplo int` | pass |
| C19 | `run api / ✓ AIQ-04 propriedade com envio desligado vai sem exemplo` | pass |
| C20 | `run api / ✓ AIQ-05 pedido inclui o texto e o título, Cypher, visualização e mapeamento atuais` | pass |
| C21 | `run api / ✓ AIQ-06 nenhuma linha de resultado nem mensagem de execução chega ao provedor` | pass |
| C22 | `run api / ✓ AIQ-07 Cypher gerado passa pela validação somente leitura e pelos limites` | pass |
| C23 | `run api / ✓ AIQ-08 Cypher válido é executado na conexão do dashboard` | pass |
| C24 | `run api / ✓ AIQ-09 geração bem-sucedida devolve Cypher, visualização, mapeamento, título e resultado` | pass |
| C24 | `run web / ✓ AIQ-09 resultado da IA atualiza o widget no rascunho e semeia o resultado` | pass |
| C24 | `run web / ✓ AIQ-09 resultado da IA atualiza o widget no card e mostra o resultado` | pass |
| C25 | `run api / ✓ AIQ-10 resultado sem linhas conclui a geração` | pass |
| C25 | `run web / ✓ AIQ-10 geração sem linhas atualiza o widget com resultado vazio` | pass |
| C25 | `run web / ✓ AIQ-10 geração sem linhas mostra A consulta não retornou dados` | pass |
| C26 | `run web / ✓ AIQ-11 Editar widget depois da geração mostra o Cypher gerado` | pass |
| C27 | `run api / ✓ AIQ-12 resposta informa cada tentativa` | pass |
| C27 | `run web / ✓ AIQ-12 leitura do NDJSON entrega cada tentativa na ordem` | pass |
| C27 | `run web / ✓ AIQ-12 durante a geração mostra Gerando tentativa N de 4 e Cancelar` | pass |
| C27 | `run web / ✓ AIQ-12 Pedir à IA fica desabilitado enquanto o widget gera` | pass |
| C28 | `run api / ✓ AIQ-13 QueryService repassa o signal ao gateway` | pass |
| C28 | `run api / ✓ AIQ-13 cancelar para a geração sem nova chamada` | pass |
| C28 | `run web / ✓ AIQ-13 Cancelar aborta o pedido e deixa o widget como estava` | pass |
| C29 | `run contracts / ✓ AIQ-14 pedido vazio é recusado` | pass |
| C29 | `run web / ✓ AIQ-14 Enviar fica desabilitado com o texto vazio` | pass |
| C30 | `run contracts / ✓ AIQ-15 pedido com mais de 4.000 caracteres dá a mensagem` | pass |
| C30 | `run api / ✓ AIQ-15 pedido longo responde 400` | pass |
| C30 | `run web / ✓ AIQ-15 texto com mais de 4.000 caracteres mostra O pedido passa de 4.000 caracteres` | pass |
| C31 | `run api / ✓ AIQ-16 sem provedor o status vem desligado` | pass |
| C31 | `run api / ✓ AIQ-16 sem provedor a geração responde 409` | pass |
| C31 | `run web / ✓ AIQ-16 sem provedor Pedir à IA fica desabilitado com Nenhum provedor de IA configurado` | pass |
| C32 | `run api / ✓ AIQ-17 conexão sem schema lido responde Leia o schema da conexão antes de usar a IA` | pass |
| C32 | `run web / ✓ AIQ-17 schema não lido mostra a mensagem no painel` | pass |
| C33 | `run api / ✓ AIQ-18 Visualizador e quem não edita recebem 403 na geração` | pass |
| C34 | `run web / ✓ AIQ-19 Pedir à IA aparece só para Admin e Editor em modo de edição` | pass |
| C35 | `run api / ✓ AIQ-20 visualização desconhecida vira Tabela` | pass |
| C36 | `run web / ✓ AIQ-30 mapeamento com coluna ausente vira a sugestão automática` | pass |
| C37 | `run api / ✓ FIX-01 Cypher recusado ou com falha volta ao LLM com o erro` | pass |
| C38 | `run api / ✓ FIX-02 no máximo 3 correções depois da primeira geração` | pass |
| C39 | `run api / ✓ FIX-03 erro de sintaxe, semântica ou validação vai inteiro na correção` | pass |
| C40 | `run api / ✓ FIX-04 erro do Neo4j guarda o código sem serializá-lo` | pass |
| C40 | `run api / ✓ FIX-04 erro de execução vai só com o código` | pass |
| C41 | `run api / ✓ FIX-05 resposta sem Cypher não é aceita` | pass |
| C41 | `run api / ✓ FIX-05 resposta sem Cypher conta como tentativa que falhou` | pass |
| C42 | `run api / ✓ FIX-06 quarta falha devolve o último Cypher e o erro` | pass |
| C42 | `run web / ✓ FIX-06 falha final abre o editor com o último Cypher e o erro` | pass |
| C43 | `run web / ✓ FIX-07 falha final mantém o widget do rascunho até Aplicar` | pass |
| C44 | `run api / ✓ FIX-08 correção que dá certo na terceira tentativa conclui a geração` | pass |
| C45 | `run api / ✓ AIQ-21 erro 401 ou MODEL_AUTHENTICATION é chave recusada` | pass |
| C46 | `run api / ✓ AIQ-22 erro 429 ou MODEL_RATE_LIMIT é limite de uso` | pass |
| C47 | `run api / ✓ AIQ-23 chamada sem resposta em 60 s vira tempo esgotado` | pass |
| C48 | `run api / ✓ AIQ-24 contexto excedido vira a mensagem do schema` | pass |
| C49 | `run api / ✓ AIQ-25 outro erro vira Erro do provedor de IA com a mensagem` | pass |
| C50 | `run api / ✓ AIQ-26 erro do provedor para a geração sem nova tentativa` | pass |
| C50 | `run web / ✓ AIQ-26 falha do provedor mantém o texto e o widget` | pass |
| C51 | `run api / ✓ AIQ-27 log de cada chamada tem usuário, provedor, modelo, tentativa, duração e resultado sem chave` | pass |
| C52 | `run api / ✓ FIX-09 pedido de escrita esgota as correções com Somente consultas de leitura são permitidas` | pass |
| C53 | `run web / ✓ AIQ-28 sair do modo de edição para a geração` | pass |
| C54 | `run web / ✓ AIQ-29 widget removido durante a geração descarta o resultado` | pass |
| C55 | `run api / ✓ FIX-10 várias instruções contam como falha de validação com Envie uma consulta por vez` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run web` - exit 0

```
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/dashboards/DashboardEditMode.test.tsx > DashboardPage em edição > VIZ-15 Salvar envia a visualização e o mapeamento de cada widget
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/dashboards/DashboardEditMode.test.tsx > DashboardPage em edição > VIZ-15 Salvar envia a visualização e o mapeamento de cada widget
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.
```

`Run contracts` - exit 0

```
 ✓ src/schemas.spec.ts > resetPasswordSchema e changeRoleSchema > USR-07 senha provisória curta é recusada e válida passa 1ms
 ✓ src/schemas.spec.ts > resetPasswordSchema e changeRoleSchema > ROLE-05 papel inválido é recusado e papel válido passa 0ms
 ✓ src/connections.spec.ts > connection contracts > CONN-10 aceita os seis esquemas de URI e recusa os demais com URI inválida 10ms
 ✓ src/connections.spec.ts > connection contracts > CONN-11 nome vazio ou com mais de 80 caracteres 1ms
 ✓ src/connections.spec.ts > connection contracts > CONN-11 o nome é guardado sem espaços nas pontas 1ms
 ✓ src/connections.spec.ts > connection contracts > CONN-12 banco vazio vira null 1ms
 ✓ src/connections.spec.ts > connection contracts > CONN-06 usuário e senha vazios recebem a mensagem do campo 0ms
 ✓ src/connections.spec.ts > connection contracts > CONN-15 a edição aceita senha vazia e ausente 1ms

 Test Files  8 passed (8)
      Tests  75 passed (75)
   Start at  19:10:07
   Duration  664ms (import 72%, transform 14%, tests 9%, worker 5%)

$ vitest run --reporter=verbose
```

`Run api` - exit 0

```
 ✓ test/llm/llm-client.spec.ts > LlmClient > AIQ-23 chamada sem resposta em 60 s vira tempo esgotado 2726ms
 ✓ test/llm/llm-client.spec.ts > LlmClient > abortar o signal do usuário dá LlmCancelledError 24ms
 ✓ test/llm/llm-client.spec.ts > LlmClient > texto devolvido em partes é concatenado 1ms
 ✓ test/llm/llm-client.spec.ts > LlmClient > AIQ-27 log de cada chamada tem usuário, provedor, modelo, tentativa, duração e resultado sem chave nem schema 3ms
 ✓ test/llm/llm-client.spec.ts > LlmClient > AIQ-27 a chave em uso é trocada por *** na mensagem do provedor e no log 1ms

 Test Files  59 passed (59)
      Tests  324 passed (324)
   Start at  19:10:10
   Duration  196.59s (tests 74%, import 25%)

$ vitest run --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```
