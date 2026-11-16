# conexoes-schema proofs

**HEAD**: 7d01d17
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 87 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run api / ✓ CONN-01 lista conexões com nome, URI, banco e última leitura em ordem de nome` | pass |
| C1 | `run web / ✓ CONN-01 aba Conexões mostra nome, URI, banco e última leitura para Admin e Editor` | pass |
| C2 | `run web / ✓ CONN-02 sem conexões mostra Nenhuma conexão cadastrada` | pass |
| C3 | `run web / ✓ CONN-03 linhas de esqueleto enquanto a lista carrega` | pass |
| C4 | `run web / ✓ CONN-04 erro mostra Não foi possível carregar as conexões e Tentar novamente recarrega` | pass |
| C5 | `run web / ✓ CONN-05 Nova conexão, Editar e Excluir só aparecem para Admin` | pass |
| C6 | `run api / ✓ CONN-06 testa a conexão no Neo4j antes de salvar` | pass |
| C7 | `run api / ✓ CONN-07 teste aprovado salva a conexão e ela aparece na lista` | pass |
| C7 | `run web / ✓ CONN-07 nova conexão enviada aparece na lista` | pass |
| C8 | `run api / ✓ CONN-08 teste reprovado não salva e devolve a mensagem do Neo4j` | pass |
| C8 | `run apiint / ✓ CONN-08 senha errada rejeita com a mensagem do Neo4j` | pass |
| C8 | `run web / ✓ CONN-08 erro do Neo4j aparece com o formulário preenchido` | pass |
| C9 | `run api / ✓ CONN-09 verify encerra no prazo com Neo4jTimeoutError` | pass |
| C9 | `run api / ✓ CONN-09 Neo4j sem resposta no prazo devolve Não foi possível conectar em 10 s` | pass |
| C9 | `run api / ✓ CONN-09 prazo padrão do teste de conexão é 10 s` | pass |
| C9 | `run web / ✓ CONN-09 prazo esgotado mostra Não foi possível conectar em 10 s` | pass |
| C10 | `run contracts / ✓ CONN-10 aceita os seis esquemas de URI e recusa os demais com URI inválida` | pass |
| C10 | `run api / ✓ CONN-10 URI inválida responde 400 no campo uri` | pass |
| C10 | `run web / ✓ CONN-10 URI inválida mostra a mensagem no campo sem enviar` | pass |
| C11 | `run contracts / ✓ CONN-11 nome vazio ou com mais de 80 caracteres` | pass |
| C11 | `run api / ✓ CONN-11 nome repetido sem diferenciar maiúsculas responde 409 no campo name` | pass |
| C11 | `run web / ✓ CONN-11 nome repetido mostra Já existe uma conexão com este nome no campo Nome` | pass |
| C12 | `run contracts / ✓ CONN-12 banco vazio vira null` | pass |
| C12 | `run api / ✓ CONN-12 banco vazio conecta sem banco e guarda null` | pass |
| C12 | `run apiint / ✓ CONN-12 sem banco a sessão usa o banco padrão do servidor` | pass |
| C13 | `run api / ✓ CONN-13 cifra AES-256-GCM no formato v1 e decifra de volta` | pass |
| C13 | `run api / ✓ CONN-13 senha guardada cifrada no PostgreSQL` | pass |
| C14 | `run api / ✓ CONN-14 nenhuma resposta da API contém a senha` | pass |
| C14 | `run api / ✓ CONN-14 resposta da edição não contém a senha` | pass |
| C15 | `run api / ✓ CONN-15 senha vazia na edição mantém a senha guardada` | pass |
| C15 | `run web / ✓ CONN-15 editar com Senha vazia não envia senha` | pass |
| C16 | `run api / ✓ CONN-16 edição testa a conexão de novo antes de gravar` | pass |
| C16 | `run web / ✓ CONN-16 edição reprovada mostra o erro do Neo4j` | pass |
| C17 | `run web / ✓ CONN-17 Excluir pede confirmação com o nome da conexão` | pass |
| C18 | `run api / ✓ CONN-18 excluir apaga a conexão e o schema guardado` | pass |
| C18 | `run web / ✓ CONN-18 confirmar a exclusão tira a conexão da lista` | pass |
| C19 | `run api / ✓ CONN-19 Editor e Visualizador recebem 403 ao criar conexão` | pass |
| C19 | `run api / ✓ CONN-19 Editor e Visualizador recebem 403 ao editar e excluir conexão` | pass |
| C20 | `run web / ✓ CONN-20 Salvar fica desabilitado durante o teste e a gravação` | pass |
| C21 | `run api / ✓ CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem` | pass |
| C22 | `run apiint / ✓ CONN-22 criação simultânea com o mesmo nome salva uma só` | pass |
| C23 | `run api / ✓ SCH-01 criar a conexão lê o schema sem outra ação` | pass |
| C24 | `run api / ✓ SCH-02 cada label guarda as propriedades com todos os tipos` | pass |
| C24 | `run apiint / ✓ SCH-02 schema do Varejo traz os labels com propriedades e tipos` | pass |
| C25 | `run api / ✓ SCH-03 cada tipo de relacionamento guarda as propriedades com todos os tipos` | pass |
| C25 | `run apiint / ✓ SCH-03 schema do Varejo traz CONTEM com quantidade` | pass |
| C26 | `run api / ✓ SCH-04 exemplo é o primeiro valor não nulo inteiro` | pass |
| C26 | `run api / ✓ SCH-04 literal não corta texto longo` | pass |
| C26 | `run apiint / ✓ SCH-04 exemplo do Varejo existe no banco` | pass |
| C27 | `run api / ✓ SCH-05 tipo de relacionamento guarda os pares de origem e destino` | pass |
| C27 | `run apiint / ✓ SCH-05 Varejo liga Cliente a Pedido por FEZ` | pass |
| C28 | `run api / ✓ SCH-06 leitura substitui o schema anterior com data e hora` | pass |
| C29 | `run api / ✓ SCH-07 Atualizar schema lê de novo` | pass |
| C29 | `run web / ✓ SCH-07 clicar em Atualizar schema mostra a nova data de leitura` | pass |
| C30 | `run api / ✓ SCH-08 estado READING durante a leitura` | pass |
| C30 | `run web / ✓ SCH-08 Lendo schema com o botão desabilitado` | pass |
| C31 | `run api / ✓ SCH-09 falha mantém o schema anterior e guarda a mensagem do Neo4j` | pass |
| C31 | `run web / ✓ SCH-09 falha mostra Não foi possível ler o schema com a mensagem e o schema anterior` | pass |
| C32 | `run api / ✓ SCH-10 leitura além do prazo é cancelada e vira falha` | pass |
| C32 | `run api / ✓ SCH-10 prazo padrão da leitura é 120 s` | pass |
| C33 | `run api / ✓ SCH-11 pedido durante leitura em andamento devolve o estado sem nova leitura` | pass |
| C33 | `run apiint / ✓ SCH-11 pedidos simultâneos iniciam uma leitura só` | pass |
| C34 | `run apiint / ✓ SCH-12 leitura usa transação de leitura e recusa escrita` | pass |
| C35 | `run api / ✓ SCH-13 Visualizador recebe 403 na leitura e na consulta do schema` | pass |
| C36 | `run api / ✓ SCH-14 log da leitura tem conexão, duração, contagens e resultado sem exemplos` | pass |
| C37 | `run api / ✓ SCH-15 schema volta com labels e tipos em ordem alfabética` | pass |
| C37 | `run web / ✓ SCH-15 schema mostra labels e tipos na ordem e a data da última leitura` | pass |
| C38 | `run web / ✓ SCH-16 selecionar um label mostra Propriedade, Tipos e Exemplo` | pass |
| C39 | `run web / ✓ SCH-17 tipo de relacionamento mostra (:Origem)-[:TIPO]->(:Destino)` | pass |
| C40 | `run web / ✓ SCH-18 propriedade sem exemplo mostra sem exemplo` | pass |
| C41 | `run web / ✓ SCH-19 banco sem labels mostra Este banco não tem dados` | pass |
| C42 | `run web / ✓ SCH-20 lista e tabela rolam separadas com cabeçalho fixo` | pass |
| C43 | `run web / ✓ SCH-21 exemplo longo truncado mostra o valor inteiro no title` | pass |
| C44 | `run api / ✓ SCH-22 Admin desliga o envio do exemplo e o schema mostra sendExample false` | pass |
| C44 | `run web / ✓ SCH-22 desligar Enviar exemplo à IA mostra exemplo não enviado` | pass |
| C45 | `run api / ✓ SCH-23 escolha sobrevive à atualização do schema` | pass |
| C46 | `run api / ✓ SCH-24 Editor recebe 403 ao mudar Enviar exemplo à IA` | pass |
| C46 | `run web / ✓ SCH-24 controle Enviar exemplo à IA desabilitado para Editor` | pass |
| C47 | `run api / ✓ SCH-25 propriedade nova chega com envio do exemplo ligado` | pass |
| C48 | `run api / ✓ SCH-26 sem permissão nos procedimentos a leitura falha com a mensagem do Neo4j` | pass |
| C49 | `run api / ✓ SCH-27 data, ponto, lista e mapa viram literal Cypher` | pass |
| C49 | `run web / ✓ SCH-27 exemplo aparece como literal Cypher` | pass |
| C50 | `run api / ✓ SCH-28 label removido sai do schema com as escolhas dele` | pass |
| C51 | `run api / ✓ SCH-29 conexão excluída durante a leitura descarta o resultado` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run api` - exit 0

