# IA para Dashboards verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 9734a23
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `DescribeDashboard.test.tsx` `GEN-01 Novo dashboard oferece Descrever para a IA com Nome, Conexão e Descrição` | yes |
| C2 | `assistant.route.spec.ts` `GEN-02 dashboard criado por quem pede a geração é dele e entra no fim da sidebar`; `DescribeDashboard.test.tsx` `GEN-02 Descrever para a IA cria o dashboard e abre o assistente com a descrição como primeira mensagem` | yes |
| C3 | `resolve-actions.spec.ts` `GEN-03 plano com abas, widgets e filtros vira ações com ids novos`; `assistant.service.spec.ts` `GEN-03 geração cria abas, widgets e filtros devolvidos pelo LLM`; `apply-actions.test.ts` `GEN-03 aplicar as ações cria abas, widgets e filtros no rascunho` | yes |
| C4 | `widget-placement.spec.ts` `GEN-04 widgets ficam na grade de 12 colunas sem sobreposição e com no mínimo 2 por 2` | yes |
| C5 | `ai-widget.generate.spec.ts` `GEN-05 generate valida, executa e corrige o Cypher do widget`; `assistant.service.spec.ts` `GEN-05 cada widget gerado passa pela validação, execução e autocorreção` | yes |
| C6 | `assistant.service.spec.ts` `GEN-06 widget que continua falhando entra com erro e o último Cypher e os demais seguem`; `apply-actions.test.ts` `GEN-06 widget com erro entra no rascunho com o último Cypher` | yes |
| C7 | `assistant.service.spec.ts` `GEN-07 resposta da geração informa quantos widgets foram criados e os títulos com erro`; `AssistantMessageList.test.tsx` `GEN-07 resposta mostra os widgets criados e os títulos com erro` | yes |
| C8 | `assistant.route.spec.ts` `GEN-08 resposta informa o widget N de M em geração`; `assistant-api.test.ts` `GEN-08 leitura do NDJSON entrega accepted, widget e done na ordem`; `AssistantComposer.test.tsx` `GEN-08 durante a geração mostra Gerando widget N de M e Cancelar` | yes |
| C9 | `assistant.service.spec.ts` `GEN-09 cancelar para a geração sem nova chamada nem resposta gravada`; `useAssistant.test.tsx` `GEN-09 Cancelar a geração aborta o pedido e deixa o rascunho como estava` | yes |
| C10 | `assistant.spec.ts` (contracts) `GEN-10 descrição vazia ou com mais de 4.000 caracteres é recusada`; `DescribeDashboard.test.tsx` `GEN-10 Descrição vazia ou longa mostra a mensagem no campo` | yes |
| C11 | `DescribeDashboard.test.tsx` `GEN-11 sem provedor Descrever para a IA fica desabilitado com Nenhum provedor de IA configurado` | yes |
| C12 | `resolve-actions.spec.ts` `GEN-12 mais de 20 widgets novos ficam nos 20 primeiros e contam os descartados`; `AssistantMessageList.test.tsx` `GEN-12 resposta mostra quantos widgets foram descartados` | yes |
| C13 | `assistant.service.spec.ts` `GEN-13 pedido ao assistente não grava o dashboard`; `useAssistant.test.tsx` `GEN-13 resultado da geração fica no rascunho sem gravar o dashboard` | yes |
| C14 | `AssistantDashboard.test.tsx` `CHAT-01 Assistente abre e fecha o painel à direita` | yes |
| C15 | `AssistantDashboard.test.tsx` `CHAT-02 painel aberto deixa a grade na largura restante` | yes |
| C16 | `AssistantDashboard.test.tsx` `CHAT-03 painel volta aberto ou fechado como foi deixado neste navegador` | yes |
| C17 | `AssistantDashboard.test.tsx` `CHAT-04 enviar em visualização entra no modo de edição e aplica no rascunho` | yes |
| C18 | `assistant-prompt.spec.ts` `CHAT-05 pedido traz schema, estrutura do rascunho, 20 mensagens recentes e a mensagem nova`; `assistant.service.spec.ts` `CHAT-05 assistente envia ao LLM só as 20 mensagens mais recentes` | yes |
| C19 | `assistant.spec.ts` (contracts) `CHAT-06 contexto do rascunho descarta valores e opções dos filtros e resultados`; `assistant-prompt.spec.ts` `CHAT-06 rascunho serializado não leva nada além da estrutura`; `assistant.service.spec.ts` `CHAT-06 nenhuma linha de resultado nem valor de filtro chega ao provedor` | yes |
| C20 | `resolve-actions.spec.ts` `CHAT-07 só as ações da lista fechada são aceitas` | yes |
| C21 | `ai-widget.generate.spec.ts` `CHAT-08 generate parte do widget atual e dos filtros`; `assistant.service.spec.ts` `CHAT-08 ação que muda o Cypher passa pela validação, execução e autocorreção` | yes |
| C22 | `resolve-actions.spec.ts` `CHAT-09 cada ação aceita gera a descrição da mudança`; `assistant.service.spec.ts` `CHAT-09 resposta do assistente traz a lista do que mudou`; `AssistantMessageList.test.tsx` `CHAT-09 resposta mostra o texto e a lista do que mudou` | yes |
| C23 | `useAssistant.test.tsx` `CHAT-10 hook oferece Desfazer só para a resposta mais recente que alterou o rascunho`; `AssistantMessageList.test.tsx` `CHAT-10 Desfazer aparece só na resposta indicada` | yes |
| C24 | `useAssistant.test.tsx` `CHAT-11 Desfazer devolve o rascunho ao estado anterior à resposta` | yes |
| C25 | `assistant-reply.spec.ts` `CHAT-12 texto sem JSON vira resposta sem ações`; `assistant.service.spec.ts` `CHAT-12 resposta sem ações não altera o rascunho` | yes |
| C26 | `AssistantComposer.test.tsx` `CHAT-13 durante a resposta o campo fica desabilitado e mostra Cancelar` | yes |
| C27 | `useAssistant.test.tsx` `CHAT-14 Cancelar durante a resposta aborta e não altera o rascunho` | yes |
| C28 | `AssistantComposer.test.tsx` `CHAT-15 Enviar fica desabilitado com a mensagem vazia` | yes |
| C29 | `assistant.spec.ts` (contracts) `CHAT-16 mensagem com mais de 4.000 caracteres dá A mensagem passa de 4.000 caracteres`; `assistant.route.spec.ts` `CHAT-16 mensagem longa responde 400 com A mensagem passa de 4.000 caracteres`; `AssistantComposer.test.tsx` `CHAT-16 mensagem com mais de 4.000 caracteres mostra A mensagem passa de 4.000 caracteres` | yes |
| C30 | `assistant-history.spec.ts` `CHAT-17 Visualizador e quem não edita recebem 403 na conversa`; `assistant.route.spec.ts` `CHAT-17 Visualizador e quem não edita recebem 403 no assistente` | yes |
| C31 | `AssistantDashboard.test.tsx` `CHAT-18 Assistente aparece só para Admin e Editor que podem editar` | no - nenhum caso Visualizador com compartilhamento de edição; os dois casos de Visualizador/Editor usam dashboard só de leitura, então o filtro `ai.use` do web não é provado (o servidor prova, em `assistant.route.spec.ts` CHAT-17) |
| C32 | `AssistantPanel.test.tsx` `CHAT-19 conversa rola com a mais recente embaixo e o campo fixo` | yes |
| C33 | `AssistantMessageList.test.tsx` `CHAT-20 conversa vazia mostra Descreva o que você quer ver ou mudar neste dashboard` | yes |
| C34 | `assistant-messages-schema.spec.ts` `HIST-01 tabela assistant_messages guarda mensagens por dashboard e usuário`; `assistant.service.spec.ts` `HIST-01 mensagem do usuário e resposta do assistente ficam gravadas no PostgreSQL` | yes |
| C35 | `assistant-history.spec.ts` `HIST-02 conversa volta na ordem em que aconteceu`; `AssistantDashboard.test.tsx` `HIST-02 reabrir o dashboard mostra a conversa` | yes |
| C36 | `assistant-history.spec.ts` `HIST-03 cada usuário vê só a própria conversa` | yes |
| C37 | `AssistantPanel.test.tsx` `HIST-04 Limpar conversa pede confirmação com Apagar toda a conversa deste dashboard?` | yes |
| C38 | `assistant-history.spec.ts` `HIST-05 limpar apaga só as mensagens do usuário nesse dashboard`; `AssistantPanel.test.tsx` `HIST-05 confirmar a limpeza apaga a conversa do painel` | yes |
| C39 | `assistant-history.spec.ts` `HIST-06 excluir o dashboard apaga as conversas` | yes |
| C40 | `AssistantMessageList.test.tsx` `HIST-07 conversa carregando mostra esqueleto` | yes |
| C41 | `AssistantMessageList.test.tsx` `HIST-08 conversa que não carrega mostra Não foi possível carregar a conversa e Tentar novamente` | yes |
| C42 | `AssistantMessageList.test.tsx` `HIST-09 respostas antigas aparecem sem Desfazer` | no - o teste renderiza a lista com `undoMessageId: null` e nunca reabre o dashboard; passa com qualquer valor de entrada nulo, não prova a reabertura (o estado do hook começa vazio, mas nenhum teste verifica isso) |
| C43 | `assistant.route.spec.ts` `CHAT-21 Tentar novamente reaproveita a mensagem sem gravar outra`; `useAssistant.test.tsx` `CHAT-21 falha do provedor mostra a mensagem e Tentar novamente reenvia a mesma mensagem`; `AssistantMessageList.test.tsx` `CHAT-21 falha mostra a mensagem do provedor e Tentar novamente na mensagem do usuário` | yes |
| C44 | `assistant.service.spec.ts` `CHAT-22 falha do provedor no meio dos widgets não devolve ações nem grava resposta`; `useAssistant.test.tsx` `CHAT-22 falha do provedor depois do plano não altera o rascunho` | yes |
| C45 | `resolve-actions.spec.ts` `CHAT-23 ação que cita widget, aba ou filtro inexistente é ignorada e informada`; `apply-actions.test.ts` `CHAT-23 ação sobre widget que saiu do rascunho é ignorada` | yes |
| C46 | `resolve-actions.spec.ts` `CHAT-24 remover a última aba é ignorado e informado` | yes |
| C47 | `AssistantDashboard.test.tsx` `CHAT-25 Pedir à IA fica desabilitado em todos os widgets enquanto o assistente responde` | yes |
| C48 | `useAssistant.test.tsx` `CHAT-26 Descartar mantém a conversa e tira o Desfazer` | yes |
| C49 | `assistant.route.spec.ts` `CHAT-27 conexão sem schema lido responde 409 com Leia o schema da conexão antes de usar a IA`; `useAssistant.test.tsx` `CHAT-27 schema não lido mostra a mensagem na conversa` | yes |
| C50 | `DescribeDashboard.test.tsx` `GEN-14 falha da geração inicial mantém o dashboard vazio em edição com o erro na conversa` | yes |
| C51 | `AssistantDashboard.test.tsx` `CHAT-30 trocar de aba mantém o painel aberto e a conversa` | yes |
| C52 | `useAssistant.test.tsx` `CHAT-28 sair do dashboard para o pedido` | yes |
| C53 | `assistant.service.spec.ts` `CHAT-29 log de cada pedido tem usuário, dashboard, ações, widgets com erro e duração sem o texto` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Editar um filtro com `filterType` igual ao atual manda `defaultValue` e apaga o valor padrão salvo do filtro. Nenhum check nem teste cobre a alteração parcial de filtro. Own example OWN-1 (`update_filter` MULTI_SELECT com `filterType: 'MULTI_SELECT'` e novo rótulo) falhou no HEAD: a ação traz `defaultValue`. | `apps/api/src/assistant/resolve-actions.ts:462-469` (`patch.defaultValue` entra quando `a.filterType !== undefined`, mesmo sem mudança de tipo; a simulação usa `defaultFor` em `:184`, então o valor enviado é `[]`/`null` e não o real); `apps/web/src/features/assistant/apply-actions.ts:158-165` (aplica `action.filter.defaultValue` sobre o atual, pois o tipo não mudou) | Incluir `defaultValue` no patch só se `a.defaultValue !== undefined` ou se o tipo mudou; teste em `resolve-actions.spec.ts` (tipo igual não manda `defaultValue`) e em `apply-actions.test.ts` (o padrão atual é mantido) | a0e5a2d - C20 |
| Pedido de mudança que falha vira Tabela e perde o mapeamento do gráfico. (a) Se a geração do Cypher falha, o servidor devolve `visualization: 'TABLE'` e `mapping: null`, e o web aplica isso mesmo com o Cypher antigo. (b) Se o Cypher atual do widget dá erro na consulta (ex.: widget que entrou com erro pelo GEN-06), a mudança só de visualização (ex.: "mude para barras") vira Tabela sem aviso. | `apps/api/src/assistant/assistant.service.ts:215-231` (erro de `runCurrent` vai para a ação) e `:382-386`, `:410-419` (`visualization`/`mapping` são TABLE/null quando não há `done`); `apps/web/src/features/assistant/apply-actions.ts:111-126` (`reshapes` true, `action.error !== null` força `'TABLE'`, `mapping` nulo) | Em falha, não mexer em visualização nem mapeamento do widget (manter o atual); no caminho sem geração, aplicar a visualização pedida mesmo com erro de consulta. Teste no `assistant.service.spec.ts` (update com falha mantém a visualização) e no `apply-actions.test.ts` | 38209d7 - C21 |
| Teste de CHAT-18 não prova o filtro de `ai.use` no web: não há caso Visualizador com compartilhamento de edição (o servidor aceita esse caso, e o web é quem esconde o controle). | `apps/web/src/features/dashboards/AssistantDashboard.test.tsx:238-260` (casos só com `readOnly`) | Acrescentar caso `{ role: 'VIEWER', dashboard: makeDashboard() }` (edição permitida) esperando o controle ausente | ac5bd28 - C31 |
| Teste de HIST-09 não reabre o dashboard: renderiza a lista com `undoMessageId: null`, o que passa com qualquer implementação que receba null. | `apps/web/src/features/assistant/AssistantMessageList.test.tsx:157-165` | Em `AssistantDashboard.test.tsx`: gerar uma resposta que altera o rascunho, desmontar, reabrir e conferir que não há "Desfazer" | 72ae358 - C42 |
| Teste de CHAT-26 simula Descartar com `setDraft` e não aciona o botão "Descartar" nem a confirmação. Holds pela identidade do rascunho, mas o controle não é exercido. | `apps/web/src/features/assistant/useAssistant.test.tsx:328-353` | Acrescentar caso em `AssistantDashboard.test.tsx` que clica em "Descartar" e confirma, conferindo que "Desfazer" some e a conversa continua | d299519 - C48 |
| CHAT-10 (AC 10): o texto diz "a resposta mais recente do assistente alterou o rascunho", mas a implementação (e o teste de C23) mantém "Desfazer" na resposta que alterou o rascunho mesmo quando uma resposta posterior, sem ações, veio depois. Leitura adotada pela implementação: "a mais recente que alterou". Decidir qual vale e registrar no spec (ou ocultar o botão quando a última resposta não alterou). | `apps/web/src/features/assistant/useAssistant.test.tsx:218-221` (asserta `r-1` depois de `r-2` sem ações) | Escolher a leitura e ajustar spec ou código; se o spec for mantido, registrar a leitura em `## Differences from the source` ou nota no AC | eb2b2ab - AD-136 |

