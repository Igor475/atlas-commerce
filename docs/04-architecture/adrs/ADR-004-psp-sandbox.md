# ADR-004 — Stripe Checkout como provedor de pagamento do MVP

> **Estado:** **DECISÃO PARCIALMENTE ACEITA** — fornecedor Stripe escolhido em 12/10/2026; **integração, métodos e compatibilidade temporal NÃO HOMOLOGADOS**.  
> **Origem:** decisão explícita do proprietário do projeto; RN-041–048, RN-071–084, DA-006, DS-004 e SEC-020–024.

## Decisão registrada

- **Fornecedor:** Stripe (deixa de ser mera alternativa). A escolha de provedor fica encerrada para o escopo atual; reabertura exige nova ADR.
- **Apresentação escolhida em 13/10/2026:** Stripe **Checkout incorporado à página Atlas**, Checkout Sessions `mode=payment`, em **Test Mode**, conforme [adendo aceito](ADR-004-ADENDO-UI-EMBEDDED.md). Não iniciar por redirect hosted nem construir campos PAN/CVV próprios. API/SDK/ui_mode exatos permanecem pendentes de prova. A escolha hosted de 12/10/2026 fica preservada como histórico, substituída apenas na modalidade de apresentação.
- **Métodos no MVP inicial:** somente meios testados como compatíveis com expiração e confirmação durante a reserva, priorizando **cartão de teste**. Não ativar Pix, boleto ou outros métodos assíncronos sem política de estoque/reembolso própria e atualização da Fase 02.
- **Moeda:** BRL representada em centavos inteiros; valor, itens e frete derivados do snapshot do pedido no servidor. Locale `pt-BR` quando adequado; não confiar em valores do frontend.
- **Autoridade:** módulo **Payments** confirma fatos financeiros; Checkout e retorno ao navegador não concedem direitos ou reserva por si mesmos.

## Restrição real do Stripe — janela 40/30/5

A API oficial de criação da Checkout Session documenta `expires_at` entre **30 minutos e 24 horas a partir da criação**. A proposta do Atlas exige:

- `reservation_expires_at = reservation_created_at + 40 min` (PostgreSQL);
- `stripe_expires_at = stripe_session_created_at + 30 min` (duração exata proposta do MVP);
- `stripe_expires_at <= reservation_expires_at - 5 min`.

**Consequência matemática:** a sessão precisa ser criada **até 5 minutos após a reserva**, e o fluxo deve buscar margem operacional antes do limite. Verificar timestamps absolutos efetivamente retornados; clocks, atraso de rede, concorrência e timeout exigem testes. Não assumir que é possível reduzir a sessão Stripe para menos de 30 min quando houver atraso.

**Falha de compatibilidade:** não entregar client secret nem montar o componente incorporado. Persistir situação da tentativa; se sessão existe e está `open`, solicitar expiração, sem presumir que uma tentativa externa ambígua nunca cobrou. Reconciliar eventos/estado; reserva não pode ser confirmada depois de `EXPIRED`.

## Contrato funcional e de segurança