```
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 duas cifras do mesmo texto diferem 1ms
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 cifra adulterada lança 1ms
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 chave diferente não decifra 0ms
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem 2ms
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 chave que não tem 32 bytes não inicia o backend 1ms

 Test Files  26 passed (26)
      Tests  130 passed (130)
   Start at  10:46:56
   Duration  56.65s (tests 77%, import 23%)

$ vitest run --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

`Run web` - exit 0

```
 ✓ src/lib/api.test.ts > apiFetch > AUTH-13 erro de resposta vira ApiError com code, message e fieldErrors 44ms
 ✓ src/lib/api.test.ts > apiFetch > AUTH-08 resposta 401 chama onUnauthorized 6ms
 ✓ src/lib/api.test.ts > apiFetch > AUTH-08 resposta 401 do login não chama onUnauthorized 5ms
 ✓ src/lib/api.test.ts > apiFetch > AUTH-13 falha de rede vira ApiError com status 0 e a mensagem de conexão 3ms

 Test Files  24 passed (24)
      Tests  103 passed (103)
   Start at  10:47:54
   Duration  16.86s (import 31%, environment 28%, tests 26%, setup 14%, transform 1%)

Environment  jsdom was created 24 times · 46.99s total, 28% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

$ vitest run --reporter=verbose
```

`Run apiint` - exit 0

```

    Isolate  7 workers spawned · ~142ms startup each (spawn + environment, per file)
             at least ~849ms faster with isolate: false — reuses workers across files instead of one per file

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

