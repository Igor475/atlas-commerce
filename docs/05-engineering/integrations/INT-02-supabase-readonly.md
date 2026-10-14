# INT-02 — Preparação Supabase L1 somente leitura

> Registro original preservado abaixo. Para o estado atualizado do projeto,
> a política publicada e o job dedicado, consultar
> [INT-02.1 — PostgreSQL, CI e plano não executado](INT-02-1-postgresql-ci.md).
> L1 remoto permanece PENDENTE; a fixture local endurecida não prova os defaults Supabase.

**Estado remoto: `BLOCKED_NO_PROJECT_OR_READONLY_ROLE`.** Baseline
`fd0b16e4a4f89fa2a64c76a132807c2d913c9913`, branch `main`, inicialmente limpa.
Em 14/10/2026 o responsável informou o nome **Atlas Commerce** e o identificador
público `bkxrsgryzkgpwgkngieh`. A organização ainda não foi identificada; não existe
connector Supabase disponível nesta sessão para confirmação independente. Não
foram fornecidos role restrita, endpoint Connect, certificado ou consentimento
para executar L1 remoto. Nenhum socket Supabase foi aberto, nenhum SQL remoto foi
executado. Não houve criação/alteração de recursos do provedor.

## Fronteira de execução

O serviço web permanece com o guard `REMOTE_AUTHORIZATION_REQUIRED` em
[ReadOnlyProbe](../../../apps/api/src/infrastructure/persistence/probe-readiness.ts).
Identity continua exclusivamente nas fixtures locais anteriores. Nenhuma
autenticação passa a persistir no Supabase por INT-02. O diagnóstico novo não é
registrado no NestJS nem substitui `/health/ready`.

- [Configuração opt-in](../../../apps/api/src/infrastructure/persistence/l1-config.ts):
  exige revisão pública do projeto/organização, endpoint e username exatos do
  Dashboard Connect, `ATLAS_SUPABASE_PROJECT_REF` coincidente e consentimento no
  argumento do comando. Recusa CI, parâmetros PG ambientes, DEBUG e bypass TLS.
  `DATABASE_URL` não é consumida. A senha possui variável exclusiva, nunca argv,
  JSON de revisão, Markdown ou logs. Não lê `.env`.
- [CLI manual](../../../apps/api/scripts/supabase-readonly.mjs): usa somente o
  diagnóstico, imprime códigos fixos, status equivalente a readiness e IDs das
  consultas. O número 503 nesse programa é um resultado diagnóstico, não uma
  nova rota HTTP. CLI **preparado, não executado contra Supabase**.
- [Diagnóstico](../../../apps/api/src/infrastructure/persistence/l1-diagnostic.ts):
  pool 1, conexão 3 s, statement 3 s, query 4 s, idle 1 s, lifetime 30 s. Destrói
  a conexão após cada prova, inclusive erro/timeout, e encerra o pool. Uma nova
  chamada revalida role/TLS; nenhum retry automático ou replay de escrita.

Session Mode IPv4/5432 é o único transporte preparado neste CLI. Host e username
devem vir do Connect do projeto confirmado, sem inferir região. Direct IPv6 e
transaction/6543 não foram preparados nem homologados. TLS utiliza a validação
de CA existente, `rejectUnauthorized:true`, TLS mínimo 1.2 e hostname explícito.
O certificado oficial compatível com o endpoint ainda precisa ser obtido e
verificado pelo responsável; isso não é pinning. O driver do diagnóstico é
`pg` 8.23.1; Prisma/adapter 7.10.0 e a preparação anterior permanecem intactos,
sem alegação de prova remota do ORM.

## Revisão necessária antes de uma prova remota futura

Um arquivo privado fora do repositório, indicado por
`ATLAS_SUPABASE_REVIEW_FILE`, deve conter os campos públicos de `L1Review`:
`projectName`, `projectRef`, `organization`, `host`, `username`, `role`,
`transport: session-ipv4`, `port: 5432`, `source: dashboard-connect`, `caFile`,
`dataApi` (`enabled` ou `disabled`) e `exposedSchemas`. Nenhum segredo nesse
arquivo. Não existe arquivo preenchido com suposições nesta entrega.

O arquivo registra uma revisão humana; a presença de texto JSON não comprova
por si só a identidade do projeto ou configuração do Dashboard. Confirmar a
organização/projeto, Connect, CA e Data API antes de fornecer a senha por canal
local seguro. Após consentimento expresso em tarefa separada e build da API,
o CLI exige `--consent-readonly=<ref confirmado>` a cada execução. Esse marcador
autoriza somente leitura, jamais DDL ou liberação de Identity remoto.

Não executar o runner local ou suas fixtures no provedor. Não criar role,
revogar grants ou modificar Data API por esta tarefa. Se a role existente for
insegura, encerrar como `ROLE_UNSAFE` e tratar configuração de privilégios em
escopo explicitamente autorizado.

