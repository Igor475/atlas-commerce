# 04 — Dados e persistência: modelo lógico preliminar

> **Status:** entidades e ownership propostos; **não é schema Prisma/SQL, migrations ou especificação de colunas**. A decisão ORM vs SQL permanece aberta.

| Agregado/registro | Autoridade | Identidades/constraints propostas | Dados sensíveis / cuidado |
|---|---|---|---|
| `Account`, `Credential`, `Session`, `MfaFactor` | Identity | `account_id`, sessão revogável, fator único | Hash forte, segredo cifrado quando cabível, jamais plaintext em logs |
| `EditorialWork`, `Edition`, `Product`, `KitComposition` | Catalog | `product_id`, edição, status de publicação; composição versionada | Licenças e uploads de mídia protegidos |
| `PriceBook`, `Promotion`, `CouponReservation` | Pricing | validade/snapshot, uso limitado transacional por cupom | Não confiar em preço no browser |
| `StockMovement`, `StockBalance`, `StockReservation`, `ReservationLine` | Inventory | `(reservation_id, sku)`, prazo DB; ledger/idempotência, sem saldo negativo | Histórico rastreável por ajuste |
| `Order`, `OrderLineSnapshot`, `CheckoutAttempt`, `AddressSnapshot` | Orders | unique `(owner, idempotencyKey)` + fingerprint, snapshot imutável | Endereços/PII e total BRL cents |
| `PaymentAttempt`, `ProviderEvent`, `Capture`, `RefundOperation` | Payments | unique `(provider, event_id)`; `(provider, external_ref)`; refund key única por operação | Nunca armazenar PAN/CVV; payload minimizado |
| `Entitlement`, `DigitalDelivery`, `LicensedAsset` | Library | unique `(account, order_line/component/license_id)` conforme modelo | Assets privados; TTL de URL; audit trail de acesso |
| `Shipment`, `ShipmentLine`, `ReturnCase`, `ReturnInspection` | Fulfillment/Support | remessa por componente; inspeção por item e quantidade | Dados de transporte e devolução |
| `OutboxEvent`, `InboxReceipt`, `AuditEvent` | Integration/Audit | unique por chave/evento, versões e correlação | Minimização de PII, política de retenção |

## Modelo de consistência

- Uma transação DB pode criar registros de vários agregados sob **um use case transacional explícito**; ownership continua definido. Uso de schema/database separado por módulo é opcional, não requisito do MVP.
- Preferir índices e constraints como última linha de defesa contra concorrência: uso de cupom, dedup de webhook, saldo em centavos e resgate digital; projeto de DDL/testes pendente.
- `OrderLineSnapshot` e `KitCompositionSnapshot`: capturar preço comercial, descontos, tax/frete aplicável, edição/licença e componentes, sem reavaliar histórico pelo catálogo atual.
- Não expor entidades ORM diretamente para browser; interfaces de leitura com filtros por titularidade/operador e paginação.
- Data de expiração transacional vem do banco. App e PSP podem registrar timestamps para telemetria; não decidir validade pelo relógio de um cliente.

## Dados pessoais e ciclo de vida

- Catalogar finalidade de dados de conta, endereço, atendimento, auditoria e eventos financeiros; definir bases, prazos de retenção, apagamento/anonimização, backups, exportação e controle de acesso antes do release público.
- Separar payloads operacionais (correlation ID, IDs opacos, status) de credenciais/PII. Minimizar campos em outbox/logs.
- Mídia pública de prévia e privada de distribuição devem ter caminhos/buckets/políticas separados; licenças verificadas antes do upload e da entrega.

## Relações funcionais que podem requerer decisão posterior

1. Um pedido → muitas linhas de snapshot, tentativas PSP e remessas; um refund financeiro referencia captura e itens do caso, não reescreve a captura.
2. Um item/kit digital → direitos por componente/usuário/licença; suspensão depende de decisão fundamentada, não da abertura da devolução.
3. Reserva física e estoque → ledger e quantidades atômicas por SKU. O modelo exato de reserva x saldo vendido será decidido por ADR de dados e simulado sob concorrência.

**Critério de conclusão:** a Fase 04/05 deve definir DDL, chaves estrangeiras, índices e constraints com migrações reversíveis ou plano de recuperação, testar integridade real e documentar locks.
