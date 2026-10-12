# ADR-006 — PostgreSQL, camada de acesso a dados e garantias transacionais

> **Versão:** 0.4.0 (12/10/2026)  
> **Estado:** **PROPOSTA RECOMENDADA — NÃO ACEITA; SEM IMPLEMENTAÇÃO OU TESTES**.  
> **Fonte:** BRD v0.2.1, RN-019–034, RN-041–054, RN-070–094, PC-01–04, SEC-010/017–025/029–035, CA-001–026 e SA-005–009.  
> **Baseline:** `af4cf2d5d98c443bb54084035a9a8259e76a1e6d`.

## Problema e forças

Reservas físicas, kits, cupom, captura de pagamentos Stripe, devolução financeira e concessão digital possuem disputas concorrentes e obrigações idempotentes. A consistência não pode depender exclusivamente de validações feitas no TypeScript, cache, fila, webhook ou relógio do navegador. Escolher ORM não substitui decidir constraints, locks e semântica de estados.

## Alternativas avaliadas

| Caminho | Vantagens | Riscos e custos | Direção |
|---|---|---|---|
| A — Prisma ORM (geração tipada) + driver PostgreSQL + SQL parametrizado/TypedSQL pontual | Ergonomia, migrations, leitura por modelo; escape para locks expressivos | Adapters/pool dependem da versão; raw e interatividade transacional requerem prova; migrations nem sempre expressam constraints avançadas | **Preferencial para spike** |
| B — Drizzle ORM + SQL tipado | Maior proximidade com SQL, transações explícitas, boa granularidade | Necessidade de validar recursos, migrations e camada modular | Candidata comparativa |
| C — `pg`/SQL parametrizado com repositories e migrations SQL | Controle total da transação e locking | Maior custo de manutenção/DTOs/modelagem e risco de SQL ad hoc | Fallback para agregados críticos |

**Direção recomendada, não homologada:** PostgreSQL como autoridade transacional; acesso a dados **encapsulado por interfaces de módulos**, preferencialmente Prisma ORM para operações comuns e SQL parametrizado/TypedSQL **somente dentro da mesma transação e mesma conexão** para guardas que exijam sintaxe nativa. Não abrir segundo cliente/driver fora da transação e afirmar atomicidade por proximidade no código.

Para **Prisma ORM v7**, conferir uso obrigatório de *driver adapter* de PostgreSQL e política de pool do driver; `new PrismaClient()` sem adaptador não é baseline válido. Congelar versões **após** o spike, nunca pressupor APIs inalteradas. As configurações exatas são da versão escolhida, não desta ADR.

## Decisão de integridade proposta

