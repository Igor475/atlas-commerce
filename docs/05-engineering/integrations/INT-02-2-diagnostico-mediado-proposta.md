# INT-02.2 — Contrato proposto para diagnóstico mediado (MRD)

> **Estado:** DOCUMENTAL / NÃO IMPLEMENTADO / NÃO EXECUTADO NO SUPABASE.  
> **Data:** 14/10/2026 · **Decisão governante:** [ADR-011](../../04-architecture/adrs/ADR-011-diagnostico-mediado-e-politica-l1.md).  
> **Pré-requisito:** L1 SQL original preservada como `PENDENTE` e `READONLY_PROVEN` não emitido por MRD.

## 1. Objetivo e não objetivos

**Objetivo:** disponibilizar apenas um conjunto pequeno e fixo de leituras de metadados de infraestrutura PostgreSQL, mediado por código controlado, com respostas mínimas e evidência reproduzível, sem alterar grants globais do Supabase.

**Não objetivos:** provar que a role PostgreSQL é estritamente incapaz de escrita; migrar schema; ler clientes, pedidos, produtos ou dados sensíveis; criar endpoint HTTP; substituir L1/CI/fixtures; ativar Supabase Auth/Storage; ligar Identity ao banco remoto; alterar runtime comercial; realizar operações remotas automaticamente.

## 2. Fronteiras e modelo de ameaças

| Componente | Confiança | Poder permitido | Proibição |
|---|---|---|---|
| Operador autorizado | Autorização e ato explícitos | Selecionar **ID** de operação aprovada, sem SQL arbitrária | Ver credencial ou resultado bruto interno |
| CLI MRD (processo isolado) | Binário/dependências sob revisão | Validar contexto e despachar enum fixo | HTTP de aplicação, uso geral de `pg`, eval, plugins SQL, interpolação de identificadores |
| Executor de consultas fixas | Componente de alta confiança | Conectar e executar somente SQL hardcoded | SQL fornecida por cliente, comandos com efeito colateral, acesso fora do catálogo aprovado |
| Credencial PostgreSQL MRD | Segredo do executor | Menor privilégio efetivo viável, com inventário `PUBLIC` | Ser divulgada, reutilizada por migrator/runtime/CI público, ser descrita como L1 estrita |
| Supabase PostgreSQL | Infraestrutura gerenciada | Responder consultas allowlisted | Presumir que `PUBLIC`/funções deixam de ser executáveis |

### Ameaças mínimas a controlar

- SQL injection por operação, argumento, nome de schema, identificador, variável de ambiente, template ou configuração.
- Sequestro/substituição de query ou mapeamento de IDs; bypass de revisão por plugin, código dinâmico ou alteração de dependency.
- Exfiltração de segredo em stdout/stderr, logs, exceções, GitHub Actions, processos filhos, `.env`, URI ou debug.
- SSRF/desvio de host em connection string; TLS sem CA/hostname corretos; acesso acidental a outro projeto Supabase.
- Leitura de dados comerciais/PII por consultas de catálogo que revelem definições contendo segredos, e saída detalhada de catálogo.
- Execução repetida para DoS, lentidão de catálogo, locks, pool excessivo e persistência de sockets.
- Falso positivo de sucesso quando Data API não foi conferida, L1 falhou, SQL remoto não foi realmente executado ou a auditoria ficou indisponível.
- Comprometimento do executor ou uso da credencial fora dele: risco residual **não resolvido** pela allowlist.

## 3. API conceitual do CLI (não implementada)

- Interface de operação por **enum literal versionado**, por exemplo `SERVER_METADATA`, `PRIVILEGES_SUMMARY`, `SCHEMA_EXPOSURE_SUMMARY`, `PING` (nomes sugeridos, sujeitos a revisão do conteúdo SQL efetivo).
- Cada operação tem ID, finalidade, SQL literal revisado, colunas/formatos permitidos, cardinalidade máxima, classificação de dado e proprietário técnico.
- Sem entradas que aceitem texto SQL, path dinâmico de query, nome arbitrário de função, usuário, tabela ou schema. Qualquer futura necessidade de argumento deve ser documentada e validada por tipo e binding, nunca concatenada.
- Preferir `SELECT` simples sobre funções puras de catálogo, mas **não assumir que toda instrução começando com SELECT é segura**; functions, views e expressões podem produzir efeitos. Fazer revisão semântica de cada query e teste de efeito colateral.
- Retornar só dados minimizados: `status`, `operationId`, `elapsedMs`, `schemaCount`/`riskCount` se aprovado, `commit`, `environment` sem host secreto, e códigos fixos de falha. Não retornar `pg_get_functiondef` integral, material de `pg_settings`, valores comerciais ou lista de tokens.
- Não adicionar rota ao NestJS nem disparar automaticamente ao subir a API; não usar CLI MRD para probes da readiness de produção.

## 4. Identidade e conexão — planejamento (sem provisionamento)

