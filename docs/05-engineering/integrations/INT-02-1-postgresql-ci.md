# INT-02.1 — PostgreSQL 17, CI isolado e plano não executado

**L1 remoto: PENDENTE. Política fail-closed preservada.** Revisão de 14/10/2026,
baseline `6175eb6e7e45b656c1ea45e3852f583737fdcb6b`. Esta revisão complementa
[INT-02](INT-02-supabase-readonly.md); não altera contratos ou autoriza operações
no provedor. A escolha anterior do responsável foi manter fail-closed e registrar
a limitação. Não foi escolhida uma garantia mais fraca.

## Evidência e causa

O contexto confirmado pelo responsável identifica Atlas Commerce,
`bkxrsgryzkgpwgkngieh`, organização `jwqgnrbkqqmuthquungg`, região `sa-east-1`.
Role `atlas_l1_readonly` ausente. O catálogo remoto previamente inspecionado
indicou PUBLIC TEMP, ausência de PUBLIC CREATE no schema public e 207 funções
voláteis nativas fora das exceções do detector. Não houve nova consulta nem
alteração remota nesta revisão.

Não existe ACL negativa por role: revogar TEMP ou EXECUTE somente da nova role
não cancela PUBLIC. NOINHERIT também não exclui PUBLIC. Portanto a garantia atual
de ausência dessas capacidades **não é viável com os privilégios compartilhados
confirmados**, independentemente do plano Free. Isso não significa que uma role
convencional possa escrever nas tabelas comerciais sem grants.

Prova nova em PostgreSQL **17.10**, imagem por digest do
[compose](../../../apps/api/compose.spike.yml), projeto descartável separado:
sem revogar PUBLIC, uma role LOGIN/NOINHERIT sem flags elevadas, sem memberships
e com default_transaction_read_only=on teve TEMP=true, CREATE public=false,
INSERT comercial=false e EXECUTE lo_create=true. A consulta `role` real do
[detector](../../../apps/api/src/infrastructure/persistence/l1-queries.ts)
retornou unsafe=true. Foram contadas 208 funções voláteis executáveis (incluindo
set_config); essa contagem local não substitui um inventário Supabase.

Após SET default_transaction_read_only=off em comando separado, BEGIN permitiu
CREATE TEMP TABLE, INSERT temporário e lo_create(0), todos revertidos por
ROLLBACK. INSERT na tabela comercial sem grant continuou negado por permissão.
Large objects são objetos persistentes do banco: a possibilidade de criá-los é
um contraexemplo real a “nenhuma escrita”, mesmo sem DML nas tabelas comerciais.
A prova executou apenas no Docker local e removeu seu próprio projeto/volume.

## Matriz de decisões

