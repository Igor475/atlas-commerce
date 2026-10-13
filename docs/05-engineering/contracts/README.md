# F04-02 — Contratos de transporte, segurança e eventos

> **Estado:** pacote **PROPOSTO PARA RATIFICAÇÃO** (v0.2, 12/10/2026). A separação física do monorepo foi aprovada, **os paths/DTOs ainda não**. Nenhum serviço, endpoint, client SDK, migration, envio Stripe ou suite de testes foi implementado.

| Artefato | Conteúdo / finalidade |
|---|---|
| [CT-01](CT-01-inventario-http.md) | Inventário de API MVP, verbos, escopos e HTTP statuses |
| [CT-02](CT-02-dtos-validacao.md) | Tipos/DTOs, dados monetários, snapshots, paginação, validação |
| [CT-03](CT-03-erros-e-idempotencia-http.md) | Erro RFC 9457, request ID, idempotência e políticas de retry |
| [CT-04](CT-04-sessoes-csrf-e-webhook.md) | Cookies host-only, CSRF, MFA, webhook Stripe raw body |
| [CT-05](CT-05-eventos-duraveis.md) | Versão, dedup, outbox/inbox, proprietário de evento |
| [CT-06](CT-06-autorizacao-por-recurso.md) | Matriz endpoint→papel→guarda→teste negativo |
| [CT-07](CT-07-versionamento-e-compatibilidade.md) | API/events/JSON Schema, mudanças, contrato e implementadores |
| [CT-08](CT-08-cenarios-validacao-api.md) | Testes `API-001–030` planejados, positivos/negativos |
| [CT-09](CT-09-decissoes-gates-codex.md) | O que aprovar antes de escrever código e sequência de implementação |
| [CT-10](CT-10-migracao-embedded-checkout-proposta.md) | Delta de apresentacao EMBEDDED e reservationExpiresAt anulavel, propostos para ratificacao |
| [OpenAPI v1 (YAML)](openapi/atlas-commerce-api-v1.yaml) | Especificação declarativa OpenAPI 3.1 *proposta* |
| [Eventos (JSON Schema)](events/atlas-domain-events-v1.schema.json) | Contrato declarativo de eventos principais, não SQL |
| [API-01](diagrams/API-01-fronteiras.md) | Fluxos de interface e fronteira de confiança em DOT + SVG + PNG |

## Hierarquia normativa

1. [BRD](../../02-business-requirements/REGRAS-DE-NEGOCIO.md), [políticas](../../03-business-processes/POLITICAS-CONSOLIDADAS.md), [estados](../../03-business-processes/TABELAS-DE-TRANSICAO.md) e [segurança](../../07-security/security-requirements.md).
2. [Fase 03 consolidada](../../04-architecture/CONSOLIDACAO-FINAL-FASE-03-v0.5.md), [ADRs](../../04-architecture/adrs/README.md) e [handoff](../../04-architecture/HANDOFF-FASE-04.md).
3. [F04-01 aprovada](../F04-01-estrutura-monorepo.md) e fronteiras de módulo [F04-02](../F04-02-fronteiras-modulos.md).
4. Proposta F04-02 deste diretório; não cria exceção aos invariantes anteriores.

**Atenção:** `OpenAPI 3.1`, `application/problem+json` e JSON Schema `2020-12` são **escolhas de formato propostas**, separadas de qualquer alegação de conformidade da implementação. Docs devem ser aprovados e validados com consumidores antes do primeiro prompt Codex de domínio.
