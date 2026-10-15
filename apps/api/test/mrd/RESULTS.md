# MRD-G2 — resultados locais e limitações

Baseline `c48c97f4b4ef97a5bafd2dbb181f70dd234034f7`, branch main. Execuções em
14–15/10/2026. Node24.21.0, pnpm12.11.2, pg8.23.1, PostgreSQL17.10 Docker Linux
por digest fixado, host Windows. Sem commit/push/deploy ou SQL no Supabase.

**G2 PARCIAL**, sem MRD_LOCAL_VALIDATED global: delta de cobertura de roles API
pendente de revisão humana e gate global de formatação preexistente aberto.
Os resultados abaixo são de testes realmente executados neste delta. Provas
remotas MRD-014/016 estão BLOQUEADAS, não “aprovadas por skip”. L1-SQL PENDENTE.

| Verificação                                               | Resultado                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| node apps/api/scripts/mrd-local.mjs                       | 44 PASS; quatro SQLs com OIDs/linhas conferidos, TLS IP válido e negativos, auditoria, cleanup e concorrência |
| node apps/api/scripts/supabase-local.mjs                  | 38 PASS originais, sem alterar detector/fixture/testes                                                        |
| pnpm test                                                 | 37 PASS no monorepo, incluindo 34 API; MRD executado separadamente                                            |
| pnpm --filter @atlas/api identity:migrate / identity:test | 34 PASS Identity/Resend na fixture separada                                                                   |
| pnpm --filter @atlas/api spike:migrate / spike:test       | 16 PASS PGSP na fixture separada                                                                              |
| pnpm --filter @atlas/api connection:test                  | 9 PASS L0 na fixture separada                                                                                 |
| pnpm lint / pnpm typecheck                                | PASS                                                                                                          |
| pnpm build / pnpm smoke                                   | PASS fora do sandbox                                                                                          |
| pnpm audit                                                | Nenhuma vulnerabilidade conhecida reportada                                                                   |
| Formatação dos novos TS/MJS/JSON                          | PASS                                                                                                          |
| pnpm format:check                                         | FAIL nos 32 arquivos CRLF preexistentes, preservados                                                          |
| git diff --check / links locais                           | Validados na revisão final, sem mudar gates ou exclusões                                                      |

## Evidência das consultas

[Transcrição local final sanitizada](evidence/local-validation.txt): baseline,
toolchain, comando, hashes/OIDs/cardinalidade, 44 PASS e cleanup próprio confirmado.

PING: uma linha int4/OID23. SERVER_METADATA: uma linha com OIDs19/19/19/23/16/16/25.
PRIVILEGES_SUMMARY: uma linha com 14 boolean/OID16. SCHEMA_EXPOSURE_SUMMARY: duas
linhas e seis campos com OIDs25/16/16/16/16/16. Transcrição minimizada imprime
somente hashes/OIDs/cardinalidade, sem senha, URI, SQL bruto ou conteúdo de aplicação.

Três SQLs iguais ao G1 por hash. O quarto corrige false enganoso com roles API
ausentes: api_roles_present e api_relation_grant=null/cobertura explícita. A
original foi reproduzida na fixture; a corrigida foi testada com ausência das
duas roles, uma presente, ambas presentes, herança e grants de tabela/coluna/PUBLIC.
Esse delta exige revisão humana. Manifesto versionado em [catalog-review.json](catalog-review.json).

PUBLIC TEMP e EXECUTE lo_create continuam disponíveis; não foram usados pela
CLI e não são descritos como removidos. Contagem de large objects antes/depois
da CLI é igual. Funções/views homônimas artificiais não são executadas.

## TLS, exclusividade e falhas

CA local, certificado real com SAN IP127.0.0.1, rejectUnauthorized=true e verificação
de IP efetiva. CA incorreta e certificado real com apenas SAN DNS recusados; nova
execução com certificado correto passa. Lock real de catálogo induz timeout;
interrupção e recuperação são testadas sem retry. Duas CLIs reais geram BUSY para
a concorrente. Lock substituído/terminal de auditoria indisponível bloqueiam sucesso
e preservam o recurso alheio até recuperação explícita do controlador de teste.

Harness confere binding127.0.0.1:55438, labels/run ID e inventário vazio após
destruir seus containers/volume/network. Certificados, contexto secreto de teste,
auditoria e lock próprios são removidos. Remoto/URL/env indevidos são recusados;
nenhuma conexão SQL ou HTTP ao Supabase ocorreu. Isso não prova contenção contra
SO/executor malicioso, pois a modalidade A aceita esse risco residual.

## Ensaios preliminares e diferenças de ambiente

- Sandbox: EPERM em processos, Docker npipe inacessível e auditoria sem rede;
  repetidos fora dele, sem enfraquecer controles.
- Bootstrap: polling de Docker com timeout3 s resultou em falsa indisponibilidade
  apesar do log PostgreSQL pronto; comando de bootstrap foi limitado a10 s,
  sem alterar conexão/query/deadline do executor G1.
- A prontidão inicial agora exige TCP127.0.0.1, evitando confundir o servidor
  Unix temporário do initdb com o servidor definitivo. Uma tentativa preliminar
  falhou fechada entre prontidão e setup e limpou seus recursos; a execução final
  com esse pré-voo passou. Os erros do harness identificam somente executável/
  operação fixa, sem publicar argumentos SQL ou credenciais.
- Rede Docker internal impediu acesso à porta publicada no Docker Desktop;
  foi usada rede bridge própria com binding explícito loopback. Não é firewall
  de egress nem garantia contra processo comprometido; executor só tem destino local.
- Primeiro ensaio de contagem de sessões incluía o controlador administrativo;
  ele agora tem application_name próprio e a contagem MRD volta a zero.
- Build concorrente recriou dist durante imports de CLIs; falhou fechado.
  Validação correta executa build antes e mantém dist estável durante a suíte.
- Certas correções de hardening motivaram repetição da suíte completa; logs de
  tentativas malsucedidas são preservados, sem substituir evidência final por logs antigos.

Relatório arquitetural, autorização e matriz individual:
[MRD-G2](../../../../docs/05-engineering/integrations/MRD-G2-implementacao-local.md).
Logs timestampados e transcrições desta tarefa acompanham a entrega local; nenhuma
execução GitHub nova foi inferida. Nenhuma aprovação de produção, B, G3/G4 ou L1.
