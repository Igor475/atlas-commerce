# SHIP-06 — Handoff e pendências

## Reprodução

`pnpm install --frozen-lockfile`, depois `pnpm --filter @atlas/api shipping:test`: compila a API, cria [fixture própria](../../../apps/api/compose.shipping.yml), aplica/reaplica cadeias históricas e Shipping, executa 40 casos e remove recursos próprios. Não usar Docker Compose manual para contornar o lock/guards do harness.

O novo job `shipping-integration` no [Quality](../../../.github/workflows/quality.yml) preserva os onze jobs anteriores, permissões e versões fixadas. Sem secrets externos ou CLI remoto. O CI de baseline foi aprovado, mas o novo delta ainda não foi publicado nem executado remotamente.

## Resultados locais

| Verificação                       | Resultado local                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Install frozen / lint / typecheck | PASS                                                                             |
| Unitários                         | 77/77 (74 API + 3 demais workspaces)                                             |
| Build / smoke                     | PASS; build completo 49,24 s; live 200 / ready 503 sem dependências configuradas |
| Audit                             | PASS, zero vulnerabilidades                                                      |
| Shipping                          | 40/40                                                                            |
| CP-02 / CP-01                     | 36/36 e 36/36                                                                    |
| Catalog / Pricing                 | 30/30 e 30/30                                                                    |
| Inventory / Orders / Quotes       | 36/36, 36/36 e 30/30                                                             |
| Identity/Resend / PGSP            | 34/34 e 16/16                                                                    |
| L0 / INT-02 / MRD                 | 9/9, 38/38 e 44/44, somente local                                                |
| Formatação global                 | FAIL: mesmos 32 arquivos históricos CRLF; fora de escopo                         |

Primeira execução: 1/40 passou; 39 casos bloqueados pelo reset que não truncava Shipping.policy, corrigido. Segunda: 37/40; três ramos digitais bloqueados por delimitador SQL incorreto no helper que substituía Shipping, corrigido. Terceira execução pelo comando completo do job: 40/40, com ports Shipping e Profile postal bloqueados nos testes digitais e cleanup próprio confirmado. Lint inicial encontrou import não usado, removido. Typecheck inicial encontrou referência quoteProjection remanescente no adapter, corrigida. Revisão final: marker incorreto isolado com role correta; expiração comprovada pelo DB; tarifa nova ainda elegível exige recotação; replay após expiração efetiva; guard de porta recusa NULL. Suíte final repetida 40/40 após esses ajustes. Nenhum gate foi enfraquecido.

Na validação final, passaram 415 cenários PostgreSQL e 77 testes unitários. Links locais (19), YAML, preservação das dependências, formatação dos arquivos suportados/documentos novos e git diff --check passaram. O relatório local de evidências registra comandos, falhas iniciais e reexecuções.

Formatação global histórica: os 32 arquivos CRLF permanecem fora de escopo e não devem ser normalizados para aprovar este delta. SQL é validado aplicando migrations reais; Prettier é executado nos tipos de arquivo suportados, com documentação nova verificada explicitamente apesar do ignore global docs.

## Dependências abertas

- Valores comerciais, zonas/CEP/cobertura, opção/rótulo, transportabilidade, peso/dimensão/embalagem e limites reais.
- Calendário, feriados, prazos, marco inicial e schema estimate/dayBasis/startsAtEvent.
- Campos postais definitivos, fonte postal, retenção/anonimização e finalidade operacional.
- Evolução contratual QTE-POL-06 e compatibilidade de QuoteResult fechado.
- Identity comercial, unicidade comercial por quote, checkout/pedido final e habilitação pública.
- L1_SQL_STRICT/Supabase e prova Stripe Embedded Test Mode/API/SDK/40/30/5, ainda não homologados.

Recuperação local: destruir somente a fixture UUID criada e reconstruir por migrations. Não há down migration, aplicação remota ou deploy autorizado. Snapshots/evidências dependem de ports legados revisados; evolução futura exige repetir concorrência/atomicidade. Reaplicação local e hashes preservados não homologam migrations de produção.

Sem operação remota, dados reais, commit, push ou deploy nesta entrega.
