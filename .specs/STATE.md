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

### AD-038 (active)
- **Decision**: A leitura do schema é assíncrona. O estado fica na linha da conexão (`schema_status`: `NEVER`, `READING`, `READY`, `FAILED`, com `schema_read_started_at` e `schema_error`). Um `UPDATE ... WHERE schema_status <> 'READING' ... RETURNING` faz o claim atômico; sem claim, a rota devolve o estado atual. `POST .../schema/refresh` responde 202 na hora, e o web consulta `GET .../schema` a cada 2 s enquanto `READING`. Um `READING` iniciado há mais de 150 s é tratado como órfão.
- **Reason**: Uma requisição HTTP de até 120 s é frágil; o claim no PostgreSQL impede duas leituras ao mesmo tempo (SCH-11) mesmo entre abas e usuários. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: A tela faz polling; a leitura roda dentro do processo da API e se perde num restart (o estado órfão expira em 150 s).
- **Scope**: conexoes-schema, ia-cypher e ia-dashboard (exigem `READY`).
- **Date**: 2026-11-16
- **Status**: active

### AD-039 (active)
- **Decision**: O cache do schema é um documento JSONB por conexão em `connection_schemas`, substituído inteiro a cada leitura. Todo exemplo é guardado como literal Cypher em texto (strings entre aspas, `date('...')`, `point({...})`, listas e mapas). As escolhas "Enviar exemplo à IA" ficam em `schema_example_opt_outs` (conexão, tipo do elemento, elemento, propriedade): a presença da linha desliga o envio; linhas de elementos ou propriedades que somem são apagadas na gravação. `SchemaQueryService.get(connectionId)` devolve `ConnectionSchemaDto` em ordem alfabética, com `sendExample` por propriedade.
- **Reason**: O schema é lido e escrito inteiro; as escolhas do Admin precisam sobreviver à troca do documento (SCH-23, SCH-25, SCH-28). Um literal Cypher serve igual para a tela e para o prompt da IA (SCH-27, AD-005).
- **Trade-off**: Consultar uma propriedade isolada exige ler o documento inteiro; strings aparecem com aspas na tela.
- **Scope**: conexoes-schema, ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-040 (active)
- **Decision**: `Neo4jGateway` (AD-032) tem `verify(cfg, { timeoutMs })` e `read(cfg, cypher, params, { timeoutMs, maxRows?, signal? })`. O driver real abre um driver por operação e o fecha no fim, com `defaultAccessMode: READ`, `session.executeRead` e `timeout` na transação; banco `null` usa o padrão do servidor. `read` devolve os valores nativos do `neo4j-driver`. Erros viram `Neo4jTimeoutError` ou `Neo4jGatewayError` com a mensagem original do Neo4j. Prazos: 10 s para verificar uma conexão e 120 s para a leitura inteira do schema.
- **Reason**: Uma porta única e só de leitura para o Neo4j do usuário (SCH-12), simulável pelo `FakeNeo4jGateway` nos testes rápidos (AD-026).
- **Trade-off**: Abrir um driver por operação custa uma conexão TCP e uma autenticação por consulta; `dashboards-consultas` pode acrescentar um cache de drivers sem mudar a interface.
- **Scope**: conexoes-schema, dashboards-consultas, ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-041 (active)
- **Decision**: Ao ligar a aba "Conexões" (`available: true` em `SETTINGS_TABS`), a task que liga a aba atualiza os testes de `fundacao-auth` ROLE-04 e CFG-02 para a nova expectativa: o Editor passa a ver "Configurações" com a aba "Conexões"; o Admin vê "Conexões" e "Usuários", nessa ordem; o Visualizador continua sem o item. A mudança cumpre AD-033 e não afrouxa nenhuma asserção.
- **Reason**: AD-033 já previa que o Editor veria "Configurações" quando `conexoes-schema` ligasse a aba; sem registro, a troca de expectativa pareceria um teste alterado para passar.
- **Trade-off**: Uma task desta feature toca testes de outra feature.
- **Scope**: conexoes-schema, fundacao-auth (testes de sidebar e de configurações).
- **Date**: 2026-11-16
- **Status**: active

### AD-042 (active)
- **Decision**: A organização da sidebar é um documento JSONB por usuário em `sidebar_layouts`, trocado inteiro por `PUT /api/sidebar`; a última gravação vale. `GET /api/sidebar` monta a lista na leitura: tira os dashboards que o usuário não alcança mais ou que foram apagados e acrescenta no fim, soltos, os que ele alcança e ainda não estão no documento. A sidebar mostra os dashboards próprios e os compartilhados com o usuário; o Admin chega aos dos outros pela aba "Dashboards" de "Configurações" e pela URL, sem que eles entrem na sua sidebar. Ids de grupo são UUIDs gerados no navegador. Grupo aberto ou recolhido fica em `localStorage['ninbi-sidebar-collapsed']`.
- **Reason**: Arrastar, criar, renomear e excluir grupo viram uma rota só (SIDE-03 a SIDE-09, SIDE-17); criar, apagar e compartilhar dashboards não precisam mexer na sidebar de ninguém (DASH-05, DASH-11). Pôr todos os dashboards da instalação na sidebar do Admin tornaria a aba "Dashboards" inútil. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Cada gesto regrava o documento inteiro; duas janelas não se mesclam (vale a última). O Admin não vê os dashboards dos outros na sidebar.
- **Scope**: dashboards-consultas, compartilhamento (dashboards compartilhados entram na sidebar pela montagem).
- **Date**: 2026-11-16
- **Status**: active

### AD-043 (active)
- **Decision**: O dashboard é gravado inteiro por `PUT /api/dashboards/:id` (nome, conexão, abas, widgets e layout) com controle otimista por `dashboards.version`: `UPDATE ... WHERE version = $v`; versão velha responde 409 `DASHBOARD_VERSION_CONFLICT`. Ids de abas e widgets são UUIDs gerados no navegador e mantidos entre gravações; id de outro dashboard é recusado. Widgets guardam `visualization` (texto, padrão `'TABLE'`) e `config` (JSONB) para as features seguintes. Para quem não pode editar, o `DashboardDto` traz `cypher: null` e `hasQuery`.
- **Reason**: "Salvar" grava tudo de uma vez (EDIT-02) e recusa quem salva sobre versão desatualizada (EDIT-04); quem só vê não enxerga Cypher (Assumptions da spec).
- **Trade-off**: Cada gravação apaga e reinsere abas e widgets; o histórico de alterações não existe.
- **Scope**: dashboards-consultas, widgets-graficos, ia-cypher, interatividade, ia-dashboard, compartilhamento (ACL-17).
- **Date**: 2026-11-16
- **Status**: active

