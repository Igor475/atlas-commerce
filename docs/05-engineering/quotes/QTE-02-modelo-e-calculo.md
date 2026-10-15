# QTE-02 — Modelo e cálculo

| Persistência                           | Invariante                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `fixture_customer`/`fixture_principal` | Ator artificial TEST_ONLY vinculado à role de sessão ativa                          |
| `fixture_address`                      | Endereço artificial com owner, zona TEST_ONLY e completude/elegibilidade explícitas |
| `fixture_physical`                     | Atributos físicos artificiais por componente; sem fallback ou alteração de Catalog  |
| `fixture_policy`                       | Versão, TTL e condições TEST_ONLY definidos pelos testes; sem defaults comerciais   |
| `quote`                                | ISSUED_TEST_ONLY, BRL, ator, itens/composição/preços, versão, total e tempos DB     |
| `line_snapshot`                        | Produto/edição, quantidade, valor unitário/subtotal, revisão Pricing, editorial/kit |
| `delivery_selection`                   | Condições e endereço artificial congelados, somente se há físico                    |
| `orders.quote_evidence`                | Cotação vinculada à preparação, total/entrega e prova de transação                  |

`orders.quote_binding` vincula a ponte ao ator/cotação; `orders.quote_validation`
registra a revalidação no XID da transação. São privados, imutáveis e exigidos
pelo trigger de intenção nova para impedir desvio pelo port legado.

FKs, PKs, índice por titular e CHECKs protegem referências e valores. Triggers
rejeitam UPDATE/DELETE de snapshots emitidos, entrega e evidência Orders. Roles
runtime não recebem DML bruto. Fixtures são configuráveis apenas pelo harness.

Quantidades inteiras 1–9999, até 100 linhas; duplicatas são consolidadas e o
limite reaplicado. Preços positivos vêm somente de Pricing. Zero não é admitido
como gratuidade comercial. `couponCode`, inclusive vazio, é recusado explicitamente.
Campos de preço, desconto, total, owner ou estado enviados pelo cliente são
recusados. SQL é parametrizado e entradas JSON também são validadas no banco.

Subtotais = quantidade × preço unitário; subtotal-base = soma das linhas. Kit
usa o preço próprio, com componentes congelados. Intermediários SQL usam numeric
exato; persistência usa BIGINT, limitado a 9.007.199.254.740.991 centavos para
interoperabilidade segura com JavaScript. Overflow de linha, soma, entrega ou
total recusa a operação inteira, sem cotação parcial.

Em digital, `delivery_cents IS NULL` representa entrega **inaplicável**. Não é
frete grátis nem desconto. Total = subtotal-base nesse ramo. Em físico/misto,
total só existe depois de selecionar e validar entrega; total = base + entrega.
Não há cupom, desconto fictício ou tarifa promovida a configuração normal.

Projeção interna compatível com `QuoteResult`: `quoteId`, `expiresAt`, `total`
e `note` TEST_ONLY. Itens de entrada usam `productId` como `QuoteRequest`. Não
foram acrescentados campos públicos de frete/opção. A opção vem do port confiável
de política do servidor; a escolha comercial do usuário e seu contrato futuro
continuam pendentes. Não houve mudança no OpenAPI/CT normativo.
