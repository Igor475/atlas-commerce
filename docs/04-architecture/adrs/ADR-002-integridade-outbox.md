# ADR-002 — Integridade PostgreSQL e outbox/inbox transacional

**Status:** PROPOSTA; os detalhes de schema/lock ainda dependem de prova real.

## Contexto

RN-070 exige que falha externa não descarte transação confirmada. Webhooks são duplicáveis/fora de ordem, reservas e reembolsos envolvem concorrência, PSP pode responder de forma ambígua.

## Alternativas

A. Atualizar banco e emitir HTTP/fila dentro da transação (risco de lock prolongado, falta de atomicidade real).  
B. Commit de estado + outbox no PostgreSQL; dispatcher e consumidores idempotentes; inbox/event IDs; reconciliação do PSP.  
C. Saga/orquestração distribuída dedicada desde o MVP (complexidade desproporcional).

**Proposta:** B. PostgreSQL é a fonte de verdade. Reserva, ledger de saldo, pedido e intenção de efeito entram em transação local curta; entregas at-least-once com chave durável, sem promessa de exactly-once. Retry preserva operação e payload fingerprint; estados inconclusivos são reconciliados.

## Consequências e prova

- Medir throughput/latência e impacto no pool DB; escolher frequência dispatcher, leasing/lock e dedup por evidência.
- Demonstrar crash após commit/antes da entrega, duplo consumer, evento fora de ordem, retry após timeout de PSP, lock de último SKU e rollback de kit.
- Não usar Redis como ledger financeiro. Queue/BullMQ e worker separados permanecem condicionais à ADR-007.

**Referências:** RN-070/071–094, SEC-016–024/034, CA-001–026.