## Prova de privilégios e seus limites

A consulta avalia `rolcanlogin`, superuser/CREATEDB/CREATEROLE/BYPASSRLS/replication,
qualquer membership, ownership via dependências compartilhadas, CREATE/TEMP no
banco, CREATE em schemas, DML efetivo em relações e colunas, sequences, funções,
default ACLs, defaults da role/banco e grants de parâmetros. Os helpers
`has_*_privilege` incluem PUBLIC e herança; membership é recusada mesmo sem
INHERIT para evitar futura troca de papel. Não há `SET ROLE` no diagnóstico.
`default_transaction_read_only=on` é exigido, mas não substitui grants mínimos.

A política é conservadora: qualquer função executável fora dos schemas de
sistema, SECURITY DEFINER ou builtin volátil (exceto `pg_backend_pid`) bloqueia.
Também bloqueia o UPDATE padrão PUBLIC da view `pg_settings`. Isso pode recusar
uma role convencional e funções benignas; **não é uma recomendação para revogar
privilégios compartilhados no Supabase automaticamente**. A fixture ajusta
exclusivamente seu banco descartável para demonstrar o caminho seguro. Uma
política remota mais específica requer análise e autorização, sem bypass por
conveniência. Privilégios podem mudar após o ensaio: resultado não certifica a
segurança futura do runtime.

O diagnóstico inspeciona schemas `identity`/`public`, grants públicos/API e RLS
das relações, incluindo schemas expostos declarados na revisão. `identity`
exposto ou com grants PUBLIC/anon/authenticated bloqueia; relações expostas com
grants API sem RLS (e views/foreign tables nessas condições) bloqueiam. Ausência
de `pgrst.db_schemas` não comprova Data API desabilitada; depende da revisão do
Dashboard. Catálogos não comprovam toda política de RLS, configuração HTTP/RPC,
Storage ou efetividade externa da Data API. Essas verificações continuam
pendentes no provedor. Nenhuma tabela de cliente é consultada.

## Consultas e reprodução local

Toda SQL potencial do diagnóstico está integralmente na allowlist
[l1-queries.ts](../../../apps/api/src/infrastructure/persistence/l1-queries.ts):
`server` (servidor/TLS/defaults), `role` (privilégios), `schemas`, `exposure`
(catálogo de relações/RLS/grants) e `ping` (`SELECT 1`). Todas começam com SELECT,
sem SQL fornecida pelo chamador. A transcrição indica quais foram tentadas;
`ROLE_UNSAFE` para após `server`/`role`. Não usa BEGIN, SET ou DDL remoto.

Com Node 24 e dependências já instaladas, executar da raiz:

```text
node apps/api/scripts/supabase-local.mjs
```

O [runner local](../../../apps/api/scripts/supabase-local.mjs) reutiliza a
imagem PostgreSQL 17.10 fixada e o compose existente, em projeto próprio
`atlas-int02-readonly-local`, loopback 55434. Recusa porta ocupada por outro
projeto e Docker remoto; descarta variáveis de conexão e integrações herdadas.
Gera CA/certificados temporários locais, aplica somente a
[fixture SQL](../../../apps/api/test/supabase-l1/readonly-fixture.sql), sem
migrations Prisma, e remove seu container/volume/certificados ao final.

Todas as consultas adicionais de controle, inclusive DDL/DML negativos e
LOCK/ROLLBACK para timeout, estão nos
[testes locais](../../../apps/api/test/supabase-l1/l1.integration.ts) e na
fixture. São exclusivamente do banco descartável, nunca provas remotas.
O runner não exige nem transmite credenciais Supabase e pode ser executado
em ambiente CI isolado; **nenhum job CI novo foi adicionado ou executado no
GitHub nesta entrega**. Os nove testes L0 anteriores permanecem separados.

## Saída de INT-02

Resultados locais e evidências estão em
[RESULTS.md](../../../apps/api/test/supabase-l1/RESULTS.md).
A matriz [SUPL1-001–015](INT-03-matriz-de-provas.md) permanece a referência de
aceite. SUPL1-015 remoto continua bloqueado. Endpoint, certificado Supabase,
grants reais, disponibilidade Free, pausa/retomada cloud e Data API real não
foram verificados. INT-03 futuro exige plano/consentimento de migrations,
runtime write separado, backup/restore, RLS e hosts antes de Identity público.

Fontes oficiais consultadas em 14/10/2026:
[conexões/Session Mode](https://supabase.com/docs/guides/database/connecting-to-postgres),
[PSQL e Connect](https://supabase.com/docs/guides/database/psql),
[TLS](https://supabase.com/docs/guides/platform/ssl-enforcement).
