# Fundação e Autenticação Tasks

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

A verificação de telas (screens sub-agent, imagens `*.running.png`, walk) está dispensada por AD-023: nenhuma task captura tela.

---

**Design**: `.specs/features/fundacao-auth/design.md`
**Status**: Approved
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run contracts**: `pnpm --filter @ninbi/contracts test`
**Run api**: `pnpm --filter @ninbi/api test`
**Run apiint**: `pnpm infra:up && pnpm --filter @ninbi/api test:int`
**Run web**: `pnpm --filter @ninbi/web test`
**Run smoke**: `pnpm smoke`

Cada check é provada pelos testes da task que lista o seu requisito no `Done when`; o nome do teste é o texto da linha de `Proof`. Todo script `test` e `test:int` roda `vitest run --reporter=verbose`. Todo nome de teste começa com o ID do requisito e contém, na ordem, as palavras da linha de `Proof` da sua check (sem o `✓`). Se o runner imprimir outro marcador de sucesso, a linha da check é corrigida a partir da saída real, nunca o teste.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `.specs/STATE.md` AD-012 (testes unitários das partes críticas, incluindo autenticação e permissões) e a orientação do usuário de 2026-11-16 (testes rápidos sem serviço externo; integração contra o `docker-compose.dev.yml`). Repo sem testes: strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contratos (matriz de papéis, schemas zod, mensagens) | unit | Toda linha da matriz; toda regra de campo com o texto exato da mensagem | `packages/contracts/src/**/*.spec.ts` | `pnpm --filter @ninbi/contracts test` |
| API: services, guards, middleware | integration (Nest + PGlite em memória) | Todos os ramos; 1:1 com os ACs; todo edge case listado | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: rotas | integration (supertest + PGlite) | Toda rota: sucesso + cada erro da tabela de erros do design | `apps/api/test/**/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| API: concorrência e infraestrutura real | integration (PostgreSQL e Neo4j do `docker-compose.dev.yml`) | Corridas SETUP-06 e USR-13; seed do Neo4j | `apps/api/test-int/**/*.int.spec.ts` | `pnpm infra:up && pnpm --filter @ninbi/api test:int` |
| Arquivos de instalação (LICENSE) | unit (leitura do arquivo) | FND-06 | `apps/api/test/infra/*.spec.ts` | `pnpm --filter @ninbi/api test` |
| Compose de produção | e2e (smoke com Docker) | FND-01 e FND-02 no primeiro start | `scripts/smoke-compose.mjs` | `pnpm smoke` |
| Web: páginas e componentes | unit (Testing Library + jsdom + user-event + MSW) | Gesto do critério + o que a tela mostra; toda mensagem da spec com o texto exato | `apps/web/src/**/*.test.tsx` | `pnpm --filter @ninbi/web test` |
| Web: tokens do tema | unit | Paridade de tokens, contraste, paleta | `apps/web/src/theme/*.test.ts` | `pnpm --filter @ninbi/web test` |
| Scaffolding, config, assets, Dockerfile | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from the design - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task com testes de um só pacote | `pnpm --filter <pacote da task> test` (`@ninbi/contracts`, `@ninbi/api` ou `@ninbi/web`) |
| Full | Task com teste de integração real ou smoke | `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int` (e `pnpm smoke` na T27) |
| Build | Última task de cada fase, e tasks sem testes | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

`pnpm test` na raiz é `pnpm -r test`. Antes da T1 nenhum comando existe: o build é vermelho por definição (greenfield), e a T1 é a task que o cria.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Lotes de execução

| Lote | Fases | Tasks | Modelo |
| ---- | ----- | ----- | ------ |
| 1 | Phase 1 - Scaffolding | T1-T7 (7) | haiku |
| 2 | Phase 2 - Base da API | T8-T14 (7) | sonnet |
| 3 | Phase 3 - Autenticação na API | T15-T21 (7) | sonnet |
| 4 | Phase 4 - Usuários e instalação | T22-T28 (7) | sonnet |
| 5 | Phase 5 - Base do web | T29-T35 (7) | sonnet |
| 6 | Phase 6 - Shell e Configurações | T36-T42 (7) | sonnet |
| 7 | Phase 7 - Gestão de usuários no web | T43-T45 (3) | sonnet |

### Phase 1: Scaffolding

Monorepo, apps vazios que compilam, componentes do shadcn, assets da marca e serviços de desenvolvimento. Sem testes.

```
T1 → T2 → T3 → T7
T2 → T4 → T5
T4 → T6
```

### Phase 2: Base da API

Contratos compartilhados, banco, health, log, hash de senha e sessões.

```
T8
T9
T10 → T11 → T12
T10 → T14
T13
```

### Phase 3: Autenticação na API

```
T15 → T16 → T17 → T18
T17 → T19
T17 → T20
T17 → T21
```

### Phase 4: Usuários e instalação

```
T22 → T23 → T24
T25 → T27
T26 → T27
T28
```

### Phase 5: Base do web

```
T29 → T30
T29 → T33
T31 → T32 → T34
T32 → T35
T33 → T34
T33 → T35
```

### Phase 6: Shell e Configurações

```
T36 → T38
T37 → T38 → T41 → T42
T37 → T39
T40
```

### Phase 7: Gestão de usuários no web

```
T43 → T44 → T45
```

---

## Task Breakdown

### Phase 1 tasks: Scaffolding

### T1: Criar o workspace pnpm na raiz

**What**: Raiz do monorepo: `package.json` (privado, `engines` Node 24 e pnpm 11, `packageManager`, scripts `build: pnpm -r build`, `typecheck: pnpm -r typecheck`, `lint: biome check .`, `format: biome format --write .`, `test: pnpm -r test`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `tsconfig.base.json` (strict, ES2023, `skipLibCheck`), `biome.json` (ignora `dist`, `drizzle`, `node_modules`, `.specs`, `src/components/ui`), `.gitignore` (acrescenta `node_modules`, `dist`, `coverage`, `.env`), `.nvmrc` com `24`.
**Where**: raiz do repositório
**Depends on**: None
**Reuses**: design.md, "Estrutura de pastas"
**Requirement**: FND-01

**Done when**:

- [x] `pnpm install` termina sem erro
- [x] `pnpm lint` passa
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build
**Model**: haiku
**Commit**: `chore(repo): create pnpm workspace with biome and base tsconfig`

---

### T2: Criar o pacote `@ninbi/contracts`

**What**: `packages/contracts` com `package.json` (`name: @ninbi/contracts`, `exports` com `import` → `dist/index.js`, `require` → `dist/index.cjs`, `types` → `dist/index.d.ts`; scripts `build: tsup src/index.ts --format esm,cjs --dts --clean`, `typecheck: tsc --noEmit`, `test: vitest run --reporter=verbose`), `tsconfig.json`, `vitest.config.ts` com `passWithNoTests: true`, `src/index.ts` vazio exportando `{}`. Dependência `zod`.
**Where**: `packages/contracts/`
**Depends on**: T1
**Reuses**: `tsconfig.base.json`
**Requirement**: ROLE-01

**Done when**:

- [x] `pnpm --filter @ninbi/contracts build` gera `dist/index.js`, `dist/index.cjs` e `dist/index.d.ts`
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build
**Model**: haiku
**Commit**: `chore(contracts): scaffold shared contracts package`

---

### T3: Criar o app NestJS `@ninbi/api`

**What**: `apps/api` com NestJS 11 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `cookie-parser`, `zod`, `@ninbi/contracts` como `workspace:*`); `src/main.ts`, `src/app.module.ts`, `src/app.factory.ts` (`configureApp(app)`: `setGlobalPrefix('api')`, `cookieParser()`), `src/config/env.ts` (zod: `PORT` padrão `8080`, `DATABASE_URL`, `NINBI_COOKIE_SECURE` padrão `false`, `WEB_DIST_DIR` opcional); `tsconfig.json` (`module`/`moduleResolution` `nodenext`, `experimentalDecorators`, `emitDecoratorMetadata`, sem `"type": "module"`), `tsconfig.build.json` (exclui testes); `nest-cli.json`; scripts `build: tsc -p tsconfig.build.json`, `start: node dist/main.js`, `dev: nest start --watch`, `typecheck: tsc --noEmit`, `test: vitest run --reporter=verbose`, `test:int: vitest run --config vitest.int.config.ts --reporter=verbose`; `vitest.config.ts` com `unplugin-swc` (`swc.vite()`), `include: ['test/**/*.spec.ts']`, alias `@ninbi/contracts` → `../../packages/contracts/src/index.ts`, `passWithNoTests: true`; `vitest.int.config.ts` igual com `include: ['test-int/**/*.int.spec.ts']`, `fileParallelism: false`, `testTimeout: 60000`. Dev deps: `vitest`, `unplugin-swc`, `@swc/core`, `supertest`, `@types/supertest`, `@nestjs/testing`, `@nestjs/cli`, `typescript`.
**Where**: `apps/api/`
**Depends on**: T2
**Reuses**: design.md, "Components / configureApp"
**Requirement**: FND-01

