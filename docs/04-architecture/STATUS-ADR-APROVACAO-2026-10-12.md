# Fase 03 — Status consolidado após Render Free e escolha do Supabase

> **Versão:** 0.5.0 • **Data:** 12/10/2026 • **Fonte:** aprovação explícita das 19 diretrizes APP-01–19 e decisão posterior Render/APP-13. **Nenhum código, teste ou deploy homologado.**

## Autoridade deste quadro

Este quadro é o **registro mais recente da aprovação de diretrizes**, complementar ao histórico individual de cada ADR. Termos antigos `PROPOSTA` nos arquivos originais descrevem o estado no momento da redação; a direção explicitamente aprovada está registrada aqui. **Não interpretar "direção aprovada" como "ADR integralmente concluída"** e não reduzir guardas de RN/PC/SEC por conflito de status.

| ADR | Direção aprovada pelo responsável | O que continua aberto ou exige ensaio |
|---|---|---|
| ADR-001 | Monólito modular NestJS e Next.js | Fronteiras, layout físico do monorepo e testes de arquitetura |
| ADR-002 | PostgreSQL, outbox/inbox transacionais, efeitos idempotentes | Locking, dispatcher, replay, observabilidade, provas DB |
| ADR-003 | Sessões opacas/cookie HttpOnly; cliente 12h/30m, staff 8h/15m; WebAuthn preferido e TOTP alternativo controlado | Topologia Vercel/Render, CSRF/cookie, fator/recovery, bootstrap admin, AUTH |
| ADR-004 | Stripe Checkout hospedado em modo teste e cartões elegíveis inicialmente | Política 40/30/5, assinatura, expiração, refund e ST; **não homologado** |
| ADR-005 | Cloudflare R2; prévias públicas/arquivo integral privado; uploads de imagens/PDF autorizados | Buckets/ambientes, limites, inspeção, licença, TTL e SA |
| ADR-006 | PostgreSQL + Prisma ORM v7 candidato prioritário e SQL parametrizado, fallback justificado | Spike de adapter/driver, pool, locks, migrações e DB-001–028 |
| ADR-007 | Outbox/job recuperáveis; worker separado condicional | Em Render: plano, executor cron/worker, custo e provas de restart/lease |
| ADR-008 | **Vercel Hobby**, **Render Free**, **Supabase Free** para portfólio não comercial; backups e observabilidade | Região/TLS, domínios/proxy, retenção, restore, pausing/limites e segurança ainda sem prova |
| **ADR-009** | **Render Web Service Free aprovado para demo inicial** | Pausa/restart, execução de jobs fora da API, e-mail HTTP, limites de rede e RENDER-001–016 |
| **ADR-010** | **Supabase PostgreSQL Free aprovado** | TLS/session pooler, Prisma adapter, credenciais, Data API, backup/export/restore e SUPABASE-001–016 pendentes |

## Decisões não resolvidas por uma confirmação simples

- **Plano Render:** **Free foi escolhido** para demo tolerante a suspensão; computação sempre ativa continua necessária para fluxo temporal/reconciliador confiável. O serviço Free não deve ser a única fonte de execução de jobs.
- **Banco gerenciado:** **Supabase escolhido**; plano Free/Pro ainda a confirmar, região, backup/export/restore, conectividade via Supavisor em modo de sessão e pool/credenciais a verificar.
- **Operação de tarefas:** Render Cron Job/Background Worker ou executor externo, com orçamento e frequência reais.
- **Stripe 40/30/5:** validar no test mode antes de declarar integração pronta; não mudar política silenciosamente.
- **Alçadas financeiras:** valores numéricos de aprovação não definidos. Segregação de identidades está aprovada.
- **LGPD, licenças e release real:** análise legal/fiscal, retenção, autorização de mídia, ASVS, backups/restore ainda condicionados.

## Próxima entrega orientada a Codex

1. **Consolidar documentalmente** as ADRs 001–010 e documentos de índice/BRD/SEC, preservando versões/IDs.
2. Preparar **Fase 04**: layout de monorepo e toolchain sem criar infraestrutura real; bootstrap Codex por escopos.
3. Autorizar pequenos spikes: PostgreSQL/Prisma, proxy de autenticação Vercel/Render e endpoints Render; nenhum deles deve declarar segurança/produção aprovadas.
4. Integrar Stripe/estoque só após evidências de idempotência, tempo e jobs recuperáveis.

Referências: [Baseline APP-01–19](BASELINE-ARQUITETURAL-APROVADA-v0.1.md) · [ADR-009 Render](adrs/ADR-009-selecao-render.md) · [ADR-010 Supabase](adrs/ADR-010-postgresql-supabase.md) · [Topologia](IMPLANTACAO-RENDER.md) · [Teste Render](VALIDACAO-OPERACIONAL-RENDER.md) · [Teste Supabase](VALIDACAO-OPERACIONAL-SUPABASE.md) · [Gates anteriores](VALIDACOES-E-PARAMETROS-PENDENTES.md).

## Adendo de decisões — Vercel, R2 Free e ADR-007

- **Vercel selecionada** para Next.js; Hobby é **recomendação de plano** para portfolio estritamente não comercial, sujeita a elegibilidade/limites e aprovação operacional.
- **Cloudflare R2 Standard Free Tier confirmado**, franquia e custos excedentes registrados em [ADR-005](adrs/ADR-005-midia-e-storage.md).
- **ADR-007:** outbox durável aceita e estratégias best effort formalizadas; Supabase Cron ainda precisa ser validado para tarefas SQL limitadas; não há cron ou worker instalado.
- **Supabase Free segue recomendação não confirmada**. Render Free continua decisão aprovada para backend de demonstração, não ambiente comercial.

Documentos principais: [decisões](DECISOES-VERCEL-R2-FREE-E-JOBS.md), [ADR-007](adrs/ADR-007-worker-e-jobs.md), [testes](VALIDACAO-VERCEL-R2-JOBS.md).


## Ratificação da escolha de planos — estado mais recente (v0.5)

**Vercel Hobby e Supabase Free estão aprovados por declaração do responsável.** Frases históricas acima que tratem ambos como recomendação não confirmada têm valor apenas de histórico; este adendo substitui tal status.

A infraestrutura aprovada para o **MVP de portfólio, sem venda real**, é Next.js/Vercel Hobby; NestJS/Render Free; PostgreSQL/Supabase Free; mídia privada/Cloudflare R2 Free Tier Standard; Stripe test mode. **Supabase Auth e Supabase Storage não foram escolhidos.** Jobs permanecem duráveis no PostgreSQL, mas **sem executor confiável contínuo homologado**.

Status formal: **direção aprovada para ADR-001–010 no escopo apresentado**, com detalhes de implementação e ensaios ainda pendentes. Nenhuma ADR pode receber status “executada”, “homologada” ou “produção” com base somente nesta confirmação.

Links: [Consolidação final da Fase 03](CONSOLIDACAO-FINAL-FASE-03-v0.5.md), [critérios Fase 04](HANDOFF-FASE-04.md), [Supabase](adrs/ADR-010-postgresql-supabase.md).
