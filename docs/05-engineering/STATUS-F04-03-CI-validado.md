# F04-03 — CI no GitHub confirmado

> Data da verificação: 13/10/2026. Estado: **CI do bootstrap aprovado remotamente**, não homologação de deploy comercial.

- Repo `Igor475/atlas-commerce`, branch `main`, commit `2ad62b5c50d025fe2bbb89939b319dc9447d2d98`.
- GitHub Actions `Quality`, run [38391471396](https://github.com/Igor475/atlas-commerce/actions/runs/38391471396): `completed` / `success`.
- Execução anterior [38328074578](https://github.com/Igor475/atlas-commerce/actions/runs/38328074578): `failure` em `Setup Node.js` devido a pnpm ausente durante descoberta de cache.
- Correção registrada: configuração explícita para desativar `package-manager-cache` no setup de Node; testes locais relatados pelo Codex e pipeline remoto já distinguiram-se.
- **Não comprovados por este registro:** PostgreSQL/Supabase, migrations, autenticação, integrações Stripe/R2, deploy Render/Vercel, processamento de jobs, design premium ou testes sob carga.

**Avanço permitido:** spike isolado PostgreSQL + Prisma para avaliar ADR-006, seguindo [ETAPA-F04-04](ETAPA-F04-04-spike-postgresql-prisma.md) e [gates](F04-04-gates-de-validacao.md).
