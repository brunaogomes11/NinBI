# Compartilhamento Tasks

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas (screens sub-agent, imagens `*.running.png`, walk) está dispensada por AD-023: nenhuma task captura tela.

Pré-requisito: `fundacao-auth`, `conexoes-schema` e `dashboards-consultas` concluídas (harness `createTestApp` com `neo4j` e `shares`, `FakeNeo4jGateway`, harness de integração, `DashboardAccessService` com `DASHBOARD_SHARE_RESOLVER` e `NoSharesResolver`, `DashboardsService`, `SidebarService`, `QueriesController`, tabelas `dashboards` e `sidebar_layouts`, `UsersTab`, `useUsers`, `renderApp`, `DashboardPage`, `useDashboardEditor`, `SidebarDashboards`, `layout.ts`, `useSaveSidebar`, fixtures de dashboards).

---

**Design**: `.specs/features/compartilhamento/design.md`
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run contracts**: `pnpm --filter @ninbi/contracts test`
**Run api**: `pnpm --filter @ninbi/api test`
**Run apiint**: `pnpm infra:up && pnpm --filter @ninbi/api test:int`
**Run web**: `pnpm --filter @ninbi/web test`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo script `test` e `test:int` roda `vitest run --reporter=verbose`. Todo nome de teste começa com o ID do requisito e contém, na ordem, as palavras da linha de `Proof` da sua check (sem o `✓`). Se o runner imprimir outro marcador de sucesso, a linha da check é corrigida a partir da saída real, nunca o teste.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012 (testes unitários das partes críticas, incluindo permissões), AD-026 (testes rápidos com PGlite; integração contra o `docker-compose.dev.yml`), e as matrizes aprovadas em `.specs/features/fundacao-auth/tasks.md` e `.specs/features/dashboards-consultas/tasks.md`. Strong defaults applied onde não há guia.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contratos (schemas zod, opções de permissão, mensagens) | unit | Toda regra de campo com o texto exato da mensagem; casos válidos no limite | `packages/contracts/src/**/*.spec.ts` | `pnpm --filter @ninbi/contracts test` |
| Banco (schema Drizzle, migração) | integration (PGlite) | Migração aplica; cascatas; índices únicos; check do destinatário | `apps/api/test/database/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: resolver, acesso, services e rotas | integration (supertest + PGlite, `DbShareResolver` real) | Toda rota: sucesso + cada erro da tabela de erros do design + 403/404 por papel e alcance; 1:1 com os ACs de permissão | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: corridas | integration (PostgreSQL do `docker-compose.dev.yml`) | SHARE-17 com envios simultâneos | `apps/api/test-int/**/*.int.spec.ts` | `pnpm infra:up && pnpm --filter @ninbi/api test:int` |
| Web: funções puras (sidebar) | unit | Todos os ramos tocados; 1:1 com os ACs | `apps/web/src/features/**/*.test.ts` | `pnpm --filter @ninbi/web test` |
| Web: componentes e páginas | unit (Testing Library + jsdom + user-event + MSW) | Gesto do critério + o que a tela mostra; toda mensagem da spec com o texto exato | `apps/web/src/**/*.test.tsx` | `pnpm --filter @ninbi/web test` |

## Gate Check Commands

> Generated from the design - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task com testes de um só pacote | `pnpm --filter <pacote da task> test` (`@ninbi/contracts`, `@ninbi/api` ou `@ninbi/web`) |
| Full | Task com teste de integração real | `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int` |
| Build | Última task de cada fase | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

`pnpm test` na raiz é `pnpm -r test`.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Lotes de execução

| Lote | Fases | Tasks | Modelo |
| ---- | ----- | ----- | ------ |
| 1 | Phase 1 - Contratos, banco e equipes na API; Phase 2 - Permissão e compartilhamentos na API | T1-T7 (7) | sonnet |
| 2 | Phase 3 - Sidebar e provas de acesso na API; Phase 4 - Equipes no web | T8-T12 (5) | sonnet |
| 3 | Phase 5 - Compartilhar no web | T13-T16 (4) | sonnet |

Todas as tasks têm testes, por isso todos os lotes são `sonnet`.

### Phase 1: Contratos, banco e equipes na API

```
T1 → T3
T2 → T3
```

### Phase 2: Permissão e compartilhamentos na API

```
T4 → T5 → T6 → T7
```

### Phase 3: Sidebar e provas de acesso na API

As duas tasks são independentes entre si.

```
T8
T9
```

### Phase 4: Equipes no web

```
T10 → T11
T10 → T12
```

### Phase 5: Compartilhar no web

```
T13 → T14 → T15
T16
```

---

## Task Breakdown

### Phase 1 tasks: Contratos, banco e equipes na API

### T1: Definir os contratos de equipes e compartilhamentos

**What**: `packages/contracts/src/sharing.ts` com `SharePermission`, `SHARE_PERMISSION_LABELS` (`view` "Pode ver", `edit` "Pode editar"), `shareOptionsFor` (Visualizador só `['view']`), `teamCreateSchema` (nome `trim` 1 a 40; `memberIds` UUIDs sem repetição), `teamUpdateSchema` (ao menos `name` ou `memberIds`), `shareUpsertSchema` (destinatário discriminado por `type`: `USER` com `userId`, `TEAM` com `teamId`, `EVERYONE`), `shareUpdateSchema`, e os tipos `ShareRecipientDto`, `ShareDto`, `DashboardSharesDto`, `ShareCandidatesDto`, `TeamMemberDto`, `TeamDto`, conforme "Data Models" do design; acréscimos em `MESSAGES` (tabela "Validação e mensagens" e textos de tela do design, com `teamDeleteConfirm(nome, n)` e `sharedBy(nome)`) e em `ERROR_CODES` (`TEAM_NOT_FOUND`, `SHARE_NOT_FOUND`, `DASHBOARD_EDIT_FORBIDDEN`). Exportar em `src/index.ts`.
**Where**: `packages/contracts/src/sharing.ts`
**Depends on**: None
**Reuses**: `zod`, `MESSAGES`, `ERROR_CODES`, `Role`, padrão de `trim` de `dashboards.ts`
**Requirement**: TEAM-04, TEAM-07, SHARE-10

**Done when**:

- [x] Testes em `packages/contracts/src/sharing.spec.ts`: `TEAM-04 nome da equipe vazio ou com mais de 40 caracteres` (vazio e só espaços dão "Informe o nome"; 41 caracteres dão "O nome pode ter até 40 caracteres"; 40 passa), `SHARE-10 Visualizador só recebe Pode ver nas opções` (`shareOptionsFor` de usuário `VIEWER` é `['view']`; de `EDITOR`, `ADMIN`, equipe e todos é `['view', 'edit']`), `MESSAGES.teamDeleteConfirm('Comercial', 3)` é "Excluir a equipe Comercial? 3 dashboards deixarão de estar compartilhados com ela.", `MESSAGES.sharedBy('Ana Souza')` é "Compartilhado por Ana Souza", `shareUpsertSchema` recusa `type` desconhecido e `USER` sem `userId`, `teamUpdateSchema` vazio é recusado, `memberIds` repetidos são recusados
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add team and dashboard sharing contracts`