### AD-044 (active)
- **Decision**: `DashboardAccessService` (`find`, `assert(user, id, 'view' | 'edit' | 'delete')`, `sidebarDashboardIds`) decide o acesso a todo dashboard: dono e Admin (`dashboards.all`) veem, editam e excluem; compartilhamento `edit` vê e edita; `view` só vê. Sem acesso, ou dashboard inexistente, responde 404 `DASHBOARD_NOT_FOUND`; alcança sem a permissão pedida, 403. Os compartilhamentos chegam por `DashboardShareResolver` (token `DASHBOARD_SHARE_RESOLVER`): `NoSharesResolver` nesta feature, trocado pela implementação de `compartilhamento`; os testes usam `FakeShareResolver`.
- **Reason**: AD-014, AD-015 e AD-029; DASH-19, QRY-11 e QRY-12 precisam ser testáveis antes de existir o compartilhamento.
- **Trade-off**: Uma consulta a mais por requisição de dashboard; `compartilhamento` só troca o provider.
- **Scope**: dashboards-consultas, compartilhamento, widgets-graficos, ia-cypher, interatividade, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-045 (active)
- **Decision**: Toda consulta ao Neo4j do usuário passa por `QueryService.run` e por `validateReadOnlyCypher` (`apps/api/src/queries/`). O validador ignora strings, comentários e identificadores entre crases, recusa nesta ordem: mais de 20.000 caracteres, mais de uma instrução, cláusula bloqueada; uma palavra logo depois de `.` ou `$` não é cláusula. Há duas rotas: `POST /api/dashboards/:id/query` (texto, só quem edita, com `connectionId` opcional) e `POST /api/dashboards/:id/widgets/:widgetId/run` (Cypher salvo, quem vê; erros do Neo4j viram "Não foi possível carregar este widget" para quem não edita). Limites por `NINBI_QUERY_TIMEOUT_MS` (padrão 30000) e `NINBI_QUERY_MAX_ROWS` (padrão 5000); o gateway lê `maxRows + 1` para saber se cortou. `Neo4jGatewayError` ganha `code?: string`. Resultados vão como `{ columns, rows: ResultValue[][], truncated, rowLimit }`, com inteiros fora de ±(2^53 − 1) em `{ kind: 'bigint' }` e nós, relacionamentos, listas e mapas em `{ kind: 'json' }`. Sem cache de drivers nem de resultados.
- **Reason**: QRY-01 a QRY-16, TBL-06 e TBL-08; AD-012 pede testes da validação somente leitura. `ia-cypher` (AIQ-07) e `interatividade` (FLT-06) reaproveitam a mesma validação e os mesmos limites.
- **Trade-off**: `RETURN n.set` passa e `{set: 1}` é recusado (o usuário usa crases); um dashboard com muitos widgets abre uma conexão por widget; sair da tela não cancela a transação no Neo4j antes do prazo.
- **Scope**: dashboards-consultas, widgets-graficos, ia-cypher, interatividade, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-046 (active)
- **Decision**: No web, a grade usa `react-grid-layout` (12 colunas, compactação vertical, largura medida por `ResizeObserver`); o arrastar da sidebar usa o drag and drop nativo do HTML5; o editor de Cypher é `react-simple-code-editor` com o realce do `prismjs` (gramática `cypher`). A página do dashboard fica em `/dashboards/:dashboardId` (`?editar=1` abre em edição); a aba ativa e o modo de edição são estado da página. A aba "Dashboards" (`dashboards`, permissão `dashboards.all`) entra em `SETTINGS_TABS` entre "Usuários" e "LLM", e a task que a liga atualiza o teste CFG-02 de `fundacao-auth` (Admin vê "Conexões", "Usuários" e "Dashboards", nessa ordem), como em AD-041.
- **Reason**: Bibliotecas testáveis no jsdom (textarea real, `fireEvent` de arrastar, grade com largura fixa no teste); a spec abre sempre na primeira aba (DASH-08); DASH-20 pede a aba só para Admin.
- **Trade-off**: O editor de Cypher não tem autocompletar; a aba ativa não sobrevive a recarregar a página.
- **Scope**: dashboards-consultas, widgets-graficos, ia-cypher, ia-dashboard, fundacao-auth (teste CFG-02).
- **Date**: 2026-11-16
- **Status**: active

### AD-047 (active)
- **Decision**: Equipes e compartilhamentos ficam em três tabelas: `teams` (nome até 40, único por `lower(name)`), `team_members` (chave `(team_id, user_id)`) e `dashboard_shares` (`recipient_type` `USER`, `TEAM` ou `EVERYONE`; `user_id` ou `team_id`; `permission` `view` ou `edit`; `recipient_key` `user:<id>`, `team:<id>` ou `everyone`, único por dashboard). Apagar dashboard ou equipe apaga os compartilhamentos em cascata; usuários só são desativados, e as linhas deles ficam.
- **Reason**: `ON CONFLICT (dashboard_id, recipient_key) DO UPDATE` dá uma linha por destinatário e faz a última gravação valer (SHARE-09, SHARE-17) sem índices parciais; as chaves estrangeiras cumprem TEAM-08 e SHARE-18. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: `recipient_key` repete o que `user_id`/`team_id` já dizem; um check mantém os dois coerentes.
- **Scope**: compartilhamento.
- **Date**: 2026-11-16
- **Status**: active

### AD-048 (active)
- **Decision**: `DbShareResolver` substitui o `NoSharesResolver` no token `DASHBOARD_SHARE_RESOLVER` (AD-044), que é apagado. A permissão é calculada no SQL a cada requisição, sem cache: a mais alta entre compartilhamento direto, equipes de que o usuário é membro e `EVERYONE`. O `DashboardAccessService` limita o papel Visualizador a "pode ver", ganha `canShare` e `assert(..., 'share')` (dono ou `dashboards.all`, como `delete`), e responde à falta de `edit` com 403 `DASHBOARD_EDIT_FORBIDDEN` "Você não tem mais permissão para editar este dashboard". `DashboardDto.permissions` ganha `share`; a task que o acrescenta atualiza o teste DASH-18 de `dashboards-consultas` para a nova expectativa, sem afrouxar asserções.
- **Reason**: ACL-01, ACL-02, ACL-13, ACL-14, ACL-15, SHARE-01; TEAM-05, SHARE-07 e SHARE-08 valem na próxima requisição. O limite do Visualizador no serviço, e não no dado, corta a edição de quem vira Visualizador sem reescrever compartilhamentos. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Uma consulta com subconsulta de equipes por requisição de dashboard; um compartilhamento `edit` gravado para quem depois vira Visualizador fica no banco e só não vale.
- **Scope**: compartilhamento, dashboards-consultas (acesso e DTO), widgets-graficos, ia-cypher, interatividade, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-049 (active)
- **Decision**: Os compartilhamentos de um dashboard ficam em `GET`, `POST` (cria ou atualiza pelo destinatário), `PATCH /:shareId` e `DELETE /:shareId` sob `/api/dashboards/:id/shares`, e a busca em `GET /api/dashboards/:id/share-candidates?q=`. Toda rota passa por `assert(user, id, 'share')`: quem não alcança o dashboard recebe 404 `DASHBOARD_NOT_FOUND`, e quem alcança sem ser dono nem Admin, 403. Toda mutação devolve o `DashboardSharesDto` inteiro. A API recusa com 400 o dono como destinatário, usuário inexistente ou desativado, equipe inexistente e "Pode editar" para um Visualizador.
- **Reason**: SHARE-12 pede 403 para quem não é dono nem Admin; o 404 para quem nem alcança segue AD-044 e não revela que o dashboard existe. A lista inteira na resposta deixa o web trocar o cache de uma vez e manter a lista anterior em erro (SHARE-14). Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Um usuário sem alcance recebe 404, não o 403 literal de SHARE-12; cada mutação devolve a lista toda.
- **Scope**: compartilhamento.
- **Date**: 2026-11-16
- **Status**: active

