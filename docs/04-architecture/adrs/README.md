# Registro de Decisões Arquiteturais — Fase 03 (consolidado v0.5)

> **Data:** 12/10/2026. **Direções aprovadas pelo responsável** conforme [APP-01–19](../BASELINE-ARQUITETURAL-APROVADA-v0.1.md), com ratificações posteriores de Render Free, Supabase Free, Vercel Hobby e R2 Free. **Nenhuma implementação, homologação técnica ou evidência de testes resulta da aprovação documental.**

| ADR | Direção aprovada | Evidência/decisão ainda pendente |
|---|---|---|
| [ADR-001](ADR-001-monolito-modular.md) | Monólito modular NestJS e interfaces Next.js | Mapa físico e testes de fronteira |
| [ADR-002](ADR-002-integridade-outbox.md) | PostgreSQL, outbox/inbox duráveis, sem side effect externo em TX | Leases, ordenação, retries e DB/JOB |
| [ADR-003](ADR-003-autenticacao-sessoes.md) | Sessão opaca revogável, cookies protegidos, MFA staff passkeys/TOTP, TTLs iniciais | Proxy/domínios, CSRF, recovery, bootstrap e AUTH |
| [ADR-004](ADR-004-psp-sandbox.md) | Stripe Checkout incorporado em Test Mode, [adendo 13/10](ADR-004-ADENDO-UI-EMBEDDED.md) (cartões elegíveis inicialmente) | Janela 40/30/5, webhook, refunds, testes ST |
| [ADR-005](ADR-005-midia-e-storage.md) | Cloudflare R2 Free Tier Standard; público/privado segregados, acesso por entitlement | Buckets, licenças, uploads, assinaturas, quotas, testes R2 |
| [ADR-006](ADR-006-acesso-dados.md) | PostgreSQL gerenciado Supabase, Prisma v7 como preferência, SQL parametrizado na mesma TX | Adapter, locks, migrations, pool, testes DB-001–028 |
| [ADR-007](ADR-007-worker-e-jobs.md) | Outbox persistente, jobs recuperáveis; worker/cron independente quando viável | **Render Free dorme**; Supabase Cron é hipótese, não executor homologado; testes JOB |
| [ADR-008](ADR-008-controles-operacionais.md) | Vercel Hobby, Render Free, Supabase Free, R2 Free; controles operacionais propostos | Segurança real, LGPD, backups/restore, alertas, SLO e orçamento |
| [ADR-009](ADR-009-selecao-render.md) | Render Web Service **Free** para backend demonstrativo | Cold start, TLS/cookies, conectividade, logs, RENDER-001–016 |
| [ADR-010](ADR-010-postgresql-supabase.md) | Supabase PostgreSQL **Free** para banco demonstrativo | Pausing, Data API/RLS, migrations, backup/restore, SUPABASE-001–016 |

## Proposta posterior — 14/10/2026

- [ADR-011 — L1 estrita e diagnóstico mediado](ADR-011-diagnostico-mediado-e-politica-l1.md): **PROPOSTA**, ratificação pendente; não integra a lista de direções aprovadas acima. L1-SQL **PENDENTE**; MRD em especificação, não implementada. [Contrato e matriz MRD-001–016](../../05-engineering/integrations/INT-02-2-diagnostico-mediado-proposta.md), sem testes executados. Data API desligada conforme relato do responsável, sem confirmação independente.

## Significado do status

- **Direção aprovada:** decisão expressa que orienta o futuro prompt Codex; não autoriza substituições silenciosas.
- **Detalhe aberto:** configuração concreta, campo/limite, orçamento ou regra sujeita a aprovação ou experimento.
- **Não homologado:** testes e evidências de operação ausentes. Os dados de quotas da documentação pública não substituem a inspeção da conta/projeto.
- **Aprovação comercial/produção:** **NÃO concedida**. Vercel Hobby só comporta projeto pessoal não comercial; fluxos de Stripe permanecem em modo teste.

## Evidências e governança

[Consolidação final da Fase 03](../CONSOLIDACAO-FINAL-FASE-03-v0.5.md) · [status detalhado ADR](../STATUS-ADR-APROVACAO-2026-10-12.md) · [gates](../VALIDACOES-E-PARAMETROS-PENDENTES.md) · [handoff Fase 04](../HANDOFF-FASE-04.md).

Cada ADR conserva seu contexto e alternativas históricas. Provas e casos seguem seus planos [CA/SA](../../03-business-processes/POLITICAS-CONSOLIDADAS.md), [AUTH](../09-cenarios-aceite-autenticacao.md), [DB](../database/DB-05-plano-de-validacao.md), [ST](../07-validacao-stripe.md) e [infraestrutura](../VALIDACAO-VERCEL-R2-JOBS.md). Nenhuma suite foi executada por este pacote.

## Ratificação posterior — 15/10/2026 (ADR-QTE)

- [ADR-012 — Cotação, entrega e endereços](ADR-012-politicas-cotacao-entrega-enderecos.md):
  QTE-DEC-002/003/004/005/006/010 ratificados nos limites expressos; Estratégia A,
  Customer Profile e TTL comercial de dez minutos. Parâmetros comerciais e
  detalhes estruturais pendentes; QTE-DEC-008/009 BLOQUEADOS. Sem implementação
  ou homologação de L1/Stripe/40/30/5; registros anteriores preservados.
