# CT-07 — Evolução de API v1, esquemas e consumidores

> **Decisão proposta:** OpenAPI 3.1 (YAML), JSON Schema Draft 2020-12 para eventos e RFC 9457 para erros. Não adotar múltiplas fontes de verdade geradas divergentes; contratos aprovados serão testados e versionados no Git.

## Versionamento e fonte de verdade

- HTTP público `/api/v1` e health separado de versão; APIs browser-only e service-only têm authenticadores diferentes. OpenAPI descreve interface de transporte **e não substitui** RFC de workflow/reserva/Stripe/segurança.
- `schemaVersion` inteiro (v1) no envelope de outbox, versionamento por evento; `aggregateVersion` é evolução do agregado, não versão do JSON Schema. Eventos e OpenAPI evoluem independentemente.
- `packages/contracts` futuro conterá DTOs públicos e validadores derivados/checados contra este contrato; não compartilhar banco, entities Prisma, credenciais, authorization internals ou DTOs admin em uma biblioteca importada diretamente pela loja sem controle.
- Mudança que altera tipo obrigatório, semântica de `PAID`, permissão financeira, tratamento de refund, prazo 40/30/5 ou payload event publicado é **breaking**: criar nova versão e atualizar ADR/RN/CA/SEC, consumidores, fixtures e cenários.

## Regras de compatibilidade

| Mudança | Tratamento |
|---|---|
| Campo de resposta opcional novo | preferir aditivo; consumidores toleram campos desconhecidos em **resposta** |
| Campo obrigatório em **requisição** | breaking; precisa de versão/compatibilidade explícita |
| Campo desconhecido em requisição | rejeitar quando DTO fechado; impedir mass assignment |
| Valor enum novo de resposta | avaliar consumers exaustivos; não introduzir estado financeiro sem contrato |
| Remover endpoint, renomear path ou evento | breaking, janela de migração e registro |
| Trocar estado após commit (ex.: refund `PENDING`↔`SUCCEEDED`) | alterações exclusivamente por evento/fato autoritativo e condições de negócio |
| Expand/contract PostgreSQL | schema de banco não força breaking da API; testar app velha/nova e versões worker |

## Checklist futuro CI de contratos

- [ ] Validar OpenAPI sem refs quebrados e schemas com exemplos válidos.
- [ ] Comparar diffs OpenAPI com política de breaking changes e cobertura por consumidor.
- [ ] Validar JSON Schema de envelopes/eventos gerados; negativos para payload com secret/dinheiro float/estado inválido.
- [ ] Ligar cada path/operationId a controller real e ao inventário de rotas, testando coerência no bootstrap Codex.
- [ ] Bloquear rota implementada sem OpenAPI e operação descrita sem decisão explícita para torná-la real.
- [ ] E2E de autenticação/cross-origin, checkout, webhook Stripe e financeiro com banco e mocks/sandbox.

**Status destes itens: todos futuros.** Nenhum pacote TypeScript ou pipeline foi criado por esta fase.
