# AC-STRIPE-TEST-001 — Plano de prova da integração Stripe (Fase 03)

> **Estado:** PLANO DE TESTE, NÃO EXECUTADO. Stripe foi escolhido como provedor; evidências ainda não existem. Responsável: futuro trabalho de implementação/spike aprovado.  
> **Base:** [ADR-004](adrs/ADR-004-psp-sandbox.md), [T-01/T-02/T-03](03-transacoes-e-consistencia.md), [PC-01–04](../03-business-processes/POLITICAS-CONSOLIDADAS.md), [DS-004](../07-security/security-requirements.md).

## Escopo e preparação

- Stripe Test Mode; Checkout incorporado à página Atlas via Checkout Sessions `mode=payment`, conforme [adendo ADR-004](adrs/ADR-004-ADENDO-UI-EMBEDDED.md); somente cartões/fluxos compatíveis após verificação das capacidades da conta. A disponibilidade real de moeda BRL e métodos é verificada no ambiente; nenhuma configuração é presumida.
- Endpoint de webhook autenticado com `Stripe-Signature` sobre **corpo original** e segredo específico daquele destino. Não divulgar `sk_test_`, `whsec_` ou dados sensíveis em evidências.
- PostgreSQL real para corrida de reserva/expiração e saldo de refunds. PSP fake para injetar condições determinísticas; Stripe sandbox para demonstrar os contratos reais. O mock não substitui teste externo.
- Fixar versão da API Stripe/SDK no momento do ensaio, registrar timestamp UTC, ambiente, ID opaco, evidência, resultado, limitações e eventual divergência contratual.

## Gate crítico — validade absoluta

`reservation_expires_at = reservation_created_at + 40m`  
`stripe_expires_at = stripe_created_at + 30m` (**mínimo documentado e duração prevista do MVP**)  
**Invariante:** `stripe_expires_at <= reservation_expires_at - 5m`.

| Cenário | Atraso entre reserva e sessão | Resultado esperado |
|---|---:|---|
| ST-001 | 0 min | Criar sessão de 30 min, verificar expires_at, liberar client secret e montagem incorporada apenas se válida |
| ST-002 | 4 min | Sessão ainda potencialmente compatível; verificar prazos absolutos e latência |
| ST-003 | 5 min | Limite matemático, evitar depender dele em produção; decisão só após verificar timestamps exatos |
| ST-004 | 6 min | **Não liberar client secret nem montar formulário**; expirar sessão aberta que tenha sido criada e reconciliar |
| ST-005 | PSP timeout após criação | Persistir intenção, consultar/reconciliar sem repetir cobrança de forma cega |
| ST-006 | Cliente tenta pagamento após expiração | Checkout expira, pedido não se torna pago por callback/completion/return; confirmar fatos financeiros reais |

**Nota:** sessão encerrada não prova que nenhuma cobrança possa ter sido iniciada antes; compensação financeira continua obedecendo à regra de pagamento tardio.

## Gates de segurança, integridade e idempotência

| ID | Cenário | Critério de aceite | Vinculação |
|---|---|---|---|
| ST-007 | Webhook com assinatura inválida | Negar e não criar fato financeiro/entitlement | SEC-020, SA-007 |
| ST-008 | Evento válido repetido | `event.id` persiste como chave de dedup; nenhum efeito repetido | CA-003, SA-007 |
| ST-009 | Eventos fora de ordem | Convergência por estado de Stripe consultado/persistido, sem regressão | SEC-020/024 |
| ST-010 | Completion/callback ou retorno bancário antes de confirmação persistida | UI exibe status pendente; sem fulfillment | SEC-021 |
| ST-011 | Webhook aprovado × expiração concorrente | Reserva termina apenas uma vez; `EXPIRED` não reconfirma | CA-014, SA-006 |
| ST-012 | Pagamento após reserva expirada | `PAYMENT_REVIEW`, sem entrega, refund integral estável | CA-015/016/024 |
| ST-013 | Refund duplicado após timeout | Mesma operação/chave estável, sem devolução dupla | CA-018/019, SA-008 |
| ST-014 | Stripe idempotency key após retenção remota | Registro/constraints locais impedem novo efeito após o prazo remoto; Stripe API v1 pode descartar chaves após 24h | SEC-019/022/024 |
| ST-015 | Kit misto pago com reserva confirmada | Conceder entitlement por componente somente após alocação total | CA-023, SA-009 |
| ST-016 | Chaves/env/observabilidade | Isolamento test/live e secrets protegidos, logs sem tokens/URLs assinadas | SEC-030/032/038 |

