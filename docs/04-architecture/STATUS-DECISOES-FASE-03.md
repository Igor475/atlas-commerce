# Fase 03 — Estado consolidado das decisões arquiteturais (v0.5)

> **Data:** 12/10/2026 • **Escopo:** documentação e escolhas para portfólio pessoal não comercial. **Diretrizes aprovadas** conforme APP-01–19, Render Free, Supabase Free, Vercel Hobby, R2 Free e Stripe Test Mode. **Nenhuma execução, homologação de produção ou teste é afirmado neste quadro.**

| ADR | Direção/fornecedor aprovado | Detalhes e evidências ainda pendentes |
|---|---|---|
| [ADR-001](adrs/ADR-001-monolito-modular.md) | NestJS monólito modular + Next.js | Fronteiras e separação física das interfaces |
| [ADR-002](adrs/ADR-002-integridade-outbox.md) | PostgreSQL autoridade transacional, inbox/outbox idempotentes | Locks, lease, retry e recuperação DB/JOB |
| [ADR-003](adrs/ADR-003-autenticacao-sessoes.md) | Sessões opacas, TTL inicial 12h/30m cliente e 8h/15m staff, MFA WebAuthn/TOTP | Domínios Vercel/Render, CSRF, Bootstrap, recovery, AUTH-001–020 |
| [ADR-004](adrs/ADR-004-psp-sandbox.md) | Stripe Checkout hospedado test mode | 40/30/5, webhook/assinatura, refunds e ST-001–016 |
| [ADR-005](adrs/ADR-005-midia-e-storage.md) | Cloudflare R2 Free Tier Standard e objetos privados por entitlement | Buckets, licença, URLs assinadas, inspeção, R2-001–012 |
| [ADR-006](adrs/ADR-006-acesso-dados.md) | PostgreSQL Supabase; Prisma v7 preferencial + SQL parametrizado | Adapter/driver/pool, transação com locking, DB-001–028 |
| [ADR-007](adrs/ADR-007-worker-e-jobs.md) | Outbox/inbox duráveis; executor condicional | Scheduler/worker **não homologado**; JOB-001–018, operação sob suspensão dos serviços Free |
| [ADR-008](adrs/ADR-008-controles-operacionais.md) | Vercel Hobby + Render Free + Supabase Free + R2 Free | Backup/export/restore, monitoração, TLS, segredos, ASVS |
| [ADR-009](adrs/ADR-009-selecao-render.md) | **Render Web Service Free**, demo sem SLA | Cold start, env, health, RENDER-001–016 |
| [ADR-010](adrs/ADR-010-postgresql-supabase.md) | **Supabase PostgreSQL Free** | 500 MB, pausing, roles/Data API/RLS, TLS, pooler e SUPABASE-001–016 |

## Regras de interpretação

**Aprovado** significa direção escolhida pelo responsável. **Condicionado** significa validação/decisão específica ainda necessária. **Não homologado** significa ausência de evidência real, independentemente da aprovação documental. Todos os arquivos com status históricos anteriores devem ser lidos junto à [baseline APP-01–19](BASELINE-ARQUITETURAL-APROVADA-v0.1.md) e à [consolidação v0.5](CONSOLIDACAO-FINAL-FASE-03-v0.5.md).

**Não autorizados:** cobranças reais Stripe, uso comercial do Vercel Hobby, promessa de jobs pontuais em Render Free ou PITR/backups gerenciados no Supabase Free. O cliente não acessa segredos, tabelas transacionais nem conteúdo digital privado sem autorização. Preservar BRD RN-001–094, políticas PC-01–04, SEC-001–038, SA-001–012 e todos os CA.

## Entrada da Fase 04

[Handoff Fase 04](HANDOFF-FASE-04.md) permite preparar o monorepo, toolchain, contratos, testes e *spikes controlados* com prompts específicos para Codex. Implementações transacionais críticas só avançam ao satisfazer seus gates: [Stripe](07-validacao-stripe.md), [dados](database/DB-05-plano-de-validacao.md), [autenticação](09-cenarios-aceite-autenticacao.md), [infra](VALIDACAO-VERCEL-R2-JOBS.md), [segurança](../07-security/security-requirements.md).
