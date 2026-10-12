# ADR-006 — Acesso a PostgreSQL, migrações e locks

**Status:** ABERTA para ORM/query, pools e schema; PostgreSQL como fonte transacional é direção arquitetural suportada pelo BRD.

## Alternativas

A. ORM tipado (Prisma, Drizzle ou equivalente) com controle cuidadoso de SQL/locking e transactions.  
B. SQL/query builder/driver explícito para operações de concorrência.  
C. ORM para CRUD e SQL parametrizado para locks/invariantes com ports de repositório.

## Proposta de avaliação

Avaliar C quando necessário sem espalhar dependência de ORM pelo domínio; manter migrations versionadas, `BEGIN/COMMIT/ROLLBACK`, `FOR UPDATE`/constraints como última defesa, transações curtas e testes PostgreSQL real. IDs, moeda em centavos, unicidade de idempotency key e eventos, `expires_at` do banco.

## Gate

Spike de último SKU, refund concorrente, kit all-or-nothing e expiration race; validar custo/pool/migrations/rollback e comportamento de conexão real. **Não escolher Prisma/Drizzle sem o ensaio pertinente.**
