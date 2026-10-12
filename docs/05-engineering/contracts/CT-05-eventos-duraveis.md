# CT-05 — Eventos de domínio v1, deduplicação e outbox/inbox

> **Estado:** envelope e subconjunto de tipos **propostos**; JSON Schema Draft 2020-12 em [arquivo editável](events/atlas-domain-events-v1.schema.json), sem broker/worker/table SQL criados. Eventos não substituem transições autorizadas do banco.

## Envelope `DomainEvent`

| Chave | Exigência | Origem / semântica |
|---|---|---|
| `eventId` | Identificador estável único | produtor interno, inbox unique por `consumer,eventId` |
| `eventType` | Enum versionado | dono do agregado, sem rename silencioso |
| `schemaVersion` | `1` nesta proposta | evolução e compatibilidade do consumidor |
| `aggregateId`, `aggregateVersion` | Identificador + versão monotônica | sem contar relógio como ordem total |
| `occurredAt` | UTC datetime | servidor/DB do fato persistido, não o cliente |
| `correlationId`, `causationId?` | IDs opacos de rastreio | nenhuma informação privada |
| `payload` | schema do evento | snapshot mínimo, sem e-mail/PAN/CVV/token/URL R2 |

## Inventário mínimo proposto

| Tipo | Dono e payload mínimo | Consumo seguro |
|---|---|---|
| `ReservationCreated` | Inventory `{reservationId, orderId, expiresAt}` | não confirma pagamento, lease separado |
| `ReservationExpired` | Inventory `{reservationId, orderId}` | liberar estoque uma vez por reserva/efeito |
| `ReservationConfirmed` | Inventory `{reservationId, orderId}` | apenas depois de lock/hora DB/ACTIVE |
| `PaymentCapturedVerified` | Payments `{orderId, paymentAttemptId, captureId, amountCents, currency}` | **não** prova reserva ACTIVE; consumidor revalida guardas |
| `PaymentNeedsReview` | Payments `{orderId, paymentAttemptId, reasonCode}` | bloquear fulfillment e gerar obrigação de refund |
| `RefundRequested` | Payments `{refundOperationId, captureId, amountCents, currency}` | saldo pendente reservado; operador != aprovador para manual |
| `RefundCompleted` | Payments `{refundOperationId, captureId, amountCents, currency}` | somente evidência externa SUCCEEDED, uma vez |
| `RefundNeedsReconciliation` | Payments `{refundOperationId, captureId}` | não liberar saldo por timeout |
| `EntitlementGranted` | Library `{entitlementId, accountId, orderId, componentId, licenseVersion}` | físico integral confirmado para kit misto; regra anti-duplicação |

## Delivery e segurança

- Toda mudança local crítica insere evento/outbox **dentro da mesma transação** dos fatos correspondentes. Side effects Stripe/R2/e-mail ocorrem depois do commit. Delivery **at-least-once** e consumidores com inbox/unicidade/state guard; não anunciar exactly-once distribuído.
- Lease/claim com `FOR UPDATE SKIP LOCKED` somente para jobs; dois consumers concorrentes não podem duplicar o efeito. Evento fora de ordem fica pendente/reconciliável ou aplicado segundo transição autorizada, nunca por `last write wins`.
- Retry do mesmo evento **não cria captura nem refund novo**; correlacionar tentativa Stripe/refund com chave persistida. `eventId` não é idempotency key do PSP.
- `schemaVersion=1` não equivale a versão de pedido ou número de migração. Evolução de schema backward-compatible é preferida; qualquer mudança de significado financeiro precisa de ADR e suite de regressão.
- Durante suspensão da Render Free/Supabase Free o backlog persiste, mas não há promessa de executor ou expiração pontual; guardas de prazo fazem recusa segura quando a API acorda.

## Exemplo explicativo (fictício, não disparado)

```json
{"eventId":"11111111-1111-4111-8111-111111111111","eventType":"ReservationExpired","schemaVersion":1,"aggregateId":"22222222-2222-4222-8222-222222222222","aggregateVersion":2,"occurredAt":"2026-10-12T20:00:00Z","correlationId":"33333333-3333-4333-8333-333333333333","payload":{"reservationId":"22222222-2222-4222-8222-222222222222","orderId":"44444444-4444-4444-8444-444444444444"}}
```

**Schema declarativo:** [JSON Schema](events/atlas-domain-events-v1.schema.json). [Rastreabilidade](CT-08-cenarios-validacao-api.md), [ADR-002](../../04-architecture/adrs/ADR-002-integridade-outbox.md), [ADR-007](../../04-architecture/adrs/ADR-007-worker-e-jobs.md), [DB-02](../../04-architecture/database/DB-02-invariantes-e-locking.md).
