# CT-03 — Envelope de erro, requests e idempotência HTTP

> **Decisão técnica proposta:** usar **RFC 9457 `application/problem+json`** em vez de envelope proprietário. Contrato a ratificar para o primeiro bootstrap. Segurança de resposta prevalece sobre ergonomia de debug.

**CT-CAT-400 — ratificação do responsável em 15/10/2026:** aprovada e incorporada ao
[OpenAPI v1](openapi/atlas-commerce-api-v1.yaml) somente a resposta `400 INVALID_REQUEST`
nas duas operações GET Catalog, com `application/problem+json` e `ProblemDetails`.
Sem mudança de implementação, rotas, parâmetros ou demais respostas. Esta decisão
não ratifica os demais contratos propostos; [registro e histórico](../pricing/PRIC-04-handoff-e-pendencias.md).

## Shape de erro

Campos públicos: `type` (URI/`about:blank`), `title`, `status` (HTTP correspondente), `detail` genérico opcional, `instance` sem dado sensível, extensão `code` (estável) e `requestId` (correlação aleatória). Não incluir secrets, stack trace, SQL, IP pessoal, URL privada assinada, CPF, e-mail completo, idempotency key inteira ou validação interna sensível.

| HTTP | Código público sugerido | Uso típico |
|---|---|---|
| 400 | `INVALID_REQUEST` | JSON ausente/malformado; dado impossível; assinatura de webhook ausente |
| 401 | `UNAUTHENTICATED` | sessão inexistente/revogada ou MFA ainda não concluído |
| 403 | `FORBIDDEN`, `CSRF_INVALID`, `STEP_UP_REQUIRED` | ação negada por role/recurso, origem/CSRF ou autenticação recente |
| 404 | `RESOURCE_NOT_FOUND` | inexistente **ou fora do escopo do titular** |
| 409 | `IDEMPOTENCY_CONFLICT`, `STATE_CONFLICT` | chave de mesmo escopo com fingerprint diferente; estado incompatível |
| 422 | `BUSINESS_RULE_REJECTED`, `OUT_OF_STOCK` | pedido/cotação não elegível, estoque insuficiente, prazo expirado |
| 429 | `RATE_LIMITED` | volume abusivo; usar `Retry-After` quando apropriado |
| 503 | `DEPENDENCY_UNAVAILABLE` | DB/Stripe indisponível e resposta sem sucesso inventado |

**Nota:** 503 ao criar Checkout não significa que não existiu cobrança externa. A resposta deve preservar idempotência e eventual estado `PENDING`/reconciliação, nunca incentivar nova chave de pagamento depois de timeout incerto.

## Contrato `Idempotency-Key`

- Obrigatória em `POST /api/v1/checkouts`, `POST /api/v1/admin/refund-requests`; pode ser exigida em outras mutações após desenho específico.
- Chave aleatória de cliente com tamanho e charset limitados (sugestão 16–128 chars ASCII seguros), não exposta em logs completos. Backend vincula **ator/escopo + operação + chave + hash canônico de request**, armazena tentativa e resultado.
- Mesmo escopo/chave/fingerprint: reproduzir status/referência/estado já persistidos ou resultado sem repetir efeito. Se operação antes pendente, retornar a mesma referência atualizada; não prometer resposta byte a byte imutável quando recurso evolui.
- Mesmo escopo/chave com fingerprint diferente: `409` sem segundo efeito; mesma chave de outro ator/operador não colide globalmente, mas precisa de autorização e isolamento de tenant/conta.
- Timeout entre commit e Stripe: reusar **mesma intenção de pagamento e idempotency key externa por tentativa**, consultar estado externo quando indeterminado; não duplicar Checkout Session nem refund por retry.
- Uma chave Stripe expirada/rejeitada não retira a obrigação de unicidade **local**. Retenção local deve cobrir o período de risco, definida com testes e política de dados; valor ainda não arbitrado.

## `requestId` e retry

A API gera/normaliza request ID confiável, não aceita cabeçalho arbitrário como autoridade de auditoria. `Retry-After` para 429/503 quando cabível, com jitter no cliente e limites; **não** repetir automaticamente uma mutação de alto risco com chave nova. Logs restritos recebem `correlationId`/`causationId` sem payload sensível. Idempotência ≠ exactly once do broker ou do PSP.

## Contratos de entrada

Bloquear `Content-Type` errado em endpoints sensíveis, limitar body, verificar `Origin`/CSRF em cookie state-changing, e validar corpo bruto Stripe **antes** de JSON/parsing de eventos; falhas de parser/sig não gravam captura. [CT-04](CT-04-sessoes-csrf-e-webhook.md) e [CT-05](CT-05-eventos-duraveis.md).

**Referências:** [HTTP Semantics](https://httpwg.org/specs/rfc9110.html), [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457), [ADR-004](../../04-architecture/adrs/ADR-004-psp-sandbox.md), [ADR-006](../../04-architecture/adrs/ADR-006-acesso-dados.md).