## Variações obrigatórias dos 16 cenários (planejadas, não executadas)

- **ST-001–006:** registrar versões exatas da API, SDK servidor, Stripe.js/React, `ui_mode` aceito e seleção cartão-only. `202` sem client secret; `201` READY só após validação temporal/owner. Pedido digital puro sem reserva física: proposta `reservationExpiresAt: null`, ainda a ratificar, sem aplicar TTL físico artificial.
- **ST-006/010:** montagem/remontagem/cleanup, sessão expirada, 3DS, foco/reflow, eventual `return_url` e completion não confirmam PAID; falha do frame não cria nova tentativa/chave automaticamente. Não usar `success_url` hosted na proposta incorporada.
- **ST-016:** CSP/allowlists oficiais, TLS/Origin/CSRF/owner, segredo de sessão apenas para SDK do titular; ausência em logs, URL, cache, SSR estático, analytics e conta alheia. Chaves API privadas e webhook nunca no browser.

Nenhum destes itens foi ensaiado. A referência consultada em 13/10/2026 cita `embedded_page` e o guia de upgrades exemplifica `2026-09-30.endive`; isso não fixa a versão Atlas nem substitui prova do enum na API/SDK escolhidos. Em Endive mudou a seleção de métodos: validar como restringir cartão na versão concreta, sem habilitar outros meios ou alterar Dashboard nesta etapa.

## Eventos e campos a validar no spike

- Identidade: `checkout.session.id`, `payment_intent`, `event.id`, `client_reference_id`, metadados opacos e IDs locais; `mode`, `status`, `payment_status`, `amount_total`, `currency` e validade.
- Avaliar `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded` e os eventos necessários ao reembolso **na versão concreta da API**, sem presumir que um único nome de evento autorize fulfillment.
- Métodos de liquidação assíncrona **desabilitados no MVP inicial** até regras separadas e provas específicas. Testar cartões com falha/autenticação adicional e cenários de reconciliação.
- Idempotência local durável: event ID e tentativa externa não dependem do prazo de cache do Stripe. Um HTTP 2xx da integração é resposta de API, não prova de estado financeiro final.

## Critérios de encerramento

- [x] Fornecedor escolhido: Stripe.
- [x] Direção de Checkout incorporado documentada por decisão explícita (histórico hosted substituído na apresentação, sem homologação).
- [ ] Prova da janela 40/30/5 em Stripe test mode com atraso e retorno de timestamps.
- [ ] Prova de webhook com raw body, assinatura, replay/ordem e recuperação.
- [ ] Prova de refund e estado ambíguo com concorrência PostgreSQL real.
- [ ] Aprovar método/versão da API, credenciais segregadas, telemetria e estratégia de jobs.
- [ ] Ajustar PC/BRD/CA/SEC se a política temporal for inviável; nenhuma exceção silenciosa.

## Fontes oficiais verificadas em 12/10/2026

- [Checkout Session create](https://docs.stripe.com/api/checkout/sessions/create)
- [Expire Checkout Session](https://docs.stripe.com/api/checkout/sessions/expire)
- [Webhooks](https://docs.stripe.com/webhooks)
- [Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Create refund](https://docs.stripe.com/api/refunds/create)

## Fontes da apresentação incorporada consultadas em 13/10/2026

- [Ciclo embedded](https://docs.stripe.com/payments/checkout/how-checkout-works?payment-ui=embedded-page)
- [Completion e retorno condicional](https://docs.stripe.com/payments/checkout/custom-success-page?payment-ui=embedded-page)
- [Versões de API/SDK](https://docs.stripe.com/upgrades)
- [Mudança de seleção de métodos em 2026-09-30.endive](https://docs.stripe.com/changelog/endive/2026-09-30/remove-payment-method-types-checkout-sessions)

Não atribuir `ui_mode` homologado ao projeto: nenhum SDK instalado/declarado ou chamada Stripe executada nesta sincronização.
