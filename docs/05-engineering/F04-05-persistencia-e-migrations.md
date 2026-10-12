# F04-05 — Persistência, migrations e transações críticas

> **Direção aceita:** Supabase PostgreSQL Free, Prisma ORM v7 preferencial com adapter PostgreSQL; SQL parametrizado restrito a operações que o justifiquem. **Nenhuma migration, schema ou conexão está implementada por este documento.**

## Contrato proposto para o Codex

1. Usar interfaces/repositories por domínio (F04-02); Prisma não atravessa a fronteira pública dos módulos. Não expor models Prisma ao Next.js nem acesso SQL direto no browser.
2. Negócios monetários usam inteiros em centavos BRL; constraints e chaves únicas protegem valores/relacionamentos; migração deve implementar invariantes verificáveis, não depender só de `if` no TypeScript.
3. Transações críticas em **uma única conexão/transação**, inclusive SQL raw parametrizado: reserva/allocation, uso do cupom, snapshot, refund e outbox. Nunca manter lock durante Stripe, e-mail ou R2.
4. Ordenar SKUs antes de bloqueá-los. Em espera por lock, avaliar prazo com relógio do DB **após** adquirir lock (não `now()` de transação longa); falha/timeout não confirma reserva vencida.
5. Estados terminais não retrocedem. `on_hand >= allocated + reserved_active`; payout/refund não devolve estoque sem inspeção física; kit misto exige alocação física integral para direito digital.
6. Acesso `Supabase` via TLS, session pooler quando adequado e após prova, pool pequeno medido. Runtime e usuário de migração segregados. Não assumir `Supabase Auth` ou REST/Data API como backend de recursos privados.
7. Tabelas expostas por engano ao Data API devem ser protegidas por RLS/grants mínimos; preferir schemas privados ou Data API desabilitada conforme topologia testada; privilégios runtime mínimos.
8. Migrations versionadas, aditivas/expand-contract quando necessário; reprodutíveis em DB efêmero isolado, backup/export e restore ensaiado. Não rodar migração em projeto real a pedido implícito de bootstrap.
9. Cold starts da Render Free e pausa Supabase Free devem gerar falha recuperável, sem perda de idempotência nem leitura enganosa de sucesso.

## Matriz transacional

| Caso | Invariante e prova | Gate |
|---|---|---|
| Compra última unidade | só um checkout confirma reserva | DB-001, CA-001 |
| Kit físico/misto | agregação por SKU, tudo ou nada | DB-003/004, CA-022/024 |
| Reserva versus expiração | lock e hora DB, apenas um terminal | DB-005–008 |
| Dedup de evento Stripe | mesmo evento sem efeito adicional | DB-012/013, ST-008 |
| Refund concorrente | valor capturado menos devolvido e pending reservado | DB-014–017, SA-008 |
| Outbox | commit preserva evento após crash | DB-018–021, JOB-005 |
| Sessão/recovery | revogação e consumo único | DB-024/025, AUTH-007/010 |
| Restore | esquema/ledger/entitlement íntegros | DB-028, SUPABASE-012/013 |

**Não executar `prisma migrate deploy`, seed com usuários/segredos previsíveis, ou instruções SQL num banco Supabase conectado sem escopo e aprovação.** O futuro spike deve congelar versões e demonstrar uso do driver adapter na versão escolhida. Referências: [ADR-006](../04-architecture/adrs/ADR-006-acesso-dados.md), [DB-03](../04-architecture/database/DB-03-migrations-e-recuperacao.md), [ADR-010](../04-architecture/adrs/ADR-010-postgresql-supabase.md).
