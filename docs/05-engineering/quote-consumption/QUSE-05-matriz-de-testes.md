# QUSE-05 — Matriz PostgreSQL

Fonte executável: [36 cenários QUSE](../../../apps/api/test/quote-consumption/quote-consumption.integration.ts), PostgreSQL 17 real. **36/36 PASS local em 16/10/2026**, incluindo backfill compatível e recusa de histórico incompatível. Dois testes unitários adicionais validam isolamento de configuração.

| ID       | Cenário executado                                                                          | Resultado  |
| -------- | ------------------------------------------------------------------------------------------ | ---------- |
| QUSE-001 | exact local PostgreSQL17 and consumption marker                                            | PASS local |
| QUSE-002 | migrator separate from runtime and NOLOGIN function owner                                  | PASS local |
| QUSE-003 | migration refuses wrong role or marker before DDL                                          | PASS local |
| QUSE-004 | repeated migration history and incompatible legacy data refuse without deletion            | PASS local |
| QUSE-005 | persistent ownership FK and immutable consumption                                          | PASS local |
| QUSE-006 | rejects remote credentials parameters consent production and CLI arguments                 | PASS local |
| QUSE-007 | first preparation commits one complete physical effect set                                 | PASS local |
| QUSE-008 | same key replays identical durable result without effects                                  | PASS local |
| QUSE-009 | different key conflicts including retries without a second intention                       | PASS local |
| QUSE-010 | two connections different keys observe real advisory contention                            | PASS local |
| QUSE-011 | three connections yield one winner and two controlled conflicts                            | PASS local |
| QUSE-012 | independent quotes can commit while another preparation is uncommitted                     | PASS local |
| QUSE-013 | database unique constraint blocks second request even outside wrapper                      | PASS local |
| QUSE-014 | revoked legacy ports and restored grant still cannot commit bypass                         | PASS local |
| QUSE-015 | new connection recovers same completed intention                                           | PASS local |
| QUSE-016 | replay after real quote expiration preserves reservation TTL and historical snapshot       | PASS local |
| QUSE-017 | expired quote without completed intention refuses without consumed state                   | PASS local |
| QUSE-018 | same key different quote fingerprint conflicts without affecting either quote              | PASS local |
| QUSE-019 | process death before commit rolls back and after commit recovers without application reply | PASS local |
| QUSE-020 | other actor or forged principal cannot prepare or recover private result                   | PASS local |
| QUSE-021 | revoked account cannot replay; revocation waits for authorized in-flight transaction       | PASS local |
| QUSE-022 | physical book has one consumption shipping snapshot and reserve                            | PASS local |
| QUSE-023 | ebook still consumes quote without calling Shipping or postal ports                        | PASS local |
| QUSE-024 | digital magazine still consumes quote without reserve or freight                           | PASS local |
| QUSE-025 | physical kit and repeated loose SKU reserve consolidated vector once                       | PASS local |
| QUSE-026 | mixed kit has single consumption and only physical allocation                              | PASS local |
| QUSE-027 | digital kit has unique consumption while all physical ports are blocked                    | PASS local |
| QUSE-028 | insufficient stock rolls back entire kit including consumption                             | PASS local |
| QUSE-029 | consumption Shipping Profile Orders and Inventory share PID XID and commit                 | PASS local |
| QUSE-030 | failure after postal snapshot leaves no partial facts and same key can retry               | PASS local |
| QUSE-031 | failure after reserve and consumption insert rolls everything back                         | PASS local |
| QUSE-032 | expiry during stock lock and quote-lock timeout both fail closed                           | PASS local |
| QUSE-033 | runtime has no DML private functions membership or extra grants                            | PASS local |
| QUSE-034 | invalid IDs injection mass assignment and errors disclose no private details               | PASS local |
| QUSE-035 | preexisting modules migrations contracts and frontend preserved                            | PASS local |
| QUSE-036 | dedicated job pinned isolated and preserves all twelve existing jobs                       | PASS local |

As provas digitais bloqueiam os ports Shipping e Profile postal. Concorrência utiliza conexões independentes, pg_stat_activity e pg_locks; polling observa a barreira, sem determinar vencedor por sleeps. Contagens abrangem consumo, Shipping/Profile, request/preparação, eventos, reserva e ledger. QUSE-035/036 não substituem as regressões/gates separados no [handoff](QUSE-06-handoff-e-pendencias.md).
