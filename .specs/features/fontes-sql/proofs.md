# fontes-sql proofs

**HEAD**: 545aab0
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 132 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run contracts / ✓ SRC-01 tipos de conexão na ordem da spec` | pass |
| C1 | `run web / ✓ SRC-01 Nova conexão oferece Neo4j, PostgreSQL, MySQL e SQL Server` | pass |
| C2 | `run web / ✓ SRC-02 tipo SQL mostra host, porta, banco, usuário, senha e Usar SSL` | pass |
| C3 | `run contracts / ✓ SRC-03 porta padrão de cada tipo SQL` | pass |
| C3 | `run web / ✓ SRC-03 escolher o tipo preenche a porta padrão` | pass |
| C4 | `run web / ✓ SRC-04 Neo4j mantém o formulário com URI` | pass |
| C5 | `run api / ✓ SRC-05 criar conexão SQL testa antes de salvar` | pass |
| C6 | `run api / ✓ SRC-06 teste que passa salva e a conexão aparece na lista` | pass |
| C7 | `run api / ✓ SRC-07 teste que falha não salva e devolve a mensagem do banco` | pass |
| C8 | `run api / ✓ SRC-08 banco SQL que não responde em 10 s devolve a mensagem de prazo` | pass |
| C9 | `run contracts / ✓ SRC-09 host vazio, com espaços ou com :// é recusado` | pass |
| C9 | `run web / ✓ SRC-09 host inválido mostra a mensagem no campo` | pass |
| C10 | `run contracts / ✓ SRC-10 porta fora de 1 a 65535 é recusada` | pass |
| C10 | `run web / ✓ SRC-10 porta inválida mostra a mensagem no campo` | pass |
| C11 | `run contracts / ✓ SRC-11 banco vazio em conexão SQL é recusado` | pass |
| C11 | `run web / ✓ SRC-11 banco vazio mostra Informe o banco` | pass |
| C12 | `run api / ✓ SRC-12 PostgreSQL com SSL criptografa e valida o certificado` | pass |
| C12 | `run api / ✓ SRC-12 MySQL com SSL criptografa e valida o certificado` | pass |
| C12 | `run api / ✓ SRC-12 SQL Server com SSL criptografa e valida o certificado` | pass |
| C13 | `run api / ✓ SRC-13 PostgreSQL sem SSL abre a conexão sem criptografia` | pass |
| C13 | `run api / ✓ SRC-13 MySQL sem SSL abre a conexão sem criptografia` | pass |
| C13 | `run api / ✓ SRC-13 SQL Server sem SSL abre a conexão sem criptografia` | pass |
| C14 | `run web / ✓ SRC-14 formulário SQL recomenda usuário só de leitura` | pass |
| C15 | `run web / ✓ SRC-15 lista mostra o tipo e host:porta das conexões SQL` | pass |
| C16 | `run web / ✓ SRC-16 edição mostra o tipo desabilitado` | pass |
| C16 | `run api / ✓ SRC-16 trocar o tipo de uma conexão é recusado` | pass |
| C17 | `run api / ✓ SRC-17 editar conexão SQL sem senha mantém a senha e testa de novo` | pass |
| C18 | `run api / ✓ SRC-18 senha SQL fica criptografada e nunca volta na resposta` | pass |
| C19 | `run contracts / ✓ SRC-19 nome inválido de conexão SQL usa a mensagem do nome` | pass |
| C19 | `run api / ✓ SRC-19 nome repetido de conexão SQL é recusado com a mensagem no campo` | pass |
| C20 | `run api / ✓ SRC-20 Editor e Visualizador recebem 403 ao gerir conexão SQL` | pass |
| C21 | `run api / ✓ SRC-21 mensagem do driver sobre SSL chega ao formulário` | pass |
| C22 | `run api / ✓ SRC-22 registro sem fonte para um tipo falha com Driver não encontrado` | pass |
| C23 | `run web / ✓ SQX-01 editor de conexão SQL mostra Consulta SQL com destaque de SQL` | pass |
| C24 | `run web / ✓ SQX-02 editor de conexão Neo4j mostra Consulta Cypher` | pass |
| C24 | `run web / ✓ SQX-02 rótulo e linguagem da consulta por tipo de conexão` | pass |
| C25 | `run api / ✓ SQX-03 PostgreSQL consulta termina em ROLLBACK e fecha a conexão` | pass |
| C25 | `run api / ✓ SQX-03 MySQL consulta termina em ROLLBACK e fecha a conexão` | pass |
| C25 | `run api / ✓ SQX-03 SQL Server consulta termina em ROLLBACK e fecha a conexão` | pass |
| C25 | `run api / ✓ SQX-03 SQL Server não tem modo leitura e depende do ROLLBACK e do validador` | pass |
| C26 | `run api / ✓ SQX-04 PostgreSQL abre a transação em modo leitura` | pass |
| C26 | `run api / ✓ SQX-04 MySQL abre a transação em modo leitura` | pass |
| C26 | `run apiint / ✓ SQX-04 PostgreSQL real recusa escrita em transação de leitura` | pass |
| C27 | `run api / ✓ SQX-05 consulta que não começa por SELECT ou WITH é recusada` | pass |
| C28 | `run api / ✓ SQX-06 palavra bloqueada fora de strings e comentários é recusada com a cláusula` | pass |
| C29 | `run api / ✓ SQX-07 palavras bloqueadas valem sem diferenciar maiúsculas` | pass |
| C30 | `run api / ✓ SQX-08 palavra bloqueada em string, comentário, identificador ou nome maior é aceita` | pass |
| C30 | `run contracts / ✓ SQX-08 comentários e strings de SQL ficam fora das palavras` | pass |
| C31 | `run api / ✓ SQX-09 mais de uma instrução separada por ponto e vírgula é recusada` | pass |
| C32 | `run api / ✓ SQX-10 consulta que passa de 30 s mostra o tempo limite` | pass |
| C32 | `run api / ✓ SQX-10 PostgreSQL aplica o prazo e cancela ao estourar` | pass |
| C32 | `run api / ✓ SQX-10 MySQL aplica o prazo e cancela ao estourar` | pass |
| C32 | `run api / ✓ SQX-10 SQL Server aplica o prazo e cancela ao estourar` | pass |
| C32 | `run apiint / ✓ SQX-10 PostgreSQL real cancela consulta lenta` | pass |
| C33 | `run api / ✓ SQX-11 resultado acima de 5.000 linhas devolve as primeiras e avisa` | pass |
| C33 | `run api / ✓ SQX-11 PostgreSQL para a leitura em maxRows` | pass |
| C33 | `run api / ✓ SQX-11 MySQL para a leitura em maxRows` | pass |
| C33 | `run api / ✓ SQX-11 SQL Server para a leitura em maxRows` | pass |
| C34 | `run api / ✓ SQX-12 consulta SQL com mais de 20.000 caracteres é recusada` | pass |
| C35 | `run api / ✓ SQX-13 erro do banco SQL aparece a quem edita e genérico a quem só vê` | pass |
| C35 | `run api / ✓ SQX-13 dbCode segue ao prompt e erro de execução SQL vai só com o código` | pass |
| C36 | `run api / ✓ SQX-14 banco SQL inacessível mostra o nome da conexão` | pass |
| C37 | `run api / ✓ SQX-15 $nome vira parâmetro do driver sem colar o valor` | pass |
| C37 | `run api / ✓ SQX-15 SqlSource envia ao gateway texto e valores separados` | pass |
| C38 | `run contracts / ✓ SQX-16 $nome em string, comentário ou identificador não é parâmetro` | pass |
| C38 | `run contracts / ✓ SQX-16 $1 e $$ não são parâmetros e $nome é` | pass |
| C38 | `run web / ✓ SQX-16 parâmetros do widget SQL vêm do tokenizador SQL` | pass |
| C39 | `run api / ✓ SQX-17 parâmetro sem valor vai como null` | pass |
| C39 | `run api / ✓ SQX-17 QueryService executa $nome sem valor com null` | pass |
| C40 | `run api / ✓ SQX-18 $nome IS NULL e IS NOT NULL viram condição constante` | pass |
| C41 | `run api / ✓ SQX-19 lista vira um parâmetro por item e lista vazia vira NULL` | pass |
| C42 | `run api / ✓ SQX-20 data AAAA-MM-DD vai como texto de data` | pass |
| C43 | `run api / ✓ SQX-21 tipos do resultado SQL viram ResultValue` | pass |
| C43 | `run api / ✓ SQX-21 PostgreSQL converte data, data com hora e decimal` | pass |
| C43 | `run api / ✓ SQX-21 MySQL converte data, data com hora e decimal` | pass |
| C43 | `run api / ✓ SQX-21 SQL Server converte data, data com hora e decimal` | pass |
| C43 | `run apiint / ✓ SQX-21 PostgreSQL real devolve os tipos da spec` | pass |
| C44 | `run api / ✓ SQX-22 inteiro fora do intervalo vira bigint e decimal inexato vira texto` | pass |
| C45 | `run api / ✓ SQX-23 colunas repetidas ganham _2 e _3` | pass |
| C46 | `run api / ✓ SQX-24 log de execução traz o tipo e não traz as linhas` | pass |
| C47 | `run api / ✓ SQX-25 SQL enviado como texto por quem não edita responde 403` | pass |
| C48 | `run api / ✓ SQX-26 erro de rede do driver é indisponibilidade` | pass |
| C49 | `run api / ✓ SQX-27 binário vira <binário N bytes>` | pass |
| C50 | `run api / ✓ SQX-28 filtro vazio com IS NULL OR IN vira condição verdadeira` | pass |
| C50 | `run apiint / ✓ SQX-28 filtro vazio devolve todas as linhas no PostgreSQL real` | pass |
| C51 | `run api / ✓ SCS-02 leitura guarda tabelas, views e colunas com o tipo` | pass |
| C52 | `run api / ✓ SCS-03 consultas de catálogo excluem os schemas do sistema` | pass |
| C52 | `run apiint / ✓ SCS-03 PostgreSQL real lista só schemas de usuário com views e chaves estrangeiras` | pass |
| C53 | `run api / ✓ SCS-04 exemplo é o primeiro valor não nulo das primeiras 100 linhas` | pass |
| C54 | `run api / ✓ SCS-05 chave estrangeira composta vira par de tabela e colunas` | pass |
| C55 | `run api / ✓ SCS-06 dialetos declaram nomes qualificados só no PostgreSQL e no SQL Server` | pass |
| C55 | `run api / ✓ SCS-06 nome qualificado no PostgreSQL e no SQL Server e simples no MySQL` | pass |
| C56 | `run api / ✓ SCS-07 tabela sem permissão de leitura fica sem exemplo e a leitura conclui` | pass |
| C57 | `run api / ✓ SCS-08 catálogo ilegível falha a leitura com a mensagem do banco` | pass |
| C58 | `run api / ✓ SCS-09 a leitura do schema só usa gateway.read` | pass |
| C58 | `run api / ✓ SQX-03 PostgreSQL consulta termina em ROLLBACK e fecha a conexão` | pass |
| C59 | `run api / ✓ SCS-01 criar conexão SQL inicia a leitura do schema` | pass |
| C60 | `run api / ✓ SCS-10 leitura grava no lugar do schema anterior e falha ou 120 s o mantém` | pass |
| C61 | `run api / ✓ SCS-11 leitura em andamento não inicia outra` | pass |
| C62 | `run api / ✓ SCS-12 schema SQL sai em ordem alfabética com views e relações` | pass |
| C62 | `run web / ✓ SCS-12 schema SQL mostra Tabelas com views marcadas e Relações` | pass |
| C63 | `run web / ✓ SCS-13 tabela selecionada mostra colunas e chaves estrangeiras` | pass |
| C64 | `run api / ✓ SCS-14 exemplo de texto, número e data vira literal SQL` | pass |
| C64 | `run web / ✓ SCS-14 exemplo aparece como literal SQL` | pass |
| C65 | `run web / ✓ SCS-15 banco sem tabelas mostra Este banco não tem dados` | pass |
| C66 | `run contracts / ✓ SCS-16 ajuste de exemplo aceita o elemento TABLE` | pass |
| C66 | `run api / ✓ SCS-16 escolha de exemplo por coluna sobrevive à atualização` | pass |
| C66 | `run web / ✓ SCS-16 Admin desliga Enviar exemplo à IA de uma coluna` | pass |
| C67 | `run api / ✓ SCS-17 log da leitura SQL traz tipo, tabelas e relações sem exemplos` | pass |
| C68 | `run api / ✓ SCS-18 conexão excluída durante a leitura descarta o resultado` | pass |
| C69 | `run api / ✓ SAI-01 prompt pede consulta no dialeto do tipo` | pass |
| C70 | `run api / ✓ SAI-02 prompt SQL leva tabelas, colunas, exemplos permitidos e chaves estrangeiras` | pass |
| C71 | `run api / ✓ SAI-03 prompt de Neo4j segue como antes` | pass |
| C72 | `run api / ✓ SAI-04 consulta SQL do modelo passa pelo validador antes de executar` | pass |
| C73 | `run api / ✓ SAI-05 consulta SQL que falha pede correção com o erro do banco` | pass |
| C74 | `run api / ✓ SAI-06 prompt descreve os parâmetros dos filtros em SQL` | pass |
| C75 | `run web / ✓ SAI-07 resultado da IA abre no editor do tipo da conexão` | pass |
| C76 | `run api / ✓ SMG-01 migração marca as conexões existentes como Neo4j` | pass |
| C76 | `run contracts / ✓ SMG-01 criação sem tipo vale Neo4j e mantém a URI` | pass |
| C77 | `run api / ✓ SMG-02 migração mantém o texto das consultas` | pass |
| C78 | `run api / ✓ SMG-03 Neo4jSource devolve o mesmo resultado que o QueryService devolvia` | pass |
| C78 | `run api / ✓ SMG-03 consulta Cypher passa pelo registro com o mesmo resultado` | pass |
| C78 | `run contracts / ✓ SMG-03 extractParameterNames sem linguagem segue o Cypher` | pass |
| C79 | `pnpm test` | pass |
| C80 | `run web / ✓ SMG-05 trocar para outro tipo pede confirmação` | pass |
| C80 | `run api / ✓ SMG-05 dashboard devolve o tipo da conexão` | pass |
| C81 | `run web / ✓ SMG-06 Cancelar mantém a conexão anterior` | pass |
| C82 | `run web / ✓ SMG-07 trocar para o mesmo tipo não pergunta` | pass |
| C83 | `run web / ✓ SMG-08 filtro mostra Consulta SQL ou Consulta Cypher pelo tipo` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run contracts` - exit 0

```
 ✓ src/ai.spec.ts > ai contracts > AIQ-14 pedido vazio é recusado 6ms
 ✓ src/ai.spec.ts > ai contracts > AIQ-15 pedido com mais de 4.000 caracteres dá a mensagem 1ms
 ✓ src/ai.spec.ts > ai contracts > MESSAGES.aiGenerating(2) é "Gerando... tentativa 2 de 4" 0ms
 ✓ src/ai.spec.ts > ai contracts > MESSAGES.aiProviderFailed('x') é "Erro do provedor de IA: x" 0ms
 ✓ src/ai.spec.ts > ai contracts > widgetId que não é UUID é recusado 1ms
 ✓ src/cypher-tokens.spec.ts > cypher tokens > FLT-09 extractParameterNames acha os parâmetros fora de strings e comentários 3ms
 ✓ src/cypher-tokens.spec.ts > cypher tokens > SMG-03 extractParameterNames sem linguagem segue o Cypher 0ms
 ✓ src/cypher-tokens.spec.ts > cypher tokens > SQX-16 extractParameterNames em SQL usa o tokenizador de SQL 1ms

 Test Files  12 passed (12)
      Tests  109 passed (109)
   Start at  09:55:30
   Duration  848ms (import 69%, transform 20%, tests 7%, worker 3%)

