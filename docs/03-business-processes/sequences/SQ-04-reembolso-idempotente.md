# SQ — Reembolso concorrente e reconciliação

> **Versão:** 0.2 — política revisada, não implementada.  
> **Fonte:** [Adendo v0.2](../../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md).

![Reembolso concorrente e reconciliação](SQ-04-reembolso-idempotente.svg)

**Arquivos:** [Mermaid editável](SQ-04-reembolso-idempotente.mmd) · [SVG](SQ-04-reembolso-idempotente.svg) · [PNG](SQ-04-reembolso-idempotente.png).

## Fonte Mermaid

```mermaid
sequenceDiagram
autonumber
participant A as Atendimento
participant R as Reembolsos
participant B as PostgreSQL
participant P as Provedor
participant C as Conciliação
A->>R: Solicitar refund por valor e itens
R->>B: Transação: validar captação e reservar saldo
B-->>R: Valor reservado ou saldo insuficiente
R->>B: Gravar refund e chave idempotente estável
R->>P: Solicitar devolução com chave estável
P-->>R: Timeout ou resultado pendente
R->>B: Marcar RECONCILIATION_REQUIRED sem liberar valor
C->>P: Consultar mesmo refund_id no provedor
P-->>C: Confirma sucesso ou falha definitiva
C->>B: Persistir resultado uma vez
B-->>A: Disponibilizar status auditável ao atendimento
```

Sequência conceitual; guardas e exceções estão nas [tabelas de transição](../TABELAS-DE-TRANSICAO.md).
