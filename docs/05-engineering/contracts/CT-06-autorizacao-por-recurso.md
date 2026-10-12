# CT-06 — Autorização negativa por rota, papel e recurso

> **Status:** visão de contrato derivada da [matriz DS-003](../../04-architecture/security/authorization-matrix.md), não expansão de poderes. `R` exige capability explícita; `O` exige owner real; `S` exige identidade de serviço. Qualquer rota nova recebe este mapeamento e um teste negativo antes de ser implementada.

| Rota/grupo | Quem pode iniciar | Validações no backend | Negativos essenciais |
|---|---|---|---|
| `GET catalog/*` | Público | produto publicado, licenças de prévia | produto não publicado, arquivo integral não servido |
| `auth/login/logout` | Fluxo humano | Origin/CSRF/rate limit, antifixation, TTL | origem maliciosa, CSRF ausente, senha errada |
| `auth/mfa/verify` | Desafio staff pendente | MFA challenge purpose/TTL, fator correto, origin RP | replay, challenge de outro user, TOTP incorreto |
| `GET /me` | Sessão válida | conta active, class, expiração | sessão revogada, cliente/admin trocado |
| `POST checkout/quotes` | Cliente autenticado | preço/cupom server-side, publicação, endereço pertencente | `price` injetado, desconto negativo, SKU oculto |
| `POST checkouts` | Cliente autenticado | owner, key/fingerprint, reservas e TTL DB, quote viva | última unidade, payload key conflitante, replays |
| `GET /me/orders/{id}` | Proprietário do pedido | filtro por `ownerId` no repository/query | ID de outro cliente retorna não encontrado |
| `GET/POST /me/library/*` | Titular de entitlement | licença, estado, compra e físico integral | entitlement de outra conta, refund/revogado |
| `webhooks/stripe` | Somente PSP assinado | raw body, secret test, event/amount/currency IDs | assinatura falsa/duplicada/out-of-order |
| `admin/refund-requests` | staff financeiro solicitante com MFA e step-up | papel + escopo + captura/saldo + idem | atendente e cliente não solicitam como financeiro |
| `admin/refund-requests/{id}/approval` | staff aprovador diferente | identidade distinta, alçada, estado, MFA recente | autoaprovação, classe de sessão loja, falta de alçada |
| `health/live,ready` | Infra/operação | apenas resposta técnica mínima | schema/SQL/secret jamais presente |

**Especificidade:** Ter login válido ou receber `200` em `GET /me` não implica permissão financeira. Conta administradora de identidade não é automaticamente aprovador de refunds. Para requests de outro titular, a API responde 404 ou equivalente com política consistente sem revelar existência. Regras de lucro/comércio não estão liberadas em Vercel Hobby.

**Testes:** [CT-08](CT-08-cenarios-validacao-api.md), [AUTH](../../04-architecture/09-cenarios-aceite-autenticacao.md), [SA](../../07-security/security-requirements.md) e [OWASP API Security 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/).
