# QTE-POL-06 — Delta candidato de QuoteResult e testes contratuais

**15/10/2026 · Estratégia A RATIFICADA; especificação estrutural incompleta.**
Documento separado conforme [ADR-012 / ADR-QTE](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md).
**Não é patch aplicável ou schema ativo.** O YAML normativo permanece intacto
enquanto `estimate`, tipos/limites internos e versão contratual não forem decididos.

## Diferença entre shape ativo e estrutura aprovada

| Elemento                      | OpenAPI ativo                                                         | Evolução conceitual ratificada                                           | Detalhe ainda por fechar                                                                                   |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| QuoteRequest                  | items, couponCode?, shippingAddressId?; objeto fechado                | Preservar formato mínimo, sem preço/owner/opção enviados como autoridade | Demonstrar incompatibilidade antes de propor alteração; validar endereço físico por titular                |
| QuoteResult                   | quoteId, expiresAt, total obrigatórios; note opcional; objeto fechado | Preservar existentes e acrescentar subtotal e delivery sempre presentes  | Versão de contrato e compatibilidade de consumidores                                                       |
| subtotal                      | Ausente                                                               | Money BRL, centavos inteiros, calculado no servidor                      | Limites exatos coerentes com contrato monetário final e implementação                                      |
| delivery                      | Ausente                                                               | null exclusivamente digital; objeto em físico/misto                      | Regras condicionais de composição dependem de domínio/snapshot confiável                                   |
| optionId, label, simulated    | Ausentes                                                              | Identificação e rótulo da única opção simulada                           | Tipo/limites/valores; no simulador `simulated` identifica a simulação, sem transformá-lo em selo comercial |
| amount                        | Ausente                                                               | Money BRL/centavos, custo de entrega do servidor                         | Tabela/tarifa e limites comerciais ainda não aprovados                                                     |
| estimate                      | Ausente                                                               | Condições estruturadas para apresentação antes do aceite                 | Forma definitiva, obrigatoriedades, min/max, dayBasis, startsAtEvent, vocabulários, calendário e prazos    |
| shippingAddressId             | Apenas entrada opcional                                               | Referência da seleção persistida e pertencente ao titular                | Sem autorização pelo ID; não retornar endereço completo                                                    |
| addressVersion, policyVersion | Ausentes                                                              | Vincular condições à versão aceita de endereço/política                  | Representação, limites e estratégia de evolução/versionamento                                              |

Os nomes de campos conceituais são os aprovados; exemplos anteriores de `estimate`
em QTE-POL-04 continuam ilustrativos. Não preencher a lacuna com objeto arbitrário,
string livre, enum inventado ou `additionalProperties: true` para antecipar o YAML.

## Delta textual candidato — não aplicar

```text
components.schemas.QuoteResult:
  conservar quoteId, expiresAt, total, note e additionalProperties: false
  acrescentar subtotal à lista required e às properties (Money existente)
  acrescentar delivery à lista required:
    null OU objeto de entrega estruturado
  objeto de entrega inclui:
    optionId, label, simulated, amount (Money), estimate,
    shippingAddressId, addressVersion, policyVersion
  BLOQUEADO: fechar tipos, required internos, limites e schema estimate

POST /api/v1/checkout/quotes:
  conservar request, rota, parâmetros e respostas ativas
  200 usa QuoteResult evoluído somente após aprovação estrutural/compatibilidade
  404 RESOURCE_NOT_FOUND: candidato separado, não aplicado nem ratificado aqui
```

Não acrescentar endpoint de descoberta, `phase`, `selectionSetId` ou
`deliveryOptionId` ao MVP. B/C são somente histórico. Aceitar quoteId vincula a
única opção apresentada e persistida; se houver múltiplas opções, bloquear até
nova aprovação contratual. O browser não escolhe valores monetários ou prazos.

Invariantes de domínio, que JSON Schema isolado não comprova:

- Físico/misto: `subtotal.amountCents + delivery.amount.amountCents = total.amountCents`;
  mesma moeda BRL, inteiros sem overflow, endereço próprio e versão/política vigentes.
