# Fundação e Autenticação Context

**Gathered:** 2026-11-16
**Spec:** `.specs/features/fundacao-auth/spec.md`
**Status:** Perguntas abertas na spec; ainda não pronto para o Design

---

## Feature Boundary

Ambiente em um comando, primeiro Admin, login, papéis globais, gestão de usuários, shell com a marca e a paleta do NinBI, página "Configurações" e tema dark/light. Dashboards, grupos da sidebar, equipes e compartilhamento são de outras features.

---

## Implementation Decisions

### Itens da sidebar e administração

- A sidebar mostra os dashboards e grupos do usuário e um item "Configurações". Usuário: "Um item 'Configurações' só" - um único item abre uma página com Conexões, Usuários e LLM em abas. (AD-013, AD-016)
- Nesta feature a sidebar nasce vazia, só com "Configurações", e a página tem só a aba "Usuários".

### Papéis globais

- Usuário: "Editor cria; Visualizador só recebe" - o Admin gerencia a instalação; o Editor cria os próprios dashboards e usa a IA; o Visualizador não cria nada e só vê o que compartilharem com ele. (AD-015)
- Usuário: "Vê e edita tudo" - o Admin abre e edita qualquer dashboard da instalação. (AD-015)
- Isto substitui a matriz recomendada na primeira versão da spec (Editor editando qualquer dashboard, Visualizador vendo todos).

### Marca

- Usuário, ao enviar o arquivo `brand/ninbi-logo.jpg`: "essa é a logo."
- Uso na interface: "Símbolo recortado + 'NinBI' em texto" - a estrela é recortada da imagem para a sidebar e o favicon; "NinBI" é texto real, "Nin" na cor do texto e "BI" em ciano, em dark e light. (AD-017)
- Subtítulo "BUSINESS INTELLIGENCE & AI": "Em lugar nenhum". (AD-017)

### Paleta

- Usuário: "Paleta da logo" - mantém o layout da referência LittleBee (sidebar, cards, raios, tipografia) e troca o verde-limão pelo gradiente roxo → ciano da logo, sobre fundo quase preto. Vale para o tema light e para os gráficos. (AD-018)

### Agent's Discretion

Nenhuma área foi delegada.

### Declined / Undiscussed Gray Areas → Assumptions

Sem recusas. Os defaults ainda não confirmados estão na tabela de Assumptions da spec com `n`: valores exatos das cores, uso do ciano onde o gradiente não cabe, símbolo no tema claro, logo nas telas de login, abas de "Configurações" nesta feature.

---

## Specific References

- `captures/littlebee-dashboard.webp` - vincula o layout do shell.
- `captures/ninbi-logo.jpg` - vincula o símbolo e a paleta.

---

## Deferred Ideas

- Um arquivo da logo com fundo transparente ou em vetor melhoraria o recorte do símbolo, sobretudo no tema claro.