---

### T2: Criar as tabelas de equipes, membros e compartilhamentos

**What**: Em `apps/api/src/database/schema.ts`, os enums `share_recipient_type` e `share_permission` e as tabelas `teams` (índice único `teams_name_lower_uq` em `lower(name)`), `team_members` (chave primária `(team_id, user_id)`, cascatas) e `dashboard_shares` (cascata em `dashboard_id`, `user_id` e `team_id`; índice único `(dashboard_id, recipient_key)`; índices em `user_id` e `team_id`; check da coerência entre `recipient_type`, `user_id` e `team_id`) conforme "Data Models" do design; migração gerada com `drizzle-kit generate` em `apps/api/drizzle/`.
**Where**: `apps/api/src/database/schema.ts` (modify)
**Depends on**: None
**Reuses**: `createTestDb()`, testes de schema de `dashboards-consultas`
**Requirement**: SHARE-09, SHARE-18, TEAM-04, TEAM-08

**Done when**:

- [x] Testes em `apps/api/test/database/sharing-schema.spec.ts`: migrações aplicam no PGlite; `SHARE-18 apagar o dashboard apaga os compartilhamentos dele`; `TEAM-08 apagar a equipe apaga os compartilhamentos feitos com ela` (e as linhas de `team_members`); `SHARE-09 índice único impede duas linhas para o mesmo destinatário` (segundo `INSERT` com o mesmo `dashboard_id` e `recipient_key` viola o índice); `TEAM-04 índice único recusa nome de equipe repetido sem diferenciar maiúsculas` ("Comercial" e "comercial"); linha `USER` sem `user_id` e linha `EVERYONE` com `team_id` violam o check
- [x] `drizzle-kit generate` não gera diferença depois do commit
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add team, team member and dashboard share tables`

---

### T3: Criar, listar, alterar e excluir equipes na API

**What**: `TeamsService` e `TeamsController` (`@RequirePermission('users.manage')`): `GET /api/teams` (`TeamDto[]` com `memberCount`, `members` em ordem de nome e `shareCount`, em `localeCompare('pt-BR', { sensitivity: 'base' })`), `POST /api/teams` (201), `PATCH /api/teams/:id` (`memberIds` troca a lista inteira; `name` renomeia; 404 `TEAM_NOT_FOUND`) e `DELETE /api/teams/:id` (204; log `team deleted by=<id> team=<id> shares=<n>` em `Logger('Team')`). Nome repetido sem diferenciar maiúsculas, inclusive pela violação de `teams_name_lower_uq`, e membro inexistente respondem 400 `VALIDATION_ERROR` no campo. `TeamsModule` registrado em `AppModule`.
**Where**: `apps/api/src/teams/teams.controller.ts`
**Depends on**: T1, T2
**Reuses**: `@RequirePermission`, `ZodValidationPipe`, `AppError`, `teamCreateSchema`, `teamUpdateSchema`, `createTestApp`
**Requirement**: TEAM-01, TEAM-03, TEAM-04, TEAM-06, TEAM-07, TEAM-08, TEAM-09

**Done when**:

- [x] Testes em `apps/api/test/teams/teams.spec.ts`: `TEAM-01 lista equipes com nome e número de membros em ordem alfabética` ("zeta", "Ágil", "beta" voltam "Ágil", "beta", "zeta" com `memberCount` certo), `TEAM-03 cria a equipe com nome e membros` (201; o `GET` traz "Comercial" com os dois membros), `TEAM-04 nome vazio, longo ou repetido responde 400 no campo nome` (vazio, 41 caracteres e "comercial" com "Comercial" já criada, cada um com a mensagem em `fieldErrors.name`; membro com UUID inexistente dá "Usuário não encontrado" em `fieldErrors.memberIds`), `TEAM-06 renomear a equipe muda o nome na lista`, `TEAM-07 equipe informa quantos dashboards estão compartilhados com ela` (equipe com compartilhamentos inseridos em dois dashboards tem `shareCount: 2`), `TEAM-08 excluir a equipe apaga a equipe e os compartilhamentos dela` (204; some do `GET`; nenhuma linha de `dashboard_shares` dela sobra), `TEAM-09 Editor e Visualizador recebem 403 nas rotas de equipe` (as quatro rotas), `PATCH` com `memberIds` troca a lista inteira, equipe inexistente dá 404
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): manage teams and their members`

---

### Phase 2 tasks: Permissão e compartilhamentos na API

### T4: Calcular a permissão pelos compartilhamentos

**What**: `DbShareResolver` (`accessFor`, `sharedDashboardIds`) com o predicado do design (direto, equipes do usuário e `EVERYONE`; maior permissão; compartilhados sem os próprios, em ordem de criação do dashboard). O `DashboardAccessModule` passa a prover `DASHBOARD_SHARE_RESOLVER` com `DbShareResolver`; `NoSharesResolver` é apagado. `createTestApp({ shares })` continua sobrescrevendo o token.
**Where**: `apps/api/src/sharing/db-share-resolver.ts`
**Depends on**: T2
**Reuses**: `DashboardShareResolver`, `DASHBOARD_SHARE_RESOLVER`, `createTestApp`
**Requirement**: ACL-01, ACL-14, ACL-15

**Done when**:

- [x] Testes em `apps/api/test/sharing/db-share-resolver.spec.ts` (linhas inseridas direto no banco; o resolver vem do app sem a opção `shares`): `ACL-01 permissão é a mais alta entre direto, equipes e todos` (só direto `view` dá `view`; só pela equipe `edit` dá `edit`; só `EVERYONE` `view` dá `view`; nenhuma linha dá `null`; compartilhamento com equipe de que o usuário não é membro dá `null`), `ACL-14 Pode ver direto e Pode editar pela equipe dá editar`, `ACL-15 usuário criado depois do compartilhamento com todos tem acesso`, `sharedDashboardIds` devolve os compartilhados por qualquer caminho, sem repetição, sem os próprios, em ordem de criação
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): resolve dashboard access from user, team and everyone shares`

---

### T5: Limitar o Visualizador e exigir dono ou Admin para compartilhar

**What**: Em `DashboardAccessService`: papel `VIEWER` nunca tem `canEdit` (ACL-02); `DashboardAccess` ganha `canShare` (dono ou `dashboards.all`) e `assert` aceita `'share'`; falta de `'edit'` responde 403 `DASHBOARD_EDIT_FORBIDDEN` com "Você não tem mais permissão para editar este dashboard". Em `@ninbi/contracts`, `DashboardDto.permissions` ganha `share`, e `DashboardsService` o preenche com `canShare`. Atualiza, conforme AD-048, o teste DASH-18 de `dashboards-consultas` para a nova expectativa (`share` verdadeiro só para dono e Admin), sem afrouxar as asserções existentes.
**Where**: `apps/api/src/dashboard-access/dashboard-access.service.ts` (modify)
**Depends on**: T4
**Reuses**: `DbShareResolver`, `can()`, `AppError`, `MESSAGES`
**Requirement**: ACL-02, ACL-13, SHARE-01

**Done when**:

- [x] Testes em `apps/api/test/sharing/dashboard-access.spec.ts`: `ACL-02 Visualizador com compartilhamento de edição só vê` (`GET` dá 200 com `permissions.edit` falso; `PUT` dá 403), `SHARE-01 só o dono e os Admins têm permissão de compartilhar` (`permissions.share` verdadeiro para dono e Admin; falso para compartilhamento `edit` e `view`), `ACL-13 gravar sem permissão de edição responde Você não tem mais permissão` (compartilhamento `edit` rebaixado para `view` direto no banco: o `PUT` responde 403 `DASHBOARD_EDIT_FORBIDDEN` com a mensagem e o dashboard não muda), `assert('share')` para compartilhamento `edit` lança 403 `FORBIDDEN`
- [x] Teste DASH-18 de `dashboards-consultas` atualizado e verde
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): cap viewers at view access and add share permission`

---

### T6: Ler e alterar os compartilhamentos de um dashboard

**What**: `SharesService` e `SharesController` com `GET`, `POST` (upsert por `recipient_key` com `ON CONFLICT DO UPDATE ... RETURNING (xmax = 0) AS inserted`), `PATCH` e `DELETE` em `/api/dashboards/:id/shares`, todas depois de `assert(user, id, 'share')`; recusas do destinatário (inexistente ou desativado, equipe inexistente, dono, Visualizador com `edit`, inclusive no `PATCH`) em 400 `VALIDATION_ERROR` com `fieldErrors.recipient`; `SHARE_NOT_FOUND`; toda resposta é o `DashboardSharesDto` inteiro, na ordem do design ("Todos da instalação", equipes, usuários), com `disabled` nos usuários desativados; log `share action=... by=... dashboard=... recipient=... permission=...` em `Logger('Share')`. `SharingModule` registrado em `AppModule`.
**Where**: `apps/api/src/sharing/shares.controller.ts`
**Depends on**: T5, T1
**Reuses**: `DashboardAccessService`, `shareUpsertSchema`, `shareUpdateSchema`, `ZodValidationPipe`, harness de integração, captura de log de `http-logging.spec.ts`
**Requirement**: SHARE-02, SHARE-06, SHARE-07, SHARE-08, SHARE-09, SHARE-10, SHARE-12, SHARE-16, SHARE-17, TEAM-06, ACL-11

**Done when**:

- [x] Testes em `apps/api/test/sharing/shares.spec.ts`: `SHARE-02 lista de compartilhamentos traz o dono e cada destinatário com a permissão` (`ownerName` e as linhas de todos, equipe e usuário nessa ordem, com `permission`), `SHARE-06 adicionar usuário, equipe e todos grava o compartilhamento na hora` (cada `POST` devolve a lista com a linha nova; o destinatário abre o dashboard em seguida com 200), `SHARE-07 mudar a permissão vale na próxima requisição de quem recebe` (`PATCH` de `edit` para `view`: o `PUT` seguinte do destinatário recebe 403), `SHARE-08 remover o compartilhamento tira o acesso na próxima requisição` (depois do `DELETE`, o `GET` do dashboard pelo destinatário dá 404), `SHARE-09 destinatário repetido atualiza a linha existente` (dois `POST` do mesmo usuário, `view` e depois `edit`: uma linha só, com `edit`), `SHARE-10 Visualizador com Pode editar responde 400` (no `POST` e no `PATCH`, com "Visualizadores só podem receber Pode ver"), `SHARE-12 quem não é dono nem Admin recebe 403 nos compartilhamentos` (compartilhamento `edit` recebe 403 no `GET`, `POST`, `PATCH` e `DELETE`; quem não alcança recebe 404; Admin recebe 200), `SHARE-16 usuário desativado continua na lista marcado como desativado` (`recipient.disabled: true`), `TEAM-06 compartilhamento mostra o nome novo da equipe` (renomear a equipe pela rota de equipes muda o nome na lista do dashboard), `ACL-11 log registra criação, mudança e remoção com autor, dashboard, destinatário e permissão` (três linhas `action=created`, `action=updated` e `action=removed` com `by=`, `dashboard=`, `recipient=user:<id>` e `permission=`), o dono como destinatário e um usuário desativado como destinatário dão 400, `SHARE_NOT_FOUND` no `PATCH` e no `DELETE` de id inexistente
- [x] Teste de integração `apps/api/test-int/sharing.int.spec.ts`: `SHARE-17 dois envios simultâneos do mesmo destinatário deixam uma linha` (dois `POST` ao mesmo tempo, `view` e `edit`: os dois respondem 200, o banco tem uma linha, e a permissão dela é a da resposta que chegou por último)
- [x] Gate check passes: `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `feat(api): read, add, change and remove dashboard shares with audit log`

---

### T7: Buscar usuários e equipes para compartilhar

**What**: `ShareCandidatesService` e a rota `GET /api/dashboards/:id/share-candidates?q=` no `SharesController` (`assert('share')`): usuários ativos, sem o dono, com `name` ou `email` `ILIKE %q%`; equipes com `name ILIKE %q%`; `%`, `_` e `\` escapados; cada lista em ordem de nome, até 20; `everyone: true` sempre; `q` vazio devolve os 20 primeiros de cada lista.
**Where**: `apps/api/src/sharing/share-candidates.service.ts`
**Depends on**: T6
**Reuses**: `SharesController`, `DashboardAccessService`
**Requirement**: SHARE-04, SHARE-05, SHARE-11

**Done when**:

- [x] Testes em `apps/api/test/sharing/share-candidates.spec.ts`: `SHARE-04 busca lista usuários ativos por nome ou e-mail, equipes e Todos da instalação` (`q=ana` acha "Ana Souza" pelo nome e "Bruno" pelo e-mail `bruno.ana@x.com`, sem diferenciar maiúsculas; não traz o usuário desativado "Ana Lima"; traz a equipe "Banana"; `everyone: true`), `SHARE-05 busca sem resultado devolve listas vazias` (`q=zzz`: `users` e `teams` vazios), `SHARE-11 dono fica fora da busca` (o nome do dono casa com `q` e não volta; um Admin que busca no dashboard de outro também não vê o dono), `q=%` não casa com tudo, mais de 20 usuários devolvem 20, compartilhamento `edit` recebe 403
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): search active users and teams to share a dashboard with`

