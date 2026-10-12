# SQ — Pagamento tardio e reembolso integral

> **Versão:** 0.2 — política revisada, não implementada.  
> **Fonte:** [Adendo v0.2](../../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md).

![Pagamento tardio e reembolso integral](SQ-03-pagamento-tardio.svg)

**Arquivos:** [Mermaid editável](SQ-03-pagamento-tardio.mmd) · [SVG](SQ-03-pagamento-tardio.svg) · [PNG](SQ-03-pagamento-tardio.png).

## Fonte Mermaid

```mermaid
sequenceDiagram
autonumber
participant J as Job TTL
participant B as PostgreSQL
participant P as Provedor
participant H as Webhook
participant R as Refund
participant O as Operação
J->>B: Expirar reserva ACTIVE no vencimento de 40 min
B-->>J: EXPIRED e disponibilidade liberada uma vez
J->>P: Solicitar encerramento e consultar status da sessão
P-->>J: Resultado ou status ainda indeterminado
P->>H: Aprovação da cobrança chega após liberação
H->>B: Autenticar e deduplicar; validar cobrança e pedido
B-->>H: Pagamento comprovado; reserva EXPIRED
H->>B: Gravar APPROVED e pedido PAYMENT_REVIEW
H->>R: Solicitar compensação integral idempotente
R->>B: Reservar saldo e persistir refund_id e chave
R->>P: Enviar refund com chave idempotente
P-->>R: Refund confirmado ou pendente
R->>B: Atualizar status somente com evidência válida
R->>O: Alertar sobre exceções ou falhas de refund
O->>B: Encerrar pedido somente após reembolso comprovado
```

Sequência conceitual; guardas e exceções estão nas [tabelas de transição](../TABELAS-DE-TRANSICAO.md).
