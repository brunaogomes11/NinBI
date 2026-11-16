# Compartilhamento Specification

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Problem Statement

Todo dashboard nasce privado: só o dono e os Admins o abrem. O usuário decidiu que o dono compartilha com pessoas específicas, com equipes criadas pelo Admin (ex.: "Comercial") ou com todos da instalação, escolhendo em cada compartilhamento "pode ver" ou "pode editar". Esta feature entrega as equipes, a tela de compartilhar e a regra de permissão por dashboard que as features seguintes usam.

## Goals

- [ ] O dono compartilha um dashboard com usuários, equipes ou todos, com "Pode ver" ou "Pode editar" em cada linha.
- [ ] Quem recebe encontra o dashboard na própria sidebar; quem perde o acesso deixa de encontrá-lo na sidebar, pela URL e pela API.
- [ ] O Admin cria equipes e define seus membros.
- [ ] Nenhuma rota de dashboard responde a quem não tem a permissão que ela exige.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Link público e embed | Excluídos pelo usuário (AD-007) |
| Transferir a posse de um dashboard | Não foi pedido; o Admin abre e edita qualquer dashboard |
| Permissão por aba, por widget ou por conexão | Não foi pedida; a permissão é por dashboard |
| Aviso por e-mail ou notificação de que algo foi compartilhado | Não foi pedido; não há SMTP |
| Equipes criadas por Editores | O usuário disse: equipes criadas pelo Admin |
| Equipes dentro de equipes | Não foram pedidas |
| Duplicar um dashboard compartilhado | Não foi pedido |
| Multi-tenant | Feature futura (AD-001) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Visibilidade | Privado, com compartilhamento | AD-014; usuário: "Privado, com compartilhamento" | y |
| Com quem compartilhar | Usuários específicos, "todos da instalação" e equipes criadas pelo Admin | AD-014; usuário: "Usuários, todos e equipes" | y |
| Permissão | "Pode ver" ou "Pode editar", escolhida em cada compartilhamento | AD-014; usuário: "Ver ou editar, por pessoa" | y |
| Admin | Abre e edita qualquer dashboard, sem precisar de compartilhamento | AD-015; usuário: "Vê e edita tudo" | y |
| Visualizador | Não cria nada; só vê o que compartilham com ele | AD-015; usuário: "Editor cria; Visualizador só recebe" | y |
| Onde ficam as equipes | Em uma seção "Equipes" da aba "Usuários" de "Configurações" | O usuário definiu três abas (AD-016); equipes são grupos de usuários | y - delegado |
| Mais de um compartilhamento para a mesma pessoa | Vale a permissão mais alta | Evita que entrar em uma equipe tire acesso de alguém | y - delegado |
| "Todos da instalação" | Inclui os usuários criados depois | É o sentido de "todos" | y - delegado |
| Quando o compartilhamento vale | Na hora, sem depender de "Salvar" do dashboard | Compartilhar não é conteúdo do dashboard | y - delegado |
| Excluir uma equipe | Apaga os compartilhamentos feitos com ela, depois de confirmação | Uma equipe que não existe não pode ter acesso | y - delegado |
| O que "pode editar" permite | Alterar nome, conexão, abas, widgets, layout e, nas features seguintes, filtros e IA; não permite excluir nem compartilhar | Recomendação de Q2 | y - delegado |
| Dono desativado | O dashboard e os compartilhamentos continuam valendo | Desativar não apaga trabalho | y - delegado |
| Quem vê a lista de usuários e equipes para compartilhar | Donos e Admins veem nome e e-mail dos usuários ativos e o nome das equipes | Sem isso não há como escolher com quem compartilhar | y - delegado |
| "Pode editar" dado a um Visualizador | A permissão efetiva de um Visualizador é sempre "pode ver" | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |
| Quem compartilha e quem exclui | Só o dono e os Admins; quem tem "Pode editar" altera só o conteúdo | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |
| Chegada do dashboard compartilhado à sidebar | Aparece sozinho na seção fixa "Compartilhados comigo", de onde pode ser arrastado para os grupos da pessoa | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Equipes ⭐ MVP

**User Story**: As a Admin, I want criar equipes como "Comercial" e definir seus membros so that os donos compartilhem com um grupo de pessoas de uma vez.

**Why P1**: Compartilhar com equipes é decisão do usuário (AD-014).

**Acceptance Criteria**:

1. WHEN um Admin abre a aba "Usuários" de "Configurações" THEN o sistema SHALL mostrar a seção "Equipes" com o nome e o número de membros de cada equipe, em ordem alfabética [TEAM-01]
2. WHEN não há equipe THEN o sistema SHALL mostrar "Nenhuma equipe criada" [TEAM-02]
3. WHEN um Admin envia "Nova equipe" com nome e membros THEN o sistema SHALL criar a equipe e mostrá-la na lista [TEAM-03]
4. IF o nome da equipe está vazio, passa de 40 caracteres ou repete o de outra equipe THEN o sistema SHALL recusar com a mensagem no campo "Nome" [TEAM-04]
5. WHEN um Admin adiciona ou remove um membro de uma equipe THEN o sistema SHALL aplicar a mudança aos acessos desse usuário na próxima requisição dele [TEAM-05]
6. WHEN um Admin renomeia uma equipe THEN o sistema SHALL mostrar o novo nome na lista e nos compartilhamentos feitos com ela [TEAM-06]
7. WHEN um Admin usa "Excluir equipe" THEN o sistema SHALL pedir confirmação com "Excluir a equipe <nome>? N dashboards deixarão de estar compartilhados com ela." [TEAM-07]
8. WHEN a exclusão da equipe é confirmada THEN o sistema SHALL apagar a equipe e os compartilhamentos feitos com ela [TEAM-08]
9. IF um Editor ou Visualizador chama a criação, alteração ou exclusão de equipe THEN o sistema SHALL responder 403 [TEAM-09]
10. IF a lista de equipes não carrega THEN o sistema SHALL mostrar "Não foi possível carregar as equipes" com o botão "Tentar novamente" [TEAM-10]

**Independent Test**: Como Admin, criar a equipe "Comercial" com dois membros, renomear, remover um membro e excluir com confirmação.

---

### P1: Compartilhar um dashboard ⭐ MVP

**User Story**: As a dono de um dashboard, I want escolher quem o vê e quem o edita so that ele deixe de ser privado só para quem eu quiser.

**Why P1**: É o que tira o dashboard do privado (AD-014).

**Acceptance Criteria**:

1. The system SHALL mostrar "Compartilhar" no dashboard só para o dono e para Admins [SHARE-01]
2. WHEN o dono ou um Admin usa "Compartilhar" THEN o sistema SHALL abrir a tela de compartilhamento com o nome do dono e a lista de quem tem acesso, cada linha com "Pode ver" ou "Pode editar" [SHARE-02]
3. WHEN o dashboard não tem compartilhamentos THEN o sistema SHALL mostrar "Só você vê este dashboard" [SHARE-03]
4. WHEN o usuário digita no campo de busca da tela THEN o sistema SHALL listar os usuários ativos cujo nome ou e-mail contém o texto, as equipes cujo nome contém o texto e a opção "Todos da instalação" [SHARE-04]
5. WHEN a busca não encontra nada THEN o sistema SHALL mostrar "Nenhum usuário ou equipe encontrado" [SHARE-05]
6. WHEN o usuário adiciona um usuário, uma equipe ou "Todos da instalação" com "Pode ver" ou "Pode editar" THEN o sistema SHALL gravar o compartilhamento na hora e mostrá-lo na lista [SHARE-06]
7. WHEN o usuário muda a permissão de uma linha THEN o sistema SHALL aplicar a nova permissão na próxima requisição de quem a recebe [SHARE-07]
8. WHEN o usuário usa "Remover" em uma linha THEN o sistema SHALL apagar o compartilhamento e tirar o acesso na próxima requisição de quem o tinha [SHARE-08]
9. IF o destinatário escolhido já está na lista THEN o sistema SHALL atualizar a permissão da linha existente, sem criar outra [SHARE-09]
10. WHEN o destinatário é um usuário com papel Visualizador THEN o sistema SHALL oferecer para ele apenas "Pode ver" [SHARE-10]
11. The system SHALL deixar o dono do dashboard fora dos resultados da busca [SHARE-11]
12. IF um usuário que não é o dono nem Admin chama a leitura ou a alteração dos compartilhamentos THEN o sistema SHALL responder 403 [SHARE-12]
13. WHILE a tela de compartilhamento carrega o sistema SHALL mostrar linhas de esqueleto [SHARE-13]
14. IF a tela de compartilhamento não carrega ou uma alteração falha THEN o sistema SHALL manter a lista como estava e mostrar "Não foi possível atualizar o compartilhamento" com "Tentar novamente" [SHARE-14]
15. WHILE a lista de compartilhamentos passa da altura da tela o sistema SHALL rolar a lista, com o campo de busca fixo [SHARE-15]