---

### Phase 3 tasks: Sidebar e provas de acesso na API

### T8: Separar os compartilhados em "Compartilhados comigo" na sidebar

**What**: Em `SidebarService.get`: `SidebarDto` ganha `shared` (dashboards de `sharedDashboardIds` que não estão no documento do usuário, em ordem de criação); os próprios que faltam continuam no fim, soltos; ids que o usuário não alcança mais saem do documento gravado, que é regravado quando algum saiu. Em `@ninbi/contracts`, `SidebarDto.shared`. Atualiza, conforme AD-051, o teste DASH-01 de `dashboards-consultas` (o compartilhado fora do layout passa a vir em `shared`, não no fim de `items`), sem afrouxar as demais asserções.
**Where**: `apps/api/src/sidebar/sidebar.service.ts` (modify)
**Depends on**: T5
**Reuses**: `DashboardAccessService.sidebarDashboardIds`, `DbShareResolver`, testes de sidebar de `dashboards-consultas`
**Requirement**: ACL-04, ACL-05, ACL-09, ACL-10

**Done when**:

- [x] Testes em `apps/api/test/sharing/sidebar-shared.spec.ts` (compartilhamentos pela rota de T6): `ACL-04 dashboard compartilhado aparece em Compartilhados comigo` (vem em `shared` com o nome atual e não em `items`), `ACL-05 compartilhado gravado na sidebar sai de Compartilhados comigo` (`PUT /api/sidebar` com ele dentro do grupo "Comercial": o `GET` o traz no grupo e `shared` vazio), `ACL-09 acesso perdido tira o dashboard da sidebar e dos grupos` (depois do `DELETE` do compartilhamento, some do grupo e de `shared`; compartilhar de novo o põe em `shared`, não no grupo antigo), `ACL-10 sem compartilhados a seção vem vazia` (`shared: []`); dashboards próprios novos continuam no fim de `items`
- [x] Teste DASH-01 de `dashboards-consultas` atualizado e verde
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): list unsorted shared dashboards under shared with me`

---

### T9: Provar a permissão por dashboard em todas as rotas

**What**: Testes de rota em `apps/api/test/sharing/acl-routes.spec.ts` com o `DbShareResolver` real, o `FakeNeo4jGateway` e compartilhamentos criados pela rota de T6, cobrindo as rotas de dashboard, aba, widget, execução e compartilhamento. Ajustes de código que esses testes revelarem entram nesta task.
**Where**: `apps/api/test/sharing/acl-routes.spec.ts`
**Depends on**: T6
**Reuses**: `createTestApp` com `neo4j`, `FakeNeo4jGateway`, rotas de `dashboards-consultas` e de T3 e T6
**Requirement**: ACL-03, ACL-06, ACL-07, ACL-12, ACL-16, ACL-17, TEAM-05

**Done when**:

- [x] Testes: `ACL-03 toda rota de dashboard verifica a permissão no dashboard` (tabela de rotas: `GET`, `PUT` e `DELETE` do dashboard, `.../query`, `.../widgets/:wid/run`, `.../shares` e `.../share-candidates`; quem não alcança recebe 404 em todas; compartilhamento `view` recebe 200 no `GET` e no `run` e 403 em `PUT`, `DELETE`, `query`, `shares` e `share-candidates`), `ACL-06 quem pode ver recebe permissões sem editar, excluir nem compartilhar`, `ACL-07 quem pode editar recebe editar sem excluir nem compartilhar` (o `PUT` dele dá 200 e o `DELETE`, 403), `ACL-12 acesso removido responde Dashboard não encontrado na próxima ação` (depois do `DELETE` do compartilhamento, `run`, `PUT` e `GET` do destinatário dão 404 com "Dashboard não encontrado"), `ACL-16 dono desativado mantém o dashboard e os compartilhamentos` (depois de desativar o dono, o destinatário abre o dashboard e o Admin vê a mesma lista de compartilhamentos), `ACL-17 dois editores salvando a mesma versão recebem 409 no segundo` (dois usuários com `edit` enviam `PUT` com `version: 1`: 200 e 409 `DASHBOARD_VERSION_CONFLICT`), `TEAM-05 remover membro da equipe tira o acesso na próxima requisição` (membro da equipe com `view` abre com 200; depois do `PATCH` da equipe sem ele, recebe 404; adicioná-lo de novo devolve o acesso)
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `test(api): prove per-dashboard permissions on every dashboard route`

---

### Phase 4 tasks: Equipes no web

### T10: Listar as equipes na aba "Usuários"

**What**: `src/features/teams/api.ts` (`useTeams`, `useCreateTeam`, `useUpdateTeam`, `useDeleteTeam`); `TeamsSection` dentro de `UsersTab`, abaixo da tabela de usuários: título "Equipes", botão "Nova equipe" (ainda sem ação), tabela "Nome" e "Membros" na ordem da API, esqueleto, "Nenhuma equipe criada", erro "Não foi possível carregar as equipes" com "Tentar novamente", menu da linha com "Editar equipe" e "Excluir equipe" (ainda sem ação). Handler MSW padrão de `GET /api/teams` devolvendo `[]` em `src/test/server.ts` e fixtures de `TeamDto`.
**Where**: `apps/web/src/features/teams/TeamsSection.tsx`
**Depends on**: T3, T1
**Reuses**: `UsersTab`, padrão de esqueleto e erro de `UsersTab`, shadcn `table`, `skeleton`, `dropdown-menu`, `renderApp`
**Requirement**: TEAM-01, TEAM-02, TEAM-10

**Done when**:

- [x] Testes com gesto em `TeamsSection.test.tsx` (Admin abre "Configurações" › "Usuários"): `TEAM-01 seção Equipes mostra nome e número de membros na ordem da API`, `TEAM-02 sem equipes mostra Nenhuma equipe criada`, `TEAM-10 erro nas equipes mostra Não foi possível carregar as equipes e Tentar novamente recarrega` (500 e depois 200: clicar em "Tentar novamente" mostra a lista)
- [x] Testes de `UsersTab` de `fundacao-auth` continuam verdes
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): list teams in the users settings tab`

