# CP-06 — Handoff, evidências e pendências

**16/10/2026 · validação técnica local, sem habilitação comercial.**
Baseline main c5c1cd4ab2a7b528640c8084e18de9ff61c1d744. O CI remoto
[38890850956](https://github.com/Igor475/atlas-commerce/actions/runs/38890850956)
foi conferido como completed/success nesse SHA; não executou o novo delta CP-01.
Sem commit/push/deploy, não declarar customer-profile-integration aprovado remotamente.

## Resultados locais desta entrega

Antes dos gates: pnpm install --frozen-lockfile PASS, lockfile intacto; geração e
validação do schema Prisma Profile PASS. Os comandos abaixo foram executados
no delta CP-01, não reaproveitados como prova de baseline anterior. Nomes de
integração representam node apps/api/scripts/<nome>-local.mjs; Identity/PGSP
usam scripts originais migrate/test em fixtures Docker UUID próprias.

| Comando / suíte                   | Resultado      | Evidência resumida                                |
| --------------------------------- | -------------- | ------------------------------------------------- |
| lint                              | PASS           | exit 0; 15.42 s                                   |
| typecheck                         | PASS           | exit 0; 41.21 s                                   |
| test                              | PASS           | 72 testes                                         |
| build                             | PASS           | exit 0; 46.56 s                                   |
| smoke                             | PASS           | exit 0; 40.61 s                                   |
| audit                             | PASS           | exit 0; 0.98 s                                    |
| profile                           | PASS           | 36 testes                                         |
| catalog                           | PASS           | 30 testes                                         |
| pricing                           | PASS           | 30 testes                                         |
| inventory                         | PASS           | 36 testes                                         |
| orders                            | PASS           | 36 testes                                         |
| quotes                            | PASS           | 30 testes                                         |
| connection                        | PASS           | 9 testes                                          |
| supabase                          | PASS           | 38 testes                                         |
| mrd                               | PASS           | 44 testes                                         |
| identity-migrate                  | PASS           | exit 0; 4.13 s                                    |
| identity-repeat-migrate           | PASS           | exit 0; 2.94 s                                    |
| identity-test                     | PASS           | 34 testes                                         |
| identity-cleanup                  | PASS           | exit 0; 2.26 s                                    |
| spike-migrate                     | PASS           | exit 0; 2.85 s                                    |
| spike-repeat-migrate              | PASS           | exit 0; 2.71 s                                    |
| spike-test                        | PASS           | 16 testes                                         |
| spike-cleanup                     | PASS           | exit 0; 2.2 s                                     |
| pnpm format:check, execução final | FAIL histórico | 32 arquivos CRLF fora de escopo; não normalizados |

Os 36 CP incluem ports, concorrência PostgreSQL e negativos. CP-032–036 são
guardas de fronteiras/rollback; as regressões completas listadas acima são
execuções separadas, não deduzidas dessas guardas. Unitários globais: 69 API e
3 demais workspaces (72), incluindo quatro Profile. Formatação dirigida e
git diff --check são verificações finais separadas do gate global histórico.

Repetição final após a validação explícita de strings: `pnpm --filter @atlas/api
profile:test` PASS, incluindo novo build da API, aplicação/reaplicação de migration,
36 casos e limpeza confirmada. Quatro unitários CP repetidos PASS. Não houve
mudança funcional posterior a essas provas. Build global Windows concluiu sem
timeout nesta execução; não se alterou a UI para obtê-lo.

Primeiras tentativas expuseram: store/Docker/forks bloqueados no sandbox
(repetidos com permissão local), CREATE SCHEMA redundante com Prisma (corrigido
com IF NOT EXISTS e guarda de owner), regex UUID incompleta (corrigida e protegida
por unitário) e duas falhas de formatação novas (corrigidas). A verificação final
global voltou aos 32 CRLF históricos. Revisão final tornou postalCode/region
explicitamente strings na borda TypeScript, sem coerção numérica; unitários
Profile repetidos PASS. Não se reduziram gates ou ampliaram permissões para passar.

## CI e operação

Job customer-profile-integration acrescentado ao Quality, independente de Identity,
PGSP, Catalog/Pricing/Inventory/Orders/Quotes e INT-02. Actions por SHA, Node24.21.0,
Corepack/pnpm fixado, instalação frozen e contents:read preservados. Job carrega
somente imagem PostgreSQL17 por digest e chama profile:test, sem secrets de provedor.
O harness recusa Docker remoto e argumentos externos, filtra ambiente, trava
porta 55441 e limpa/verifica apenas projeto UUID/volume/rede próprios.

Nenhuma alteração em frontend, Identity/Resend, contratos ativos, migrations de
outros módulos, MRD/L1, regras de frete ou dados remotos. O único package.json
alterado acrescenta geração/validação/teste Profile, sem mudança de dependências.
AppModule continua sem CustomerProfile; provider normal null, sem controller/API.

## Pendências e próximo handoff

- Identity real: adapter confiável de conta/estado, sessões/origens/TLS homologados;
  a evidência CP-01_TEST_ONLY não é credencial de cliente ou fonte de verdade real.
- Campos postais definitivos, tipos/limites/normalização, fonte CEP e tratamento
  de endereços especiais; os nove campos deste laboratório são candidatos técnicos.
- Finalidade/bases legais detalhadas, retenção por entidade/replay/snapshot,
  anonimização/descarte e proteção operacional; nenhuma retenção automática criada.
- SHIP-01: zonas, tarifas, cobertura, embalagem e prazos continuam pendentes;
  CP retorna CEP/país/versão, não inventa zona ou calcula frete.
- Quotes/Orders comerciais: alistar port no mesmo transaction client/conexão e
  contexto autorizado da futura compra; persistir snapshot, pedido/reserva e
  evidência atomicamente. O callback CP local não prova integração comercial.
- Contratos HTTP de endereços e evolução QuoteResult de QTE-POL-06 ainda não aplicados.
- L1_SQL_STRICT PENDENTE; Supabase sem conexão; Stripe/40/30/5 NÃO HOMOLOGADOS;
  UXD-16 preservada, sem cadastro comercial público nem autorização de compra.

Snapshot comercial e consumidor Orders real permanecem para a integração aprovada,
com provas de rollback total e concorrência no mesmo banco. Histórico técnico
Profile é imutável; não usar commits separados para contornar essa dependência.
Os controles e testes locais não implicam conformidade LGPD integral, rollout
operacional ou homologação remota.
