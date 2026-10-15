# INV-01 — Estoque, ledger e reservas locais

Implementação e provas somente em PostgreSQL 17 descartável. Nenhum endpoint,
cron, Orders, Payments ou provedor remoto habilitado. L1_SQL_STRICT PENDENTE;
política Stripe 40/30/5 NÃO HOMOLOGADA; UXD-16 preservada.

- [Escopo e fronteiras](INV-01-escopo-e-fronteiras.md).
- [Modelo e permissões](INV-02-modelo-ledger-e-reservas.md).
- [Concorrência e transições](INV-03-concorrencia-e-transicoes.md).
- [Matriz INV-001–036](INV-04-matriz-de-testes.md).
- [Handoff e pendências](INV-05-handoff-e-pendencias.md).
- [Resultados executados](../../../apps/api/test/inventory/RESULTS.md).

Baseline `d6b1b4c4744e81afb9a327f2b2b115f9b5956c28`, main limpa inicialmente.
[CI do baseline](https://github.com/Igor475/atlas-commerce/actions/runs/38753311355)
confirmado completed/success; não é evidência do delta Inventory não publicado.
Comando dedicado: `pnpm --filter @atlas/api inventory:test`.

Referências superiores, sem alteração: [DB-02](../../04-architecture/database/DB-02-invariantes-e-locking.md),
[PC-01/04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md),
[SM-03](../../03-business-processes/state-machines/SM-03-reserva-de-estoque.md),
[ADR-002](../../04-architecture/adrs/ADR-002-integridade-outbox.md),
[ADR-006](../../04-architecture/adrs/ADR-006-acesso-dados.md) e
[DS-003](../../04-architecture/security/authorization-matrix.md).
