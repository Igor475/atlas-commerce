# CP-05 — Matriz CP-001–036

**16/10/2026 · 36 PASS em PostgreSQL 17 descartável.** Migration aplicada/reaplicada;
evidência final e regressões separadas em [CP-06](CP-06-handoff-e-pendencias.md).
Não são testes de API comercial, Supabase ou prova postal. A suite está em
[profile.integration.ts](../../../apps/api/test/customer-profile/profile.integration.ts).

| Caso   | Evidência / resultado                                                                                | Estado |
| ------ | ---------------------------------------------------------------------------------------------------- | ------ |
| CP-001 | Default desativado e recusa de produção                                                              | PASS   |
| CP-002 | Owner/schema isolado, FK composta e ponteiro de revisão diferido                                     | PASS   |
| CP-003 | Migration sob role errada e operação sob marker errado recusadas                                     | PASS   |
| CP-004 | Aplicação/reaplicação por CLI, uma migration concluída sem duplicação                                | PASS   |
| CP-005 | Runtime sem tabela/manutenção/CREATE; atributos perigosos ausentes                                   | PASS   |
| CP-006 | Destino externo/porta/parâmetros/role errados e argumento CLI extra recusados                        | PASS   |
| CP-007 | Port de principal e vínculo SQL independentes, contexto staff/ausente negado                         | PASS   |
| CP-008 | Mais de um endereço próprio, IDs estáveis                                                            | PASS   |
| CP-009 | Endereço alheio negado nos dois ports, ator forjado não passa no SQL                                 | PASS   |
| CP-010 | Conta inativa ou não verificada negada mesmo com principal aparentemente elegível                    | PASS   |
| CP-011 | ID inválido e versão inválida recusados                                                              | PASS   |
| CP-012 | Inexistente/alheio com mesmo erro redigido                                                           | PASS   |
| CP-013 | Revisões 1/2 e ponteiro atual coerentes                                                              | PASS   |
| CP-014 | UPDATE/DELETE da revisão e reatribuição de owner recusados                                           | PASS   |
| CP-015 | Duas conexões esperando lock real, uma atualização vence; outra conflita; refresh avança a 3         | PASS   |
| CP-016 | Versão previamente lida para quote recusa snapshot depois de mudança                                 | PASS   |
| CP-017 | Leitura espera writer real e vê a revisão efetivamente commitada                                     | PASS   |
| CP-018 | Retirada lógica preserva histórico e é terminal na fixture                                           | PASS   |
| CP-019 | Cópia aceita e revisão antiga preservadas após edição; não cria Order comercial                      | PASS   |
| CP-020 | Resultado commitado descartado e replay da mesma intenção sem nova revisão; chave conflitante negada | PASS   |
| CP-021 | Port Quotes retorna só ID/versão/país/CEP/elegibilidade, sem PII de expedição                        | PASS   |
| CP-022 | Snapshot completo com campos tipados, revisão e purpose TEST_ONLY                                    | PASS   |
| CP-023 | Desativação da conta espera até terminar a transação de snapshot                                     | PASS   |
| CP-024 | Lock timeout mapeado para indisponibilidade, sem sucesso fabricado                                   | PASS   |
| CP-025 | Snapshot mantém SHARE até callback terminar, bloqueia retirada, rejeita contexto forjado/reutilizado | PASS   |
| CP-026 | Consumidor Orders-like espera edição/inelegibilidade e recusa a versão antiga                        | PASS   |
| CP-027 | SQL injection permanece texto literal e não altera schema                                            | PASS   |
| CP-028 | Campos extras e objeto postal sem schema recusados nas duas fronteiras                               | PASS   |
| CP-029 | Grant indevido/membership bloqueiam adapter; leitura SQL bruta continua negada                       | PASS   |
| CP-030 | Erro não inclui payload postal, SQL, conexão ou metadata Prisma                                      | PASS   |
| CP-031 | HTTP real confirma ausência de endpoints Profile/endereço/quote; AppModule intacto                   | PASS   |
| CP-032 | Fixture sem Identity e sem imports de credenciais/sessões; regressão completa separada               | PASS   |
| CP-033 | Fixture Profile não instala Catalog/Pricing; regressões completas separadas                          | PASS   |
| CP-034 | Mutação não instala Inventory nem reserva; regressão completa separada                               | PASS   |
| CP-035 | Rollback do callback libera locks, não muda revisão; regressões Orders/Quotes separadas              | PASS   |
| CP-036 | Runner/destino/lock próprios sem CLI remoto; PGSP/L0/INT-02/MRD/gates separados                      | PASS   |

CP-032–036 são guardas de fronteira e rollback, **não substituem as suítes completas**.
CP-020 prova replay após perda da resposta pelo consumidor em simulação controlada,
não perda real de ACK TCP ou reinício de serviço comercial. Quatro unitários
adicionais protegem UUID completo, principal, schema postal e configuração local.
Não promover número de casos a homologação; ver resultados e limites por comando.
