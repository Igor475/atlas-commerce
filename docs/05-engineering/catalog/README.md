# CAT-01 — Backend de catálogo editorial, validação local

Baseline `af091a1bad9ef4c2b360b90fb6701125efc4349e`, main inicialmente limpa,
15/10/2026. Implementação autorizada **somente em PostgreSQL 17 descartável**.
Não representa catálogo implantado, elegibilidade de compra ou homologação pública.

- [Escopo, diagnóstico e fronteiras](CAT-01-escopo-e-fronteiras.md).
- [Modelo, publicação, constraints e persistência](CAT-02-modelo-e-invariantes.md).
- [Matriz CAT-001–030 e resultados](CAT-03-matriz-de-testes.md).
- [Pendências, divergências contratuais e handoff](CAT-04-pendencias-e-handoff.md).
- [Suíte real HTTP/PostgreSQL](../../../apps/api/test/catalog/catalog.integration.ts).
- [Resultados e evidências locais](../../../apps/api/test/catalog/RESULTS.md).

As duas rotas públicas são GET `/api/v1/catalog/products` e GET
`/api/v1/catalog/products/{productId}`. Banco desativado por padrão; Pricing real
ausente resulta em `503 DEPENDENCY_UNAVAILABLE`, nunca preço fictício, omitido,
zero de fallback ou null. Fixtures fictícias e adapter Pricing existem só nos testes.
`previewAvailable=false`; mídia integral e prévias R2 não foram implementadas.

**L1_SQL_STRICT PENDENTE.** MRD é trilha independente e não foi alterada.
Supabase remoto, Identity/Resend, normas de negócio, pagamentos e frontend intactos.
Sem commit, push, deploy ou autorização implícita para o próximo módulo.
