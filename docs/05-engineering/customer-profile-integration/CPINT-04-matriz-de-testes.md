# CPINT-04 — Matriz executada

Os 36 casos abaixo passaram em PostgreSQL 17.10 real descartável em 16/10/2026. [Fonte executável](../../../apps/api/test/profile-integration/profile-orders.integration.ts). O harness aplica e reaplica migrations antes dos testes; falhas encerram a execução e acionam cleanup próprio.

| ID        | Prova                                                        |
| --------- | ------------------------------------------------------------ |
| CPINT-001 | Marker, PG17, mesmo banco, defaults isolados                 |
| CPINT-002 | Históricos e owners distintos                                |
| CPINT-003 | Migration recusa role e marker incorretos                    |
| CPINT-004 | Reaplicação sem migrations pendentes                         |
| CPINT-005 | Consumidor não escreve Profile nem obtém snapshot arbitrário |
| CPINT-006 | URL remota, outro banco e argumentos extras recusados        |
| CPINT-007 | Principal server-side e vínculo SQL obrigatórios             |
| CPINT-008 | Quote própria vincula versão exata sem reservar              |
| CPINT-009 | Endereço e quote alheios recusados                           |
| CPINT-010 | Conta inativa ou não verificada recusada                     |
| CPINT-011 | Contexto forjado e ports legados recusados                   |
| CPINT-012 | Replay/leitura não contornam revogação da conta              |
| CPINT-013 | Snapshot tipado da revisão vigente                           |
| CPINT-014 | Edição posterior à quote exige recotação                     |
| CPINT-015 | Retirada de elegibilidade recusa preparação                  |
| CPINT-016 | Escritor vence lock; Orders recusa versão antiga             |
| CPINT-017 | Orders vence; escritor espera commit                         |
| CPINT-018 | Edição enquanto espera Catalog é revalidada                  |
| CPINT-019 | Referências imutáveis e revisão inexistente recusada         |
| CPINT-020 | Dois escritores sem lost update silencioso                   |
| CPINT-021 | Digital não chama ports postais; reserva null                |
| CPINT-022 | Quote mínima sem destinatário                                |
| CPINT-023 | Mudança concorrente de preço/publicação recusa atomicamente  |
| CPINT-024 | Falha após snapshot reverte tudo                             |
| CPINT-025 | Falha após reserva Inventory real reverte tudo               |
| CPINT-026 | Kits físico/misto preservam alocação e snapshot              |
| CPINT-027 | Falta de componente e expiração durante espera sem parcial   |
| CPINT-028 | PID/XID comum e contagens duráveis                           |
| CPINT-029 | Replay preserva histórico após edição/expiração              |
| CPINT-030 | Chave igual com quote diferente conflita                     |
| CPINT-031 | Processo morto antes/depois do commit e recuperação          |
| CPINT-032 | Duas conexões mesma intenção, um snapshot                    |
| CPINT-033 | Grants extras, função antiga e membership fail-closed        |
| CPINT-034 | Erros sem PII postal ou detalhes SQL                         |
| CPINT-035 | Hashes normalizados preservam fontes e migrations antigas    |
| CPINT-036 | Sem endpoint público; CI somente harness local               |

CPINT-035/036 verificam preservação/estrutura; não substituem a execução separada das regressões e gates relatada no handoff. Os testes digitais substituem ports postais por funções que falham se chamadas, demonstrando ausência da leitura; não são mocks da prova transacional.
