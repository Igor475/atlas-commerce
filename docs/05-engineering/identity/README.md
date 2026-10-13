# ID-01 — Primeira fatia funcional do backend: Identity de clientes

> **Natureza:** planejamento e prompt de implementação, **não código entregue**. Data: 13/10/2026. Início da trilha de backend funcional após bootstrap F04-03 e spikes de persistência F04-04/F04-05. **L1 Supabase Free remoto pendente**, portanto usar exclusivamente PostgreSQL descartável local/CI.

## Estratégia acordada

Backend funcional começa pela **identidade de clientes**, não por todas as capacidades do backoffice ao mesmo tempo. Design FD-05 continua em paralelo, sem criar interface final até mockups aprovados. Identidade staff de alta segurança requer MFA, bootstrap seguro, RP ID/origem e DS-003; ela fica **fechada por padrão** nesta fatia, não flexibilizada.

| Entrega | Arquivo |
|---|---|
| Limites e contrato lógico | [ID-01 — Escopo e contratos](ID-01-escopo-e-contratos.md) |
| Banco, sessões, abuso e segredos | [ID-02 — Persistência e segurança](ID-02-persistencia-e-seguranca.md) |
| Testes positivos e adversariais | [ID-03 — Matriz de testes](ID-03-matriz-de-testes.md) |
| Decisões abertas e bloqueios | [ID-04 — Decisões](ID-04-decisoes-e-bloqueios.md) |
| Execução pelo Codex | [PROMPT-CODEX-ID01](PROMPT-CODEX-ID01-CLIENTE.md) |

## Fontes existentes e precedência

- [ADR-003](../../04-architecture/adrs/ADR-003-autenticacao-sessoes.md), [contrato de autenticação da Fase 03](../../04-architecture/08-contratos-de-autenticacao.md), [AUTH-001–020](../../04-architecture/09-cenarios-aceite-autenticacao.md).
- [CT-01](../contracts/CT-01-inventario-http.md), [CT-03](../contracts/CT-03-erros-e-idempotencia-http.md), [CT-04](../contracts/CT-04-sessoes-csrf-e-webhook.md), [CT-06](../contracts/CT-06-autorizacao-por-recurso.md).
- [F04-02 fronteiras de módulos](../F04-02-fronteiras-modulos.md) e [topologia Vercel/Render](../F04-06-topologia-identidade.md).
- [Segurança SEC/SA](../../07-security/security-requirements.md), [matriz DS-003](../../04-architecture/security/authorization-matrix.md).

Quando uma orientação técnica exigir valor/contrato ainda aberto, **isolar e solicitar decisão**; não alegar que o backend completo está pronto para Internet ou operação financeira.
