# fundacao-auth proofs

**HEAD**: e8a5a81
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 98 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run smoke / ok FND-01 docker compose up responde a tela de login em http://localhost:8080` | pass |
| C1 | `run api / ✓ FND-01 serve o index.html do web em GET /` | pass |
| C2 | `run smoke / ok FND-02 neo4j carregou o dataset de exemplo no primeiro start` | pass |
| C2 | `run apiint / ✓ FND-02 seed carrega o dataset e não duplica ao rodar de novo` | pass |
| C3 | `run api / ✓ FND-03 health responde 200 com postgres up` | pass |
| C4 | `run api / ✓ FND-04 health responde 503 com postgres down` | pass |
| C5 | `run api / ✓ FND-05 log de requisição tem método, caminho, status e duração sem corpo, senha nem cookie` | pass |
| C6 | `run api / ✓ FND-06 LICENSE na raiz traz o texto da AGPL-3.0` | pass |
| C7 | `run web / ✓ SETUP-01 sem usuários mostra Criar administrador com Nome, E-mail, Senha e Confirmar senha` | pass |
| C8 | `run api / ✓ SETUP-02 cria o admin e inicia a sessão` | pass |
| C8 | `run web / ✓ SETUP-02 enviar o formulário válido abre a página inicial` | pass |
| C9 | `run api / ✓ SETUP-03 responde 409 quando já existe usuário` | pass |
| C9 | `run web / ✓ SETUP-03 com usuário existente mostra a tela de login` | pass |
| C10 | `run contracts / ✓ SETUP-04 senha com menos de 8 caracteres` | pass |
| C10 | `run web / ✓ SETUP-04 senha curta mantém o formulário e mostra a mensagem` | pass |
| C11 | `run contracts / ✓ SETUP-05 senhas diferentes` | pass |
| C11 | `run web / ✓ SETUP-05 senhas diferentes mostram As senhas não conferem` | pass |
| C12 | `run apiint / ✓ SETUP-06 dois envios simultâneos criam um único admin e um recebe 409` | pass |
| C13 | `run api / ✓ AUTH-01 login correto cria a sessão` | pass |
| C13 | `run web / ✓ AUTH-01 entrar com dados corretos abre a página inicial` | pass |
| C14 | `run api / ✓ AUTH-02 e-mail inexistente e senha errada dão a mesma resposta` | pass |
| C14 | `run web / ✓ AUTH-02 credenciais erradas mostram E-mail ou senha incorretos` | pass |
| C15 | `run contracts / ✓ AUTH-03 e-mail vazio ou inválido e senha vazia` | pass |
| C15 | `run web / ✓ AUTH-03 e-mail inválido ou senha vazia mostram a mensagem no campo sem enviar` | pass |
| C16 | `run api / ✓ AUTH-04 cinco erros em 15 minutos bloqueiam o e-mail por 15 minutos` | pass |
| C16 | `run web / ✓ AUTH-04 bloqueio mostra Muitas tentativas` | pass |
| C17 | `run web / ✓ AUTH-05 botão Entrar fica desabilitado durante o envio` | pass |
| C18 | `run api / ✓ AUTH-06 logout encerra a sessão` | pass |
| C18 | `run web / ✓ AUTH-06 Sair no menu do usuário mostra a tela de login` | pass |
| C19 | `run api / ✓ AUTH-07 rota protegida sem sessão válida responde 401` | pass |
| C20 | `run web / ✓ AUTH-08 401 leva ao login e depois do login abre a página pedida` | pass |
| C21 | `run api / ✓ AUTH-09 sessão sem uso por 7 dias é inválida` | pass |
| C22 | `run api / ✓ AUTH-10 guarda só o hash com sal da senha` | pass |
| C23 | `run api / ✓ AUTH-11 cookie de sessão é httpOnly` | pass |
| C24 | `run api / ✓ AUTH-12 usuário desativado recebe E-mail ou senha incorretos` | pass |
| C25 | `run web / ✓ AUTH-13 backend fora do ar mostra Não foi possível conectar ao servidor` | pass |
| C26 | `run contracts / ✓ ROLE-01 matriz de papéis` | pass |
| C26 | `run api / ✓ ROLE-01 cada papel recebe 200 ou 403 conforme a matriz` | pass |
| C27 | `run api / ✓ ROLE-02 Editor e Visualizador recebem 403 na API de usuários` | pass |
| C28 | `run web / ✓ ROLE-03 página não permitida mostra a mensagem de permissão com link para a página inicial` | pass |
| C29 | `run web / ✓ ROLE-04 só Admin vê Configurações na sidebar` | pass |
| C30 | `run api / ✓ ROLE-05 novo papel vale na próxima requisição` | pass |
| C30 | `run web / ✓ ROLE-05 trocar o papel mostra o novo papel na linha` | pass |
| C31 | `run web / ✓ CFG-01 clicar em Configurações mostra a página com a aba Usuários` | pass |
| C32 | `run web / ✓ CFG-02 abas na ordem Conexões, Usuários, LLM` | pass |
| C33 | `run web / ✓ CFG-03 aba escolhida fica na URL e continua aberta ao recarregar` | pass |
| C34 | `run web / ✓ CFG-04 Configurações é o último item da sidebar fora da área que rola` | pass |
| C35 | `run api / ✓ USR-01 lista em ordem alfabética de nome com e-mail, papel e situação` | pass |
| C35 | `run web / ✓ USR-01 aba Usuários mostra nome, e-mail, papel e situação` | pass |
| C36 | `run web / ✓ USR-02 linhas de esqueleto durante o carregamento` | pass |
| C37 | `run web / ✓ USR-03 erro mostra a mensagem e Tentar novamente recarrega` | pass |
| C38 | `run api / ✓ USR-04 cria usuário com senha provisória` | pass |
| C38 | `run web / ✓ USR-04 novo usuário enviado aparece na lista` | pass |
| C39 | `run api / ✓ USR-05 e-mail repetido sem diferenciar maiúsculas responde 409` | pass |
| C39 | `run web / ✓ USR-05 mostra Já existe um usuário com este e-mail` | pass |
| C40 | `run api / ✓ USR-06 senha provisória só permite definir a nova senha` | pass |
| C40 | `run web / ✓ USR-06 login com senha provisória exige nova senha antes da página inicial` | pass |
| C41 | `run api / ✓ USR-07 redefinir senha troca a senha e encerra as sessões` | pass |
| C41 | `run web / ✓ USR-07 Redefinir senha envia a senha provisória` | pass |
| C42 | `run web / ✓ USR-08 Desativar pede confirmação com o nome` | pass |
| C43 | `run api / ✓ USR-09 desativar marca Desativado e encerra as sessões` | pass |
| C43 | `run web / ✓ USR-09 confirmar a desativação mostra Desativado` | pass |
| C44 | `run api / ✓ USR-10 reativar marca Ativo` | pass |
| C44 | `run web / ✓ USR-10 Reativar mostra Ativo` | pass |
| C45 | `run api / ✓ USR-11 recusa deixar a instalação sem admin ativo` | pass |
| C45 | `run web / ✓ USR-11 mostra É preciso existir ao menos um administrador ativo` | pass |
| C46 | `run web / ✓ USR-12 Salvar fica desabilitado durante o envio` | pass |
| C47 | `run apiint / ✓ USR-13 criação simultânea com o mesmo e-mail cria um só` | pass |
| C48 | `run api / ✓ USR-14 nome ou e-mail acima de 120 caracteres são recusados` | pass |
| C48 | `run web / ✓ USR-14 nome longo mostra a mensagem no campo` | pass |
| C49 | `run api / ✓ USR-15 usuário desativado com sessão aberta recebe 401` | pass |
| C50 | `run web / ✓ SHELL-01 shell mostra sidebar, barra superior e área de conteúdo em tema escuro` | pass |
| C51 | `run web / ✓ SHELL-02 escolher Claro aplica o tema claro` | pass |
| C51 | `run web / ✓ SHELL-02 tema claro tem contraste de texto de ao menos 4,5:1` | pass |
| C52 | `run web / ✓ SHELL-03 escolher Escuro volta ao tema escuro` | pass |
| C53 | `run web / ✓ SHELL-04 reabrir aplica o último tema e o escuro sem escolha` | pass |
| C54 | `run web / ✓ SHELL-05 clicar em um item abre a página e marca o item como ativo` | pass |
| C55 | `run web / ✓ SHELL-06 bloco do usuário abre menu com Alterar senha e Sair` | pass |
| C56 | `run web / ✓ SHELL-07 sem dashboards a página inicial mostra Nenhum dashboard ainda` | pass |
| C57 | `run web / ✓ SHELL-08 temas escuro e claro definem os mesmos tokens` | pass |
| C57 | `run web / ✓ SHELL-08 nenhuma tela usa cor literal fora dos tokens` | pass |
| C58 | `run web / ✓ SHELL-09 telas não mostram rótulos em inglês` | pass |
| C59 | `run web / ✓ SHELL-10 sidebar fixa e só a área de conteúdo rola` | pass |
| C60 | `run web / ✓ SHELL-11 sidebar mostra o símbolo e NinBI com BI em ciano` | pass |
| C61 | `run web / ✓ SHELL-12 ícone da aba é o símbolo em estrela` | pass |
| C62 | `run web / ✓ SHELL-13 subtítulo da logo não aparece em nenhuma tela` | pass |
| C63 | `run web / ✓ SHELL-14 login mostra o símbolo e NinBI` | pass |
| C63 | `run web / ✓ SHELL-14 primeiro acesso mostra o símbolo e NinBI` | pass |
| C64 | `run web / ✓ SHELL-15 destaque usa o gradiente roxo para ciano sobre fundo quase preto` | pass |
| C65 | `run api / ✓ PWD-01 troca a senha com a senha atual correta` | pass |
| C65 | `run web / ✓ PWD-01 Alterar senha mostra Senha alterada` | pass |
| C66 | `run api / ✓ PWD-02 senha atual incorreta é recusada` | pass |
| C66 | `run web / ✓ PWD-02 mostra Senha atual incorreta` | pass |
| C67 | `run api / ✓ PWD-03 nova senha curta é recusada` | pass |
| C67 | `run web / ✓ PWD-03 nova senha curta mostra a mensagem e não envia` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run smoke` - exit 0

```
 Container ninbi-smoke-postgres-1 Removing 
 Container ninbi-smoke-postgres-1 Removed 
 Container ninbi-smoke-neo4j-1 Stopped 
 Container ninbi-smoke-neo4j-1 Removing 
 Container ninbi-smoke-neo4j-1 Removed 
 Volume ninbi-smoke_ninbi-pg Removing 
 Volume ninbi-smoke_ninbi-neo4j Removing 
 Network ninbi-smoke_default Removing 
 Volume ninbi-smoke_ninbi-neo4j Removed 
 Volume ninbi-smoke_ninbi-pg Removed 
 Network ninbi-smoke_default Removed 
 Image ninbi-smoke-neo4j-seed:latest Removing 
 Image ninbi-smoke-app:latest Removing 
 Image ninbi-smoke-neo4j-seed:latest Removed 
 Image ninbi-smoke-app:latest Removed
