# mcp-client proofs

**HEAD**: f949211
**Tree**: clean
**Shell**: C:/Program Files/Git\bin\bash.exe
**Result**: 26 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run api / ✓ MCP-01 cadastro mantém dois servidores independentes` | pass |
| C2 | `run api / ✓ MCP-02 catálogo vem da conexão escolhida` | pass |
| C3 | `run api / ✓ MCP-03 queda do endpoint é indicada na descoberta` | pass |
| C4 | `run api / ✓ MCP-04 cadastro sem permissão é recusado` | pass |
| C5 | `run api / ✓ MCP-05 chamada retorna linhas e tipos das colunas` | pass |
| C6 | `run api / ✓ MCP-06 argumentos inválidos são recusados antes da chamada` | pass |
| C7 | `run api / ✓ MCP-07 ferramenta desabilitada não é chamada` | pass |
| C8 | `run api / ✓ MCP-08 resposta incompatível é recusada` | pass |
| C9 | `run web / ✓ MCP-09 gráfico salvo mostra colunas quando a lista tipada está vazia` | pass |
| C10 | `run api / ✓ MCP-10 chamada acima do prazo retorna erro de tempo limite` | pass |
| C11 | `run web / ✓ MCP-11 prévia de gráfico sinaliza que o resultado é parcial` | pass |
| C12 | `run api / ✓ MCP-12 configuração da chamada é persistida no widget` | pass |
| C13 | `run web / ✓ MCP-13 reabrir painel executa configuração persistida` | pass |
| C14 | `run web / ✓ MCP-14 filtro reexecuta apenas widget vinculado com o novo valor` | pass |
| C15 | `run web / ✓ MCP-15 falha de uma fonte mantém outro widget disponível` | pass |
| C16 | `run api / ✓ MCP-16 painel sem acesso não despacha chamada` | pass |
| C17 | `run api / ✓ MCP-17 rota salva executa MCP sem chamar o provedor de IA` | pass |
| C18 | `run api / ✓ MCP-18 endpoint protegido retorna erro de autorização` | pass |
| C19 | `run web / ✓ MCP-19 editor configura manualmente conexão ferramenta e argumentos` | pass |
| C20 | `run api / ✓ MCP-20 prévia faz chamadas somente ao endpoint MCP cadastrado` | pass |
| C21 | `run api / ✓ MCP-21 widgets salvos executam em seus respectivos servidores` | pass |
| C22 | `run web / ✓ MCP-22 editor oferece as listas tipadas declaradas pela ferramenta` | pass |
| C23 | `run api / ✓ MCP-23 somente a lista selecionada abastece o resultado` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run api` - exit 0

```
 ✓ test/mcp/dashboard.spec.ts > execução de dashboards MCP > MCP-12 configuração da chamada é persistida no widget 10ms
 ✓ test/mcp/dashboard.spec.ts > execução de dashboards MCP > MCP-21 widgets salvos executam em seus respectivos servidores 197ms
 ✓ test/mcp/dashboard.spec.ts > execução de dashboards MCP > MCP-16 painel sem acesso não despacha chamada 79ms
 ✓ test/mcp/dashboard.spec.ts > execução de dashboards MCP > MCP-17 rota salva executa MCP sem chamar o provedor de IA 169ms
 ✓ test/mcp/dashboard.spec.ts > execução de dashboards MCP > MCP-20 prévia faz chamadas somente ao endpoint MCP cadastrado 93ms

 Test Files  4 passed (4)
      Tests  19 passed (19)
   Start at  19:09:34
   Duration  8.13s (import 55%, tests 41%, transform 4%)

$ vitest run --reporter=verbose "test/mcp/"
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

`Run web` - exit 0

```
 ✓ src/features/widgets/McpClient.test.tsx > MCP-13 reabrir painel executa configuração persistida 336ms
 ✓ src/features/widgets/McpClient.test.tsx > MCP-14 filtro reexecuta apenas widget vinculado com o novo valor 1445ms
 ✓ src/features/widgets/McpClient.test.tsx > MCP-15 falha de uma fonte mantém outro widget disponível 139ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  19:09:44
   Duration  9.41s (tests 56%, import 22%, environment 12%, setup 5%, transform 5%)

$ vitest run --reporter=verbose "McpClient.test.tsx"
stderr | src/features/widgets/McpClient.test.tsx > MCP-11 prévia de gráfico sinaliza que o resultado é parcial
The width(0) and height(0) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width.
```
