# CT-01 — Inventário proposto de API HTTP v1

> **Estado:** proposta de rotas explícitas para evitar invenções do Codex. Caminhos sob `/api/v1` expostos pelo NestJS ou via proxy da origem correspondente. Nenhum controller existe. Os dois sites Next.js **estão aprovados como apps separadas**; hosts/domínios não definidos.

## Recursos prioritários da especificação OpenAPI

| HTTP | Rota lógica | Consumidor/autoridade | Resultado principal | Guarda inegociável |
|---|---|---|---|---|
| GET | `/api/v1/catalog/products` | Público / Catalog | 200 página | somente publicado; cursor estável; sem PII |
| GET | `/api/v1/catalog/products/{productId}` | Público / Catalog | 200/404 | prévia autorizada não equivale a arquivo completo |
| GET | `/api/v1/auth/csrf` | Ambas origens / Identity | 200 token antifalsificação | token associado à origem/session context; `no-store` |
| POST | `/api/v1/auth/login` | Loja ou admin / Identity | 200 customer session ou 202 staff MFA challenge | `Origin`, CSRF, antienumeração e rate limit |
| POST | `/api/v1/auth/mfa/verify` | Admin / Identity | 204 + cookie privilegiado se válido | WebAuthn RP ID/origin ou TOTP, desafio purpose-bound |
| POST | `/api/v1/auth/logout` | Usuário / Identity | 204 | revogar sessão no DB mesmo com sessão antiga; CSRF |
| GET | `/api/v1/me` | Cookie / Identity | 200 | sessão ativa, nunca exibir segredo/fatores MFA |
| POST | `/api/v1/checkout/quotes` | Cliente / Pricing | 200 cotação recomputada | preço/discount/frete calculados no servidor |
| POST | `/api/v1/checkouts` | Cliente / Orders | 201 EMBEDDED/READY + client secret restrito, ou 202 pendente sem secret | idempotência local, estoque transacional, Stripe só após commit; owner/TLS/no-store |
| GET | `/api/v1/me/orders/{orderId}` | Cliente / Orders | 200/404 | BOLA: titularidade no servidor e sem prova por browser redirect |
| GET | `/api/v1/me/library` | Cliente / Library | 200 página | entitlement por conta, licença/estado |
| POST | `/api/v1/me/library/{entitlementId}/access` | Cliente / Library | 200 URL temporária | direito atual, validação do kit físico, nunca CDN integral público |
| POST | `/api/v1/webhooks/stripe` | Stripe → Payments | 2xx/4xx/5xx conforme validação/persistência | **raw body + assinatura**, nenhuma cookie/CSRF human; dedup |
| POST | `/api/v1/admin/refund-requests` | Staff Financeiro | 202 após persistir solicitação | MFA recente, autorização, saldo/estado, idempotência |
| POST | `/api/v1/admin/refund-requests/{refundRequestId}/approval` | Aprovador distinto | 202 decisão registrada | identidade distinta, alçada monetária **pendente**, step-up |
| GET | `/health/live`, `/health/ready` | Plataforma / API | 200 ou 503 | readiness não expõe detalhes internos; liveness não exige DB |

**Acesso staff** no OpenAPI usa cookie tecnicamente, mas o contrato acima requer classe de sessão de backoffice e MFA; não confundir `cookie presente` com autorização suficiente. URLs de Admin pertencem ao host de admin/proxy; se acessadas de outro host, o backend rejeita classe/origin/contexto divergente.

## Fora do OpenAPI mínimo (inventariar posteriormente, sem criar agora)

Cadastro/verificação de e-mail, reset de senha, cadastro/rotação MFA, recovery de MFA, administração de catálogo, upload assinado/malware scan, estoque e inventário administrativo, cupons gerenciáveis, devoluções/inspeção, replay de outbox, métricas e health detalhado. Todos exigem contratos especializados antes da implementação. O Codex **não** deve completar automaticamente estes endpoints porque aparece um módulo no ERD.

## Lacunas adicionais do inventário FD-03 v0.2 (sem criar endpoints)

P16–P50/A09–A14 são navegação aprovada para planejamento, não nova API aprovada. Cadastro/verificação/recovery, favoritos/mesclagem/retencão, ofertas com histórico auditável, coleções/autores/facetas avançadas, atualização de perfil/endereço/segurança, lista de pedidos, suporte/devoluções e operações admin adicionais requerem inventário especializado, DTOs, ownership/CSRF/privacidade e testes negativos. Não acrescentar paths por inferência. Ver [inventário UX](../fd03/FD-03-09-inventario-completo-paginas.md).

**Ratificação pendente UXD-16:** propriedade `reservationExpiresAt` obrigatória e anulável proposta no YAML/CT-02: null para digital puro, string date-time apenas para reserva física real. Solicita-se aprovação desse detalhe antes de implementar, sem fabricar prazo físico.

## Política de resultado e compatibilidade

- Proposta [CT-10](CT-10-migracao-embedded-checkout-proposta.md): `201` com `payment.presentation=EMBEDDED`, `sessionStatus=READY`, `clientSecret` de Checkout Session e `sessionExpiresAt` somente se sessão elegível; `202` com `PENDING`/`RECONCILIATION_REQUIRED` sem `clientSecret`. Estado do pedido permanece SM-01 (ex.: `PENDING_PAYMENT`), separado de sessionStatus. Respostas autenticadas `Cache-Control: no-store`; sem hosted URL, segredo em log/URL/cache/analytics ou confirmação por callback/return.
- `Idempotency-Key` é obrigatória para checkout e solicitações de refund; usar `(actor, operation, key)` com fingerprint canônico e materializar resultado. Reuso com body diferente = 409 sem segundo efeito.
- Exceção financeira baseada em captura tardia cria obrigação de refund integral **independente** do endpoint manual; não é uma chamada que o navegador inicia. A transição depende de lock/tempo do DB.
- `GET /me/orders/{id}` de outro usuário responde 404 ou negativa sem revelar dados; regra consistente anti-enumeração.

## Evidências

[CT-02](CT-02-dtos-validacao.md), [CT-03](CT-03-erros-e-idempotencia-http.md), [CT-06](CT-06-autorizacao-por-recurso.md) e [OpenAPI v1](openapi/atlas-commerce-api-v1.yaml). Casos `API-001–030` em [CT-08](CT-08-cenarios-validacao-api.md). Referências [SA](../../07-security/security-requirements.md), [AUTH](../../04-architecture/09-cenarios-aceite-autenticacao.md), [ST](../../04-architecture/07-validacao-stripe.md), [DB](../../04-architecture/database/DB-05-plano-de-validacao.md).
