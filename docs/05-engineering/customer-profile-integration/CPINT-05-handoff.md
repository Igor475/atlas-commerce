# CPINT-05 — Handoff e limites

## Execução

Com Node 24.21.0, pnpm 12.11.2 e Docker local: `pnpm install --frozen-lockfile`, depois `pnpm --filter @atlas/api profile-orders:test`. O comando compila a API, cria fixture própria, aplica/reaplica migrations, executa CPINT-001–036 e remove os recursos próprios.

O job `profile-orders-integration` foi acrescentado ao [Quality](../../../.github/workflows/quality.yml), preservando os dez jobs anteriores, SHAs das actions, Node, Corepack, frozen lockfile e permissões. Sem secrets, URLs remotas ou CLI L1. O novo delta ainda precisa ser publicado e executado no GitHub; o CI de baseline não o aprova.

A primeira execução CPINT falhou na nova migration Profile por delimitador SQL incorreto, antes dos testes. O delimitador foi corrigido; a reexecução passou 36/36 e limpou a fixture. Nenhuma migration histórica foi alterada.

## Resultados e pendências

| Verificação                                        | Resultado local                                                |
| -------------------------------------------------- | -------------------------------------------------------------- |
| Install frozen                                     | PASS, lockfile preservado                                      |
| Lint / typecheck                                   | PASS / PASS                                                    |
| Unitários                                          | 74/74 (71 API + 3 demais workspaces)                           |
| Build / smoke                                      | PASS / PASS; live 200, ready 503 sem dependências configuradas |
| Audit                                              | PASS, zero vulnerabilidades                                    |
| CPINT / CP-01                                      | 36/36 e 36/36                                                  |
| Catalog / Pricing                                  | 30/30 e 30/30                                                  |
| Inventory / Orders                                 | 36/36 e 36/36                                                  |
| Quotes                                             | 30/30                                                          |
| L0 / INT-02                                        | 9/9 e 38/38, somente local                                     |
| MRD                                                | 44/44, L1 remoto pendente                                      |
| Identity/Resend / PGSP                             | 34/34 e 16/16                                                  |
| Formatação alterados / links / YAML / diff --check | PASS                                                           |
| Formatação global                                  | FAIL: mesmos 32 arquivos históricos CRLF, fora de escopo       |

A invocação completa do job e as primeiras tentativas Catalog/Pricing/Inventory/Orders/Quotes foram bloqueadas antes dos testes por outro container na porta 55439. Após autorização expressa, somente `atlas-cpint01-profile-orders-postgres-1` foi parado, com volume preservado. As seis suítes foram reexecutadas e passaram; os recursos UUID próprios foram limpos. A formatação global mantém os 32 arquivos CRLF históricos sem alteração; todos passam com LF apenas em memória.

O helper de morte de processo também foi corrigido para não aguardar um segundo evento exit quando o processo já terminou; a suíte CPINT foi repetida após a correção.

O pacote não habilita operação comercial. Permanecem pendentes: integração Identity comercial; unicidade comercial definitiva por cotação; SHIP-01; pedido final/checkout/Payments/Stripe; migrations e operação em produção; qualquer prova Supabase/L1. Não há endpoint público, dados reais, commit, push ou deploy nesta entrega.

Riscos residuais: as credenciais vazias e TLS desligado são exclusivos do servidor descartável com bind loopback e guards; executar esses artefatos fora do harness é recusado. Loopback não protege contra outros processos locais com acesso ao owner da fixture: o laboratório pressupõe máquina confiável e dados artificiais, sem isolamento de produção. Migrations dependem dos ports e guards legados revisados; mudanças futuras nesses ports exigem repetir as provas. As contagens e XIDs provam a fixture executada, não homologação de produção. A recuperação após commit sem resposta não demonstra perda de ACK TCP.
