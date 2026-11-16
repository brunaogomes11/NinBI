# conexoes-schema verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at f7049cf
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `apps/api/test/connections/connections.spec.ts` `CONN-01 lista conexões com nome, URI, banco e última leitura em ordem de nome`; `apps/web/src/features/connections/ConnectionsTab.test.tsx` `CONN-01 aba Conexões mostra nome, URI, banco e última leitura para Admin e Editor` | yes |
| C2 | `apps/web/src/features/connections/ConnectionsTab.test.tsx` `CONN-02 sem conexões mostra Nenhuma conexão cadastrada` | yes |
| C3 | `apps/web/src/features/connections/ConnectionsTab.test.tsx` `CONN-03 linhas de esqueleto enquanto a lista carrega` | yes |
| C4 | `apps/web/src/features/connections/ConnectionsTab.test.tsx` `CONN-04 erro mostra Não foi possível carregar as conexões e Tentar novamente recarrega` | yes |
| C5 | `apps/web/src/features/connections/ConnectionsTab.test.tsx` `CONN-05 Nova conexão, Editar e Excluir só aparecem para Admin` | yes |
| C6 | `apps/api/test/connections/connections.spec.ts` `CONN-06 testa a conexão no Neo4j antes de salvar` | yes |
| C7 | `apps/api/test/connections/connections.spec.ts` `CONN-07 teste aprovado salva a conexão e ela aparece na lista`; `apps/web/src/features/connections/ConnectionFormDialog.test.tsx` `CONN-07 nova conexão enviada aparece na lista` | yes |
| C8 | `apps/api/test/connections/connections.spec.ts` `CONN-08 teste reprovado não salva e devolve a mensagem do Neo4j`; `apps/api/test-int/neo4j-gateway.int.spec.ts` `CONN-08 senha errada rejeita com a mensagem do Neo4j`; `ConnectionFormDialog.test.tsx` `CONN-08 erro do Neo4j aparece com o formulário preenchido` | yes |
| C9 | `apps/api/test/neo4j/driver-neo4j.gateway.spec.ts` `CONN-09 verify encerra no prazo com Neo4jTimeoutError`; `connections.spec.ts` `CONN-09 Neo4j sem resposta no prazo devolve Não foi possível conectar em 10 s`; `ConnectionFormDialog.test.tsx` `CONN-09 prazo esgotado mostra Não foi possível conectar em 10 s` | yes |
| C10 | `packages/contracts/src/connections.spec.ts` `CONN-10 aceita os seis esquemas de URI e recusa os demais com URI inválida`; `apps/api/test/connections/connections.spec.ts` `CONN-10 URI inválida responde 400 no campo uri`; `ConnectionFormDialog.test.tsx` `CONN-10 URI inválida mostra a mensagem no campo sem enviar` | no - a prova web só confere o texto na tela (`ConnectionFormDialog.test.tsx:160`, `findByText`), não que a mensagem esteja no campo URI; contrato e API seguram o campo, a tela não |
| C11 | `packages/contracts/src/connections.spec.ts` `CONN-11 nome vazio ou com mais de 80 caracteres`; `connections.spec.ts` `CONN-11 nome repetido sem diferenciar maiúsculas responde 409 no campo name`; `ConnectionFormDialog.test.tsx` `CONN-11 nome repetido mostra Já existe uma conexão com este nome no campo Nome` | yes |
| C12 | `packages/contracts/src/connections.spec.ts` `CONN-12 banco vazio vira null`; `connections.spec.ts` `CONN-12 banco vazio conecta sem banco e guarda null`; `apps/api/test-int/neo4j-gateway.int.spec.ts` `CONN-12 sem banco a sessão usa o banco padrão do servidor` | yes |
| C13 | `apps/api/test/crypto/crypto.spec.ts` `CONN-13 cifra AES-256-GCM no formato v1 e decifra de volta`; `connections.spec.ts` `CONN-13 senha guardada cifrada no PostgreSQL` | yes |
| C14 | `apps/api/test/connections/connections.spec.ts` `CONN-14 nenhuma resposta da API contém a senha`; `connections-manage.spec.ts` `CONN-14 resposta da edição não contém a senha` | yes |
| C15 | `apps/api/test/connections/connections-manage.spec.ts` `CONN-15 senha vazia na edição mantém a senha guardada`; `ConnectionFormDialog.test.tsx` `CONN-15 editar com Senha vazia não envia senha` | yes |
| C16 | `connections-manage.spec.ts` `CONN-16 edição testa a conexão de novo antes de gravar`; `ConnectionFormDialog.test.tsx` `CONN-16 edição reprovada mostra o erro do Neo4j` | yes |
| C17 | `apps/web/src/features/connections/ConnectionRowActions.test.tsx` `CONN-17 Excluir pede confirmação com o nome da conexão` | yes |
| C18 | `connections-manage.spec.ts` `CONN-18 excluir apaga a conexão e o schema guardado`; `ConnectionRowActions.test.tsx` `CONN-18 confirmar a exclusão tira a conexão da lista` | yes |
| C19 | `connections.spec.ts` `CONN-19 Editor e Visualizador recebem 403 ao criar conexão`; `connections-manage.spec.ts` `CONN-19 Editor e Visualizador recebem 403 ao editar e excluir conexão` | yes |
| C20 | `ConnectionFormDialog.test.tsx` `CONN-20 Salvar fica desabilitado durante o teste e a gravação` | yes |
| C21 | `apps/api/test/crypto/crypto.spec.ts` `CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem` | yes |
| C22 | `apps/api/test-int/connections.int.spec.ts` `CONN-22 criação simultânea com o mesmo nome salva uma só` | yes |
| C23 | `apps/api/test/schema/schema-routes.spec.ts` `SCH-01 criar a conexão lê o schema sem outra ação` | yes |
| C24 | `apps/api/test/schema/schema-reader.spec.ts` `SCH-02 cada label guarda as propriedades com todos os tipos`; `apps/api/test-int/schema-reader.int.spec.ts` `SCH-02 schema do Varejo traz os labels com propriedades e tipos` | yes |
| C25 | `apps/api/test/schema/schema-reader.spec.ts` `SCH-03 cada tipo de relacionamento guarda as propriedades com todos os tipos`; `schema-reader.int.spec.ts` `SCH-03 schema do Varejo traz CONTEM com quantidade` | yes |
| C26 | `schema-reader.spec.ts` `SCH-04 exemplo é o primeiro valor não nulo inteiro`; `apps/api/test/schema/cypher-literal.spec.ts` `SCH-04 literal não corta texto longo`; `schema-reader.int.spec.ts` `SCH-04 exemplo do Varejo existe no banco` | yes |
| C27 | `schema-reader.spec.ts` `SCH-05 tipo de relacionamento guarda os pares de origem e destino`; `schema-reader.int.spec.ts` `SCH-05 Varejo liga Cliente a Pedido por FEZ` | yes |
| C28 | `apps/api/test/schema/schema-refresh.spec.ts` `SCH-06 leitura substitui o schema anterior com data e hora` | yes |
| C29 | `schema-routes.spec.ts` `SCH-07 Atualizar schema lê de novo`; `apps/web/src/features/connections/SchemaPage.test.tsx` `SCH-07 clicar em Atualizar schema mostra a nova data de leitura` | yes |
| C30 | `schema-routes.spec.ts` `SCH-08 estado READING durante a leitura`; `SchemaPage.test.tsx` `SCH-08 Lendo schema com o botão desabilitado` | yes |
| C31 | `schema-refresh.spec.ts` `SCH-09 falha mantém o schema anterior e guarda a mensagem do Neo4j`; `SchemaPage.test.tsx` `SCH-09 falha mostra Não foi possível ler o schema com a mensagem e o schema anterior` | yes |
| C32 | `schema-refresh.spec.ts` `SCH-10 leitura além do prazo é cancelada e vira falha`; `schema-refresh.spec.ts` `SCH-10 prazo padrão da leitura é 120 s` | yes |
| C33 | `schema-refresh.spec.ts` `SCH-11 pedido durante leitura em andamento devolve o estado sem nova leitura`; `apps/api/test-int/schema-refresh.int.spec.ts` `SCH-11 pedidos simultâneos iniciam uma leitura só` | yes |
| C34 | `apps/api/test-int/neo4j-gateway.int.spec.ts` `SCH-12 leitura usa transação de leitura e recusa escrita` | yes |
| C35 | `schema-routes.spec.ts` `SCH-13 Visualizador recebe 403 na leitura e na consulta do schema` | yes |
| C36 | `schema-refresh.spec.ts` `SCH-14 log da leitura tem conexão, duração, contagens e resultado sem exemplos` | yes |
| C37 | `schema-routes.spec.ts` `SCH-15 schema volta com labels e tipos em ordem alfabética`; `SchemaPage.test.tsx` `SCH-15 schema mostra labels e tipos na ordem e a data da última leitura` | yes |
| C38 | `apps/web/src/features/connections/SchemaPropertiesTable.test.tsx` `SCH-16 selecionar um label mostra Propriedade, Tipos e Exemplo` | yes |
| C39 | `SchemaPropertiesTable.test.tsx` `SCH-17 tipo de relacionamento mostra (:Origem)-[:TIPO]->(:Destino)` | yes |
| C40 | `SchemaPropertiesTable.test.tsx` `SCH-18 propriedade sem exemplo mostra sem exemplo` | yes |
| C41 | `SchemaPage.test.tsx` `SCH-19 banco sem labels mostra Este banco não tem dados` | yes |
| C42 | `SchemaPage.test.tsx` `SCH-20 lista e tabela rolam separadas com cabeçalho fixo` | yes |
| C43 | `SchemaPropertiesTable.test.tsx` `SCH-21 exemplo longo truncado mostra o valor inteiro no title` | yes |
| C44 | `schema-routes.spec.ts` `SCH-22 Admin desliga o envio do exemplo e o schema mostra sendExample false`; `apps/web/src/features/connections/ExampleToggle.test.tsx` `SCH-22 desligar Enviar exemplo à IA mostra exemplo não enviado` | yes |
| C45 | `schema-refresh.spec.ts` `SCH-23 escolha sobrevive à atualização do schema` | yes |
| C46 | `schema-routes.spec.ts` `SCH-24 Editor recebe 403 ao mudar Enviar exemplo à IA`; `ExampleToggle.test.tsx` `SCH-24 controle Enviar exemplo à IA desabilitado para Editor` | yes |
| C47 | `schema-refresh.spec.ts` `SCH-25 propriedade nova chega com envio do exemplo ligado` | yes |
| C48 | `schema-reader.spec.ts` `SCH-26 sem permissão nos procedimentos a leitura falha com a mensagem do Neo4j` | yes |
| C49 | `cypher-literal.spec.ts` `SCH-27 data, ponto, lista e mapa viram literal Cypher`; `SchemaPropertiesTable.test.tsx` `SCH-27 exemplo aparece como literal Cypher` | yes |
| C50 | `schema-refresh.spec.ts` `SCH-28 label removido sai do schema com as escolhas dele` | yes |
| C51 | `schema-refresh.spec.ts` `SCH-29 conexão excluída durante a leitura descarta o resultado` | yes |

