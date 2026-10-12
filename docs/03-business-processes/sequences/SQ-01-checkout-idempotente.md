# SQ-01 — Checkout idempotente com reserva

> **Versão:** 0.1 (em revisão)  
> **Fase:** AC-MODEL-002  
> **Origem:** [BRD v0.1](../../02-business-requirements/REGRAS-DE-NEGOCIO.md)  
> **Regras:** RN-016–023, RN-025–028, RN-032–037  
> **Capacidades:** RF-005–008

Chaves idempotentes, atomicidade de reserva e criação do pedido; integração externa ocorre após o commit.

![SQ-01 — Checkout idempotente com reserva](SQ-01-checkout-idempotente.svg)

**Arquivos:** [Fonte editável `.mmd`](SQ-01-checkout-idempotente.mmd) · [SVG](SQ-01-checkout-idempotente.svg) · [PNG](SQ-01-checkout-idempotente.png)  
**Voltar:** [Índice da Fase 02](../README.md)

## Limites e premissas

Este é um **modelo conceitual**, não comprova implementação, homologação de regras ou conformidade legal. Os ramos de exceção, as precondições e os efeitos colaterais serão especificados em contratos de domínio e testes de integração. Consulte as [decisões pendentes](../DECISOES-PENDENTES.md).

## Mermaid (visualizável diretamente no GitHub)

```mermaid
sequenceDiagram
autonumber
participant C as Cliente
participant W as Loja web
participant K as Checkout
participant P as Precificação
participant B as PostgreSQL
participant G as Provedor
C->>W: Confirmar valores da cotação
W->>K: POST checkout + chave idempotente
K->>B: Consultar chave e fingerprint
B->>K: Requisição nova ou resultado existente
Note over K,B: Se chave já resolvida, retornar mesmo pedido e encerrar. Fingerprint divergente: rejeitar.
K->>P: Recalcular preço, cupom e frete
P->>K: Cotação consistente
K->>B: Transação: revalidar, reservar SKUs e cupom, criar snapshot e chave
B->>K: Commit: pedido pendente ou conflito atômico
Note over K,B: Se falhar, nenhuma reserva parcial pode sobreviver.
K->>G: Criar tentativa estável de pagamento (sandbox)
G->>K: Referência do provedor ou falha recuperável
K->>W: Pedido pendente + referência / erro controlado
W->>C: Exibir estado sem presumir quitação
```
