# STATE

## Decisions

### AD-001 (active)
- **Decision**: O NinBI é um produto open source self-hosted, de instalação única (single-tenant), sob licença AGPL-3.0.
- **Reason**: O usuário escolheu o modelo "open source self-hosted" e a licença AGPL-3.0. Multi-tenant é feature futura.
- **Trade-off**: Sem isolamento por organização no modelo de dados; adicionar multi-tenant depois exige migração. A AGPL afasta quem quer embutir o NinBI em produto fechado.
- **Scope**: Todas as features; modelo de dados, deploy e repositório.
- **Date**: 2026-11-15
- **Status**: active

### AD-002 (active)
- **Decision**: A única fonte de dados é o Neo4j, consultado em Cypher. Outros bancos entrarão no futuro tendo os dados importados para o Neo4j.
- **Reason**: Decisão do usuário: "Fontes no MVP: só Neo4j"; os demais bancos serão importados e consultados em Cypher.
- **Trade-off**: Não há conectores SQL nem camada de driver plugável. Quem tem dados fora do Neo4j não usa o MVP.
- **Scope**: conexoes-schema, dashboards-consultas, ia-cypher, ia-dashboard.
- **Date**: 2026-11-15
- **Status**: active

### AD-003 (active)
- **Decision**: Frontend em React, backend em NestJS, metadados do NinBI (dashboards, widgets, conexões, usuários, cache de schema) em PostgreSQL.
- **Reason**: O usuário escolheu NestJS por causa do LangChain e PostgreSQL para os metadados.
- **Trade-off**: Dois serviços e um banco a mais para operar, em vez de um único app full-stack ou de guardar os metadados no próprio Neo4j.
- **Scope**: Todas as features.
- **Date**: 2026-11-15
- **Status**: active

### AD-004 (active)
- **Decision**: As consultas nascem da IA (texto para Cypher, e dashboard inteiro a partir de uma descrição). Não há construtor visual de queries. O Cypher gerado é sempre visível e editável em um editor.
- **Reason**: Decisão do usuário sobre a criação de queries.
- **Trade-off**: Quem não tem um provedor de LLM configurado só cria widgets escrevendo Cypher à mão.
- **Scope**: dashboards-consultas, ia-cypher, ia-dashboard.
- **Date**: 2026-11-15
- **Status**: active

### AD-005 (active)
- **Decision**: O único dado do banco enviado ao provedor de LLM é o schema enriquecido: para cada propriedade de cada label e de cada tipo de relacionamento, os tipos e um valor de exemplo real. Não há tamanho máximo para o exemplo. Nenhum resultado de consulta vai para o provedor.
- **Reason**: Palavras do usuário: "O schema tem q ter um exemplo e todos os tipos" e "tirando tamanho maximo".
- **Trade-off**: A IA não resume nem explica os dados. Um valor de exemplo por propriedade sai do ambiente do usuário, e exemplos longos aumentam o custo de cada chamada.
- **Scope**: conexoes-schema, ia-cypher, ia-dashboard.
- **Date**: 2026-11-15
- **Status**: active

### AD-006 (active)
- **Decision**: O provedor e a chave do LLM são configuráveis na instalação, por meio do LangChain. O NinBI não fixa um provedor.
- **Reason**: Decisão do usuário: "provedor e chave configuráveis pelo usuário (via LangChain)".
- **Trade-off**: A qualidade do Cypher varia com o modelo escolhido; os prompts não podem depender de recursos de um provedor só.
- **Scope**: ia-cypher, ia-dashboard.
- **Date**: 2026-11-15
- **Status**: active

### AD-007 (active)
- **Decision**: Login por e-mail e senha, com os papéis Admin, Editor e Visualizador. Só usuários logados acessam dashboards: não há link público nem embed.
- **Reason**: Decisão do usuário sobre login e compartilhamento.
- **Trade-off**: Sem OAuth/SSO e sem compartilhamento externo no MVP.
- **Scope**: Todas as features.
- **Date**: 2026-11-15
- **Status**: active

