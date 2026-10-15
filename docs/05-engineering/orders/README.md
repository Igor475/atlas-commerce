# ORD-01 — Fundação local de preparação de pedidos

**15/10/2026 · TEST_ONLY · 36 casos ORD aprovados localmente · sem checkout comercial.**

Baseline: `bd3740719bc5b13c5fe1fe7d1eb4bd6904d55fca`. O agregado comercial
Order permanece bloqueado por RN-032; esta entrega persiste uma intenção técnica
separada, sem estado financeiro nem total final de checkout.

- [Escopo e fronteiras](ORD-01-escopo-e-fronteiras.md)
- [Snapshots e invariantes](ORD-02-snapshots-e-invariantes.md)
- [Atomicidade e idempotência](ORD-03-atomicidade-e-idempotencia.md)
- [Matriz de testes](ORD-04-matriz-de-testes.md)
- [Handoff, evidências e pendências](ORD-05-handoff-e-pendencias.md)

Execução: `pnpm --filter @atlas/api orders:test`. O harness fixa banco, porta,
roles, markers e imagem PostgreSQL 17 descartável. Não aceita URL externa,
não lê dotenv e limpa apenas seu projeto UUID e seu volume.

L1-SQL permanece **PENDENTE**. UXD-16 continua ratificada; Stripe 40/30/5 e
compatibilidade SDK/API continuam **NÃO HOMOLOGADOS**. Não há SQL remoto,
pagamento, endpoint Orders/checkout, frontend ou deploy nesta entrega.

Lint, typecheck, unitários, build, smoke, auditoria e regressões passaram no delta
local. O gate global de formatação continua bloqueado pelos 32 arquivos CRLF
históricos do checkout principal. CI remoto ORD-01 ainda não executado.
