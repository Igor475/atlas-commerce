# Fase 04 — Engenharia, estrutura e contratos de implementação

> **Identificação:** `AC-ENG-001` · **Versão documental:** `0.2.0` · **Etapa:** `F04-02` · **Data:** 12/10/2026. **Estado:** monorepo físico **aprovado** (três apps + pnpm); contratos F04-02 **propostos** e não implementados, nenhum teste executado.

## Ponto de partida

A [Fase 03 v0.5](../04-architecture/CONSOLIDACAO-FINAL-FASE-03-v0.5.md) consolida 19 diretrizes aceitas, 10 ADRs e a escolha dos planos gratuitos. O [handoff](../04-architecture/HANDOFF-FASE-04.md) autoriza **projetar** a estrutura, os contratos e os gates antes de pedir ao Codex que codifique. Esta fase **não altera** RN-001–094, PC-01–04, SEC-001–038, SA-001–012 nem CA-001–026.

## Índice desta entrega

| ID | Documento | Conteúdo |
|---|---|---|
| F04-01 | [Monorepo e layout](F04-01-estrutura-monorepo.md) | Apps, workspaces, packages, decisões físicas e deploy |
| F04-02 | [Fronteiras e dependências](F04-02-fronteiras-modulos.md) | Ownership, política de imports e orquestração |
| F04-03 | [Contrato HTTP inicial](F04-03-contratos-http.md) | Convenções e inventário **proposto**, sem endpoints publicados |
| F04-04 | [Eventos e idempotência](F04-04-eventos-e-idempotencia.md) | Outbox/inbox, IDs, timestamps, segurança de pagamentos |
| F04-05 | [Persistência e migrations](F04-05-persistencia-e-migrations.md) | Guardas, Supabase, esquema separado, migrações |
| F04-06 | [Topologia de identidade](F04-06-topologia-identidade.md) | Vercel↔Render, cookies, CSRF, MFA e origin |
| F04-07 | [Configuração e segredos](F04-07-configuracao-e-segredos.md) | Ambientes, serviços, permissões, arquivos, chaves |
| F04-08 | [Toolchain e CI](F04-08-toolchain-ci.md) | pnpm, builds, lint, types, testes e gates |
| F04-09 | [Matriz de provas](F04-09-matriz-de-gates.md) | Testes por ordem de implementação, comprovação de efeitos |
| F04-10 | [Roadmap Codex](F04-10-ordem-codex.md) | Passos, autorização, critérios de pronto, limites |
| F04-11 | [Decisões pendentes](F04-11-decissoes-abertas.md) | O que falta antes de cada módulo e não impede planejamento |
| MONO-01 | [Mapa do monorepo](diagrams/MONO-01-workspaces.md) | DOT, SVG e PNG editáveis/visualizáveis |

## Nova entrega de contratos (F04-02)

- [CT-01–09 — índice e contratos de API, DTO, eventos, autorização, testes](contracts/README.md).
- [OpenAPI 3.1 v1, declarativo](contracts/openapi/atlas-commerce-api-v1.yaml).
- [JSON Schema de eventos, declarativo](contracts/events/atlas-domain-events-v1.schema.json).
- [API-01 — Diagrama das fronteiras e consumidores](contracts/diagrams/API-01-fronteiras.md).

O pacote F04-02 detalha **30 testes `API-001–030` planejados**; nenhum foi executado. A aprovação da separação de apps não aprova automaticamente cada endpoint do YAML, nem autoriza implementar domínios antes dos gates.

## Estado de avanço

- **F04-01**: separação física **aprovada** (`apps/storefront`, `apps/admin`, `apps/api`, pnpm), **ainda não implementada**.
- **F04-02**: proposta detalhada [CT-01–09](contracts/README.md), OpenAPI e JSON Schema produzidos; **detalhes precisam de revisão/ratificação, endpoints não implementados**.
- **F04-03 em diante**: Codex deverá criar código apenas mediante prompt detalhado com arquivos permitidos, testes e autorização. Não começar cobrança real.

## Restrições invioláveis

B2C de uma só empresa, conteúdo próprio/licenciado, demonstração sem cobrança real no Vercel Hobby; Stripe Test Mode e reserva 40/30/5 condicionada a ST; PostgreSQL como fonte de verdade; estoque e refunds consistentes e idempotentes; biblioteca privada só com entitlement; recuperação de jobs apesar de pausa no Render/Supabase Free; nenhum segredo em código/cliente. A [matriz de autorização](../04-architecture/security/authorization-matrix.md) e os requisitos [AC-SEC](../07-security/security-requirements.md) permanecem superiores aos esboços desta fase.
