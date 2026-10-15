# QTE-POL-04 — Contratos HTTP propostos

**15/10/2026 · PROPOSTO · OpenAPI ativo preservado integralmente.** DTOs e estados
abaixo são candidatos para ratificação; nenhum endpoint foi criado ou ativado.

## Contrato inspecionado e lacunas

O [OpenAPI v1](../contracts/openapi/atlas-commerce-api-v1.yaml) descreve
`POST /api/v1/checkout/quotes`, resposta 200 `QuoteResult`; erros declarados
400/401/403/422/429/503. `QuoteRequest` exige `items` (1–100 linhas,
`productId`/quantidade inteira 1–9999), permite `couponCode?` e
`shippingAddressId?`, rejeita propriedades extras. `QuoteResult` exige `quoteId`,
`expiresAt`, `total: Money` BRL; `note` é opcional, também sem propriedades extras.
`CheckoutRequest` contém apenas `quoteId`; checkout exige `Idempotency-Key`.

A [aplicação local](../../../apps/api/src/modules/quotes/application/checkout-quotes.ts)
não tem controller público: recebe ator/política/opção de ports `TEST_ONLY` do
servidor. Cupom presente, inclusive vazio, é explicitamente recusado; isso não
implementa a futura política de cupons. O contrato não permite informar opção,
descobrir alternativas ou ler frete/prazo estruturados. `note` livre não substitui
condições de entrega verificáveis. ID de endereço não prova titularidade.

## Alternativas de fluxo e compatibilidade

| Estratégia candidata                                             | DTOs e estados candidatos                                                                                                    | HTTP/erros e idempotência                                                                                                                                       | Consequência UX e compatibilidade                                                                                                                                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — uma opção simulada por destino                               | Manter QuoteRequest; ampliar QuoteResult com `delivery` detalhado ou null e subtotal; quote emitida, desatualizada, expirada | 200 somente quote final válida; erros atuais; emissão sem chave obrigatória, limites contra abuso; checkout com chave existente                                 | Menor delta; UI mostra a única opção, preço/prazo e aceita a seleção ao confirmar quote. Não simula comparação quando só existe uma opção. Campos adicionais exigem revisão coordenada porque o schema atual é fechado |
| B — consulta e seleção em duas fases na rota de quotes existente | Discriminador candidato `phase: DELIVERY_OPTIONS                                                                             | FINAL_QUOTE`; entrada final com referência de seleção; resultado de opções distinto de QuoteResult                                                              | 200 com union explícita, jamais quote sem total disfarçada de QuoteResult; erros atuais e candidatos 404/409; emissão final opcionalmente deduplicada, checkout sempre idempotente                                     | Permite comparar e selecionar; muda semântica/shape, precisa versionamento ou migração contratual aprovada. Não se pode enviar `phase` hoje |
| C — recurso de consulta separado, seguido de quote final         | Request de opções com itens/endereço; resposta lista ofertas; QuoteRequest candidato ganha referência da opção               | Path, método e inventário **a definir por aprovação**, sem criar rota neste documento; 200 de opções não é pedido; falhas sem reserva, ownership nas duas fases | Separação mais clara para múltiplas opções, mas amplia superfície e testes. Nenhuma URL nova foi inferida; contratos de endereço também continuam separados                                                            |

**QTE-DEC-006, PROPOSTO:** A para o MVP de tarifa fixa e uma opção por zona.
O responsável ainda precisa aceitar explicitamente essa simplificação de escolha.
Para múltiplas opções, preferir C numa revisão própria, depois de definir contrato
de descoberta e compatibilidade. B é viável, mas sobrecarrega a operação atual.
Nenhuma das alternativas autoriza o browser a enviar preço, prazo ou owner.

## DTO mínimo de A — delta candidato, não OpenAPI aplicado

```text
QuoteRequest: shape atual preservado.
QuoteResult candidato:
  quoteId, expiresAt, total, note?                  // existentes
  subtotal: Money                                 // novo, servidor
  delivery: null | {
    optionId, label, simulated: true,
    amount: Money,
    estimate: { minDays, maxDays, dayBasis, startsAtEvent },
    shippingAddressId, addressVersion, policyVersion
  }
CheckoutRequest: { quoteId }                       // existente
```

`Money` usa BRL/centavos inteiros; nenhuma quantia ou intervalo concreto é definido
aqui. Vocabulário de `dayBasis`/`startsAtEvent` depende da política de prazo ainda
aberta. Físico/misto exige objeto de entrega completo; digital exige null, sem
consultar entrega. `subtotal + delivery.amount = total` quando físico; digital
usa total=subtotal, sem apresentar frete promocional. Não enviar endereço completo
no resumo, nem tratar policyVersion como autoridade recebida do cliente.

O endereço selecionado passa pelo port autorizado; o servidor emite a quote com
a opção elegível. O consumidor exibe custo e condições antes do botão de confirmação.
Confirmar o `quoteId` significa aceitar a opção mostrada e persistida; se houver
mais de uma opção, A não pode escolher silenciosamente pelo cliente: bloquear
essa composição até a aprovação do fluxo B/C. Não acrescentar booleano de aceite
ou parâmetro de opção ao contrato atual por conveniência da implementação.

