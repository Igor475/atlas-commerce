# CP-01 — Fundação local de Customer Profile

**16/10/2026 · TEST_ONLY · composição pública desativada.**
Baseline `c5c1cd4ab2a7b528640c8084e18de9ff61c1d744`, main inicialmente limpa;
[CI de referência](https://github.com/Igor475/atlas-commerce/actions/runs/38890850956)
consultado: completed/success para esse SHA, não para o delta CP-01.

- [Escopo e fronteiras](CP-01-escopo-e-fronteiras.md).
- [Modelo e versionamento](CP-02-modelo-e-versionamento.md).
- [Segurança e privacidade](CP-03-seguranca-e-privacidade.md).
- [Concorrência e ports](CP-04-concorrencia-e-ports.md).
- [Matriz CP-001–036](CP-05-matriz-de-testes.md).
- [Handoff e resultados](CP-06-handoff-e-pendencias.md).

Execução: `pnpm --filter @atlas/api profile:test`. PostgreSQL 17 fixado por digest,
Docker local, projeto UUID/volume próprios, porta loopback 55441 e lock exclusivo.
Não aceita destino remoto, secrets de provedor ou CLI Supabase. Migration isolada
em `prisma-profile`; não há migration no startup nem `db push`.

Não representa cadastro/endereço comercial público, prova postal, frete, checkout,
retenção legal ou conformidade LGPD. L1_SQL_STRICT PENDENTE; Stripe e política
40/30/5 NÃO HOMOLOGADOS; UXD-16 preservada.
