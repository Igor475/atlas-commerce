# ORD-01 — Escopo e fronteiras

## Diagnóstico

Catalog, Pricing e Inventory existentes usam adapters/conexões independentes.
Encadear esses serviços em TypeScript não prova atomicidade. O novo coordenador
`orders.prepare` chama ports SQL pertencentes aos três módulos dentro da mesma
transação PostgreSQL e conexão. Nenhum adapter existente foi substituído.

RN-032 exige cotação e condições de entrega ainda ausentes. Por isso,
`PreparedOrderIntent`/`orders.preparation` é preparação técnica TEST_ONLY, separada
do agregado Order e do vocabulário de estados financeiros SM-01. O evento
`PREPARATION_RECORDED_TEST_ONLY` registra esse fato técnico, não uma venda.

## Autoridades

| Fronteira       | Autoridade preservada                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Identity        | Integração comercial não conectada; identidades artificiais registradas exclusivamente na fixture |
| Catalog         | Publicação, edição, SKU e composição; port `prepare_orders_snapshot`                              |
| Pricing         | Revisão vigente e preço-base BRL; port `prepare_orders_prices`                                    |
| Inventory       | Ledger, saldo e reserva real; wrapper `prepare_order_reservation` chama `reserve` original        |
| Orders          | Intenção, titular, snapshots, idempotência e evento técnico                                       |
| Cotação/entrega | Ausentes; `fixture_quote` confiável TEST_ONLY valida itens, ator e validade, sem frete/total      |

O módulo não entra no AppModule. Sua composição explícita exige opt-in local,
consentimento ORD-01 e role artificial; o provider normal é nulo. Não há
controller, rota, migration no startup ou cotação fictícia na composição normal.

## Grants adicionais

Migrations originais permanecem intactas. Ports têm cadeias próprias e históricos
`catalog_ord01_history`, `pricing_ord01_history`, `inventory_ord01_history`.
O migrator de cada módulo instala seu port; Orders tem migration/schema próprios.

Owners NOLOGIN de Catalog/Pricing recebem leitura e UPDATE de uma coluna de
identidade somente para adquirir locks `FOR SHARE` (exigência PostgreSQL).
Esses owners não executam UPDATE e nenhum runtime possui membership/SET ROLE.
Pricing não concede execução de manutenção a seu reader. Inventory reaproveita
seu executor e concede somente EXECUTE do wrapper a Orders. Orders executor
não recebe escrita em tabelas estrangeiras. REFERENCES é concedido ao migrator
Orders apenas nas chaves alvo de FKs; nenhuma credencial migrator serve leituras
da aplicação. CREATE temporário para transferir ownership é revogado na migration.

Risco residual: owners privilegiados/SQL de migration podem alterar funções;
essa autoridade administrativa não pertence aos consumidores. A fixture usa
trust somente em loopback Docker descartável; não é configuração de produção.
