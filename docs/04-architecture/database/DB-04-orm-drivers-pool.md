# DB-04 — ORM, SQL parametrizado, driver e pool: decisão comparativa

> **Decisão:** Prisma ORM v7 + adapter PostgreSQL é **preferido para o spike**, não selecionado definitivamente. Alternativas Drizzle/SQL permanecem válidas até evidência. Nenhuma versão foi instalada.

## Matriz de avaliação a preencher no spike

| Critério | Prisma v7 | Drizzle | SQL parametrizado/`pg` | Teste obrigatório |
|---|---|---|---|---|
| CRUD e tipos | API tipada gerada | DSL tipada próxima de SQL | Tipos manuais/geração adicional | modelar Account/Order/Reservation |
| Transações com locks nativos | `tx.$queryRaw`/TypedSQL sob mesma transação se suportado | transações + SQL expressivo | controle direto da conexão | concorrência SKU/kit e refund |
| Constraints e DDL avançados | avaliar migrations SQL customizadas | avaliar migrations SQL customizadas | flexível, requer disciplina | índices parciais, CHECK/FKs |
| PostgreSQL driver/pool | em Prisma v7 **adapter obrigatório**; pool controlado pelo driver | depende do adapter (`node-postgres` etc.) | `pg.Pool` explícito | várias réplicas, leak e queue de conexões |
| SQL injection | `$queryRaw` tag/TypedSQL com bind, **nunca** concatenar input ou usar unsafe | `sql`/bind e allowlist identificadores | prepared/binds + allowlist | fuzz de filtros/ordem |
| Observabilidade | query/transaction logs redigidos e métricas | instrumentação wrapper | instrumentação manual | traces sem tokens/PII |
| Manutenção monólito modular | ports preservam isolamento | ports preservam isolamento | ports preservam isolamento | impedir import cross-module |

### Aviso Prisma v7

Em Prisma ORM v7, para banco relacional, o Client usa driver adapter; o pool depende do driver (por exemplo `pg`) e **não deve ser dimensionado por suposições herdadas do Prisma v6**. Verificar caminho de importação do Prisma Client gerado, inicialização e configuração real da versão fixada. SQL tipado/pontual deve executar no `tx` que detém os locks, não em outro cliente.

### Conexões e limites

- Definir `max_connections` e conexões disponíveis no PostgreSQL gerenciado; reservar margem para operações e migration.
- Orçamento de pool: `soma(pool_api_por_instância × réplicas) + pools_workers + migrations + observabilidade <= limite útil do servidor`. Considerar autoscaling/preview apps e picos.
- Evitar instanciar cliente DB a cada request. Em ambiente serverless, múltiplos processos/instâncias exigem pooler compatível com transaction pooling e prepared statements; testar, não presumir.
- Escolher timeout de conexão, lock, transação e statement por risco e medições; documentar resposta HTTP segura em saturação e fila.

## Critérios de prova

1. Medir latência de leitura/cotação, de reserva concorrente e de refund, incluindo p50/p95/p99 e ambiente.
2. Demonstrar uma operação crítica nativa com `FOR UPDATE` ou UPDATE condicionado **na mesma transação** das alterações de pedido e outbox.
3. Demonstrar rollback total de kit com três SKUs; expiração disputada; dois refunds concorrentes; SQL injection negada.
4. Validar migration com índice/constraint que impeça efeito financeiro duplicado sem confiar na API.
5. Fornecer diff de dependências/lockfile, versão do PostgreSQL/ORM/driver, resultados, gargalos e trade-offs antes de escolher definitivamente.

## Fontes oficiais

- [Prisma v7 — Driver adapter obrigatório](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction)
- [Prisma v7 — Pool de conexões](https://docs.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool)
- [Prisma v7 — SQL parametrizado](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/raw-queries)
- [Drizzle — Transações](https://orm.drizzle.team/docs/transactions)
- [PostgreSQL — Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
