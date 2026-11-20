# MCP Client verification

**Verdict**: PASS

A revisão inicial identificou 11 achados. A coluna Holds registra a avaliação inicial em `d61c391`. Os commits de correção e os testes que fecham os achados estão em Closed.
**Proofs**: `proofs.md` da execução final. Revisão independente em `d61c391`.
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `apps/api/test/mcp/connections.spec.ts:28` MCP-01, cadastro mantém dois servidores independentes | yes. Confere IDs distintos e o conteúdo dos dois registros após atualizar apenas o primeiro. |
| C2 | `apps/api/test/mcp/client.spec.ts:7` MCP-02, catálogo vem da conexão escolhida | no. Confere catálogos distintos ao passar URLs ao cliente. O uso do ID cadastrado pela rota fica fora do teste. |
| C3 | `apps/api/test/mcp/client.spec.ts:24` MCP-03, queda do endpoint é indicada na descoberta | yes. Fecha o servidor real e exige o código `SOURCE_UNAVAILABLE` do transporte. |
| C4 | `apps/api/test/mcp/connections.spec.ts:49` MCP-04, cadastro sem permissão é recusado | yes. Um Editor recebe 403 e a listagem confirma que o cadastro foi recusado. |
| C5 | `apps/api/test/mcp/table.spec.ts:69` MCP-05, chamada retorna linhas e tipos das colunas | yes. Confere nomes, tipos e valores na ordem da tabela. |
| C6 | `apps/api/test/mcp/table.spec.ts:79` MCP-06, argumentos inválidos são recusados antes da chamada | yes. Um número no argumento textual produz `VALIDATION_ERROR` e o contador de chamadas à ferramenta fica no valor original. |
| C7 | `apps/api/test/mcp/table.spec.ts:87` MCP-07, ferramenta desabilitada não é chamada | no. Cobre lista de habilitação vazia. Uma ferramenta habilitada anteriormente e declarada como escrita pelo servidor fica fora do teste. |
| C8 | `apps/api/test/mcp/table.spec.ts:95` MCP-08, resposta incompatível é recusada | yes. Uma célula textual em coluna inteira exige `MCP_RESULT_INVALID`. |
| C9 | `apps/api/test/mcp/table.spec.ts:102` MCP-09, lista vazia preserva suas colunas tipadas | no. Verifica a normalização de lista vazia, nomes e tipos. A apresentação no painel fica fora do teste. |
| C10 | `apps/api/test/mcp/client.spec.ts:32` MCP-10, chamada acima do prazo retorna erro de tempo limite | yes. Uma chamada RPC pendente produz HTTP 504 e `QUERY_TIMEOUT`. |
| C11 | `apps/api/test/mcp/table.spec.ts:112` MCP-11, resposta acima do limite é sinalizada como parcial | no. Confere 5.001 linhas reduzidas para 5.000 e `truncated: true`. A apresentação do aviso e o resultado com exatamente 5.000 linhas ficam fora do teste. |
| C12 | `apps/api/test/mcp/dashboard.spec.ts:152` MCP-12, configuração da chamada é persistida no widget | no. Confere conexão, ferramenta, argumentos, lista e filtro depois de um GET. O widget persistido tem `config: {}`, sem mapeamento de colunas. |
| C13 | `apps/web/src/features/widgets/McpClient.test.tsx:214` MCP-13, reabrir painel executa configuração persistida | yes. Monta o painel previamente salvo, desmonta e exige que a segunda abertura mostre o novo valor devolvido pela rota do widget. |
| C14 | `apps/web/src/features/widgets/McpClient.test.tsx:230` MCP-14, filtro reexecuta apenas widget vinculado com o novo valor | no. Confere o parâmetro atualizado no widget A e uma chamada ao B. As respostas são imediatas e têm texto constante. A ordem em que chegam e o valor renderizado ficam fora do teste. |
| C15 | `apps/web/src/features/widgets/McpClient.test.tsx:251` MCP-15, falha de uma fonte mantém outro widget disponível | no. Encontra a mensagem e os dados de B em qualquer ponto da página. O escopo do erro no card A fica fora da asserção. |
| C16 | `apps/api/test/mcp/dashboard.spec.ts:175` MCP-16, painel sem acesso não despacha chamada | yes. O Visualizador externo recebe HTTP 404 e a ferramenta configurada permanece com o mesmo número de chamadas. |
| C17 | `apps/api/test/mcp/dashboard.spec.ts:187` MCP-17, rota salva executa MCP sem chamar o provedor de IA | no. Confere os dados de abertura e zero chamadas à IA. O cenário de execução filtrada fica fora do teste. |
| C18 | `apps/api/test/mcp/client.spec.ts:49` MCP-18, endpoint protegido retorna erro de autorização | no. A prova oficial cobre HTTP 401 na descoberta. O exemplo independente cobriu HTTP 403 durante execução e passou. |
| C19 | `apps/web/src/features/widgets/McpClient.test.tsx:71` MCP-19, editor configura manualmente conexão ferramenta e argumentos | yes. A interação seleciona a conexão, a ferramenta e a lista, insere JSON, executa e confere o corpo completo e o resultado da prévia. |
| C20 | `apps/api/test/mcp/dashboard.spec.ts:196` MCP-20, prévia faz chamadas somente ao endpoint MCP cadastrado | no. O fixture verifica a ferramenta em A e a ausência de chamada a B. O caso de um serviço de origem protegido acessado pelo MCP fica fora do teste. |
| C21 | `apps/api/test/mcp/dashboard.spec.ts:162` MCP-21, widgets salvos executam em seus respectivos servidores | yes. As duas rotas de widgets salvos retornam valores diferentes dos dois endpoints e refletem o argumento salvo ou filtrado. |
| C22 | `apps/web/src/features/widgets/McpClient.test.tsx:152` MCP-22, editor oferece as listas tipadas declaradas pela ferramenta | no. A UI exibe e seleciona listas de um DTO montado no teste. A derivação dessas opções reais de um `outputSchema` fica fora do teste. |
| C23 | `apps/api/test/mcp/table.spec.ts:119` MCP-23, somente a lista selecionada abastece o resultado | yes. As duas listas têm dados diferentes e a asserção exige exatamente a linha da lista alternada para `teams`. |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1. C2 deixa a associação entre cadastro e catálogo sem prova de integração. | `apps/api/test/mcp/client.spec.ts:7` chama o transporte por URL. `apps/api/src/mcp/mcp-connections.controller.ts:37` e `apps/api/src/mcp/mcp-table.service.ts:160` resolvem a rota e o cadastro. | Cadastre dois endpoints com catálogos distintos e exija o conteúdo correspondente ao descobrir cada ID pela API. | `e633e53` · C2 |
| F2. C7 deixa a revalidação de leitura sem cobertura. | `apps/api/test/mcp/table.spec.ts:87` testa apenas a lista vazia. `apps/api/src/mcp/mcp-table.service.ts:187` reavalia a ferramenta na seleção corrente do servidor. | Cubra o caso de uma ferramenta cadastrada como habilitada para leitura que passou a devolver `readOnlyHint: false`. Exija 403 e zero chamadas à ferramenta. | `e633e53` · C7 |
| F3. C9 perde os cabeçalhos de uma tabela tipada vazia no painel quando o widget usa um gráfico. | `apps/web/src/features/widgets/WidgetCard.tsx:107` mostra a mensagem de ausência de dados e restringe os cabeçalhos a `TABLE`. `apps/api/test/mcp/table.spec.ts:102` cobre apenas a resposta da API. | Preserve as colunas disponíveis no estado vazio do widget MCP e teste a mensagem e os cabeçalhos na interface. | `e633e53` · C9 |
| F4. C11 deixa o resultado parcial sem indicação na prévia em gráfico. | `apps/web/src/features/widgets/WidgetEditorDialog.tsx:106` renderiza `ResultTable` para tabela e segue para `WidgetVisualization` para gráficos. O aviso fica em `apps/web/src/features/widgets/ResultTable.tsx:74`. O teste em `apps/api/test/mcp/table.spec.ts:112` cobre o resultado acima do limite apenas na API. | Mostre o aviso também na prévia em gráfico. Cubra o aviso de resultado parcial na UI e `truncated: false` com exatamente o limite de linhas na API. | `e633e53` · C11 |
| F5. C12 deixa o mapeamento de colunas sem prova de persistência. | `apps/api/test/mcp/dashboard.spec.ts:135` usa `TABLE` com configuração vazia. A asserção no GET em `apps/api/test/mcp/dashboard.spec.ts:155` confere a chamada MCP e os parâmetros. | Salve uma visualização MCP com mapeamento concreto e confira o mapeamento e a chamada no GET posterior. | `e633e53` · C12 |
| F6. C14 deixa a ordenação concorrente sem prova. | `apps/web/src/features/widgets/McpClient.test.tsx:233` retorna resultados imediatos com texto fixo. `apps/web/src/features/widgets/useWidgetResult.ts:56` monta a chave com o filtro em vigor. | Resolva duas solicitações em ordem inversa e confira que o card exibe o valor do filtro atual após a resposta antiga. | `e633e53` · C14 |
| F7. C15 deixa a localização do erro sem asserção. | `apps/web/src/features/widgets/McpClient.test.tsx:262` busca globalmente a mensagem de falha e os dados do widget vizinho. | Busque a mensagem no card A e localize os dados e o estado saudável no card B. | `e633e53` · C15 |
| F8. C17 deixa a execução filtrada sem prova de independência da IA. | `apps/api/test/mcp/dashboard.spec.ts:189` executa com corpo vazio. `apps/api/test/mcp/dashboard.spec.ts:165` cobre a troca de argumentos em C21 sem asserção do provedor. | Faça também a execução filtrada no teste de C17, confira o novo valor e o contador de IA. | `e633e53` · C17 |
| F9. C18 deixa a autorização durante execução fora da prova permanente. | `apps/api/test/mcp/client.spec.ts:49` usa 401 na descoberta. O teste independente com HTTP 403 ao receber `tools/call` passou em `d61c391`. | Inclua na prova permanente do C18 uma descoberta bem-sucedida com a recusa de execução pelo endpoint e exija `MCP_AUTH_REQUIRED`. | `e633e53` · C18 |
| F10. C20 deixa o limite entre NinBI e o serviço de origem sem prova. | `apps/api/test/mcp/dashboard.spec.ts:196` observa os dois MCPs e não representa o serviço de origem que exige autorização. | Use uma origem local protegida no cenário e verifique que só o servidor MCP se autentica com a origem. Observe os destinos acessados pelo cliente NinBI. | `e633e53` · C20 |
| F11. C22 deixa a derivação das opções tabulares sem prova no catálogo. | `apps/web/src/features/widgets/McpClient.test.tsx:19` e `apps/web/src/features/widgets/McpClient.test.tsx:49` fornecem um DTO com as listas prontas. `apps/api/src/mcp/mcp-table.service.ts:160` monta as listas reais. | Exercite um catálogo com listas tipadas distintas e uma lista com campo aninhado. Confira caminhos e tipos derivados e a ausência da opção não tabular, além da seleção na interface. | `e633e53` · C22 e C2 |

## Independent Examples

Executei os dois testes temporários no HEAD `d61c391` com `pnpm --filter @ninbi/api test independent-verifier-d61c391.spec.ts`. Resultado de 2 testes aprovados. O arquivo temporário foi removido.

- C2. O endpoint de métricas retornou `latency` na primeira página com cursor `beta` e `throughput` na segunda. O serviço de catálogo devolveu as duas ferramentas. [Especificação MCP de ferramentas](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#listing-tools)
- C18. O endpoint aceitou a descoberta de `read_metrics` e respondeu HTTP 403 somente à execução. O cliente devolveu status 422 e código `MCP_AUTH_REQUIRED`.