**Independent Test**: Como Editor A, compartilhar um dashboard com o Editor B ("Pode editar"), com a equipe "Comercial" ("Pode ver") e depois remover B; conferir o acesso de cada um.

---

### P1: Acesso de quem recebe ⭐ MVP

**User Story**: As a usuário que recebeu um dashboard, I want encontrá-lo na minha sidebar e usá-lo conforme a permissão que me deram so that eu veja ou edite o que compartilharam comigo.

**Why P1**: Sem isso o compartilhamento não tem efeito.

**Acceptance Criteria**:

1. The system SHALL calcular a permissão de um usuário em um dashboard como a mais alta entre: dono ou Admin (editar), compartilhamento direto, compartilhamentos com equipes de que ele é membro e "Todos da instalação" [ACL-01]
2. The system SHALL limitar a "pode ver" a permissão efetiva de um usuário com papel Visualizador [ACL-02]
3. The system SHALL verificar no backend a permissão do usuário no dashboard em toda rota de dashboard, aba, widget e execução de consulta [ACL-03]
4. WHEN um dashboard é compartilhado com um usuário THEN o sistema SHALL mostrá-lo na sidebar dele, na seção "Compartilhados comigo", na próxima vez que a sidebar carregar [ACL-04]
5. WHEN o usuário arrasta um dashboard de "Compartilhados comigo" para um grupo ou posição da sidebar THEN o sistema SHALL mantê-lo ali, como parte da organização desse usuário [ACL-05]
6. WHEN um usuário com "pode ver" abre o dashboard THEN o sistema SHALL mostrá-lo em modo de visualização, sem "Editar", "Excluir" nem "Compartilhar" [ACL-06]
7. WHEN um usuário com "pode editar" abre o dashboard THEN o sistema SHALL mostrar "Editar", sem "Excluir" nem "Compartilhar" [ACL-07]
8. WHEN um usuário que não é o dono abre o dashboard THEN o sistema SHALL mostrar "Compartilhado por <nome do dono>" junto ao nome do dashboard [ACL-08]
9. WHEN um usuário perde o acesso a um dashboard THEN o sistema SHALL retirá-lo da sidebar e dos grupos desse usuário [ACL-09]
10. WHEN "Compartilhados comigo" não tem nenhum dashboard THEN o sistema SHALL não mostrar a seção [ACL-10]
11. The system SHALL registrar em log cada criação, mudança e remoção de compartilhamento com quem fez, o dashboard, o destinatário e a permissão [ACL-11]

**Independent Test**: Como Editor B, ver o dashboard de A em "Compartilhados comigo", arrastá-lo para um grupo, editá-lo e salvar; como Visualizador da equipe "Comercial", vê-lo sem "Editar"; depois de A remover B, o dashboard some da sidebar de B e a URL responde "Dashboard não encontrado".

---

## Edge Cases

- IF o acesso de um usuário é removido enquanto ele está com o dashboard aberto THEN o sistema SHALL mostrar "Dashboard não encontrado" na próxima ação dele [ACL-12]
- IF a permissão de um usuário cai para "pode ver" enquanto ele edita THEN o sistema SHALL recusar a gravação com "Você não tem mais permissão para editar este dashboard" [ACL-13]
- WHEN um usuário tem "Pode ver" direto e "Pode editar" por uma equipe THEN o sistema SHALL tratá-lo com "pode editar" [ACL-14]
- WHEN um usuário é criado depois de um compartilhamento com "Todos da instalação" THEN o sistema SHALL dar a ele o acesso desse compartilhamento [ACL-15]
- WHEN o dono de um dashboard é desativado THEN o sistema SHALL manter o dashboard e os compartilhamentos dele [ACL-16]
- WHEN um usuário desativado está em um compartilhamento THEN o sistema SHALL manter a linha na lista, marcada como "Desativado" [SHARE-16]
- IF dois envios adicionam o mesmo destinatário ao mesmo tempo THEN o sistema SHALL manter uma única linha, com a permissão do último envio [SHARE-17]
- WHEN duas pessoas com "pode editar" salvam o mesmo dashboard THEN o sistema SHALL aplicar a recusa de gravação desatualizada de `dashboards-consultas` [ACL-17]
- IF um dashboard é excluído THEN o sistema SHALL apagar os compartilhamentos dele [SHARE-18]

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | TEAM-04, SHARE-09, SHARE-10, SHARE-11 |
| Failure / partial-failure states | TEAM-10, SHARE-14 |
| Idempotency / retry / duplicate handling | SHARE-09, SHARE-17, TEAM-04 |
| Auth boundaries & rate limits | ACL-01 a ACL-03, SHARE-01, SHARE-12, TEAM-09. Rate limit N/A because só usuários logados de uma instalação self-hosted alcançam estas rotas, e nenhuma delas dispara consulta ao Neo4j |
| Concurrency / ordering | SHARE-17, ACL-12, ACL-13, ACL-17 |
| Data lifecycle / expiry | TEAM-08, SHARE-18, ACL-09, ACL-16. Compartilhamentos não expiram |
| Observability | ACL-11 |
| External-dependency failure | N/A because esta feature só lê e grava no PostgreSQL, cuja falha é SHARE-14 e TEAM-10; não fala com Neo4j nem com o provedor de LLM |
| State-transition integrity | SHARE-06 a SHARE-08 (privado ↔ compartilhado; ver ↔ editar), ACL-12, ACL-13 |