### AD-008 (active)
- **Decision**: O visual da imagem de referência (LittleBee) é o tema dark padrão do NinBI, com uma versão light equivalente.
- **Reason**: Opção escolhida pelo usuário: "Tema padrão, dark + light" = "O visual da referência vira o tema dark padrão do NinBI, com uma versão light equivalente". Ele não chamou a imagem de inspiração: ela vincula shell, sidebar, cards, cores e tipografia.
- **Trade-off**: O conteúdo da imagem é de um app de trading. Cada elemento dela que o NinBI não mostra é uma divergência a aprovar.
- **Scope**: fundacao-auth (shell e tema), widgets-graficos (cards e gráficos) e toda tela das demais features.
- **Date**: 2026-11-15
- **Status**: active

### AD-009 (active)
- **Decision**: Os widgets do MVP são os gráficos do shadcn charts (área, barras, linha, pizza/donut, radar, radial), cartão de KPI, tabela/lista e mapa com marcadores por latitude/longitude. Visualização de grafo (nós e relacionamentos) não entra.
- **Reason**: Decisão do usuário sobre os widgets.
- **Trade-off**: Um BI para Neo4j sem visualização de grafo: resultados precisam ser tabulares.
- **Scope**: dashboards-consultas, widgets-graficos, ia-cypher, ia-dashboard.
- **Date**: 2026-11-15
- **Status**: active

### AD-010 (active)
- **Decision**: A interface existe só em português. Os rótulos em inglês da imagem de referência não são copiados.
- **Reason**: Decisão do usuário: "Idioma da interface: só português".
- **Trade-off**: Sem i18n; traduzir depois exige extrair todos os textos.
- **Scope**: Todas as features com tela.
- **Date**: 2026-11-15
- **Status**: active

### AD-011 (active)
- **Decision**: O layout do dashboard é uma grade em que o usuário arrasta e redimensiona os widgets; a IA propõe o layout inicial. Um dashboard tem várias abas, e os filtros globais valem para todas elas.
- **Reason**: Decisões do usuário sobre layout e estrutura.
- **Trade-off**: A composição fixa desenhada na imagem de referência é só um arranjo possível, não o layout do produto.
- **Scope**: dashboards-consultas, widgets-graficos, interatividade, ia-dashboard.
- **Date**: 2026-11-15
- **Status**: active

### AD-012 (active)
- **Decision**: Os testes automatizados são unitários e cobrem as partes críticas: validação de Cypher somente leitura, mapeamento resultado para gráfico, autenticação e permissões.
- **Reason**: Decisão do usuário sobre testes.
- **Trade-off**: Sem suíte e2e; regressões de tela dependem da verificação manual e das capturas.
- **Scope**: Todas as features.
- **Date**: 2026-11-15
- **Status**: active

### AD-013 (active)
- **Decision**: A sidebar lista os dashboards do usuário, soltos ou dentro de grupos recolhíveis opcionais. Cada usuário ordena e agrupa a própria sidebar, sem afetar a dos outros. As abas continuam dentro de cada dashboard.
- **Reason**: Palavras do usuário: "O usuário poderá separar na sidebar seus dashboards. Por exemplo, ele quer um dashboard do 'Comercial', um da 'Logística', um 'Pessoal'. Ele vai ser responsável pela organização da sidebar e de cada item de dentro do dashboard." Perguntado "o que são os itens da sidebar?", respondeu "Os dois" (dashboards soltos e grupos). Perguntado de quem é a organização, respondeu "De cada usuário".
- **Trade-off**: Não há uma navegação única da instalação: duas pessoas veem sidebars diferentes. Os itens de navegação desenhados na imagem de referência ("Discover", "Assets", "Funds", "Economic Calendar") dão lugar aos dashboards.
- **Scope**: fundacao-auth (shell), dashboards-consultas (sidebar), compartilhamento.
- **Date**: 2026-11-16
- **Status**: active

