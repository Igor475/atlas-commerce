# CP-02 — Integração transacional TEST_ONLY

Profile, Quotes, Orders e Inventory compartilham PostgreSQL 17 descartável na preparação técnica. A emissão da quote continua anterior e não reserva estoque. Não existe checkout público, pedido comercial definitivo ou integração cloud neste pacote.

- [Escopo e diagnóstico](CPINT-01-escopo.md)
- [Atomicidade, locks e recuperação](CPINT-02-atomicidade-e-locks.md)
- [Grants e migrations](CPINT-03-grants-e-migrations.md)
- [Matriz CPINT-001–036](CPINT-04-matriz-de-testes.md)
- [Handoff, resultados e pendências](CPINT-05-handoff.md)

Referências preservadas: [CP-01](../customer-profile/README.md), [código da integração](../../../apps/api/src/modules/customer-profile/application/profile-order-integration.ts) e [suíte real](../../../apps/api/test/profile-integration/profile-orders.integration.ts).

Baseline: `c0bae4f9f8bebad02394d58d92be39c68dd0bd2b`, branch `main`. O [CI de referência](https://github.com/Igor475/atlas-commerce/actions/runs/38897247489) foi verificado como `completed/success` nesse SHA; não cobre o delta CP-02 ainda não publicado.
