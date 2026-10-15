# ORD-05 — Handoff e pendências

**Validação técnica local concluída; checkout comercial e CI remoto não homologados.**

## Baseline e separação de deltas

HEAD local/main publicado: `bd3740719bc5b13c5fe1fe7d1eb4bd6904d55fca`.
Inspeção GitHub confirmou que CT-CAT-400 ainda não estava publicado no início
desta entrega. Seis documentos locais pré-existentes foram preservados; o
OpenAPI aprovado localmente não faz parte do delta ORD-01. Testes de regressão
ocorrem em worktree gerenciado do baseline com somente ORD-01, evitando misturar
a decisão normativa não publicada com provas de integridade histórica.

## Resultados locais de 15/10/2026

| Comando/prova                                                         | Resultado do delta                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                      | PASS, lockfile preservado                                                                                    |
| `pnpm lint`                                                           | PASS                                                                                                         |
| `pnpm typecheck`                                                      | PASS após corrigir três tipagens dos novos testes                                                            |
| `pnpm test`                                                           | 64 PASS: API 61, demais workspaces 3; inclui 4 unitários Orders                                              |
| `pnpm build`                                                          | PASS, incluindo ambos os apps Next; sem timeout nesta execução                                               |
| `pnpm smoke`                                                          | PASS                                                                                                         |
| `pnpm audit --json`                                                   | Zero advisories em todas as severidades                                                                      |
| `pnpm --filter @atlas/api orders:test`                                | 36 PASS; quatro cadeias de migrations aplicadas e reaplicadas                                                |
| `node apps/api/scripts/catalog-local.mjs`                             | 30 PASS                                                                                                      |
| `node apps/api/scripts/pricing-local.mjs`                             | 30 PASS                                                                                                      |
| `node apps/api/scripts/inventory-local.mjs`                           | 36 PASS                                                                                                      |
| `node apps/api/scripts/supabase-local.mjs`                            | 38 PASS locais INT-02; sem Supabase remoto                                                                   |
| `node apps/api/scripts/mrd-local.mjs`                                 | 44 PASS locais; L1 não promovido                                                                             |
| `node scripts/identity-db.mjs migrate/test`, cwd API, fixture própria | Migrations PASS; Identity/Resend 34 PASS                                                                     |
| `node scripts/spike-db.mjs migrate/test`, cwd API, fixture própria    | Migrations PASS; PGSP 16 PASS                                                                                |
| `node apps/api/scripts/connection-local.mjs`                          | L0 9 PASS                                                                                                    |
| Formatação direcionada dos arquivos ORD                               | PASS; Prisma format aplicado aos dois schemas novos                                                          |
| `pnpm format:check`, checkout principal                               | FAIL histórico: 32 arquivos CRLF, todos passam quando normalizados em memória para LF; nenhum deles alterado |
| `git diff --check`                                                    | PASS                                                                                                         |

O worktree recém-criado apresentou 150 avisos de formatação decorrentes de CRLF
do checkout Windows. O resultado de referência acima usa o checkout principal,
com as 32 falhas históricas identificadas; não houve normalização global nem
redução do gate. Uma primeira tentativa externa de coletar Identity/PGSP teve
argumentos incorretos; o script de coleta foi corrigido e ambos foram executados
novamente com sucesso, sem modificar runners do repositório.

Prova ORD-013 registrada: Catalog/Pricing/Inventory/Orders com **PID 340,
XID 1304**; seis linhas duráveis de Orders/Inventory com `xmin = 1304`. A falha
injetada após reserva deixou zero intenção/preparação/reserva/ledger/evento.
O retry de serialização gerou uma única preparação/reserva/evento. Os testes
de processo antes/depois do commit e de concorrência usaram conexões independentes.
Isso não comprova perda de ACK TCP nem pagamento.

Containers, volumes e locks pertencentes aos harnesses foram removidos e
verificados. O worktree gerenciado foi mantido para revisão; não foi arquivado
por snapshot Git. As cinco outras alterações CT-CAT-400 permanecem byte a byte;
no índice compartilhado foi acrescentada somente a linha ORD-01.

## Pendências comerciais

- Cotação completa/validade comercial e RN-032, políticas de entrega e frete.
- Identity público e vínculo real com consumidor autenticado.
- Agregado Order comercial com estados SM-01 e transições autorizadas.
- Payments/Stripe embedded Test Mode, versão SDK/API e política 40/30/5 não homologadas.
- Entitlements, fulfillment, biblioteca e faturamento fora do escopo.
- L1-SQL PENDENTE; nenhuma role/migration/SQL em Supabase ou outro provedor.
- CI remoto deste delta não executado: não houve commit, push ou deploy.

O job `orders-integration` usa a imagem PostgreSQL 17 fixada já adotada,
Actions por SHA, Node/pnpm preservados, instalação frozen e nenhum secret.
Jobs existentes permanecem independentes. O harness não invoca CLI remoto,
filtra variáveis e verifica propriedade/limpeza dos recursos locais.
