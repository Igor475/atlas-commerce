# QUSE-04 — Replay e segurança

| Situação                                                       | Resultado interno                                       |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| Mesma conta/operação/chave/quote/fingerprint, commit existente | Histórico idêntico; sem novos efeitos                   |
| Quote expirada depois do commit                                | Replay autorizado; reserva/snapshot/TTL originais       |
| Quote expirada sem preparação                                  | STALE_INPUT; sem consumo                                |
| Outra chave, quote consumida                                   | CONFLICT; não tenta outra compra                        |
| Mesma chave, quote/fingerprint diferentes                      | CONFLICT                                                |
| Processo encerrado após commit sem resposta                    | Nova conexão recupera fato durável                      |
| Conta revogada ou outro titular                                | Recusa; replay não contorna autorização                 |
| Falha antes de commit                                          | Rollback total; pode repetir enquanto condições válidas |

## Menor privilégio

O novo [adapter privado Orders](../../../apps/api/src/modules/orders/infrastructure/quote-consumption-database.ts) permite apenas dois ports Orders e mantém os dois ports Quotes/Shipping de emissão/projeção. Executor é NOLOGIN, search_path fixo pg_catalog, EXECUTE PUBLIC revogado. Só executor insere/lê a tabela; runtime não possui DML, membership, ownership, CREATE/TEMP ou acesso a funções privadas. Migrator não é runtime. Não se usa SET ROLE na aplicação para autorizar; testes administrativos usam somente para provar guard de migration.

A migration revoga os ports Shipping dos atores e todos os ports Orders da role runtime legada. Os demais ports legados já estavam revogados nas cadeias anteriores. Se um grant indevido for restaurado, o adapter detecta ACL extra e recusa; SQL direto continua sujeito a UNIQUE e ao trigger diferido de fluxo completo. O administrador/owner do laboratório é uma autoridade confiável: pode alterar o próprio schema; isso não é tratado como credencial runtime.

Guard local exige host 127.0.0.1, porta 55439, banco/roles/schema exatos, ausência de senha/parâmetros extras, consentimento QUSE-01, PostgreSQL17 e marker próprio. Composição desabilitada por padrão, recusa produção/variáveis PG/DATABASE_URL/migration. Não registrada em AppModule, sem controller. Pools limitados, lock/statement/query/transaction timeouts preservados. SQL parametrizado; DTO privado existente recusa campos extras e IDs inválidos. Erros de banco são convertidos a códigos internos genéricos sem dados postais, SQL ou URLs.

O [harness](../../../apps/api/scripts/quote-consumption-local.mjs) aceita zero argumentos, sanitiza ambiente, exige Docker unix/npipe local, usa lock compartilhado da porta e verifica projeto UUID/loopback/marker antes de migrations. Cleanup remove somente recursos próprios; não para container alheio. Fixture trust e TLS desligado pressupõem computador confiável e dados artificiais; não é garantia de isolamento de produção.

L1_SQL_STRICT, Identity/Resend, MFA, Stripe, Supabase, provedores e políticas normativas permanecem intactos. HTTP de conflito comercial, retenção de intenção e autenticação real continuam pendentes.
