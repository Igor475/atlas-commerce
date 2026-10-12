# Fase 03 — Decisões posteriores: Vercel, R2 Free Tier e jobs

> **Data:** 12/10/2026 • **Registro aprovado pelo responsável**: frontend **Vercel** e armazenamento de objetos **Cloudflare R2 na franquia gratuita Standard**. Render Web Service **Free** e fornecedor **Supabase PostgreSQL** permanecem confirmados. **Plano Supabase Free escolhido posteriormente; Vercel Hobby também confirmado**.

## Decisão e limites

| Área | Status | Consequência para a engenharia |
|---|---|---|
| Vercel | **Hobby explicitamente aprovado** | `Next.js` storefront/backoffice; uso **pessoal não comercial**, sem checkout real; qualquer operação comercial exige rever elegibilidade/plano |
| Cloudflare R2 | **Free Tier Standard confirmado** | 10 GB-mês, 1M Class A, 10M Class B gratuitos/mês, egress R2 sem cobrança. **Não confundir cota com teto financeiro**; monitorar excesso |
| Render | **Free confirmado** | API pode adormecer; sem garantia de cron/worker 24×7. Não usar para cobrir exigência de expiração pontual de reserva |
| Supabase | **PostgreSQL Free aprovado** | Cota de 500 MB de DB, pausa por inatividade, ausência de backups diários gerenciados; export/restore independente e limites de pool a testar |
| Stripe | Test mode | Apenas pagamento de teste; política 40/30/5 e compensação exigem ST-001–016 |
| Jobs | **Outbox durável aceita** | Scheduler interno não é autoridade. Supabase Cron é candidato apenas após teste de disponibilidade, privilégio, comportamento e custos; reconciliação externa requer executor adequado |

## Recomendação de evolução sem quebrar o monólito

1. **Fase 03:** consolidar decisões, riscos e gates de infraestrutura, com [ADR-007](adrs/ADR-007-worker-e-jobs.md) e [ADR-005](adrs/ADR-005-midia-e-storage.md).
2. **Fase 04 / Codex:** bootstrap mínimo por módulos; spikes isolados Prisma+Supabase, sessão/origem Vercel↔Render, R2 privado e algoritmo PostgreSQL de reserva idempotente. Nenhum ambiente pago criado automaticamente.
3. **Demo:** outbox+processamento best effort, fluxo de reconciliação auditável sob retomada, botões/admin protegidos para reprocesso; evitar vender ou prometer 40min de execução exata.
4. **Antes de vendas reais:** aprovação de custos, executor sempre ativo, rotina de backups testada, domínios/cookies, verificações SA/AUTH/DB/ST/JOB/R2, observabilidade e revisão jurídica.

## Tratamento de contradições históricas

Arquivos anteriores que digam “storage a escolher” referem-se ao estado anterior à decisão APP-09 e deste registro. **R2 é fornecedor e Free Tier escolhidos**, mas buckets/segurança não foram criados. Arquivos anteriores que tratem Vercel como candidato agora devem dizer **provedor aprovado**, sem presumir Hobby contratado. Quanto a ADR-007, o padrão de persistência foi aprovado, mas a infraestrutura de execução segue **sem SLA**.

## Fontes (12/10/2026)

- https://developers.cloudflare.com/r2/pricing/
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://render.com/docs/free
- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/platform/free-project-pausing


## Adendo de ratificação 12/10/2026

Escolhas finalmente confirmadas: **Vercel Hobby** e **Supabase Free**. A escolha é para o **portfólio não comercial**, compatível com o uso Hobby. A franquia do Supabase Free não deve ser extrapolada a custos, backup ou disponibilidade de produção; banco pode pausar e seu limite de 500 MB pode bloquear escritas ao ultrapassá-lo. Os demais riscos da ADR-007 e os testes JOB-001–018 continuam pendentes.

Fonte de status mais recente: [Consolidação final Fase 03](CONSOLIDACAO-FINAL-FASE-03-v0.5.md). Nenhuma conta/plano foi inspecionada neste registro.
