# INV-04 — Matriz INV-001–036

Suíte real: [inventory.integration.ts](../../../apps/api/test/inventory/inventory.integration.ts).
Evidências, rodadas e limitações: [RESULTS](../../../apps/api/test/inventory/RESULTS.md).
PASS local não significa aprovação de produção ou CI remoto do delta.

| ID      | Prova executada                                                                  | Estado                                                       |
| ------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| INV-001 | Default fechado, URLs externas/roles/produção recusadas                          | PASS local                                                   |
| INV-002 | Migration e ownership próprios, um registro finalizado                           | PASS local                                                   |
| INV-003 | Reaplicação real preserva ledger                                                 | PASS local                                                   |
| INV-004 | DML/DDL direto e função decide negados ao runtime                                | PASS local                                                   |
| INV-005 | CHECKs SQL impedem negativo, overflow e compromisso excessivo                    | PASS local                                                   |
| INV-006 | Marker errado recusa runtime e migrator antes de DDL                             | PASS local                                                   |
| INV-007 | Disponibilidade e conversão reservado/alocado reais                              | PASS local                                                   |
| INV-008 | UPDATE/DELETE de ledger e eventos recusados                                      | PASS local                                                   |
| INV-009 | Replay mesma intenção sem novo efeito                                            | PASS local                                                   |
| INV-010 | Reconciliação de três projeções com somatório de deltas                          | PASS local                                                   |
| INV-011 | SKU físico existente; inexistente recusado                                       | PASS local                                                   |
| INV-012 | SKU digital não aceita saldo físico                                              | PASS local                                                   |
| INV-013 | Duas conexões, última unidade, barreira real, um vencedor                        | PASS local                                                   |
| INV-014 | Lock em SKU A não bloqueia reserva de SKU B                                      | PASS local                                                   |
| INV-015 | SKU repetido consolidado em uma linha                                            | PASS local                                                   |
| INV-016 | Múltiplos SKUs e evento no mesmo commit                                          | PASS local                                                   |
| INV-017 | Intenção idêntica concorrente cria uma reserva                                   | PASS local                                                   |
| INV-018 | Fingerprint divergente recusa sem segunda movimentação                           | PASS local                                                   |
| INV-019 | Falta em qualquer SKU desfaz também intenção e outros compromissos               | PASS local                                                   |
| INV-020 | Timeout de lock, rollback, replay seguro; SQLSTATE 40001 reexecuta integralmente | PASS local                                                   |
| INV-021 | Kit físico reserva todos os componentes                                          | PASS local                                                   |
| INV-022 | Kit misto ignora digital para saldo                                              | PASS local                                                   |
| INV-023 | Kit digital sem reserva/TTL, intenção idempotente                                | PASS local                                                   |
| INV-024 | Componente indisponível não deixa compromisso parcial                            | PASS local                                                   |
| INV-025 | Componentes repetidos entre kits/avulso somados                                  | PASS local                                                   |
| INV-026 | Composição não elegível/publicada recusada                                       | PASS local                                                   |
| INV-027 | TTL 2400 segundos e início após espera por lock, DB clock                        | PASS local                                                   |
| INV-028 | Dois expiradores, uma liberação e ledger único                                   | PASS local                                                   |
| INV-029 | Confirmação/expiração disputam; vencida nunca aloca                              | PASS local                                                   |
| INV-030 | Confirmação iniciada antes do prazo, liberada depois, recusa                     | PASS local                                                   |
| INV-031 | CONFIRMED não expira; RELEASED não revive; decisão negada                        | PASS local                                                   |
| INV-032 | Processo morto antes de commit; rollback e restart/replay estáveis               | PASS local                                                   |
| INV-033 | Permissões entre domínios, injection e POST Inventory inexistentes               | PASS local                                                   |
| INV-034 | Conexão terminada, replay de resultado confirmado, drift DML detectado           | PASS local                                                   |
| INV-035 | Diff protegido e regressões dos módulos originais                                | PASS: regressões novas                                       |
| INV-036 | PG17/EXPLAIN/job dedicado; qualidade e CI separados                              | PARCIAL:32 CRLF históricos; CI remoto do delta não executado |

Os testes de composição positivos usam dados Catalog persistidos, não um kit
inventado em memória. A simulação financeira é explícita, local e não comprova
Payments/Stripe. O teste de 40001 usa trigger da fixture e sequence para contar
tentativas reais; timeout real de lock também é exercitado. Não se declara que houve
deadlock espontâneo ou prova de carga comercial. Todos os IDs são preservados.
