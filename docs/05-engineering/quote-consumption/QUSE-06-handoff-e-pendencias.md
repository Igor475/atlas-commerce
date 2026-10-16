# QUSE-06 — Handoff e pendências

## Reprodução e status

`pnpm install --frozen-lockfile` e `pnpm --filter @atlas/api quote-consumption:test`. O job [quote-consumption-integration](../../../.github/workflows/quality.yml) utiliza Docker local descartável, imagem digest fixado, Actions/Node/pnpm fixados e instalação frozen, preservando os doze jobs anteriores e permissions contents:read. Sem credenciais de provedores, CLI remoto ou URLs remotas aceitas.

## Resultados locais executados — 16/10/2026

| Verificação                       | Resultado                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Install frozen / lint / typecheck | PASS                                                                         |
| Unitários                         | 79/79 (76 API + 3 demais workspaces)                                         |
| Build / smoke                     | PASS; build completo 54.56s; live=200, ready=503 DEPENDENCIES_NOT_CONFIGURED |
| Audit                             | PASS; zero vulnerabilidades                                                  |
| QUSE                              | 36/36, com reaplicação e cleanup próprio                                     |
| Shipping / CP-02 / CP-01          | 40/40, 36/36, 36/36                                                          |
| Catalog / Pricing / Inventory     | 30/30, 30/30, 36/36                                                          |
| Orders / Quotes                   | 36/36, 30/30                                                                 |
| Identity/Resend / PGSP            | 34/34, 16/16                                                                 |
| L0 / INT-02 / MRD                 | 9/9, 38/38, 44/44; somente local                                             |
| Formatação global                 | FAIL: 32 arquivos CRLF históricos intactos                                   |

Total: 451 cenários PostgreSQL únicos, incluindo 36 QUSE; 79 testes unitários. Não inclui repetições na contagem.

Evidência QUSE-010/011: duas/três conexões, respectivamente um/dois waiters advisory observados; um vencedor, um/dois conflitos e um único conjunto de efeitos. QUSE-012 confirmou segunda quote independente antes do commit da primeira.

QUSE-029: PID 729, XID 2622; xmin consumo/Shipping/Profile/Orders/Inventory = 2622, 2622, 2622, 2622, 2622. Quote 7f82826b-efb1-432b-beb1-b3f1ad36667b, preparação 07ed48b2-d58a-e5ab-d6f9-534b31255ec2. Antes: dez contagens zero; depois: dez contagens um. Nenhum dado postal ou chave registrado. QUSE-030/031/019 exercitaram falha após snapshot/reserva/consumo e morte antes/depois de commit; recuperação sem resposta da aplicação não prova perda de ACK TCP.

Primeira execução QUSE: 36/36. Lint inicial encontrou helper não usado, removido. No lote completo, outra execução parou na preparação da fixture após Catalog, antes dos testes; cleanup próprio passou. O log original não classificou a causa; não se infere timeout ou defeito de domínio. Foi adicionado diagnóstico sanitizado de etapa/código, sem relaxar timeouts/guards. Reexecução final isolada: 36/36, incluindo prova adicional de backfill completo e recusa de evidência legada ausente. A tentativa bloqueada permanece registrada no relatório local. MRD teve inicialmente 43/44 e dois erros não tratados porque o backend que sustentava a barreira foi encerrado por idle-in-transaction timeout; a repetição isolada passou 44/44, sem alterar a suíte, timeouts ou controles MRD.

Nenhum PASS é inferido de resultados históricos. O CI de referência 38928779266 aprovou exclusivamente o baseline 5c978df; o novo delta não foi publicado nem executado no GitHub Actions.

Formatação global: os 32 arquivos CRLF históricos continuam fora de escopo e falharam como informado acima; a verificação em memória com LF confirmou a origem, sem escrever esses arquivos. Migrations foram aplicadas/reaplicadas em PostgreSQL17 real. Links locais, YAML, preservação dos jobs/dependências, formatação das fontes suportadas/documentos novos e git diff --check foram verificados no encerramento. SQL não possui parser Prettier instalado; a validação é sua aplicação efetiva no banco descartável.

## Limites e próximos gates

- Mecanismo TEST_ONLY não homologa checkout comercial, pedido definitivo, autenticação pública ou contratos HTTP.
- Migração real/rollout, dados incompatíveis, volume, retenção de intenção e mapeamento público de conflito exigem entrega separada. Backfill de fatos completos descreve origem migrada; não fabrica PID/XID original.
- Parâmetros comerciais de frete/cobertura/prazo/endereço continuam abertos; os valores sintéticos da fixture não são oferta real.
- QTE-POL-06/OpenAPI, Identity comercial, Payments/Stripe API/SDK/40/30/5 e L1_SQL_STRICT continuam sem homologação por esta entrega.
- Privilege escalation por owner/admin do computador confiável não é parte da garantia runtime. Hash collision de advisory pode gerar contenção residual; não afeta unicidade. Timeouts podem exigir replay autorizado.

Nenhum recurso remoto alterado; nenhum banco remoto, segredo real ou dado comercial real utilizado. Sem commit, push ou deploy. Destruição/reconstrução limitada aos recursos descartáveis UUID criados pelo harness.
