# 06 — Matriz arquitetura ↔ requisitos ↔ evidências futuras

> Este documento é um plano de validação. **Status dos testes:** NÃO EXECUTADOS. Não substitui a matriz CA/SA da Fase 02.

| Contrato | Decisão/vista de arquitetura | Evidência exigida antes do código/release |
|---|---|---|
| RN-024–031, RN-071–076, RN-088–094 | Inventory, T-01/02, C4-03, DFD-02, ADR-002/006 e ER-01 | CA-001, CA-011–014, CA-022/024; DB-001–009; PostgreSQL real |
| RN-032–040, SEC-017–019 | Orders/Pricing, T-01, DFD-02 | CA-002/004/007 e SA-005, request fingerprint |
| RN-041–048, RN-077–084, SEC-020–024 | Payments/Stripe, T-02/03, DFD-02, ADR-004 | SA-007/008, CA-003/005/015–019, DB-012–017; Stripe test mode, PSP fake e [plano de prova](07-validacao-stripe.md) |
| RN-049–054, RN-079, RN-087, RN-091, SEC-025–027 | Library, DFD-03, ADR-005 | SA-009, CA-006/017/023/024; autorização por recurso |
| RN-009–014, RN-064–069, SEC-001–011 | Identity/Admin, DFD-01, authorization matrix, ADR-003 | SA-001–004, AUTH-001–020, sessões revogadas, MFA e recuperação |
| RN-058–063, RN-085–087 | Support/Refund, SEQ-02 e autorização | CA-008/018–021/025; segregação, CDC aplicável |
| RN-070, SEC-016/024/030/034 | Outbox, Integration, ADR-002/007 | CA-010, replay, restart, timeout e dedup |
| RNF-004/005/010/011, SEC-028–038 | Observabilidade e dados, [ADR-006](adrs/ADR-006-acesso-dados.md)/[ADR-008](adrs/ADR-008-controles-operacionais.md) | SA-011/012, restore e logs redigidos |

## Gates antes de autorizar cada prompt de implementação ao Codex

1. **Diretório e contrato claros:** que arquivos/módulo o prompt pode criar/editar; não tocar demais áreas sem autorização.
2. **ADR relevante aprovada** (ou hipótese explicitamente limitada ao spike experimental), inclusive ADR-003 antes de autenticação e papéis. Nenhuma decisão aberta é inferida como aprovada pelo Codex.
3. **Invariantes e abusos verificáveis:** cenário positivo e negativo, concorrência, idempotência, autorização, falhas e reconciliabilidade.
4. **Plano de migrations/rollback** e de testes PostgreSQL real quando houver estado de negócio.
5. **Prova de integração externa** por sandbox/fake contratual, sem guardar segredos ou cartão.
6. **Resultado reprodutível:** comandos executados, testes reais, diff e itens não executados, sem alegar proteção absoluta.
7. **Revisão humana e commit manual:** Codex não altera escopo, não faz deploy e não modifica interfaces sem autorização específica.

## Sequência proposta de prompts quando chegar a fase de código

- Preparação (estrutura do repositório, configuração, CI e contratos — Fase 04).
- Backend Identity/Access + DB e testes de autorização (Fase 05).
- Catalog + Pricing e publicação/mídia protegida.
- Checkout/Inventory e invariantes sob concorrência.
- Payments/refund com PSP sandbox e casos de segurança.
- Biblioteca digital, fulfillment e backoffice.
- Frontend premium (Fase 06), integração, acessibilidade, testes visuais.
- Hardening, performance, observabilidade e validações de release (Fase 07).

Os prompts detalhados serão entregues **quando chegarmos a essas etapas**, com base nos ADRs aprovados e no GitHub então atualizado. Este documento não instrui a implementar nada agora.

## Evidências da proposta ADR-003 (pendentes)

- [Contratos de autenticação](08-contratos-de-autenticacao.md): cookie/sessão no banco, estados e autorização por recurso.
- [Cenários AUTH-001–020](09-cenarios-aceite-autenticacao.md): login, MFA staff, CSRF, logout/revogação, recuperação e segregação.
- [DFD-04](security/DFD-04-sessoes-mfa.md), [SEQ-03](sequences/SEQ-03-login-mfa.md), [SEQ-04](sequences/SEQ-04-stepup-recuperacao.md).

**Estado:** desenho proposto; sem implementação, teste ou aceite final de DS-001/002/003.

## Gate específico de persistência — ADR-006 (novo v0.4)

- [ADR-006](adrs/ADR-006-acesso-dados.md): recomendar não equivale a aprovar Prisma/Drizzle/driver.
- [DB-01](database/DB-01-modelo-logico.md) + [ER-01/02/03](database/README.md): modelo lógico proposto, sem DDL aplicada.
- [DB-02](database/DB-02-invariantes-e-locking.md): tempo do banco sob lock, estoque por projeção/ledger, refund por captura e outbox/inbox.
- [DB-03](database/DB-03-migrations-e-recuperacao.md): compatibilidade de migrations, backup/restore e acesso mínimo.
- [DB-04](database/DB-04-orm-drivers-pool.md): spike Prisma v7 + adapter/SQL vs Drizzle/SQL; orçamento de pool.
- [DB-05](database/DB-05-plano-de-validacao.md): **28 casos DB-001–028**, todos pendentes de execução real.

A Fase 04 poderá preparar contratos e *spikes experimentais* bem isolados por prompt Codex; não iniciar módulo financeiro/estoque em produção por suposição documental.