$ vitest run --reporter=verbose
```

`Run web` - exit 0

```
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/widgets/WidgetEditorDialog.filters.test.tsx > WidgetEditorDialog com filtros > XFL-01 widget KPI não mostra Ao clicar
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.

stderr | src/features/widgets/WidgetEditorDialog.filters.test.tsx > WidgetEditorDialog com filtros > XFL-01 widget KPI não mostra Ao clicar
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.
```

`Run api` - exit 0

```
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 duas cifras do mesmo texto diferem 1ms
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 cifra adulterada lança 1ms
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 chave diferente não decifra 0ms
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem 2ms
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 chave que não tem 32 bytes não inicia o backend 1ms

 Test Files  95 passed (95)
      Tests  496 passed (496)
   Start at  09:57:37
   Duration  289.56s (tests 65%, import 34%)

$ vitest run --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

`Run apiint` - exit 0

```
 ✓ test-int/neo4j-gateway.int.spec.ts > gateway do Neo4j contra o Neo4j de dev > verify com as credenciais certas resolve 44ms
 ✓ test-int/neo4j-gateway.int.spec.ts > gateway do Neo4j contra o Neo4j de dev > CONN-08 senha errada rejeita com a mensagem do Neo4j 12ms
 ✓ test-int/neo4j-gateway.int.spec.ts > gateway do Neo4j contra o Neo4j de dev > CONN-12 sem banco a sessão usa o banco padrão do servidor 17ms
 ✓ test-int/neo4j-gateway.int.spec.ts > gateway do Neo4j contra o Neo4j de dev > QRY-08 leitura para no limite sem ler o resto de um resultado gigante 30ms
 ✓ test-int/neo4j-gateway.int.spec.ts > gateway do Neo4j contra o Neo4j de dev > SCH-12 leitura usa transação de leitura e recusa escrita 22ms

 Test Files  11 passed (11)
      Tests  28 passed (28)
   Start at  10:02:30
   Duration  49.42s (import 70%, tests 25%, transform 5%)

$ vitest run --config vitest.int.config.ts --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.int.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

`pnpm test` - exit 0

```
apps/web test:              learn more: https://vitest.dev/guide/improving-performance#test-environments
apps/web test: Done
apps/api test:  ✓ test/web/web.spec.ts > servir o web pela API > FND-01 serve o index.html do web em GET / 2691ms
apps/api test:  ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 cifra AES-256-GCM no formato v1 e decifra de volta 4ms
apps/api test:  ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 duas cifras do mesmo texto diferem 1ms
apps/api test:  ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 cifra adulterada lança 1ms
apps/api test:  ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 chave diferente não decifra 1ms
apps/api test:  ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem 2ms
apps/api test:  ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 chave que não tem 32 bytes não inicia o backend 1ms
apps/api test:  Test Files  95 passed (95)
apps/api test:       Tests  496 passed (496)
apps/api test:    Start at  10:03:24
apps/api test:    Duration  415.30s (tests 55%, import 44%)
apps/api test: Done
$ pnpm -r test
```
