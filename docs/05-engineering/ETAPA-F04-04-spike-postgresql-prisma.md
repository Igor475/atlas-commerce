# Atlas Commerce — F04-04: spike isolado PostgreSQL / Prisma v7

> **Estado:** autorização recomendada para um **experimento controlado**, não aprovação técnica definitiva de ADR-006, não integração Supabase em demo.  
> **Baseline revisada:** `main` @ `2ad62b5c50d025fe2bbb89939b319dc9447d2d98`.

## Objetivo

Verificar no monorepo existente se Prisma ORM v7 com `@prisma/adapter-pg`, `pg` e SQL parametrizado consegue executar transações PostgreSQL reais na **mesma transação/conexão**, com rollback completo, concorrência e checks de integridade. O intuito é decidir se esta solução suporta as invariantes existentes — não criar ainda todo o modelo comercial.

## Ambiente e fronteira da etapa

- **Somente PostgreSQL descartável/isolado** (preferencialmente Docker local; CI com serviço PostgreSQL isolado, sem segredos reais). Ferramentas/config devem ser reproduzíveis.
- **Supabase Free** continua fornecedor do futuro demo, porém **não há autorização de acesso ou modificação do projeto real neste spike**. A conexão Render Free ↔ Supavisor permanece para outra etapa e seus testes SUPABASE.
- NestJS permanece monólito. Preservar `apps/storefront`, `apps/admin`, CSS e a estratégia de design. Não introduzir `apps/worker`, Stripe, Redis ou Edge Functions.
- Fixtures técnicas de testes no módulo de persistência, não catálogo/pedidos reais nem status comerciais fictícios declarados implementados. Nenhuma migration ou seed real em Supabase.

## Estratégia de código a testar

1. Analisar a matriz de compatibilidade **exata** do Prisma 7, CLI, adapter PostgreSQL, `pg`, TypeScript 6, Node/pnpm já fixados; instalar apenas versões verificadas e pinadas no lockfile.
2. Configurar `prisma.config.ts` e `schema.prisma` nos padrões da versão selecionada, com URL CLI diferente de URL runtime **quando necessário**; nunca logar URL ou senha. Validar env exigido só quando inicializar DB e não quebrar health sem dependências para testes isolados.
3. `PrismaClient({ adapter: new PrismaPg(...) })`; pool do **driver** com `max` pequeno **provisório e parametrizado**, limites de conexão/idle/erro comprovados, instância por processo em vez de por requisição, desconexão no shutdown.
4. Encapsular no adapter/repositório técnico; **não exportar Prisma models** a Next.js nem `packages/contracts`, não acoplar domínio ao Prisma.
5. Construir fixtures de banco **apenas experimentais** para: saldo de SKU, reserva com TTL e outbox, um registro de captura/refund de teste. Constraints mínimas (`CHECK`, `UNIQUE`, FK, etc.) demonstram rollback e dedup. Nenhum método chamando Stripe.
6. Transação com `tx.$queryRaw`/`tx.$executeRaw` parametrizados para `SELECT FOR UPDATE`/UPDATE condicionado: provar que o ORM e SQL crítico permanecem sob uma mesma transação. Não usar concatenação SQL nem `$queryRawUnsafe` com input externo.
7. Provar tempo autoritativo **após bloqueio**: `now()`/`CURRENT_TIMESTAMP` referem-se ao início da transação, portanto usar estratégia correta (`clock_timestamp()` no ponto de decisão pós-lock) e observá-la sob corrida reproduzível.
8. Outbox escrita junto ao fato no mesmo commit; rollback significa nenhum evento persistido. Não despachar efeitos externos.
9. Suportar erros de indisponibilidade e retry apenas para TX local inteira quando for segura/idempotente; não prometer eventual Stripe/Refund implementado.
10. Priorizar migrations reproduzíveis e testes automatizados; não executar migrations silenciosamente durante start normal de API nem em Supabase.

## Sequência de teste

A [matriz F04-04](F04-04-gates-de-validacao.md) seleciona uma **amostra de validações DB-001–028** exigida para o spike. A matriz completa DB ainda ficará aberta para implementação por domínio. Usar **2+ conexões reais** e sincronização por barreiras coordenadas — `sleep` sozinho não comprova concorrência.

## Evidências mínimas

Versões exatas, Docker/Postgres utilizado e versão do servidor, lockfile, migrações aplicadas no DB isolado, `pg` pool, transaction ID quando relevante, `SQLSTATE` de falhas, resultados de testes repetíveis, `pnpm check`, `git diff --check`, resumo do diff, limitações e riscos de pool/ORM.

**Decisão técnica pós-spike:** registrar `aprovado condicionalmente`, `reprovado` ou `inconclusivo` em relatório. Não mudar ADR-006 para **homologada** sem todos os gates e aprovação separados. Se testes de SQL/locking falharem, comparar alternativa `pg`/Drizzle por experimento isolado antes de substituir a stack aprovada.

## Referências normativas

- [Contrato F04-05 persistência](F04-05-persistencia-e-migrations.md)
- [ADR-006](../04-architecture/adrs/ADR-006-acesso-dados.md), [ADR-010](../04-architecture/adrs/ADR-010-postgresql-supabase.md)
- [DB-02 invariantes](../04-architecture/database/DB-02-invariantes-e-locking.md), [DB-04 drivers](../04-architecture/database/DB-04-orm-drivers-pool.md), [DB-05 provas](../04-architecture/database/DB-05-plano-de-validacao.md)
- [F04-03 / CI](STATUS-F04-03-CI-validado.md)
- [Prisma PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql), [Prisma v7 pool](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool), [Supabase connection](https://supabase.com/docs/guides/database/connecting-to-postgres)
