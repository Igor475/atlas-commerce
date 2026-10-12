# SEQ-05-CHECKOUT-RESERVA-EXPIRACAO — Checkout, reserva e disputa com expiração

> **Modelo:** sequência Mermaid **conceitual**, sem endpoints, código ou evidências. `DB` representa uma ou mais transações separadas ao longo do fluxo, não uma transação aberta durante chamadas externas. `par` representa **corrida que precisa ser serializada pelo PostgreSQL** — não sucesso simultâneo.

**Fonte editável:** [Mermaid](SEQ-05-checkout-reserva-expiracao.mmd).

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Cliente
    participant Checkout as Checkout e Orders
    participant Payments as Módulo Pagamentos
    participant Stripe as Stripe Checkout
    participant DB as PostgreSQL
    participant Exp as Expirador durável
    Buyer->>Checkout: Enviar cotação + idempotency key
    Checkout->>DB: Begin TX, ordenar SKU e travar saldos
    DB->>DB: Validar disponibilidade e todos componentes do kit
    alt Estoque insuficiente
        DB-->>Checkout: Rollback completo sem pedido parcial
    else Saldo suficiente
        DB->>DB: Snapshot + pedido + reserva 40m + outbox
        DB-->>Checkout: Commit (order_id e expires_at do banco)
        Checkout->>Payments: Solicitar sessão com tentativa persistida
        Payments->>Stripe: Criar sessão com chave idempotente estável
        Stripe-->>Payments: Session ID, created_at, expires_at
        Payments->>DB: Validar 40/30/5 e persistir referência
        alt Sessão incompatível
            Payments->>Stripe: Encerrar/reconciliar sem expor URL
        else Compatível
            Payments-->>Checkout: URL autorizada
            Checkout-->>Buyer: Disponibilizar URL do Stripe
        end
    end
    par Evidência financeira autenticada
        Stripe->>Payments: Webhook assinado
        Payments->>Payments: Validar assinatura, vínculo e dedup
        Payments->>DB: Persistir evento e estado financeiro
        DB->>DB: Lock e hora do banco APÓS aguardar lock
        alt Reserva ACTIVE e prazo válido
            DB->>DB: ACTIVE -> CONFIRMED; pedido PAID; outbox
        else Expirada/liberada
            DB->>DB: PAYMENT_REVIEW e intenção de refund integral
        end
    and Job de expiração
        Exp->>DB: Lock reserva ACTIVE e obter hora atual DB
        alt Prazo atingido e ainda ACTIVE
            DB->>DB: ACTIVE -> EXPIRED; liberar comprometimento uma vez
        else Confirmada ou não vencida
            DB->>DB: Sem liberação duplicada
        end
    end
```

Contratos: [DB-02 — Invariantes](../database/DB-02-invariantes-e-locking.md), [DB-05 — Provas](../database/DB-05-plano-de-validacao.md), [ADR-002 — Outbox](../adrs/ADR-002-integridade-outbox.md), [ADR-004 — Stripe](../adrs/ADR-004-psp-sandbox.md). As fontes de negócio continuam [PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md) e [tabelas de transição](../../03-business-processes/TABELAS-DE-TRANSICAO.md).