### AD-014 (active)
- **Decision**: Todo dashboard é privado: pertence a quem o criou e só o dono o vê, até compartilhar. O dono compartilha com usuários específicos, com equipes criadas pelo Admin ou com "todos da instalação", e escolhe em cada compartilhamento "pode ver" ou "pode editar".
- **Reason**: Respostas do usuário: visibilidade "Privado, com compartilhamento"; compartilhar com "Usuários, todos e equipes"; permissão "Ver ou editar, por pessoa". Substitui o default anterior das specs, em que todo usuário logado via todos os dashboards e qualquer Editor editava qualquer um.
- **Trade-off**: Toda rota de dashboard, widget, consulta, filtro e chat passa a checar a permissão no dashboard, não só o papel. Equipes e compartilhamentos são dados e telas a mais.
- **Scope**: dashboards-consultas, compartilhamento, widgets-graficos, ia-cypher, interatividade, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-015 (active)
- **Decision**: Papéis globais: o Admin gerencia a instalação e abre e edita qualquer dashboard; o Editor cria os próprios dashboards e usa a IA; o Visualizador não cria nada e só vê o que compartilham com ele.
- **Reason**: Respostas do usuário: papéis "Editor cria; Visualizador só recebe"; Admin "Vê e edita tudo". Detalha os papéis de AD-007 e substitui a matriz recomendada na primeira versão de `fundacao-auth` (Editor editando qualquer dashboard; Visualizador vendo todos).
- **Trade-off**: O Admin enxerga dashboards privados de todos: não há privacidade contra o administrador.
- **Scope**: Todas as features.
- **Date**: 2026-11-16
- **Status**: active

### AD-016 (active)
- **Decision**: A administração fica em um único item "Configurações" na sidebar, que abre uma página com as abas "Conexões", "Usuários" e "LLM". Os demais itens da sidebar são os dashboards e grupos do usuário (AD-013).
- **Reason**: Pergunta feita: "A referência mostra na sidebar 'Discover', 'Assets', 'Funds', 'Economic Calendar', 'Settings'. Quais itens o NinBI mostra?" Opção escolhida pelo usuário: "Um item 'Configurações' só", com Conexões, Usuários e LLM em abas.
- **Trade-off**: Conexões e usuários ficam a dois cliques, não a um.
- **Scope**: fundacao-auth (shell e aba Usuários), conexoes-schema (aba Conexões), ia-cypher (aba LLM), compartilhamento (equipes).
- **Date**: 2026-11-16
- **Status**: active

### AD-017 (active)
- **Decision**: A marca do NinBI é a logo de `brand/ninbi-logo.jpg`. Na interface aparece o símbolo (a estrela de seis pontas) recortado da imagem, na sidebar e no ícone da aba do navegador, seguido de "NinBI" em texto real: "Nin" na cor do texto e "BI" em ciano, nos temas escuro e claro. O subtítulo "BUSINESS INTELLIGENCE & AI" não aparece na interface.
- **Reason**: Pergunta feita: "A referência mostra o logotipo 'LITTLEBEE' com um ícone hexagonal. O que o NinBI mostra?" O usuário enviou a logo com as palavras "essa é a logo." Sobre o uso, escolheu "Símbolo recortado + 'NinBI' em texto"; sobre o subtítulo, "Em lugar nenhum".
- **Trade-off**: A logo é um JPG com fundo escuro embutido: o recorte do símbolo perde o brilho e as partículas, e no tema claro depende de um recorte limpo. A palavra desenhada na imagem não é usada.
- **Scope**: fundacao-auth (shell, login, favicon), widgets-graficos (tela do dashboard).
- **Date**: 2026-11-16
- **Status**: active

### AD-018 (active)
- **Decision**: O tema mantém o layout da imagem de referência (sidebar, cards, raios, tipografia) e troca o verde-limão pelo gradiente roxo → ciano da logo, sobre fundo quase preto. A troca vale para o tema claro equivalente e para as cores dos gráficos.
- **Reason**: Pergunta feita: "De onde vem a paleta do tema: do verde-limão da referência ou da logo?" Opção escolhida pelo usuário: "Paleta da logo". Refina AD-008, que continua valendo para o layout.
- **Trade-off**: A tela não fica mais igual à captura em cor: a comparação com ela vale para forma, e a cor é conferida contra a logo.
- **Scope**: fundacao-auth (tokens do tema), widgets-graficos (gráficos e chips) e toda tela das demais features.
- **Date**: 2026-11-16
- **Status**: active