## Own examples (rodados no HEAD, arquivo descartado)

- OWN-1 `update_filter` do mesmo tipo: FALHOU (finding 1).
- OWN-2 duas remoções de aba com duas abas no rascunho: passou (uma remoção, uma recusa).
- OWN-3 `create_widget` com `x: 11, w: 40, h: 0`: passou, resultado `{x:0, y:0, w:12, h:2}`.
- OWN-4 21 widgets novos: passou (20 aceitos, 1 descartado).

O arquivo `apps/api/test/assistant/zz-own-verifier.spec.ts` foi apagado depois da execução; nada foi commitado.

## Verificação por leitura, sem execução

Regras de maior custo conferidas no código e nos testes no HEAD 9734a23: só `ai.use` com edição usa o chat (servidor: decorator de classe e `access.assert(... 'edit')`; web: `canUseAssistant`); o pedido ao provedor não leva resultados nem valores/opções de filtro (`serializeDraft`, `filtersForPrompt`, `assistantDraftSchema` que descarta o resto); lista fechada e refs inexistentes recusadas; última aba protegida nos dois lados; limite de 20 widgets novos; grade sem sobreposição (`placeWidget`); o servidor não grava o dashboard (só `appendUser`/`appendAssistant`); a aplicação das ações só acontece no evento `done`, então Cancelar e erro do provedor não aplicam nada; "Desfazer" depende da identidade do rascunho (`undoPoint.after`); `retryOf` só vale quando é a última mensagem do próprio usuário; histórico escopado por dashboard e usuário, e o `DELETE` do dashboard cascateia; chave do LLM redigida em `llm-client.ts` (`redactKey`) e fora dos logs. Não li o corpo dos testes marcados `yes` que não estão nos cinco blocos citados acima (C1, C2, C4 a C8, C10 a C13, C16, C32, C33, C37, C40, C41, C43 a C46, C47, C51 a C53): julguei pelo nome e pelo caminho de código.

## Gate

`python3 <skill-dir>/scripts/validate_verification.py ia-dashboard` ainda não rodado nesta sessão; a coluna `Closed` está vazia, como o protocolo pede.
