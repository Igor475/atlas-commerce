# INV-02 — Modelo, ledger e permissões

Schema `inventory`, Prisma/config/client e migration próprios. Migrations originais
Catalog/Pricing são aplicadas e reaplicadas por seus runners, sem alteração.
FK SQL para `catalog.product(id)` e trigger protegem identidade física; não se
replica Catalog no modelo de domínio Inventory. SQL versionado é autoridade para
FKs, triggers, CHECKs, funções e índice parcial não expressos integralmente no Prisma.
Não usar `db push` nem gerar migration automática a partir desta representação.

| Relação            | Responsabilidade e guarda                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| stock_balance      | SKU físico, on_hand, reserved_active, allocated; inteiros não negativos e on_hand >= reserved_active + allocated |
| stock_ledger_entry | UUID, SKU, tipo, quantidade, referência/correlação opacas, timestamp DB, três deltas; unique SKU/tipo/operação   |
| reservation        | UUID, referência comercial, estado, created_at/expires_at timestamptz; CHECK diferença exata 40 minutos          |
| reservation_line   | Reserva/SKU únicos, quantidade positiva; linhas imutáveis                                                        |
| intent             | Chave UUID, referência comercial única, SHA-256 do conteúdo, linhas físicas, associação única à reserva          |
| event              | Fato Inventory durável com UUID e tipo, reserva, decisão opcional e timestamp; deduplicação persistente          |

`available = on_hand - reserved_active - allocated`, sem cache autoritativo. Ledger
possui deltas suficientes à conciliação por SKU. Sua inserção projeta saldo dentro
da mesma transação; falha em qualquer constraint desfaz tudo. Histórico/linhas/eventos
não aceitam UPDATE/DELETE. Intenção permite somente a associação inicial à reserva,
no commit da criação; depois é imutável. Seed fixture entra como FIXTURE_LOAD e
nunca por endpoint/caso de uso comercial. Não há baixa por expedição ou reposição
de devolução; esses efeitos pertencem a próxima autorização com Fulfillment.

| Identidade local         | Poderes                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| atlas_inventory_migrator | DDL e ownership Inventory; CREATE no DB descartável; membro do executor para atribuir ownership das funções; credencial segregada            |
| atlas_inventory_executor | NOLOGIN, sem flags privilegiadas; DML estritamente Inventory para funções, SELECT somente id/product_type Catalog; sem CREATE após migration |
| atlas_inventory_runtime  | CONNECT/USAGE e EXECUTE apenas reserve/expire; sem SELECT administrativo ou DML direto                                                       |
| atlas_inventory_decider  | Somente fixture; CONNECT/USAGE e EXECUTE decide, separado de runtime                                                                         |

Funções SECURITY DEFINER têm owner NOLOGIN limitado, search_path fixo pg_catalog,
objetos qualificados e SQL estático. EXECUTE de PUBLIC é revogado somente nas funções
Inventory; nenhuma revogação global. Função transition é privada ao executor.
Runtime/decider não são membros do executor nem de outros papéis e não têm ownership.
Grants Catalog para migrator limitam-se a USAGE/REFERENCES(id); Catalog runtime
permanece intacto. Não se concede acesso Pricing para mera inspeção de metadados.

Guardas verificam DB/role/markers/PG17 e owners antes de Prisma Migrate, inclusive
antes da criação de sua tabela de histórico. Antes de cada operação, o adapter
recusa flags, memberships, CREATE/ownership/DML comerciais e execução cruzada
indevida. Isto não substitui o detector L1 nem prova ausência de toda capacidade
nativa herdada de PUBLIC. Pool até 3 por adapter; conexão 1s, lock 1.5s, statement
2.5s, query 3s, idle transaction 3s; fechamento explícito dos clientes.
