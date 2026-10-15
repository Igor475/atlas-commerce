# PRIC-02 — Modelo, vigência e invariantes

## Escolha técnica local

| Alternativa                                    | Avaliação                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Sobrescrever uma linha de preço                | Simples, perde histórico; rejeitada.                                                        |
| Intervalos agendáveis com exclusion constraint | Requer desenho de agendamento e possivelmente extensão; fora do escopo.                     |
| Slot por produto + revisões e um CURRENT       | Escolhida: lock por produto, histórico preservado e troca atômica sem extensão/agendamento. |

[Prisma](../../../apps/api/prisma-pricing/schema.prisma) descreve PriceProduct e
PriceRevision. [SQL versionado](../../../apps/api/prisma-pricing/migrations/202610150002_pricing/migration.sql)
é a fonte de FKs, CHECKs, índice parcial, triggers e view, que Prisma não representa
integralmente. PriceProduct referencia Catalog Product por FK SQL sem copiar seu
modelo/schema; possui contador técnico. Revisão tem UUID estável, produto/versão
únicos, BIGINT amount_cents, BRL, CURRENT/RETIRED, source interno e tempos PostgreSQL.

CHECK limita centavos a0..9007199254740991; nenhuma divisão/conversão de valor
decimal ou arredondamento. bigint é convertido para Number somente após validação
do intervalo seguro. Negativo/fracionário/NaN/infinito/overflow/moeda inválida são
recusados. source tem formato técnico limitado e é produzido por escrita interna
controlada, nunca autoridade do navegador.

**Gratuidade PENDENTE:** zero é representável monetariamente no banco, mas PublicPrices
recusa sua publicação com503 nesta etapa. Não é fallback nem política geral de
proibir produtos gratuitos; é ausência de aprovação comercial. Fixture zero é
exclusivamente um caso negativo, removido no descarte/reseed. Nenhuma opção para
liberar gratuidade automaticamente foi criada, nem alteração em Money/Catalog.

## Histórico, relógio e concorrência

Índice parcial UNIQUE(product_id) WHERE state=CURRENT impede duas correntes.
UNIQUE(product_id,version), FKs e CHECKs protegem identidade e estados. Triggers
serializam alterações no slot por produto, validam versão/counter, impedem
sobreposição de intervalos, DELETE e edição de valor/moeda/origem/IDs/tempos de
revisões. A única transição é CURRENT→RETIRED com fim válido, não reativação histórica.

replace_base_price é primitiva **interna da fixture/owner de migração**, SECURITY
INVOKER, sem rota HTTP. Sob FOR UPDATE no slot, mede clock_timestamp() depois do
lock, encerra revisão anterior e cria nova CURRENT com o mesmo cutover, na mesma
transação. Falha reverte toda a troca. EXECUTE não é concedido a PUBLIC/runtime.
Nenhum parâmetro de data/agendamento é aceito; instante futuro é recusado. Se o
relógio não avançar frente à revisão anterior, recusa em vez de inventar instante.

Intervalos são **[starts_at, ends_at)**; CURRENT tem fimnull. Antes do primeiro
início não há preço; no início ele vigora; no cutover o antigo deixa de vigorar e
o novo começa. Testes selecionam revisões reais nessas fronteiras usando microssegundos
do PostgreSQL, sem perder precisão por Date JavaScript. Ausência de CURRENT
provocada em teste retorna503; não é gratuidade. Não há expiração/agendamento automático.

View current_prices usa statement_timestamp() PostgreSQL, materializado uma vez
por instrução. Consulta em lote tem um snapshot MVCC, sem cache por produto ou N+1.
Leitura durante troca não commitada vê a versão antiga; após commit vê a nova.
Duas conexões de escrita comprovam espera por lock via pg_stat_activity e três
revisões ordenadas, com apenas uma corrente. Não congela preço para compra futura.

## Ownership, permissões e ambiente

Fixture integrada usa DB atlas_catalog_cat01/loopback55439, markers CAT-01 e PRIC-01,
PostgreSQL17.10 por digest. Catalog migration/owner permanecem inalterados. Pricing
tem migrator atlas_pricing_migrator e runtime atlas_pricing_runtime próprios.
Migrator recebe CREATE no DB apenas na fixture, USAGE Catalog e REFERENCES(id)
para criar a FK; não recebe SELECT/DML Catalog. Runtime só tem USAGE pricing e
SELECT current_prices. Catalog runtime não ganha grants Pricing.

Runtime valida nome/markers/major17, flags elevadas, membership e grants perigosos
nos objetos Pricing antes da leitura; grant UPDATE artificial provoca503 e, revogado,
nova leitura recupera. Isso é guarda local limitada, **não detector L1-SQL**, inventário
de todos os objetos ou promessa de ausência de direitos PUBLIC nativos.

Opt-in exige PRICING_MODE=local-disposable, PRICING_CONSENT=PRIC-01 e Catalog local
habilitado; URL exata role/schema/loopback sem senha ou parâmetros extras. Ambiente
PG/URL migrator, modo remoto e produção recusados. Runner confere DB/role/markers,
owner/tabela Catalog e PG17 antes de Prisma criar histórico/DDL. SQL repete guarda.
Sem dotenv, db push, migration no startup ou credencial de migração nas leituras HTTP.

Pool Pricing2, connect/acquire1000ms, statement1500ms/query2000ms, idle1000ms,
idle-in-transaction2000ms, lifetime30s; shutdown fecha pool. Perda real de conexão
e lock provocam503 minimizado e recuperação; teste confirma zero sessões Catalog/Pricing
após close. Trust/sem TLS existe somente na fixture loopback, sem segredo real;
não é prova de TLS/Supabase nem contenção contra administrador/SO local.

Harness reserva o mesmo lock de porta de Catalog, usa projeto UUID próprio, recusa
Docker remoto e verifica labels/binding antes de testes e limpeza. Aplica/reaplica
migrations separadas, sem recriar Catalog por conveniência. Remove apenas seus
containers/volume/network; não usa prune. SIGKILL/falhas SO/Docker podem impedir
cleanup; recuperação exige checar ownership e recriar apenas a fixture descartável.
Privilégios do owner permitem manutenção administrativa: não se promete impedir
que um administrador desabilite triggers. Escrita comercial futura exige contrato
STAFF/MFA/auditoria e não está autorizada aqui.