### AD-050 (active)
- **Decision**: As rotas de equipe (`GET`, `POST /api/teams`, `PATCH` e `DELETE /api/teams/:id`) usam a permissão existente `users.manage`; nenhuma permissão global nova é criada. `PATCH` com `memberIds` troca a lista inteira de membros. `TeamDto` traz `memberCount`, `members` e `shareCount` (dashboards compartilhados com a equipe, para a confirmação de TEAM-07). Nome repetido sem diferenciar maiúsculas responde 400 em `fieldErrors.name` com "Já existe uma equipe com este nome".
- **Reason**: As equipes ficam na aba "Usuários", que já é só do Admin (AD-016); TEAM-09 pede 403 para Editor e Visualizador. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Gerenciar usuários e gerenciar equipes não podem ser separados por papel.
- **Scope**: compartilhamento.
- **Date**: 2026-11-16
- **Status**: active

### AD-051 (active)
- **Decision**: Refina AD-042: `SidebarDto` ganha `shared`, a seção "Compartilhados comigo", com os dashboards compartilhados com o usuário que ainda não estão no documento dele, em ordem de criação; os próprios que faltam continuam no fim, soltos. Arrastar um item de "Compartilhados comigo" para a sidebar o grava no documento (`moveItem` insere o que não está no layout), e ele sai da seção. O `GET /api/sidebar` tira do documento gravado os ids que o usuário não alcança mais e o regrava. A task que faz isso atualiza o teste DASH-01 de `dashboards-consultas` (o compartilhado fora do layout passa a vir em `shared`).
- **Reason**: ACL-04, ACL-05, ACL-09, ACL-10 e a decisão delegada da spec: "Aparece sozinho na seção fixa 'Compartilhados comigo'". Podar o documento faz um novo compartilhamento do mesmo dashboard voltar à seção, e não ao grupo antigo.
- **Trade-off**: O `GET` da sidebar pode gravar; a seção não aceita receber itens arrastados de volta.
- **Scope**: compartilhamento, dashboards-consultas (sidebar).
- **Date**: 2026-11-16
- **Status**: active

