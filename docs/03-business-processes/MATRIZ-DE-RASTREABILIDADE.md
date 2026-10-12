# Matriz de rastreabilidade — Fase 02

> Status: **proposta**, baseada no BRD v0.1 e [Adendo v0.2](../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md).

| Cenário de aceitação | Diagramas correlatos | Regras de negócio | Evidência futura necessária |
|---|---|---|---|
| CA-001: último item sob concorrência | PR-01, SQ-01, SM-03 | RN-024–031 | Teste de duas reservas concorrentes com PostgreSQL real |
| CA-002: repetição de checkout | PR-01, SQ-01 | RN-032–034 | Teste de replay com fingerprint igual/diferente |
| CA-003: webhook duplicado | SQ-02, SM-01, SM-02, SM-04 | RN-041–044, RN-049–050 | Teste de evento repetido/fora de ordem e persistência única |
| CA-004: preço manipulado | PR-01, SQ-01 | RN-016–018 | Teste de alteração de valores no payload do cliente |
| CA-005: pagamento tardio | PR-01, SQ-03, SM-01, SM-03 | RN-027, RN-046 | Teste de expiração seguida de aprovação e reconciliação |
| CA-006: biblioteca privada | UC-01, PR-02, SM-04 | RN-014, RN-049–053 | Teste de autorização entre clientes e URLs temporárias |
| CA-007: cupom sob concorrência | SQ-01 | RN-019–021 | Teste de limite e idempotência com múltiplos checkouts |
| CA-008: reembolsos concorrentes | PR-03, SM-07, SQ-04, SM-06 | RN-047, RN-062 | Testes de limite transacional do valor reembolsável |
| CA-009: produto despublicado | UC-02, PR-02, SM-04 | RN-004, RN-053 | Teste de snapshot e preservação de entitlements |
| CA-010: falha de notificação | SQ-02 | RN-070 | Teste de outbox/retry sem reversão do pagamento |

## Critério de atualização

Cada cenário deve, na fase de implementação, referenciar um teste automatizado concreto, um endpoint/serviço real e a decisão arquitetural correspondente. Não inserir links fictícios. A conformidade será comprovada por execução, não por desenho.

## Complemento v0.2 — políticas críticas

| Cenários | Diagrama / processo atualizado | Novas RNs | Evidência futura necessária |
|---|---|---|---|
| CA-011–014 (estoque e TTL) | SM-03, SQ-01, PC-01, SQ-03 | RN-071–076 | Banco real, concorrência e tempo controlado |
| CA-015–017 (cobrança tardia) | SM-01, SM-02, SQ-03, PC-01 | RN-077–080 | PSP fake, idempotência e compensação |
| CA-018–021 (reembolsos) | SM-07, SQ-04, PC-03 | RN-081–087 | Concorrência de saldo, timeout e eventos fora de ordem |
| CA-022–026 (kits) | PR-02, PC-04, SQ-05, SM-04/05 | RN-088–094 | Reserva atômica, direitos e pós-venda |

Ver especificações individuais em [CENARIOS-DE-ACEITE-v0.2.md](CENARIOS-DE-ACEITE-v0.2.md). O status de todos é **PENDENTE de implementação**.
