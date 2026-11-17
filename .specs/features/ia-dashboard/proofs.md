# ia-dashboard proofs

**HEAD**: 28c3007
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 87 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run web / ✓ GEN-01 Novo dashboard oferece Descrever para a IA com Nome, Conexão e Descrição` | pass |
| C2 | `run api / ✓ GEN-02 dashboard criado por quem pede a geração é dele e entra no fim da sidebar` | pass |
| C2 | `run web / ✓ GEN-02 Descrever para a IA cria o dashboard e abre o assistente com a descrição como primeira mens` | pass |
| C3 | `run api / ✓ GEN-03 plano com abas, widgets e filtros vira ações com ids novos` | pass |
| C3 | `run api / ✓ GEN-03 geração cria abas, widgets e filtros devolvidos pelo LLM` | pass |
| C3 | `run web / ✓ GEN-03 aplicar as ações cria abas, widgets e filtros no rascunho` | pass |
| C4 | `run api / ✓ GEN-04 widgets ficam na grade de 12 colunas sem sobreposição e com no mínimo 2 por 2` | pass |
| C5 | `run api / ✓ GEN-05 generate valida, executa e corrige o Cypher do widget` | pass |
| C5 | `run api / ✓ GEN-05 cada widget gerado passa pela validação, execução e autocorreção` | pass |
| C6 | `run api / ✓ GEN-06 widget que continua falhando entra com erro e o último Cypher e os demais seguem` | pass |
| C6 | `run web / ✓ GEN-06 widget com erro entra no rascunho com o último Cypher` | pass |
| C7 | `run api / ✓ GEN-07 resposta da geração informa quantos widgets foram criados e os títulos com erro` | pass |
| C7 | `run web / ✓ GEN-07 resposta mostra os widgets criados e os títulos com erro` | pass |
| C8 | `run api / ✓ GEN-08 resposta informa o widget N de M em geração` | pass |
| C8 | `run web / ✓ GEN-08 leitura do NDJSON entrega accepted, widget e done na ordem` | pass |
| C8 | `run web / ✓ GEN-08 durante a geração mostra Gerando widget N de M e Cancelar` | pass |
| C9 | `run api / ✓ GEN-09 cancelar para a geração sem nova chamada nem resposta gravada` | pass |
| C9 | `run web / ✓ GEN-09 Cancelar a geração aborta o pedido e deixa o rascunho como estava` | pass |
| C10 | `run contracts / ✓ GEN-10 descrição vazia ou com mais de 4.000 caracteres é recusada` | pass |
| C10 | `run web / ✓ GEN-10 Descrição vazia ou longa mostra a mensagem no campo` | pass |
| C11 | `run web / ✓ GEN-11 sem provedor Descrever para a IA fica desabilitado com Nenhum provedor de IA configurado` | pass |
| C12 | `run api / ✓ GEN-12 mais de 20 widgets novos ficam nos 20 primeiros e contam os descartados` | pass |
| C12 | `run web / ✓ GEN-12 resposta mostra quantos widgets foram descartados` | pass |
| C13 | `run api / ✓ GEN-13 pedido ao assistente não grava o dashboard` | pass |
| C13 | `run web / ✓ GEN-13 resultado da geração fica no rascunho sem gravar o dashboard` | pass |
| C14 | `run web / ✓ CHAT-01 Assistente abre e fecha o painel à direita` | pass |
| C15 | `run web / ✓ CHAT-02 painel aberto deixa a grade na largura restante` | pass |
| C16 | `run web / ✓ CHAT-03 painel volta aberto ou fechado como foi deixado neste navegador` | pass |
| C17 | `run web / ✓ CHAT-04 enviar em visualização entra no modo de edição e aplica no rascunho` | pass |
| C18 | `run api / ✓ CHAT-05 pedido traz schema, estrutura do rascunho, 20 mensagens recentes e a mensagem nova` | pass |
| C18 | `run api / ✓ CHAT-05 assistente envia ao LLM só as 20 mensagens mais recentes` | pass |
| C19 | `run contracts / ✓ CHAT-06 contexto do rascunho descarta valores e opções dos filtros e resultados` | pass |
| C19 | `run api / ✓ CHAT-06 rascunho serializado não leva nada além da estrutura` | pass |
| C19 | `run api / ✓ CHAT-06 nenhuma linha de resultado nem valor de filtro chega ao provedor` | pass |
| C20 | `run api / ✓ CHAT-07 só as ações da lista fechada são aceitas` | pass |
| C21 | `run api / ✓ CHAT-08 generate parte do widget atual e dos filtros` | pass |
| C21 | `run api / ✓ CHAT-08 ação que muda o Cypher passa pela validação, execução e autocorreção` | pass |
| C22 | `run api / ✓ CHAT-09 cada ação aceita gera a descrição da mudança` | pass |
| C22 | `run api / ✓ CHAT-09 resposta do assistente traz a lista do que mudou` | pass |
| C22 | `run web / ✓ CHAT-09 resposta mostra o texto e a lista do que mudou` | pass |
| C23 | `run web / ✓ CHAT-10 hook oferece Desfazer só para a resposta mais recente que alterou o rascunho` | pass |
| C23 | `run web / ✓ CHAT-10 Desfazer aparece só na resposta indicada` | pass |
| C24 | `run web / ✓ CHAT-11 Desfazer devolve o rascunho ao estado anterior à resposta` | pass |
| C25 | `run api / ✓ CHAT-12 texto sem JSON vira resposta sem ações` | pass |
| C25 | `run api / ✓ CHAT-12 resposta sem ações não altera o rascunho` | pass |
| C26 | `run web / ✓ CHAT-13 durante a resposta o campo fica desabilitado e mostra Cancelar` | pass |
| C27 | `run web / ✓ CHAT-14 Cancelar durante a resposta aborta e não altera o rascunho` | pass |
| C28 | `run web / ✓ CHAT-15 Enviar fica desabilitado com a mensagem vazia` | pass |
| C29 | `run contracts / ✓ CHAT-16 mensagem com mais de 4.000 caracteres dá A mensagem passa de 4.000 caracteres` | pass |
| C29 | `run api / ✓ CHAT-16 mensagem longa responde 400 com A mensagem passa de 4.000 caracteres` | pass |
| C29 | `run web / ✓ CHAT-16 mensagem com mais de 4.000 caracteres mostra A mensagem passa de 4.000 caracteres` | pass |
| C30 | `run api / ✓ CHAT-17 Visualizador e quem não edita recebem 403 na conversa` | pass |
| C30 | `run api / ✓ CHAT-17 Visualizador e quem não edita recebem 403 no assistente` | pass |
| C31 | `run web / ✓ CHAT-18 Assistente aparece só para Admin e Editor que podem editar` | pass |
| C32 | `run web / ✓ CHAT-19 conversa rola com a mais recente embaixo e o campo fixo` | pass |
| C33 | `run web / ✓ CHAT-20 conversa vazia mostra Descreva o que você quer ver ou mudar neste dashboard` | pass |
| C34 | `run api / ✓ HIST-01 tabela assistant_messages guarda mensagens por dashboard e usuário` | pass |
| C34 | `run api / ✓ HIST-01 mensagem do usuário e resposta do assistente ficam gravadas no PostgreSQL` | pass |
| C35 | `run api / ✓ HIST-02 conversa volta na ordem em que aconteceu` | pass |
| C35 | `run web / ✓ HIST-02 reabrir o dashboard mostra a conversa` | pass |
| C36 | `run api / ✓ HIST-03 cada usuário vê só a própria conversa` | pass |
| C37 | `run web / ✓ HIST-04 Limpar conversa pede confirmação com Apagar toda a conversa deste dashboard?` | pass |
| C38 | `run api / ✓ HIST-05 limpar apaga só as mensagens do usuário nesse dashboard` | pass |
| C38 | `run web / ✓ HIST-05 confirmar a limpeza apaga a conversa do painel` | pass |
| C39 | `run api / ✓ HIST-06 excluir o dashboard apaga as conversas` | pass |
| C40 | `run web / ✓ HIST-07 conversa carregando mostra esqueleto` | pass |
| C41 | `run web / ✓ HIST-08 conversa que não carrega mostra Não foi possível carregar a conversa e Tentar novamente` | pass |
| C42 | `run web / ✓ HIST-09 respostas antigas aparecem sem Desfazer` | pass |
| C43 | `run api / ✓ CHAT-21 Tentar novamente reaproveita a mensagem sem gravar outra` | pass |
| C43 | `run web / ✓ CHAT-21 falha do provedor mostra a mensagem e Tentar novamente reenvia a mesma mensagem` | pass |
| C43 | `run web / ✓ CHAT-21 falha mostra a mensagem do provedor e Tentar novamente na mensagem do usuário` | pass |
| C44 | `run api / ✓ CHAT-22 falha do provedor no meio dos widgets não devolve ações nem grava resposta` | pass |
| C44 | `run web / ✓ CHAT-22 falha do provedor depois do plano não altera o rascunho` | pass |
| C45 | `run api / ✓ CHAT-23 ação que cita widget, aba ou filtro inexistente é ignorada e informada` | pass |
| C45 | `run web / ✓ CHAT-23 ação sobre widget que saiu do rascunho é ignorada` | pass |
| C46 | `run api / ✓ CHAT-24 remover a última aba é ignorado e informado` | pass |
| C47 | `run web / ✓ CHAT-25 Pedir à IA fica desabilitado em todos os widgets enquanto o assistente responde` | pass |
| C48 | `run web / ✓ CHAT-26 Descartar mantém a conversa e tira o Desfazer` | pass |
| C49 | `run api / ✓ CHAT-27 conexão sem schema lido responde 409 com Leia o schema da conexão antes de usar a IA` | pass |
| C49 | `run web / ✓ CHAT-27 schema não lido mostra a mensagem na conversa` | pass |
| C50 | `run web / ✓ GEN-14 falha da geração inicial mantém o dashboard vazio em edição com o erro na conversa` | pass |
| C51 | `run web / ✓ CHAT-30 trocar de aba mantém o painel aberto e a conversa` | pass |
| C52 | `run web / ✓ CHAT-28 sair do dashboard para o pedido` | pass |
| C53 | `run api / ✓ CHAT-29 log de cada pedido tem usuário, dashboard, ações, widgets com erro e duração sem o texto` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run web` - exit 0