### AD-052 (active)
- **Decision**: A busca de destinatários roda no backend: usuários ativos, sem o dono, com nome ou e-mail `ILIKE %q%`; equipes com nome `ILIKE %q%`; `%`, `_` e `\` escapados; até 20 de cada, em ordem de nome; "Todos da instalação" sempre oferecido. O web atrasa a busca 250 ms. A lista de compartilhamentos sai na ordem "Todos da instalação", equipes, usuários, cada grupo por nome em `pt-BR`.
- **Reason**: Filtrar é regra e roda numa camada testada (SHARE-04, SHARE-05, SHARE-11); o web não recebe a lista inteira de usuários. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: A busca não ignora acentos ("Joao" não acha "João"): `unaccent` exigiria extensão no PostgreSQL e no PGlite.
- **Scope**: compartilhamento.
- **Date**: 2026-11-16
- **Status**: active

### AD-053 (active)
- **Decision**: Cada criação, mudança e remoção de compartilhamento gera uma linha em `Logger('Share')`: `share action=<created|updated|removed> by=<userId> dashboard=<id> recipient=<user:<id>|team:<id>|everyone> permission=<view|edit>`; `created` ou `updated` sai de `RETURNING (xmax = 0)`. Excluir equipe gera `team deleted by=<id> team=<id> shares=<n>` em `Logger('Team')`.
- **Reason**: ACL-11, no mesmo formato chave=valor dos logs de HTTP e de consulta. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: O log usa ids, não nomes: quem audita cruza com o banco.
- **Scope**: compartilhamento.
- **Date**: 2026-11-16
- **Status**: active

### AD-060 (active)
- **Decision**: As visualizações de widget são `TABLE`, `LIST`, `AREA`, `BAR`, `LINE`, `PIE`, `RADAR`, `RADIAL`, `KPI` e `MAP` (`WIDGET_VISUALIZATIONS` em `packages/contracts/src/widget-config.ts`, rótulos "Tabela" a "Mapa" na ordem de VIZ-01). `widgets.config` guarda `{ mapping }`, com as colunas referidas pelo nome do `RETURN` e um formato por visualização (`x`/`series`/`stacked`/`horizontal`; `category`/`value`/`donut`; `axis`/`series`; `value`/`change`; `lat`/`lon`/`label`; `primary`/`secondary`/`values`); `TABLE` usa `{}`. O `dashboardSaveSchema` aceita só essas visualizações e valida o `config` pela visualização, com "Configuração da visualização inválida". O painel não confere se a coluna existe no resultado: o card avisa (VIZ-12, VIZ-20).
- **Reason**: VIZ-15; `ia-cypher`, `ia-dashboard` e `interatividade` leem e escrevem o mesmo formato, e um nome de coluna sobrevive a reordenar o `RETURN`. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Renomear uma coluna no Cypher quebra o mapeamento até o Editor refazê-lo; uma visualização nova exige mudar o contrato.
- **Scope**: widgets-graficos, ia-cypher, interatividade, ia-dashboard, dashboards-consultas (contrato do widget).
- **Date**: 2026-11-16
- **Status**: active

### AD-061 (active)
- **Decision**: Os gráficos usam o componente `chart` do shadcn (Recharts), instalado pelo CLI. O resultado vira dados de gráfico só em funções puras de `apps/web/src/features/widgets/mapping/` (`suggest.ts`, `chart-data.ts`, `simple-data.ts`, `columns.ts`); os componentes só desenham. As séries usam chaves seguras `s0..sN` (categorias `c0..cN`) com o nome da coluna como rótulo e a cor `var(--chart-((i % 5) + 1))`; área de uma série usa o gradiente `--brand-purple` → `--brand-cyan`. O intervalo dos rótulos do eixo X é calculado por `tickInterval` (7 px por caractere + 16 px). Os testes do web fixam o tamanho dos elementos com `mockElementSize` (`src/test/element-size.ts`), e a dica é provada pelo conteúdo de `NinbiTooltip`.
- **Reason**: Pedido "os gráficos todos do shadcn" e AD-018/AD-031; AD-012 pede o mapeamento coberto por testes unitários; o shadcn transforma a chave da série em variável CSS, e nomes de coluna podem ter espaço e acento; o jsdom não mede texto nem elementos. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: O gesto de passar o cursor sobre o gráfico não é provado no jsdom; o corte de rótulos é uma estimativa, não uma medida do texto.
- **Scope**: widgets-graficos, interatividade, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-062 (active)
- **Decision**: Refina AD-022: o mapa usa Leaflet com `react-leaflet` e tiles raster. A URL vem de `NINBI_MAP_TILE_URL` (padrão `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; precisa ter `{z}`, `{x}` e `{y}`, senão o app não sobe) e a atribuição de `NINBI_MAP_ATTRIBUTION` (padrão `© OpenStreetMap`), entregues ao web por `GET /api/map-config` a qualquer usuário logado. O tema escuro escurece os tiles com um filtro CSS em `.dark .ninbi-map-tiles` (`theme.css`). A camada nasce com `crossOrigin: 'anonymous'` para a exportação PNG de `interatividade`. Os controles de zoom ficam em português.
- **Reason**: MapLibre exige WebGL, que o jsdom não tem; a URL é da instalação e só existe em tempo de execução, não no build do Vite (AD-001, AD-024). Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: O mapa escuro é uma inversão de cores, não um estilo desenhado; o servidor público do OpenStreetMap limita uso pesado, e instalações grandes precisam trocar a URL.
- **Scope**: widgets-graficos, interatividade (exportar PNG do mapa), ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-063 (active)
- **Decision**: Uma coluna é numérica quando tem ao menos um valor não nulo e todos os não nulos são números ou `{ kind: 'bigint' }`. Papéis numéricos são `series` (área, barras, linha, radar) e `value` (pizza, radial): coluna ausente dá a mensagem de VIZ-12 e coluna sem números a de VIZ-13. O valor do KPI, os valores da lista e as coordenadas do mapa não são papéis numéricos (KPI-05, LIST-01, MAP-03/MAP-04). Nos gráficos, `bigint` vira `Number`. Formatos em `apps/web/src/lib/format.ts`: números com até duas casas (`1.234,56`), texto que começa com `AAAA-MM-DD` vira `DD/MM/AAAA` sem conversão de fuso, `bigint` com todos os dígitos, booleano "Sim"/"Não", nulo "—". A mensagem de MAP-03 com uma linha só fica no singular: "1 linha sem coordenadas válidas".
- **Reason**: A spec deixou ao design o que é coluna numérica e como datas do Neo4j (texto pelo `toString()` do driver, AD-045) viram `dd/MM/aaaa` (VIZ-17). Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Números guardados como texto no Neo4j não contam como numéricos; inteiros acima de 2^53 perdem precisão só no desenho.
- **Scope**: widgets-graficos, interatividade, ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-080 (active)
- **Decision**: A configuração do LLM é uma linha única em `llm_settings` (`id = 1`): provedor (`OPENAI`, `ANTHROPIC`, `GOOGLE`, `OLLAMA`, `OPENAI_COMPATIBLE`), modelo, URL base, chave cifrada pelo `CryptoService` (AD-032) e os 4 últimos caracteres da chave em coluna própria. Rotas `GET`, `PUT` e `DELETE /api/llm-config` e `POST /api/llm-config/test`, todas com `llm.manage`; nenhum DTO tem a chave. Chave vazia no `PUT` mantém a guardada; OpenAI, Anthropic e Google Gemini exigem chave informada ou guardada; Ollama e "Compatível com OpenAI" exigem URL base. "Testar" usa os valores do formulário (com a chave guardada quando vem vazia) e manda só "Responda apenas: ok". `GET /api/ai/status` (`ai.use`) devolve só `{ configured }`.
- **Reason**: LLM-03 a LLM-13 e AIQ-16; os 4 últimos caracteres aparecem na tela sem decifrar a chave a cada leitura. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: 4 caracteres da chave ficam legíveis no banco; "Testar" não prova a configuração já salva quando o formulário foi alterado.
- **Scope**: ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-081 (active)
- **Decision**: Refina AD-032. Toda chamada ao provedor passa por `LlmClient.call(snapshot, mensagens, { userId, purpose, attempt, signal })`, que cria o modelo pelo `ChatModelFactory` (token `CHAT_MODEL_FACTORY`; `ChatOpenAI`, `ChatAnthropic`, `ChatGoogleGenerativeAI`, `ChatOllama`, e `ChatOpenAI` com `baseURL` para "Compatível com OpenAI"; `maxRetries: 0`, `temperature: 0`), aplica 60 s por `AbortSignal` (token `LLM_CALL_TIMEOUT_MS`), classifica o erro em `AI_PROVIDER_AUTH`, `AI_PROVIDER_RATE_LIMIT`, `AI_PROVIDER_TIMEOUT`, `AI_PROVIDER_CONTEXT` ou `AI_PROVIDER_FAILED` (status HTTP, `lc_error_code`, código e texto de contexto excedido) e grava `ai call purpose=<widget|test> user=<id> provider=<p> model=<m> attempt=<n|-> durationMs=<n> result=<...>` em `Logger('Ai')`, sem chave, mensagens nem schema. Nos testes, `FakeChatModelFactory` cria um `ScriptedChatModel` (estende `SimpleChatModel`) com roteiro `texto | Error | 'hang'` que guarda as mensagens recebidas; `createTestApp({ chatModels })` registra o fake. Nenhum teste chama provedor real; o `FakeListChatModel` de AD-032 não é usado porque não guarda as mensagens nem lança erro.
- **Reason**: AIQ-21 a AIQ-27 e LLM-09/LLM-10 precisam de prazo, cancelamento e erros reproduzíveis; AIQ-06 precisa inspecionar o que foi enviado. `ia-dashboard` reaproveita o mesmo cliente.
- **Trade-off**: A classificação depende do formato de erro de cada SDK, que muda entre versões; o que não casa vira "Erro do provedor de IA: <mensagem>". Sem nova tentativa automática, uma falha passageira do provedor exige reenviar o pedido.
- **Scope**: ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-082 (active)
- **Decision**: A IA responde com um objeto JSON em texto, `{ cypher, visualization, mapping, title }`, sem `withStructuredOutput` nem tool calling. `parseWidgetReply` aceita cercas de código, o primeiro objeto JSON balanceado e, na falta dele, um bloco `cypher`; sem Cypher, a resposta conta como tentativa que falhou. `normalizeWidgetReply`: visualização fora de `WIDGET_VISUALIZATIONS` vira `TABLE`; mapeamento que não passa em `widgetMappingSchemas` vira `null`; título com `trim`, até 80, vazio fica com o título atual. O prompt de sistema lista as 10 visualizações e o formato do mapeamento de cada uma (AD-060).
- **Reason**: AD-006 proíbe depender de recurso de um provedor só; Ollama e "Compatível com OpenAI" não garantem saída estruturada. FIX-05 e AIQ-20.
- **Trade-off**: Modelos fracos gastam tentativas com JSON malformado.
- **Scope**: ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-083 (active)
- **Decision**: A geração por widget é `POST /api/dashboards/:id/ai/widget` (`ai.use` e `assert(user, id, 'edit')`) com corpo `{ prompt, widgetId, connectionId?, widget: { title, cypher, visualization, config } }` tirado do rascunho. Erros anteriores à geração (403, 404, 400, 409 `LLM_NOT_CONFIGURED`, 409 `SCHEMA_NOT_READ`) saem em JSON; depois a resposta é 200 `application/x-ndjson` com uma linha por evento: `attempt`, e um final entre `done` (com o resultado da consulta), `failed`, `provider_error` e `stopped`. Fechar a requisição aborta o `AbortSignal` passado ao `LlmClient` e ao `QueryService`. Nada é gravado no servidor: o web aplica `done` no rascunho.
- **Reason**: AIQ-12 pede o contador ao vivo; AIQ-13 e AIQ-28 pedem cancelamento; FIX-07 e a spec mandam o resultado para o rascunho. Uma requisição só dispensa job e polling.
- **Trade-off**: Proxies que bufferizam a resposta escondem o contador até o fim (a resposta leva `X-Accel-Buffering: no`); o supertest não prova o fechamento no meio, que é provado no service.
- **Scope**: ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-084 (active)
- **Decision**: São até 4 chamadas por pedido (1 geração + 3 correções). A correção leva a resposta anterior e o erro: a mensagem inteira para recusas da validação (`QUERY_TOO_LONG`, `QUERY_MULTIPLE_STATEMENTS`, `QUERY_WRITE_BLOCKED`), `QUERY_TIMEOUT`, resposta sem Cypher e `QUERY_FAILED` com código `Neo.ClientError.Statement.SyntaxError` ou `...SemanticError`; para outro `QUERY_FAILED`, só "Erro de execução no Neo4j: <código>". Erro do provedor para a geração sem nova tentativa. `NEO4J_UNAVAILABLE` também para, sem correção, com a mensagem do `QueryService`, e o widget fica como estava.
- **Reason**: FIX-02 a FIX-04; mensagens de execução podem carregar valores do banco (AD-005). Corrigir o Cypher não traz o banco de volta, e gastaria 3 chamadas do provedor. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: A IA corrige erros de execução sem a mensagem, às cegas; códigos de sintaxe fora dos dois listados vão sem mensagem.
- **Scope**: ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-085 (active)
- **Decision**: "Schema lido" (AIQ-17) é existir documento em `connection_schemas` para a conexão, em qualquer `schema_status`: durante uma leitura (`READING`) ou depois de uma falha (`FAILED`) a IA usa o documento anterior. O schema vai ao prompt por `serializeSchema`, na ordem do `SchemaQueryService` (AD-039): `(:Label)` e `[:TIPO]` com os pares `(:Origem)-[:TIPO]->(:Destino)`, e cada propriedade como `- nome: TIPO1 | TIPO2 = <literal Cypher inteiro>`, sem `= ...` quando `sendExample` é falso ou não há exemplo.
- **Reason**: A leitura é assíncrona (AD-038) e uma falha mantém o schema anterior (SCH-09); bloquear a IA nesses estados não protege nada. AIQ-03, AIQ-04, AD-005.
- **Trade-off**: A IA pode trabalhar com um schema desatualizado enquanto a releitura não termina.
- **Scope**: ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-086 (active)
- **Decision**: No web, a geração de cada widget vive em `useAiGenerations`, criado pelo `DashboardPage` no modo de edição: um `AbortController` por widget, aborto de todas ao sair da edição ou da página, descarte do resultado quando o widget saiu do rascunho. `done` aplica título, Cypher, visualização e config por `updateWidget` e semeia o cache da prévia (`['query', dashboardId, connectionId, cypher]`) com o resultado, sem reexecutar. O mapeamento é resolvido no navegador por `resolveAiMapping`: nulo, inválido ou com coluna ausente vira `suggestMapping` de `widgets-graficos`; sugestão ainda incompleta vira `TABLE` com `{}`. `failed` abre o `WidgetEditorDialog` com o último Cypher e o erro. "Pedir à IA" fica no menu do card; para o widget recém-criado por "Novo widget", a descrição aparece no topo do editor. A aba `llm` entra em `SETTINGS_TABS` com `available: true`, e a task que a liga atualiza o teste CFG-02 de `fundacao-auth` (o Admin vê "Conexões", "Usuários", "Dashboards" e "LLM", nessa ordem), como em AD-041 e AD-046.
- **Reason**: AIQ-02, AIQ-09 a AIQ-13, AIQ-28 a AIQ-30, FIX-06 e FIX-07; a sugestão de mapeamento já é pura e testada no web (AD-060 a AD-063), e um mapeamento incompleto seria recusado no `PUT` do dashboard. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Recarregar a página durante a geração perde o resultado; uma task desta feature toca um teste de `fundacao-auth`.
- **Scope**: ia-cypher, ia-dashboard, fundacao-auth (teste CFG-02).
- **Date**: 2026-11-16
- **Status**: active

