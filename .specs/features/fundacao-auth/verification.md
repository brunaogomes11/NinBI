# fundacao-auth verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 6b2d938
**Verifier**: verificador independente (sessão própria a partir do brief; não leu `## Handoff`)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `apps/api/test/web/web.spec.ts` `FND-01 serve o index.html do web em GET /`; `scripts/smoke-compose.mjs` (FND-01, e2e) | yes |
| C2 | `apps/api/test-int/neo4j-seed.int.spec.ts` `FND-02 seed carrega o dataset e não duplica ao rodar de novo` | yes |
| C3 | `apps/api/test/health/health.spec.ts` `FND-03 health responde 200 com postgres up` | yes |
| C4 | `apps/api/test/health/health.spec.ts` `FND-04 health responde 503 com postgres down` | yes |
| C5 | `apps/api/test/common/http-logging.spec.ts` `FND-05 log de requisição tem método, caminho, status e duração sem corpo, senha nem cookie` | yes |
| C6 | `apps/api/test/infra/license.spec.ts` `FND-06 LICENSE na raiz traz o texto da AGPL-3.0` | yes |
| C7 | `apps/web/src/features/auth/SetupPage.test.tsx` `SETUP-01 sem usuários mostra Criar administrador com Nome, E-mail, Senha e Confirmar senha` | yes |
| C8 | `apps/api/test/setup/setup.spec.ts` `SETUP-02 cria o admin e inicia a sessão`; `apps/web/src/features/auth/SetupPage.test.tsx` `SETUP-02 enviar o formulário válido abre a página inicial` | yes |
| C9 | `apps/api/test/setup/setup.spec.ts` `SETUP-03 responde 409 quando já existe usuário`; `apps/web/src/features/auth/SetupPage.test.tsx` `SETUP-03 com usuário existente mostra a tela de login` | yes |
| C10 | `packages/contracts/src/schemas.spec.ts` `SETUP-04 senha com menos de 8 caracteres`; `apps/web/src/features/auth/SetupPage.test.tsx` `SETUP-04 senha curta mantém o formulário e mostra a mensagem` | yes |
| C11 | `packages/contracts/src/schemas.spec.ts` `SETUP-05 senhas diferentes`; `apps/web/src/features/auth/SetupPage.test.tsx` `SETUP-05 senhas diferentes mostram As senhas não conferem` | yes |
| C12 | `apps/api/test-int/setup.int.spec.ts` `SETUP-06 dois envios simultâneos criam um único admin e um recebe 409` | yes |
| C13 | `apps/api/test/auth/auth.spec.ts` `AUTH-01 login correto cria a sessão`; `apps/web/src/features/auth/LoginPage.test.tsx` `AUTH-01 entrar com dados corretos abre a página inicial` | yes |
| C14 | `apps/api/test/auth/auth.spec.ts` `AUTH-02 e-mail inexistente e senha errada dão a mesma resposta`; `apps/web/src/features/auth/LoginPage.test.tsx` `AUTH-02 credenciais erradas mostram E-mail ou senha incorretos` | yes |
| C15 | `packages/contracts/src/schemas.spec.ts` `AUTH-03 e-mail vazio ou inválido e senha vazia`; `apps/web/src/features/auth/LoginPage.test.tsx` `AUTH-03 e-mail inválido ou senha vazia mostram a mensagem no campo sem enviar` | yes |
| C16 | `apps/api/test/auth/login-throttle.service.spec.ts` `AUTH-04 throttle: continua bloqueado aos 14 min 59 s` e `AUTH-04 throttle: libera aos 15 min`; `apps/api/test/auth/auth.spec.ts` `AUTH-04 cinco erros em 15 minutos bloqueiam o e-mail por 15 minutos`; `apps/web/src/features/auth/LoginPage.test.tsx` `AUTH-04 bloqueio mostra Muitas tentativas` | yes |
| C17 | `apps/web/src/features/auth/LoginPage.test.tsx` `AUTH-05 botão Entrar fica desabilitado durante o envio` | yes |
| C18 | `apps/api/test/auth/auth.spec.ts` `AUTH-06 logout encerra a sessão`; `apps/web/src/features/shell/UserMenu.test.tsx` `AUTH-06 Sair no menu do usuário mostra a tela de login` | yes |
| C19 | `apps/api/test/auth/session.guard.spec.ts` `AUTH-07 rota protegida sem sessão válida responde 401` | yes |
| C20 | `apps/web/src/app/router.test.tsx` `AUTH-08 sem sessão a página protegida vai para o login guardando voltar`; `apps/web/src/features/auth/LoginPage.test.tsx` `AUTH-08 401 leva ao login e depois do login abre a página pedida` | yes |
| C21 | `apps/api/test/auth/session.service.spec.ts` `AUTH-09 sessão sem uso há 7 dias e 1 min não resolve`; `apps/api/test/auth/session.guard.spec.ts` `AUTH-09 sessão sem uso por 7 dias é inválida` | yes |
| C22 | `apps/api/test/auth/auth.spec.ts` `AUTH-10 guarda só o hash com sal da senha` | yes |
| C23 | `apps/api/test/auth/auth.spec.ts` `AUTH-11 cookie de sessão é httpOnly` | yes |
| C24 | `apps/api/test/auth/auth.spec.ts` `AUTH-12 usuário desativado recebe E-mail ou senha incorretos` | yes |
| C25 | `apps/web/src/features/auth/LoginPage.test.tsx` `AUTH-13 backend fora do ar mostra Não foi possível conectar ao servidor` | yes |
| C26 | `packages/contracts/src/roles.spec.ts` `ROLE-01 matriz de papéis tem 9 permissões e 3 papéis` e `ROLE-01 matriz de papéis: <papel> pode/não pode <permissão>`; `apps/api/test/auth/permission.guard.spec.ts` `ROLE-01 cada papel recebe 200 ou 403 conforme a matriz` | yes |
| C27 | `apps/api/test/users/users.spec.ts` `ROLE-02 Editor e Visualizador recebem 403 na API de usuários` | yes |
| C28 | `apps/web/src/app/router.test.tsx` `ROLE-03 página não permitida mostra a mensagem de permissão com link para a página inicial` | yes |
| C29 | `apps/web/src/features/shell/Sidebar.test.tsx` `ROLE-04 só Admin vê Configurações na sidebar (ADMIN / EDITOR / VIEWER)` | yes |
| C30 | `apps/api/test/auth/session.guard.spec.ts` `ROLE-05 novo papel vale na próxima requisição`; `apps/web/src/features/users/UserRowActions.test.tsx` `ROLE-05 trocar o papel mostra o novo papel na linha` | yes |
| C31 | `apps/web/src/features/settings/SettingsPage.test.tsx` `CFG-01 clicar em Configurações mostra a página com a aba Usuários` | yes |
| C32 | `apps/web/src/features/settings/SettingsPage.test.tsx` `CFG-02 abas na ordem Conexões, Usuários, LLM` | yes |
| C33 | `apps/web/src/features/settings/SettingsPage.test.tsx` `CFG-03 aba escolhida fica na URL e continua aberta ao recarregar` | yes |
| C34 | `apps/web/src/features/shell/Sidebar.test.tsx` `CFG-04 Configurações é o último item da sidebar fora da área que rola` | yes |
| C35 | `apps/api/test/users/users.spec.ts` `USR-01 lista em ordem alfabética de nome com e-mail, papel e situação`; `apps/web/src/features/users/UsersTab.test.tsx` `USR-01 aba Usuários mostra nome, e-mail, papel e situação` (ver F3) | yes |
| C36 | `apps/web/src/features/users/UsersTab.test.tsx` `USR-02 linhas de esqueleto durante o carregamento` | yes |
| C37 | `apps/web/src/features/users/UsersTab.test.tsx` `USR-03 erro mostra a mensagem e Tentar novamente recarrega` | yes |
| C38 | `apps/api/test/users/users.spec.ts` `USR-04 cria usuário com senha provisória`; `apps/web/src/features/users/NewUserDialog.test.tsx` `USR-04 novo usuário enviado aparece na lista` | yes |
| C39 | `apps/api/test/users/users.spec.ts` `USR-05 e-mail repetido sem diferenciar maiúsculas responde 409`; `apps/web/src/features/users/NewUserDialog.test.tsx` `USR-05 mostra Já existe um usuário com este e-mail` | yes |
| C40 | `apps/api/test/auth/initial-password.spec.ts` `USR-06 senha provisória só permite definir a nova senha`; `apps/web/src/features/auth/InitialPasswordPage.test.tsx` `USR-06 login com senha provisória exige nova senha antes da página inicial` | yes |
| C41 | `apps/api/test/users/users-manage.spec.ts` `USR-07 redefinir senha troca a senha e encerra as sessões`; `apps/web/src/features/users/UserRowActions.test.tsx` `USR-07 Redefinir senha envia a senha provisória` | yes |
| C42 | `apps/web/src/features/users/UserRowActions.test.tsx` `USR-08 Desativar pede confirmação com o nome` | yes |
| C43 | `apps/api/test/users/users-status.spec.ts` `USR-09 desativar marca Desativado e encerra as sessões`; `apps/web/src/features/users/UserRowActions.test.tsx` `USR-09 confirmar a desativação mostra Desativado` | yes |
| C44 | `apps/api/test/users/users-status.spec.ts` `USR-10 reativar marca Ativo`; `apps/web/src/features/users/UserRowActions.test.tsx` `USR-10 Reativar mostra Ativo` | yes |
| C45 | `apps/api/test/users/users-status.spec.ts` `USR-11 recusa deixar a instalação sem admin ativo`; `apps/web/src/features/users/UserRowActions.test.tsx` `USR-11 mostra É preciso existir ao menos um administrador ativo` | yes |
| C46 | `apps/web/src/features/users/NewUserDialog.test.tsx` `USR-12 Salvar fica desabilitado durante o envio` | yes |
| C47 | `apps/api/test-int/users.int.spec.ts` `USR-13 criação simultânea com o mesmo e-mail cria um só` | yes |
| C48 | `apps/api/test/users/users.spec.ts` `USR-14 nome ou e-mail acima de 120 caracteres são recusados`; `apps/web/src/features/users/NewUserDialog.test.tsx` `USR-14 nome longo mostra a mensagem no campo` | yes |
| C49 | `apps/api/test/auth/session.guard.spec.ts` `USR-15 usuário desativado com sessão aberta recebe 401` | yes |
| C50 | `apps/web/src/features/shell/AppShell.test.tsx` `SHELL-01 shell mostra sidebar, barra superior e área de conteúdo em tema escuro` | yes |
| C51 | `apps/web/src/features/shell/Sidebar.test.tsx` `SHELL-02 escolher Claro aplica o tema claro`; `apps/web/src/theme/theme.test.ts` `SHELL-02 tema claro tem contraste de texto de ao menos 4,5:1` | yes |
| C52 | `apps/web/src/theme/ThemeProvider.test.tsx` `SHELL-03 escolher Escuro volta ao tema escuro` | yes |
| C53 | `apps/web/src/theme/ThemeProvider.test.tsx` `SHELL-04 reabrir aplica o último tema e o escuro sem escolha` | yes |
| C54 | `apps/web/src/features/shell/Sidebar.test.tsx` `SHELL-05 clicar em um item abre a página e marca o item como ativo` | yes |
| C55 | `apps/web/src/features/shell/UserMenu.test.tsx` `SHELL-06 bloco do usuário abre menu com Alterar senha e Sair` | yes |
| C56 | `apps/web/src/features/shell/AppShell.test.tsx` `SHELL-07 sem dashboards a página inicial mostra Nenhum dashboard ainda` | yes |
| C57 | `apps/web/src/theme/theme.test.ts` `SHELL-08 temas escuro e claro definem os mesmos tokens` e `SHELL-08 nenhuma tela usa cor literal fora dos tokens` | yes |
| C58 | `apps/web/src/test/portuguese-only.test.tsx` `SHELL-09 telas não mostram rótulos em inglês` | yes |
| C59 | `apps/web/src/features/shell/AppShell.test.tsx` `SHELL-10 sidebar fixa e só a área de conteúdo rola` | yes |
| C60 | `apps/web/src/features/shell/BrandMark.test.tsx` `SHELL-11 sidebar mostra o símbolo e NinBI com BI em ciano no tema dark` / `light` (ver F1) | no - o teste confere a classe `text-accent-text`, não que o BI seja ciano; qualquer cor de token passaria |
| C61 | `apps/web/src/features/shell/BrandMark.test.tsx` `SHELL-12 ícone da aba é o símbolo em estrela` (ver F2) | no - o teste confere só que `public/favicon.png` existe e o `<link>` no index.html; não que seja o símbolo |
| C62 | `apps/web/src/features/shell/BrandMark.test.tsx` `SHELL-13 subtítulo da logo não aparece em nenhuma tela` | yes |
| C63 | `apps/web/src/features/auth/LoginPage.test.tsx` `SHELL-14 login mostra o símbolo e NinBI`; `apps/web/src/features/auth/SetupPage.test.tsx` `SHELL-14 primeiro acesso mostra o símbolo e NinBI` | yes |
| C64 | `apps/web/src/theme/theme.test.ts` `SHELL-15 destaque usa o gradiente roxo para ciano sobre fundo quase preto` | yes |
| C65 | `apps/api/test/auth/password.spec.ts` `PWD-01 troca a senha com a senha atual correta`; `apps/web/src/features/auth/ChangePasswordDialog.test.tsx` `PWD-01 Alterar senha mostra Senha alterada` | yes |
| C66 | `apps/api/test/auth/password.spec.ts` `PWD-02 senha atual incorreta é recusada`; `apps/web/src/features/auth/ChangePasswordDialog.test.tsx` `PWD-02 mostra Senha atual incorreta` | yes |
| C67 | `apps/api/test/auth/password.spec.ts` `PWD-03 nova senha curta é recusada`; `apps/web/src/features/auth/ChangePasswordDialog.test.tsx` `PWD-03 nova senha curta mostra a mensagem e não envia` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| C60 não prova que o "BI" é ciano: o teste confere a classe `text-accent-text`. Além disso, no tema claro o token é `#08717e` (teal escuro), não o ciano `#2ee6f0` do tema escuro. A exigência de contraste de SHELL-02 justifica o valor, mas a spec diz "ciano" para os dois temas: decidir se isso é aceito | `apps/web/src/features/shell/BrandMark.test.tsx:37`; `apps/web/src/styles/theme.css:15` (claro `--accent-text: #08717e`) e `:56` (escuro `#2ee6f0`) | Afirmar a cor resolvida do span do "BI" (tema escuro = `--brand-cyan`; tema claro = o valor aprovado) em vez da classe. Se o teal do tema claro não for aceito como ciano, registrar a diferença em `## Differences from the source` ou ajustar a spec | |
| C61 `SHELL-12` só verifica que `apps/web/public/favicon.png` existe e que o `index.html` tem o `<link>`. Um PNG qualquer passa. O favicon e o símbolo têm MD5 diferentes (`0c07a57f...` e `8506d477...`), então o teste não garante que seja o símbolo recortado | `apps/web/src/features/shell/BrandMark.test.tsx:42-49`; `apps/web/public/favicon.png`, `apps/web/public/brand/ninbi-symbol.png` | Comparar o favicon com a saída de `scripts/brand/crop-symbol.mjs` (mesmo recorte, dimensões esperadas) ou afirmar o hash/dimensões gerados pelo script | |
| C35 (web) fixa a ordem da entrada `bruno, Carla, Ana Souza` como a esperada na tela, que não é alfabética. A ordem alfabética só é provada pelo teste da API. Menor: se a UI passar a ordenar no cliente, este teste quebra; se a ordem do servidor quebrar, este teste não percebe | `apps/web/src/features/users/UsersTab.test.tsx:42-54` (esperado: `bruno`, `Carla`, `Ana Souza`); `apps/api/test/users/users.spec.ts:31-62` | Ou trocar a entrada do teste web por lista já ordenada e esperar a mesma ordem, ou documentar que a ordenação é contrato do servidor e manter o teste da API como prova | |

