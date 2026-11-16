# Compartilhamento Context

**Gathered:** 2026-11-16
**Spec:** `.specs/features/compartilhamento/spec.md`
**Status:** Perguntas abertas na spec; ainda não pronto para o Design

---

## Feature Boundary

Equipes criadas pelo Admin, a tela de compartilhar um dashboard e a regra de permissão por dashboard ("pode ver", "pode editar") aplicada a quem recebe. Não inclui link público, transferência de posse nem notificações.

---

## Implementation Decisions

### Visibilidade

- Usuário: "Privado, com compartilhamento" - o dashboard é do criador e só ele vê, até compartilhar. (AD-014)

### Com quem compartilhar

- Usuário: "Usuários, todos e equipes" - pessoas específicas, "todos da instalação" e equipes criadas pelo Admin (ex.: "Comercial"). (AD-014)

### Permissão

- Usuário: "Ver ou editar, por pessoa" - em cada compartilhamento o dono escolhe "pode ver" ou "pode editar". (AD-014)

### Papéis

- Usuário: "Editor cria; Visualizador só recebe". (AD-015)
- Usuário, sobre o Admin: "Vê e edita tudo". (AD-015)

### Agent's Discretion

Nenhuma área foi delegada.

### Declined / Undiscussed Gray Areas → Assumptions

Sem recusas. Defaults com `n` na spec: equipes na aba "Usuários"; vale a permissão mais alta; "todos" inclui usuários futuros; o compartilhamento vale na hora; excluir equipe apaga os compartilhamentos dela; o que "pode editar" permite; dono desativado mantém o dashboard.

---

## Specific References

- Exemplo de equipe dado pelo usuário: "Comercial".

---

## Deferred Ideas

- Transferir a posse de um dashboard.
- Avisar a pessoa quando algo é compartilhado com ela.
