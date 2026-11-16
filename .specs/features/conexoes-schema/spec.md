# Conexões e Schema Specification

**Approved**: 2026-11-16 - user: "Pode fazer todas features desse jeito, sem nem me perguntar."

## Problem Statement

O NinBI consulta o Neo4j do usuário, e a IA só escreve Cypher correto se conhecer o schema: labels, tipos de relacionamento, propriedades, os tipos de cada uma e um valor de exemplo real. Hoje não há como cadastrar um banco nem ler o schema dele. Esta feature entrega o cadastro de conexões Neo4j com credenciais protegidas e o schema enriquecido, lido, guardado em cache e visível na interface.

## Goals

- [ ] Um Admin cadastra uma conexão Neo4j, e a senha nunca volta ao navegador.
- [ ] Para cada propriedade de cada label e de cada tipo de relacionamento, o NinBI guarda todos os tipos encontrados e um valor de exemplo real.
- [ ] Admin e Editor veem o schema e o atualizam com um botão; o Admin escolhe quais propriedades não enviam exemplo à IA.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Bancos que não são Neo4j (PostgreSQL, MySQL, MongoDB, arquivos) | Só Neo4j no MVP (AD-002) |
| Importação de outros bancos para o Neo4j | Feature futura (AD-002) |
| Camada de driver plugável | Sem outras fontes, não há o que abstrair (AD-002) |
| Atualização automática ou agendada do schema | A atualização é por botão |
| Edição manual do schema (descrições, apelidos) | Não foi pedida |
| Outros bancos compatíveis com Cypher (Memgraph, Neptune, FalkorDB) | Não foram pedidos |
| Permissão por conexão | Não foi pedida; o compartilhamento é por dashboard (AD-014) |
| Envio do schema ao LLM | Feature `ia-cypher`; aqui o schema só é lido, guardado e mostrado |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Fonte de dados | Só Neo4j | AD-002 | y |
| Conteúdo do schema | Por propriedade de cada label e tipo de relacionamento: os tipos e um valor de exemplo real, sem tamanho máximo | AD-005 | y |
| Onde fica o cache do schema | PostgreSQL | AD-003 | y |
| Onde ficam as telas | Na aba "Conexões" da página "Configurações" | AD-016; usuário: "Um item 'Configurações' só" | y |
| Quem gerencia conexões | Só o Admin | AD-015: o Admin gerencia a instalação | y |
| Credenciais | Senha da conexão criptografada no backend; nunca vai ao navegador | Default do orquestrador; a alternativa expõe a senha a qualquer usuário logado | y - delegado |
| Chave de criptografia | Lida da variável de ambiente `NINBI_ENCRYPTION_KEY`; sem ela o backend não inicia | Uma chave fora do banco protege o dump do PostgreSQL | y - delegado |
| Como o schema é lido | `db.schema.nodeTypeProperties()` e `db.schema.relTypeProperties()`, mais uma consulta de exemplo por label e por tipo de relacionamento | Default do orquestrador; são os procedimentos nativos do Neo4j | y - delegado |
| De onde vem o exemplo | O primeiro valor não nulo encontrado para a propriedade; sem valor, a propriedade fica "sem exemplo" | Um único nó de exemplo pode não ter todas as propriedades preenchidas | y - delegado |
| Atualização do schema | Leitura automática ao criar a conexão; depois, só pelo botão "Atualizar schema" | Default do orquestrador | y - delegado |
| Propriedades sem exemplo para a IA | O Admin desliga "Enviar exemplo à IA" por propriedade; a escolha sobrevive à atualização do schema | Default do orquestrador; protege dados sensíveis sem contrariar AD-005 | y - delegado |
| Padrões de relacionamento | O schema guarda também quais labels cada tipo de relacionamento liga (origem e destino) | É estrutura, não dado, e sem isso a IA erra a direção dos relacionamentos | y - delegado |
| Versões do Neo4j | Neo4j 5.x self-hosted e AuraDB | São as versões atuais; os procedimentos de schema existem nas duas | y - delegado |
| Salvar exige teste | A conexão só é salva se o teste de conexão passar | Evita conexão cadastrada que nunca funcionou | y - delegado |
| Tempos limite | 10 s para o teste de conexão; 120 s para a leitura do schema | Valores concretos para os critérios; a leitura do schema é lenta em grafos grandes | y - delegado |
| Quem vê conexões e schema e atualiza o schema | Admin e Editor | Recomendação de Q12 de `fundacao-auth`: o Editor vê a aba "Conexões" em leitura | y - delegado |
| Edição simultânea da mesma conexão | A última gravação vale | Só Admins editam conexões, e raramente | y - delegado |
| Conexões e dashboards | Várias conexões cadastradas; cada dashboard usa exatamente uma | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |
| Propriedade com mais de um tipo | O schema lista todos os tipos encontrados e guarda um exemplo só | Delegado pelo usuário: "Pode fazer todas features desse jeito, sem nem me perguntar." | y - delegado |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Cadastrar uma conexão Neo4j ⭐ MVP

**User Story**: As a Admin, I want cadastrar o endereço e as credenciais de um Neo4j so that os dashboards consultem esse banco sem que ninguém mais veja a senha.

**Why P1**: Sem conexão não há schema nem consulta.

**Acceptance Criteria**:

1. WHEN um Admin ou Editor abre a aba "Conexões" de "Configurações" THEN o sistema SHALL mostrar a lista com nome, URI, banco, e data e hora da última leitura do schema [CONN-01]
2. WHEN não há conexão cadastrada THEN o sistema SHALL mostrar "Nenhuma conexão cadastrada" [CONN-02]
3. WHILE a lista de conexões carrega o sistema SHALL mostrar linhas de esqueleto no lugar dos dados [CONN-03]
4. IF a lista de conexões não carrega THEN o sistema SHALL mostrar "Não foi possível carregar as conexões" com o botão "Tentar novamente" [CONN-04]
5. The system SHALL mostrar os botões "Nova conexão", "Editar" e "Excluir" só para Admin [CONN-05]
6. WHEN um Admin envia "Nova conexão" com nome, URI, banco, usuário e senha THEN o sistema SHALL testar a conexão com o Neo4j antes de salvar [CONN-06]
7. WHEN o teste de conexão passa THEN o sistema SHALL salvar a conexão e mostrá-la na lista [CONN-07]
8. IF o teste de conexão falha THEN o sistema SHALL não salvar, manter o formulário preenchido e mostrar a mensagem de erro do Neo4j [CONN-08]
9. IF o Neo4j não responde ao teste em 10 s THEN o sistema SHALL mostrar "Não foi possível conectar em 10 s" [CONN-09]
10. IF a URI não começa com `neo4j://`, `neo4j+s://`, `neo4j+ssc://`, `bolt://`, `bolt+s://` ou `bolt+ssc://` THEN o sistema SHALL recusar com "URI inválida" no campo [CONN-10]
11. IF o nome está vazio, passa de 80 caracteres ou já pertence a outra conexão THEN o sistema SHALL recusar com a mensagem no campo "Nome" [CONN-11]
12. WHEN o campo "Banco" fica vazio THEN o sistema SHALL usar o banco padrão do servidor Neo4j [CONN-12]
13. The system SHALL guardar a senha da conexão criptografada no PostgreSQL [CONN-13]
14. The system SHALL omitir a senha de toda resposta da API [CONN-14]
15. WHEN um Admin edita uma conexão e deixa o campo "Senha" vazio THEN o sistema SHALL manter a senha guardada [CONN-15]
16. WHEN um Admin salva a edição de uma conexão THEN o sistema SHALL testar a conexão de novo antes de gravar [CONN-16]
17. WHEN um Admin usa "Excluir" THEN o sistema SHALL pedir confirmação com "Excluir a conexão <nome>? O schema guardado também será apagado." [CONN-17]
18. WHEN um Admin confirma a exclusão THEN o sistema SHALL apagar a conexão e o schema guardado dela [CONN-18]
19. IF um Editor ou Visualizador chama a criação, edição ou exclusão de conexão THEN o sistema SHALL responder 403 [CONN-19]
20. WHILE o teste e a gravação de uma conexão estão em andamento o sistema SHALL manter o botão de salvar desabilitado [CONN-20]