```

`Run api` - exit 0

```
 ✓ test/health/health.spec.ts > health > FND-04 health responde 503 com postgres down 2325ms
 ✓ test/auth/session.guard.spec.ts > SessionGuard > USR-06 senha provisória bloqueia outras rotas e libera me 2053ms
 ✓ test/web/web.spec.ts > servir o web pela API > FND-01 serve o index.html do web em GET / 2159ms
 ✓ test/auth/auth.spec.ts > login, logout e sessão atual > AUTH-12 usuário desativado recebe E-mail ou senha incorretos 1672ms
 ✓ test/auth/auth.spec.ts > login, logout e sessão atual > AUTH-03 corpo inválido responde 400 com a mensagem no campo 1344ms

 Test Files  17 passed (17)
      Tests  69 passed (69)
   Start at  06:39:11
   Duration  37.79s (tests 83%, import 16%, transform 1%)

$ vitest run --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

`Run apiint` - exit 0

```
      Tests  3 passed (3)
   Start at  06:39:56
   Duration  5.41s (import 64%, tests 26%, transform 10%)

$ node scripts/docker.mjs up
 Container ninbi-dev-neo4j-1 Running 
 Container ninbi-dev-postgres-1 Running 
 Container ninbi-dev-neo4j-1 Waiting 
 Container ninbi-dev-postgres-1 Waiting 
 Container ninbi-dev-neo4j-1 Healthy 
 Container ninbi-dev-postgres-1 Healthy 
$ vitest run --config vitest.int.config.ts --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.int.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

`Run web` - exit 0

```
 ✓ src/features/shell/AppShell.test.tsx > AppShell > SHELL-10 sidebar fixa e só a área de conteúdo rola 64ms
 ✓ src/features/users/UsersTab.test.tsx > UsersTab > USR-01 aba Usuários mostra nome, e-mail, papel e situação 326ms
 ✓ src/features/users/UsersTab.test.tsx > UsersTab > USR-02 linhas de esqueleto durante o carregamento 114ms
 ✓ src/features/users/UsersTab.test.tsx > UsersTab > USR-03 erro mostra a mensagem e Tentar novamente recarrega 195ms

 Test Files  17 passed (17)
      Tests  70 passed (70)
   Start at  06:40:05
   Duration  24.03s (import 34%, environment 31%, setup 16%, tests 14%, transform 4%)

Environment  jsdom was created 17 times · 77.18s total, 31% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

$ vitest run --reporter=verbose
```

`Run contracts` - exit 0

```
 ✓ src/schemas.spec.ts > newUserSchema > USR-14 e-mail com 121 caracteres é recusado no campo e 120 passa 0ms
 ✓ src/schemas.spec.ts > newUserSchema > USR-04 nome vazio, e-mail mal formado, papel inválido e senha curta 0ms
 ✓ src/schemas.spec.ts > newUserSchema > USR-04 dados válidos passam, com os três papéis 0ms
 ✓ src/schemas.spec.ts > changePasswordSchema > PWD-03 nova senha com menos de 8 caracteres 1ms
 ✓ src/schemas.spec.ts > changePasswordSchema > PWD-01 senha atual vazia é recusada e dados válidos passam 0ms
 ✓ src/schemas.spec.ts > initialPasswordSchema > USR-06 confirmação diferente e senha curta na senha definitiva 1ms
 ✓ src/schemas.spec.ts > resetPasswordSchema e changeRoleSchema > USR-07 senha provisória curta é recusada e válida passa 0ms
 ✓ src/schemas.spec.ts > resetPasswordSchema e changeRoleSchema > ROLE-05 papel inválido é recusado e papel válido passa 0ms

 Test Files  2 passed (2)
      Tests  43 passed (43)
   Start at  06:40:30
   Duration  359ms (import 51%, transform 35%, tests 9%, worker 5%)

$ vitest run --reporter=verbose
```
