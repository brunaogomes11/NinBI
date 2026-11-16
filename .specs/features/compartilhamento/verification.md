# Compartilhamento verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at ff231b6
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `apps/api/test/teams/teams.spec.ts` `TEAM-01 lista equipes com nome e número de membros em ordem alfabética` | yes |
| C2 | `apps/web/src/features/teams/TeamsSection.test.tsx` `TEAM-02 sem equipes mostra Nenhuma equipe criada` | yes |
| C3 | `apps/api/test/teams/teams.spec.ts` `TEAM-03 cria a equipe com nome e membros` | yes |
| C4 | `packages/contracts/src/sharing.spec.ts` `TEAM-04 nome da equipe vazio ou com mais de 40 caracteres` | yes |
| C5 | `apps/api/test/sharing/acl-routes.spec.ts` `TEAM-05 remover membro da equipe tira o acesso na próxima requisição` | yes |
| C6 | `apps/api/test/sharing/shares.spec.ts` `TEAM-06 compartilhamento mostra o nome novo da equipe` | yes |
| C7 | `apps/web/src/features/teams/DeleteTeamDialog.test.tsx` `TEAM-07 Excluir equipe pede confirmação com o nome e o número de dashboards` (asserta o texto exato) | yes |
| C8 | `apps/api/test/teams/teams.spec.ts` `TEAM-08 excluir a equipe apaga a equipe e os compartilhamentos dela` | yes |
| C9 | `apps/api/test/teams/teams.spec.ts` `TEAM-09 Editor e Visualizador recebem 403 nas rotas de equipe` | yes |
| C10 | `apps/web/src/features/teams/TeamsSection.test.tsx` `TEAM-10 erro nas equipes mostra Não foi possível carregar as equipes e Tentar novamente recarrega` | yes |
| C11 | `apps/api/test/sharing/dashboard-access.spec.ts` `SHARE-01 só o dono e os Admins têm permissão de compartilhar` | yes |
| C12 | `apps/api/test/sharing/shares.spec.ts` `SHARE-02 lista de compartilhamentos traz o dono e cada destinatário com a permissão` | yes |
| C13 | `apps/web/src/features/sharing/ShareDialog.test.tsx` `SHARE-03 sem compartilhamentos mostra Só você vê este dashboard` | yes |
| C14 | `apps/api/test/sharing/share-candidates.spec.ts` `SHARE-04 busca lista usuários ativos por nome ou e-mail, equipes e Todos da instalação` | yes |
| C15 | `apps/api/test/sharing/share-candidates.spec.ts` `SHARE-05 busca sem resultado devolve listas vazias` | yes |
| C16 | `apps/api/test/sharing/shares.spec.ts` `SHARE-06 adicionar usuário, equipe e todos grava o compartilhamento na hora` | yes |
| C17 | `apps/api/test/sharing/shares.spec.ts` `SHARE-07 mudar a permissão vale na próxima requisição de quem recebe` | yes |
| C18 | `apps/api/test/sharing/shares.spec.ts` `SHARE-08 remover o compartilhamento tira o acesso na próxima requisição` | yes |
| C19 | `apps/api/test/sharing/shares.spec.ts` `SHARE-09 destinatário repetido atualiza a linha existente` | yes |
| C20 | `packages/contracts/src/sharing.spec.ts` `SHARE-10 Visualizador só recebe Pode ver nas opções` | yes |
| C21 | `apps/api/test/sharing/share-candidates.spec.ts` `SHARE-11 dono fica fora da busca` | yes |
| C22 | `apps/api/test/sharing/shares.spec.ts` `SHARE-12 quem não é dono nem Admin recebe 403 nos compartilhamentos` | yes |
| C23 | `apps/web/src/features/sharing/ShareDialog.test.tsx` `SHARE-13 esqueleto enquanto a tela carrega` | yes |
| C24 | `apps/web/src/features/sharing/ShareDialog.test.tsx` `SHARE-14 falha mantém a lista e mostra Não foi possível atualizar o compartilhamento` | yes |
| C25 | `apps/web/src/features/sharing/ShareDialog.test.tsx` `SHARE-15 lista rola com o campo de busca fixo` (afirma a classe `overflow-y-auto` e a posição, não o scroll real) | yes |
| C26 | `apps/api/test/sharing/db-share-resolver.spec.ts` `ACL-01 permissão é a mais alta entre direto, equipes e todos` | no - cada dashboard do teste tem um único canal; um resolvedor que pegasse a primeira linha passaria. A regra "a mais alta" só é fixada no caso direto + equipe (ACL-14). Ver F2 |
| C27 | `apps/api/test/sharing/dashboard-access.spec.ts` `ACL-02 Visualizador com compartilhamento de edição só vê` | no - o teste cobre só o caminho do compartilhamento; um Visualizador dono recebe edição, exclusão e compartilhamento. Ver F1 |
| C28 | `apps/api/test/sharing/acl-routes.spec.ts` `ACL-03 toda rota de dashboard verifica a permissão no dashboard` | yes |
| C29 | `apps/api/test/sharing/sidebar-shared.spec.ts` `ACL-04 dashboard compartilhado aparece em Compartilhados comigo` | yes |
| C30 | `apps/api/test/sharing/sidebar-shared.spec.ts` `ACL-05 compartilhado gravado na sidebar sai de Compartilhados comigo` | yes |
| C31 | `apps/api/test/sharing/acl-routes.spec.ts` `ACL-06 quem pode ver recebe permissões sem editar, excluir nem compartilhar` | yes |
| C32 | `apps/api/test/sharing/acl-routes.spec.ts` `ACL-07 quem pode editar recebe editar sem excluir nem compartilhar` | yes |
| C33 | `apps/web/src/features/dashboards/DashboardSharing.test.tsx` `ACL-08 quem não é o dono vê Compartilhado por com o nome do dono` | yes |
| C34 | `apps/api/test/sharing/sidebar-shared.spec.ts` `ACL-09 acesso perdido tira o dashboard da sidebar e dos grupos` | yes |
| C35 | `apps/api/test/sharing/sidebar-shared.spec.ts` `ACL-10 sem compartilhados a seção vem vazia` | yes |
| C36 | `apps/api/test/sharing/shares.spec.ts` `ACL-11 log registra criação, mudança e remoção com autor, dashboard, destinatário e permissão` | yes |
| C37 | `apps/api/test/sharing/acl-routes.spec.ts` `ACL-12 acesso removido responde Dashboard não encontrado na próxima ação` | yes |
| C38 | `apps/api/test/sharing/dashboard-access.spec.ts` `ACL-13 gravar sem permissão de edição responde Você não tem mais permissão` | yes |
| C39 | `apps/api/test/sharing/db-share-resolver.spec.ts` `ACL-14 Pode ver direto e Pode editar pela equipe dá editar` | yes |
| C40 | `apps/api/test/sharing/db-share-resolver.spec.ts` `ACL-15 usuário criado depois do compartilhamento com todos tem acesso` | yes |
| C41 | `apps/api/test/sharing/acl-routes.spec.ts` `ACL-16 dono desativado mantém o dashboard e os compartilhamentos` | yes |
| C42 | `apps/api/test/sharing/shares.spec.ts` `SHARE-16 usuário desativado continua na lista marcado como desativado` | yes |
| C43 | `apps/api/test-int/sharing.int.spec.ts` `SHARE-17 dois envios simultâneos do mesmo destinatário deixam uma linha` (não reexecutado; lido) | yes |
| C44 | `apps/api/test/sharing/acl-routes.spec.ts` `ACL-17 dois editores salvando a mesma versão recebem 409 no segundo` | yes |
| C45 | `apps/api/test/database/sharing-schema.spec.ts` `SHARE-18 apagar o dashboard apaga os compartilhamentos dele` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (alta): um Visualizador que é dono de um dashboard recebe edição, exclusão e compartilhamento, quebrando ACL-02 ("a permissão efetiva de um Visualizador é sempre pode ver") | `apps/api/src/dashboard-access/dashboard-access.service.ts:62-63` - o ramo do dono ou Admin não checa o papel; o limite do Visualizador só existe em `:68` e vale só para compartilhamentos. Probe descartável no HEAD (apagado): GET de dono Visualizador devolve `{"edit":true,"delete":true,"share":true}` | No ramo do dono, se `user.role === 'VIEWER'`, devolver `{ ...base, canEdit: false, canDelete: false, canShare: false }` (continua vendo). Acrescentar em `apps/api/test/sharing/dashboard-access.spec.ts` um teste com Visualizador dono: GET 200, `permissions` tudo false, PUT 403 | |
| F2 (baixa): ACL-01 não prova "a mais alta" entre canais, cada dashboard do teste tem um canal só | `apps/api/test/sharing/db-share-resolver.spec.ts:47-90` - o agregado `max` está em `apps/api/src/sharing/db-share-resolver.ts:23`. Probe descartável no HEAD (apagado): EVERYONE edit + USER view dá `edit` (correto); o código está certo, falta o teste | Acrescentar em `db-share-resolver.spec.ts` um dashboard com EVERYONE view + TEAM edit (esperado `edit`) e um com EVERYONE edit + USER view (esperado `edit`) | |