**Done when**:

- [x] `pnpm --filter @ninbi/api build` gera `dist/main.js`
- [x] `pnpm --filter @ninbi/api test` e `test:int` saem com 0 sem testes
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build
**Model**: haiku
**Commit**: `chore(api): scaffold nestjs app with vitest and swc`

---

### T4: Criar o app Vite `@ninbi/web`

**What**: `apps/web` com Vite + React 19 + TypeScript (`"type": "module"`), Tailwind CSS v4 (`@tailwindcss/vite`), alias `@/` → `src/`, alias `@ninbi/contracts` → `../../packages/contracts/src/index.ts`, proxy de `/api` para `http://localhost:8080`; `index.html` com `lang="pt-BR"` e `<title>NinBI</title>`; `src/main.tsx` e `src/styles/index.css` (`@import "tailwindcss"`); dependências `react-router`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `lucide-react`, `@fontsource-variable/plus-jakarta-sans`; dev deps `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw`; `vitest.config.ts` (jsdom, `setupFiles: ['src/test/setup.ts']`, `passWithNoTests: true`); `src/test/setup.ts` (jest-dom, `server.listen({ onUnhandledRequest: 'error' })`, `resetHandlers`, `close`, `localStorage.clear()` entre testes); `src/test/server.ts` (MSW `setupServer()` sem handlers); scripts `build: tsc -b && vite build`, `dev: vite`, `typecheck: tsc -b --noEmit` (ou `tsc --noEmit -p tsconfig.app.json`), `test: vitest run --reporter=verbose`.
**Where**: `apps/web/`
**Depends on**: T2
**Reuses**: design.md, "Rotas do frontend" e "Test Strategy"
**Requirement**: SHELL-08

**Done when**:

- [x] `pnpm --filter @ninbi/web build` gera `apps/web/dist/index.html`
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build
**Model**: haiku
**Commit**: `chore(web): scaffold vite react app with tailwind and vitest`

---

### T5: Inicializar o shadcn/ui e adicionar os componentes

**What**: `components.json` (estilo new-york, CSS variables, `baseColor` neutral, aliases `@/components`, `@/lib/utils`), `src/lib/utils.ts` (`cn`) e os componentes `button`, `input`, `label`, `card`, `dialog`, `alert-dialog`, `dropdown-menu`, `tabs`, `table`, `skeleton`, `avatar`, `badge`, `select`, `form`, `sonner`, gerados com `pnpm dlx shadcn@latest add ...` dentro de `apps/web`. Não editar o CSS de tema gerado além do necessário para compilar: os tokens chegam na T29.
**Where**: `apps/web/src/components/ui/`
**Depends on**: T4
**Reuses**: shadcn/ui CLI
**Requirement**: SHELL-08

**Done when**:

- [x] Os 15 componentes existem em `apps/web/src/components/ui/`
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build
**Model**: haiku
**Commit**: `chore(web): add shadcn ui components`

---

### T6: Recortar o símbolo da logo e criar o favicon

**What**: Script `scripts/brand/crop-symbol.mjs` (dev dep `sharp` na raiz) que lê `brand/ninbi-logo.jpg`, recorta a estrela (região aproximada x 230-910, y 240-880 na imagem de 2000 px de largura; conferir abrindo o resultado), transforma o fundo escuro em transparência com alfa proporcional à luminância (canal máximo) e grava `apps/web/public/brand/ninbi-symbol.png` (256×256) e `apps/web/public/favicon.png` (64×64). Em `apps/web/index.html`, `<link rel="icon" type="image/png" href="/favicon.png">`. Script na raiz `brand:symbol`.
**Where**: `scripts/brand/crop-symbol.mjs`
**Depends on**: T4
**Reuses**: `brand/ninbi-logo.jpg`
**Requirement**: SHELL-11, SHELL-12

**Done when**:

- [x] Os dois PNGs existem, com fundo transparente e a estrela inteira, sem a palavra "NinBI" nem o subtítulo
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build
**Model**: haiku
**Commit**: `chore(brand): crop ninbi star symbol and favicon from logo`

---

### T7: Criar os serviços de desenvolvimento no Docker

**What**: `docker-compose.dev.yml` (projeto `name: ninbi-dev`): `postgres` (`postgres:17-alpine`, usuário/senha/banco `ninbi`, porta `55432:5432`, volume nomeado `ninbi-dev-pg`, healthcheck `pg_isready`), `neo4j` (`neo4j:5-community`, `NEO4J_AUTH=neo4j/ninbi-dev-password`, portas `7475:7474` e `7688:7687`, volume `ninbi-dev-neo4j`, healthcheck `cypher-shell ... "RETURN 1"`), `neo4j-seed` (mesma imagem, `profiles: ["seed"]`, monta `./infra/neo4j` em `/seed`, roda `cypher-shell -a bolt://neo4j:7687 -u neo4j -p ninbi-dev-password -f /seed/seed.cypher`). `scripts/docker.mjs`: acha o executável `docker` no `PATH` ou em `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe` e `%ProgramFiles%\Docker\Docker\resources\bin\docker.exe`; subcomandos `up` (`compose -f docker-compose.dev.yml up -d --wait postgres neo4j`, depois `compose ... run --rm neo4j-seed` só quando `infra/neo4j/seed.cypher` existe) e `down` (`compose ... stop`, sem apagar volumes). Scripts na raiz `infra:up` e `infra:down`. `apps/api/.env.example` com `DATABASE_URL=postgres://ninbi:ninbi@localhost:55432/ninbi`.
**Where**: `docker-compose.dev.yml`
**Depends on**: T3
**Reuses**: design.md, "Ambiente e Docker"
**Requirement**: FND-01

**Done when**:

- [x] `pnpm infra:up` termina com 0 e roda de novo sem recriar containers
- [x] Nenhuma imagem além de `postgres:17-alpine` e `neo4j:5-community` foi baixada
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build
**Model**: haiku
**Commit**: `chore(infra): add long-lived dev compose for postgres and neo4j`

---

### Phase 2 tasks: Base da API

### T8: Definir papéis e a matriz de permissões

**What**: `ROLES`, `ROLE_LABELS`, `Permission`, `ROLE_PERMISSIONS` e `can(role, permission)` conforme a matriz da spec e o design.
**Where**: `packages/contracts/src/roles.ts`
**Depends on**: T2
**Reuses**: design.md, "Papéis e permissões"
**Requirement**: ROLE-01

**Done when**:

- [x] Teste `ROLE-01 matriz de papéis` confere cada célula da matriz da spec (9 permissões × 3 papéis)
- [x] Gate check passes: `pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(contracts): add roles and permission matrix`

---

### T9: Definir schemas de validação, mensagens e códigos de erro

**What**: `MESSAGES` com todos os textos da spec, `ERROR_CODES`, `ApiErrorBody`, DTOs (`SessionUserDto`, `UserDto`) e os schemas zod `loginSchema`, `setupAdminSchema` (senha ≥ 8, confirmação igual), `newUserSchema` (nome e e-mail ≤ 120, e-mail válido, papel, senha provisória ≥ 8), `changePasswordSchema`, `initialPasswordSchema`, `resetPasswordSchema`, `changeRoleSchema`, cada erro com a mensagem exata da spec. Exportar tudo em `src/index.ts`.
**Where**: `packages/contracts/src/schemas.ts`
**Depends on**: T2
**Reuses**: `zod`
**Requirement**: SETUP-04, SETUP-05, AUTH-03, USR-14, PWD-03

**Done when**:

- [x] Testes cobrem, com o texto exato: senha curta ("A senha precisa ter ao menos 8 caracteres"), senhas diferentes ("As senhas não conferem"), e-mail vazio e mal formado, senha vazia, nome e e-mail com 121 caracteres, e os casos válidos
- [x] Gate check passes: `pnpm --filter @ninbi/contracts build && pnpm --filter @ninbi/contracts test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(contracts): add validation schemas, messages and error codes`

---

### T10: Criar o schema do banco e as migrações

**What**: Tabelas `users`, `sessions`, `login_throttle`, `installation` em Drizzle conforme "Data Models"; `drizzle.config.ts`; migração SQL gerada em `apps/api/drizzle/`; `DatabaseModule` (token `DB`, `node-postgres` a partir de `DATABASE_URL`); `runMigrations(db)`; `test/db.ts` com `createTestDb()` (PGlite em memória + migrações). Teste: migrações aplicam no PGlite e o índice `lower(email)` recusa `Ana@x.com` depois de `ana@x.com`.
**Where**: `apps/api/src/database/schema.ts`
**Depends on**: T3
**Reuses**: `drizzle-orm/pglite`, `drizzle-orm/pglite/migrator`
**Requirement**: USR-05, USR-13

**Done when**:

- [x] `drizzle-kit generate` não gera diferença depois do commit
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add drizzle schema and initial migration`

---

### T11: Criar o health check e o harness de teste da API

**What**: `HealthController` (`GET /api/health`, `@Public` ainda não existe: rota simples) e `test/harness.ts` com `createTestApp(opts?)` (PGlite novo, Nest com `DB` sobrescrito, `configureApp`, `Clock` falso controlável, retorna `{ app, db, clock, http: supertest.agent }`). Testes FND-03 (200, `postgres: 'up'`) e FND-04 (`DB` cujo `execute` rejeita → 503, `postgres: 'down'`).
**Where**: `apps/api/src/health/health.controller.ts`
**Depends on**: T10
**Reuses**: `createTestDb()`
**Requirement**: FND-03, FND-04

**Done when**:

- [x] Testes `FND-03 health responde 200 com postgres up` e `FND-04 health responde 503 com postgres down` passam
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add health endpoint and test harness`

---

### T12: Registrar cada requisição HTTP em log

**What**: `HttpLoggingMiddleware` aplicado a todas as rotas em `configureApp`: uma linha `<MÉTODO> <caminho sem query> <status> <n>ms` por resposta, via `Logger('HTTP')`.
**Where**: `apps/api/src/common/http-logging.middleware.ts`
**Depends on**: T11
**Reuses**: `createTestApp`
**Requirement**: FND-05

**Done when**:

- [x] Teste envia `POST /api/health?token=abc` com corpo `{"password":"segredo123"}` e cookie `ninbi_session=xyz`, captura as linhas do logger e confere método, caminho `/api/health`, status e duração, e a ausência de `segredo123`, `xyz`, `token=abc` e `password`
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): log method, path, status and duration per request`

---

### T13: Criar o hash de senhas

**What**: `PasswordHasher` com `scrypt` de `node:crypto` no formato do design; `verify` com `timingSafeEqual`.
**Where**: `apps/api/src/auth/password-hasher.ts`
**Depends on**: T3
**Reuses**: design.md, "Senhas"
**Requirement**: AUTH-10

**Done when**:

- [x] Testes: o hash não contém a senha; duas chamadas com a mesma senha dão hashes diferentes (sal); `verify` aceita a certa e recusa outra
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add salted scrypt password hasher`

---

### T14: Criar o serviço de sessões

**What**: `SessionService` (`create`, `resolve`, `revoke`, `revokeAllForUser`) e `Clock` injetável (`apps/api/src/common/clock.ts`), conforme o design: token aleatório, banco guarda `sha256`, expiração deslizante de 7 dias por `last_used_at`, `resolve` nulo para usuário desativado.
**Where**: `apps/api/src/auth/session.service.ts`
**Depends on**: T10
**Reuses**: `createTestDb()`
**Requirement**: AUTH-09

**Done when**:

- [x] Testes: sessão usada há 6 dias e 23 h resolve; há 7 dias e 1 min não resolve; o uso renova o prazo; o banco não guarda o token em texto; `revokeAllForUser` derruba todas
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): add server-side sessions with 7-day sliding expiry`

---

### Phase 3 tasks: Autenticação na API

### T15: Criar o limite de tentativas de login

**What**: `LoginThrottleService` (`isLocked`, `registerFailure`, `reset`) sobre `login_throttle`, com e-mail em minúsculas e `Clock`.
**Where**: `apps/api/src/auth/login-throttle.service.ts`
**Depends on**: T10, T14
**Reuses**: `createTestDb()`, `Clock`
**Requirement**: AUTH-04

**Done when**:

- [x] Testes: 4 falhas não bloqueiam; a 5ª em 15 min bloqueia; continua bloqueado aos 14 min 59 s; libera aos 15 min; falhas espalhadas por mais de 15 min não bloqueiam; `ANA@x.com` e `ana@x.com` contam juntos
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add per-email login throttle`

---

### T16: Criar login, logout e sessão atual

**What**: `AuthService` e `AuthController` com `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`; cookie `ninbi_session` (`httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` por `NINBI_COOKIE_SECURE`, `maxAge` 7 dias); `ZodValidationPipe` e `AppErrorFilter` (corpo `{ code, message, fieldErrors }`); hash fictício quando o e-mail não existe. Nesta task `me` e `logout` leem o cookie direto; o guard global chega na T17.
**Where**: `apps/api/src/auth/auth.controller.ts`
**Depends on**: T15, T13, T14, T9
**Reuses**: `PasswordHasher`, `SessionService`, `LoginThrottleService`, schemas de `@ninbi/contracts`
**Requirement**: AUTH-01, AUTH-02, AUTH-04, AUTH-06, AUTH-10, AUTH-11, AUTH-12

**Done when**:

- [x] Testes de rota: AUTH-01 (200, cookie, `me` devolve o usuário), AUTH-02 (e-mail inexistente e senha errada dão o mesmo 401 e a mesma mensagem), AUTH-04 (6ª tentativa, mesmo com a senha certa, dá 429 com "Muitas tentativas. Tente novamente em 15 minutos."), AUTH-06 (logout apaga a sessão: o mesmo cookie dá 401 em `me`), AUTH-10 (a coluna `password_hash` não contém a senha), AUTH-11 (`Set-Cookie` tem `HttpOnly`), AUTH-12 (desativado recebe 401 "E-mail ou senha incorretos")
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): add login, logout and current session endpoints`

---

### T17: Exigir sessão válida em toda rota

**What**: `SessionGuard` global (`APP_GUARD`), `@Public()` e `@CurrentUser()`. Marcar como públicas health e login. Papel e situação lidos do banco a cada requisição; cookie reemitido a cada uso. Com `mustChangePassword`, só `me`, `initial-password` e `logout` passam; o resto responde 403 `PASSWORD_CHANGE_REQUIRED`.
**Where**: `apps/api/src/auth/session.guard.ts`
**Depends on**: T16
**Reuses**: `SessionService`
**Requirement**: AUTH-07, AUTH-09, USR-06, USR-15, ROLE-05

**Done when**:

- [x] Testes: AUTH-07 (rota protegida sem cookie e com cookie forjado dá 401), AUTH-09 (relógio avança 7 dias e 1 min: 401), USR-15 (usuário desativado direto no banco com a sessão aberta: próxima requisição 401), ROLE-05 (papel trocado no banco: a próxima resposta de `me` traz o papel novo), USR-06 backend (usuário com senha provisória recebe 403 em outra rota e 200 em `me`)
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): require a valid session on every protected route`

---

### T18: Aplicar a matriz de papéis nas rotas

**What**: `@RequirePermission(permission)` e `PermissionGuard` global depois do `SessionGuard`, usando `can()` de `@ninbi/contracts`; 403 `FORBIDDEN`.
**Where**: `apps/api/src/auth/permission.guard.ts`
**Depends on**: T17, T8
**Reuses**: `ROLE_PERMISSIONS`
**Requirement**: ROLE-01, ROLE-02

**Done when**:

- [x] Teste com um controller só de teste, uma rota por permissão: cada papel recebe 200 ou 403 exatamente como a matriz manda (ROLE-01)
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): enforce the role permission matrix on routes`

---

### T19: Criar o primeiro administrador

**What**: `SetupService` e `SetupController` (`GET /api/setup/status`, `POST /api/setup/admin`, ambos `@Public`), inserindo `installation (id = 1)` e o Admin na mesma transação e abrindo a sessão. Também cria o harness de integração real `apps/api/test-int/harness.ts`: cria o banco `ninbi_test_<aleatório>` no PostgreSQL de `postgres://ninbi:ninbi@localhost:55432/postgres`, aplica as migrações, sobe o app com pool `node-postgres` (mínimo 4 conexões) e apaga o banco no fim.
**Where**: `apps/api/src/setup/setup.service.ts`
**Depends on**: T17
**Reuses**: `PasswordHasher`, `SessionService`, `createTestApp`
**Requirement**: SETUP-02, SETUP-03, SETUP-06

**Done when**:

- [x] Testes rápidos: SETUP-02 (201, papel `ADMIN`, cookie, `me` responde), SETUP-03 (com usuário já existente, 409 `SETUP_ALREADY_DONE`), status `needsSetup` antes e depois
- [x] Teste de integração `test-int/setup.int.spec.ts`: SETUP-06 (dois `POST` simultâneos com `Promise.all`: um 201, um 409, um só usuário na tabela)
- [x] Gate check passes: `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `feat(api): add first administrator setup`

---

### T20: Alterar a própria senha

**What**: `POST /api/auth/password` `{ currentPassword, newPassword }`.
**Where**: `apps/api/src/auth/auth.controller.ts` (modify)
**Depends on**: T17
**Reuses**: `PasswordHasher`, `changePasswordSchema`
**Requirement**: PWD-01, PWD-02, PWD-03

**Done when**:

- [x] Testes: PWD-01 (204; login com a nova funciona e com a antiga não), PWD-02 (400 "Senha atual incorreta", senha inalterada), PWD-03 (400 com "A senha precisa ter ao menos 8 caracteres" no campo)
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): let users change their own password`

---

### T21: Definir a senha definitiva depois da provisória

