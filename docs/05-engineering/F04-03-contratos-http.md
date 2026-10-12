# F04-03 — Convenções HTTP e inventário de contratos (pré-OpenAPI)

> **Status:** design preliminar. Nenhuma rota existe. Os nomes de path abaixo **não** são API aprovada: o contrato OpenAPI **proposto** foi elaborado na F04-02 em [YAML](contracts/openapi/atlas-commerce-api-v1.yaml) e segue sujeito a revisão contra RN/CA/SA/AUTH/ST antes do Codex criá-lo.

## Regras propostas de API

1. Prefixo público versionado `/api/v1` (a `/api` da UI pode ser proxy/rewrite). Não expor secrets/código do backend ou endpoint de operação interna.
2. Payloads JSON validados no limite de entrada (DTO/schema) com rejeição de propriedades desconhecidas quando pertinente. Identificador de recurso não dá autorização; server checks owner, estado, role, step-up.
3. Dinheiro em integer de centavos BRL, quantidades inteiras; UUID/IDs opacos sem semântica secreta, datas de contrato ISO 8601 UTC; armazenar momentos decisórios com hora autoritativa do PostgreSQL.
4. Erro estruturado e consistente com `code`, `message` genérico/localizado quando apropriado, `requestId`; detalhes internos não vão ao browser. A definir: RFC 9457/problem+json ou envelope local, **sem fixar ambos**.
5. Paginação cursor para listagem com filtros allowlisted e ordenação estável; não expor varreduras sem filtro sobre PII ou ledger.
6. Cache: catálogo público pode cachear com invalidação; `/me`, sessão, pedido, library URL e financeiro são **não cacheáveis publicamente**. Desabilitar SSR cache cross-user.
7. Idempotência: `Idempotency-Key` para mutações apropriadas como checkout e refund; server materializa fingerprint, ator, operação, status e resultado. Reuso com payload diferente = conflito; não confundir idempotência HTTP com unicidade apenas do PSP.
8. Webhook Stripe: endpoint especial com `Stripe-Signature` e `raw body`; **não** usa cookie de sessão ou token CSRF browser. Assinatura antes de alterar estado; dedup persistido. Nunca confiar em redirect.
9. Sem endpoints que permitam ao navegador enviar `paid`, `isAdmin`, `stockAvailable`, `hasEntitlement`, `refundSucceeded` ou `amountCaptured` como autoridades.
10. Revisar compressão, body limits, parser raw para Stripe, CORS de origins aceitas, validação, logs com redaction e status de readiness sem divulgar segredos.

## Inventário lógico detalhado na F04-02

| Área | Recursos / casos de uso públicos previstos | Acesso e testes vinculados |
|---|---|---|
| Catálogo | buscar obras, edições, produto, prévias licenciadas | público; cache, SEC-010–013 |
| Identidade | registro, verificação, login, desafio MFA staff, recovery, `/me`, sessões | sessão, CSRF, AUTH-001–020 |
| Carrinho/Preço | calcular cotação server-side, cupom elegível, disponibilidade indicativa | cálculo servidor, CA-004/007 |
| Checkout/Pedidos | iniciar checkout idempotente, buscar próprio pedido/status | owner, reserva DB, CA-001/002, DB-001–011 |
| Stripe/Pagamentos | criar sessão hostada, receber webhook, reconciliação do pagamento | Stripe test mode, ST-001–016, SA-007/008 |
| Biblioteca | listar própria biblioteca, solicitar acesso temporário a objeto privado | entitlement, SA-009/010, R2-001–012 |
| Pós-venda | registrar caso/retorno/reembolso, consultar estado próprio | role+owner+alçada+step-up, CA-016–019 |
| Admin | catálogo, estoque, atendimento, operações financeiras segregadas | MFA staff, matriz DS-003 |
| Saúde | live, ready e métricas internas apropriadas | status claro, sem PII/segredos, Render cold start |

**Os verbos/paths e DTOs iniciais estão propostos em [CT-01–09](contracts/README.md), mas não ratificados nem implementados.** Esse inventário existe para não deixar o Codex inventar APIs a partir da UI. Mais: [F04-04](F04-04-eventos-e-idempotencia.md), [BRD](../02-business-requirements/REGRAS-DE-NEGOCIO.md) e [segurança](../07-security/security-requirements.md).
