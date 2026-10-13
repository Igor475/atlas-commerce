# Fase 04 — Engenharia, estrutura e contratos de implementação

> **Identificação:** `AC-ENG-001` · **Versão documental:** `0.3.0` · **Etapa:** `F04-05` · **Data:** 13/10/2026. **Estado:** bootstrap F04-03 concluído; spike F04-04 experimental; F04-05 com L0 parcialmente validado e L1 Supabase remoto pendente. CI Quality aprovado no commit publicado indicado abaixo; contratos de domínio F04-02 continuam propostos.

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

## Preparação Codex F04-03 e direção de design profissional

- [**FD-01 — Direção de design editorial premium**](FD-01-direcao-design-frontend-premium.md): regra explícita do responsável: nenhum template ou UI genérica; pesquisa, identidade e aprovação visual próprias antes de desenvolver as telas finais.
- [**FD-02 — Brief de pesquisa e benchmark**](FD-02-brief-pesquisa-benchmark.md): pesquisa formal pendente, com prioridade visual para as capturas selecionadas pelo responsável.
- [**FD-02 — Referências iniciais (histórico)**](FD-02-referencias-iniciais.md): shortlist exploratória anterior; TASCHEN/Penguin Random House não são direção visual ativa.
- [**FD-02 — Referências visuais do usuário**](FD-02-referencias-visuais-usuario.md): nove capturas prioritárias, catalogadas por página com restrições de negócio, segurança e originalidade; não aprovam identidade final nem implementação.
- [**FD-03 v0.2 — Arquitetura da informação e experiência**](fd03/README.md): navegação **aprovada pelo responsável**, incluindo [P01–P50/A01–A14](fd03/FD-03-09-inventario-completo-paginas.md); URLs, contratos, integração e visual final ainda pendentes, sem software autorizado.
- [**FD-04 — Três conceitos em avaliação**](fd04/README.md): Coleção Viva, Caderno Editorial e Estúdio Contemporâneo; escolha do responsável pendente, sem identidade, paleta ou fontes definitivas aprovadas.
- [**UXD-16 — Parecer técnico**](fd04/FD-04-08-ratificacao-tecnica-uxd16.md): **PARECER TÉCNICO FAVORÁVEL, RATIFICAÇÃO DO RESPONSÁVEL PENDENTE** para `reservationExpiresAt` obrigatório/anulável; não equivale a aprovação contratual ou autorização de implementação.
- [**Adendo ADR-004 — Stripe incorporado**](../04-architecture/adrs/ADR-004-ADENDO-UI-EMBEDDED.md) e [**CT-10 — Delta EMBEDDED proposto**](contracts/CT-10-migracao-embedded-checkout-proposta.md): direção de apresentação aceita; API/SDK/ui_mode e `reservationExpiresAt` anulável dependem de prova/ratificação.
- [**F04-03 — Registro de CI validado**](STATUS-F04-03-CI-validado.md): evidência existente do bootstrap técnico e de sua aprovação remota, sem módulos de domínio, deploy ou UI comercial. O prompt original não está disponível neste repositório; este registro não o recria nem o substitui como artefato histórico.

Capturas originais por página: [Home](references/storefront/home-atlas-commerce.png), [Categoria Revistas](references/storefront/categorias-atlas-commerce.png), [Categoria Bíblias](references/storefront/categorias-2-atlas-commerce.png), [Pesquisa](references/storefront/pesquisa-atlas-commerce.png), [Produto físico](references/storefront/produto-atlas-commerce.png), [Livro físico/e-book](references/storefront/produtos-atlas-commerce.png), [Revista digital](references/storefront/produto-digital-atlas-commerce.png), [Carrinho](references/storefront/carrinho-atlas-commerce.png) e [Checkout](references/storefront/checkout-atlas-commerce.png).

O **frontend** mantém apenas placeholders técnicos neutros e acessíveis do bootstrap concluído. **Não** tomar sua aparência como identidade final. A aprovação de CI cobre os gates executados, sem aprovar design ou implementação de UI comercial.

## Estado de avanço

- **F04-01**: separação física aprovada e **implementada no bootstrap** (`apps/storefront`, `apps/admin`, `apps/api`, pnpm).
- **F04-02**: proposta detalhada [CT-01–09](contracts/README.md), OpenAPI e JSON Schema produzidos; **detalhes precisam de revisão/ratificação, endpoints de domínio não implementados**.
- **F04-03**: **bootstrap técnico concluído**, com três apps, toolchain, health/smoke e CI; [registro de aprovação remota](STATUS-F04-03-CI-validado.md). Nenhuma UI comercial ou cobrança real foi homologada.
- **F04-04**: **spike experimental implementado**, PostgreSQL descartável + Prisma, com 16 casos PGSP reais; [resultados e limites](../../apps/api/test/spike/RESULTS.md). Não é persistência comercial nem homologação de produção.
- **F04-05**: **preparação server-only implementada, L0 parcialmente validado**: 9/9 provas locais de conexão/TLS/role/pool/recovery e 16/16 PGSP; [relatório e matriz SUPCON](../../apps/api/test/connection/RESULTS.md). O relatório preserva as limitações locais Windows de build/EOL e o estado de CI pendente no momento da entrega; a aprovação remota posterior está registrada abaixo. **L1 Supabase remoto permanece pendente / BLOCKED-NO-REMOTE**, sujeito a autorização específica; nenhuma conexão, migration ou integração cloud foi homologada.

**CI publicado verificado em 13/10/2026:** [Quality 38420228923](https://github.com/Igor475/atlas-commerce/actions/runs/38420228923), commit `c3dff9ec07723723c3de5d929ed54e899d1be078`, branch `main`, `completed/success`. Jobs `checks` e `postgres-integration` aprovados; logs do [job PostgreSQL](https://github.com/Igor475/atlas-commerce/actions/runs/38420228923/job/115375298603) confirmam **16/16 PGSP** em PostgreSQL 17.10 / Node 24.21.0, com cleanup aprovado. Essa execução Linux é posterior à publicação da F04-05 e das referências visuais, mas anterior a este ajuste documental; não comprova L1 Supabase, Stripe/R2, deploy, backup/restore comercial ou homologação de ADRs/produção.

## Restrições invioláveis

B2C de uma só empresa, conteúdo próprio/licenciado, demonstração sem cobrança real no Vercel Hobby; Stripe Test Mode e reserva 40/30/5 condicionada a ST; PostgreSQL como fonte de verdade; estoque e refunds consistentes e idempotentes; biblioteca privada só com entitlement; recuperação de jobs apesar de pausa no Render/Supabase Free; nenhum segredo em código/cliente. A [matriz de autorização](../04-architecture/security/authorization-matrix.md) e os requisitos [AC-SEC](../07-security/security-requirements.md) permanecem superiores aos esboços desta fase.