### AD-087 (active)
- **Decision**: `QueryService.run` (AD-045) aceita `signal?: AbortSignal`, repassado ao `Neo4jGateway.read`, e o `AppError` de `QUERY_FAILED` ganha `neo4jCode?: string`, que o `AppErrorFilter` não serializa.
- **Reason**: AIQ-13 e AIQ-28 pedem que cancelar chegue ao Neo4j; FIX-04 decide pelo código, sem ler a mensagem.
- **Trade-off**: Uma propriedade a mais no erro, visível só no servidor.
- **Scope**: dashboards-consultas (QueryService), ia-cypher, ia-dashboard, interatividade.
- **Date**: 2026-11-16
- **Status**: active

### AD-100 (active)
- **Decision**: Os filtros globais ficam em `dashboards.filters` (JSONB, padrão `[]`) e o intervalo padrão de atualização em `dashboards.refresh_interval_sec` (padrão `0`), gravados pelo mesmo `PUT /api/dashboards/:id` de AD-043. O contrato é `packages/contracts/src/filters.ts`: cada filtro tem `id` (UUID do navegador), `label` (1 a 40), `parameter` (`^[A-Za-z][A-Za-z0-9_]*$`, até 40), `type` (`SINGLE_SELECT`, `MULTI_SELECT`, `TEXT`, `NUMBER`, `DATE`, `DATE_RANGE`), `options` (`STATIC` com 1 a 1.000 valores, ou `QUERY` com Cypher; só nos tipos de seleção) e `defaultValue` no formato do tipo. Os nomes de parâmetro de todos os filtros, contando `<p>_inicio` e `<p>_fim` do intervalo, são únicos no dashboard. Intervalos aceitos: 0, 10, 30, 60, 300, 900 e 3600 s. Quem não pode editar recebe `options.cypher: null`.
- **Reason**: FLT-01 a FLT-05, FLT-17 e RFR-03; os filtros são lidos e gravados com o dashboard. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Um filtro não é consultável isoladamente; parâmetro só com letras ASCII.
- **Scope**: interatividade, ia-dashboard (gera e altera filtros no rascunho).
- **Date**: 2026-11-16
- **Status**: active

### AD-101 (active)
- **Decision**: Os valores de parâmetro viajam em JSON como escalar, lista, `null` ou `{ kind: 'date', value: 'AAAA-MM-DD' }` (`queryParamsSchema`). A API os converte em `toCypherParams` (`apps/api/src/queries/cypher-params.ts`) antes do `Neo4jGateway`: data vira `neo4j.types.Date`, inteiro seguro vira `neo4j.int`, decimal fica `Float`. Filtro vazio vai como `null`, seleção múltipla como lista, intervalo como `<p>_inicio` e `<p>_fim`. A rota do widget salvo mantém só os nomes de parâmetro dos filtros salvos e descarta o resto (FLT-28); a rota de texto do editor aceita qualquer nome.
- **Reason**: FLT-11 a FLT-13 e FLT-28: JSON não tem tipo de data, e o driver JS envia todo número como `Float`. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Filtro "Data" contra propriedade `DateTime` exige `date(n.x)` no Cypher.
- **Scope**: interatividade, dashboards-consultas (QueryService e rotas de execução).
- **Date**: 2026-11-16
- **Status**: active

