# SQ — Checkout e fulfillment de kit misto

> **Versão:** 0.2 — política revisada, não implementada.  
> **Fonte:** [Adendo v0.2](../../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md).

![Checkout e fulfillment de kit misto](SQ-05-kit-misto.svg)

**Arquivos:** [Mermaid editável](SQ-05-kit-misto.mmd) · [SVG](SQ-05-kit-misto.svg) · [PNG](SQ-05-kit-misto.png).

## Fonte Mermaid

```mermaid
sequenceDiagram
autonumber
participant C as Cliente
participant K as Checkout
participant B as PostgreSQL
participant P as Provedor
participant F as Fulfillment
participant D as Biblioteca
C->>K: Comprar kit com componentes físicos e digitais
K->>B: Transação: snapshot e reserva all-or-nothing
B-->>K: Pedido e reserva criados ou rollback total
K->>P: Criar tentativa compatível com validade da reserva
P-->>K: Sessão de pagamento e referência estável
P->>K: Pagamento confirmado e autenticado
K->>B: Confirmar reserva ainda ACTIVE e pedido PAID
B-->>K: Alocação de todos os físicos confirmada
K->>D: Conceder direitos digitais dos componentes uma vez
K->>F: Preparar físicos do mesmo kit na mesma remessa
F->>B: Registrar entrega completa ou exceção por falta
D->>B: Registrar direitos por item e titular
```

Sequência conceitual; guardas e exceções estão nas [tabelas de transição](../TABELAS-DE-TRANSICAO.md).