---

### T11: Criar e editar equipes

**What**: `TeamDialog` aberto por "Nova equipe" e por "Editar equipe": campo "Nome" (`teamCreateSchema`), lista de usuários ativos de `useUsers` com caixa de seleção (membros atuais marcados ao editar), `fieldErrors.name` da API no campo, "Salvar" desabilitado durante o envio; criar chama `POST /api/teams`, editar chama `PATCH` com `name` e `memberIds`; sucesso fecha o diálogo e atualiza a lista.
**Where**: `apps/web/src/features/teams/TeamDialog.tsx`
**Depends on**: T10
**Reuses**: `NewUserDialog` (padrão), `useUsers`, shadcn `dialog`, `form`, `input`, `checkbox`
**Requirement**: TEAM-03, TEAM-04, TEAM-05, TEAM-06

**Done when**:

- [x] Testes com gesto: `TEAM-03 Nova equipe com nome e membros aparece na lista` (digitar "Comercial", marcar dois usuários e salvar: o `POST` leva o nome e os dois ids; a linha "Comercial" com 2 membros aparece), `TEAM-04 nome inválido ou repetido mostra a mensagem no campo Nome` (vazio dá "Informe o nome" e 41 caracteres dão "O nome pode ter até 40 caracteres", sem requisição; 400 da API com "Já existe uma equipe com este nome" aparece no campo), `TEAM-05 Editar equipe envia os membros marcados` (desmarcar um membro e salvar: o `PATCH` leva só o outro id e a linha mostra 1 membro), `TEAM-06 renomear a equipe mostra o novo nome na lista` ("Comercial" vira "Vendas")
- [x] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): create and edit teams with their members`

---

### T12: Excluir equipe com confirmação

**What**: `DeleteTeamDialog` aberto por "Excluir equipe": `MESSAGES.teamDeleteConfirm(nome, shareCount)` com "Excluir" e "Cancelar"; confirmar chama `DELETE /api/teams/:id` e tira a linha.
**Where**: `apps/web/src/features/teams/DeleteTeamDialog.tsx`
**Depends on**: T10
**Reuses**: `UserRowActions` e `DeleteDashboardDialog` (padrão), shadcn `alert-dialog`
**Requirement**: TEAM-07, TEAM-08

**Done when**:

- [x] Testes com gesto: `TEAM-07 Excluir equipe pede confirmação com o nome e o número de dashboards` ("Excluir a equipe Comercial? 3 dashboards deixarão de estar compartilhados com ela."; "Cancelar" fecha sem requisição), `TEAM-08 confirmar a exclusão tira a equipe da lista` (o `DELETE` sai e "Comercial" some)
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): delete teams after confirmation`

---

### Phase 5 tasks: Compartilhar no web

### T13: Mostrar e alterar os compartilhamentos na tela "Compartilhar"

**What**: `src/features/sharing/api.ts` (`useShares`, `useChangeShare`, `useRemoveShare`, `useAddShare`, `useShareCandidates` com `q` atrasado 250 ms; as mutações gravam o `DashboardSharesDto` da resposta no cache) e `ShareDialog`: título "Compartilhar", "Dono: <nome>", lugar fixo do campo de busca no topo (preenchido na T14) e a lista num contêiner `overflow-y-auto` com altura máxima; cada linha com nome (usuário: nome e e-mail; equipe: nome; "Todos da instalação"), selo "Desativado", select com as opções de `shareOptionsFor` e "Remover"; "Só você vê este dashboard"; linhas de esqueleto; falha ao carregar ou ao alterar mantém a lista anterior e mostra "Não foi possível atualizar o compartilhamento" com "Tentar novamente". Fixtures de `DashboardSharesDto` e `ShareCandidatesDto`.
**Where**: `apps/web/src/features/sharing/ShareDialog.tsx`
**Depends on**: T6
**Reuses**: `SHARE_PERMISSION_LABELS`, `shareOptionsFor`, `MESSAGES`, shadcn `dialog`, `select`, `badge`, `skeleton`, `button`
**Requirement**: SHARE-02, SHARE-03, SHARE-07, SHARE-08, SHARE-13, SHARE-14, SHARE-15, SHARE-16

**Done when**:

- [ ] Testes com gesto em `ShareDialog.test.tsx`: `SHARE-02 tela de compartilhamento mostra o dono e cada linha com a permissão` ("Dono: Ana Souza"; "Todos da instalação" com "Pode ver", "Comercial" com "Pode ver", "Bruno Lima" com "Pode editar"), `SHARE-03 sem compartilhamentos mostra Só você vê este dashboard`, `SHARE-07 mudar a permissão de uma linha envia a nova permissão` (escolher "Pode editar" na linha de "Comercial": o `PATCH` leva `edit` e a linha mostra "Pode editar"), `SHARE-08 Remover tira a linha da lista` (o `DELETE` sai e "Bruno Lima" some), `SHARE-13 esqueleto enquanto a tela carrega`, `SHARE-14 falha mantém a lista e mostra Não foi possível atualizar o compartilhamento` (`PATCH` com 500: a linha volta a "Pode ver" e a mensagem aparece; `GET` com 500 mostra a mensagem, e "Tentar novamente" com o handler em 200 mostra a lista), `SHARE-15 lista rola com o campo de busca fixo` (o contêiner da lista tem `overflow-y-auto` e o campo de busca está fora dele), `SHARE-16 usuário desativado aparece marcado como Desativado`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): show and change dashboard shares in the share dialog`

---

### T14: Buscar e adicionar destinatários

**What**: `ShareSearch` no topo do `ShareDialog`: campo "Adicionar pessoas ou equipes"; resultados de `useShareCandidates` com "Todos da instalação", equipes e usuários (nome e e-mail), cada um com select de permissão (padrão "Pode ver"; Visualizador só "Pode ver") e "Adicionar"; "Nenhum usuário ou equipe encontrado" quando as listas vêm vazias e o texto não casa com "Todos da instalação"; "Adicionar" chama `POST .../shares`, limpa o campo e mostra a lista devolvida; falha mostra "Não foi possível atualizar o compartilhamento" e mantém a lista.
**Where**: `apps/web/src/features/sharing/ShareSearch.tsx`
**Depends on**: T13
**Reuses**: `useShareCandidates`, `useAddShare`, `shareOptionsFor`, shadcn `input`, `select`, `button`
**Requirement**: SHARE-04, SHARE-05, SHARE-06, SHARE-09, SHARE-10, SHARE-14

**Done when**:

- [ ] Testes com gesto em `ShareSearch.test.tsx`: `SHARE-04 digitar na busca lista usuários, equipes e Todos da instalação` (digitar "ana": a requisição leva `q=ana`; aparecem "Todos da instalação", "Banana" e "Ana Souza" com o e-mail), `SHARE-05 busca sem resultado mostra Nenhum usuário ou equipe encontrado`, `SHARE-06 Adicionar grava o compartilhamento e mostra a linha` (escolher "Pode editar" para "Ana Souza" e adicionar: o `POST` leva `{ recipient: { type: 'USER', userId }, permission: 'edit' }`; a linha aparece na lista e o campo fica vazio), `SHARE-09 adicionar destinatário que já está na lista atualiza a linha` (adicionar "Comercial" com "Pode editar" quando a lista já tem "Comercial" com "Pode ver": continua uma linha "Comercial", agora com "Pode editar"), `SHARE-10 Visualizador só tem a opção Pode ver` (no resultado da busca e na linha da lista), `SHARE-14 falha ao adicionar mantém a lista e mostra a mensagem`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): search and add share recipients`