`Run contracts` - exit 0

```
 ✓ src/schemas.spec.ts > newUserSchema > USR-14 e-mail com 121 caracteres é recusado no campo e 120 passa 0ms
 ✓ src/schemas.spec.ts > newUserSchema > USR-04 nome vazio, e-mail mal formado, papel inválido e senha curta 0ms
 ✓ src/schemas.spec.ts > newUserSchema > USR-04 dados válidos passam, com os três papéis 0ms
 ✓ src/schemas.spec.ts > changePasswordSchema > PWD-03 nova senha com menos de 8 caracteres 0ms
 ✓ src/schemas.spec.ts > changePasswordSchema > PWD-01 senha atual vazia é recusada e dados válidos passam 0ms
 ✓ src/schemas.spec.ts > initialPasswordSchema > USR-06 confirmação diferente e senha curta na senha definitiva 1ms
 ✓ src/schemas.spec.ts > resetPasswordSchema e changeRoleSchema > USR-07 senha provisória curta é recusada e válida passa 0ms
 ✓ src/schemas.spec.ts > resetPasswordSchema e changeRoleSchema > ROLE-05 papel inválido é recusado e papel válido passa 0ms

 Test Files  3 passed (3)
      Tests  49 passed (49)
   Start at  10:48:29
   Duration  337ms (import 78%, transform 10%, tests 7%, worker 5%)

$ vitest run --reporter=verbose
```