1. Checkout cria pedido/snapshot e reserva física atomicamente no banco, com chave local persistente. Somente depois tenta criar Checkout Session usando chave Stripe de idempotência por **tentativa**, nunca por pedido de forma irrestrita.
2. Guardar `order_id`, `payment_attempt_id`, `stripe_checkout_session_id`, `stripe_payment_intent_id` quando existir, `stripe_created_at`, `stripe_expires_at`, amount/currency, estado, `request_fingerprint` e versão da política. `client_reference_id`/`metadata` transportam apenas IDs opacos não sensíveis.
3. O backend deve verificar no endpoint webhook a assinatura `Stripe-Signature` usando **raw body**, segredo **por ambiente/destino** e a biblioteca oficial; rejeitar falsos, deduplicar por `event.id` em persistência e correlacionar ID, valor, moeda, modo e captura.
4. Webhook pode chegar duplicado, atrasado e fora de ordem. Responder `2xx` apenas após persistir recebimento válido/ação recuperável; processamento custoso posterior por outbox/inbox. Eventos financeiros diferentes associados à mesma cobrança não duplicam efeitos.
5. Confirmação financeira não é confirmação de reserva: `Inventory` faz transição serializada `ACTIVE -> CONFIRMED` antes do TTL, e `Orders` controla `PAID`. Kit misto só gera entitlement após toda alocação física confirmada.
6. Cobrança válida sem reserva alocável: `PAYMENT_REVIEW`, sem fulfillment nem direito digital automático do pedido misto, e **refund integral idempotente** como política padrão do MVP.
7. Refund vinculado a captura/PaymentIntent com saldo reservado no banco; retries com chave estável, estado ambíguo conciliado. Nunca supor sucesso de devolução por `2xx` genérico; só estado financeiro confirmado encerra a devolução.
8. Stripe guarda informações do pagamento, mas **PostgreSQL continua fonte de verdade dos estados comerciais e das obrigações de compensação**. Chaves privadas da API/assinatura não entram no Git, browser ou logs. O client secret de Checkout Session é a exceção de apresentação: somente para seu titular autenticado inicializar o SDK oficial, sob TLS/no-store, sem URL/log/analytics/cache/SSR estático; não autoriza domínio nem comprova pagamento. Acesso ao Dashboard deve ter MFA e papéis mínimos.

## Trade-offs e riscos residuais

Vantagens: componente incorporado gerenciado pela Stripe mantém PAN/CVV fora dos campos Atlas; APIs de sessão, eventos e reembolso documentadas; sandbox/test mode permite testes de falha. Riscos: atraso entre criação de reserva e sessão, métodos assíncronos, webhooks não ordenados, replay, conciliação e custos/condições da conta Stripe. Não presumir certificação PCI, conformidade jurídica ou adequação fiscal sem avaliação concreta.

## Evidência obrigatória para encerrar o gate técnico DS-004

- Conta/test mode, moeda e método elegível; IDs e timestamps externos verificados.
- Atrasos 0/4/5/6 min entre reserva e sessão; client secret/montagem recusados quando incompatíveis.
- API/SDK/ui_mode versionados, montagem/cleanup, CSP, 3DS e completion/return validados; sem `success_url` hosted no modo incorporado escolhido.
- Webhooks inválidos, duplicados, fora de ordem, assinatura raw body e expiração.
- Corrida confirmação vs expiração com PostgreSQL real; pagamento tardio e refund único.
- Refund após timeout com operação local persistida, reconciliação e saldo reservado.
- Segredos test/live segregados, baseline de logs e retenção e escopo PCI documentado.

**Status dos testes:** NÃO EXECUTADOS. A seleção Stripe não fecha DS-004 nem autoriza release. Ver [plano de validação](../07-validacao-stripe.md).

## Fontes oficiais consultadas (12/10/2026)

- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/api/checkout/sessions/expire
- https://docs.stripe.com/webhooks
- https://docs.stripe.com/api/idempotent_requests
- https://docs.stripe.com/api/refunds/create

## Sincronização da apresentação — 13/10/2026

[CT-10](../../05-engineering/contracts/CT-10-migracao-embedded-checkout-proposta.md) e [FD-03-11](../../05-engineering/fd03/FD-03-11-checkout-stripe-incorporado.md) detalham a proposta de DTO e UX; `payment.presentation=EMBEDDED` não fixa enum Stripe. Consulta atual: referência cita `embedded_page`, exemplos anteriores `embedded`; API/SDK efetivos não escolhidos/executados. `return_url`/`redirect_on_completion` são condicionais à versão e ao fluxo; 3DS pode navegar externamente. Callback, client secret e retorno não validam PAID. `reservationExpiresAt` anulável continua proposta contratual a ratificar, não nova regra de reserva. Nenhuma alteração de RN/PC/40/30/5 por trocar a apresentação.
