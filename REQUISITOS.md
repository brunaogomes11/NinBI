# NinBI — Levantamento de Requisitos

Gerador de dashboards integrado ao Neo4j (Cypher) e a outros bancos de dados, com gráficos do shadcn/ui.

**Como responder:** marque com `x` a opção escolhida (`[x]`) ou escreva na linha `R:`.
Opções marcadas com ⭐ são a minha sugestão — se concordar, basta deixar em branco que eu assumo a sugestão.
As perguntas marcadas com 🔴 são as que mais mudam a arquitetura; se for responder só algumas, comece por elas.

---

## 1. Visão e público

**1.1 🔴 Para quem é o produto?**
- [ ] Uso pessoal / interno (só eu ou meu time)
- [ ] Produto open source self-hosted (tipo Metabase / NeoDash)
- [ ] SaaS multi-tenant (clientes criam conta e conectam seus bancos)
- R:

**1.2 Quem monta os dashboards?**
- [ ] Só pessoas técnicas, que escrevem Cypher/SQL ⭐
- [ ] Pessoas técnicas montam; pessoas de negócio só visualizam e filtram
- [ ] Pessoas de negócio também montam (exige construtor visual de queries ou IA)
- R:

**1.3 Qual é o caso de uso principal que você quer ver funcionando primeiro?** (ex.: "dashboard de fraude sobre um grafo de transações")
- R:

**1.4 O que o NinBI deve fazer melhor que NeoDash, Metabase, Grafana ou Superset?** (o diferencial)
- R:

---

## 2. Fontes de dados

**2.1 🔴 "Qualquer tipo de banco" — quais entram na primeira versão, além do Neo4j?**
- [ ] Só Neo4j no MVP; os demais depois ⭐
- [ ] PostgreSQL
- [ ] MySQL / MariaDB
- [ ] SQL Server
- [ ] Oracle
- [ ] MongoDB
- [ ] SQLite / DuckDB
- [ ] BigQuery / Snowflake / ClickHouse
- [ ] APIs REST / GraphQL
- [ ] Arquivos (CSV, Excel, Parquet)
- R:

**2.2 Como os outros bancos se relacionam com o Neo4j?**
- [ ] São fontes independentes: cada widget consulta uma fonte na linguagem dela ⭐
- [ ] Os dados dos outros bancos são importados/sincronizados para dentro do Neo4j, e tudo é consultado em Cypher
- [ ] Um widget pode cruzar dados de mais de uma fonte (join federado)
- R:

**2.3 Quais variantes de Neo4j precisam ser suportadas?**
- [ ] Neo4j 5.x self-hosted
- [ ] Neo4j AuraDB
- [ ] Neo4j 4.x
- [ ] Outros compatíveis com Cypher (Memgraph, AWS Neptune, FalkorDB)
- R:

**2.4 Múltiplas conexões?**
- [ ] Várias conexões cadastradas, e um mesmo dashboard pode misturar fontes ⭐
- [ ] Várias conexões, mas cada dashboard usa só uma
- [ ] Uma única conexão por instalação
- R:

**2.5 🔴 Onde ficam as credenciais dos bancos?**
- [ ] No backend, criptografadas; o navegador nunca vê a senha ⭐
- [ ] No navegador do usuário (conexão direta via driver JS, sem backend — só funciona para Neo4j)
- [ ] Em variáveis de ambiente / arquivo de configuração no servidor
- R:

**2.6 As queries podem escrever no banco?**
- [ ] Não, somente leitura (bloquear `CREATE`/`MERGE`/`DELETE`/`SET`) ⭐
- [ ] Sim, com permissão específica (ex.: widgets de formulário / ações)
- R:

**2.7 O dashboard precisa ler o schema do banco (labels, tipos de relacionamento, propriedades, tabelas)?**
- [ ] Sim, para autocomplete e navegador de schema ⭐
- [ ] Não é necessário
- R:

---

## 3. Queries

**3.1 Como o usuário cria a consulta de um widget?**
- [ ] Editor de código com syntax highlight e autocomplete (Cypher / SQL) ⭐
- [ ] Construtor visual (escolher label, propriedades, agregações) sem escrever código
- [ ] Linguagem natural → IA gera a query
- [ ] Todos os anteriores
- R:

**3.2 Parâmetros nas queries** (ex.: `$periodo`, `$pais`) **alimentados por filtros do dashboard?**
- [ ] Sim ⭐
- [ ] Não no MVP
- R:

**3.3 Biblioteca de queries salvas e reutilizáveis entre widgets/dashboards?**
- [ ] Sim
- [ ] Não, cada widget guarda a própria query ⭐
- R:

**3.4 Limites de proteção** (timeout, máximo de linhas retornadas)?
- [ ] Sim, configuráveis por conexão ⭐
- [ ] Não
- R: (valores desejados, se já souber)

**3.5 IA: qual o papel dela?**
- [ ] Nenhum no MVP ⭐
- [ ] Gerar Cypher/SQL a partir de texto
- [ ] Gerar o dashboard inteiro a partir de uma descrição
- [ ] Explicar/resumir os dados de um widget
- R: (se sim, qual provedor/modelo?)

---

## 4. Gráficos e widgets

**4.1 Tipos do shadcn charts que entram no MVP** (todos são baseados em Recharts):
- [ ] Área
- [ ] Barras
- [ ] Linha
- [ ] Pizza / Donut
- [ ] Radar
- [ ] Radial
- [ ] Todos ⭐
- R:

**4.2 🔴 Visualização de grafo (nós e relacionamentos).** O shadcn não tem esse tipo de gráfico, e é o que mais diferencia um BI para Neo4j. Entra?
- [ ] Sim, no MVP, com biblioteca à parte (ex.: Neo4j NVL, react-force-graph, Cytoscape, Sigma)
- [ ] Sim, mas depois do MVP
- [ ] Não, só gráficos tabulares
- R:

**4.3 Outros widgets fora do shadcn charts:**
- [ ] Cartão de KPI (número + variação %, como "Balance $4,999.95 ↑20%" da referência) ⭐
- [ ] Tabela com ordenação/paginação ⭐
- [ ] Lista (como "Markets" e "Economic Events" da referência)
- [ ] Mapa (como "Market hours" da referência)
- [ ] Texto / Markdown
- [ ] Formulário / calculadora (como "Position size calculator" da referência)
- [ ] Heatmap, Sankey, Treemap, Funil, Gauge
- [ ] Iframe / embed
- R:

**4.4 Como o resultado da query vira gráfico?**
- [ ] Usuário mapeia manualmente colunas → eixos/séries ⭐
- [ ] Sistema sugere o gráfico e o mapeamento automaticamente, e o usuário ajusta
- R:

**4.5 Nível de personalização por widget:**
- [ ] Básico: título, cores, legenda, formato de número ⭐
- [ ] Avançado: eixos, empilhamento, linhas de referência, formatação condicional, tooltips customizados
- R:

---

## 5. Construtor de dashboard

**5.1 Como o layout é montado?**
- [ ] Grid com arrastar e redimensionar (tipo Grafana) ⭐
- [ ] Templates de layout fixos, onde o usuário só preenche os espaços
- [ ] Definido em código/JSON/YAML
- R:

**5.2 Estrutura:**
- [ ] Um dashboard = uma página
- [ ] Dashboard com várias abas/páginas ⭐
- [ ] Pastas/coleções de dashboards
- R:

**5.3 Modo edição separado do modo visualização?**
- [ ] Sim ⭐
- [ ] Não, sempre editável
- R:

**5.4 Importar/exportar o dashboard como JSON** (versionar em git, compartilhar)?
- [ ] Sim ⭐
- [ ] Não
- R:

**5.5 Histórico de versões / desfazer?**
- [ ] Sim
- [ ] Não no MVP ⭐
- R:

**5.6 Responsivo no celular?**
- [ ] Sim, visualização precisa funcionar no celular
- [ ] Só desktop/tablet ⭐
- R:

---

## 6. Interatividade

**6.1 Filtros globais do dashboard** (período, seletor, busca)?
- [ ] Sim ⭐
- [ ] Não no MVP
- R:

**6.2 Cross-filtering** (clicar em uma barra filtra os outros widgets)?
- [ ] Sim
- [ ] Depois do MVP ⭐
- R:

**6.3 Drill-down** (clicar em um item abre detalhe ou outro dashboard)?
- [ ] Sim
- [ ] Depois do MVP ⭐
- R:

**6.4 No grafo (se houver): expandir vizinhos de um nó ao clicar?**
- [ ] Sim
- [ ] Não
- R:

**6.5 Exportações:**
- [ ] CSV dos dados do widget ⭐
- [ ] PNG do widget
- [ ] PDF do dashboard
- [ ] Envio agendado por e-mail
- R:

---

## 7. Atualização dos dados

**7.1 Como os dados se atualizam?**
- [ ] Manual + auto-refresh com intervalo configurável ⭐
- [ ] Tempo real (streaming / websocket)
- [ ] Só manual
- R:

**7.2 Cache de resultados no backend?**
- [ ] Sim, com TTL configurável
- [ ] Não no MVP ⭐
- R:

**7.3 Alertas** (avisar quando um valor passar de um limite)?
- [ ] Sim
- [ ] Não no MVP ⭐
- R:

---

## 8. Usuários, permissões e compartilhamento

**8.1 🔴 Autenticação:**
- [ ] Sem login (uso local, single-user)
- [ ] E-mail e senha
- [ ] Login social / OAuth (Google, GitHub)
- [ ] SSO corporativo (SAML / OIDC)
- R:

**8.2 Papéis:**
- [ ] Sem papéis
- [ ] Admin / Editor / Visualizador ⭐
- [ ] Permissão por dashboard e por conexão
- R:

**8.3 Compartilhamento:**
- [ ] Link público somente leitura
- [ ] Embed via iframe em outros sites
- [ ] Apenas usuários logados ⭐
- R:

**8.4 Multi-tenant** (organizações/workspaces isolados)?
- [ ] Sim
- [ ] Não ⭐
- R:

---

## 9. Visual

**9.1 A imagem de referência (LittleBee) é:**
- [ ] O tema padrão do próprio NinBI (sidebar, cards escuros, verde-limão) ⭐
- [ ] Um exemplo do tipo de dashboard que o usuário deve conseguir gerar
- [ ] Os dois
- R:

**9.2 Temas:**
- [ ] Só dark, como a referência
- [ ] Dark e light ⭐
- [ ] Temas customizáveis pelo usuário (cores, raio, fonte), por dashboard
- R:

**9.3 Idioma da interface:**
- [ ] Português
- [ ] Inglês
- [ ] Ambos (i18n)
- R:

**9.4 Nome e marca:** "NinBI" é o nome definitivo? Já existe logo?
- R:

---

## 10. Stack e arquitetura

**10.1 🔴 Frontend:**
- [ ] Next.js (App Router) + Tailwind + shadcn/ui ⭐
- [ ] Vite + React + Tailwind + shadcn/ui (SPA)
- [ ] Outro
- R:

**10.2 🔴 Backend:**
- [ ] O próprio Next.js (route handlers / server actions) ⭐
- [ ] Node separado (NestJS / Fastify)
- [ ] Java / Spring Boot
- [ ] Python / FastAPI
- [ ] Sem backend (tudo no navegador)
- R:

**10.3 🔴 Onde o NinBI guarda os próprios metadados** (dashboards, widgets, conexões, usuários)?
- [ ] PostgreSQL ⭐
- [ ] SQLite (mais simples para self-hosted)
- [ ] No próprio Neo4j
- [ ] Arquivos JSON / localStorage
- R:

**10.4 Linguagem:**
- [ ] TypeScript em tudo ⭐
- [ ] Outro
- R:

**10.5 Arquitetura de conectores:**
- [ ] Interface de "driver" plugável, onde cada banco é um adaptador ⭐
- [ ] Implementação direta por banco, sem abstração por enquanto
- R:

---

## 11. Deploy e operação

**11.1 Onde vai rodar?**
- [ ] Local (minha máquina)
- [ ] Docker / docker-compose self-hosted ⭐
- [ ] Vercel / nuvem gerenciada
- [ ] Desktop (Electron / Tauri)
- R:

**11.2 Licença / modelo:**
- [ ] Projeto pessoal privado
- [ ] Open source
- [ ] Comercial
- R:

**11.3 Testes:**
- [ ] Unitários + e2e desde o início
- [ ] Unitários nas partes críticas (conectores, mapeamento de dados) ⭐
- [ ] Sem testes no MVP
- R:

---

## 12. Requisitos não funcionais

**12.1 Volume esperado:** quantos usuários simultâneos e quantas linhas por resultado de query, em ordem de grandeza?
- R:

**12.2 Tamanho do grafo a ser renderizado na tela** (se houver visualização de grafo): centenas, milhares ou dezenas de milhares de nós?
- R:

**12.3 Auditoria** (registrar quem rodou qual query)?
- [ ] Sim
- [ ] Não ⭐
- R:

**12.4 Requisitos de conformidade** (LGPD, dados sensíveis, rede isolada)?
- R:

---

## 13. Escopo do MVP

**13.1 🔴 Em uma frase, o que precisa existir para você considerar a primeira versão pronta?**
- R:

**13.2 O que fica explicitamente FORA do MVP?**
- R:

**13.3 Prazo ou marco?**
- R:

**13.4 Você tem um banco Neo4j com dados reais para desenvolver, ou devo usar um dataset de exemplo (Movies, Northwind)?**
- R:

**13.5 Mais alguma coisa que não perguntei?**
- R:
