# CT-08 — Matriz de aceitação contratual `API-001–030`

> **Estado:** **30 cenários planejados, nenhum executado.** Esses IDs **não renumeram** SA/CA/DB/ST/AUTH; são novos casos de contrato de interface e integração. Quando houver código, exigir evidência real do tipo de teste (unit/contract/integration/e2e), commit, ambiente e resultado.

| ID | Caso/estímulo negativo ou positivo | Gate relacionado |
|---|---|---|
| API-001 | Produto publicado retorna página paginada; cursor estável | Catalog/SEC-010 |
| API-002 | Produto não publicado e arquivo integral nunca aparecem em catálogo | SEC-025 |
| API-003 | JSON com campos desconhecidos/quantidade fracionária é recusado | SEC-010 |
| API-004 | Preço/cupom/frete adulterados no request são ignorados ou rejeitados | CA-004/007 |
| API-005 | Quote não dá garantia de estoque; checkout revalida na transação | DB-001 |
| API-006 | Último SKU concorrente: só uma reserva efetiva | DB-001 |
| API-007 | Kit insuficiente provoca rollback integral sem cupom consumido | DB-003/004 |
| API-008 | Mesmo idempotency key/payload não cria segundo pedido | CA-002/DB-010 |
| API-009 | Mesmo key/payload diferente = 409 sem efeitos adicionais | DB-011 |
| API-010 | Sessão incorporada não elegível: responder 202 PENDING/RECONCILIATION_REQUIRED, sem clientSecret | ST-001–006 |
| API-011 | Reserva vencida rejeita confirmação mesmo após espera por lock | DB-006/007 |
| API-012 | Pedido de outro cliente retorna 404 e não revela PII | SA-001/SEC-014 |
| API-013 | Checkout sem cookie válido ou sem CSRF/Origin é negado | AUTH/SEC-007 |
| API-014 | Login loja não autentica em admin, mesmo com cookie válido | AUTH-001–020 |
| API-015 | Staff senha válida/MFA pendente sem capacidades privilegiadas | AUTH-001–020 |
| API-016 | MFA WebAuthn challenge replay, origin inválida e TOTP falso negados | AUTH/SA-003 |
| API-017 | Sessão expirada/revogada rejeitada mesmo com cookie no browser | DB-024 |
| API-018 | Webhook Stripe com assinatura falsa/alteração raw body = rejeição | ST/SA-007 |
| API-019 | Webhook repetido/fora de ordem não duplica pagamento/entitlement | ST-008/DB-012 |
| API-020 | Callback/completion/return do componente Stripe não modifica status financeiro | ADR-004 |
| API-021 | Evento pago tardiamente => PAYMENT_REVIEW, sem mídia/expedição | DB-013 |
| API-022 | Entitlement de outro titular negado; URL curta nunca em cache/log | SA-009/R2-002 |
| API-023 | Kit misto sem todo físico alocado impede URL digital | DB-022 |
| API-024 | Refund manual por operador sem MFA/role/step-up é negado | SA-008/DS-003 |
| API-025 | Aprovador igual solicitante ou sem alçada definida é negado | SA-002/DS-003 |
| API-026 | Refund concorrente/timeout não libera saldo pendente | DB-014–017 |
| API-027 | Error RFC9457 sem SQL, secrets, e-mail ou URL assinada | SEC-030 |
| API-028 | Status 429/503 e retry não criam nova operação externa | JOB/ST |
| API-029 | OpenAPI refs/JSON Schema de evento validados no CI | CT-07 |
| API-030 | Render Free e Supabase Free voltam de pausa sem forjar sucesso | RENDER/SUPABASE/JOB |

## Variações do delta EMBEDDED (planejadas, não executadas)

- **API-010:** 201 somente sessionStatus READY, presentation EMBEDDED, clientSecret de Checkout Session e sessionExpiresAt válido, com owner/TLS/no-store; 202 não contém clientSecret nem hosted URL. Negativos: READY sem secret/prazo, 202 READY, secret no pending, campo hosted antigo e outro titular.
- **API-005/010:** digital puro não cria reserva física; proposta UXD-16 representa `reservationExpiresAt: null` obrigatório. A ratificação desse shape permanece pendente; os cenários de domínio não são novos endpoints.
- **API-020/027/028:** montagem/cleanup/3DS/retorno/expiração não geram PAID nem nova tentativa financeira; clientSecret não aparece em URL/log/cache/SSR/analytics/erro público. `success_url` hosted não integra a proposta incorporada.
- Fixar versão da API/SDK/ui_mode no futuro ensaio ST; enum de negócio EMBEDDED não prova compatibilidade do SDK. Identidade completa/favoritos/ofertas/novas páginas precisam de contratos separados, sem ampliar API-001–030 por inferência.

[CT-10](CT-10-migracao-embedded-checkout-proposta.md) e [UXA-025–044](../fd03/FD-03-12-criterios-aceite-complementares.md).

## Plano de prova por tecnologia

- Unitários/contract: parse de DTO/OpenAPI, campos extras, enums, error boundary, serialização de dinheiro e timestamps.
- Integração com PostgreSQL real: reserva de estoque, kit, cupom e transição de refund com **duas transações independentes**. Não usar mock como prova de concorrência.
- E2E navegador: hosts Vercel/localhost sob HTTPS de teste, cookies host-only, CSRF, cache entre contas, step-up MFA; sem inventar RP ID.
- Stripe: test mode com webhook assinado real/fake controlado e cenários `ST-001–016`; nenhum cartão real.
- Operação: falha, rede e reativação dos planos gratuitos, outbox/inbox e URL R2 sem acesso indevido; comportamento sem SLA.

**Critério de conclusão:** documentação + validação automatizada dos schemas **não substituem** testes de endpoints implementados. Não marcar nenhum `API-*` como aprovado neste ZIP.