**Own examples** (rodados no HEAD como arquivo temporário em `packages/contracts/src`, apagado depois, nada commitado):
- nome de 61 emojis (61 caracteres, 122 unidades UTF-16) é aceito; 120 emojis também é aceito. O `.max(120)` do zod conta caracteres, então está de acordo com a spec.
- senha de 4 emojis (4 caracteres) é recusada pelo `.min(8)`, de acordo com a spec.
- Também conferido: nenhum rótulo em inglês no código de `apps/web/src` fora dos testes (grep por Create, Edit, Delete, Reset, Search, Dashboard, Home, Error, Save, Name, Email etc.).

Nenhum dos três exemplos apontou falha.

**Verificação de tela contra a captura**: dispensada (AD-023), não avaliada.

**Observações fora do veredito** (não são findings):
- `git status` mostra `M .specs/features/fundacao-auth/tasks.md` e `?? .specs/features/fundacao-auth/proofs.md`, que já estavam assim antes desta verificação. Não foram tocados aqui.
- AUTH-04 na API (`auth.spec.ts`) não prova sozinho a duração de 15 min; a prova está no `login-throttle.service.spec.ts`. Por isso C16 é `yes`.
- C59 (SHELL-10) é provado por classes (`h-screen overflow-hidden`, `overflow-y-auto overflow-x-hidden`), não por medição em 1024 px e 1920 px. As classes impedem rolagem horizontal, então é `yes`.
