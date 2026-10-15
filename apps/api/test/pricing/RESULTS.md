# PRIC-01 — Resultados locais e limites

Baseline main `1727a3820829ba319b7ddfd66165a388618552d5`, inicialmente limpa;
15/10/2026, delta local não commitado. Node24.21.0, pnpm12.11.2, Nest12.1.3,
Prisma/adapter-pg7.10.0, pg8.23.1, PostgreSQL17.10 Docker Linux por digest existente,
host Windows. Não é homologação pública; L1_SQL_STRICT PENDENTE.

| Verificação executada neste delta             | Resultado                                                                        |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| pnpm install --frozen-lockfile                | PASS; nenhuma dependência/lockfile alterado                                      |
| pnpm lint / pnpm typecheck                    | PASS; API typecheck/lint repetidos após guardas finais                           |
| pnpm test                                     | 48 PASS:45 API (11 novos Pricing) e um em cada outro app/pacote                  |
| pnpm build / pnpm smoke                       | PASS; API reconstruída após guarda final, sem timeout Windows                    |
| pnpm audit                                    | Nenhuma vulnerabilidade conhecida reportada                                      |
| pricing:validate / prisma format novo schema  | PASS                                                                             |
| pricing:test e node scripts/pricing-local.mjs | 30 PASS finais, migrations separadas aplicadas/reaplicadas e cleanup confirmado  |
| Catalog original                              | 30 PASS, critérios/migration intactos                                            |
| Identity/Resend PostgreSQL                    | 34 PASS, fixture própria limpa                                                   |
| PGSP                                          | 16 PASS, fixture própria limpa                                                   |
| L0                                            | 9 PASS                                                                           |
| L1 original                                   | 38 PASS                                                                          |
| MRD original                                  | 44 PASS, cleanup confirmado; remoto bloqueado                                    |
| OpenAPI vigente                               | Parse3.1,182 refs internos e validação das respostas HTTP reais                  |
| Proposta HTTP400                              | git apply --check --unidiff-zero PASS, sem aplicar ao YAML ativo                 |
| Formatação arquivos alterados aplicáveis      | PASS                                                                             |
| pnpm format:check                             | FAIL somente32 CRLF históricos; todos passam com LF em memória, disco preservado |
| CI GitHub deste delta                         | NÃO EXECUTADO; job local dedicado preparado                                      |

**PRIC-001–027 PASS local; PRIC-028 PASS com regressão34 Identity/Resend;
PRIC-029 PASS com regressões30 Catalog/16 PGSP/9 L0/38 L1/44 MRD;
PRIC-030 agregado PARCIAL** pelo gate global e CI remoto não executado. Gratuidade
e HTTP400 continuam pendentes de aprovação; seus negativos/proposta não aprovam
decisão comercial ou contrato ativo. [Matriz individual](../../../../docs/05-engineering/pricing/PRIC-03-matriz-de-testes.md).

[Transcrição final sanitizada](evidence/local-validation.txt): ambiente/baseline,
comandos,30 PASS, amostras HTTP fictícias persistidas, EXPLAIN e cleanup. Logs
timestampados dos gates e regressões acompanham o relatório local; resultados
históricos de tarefas anteriores não foram usados como prova deste delta.

## Provas significativas

- O preço de livro1001, e-book2002, revista3003 e kits4004/5005/6006 centavos vem
  das revisões Pricing da fixture, **DEMO**, não fonte comercial ou adapter fake.
- Sem preço/resultado parcial/zero não aprovado:503, sem DTO falso. Publicação
  editorial e paginação Catalog preservadas; previewAvailable=false.
- Seleção real de revisões antes/no início e antes/no cutover, com precisão
  PostgreSQL; histórico antigo excluído exatamente no fim. Clock medido após lock.
- Duas conexões de escrita serializadas e leitura HTTP com alteração não commitada
  prova isolamento, uma corrente e histórico de três versões.
- INSERT/UPDATE/DELETE/CREATE/EXECUTE privados recusados em sessão de teste com
  default_transaction_read_only=off. Não se usa flag read-only como substituto ACL.
- Grant UPDATE indevido em objeto Pricing produz503; revogação local recupera.
- Conexão ativa terminada e lock SQL real causam503 minimizado, recuperação e zero
  sessões runtime após close. Sem fallback/retry de preço nem dados administrativos.
- Uma chamada de repository por página executa uma consulta fixa de identidade/
  privilégios e uma consulta de preços em lote, não N+1 por produto.

## Revisão e ensaios

Primeira integração30/30. Revisão reforçou os testes de fronteira para selecionar
revisões reais, adicionou drift de grant, markers/owner antes do DDL e teste de ACL
com flag de sessão desligada. Duas consultas novas falharam por alias SQL; corrigidas
com coluna observed_at explícita e suíte completa repetida:30/30 e cleanup.
Logs da tentativa28/30 são preservados. Nenhum teste anterior foi modificado.

Unitários/gates amplos rodaram neste delta; API typecheck/lint/build e integração
Pricing foram repetidos após hardening. Todas as regressões são novas execuções.
As únicas consultas externas dos comandos de validação são ao registro de pacotes
para pnpm; nenhum serviço da aplicação ou recurso Supabase/Stripe/Resend foi acessado
ou alterado. Não houve frontend, commit, push, deploy ou liberação de próxima etapa.
