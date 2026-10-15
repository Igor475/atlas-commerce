# MRD-G2 — Implementação local e evidências de segurança

**Estado: G2 PARCIAL — implementação e provas locais realizadas; revisão do delta
de cobertura e gate global de formatação pendentes. Não homologado.**
Baseline: `c48c97f4b4ef97a5bafd2dbb181f70dd234034f7`, branch `main`, inicialmente
limpa. Trabalho iniciado em 14/10/2026, validações continuadas em 15/10/2026.
Nenhum commit, push, deploy ou operação no Supabase nesta tarefa.

## Autorização rastreável e limites

Fonte: prompt explícito **“MRD-G2: Implementação local, hardening e testes de
segurança”** recebido do responsável nesta conversa. Ele ratifica **para
experimentação local** a modalidade A, quatro operações v1 sujeitas a validação
real, separação MRD/L1 e riscos residuais de operador/SO e direitos PUBLIC.
Autoriza criação/descarte dos recursos Docker da própria execução. Não é aprovação
de B, G3/G4, produção, acesso remoto, credenciais Supabase, migrations comerciais,
alteração CI ou homologação automática de SQL. Revisor/assinatura: **não informados**.

[ADR-011](../../04-architecture/adrs/ADR-011-diagnostico-mediado-e-politica-l1.md),
[INT-02.2](INT-02-2-diagnostico-mediado-proposta.md) e [G1](MRD-G1-design-seguranca.md)
conservam a especificação/histórico. **L1-SQL estrita permanece PENDENTE**, sem
mudança em seu detector, fixture, códigos ou testes. Data API desligada continua
`USER_REPORTED_DISABLED`, sem confirmação independente.

## Arquitetura implementada

- [Contrato/parser](../../../apps/api/src/infrastructure/persistence/mrd-contract.ts):
  três argumentos exatos, ID fechado, rejeição de ambiente de conexão/loader/debug,
  códigos/envelope MRD-v1 e bounds, sem URL/SQL/callback externo.
- [Config local](../../../apps/api/src/infrastructure/persistence/mrd-config.ts):
  host 127.0.0.1, porta 55438, DB atlas_mrd_g2, role atlas_mrd_local, manifesto
  temporário próprio, hashes de CA/credencial, validação de arquivos/symlinks,
  CA local e TLS com SAN IP, sem conexão de fallback.
- [Catálogo](../../../apps/api/src/infrastructure/persistence/mrd-catalog.ts):
  quatro strings privadas/imutáveis, hashes versionados. O helper interno recebe
  apenas ID tipado e cliente do executor; não há interface CLI que receba SQL.
- [Validadores/projeção](../../../apps/api/src/infrastructure/persistence/mrd-results.ts):
  nomes/OIDs/quantidade de colunas e linhas, tipos/nulls, gates da sessão e sinais;
  resposta construída por allowlist, sem metadados brutos, PII ou definições SQL.
- [Executor](../../../apps/api/src/infrastructure/persistence/mrd-executor.ts):
  lock exclusivo, START/TERMINAL privados, pré-condições fixas, pool1, deadlines,
  interrupção, descarte de cliente, fechamento do pool e sucesso suprimido quando
  auditoria/cleanup falham. Nenhuma integração ao NestJS/startup/readiness.
- [CLI manual](../../../apps/api/scripts/mrd.mjs): recebe credencial local só por
  stdin privado limitado a 4096 bytes/1000 ms, não por argv/env; saída única
  ≤8192 bytes. Perfil remoto não existe. `l1SqlStrict` é sempre `PENDENTE`.
- [Harness](../../../apps/api/scripts/mrd-local.mjs): imagem PG17.10 por digest já
  fixado, projeto/container/network/volume/run ID próprios, porta publicada somente
  em loopback, checagem de labels e binding, lock de porta, CA/certificados locais,
  fixture sem revogar PUBLIC, testes e limpeza por ownership. Sem prune ou pull.