### AD-102 (active)
- **Decision**: O tokenizador de Cypher e `extractParameterNames` saem de `apps/api/src/queries/read-only-cypher.ts` para `packages/contracts/src/cypher-tokens.ts`, sem mudar o comportamento. `WidgetDto.parameters` traz, para todo usuário, os `$parametros` do Cypher do widget. No web, a chave do TanStack Query de cada widget leva só os parâmetros que ele usa (`relevantParams`): mudar um filtro executa só os widgets afetados, a aba aberta depois executa com os valores atuais, e a chave anterior é cancelada.
- **Reason**: FLT-09, FLT-10 e FLT-27; quem só vê recebe `cypher: null` (AD-043) e mesmo assim precisa saber quais widgets usam cada parâmetro. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Um arquivo de `dashboards-consultas` muda de pacote; o cache de `ia-cypher` passa a ter `params` na chave.
- **Scope**: interatividade, dashboards-consultas (validador), ia-cypher (cache), ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-103 (active)
- **Decision**: As opções de filtros "Consulta Cypher" vêm de `POST /api/dashboards/:id/filters/:filterId/options` (consulta salva, `assert('view')`, erros mascarados para quem não edita) e de `POST /api/dashboards/:id/filter-options` (Cypher do rascunho, `assert('edit')`), ambos por `QueryService.run` com os parâmetros `null`. A regra `optionsFromResult` roda na API: primeira coluna, sem nulos, `bigint` e `json` como texto, sem repetidos na ordem da primeira aparição, os primeiros 1.000, com `truncated`.
- **Reason**: FLT-06, FLT-23, FLT-24, FLT-29 e FLT-30; quem só vê não recebe o Cypher, e o rascunho tem filtros ainda não salvos. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Duas rotas para a mesma regra; opções não dependem de outros filtros (sem filtros em cascata).
- **Scope**: interatividade.
- **Date**: 2026-11-16
- **Status**: active

### AD-104 (active)
- **Decision**: Refina AD-060: o `config` de toda visualização menos `KPI` aceita `crossFilter: { filterId, column }` ao lado do `mapping` (`TABLE` aceita `{}` ou `{ crossFilter }`). O filtro precisa existir no dashboard e ser `SINGLE_SELECT`, `TEXT`, `NUMBER` ou `DATE`; senão o `PUT` recusa com "Filtro do clique inválido". Remover o filtro no rascunho tira o `crossFilter` dos widgets. A seleção é por valor: o destaque marca as linhas cuja célula na coluna, convertida pelo tipo do filtro, é igual ao valor; clicar de novo deixa o filtro `null`. Elementos clicáveis levam `data-row-index`.
- **Reason**: XFL-01 a XFL-09; o vínculo por id sobrevive a renomear o parâmetro, e a seleção por valor sobrevive a uma nova execução. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Duas linhas com o mesmo valor ficam destacadas juntas; clicar esvazia o filtro em vez de voltar ao padrão.
- **Scope**: interatividade, widgets-graficos (views e construtores ganham `rowIndex`), ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-105 (active)
- **Decision**: Valores dos filtros, seleção por clique e intervalo escolhido em visualização vivem só em memória, num reducer por página do dashboard (`filter-session.tsx`); abrir o dashboard parte dos valores padrão e do intervalo salvo. A barra de filtros fica num slot novo da TopBar (`useTopBarFilters`, mesmo mecanismo de `useTopBarAction`), no espaço dos chips de AD-020, com `flex-wrap`. Datas usam `<input type="date">` nativo.
- **Reason**: FLT-07, FLT-08, FLT-15, FLT-21, FLT-31 e RFR-04; nada é guardado entre sessões (Out of Scope). Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Recarregar a página perde os valores; o seletor de data é o do navegador, não um calendário do tema.
- **Scope**: interatividade, fundacao-auth (TopBar).
- **Date**: 2026-11-16
- **Status**: active

### AD-106 (active)
- **Decision**: O auto-refresh é um `setTimeout` por página (`useAutoRefresh`): desligado com intervalo 0 ou em edição; ao vencer com a aba do navegador oculta, espera o `visibilitychange` e executa uma vez; ao vencer visível, chama `refetchQueries` em cada chave de widget da aba ativa com `cancelRefetch: false`, o que pula execução em andamento; mudar um filtro reinicia a contagem. O card mostra esqueleto só sem dados; falha com dados anteriores mantém os dados e mostra "Não foi possível atualizar às HH:mm". "Atualizado às HH:mm:ss" aparece quando as execuções da aba ativa terminam, por qualquer motivo.
- **Reason**: RFR-02 e RFR-05 a RFR-12, com o cache e o cancelamento do TanStack Query que o web já usa. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: As abas inativas não atualizam; cada aba aberta do navegador faz as próprias execuções.
- **Scope**: interatividade, dashboards-consultas (WidgetCard).
- **Date**: 2026-11-16
- **Status**: active

### AD-107 (active)
- **Decision**: O CSV é gerado no navegador (`toCsv`): `﻿`, `;` e `\r\n`; número com vírgula decimal, sem separador de milhar e sem arredondar; `bigint` com todos os dígitos; texto que começa com `AAAA-MM-DD` vira `DD/MM/AAAA` (sem a hora); booleano "Sim"/"Não"; nulo vazio; `json` como texto. Texto e cabeçalho que começam com `=`, `+`, `-` ou `@` ganham `'`; depois, campo com `;`, aspas ou quebra de linha vai entre aspas com as aspas dobradas. O nome do arquivo troca por `-` tudo que não é letra Unicode, dígito ou `-`, com a data local.
- **Reason**: EXP-02 a EXP-05 e EXP-07; o resultado inteiro (até 5.000 linhas) já está no navegador. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: A hora de um `DateTime` não sai no CSV; o nome do arquivo pode ter acentos.
- **Scope**: interatividade.
- **Date**: 2026-11-16
- **Status**: active

### AD-108 (active)
- **Decision**: O PNG é gerado com `html-to-image` (`toPng`) sobre o elemento do card, com `pixelRatio = 2 × devicePixelRatio` e sem os elementos marcados `data-export-ignore` (o botão do menu). O mapa depende do `crossOrigin: 'anonymous'` dos tiles (AD-062); qualquer falha vira o toast "Não foi possível exportar a imagem". "Exportar CSV" e "Exportar PNG" ficam habilitados sempre que o card mostra dados, inclusive dados mantidos depois de uma atualização que falhou.
- **Reason**: EXP-01, EXP-06 e EXP-08: a imagem é o card "como está na tela", no tema atual. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Servidor de tiles sem CORS impede o PNG do mapa; fidelidade de fontes e gradientes depende do navegador e não é provada no jsdom.
- **Scope**: interatividade.
- **Date**: 2026-11-16
- **Status**: active

### AD-109 (active)
- **Decision**: `aiWidgetRequestSchema` ganha `filters: { label, parameter, type }[]`; o zod descarta qualquer outra chave, e nenhum valor de filtro chega ao provedor. `buildWidgetMessages` lista cada filtro como `- <rótulo>: $<parâmetro> (<tipo>)`, com `_inicio` e `_fim` no intervalo. O web envia os filtros do rascunho, e o resultado da IA só semeia o cache quando o Cypher gerado não usa parâmetro de filtro; senão o widget executa com os valores atuais.
- **Reason**: FLT-20 e AD-005; a semente de `ia-cypher` foi executada com parâmetros `null` e mostraria outro resultado. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Um widget gerado com parâmetro executa duas vezes (na geração e com os filtros).
- **Scope**: interatividade, ia-cypher, ia-dashboard (CHAT-05, CHAT-06).
- **Date**: 2026-11-16
- **Status**: active

