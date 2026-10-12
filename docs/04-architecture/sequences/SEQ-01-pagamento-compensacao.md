# SEQ-01 — Pagamento e compensação recuperável

[Mermaid editável](SEQ-01-pagamento-compensacao.mmd). Este é um **refinamento arquitetural**, não substitui [SQ-05 da Fase 02](../../03-business-processes/sequences/SQ-05-kit-misto.mmd).

**Guardas mandatórias:** RN-071–080, RN-088–094, SEC-016–025; reserva transacional/clock do banco; pagamento autenticado por Payments; efeito digital somente após elegibilidade; PSP/session 40/30/5 proposta condicionada a DA-006/DS-004. Um bloco Mermaid simplifica locks e outbox: implementação deverá provar atomicidade por testes.

```mermaid
sequenceDiagram
    autonumber
    participant Checkout
    participant Inventory
    participant Payments
    participant PSP
    participant DB
    Checkout->>Inventory: Reservar pedido completo e kit atomico
    Inventory->>DB: Snapshot + reserva com expiracao pelo banco
    Checkout->>Payments: Criar tentativa idempotente
    Payments->>PSP: Sessao com vencimento absoluto validado
    PSP->>Payments: Webhook autenticado
    Payments->>DB: Dedup + fato financeiro persistido
    alt Reserva ativa e valida
        Payments->>Inventory: Confirmar alocacao transacional
        Inventory->>DB: Confirma reserva e registra intencao duravel
    else Reserva expirada
        Payments->>DB: PAYMENT_REVIEW; bloquear entrega
        Payments->>PSP: Refund integral com chave estavel
    end
```

Fonte completa [SEQ-01-pagamento-compensacao.mmd](SEQ-01-pagamento-compensacao.mmd) inclui passos adicionais de retries, direito e compensação. Os fluxos são representações de comportamento **a implementar**.
