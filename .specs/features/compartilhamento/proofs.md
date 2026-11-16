# compartilhamento proofs

**HEAD**: cab211a
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 80 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run api / ✓ TEAM-01 lista equipes com nome e número de membros em ordem alfabética` | pass |
| C1 | `run web / ✓ TEAM-01 seção Equipes mostra nome e número de membros na ordem da API` | pass |
| C2 | `run web / ✓ TEAM-02 sem equipes mostra Nenhuma equipe criada` | pass |
| C3 | `run api / ✓ TEAM-03 cria a equipe com nome e membros` | pass |
| C3 | `run web / ✓ TEAM-03 Nova equipe com nome e membros aparece na lista` | pass |
| C4 | `run contracts / ✓ TEAM-04 nome da equipe vazio ou com mais de 40 caracteres` | pass |
| C4 | `run api / ✓ TEAM-04 índice único recusa nome de equipe repetido sem diferenciar maiúsculas` | pass |
| C4 | `run api / ✓ TEAM-04 nome vazio, longo ou repetido responde 400 no campo nome` | pass |
| C4 | `run web / ✓ TEAM-04 nome inválido ou repetido mostra a mensagem no campo Nome` | pass |
| C5 | `run api / ✓ TEAM-05 remover membro da equipe tira o acesso na próxima requisição` | pass |
| C5 | `run web / ✓ TEAM-05 Editar equipe envia os membros marcados` | pass |
| C6 | `run api / ✓ TEAM-06 renomear a equipe muda o nome na lista` | pass |
| C6 | `run api / ✓ TEAM-06 compartilhamento mostra o nome novo da equipe` | pass |
| C6 | `run web / ✓ TEAM-06 renomear a equipe mostra o novo nome na lista` | pass |
| C7 | `run api / ✓ TEAM-07 equipe informa quantos dashboards estão compartilhados com ela` | pass |
| C7 | `run web / ✓ TEAM-07 Excluir equipe pede confirmação com o nome e o número de dashboards` | pass |
| C8 | `run api / ✓ TEAM-08 apagar a equipe apaga os compartilhamentos feitos com ela` | pass |
| C8 | `run api / ✓ TEAM-08 excluir a equipe apaga a equipe e os compartilhamentos dela` | pass |
| C8 | `run web / ✓ TEAM-08 confirmar a exclusão tira a equipe da lista` | pass |
| C9 | `run api / ✓ TEAM-09 Editor e Visualizador recebem 403 nas rotas de equipe` | pass |
| C10 | `run web / ✓ TEAM-10 erro nas equipes mostra Não foi possível carregar as equipes e Tentar novamente recarrega` | pass |
| C11 | `run api / ✓ SHARE-01 só o dono e os Admins têm permissão de compartilhar` | pass |
| C11 | `run web / ✓ SHARE-01 Compartilhar aparece só para o dono e Admins` | pass |
| C12 | `run api / ✓ SHARE-02 lista de compartilhamentos traz o dono e cada destinatário com a permissão` | pass |
| C12 | `run web / ✓ SHARE-02 tela de compartilhamento mostra o dono e cada linha com a permissão` | pass |
| C13 | `run web / ✓ SHARE-03 sem compartilhamentos mostra Só você vê este dashboard` | pass |
| C14 | `run api / ✓ SHARE-04 busca lista usuários ativos por nome ou e-mail, equipes e Todos da instalação` | pass |
| C14 | `run web / ✓ SHARE-04 digitar na busca lista usuários, equipes e Todos da instalação` | pass |
| C15 | `run api / ✓ SHARE-05 busca sem resultado devolve listas vazias` | pass |
| C15 | `run web / ✓ SHARE-05 busca sem resultado mostra Nenhum usuário ou equipe encontrado` | pass |
| C16 | `run api / ✓ SHARE-06 adicionar usuário, equipe e todos grava o compartilhamento na hora` | pass |
| C16 | `run web / ✓ SHARE-06 Adicionar grava o compartilhamento e mostra a linha` | pass |
| C17 | `run api / ✓ SHARE-07 mudar a permissão vale na próxima requisição de quem recebe` | pass |
| C17 | `run web / ✓ SHARE-07 mudar a permissão de uma linha envia a nova permissão` | pass |
| C18 | `run api / ✓ SHARE-08 remover o compartilhamento tira o acesso na próxima requisição` | pass |
| C18 | `run web / ✓ SHARE-08 Remover tira a linha da lista` | pass |
| C19 | `run api / ✓ SHARE-09 índice único impede duas linhas para o mesmo destinatário` | pass |
| C19 | `run api / ✓ SHARE-09 destinatário repetido atualiza a linha existente` | pass |
| C19 | `run web / ✓ SHARE-09 adicionar destinatário que já está na lista atualiza a linha` | pass |
| C20 | `run contracts / ✓ SHARE-10 Visualizador só recebe Pode ver nas opções` | pass |
| C20 | `run api / ✓ SHARE-10 Visualizador com Pode editar responde 400` | pass |
| C20 | `run web / ✓ SHARE-10 Visualizador só tem a opção Pode ver` | pass |
| C21 | `run api / ✓ SHARE-11 dono fica fora da busca` | pass |
| C22 | `run api / ✓ SHARE-12 quem não é dono nem Admin recebe 403 nos compartilhamentos` | pass |
| C23 | `run web / ✓ SHARE-13 esqueleto enquanto a tela carrega` | pass |
| C24 | `run web / ✓ SHARE-14 falha mantém a lista e mostra Não foi possível atualizar o compartilhamento` | pass |
| C24 | `run web / ✓ SHARE-14 falha ao adicionar mantém a lista e mostra a mensagem` | pass |
| C25 | `run web / ✓ SHARE-15 lista rola com o campo de busca fixo` | pass |
| C26 | `run api / ✓ ACL-01 permissão é a mais alta entre direto, equipes e todos` | pass |
| C27 | `run api / ✓ ACL-02 Visualizador com compartilhamento de edição só vê` | pass |
| C28 | `run api / ✓ ACL-03 toda rota de dashboard verifica a permissão no dashboard` | pass |
| C29 | `run api / ✓ ACL-04 dashboard compartilhado aparece em Compartilhados comigo` | pass |
| C29 | `run web / ✓ ACL-04 sidebar mostra Compartilhados comigo com os dashboards compartilhados` | pass |
| C30 | `run api / ✓ ACL-05 compartilhado gravado na sidebar sai de Compartilhados comigo` | pass |
| C30 | `run web / ✓ ACL-05 moveItem insere o dashboard vindo de Compartilhados comigo` | pass |
| C30 | `run web / ✓ ACL-05 arrastar de Compartilhados comigo para um grupo o mantém no grupo` | pass |
| C31 | `run api / ✓ ACL-06 quem pode ver recebe permissões sem editar, excluir nem compartilhar` | pass |
| C31 | `run web / ✓ ACL-06 quem pode ver não vê Editar, Excluir nem Compartilhar` | pass |
| C32 | `run api / ✓ ACL-07 quem pode editar recebe editar sem excluir nem compartilhar` | pass |
| C32 | `run web / ✓ ACL-07 quem pode editar vê Editar sem Excluir nem Compartilhar` | pass |
| C33 | `run web / ✓ ACL-08 quem não é o dono vê Compartilhado por com o nome do dono` | pass |
| C34 | `run api / ✓ ACL-09 acesso perdido tira o dashboard da sidebar e dos grupos` | pass |
| C35 | `run api / ✓ ACL-10 sem compartilhados a seção vem vazia` | pass |
| C35 | `run web / ✓ ACL-10 sem compartilhados a seção Compartilhados comigo não aparece` | pass |
| C36 | `run api / ✓ ACL-11 log registra criação, mudança e remoção com autor, dashboard, destinatário e permissão` | pass |
| C37 | `run api / ✓ ACL-12 acesso removido responde Dashboard não encontrado na próxima ação` | pass |
| C37 | `run web / ✓ ACL-12 acesso removido mostra Dashboard não encontrado na próxima ação` | pass |
| C38 | `run api / ✓ ACL-13 gravar sem permissão de edição responde Você não tem mais permissão` | pass |
| C38 | `run web / ✓ ACL-13 salvar sem permissão mostra Você não tem mais permissão para editar este dashboard` | pass |
| C39 | `run api / ✓ ACL-14 Pode ver direto e Pode editar pela equipe dá editar` | pass |
| C40 | `run api / ✓ ACL-15 usuário criado depois do compartilhamento com todos tem acesso` | pass |
| C41 | `run api / ✓ ACL-16 dono desativado mantém o dashboard e os compartilhamentos` | pass |
| C42 | `run api / ✓ SHARE-16 usuário desativado continua na lista marcado como desativado` | pass |
| C42 | `run web / ✓ SHARE-16 usuário desativado aparece marcado como Desativado` | pass |
| C43 | `run apiint / ✓ SHARE-17 dois envios simultâneos do mesmo destinatário deixam uma linha` | pass |
| C44 | `run api / ✓ ACL-17 dois editores salvando a mesma versão recebem 409 no segundo` | pass |
| C45 | `run api / ✓ SHARE-18 apagar o dashboard apaga os compartilhamentos dele` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run api` - exit 0

