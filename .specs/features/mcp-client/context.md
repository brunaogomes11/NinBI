# MCP Client Context

**Gathered** — 2026-11-20

**Spec** — [MCP Client Specification](spec.md)

**Status** — Piloto implementado e exercitado com dois servidores de teste.

## Feature Boundary

O piloto valida a criação manual de um dashboard NinBI com widgets alimentados por servidores MCP distintos.

## Implementation Decisions

### Fontes por dashboard

- Usuário — “O mesmo painel pode conter informações de diversos mcps”. Cada widget MCP tem sua própria conexão cadastrada no NinBI.

### Servidor de teste e autenticação

- Usuário — “quero testar um mcp server qualquer. Sobre autenticação, temos que deixar o mcp fazer a requisição pra autenticação, a gente só faz chamada”.
- Interpretação registrada — o servidor MCP autentica o acesso ao serviço de origem que sua ferramenta usa. Se o próprio endpoint MCP exigir login para aceitar a chamada, isso é uma etapa entre cliente e servidor MCP. O piloto pode usar um endpoint que já aceite as chamadas de teste.

### Criação e teste do painel

- Usuário — “eu testo manualmente”. O piloto prevê configurar, executar e salvar o widget pela interface.

### Formato da resposta tabular

- Usuário — “pode”, em resposta à opção de selecionar a lista retornada pela ferramenta.
- O Editor pode selecionar uma lista tipada declarada pelo servidor, como `chamados`, para alimentar o widget.
