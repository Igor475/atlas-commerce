# QTE-01 — Cotações locais de checkout

**15/10/2026 · TEST_ONLY · 30 casos QTE aprovados localmente · sem API pública.**

Baseline `827fc6b9be74d088cb22e35e24730b7ef0b24310`, main inicialmente limpa.
CI histórico [38786260932](https://github.com/Igor475/atlas-commerce/actions/runs/38786260932)
confirmado completed/success, oito jobs aprovados. Isso não aprova o delta QTE.
CT-CAT-400 está publicado no baseline e foi preservado.

- [Escopo e fronteiras](QTE-01-escopo-e-fronteiras.md)
- [Modelo persistente e cálculo](QTE-02-modelo-e-calculo.md)
- [Entrega e validade](QTE-03-entrega-e-tempo.md)
- [Matriz QTE-001–030](QTE-04-matriz-de-testes.md)
- [Handoff e pendências](QTE-05-handoff-e-pendencias.md)

Reprodução: `pnpm --filter @atlas/api quotes:test`. O harness usa somente
PostgreSQL 17 descartável, destino fixo em loopback, markers, roles segregadas
e limpeza de seu projeto UUID. Não recebe URL remota ou secrets de provedores.

Cotação não reserva estoque, não é pedido nem prova de pagamento. Quotes e
Orders continuam TEST_ONLY, fora do AppModule. L1-SQL estrito PENDENTE;
Stripe/Payments e política 40/30/5 NÃO HOMOLOGADOS.

Lint, typecheck, unitários, build, smoke, auditoria e regressões passaram.
Formatação direcionada PASS; gate global bloqueado por 32 arquivos CRLF
históricos intactos. CI remoto QTE ainda não executado.

## Ratificação documental posterior — 15/10/2026

[ADR-012 / ADR-QTE](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md)
ratifica seis decisões QTE-02, incluindo Estratégia A; ver a
[matriz atualizada](QTE-POL-05-fluxo-e-matriz-de-decisoes.md) e o
[delta candidato não aplicado](QTE-POL-06-delta-openapi-candidato.md).
Parâmetros e detalhes contratuais continuam pendentes. QTE-01 permanece TEST_ONLY;
este registro não reescreve as evidências históricas acima nem homologa checkout.
