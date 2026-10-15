# INV-01 — Resultados locais e limites

Baseline main `d6b1b4c4744e81afb9a327f2b2b115f9b5956c28`, inicialmente limpo;
15/10/2026, delta não commitado. PostgreSQL17.10 Docker Linux por digest existente;
Windows, Node24.21.0, pnpm12.11.2, Prisma/adapter7.10.0, pg8.23.1, Nest12.1.3.
Dados DEMO e referências comerciais artificiais somente na fixture.

| Verificação executada neste delta              | Resultado real                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| pnpm install --frozen-lockfile                 | PASS; dependências e lockfile intactos                                                                  |
| pnpm lint / pnpm typecheck                     | PASS                                                                                                    |
| pnpm test                                      | 60 PASS:57 API (12 novos Inventory) e 3 dos demais apps/pacotes                                         |
| pnpm build / pnpm smoke                        | PASS; sem timeout Windows de build nesta rodada                                                         |
| pnpm audit                                     | PASS; nenhuma vulnerabilidade conhecida reportada                                                       |
| inventory:validate / prisma format novo schema | PASS                                                                                                    |
| pnpm --filter @atlas/api inventory:test        | 36 PASS finais; migrations aplicadas/reaplicadas; cleanup confirmado                                    |
| Catalog original                               | 30 PASS na repetição após timeout Compose antes dos testes                                              |
| Pricing original                               | 30 PASS                                                                                                 |
| Identity/Resend PostgreSQL                     | 34 PASS; fixture própria limpa                                                                          |
| PGSP                                           | 16 PASS; fixture própria limpa                                                                          |
| L0                                             | 9 PASS                                                                                                  |
| INT-02/L1 local                                | 38 PASS; não prova L1 Supabase remoto                                                                   |
| MRD local                                      | 44 PASS; remoto continua bloqueado                                                                      |
| Formatação direcionada                         | PASS nos arquivos aplicáveis; índice preserva estilo histórico, ignorado pelo formatador do repositório |
| pnpm format:check                              | FAIL:32 arquivos CRLF históricos; todos passam com LF em memória, disco preservado                      |
| Links/YAML/diff                                | Validados na entrega final; jobs anteriores e áreas protegidas intactos                                 |
| CI GitHub deste delta                          | NÃO EXECUTADO; job dedicado preparado, sem publicação                                                   |

**INV-001–034 PASS local; INV-035 PASS com regressões novas;
INV-036 agregado PARCIAL** pelo gate global de formatação e CI do delta não executado.
[Matriz individual](../../../../docs/05-engineering/inventory/INV-04-matriz-de-testes.md).
[Transcrição final sanitizada](evidence/local-validation.txt) contém comando exato,
36 PASS, versão PostgreSQL, provas de concorrência, EXPLAIN e cleanup.

## Provas significativas

- Última unidade:barreira de lock observou duas conexões independentes; um sucesso,
  uma recusa; on_hand10/reserved_active10/allocated0/available0 após disputa.
- Lock em SKU1 não bloqueou reserva SKU2; componentes físicos repetidos de kits e
  avulsos foram consolidados; falta em componente desfez toda a tentativa.
- Reserva muda saldo10/0/0 para10/1/0; confirmação válida muda para10/0/1.
  Reconciliação dos deltas do ledger não encontrou divergências.
- Dois expiradores liberaram uma vez:saldo10/0/0, um ledger EXPIRED. Confirmação
  iniciada antes do vencimento, mas liberada após lock, foi recusada; alocação0.
- TTL2400 segundos desde relógio DB medido após locks. Posicionamento temporal dos
  testes é exclusivo do owner da fixture, preservando CHECK40min; nenhum override runtime.
- SQLSTATE40001 real controlado:duas tentativas da função integral e um efeito.
  Timeout real de lock fez rollback; replay recuperou sem duplicação.
- Processo filho morto com transação não commitada não deixou reserva; restart e
  replay preservaram efeito único. Conexão runtime terminada recuperou com replay
  de resultado persistido; não se afirma reprodução de perda de ACK no protocolo.
- DML/DDL direto, leitura administrativa, membership e escrita Catalog/Pricing
  recusados (42501); CHECKs rejeitaram saldo inválido (23514). Grant UPDATE indevido
  causou INVENTORY_UNAVAILABLE e revogação na fixture recuperou.
- POSTs Inventory inexistentes (404); composição normal não recebe decisão financeira.
  Nenhum preço/pagamento/entitlement/pedido fictício foi promovido a domínio real.

## Rodadas e limitações observadas

Rodada inicial36/36 PASS. Hardening acrescentou guards de funções e identidade
Pricing antes de DDL. Um ensaio recusou por to_regclass exigir USAGE Pricing;
consulta corrigida para pg_class/pg_namespace sem grant adicional. Nova rodada36/36
PASS. Após revisão estrutural/snapshot antes de await, comando completo repetido:
36/36 PASS e cleanup. Código final também passou nos gates e regressões acima.

Sandbox bloqueou store pnpm, processos com EPERM, registry e Docker; comandos
afetados foram repetidos com permissão e passaram. Catalog teve timeout na etapa
Compose antes dos testes, com cleanup; repetição original30/30 PASS. Logs das
falhas/tentativas são preservados nos artefatos da entrega, sem alterar gates.

[CI do baseline38753311355](https://github.com/Igor475/atlas-commerce/actions/runs/38753311355)
verificado completed/success somente para baseline. Não é evidência de CI Inventory.
L1_SQL_STRICT PENDENTE; integração conjunta Orders/Payments pendente; política
Stripe40/30/5 NÃO HOMOLOGADA; UXD-16 e normas intactas. Sem frontend ou deploy.

Consultas externas limitaram-se à inspeção GitHub autorizada do baseline e comandos
pnpm solicitados/registro de pacotes. Nenhum recurso Supabase/Stripe/Resend/R2 ou
outro provedor da aplicação foi acessado/alterado. Sem commit, push ou deploy.
