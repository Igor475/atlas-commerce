# PRIC-01 — Preço-base público local

Baseline `1727a3820829ba319b7ddfd66165a388618552d5`, main inicialmente limpa,
15/10/2026. Pricing fornece preços **persistidos** para Catalog exclusivamente
mediante opt-in na fixture PostgreSQL17 descartável. Não é preço final de checkout,
integração remota ou homologação pública. L1_SQL_STRICT permanece PENDENTE.

- [Escopo, diagnóstico e fronteiras](PRIC-01-escopo-e-fronteiras.md).
- [Modelo, dinheiro, vigência e concorrência](PRIC-02-modelo-e-invariantes.md).
- [Matriz PRIC-001–030](PRIC-03-matriz-de-testes.md).
- [Handoff e proposta HTTP400 separada](PRIC-04-handoff-e-pendencias.md).
- [Testes reais](../../../apps/api/test/pricing/pricing.integration.ts) e
  [resultados/evidências](../../../apps/api/test/pricing/RESULTS.md).

Default continua fechado: sem opt-in Pricing, Catalog retorna503 nas operações
dependentes de preço. Não há preço de fallback, nova rota, prévia homologada,
promoção, gratuidade aprovada ou consulta a fornecedor remoto.