Delta candidato OpenAPI: incluir subtotal/delivery com validações físico/digital,
schemas de condições e obrigatoriedades; documentar titularidade e pré-condição de
endereço físico; exemplos DEMO identificados somente depois de aprovados. Validar
clientes antigos/novos: `additionalProperties: false` pode rejeitar mesmo adição
de campo. Nenhuma versão implantada é presumida; rollout/versionamento e testes
de consumidor precisam preceder a implementação pública.

## DTOs de descoberta B/C — alternativa futura

```text
DeliveryOptionsRequest candidato: { items, shippingAddressId }
DeliveryOptionsResult candidato: {
  selectionSetId, expiresAt,
  options: [{ optionId, label, amount: Money, estimate, simulated }]
}
FinalQuoteRequest candidato: {
  items, shippingAddressId, selectionSetId, deliveryOptionId, couponCode?
}
FinalQuoteResult candidato: QuoteResult ampliado de A com a seleção congelada.
```

Esses nomes não são novos DTOs públicos ativos. B acrescentaria `phase` ao
request/union da operação existente; C definiria transporte da descoberta em
revisão específica. A referência de seleção deve ser opaca e resolvida pelo
servidor, vinculada a ator, itens canônicos, endereço/versão e política/validade.
Ela não é bearer token de autorização nem prova de pagamento. Ofertas são
recalculadas na emissão final e depois no checkout; valores divergentes exigem
nova apresentação/aceite, sem cobrar preço diferente do visto.

Estados técnicos candidatos: consultando → opções elegíveis → seleção → quote
emitida → revalidação; desvios sem opções, seleção vencida, quote vencida ou
desatualizada, dependência indisponível. Não são estados novos de SM-01/SM-02.
A lista vazia pode representar destino legitimamente não atendido com mensagem
clara; nunca produzir quote final física com total/frete incompletos. Falha de
dependência não deve virar lista vazia de sucesso.

TTL da descoberta é decisão adicional pendente: recomenda-se não superar o TTL
da quote e sempre revalidar; não definir minutos extras como aprovados. Consultar
opções/emitir quote não reserva estoque. A chave de checkout vincula a quote final,
não a consulta; repetir consulta pode produzir novas ofertas sem efeito financeiro.

## Negativas e segurança HTTP

| Condição                                                                           | Mapeamento candidato, conforme CT-03                                           | Delta necessário                                                                          |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| JSON inválido, dinheiro/owner injetado, opção desconhecida estruturalmente         | 400 `INVALID_REQUEST`                                                          | Rejeição estrita; não refletir entrada sensível                                           |
| Sessão inválida ou conta não habilitada                                            | 401 `UNAUTHENTICATED` ou recusa de elegibilidade conforme contrato Identity    | Sem fixture como fallback comercial                                                       |
| CSRF/Origin inválidos, ação sem permissão                                          | 403 `CSRF_INVALID` / `FORBIDDEN`                                               | Preservar CT-04/Identity                                                                  |
| Endereço/quote/seleção alheios ou inexistentes                                     | 404 `RESOURCE_NOT_FOUND` uniforme                                              | **Adicionar 404 à operação de quotes requer aprovação**; atualmente não declarada         |
| Quote/seleção expirada, preço/publicação/entrega mudou, kit inelegível             | 422 `BUSINESS_RULE_REJECTED`; estoque insuficiente no checkout: `OUT_OF_STOCK` | Preservar códigos CT-03, mensagem genérica; recotar explicitamente                        |
| Mesma chave de checkout com payload diferente, quote já vinculada a outra intenção | 409 `IDEMPOTENCY_CONFLICT` / `STATE_CONFLICT`                                  | Checkout existente prevê conflitos; descoberta B/C precisaria documentá-los se aplicáveis |
| Abuso, DB/serviço indisponível                                                     | 429 `RATE_LIMITED`, 503 `DEPENDENCY_UNAVAILABLE`                               | Limites e retry seguro, sem total fictício                                                |

Não inventar códigos normativos novos. Problemas usam RFC 9457,
`application/problem+json`, request ID e ausência de PII/SQL/segredos. Conta
obrigatória, cookies/origens/CSRF e TLS precisam estar homologados para habilitar
o fluxo; CORS não substitui autorização. Respostas privadas `no-store`; cliente
não mantém PII/totais como autoridade. Checkout 201/202 é assunto de CT-10, não
resultado de descoberta de frete; 202 não torna pagamento pronto.

Aceitação QTE-POL-T04 planejada: schemas positivos/negativos, cliente antigo
com resposta ampliada, digital sem entrega, endereços alheios, referências
adulteradas/vencidas, custos divergentes, origem/CSRF/cookies, 429/503 e redaction.
Preservar os 30 IDs API-001–030; novas variações precisam de rastreabilidade, não
renumeração. Nenhum teste HTTP comercial foi executado nesta tarefa.

Referências: [CT-01](../contracts/CT-01-inventario-http.md),
[CT-02](../contracts/CT-02-dtos-validacao.md),
[CT-03](../contracts/CT-03-erros-e-idempotencia-http.md),
[CT-04](../contracts/CT-04-sessoes-csrf-e-webhook.md),
[CT-06](../contracts/CT-06-autorizacao-por-recurso.md),
[CT-08](../contracts/CT-08-cenarios-validacao-api.md),
[CT-10](../contracts/CT-10-migracao-embedded-checkout-proposta.md).