- Confirmar organização, projeto `bkxrsgryzkgpwgkngieh`, região, credencial de uma role técnica **distinta** das roles migração/runtime/diagnóstico L1, host real `Connect`, modo de sessão e CA oficial.
- Pool = 1 inicialmente, timeouts curtos e shutdown rigoroso conforme baseline; medição no teste, não pressupor SLO.
- TLS com validação de CA e hostname; sem `rejectUnauthorized:false`, `sslmode` sem identidade, variáveis PG ambientais ou fallback de transporte.
- Secrets fora do repositório, stdout, argumentos CLI, logs/CI; validar redaction em erros de conexão.
- Não provisionar role L1 nem role MRD como consequência de documentação; eventual role técnica MRD não deve receber superuser, bypass RLS, propriedade de objetos, memberships, privilégios de migração ou DML comercial.
- Avaliar grants efetivos herdados de `PUBLIC` e risco residual mesmo quando a role parece mínima; `default_transaction_read_only=on` é apenas defesa contra erro.
- Se dados da Data API permanecem apenas informados pelo usuário, registrar `USER_REPORTED_DISABLED`, não `INDEPENDENTLY_VERIFIED_DISABLED`.

## 5. Matriz de testes futura (tudo PENDENTE)

| ID | Cenário | Critério de aprovação |
|---|---|---|
| MRD-001 | Ausência de consentimento/identidade | Bloquear antes de abrir socket remoto |
| MRD-002 | Projeto/host/role divergentes | Recusa segura, sem fallback |
| MRD-003 | Tentativa de SQL arbitrária/argumentos extras | Bloquear integralmente sem enviar query |
| MRD-004 | IDs de operação desconhecidos/repetidos | Fail-closed; sem operação fora da allowlist |
| MRD-005 | Tentativa de efeito colateral por `SELECT` | Revisão estática + teste negativo; não basta regex/prefixo |
| MRD-006 | Segredos/PII em saída, erro e trace | Saída higienizada, sem credentials e sem dados comerciais |
| MRD-007 | TLS/hostname/CA inválidos | Recusar conexão sem downgrade |
| MRD-008 | Timeout, pool, shutdown, interrupção | Sem sockets ou processos abandonados |
| MRD-009 | Catálogo divergente/objeto sensível | Minimizar/recusar dados e registrar motivo |
| MRD-010 | Duas chamadas concorrentes/repetidas | Limites e estabilidade, sem contornar autorização |
| MRD-011 | CI e Docker descartável | Sem recursos/segredos remotos; limpeza restrita ao runner próprio |
| MRD-012 | Regressão L1 INT-02 | 38 casos existentes continuam inalterados e passam |
| MRD-013 | Reporte de status | MRD nunca emite `READONLY_PROVEN` ou promove L1 |
| MRD-014 | Revisão Data API desabilitada | Prova independente e negativa HTTP autorizada, separada da L1 |
| MRD-015 | Alteração/compromisso de binário/dependência | Modelo de ameaça e controle de integridade revisados; não alegar proteção contra root compromise |
| MRD-016 | Evidência remota futura | Execução específica autorizada, sem PII, commit/ref/ambiente e riscos residuais registrados |

## 6. Ordem de execução e gates

**G0 — documentação:** aprovar ADR-011 e contrato INT-02.2; nenhum código/SQL remoto; manter INT-02/INT-02.1 como fontes históricas e a matriz L1 intacta.

**G1 — design revisado:** congelar operações permitidas, seu SQL e dados de saída; analisar ameaças e obter autorização explícita para código.

**G2 — implementação local:** Codex cria CLI separado, allowlist, testes e runner efêmero sem rota web nem segredo remoto; regressão do CI e da L1 original obrigatória.

**G3 — pré-voo remoto:** confirmar `Connect`, CA, role técnica e grants efetivos, Data API no Dashboard, revisão de segredo e aprovação humana da prova.

**G4 — validação remota autorizada:** execução nominal do MRD e relatório MRD próprio; não afirmar L1 SQL estrita nem prontidão comercial.

**G5 — revisão:** reavaliar risco de mediador/credencial e decidir se é necessário banco SQL isolado com garantia estrita.

## 7. Matriz de alterações permitidas nesta etapa documental

Permitido: produzir esta proposta e ADR-011; atualizar apenas links, estados e remissões precisos nos índices e documentos arquiteturais/integrativos pertinentes.

Proibido: alterar `.ts`, `.mjs`, Prisma, migrations, SQL de fixture, CI workflow, tokens, tests, `.env`, secrets, grants, projetos Supabase, web/API, Identity, Resend, frontend, Stripe ou R2.

## 8. Evidência e assinaturas

**Base GitHub inspecionada:** branch `main`, commit `fa95b3534be84b7673794816e1b500411fddbb70` de 14/10/2026. **Leitura do banco previamente documentada:** `PUBLIC TEMP` e função `lo_create` efetivamente executável por roles públicas; `atlas_l1_readonly` não provisionada. **Limites:** sem confirmação independente de toggle Data API e sem execução MRD. 

**Responsável técnico:** a definir · **Aprovador:** a definir · **Status da execução:** NÃO EXECUTADO.
