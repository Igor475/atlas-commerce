# SHIP-04 — Segurança e concorrência

## Persistência e grants

Quatro cadeias aditivas: [Shipping](../../../apps/api/prisma-shipping/shipping/migrations/202610160200_shipping/migration.sql), [port Profile](../../../apps/api/prisma-shipping/profile/migrations/202610160201_shipping_profile/migration.sql), [integração Quotes](../../../apps/api/prisma-shipping/quotes/migrations/202610160202_shipping_quote/migration.sql) e [evidência Orders](../../../apps/api/prisma-shipping/orders/migrations/202610160203_shipping_preparation/migration.sql). Históricos separados por módulo; todas as migrations históricas ficam intactas.

| Papel                     | Operações permitidas                                                           | Limite                                    |
| ------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| Shipping migrator         | DDL própria; configuração exclusiva do harness                                 | Não serve runtime                         |
| Shipping executor NOLOGIN | SELECT de suas políticas; locks; EXECUTE Profile mínimo e elegibilidade Quotes | Sem DML/leitura bruta de schemas vizinhos |
| Quotes executor NOLOGIN   | EXECUTE Shipping; persistência Quotes existente                                | Sem manutenção de políticas Shipping      |
| Orders executor NOLOGIN   | INSERT/SELECT da evidência própria; coordenador CP-02                          | Sem DML Shipping/Profile                  |
| Runtimes Quotes           | issue_shipping/project_shipping                                                | Sem DML, membership ou ports antigos      |
| Runtimes Orders           | prepare_shipping_quote/read_shipping_preparation                               | Sem DML, membership ou bypass CP-02       |

USAGE/REFERENCES adicionais são concedidos somente aos migrators para FKs. UPDATE de coluna de identidade para SELECT FOR SHARE é exclusivo do executor NOLOGIN; não concede alteração de tarifa/estado. CREATE temporário para ownership de funções é revogado ao final. Funções SECURITY DEFINER têm search_path fixo e EXECUTE PUBLIC revogado. Runtimes são auditados fail-closed contra flags, membership, ownership, CREATE/TEMP e grants extras.

Configuração aceita somente 127.0.0.1:55439, banco atlas_catalog_cat01, schema/role exatos, consentimento SHIP-01 e marker próprio. Docker local, digest fixado, lock compartilhado da porta e projeto UUID; cleanup verifica somente seus recursos. Nunca para projeto alheio automaticamente. Trust/TLS desligado pressupõem máquina local confiável e dados artificiais: outros processos locais podem acessar o owner; não é isolamento de produção.

## Locks e falhas

Ordem: conta/principal → advisory de idempotência → Catalog/Pricing → ponte de política Quotes → endereço Profile → política/revisão Shipping → atributos físicos Quotes → Inventory. Reentradas do coordenador CP-02 preservam os locks já mantidos. Escritores de Profile não adquirem Catalog/Inventory. Configuração de revisão nova no harness trava a ponte Quotes antes de ativar o ponteiro Shipping, evitando inversão entre esses dois objetos.

Escritor que altera política/endereço enquanto Orders espera Catalog vence antes da revalidação, produzindo recusa. Quando Orders já protege endereço/política, o escritor aguarda seu commit; alteração posterior não invalida retroativamente o snapshot. O PostgreSQL verifica vencimento novamente após espera de estoque. Inserções concorrentes de zonas serializam na revisão, impedindo sobreposição.

Sem HTTP externo na transação, URLs remotas, credenciais Identity, PII em logs ou SQL/stack no erro da aplicação. Falhas injetadas e morte do processo exercitam rollback; recuperação após commit sem resposta não prova perda de ACK TCP. L1_SQL_STRICT, MRD, CSRF, Origins e cookies permanecem intactos.