**Independent Test**: Como Admin, cadastrar o Neo4j do docker-compose, ver a conexão na lista, inspecionar a resposta da API e confirmar que a senha não está nela; cadastrar com senha errada e ver o erro do Neo4j sem nada salvo.

---

### P1: Ler o schema enriquecido ⭐ MVP

**User Story**: As a Admin ou Editor, I want que o NinBI leia do banco os labels, tipos de relacionamento, propriedades, tipos e um exemplo de cada propriedade so that a IA tenha o contexto para escrever Cypher.

**Why P1**: É o único contexto do banco que a IA recebe (AD-005).

**Acceptance Criteria**:

1. WHEN uma conexão é criada THEN o sistema SHALL ler o schema dela sem outra ação do usuário [SCH-01]
2. WHEN o schema é lido THEN o sistema SHALL guardar, para cada label, a lista de propriedades com todos os tipos encontrados para cada uma [SCH-02]
3. WHEN o schema é lido THEN o sistema SHALL guardar, para cada tipo de relacionamento, a lista de propriedades com todos os tipos encontrados para cada uma [SCH-03]
4. WHEN o schema é lido THEN o sistema SHALL guardar, para cada propriedade, um valor de exemplo real e inteiro, sem cortar o valor [SCH-04]
5. WHEN o schema é lido THEN o sistema SHALL guardar, para cada tipo de relacionamento, os pares de label de origem e label de destino que ele liga [SCH-05]
6. WHEN a leitura termina THEN o sistema SHALL gravar o schema no PostgreSQL com data e hora da leitura, no lugar do schema anterior [SCH-06]
7. WHEN um Admin ou Editor usa "Atualizar schema" THEN o sistema SHALL ler o schema de novo [SCH-07]
8. WHILE a leitura do schema está em andamento o sistema SHALL mostrar "Lendo schema..." e manter o botão "Atualizar schema" desabilitado [SCH-08]
9. IF a leitura do schema falha THEN o sistema SHALL manter o schema anterior e mostrar "Não foi possível ler o schema" com a mensagem de erro do Neo4j [SCH-09]
10. IF a leitura do schema passa de 120 s THEN o sistema SHALL cancelá-la e tratá-la como falha [SCH-10]
11. IF chega um pedido de leitura para uma conexão que já tem uma leitura em andamento THEN o sistema SHALL não iniciar outra e responder com o estado da leitura em andamento [SCH-11]
12. The system SHALL ler o schema apenas com transações de leitura [SCH-12]
13. IF um Visualizador chama a leitura ou a consulta do schema THEN o sistema SHALL responder 403 [SCH-13]
14. The system SHALL registrar em log cada leitura de schema com conexão, duração, quantidade de labels e de tipos de relacionamento e resultado, sem os valores de exemplo [SCH-14]

**Independent Test**: Cadastrar a conexão do dataset de exemplo e conferir no PostgreSQL, para um label conhecido, as propriedades, os tipos e um exemplo que existe de fato no banco.

---

### P1: Ver o schema ⭐ MVP

**User Story**: As a Admin ou Editor, I want navegar pelo schema lido so that eu saiba o que existe no banco e o que a IA conhece.

**Why P1**: Sem ver o schema, o usuário não confere o que foi lido nem escolhe o que não enviar.

**Acceptance Criteria**:

1. WHEN um Admin ou Editor abre o schema de uma conexão THEN o sistema SHALL mostrar a lista de labels e a lista de tipos de relacionamento, em ordem alfabética, com a data e hora da última leitura [SCH-15]
2. WHEN o usuário seleciona um label ou um tipo de relacionamento THEN o sistema SHALL mostrar a tabela de propriedades dele com as colunas "Propriedade", "Tipos" e "Exemplo" [SCH-16]
3. WHEN o usuário seleciona um tipo de relacionamento THEN o sistema SHALL mostrar os pares de origem e destino no formato `(:Origem)-[:TIPO]->(:Destino)` [SCH-17]
4. WHEN uma propriedade não tem exemplo THEN o sistema SHALL mostrar "sem exemplo" na coluna "Exemplo" [SCH-18]
5. WHEN o banco não tem nenhum label THEN o sistema SHALL mostrar "Este banco não tem dados" [SCH-19]
6. WHILE as listas passam da altura da tela o sistema SHALL rolar a lista de labels e tipos e a tabela de propriedades de forma independente, com o cabeçalho da tabela fixo [SCH-20]
7. WHEN um exemplo não cabe na célula THEN o sistema SHALL mostrar o começo dele e o valor inteiro ao passar o cursor [SCH-21]

**Independent Test**: Abrir o schema do dataset de exemplo, selecionar um label e ver propriedades, tipos e exemplos; selecionar um tipo de relacionamento e ver origem e destino.

---

### P1: Escolher propriedades que não enviam exemplo à IA ⭐ MVP

**User Story**: As a Admin, I want desligar o envio do exemplo de propriedades sensíveis so that valores como e-mail ou documento não saiam para o provedor de LLM.

**Why P1**: O exemplo é dado real do banco; o Admin precisa de um controle antes de a IA existir.

**Acceptance Criteria**:

1. WHEN um Admin desliga "Enviar exemplo à IA" em uma propriedade THEN o sistema SHALL gravar a escolha e marcar a propriedade como "exemplo não enviado" [SCH-22]
2. WHEN o schema é atualizado THEN o sistema SHALL manter a escolha de "Enviar exemplo à IA" de cada propriedade que continua existindo [SCH-23]
3. The system SHALL mostrar o controle "Enviar exemplo à IA" habilitado só para Admin [SCH-24]
4. WHEN surge uma propriedade nova em uma atualização do schema THEN o sistema SHALL deixá-la com "Enviar exemplo à IA" ligado [SCH-25]

**Independent Test**: Desligar o exemplo de uma propriedade, atualizar o schema e ver a escolha mantida.

---

## Edge Cases

- IF `NINBI_ENCRYPTION_KEY` não está definida THEN o sistema SHALL encerrar a inicialização do backend com a mensagem "NINBI_ENCRYPTION_KEY não definida" no log [CONN-21]
- IF o usuário do Neo4j não tem permissão para executar os procedimentos de schema THEN o sistema SHALL tratar como falha de leitura e mostrar a mensagem de erro do Neo4j [SCH-26]
- WHEN o valor de exemplo é uma data, um ponto, uma lista ou um mapa THEN o sistema SHALL guardá-lo e mostrá-lo como literal Cypher [SCH-27]
- WHEN um label deixa de existir em uma atualização THEN o sistema SHALL removê-lo do schema guardado, junto com as escolhas de "Enviar exemplo à IA" dele [SCH-28]
- IF a conexão é excluída durante uma leitura de schema THEN o sistema SHALL descartar o resultado da leitura [SCH-29]
- IF dois Admins enviam ao mesmo tempo uma conexão com o mesmo nome THEN o sistema SHALL salvar uma só e recusar a outra com a mensagem no campo "Nome" [CONN-22]

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | CONN-10, CONN-11, CONN-12; SCH-04 (sem tamanho máximo, por AD-005) |
| Failure / partial-failure states | CONN-08, CONN-09, SCH-09, SCH-10 (o schema anterior é mantido) |
| Idempotency / retry / duplicate handling | CONN-11, CONN-20, CONN-22, SCH-11 |
| Auth boundaries & rate limits | CONN-05, CONN-19, SCH-13, SCH-24. Rate limit N/A because só usuários logados de uma instalação self-hosted alcançam estas rotas, e SCH-11 já impede leituras em paralelo |
| Concurrency / ordering | SCH-11, SCH-29, CONN-22; edição simultânea: a última gravação vale (Assumptions) |
| Data lifecycle / expiry | SCH-06 (substitui), CONN-18 (apaga com a conexão), SCH-28. O cache não expira: só o botão atualiza |
| Observability | SCH-14, SCH-15 (data da última leitura) |
| External-dependency failure | CONN-08, CONN-09, SCH-09, SCH-10, SCH-26 (Neo4j) |
| State-transition integrity | SCH-08 e SCH-11 (lendo → lido ou falhou), SCH-23 e SCH-25 (escolhas entre versões do schema) |

