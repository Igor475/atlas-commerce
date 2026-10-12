# DB-03 — Governança de migrations, compatibilidade e recuperação

> **Status:** plano documental; zero migrations/backup/restores executados. Não confundir `rollback` lógico de transação com reversão segura de DDL.

## Política de mudanças de schema

1. Uma **fonte de migrations versionada** escolhida na ADR-006 (Prisma Migrate, Drizzle Kit ou SQL sob revisão); evitar misturar motores diferentes como autores concorrentes da mesma DDL.
2. Desenvolver e testar em DB isolado com versão de PostgreSQL equivalente à do ambiente alvo; revisar diff do schema, queries SQL emitidas e `EXPLAIN` quando necessário.
3. Operações perigosas: adicionar `NOT NULL` em tabela populada, reescrever tipo, mudar semântica de status, excluir coluna, criar índice grande ou alterar função/check; exigir plano de lock, custo e monitoramento. Não executar alteração destrutiva cegamente no deploy.
4. **Expand → migrate data → contract:** introduzir novo campo/índice compatível, dual-read/dual-write controlado quando necessário, fazer backfill idempotente em lotes, validar consultas/consumidores, somente depois remover coluna antiga. Acompanhar versões de API/worker durante rolling deploy.
5. Idempotência de migration por histórico e revisão; seeds não devem recriar credenciais previsíveis, produtos sem licença, ordens financeiras ou segredos. Seed demo separado dos dados de operação.
6. Runtime só recebe DML mínimo necessário; **conta de deploy/migration com privilégios próprios**, nunca embutida nas variáveis públicas. Backup/restore requer identidade distinta.

## Transações, locks e alteração estrutural

- DDL pode obter locks pesados e interromper checkout; usar `lock_timeout` apropriado e estratégia para índices concorrentes quando válida; não presumir que todo `CREATE INDEX CONCURRENTLY` pode estar numa mesma transação de migration.
- Ao criar CHECK/FK em tabela volumosa, estudar `NOT VALID`/`VALIDATE CONSTRAINT` quando aplicável à versão escolhida; verificar locking de cada declaração real.
- Reconcile períodos em que API antiga e nova estão simultâneas; versão de payload/outbox e migração de dados históricos de snapshot são críticas.

## Recuperação e evidências

| Evento | Abordagem esperada | Evidência requerida |
|---|---|---|
| Migration falha antes do commit | Rollback da transação DDL onde suportado, registrar estado | Schema version, logs sem credenciais e teste |
| Migration aplicada e API incompatível | Preferir roll-forward/feature flag; rollback de app apenas se schema backwards-compatible | Smoke de API antiga/nova e contrato de mensagens |
| Dado corrompido/queda de volume | Backup consistente/PITR conforme fornecedor | Restore real em ambiente isolado, tempo medido |
| Perda de worker após commit | Outbox recuperada sem repetição financeira | Teste crash/restart + dedup |
| Erro de seed de demonstração | Idempotência/controle de ambiente; não sobrescrever usuários reais | Comparação de estado e efeito de reexecução |

**RPO/RTO:** não inserir números fictícios. Valores dependem de topologia/hospedagem da ADR-008 e devem ser validados por exercícios, abrangendo metadados de mídia privada e chaves criptográficas recuperáveis quando aplicável.

**Gate para código:** plano para backup, restore, expand-contract, permissões, rollback/roll-forward, testes migratórios e segurança de credenciais; revisão de schema e EXPLAIN de queries críticas.