| Controle exigido                       | Default/privilégio identificado                                             | Capacidade efetiva                                                                                       | Risco residual                                                                                           | Evidência                                                                              | Alternativas técnicas                                                                             | Impacto gerenciado                                       | Autorização                                       |
| -------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| Sem TEMP                               | PUBLIC TEMP                                                                 | Criar/escrever objetos temporários; consumo de disco e possibilidade de shadowing em SQL não qualificado | Real para garantia estrita; não concede DML comercial                                                    | Catálogo informado + prova local                                                       | Manter bloqueio; banco isolado com ACL controlada; eventual revisão explícita da garantia         | Revogação PUBLIC afeta outros usuários e ferramentas     | Obrigatória para alternativa; nenhuma adotada     |
| Sem escrita por funções                | PUBLIC EXECUTE em funções, incluindo lo_create                              | Algumas funções escrevem objetos persistentes; outras apenas observam estado ou mudam sessão             | Real; volatilidade não é classificação de segurança                                                      | Prova local de large object; documentação oficial                                      | Inventário por assinatura/owner/versão e capacidades; manter bloqueio enquanto não aprovado       | Revogar todas pode quebrar serviços e extensões          | Obrigatória; nenhuma exceção nova                 |
| DML comercial negado                   | Sem grants padrão em tabelas de aplicação                                   | Escrita depende de ACL efetiva, ownership, membership, funções e RLS                                     | Futuras concessões ou SECURITY DEFINER podem abrir caminho                                               | INSERT local negado com default readonly desligado; testes negativos INT-02            | Grants mínimos nominativos; revalidar em cada prova                                               | Não requer grant comercial para diagnóstico de catálogo  | Provisionamento futuro separado                   |
| Sem DDL persistente                    | Sem CREATE em public; USAGE permite lookup                                  | USAGE não cria objetos; CREATE no banco/schema permite DDL                                               | CREATE via outro schema/herança continua perigoso                                                        | Catálogo informado + helpers has_* + testes CREATE                                     | Não conceder CREATE; examinar todos os schemas, sem exceção por nome                              | Extensões podem ter ACLs próprias                        | Sem mudança automática                            |
| Configuração de sessão limitada        | UPDATE nativo pg_settings e set_config                                      | SET permitido ao usuário; não equivale a UPDATE arbitrário de catálogo                                   | Pode desligar default readonly; parâmetros privilegiados exigem autorização adicional                    | Exceções estreitas PG17 já publicadas; negativos INT-02                                | Preservar identificação por OID bootstrap, owner, assinatura e linguagem; bloquear parameter ACLs | Nenhuma revogação necessária para a exceção existente    | Não ampliar exceções nesta revisão                |
| Sem elevação/delegação                 | Flags, ownership, membership e grant options não são necessários            | SET ROLE, propriedade ou delegação podem ultrapassar ACL direta                                          | Real, inclusive NOINHERIT com possibilidade de SET ROLE                                                  | Testes SUPERUSER/BYPASSRLS/REPLICATION/CREATEDB/CREATEROLE/membership/ownership/grants | Nenhuma membership nem ownership; sem grant option                                                | Não usar roles administrativas Supabase                  | Obrigatória para provisionar; controles intactos  |
| Sequences e funções externas restritas | SELECT sequence pode apenas ler estado; funções externas podem ser benignas | USAGE/UPDATE sequence permite nextval/setval; SECURITY DEFINER pode elevar                               | SELECT sequence e funções benignas são bloqueios conservadores, não prova individual de escrita          | Inspeção da consulta; testes sequence/função                                           | Revisão específica futura, nunca liberar schema inteiro                                           | Grants/extensões variam por projeto                      | Reduzir garantia exige aprovação expressa         |
| Defaults/grants seguros                | PUBLIC EXECUTE padrão; default ACL pode afetar objetos futuros              | Default ACL não prova capacidade atual sobre objeto inexistente                                          | Detector pode bloquear concessão futura ou configuração inofensiva; postura deliberadamente conservadora | Inspeção default_acl, parameter_acl e pg_db_role_setting; negativos                    | Examinar cada grant/default, preservar bloqueio sem evidência específica                          | ALTER DEFAULT PRIVILEGES não remove grants já existentes | Nenhuma alteração compartilhada autorizada        |
| TLS autenticado                        | CA/hostname oficial ainda pendentes                                         | Criptografia sozinha não prova identidade nem ACL                                                        | Endpoint errado/CA inválida indisponibiliza prova                                                        | Negativos CA/hostname local; nenhuma prova Supabase                                    | CA oficial e Connect conferidos; rejectUnauthorized=true                                          | Sem alteração do provedor                                | Consentimento separado para conexão               |
| Data API isolada                       | Habilitada segundo responsável; schemas efetivamente expostos pendentes     | HTTP/RPC usa roles/grants/policies próprios                                                              | TLS SQL e ausência de pgrst.db_schemas não comprovam segurança HTTP                                      | Contexto humano; testes locais de exposição                                            | Revisão Dashboard de schemas, RPC, anon/authenticated/PUBLIC e RLS                                | Não desabilitar API nem mudar schemas nesta tarefa       | Revisão e qualquer mudança exigem escopo separado |

“Volátil” também inclui operações benignas (por exemplo, relógio e estado de
sessão). O bloqueio amplo por volatilidade é um superconjunto conservador, não
uma lista de vulnerabilidades. O falso bloqueio de UPDATE nativo pg_settings já
foi tratado na baseline; clones, overloads e grants privilegiados permanecem
negados. Não há nova alteração em queries, config, diagnóstico ou CLI remoto.

Alternativas não adotadas: banco/ambiente dedicado com ACL controlada; alterações
compartilhadas de PUBLIC após análise de impacto; ou redefinir explicitamente
L1 como execução de consultas fixas por um mediador. A última reduz a garantia
sobre a credencial SQL e precisa de decisão arquitetural expressa. Até lá,
TEMP/funções incompatíveis continuam bloqueando, sem produzir READONLY_PROVEN.

## CI dedicado e fronteiras da fixture

O novo job `int02-integration` de
[Quality](../../../.github/workflows/quality.yml) executa os 38 testes existentes
via [runner local](../../../apps/api/scripts/supabase-local.mjs), em VM própria,
independente de Identity e PGSP. Preserva SHA das actions, Node 24.21.0, Corepack,
pnpm fixado, frozen-lockfile e contents:read. Não usa secrets, review remoto,
URLs de banco ou CLI remoto. O runner não aceita argumentos, recusa Docker
remoto, usa loopback e recusa porta/containers/networks/volumes preexistentes.
O output de ownership só é emitido após essa reserva; a limpeza always depende
dele. finally também limpa recursos próprios e certificados temporários.
Não executar duas instâncias simultâneas do projeto fixo na mesma máquina.
Em encerramento forçado da VM, o descarte do runner hospedado é a última camada.