### AD-019 (active)
- **Decision**: O usuário delegou as decisões de produto que restavam abertas nas specs. Cada pergunta aberta foi fechada com a opção recomendada, salvo o mapa (AD-022), e está registrada na tabela de Assumptions da spec correspondente como `y - delegado`.
- **Reason**: Palavras do usuário: "Pode fazer todas features desse jeito, sem nem me perguntar. Ao final vejo como ficou e vou melhorando o código e a aplicação."
- **Trade-off**: Decisões como matriz de permissões, modo de edição, provedores de LLM e semântica do cross-filtering não tiveram resposta individual; o usuário as revisa no produto pronto, quando mudar custa mais.
- **Scope**: Todas as features.
- **Date**: 2026-11-16
- **Status**: active

### AD-020 (active)
- **Decision**: Divergências do shell em relação à captura LittleBee: o alternador "Market / Trades" vira o alternador de tema "Escuro / Claro"; o cartão promocional e os ícones sociais saem; o bloco do usuário mostra avatar com iniciais, nome e papel, e abre "Alterar senha" e "Sair"; chips de saldo, busca e sino saem, o botão de destaque vira a ação principal da página e o espaço dos chips recebe os filtros globais dentro dos dashboards; o app ocupa a janela inteira, sem moldura nem fundo externo, e a área de conteúdo mostra a página do NinBI.
- **Reason**: Perguntas feitas: "o que acontece com o alternador 'Market | Trades'?", "com o cartão promocional e os ícones sociais?", "com o bloco do usuário?", "com os chips, a busca, o sino e o botão 'Deposit'?", "com a moldura e o conteúdo?". Opção aplicada em todas: a recomendada, por delegação do usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: O shell perde elementos decorativos da referência; a barra superior fica quase vazia fora dos dashboards.
- **Scope**: fundacao-auth, widgets-graficos, interatividade (filtros na barra superior).
- **Date**: 2026-11-16
- **Status**: active

### AD-021 (active)
- **Decision**: Divergências dos cards em relação à captura LittleBee: o card de gráfico mostra só o título, e o valor grande com chip de variação fica no widget de KPI; o cabeçalho do card tem um único menu do widget, sem seletor de período por widget; o card "Position size calculator" não tem equivalente, e seus blocos de resultado definem o visual do KPI; as linhas de lista mostram texto principal, texto secundário e até dois valores, sem ícones, botões, linha de data nem cor por sinal.
- **Reason**: Perguntas feitas: "valor em destaque no card do gráfico?", "controles no cabeçalho dos cards?", "card 'Position size calculator'?", "linhas das listas?". Opção aplicada em todas: a recomendada, por delegação do usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: O dashboard do NinBI é mais sóbrio que a referência: sem ícones nas listas e sem número em destaque sobre o gráfico.
- **Scope**: widgets-graficos, interatividade, ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-022 (active)
- **Decision**: O widget de mapa é um mapa interativo de tiles (MapLibre ou Leaflet), com zoom e arrasto, nas cores do tema, com marcadores por latitude/longitude e um chip só com o rótulo. O mapa-múndi pontilhado da captura, as bandeiras nos chips e o rodapé com relógios não são reproduzidos.
- **Reason**: Pergunta feita: "mapa pontilhado como na captura, mapa de tiles, ou os dois?". O usuário delegou ("Pode fazer todas features desse jeito, sem nem me perguntar."), e o orquestrador indicou o mapa de tiles por coerência com a escolha anterior do usuário, "Marcadores por lat/long".
- **Trade-off**: O mapa depende de um servidor de tiles externo: sem internet o fundo não carrega, e o visual pontilhado da referência se perde.
- **Scope**: widgets-graficos, interatividade (exportar PNG do mapa), ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-023 (active)
- **Decision**: A verificação de telas contra a captura (sub-agente de telas, imagens `*.running.png`, `screens.md`) está dispensada em todas as features. A captura continua sendo a referência de layout para quem implementa.
- **Reason**: Palavras do usuário: "Não precisa da validação do design." e "Ao final vejo como ficou e vou melhorando o código e a aplicação."
- **Trade-off**: Nenhuma checagem independente garante que a tela pronta se parece com a referência; diferenças visuais só aparecem na revisão do próprio usuário.
- **Scope**: Todas as features; fase Execute.
- **Date**: 2026-11-16
- **Status**: active