**What**: `POST /api/auth/initial-password` `{ newPassword, confirmPassword }`: troca a senha e zera `mustChangePassword`; 409 quando a senha não é provisória.
**Where**: `apps/api/src/auth/auth.controller.ts` (modify)
**Depends on**: T17
**Reuses**: `initialPasswordSchema`
**Requirement**: USR-06

**Done when**:

- [x] Testes: USR-06 (usuário com senha provisória define a nova e, em seguida, acessa uma rota antes bloqueada), confirmação diferente dá 400, chamada sem senha provisória dá 409
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: build
**Model**: sonnet
**Commit**: `feat(api): require replacing a temporary password`

---

### Phase 4 tasks: Usuários e instalação

### T22: Listar e criar usuários

**What**: `UsersService` e `UsersController`: `GET /api/users` (ordem `lower(name), name`) e `POST /api/users` (senha provisória, `mustChangePassword = true`, 409 `EMAIL_TAKEN` pela violação do índice), com `@RequirePermission('users.manage')`.
**Where**: `apps/api/src/users/users.controller.ts`
**Depends on**: T18
**Reuses**: `newUserSchema`, `PasswordHasher`
**Requirement**: USR-01, USR-04, USR-05, USR-13, USR-14, ROLE-02

**Done when**:

- [x] Testes rápidos: USR-01 ("bruno", "Ana", "Carla" voltam como Ana, bruno, Carla com e-mail, papel e situação), USR-04 (201 e o usuário aparece na lista com `mustChangePassword`), USR-05 (`ANA@x.com` depois de `ana@x.com` dá 409 "Já existe um usuário com este e-mail"), USR-14 (nome e e-mail com 121 caracteres dão 400 com a mensagem no campo), ROLE-02 (Editor e Visualizador recebem 403 em `GET` e `POST /api/users`)
- [x] Teste de integração `test-int/users.int.spec.ts`: USR-13 (dois `POST` simultâneos com o mesmo e-mail: um 201, um 409 com a mensagem, um só usuário)
- [x] Gate check passes: `pnpm test && pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `feat(api): list and create users`

---

### T23: Trocar papel e redefinir senha

**What**: `PATCH /api/users/:id/role` e `POST /api/users/:id/reset-password` (nova senha provisória, `mustChangePassword = true`, sessões apagadas).
**Where**: `apps/api/src/users/users.service.ts` (modify)
**Depends on**: T22
**Reuses**: `SessionService.revokeAllForUser`
**Requirement**: USR-07, ROLE-05

**Done when**:

- [x] Testes: USR-07 (a sessão aberta do usuário passa a dar 401; login com a nova senha provisória funciona e exige troca), troca de papel pela rota (Admin muda um Editor para Visualizador; `GET /api/auth/me` da sessão aberta desse usuário já devolve `VIEWER`, e uma rota de teste com `dashboards.create` passa de 200 para 403)
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): change user role and reset password`

---

### T24: Desativar e reativar usuários, protegendo o último Admin

**What**: `POST /api/users/:id/deactivate` (sessões apagadas) e `POST /api/users/:id/reactivate`; regra do último Admin ativo, em transação com `FOR UPDATE`, aplicada também à troca de papel da T23.
**Where**: `apps/api/src/users/users.service.ts` (modify)
**Depends on**: T23
**Reuses**: `SessionService.revokeAllForUser`
**Requirement**: USR-09, USR-10, USR-11, USR-15

**Done when**:

- [x] Testes: USR-09 (situação `DISABLED`, sessão do usuário dá 401, login recusado), USR-10 (volta a `ACTIVE` e entra), USR-11 (único Admin ativo: desativar a si mesmo e trocar o próprio papel dão 409 "É preciso existir ao menos um administrador ativo"; com dois Admins, desativar um funciona)
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): deactivate and reactivate users keeping one active admin`

---

### T25: Servir o web pela API

**What**: `WebModule` com `@nestjs/serve-static` servindo `WEB_DIST_DIR` com fallback para `index.html`, sem capturar `/api`.
**Where**: `apps/api/src/web/web.module.ts`
**Depends on**: T11
**Reuses**: `createTestApp`
**Requirement**: FND-01

**Done when**:

- [x] Teste com um diretório temporário contendo `index.html`: `GET /` e `GET /configuracoes/usuarios` devolvem o HTML; `GET /api/rota-inexistente` devolve 404 JSON, não o HTML
- [x] Gate check passes: `pnpm --filter @ninbi/api test`

**Tests**: integration
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(api): serve the web build with spa fallback`

---

### T26: Criar o dataset de exemplo do Neo4j

**What**: `infra/neo4j/seed.cypher` com o dataset "Varejo" do design (12 lojas com `latitude`/`longitude`, 6 categorias, 60 produtos, 200 clientes, 2.000 pedidos com `data` do tipo `date` em 24 meses e `valorTotal`), determinístico, idempotente pelo marcador `(:NinbiSeed {versao: 1})` (todas as criações condicionadas à ausência do marcador). Teste de integração com `neo4j-driver` contra o Neo4j do compose de dev (`bolt://localhost:7688`).
**Where**: `infra/neo4j/seed.cypher`
**Depends on**: T7
**Reuses**: `docker-compose.dev.yml` (`neo4j-seed`)
**Requirement**: FND-02

**Done when**:

- [x] Teste `test-int/neo4j-seed.int.spec.ts`: depois de `pnpm infra:up`, as contagens são 12/6/60/200/2.000, toda loja tem latitude e longitude numéricas, `data` é `Date`; executar as instruções do arquivo de novo pelo driver não muda nenhuma contagem
- [x] Gate check passes: `pnpm infra:up && pnpm --filter @ninbi/api test:int`

**Tests**: integration
**Gate**: full
**Model**: sonnet
**Commit**: `feat(infra): add idempotent retail sample dataset for neo4j`

---

### T27: Empacotar o app e o compose de produção, com smoke test

**What**: `Dockerfile` multi-stage (base `node:24-alpine`, `corepack enable`, `pnpm install --frozen-lockfile`, `pnpm build`, imagem final só com `apps/api/dist`, `apps/api/drizzle`, `apps/web/dist` e dependências de produção; entrypoint aplica migrações e roda `node dist/main.js`; `WEB_DIST_DIR` apontando para o web), `.dockerignore`, `docker-compose.yml` (`app` com `ports: "${NINBI_PORT:-8080}:8080"` e `depends_on: postgres: condition: service_healthy`; `postgres:17-alpine`; `neo4j:5-community` com portas 7474 e 7687; `neo4j-seed` sem profile, `depends_on: neo4j: condition: service_healthy`, `restart: "no"`), e `scripts/smoke-compose.mjs` (script `smoke` na raiz): usa `scripts/docker.mjs`, sobe com `compose -p ninbi-smoke up -d --build`, espera até 180 s por `GET http://localhost:8080/api/health` 200, confere `GET /` e consulta o Neo4j por `compose exec -T neo4j cypher-shell`; imprime uma linha `ok <ID> <descrição>` por verificação ou `not ok ...` e sai com 1; sempre termina com `compose -p ninbi-smoke down -v` e `docker image prune -f`.
**Where**: `scripts/smoke-compose.mjs`
**Depends on**: T25, T26
**Reuses**: `scripts/docker.mjs`, `infra/neo4j/seed.cypher`
**Requirement**: FND-01, FND-02, FND-03

**Done when**:

- [ ] `pnpm smoke` imprime `ok FND-01 docker compose up responde a tela de login em http://localhost:8080` (HTML com `<div id="root">` e título NinBI), `ok FND-03 api health responde 200 com postgres up` e `ok FND-02 neo4j carregou o dataset de exemplo no primeiro start` (12 lojas com latitude)
- [ ] Depois do smoke, `docker image ls` não tem imagens soltas (`<none>`) e os volumes `ninbi-smoke_*` não existem
- [ ] Gate check passes: `pnpm test && pnpm smoke`

**Tests**: e2e
**Gate**: full
**Model**: sonnet
**Commit**: `feat(infra): add dockerfile, production compose and smoke test`

---

### T28: Adicionar a licença AGPL-3.0

**What**: `LICENSE` na raiz com o texto oficial e integral da GNU AGPL v3 (copiado de `https://www.gnu.org/licenses/agpl-3.0.txt` ou do pacote `spdx-license-list`, sem edição), `"license": "AGPL-3.0-only"` nos `package.json`, e o teste que lê o arquivo.
**Where**: `LICENSE`
**Depends on**: None
**Reuses**: nenhum
**Requirement**: FND-06

**Done when**:

- [ ] Teste `apps/api/test/infra/license.spec.ts` confere que `LICENSE` existe na raiz, começa com "GNU AFFERO GENERAL PUBLIC LICENSE", contém "Version 3, 19 November 2007" e "END OF TERMS AND CONDITIONS"
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `chore(repo): add agpl-3.0 license`

---

### Phase 5 tasks: Base do web

### T29: Criar os tokens do tema

