# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Ao validar texto de consulta, leia a lexica do dialeto de verdade (comentario #, escape barra invertida, dollar-quoting): um tokenizador unico deixa o texto de uma instrucao parecer string ou comentario.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `sql-validator` · harmful: 0
- features: fontes-sql
- evidence: F1 C28 C31 (sql-validator)
- last seen: 2026-11-17T13:12:11Z

### L-002 - Uma regra de recusa com excecao (palavra depois de ponto, trim antes de recusar espaco) precisa estar na spec; senao o teste consagra o desvio e o Verifier acha.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: fontes-sql
- evidence: F2 C30 F5 C9 (validation)
- last seen: 2026-11-17T13:12:12Z

### L-003 - O teste que o Proof seleciona deve afirmar o valor do criterio inteiro (padrao de 10 s, editor na tela, schema preservado, rota de gravar), nao um irmao nao selecionado.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: fontes-sql
- evidence: F6 F7 F8 F9 C8 C60 C75 C76 C66 (tests)
- last seen: 2026-11-17T13:12:12Z

### L-004 - Ao ler valor por nome de um objeto simples, use Object.hasOwn: nomes como constructor e toString herdam funcoes de Object.prototype.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `params` · harmful: 0
- features: fontes-sql
- evidence: F10 C39 (params)
- last seen: 2026-11-17T13:12:12Z

### L-005 - Confirme na fase de design o que cada driver oferece (decimal como texto, rollback ao parar leitura); limite de driver vira linha de Assumptions e AD, nao so comentario no codigo.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `drivers` · harmful: 0
- features: fontes-sql
- evidence: F3 F4 C44 C25 (drivers)
- last seen: 2026-11-17T13:12:12Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
