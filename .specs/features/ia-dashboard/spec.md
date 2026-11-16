# IA para Dashboards Specification

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Problem Statement

Com o prompt rápido, a IA cria um widget por vez. O usuário quer mais: descrever o dashboard e recebê-lo inteiro, e conversar com um assistente que fica ao lado do dashboard e o altera a pedido. Esta feature entrega o chat lateral persistente e a geração do dashboard inteiro (abas, widgets, layout e filtros) a partir de uma descrição, reusando a geração, a validação e a autocorreção de `ia-cypher`.

## Goals

- [ ] Um Editor descreve um dashboard em texto e recebe abas, widgets com Cypher e visualização, layout na grade e filtros, prontos para ajustar e salvar.
- [ ] O chat lateral fica disponível em todo dashboard e altera widgets, abas, layout e filtros a pedido.
- [ ] Um widget que a IA não consegue acertar não derruba os demais: ele entra com erro e Cypher editável.
- [ ] Nenhuma linha de resultado de consulta é enviada ao provedor.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| IA respondendo perguntas sobre os dados ("qual foi o total de vendas?") em texto | Exigiria enviar resultados ao provedor, o que AD-005 proíbe; a IA responde criando um widget |
| IA explicando ou resumindo widgets | Mesmo motivo |
| Chat fora de um dashboard (assistente global) | Não foi pedido; o chat é do dashboard |
| Conversa compartilhada entre usuários | A conversa é por usuário (decisão delegada) |
| Histórico de versões do dashboard | Não foi pedido; há só o "Desfazer" da última alteração da IA |
| Resposta em streaming, token a token | Não foi pedida |
| Entrada por voz ou por imagem | Não foi pedida |
| Uso do chat por Visualizador ou por quem só pode ver o dashboard | O Visualizador não usa a IA (AD-015), e o chat altera o dashboard |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| UX da IA | Chat lateral persistente no dashboard e prompt rápido em cada widget | Decisão do usuário; o prompt rápido é de `ia-cypher` | y |
| Geração do dashboard inteiro | A IA gera o dashboard a partir de uma descrição | AD-004 | y |
| Layout | A IA propõe; o usuário ajusta na grade | AD-011 | y |
| Contexto enviado | Schema enriquecido, estrutura do dashboard, conversa; nenhuma linha de resultado | AD-005; a estrutura do dashboard não é dado do banco | y |
| Entrada da geração | "Novo dashboard" ganha a opção "Descrever para a IA"; o chat em um dashboard vazio faz o mesmo | Dois caminhos para a mesma capacidade, sem tela nova | y - delegado |
| O que a geração inclui | Abas, widgets (Cypher, visualização, mapeamento, título), layout e filtros globais | "Dashboard inteiro"; os filtros já existem quando esta feature chega | y - delegado |
| Limite de widgets por pedido | 20; o que passar disso é descartado e avisado | Limite concreto para a saída do LLM; cada widget custa até 4 chamadas | y - delegado |
| Conversa enviada ao LLM | As 20 mensagens mais recentes | Limite concreto; a conversa inteira cresce sem fim | y - delegado |
| Cancelar | Desfaz tudo o que o pedido em andamento já aplicou | Uma regra só: cada pedido é aplicado inteiro ou não é | y - delegado |
| Desfazer | Só a alteração mais recente da IA pode ser desfeita | Desfazer alterações antigas com outras por cima não tem resultado previsível | y - delegado |
| Pedido no modo de visualização | Enviar uma mensagem coloca o dashboard em modo de edição | A IA altera o rascunho (Q1 de `dashboards-consultas`) | y - delegado |
| Tamanho da mensagem | Até 4.000 caracteres | Mesmo limite do prompt rápido | y - delegado |
| Lugar do painel | À direita; a grade usa a largura que sobra; aberto ou fechado fica guardado no navegador | A captura não desenha o chat; um painel à direita não cobre a sidebar nem os widgets | y - delegado |
| Quem usa | Admin e Editor, nos dashboards que podem editar | AD-015; AD-014 | y |
| Dono do dashboard gerado | Quem pediu a geração; o dashboard nasce privado | AD-014 | y |
| Conversa de quem perde o acesso | Fica guardada e volta se o acesso voltar; ninguém mais a vê | A conversa é por usuário; apagar no descompartilhamento perderia trabalho por engano | y - delegado |
| Chat "persistente" | O painel existe em todo dashboard e a conversa é guardada por dashboard e por usuário | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |
| Como as alterações da IA entram | Direto no rascunho, com "Desfazer"; nada é gravado antes de "Salvar" | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Gerar o dashboard inteiro ⭐ MVP

