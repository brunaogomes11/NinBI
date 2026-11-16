# Dashboards e Consultas Context

**Gathered:** 2026-11-16
**Spec:** `.specs/features/dashboards-consultas/spec.md`
**Status:** Perguntas abertas na spec; ainda não pronto para o Design

---

## Feature Boundary

Dashboards privados com abas e grade, a sidebar que cada usuário organiza em grupos, o editor de Cypher, a execução somente leitura e o widget de tabela. Compartilhar um dashboard é da feature `compartilhamento`.

---

## Implementation Decisions

### Sidebar

- Usuário: "O usuário poderá separar na sidebar seus dashboards. Por exemplo, ele quer um dashboard do 'Comercial', um da 'Logística', um 'Pessoal'. Ele vai ser responsável pela organização da sidebar e de cada item de dentro do dashboard."
- Itens da sidebar: "Os dois" - dashboards soltos e, opcionalmente, grupos (seções recolhíveis) que contêm dashboards. As abas continuam dentro de cada dashboard. (AD-013)
- De quem é a organização: "De cada usuário" - cada pessoa ordena e agrupa a própria sidebar; não afeta a dos outros. (AD-013)

### Posse e visibilidade

- Usuário: "Privado, com compartilhamento" - o dashboard é do criador e só ele vê, até compartilhar. Substitui o default anterior, em que todo usuário logado via todos os dashboards. (AD-014)
- Usuário: "Editor cria; Visualizador só recebe" e, sobre o Admin, "Vê e edita tudo". (AD-015)

### Agent's Discretion

Nenhuma área foi delegada.

### Declined / Undiscussed Gray Areas → Assumptions

Sem recusas. Defaults com `n` na spec: organização guardada no PostgreSQL por usuário; todos os papéis organizam a própria sidebar; grupos de um nível; mesmo ícone para todo dashboard; dashboard sem acesso responde "Dashboard não encontrado"; dashboards de usuário desativado continuam existindo.

---

## Specific References

- Exemplos de grupo dados pelo usuário: "Comercial", "Logística", "Pessoal".

---

## Deferred Ideas

- Transferir a posse de um dashboard.
- Grupos dentro de grupos.