- Digital: delivery null, total=subtotal; nenhum port de entrega/reserva física.
- Quote válida por dez minutos no relógio DB; revalidar após locks antes da nova
  intenção; snapshots não mudam silenciosamente e quote não reserva estoque.
- Uma intenção comercial por quote, incluindo disputa de chaves distintas;
  retries do mesmo ator/operação/chave/fingerprint recuperam resultado persistido.
- UXD-16 pertence a CheckoutResult, não a este delta: presença obrigatória e
  timestamp real físico/misto ou null digital, sem homologar pagamento.

## HTTP e consumidores

Hoje quotes declara 200/400/401/403/422/429/503. CT-03 sugere 404 para inexistente
ou fora do escopo: mapear endereço/quote alheios uniformemente é necessário ao
desenho, mas **adicionar a resposta 404 continua proposta**. Não inferir novo erro,
parâmetro ou resposta 409 em quotes; avaliar conflitos na operação de checkout
existente. Preservar RFC9457, redaction, no-store, Identity, CSRF/Origin e rate limits.

Adicionar campos pode quebrar consumidores que validam o antigo schema fechado.
Antes de aplicar: inventariar consumidores reais (sem presumir implantação), fechar
versão/migração, ensaiar leitura nova/antiga e gerar DTOs somente do contrato aprovado.
Não afrouxar schema global para fazer um consumidor passar. Se precisar coexistir,
aprovar plano explícito de rollout/versionamento; rollback de app não deve remover
snapshots/evidência durável. Nenhum consumidor foi alterado nesta entrega.

## Matriz contratual planejada — nenhuma execução

IDs ADR-QTE-CT são locais deste documento, sem renumerar API-001–030 ou QTE/ORD.

| Caso          | Estímulo / resultado esperado                                                                               | Relação existente              | Camada de prova futura                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------- |
| ADR-QTE-CT-01 | Físico/misto com subtotal, delivery completo e soma exata → aceita                                          | API-004/005                    | Schema fechado + domínio PostgreSQL                                  |
| ADR-QTE-CT-02 | Digital com delivery null e total=subtotal → aceita; frete fictício → recusa                                | API-005/010, UXD-16 preservada | Schema + prova de ausência de chamada delivery/Inventory             |
| ADR-QTE-CT-03 | subtotal/delivery ausentes, Money inválido, moeda diversa, fração ou campo extra → recusa                   | API-003/004/029                | Validador existente após fechamento de schema                        |
| ADR-QTE-CT-04 | Estimate incompleto/inválido, versão/tipo inválido → recusa                                                 | API-003/029                    | BLOQUEADO até decidir tipos/vocabulário; não criar fixture normativa |
| ADR-QTE-CT-05 | Endereço/quote de outro titular, ID forjado ou conta revogada → negativa sem vazamento                      | API-012/013/017/027            | HTTP/ownership; 404 depende do delta aprovado                        |
| ADR-QTE-CT-06 | Preço/publicação/kit/endereço/política muda ou TTL vence esperando lock → recota/rollback                   | API-005/007/011                | PostgreSQL real, conexões independentes                              |
| ADR-QTE-CT-07 | Mesma intenção replay; duas chaves para mesma quote; timeout ambíguo → um efeito e recuperação              | API-008/009/028                | Constraint/locks/crash/restart; sem simular exactly-once externo     |
| ADR-QTE-CT-08 | Cliente antigo valida resposta nova e inverso → incompatibilidade identificada e migração testada           | API-029                        | Testes de consumidor e versão contratual                             |
| ADR-QTE-CT-09 | Frete/owner/preço injectados ou CSRF/Origin inválidos → recusa; DB indisponível → 503 sem sucesso inventado | API-003/004/013/027/030        | HTTP/segurança/indisponibilidade                                     |

Para aplicação futura: fechar pendências com responsável → revisar CT/OpenAPI →
parse YAML/OpenAPI 3.1, resolver refs e validar instâncias positivas/negativas com
ferramentas disponíveis → testes de consumidor/domínio → autorização separada
de implementação. Este documento não declara esses testes executados ou schema
inteiro homologado.
