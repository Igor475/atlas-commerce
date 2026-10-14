# INT-02 — Provas locais e bloqueio remoto

Data: 14/10/2026. Baseline: `fd0b16e4a4f89fa2a64c76a132807c2d913c9913`,
`main`, inicialmente limpa. Nenhum commit/push/deploy realizado.

**Remoto: `BLOCKED_NO_PROJECT_OR_READONLY_ROLE`.** O responsável informou Atlas
Commerce e ref público `bkxrsgryzkgpwgkngieh`; organização ainda não identificada.
Sem confirmação independente do projeto, Connect, role readonly, CA, revisão de
Data API ou autorização específica de execução remota. Não foi feita conexão
Supabase nem consulta em projeto ERP. Nenhum SQL remoto foi executado.

## Resultados executados

Node 24.21.0, pnpm 12.11.2, PostgreSQL 17.10 local Docker com imagem fixada.

| Comando / prova                                               | Resultado real                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `node apps/api/scripts/supabase-local.mjs`                    | **25/25 PASS**, PostgreSQL e TLS reais locais                                                                             |
| `pnpm test`                                                   | **34 API + 3 demais workspaces PASS**; primeira tentativa sandbox bloqueou workers com EPERM, repetição autorizada passou |
| `pnpm --filter @atlas/api identity:migrate` + `identity:test` | Migration somente fixture loopback; **22 Identity + 12 Resend mock = 34/34 PASS**                                         |
| `pnpm --filter @atlas/api connection:test`                    | **9/9 L0 PASS**, inclusive interrupção/recovery; aquisição saturada observada em 513,23 ms                                |
| `pnpm --filter @atlas/api spike:migrate` + `spike:test`       | Migration apenas fixture loopback; **16/16 PGSP PASS**, cleanup concluído                                                 |
| `pnpm lint`                                                   | PASS                                                                                                                      |
| `pnpm typecheck`                                              | PASS em todos os workspaces, ambos clientes Prisma gerados                                                                |
| `pnpm build`                                                  | PASS no monorepo, sem timeout nessa execução Windows                                                                      |
| `pnpm smoke`                                                  | PASS: live 200, ready 503 `DEPENDENCIES_NOT_CONFIGURED`, perfil padrão preservado                                         |
| `pnpm audit`                                                  | **No known vulnerabilities found**; primeira tentativa sandbox falhou na rede, repetição autorizada passou                |
| `pnpm format:check`                                           | **FAIL preexistente em 32 arquivos**, preservados; nenhuma exclusão/configuração alterada                                 |

Formatação dirigida dos novos TS/MJS: PASS. `git diff --check`: PASS.
Não interpretar uma execução passada no GitHub como CI desta mudança.

A transcrição local final registra `READONLY_PROVEN`, status 200, **60 ms**, com
os cinco IDs de consulta; timeout `DB_UNAVAILABLE`, status 503, **1019 ms**,
interrompido no ID `server`. A suíte completa durou 3,73 s. Esses tempos são
locais, não medidas de Supabase/Render. Evidência sanitizada:
[local-validation.txt](evidence/local-validation.txt).

Ensaios preliminares corrigiram a classificação de sequences (uso de CASE para
impedir avaliação sobre índices) e a limpeza do teste de ownership (restaurar
SELECT). A primeira montagem herdou uma migration spike local desnecessária,
removida do runner final. Não houve DDL remoto. A fixture revoga explicitamente
o UPDATE PUBLIC padrão de `pg_settings` e funções voláteis somente no banco
descartável, sem modificar políticas compartilhadas do Supabase.

## Cobertura e interpretação

SUPL1-001/002/003/004/014: falta consentimento, ref diferente, CI, host/username,
porta/modo, bypass TLS e configuração incompleta negados antes do pool remoto.
Preparação válida é pura; a URL genérica não entra no driver. O guard cloud do
serviço continua recusando ativação remota.

SUPL1-005: cadeia CA e hostname reais exercitados contra certificado local;
CA errada e hostname errado produzem somente `DB_UNAVAILABLE`, status 503.
Isso **não valida certificado Supabase**, que não foi obtido ou utilizado.

SUPL1-007/008/009/013: role `atlas_l1_readonly`, LOGIN, NOINHERIT, sem flags
privilegiadas, memberships, ownership ou escrita. USAGE em `identity` e SELECT
somente em tabela vazia artificial. Sem dados de clientes. Grants perigosos
injetados pelo controle local (DML/coluna/PUBLIC, sequence, CREATE schema/banco,
membership, superuser, BYPASSRLS, CREATEDB, CREATEROLE, parâmetros, ownership,
default ACL, função e defaults de role) causam `ROLE_UNSAFE`; após limpeza a
prova volta a true. DML/DDL, nextval e SET ROLE locais negados com SQLSTATE 42501
mesmo após desligar o default read-only da sessão de teste.

SUPL1-006/010/011/012: pool configurado em 1; grant PUBLIC em tabela `identity`
causa `DATA_API_UNVERIFIED`; lock de catálogo local induz timeout real, status
503, destruição da conexão e recuperação na próxima prova. Fechamento impede
novas checks. O teste não cria endpoint HTTP novo. A liveness independente
permanece comprovada nos nove L0; pausa/retomada Supabase real não foi ensaiada.

SUPL1-015: **BLOCKED remoto**. Não houve migrations, runtime write, testes de
contas/tokens ou alterações Data API no provedor. Identity remoto, restore,
hosts e INT-03 futuro continuam fora desta autorização.

## Inventário SQL

A SQL completa do diagnóstico está em
[l1-queries.ts](../../src/infrastructure/persistence/l1-queries.ts): `server`,
`role`, `schemas`, `exposure` e `ping`. São apenas SELECTs de catálogo, TLS,
privilégios e `SELECT 1`; nenhuma consulta de PII. O caminho positivo usa esses
cinco IDs, e a recusa de role termina após os dois primeiros. Os testes de TLS
falham antes de SQL; timeout registra o último ID tentado.

Toda SQL de controle adicional realmente executada localmente está na
[fixture](readonly-fixture.sql), nos [testes](l1.integration.ts) e no
[runner](../../scripts/supabase-local.mjs). Isso inclui montagem da role/tabela
vazia, grants/revokes e mudanças de flags para testes negativos, SELECT count,
tentativas de DML/DDL/nextval/SET ROLE negadas, BEGIN/LOCK/ROLLBACK e configuração
TLS do PostgreSQL descartável. **Esses comandos não pertencem ao CLI remoto**.
As regressões anteriores executam suas próprias consultas nas fixtures locais
Identity/PGSP/L0, preservadas sem alteração.

Ver [guia de preparação e limites](../../../../docs/05-engineering/integrations/INT-02-supabase-readonly.md).