**Limite da prova positiva:** a
[fixture preexistente](../../../apps/api/test/supabase-l1/readonly-fixture.sql)
revoga TEMP e EXECUTE volátil de PUBLIC **somente no banco descartável** e ativa
TLS local. Foi preservada para executar as 38 regressões solicitadas, sem novas
revogações. Ela não representa defaults Supabase e jamais deve ser aplicada lá.
A prova com defaults nativos descrita acima é separada: não revoga PUBLIC e
deliberadamente não obtém uma role aprovada pela política estrita.

Cobertura preservada: DML/DDL, sequences, ownership, flags, membership, grants
públicos e grant options, funções privilegiadas/clones, configurações inseguras,
CA/hostname inválidos, timeout, recuperação e encerramento do pool. Os limites
do pool, validação de projeto/username e consentimento manual não mudaram.

## Plano específico de provisionamento — NÃO EXECUTADO

**Bloqueado para execução.** Criar a role não resolve PUBLIC; não habilitar LOGIN
nem fornecer credencial enquanto o bloqueio arquitetural persistir. Uma tarefa
separada deve autorizar expressamente criação e, depois, a prova somente leitura.
O SQL abaixo é proposta revisável, não migration nem roteiro para colar inteiro.

Pré-voo humano: confirmar projeto/ref/organização acima no Dashboard, PostgreSQL
17, banco postgres, inexistência da role e ausência de ownership/memberships.
Conferir Connect: host informado `aws-1-sa-east-1.pooler.supabase.com`, Session
Mode/5432. O username observado `postgres.bkxrsgryzkgpwgkngieh` é privilegiado e
não serve para L1. O username futuro da role precisa ser conferido no Connect;
não tratá-lo como comprovado antes de existir. Obter CA oficial por canal seguro;
não inventar endpoint ou certificado. Revisar Data API habilitada e registrar a
lista **efetiva** de schemas expostos; ela ainda não foi fornecida.

### Etapa proposta, apenas após autorização futura

```sql
-- Confirmar manualmente Atlas Commerce / bkxrsgryzkgpwgkngieh antes de executar.
-- Sem senha, sem LOGIN e sem mudanças em PUBLIC.
BEGIN;
CREATE ROLE atlas_l1_readonly NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1;
ALTER ROLE atlas_l1_readonly SET default_transaction_read_only = on;
GRANT CONNECT ON DATABASE postgres TO atlas_l1_readonly;
COMMIT;
```

NOLOGIN mantém a preparação inativa; flags/membership/propriedade não concedem
elevação. CONNECT é o único grant nominativo necessário para consultar os
catálogos públicos atuais, mas já pode ser herdado de PUBLIC. Não conceder
SELECT ALL TABLES, USAGE em identity, sequences, funções extras, CREATE, TEMP,
membership ou grant options. Identity não existe e não será criado para L1.
Não executar REVOKE PUBLIC, ALTER SYSTEM ou migrations. Não adicionar defaults
de search_path/timeouts à role: a política atual rejeita defaults adicionais;
os timeouts e pool restrito já são definidos pelo cliente.

Senha futura: gerar e transmitir somente por canal privado aprovado, configurar
interativamente com cliente seguro sem histórico/log de senha (por exemplo,
`\password atlas_l1_readonly` no psql), nunca SQL com literal versionado ou argv.
LOGIN somente em etapa expressamente autorizada depois de resolver os bloqueios.
Nenhuma senha foi gerada ou incluída neste plano.

### Verificação, interrupção e recuperação propostas

1. Capturar ACLs/defaults/ownership/memberships e comparar com o estado anterior;
   conferir flags e CONNECT, TEMP, CREATE em todos os schemas, grants de relações,
   colunas, sequences, funções e parâmetros, inclusive PUBLIC.
2. Interromper em projeto divergente, recurso preexistente inesperado, grant
   perigoso, bloqueio PUBLIC não resolvido, CA/host não verificado ou exposição
   identity/Data API não revisada. Não corrigir automaticamente o provedor.
3. Avaliar separadamente **TLS** (CA, hostname, identidade e Session Mode),
   **privilégios SQL** (diagnóstico efetivo pela nova role) e **Data API**
   (Dashboard, grants API/PUBLIC, schemas, RPC e RLS). Nenhuma das três substitui
   as demais. Não executar negativos DML/DDL remotos; essas provas são locais.
4. Com autorização específica e todos os pré-requisitos satisfeitos, realizar
   CLI manual fora de CI, senha em variável exclusiva privada, revisão pública
   exata e consentimento por ref. Preservar recusa ROLE_UNSAFE ou TLS indisponível.
   Só uma execução remota efetiva pode alterar o estado L1.