---

### T15: Ligar o compartilhamento à página do dashboard

**What**: Em `DashboardPage`: botão "Compartilhar" no cabeçalho só com `permissions.share`, que abre o `ShareDialog`; "Compartilhado por <ownerName>" junto ao nome quando `ownerId` não é o usuário da sessão; em `useDashboardEditor`, 403 `DASHBOARD_EDIT_FORBIDDEN` ao salvar mantém a edição e mostra a `message` da API. "Editar" e "Excluir" continuam saindo de `permissions` (DASH-18).
**Where**: `apps/web/src/features/dashboards/DashboardPage.tsx` (modify)
**Depends on**: T14
**Reuses**: `ShareDialog`, `useSession`, `useDashboardEditor`, `MESSAGES.sharedBy`, fixtures de dashboards
**Requirement**: SHARE-01, ACL-06, ACL-07, ACL-08, ACL-12, ACL-13

**Done when**:

- [ ] Testes com gesto em `DashboardSharing.test.tsx`: `SHARE-01 Compartilhar aparece só para o dono e Admins` (com `permissions.share` falso o botão não existe; verdadeiro, clicar abre a tela com "Dono:"), `ACL-06 quem pode ver não vê Editar, Excluir nem Compartilhar`, `ACL-07 quem pode editar vê Editar sem Excluir nem Compartilhar`, `ACL-08 quem não é o dono vê Compartilhado por com o nome do dono` ("Compartilhado por Ana Souza"; o dono não vê o texto), `ACL-12 acesso removido mostra Dashboard não encontrado na próxima ação` (em edição, "Salvar" recebe 404 `DASHBOARD_NOT_FOUND` e a página mostra "Dashboard não encontrado"), `ACL-13 salvar sem permissão mostra Você não tem mais permissão para editar este dashboard` (403 `DASHBOARD_EDIT_FORBIDDEN`: a mensagem aparece e o nome digitado continua no campo)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): open sharing from the dashboard and show who shared it`

---

### T16: Mostrar "Compartilhados comigo" na sidebar

**What**: Em `SidebarDashboards`, a seção "Compartilhados comigo" depois dos itens do usuário, só quando `shared` não está vazio, com itens iguais aos demais (link, item ativo, `truncate`, `title`) e arrastáveis para a sidebar; a seção não é alvo de soltar. Em `layout.ts`, `moveItem` insere o dashboard arrastado quando ele não está no layout. Ao soltar, o item sai de "Compartilhados comigo" na hora e o `PUT /api/sidebar` o leva no lugar escolhido. Fixtures de `SidebarDto` ganham `shared: []`.
**Where**: `apps/web/src/features/sidebar/SidebarDashboards.tsx` (modify)
**Depends on**: T8
**Reuses**: `layout.ts`, `useSaveSidebar`, arrastar de `dashboards-consultas` T16
**Requirement**: ACL-04, ACL-05, ACL-10

**Done when**:

- [ ] Testes de `layout.test.ts`: `ACL-05 moveItem insere o dashboard vindo de Compartilhados comigo` (layout A, grupo G [B]; mover S para dentro de G antes de B dá G [S, B]; para o fim dá A, G, S)
- [ ] Testes com gesto: `ACL-04 sidebar mostra Compartilhados comigo com os dashboards compartilhados` (título da seção e o link para `/dashboards/<id>`), `ACL-10 sem compartilhados a seção Compartilhados comigo não aparece`, `ACL-05 arrastar de Compartilhados comigo para um grupo o mantém no grupo` (`fireEvent.dragStart` no item compartilhado e `drop` no cabeçalho do grupo: o item aparece no grupo, a seção some e o `PUT` leva o id dentro do grupo)
- [ ] Testes de sidebar de `dashboards-consultas` continuam verdes
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): show shared with me section in the sidebar`

---

## Checks

**C1** - A seção "Equipes" da aba "Usuários" mostra o nome e o número de membros de cada equipe, em ordem alfabética (TEAM-01, AC 1)
Proof: run api | ✓ TEAM-01 lista equipes com nome e número de membros em ordem alfabética
Proof: run web | ✓ TEAM-01 seção Equipes mostra nome e número de membros na ordem da API

**C2** - Sem equipes, a seção mostra "Nenhuma equipe criada" (TEAM-02, AC 2)
Proof: run web | ✓ TEAM-02 sem equipes mostra Nenhuma equipe criada

**C3** - "Nova equipe" com nome e membros cria a equipe e a mostra na lista (TEAM-03, AC 3)
Proof: run api | ✓ TEAM-03 cria a equipe com nome e membros
Proof: run web | ✓ TEAM-03 Nova equipe com nome e membros aparece na lista

**C4** - Nome de equipe vazio, com mais de 40 caracteres ou repetido é recusado com a mensagem no campo "Nome" (TEAM-04, AC 4)
Proof: run contracts | ✓ TEAM-04 nome da equipe vazio ou com mais de 40 caracteres
Proof: run api | ✓ TEAM-04 índice único recusa nome de equipe repetido sem diferenciar maiúsculas
Proof: run api | ✓ TEAM-04 nome vazio, longo ou repetido responde 400 no campo nome
Proof: run web | ✓ TEAM-04 nome inválido ou repetido mostra a mensagem no campo Nome

**C5** - Adicionar ou remover um membro muda o acesso dele na próxima requisição (TEAM-05, AC 5)
Proof: run api | ✓ TEAM-05 remover membro da equipe tira o acesso na próxima requisição
Proof: run web | ✓ TEAM-05 Editar equipe envia os membros marcados

**C6** - Renomear uma equipe mostra o nome novo na lista e nos compartilhamentos feitos com ela (TEAM-06, AC 6)
Proof: run api | ✓ TEAM-06 renomear a equipe muda o nome na lista
Proof: run api | ✓ TEAM-06 compartilhamento mostra o nome novo da equipe
Proof: run web | ✓ TEAM-06 renomear a equipe mostra o novo nome na lista

**C7** - "Excluir equipe" pede confirmação com "Excluir a equipe <nome>? N dashboards deixarão de estar compartilhados com ela." (TEAM-07, AC 7)
Proof: run api | ✓ TEAM-07 equipe informa quantos dashboards estão compartilhados com ela
Proof: run web | ✓ TEAM-07 Excluir equipe pede confirmação com o nome e o número de dashboards

**C8** - Confirmar a exclusão apaga a equipe e os compartilhamentos feitos com ela (TEAM-08, AC 8)
Proof: run api | ✓ TEAM-08 apagar a equipe apaga os compartilhamentos feitos com ela
Proof: run api | ✓ TEAM-08 excluir a equipe apaga a equipe e os compartilhamentos dela
Proof: run web | ✓ TEAM-08 confirmar a exclusão tira a equipe da lista

**C9** - Editor ou Visualizador que chama criação, alteração ou exclusão de equipe recebe 403 (TEAM-09, AC 9)
Proof: run api | ✓ TEAM-09 Editor e Visualizador recebem 403 nas rotas de equipe

**C10** - Falha ao carregar as equipes mostra "Não foi possível carregar as equipes" com "Tentar novamente" (TEAM-10, AC 10)
Proof: run web | ✓ TEAM-10 erro nas equipes mostra Não foi possível carregar as equipes e Tentar novamente recarrega

**C11** - "Compartilhar" aparece no dashboard só para o dono e para Admins (SHARE-01, AC 1)
Proof: run api | ✓ SHARE-01 só o dono e os Admins têm permissão de compartilhar
Proof: run web | ✓ SHARE-01 Compartilhar aparece só para o dono e Admins

**C12** - A tela de compartilhamento mostra o nome do dono e quem tem acesso, cada linha com "Pode ver" ou "Pode editar" (SHARE-02, AC 2)
Proof: run api | ✓ SHARE-02 lista de compartilhamentos traz o dono e cada destinatário com a permissão
Proof: run web | ✓ SHARE-02 tela de compartilhamento mostra o dono e cada linha com a permissão

**C13** - Sem compartilhamentos, a tela mostra "Só você vê este dashboard" (SHARE-03, AC 3)
Proof: run web | ✓ SHARE-03 sem compartilhamentos mostra Só você vê este dashboard

**C14** - A busca lista usuários ativos por nome ou e-mail, equipes por nome e "Todos da instalação" (SHARE-04, AC 4)
Proof: run api | ✓ SHARE-04 busca lista usuários ativos por nome ou e-mail, equipes e Todos da instalação
Proof: run web | ✓ SHARE-04 digitar na busca lista usuários, equipes e Todos da instalação

**C15** - Busca sem resultado mostra "Nenhum usuário ou equipe encontrado" (SHARE-05, AC 5)
Proof: run api | ✓ SHARE-05 busca sem resultado devolve listas vazias
Proof: run web | ✓ SHARE-05 busca sem resultado mostra Nenhum usuário ou equipe encontrado

**C16** - Adicionar usuário, equipe ou "Todos da instalação" grava o compartilhamento na hora e o mostra na lista (SHARE-06, AC 6)
Proof: run api | ✓ SHARE-06 adicionar usuário, equipe e todos grava o compartilhamento na hora
Proof: run web | ✓ SHARE-06 Adicionar grava o compartilhamento e mostra a linha

**C17** - Mudar a permissão de uma linha vale na próxima requisição de quem a recebe (SHARE-07, AC 7)
Proof: run api | ✓ SHARE-07 mudar a permissão vale na próxima requisição de quem recebe
Proof: run web | ✓ SHARE-07 mudar a permissão de uma linha envia a nova permissão

**C18** - "Remover" apaga o compartilhamento e tira o acesso na próxima requisição (SHARE-08, AC 8)
Proof: run api | ✓ SHARE-08 remover o compartilhamento tira o acesso na próxima requisição
Proof: run web | ✓ SHARE-08 Remover tira a linha da lista

**C19** - Destinatário que já está na lista tem a linha atualizada, sem criar outra (SHARE-09, AC 9)
Proof: run api | ✓ SHARE-09 índice único impede duas linhas para o mesmo destinatário
Proof: run api | ✓ SHARE-09 destinatário repetido atualiza a linha existente
Proof: run web | ✓ SHARE-09 adicionar destinatário que já está na lista atualiza a linha

**C20** - Para um usuário Visualizador a tela oferece só "Pode ver" (SHARE-10, AC 10)
Proof: run contracts | ✓ SHARE-10 Visualizador só recebe Pode ver nas opções
Proof: run api | ✓ SHARE-10 Visualizador com Pode editar responde 400
Proof: run web | ✓ SHARE-10 Visualizador só tem a opção Pode ver

**C21** - O dono do dashboard fica fora dos resultados da busca (SHARE-11, AC 11)
Proof: run api | ✓ SHARE-11 dono fica fora da busca

**C22** - Quem não é dono nem Admin recebe 403 ao ler ou alterar os compartilhamentos; quem não alcança o dashboard recebe 404 (AD-049) (SHARE-12, AC 12)
Proof: run api | ✓ SHARE-12 quem não é dono nem Admin recebe 403 nos compartilhamentos

**C23** - Enquanto a tela de compartilhamento carrega, aparecem linhas de esqueleto (SHARE-13, AC 13)
Proof: run web | ✓ SHARE-13 esqueleto enquanto a tela carrega

