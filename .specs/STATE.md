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