---

## Requirement Traceability

<!-- TRACE:START -->

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CONN-01 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-02 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-03 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-04 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-05 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-06 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-07 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-08 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-09 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-10 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-11 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-12 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-13 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-14 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-15 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-16 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-17 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-18 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-19 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| CONN-20 | P1: Cadastrar uma conexão Neo4j | - | Pending |
| SCH-01 | P1: Ler o schema enriquecido | - | Pending |
| SCH-02 | P1: Ler o schema enriquecido | - | Pending |
| SCH-03 | P1: Ler o schema enriquecido | - | Pending |
| SCH-04 | P1: Ler o schema enriquecido | - | Pending |
| SCH-05 | P1: Ler o schema enriquecido | - | Pending |
| SCH-06 | P1: Ler o schema enriquecido | - | Pending |
| SCH-07 | P1: Ler o schema enriquecido | - | Pending |
| SCH-08 | P1: Ler o schema enriquecido | - | Pending |
| SCH-09 | P1: Ler o schema enriquecido | - | Pending |
| SCH-10 | P1: Ler o schema enriquecido | - | Pending |
| SCH-11 | P1: Ler o schema enriquecido | - | Pending |
| SCH-12 | P1: Ler o schema enriquecido | - | Pending |
| SCH-13 | P1: Ler o schema enriquecido | - | Pending |
| SCH-14 | P1: Ler o schema enriquecido | - | Pending |
| SCH-15 | P1: Ver o schema | - | Pending |
| SCH-16 | P1: Ver o schema | - | Pending |
| SCH-17 | P1: Ver o schema | - | Pending |
| SCH-18 | P1: Ver o schema | - | Pending |
| SCH-19 | P1: Ver o schema | - | Pending |
| SCH-20 | P1: Ver o schema | - | Pending |
| SCH-21 | P1: Ver o schema | - | Pending |
| SCH-22 | P1: Escolher propriedades que não enviam exemplo à IA | - | Pending |
| SCH-23 | P1: Escolher propriedades que não enviam exemplo à IA | - | Pending |
| SCH-24 | P1: Escolher propriedades que não enviam exemplo à IA | - | Pending |
| SCH-25 | P1: Escolher propriedades que não enviam exemplo à IA | - | Pending |
| CONN-21 | Edge Cases | - | Pending |
| SCH-26 | Edge Cases | - | Pending |
| SCH-27 | Edge Cases | - | Pending |
| SCH-28 | Edge Cases | - | Pending |
| SCH-29 | Edge Cases | - | Pending |
| CONN-22 | Edge Cases | - | Pending |

<!-- TRACE:END -->

**Coverage:** 51 total, 0 mapped to tasks, 51 unmapped ⚠️

---

## Sources

- Pedido original do usuário - "gerador de dashboard integrado ao Neo4j, com cypher queries".
- Decisão do usuário sobre o contexto da IA - "O schema tem q ter um exemplo e todos os tipos"; "tirando tamanho maximo" (AD-005).
- `.specs/STATE.md` - AD-002, AD-003, AD-005, AD-015, AD-016.
- Esta feature não tem captura própria: as telas usam o shell e os tokens de `fundacao-auth`, e a composição interna é decisão do builder.

---

## Success Criteria

- [ ] Do cadastro da conexão ao schema visível sem nenhum passo manual além do formulário.
- [ ] Todo exemplo mostrado existe de fato no banco, e nenhuma resposta da API contém a senha.
- [ ] Uma falha do Neo4j nunca apaga o schema guardado.
