# ORD-04 — Matriz de testes

**15/10/2026: ORD-001–036 PASS em PostgreSQL 17 descartável.** Os casos 032–036 protegem fontes existentes;
as suítes executáveis completas são gates separados, não substituídos por diff.

ORD-013 também comprovou lock de Catalog retido até o commit; ORD-014 incluiu
falha posterior à reserva e retry integral após SQLSTATE 40001, sem duplicação;
ORD-020 incluiu timeout de lock e recuperação da mesma intenção; ORD-031 negou
grants por coluna e execução de funções privadas. Quatro testes unitários
adicionais cobrem domínio e fronteiras servidor. Não há prova comercial/remota.

| Caso    | Prova local                                                            |
| ------- | ---------------------------------------------------------------------- |
| ORD-001 | Composição fechada; destino/role/parâmetros/produção recusados         |
| ORD-002 | Schema/owner e quatro históricos de migrations aplicados e reaplicados |
| ORD-003 | Migration recusa role/marker errado; port recusa destino inválido      |
| ORD-004 | ACLs, poderes, leitura privada/manutenção/membership negados           |
| ORD-005 | Runners não aceitam destino externo nem parâmetros arbitrários         |
| ORD-006 | Runtime sem vínculo de ator recusado                                   |
| ORD-007 | Snapshot físico e centavos-base confiáveis                             |
| ORD-008 | Ebook sem Inventory intent                                             |
| ORD-009 | Revista e referências editoriais                                       |
| ORD-010 | Kit físico/preço próprio/consolidação com avulso                       |
| ORD-011 | Kit misto, reserva física sem entitlement                              |
| ORD-012 | Imutabilidade após título/preço/publicação                             |
| ORD-013 | Quatro PID/XID iguais e xmin Orders/Inventory                          |
| ORD-014 | Falha depois da reserva, rollback de todos os efeitos                  |
| ORD-015 | Estoque insuficiente sem reserva parcial                               |
| ORD-016 | Substituição de preço após leitura preliminar/antes do lock            |
| ORD-017 | Retirada de publicação após leitura preliminar/antes do lock           |
| ORD-018 | Kit com componente não publicado recusado                              |
| ORD-019 | Última unidade, duas conexões/barreira real                            |
| ORD-020 | Morte do processo antes do commit e retry                              |
| ORD-021 | Replay após alterações e expiração da cotação                          |
| ORD-022 | Fingerprint/cotação conflitante, zero efeitos adicionais               |
| ORD-023 | Duas conexões, mesma intenção, convergência sob lock                   |
| ORD-024 | Morte depois do commit/antes da resposta e replay                      |
| ORD-025 | Escopo/operação e chave Inventory estáveis                             |
| ORD-026 | Mesma chave externa, titulares diferentes isolados                     |
| ORD-027 | Ownership no port e no session_user SQL                                |
| ORD-028 | Ausência de endpoints Orders/checkout                                  |
| ORD-029 | Prazo físico/misto igual ao PostgreSQL                                 |
| ORD-030 | Digital e kit digital com null sempre presente                         |
| ORD-031 | Poder indevido bloqueia; preço/owner arbitrário recusados              |
| ORD-032 | Fontes Catalog/Pricing preservadas; regressões completas separadas     |
| ORD-033 | Fontes Inventory preservadas; regressão completa separada              |
| ORD-034 | Fontes Identity/Resend preservadas; regressão completa separada        |
| ORD-035 | Fontes PGSP/L0/L1/MRD preservadas; regressões completas separadas      |
| ORD-036 | Contratos/gates existentes preservados; gates globais separados        |