Pool/limites G1 preservados: conexão 3000 ms, statement 3000 ms, query 4000 ms,
idle 1000 ms, idle-in-transaction 5000 ms, lifetime30 s, executor15000 ms e
harness180000 ms globais, reservando até30 s desse orçamento para cleanup. Interrupção/
SIGKILL/SO/Docker indisponível continuam riscos operacionais; não se promete
cleanup absoluto. Os testes injetam falhas de terminal/auditoria/lock e observam
recusa, descarte do socket e recuperação somente em nova execução.

O controlador administrativo **somente de testes** usa identidade artificial
atlas_mrd_fixture_admin; o executor usa exclusivamente atlas_mrd_local. Secrets
efêmeros ficam no diretório privado do harness e são removidos. A CLI recebe
somente o pipe privado; o arquivo test-context.json é exclusivo do controlador,
não é configuração pública nem arquivo versionado. No Windows, o harness aplica
ACL via icacls; no POSIX também são verificados owner/mode pelo executor.
Essa fronteira confia no harness/SO local, conforme modalidade A; não é uma
atestação independente de Docker ou isolamento contra administrador local.

## Revisão real dos quatro SQLs

Os três primeiros literais coincidem por SHA-256 com G1. O quarto tem a correção
de cobertura abaixo. [Snapshot de hashes](../../../apps/api/test/mrd/catalog-review.json)
e testes verificam drift. Não é assinatura contra binário comprometido.

| Operação                | PostgreSQL 17.10 observado          | Interpretação                                                                                                                       |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| PING                    | Uma linha, OID23/int4, ok=1         | reachable local, sem prova readonly                                                                                                 |
| SERVER_METADATA         | Uma linha; OIDs19/19/19/23/16/16/25 | DB/roles conferidos, major17, readonly default e TLS1.2/1.3; identidade Supabase não inferida                                       |
| PRIVILEGES_SUMMARY      | Uma linha; 14 boolean/OID16         | Flags/grants/membership/owner perigosos recusados; TEMP/lo_create nativos continuam visíveis como capacidade, não execução pela CLI |
| SCHEMA_EXPOSURE_SUMMARY | Duas linhas; OIDs25/16/16/16/16/16  | Schemas fixos, ACL de relação/coluna e cobertura explícita; Data API técnica UNVERIFIED                                             |

Semântica de listas de privilégios conferida em PG17: CREATE=false, TEMP=true e
`has_database_privilege(...,'CREATE,TEMP')`=true, portanto **OR**, não AND. Há
ensaios de grants diretos, membership, PUBLIC, coluna, sequência, default ACL,
parâmetro, ownership e flags. Nenhum literal lê conteúdo de tabelas comerciais.

### Divergência G1 confirmada — pendente de revisão humana

A SQL original de SCHEMA_EXPOSURE_SUMMARY foi executada pelo controlador **na
fixture local**, com anon/authenticated ausentes: devolveu api_relation_grant=false,
pois EXISTS sobre a lista vazia era false. Isso pode sugerir cobertura inexistente.

Correção implementada para o experimento: novo boolean **api_roles_present**;
api_relation_grant retorna **null** se schema ou qualquer role API estiver ausente.
Saída inclui coverage `CATALOG_ONLY_API_ROLES_MISSING` ou
`CATALOG_ONLY_API_ROLES_PRESENT`, sem promover Data API para verificada.
Identity presente com cobertura API ausente bloqueia `MRD_EXPOSURE_REVIEW_REQUIRED`. Grants PUBLIC/API
observados em identity também bloqueiam. Testes cobrem ausência das duas roles,
apenas uma presente, ambas presentes, grant direto/por grupo/PUBLIC/coluna e
schemas ausentes. O envelope externo MRD-v1 é preservado; esse **delta dos dados
e semântica requer revisão humana**, não foi ratificado por aproximação.

## Matriz MRD-001–016 deste delta

As matrizes históricas permanecem intactas. [Suíte nova](../../../apps/api/test/mrd/mrd.integration.ts)
contém 44 testes locais, com múltiplos casos por cenário. Evidências novas no
[relatório de testes](../../../apps/api/test/mrd/RESULTS.md).