### AD-120 (active)
- **Decision**: A conversa do assistente fica em `assistant_messages` (`id`, `seq` identity, `dashboard_id` com `ON DELETE CASCADE`, `user_id`, `role` `USER`/`ASSISTANT`, `text`, `details` JSONB com mudanças, não aplicados, criados, com erro e descartados, `created_at`), lida em ordem de `seq`. As rotas `GET`, `DELETE` e `POST /api/dashboards/:id/assistant/messages` exigem `ai.use` e `assert(user, id, 'edit')` e só tocam as mensagens do próprio usuário. Erro do provedor não é gravado: a mensagem do usuário fica, e "Tentar novamente" reenvia com `retryOf`, que reaproveita a mensagem quando ela é a mais recente do usuário e não tem resposta.
- **Reason**: HIST-01 a HIST-06, CHAT-17, CHAT-21; `seq` dá ordem estável com o mesmo `created_at`. Quem perde a edição deixa de ver a conversa, que volta com o acesso. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Reabrir o dashboard não mostra pedidos que falharam, só a mensagem sem resposta.
- **Scope**: ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-121 (active)
- **Decision**: Cada mensagem ao assistente é uma requisição com resposta NDJSON, no padrão de AD-083: erros anteriores ao pedido em JSON (400, 403, 404, 409 `LLM_NOT_CONFIGURED`, 409 `SCHEMA_NOT_READ`), depois os eventos `accepted`, `planned`, `widget` (índice, total, tentativa), e um final entre `done` (resposta gravada e ações resolvidas), `provider_error` e `error`. O servidor grava a resposta só imediatamente antes de emitir `done`, depois de conferir o `signal`. O web aplica todas as ações de uma vez no `done`; cancelar, sair ou falhar não aplicam nada.
- **Reason**: GEN-08 pede o progresso ao vivo; GEN-09, CHAT-14 e CHAT-22 pedem desfazer o que o pedido já aplicou, o que vira "nada foi aplicado" quando a aplicação é atômica (Assumption da spec: "cada pedido é aplicado inteiro ou não é"). Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: O usuário só vê os widgets no fim do pedido; um cancelamento entre a gravação e o `done` deixa na conversa uma resposta não aplicada.
- **Scope**: ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-122 (active)
- **Decision**: O assistente faz uma chamada de plano que devolve um objeto JSON em texto, `{ reply, actions }` (sem tool calling, como AD-082), com 12 ações: `create_tab`, `rename_tab`, `remove_tab`, `create_widget`, `update_widget`, `remove_widget`, `move_widget`, `resize_widget`, `create_filter`, `update_filter`, `remove_filter`, `rename_dashboard`. `create_widget` e `update_widget` com `prompt` geram o widget pelo laço de `ia-cypher` (até 4 chamadas, AD-084), com o widget atual e os filtros como contexto; `update_widget` sem `prompt` não chama o LLM e executa o Cypher atual uma vez para devolver o resultado. Texto sem JSON vira resposta sem ações. Widget que esgota as correções, ou com o Neo4j inacessível, entra com o último Cypher (ou `null`), `TABLE` e a mensagem de erro; erro do provedor em qualquer chamada encerra o pedido.
- **Reason**: GEN-05 e CHAT-08 pedem a validação, a execução e a autocorreção de `ia-cypher`; a spec conta até 4 chamadas por widget; AD-006 proíbe depender de recurso de um provedor só. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Até 81 chamadas num pedido de 20 widgets; o plano não vê o resultado das consultas e descreve os widgets às cegas.
- **Scope**: ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-123 (active)
- **Decision**: O prompt do plano cita abas, widgets e filtros por refs curtas na ordem do rascunho (`t1`, `w1`, `f1`), e `create_tab` pode declarar uma `ref` usada pelas ações seguintes. `resolveActions` (puro, na API) simula as ações em ordem: tipo fora da lista, dados inválidos, ref inexistente ou remoção da última aba viram "Não aplicado: ..." na resposta; os 20 primeiros `create_widget` ficam e o resto é contado como descartado; filtros passam pelos schemas de `interatividade` e a consulta de opções por `validateReadOnlyCypher`; cada ação aceita gera uma descrição em português. Os ids de abas, widgets e filtros criados pela IA são UUIDs gerados no servidor, o que refina AD-043 ("gerados no navegador"): o `PUT` continua aceitando qualquer UUID que não seja de outro dashboard. Posição e tamanho saem de `placeWidget`: `w` e `h` de 2 a 12, `x + w ≤ 12`, descendo `y` até não sobrepor.
- **Reason**: CHAT-07, CHAT-23, CHAT-24, GEN-04, GEN-12; o LLM erra menos com `w3` do que com um UUID, e a resposta gravada precisa das recusas, então a validação roda no servidor. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: O servidor confia na estrutura do rascunho que o navegador envia; uma ação aceita no servidor ainda é ignorada no web se o usuário mudou o rascunho durante o pedido.
- **Scope**: ia-dashboard, dashboards-consultas (ids no `PUT`).
- **Date**: 2026-11-16
- **Status**: active

### AD-124 (active)
- **Decision**: O pedido do plano leva: regras e ações na mensagem de sistema, o schema por `serializeSchema` (AD-085), as 20 mensagens anteriores do usuário nesse dashboard (texto e descrições das mudanças, nunca resultados), e por fim o rascunho e a mensagem nova. O rascunho vem do navegador recortado por `assistantDraftSchema` (`z.object`, que descarta o resto): nome, conexão, abas, widgets com título, Cypher, visualização, mapeamento e layout, e filtros só com id, rótulo, parâmetro e tipo. Valores e opções de filtros, resultados e `crossFilter` nunca chegam ao servidor do assistente. O `LlmClient` registra o plano com `purpose=assistant`.
- **Reason**: CHAT-05, CHAT-06 e AD-005: o recorte no schema garante a regra sem depender da tela. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: A IA não vê o valor padrão nem as opções dos filtros que vai alterar.
- **Scope**: ia-dashboard, ia-cypher (`purpose` do log).
- **Date**: 2026-11-16
- **Status**: active

### AD-125 (active)
- **Decision**: "Descrever para a IA" é uma opção do `NewDashboardDialog` (só com `ai.use`; desabilitada sem provedor) com "Nome", "Conexão" e "Descrição". "Criar" usa o `POST /api/dashboards` de sempre (dono é quem pede, aba "Aba 1", fim da sidebar por AD-042) e navega para `/dashboards/<id>?editar=1` com `state: { assistantPrompt }`; a página abre o painel, envia a descrição como primeira mensagem uma única vez e limpa o estado. A geração inteira é um pedido comum ao assistente num dashboard vazio; o prompt manda renomear e usar a aba vazia `t1`.
- **Reason**: GEN-01, GEN-02, GEN-14 e a Assumption "Dois caminhos para a mesma capacidade, sem tela nova"; o estado da navegação não põe a descrição na URL. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Recarregar a página durante a geração perde o pedido; o dashboard fica criado e vazio.
- **Scope**: ia-dashboard, dashboards-consultas (`NewDashboardDialog`, `DashboardPage`).
- **Date**: 2026-11-16
- **Status**: active

