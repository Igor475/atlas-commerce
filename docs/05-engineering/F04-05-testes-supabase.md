# F04-05 — Matriz de validação SUPCON-01–22

> **Todos os testes abaixo estão PENDENTES na presente entrega documental.** Registrar `PASS`, `FAIL`, `BLOCKED` ou `N/A` com comando, resultado, ambiente e evidência. Aprovado no L0 não significa homologado no L1.

| ID | Nível | Prova necessária | Critério verificável |
|---|---|---|---|
| SUPCON-01 | L0 | Inspeção de base | Diff demonstra preservação da migration/schema/guards da fixture F04-04 |
| SUPCON-02 | L0 | Build sem credencial | `pnpm install --frozen-lockfile`, lint, typecheck, build, unit tests funcionam sem Supabase |
| SUPCON-03 | L0 | Sem DB configurado | liveness 200, readiness 503 e código explícito sem falsas consultas |
| SUPCON-04 | L0 | Config inválida | URL/porta/host/flag/profile errado rejeitado antes de conexão |
| SUPCON-05 | L0 | Isolamento de perfis | Fixture loopback não consegue aceitar URL remota, cloud não herda `SPIKE_*` |
| SUPCON-06 | L0 | TLS fail-closed | CA inválida, host incorreto e `ssl` off no profile remoto causam recusa segura |
| SUPCON-07 | L0 | Pool saturado | max 1, timeout finito e nenhuma transação parcial |
| SUPCON-08 | L0 | Lifetime do client | singleton/lazy e shutdown não deixam conexões vazadas |
| SUPCON-09 | L0 | Liveness sem DB | permanece 200 ao interromper PostgreSQL, sem mascarar readiness |
| SUPCON-10 | L0 | Readiness efetiva | quando DB explicitamente habilitado e está íntegro, ready reflete estado real; falha -> 503 |
| SUPCON-11 | L0 | Error redaction | erros de DNS/TCP/credencial não expõem URL, senha ou token |
| SUPCON-12 | L0 | Reconexão | desligar/reiniciar DB local com recuperação e sem duplicação de fatos |
| SUPCON-13 | L0 | Proteção migrations | startup normal nunca aplica DDL; scripts `spike:*` permanecem apenas em loopback |
| SUPCON-14 | L0 | Role read-only local | consulta autorizada e DDL/DML negados por grants efetivos em DB descartável |
| SUPCON-15 | L0 | Ameaças Data API/RLS | checklist de schema exposto, políticas e grants; sem alteração remota |
| SUPCON-16 | L0 | CI com DB real | job isolado roda a suíte PGSP 16/16; anotar ID da execução após push |
| SUPCON-17 | L0 | Windows/Linux EOL | `pnpm check` Windows local real e Linux CI, sem desligar o formatter |
| SUPCON-18 | L1 | Supavisor IPv4 | seleção de session mode `5432` com endpoint copiado do Dashboard, `SELECT` autorizado |
| SUPCON-19 | L1 | TLS/identidade remoto | CA e hostname verificados efetivamente; negativo rejeita certificado incompatível |
| SUPCON-20 | L1 | Pool e prepared statements | múltiplas consultas read-only, limites medidos, sem sessão corrompida |
| SUPCON-21 | L1 | Pause/indisponibilidade | falha controlada e recuperação observada, sem induzir pausa do projeto |
| SUPCON-22 | L1 | Auditoria de exposição | registrar de modo passivo grants/RLS/Data API conforme permissão de leitura; sem GRANT/DDL |

## Critério de encerramento

- L0: **SUPCON-01–17** executados, com bloqueios explicitamente justificados; 16 PGSP preservados.
- L1: **somente depois de autorização específica do projeto de teste**. Caso contrário registrar `BLOCKED-NO-REMOTE` nos casos 18–22 — não chamar de erro funcional.
- ADR-006/010, DB-001–028, segurança final, migrations cloud, backup/restauração, Stripe e operação comercial **continuam pendentes**.