**User Story**: As a Editor, I want descrever o dashboard que preciso e recebê-lo montado so that eu comece ajustando, não do zero.

**Why P1**: É a promessa central do produto (AD-004).

**Acceptance Criteria**:

1. WHEN um Admin ou Editor usa "Novo dashboard" THEN o sistema SHALL oferecer, além da criação em branco, a opção "Descrever para a IA" com os campos "Nome", "Conexão" e "Descrição" [GEN-01]
2. WHEN "Descrever para a IA" é enviado THEN o sistema SHALL criar o dashboard com quem pediu como dono, colocá-lo no fim da sidebar dele, abri-lo em modo de edição com o painel do assistente aberto e a descrição como primeira mensagem da conversa [GEN-02]
3. WHEN a geração roda THEN o sistema SHALL criar no rascunho as abas, os widgets com Cypher, visualização, mapeamento e título, e os filtros globais devolvidos pelo LLM [GEN-03]
4. WHEN a geração posiciona os widgets THEN o sistema SHALL dar a cada um posição e tamanho dentro da grade de 12 colunas, sem sobreposição e com no mínimo 2 colunas por 2 linhas [GEN-04]
5. WHEN a geração cria um widget THEN o sistema SHALL aplicar a ele a validação somente leitura, a execução e a autocorreção de `ia-cypher` [GEN-05]
6. IF um widget continua falhando depois das correções THEN o sistema SHALL criá-lo no rascunho em estado de erro, com o último Cypher no editor, e seguir com os demais [GEN-06]
7. WHEN a geração termina THEN o sistema SHALL mostrar na conversa quantos widgets foram criados e o título de cada widget que ficou com erro [GEN-07]
8. WHILE a geração está em andamento o sistema SHALL mostrar "Gerando widget N de M" e o botão "Cancelar" [GEN-08]
9. WHEN o usuário usa "Cancelar" durante a geração THEN o sistema SHALL parar a geração e desfazer o que ela já tinha aplicado ao rascunho [GEN-09]
10. IF "Descrição" está vazia ou passa de 4.000 caracteres THEN o sistema SHALL recusar com a mensagem no campo [GEN-10]
11. IF não há provedor de IA configurado THEN o sistema SHALL manter "Descrever para a IA" desabilitado com "Nenhum provedor de IA configurado" [GEN-11]
12. IF o LLM devolve mais de 20 widgets THEN o sistema SHALL criar os 20 primeiros e avisar na conversa quantos foram descartados [GEN-12]
13. WHEN a geração termina THEN o sistema SHALL manter tudo em rascunho, sem gravar antes de o usuário usar "Salvar" [GEN-13]

**Independent Test**: No dataset de exemplo, descrever "visão geral com indicadores, evolução mensal, ranking e mapa": o dashboard abre com widgets dispostos sem sobreposição, cada um com Cypher visível; salvar e reabrir.

---

### P1: Chat lateral ⭐ MVP

**User Story**: As a Editor, I want conversar com um assistente ao lado do dashboard e pedir mudanças so that eu ajuste o dashboard em português, sem abrir cada widget.

**Why P1**: Decisão do usuário sobre a UX da IA.

**Acceptance Criteria**:

1. WHEN um Admin ou Editor abre um dashboard que pode editar THEN o sistema SHALL mostrar o controle "Assistente", que abre e fecha o painel de chat à direita [CHAT-01]
2. WHILE o painel está aberto o sistema SHALL manter a grade de widgets na largura restante, sem que o painel cubra widgets [CHAT-02]
3. WHEN o usuário reabre um dashboard THEN o sistema SHALL mostrar o painel aberto ou fechado como ele o deixou nesse navegador [CHAT-03]
4. WHEN o usuário envia uma mensagem em modo de visualização THEN o sistema SHALL colocar o dashboard em modo de edição antes de aplicar qualquer alteração [CHAT-04]
5. WHEN o sistema monta o pedido ao LLM THEN o sistema SHALL incluir o schema da conexão, a estrutura atual do rascunho (abas, widgets com título, Cypher, visualização, mapeamento, posição e tamanho, e filtros com rótulo, parâmetro e tipo), as 20 mensagens mais recentes da conversa e a mensagem nova [CHAT-05]
6. The system SHALL não enviar ao provedor nenhuma linha de resultado de consulta, nenhum valor de filtro nem outro dado do banco além dos exemplos do schema [CHAT-06]
7. WHEN o LLM pede alterações THEN o sistema SHALL aceitar apenas estas ações: criar, alterar e remover widget; criar, renomear e remover aba; mover e redimensionar widget; criar, alterar e remover filtro; renomear o dashboard [CHAT-07]
8. WHEN uma ação cria ou altera o Cypher de um widget THEN o sistema SHALL aplicar a validação somente leitura, a execução e a autocorreção de `ia-cypher` [CHAT-08]
9. WHEN as ações são aplicadas THEN o sistema SHALL mostrar na conversa a resposta do assistente com a lista do que mudou [CHAT-09]
10. WHEN a resposta mais recente do assistente alterou o rascunho THEN o sistema SHALL mostrar nela o botão "Desfazer" [CHAT-10]
11. WHEN o usuário usa "Desfazer" THEN o sistema SHALL devolver o rascunho ao estado anterior a essa resposta [CHAT-11]
12. WHEN o LLM responde sem pedir alterações THEN o sistema SHALL mostrar o texto da resposta e não alterar o rascunho [CHAT-12]
13. WHILE o assistente está respondendo o sistema SHALL manter o campo de mensagem desabilitado e mostrar "Cancelar" [CHAT-13]
14. WHEN o usuário usa "Cancelar" durante uma resposta THEN o sistema SHALL parar o pedido e desfazer o que ele já tinha aplicado ao rascunho [CHAT-14]
15. IF a mensagem está vazia THEN o sistema SHALL manter o envio desabilitado [CHAT-15]
16. IF a mensagem passa de 4.000 caracteres THEN o sistema SHALL recusar com "A mensagem passa de 4.000 caracteres" [CHAT-16]
17. IF um Visualizador, ou um usuário que não pode editar o dashboard, chama o chat THEN o sistema SHALL responder 403 [CHAT-17]
18. The system SHALL mostrar o controle "Assistente" só para Admin e Editor que podem editar o dashboard [CHAT-18]
19. WHILE a conversa passa da altura do painel o sistema SHALL rolar as mensagens, com a mais recente embaixo e o campo de mensagem fixo [CHAT-19]
20. WHEN a conversa está vazia THEN o sistema SHALL mostrar no painel "Descreva o que você quer ver ou mudar neste dashboard" [CHAT-20]

**Independent Test**: Em um dashboard com três widgets, pedir "troque o gráfico de vendas para linha e adicione um KPI de total de clientes": os dois efeitos aparecem no rascunho, a resposta lista as mudanças, e "Desfazer" devolve o estado anterior.

---

### P1: Conversa guardada ⭐ MVP

**User Story**: As a Editor, I want reencontrar a conversa quando volto ao dashboard so that eu continue de onde parei.

**Why P1**: "Chat lateral persistente" é palavra do usuário.

**Acceptance Criteria**:

1. WHEN o usuário envia uma mensagem ou o assistente responde THEN o sistema SHALL gravar a mensagem no PostgreSQL, ligada ao dashboard e ao usuário [HIST-01]
2. WHEN o usuário reabre o dashboard THEN o sistema SHALL mostrar no painel a conversa dele nesse dashboard, na ordem em que aconteceu [HIST-02]
3. The system SHALL mostrar a cada usuário apenas a própria conversa [HIST-03]
4. WHEN o usuário usa "Limpar conversa" THEN o sistema SHALL pedir confirmação com "Apagar toda a conversa deste dashboard?" [HIST-04]
5. WHEN a limpeza é confirmada THEN o sistema SHALL apagar as mensagens desse usuário nesse dashboard [HIST-05]
6. WHEN um dashboard é excluído THEN o sistema SHALL apagar todas as conversas dele [HIST-06]
7. WHILE a conversa carrega o sistema SHALL mostrar um esqueleto no painel [HIST-07]
8. IF a conversa não carrega THEN o sistema SHALL mostrar "Não foi possível carregar a conversa" com "Tentar novamente" [HIST-08]
9. WHEN o dashboard é reaberto THEN o sistema SHALL mostrar as respostas antigas sem o botão "Desfazer" [HIST-09]

**Independent Test**: Conversar, sair, entrar de novo e ver a conversa; entrar como outro Editor e ver o painel vazio.

---

## Edge Cases

- IF o provedor de IA falha durante um pedido do chat ou da geração THEN o sistema SHALL mostrar na conversa a mensagem de falha do provedor definida em `ia-cypher` e o botão "Tentar novamente" na mensagem do usuário [CHAT-21]
- IF o provedor falha depois que parte das ações já foi aplicada THEN o sistema SHALL desfazer o que o pedido tinha aplicado ao rascunho [CHAT-22]
- IF uma ação do LLM cita um widget, uma aba ou um filtro que não existe THEN o sistema SHALL ignorar essa ação, aplicar as demais e informar na resposta o que não foi aplicado [CHAT-23]
- IF uma ação do LLM removeria a última aba do dashboard THEN o sistema SHALL ignorar essa ação e informar na resposta [CHAT-24]
- WHILE o assistente está respondendo o sistema SHALL manter "Pedir à IA" desabilitado em todos os widgets do dashboard [CHAT-25]
- WHEN o usuário usa "Descartar" no dashboard THEN o sistema SHALL manter a conversa guardada e remover o botão "Desfazer" das respostas [CHAT-26]
- IF a conexão do dashboard não tem schema lido THEN o sistema SHALL recusar o pedido com "Leia o schema da conexão antes de usar a IA" [CHAT-27]
- IF a geração inicial falha antes de criar qualquer widget THEN o sistema SHALL manter o dashboard criado, vazio e em modo de edição, com o erro na conversa [GEN-14]
- WHEN o usuário troca de aba do dashboard com o painel aberto THEN o sistema SHALL manter o painel aberto e a conversa na tela [CHAT-30]
- WHEN o usuário sai do dashboard com um pedido em andamento THEN o sistema SHALL parar o pedido [CHAT-28]
- The system SHALL registrar em log cada pedido do chat e da geração com usuário, dashboard, número de ações aplicadas, número de widgets com erro e duração, sem o texto das mensagens [CHAT-29]

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | GEN-10, GEN-12, CHAT-15, CHAT-16, CHAT-07 (lista fechada de ações), CHAT-23, CHAT-24 |
| Failure / partial-failure states | GEN-06, GEN-07, GEN-14, CHAT-21, CHAT-22, CHAT-23 |
| Idempotency / retry / duplicate handling | CHAT-13 (um pedido por vez), CHAT-21 ("Tentar novamente" reenvia a mesma mensagem depois de CHAT-22 desfazer o parcial) |
| Auth boundaries & rate limits | CHAT-17, CHAT-18, HIST-03. Rate limit próprio N/A because os usuários são logados e de confiança em uma instalação self-hosted; GEN-12 limita o custo de um pedido |
| Concurrency / ordering | CHAT-13, CHAT-25, CHAT-28, HIST-02. Duas pessoas com "pode editar" no mesmo dashboard: cada uma tem a própria conversa e o próprio rascunho, e vale a recusa de gravação de `dashboards-consultas` |
| Data lifecycle / expiry | HIST-01, HIST-05, HIST-06. As conversas não expiram |
| Observability | CHAT-29, GEN-08, GEN-07 |
| External-dependency failure | CHAT-21, CHAT-22, GEN-14 (provedor); GEN-06 (Neo4j, por widget) |
| State-transition integrity | CHAT-04 (visualização → edição), CHAT-11, CHAT-14, GEN-09, GEN-13, CHAT-26, HIST-09 |

