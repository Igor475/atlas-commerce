# CT-02 — Dados de transporte e validação por fronteira

> **Natureza:** contrato de wire/DTO **proposto**, não classes Nest, schemas Prisma, Zod ou banco criados. `packages/contracts` conterá apenas interfaces públicas e validadas, sem segredos, entidades Prisma ou autorização derivada do client.

## Convenções de tipos

| Tipo | Proposta | Proibição/guarda |
|---|---|---|
| IDs | string opaca (`UUID` quando confirmado), sem informação de autorização implícita | não aceitar como prova de titularidade; validar no NestJS |
| Tempo | RFC 3339 UTC na API, momento decisório medido no PostgreSQL | não usar hora/browser para elegibilidade da reserva |
| Dinheiro | valores em **inteiros** `amountCents` BRL e moeda enum `BRL` no MVP | sem float, sem preços/bônus/capture informados pelo cliente |
| Quantidade | número inteiro positivo com limites por caso de uso | sem `0`, negativo, float ou overflow; consolidar SKU em kit |
| Paginação | `limit` e `cursor` opaco, ordenação total determinística | cursor não codifica PII em claro, sem offsets ilimitados |
| Estados | enums somente **visão pública**, read-only | cliente não envia `paid`, `entitlement`, `approved`, `stockAvailable` |
| Error | `application/problem+json` (RFC 9457) com código estável e request ID | mensagem sem traceback, SQLSTATE, secret ou PII |
| Token de mídia | URL temporária da R2, sem cache e sem log | não prometer revogação imediata da URL já emitida |
| Sessão | cookie host-only opaco e hash persistido no banco | não devolver token de sessão no JSON/LocalStorage |
| Fraude/mídia | prévia pública é recurso diferente do PDF completo | arquivo completo só após guarda de licença e entitlement |

## DTOs mínimos propostos

- `CatalogProduct`: `id`, `title`, `productType`, `publicationStatus` público quando aplicável, `price {currency, amountCents}` e `previewAvailable`; **não** inclui `storageKey`, margem, chave Stripe, custo de estoque reservado nem arquivo integral.
- `CheckoutQuoteRequest`: `items [{productId, quantity}]`, `couponCode?`, `shippingAddressId?`; servidor resolve SKUs/kit/preço/frete e cria `quoteId`, `expiresAt` e `total {currency, amountCents}`. `quoteId` **não** garante inventário nem preço futuro sem revalidação.
- `CreateCheckoutRequest`: `quoteId`; `Idempotency-Key` em header; backend resolve cliente da sessão e snapshot; nunca recebe `totalCents`, `paid`, `stockAvailable`.
- `CheckoutResult`: `orderId`, `state`, `reservationExpiresAt`, `payment {presentation: EMBEDDED, sessionStatus, clientSecret?, sessionExpiresAt?}`. `sessionStatus` é uma projeção de prontidão da sessão externa, não estado financeiro `SM-02`. O campo `state` do pedido obedece **exatamente** à tabela `SM-01`: `PENDING_PAYMENT`, `PAYMENT_REVIEW`, `PAID`, `CANCELLED`, `IN_FULFILLMENT`, `PARTIALLY_FULFILLED`, `FULFILLED`. Proposta CT-10: `201` somente READY com client secret de **Checkout Session** (não PaymentIntent/CustomerSession/API key) e expiresAt real elegível; `202` somente PENDING/RECONCILIATION_REQUIRED, sem clientSecret. Não retornar URL hosted. Sessão e titularidade/tempos são validados no backend; clientSecret não concede PAID/entitlement.
- `OrderView`: ID opaco, itens snapshot, status e totais redigidos, vínculo de fulfillment, sem PII financeira bruta.
- `LibraryAccess`: `temporaryUrl` de curta vida, `expiresAt`; somente após verificação server-side; no-store e redaction.
- `RefundRequest`: `orderId`, `captureId?` (internamente resolvível), `amountCents`, `reasonCode`; **valor máximo/níveis de aprovação seguem abertos**; mesmo código com payload diferente deve conflitar.

## Deltas propostos — ratificação antes de software

- **UXD-16:** manter `reservationExpiresAt` obrigatório com `type: [string, null]` em OpenAPI 3.1; null significa ausência real de reserva no digital puro. String RFC 3339 somente para reserva física real. É **proposta a ratificar**, não autorização decorrente da aprovação do sitemap; não inventar +40m para digital. Alternativa campo opcional exigiria decisão contratual distinta.
- `presentation=EMBEDDED` é enum Atlas, independente de `ui_mode` Stripe. API/SDK/enum exatos e return/3DS continuam pendentes de prova ST.
- READY exige `clientSecret` não vazio e `sessionExpiresAt` string válida. Nos demais sessionStatus, clientSecret é proibido e sessionExpiresAt pode estar ausente/null se ainda desconhecido; `202` não é prontidão de pagamento.
- O schema de resposta proposto rejeita campos hosted antigos por `additionalProperties: false`. Nenhum consumidor ou API implantada foi migrado nesta etapa. Mesmas rotas, segurança, idempotência, estados e códigos HTTP.

[Delta CT-10](CT-10-migracao-embedded-checkout-proposta.md) e [adendo ADR-004](../../04-architecture/adrs/ADR-004-ADENDO-UI-EMBEDDED.md).

## Modelo de estado e invariantes

1. Snapshot de preço/composição fixado na transação; itens e meios de pagamento válidos elegíveis não são controlados pelo client.
2. `40min` de reserva no relógio do banco; sessão Stripe `30min`, encerra >= `5min` antes da reserva; criação tardia gera estado seguro, sem clientSecret/montagem. Só aplicar reserva física quando houver físicos.
3. Acessos digitais de kit misto exigem pagamento aceito e **todos** os físicos alocados; login não equivale a licença.
4. Refund `available = captured - succeeded - pendingReserved`; origem de verdade é captura + ledger, não valor retornado pelo operador.
5. Campos internos/auditoria/chaves privadas de API/webhook NUNCA entram em DTO compartilhado. Exceção explícita de apresentação: client secret da Checkout Session somente na resposta autenticada do checkout para inicializar SDK Stripe do titular, sob TLS/no-store; sem log, URL, cache, SSR estático, analytics ou armazenamento persistente do browser. Campos administrativos continuam separados por contexto e minimizados por permissão.

## Validação sugerida

Validação estrutural na borda com whitelist estrita nas requisições e `additionalProperties: false` (quando o caso não permitir extensão); comprimento, normalização Unicode quando aplicável, cardinalidade, limite de itens/campos, rate limit proporcional e antienumeração em autenticação. Nunca "sanitizar" entrada alterando silenciosamente o significado de nomes/códigos ou permitindo HTML malicioso ser exibido sem encoding contextual. Identificadores de ordenação e campos dinâmicos por allowlist; SQL bind params no backend.

A forma exata em [OpenAPI](openapi/atlas-commerce-api-v1.yaml) será revisada antes de gerar DTOs. [CT-08 testes](CT-08-cenarios-validacao-api.md).
