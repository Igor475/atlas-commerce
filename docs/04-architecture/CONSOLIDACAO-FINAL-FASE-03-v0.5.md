# Atlas Commerce — Consolidação final documental da Fase 03 (v0.5)

> **Situação:** **diretrizes e escolhas de fornecedores PLANOS APROVADOS para portfólio não comercial**. **Não** equivale a Fase 03 homologada tecnicamente, ambiente implantado, código existente ou módulos prontos para produção. Data: 12/10/2026.
> **Baseline GitHub inspecionada:** `Igor475/atlas-commerce`, `main`, commit `7bebea13a3a0504ac86fef773880a2fbb948c43a`.
> **Fonte da autoridade de decisão:** confirmações expressas do responsável no projeto; APP-01–19, ADR-001–010, PC/RN/SEC.

## 1. Stack e custos iniciais aprovados

| Componente | Decisão | Status e restrição |
|---|---|---|
| Frontend Next.js | **Vercel Hobby** | **Plano escolhido**, demo pessoal **não comercial**; não liberar pagamento real |
| Backend NestJS modular | **Render Web Service Free** | **Plano escolhido**, serviço pode dormir e tem filesystem efêmero; sem worker contínuo garantido |
| Banco transacional | **Supabase PostgreSQL Free** | **Plano escolhido**; 500 MB de banco, possível pausa por baixa atividade, exportação/restore própria |
| Acesso a dados | **Prisma ORM v7 + PostgreSQL adapter** (preferência) e SQL parametrizado pontual | Direção aceita como preferência; versões/locking/pool exigem prova DB |
| Pagamentos | **Stripe Checkout hospedado em Test Mode** | Fornecedor escolhido, jamais prova de pagamento pela URL de retorno; ST-001–016 pendentes |
| Mídia pública e privada | **Cloudflare R2 Free Tier Standard** | Plano escolhido; quotas podem ser ultrapassadas, buckets e autorização ainda não testados |
| Identidade | **NestJS Identity**, sessão opaca, MFA staff passkeys/TOTP | Direção aprovada; **não** adotar Supabase Auth automaticamente |
| Jobs | **PostgreSQL outbox/inbox** duráveis; executor futuro sob ADR-007 | Direção aprovada; nenhum scheduler externo/cron ativo ou homologado |
| Correio transacional | **Provedor HTTP API a escolher** | Render Free pode bloquear SMTP de saída; não inventar fornecedor/credencial |

## 2. Decisões aprovadas vs. requisitos de prova

**Direções aprovadas:** APP-01–19 e ratificações posteriores. Incluem arquitetura modular, permissões, prazo inicial de sessão, MFA, Stripe, R2, jobs duráveis, hospedagem acima e o escopo demo. Ver [baseline APP](BASELINE-ARQUITETURAL-APROVADA-v0.1.md) e [índice das dez ADRs](adrs/README.md).

**Validações pendentes obrigatórias, quando os respectivos módulos forem implementados:**

- [ ] **STRIPE/ST-001–016**: expiração 40/30/5, webhooks assinados, repetição, pagamento tardio e refund, sem real card data.
- [ ] **DB-001–028** e **SUPABASE-001–016**: PostgreSQL real, Prisma adapter/transaction/locks, pooler TLS, schema Data API/RLS, backup/export/restore.
- [ ] **AUTH-001–020**: sessão opaca, cookies/CORS/CSRF na origem Vercel↔Render, MFA, recovery, autorização por recurso e step-up.
- [ ] **RENDER-001–016**, **VCL-001–008**, **R2-001–012**, **JOB-001–018**: cold start, custos/limites, mídia privada, backlog, retry/replay, jobs inativos no Free, secrets/monitoramento.
- [ ] **CA-001–026/SA-001–012** e BPMN: critérios de negócio/segurança e consistência dos modelos de processos.
- [ ] **Legal/fiscal**: direitos/licenças das obras, LGPD, política de reembolso, alçadas monetárias e decisão própria antes de comércio real.

## 3. Restrições operacionais que NÃO podem ser flexibilizadas pelo Codex

1. Vercel Hobby só para portfólio pessoal não comercial; Stripe **Test Mode**. Nenhum pagamento real, cobrança ou promessa de operação de loja.
2. Render Free pode suspender API; **não usar timers `setInterval`/cron in-process como única garantia**. Persistir prazos, trabalhos e intenções no PostgreSQL, efetivar transições idempotentes ao retomá-lo, registrar lag e estados `PENDING`/`PAYMENT_REVIEW` quando apropriado.
3. Supabase Free pode pausar e impõe limite **500 MB de banco**; backups diários gerenciados **não estão incluídos**. Planejar exportações externas controladas e restore em ambiente isolado; não chamar isso de PITR.
4. Backend NestJS continua dono de autenticação e autorização; não habilitar Data API e RLS permissivas por conveniência; sem `service_role` no frontend e sem importar Supabase Auth/Storage sem nova decisão.
5. Conteúdo integral digital é privado em Cloudflare R2, exposto só por verificação de entitlement e URL temporária. Não declarar DRM/revogação imediata da URL já emitida.
6. PostgreSQL é fonte de verdade; dados financeiros em centavos inteiros, constraints e idempotência locais, saldo/reserva protegidos por transação. `SKIP LOCKED` só para claims de jobs, não consulta de estoque disponível.
7. **Não alterar TTL de reserva (40m), janela externa (30m) e gap (>=5m)** silenciosamente. Se a integração Stripe exigir reconfiguração, abrir decisão DA/DS/ADR com alterações rastreáveis e aprovação.
8. Versão/hospedagem/plano aprovado **não** significa quotas monitoradas, serviços criados, secrets configurados, CI passando, backup executado ou security ASVS comprovada.

## 4. Estado das dez ADRs

[ADR-001 a ADR-010](adrs/README.md) constituem o catálogo aprovado **em direção**, cada uma com gates de tecnologia/segurança/implantação. ADR-004 mantém Stripe sem homologação; ADR-007 mantém executores pendentes; ADR-010 encerra a escolha do **Free**, não os testes Supabase. O [quadro de aprovação](STATUS-ADR-APROVACAO-2026-10-12.md) registra tais diferenças.

## 5. Critério de transição para a Fase 04

**LIBERADO:** documentação de engenharia do repositório, estrutura de monorepo, toolchain, contratos de API e dados, módulos, convenções, CI/branching e **spikes isolados por Codex** de conectividade, migrations e autenticação (sem cobrança real). 

**NÃO LIBERADO por esta consolidação:** pagamento Stripe live, novas regras comerciais não aprovadas, ativação comercial no Hobby, rollout automático de migrations em banco compartilhado, worker supostamente sempre ativo, remoção de testes críticos.

A implementação só inicia sob prompts Codex limitados a arquivos e entregas exatas, com gates de teste conforme [HANDOFF-FASE-04](HANDOFF-FASE-04.md). 

## Fontes oficiais para consultar antes de deploy

- https://vercel.com/docs/plans/hobby
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/platform/backups
- https://render.com/docs/free
- https://developers.cloudflare.com/r2/pricing/
- https://docs.stripe.com/api/checkout/sessions/create