**What**: `apps/web/src/styles/theme.css` com os tokens do design em hexadecimal (`:root` claro, `.dark` escuro), `@theme inline` para o Tailwind, fonte Plus Jakarta Sans; substitui o CSS de tema gerado pelo shadcn. `apps/web/src/theme/contrast.ts` com `contrastRatio(hexA, hexB)` (WCAG 2.x). Testes leem o CSS como texto.
**Where**: `apps/web/src/styles/theme.css`
**Depends on**: T5
**Reuses**: design.md, "Tema e tokens"
**Requirement**: SHELL-02, SHELL-08, SHELL-15

**Done when**:

- [ ] Testes: SHELL-08 (`:root` e `.dark` definem exatamente o mesmo conjunto de tokens; nenhum `.tsx` fora de `components/ui` tem cor literal `#rgb`/`#rrggbb`/`rgb(`), SHELL-02 (no claro, `foreground`, `muted-foreground` e `accent-text` sobre `background` e `card` têm contraste ≥ 4,5:1, e `primary-foreground` sobre `brand-cyan` e `brand-purple` também), SHELL-15 (`--gradient-brand` vai de `--brand-purple` a `--brand-cyan`; `--background` escuro tem luminância < 0,01; nenhum token tem verde dominante, G > R e G > B com saturação alta)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add dark and light theme tokens from the logo palette`

---

### T30: Alternar e lembrar o tema

**What**: `ThemeProvider` e `useTheme` (classe `dark` em `<html>`, `localStorage['ninbi-theme']`, escuro sem escolha) e o script anti-flash inline em `index.html`.
**Where**: `apps/web/src/theme/ThemeProvider.tsx`
**Depends on**: T29
**Reuses**: nenhum
**Requirement**: SHELL-03, SHELL-04

**Done when**:

- [ ] Testes: SHELL-04 (sem valor guardado, `<html>` tem `dark`; com `light` guardado, não tem; remontar o provider mantém a última escolha), SHELL-03 (`setTheme('light')` e depois `setTheme('dark')` devolve a classe `dark` e grava `dark`)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add theme provider persisted in local storage`

---

### T31: Criar o cliente HTTP e a sessão no web

**What**: `apiFetch`, `ApiError` e `onUnauthorized` em `src/lib/api.ts`; `useSession` em `src/features/auth/useSession.ts`; `QueryClient` em `src/app/providers.tsx`.
**Where**: `apps/web/src/lib/api.ts`
**Depends on**: T4, T9
**Reuses**: `MESSAGES`, `ApiErrorBody`
**Requirement**: AUTH-08, AUTH-13

**Done when**:

- [ ] Testes com MSW: resposta de erro vira `ApiError` com `code`, `message` e `fieldErrors`; 401 chama `onUnauthorized`; `HttpResponse.error()` vira `ApiError` com status 0 e "Não foi possível conectar ao servidor. Tente novamente."
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add api client with typed errors`

---

### T32: Criar o roteador e as guardas de rota

**What**: `src/app/router.tsx` com as rotas do design (páginas ainda como marcadores simples onde a página real chega depois) e `src/features/auth/guards.tsx` (`RequireSetupDone`, `RequireAuth` com `voltar`, `RequirePasswordChanged`, `RequirePermission`), `ForbiddenPage`; `src/test/renderApp.tsx` (`renderApp(caminho, { handlers })` com `createMemoryRouter`, providers e handlers MSW).
**Where**: `apps/web/src/app/router.tsx`
**Depends on**: T31
**Reuses**: `useSession`, `can()`
**Requirement**: SETUP-01, SETUP-03, AUTH-08, ROLE-03, USR-06

**Done when**:

- [ ] Testes: sem usuários, `/` vai para `/primeiro-acesso`; com usuários, `/primeiro-acesso` vai para `/entrar` (SETUP-03); sem sessão, `/configuracoes/usuarios` vai para `/entrar?voltar=%2Fconfiguracoes%2Fusuarios`; `voltar=//evil.com` é ignorado; Visualizador em `/configuracoes/usuarios` vê "Você não tem permissão para acessar esta página" e o link "Ir para a página inicial" leva a `/` (ROLE-03); sessão com `mustChangePassword` em `/` vai para `/definir-senha`
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add router with auth, setup and permission guards`

---

### T33: Criar a marca no web

**What**: `BrandMark` (símbolo `/brand/ninbi-symbol.png` + "Nin" na cor de texto + "BI" em `text-accent-text`).
**Where**: `apps/web/src/features/shell/BrandMark.tsx`
**Depends on**: T29, T6
**Reuses**: `apps/web/public/brand/ninbi-symbol.png`
**Requirement**: SHELL-11, SHELL-12, SHELL-13

**Done when**:

- [ ] Testes: SHELL-11 (renderiza a imagem do símbolo, o texto "NinBI" e o "BI" em elemento com a classe do token `accent-text`, nos dois temas), SHELL-12 (`index.html` tem `<link rel="icon" ... href="/favicon.png">` e o arquivo existe em `public/`), SHELL-13 (nenhum arquivo de `apps/web/src` nem `index.html` contém "BUSINESS INTELLIGENCE", sem diferenciar maiúsculas)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add ninbi brand mark`

---

### T34: Criar a tela "Criar administrador"

**What**: `SetupPage` em `/primeiro-acesso`: `BrandMark`, campos "Nome", "E-mail", "Senha", "Confirmar senha", botão "Criar administrador"; sucesso grava a sessão no cache e abre `/`.
**Where**: `apps/web/src/features/auth/SetupPage.tsx`
**Depends on**: T32, T33
**Reuses**: `setupAdminSchema`, componentes `form`, `input`, `button`, `card`
**Requirement**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SHELL-14

**Done when**:

- [ ] Testes com gesto: SETUP-01 (os quatro campos pelo rótulo), SETUP-02 (preencher e clicar envia e mostra a página inicial), SETUP-03 (resposta 409 leva à tela de login), SETUP-04 (senha "1234567" mostra "A senha precisa ter ao menos 8 caracteres" e nenhuma requisição sai), SETUP-05 ("As senhas não conferem"), SHELL-14 (símbolo e "NinBI" na tela)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add first administrator setup page`

---

### T35: Criar a tela "Entrar"

**What**: `LoginPage` em `/entrar`: `BrandMark`, "E-mail", "Senha", botão "Entrar" desabilitado durante o envio; mensagens de erro do `ApiError`; após sucesso abre `voltar` ou `/`.
**Where**: `apps/web/src/features/auth/LoginPage.tsx`
**Depends on**: T32, T33
**Reuses**: `loginSchema`, `apiFetch`
**Requirement**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-08, AUTH-13, SHELL-14

**Done when**:

- [ ] Testes com gesto: AUTH-01 (abre a página inicial), AUTH-02 ("E-mail ou senha incorretos", continua no login), AUTH-03 (e-mail vazio, "ana@" e senha vazia mostram a mensagem no campo e nenhuma requisição sai), AUTH-04 (429 mostra "Muitas tentativas. Tente novamente em 15 minutos."), AUTH-05 (com a resposta pendente, o botão "Entrar" está desabilitado), AUTH-08 (abrir `/configuracoes/usuarios` sem sessão, entrar, e a página aberta é a de Usuários), AUTH-13 (erro de rede mostra "Não foi possível conectar ao servidor. Tente novamente."), SHELL-14
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): add login page`

---

### Phase 6 tasks: Shell e Configurações

### T36: Criar a sidebar

**What**: `Sidebar` com `BrandMark`, `ThemeToggle` ("Escuro" / "Claro"), lista rolável de itens (vazia nesta feature) e "Configurações" fixo no rodapé, fora da área rolável, só quando o papel vê alguma aba de `SETTINGS_TABS` (criar `src/features/settings/settingsTabs.ts` nesta task); item ativo com `bg-[image:var(--gradient-brand)]` e `aria-current="page"`.
**Where**: `apps/web/src/features/shell/Sidebar.tsx`
**Depends on**: T30, T33, T32
**Reuses**: `useTheme`, `can()`, `NavLink`
**Requirement**: SHELL-02, SHELL-03, SHELL-05, ROLE-04, CFG-04

**Done when**:

- [ ] Testes com gesto: SHELL-02 (clicar em "Claro" tira a classe `dark` do `<html>`), SHELL-03 (clicar em "Escuro" devolve), SHELL-05 (clicar em "Configurações" abre a página e o link fica com `aria-current="page"` e a classe do gradiente), ROLE-04 (Visualizador e Editor não veem "Configurações"; Admin vê), CFG-04 ("Configurações" é o último link da sidebar e está fora do contêiner com `overflow-y-auto`)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add sidebar with brand, theme toggle and settings item`

---

### T37: Criar a barra superior e o menu do usuário

**What**: `TopBar` (bloco do usuário à esquerda, slot da ação principal à direita via `TopBarActionContext`/`useTopBarAction`) e `UserMenu` (avatar com iniciais, nome, `ROLE_LABELS[role]`; itens "Alterar senha" e "Sair"; "Sair" chama `POST /api/auth/logout`, limpa a sessão e abre `/entrar`).
**Where**: `apps/web/src/features/shell/UserMenu.tsx`
**Depends on**: T32
**Reuses**: `dropdown-menu`, `avatar`, `ROLE_LABELS`
**Requirement**: SHELL-06, AUTH-06

**Done when**:

- [ ] Testes com gesto: SHELL-06 (clicar no bloco "Ana Souza / Admin" abre o menu com "Alterar senha" e "Sair"; iniciais "AS"), AUTH-06 (clicar em "Sair" mostra a tela de login e o logout foi chamado)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add top bar with user menu`