### AD-126 (active)
- **Decision**: "Desfazer" é uma foto em memória do rascunho anterior à resposta mais recente que trouxe ações. O botão aparece nessa resposta só enquanto o rascunho atual é o mesmo objeto que a resposta produziu: qualquer mudança manual, "Salvar", "Descartar" ou recarregar a página o tiram. Desfazer põe de volta a foto.
- **Reason**: CHAT-10, CHAT-11, CHAT-26, HIST-09 e a Assumption "Só a alteração mais recente da IA pode ser desfeita"; restaurar a foto depois de outras mudanças apagaria trabalho do usuário sem aviso. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Arrastar um widget logo depois da resposta já tira o "Desfazer".
- **Scope**: ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-127 (active)
- **Decision**: O painel do assistente é um `aside` de largura fixa (`w-96`) à direita da grade, no mesmo contêiner `flex`, com a grade em `min-w-0 flex-1`, fora da área das abas. O botão "Assistente" fica no cabeçalho do dashboard, só para `ai.use` com `permissions.edit`. Aberto ou fechado fica em `localStorage['ninbi-assistant-open']`, um valor por navegador para todos os dashboards, lido e escrito com try/catch. Enquanto um pedido roda, "Pedir à IA" fica desabilitado em todos os widgets.
- **Reason**: CHAT-01 a CHAT-03, CHAT-18, CHAT-25, CHAT-30 e a Assumption "À direita; a grade usa a largura que sobra"; a grade de AD-046 já mede o próprio contêiner. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Em telas estreitas a grade fica com pouca largura; o painel não é redimensionável.
- **Scope**: ia-dashboard, ia-cypher (`useAiGenerations` bloqueado).
- **Date**: 2026-11-16
- **Status**: active

### AD-128 (active)
- **Decision**: Cada pedido ao assistente gera uma linha em `Logger('Assistant')`: `assistant request user=<id> dashboard=<id> actions=<n> widgetErrors=<n> durationMs=<n> result=<ok|provider_error|cancelled|error>`, sem o texto das mensagens, o Cypher nem o schema. As chamadas ao provedor continuam com a linha `ai call` de AD-081.
- **Reason**: CHAT-29, no formato chave=valor dos logs de HTTP, consulta e compartilhamento. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Quem audita cruza ids com o banco.
- **Scope**: ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-129 (active)
- **Decision**: `AiWidgetService` ganha `generate(input)`, o laço de AD-084 sem HTTP (snapshot, schema, conexão, widget, `prompt`, `filters`, `purpose`, `signal`, `onAttempt`), que devolve `done`, `failed`, `stopped` ou `provider_error`; `run` de `ia-cypher` passa a delegar a ele sem mudar o comportamento. `LlmClient` aceita `purpose: 'assistant'`.
- **Reason**: GEN-05 e CHAT-08; uma só implementação do laço para o prompt rápido e para o assistente. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Uma task de `ia-dashboard` refatora um service de `ia-cypher`, cujos testes precisam continuar verdes.
- **Scope**: ia-dashboard, ia-cypher.
- **Date**: 2026-11-16
- **Status**: active

### AD-130 (active)
- **Decision**: O "BI" da logo é ciano no tema escuro (`#2ee6f0`, `--brand-cyan`) e teal escuro no tema claro (`#08717e`), ambos pelo token `--accent-text`. O teste de SHELL-11 afirma o valor resolvido de cada tema.
- **Reason**: SHELL-02 e SHELL-11; o ciano puro não tem contraste suficiente sobre fundo claro. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: No tema claro o "BI" não tem o mesmo tom da logo escura.
- **Scope**: fundacao-auth.
- **Date**: 2026-11-16
- **Status**: active

### AD-131 (active)
- **Decision**: `fieldErrors` da API continua indexado só pelo campo de topo do corpo (`issue.path[0]`, ex.: `fieldErrors.items`, `fieldErrors.tabs`), com a mensagem do primeiro erro daquele campo. O caminho completo (`items.0.name`) fica só nos testes do contrato.
- **Reason**: Verificação de `dashboards-consultas` (F8): o web consome `fieldErrors` por campo de formulário e valida no cliente; mudar a chave quebraria o contrato atual de todas as telas. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Um 400 de lista aninhada não diz qual item falhou.
- **Scope**: fundacao-auth, dashboards-consultas.
- **Date**: 2026-11-16
- **Status**: active

### AD-132 (active)
- **Decision**: O limite de 20.000 do Cypher (QRY-09, WDG-07) conta unidades UTF-16, como `String.length` e o `.max()` do zod; um emoji fora do BMP conta 2. O mesmo vale para os demais limites de caracteres dos contratos.
- **Reason**: Verificação de `dashboards-consultas` (F11): validador e contrato usam a mesma contagem, então web e API nunca divergem. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Quem cola texto com muitos emojis atinge o limite um pouco antes.
- **Scope**: dashboards-consultas.
- **Date**: 2026-11-16
- **Status**: active

### AD-133 (active)
- **Decision**: Confirma a regra de AD-063: uma coluna só é numérica quando todos os valores não nulos são números; um único texto (ex.: `'n/d'`) a torna não numérica e a sugestão não a oferece como série ou valor. Quem precisa tratar texto no meio de números converte no Cypher (ex.: `toFloat(...)`, `CASE ... END` devolvendo `null`) antes de mapear a coluna.
- **Reason**: Verificação de `widgets-graficos` (F1): o verificador esperava que um texto isolado não desclassificasse a coluna; a regra de AD-063 evita sugerir como numérica uma coluna que o usuário não pretende somar. VIZ-14 continua valendo para colunas mapeadas à mão com texto ocasional. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: A coluna com um `'n/d'` não é sugerida sozinha; o usuário trata o texto no Cypher.
- **Scope**: widgets-graficos, ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-134 (active)
- **Decision**: O pedido de geração do widget (`POST /api/dashboards/:id/ai/widget`) mantém `connectionId` opcional. Sem ele, o servidor usa a conexão do dashboard (AIQ-03, AIQ-08). Com ele, o servidor exige que a conexão exista (404 `CONNECTION_NOT_FOUND`) e que o usuário tenha `connections.read` (403 `FORBIDDEN`); o schema e a execução usam essa conexão. O web envia a conexão do rascunho.
- **Reason**: Verificação de `ia-cypher` (F1): em modo de edição a conexão "do dashboard" é a do rascunho, pois o usuário pode trocá-la sem salvar; ignorar o campo geraria com o schema errado. A checagem de permissão impede usar a IA para ler schema de conexão que o usuário não pode ver. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: O servidor aceita qualquer conexão existente que o usuário possa ler, não só a do dashboard salvo.
- **Scope**: ia-cypher, ia-dashboard.
- **Date**: 2026-11-16
- **Status**: active

### AD-135 (active)
- **Decision**: O campo numérico de um filtro recusa, com `MESSAGES.filterNumberInvalid` ("Digite um número"), o texto sem vírgula no padrão de milhar pt-BR (`1.234`, `1.000`, `12.345`, `1.234.567`). Aceita `1234`, `-3`, `1234,5`, `1.234,5` e `1234.5`; `0.001` e `1.5` seguem como decimais.
- **Reason**: Verificação de `interatividade` (F4): `1.234` virava 1,234 e `1.000` virava 1 sem aviso, um erro silencioso para quem digita no padrão brasileiro. Recusar evita adivinhar a intenção. Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar."
- **Trade-off**: Quem queria `1.234` como decimal (ponto) precisa digitar `1,234`.
- **Scope**: interatividade.
- **Date**: 2026-11-17
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
