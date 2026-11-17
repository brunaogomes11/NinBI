# Fontes SQL Context

**Gathered:** 2026-11-16
**Spec:** `.specs/features/fontes-sql/spec.md`
**Status:** Ready for review

---

## Feature Boundary

Conectar o NinBI direto a PostgreSQL, MySQL e SQL Server, ao lado do Neo4j: cadastro, execução de SQL somente leitura, schema e IA no dialeto do banco (AD-135).

---

## Implementation Decisions

### Quais bancos

- PostgreSQL, MySQL e SQL Server. Usuário: "o plano é começar com mysql, postgres, sql server".

### Endereço da conexão

- Seletor de tipo; host e porta em campos separados para os bancos SQL (AD-136). Usuário escolheu "Tipo + host + porta" em vez de URI com esquema.

### SSL

- Caixa "Usar SSL", desmarcada por padrão; marcada, criptografa e valida o certificado (AD-136). Usuário escolheu "Caixa 'Usar SSL'".

### Agent's Discretion

Tudo o que a tabela Assumptions da spec marca com `n`: o tipo Neo4j manter o campo URI, portas, versões, forma de impor a leitura, prazos, regra de parâmetros, exemplos do schema, mapeamento de valores.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma recusada. As não discutidas estão na tabela Assumptions da spec.

---

## Specific References

O banco do usuário é o Postgres do Sortify (`sortifyteams`), acessado por host e porta públicos.

---

## Deferred Ideas

- Ajustar a spec de `ia-dashboard` para falar de "consulta" no lugar de Cypher.
- Aceitar certificado autoassinado por conexão.
- Escolher quais schemas do banco ler.
