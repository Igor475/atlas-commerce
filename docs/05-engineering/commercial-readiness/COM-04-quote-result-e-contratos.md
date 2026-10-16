# COM-04 — QuoteResult e contratos candidatos

**PROPOSTO PARA RATIFICAÇÃO · 16/10/2026.** Estratégia A ratificada por [ADR-012](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md); os tipos, limites e enums novos abaixo são candidatos. Nenhum delta foi aplicado ao [OpenAPI ativo](../contracts/openapi/atlas-commerce-api-v1.yaml).

## Delta formal candidato

Documento OpenAPI 3.1 autossuficiente apenas para revisar componentes; `paths: {}` não cria endpoint. Após ratificação, o delta seria substituir QuoteResult e acrescentar QuoteDelivery/DeliveryEstimate. Money e OpaqueId abaixo reproduzem os existentes. A versão do exemplo identifica o artefato documental, não anuncia uma nova versão pública da API.

```yaml
openapi: 3.1.0
info:
  title: Atlas Commerce — delta QuoteResult candidato COM-01
  version: 0.4.0-com01-candidate
x-atlas-status: PROPOSTO_NAO_RATIFICADO_NAO_IMPLEMENTADO
paths: {}
components:
  schemas:
    OpaqueId:
      type: string
      minLength: 8
      maxLength: 128
      description: ID opaco, não uma autorização; formato físico a confirmar.
    Money:
      type: object
      additionalProperties: false
      required: [currency, amountCents]
      properties:
        currency:
          type: string
          const: BRL
        amountCents:
          type: integer
          format: int64
          minimum: 0
          description: Inteiro em centavos; não aceitar float.
    DeliveryEstimate:
      type: object
      additionalProperties: false
      required: [minDays, maxDays, dayBasis, startsAtEvent]
      properties:
        minDays:
          type: integer
          minimum: 1
          maximum: 60
        maxDays:
          type: integer
          minimum: 1
          maximum: 60
        dayBasis:
          type: string
          enum: [BUSINESS_DAYS, CALENDAR_DAYS]
        startsAtEvent:
          type: string
          const: PAYMENT_CONFIRMED
    QuoteDelivery:
      type: object
      additionalProperties: false
      required:
        - optionId
        - label
        - simulated
        - amount
        - estimate
        - shippingAddressId
        - addressVersion
        - policyVersion
      properties:
        optionId:
          type: string
          minLength: 6
          maxLength: 48
          pattern: "^demo-[a-z0-9]+(?:-[a-z0-9]+)*$"
        label:
          type: string
          minLength: 1
          maxLength: 80
        simulated:
          type: boolean
          const: true
        amount:
          $ref: "#/components/schemas/Money"
        estimate:
          $ref: "#/components/schemas/DeliveryEstimate"
        shippingAddressId:
          $ref: "#/components/schemas/OpaqueId"
        addressVersion:
          type: integer
          format: int32
          minimum: 1
          maximum: 2147483647
        policyVersion:
          type: integer
          format: int32
          minimum: 1
          maximum: 2147483647
    QuoteResult:
      type: object
      additionalProperties: false
      required: [quoteId, expiresAt, total, subtotal, delivery]
      properties:
        quoteId:
          $ref: "#/components/schemas/OpaqueId"
        expiresAt:
          type: string
          format: date-time
        total:
          $ref: "#/components/schemas/Money"
        subtotal:
          $ref: "#/components/schemas/Money"
        delivery:
          oneOf:
            - $ref: "#/components/schemas/QuoteDelivery"
            - type: "null"
        note:
          type: string
          description: Cotação não garante saldo nem dispensa revalidação no checkout.
      examples:
        - quoteId: 00000000-0000-4000-8000-000000000001
          expiresAt: "2026-10-16T15:10:00Z"
          subtotal: { currency: BRL, amountCents: 1000 }
          total: { currency: BRL, amountCents: 2290 }
          delivery:
            optionId: demo-standard
            label: Entrega simulada Atlas
            simulated: true
            amount: { currency: BRL, amountCents: 1290 }
            estimate:
              minDays: 3
              maxDays: 5
              dayBasis: BUSINESS_DAYS
              startsAtEvent: PAYMENT_CONFIRMED
            shippingAddressId: 00000000-0000-4000-8000-000000000002
            addressVersion: 1
            policyVersion: 1
        - quoteId: 00000000-0000-4000-8000-000000000003
          expiresAt: "2026-10-16T15:10:00Z"
          subtotal: { currency: BRL, amountCents: 1000 }
          total: { currency: BRL, amountCents: 1000 }
          delivery: null
```