### AD-024 (active)
- **Decision**: Monorepo pnpm 11 com Node 24: `apps/web` (Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui, ESM), `apps/api` (NestJS 11, CommonJS com `module: nodenext`, compilado com `tsc`) e `packages/contracts` (papéis, matriz de permissões, schemas zod, mensagens em português e códigos de erro; build dual ESM+CJS com tsup). Testes e o Vite resolvem `@ninbi/contracts` direto do código-fonte por alias. Em produção um só processo serve a API em `/api` e o build do web na porta 8080.
- **Reason**: Design de `fundacao-auth`: front e back validam com os mesmos schemas e mostram as mesmas mensagens; um só processo simplifica o self-hosted (AD-001).
- **Trade-off**: O pacote compartilhado exige build antes do `typecheck` da API; o build do web e da API sobem juntos.
- **Scope**: Todas as features.
- **Date**: 2026-11-16
- **Status**: active

### AD-025 (active)
- **Decision**: Drizzle ORM com migrações SQL geradas pelo drizzle-kit em `apps/api/drizzle/`, aplicadas no start do app. Produção usa `node-postgres`; os testes rápidos usam PGlite em memória com o mesmo schema e as mesmas migrações.
- **Reason**: Drizzle tem driver oficial para PGlite, o que permite testar contra PostgreSQL real em processo, sem serviço externo.
- **Trade-off**: PGlite tem uma conexão só: concorrência é provada nos testes de integração (AD-026).
- **Scope**: Todas as features com dados.
- **Date**: 2026-11-16
- **Status**: active

### AD-026 (active)
- **Decision**: Vitest em todo o monorepo (API com `unplugin-swc` para os metadados de decorators do Nest; web com jsdom, Testing Library, user-event e MSW). Três níveis: testes rápidos sem serviço externo (PGlite e `FakeNeo4jGateway`), que são o gate de cada task; testes de integração em `apps/api/test-int/` contra o PostgreSQL e o Neo4j de um `docker-compose.dev.yml` de vida longa (`postgres:17-alpine`, `neo4j:5-community`, volumes nomeados, projeto `ninbi-dev`, subido por `pnpm infra:up` de forma idempotente); e um smoke do `docker-compose.yml` de produção (`pnpm smoke`). Nada de Testcontainers nem container criado por execução. A imagem do app só é construída pelo smoke, que termina com `docker compose down -v` e `docker image prune -f`. Todo nome de teste começa com o ID do requisito, e todo script de teste roda com `--reporter=verbose`.
- **Reason**: Pedido do usuário via orquestrador: testes rápidos sem serviço; Docker instalado ("instalei o docker. pode ser feliz ai, mas cuidado com o uso de disco.") com o disco C quase cheio.
- **Trade-off**: As checks que dependem do Docker só rodam com o Docker Desktop ligado; o smoke ocupa a porta 8080 enquanto roda.
- **Scope**: Todas as features.
- **Date**: 2026-11-16
- **Status**: active

### AD-027 (active)
- **Decision**: Sessão por token opaco aleatório no cookie `ninbi_session` (httpOnly, SameSite=Lax, `Secure` por `NINBI_COOKIE_SECURE`), com só o SHA-256 do token na tabela `sessions` e expiração deslizante de 7 dias por `last_used_at`. Papel e situação do usuário são lidos do banco a cada requisição. Redefinir senha e desativar apagam as sessões do usuário. Senha provisória restringe a sessão a `me`, `initial-password` e `logout`.
- **Reason**: Revogação imediata (USR-07, USR-09, USR-15) e troca de papel na próxima requisição (ROLE-05), sem segredo de assinatura para configurar.
- **Trade-off**: Uma consulta ao banco por requisição autenticada.
- **Scope**: Todas as features.
- **Date**: 2026-11-16
- **Status**: active

### AD-028 (active)
- **Decision**: Senhas com `scrypt` de `node:crypto` (N=16384, r=8, p=1, sal de 16 bytes), no formato `scrypt$N$r$p$sal$hash`.
- **Reason**: Hash com sal sem dependência nativa, que compila igual no Windows e no Alpine.
- **Trade-off**: Argon2id seria mais resistente a GPU; trocar depois exige rehash no login.
- **Scope**: fundacao-auth e qualquer feature que guarde senha de usuário.
- **Date**: 2026-11-16
- **Status**: active