| ID      | Resultado local / limite                                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| MRD-001 | PASS: consentimento/config inválidos antes de pool                                                                                 |
| MRD-002 | PASS: endpoint/identidade/flags/membership/owner/grants divergentes recusados                                                      |
| MRD-003 | PASS: SQL/args/env arbitrários rejeitados, nenhum SQL de caller                                                                    |
| MRD-004 | PASS: IDs desconhecidos/duplicados/case inválido                                                                                   |
| MRD-005 | PASS: literais/hashes/efeitos; funções/views homônimas não executadas; PUBLIC TEMP/lo permanecem sem uso pela CLI                  |
| MRD-006 | PASS: canários fictícios, tipos/campos extra e canais de saída/auditoria                                                           |
| MRD-007 | PASS: CA errada e certificado real com SAN DNS em vez de IP recusados; recuperação com certificado correto                         |
| MRD-008 | PASS: timeout real, interrupção, init, terminal/auditoria/cleanup falhos, zero socket MRD restante após recuperação                |
| MRD-009 | PASS: shape/OIDs/nulls/linhas inválidos; ausência explícita e sem saída sensível                                                   |
| MRD-010 | PASS: duas CLIs reais, BUSY, lock alheio preservado e repetição independente                                                       |
| MRD-011 | PASS local: labels/IDs/binding/lock e cleanup dos recursos próprios; CI MRD novo não criado                                        |
| MRD-012 | PASS: 38 L1 originais, 34 Identity/Resend PG, 16 PGSP e 9 L0, sem editar critérios                                                 |
| MRD-013 | PASS: estados próprios, NOT_PROVEN e L1 PENDENTE; sem READONLY_PROVEN da CLI MRD                                                   |
| MRD-014 | Parte local PASS: ausência/roles/ACL não prova toggle; parte Dashboard/HTTP remota **BLOQUEADA**, não skip aprovado                |
| MRD-015 | PASS para controles testáveis: catálogo congelado/hash/imports/env; comprometimento de SO/dep/executor não é contido pelo mediador |
| MRD-016 | Parte negativa local PASS: remoto/CI recusados; prova remota **BLOQUEADA**, não executada nem homologada                           |

## Comandos e operação local

Com Node 24.21.0, pnpm12.11.2 e Docker local, da raiz, **sequencialmente**:

```text
pnpm --filter @atlas/api build
node apps/api/scripts/mrd-local.mjs
node apps/api/scripts/supabase-local.mjs
```

Harness invoca a CLI com os três argumentos G1 e pipe privado. `node
apps/api/scripts/mrd.mjs --help` mostra somente a gramática. Sem contexto privado
válido/consentimento, CLI recusa sem conexão. Não executar build concorrente ao
MRD: o Nest build recria dist e invalida imports em andamento; essa condição foi
observada em ensaio preliminar, falhou fechada e foi corrigida na sequência de
validação. Não fornece comandos remotos ou exemplo contendo credenciais.

## Gates e riscos residuais

Lint, typecheck, unitários, build, smoke, audit, suites locais e formatação dos
arquivos novos foram executados com evidências novas. Tentativas sandbox com
EPERM/Docker/rede foram repetidas fora dele. Formatação global permanece FAIL em
32 arquivos CRLF preexistentes, preservados; não alterou ignore/gates/frontend.

G2 permanece **PARCIAL**, sem declarar MRD_LOCAL_VALIDATED global: revisar o delta
de cobertura com o responsável e resolver o gate global em escopo autorizado.
Depois disso, nova avaliação de aceite local; nada promove L1-SQL, B, G3/G4 ou
produção. Nenhuma execução remota de CI foi feita para esse delta; workflows
existentes permaneceram byte a byte inalterados.

Riscos: operador/SO A tem acesso ao segredo; dep/executor comprometido pode
contornar a mediação; PUBLIC continua concedendo capacidades; catálogo não é
inventário exaustivo/atômico e não prova exposição HTTP. Rede Docker bridge com
publicação loopback não é uma política de egress do SO/container: as conexões do
executor são fixas locais, mas não se afirma contenção contra software malicioso.
O PostgreSQL interno sem revogação PUBLIC é proposital, não uma role SQL estrita.

G3/G4 exigem nova autorização específica, Connect/CA/role próprios, inventário
efetivo e confirmação independente de Data API. Parar na entrega local.