Exemplos são **CANDIDATO DEMO — NÃO RATIFICADO**, com IDs sintéticos. `optionId` é ID versionável do simulador, não ID Stripe; prefixo demo restringe este candidato e não define contrato de transportadora futura. Label deve ser texto não vazio após trim, sem controles; isso requer validação de domínio além de minLength. Enums/limites de 60 dias e inteiros int32 dependem de aprovação expressa.

Validação semântica futura: digital puro → delivery null e total=subtotal; físico/misto → delivery completo e total=subtotal+amount; minDays<=maxDays; versões/ID pertencem ao titular e à política ativa; expiresAt UTC/RFC3339 é validade de quote, não reserva/Session; todos os cálculos permanecem em inteiros seguros. JSON Schema não demonstra essas relações entre campos ou consulta estado de banco.

Money conserva `minimum: 0` e não ganha máximo global neste delta. O domínio deve recusar valores fora de sua capacidade segura; zero estrutural não aprova checkout gratuito, desconto ou produto gratuito. Não aceitar valores do cliente como autoridade. QuoteRequest não recebe preço/total/optionId novos; couponCode existente no contrato não habilita cupom no backend atual.

## Compatibilidade e rollout

QuoteResult ativo exige apenas quoteId/expiresAt/total e é fechado. Acrescentar subtotal/delivery pode quebrar consumidores com `additionalProperties: false`; torná-los obrigatórios também quebra produtores antigos. [CT-07](../contracts/CT-07-versionamento-e-compatibilidade.md) não permite presumir compatibilidade só por ser adição.

Proposta: inventariar consumidores e schemas gerados; ratificar detalhes; executar fixtures antigas/novas e testes de serialização; coordenar publicação/rollback. Se comprovadamente não houver consumidor comercial afetado, mudança coordenada no contrato candidato v1 pode ser avaliada. Se houver incompatibilidade de consumidor implantado, decidir versionamento separado antes da alteração; não inventar rota v2 nem fase de resposta parcial que viole o schema aprovado. Não publicar o YAML ativo por esta tarefa.

## HTTP: contrato atual versus proposta

[CT-03](../contracts/CT-03-erros-e-idempotencia-http.md) define ProblemDetails sem dados sensíveis. A existência de uma resposta no YAML não comprova controller em execução.

