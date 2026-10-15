# QTE-05 — Handoff e pendências

**TEST_ONLY; fundação técnica validada localmente. Sem homologação comercial/remota.**

CI baseline 38786260932 confirmado success no SHA 827fc6b. O novo job
`quote-integration` preserva Actions por SHA, Node/pnpm fixados, instalação frozen,
imagem PostgreSQL por digest e os jobs anteriores. CI remoto QTE não executado:
não houve commit, push ou deploy.

Execução final: 30 casos PASS. Prova QTE-024: PID 487/XID 1986 nos
ports Quotes/Orders/Catalog/Pricing/Inventory e xmin compartilhado da evidência
Orders/reserva. O teste negativo bloqueou uma chave nova pelo port legado;
QTE-027 comprovou duas conexões em espera simultânea antes da convergência.
Não é prova de compra, estoque garantido na cotação ou pagamento.

## Comandos e resultados locais

| Verificação                                                           | Resultado desta entrega                                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                      | PASS; sem dependências/lockfile alterados                                                |
| `pnpm lint` / `pnpm typecheck`                                        | PASS                                                                                     |
| `pnpm test`                                                           | 68 PASS: API 65, demais workspaces 3; inclui 4 unitários Quotes                          |
| `pnpm build` / `pnpm smoke`                                           | PASS; sem timeout de Next nesta execução                                                 |
| `pnpm audit --json`                                                   | Zero advisories                                                                          |
| `pnpm --filter @atlas/api quotes:test`                                | Primeira execução 30 PASS                                                                |
| `node apps/api/scripts/quotes-local.mjs`                              | Fixture final reconstruída: 30 PASS, guarda final e quatro cadeias aplicadas/reaplicadas |
| `node apps/api/scripts/catalog-local.mjs`                             | 30 PASS                                                                                  |
| `node apps/api/scripts/pricing-local.mjs`                             | 30 PASS                                                                                  |
| `node apps/api/scripts/inventory-local.mjs`                           | 36 PASS                                                                                  |
| `node apps/api/scripts/orders-local.mjs`                              | 36 PASS                                                                                  |
| `node apps/api/scripts/supabase-local.mjs`                            | INT-02 local 38 PASS; sem SQL remoto                                                     |
| `node apps/api/scripts/mrd-local.mjs`                                 | Reexecução sem build concorrente: 44 PASS                                                |
| `node scripts/identity-db.mjs migrate/test`, cwd API, fixture própria | Migrations PASS; Identity/Resend 34 PASS                                                 |
| `node scripts/spike-db.mjs migrate/test`, cwd API, fixture própria    | Migrations PASS; PGSP 16 PASS                                                            |
| `node apps/api/scripts/connection-local.mjs`                          | L0 9 PASS                                                                                |
| Formatação direcionada / Prisma format                                | PASS nos arquivos modificados/schema novo                                                |
| `pnpm format:check`                                                   | FAIL histórico em 32 arquivos CRLF intactos; todos passam com LF em memória              |
| Links locais, YAML, OpenAPI/refs e `git diff --check`                 | PASS; contrato normativo preservado                                                      |

A primeira regressão MRD apresentou 31 PASS/13 FAIL nas chamadas do CLI durante
o rebuild global. O CLI importa `dist`, e Nest tem `deleteOutDir: true`. A
sobreposição é a causa provável; não houve mudança nas fontes MRD nem em seus
controles. A repetição isolada terminou com 44 PASS. A falha inicial permanece
registrada nas evidências, sem exclusão de testes ou aumento de limites.

Containers, volumes e locks próprios foram removidos/verificados pelos harnesses.
Nenhum projeto, recurso ou configuração de provedor foi modificado. Ainda é
necessária execução GitHub do delta após publicação autorizada.

## Pendências comerciais

- Política comercial de frete, tarifas, prazos, destinos e opções aprovadas.
- Atributos físicos reais e cadastro/ownership seguro de endereços.
- TTL comercial da cotação aprovado e composição real autorizada.
- Contrato de escolha de entrega pelo usuário; nenhum campo público foi inventado.
- Cupons, descontos e decisão de gratuidade.
- Identity público ainda não homologado; fixtures não são identidades reais.
- Checkout/pedido comercial, Payments/Stripe e homologação 40/30/5.
- Entitlements e fulfillment fora do escopo.
- Supabase L1 SQL estrito PENDENTE; nenhum SQL remoto, migration ou role em provedor.

Riscos residuais: autoridade administrativa pode modificar funções/fixtures;
trust é restrito ao Docker descartável/loopback. Locks concorrentes podem causar
deadlock/serialização e são tratados por retry integral limitado. TTLs e seleção
TEST_ONLY não aprovam políticas reais. Nenhum destes limites é relaxado para
ativar a composição normal.
