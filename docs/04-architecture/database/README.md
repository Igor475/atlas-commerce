# ADR-006 — Pacote de arquitetura de dados (v0.4)

> **Natureza:** modelo lógico **proposto**, não schema SQL/Prisma, não migrations, não código. A fonte normativa são BRD, PC-01–04, tabelas de transição e SEC.

| Documento | Foco |
|---|---|
| [DB-01](DB-01-modelo-logico.md) | Entidades, chaves, propriedade dos agregados e snapshots |
| [DB-02](DB-02-invariantes-e-locking.md) | Estoque, refunds, idempotência, tempo, concorrência e filas |
| [DB-03](DB-03-migrations-e-recuperacao.md) | Expand-contract, rollback/roll-forward, backup, restore, privilégios |
| [DB-04](DB-04-orm-drivers-pool.md) | Prisma/Drizzle/driver e avaliação do pool PostgreSQL |
| [DB-05](DB-05-plano-de-validacao.md) | Cenários DB-001–028, evidências e aceitação |
| [ER-01](ER-01-catalogo-pedidos-estoque.md) | Catálogo, preço, pedido e estoque |
| [ER-02](ER-02-pagamentos-reembolsos.md) | Checkout Stripe, inbox/outbox, captura e refund |
| [ER-03](ER-03-identidade-biblioteca.md) | Sessões, licenças, direito digital, mídia e auditoria |
| [SEQ-05](../sequences/SEQ-05-checkout-reserva-expiracao.md) | Corrida checkout/reserva/expiração |
| [SEQ-06](../sequences/SEQ-06-refund-concorrente.md) | Refunds concorrentes e reconciliação |

## Convenções

- IDs das tabelas/colunas em ERD são **conceituais**; não obrigam nomes de migration.
- Setas indicam dependência de referência, **não** FK existente.
- `*Snapshot` é histórico imutável após aceite da compra.
- Controle transacional com outbox/inbox não presume entrega exactly-once do broker.
- Produtos digitais avulsos não consomem estoque; kits mistos exigem alocação física confirmada antes da concessão digital.
- As regras `RN-071–094`, `SEC-001–038`, `SA-001–012` e cenários CA não foram alterados.

**Estado atual:** tudo a projetar/provar na fase de código e nos spikes autorizados. Preserve escolhas e links das outras ADRs.