| Superfície                      | Atualmente declarado                                                                 | Mapeamento candidato e observações                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST /api/v1/checkout/quotes    | 200, 400, 401, 403, 422, 429, 503                                                    | 400 INVALID_REQUEST para estrutura; 401 UNAUTHENTICATED; 403 CSRF_INVALID/FORBIDDEN; 422 BUSINESS_RULE_REJECTED para condição conhecida inelegível; 429 RATE_LIMITED; 503 DEPENDENCY_UNAVAILABLE quando condição obrigatória não pode ser verificada. **404 RESOURCE_NOT_FOUND continua PROPOSTO** em QTE-POL-06 para endereço ausente/estrangeiro uniformemente. Sem adicionar 409 automaticamente. |
| Quatro operações de endereços   | Não existem no OpenAPI ativo                                                         | Sucessos em COM-03; 400/401/403/404 uniforme/409 IDEMPOTENCY_CONFLICT ou STATE_CONFLICT/422/429/503 propostos conforme operação. GET não exige CSRF nem Idempotency-Key e não produz conflito de versão de escrita.                                                                                                                                                                                  |
| POST /api/v1/checkouts          | 201/202 e 400/401/403/409/422/429/503                                                | 409 IDEMPOTENCY_CONFLICT para mesma chave/outro fingerprint; STATE_CONFLICT para quote consumida por outra intenção autorizada. 422 BUSINESS_RULE_REJECTED para quote expirada/stale e OUT_OF_STOCK para saldo insuficiente. Após intenção durável, resposta PSP incerta deve recuperar mesma intenção e projetar 202/reconciliação conforme CT-10; não usar 503 para induzir nova compra.           |
| GET /api/v1/me/orders/{orderId} | Consulta privada declarativa, 200 e 404, com erros de autenticação/abuso/dependência | Titular somente; ausente/estrangeiro indistinguíveis. Estado vem do servidor; no-store. Nenhuma rota implementada aqui.                                                                                                                                                                                                                                                                              |
| Dependência indisponível        | 503 DEPENDENCY_UNAVAILABLE onde previsto                                             | Antes de existir intenção, recusa sem efeitos. Depois de commit, resultado persistido e recuperação prevalecem; timeout externo não prova falha de pagamento.                                                                                                                                                                                                                                        |

Antienumeração não dispensa autenticação: cliente sem sessão recebe 401; 403 é falha CSRF ou ação proibida após contexto válido; não revelar ownerId, saldo de terceiros, endereço ou existência de outra intenção. Campo desconhecido/mass assignment → 400, nunca ignorar preço adulterado para efetivar operação inesperada. Mapeamento de conflito por quote exige aprovação antes do HTTP público, sem mudar a unicidade já comprovada.

## Casos futuros — PLANEJADOS, não executados como API

| ID novo    | Prova e resultado esperado                                                                                                                                 | Rastreabilidade                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| COM-CT-001 | Quote físico/misto exige oito campos de delivery; digital exige null e igualdade dos valores no domínio                                                    | QTE-POL-06, RN-017/055           |
| COM-CT-002 | Campo ausente/extra, enum errado, string vazia, decimal/negativo, versão fora do limite e datas inválidas são recusados; minDays>maxDays recusa no domínio | CT-02, SEC-010                   |
| COM-CT-003 | IDs de endereço estrangeiro/ausente têm resposta uniforme; lista/cursor jamais cruza titular                                                               | CT-06, SA-001                    |
| COM-CT-004 | Mutação sem sessão, Origin ou CSRF não produz revisão/reserva/intenção                                                                                     | CT-04, SEC-001/011               |
| COM-CT-005 | Edições concorrentes com expectedVersion igual: um vencedor, um conflito; replay não cria revisão                                                          | CP, CT-03                        |
| COM-CT-006 | Quote vencida, policyVersion/addressVersion stale, kit incompleto ou estoque insuficiente não cria efeitos parciais                                        | API-001–030 aplicáveis, PC-01/04 |
| COM-CT-007 | Mesma quote por chaves distintas produz uma intenção; mesma chave/corpo recupera resultado; ator alheio não acessa                                         | QUSE, SEC-019                    |
| COM-CT-008 | Timeout após commit retorna/recupera mesma intenção, sem nova sessão/pedido; 202 não declara PAID                                                          | CT-10, SEC-024                   |
| COM-CT-009 | Consumidor estrito antigo recusa payload novo: rollout identifica incompatibilidade antes de publicação                                                    | CT-07                            |
| COM-CT-010 | Respostas/cache/logs não vazam PII, chave, sessão ou clientSecret; rate limit não altera titularidade                                                      | SEC-015/028/030                  |

IDs API-001–030 permanecem intactos e planejados conforme CT-08. Validação estática dos exemplos/schema deste documento não equivale a executar esses casos HTTP, provas de concorrência ou Test Mode. [COM-D04/09](COM-07-decisoes-e-roadmap.md) permanecem PENDENTES.