```
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 cifra adulterada lança 1ms
 ✓ test/crypto/crypto.spec.ts > cifra de segredos > CONN-13 chave diferente não decifra 1ms
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem 3ms
 ✓ test/crypto/crypto.spec.ts > chave de cifra na inicialização > CONN-21 chave que não tem 32 bytes não inicia o backend 1ms
 ✓ test/common/http-logging.spec.ts > log de requisições > FND-05 log de requisição tem método, caminho, status e duração sem corpo, senha nem cookie 2178ms

 Test Files  45 passed (45)
      Tests  254 passed (254)
   Start at  15:36:28
   Duration  118.49s (tests 78%, import 22%)

$ vitest run --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

`Run web` - exit 0

```
 ✓ src/features/sidebar/layout.test.ts > layout da sidebar > SIDE-04 moveItem põe o dashboard antes do alvo dentro do grupo e no fim do grupo 0ms
 ✓ src/features/sidebar/layout.test.ts > layout da sidebar > SIDE-05 moveItem solta o dashboard do grupo antes de um item solto 0ms
 ✓ src/features/sidebar/layout.test.ts > layout da sidebar > SIDE-06 grupo movido para dentro de grupo fica antes do grupo alvo 0ms
 ✓ src/features/sidebar/layout.test.ts > layout da sidebar > ACL-05 moveItem insere o dashboard vindo de Compartilhados comigo 0ms

 Test Files  48 passed (48)
      Tests  248 passed (248)
   Start at  15:38:31
   Duration  47.37s (import 31%, environment 29%, tests 22%, setup 14%, transform 5%)