### AD-029 (active)
- **Decision**: A matriz de papéis da spec de `fundacao-auth` é código em `packages/contracts/src/roles.ts` (`ROLE_PERMISSIONS`, `can()`), aplicada no backend por `@RequirePermission` com `PermissionGuard` global e lida pelo frontend para sidebar, abas e páginas. A permissão por dashboard ("pode ver", "pode editar") fica num `DashboardAccessService` que combina papel global e compartilhamentos, sem substituir a matriz. Erros da API têm o corpo `{ code, message, fieldErrors? }`, com `message` já em português.
- **Reason**: Uma fonte única para a regra que governa todas as features (ROLE-01).
- **Trade-off**: Nova permissão exige mudar o pacote compartilhado e os dois apps.
- **Scope**: Todas as features.
- **Date**: 2026-11-16
- **Status**: active

### AD-030 (active)
- **Decision**: O bloqueio por tentativas de login usa a tabela `login_throttle` no PostgreSQL, por e-mail em minúsculas: a 5ª falha em 15 minutos bloqueia por 15 minutos a partir dela.
- **Reason**: Sobrevive a restart sem Redis nem serviço extra.
- **Trade-off**: Um atacante pode bloquear o login de um e-mail conhecido por 15 minutos.
- **Scope**: fundacao-auth.
- **Date**: 2026-11-16
- **Status**: active

### AD-031 (active)
- **Decision**: Os tokens do tema vivem só em `apps/web/src/styles/theme.css`, em hexadecimal: `:root` é o claro e `.dark` o escuro, com a classe `dark` em `<html>` por padrão. Paleta tirada a olho da logo: roxo `#8B5CF6`, ciano `#2EE6F0`, azul `#4C9EFF`, magenta `#D946EF`, fundo escuro `#0B0D12`; `--gradient-brand` vai do roxo ao ciano. Texto, ícones e linhas finas em ciano usam `--accent-text`, que no claro é `#08717E` para passar de 4,5:1. Fonte Plus Jakarta Sans empacotada com fontsource, sem CDN. Nenhum `.tsx` escreve cor literal. Os gráficos usam `--chart-1..5` (ciano, roxo, magenta, `#6F7CF7`, `#4C9EFF`).
- **Reason**: AD-017 e AD-018; a família da fonte e os valores das cores foram delegados ao Design.
- **Trade-off**: O "BI" do logotipo no tema claro é um ciano escuro, não o ciano da logo; as cores foram medidas sem ferramenta e podem ser ajustadas mantendo os nomes.
- **Scope**: Todas as features com tela.
- **Date**: 2026-11-16
- **Status**: active

### AD-032 (active)
- **Decision**: Seams das features seguintes: `CryptoService` com AES-256-GCM e chave de 32 bytes em base64 de `NINBI_ENCRYPTION_KEY` (formato `v1:<iv>:<tag>:<cifra>`); `Neo4jGateway` sobre `neo4j-driver` com `session.executeRead`, simulado por `FakeNeo4jGateway` nos testes rápidos; `LlmModule` com `ChatModelFactory` sobre os pacotes `@langchain/*`, simulado por `FakeListChatModel` nos testes.
- **Reason**: As features seguintes precisam de testes sem serviço externo (AD-026) e de credenciais criptografadas (specs de `conexoes-schema` e `ia-cypher`).
- **Trade-off**: Os fakes não pegam diferenças de comportamento do Neo4j e dos provedores; os testes de integração contra o Neo4j do compose de dev cobrem a leitura real.
- **Scope**: conexoes-schema, dashboards-consultas, ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-033 (active)
- **Decision**: As abas de "Configurações" vêm de um registro único (`SETTINGS_TABS`: Conexões, Usuários, LLM, nessa ordem), cada uma com permissão e um sinal `available` que a feature dona liga. O item "Configurações" só aparece na sidebar quando o papel vê ao menos uma aba disponível: nesta feature só o Admin o vê; o Editor passa a vê-lo quando `conexoes-schema` liga a aba "Conexões". A aba ativa fica na URL (`/configuracoes/<aba>`).
- **Reason**: ROLE-04 e CFG-02: o Editor não deve ver uma página sem conteúdo.
- **Trade-off**: Cada feature com aba altera o registro.
- **Scope**: fundacao-auth, conexoes-schema, ia-cypher, compartilhamento, dashboards-consultas.
- **Date**: 2026-11-16
- **Status**: active

