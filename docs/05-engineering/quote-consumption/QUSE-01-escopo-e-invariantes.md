# QUSE-01 — Escopo e invariantes

## Diagnóstico

O fluxo SHIP-01 chama `orders.prepare_shipping_quote` → CP-02 → Quotes → Orders → Inventory na mesma conexão. Autorização é ancorada em session_user e conta CUSTOMER ativa/verificada. O advisory existente por ator/chave e a constraint `(actor_id, operation, key)` protegem replay técnico. `orders.quote_binding` associa cotação ao ator, mas não à intenção: duas chaves podiam criar duas preparações.

QUSE acrescenta uma proteção em Orders e mantém autoridades: Quotes emite/revalida/historiza; Customer Profile versiona/snapshot postal; Shipping resolve entrega; Catalog/Pricing fornecem composição/publicação/preço; Inventory reserva. Não há estado de consumo ou pagamento em Inventory.

## Garantias pretendidas

- No máximo uma request/preparação confirmada por quote; mesma intenção e fingerprint recuperam o mesmo resultado.
- Chave diferente para quote consumida conflita, inclusive para digital puro.
- Chave existente para outra quote/fingerprint conflita.
- Falha antes de commit desfaz consumo, preparação, snapshots, reservas, ledger e eventos.
- Depois do commit, nova conexão pode recuperar o histórico, reautorizando a conta.
- Cotações distintas não compartilham lock global; estoque compartilhado continua sujeito aos locks legítimos de Inventory.

A decisão comercial está em [ADR-012](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md). Esta entrega prova mecanismo TEST_ONLY; não cria pedido comercial, PENDING_PAYMENT operacional, Stripe, PAID, entitlement ou sessão pública. Não altera SM-01/02, normas, OpenAPI, TTL comercial ou parâmetros de entrega.

Quote da fixture tem 600 segundos e não reserva estoque. Reserva física conserva 2.400 segundos; replay não estende nenhum prazo. Testes de fronteira configuram explicitamente um segundo, sem alterar política normativa.