Contagem: 50 `yes`, 1 `no`.

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| C10: a prova web de URI inválida não prende a mensagem ao campo URI; uma mensagem fora do campo passaria | `apps/web/src/features/connections/ConnectionFormDialog.test.tsx:153-162` usa só `findByText('URI inválida')` e `posts` vazio; a asserção de campo existe em `ConnectionFormDialog.test.tsx:184-186` para o nome (CONN-11) e falta para a URI | Na mesma prova, acrescentar `expect(screen.getByLabelText('URI')).toHaveAccessibleDescription('URI inválida')`, como CONN-11 faz para o nome | |

## Observações (não são findings)

- `packages/contracts/src/connections.ts:50` (`URI_PATTERN`) não tem âncora `$`: `bolt://h junk`, `neo4j://h?x=1` e `bolt://:7687` são aceitos. O critério CONN-10 só fixa o esquema inicial, então a regra está cumprida; vale saber que a validação não é de formato completo.
- `apps/api/src/schema/cypher-literal.ts`: chave de mapa vazia gera `{``: 1}`, Cypher inválido. Nenhum critério cobre esse caso.
- Own examples rodados no HEAD e apagados (nada commitado): URI `neo4j+ss://h` recusada; nome com 80 caracteres após o trim aceito e 81 recusado; inteiro `-9007199254740993` sai sem perda; `date`/`point` seguem o formato da spec.

## Gate

`validate_verification.py` não foi rodado, pois este relatório não passa pelo gate neste turno.