---

### T38: Compor o shell e a página inicial

**What**: `AppShell` (grade `h-screen overflow-hidden`: `Sidebar`, coluna com `TopBar` e `main` com `overflow-y-auto overflow-x-hidden`) e `HomePage` com o estado vazio "Nenhum dashboard ainda"; rotas autenticadas passam a usar o shell.
**Where**: `apps/web/src/features/shell/AppShell.tsx`
**Depends on**: T36, T37
**Reuses**: `Sidebar`, `TopBar`
**Requirement**: SHELL-01, SHELL-07, SHELL-10

**Done when**:

- [ ] Testes: SHELL-01 (logado em `/`: `navigation` da sidebar, `banner` da barra superior e `main` presentes, `<html>` com `dark`, cards com a classe `bg-card`), SHELL-07 ("Nenhum dashboard ainda"), SHELL-10 (raiz com `h-screen` e `overflow-hidden`, sidebar sem overflow próprio fora da lista, `main` com `overflow-y-auto` e `overflow-x-hidden`, sidebar com largura fixa `w-60` e `shrink-0`)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): compose app shell and empty home page`

---

### T39: Criar o diálogo "Alterar senha"

**What**: `ChangePasswordDialog` aberto por "Alterar senha" do `UserMenu`: "Senha atual", "Nova senha", "Confirmar nova senha"; sucesso fecha e mostra o toast "Senha alterada".
**Where**: `apps/web/src/features/auth/ChangePasswordDialog.tsx`
**Depends on**: T37
**Reuses**: `changePasswordSchema`, `dialog`, `sonner`
**Requirement**: PWD-01, PWD-02, PWD-03

**Done when**:

- [ ] Testes com gesto: PWD-01 (preencher e salvar mostra "Senha alterada"), PWD-02 (400 mostra "Senha atual incorreta"), PWD-03 (nova senha de 7 caracteres mostra "A senha precisa ter ao menos 8 caracteres" e não envia)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add change password dialog`

---

### T40: Criar a tela "Definir nova senha"

**What**: `InitialPasswordPage` em `/definir-senha`: "Nova senha" e "Confirmar senha"; sucesso atualiza a sessão e abre `/`.
**Where**: `apps/web/src/features/auth/InitialPasswordPage.tsx`
**Depends on**: T32
**Reuses**: `initialPasswordSchema`
**Requirement**: USR-06

**Done when**:

- [ ] Teste com gesto: USR-06 (entrar com usuário de senha provisória leva a "Definir nova senha"; tentar abrir `/configuracoes/usuarios` volta para ela; definir a senha abre a página inicial)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): require new password after temporary one`

---

### T41: Criar a página "Configurações" com abas na URL

**What**: `SettingsPage` em `/configuracoes/:aba`, abas de `SETTINGS_TABS` filtradas por `available` e por permissão, na ordem do registro; `/configuracoes` redireciona para a primeira aba visível; trocar de aba navega para a URL dela.
**Where**: `apps/web/src/features/settings/SettingsPage.tsx`
**Depends on**: T38
**Reuses**: `tabs`, `SETTINGS_TABS`
**Requirement**: CFG-01, CFG-02, CFG-03

**Done when**:

- [ ] Testes: CFG-01 (Admin clica em "Configurações" e vê a página com a aba "Usuários" selecionada), CFG-02 (`SETTINGS_TABS` está na ordem Conexões, Usuários, LLM; ligando `available` das três num teste, as abas aparecem nessa ordem; nesta feature só "Usuários" aparece), CFG-03 (clicar numa aba muda a URL para `/configuracoes/<aba>`; renderizar de novo nessa URL abre a mesma aba)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add settings page with url-routed tabs`

---

### T42: Listar usuários na aba "Usuários"

**What**: `UsersTab` com tabela "Nome", "E-mail", "Papel", "Situação" na ordem recebida da API, linhas de `skeleton` enquanto carrega, erro com "Não foi possível carregar os usuários" e botão "Tentar novamente"; registra "Novo usuário" como ação da TopBar (abre o diálogo da T43; nesta task o botão só existe).
**Where**: `apps/web/src/features/users/UsersTab.tsx`
**Depends on**: T41
**Reuses**: `table`, `skeleton`, `badge`, `ROLE_LABELS`
**Requirement**: USR-01, USR-02, USR-03

**Done when**:

- [ ] Testes: USR-01 (linhas com nome, e-mail, "Editor"/"Visualizador", "Ativo"/"Desativado", na ordem da resposta), USR-02 (com a resposta pendente, há linhas de esqueleto e nenhum nome), USR-03 (500 mostra a mensagem; clicar em "Tentar novamente" com o handler já respondendo 200 mostra a lista)
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `feat(web): list users in settings`

---

### Phase 7 tasks: Gestão de usuários no web

### T43: Criar o diálogo "Novo usuário"

**What**: `NewUserDialog` aberto pela ação "Novo usuário": "Nome", "E-mail", "Papel" (Admin, Editor, Visualizador), "Senha provisória"; botão "Salvar" desabilitado durante o envio; sucesso fecha e invalida a lista.
**Where**: `apps/web/src/features/users/NewUserDialog.tsx`
**Depends on**: T42
**Reuses**: `newUserSchema`, `dialog`, `select`
**Requirement**: USR-04, USR-05, USR-12, USR-14

**Done when**:

- [ ] Testes com gesto: USR-04 (preencher, salvar, e o novo nome aparece na lista), USR-05 (409 mostra "Já existe um usuário com este e-mail" e o diálogo fica aberto), USR-12 (com a resposta pendente, "Salvar" está desabilitado), USR-14 (nome com 121 caracteres mostra a mensagem no campo e não envia)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add new user dialog`

---

### T44: Criar as ações por usuário

**What**: `UserRowActions` (menu por linha): "Alterar papel", "Redefinir senha" (diálogo com "Senha provisória"), "Desativar" (alert-dialog "Desativar <nome>? A pessoa não conseguirá mais entrar.") ou "Reativar"; erros 409 mostram a `message` da API.
**Where**: `apps/web/src/features/users/UserRowActions.tsx`
**Depends on**: T43
**Reuses**: `dropdown-menu`, `alert-dialog`, `dialog`
**Requirement**: USR-07, USR-08, USR-09, USR-10, USR-11, ROLE-05

**Done when**:

- [ ] Testes com gesto: USR-08 ("Desativar" em "Bruno Lima" mostra "Desativar Bruno Lima? A pessoa não conseguirá mais entrar."), USR-09 (confirmar mostra "Desativado" na linha), USR-10 ("Reativar" mostra "Ativo"), USR-11 (409 mostra "É preciso existir ao menos um administrador ativo"), USR-07 (redefinir envia a senha provisória e mostra a confirmação), ROLE-05 (trocar o papel para "Visualizador" mostra "Visualizador" na linha)
- [ ] Gate check passes: `pnpm --filter @ninbi/web test`

**Tests**: unit
**Gate**: quick
**Model**: sonnet
**Commit**: `feat(web): add per-user role, reset, deactivate and reactivate actions`

---

### T45: Garantir a interface só em português

**What**: Teste que renderiza cada tela desta feature (primeiro acesso, entrar, definir senha, página inicial, configurações/usuários com diálogos e menus abertos, página de permissão) e confere que nenhum texto visível nem `aria-label`/`placeholder` está na lista de rótulos em inglês proibidos (`Login`, `Sign in`, `Log out`, `Logout`, `Password`, `Email address`, `Settings`, `Users`, `Save`, `Cancel`, `Name`, `Role`, `Status`, `Active`, `Disabled`, `Loading`, `Retry`, `Dark`, `Light`, `Submit`, `Close`). Corrige os textos que o teste encontrar, inclusive os `sr-only` dos componentes do shadcn (ex.: "Close" → "Fechar").
**Where**: `apps/web/src/test/portuguese-only.test.tsx`
**Depends on**: T44
**Reuses**: `renderApp`
**Requirement**: SHELL-09

**Done when**:

- [ ] Teste `SHELL-09 telas não mostram rótulos em inglês` passa
- [ ] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Model**: sonnet
**Commit**: `test(web): ensure every screen is in portuguese`

---

## Checks

**C1** - `docker compose up` sobe app, PostgreSQL e Neo4j e a tela de login responde em `http://localhost:8080` (FND-01, AC 1)
Proof: run smoke | ok FND-01 docker compose up responde a tela de login em http://localhost:8080
Proof: run api | ✓ FND-01 serve o index.html do web em GET /

**C2** - No primeiro start do Neo4j, o dataset de exemplo é carregado, e rodar o seed de novo não duplica nada (FND-02, AC 2)
Proof: run smoke | ok FND-02 neo4j carregou o dataset de exemplo no primeiro start
Proof: run apiint | ✓ FND-02 seed carrega o dataset e não duplica ao rodar de novo

**C3** - `GET /api/health` responde 200 com `postgres: "up"` (FND-03, AC 3)
Proof: run api | ✓ FND-03 health responde 200 com postgres up

**C4** - Com o PostgreSQL inacessível, `GET /api/health` responde 503 com `postgres: "down"` (FND-04, AC 4)
Proof: run api | ✓ FND-04 health responde 503 com postgres down

**C5** - Cada requisição gera uma linha de log com método, caminho, status e duração, sem corpo, senha nem cookie (FND-05, AC 5)
Proof: run api | ✓ FND-05 log de requisição tem método, caminho, status e duração sem corpo, senha nem cookie

**C6** - A raiz do repositório tem `LICENSE` com o texto da AGPL-3.0 (FND-06, AC 6)
Proof: run api | ✓ FND-06 LICENSE na raiz traz o texto da AGPL-3.0

**C7** - Sem nenhum usuário, o app mostra "Criar administrador" com "Nome", "E-mail", "Senha" e "Confirmar senha" (SETUP-01, AC 1)
Proof: run web | ✓ SETUP-01 sem usuários mostra Criar administrador com Nome, E-mail, Senha e Confirmar senha

**C8** - O envio válido cria um Admin, inicia a sessão e mostra a página inicial (SETUP-02, AC 2)
Proof: run api | ✓ SETUP-02 cria o admin e inicia a sessão
Proof: run web | ✓ SETUP-02 enviar o formulário válido abre a página inicial

**C9** - Com algum usuário existente, o primeiro acesso responde 409 e a tela mostrada é a de login (SETUP-03, AC 3)
Proof: run api | ✓ SETUP-03 responde 409 quando já existe usuário
Proof: run web | ✓ SETUP-03 com usuário existente mostra a tela de login

**C10** - Senha com menos de 8 caracteres mantém o formulário com "A senha precisa ter ao menos 8 caracteres" (SETUP-04, AC 4)
Proof: run contracts | ✓ SETUP-04 senha com menos de 8 caracteres
Proof: run web | ✓ SETUP-04 senha curta mantém o formulário e mostra a mensagem

**C11** - "Senha" e "Confirmar senha" diferentes mostram "As senhas não conferem" (SETUP-05, AC 5)
Proof: run contracts | ✓ SETUP-05 senhas diferentes
Proof: run web | ✓ SETUP-05 senhas diferentes mostram As senhas não conferem

**C12** - Dois envios simultâneos de "Criar administrador" criam um único Admin e um recebe 409 (SETUP-06, edge case)
Proof: run apiint | ✓ SETUP-06 dois envios simultâneos criam um único admin e um recebe 409

**C13** - E-mail e senha corretos de um usuário ativo iniciam a sessão e mostram a página inicial (AUTH-01, AC 1)
Proof: run api | ✓ AUTH-01 login correto cria a sessão
Proof: run web | ✓ AUTH-01 entrar com dados corretos abre a página inicial

**C14** - E-mail ou senha incorretos mostram "E-mail ou senha incorretos", com a mesma resposta nos dois casos (AUTH-02, AC 2)
Proof: run api | ✓ AUTH-02 e-mail inexistente e senha errada dão a mesma resposta
Proof: run web | ✓ AUTH-02 credenciais erradas mostram E-mail ou senha incorretos

**C15** - E-mail vazio ou inválido, ou senha vazia, mostram a mensagem no campo e não enviam o formulário (AUTH-03, AC 3)
Proof: run contracts | ✓ AUTH-03 e-mail vazio ou inválido e senha vazia
Proof: run web | ✓ AUTH-03 e-mail inválido ou senha vazia mostram a mensagem no campo sem enviar

**C16** - Depois de 5 erros em 15 minutos para o mesmo e-mail, novas tentativas são recusadas por 15 minutos com "Muitas tentativas. Tente novamente em 15 minutos." (AUTH-04, AC 4)
Proof: run api | ✓ AUTH-04 cinco erros em 15 minutos bloqueiam o e-mail por 15 minutos
Proof: run web | ✓ AUTH-04 bloqueio mostra Muitas tentativas

**C17** - Durante o envio do login, o botão "Entrar" fica desabilitado (AUTH-05, AC 5)
Proof: run web | ✓ AUTH-05 botão Entrar fica desabilitado durante o envio

**C18** - "Sair" no menu do usuário encerra a sessão e mostra a tela de login (AUTH-06, AC 6)
Proof: run api | ✓ AUTH-06 logout encerra a sessão
Proof: run web | ✓ AUTH-06 Sair no menu do usuário mostra a tela de login

**C19** - Rota protegida sem sessão válida responde 401 (AUTH-07, AC 7)
Proof: run api | ✓ AUTH-07 rota protegida sem sessão válida responde 401

**C20** - Ao receber 401, o web mostra o login e, depois de entrar, abre a página pedida (AUTH-08, AC 8)
Proof: run web | ✓ AUTH-08 401 leva ao login e depois do login abre a página pedida

**C21** - Sessão sem uso por 7 dias é inválida (AUTH-09, AC 9)
Proof: run api | ✓ AUTH-09 sessão sem uso por 7 dias é inválida

**C22** - Só o hash com sal da senha é guardado (AUTH-10, AC 10)
Proof: run api | ✓ AUTH-10 guarda só o hash com sal da senha

**C23** - O identificador da sessão fica em cookie httpOnly (AUTH-11, AC 11)
Proof: run api | ✓ AUTH-11 cookie de sessão é httpOnly

**C24** - Usuário desativado recebe "E-mail ou senha incorretos" no login (AUTH-12, AC 12)
Proof: run api | ✓ AUTH-12 usuário desativado recebe E-mail ou senha incorretos

**C25** - Com o backend fora do ar, o login mostra "Não foi possível conectar ao servidor. Tente novamente." (AUTH-13, edge case)
Proof: run web | ✓ AUTH-13 backend fora do ar mostra Não foi possível conectar ao servidor

**C26** - O backend verifica o papel em toda rota protegida conforme a matriz (ROLE-01, AC 1)
Proof: run contracts | ✓ ROLE-01 matriz de papéis
Proof: run api | ✓ ROLE-01 cada papel recebe 200 ou 403 conforme a matriz

**C27** - Rota não permitida ao papel responde 403 (ROLE-02, AC 2)
Proof: run api | ✓ ROLE-02 Editor e Visualizador recebem 403 na API de usuários

**C28** - URL de página não permitida mostra "Você não tem permissão para acessar esta página" com link para a página inicial (ROLE-03, AC 3)
Proof: run web | ✓ ROLE-03 página não permitida mostra a mensagem de permissão com link para a página inicial

**C29** - A sidebar mostra só os itens que o papel permite (ROLE-04, AC 4)
Proof: run web | ✓ ROLE-04 só Admin vê Configurações na sidebar

**C30** - A troca de papel vale na próxima requisição do usuário (ROLE-05, AC 5)
Proof: run api | ✓ ROLE-05 novo papel vale na próxima requisição
Proof: run web | ✓ ROLE-05 trocar o papel mostra o novo papel na linha

**C31** - Admin clica em "Configurações" e vê a página com a aba "Usuários" (CFG-01, AC 1)
Proof: run web | ✓ CFG-01 clicar em Configurações mostra a página com a aba Usuários

**C32** - As abas seguem a ordem "Conexões", "Usuários", "LLM", cada uma quando sua feature existe (CFG-02, AC 2)
Proof: run web | ✓ CFG-02 abas na ordem Conexões, Usuários, LLM

**C33** - A aba clicada aparece e continua aberta ao recarregar (CFG-03, AC 3)
Proof: run web | ✓ CFG-03 aba escolhida fica na URL e continua aberta ao recarregar

**C34** - "Configurações" é o último item da sidebar e fica visível enquanto a lista rola (CFG-04, AC 4)
Proof: run web | ✓ CFG-04 Configurações é o último item da sidebar fora da área que rola

**C35** - A aba "Usuários" lista nome, e-mail, papel e situação em ordem alfabética de nome (USR-01, AC 1)
Proof: run api | ✓ USR-01 lista em ordem alfabética de nome com e-mail, papel e situação
Proof: run web | ✓ USR-01 aba Usuários mostra nome, e-mail, papel e situação

**C36** - Enquanto a lista carrega, aparecem linhas de esqueleto (USR-02, AC 2)
Proof: run web | ✓ USR-02 linhas de esqueleto durante o carregamento

**C37** - Falha ao carregar mostra "Não foi possível carregar os usuários" e "Tentar novamente" (USR-03, AC 3)
Proof: run web | ✓ USR-03 erro mostra a mensagem e Tentar novamente recarrega

**C38** - "Novo usuário" válido cria o usuário e ele aparece na lista (USR-04, AC 4)
Proof: run api | ✓ USR-04 cria usuário com senha provisória
Proof: run web | ✓ USR-04 novo usuário enviado aparece na lista

**C39** - E-mail repetido, sem diferenciar maiúsculas, é recusado com "Já existe um usuário com este e-mail" (USR-05, AC 5)
Proof: run api | ✓ USR-05 e-mail repetido sem diferenciar maiúsculas responde 409
Proof: run web | ✓ USR-05 mostra Já existe um usuário com este e-mail

**C40** - Quem entra com senha provisória precisa definir nova senha antes de abrir outra página (USR-06, AC 6)
Proof: run api | ✓ USR-06 senha provisória só permite definir a nova senha
Proof: run web | ✓ USR-06 login com senha provisória exige nova senha antes da página inicial

**C41** - "Redefinir senha" troca a senha e encerra as sessões do usuário (USR-07, AC 7)
Proof: run api | ✓ USR-07 redefinir senha troca a senha e encerra as sessões
Proof: run web | ✓ USR-07 Redefinir senha envia a senha provisória

**C42** - "Desativar" pede confirmação com "Desativar <nome>? A pessoa não conseguirá mais entrar." (USR-08, AC 8)
Proof: run web | ✓ USR-08 Desativar pede confirmação com o nome

**C43** - Confirmar a desativação marca "Desativado" e encerra as sessões (USR-09, AC 9)
Proof: run api | ✓ USR-09 desativar marca Desativado e encerra as sessões
Proof: run web | ✓ USR-09 confirmar a desativação mostra Desativado

**C44** - "Reativar" marca o usuário como "Ativo" (USR-10, AC 10)
Proof: run api | ✓ USR-10 reativar marca Ativo
Proof: run web | ✓ USR-10 Reativar mostra Ativo

**C45** - Ação que deixaria a instalação sem Admin ativo é recusada com "É preciso existir ao menos um administrador ativo" (USR-11, AC 11)
Proof: run api | ✓ USR-11 recusa deixar a instalação sem admin ativo
Proof: run web | ✓ USR-11 mostra É preciso existir ao menos um administrador ativo

**C46** - Durante o envio de "Novo usuário", o botão de salvar fica desabilitado (USR-12, AC 12)
Proof: run web | ✓ USR-12 Salvar fica desabilitado durante o envio

**C47** - Dois Admins criando o mesmo e-mail ao mesmo tempo resultam em um usuário e uma recusa com a mensagem (USR-13, edge case)
Proof: run apiint | ✓ USR-13 criação simultânea com o mesmo e-mail cria um só

**C48** - Nome ou e-mail acima de 120 caracteres são recusados com a mensagem no campo (USR-14, edge case)
Proof: run api | ✓ USR-14 nome ou e-mail acima de 120 caracteres são recusados
Proof: run web | ✓ USR-14 nome longo mostra a mensagem no campo

**C49** - Usuário desativado com sessão aberta recebe 401 na próxima requisição (USR-15, edge case)
Proof: run api | ✓ USR-15 usuário desativado com sessão aberta recebe 401

**C50** - Logado, o app mostra o shell da captura (sidebar, barra superior, conteúdo, cards) em tema escuro com a paleta da logo (SHELL-01, AC 1)
Proof: run web | ✓ SHELL-01 shell mostra sidebar, barra superior e área de conteúdo em tema escuro

**C51** - "Claro" aplica o tema claro com contraste de texto de ao menos 4,5:1 (SHELL-02, AC 2)
Proof: run web | ✓ SHELL-02 escolher Claro aplica o tema claro
Proof: run web | ✓ SHELL-02 tema claro tem contraste de texto de ao menos 4,5:1

**C52** - "Escuro" volta ao tema escuro (SHELL-03, AC 3)
Proof: run web | ✓ SHELL-03 escolher Escuro volta ao tema escuro

**C53** - Reabrir o app aplica o último tema escolhido, e o escuro quando não há escolha (SHELL-04, AC 4)
Proof: run web | ✓ SHELL-04 reabrir aplica o último tema e o escuro sem escolha

**C54** - Clicar num item da sidebar abre a página e marca o item como ativo com o destaque (SHELL-05, AC 5)
Proof: run web | ✓ SHELL-05 clicar em um item abre a página e marca o item como ativo

**C55** - O bloco do usuário abre o menu com "Alterar senha" e "Sair" (SHELL-06, AC 6)
Proof: run web | ✓ SHELL-06 bloco do usuário abre menu com Alterar senha e Sair

**C56** - Sem dashboards, a página inicial mostra "Nenhum dashboard ainda" (SHELL-07, AC 7)
Proof: run web | ✓ SHELL-07 sem dashboards a página inicial mostra Nenhum dashboard ainda

**C57** - Cores, raios e tipografia vêm de tokens únicos usados por todas as telas (SHELL-08, AC 8)
Proof: run web | ✓ SHELL-08 temas escuro e claro definem os mesmos tokens
Proof: run web | ✓ SHELL-08 nenhuma tela usa cor literal fora dos tokens

**C58** - Todos os textos da interface estão em português (SHELL-09, AC 9)
Proof: run web | ✓ SHELL-09 telas não mostram rótulos em inglês

**C59** - De 1024 a 1920 px, a sidebar fica fixa, só o conteúdo rola na vertical e não há rolagem horizontal (SHELL-10, AC 10)
Proof: run web | ✓ SHELL-10 sidebar fixa e só a área de conteúdo rola

**C60** - O topo da sidebar mostra o símbolo e "NinBI", com "BI" em ciano, nos dois temas (SHELL-11, AC 11)
Proof: run web | ✓ SHELL-11 sidebar mostra o símbolo e NinBI com BI em ciano

**C61** - O ícone da aba do navegador é o símbolo em estrela (SHELL-12, AC 12)
Proof: run web | ✓ SHELL-12 ícone da aba é o símbolo em estrela

**C62** - O subtítulo "BUSINESS INTELLIGENCE & AI" não aparece em nenhuma tela (SHELL-13, AC 13)
Proof: run web | ✓ SHELL-13 subtítulo da logo não aparece em nenhuma tela

**C63** - As telas de login e de primeiro acesso mostram o símbolo e "NinBI" (SHELL-14, AC 14)
Proof: run web | ✓ SHELL-14 login mostra o símbolo e NinBI
Proof: run web | ✓ SHELL-14 primeiro acesso mostra o símbolo e NinBI

**C64** - O destaque é o gradiente roxo → ciano sobre fundo quase preto, sem verde-limão (SHELL-15, AC 15)
Proof: run web | ✓ SHELL-15 destaque usa o gradiente roxo para ciano sobre fundo quase preto

**C65** - "Alterar senha" com a senha atual certa e nova válida troca a senha e mostra "Senha alterada" (PWD-01, AC 1)
Proof: run api | ✓ PWD-01 troca a senha com a senha atual correta
Proof: run web | ✓ PWD-01 Alterar senha mostra Senha alterada

**C66** - Senha atual incorreta é recusada com "Senha atual incorreta" (PWD-02, AC 2)
Proof: run api | ✓ PWD-02 senha atual incorreta é recusada
Proof: run web | ✓ PWD-02 mostra Senha atual incorreta

**C67** - Nova senha com menos de 8 caracteres é recusada com "A senha precisa ter ao menos 8 caracteres" (PWD-03, AC 3)
Proof: run api | ✓ PWD-03 nova senha curta é recusada
Proof: run web | ✓ PWD-03 nova senha curta mostra a mensagem e não envia

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** 2026-11-16 - o teste FND-05 (T12) exigia que nenhuma linha de log contivesse a palavra "password", capturando inclusive os logs de inicialização do Nest; isso contradiz o próprio spec, que exige as rotas `/api/auth/password` e `/api/auth/initial-password` e cujo FND-05 trata só das linhas de requisição. Decisão do orquestrador sob a delegação do usuário ("Pode fazer todas features desse jeito, sem nem me perguntar."): o teste passa a examinar só as linhas de requisição e a afirmar que nelas não aparecem o VALOR da senha enviada, o corpo nem o valor do cookie (o caminho pode conter a palavra "password"). A asserção não fica mais fraca quanto ao que o FND-05 exige.
**Dispatched:** lote 1 (T1-T7, haiku) - returned (a677f94); `validate_tasks.py --execute` exit 0 após o lote 1. Lote 2 (T8-T14, sonnet) - returned (477693b). Lote 3 (T15-T21, sonnet) - returned (7863045). Lote 4 (T22-T28, sonnet) - em andamento. O `**Build**` não existe antes da T1 (repo vazio): o orquestrador executa o lote 1 de scaffolding antes de `validate_tasks.py --execute`, que roda ao fim do lote 1.
**Walked:** dispensado por AD-023

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order: T1 to T45.
