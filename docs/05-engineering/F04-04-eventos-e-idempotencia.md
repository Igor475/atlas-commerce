# F04-04 — Eventos de domínio, outbox/inbox e idempotência

> **Status:** contrato conceitual, sem tabela, esquema de evento, fila ou worker implantado. A regra aprovada é o uso de outbox/inbox duráveis em PostgreSQL; tecnologia/frequência de executor ainda não homologadas na [ADR-007](../04-architecture/adrs/ADR-007-worker-e-jobs.md).

## Envelope mínimo futuro

| Campo lógico | Origem | Restrição |
|---|---|---|
| `eventId` | gerado no servidor | globalmente único; chave de dedup por consumidor |
| `eventType`, `schemaVersion` | dono do agregado | contrato versionado, compatível com evolução |
| `aggregateId`, `aggregateVersion` | domínio dono | referência opaca, transição monotônica |
| `occurredAt` | PostgreSQL / fato confirmado | UTC; não horário enviado pelo browser |
| `correlationId`, `causationId` | fluxo iniciado | rastreio sem segredo ou PII desnecessária |
| `payload` | snapshot mínimo | sem PAN/CVV, senha, tokens, signed URLs, segredo R2/Stripe |

Evento representa **fato persistido**. `OrderPaid` só é emitido após decisão correta de reserva/pedido; não nasce da página de sucesso do Stripe. `RefundSucceeded` só após comprovação externa do estado financeiro, não pelo recebimento de request local ou HTTP 2xx inconclusivo.

## Regras transacionais

- Domínio escreve estado + outbox na **mesma transação PostgreSQL**. API retorna status efetivo/pendente sem prometer execução imediata quando Render Free dorme.
- Dispatcher/consumer podem duplicar ou reordenar mensagens; usar inbox, uniqueness, transições com versões e reconciliação para obter efeitos locais idempotentes.
- Claim de jobs pode avaliar `FOR UPDATE SKIP LOCKED` com lease e retry seguro; **proibido usar isso para omitir saldo de estoque bloqueado**.
- Erro depois do commit e antes de chamar Stripe: outbox permite retomar. Timeout **após** chamar Stripe exige conciliar mesma `payment_attempt`/`refund_operation` e a mesma chave, não criar cobrança/devolução nova.
- A última reserva de SKU e refunds concorrentes precisam de guardas no DB, não locks em memória, não single-flight apenas na API.

## Proposta de eventos por dono (não inventário final)

| Fato ou obrigação | Dono | Consumidor esperado / guarda |
|---|---|---|
| `ReservationCreated`, `ReservationExpired`, `ReservationConfirmed` | Inventory | Orders, fulfillment, orquestração; DB/CA |
| `PaymentCapturedVerified`, `PaymentNeedsReview` | Payments | Orders/Inventory, reconciliador; Stripe auth + TTL |
| `RefundRequested`, `RefundCompleted`, `RefundNeedsReconciliation` | Payments | atendimento/auditoria; saldo não libera em timeout incerto |
| `OrderReadyForDigitalFulfillment` | Orders | Library valida kit físico integral antes de entitlement |
| `EntitlementGranted` | Library | notificações/auditoria, uma concessão por componente/licença |
| `MessageDeliveryRequested` | módulos donos | Integration usa HTTP e-mail quando provedor definido |

**Estado atual:** nomes exemplificativos aguardam normalização na F04-02; não são tópicos externos já registrados. Referências: [DB-02](../04-architecture/database/DB-02-invariantes-e-locking.md), [DB-05](../04-architecture/database/DB-05-plano-de-validacao.md), [ST](../04-architecture/07-validacao-stripe.md), [JOB](../04-architecture/VALIDACAO-VERCEL-R2-JOBS.md).

## Complemento F04-02

A proposta de envelope e eventos principais foi expandida em [CT-05](contracts/CT-05-eventos-duraveis.md) e [JSON Schema Draft 2020-12](contracts/events/atlas-domain-events-v1.schema.json). Trata-se de **contrato de documentação** a ratificar, não de evento registrado, tabela criada ou mensagem entregue.
