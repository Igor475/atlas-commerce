# F04-04 — Matriz de validação do spike PostgreSQL

> **Estado de todos os casos:** PLANEJADO/NÃO EXECUTADO. Não confundir com os resultados já aprovados de CI do bootstrap.

| ID | Teste mínimo do spike | Resultado verificável | Ref. |
|---|---|---|---|
| PGSP-01 | Setup do banco descartável e schema via migrations | Instalação reprodutível, nenhuma credencial/cloud usada | ADR-006 |
| PGSP-02 | CLI Prisma v7 / adapter `pg` | Geração, instância, conexão e shutdown corretos | DB-04 |
| PGSP-03 | Prisma CRUD + SQL parametrizado na **mesma TX** | Modificações commitam/rollbackam juntas; sem SQL injection | DB-04 |
| PGSP-04 | Duas compras da última unidade | Somente uma reserva; saldo nunca negativo | DB-001 |
| PGSP-05 | Concorrência de SKUs distintos | Sem serialização global desnecessária | DB-002 |
| PGSP-06 | Kit insuficiente (2 itens, saldo 1) | TX inteira faz rollback, inclusive outbox | DB-003 |
| PGSP-07 | SKU repetido em linhas de kit | Quantidade agregada corretamente | DB-004 |
| PGSP-08 | Confirmação x expiração concorrentes | Um terminal; EXPIRED jamais vira CONFIRMED | DB-006 |
| PGSP-09 | Espera no lock atravessa TTL | Hora do DB pós-lock bloqueia confirmação tardia | DB-007 |
| PGSP-10 | Repetição da mesma operação de teste | Dedup persiste e payload divergente gera conflito | DB-010/011 |
| PGSP-11 | Refund contábil simulado (nenhum PSP) | Duas reservas concorrentes não ultrapassam saldo | DB-014 |
| PGSP-12 | Commit + outbox e rollback com falha induzida | Evento e estado surgem/desaparecem juntos; replay demonstrável | DB-018 |
| PGSP-13 | `FOR UPDATE SKIP LOCKED` exclusivamente em job test | Dois claimers não reclamam a mesma linha em paralelo | DB-019 |
| PGSP-14 | Driver pool/timeout, conexão cai, restart | Falha segura, reconecta/encerra sem vazamento, sem sucesso falso | DB-04 |
| PGSP-15 | CI/revisão/segredos | pnpm check / tests DB em ambiente isolado, lockfile, diffs limpos | F04-08 |
| PGSP-16 | Migrations em banco isolado e restauração inicial | Up repetível, baseline documentada; sem schema Supabase alterado | DB-027/028 parcial |

## Resultados permitidos

- `PASS`: execução real reproduzível registrada; citar testes, PostgreSQL e commit.
- `FAIL`: descrever falha verificável e causa, sem mascarar.
- `BLOCKED`: faltou banco isolado/Docker/acesso, não substituir por mocks.
- `NOT APPLICABLE`: justificar por que um caso do spike não se aplica; não marcar aprovação do conjunto DB-001–028.

**Atenção:** casos não cobertos integralmente por este spike, incluindo Stripe test mode, MFA, direitos digitais, backup/restore comercial, sessões, refund real, permanecem pendentes conforme [DB-05](../04-architecture/database/DB-05-plano-de-validacao.md) e [matriz da F04](F04-09-matriz-de-gates.md).
