# CAT-01 — Resultados locais

**Entrega local, sem homologação pública. CAT-030 agregado PARCIAL:** gate global
de formatação histórico falha; CI remoto deste delta não executado. Pricing real
indisponível por projeto, sem simular preço ou prontidão pública. L1_SQL_STRICT PENDENTE.

Baseline main `af091a1bad9ef4c2b360b90fb6701125efc4349e`, inicialmente limpa;
delta local não commitado, 15/10/2026. Node24.21.0/pnpm12.11.2/Prisma7.10.0/
adapter-pg7.10.0/pg8.23.1; PostgreSQL17.10 Docker Linux por digest, host Windows.

| Verificação realmente executada                 | Resultado                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| pnpm install --frozen-lockfile                  | PASS; nenhuma dependência/lockfile alterado                                                                                                |
| pnpm lint / pnpm typecheck                      | PASS                                                                                                                                       |
| pnpm test                                       | 37 PASS: 34 API e um em cada outro pacote/app                                                                                              |
| pnpm build / pnpm smoke                         | PASS, sem timeout Windows nesta rodada                                                                                                     |
| pnpm audit                                      | Nenhuma vulnerabilidade conhecida reportada                                                                                                |
| catalog:validate e prisma format no novo schema | PASS                                                                                                                                       |
| node apps/api/scripts/catalog-local.mjs         | 30 PASS HTTP Nest real/PostgreSQL; migration aplicada/reaplicada, cleanup próprio confirmado                                               |
| Identity/Resend PostgreSQL                      | 34 PASS; fixture separada limpa                                                                                                            |
| PGSP                                            | 16 PASS; fixture separada limpa                                                                                                            |
| L0                                              | 9 PASS; fixture separada limpa                                                                                                             |
| L1 e MRD                                        | 38 PASS L1 e 44 PASS MRD, critérios históricos intactos; cleanup próprio confirmado                                                        |
| pnpm format:check                               | FAIL nos32 arquivos CRLF históricos, preservados; helper novo formatado antes da verificação final                                         |
| Contratos                                       | OpenAPI3.1 parseado pelo parser YAML Prettier existente, 182 refs internos resolvidos; Ajv2020 existente valida respostas HTTP e negativos |
| CI GitHub                                       | Novo job preparado; execução remota NÃO REALIZADA                                                                                          |

[Evidência CAT final sanitizada](evidence/local-validation.txt) registra comando,
baseline, ambiente, amostras HTTP fictícias, 30 PASS, refs, plano SQL e cleanup.
Matriz individual em [CAT-03](../../../../docs/05-engineering/catalog/CAT-03-matriz-de-testes.md).
Gates/regressões têm logs timestampados da tarefa local, sem reutilizar resultados
anteriores como prova do novo delta. Relatório/diff completo acompanham a entrega.

## Evidências de segurança

- Somente produtos editorialmente publicados por view minimizada; obra/edição/
  componente retirado oculta avulsos/kits. Runtime não lê tabelas brutas nem escreve.
- Composição imutável após publicação; duas conexões reais provam lock e recusa.
- URL/role/db/marker/major17 fechados; migration em postgres recusada antes de schema.
- Query/keyset por bind Prisma; cursores HMAC adulterados recusados, sem SQL externo.
- HTTP real503 sem Pricing/preço faltante ou dinheiro inválido;404 privado/ausente;
  400 query inválida;429 abuso. Nenhum endpoint administrativo, mídia ou preço de fallback.
- Lock SQL real produz timeout503 minimizado, nova leitura recupera e $disconnect
  retorna zero sessões runtime. Harness confere labels/binding e limpa recursos próprios.
- Teste CAT-029 confirma diff vazio nas áreas protegidas e ausência de schemas
  Identity/spike na fixture; as suítes originais são reexecutadas separadamente.

## Ensaios preliminares e correções

Sandbox não acessou Docker. Fora dele, ambiente mínimo inicialmente omitia
ProgramFiles, necessário ao plugin Compose no Windows. Projeto UUID vazio e lock
da tentativa foram inspecionados/limpos explicitamente; allowlist ajustada, sem
encaminhar secrets de provedores. Falha SQL inicial foi isolada pelo driver pg em
outra fixture própria: SQL passava sem histórico, mas CREATE SCHEMA conflitava com
schema criado por Prisma Migrate. IF NOT EXISTS corrigiu; aplicar/reaplicar passou.

Primeira suíte completa:29/30. A expectativa nova de paginação confundia kit físico
com digital; corrigida de acordo com composição real, e adicionada inserção entre
páginas. Typecheck detectou tipo incompleto das opções do parser Prettier; corrigido
antes dos gates finais. Formatação global inicialmente apontou também o helper novo;
após formatá-lo, restaram somente32 arquivos históricos. Nenhum teste anterior ou
controle CI foi reduzido para obter aprovação.

## Pendências reais

OpenAPI das rotas Catalog não lista400 embora CT-03/validação estrita o exijam:
proposta mínima documentada, YAML normativo preservado. Pricing real, Inventory,
Orders/snapshots, mídia R2, busca/facetas e STAFF/MFA administrativos permanecem
fora da implementação. Fixture trust/loopback não atesta TLS ou segurança Supabase;
PUBLIC nativo e riscos de administrador/SO local não são garantia L1 estrita.
Sem acesso remoto, commit, push, deploy ou modificação de frontend/normas/Identity/MRD.