### AD-034 (active)
- **Decision**: O dataset de exemplo do Neo4j é o "Varejo" (`infra/neo4j/seed.cypher`): 12 lojas com latitude e longitude, 6 categorias, 60 produtos, 200 clientes e 2.000 pedidos com data em 24 meses e valor, ligados por `FEZ`, `CONTEM`, `PERTENCE_A` e `VENDIDO_EM`. É determinístico e idempotente pelo nó `(:NinbiSeed {versao: 1})`, e roda por um serviço `neo4j-seed` com a própria imagem do Neo4j.
- **Reason**: A spec pede categorias, números, datas e latitude/longitude para exercitar todos os widgets; o dataset Movies não tem coordenadas.
- **Trade-off**: Dados sintéticos, sem significado de negócio.
- **Scope**: fundacao-auth, e o dado de demonstração de todas as features.
- **Date**: 2026-11-16
- **Status**: active

### AD-035 (active)
- **Decision**: Biome é o lint e o formatador do monorepo (`pnpm lint` = `biome check .`), ignorando `src/components/ui` gerado pelo shadcn, `dist`, `drizzle` e `.specs`.
- **Reason**: Uma ferramenta, configuração mínima, rápida no Windows.
- **Trade-off**: Sem as regras específicas de plugins ESLint (react-hooks, por exemplo).
- **Scope**: Todas as features.
- **Date**: 2026-11-16
- **Status**: active

### AD-036 (active)
- **Decision**: As rotas do web são em português: `/entrar`, `/primeiro-acesso`, `/definir-senha`, `/`, `/configuracoes/<aba>`. Um 401 leva a `/entrar?voltar=<caminho>`, e `voltar` só é aceito quando começa com `/` e não com `//`. Roteamento com React Router 7 em modo biblioteca, estado de servidor com TanStack Query, formulários com react-hook-form e os schemas de `@ninbi/contracts`.
- **Reason**: Interface só em português (AD-010), AUTH-08.
- **Trade-off**: Nenhum relevante.
- **Scope**: Todas as features com tela.
- **Date**: 2026-11-16
- **Status**: active

### AD-037 (active)
- **Decision**: Cada task da Execute leva `**Model**: sonnet` ou `**Model**: haiku`. Toda task com testes é `sonnet`; `haiku` só para tasks sem testes e mecânicas (config, scaffolding, assets, wiring trivial). As fases são montadas para que cada lote de execução de cerca de 7 tasks tenha um só modelo, e o Execution Plan lista os lotes com o modelo de cada um.
- **Reason**: Pipeline de modelos definido pelo usuário, repassado pelo orquestrador.
- **Trade-off**: Fases com tamanho dirigido pelo lote, não só pela coesão.
- **Scope**: Todas as features; fase Tasks.
- **Date**: 2026-11-16
- **Status**: active

## Handoff

- **Feature**: MVP do NinBI, oito features em `.specs/features/`, nesta ordem de dependência:
  1. `fundacao-auth` - ambiente, login, papéis, shell, página "Configurações" e tema
  2. `conexoes-schema` - conexões Neo4j e schema enriquecido
  3. `dashboards-consultas` - dashboards privados, sidebar organizada por usuário, abas, grade, editor de Cypher, execução somente leitura, widget de tabela
  4. `compartilhamento` - equipes, compartilhar com usuários, equipes e todos, "pode ver" e "pode editar"
  5. `widgets-graficos` - gráficos shadcn, KPI, lista, mapa, mapeamento resultado para gráfico
  6. `ia-cypher` - configuração do LLM, texto para Cypher por widget, autocorreção
  7. `interatividade` - filtros globais, auto-refresh, cross-filtering, exportação CSV e PNG
  8. `ia-dashboard` - chat lateral e geração do dashboard inteiro
- **Phase / Task**: Specify concluído - as oito specs estão aprovadas pelo usuário em 2026-11-16, sem perguntas abertas
- **Completed**: none (nenhuma task; só specs)
- **In-progress** (file:line): none
- **Next step**: Design e Tasks de `fundacao-auth`, depois as demais features na ordem acima. A verificação de telas está dispensada (AD-023).
- **Blockers**: none
- **Uncommitted files**: `.specs/` inteiro (o projeto ainda não é um repositório git)
- **Branch**: none