1. **PostgreSQL fonte de verdade:** pedido, snapshot de preço/kit, estoque (`on_hand`, compromissos e alocação), reservas, tentativas Stripe, capturas, refunds, direitos digitais, inbox/outbox, identidade/sessão persistente. Redis, quando adotado, é cache/fila e nunca ledger.
2. **Transações curtas:** validar entrada e autorização antes de abrir a transação quando possível; revalidar guardas críticas no banco. Persistir intenção durável/outbox no mesmo commit. **Nenhuma chamada Stripe, storage ou e-mail mantém lock de negócio aberto.**
3. **Concorrência:** para estoque e refunds, usar updates condicionais, índices/constraints e/ou locks por linha na mesma transação. Chaves de múltiplos SKUs são adquiridas em ordem determinística. Locking e isolamento serão definidos por cenário, não `SERIALIZABLE` indiscriminado.
4. **Relógio:** prazo `expires_at` vem do banco. Na confirmação/expiração reavaliar o tempo **após a aquisição do lock**, com leitura apropriada ao instante da decisão; `now()`/`CURRENT_TIMESTAMP` refletem início da transação e podem envelhecer em espera longa. Projetar uso de `clock_timestamp()`/`statement_timestamp()` conforme contrato comprovado e evitar usar hora enviada pelo cliente.
5. **Sem oversell:** proposta de projeção sob invariantes `available = on_hand - reserved_active - allocated`, todos inteiros não negativos. Reservar incrementa `reserved_active`; confirmar move reservado→alocado; expirar libera reservado uma vez; expedir reduz `on_hand` e `allocated`; devolução só adiciona `on_hand` após inspeção. O ledger e restrições evitam efeitos duplicados. Ver [DB-02](../database/DB-02-invariantes-e-locking.md).
6. **Refund:** valor disponível por captura e moeda = `captured_cents - succeeded_refund_cents - pending_reserved_refund_cents` (>= valor solicitado); alocação de saldo e estado da operação numa transação. Resposta remota incerta não libera reserva financeira; `SUCCEEDED` só com evidência confiável.
7. **Idempotência:** unicidade por ator/operação/fingerprint no checkout; provider/event ID e IDs de tentativa externa em Payments; refund key por operação; outbox/inbox por mensagem e consumidor. Chave expirada no Stripe nunca revoga a unicidade local.
8. **Migrations:** versionadas, auditáveis, review de plano de locks e índices, **expand/migrate/contract** em alterações destrutivas; backup e restore provados. Conta de runtime diferente de conta de migração (least privilege). Ver [DB-03](../database/DB-03-migrations-e-recuperacao.md).
9. **Boundaries:** apenas módulo dono manipula tabelas de seu domínio via repository/port; use case transacional entre agregados é serviço de aplicação explícito, não leitura/escrita clandestina. Acesso por recursos do cliente verifica titularidade no servidor.

## Riscos, trade-offs e evidências

- Lock de longa duração causa contenção/deadlock; definir timeout/retry bounded, ordem de locks, `lock_timeout`, alertas e p95 de transações após baseline.
- `SKIP LOCKED` é adequado para *claim* de outbox/jobs concorrentes, **não** para declarar ausência de estoque reservado: fornece visão parcial.
- `SERIALIZABLE` pode abortar transações; tratar SQLSTATE `40001`/`40P01` com retry limitado e mesma intenção idempotente, não repetir side effects externos.
- O design físico e APIs do ORM devem ser exercitados contra PostgreSQL real (não mock/in-memory); pool deve caber no limite somado de todas as réplicas/worker/CLI/admin.
- Migrations não são rollback garantido: alterações destrutivas requerem protocolo de recuperação/roll-forward e restore testado.

## Gate para aceitar esta ADR

- [ ] Comparação Prisma v7 + adapter, Drizzle e SQL documentada com ensaios reproduzíveis; lock/SQL parametrizado dentro da **mesma** transação.
- [ ] DB-001–028 executados em PostgreSQL real, incluindo dois clientes simultâneos, deadlock/timeout, validação de relógio e falha de processo.
- [ ] Schema físico, chaves, índices parciais, FKs e CHECKs compatíveis com migrations revisadas.
- [ ] Decisão sobre adapter/ORM, versão, pool, transações, SQLSTATE, retries e estratégia de backup/restore ratificada.
- [ ] Compatibilidade documentada com ADR-002 (outbox), ADR-003 (sessões), ADR-004 (Stripe), ADR-007 (jobs) e dados privados SEC-028–030.
- [ ] Autorização para o prompt Codex limitada ao módulo/ensaio relevante, com testes e diffs reproduzíveis.

**Não confundir** um desenho ER com esquema implementado, um CHECK planejado com constraint existente ou CI futuro com evidência. A aprovação formal desta ADR pode ocorrer para a estratégia enquanto os ensaios permanecem **gates técnicos da implementação**, desde que isso fique registrado explicitamente e não autorize pagamentos reais.

## Fontes técnicas oficiais (verificadas em 12/10/2026)

- [PostgreSQL — Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL — SELECT / SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html)
- [PostgreSQL — Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Prisma v7 — Client e adapters](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction)
- [Prisma v7 — Connection pool](https://docs.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool)
- [Prisma v7 — Raw SQL](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/raw-queries)
- [Drizzle — Transactions](https://orm.drizzle.team/docs/transactions)