---

## Requirement Traceability

<!-- TRACE:START -->

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TEAM-01 | P1: Equipes | - | Pending |
| TEAM-02 | P1: Equipes | - | Pending |
| TEAM-03 | P1: Equipes | - | Pending |
| TEAM-04 | P1: Equipes | - | Pending |
| TEAM-05 | P1: Equipes | - | Pending |
| TEAM-06 | P1: Equipes | - | Pending |
| TEAM-07 | P1: Equipes | - | Pending |
| TEAM-08 | P1: Equipes | - | Pending |
| TEAM-09 | P1: Equipes | - | Pending |
| TEAM-10 | P1: Equipes | - | Pending |
| SHARE-01 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-02 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-03 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-04 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-05 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-06 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-07 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-08 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-09 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-10 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-11 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-12 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-13 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-14 | P1: Compartilhar um dashboard | - | Pending |
| SHARE-15 | P1: Compartilhar um dashboard | - | Pending |
| ACL-01 | P1: Acesso de quem recebe | - | Pending |
| ACL-02 | P1: Acesso de quem recebe | - | Pending |
| ACL-03 | P1: Acesso de quem recebe | - | Pending |
| ACL-04 | P1: Acesso de quem recebe | - | Pending |
| ACL-05 | P1: Acesso de quem recebe | - | Pending |
| ACL-06 | P1: Acesso de quem recebe | - | Pending |
| ACL-07 | P1: Acesso de quem recebe | - | Pending |
| ACL-08 | P1: Acesso de quem recebe | - | Pending |
| ACL-09 | P1: Acesso de quem recebe | - | Pending |
| ACL-10 | P1: Acesso de quem recebe | - | Pending |
| ACL-11 | P1: Acesso de quem recebe | - | Pending |
| ACL-12 | Edge Cases | - | Pending |
| ACL-13 | Edge Cases | - | Pending |
| ACL-14 | Edge Cases | - | Pending |
| ACL-15 | Edge Cases | - | Pending |
| ACL-16 | Edge Cases | - | Pending |
| SHARE-16 | Edge Cases | - | Pending |
| SHARE-17 | Edge Cases | - | Pending |
| ACL-17 | Edge Cases | - | Pending |
| SHARE-18 | Edge Cases | - | Pending |

<!-- TRACE:END -->

**Coverage:** 45 total, 0 mapped to tasks, 45 unmapped ⚠️

---

## Sources

- Respostas do usuário - visibilidade "Privado, com compartilhamento"; compartilhar com "Usuários, todos e equipes"; permissão "Ver ou editar, por pessoa"; papéis "Editor cria; Visualizador só recebe"; Admin "Vê e edita tudo".
- `.specs/STATE.md` - AD-013, AD-014, AD-015, AD-016.
- Esta feature não tem captura própria: as telas usam o shell e os tokens de `fundacao-auth`, e a composição interna é decisão do builder.

---

## Success Criteria

- [ ] Um dashboard recém-criado não aparece para ninguém além do dono e dos Admins.
- [ ] Depois de remover um compartilhamento, a pessoa não alcança mais o dashboard por nenhum caminho.
- [ ] Compartilhar com uma equipe de 10 pessoas é uma ação só.
