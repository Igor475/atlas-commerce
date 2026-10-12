# DB-01 — Modelo lógico de dados, identidade e ownership

> **Status:** especificação de agregados e relações, sem schema físico e sem qualquer migration executada.

## Agregados propostos e fronteiras

| Autoridade | Agregados/entidades lógicas | Integridade principal | Cuidado |
|---|---|---|---|
| Identity | `Account`, `Credential`, `Session`, `MfaFactor`, `RecoveryChallenge` | sessão opaca hashed, estado de conta, um uso e unicidade da credencial | contas humanas nunca equivalem a credencial técnica |
| Catalog | `Work`, `Edition`, `Product`, `KitComposition`, `LicensedAsset` | SKU/edição, publicação, composição versionada | versões de licença por edição, mídia privada |
| Pricing | `Price`, `Promotion`, `CouponUse` | preço em centavos, validade, limite/cupom por transação | cotação derivada do servidor |
| Inventory | `StockBalance`, `StockLedgerEntry`, `Reservation`, `ReservationLine` | guardas de saldo, exclusão de oversell e unicidade do efeito | depósito lógico único MVP |
| Orders | `Order`, `OrderLineSnapshot`, `KitComponentSnapshot`, `CheckoutRequest` | snapshot imutável, idempotência `(actor,operation,key)` + fingerprint | PII e endereço snapshot |
| Payments | `PaymentAttempt`, `ProviderEvent`, `Capture`, `RefundOperation`, `RefundAllocation` | IDs Stripe únicos, dedup, saldo capturado/pending/succeeded | moeda BRL cents, não PAN/CVV |
| Library | `Entitlement`, `DigitalAsset`, `DigitalAccessAudit` | acesso por titular, componente/obra/licença, origem da compra | URL assinada não é direito persistente |
| Fulfillment/Support | `Shipment`, `ShipmentComponent`, `ReturnCase`, `Inspection` | kit físico não se marca completo sem todos componentes | estoque só reposto após inspeção |
| Integration/Audit | `OutboxMessage`, `InboxReceipt`, `AuditEntry` | evento/consumidor, entrega recuperável, dedup | minimização PII, sem tokens |

## Chaves e constraints a avaliar na futura DDL

1. **PK/FK:** IDs opacos estáveis; FK da linha snapshot para pedido; `reservation_line` → reserva e SKU; refund → captura; entitlement → linha/componente/titular e licença; auditoria com referência sem tornar dado sensível público.
2. **Unicidades:** `(actor_id, operation, idempotency_key)` para checkout (mais fingerprint de entrada e resposta persistidos); `(stripe_account, event_id)` por destino/ambiente; `(provider, external_payment_ref)` para captura; chave do refund no seu escopo; `(consumer, event_id)` no inbox; concessão digital única por `(source_purchase, component, recipient, license_version)` quando apropriado.
3. **CHECKs/índices:** valores `BIGINT` em centavos não negativos; quantidades positivas; `on_hand`, `reserved_active`, `allocated` não negativos e somados <= `on_hand`; montantes comprometidos em refund não excedem capturado; `expires_at` consistente; comparação de estados com atualização condicional.
4. **FK cross-módulo:** permitida onde necessária para integridade relacional, mas **a API do consumidor não manipula tabela alheia**. `schema` PostgreSQL por módulo é opcional, não requerido para o MVP.
5. **Deleção/retenção:** pedidos/capturas e trilha financeira não são apagados indiscriminadamente no exercício de direitos; dados pessoais podem ser anonimizados conforme finalidade/base legal/retenção aprovada.

## Snapshot e kits

`OrderLineSnapshot` contém produto/edição, SKU, quantidade, valor/discount/frete alocado, moeda e vínculo com kit. `KitComponentSnapshot` guarda componentes e quantidades fixados **no momento da compra**, independentemente do catálogo posterior. Para reserva, consolidar por SKU todas as unidades físicas do pedido (incluindo avulsos iguais a componentes de kit) antes da transação.

## Modelo de saldo (proposta única a provar)

- `on_hand`: unidades físicas presentes e ainda não expedidas, inclusive comprometidas/alocadas.
- `reserved_active`: compromissos de pedido não pago dentro do prazo, ainda não alocados.
- `allocated`: unidades pagas confirmadas, ainda não expedidas.
- `available = on_hand - reserved_active - allocated` (sem cache autoritativo).
- Uma expedição reduz `on_hand` **e** `allocated` na mesma operação idempotente. Devolução inspecionada pode aumentar `on_hand` mediante evento único.

Este modelo lógico é uma proposta, **não** indica que as colunas existam. O desenho deve provar invariantes contra ajustes manuais, cancelamentos e remessas parciais.

## Vistas

[ER-01 catálogo/pedidos/estoque](ER-01-catalogo-pedidos-estoque.md) · [ER-02 pagamentos/reembolsos](ER-02-pagamentos-reembolsos.md) · [ER-03 identidade/biblioteca](ER-03-identidade-biblioteca.md).