5. Falha antes de COMMIT: ROLLBACK. Depois: conter LOGIN, revogar somente grants
   nominativos e excluir apenas a role criada por essa operação, após conferir
   ausência de sessões/dependências/ownership. Nunca DROP OWNED CASCADE ou
   REASSIGN OWNED indiscriminado. Revogar/rotacionar senha pelo canal privado.

```sql
-- Reversão proposta, NÃO EXECUTADA; validar alvo e dependências antes.
ALTER ROLE atlas_l1_readonly NOLOGIN;
REVOKE CONNECT ON DATABASE postgres FROM atlas_l1_readonly;
-- NOLOGIN não encerra sessões existentes. Operador deve identificá-las e
-- encerrar somente sessões desta role com autorização, antes do DROP.
DROP ROLE atlas_l1_readonly;
```

CONNECT herdado de PUBLIC pode continuar efetivo após REVOKE nominativo; NOLOGIN
impede novas sessões. Se DROP detectar dependências, parar para análise sem
excluir dados. Não recuperar por restauração global nem modificar outros projetos.

## Fontes oficiais

- [PostgreSQL 17: privilégios, PUBLIC, TEMP, EXECUTE e ownership](https://www.postgresql.org/docs/17/ddl-priv.html).
- [PostgreSQL 17: transações readonly e objetos temporários](https://www.postgresql.org/docs/17/sql-set-transaction.html).
- [PostgreSQL 17: large objects e funções de criação](https://www.postgresql.org/docs/17/lo-funcs.html).
- [PostgreSQL 17: pg_settings e restrições de configuração](https://www.postgresql.org/docs/17/view-pg-settings.html).
- [Supabase: roles e privilégios](https://supabase.com/docs/guides/database/postgres/roles).
- [Supabase: Connect e modos de conexão](https://supabase.com/docs/guides/database/connecting-to-postgres).
- [Supabase: schemas expostos](https://supabase.com/docs/guides/api/using-custom-schemas).

## Validação local deste delta — 14/10/2026

Node 24.21.0, pnpm 12.11.2, Docker Desktop Linux e PostgreSQL 17.10 fixado.
As tentativas no sandbox encontraram EPERM/Docker inacessível e auditoria sem
rede; as repetições fora dele produziram os resultados abaixo. Não se reutilizou
aprovação de testes anteriores como prova deste delta.

| Comando/prova                                                         | Resultado novo                                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| pnpm lint                                                             | PASS                                                                                                      |
| pnpm typecheck                                                        | PASS, geração dos dois clients Prisma sem mudar schemas                                                   |
| pnpm test                                                             | PASS: 37 testes, incluindo 34 da API                                                                      |
| node apps/api/scripts/supabase-local.mjs                              | PASS: 38 INT-02, repetidos no runner final                                                                |
| pnpm --filter @atlas/api identity:migrate / identity:test             | PASS: 34 testes Identity/Resend PostgreSQL                                                                |
| pnpm --filter @atlas/api exec vitest run test/identity/resend.spec.ts | PASS: 5 testes Resend                                                                                     |
| pnpm --filter @atlas/api spike:migrate / spike:test                   | PASS: 16 PGSP                                                                                             |
| pnpm --filter @atlas/api connection:test                              | PASS: 9 L0                                                                                                |
| pnpm build                                                            | PASS fora do sandbox; não houve timeout neste delta                                                       |
| pnpm smoke                                                            | PASS fora do sandbox                                                                                      |
| pnpm audit                                                            | PASS: nenhuma vulnerabilidade conhecida reportada                                                         |
| pnpm format:check                                                     | FAIL: 32 arquivos preexistentes com CRLF; todos passam com LF em memória, sem normalização no repositório |
| Formatação direcionada, parse YAML e links locais                     | PASS; jobs anteriores preservados, 17 alvos Markdown existentes                                           |
| Guards locais de argumentos, Docker remoto e recursos preexistentes   | Recusa esperada; rede preexistente preservada e removida somente pelo teste que a criou                   |
| git diff --check                                                      | PASS                                                                                                      |

Os 38 testes usam a fixture endurecida; a prova nativa separada não é um 39º
teste dessa suíte nem uma homologação Supabase. Logs, script de reprodução local
e diff completo acompanham o relatório da tarefa. Nenhuma mudança em detector,
contratos, migrations, lockfile, Identity, Resend, frontend ou provedores.

Resultados deste delta são entregues com logs locais separados. A execução remota
[38599727852](https://github.com/Igor475/atlas-commerce/actions/runs/38599727852)
comprovou somente a baseline publicada. O novo job ainda precisa de publicação
pelo responsável e execução remota; CI deste delta não está declarado aprovado.
