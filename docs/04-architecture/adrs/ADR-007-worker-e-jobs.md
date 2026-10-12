# ADR-007 — Outbox e execução recuperável sob Render Free

> **Status:** **DIREÇÃO ACEITA** — PostgreSQL outbox/inbox duráveis, reprocessamento idempotente; **EXECUTOR/CRON NÃO HOMOLOGADO** no ambiente gratuito. Data da direção: 12/10/2026. Relacionamentos: APP-12, ADR-002/004/006/008/009/010, SEC-016/020–024/034–035 e RN-070–094.

## Contexto real selecionado

- **Render Web Service Free:** o serviço NestJS adormece após inatividade. Não garante que `setInterval`, BullMQ, cron interno, heartbeat ou consumidores residentes rodem na hora da reserva; processo pode reiniciar e filesystem é efêmero. **Render Background Worker e Cron Job não são serviços Free equivalentes ao Web Service**; contratação seria decisão posterior.
- **Supabase PostgreSQL:** banco contém pedidos, reservas, pagamentos, estados, inbox/outbox e leases. Fornecedor escolhido, plano Supabase ainda a confirmar. Se Free, pode ser pausado por baixa atividade; portanto tampouco sustenta SLA 24×7 por si só.
- **Vercel:** frontend, não fonte de verdade de jobs. Se usar Hobby como plano recomendado para portfólio não comercial, **Cron Hobby roda no máximo uma vez por dia e sem precisão de minuto**; inapto a reserva de 40 minutos.
- **Stripe:** webhook assinado pode acordar o Render, mas entrega, ordem e momento não substituem mecanismo de compensação/reconciliação. Redirect do navegador nunca confirma pagamento.

## Decisão em duas camadas

**Camada A (aceita, obrigatória em qualquer plano):**

1. Outbox na **mesma transação PostgreSQL** que grava o fato (pedido, reserva, refund, entitlement, notificação). Inbox/event ID com restrição única por consumidor; processamento **at-least-once** e idempotência da consequência, não exactly-once prometido.
2. Workers lógicos/funções de aplicação NestJS chamados por **executor intercambiável**: comando administrativo protegido, retomada no startup, oportunidades de tráfego, polling quando API acordada e futuro serviço dedicado. Tarefas externas fora de transações com locks abertos.
3. Claim durável com lease/owner e `FOR UPDATE SKIP LOCKED` para jobs (nunca para comprovar estoque disponível); reclaims seguros, heartbeat somente se tarefa longa, backoff limitado e fila de falhas/revisão. Chaves de operação Stripe/refund persistidas, nenhuma repetição cega após timeout.
4. **A integridade de estoque não depende de um cron na hora exata:** qualquer checkout/confirmador deve avaliar `expires_at` pelo relógio atual do banco **após adquirir o lock** e nunca reconfirmar uma reserva expirada. Expiração física atrasada é dívida de cleanup; liberar reservas vencidas preguiçosamente/sob lock no fluxo de estoque é estratégia a provar, não atalho para venda duplicada.
5. A fila de refund inconclusivo mantém saldo reservado e bloqueia reembolso duplicado até prova remota; pedidos mistos sem reserva válida não liberam arquivos R2 digitais.

**Camada B (agenda/execução automática — PROPOSTA condicional):**

- Avaliar **Supabase Cron (`pg_cron`)** para invocar **funções transacionais estritamente de banco** destinadas a marcar/liberar reservas vencidas e a recuperar claims curtos, com privilégios mínimos, auditoria e versão/migração controladas. **Antes:** verificar disponibilidade e limites efetivos no plano selecionado; evitar `SECURITY DEFINER` genérico e schema exposto. Não mover regras comerciais completas para uma segunda implementação SQL: guards/funções precisam ser do mesmo contrato usado pelo NestJS.
- Para notificações e reconciliação **externa** (Stripe, e-mail, R2), preferir serviço executor autorizado/sempre ativo ou função agendada independente **após escolher suporte e orçamento**. Supabase Cron pode disparar HTTP autenticado, mas acordar Render não oferece SLA de callback; Supabase Free também pode pausar.
- Em demo Free, permitir recuperação **best effort** via inicialização/requisições/admin; indicar backlog e executar testes controlados. Isso **não atende** release comercial com reservas/reembolsos pontuais ou promessa de disponibilidade.
- Opção de upgrade: backend Render sempre ativo + worker/cron pago, ou executor gerenciado comprovado que execute os mesmos comandos NestJS protegidos. Troca de executor não altera invariantes da ADR-002/006.

## Estados e detecção de falha

| Workload | Fonte e disparo | Invariante independente do scheduler | Observabilidade |
|---|---|---|---|
| Reservas | `expires_at` no banco; sweep/fluxo oportunista | Vencida jamais `CONFIRMED`; liberar uma vez | `expired_unprocessed`, atraso do cleanup |
| Stripe webhook | Evento assinado e gravado no inbox | Dedup e valor/moeda/IDs verificados | ingressos, falhas de assinatura, retry |
| Cobrança tardia | `PAYMENT_REVIEW` + outbox | Sem fulfillment e refund único | `payment_review_age`, refund outstanding |
| Refund | operação local estável + reconciliação | Saldo pending mantém-se em timeout | `refund_uncertain_age` |
| E-mail | outbox após fato | Não reverter pedido por falha no SMTP/API | tentativas, DLQ lógica |
| Entitlements | outbox após confirmação integral | Não conceder antes de kit completo | atraso e duplicidades |

## Requisitos para liberar a implementação

- [ ] Executor real e seus custos/limites verificados; Sem promessas de jobs 24×7 nos serviços Free.
- [ ] Transações, locks/lease, retries, estados terminais e dedup demonstrados no PostgreSQL real.
- [ ] Testar **JOB-001–018** no [plano](../VALIDACAO-VERCEL-R2-JOBS.md), inclusive pausa do Render, suspensão do Supabase e reconciliação de pagamentos.
- [ ] Metadados de retry e falha sem PII/segredos; acesso operacional/cron com credencial escopada e nunca admin DB de longo prazo via frontend.
- [ ] Escolha de executor sempre ativo e RPO/RTO aprovados **antes de vendas reais ou SLA financeiro**.

**Fontes oficiais:** https://render.com/docs/free · https://vercel.com/docs/cron-jobs/usage-and-pricing · https://supabase.com/docs/guides/cron · https://supabase.com/docs/guides/platform/free-project-pausing .
