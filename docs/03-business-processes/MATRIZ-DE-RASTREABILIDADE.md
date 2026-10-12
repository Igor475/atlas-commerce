# Matriz de rastreabilidade — Fase 02 (negócio × segurança)

> **Versão:** 0.3.0 proposta • Base: [BRD v0.2.1](../02-business-requirements/REGRAS-DE-NEGOCIO.md), [Adendo v0.2](../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md), [Segurança AC-SEC-001 v0.2](../07-security/security-requirements.md).

| Cenário de aceitação | Diagramas correlatos | Regras de negócio | Segurança associada | Evidência futura necessária |
|---|---|---|---|---|
| CA-001: último item sob concorrência | PR-01, SQ-01, SM-03 | RN-024–031 | SEC-018, SEC-024; SA-006 | Duas reservas concorrentes em PostgreSQL real |
| CA-002: repetição de checkout | PR-01, SQ-01 | RN-032–034 | SEC-019 | Replay com fingerprint igual/diferente |
| CA-003: webhook duplicado | SQ-02, SM-01/02/04 | RN-041–044, RN-049–050 | SEC-020–021, SEC-024; SA-007 | Evento repetido/fora de ordem, persistência única |
| CA-004: preço manipulado | PR-01, SQ-01 | RN-016–018 | SEC-010, SEC-017; SA-005 | Alteração de preço/cupom no payload |
| CA-005: pagamento tardio | PR-01, SQ-03, SM-01/03 | RN-027, RN-046, RN-077–080 | SEC-020–024 | Expiração, aprovação, revisão e compensação |
| CA-006: biblioteca privada | UC-01, PR-02, SM-04 | RN-014, RN-049–053 | SEC-002, SEC-025–027; SA-009 | Acesso cruzado e token/URL de mídia |
| CA-007: cupom sob concorrência | SQ-01 | RN-019–021 | SEC-017–019 | Limite e idempotência com múltiplos checkouts |
| CA-008: reembolsos concorrentes | PR-03, SM-07, SQ-04, SM-06 | RN-047, RN-062, RN-081–084 | SEC-003, SEC-022, SEC-024; SA-008 | Reserva de saldo financeiro, disputa e reconciliação |
| CA-009: produto despublicado | UC-02, PR-02, SM-04 | RN-004, RN-053 | SEC-025, SEC-027 | Snapshot e direito adquirido |
| CA-010: falha de notificação | SQ-02 | RN-070 | SEC-016, SEC-024, SEC-030 | Outbox/retry sem reversão do pagamento |

## Complemento — políticas críticas

| Cenários | Desenhos / políticas | Regras de domínio | Segurança | Evidência futura |
|---|---|---|---|---|
| CA-011–014 (estoque e TTL) | SM-03, SQ-01/03, PC-01 | RN-071–076 | SEC-016, SEC-018, SEC-020–021, SEC-024; SA-006/007 | Tempo do banco, corrida e PSP fake |
| CA-015–017 (cobrança tardia) | SM-01/02, SQ-03, PC-02 | RN-077–080 | SEC-020–025; SA-007/009 | PSP sandbox, revisão, refund, bloqueio de acesso |
| CA-018–021 (refund) | SM-07, SQ-04, PC-03 | RN-081–087 | SEC-003/005, SEC-022/024, SEC-030; SA-002/008 | Saldo, concorrência, falha de rede, auditoria |
| CA-022–026 (kits) | PR-02, PC-04, SQ-05, SM-04/05 | RN-088–094 | SEC-017–018, SEC-021–022, SEC-025; SA-006/008/009 | Reserva atômica, direitos e pós-venda |

Especificações: [CA-011–026](CENARIOS-DE-ACEITE-v0.2.md), [SA-001–012](../07-security/security-requirements.md#4-cenários-de-aceitação-de-segurança-iniciais), [políticas](POLITICAS-CONSOLIDADAS.md), [transições](TABELAS-DE-TRANSICAO.md), [integração](INTEGRACAO-SEGURANCA.md).

## Rastreabilidade transversal adicional

| Casos / requisito | Âmbito | Desenhos previstos | Prova futura |
|---|---|---|---|
| SA-001–004 | Acesso horizontal, privilégio, revogação, recuperação | UC-01/02 + DFD de identidade futuro | Testes positivos e negativos de autorização/sessão |
| SA-005–008 | Preço, estoque, webhook, refund | SQ-01–04 + PC-01–03 | Integração, concorrência e recuperação de falhas |
| SA-009–011 | Digital, upload, logs | SM-04 + DFD de storage/observabilidade futuro | Testes com mídias, tipos indevidos, telemetria sem PII |
| SA-012 | Backup/restore | Diagrama operacional futuro | Restore executado em ambiente documentado |

**Regra de atualização:** cada linha deverá conter testes/PRs concretos quando existirem. Status atual de todos os casos **PENDENTE**; nenhuma evidência ou implementação foi encontrada na documentação. Os IDs CA, SA e RN foram preservados.
