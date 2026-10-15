# PRIC-03 — Matriz PRIC-001–030

Nova matriz, sem renumerar CAT/API/PGSP/MRD. Evidências novas do delta15/10/2026,
baseline main1727a38, sem commit. [Suíte real](../../../apps/api/test/pricing/pricing.integration.ts),
[unitários monetários](../../../apps/api/test/pricing/pricing.unit.spec.ts) e
[resultados](../../../apps/api/test/pricing/RESULTS.md). Status final depende da
execução registrada; não inferir PASS remoto a partir do teste local.

| ID       | Prova                                                                                                | Resultado                    |
| -------- | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
| PRIC-001 | Default fechado, opt-in/mode/produção e HTTP sem Pricing.                                            | PASS local                   |
| PRIC-002 | Host/role/db/parâmetros errados; SQL em postgres aborta antes de schema.                             | PASS local                   |
| PRIC-003 | Históricos separados e migrations aplicadas/reaplicadas.                                             | PASS local                   |
| PRIC-004 | FK, valores inválidos e rollback sem perder preço corrente.                                          | PASS local                   |
| PRIC-005 | Runtime sem escrita/exec/flags/membership, Catalog sem grants novos; drift UPDATE recusa e recupera. | PASS local                   |
| PRIC-006 | Owners/schema separados, sem campos de preço no Catalog.                                             | PASS local                   |
| PRIC-007 | BRL obrigatório no PostgreSQL.                                                                       | PASS local                   |
| PRIC-008 | BIGINT máximo seguro convertido exatamente via HTTP.                                                 | PASS local                   |
| PRIC-009 | Zero não vira fallback/gratuidade aprovada; HTTP503.                                                 | PASS local                   |
| PRIC-010 | Sem versão corrente retorna503.                                                                      | PASS local                   |
| PRIC-011 | Seleção real antes/no início, relógio PostgreSQL; agendamento futuro recusado.                       | PASS local                   |
| PRIC-012 | Duas correntes/intervalos conflitantes recusados.                                                    | PASS local                   |
| PRIC-013 | Histórico imutável e seleção real antes/no fim exclusivo.                                            | PASS local                   |
| PRIC-014 | Dois writers serializados, leitura não vê alteração não commitada.                                   | PASS local                   |
| PRIC-015 | Livro físico com preço persistido.                                                                   | PASS local                   |
| PRIC-016 | E-book/revista digital com preços persistidos e préviafalse.                                         | PASS local                   |
| PRIC-017 | Kits com preço próprio diferente da soma observada dos componentes.                                  | PASS local                   |
| PRIC-018 | Um lote real para a página, sem N+1.                                                                 | PASS local                   |
| PRIC-019 | Um preço ausente recusa toda a página, depois recupera.                                              | PASS local                   |
| PRIC-020 | Preço de produto privado não contorna publicação Catalog.                                            | PASS local                   |
| PRIC-021 | Keyset com preços reais, sem duplicação.                                                             | PASS local                   |
| PRIC-022 | Respostas HTTP conformes ao OpenAPI3.1 vigente e refs internos resolvidos.                           | PASS local                   |
| PRIC-023 | SQL injection e preço vindo de query/browser recusados.                                              | PASS local                   |
| PRIC-024 | Conexão ativa terminada realmente; erro503 minimizado e recuperação.                                 | PASS local                   |
| PRIC-025 | Lock/timeout real e zero sessões após close.                                                         | PASS local                   |
| PRIC-026 | Pricing disabled503, opt-in restaura integração real.                                                | PASS local                   |
| PRIC-027 | Sem metadados administrativos ou rotas de escrita pública.                                           | PASS local                   |
| PRIC-028 | Preservação Identity/Resend; regressão original executada separadamente.                             | PASS local e regressões      |
| PRIC-029 | CAT/PGSP/L0/L1/MRD/normas preservados; regressões originais separadas.                               | PASS local e regressões      |
| PRIC-030 | EXPLAIN, gates, formatação histórica e CI remoto relatados separadamente.                            | PARCIAL agregado; local PASS |

PRIC-028/029 são agregados: diff protegido não substitui execução das regressões.
PRIC-030 agregado não pode ser PASS completo enquanto gate global ou CI remoto
estiverem pendentes, mesmo que os30 testes de integração locais passem. Gratuidade
continua decisão pendente; passar seu negativo não é aprová-la comercialmente.