**C24** - Falha ao carregar ou alterar mantém a lista e mostra "Não foi possível atualizar o compartilhamento" com "Tentar novamente" (SHARE-14, AC 14)
Proof: run web | ✓ SHARE-14 falha mantém a lista e mostra Não foi possível atualizar o compartilhamento
Proof: run web | ✓ SHARE-14 falha ao adicionar mantém a lista e mostra a mensagem

**C25** - A lista de compartilhamentos rola com o campo de busca fixo (SHARE-15, AC 15)
Proof: run web | ✓ SHARE-15 lista rola com o campo de busca fixo

**C26** - A permissão é a mais alta entre dono ou Admin, compartilhamento direto, equipes e "Todos da instalação" (ACL-01, AC 1)
Proof: run api | ✓ ACL-01 permissão é a mais alta entre direto, equipes e todos

**C27** - Um Visualizador tem no máximo "pode ver" (ACL-02, AC 2)
Proof: run api | ✓ ACL-02 Visualizador com compartilhamento de edição só vê

**C28** - Toda rota de dashboard, aba, widget e execução verifica a permissão no dashboard (ACL-03, AC 3)
Proof: run api | ✓ ACL-03 toda rota de dashboard verifica a permissão no dashboard

**C29** - Um dashboard compartilhado aparece na sidebar do destinatário em "Compartilhados comigo" (ACL-04, AC 4)
Proof: run api | ✓ ACL-04 dashboard compartilhado aparece em Compartilhados comigo
Proof: run web | ✓ ACL-04 sidebar mostra Compartilhados comigo com os dashboards compartilhados

**C30** - Arrastar de "Compartilhados comigo" para um grupo ou posição o mantém ali (ACL-05, AC 5)
Proof: run api | ✓ ACL-05 compartilhado gravado na sidebar sai de Compartilhados comigo
Proof: run web | ✓ ACL-05 moveItem insere o dashboard vindo de Compartilhados comigo
Proof: run web | ✓ ACL-05 arrastar de Compartilhados comigo para um grupo o mantém no grupo

**C31** - Quem pode ver abre o dashboard sem "Editar", "Excluir" nem "Compartilhar" (ACL-06, AC 6)
Proof: run api | ✓ ACL-06 quem pode ver recebe permissões sem editar, excluir nem compartilhar
Proof: run web | ✓ ACL-06 quem pode ver não vê Editar, Excluir nem Compartilhar

**C32** - Quem pode editar vê "Editar", sem "Excluir" nem "Compartilhar" (ACL-07, AC 7)
Proof: run api | ✓ ACL-07 quem pode editar recebe editar sem excluir nem compartilhar
Proof: run web | ✓ ACL-07 quem pode editar vê Editar sem Excluir nem Compartilhar

**C33** - Quem não é o dono vê "Compartilhado por <nome do dono>" junto ao nome do dashboard (ACL-08, AC 8)
Proof: run web | ✓ ACL-08 quem não é o dono vê Compartilhado por com o nome do dono

**C34** - Quem perde o acesso deixa de ver o dashboard na sidebar e nos grupos (ACL-09, AC 9)
Proof: run api | ✓ ACL-09 acesso perdido tira o dashboard da sidebar e dos grupos

**C35** - Sem compartilhados, a seção "Compartilhados comigo" não aparece (ACL-10, AC 10)
Proof: run api | ✓ ACL-10 sem compartilhados a seção vem vazia
Proof: run web | ✓ ACL-10 sem compartilhados a seção Compartilhados comigo não aparece

**C36** - Cada criação, mudança e remoção de compartilhamento vai ao log com autor, dashboard, destinatário e permissão (ACL-11, AC 11)
Proof: run api | ✓ ACL-11 log registra criação, mudança e remoção com autor, dashboard, destinatário e permissão

**C37** - Acesso removido com o dashboard aberto mostra "Dashboard não encontrado" na próxima ação (ACL-12, edge case)
Proof: run api | ✓ ACL-12 acesso removido responde Dashboard não encontrado na próxima ação
Proof: run web | ✓ ACL-12 acesso removido mostra Dashboard não encontrado na próxima ação

**C38** - Permissão rebaixada para "pode ver" durante a edição recusa a gravação com "Você não tem mais permissão para editar este dashboard" (ACL-13, edge case)
Proof: run api | ✓ ACL-13 gravar sem permissão de edição responde Você não tem mais permissão
Proof: run web | ✓ ACL-13 salvar sem permissão mostra Você não tem mais permissão para editar este dashboard

**C39** - "Pode ver" direto e "Pode editar" por equipe dão "pode editar" (ACL-14, edge case)
Proof: run api | ✓ ACL-14 Pode ver direto e Pode editar pela equipe dá editar

**C40** - Usuário criado depois de um compartilhamento com "Todos da instalação" recebe esse acesso (ACL-15, edge case)
Proof: run api | ✓ ACL-15 usuário criado depois do compartilhamento com todos tem acesso

**C41** - Dono desativado mantém o dashboard e os compartilhamentos (ACL-16, edge case)
Proof: run api | ✓ ACL-16 dono desativado mantém o dashboard e os compartilhamentos

**C42** - Usuário desativado continua na lista de compartilhamentos, marcado como "Desativado" (SHARE-16, edge case)
Proof: run api | ✓ SHARE-16 usuário desativado continua na lista marcado como desativado
Proof: run web | ✓ SHARE-16 usuário desativado aparece marcado como Desativado

**C43** - Dois envios simultâneos do mesmo destinatário deixam uma linha, com a permissão do último (SHARE-17, edge case)
Proof: run apiint | ✓ SHARE-17 dois envios simultâneos do mesmo destinatário deixam uma linha

**C44** - Duas pessoas com "pode editar" salvando a mesma versão recebem a recusa de gravação desatualizada (ACL-17, edge case)
Proof: run api | ✓ ACL-17 dois editores salvando a mesma versão recebem 409 no segundo

**C45** - Excluir um dashboard apaga os compartilhamentos dele (SHARE-18, edge case)
Proof: run api | ✓ SHARE-18 apagar o dashboard apaga os compartilhamentos dele

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** lote 1 (T1-T7, sonnet) sobre 7e736fa - em andamento.
**Walked:** dispensado por AD-023

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T3
          T2 ------→ T3
Phase 2:  T4 ------→ T5 ------→ T6 ------→ T7
Phase 3:  T8
          T9
Phase 4:  T10 -----→ T11
          T10 -----→ T12
Phase 5:  T13 -----→ T14 -----→ T15
          T16
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order: T1 to T16.