---

## Requirement Traceability

<!-- TRACE:START -->

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| GEN-01 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-02 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-03 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-04 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-05 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-06 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-07 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-08 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-09 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-10 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-11 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-12 | P1: Gerar o dashboard inteiro | - | Pending |
| GEN-13 | P1: Gerar o dashboard inteiro | - | Pending |
| CHAT-01 | P1: Chat lateral | - | Pending |
| CHAT-02 | P1: Chat lateral | - | Pending |
| CHAT-03 | P1: Chat lateral | - | Pending |
| CHAT-04 | P1: Chat lateral | - | Pending |
| CHAT-05 | P1: Chat lateral | - | Pending |
| CHAT-06 | P1: Chat lateral | - | Pending |
| CHAT-07 | P1: Chat lateral | - | Pending |
| CHAT-08 | P1: Chat lateral | - | Pending |
| CHAT-09 | P1: Chat lateral | - | Pending |
| CHAT-10 | P1: Chat lateral | - | Pending |
| CHAT-11 | P1: Chat lateral | - | Pending |
| CHAT-12 | P1: Chat lateral | - | Pending |
| CHAT-13 | P1: Chat lateral | - | Pending |
| CHAT-14 | P1: Chat lateral | - | Pending |
| CHAT-15 | P1: Chat lateral | - | Pending |
| CHAT-16 | P1: Chat lateral | - | Pending |
| CHAT-17 | P1: Chat lateral | - | Pending |
| CHAT-18 | P1: Chat lateral | - | Pending |
| CHAT-19 | P1: Chat lateral | - | Pending |
| CHAT-20 | P1: Chat lateral | - | Pending |
| HIST-01 | P1: Conversa guardada | - | Pending |
| HIST-02 | P1: Conversa guardada | - | Pending |
| HIST-03 | P1: Conversa guardada | - | Pending |
| HIST-04 | P1: Conversa guardada | - | Pending |
| HIST-05 | P1: Conversa guardada | - | Pending |
| HIST-06 | P1: Conversa guardada | - | Pending |
| HIST-07 | P1: Conversa guardada | - | Pending |
| HIST-08 | P1: Conversa guardada | - | Pending |
| HIST-09 | P1: Conversa guardada | - | Pending |
| CHAT-21 | Edge Cases | - | Pending |
| CHAT-22 | Edge Cases | - | Pending |
| CHAT-23 | Edge Cases | - | Pending |
| CHAT-24 | Edge Cases | - | Pending |
| CHAT-25 | Edge Cases | - | Pending |
| CHAT-26 | Edge Cases | - | Pending |
| CHAT-27 | Edge Cases | - | Pending |
| GEN-14 | Edge Cases | - | Pending |
| CHAT-30 | Edge Cases | - | Pending |
| CHAT-28 | Edge Cases | - | Pending |
| CHAT-29 | Edge Cases | - | Pending |

<!-- TRACE:END -->

**Coverage:** 53 total, 0 mapped to tasks, 53 unmapped ⚠️

---

## Sources

- Decisões do usuário - IA gerando o dashboard inteiro a partir de uma descrição; chat lateral persistente no dashboard e prompt rápido em cada widget; a IA propõe o layout e o usuário ajusta na grade.
- `.specs/STATE.md` - AD-004, AD-005, AD-006, AD-011, AD-014, AD-015.
- Esta feature não tem captura própria: a captura da referência não desenha um chat. O painel usa o tema de `fundacao-auth`, e a composição interna é decisão do builder.

---

## Success Criteria

- [ ] Da descrição ao dashboard salvo sem escrever Cypher, no dataset de exemplo.
- [ ] Um widget com erro nunca impede a criação dos demais.
- [ ] Em nenhum teste o pedido enviado ao provedor contém linha de resultado ou valor de filtro.
