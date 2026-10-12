# AC-STRIPE-TEST-001 — Plano de prova da integração Stripe (Fase 03)

> **Estado:** PLANO DE TESTE, NÃO EXECUTADO. Stripe foi escolhido como provedor; evidências ainda não existem. Responsável: futuro trabalho de implementação/spike aprovado.  
> **Base:** [ADR-004](adrs/ADR-004-psp-sandbox.md), [T-01/T-02/T-03](03-transacoes-e-consistencia.md), [PC-01–04](../03-business-processes/POLITICAS-CONSOLIDADAS.md), [DS-004](../07-security/security-requirements.md).

## Escopo e preparação

- Stripe test mode; Checkout hospedado `mode=payment`; somente cartões/fluxos compatíveis após verificação das capacidades da conta. A disponibilidade real de moeda BRL e métodos é verificada no ambiente; nenhuma configuração é presumida.
- Endpoint de webhook autenticado com `Stripe-Signature` sobre **corpo original** e segredo específico daquele destino. Não divulgar `sk_test_`, `whsec_` ou dados sensíveis em evidências.
- PostgreSQL real para corrida de reserva/expiração e saldo de refunds. PSP fake para injetar condições determinísticas; Stripe sandbox para demonstrar os contratos reais. O mock não substitui teste externo.
- Fixar versão da API Stripe/SDK no momento do ensaio, registrar timestamp UTC, ambiente, ID opaco, evidência, resultado, limitações e eventual divergência contratual.

## Gate crítico — validade absoluta

`reservation_expires_at = reservation_created_at + 40m`  
`stripe_expires_at = stripe_created_at + 30m` (**mínimo documentado e duração prevista do MVP**)  
**Invariante:** `stripe_expires_at <= reservation_expires_at - 5m`.

| Cenário | Atraso entre reserva e sessão | Resultado esperado |
|---|---:|---|
| ST-001 | 0 min | Criar sessão de 30 min, verificar expires_at, expor URL apenas se válida |
| ST-002 | 4 min | Sessão ainda potencialmente compatível; verificar prazos absolutos e latência |
| ST-003 | 5 min | Limite matemático, evitar depender dele em produção; decisão só após verificar timestamps exatos |
| ST-004 | 6 min | **Não expor link de pagamento**; expirar sessão aberta que tenha sido criada e reconciliar |
| ST-005 | PSP timeout após criação | Persistir intenção, consultar/reconciliar sem repetir cobrança de forma cega |
| ST-006 | Cliente tenta pagamento após expiração | Checkout expira, pedido não se torna pago por redirect; confirmar fatos financeiros reais |

**Nota:** sessão encerrada não prova que nenhuma cobrança possa ter sido iniciada antes; compensação financeira continua obedecendo à regra de pagamento tardio.

## Gates de segurança, integridade e idempotência

| ID | Cenário | Critério de aceite | Vinculação |
|---|---|---|---|
| ST-007 | Webhook com assinatura inválida | Negar e não criar fato financeiro/entitlement | SEC-020, SA-007 |
| ST-008 | Evento válido repetido | `event.id` persiste como chave de dedup; nenhum efeito repetido | CA-003, SA-007 |
| ST-009 | Eventos fora de ordem | Convergência por estado de Stripe consultado/persistido, sem regressão | SEC-020/024 |
| ST-010 | Redirect antes de confirmação persistida | UI exibe status pendente; sem fulfillment | SEC-021 |
| ST-011 | Webhook aprovado × expiração concorrente | Reserva termina apenas uma vez; `EXPIRED` não reconfirma | CA-014, SA-006 |
| ST-012 | Pagamento após reserva expirada | `PAYMENT_REVIEW`, sem entrega, refund integral estável | CA-015/016/024 |
| ST-013 | Refund duplicado após timeout | Mesma operação/chave estável, sem devolução dupla | CA-018/019, SA-008 |
| ST-014 | Stripe idempotency key após retenção remota | Registro/constraints locais impedem novo efeito após o prazo remoto; Stripe API v1 pode descartar chaves após 24h | SEC-019/022/024 |
| ST-015 | Kit misto pago com reserva confirmada | Conceder entitlement por componente somente após alocação total | CA-023, SA-009 |
| ST-016 | Chaves/env/observabilidade | Isolamento test/live e secrets protegidos, logs sem tokens/URLs assinadas | SEC-030/032/038 |

## Eventos e campos a validar no spike

- Identidade: `checkout.session.id`, `payment_intent`, `event.id`, `client_reference_id`, metadados opacos e IDs locais; `mode`, `status`, `payment_status`, `amount_total`, `currency` e validade.
- Avaliar `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded` e os eventos necessários ao reembolso **na versão concreta da API**, sem presumir que um único nome de evento autorize fulfillment.
- Métodos de liquidação assíncrona **desabilitados no MVP inicial** até regras separadas e provas específicas. Testar cartões com falha/autenticação adicional e cenários de reconciliação.
- Idempotência local durável: event ID e tentativa externa não dependem do prazo de cache do Stripe. Um HTTP 2xx da integração é resposta de API, não prova de estado financeiro final.

## Critérios de encerramento

- [x] Fornecedor escolhido: Stripe.
- [x] Direção de Checkout hospedado documentada.
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