Environment  jsdom was created 48 times · 140.80s total, 29% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

$ vitest run --reporter=verbose
```

`Run contracts` - exit 0

```
 ✓ src/dashboards.spec.ts > dashboard contracts > SIDE-02 nome do grupo vazio ou com mais de 40 caracteres 2ms
 ✓ src/dashboards.spec.ts > dashboard contracts > TAB-04 nome da aba vazio ou com mais de 40 caracteres 2ms
 ✓ src/dashboards.spec.ts > dashboard contracts > WDG-07 título do widget vazio ou com mais de 80 caracteres 2ms
 ✓ src/dashboards.spec.ts > dashboard contracts > GRID-03 layout do widget fora dos limites da grade é recusado 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > QRY-09 Cypher com mais de 20000 caracteres no contrato 2ms
 ✓ src/dashboards.spec.ts > dashboard contracts > dashboardSaveSchema sem abas é recusado e com abas e widgets é aceito 0ms
 ✓ src/dashboards.spec.ts > dashboard contracts > sidebarLayoutSchema com um dashboard repetido é recusado 1ms
 ✓ src/dashboards.spec.ts > dashboard contracts > MESSAGES formata o prazo e o corte de linhas 17ms

 Test Files  5 passed (5)
      Tests  64 passed (64)
   Start at  15:39:20
   Duration  525ms (import 67%, transform 21%, tests 8%, worker 4%)

$ vitest run --reporter=verbose
```

`Run apiint` - exit 0

```

    Isolate  10 workers spawned · ~147ms startup each (spawn + environment, per file)
             at least ~1.32s faster with isolate: false — reuses workers across files instead of one per file

$ node scripts/docker.mjs up
 Container ninbi-dev-neo4j-1 Running 
 Container ninbi-dev-postgres-1 Running 
 Container ninbi-dev-postgres-1 Waiting 
 Container ninbi-dev-neo4j-1 Waiting 
 Container ninbi-dev-postgres-1 Healthy 
 Container ninbi-dev-neo4j-1 Healthy 
$ vitest run --config vitest.int.config.ts --reporter=verbose
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.int.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```