```
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/widgets/WidgetEditorDialog.filters.test.tsx > WidgetEditorDialog com filtros > XFL-01 widget KPI não mostra Ao clicar
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/widgets/WidgetEditorDialog.filters.test.tsx > WidgetEditorDialog com filtros > XFL-01 widget KPI não mostra Ao clicar
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.
```

`Run api` - exit 0

```
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 duas cifras do mesmo texto diferem 1ms
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 cifra adulterada lança 1ms
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 chave diferente não decifra 0ms
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem 2ms
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 chave que não tem 32 bytes não inicia o backend 1ms

 Test Files  73 passed (73)
      Tests  402 passed (402)
   Start at  03:27:19
   Duration  206.42s (tests 66%, import 33%)

$ vitest run --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

`Run contracts` - exit 0

```
 ✓ src/dashboards.spec.ts > dashboard contracts > SIDE-02 nome do grupo vazio ou com mais de 40 caracteres 3ms
 ✓ src/dashboards.spec.ts > dashboard contracts > TAB-04 nome da aba vazio ou com mais de 40 caracteres 3ms
 ✓ src/dashboards.spec.ts > dashboard contracts > WDG-07 título do widget vazio ou com mais de 80 caracteres 4ms
 ✓ src/dashboards.spec.ts > dashboard contracts > GRID-03 layout do widget fora dos limites da grade é recusado 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > QRY-09 Cypher com mais de 20000 caracteres no contrato 2ms
 ✓ src/dashboards.spec.ts > dashboard contracts > dashboardSaveSchema sem abas é recusado e com abas e widgets é aceito 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > sidebarLayoutSchema com um dashboard repetido é recusado 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > MESSAGES formata o prazo e o corte de linhas 23ms

 Test Files  11 passed (11)
      Tests  91 passed (91)
   Start at  03:30:48
   Duration  729ms (import 77%, transform 13%, tests 7%, worker 3%)

$ vitest run --reporter=verbose
```
