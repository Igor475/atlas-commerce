# ID-01 — Arquivos alterados e justificativas

Base main/07002dd7be89ad2f0d124179fc972c1e48a02319, inicialmente limpa. Nenhum arquivo preexistente não commitado foi descartado. Este inventário inclui 70 arquivos (10 rastreados modificados; demais novos). Arquivos gerados em node_modules/dist não são versionados.

| Arquivo | Justificativa |
|---|---|
| [.github/workflows/quality.yml](../../../../.github/workflows/quality.yml) | Acréscimo do job Identity com PostgreSQL próprio e cleanup always; jobs anteriores preservados. |
| [DEVELOPMENT.md](../../../../DEVELOPMENT.md) | Comandos locais e limites de ativação/rollout. |
| [apps/api/.env.example](../../.env.example) | Placeholders/disabled por padrão, sem segredo. |
| [apps/api/compose.identity.yml](../../compose.identity.yml) | Persistência/migration/configuração descartáveis separadas do spike. |
| [apps/api/identity.prisma.config.ts](../../identity.prisma.config.ts) | Persistência/migration/configuração descartáveis separadas do spike. |
| [apps/api/package.json](../../package.json) | Geração do cliente isolado/comandos Identity e dependência direta necessária. |
| [apps/api/prisma-identity/migrations/20261013000000_identity/migration.sql](../../prisma-identity/migrations/20261013000000_identity/migration.sql) | Persistência/migration/configuração descartáveis separadas do spike. |
| [apps/api/prisma-identity/migrations/migration_lock.toml](../../prisma-identity/migrations/migration_lock.toml) | Persistência/migration/configuração descartáveis separadas do spike. |
| [apps/api/prisma-identity/schema.prisma](../../prisma-identity/schema.prisma) | Persistência/migration/configuração descartáveis separadas do spike. |
| [apps/api/scripts/identity-db.mjs](../../scripts/identity-db.mjs) | Runner protegido do banco descartável ou prova de processo novo. |
| [apps/api/scripts/identity-process.mjs](../../scripts/identity-process.mjs) | Runner protegido do banco descartável ou prova de processo novo. |
| [apps/api/src/app.module.ts](../../src/app.module.ts) | Composição Nest/bootstrap/readiness pontual para Identity, liveness independente. |
| [apps/api/src/health/health.module.ts](../../src/health/health.module.ts) | Composição Nest/bootstrap/readiness pontual para Identity, liveness independente. |
| [apps/api/src/main.ts](../../src/main.ts) | Composição Nest/bootstrap/readiness pontual para Identity, liveness independente. |
| [apps/api/src/modules/identity/application/customer-identity.ts](../../src/modules/identity/application/customer-identity.ts) | Módulo Customer: portas, casos de uso, crypto/banco ou fronteira HTTP; sem staff. |
| [apps/api/src/modules/identity/domain/identity.ts](../../src/modules/identity/domain/identity.ts) | Módulo Customer: portas, casos de uso, crypto/banco ou fronteira HTTP; sem staff. |
| [apps/api/src/modules/identity/identity-runtime.ts](../../src/modules/identity/identity-runtime.ts) | Módulo Customer: portas, casos de uso, crypto/banco ou fronteira HTTP; sem staff. |
| [apps/api/src/modules/identity/identity.module.ts](../../src/modules/identity/identity.module.ts) | Módulo Customer: portas, casos de uso, crypto/banco ou fronteira HTTP; sem staff. |
| [apps/api/src/modules/identity/infrastructure/identity-config.ts](../../src/modules/identity/infrastructure/identity-config.ts) | Módulo Customer: portas, casos de uso, crypto/banco ou fronteira HTTP; sem staff. |
| [apps/api/src/modules/identity/infrastructure/identity-crypto.ts](../../src/modules/identity/infrastructure/identity-crypto.ts) | Módulo Customer: portas, casos de uso, crypto/banco ou fronteira HTTP; sem staff. |
| [apps/api/src/modules/identity/infrastructure/identity-database.ts](../../src/modules/identity/infrastructure/identity-database.ts) | Módulo Customer: portas, casos de uso, crypto/banco ou fronteira HTTP; sem staff. |
| [apps/api/src/modules/identity/presentation/identity-http.ts](../../src/modules/identity/presentation/identity-http.ts) | Módulo Customer: portas, casos de uso, crypto/banco ou fronteira HTTP; sem staff. |
| [apps/api/src/modules/identity/presentation/identity.controller.ts](../../src/modules/identity/presentation/identity.controller.ts) | Módulo Customer: portas, casos de uso, crypto/banco ou fronteira HTTP; sem staff. |
| [apps/api/test/identity/FILES.md](FILES.md) | Relatório/matrizes e inventário revisável. |
| [apps/api/test/identity/RESULTS.md](RESULTS.md) | Relatório/matrizes e inventário revisável. |
| [apps/api/test/identity/evidence/audit-20261014T113303670Z.txt](evidence/audit-20261014T113303670Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/build-20261014T113008283Z.txt](evidence/build-20261014T113008283Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/build-20261014T113008283Z.txt.stderr](evidence/build-20261014T113008283Z.txt.stderr) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/build-20261014T113008283Z.txt.stdout](evidence/build-20261014T113008283Z.txt.stdout) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/check-20261014T113344839Z.txt](evidence/check-20261014T113344839Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/check-20261014T113344839Z.txt.stderr](evidence/check-20261014T113344839Z.txt.stderr) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/check-20261014T113344839Z.txt.stdout](evidence/check-20261014T113344839Z.txt.stdout) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/connection-20261014T113416665Z.txt](evidence/connection-20261014T113416665Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/contracts-validation.txt](evidence/contracts-validation.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/final-verifications.txt](evidence/final-verifications.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/format-20261014T113240127Z.txt](evidence/format-20261014T113240127Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/identity-20261013T192524979Z.txt](evidence/identity-20261013T192524979Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/identity-20261013T192557757Z.txt](evidence/identity-20261013T192557757Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/identity-20261013T192942239Z.txt](evidence/identity-20261013T192942239Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/identity-20261014T105709468Z.txt](evidence/identity-20261014T105709468Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/identity-20261014T110532209Z.txt](evidence/identity-20261014T110532209Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/identity-20261014T112351149Z.txt](evidence/identity-20261014T112351149Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/identity-20261014T112703111Z.txt](evidence/identity-20261014T112703111Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/identity-20261014T113628693Z.txt](evidence/identity-20261014T113628693Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/install-20261013T193153796Z.txt](evidence/install-20261013T193153796Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/install-20261014T105503598Z.txt](evidence/install-20261014T105503598Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/install-20261014T112251016Z.txt](evidence/install-20261014T112251016Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/lint-20261014T105706411Z.txt](evidence/lint-20261014T105706411Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/lint-20261014T105853918Z.txt](evidence/lint-20261014T105853918Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/lint-20261014T110523313Z.txt](evidence/lint-20261014T110523313Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/lint-20261014T112411287Z.txt](evidence/lint-20261014T112411287Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/lint-20261014T112509113Z.txt](evidence/lint-20261014T112509113Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/lint-20261014T112752850Z.txt](evidence/lint-20261014T112752850Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/lint-20261014T113733487Z.txt](evidence/lint-20261014T113733487Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/migrate-20261014T111239118Z.txt](evidence/migrate-20261014T111239118Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/migrate-20261014T112148063Z.txt](evidence/migrate-20261014T112148063Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/migrate-20261014T112313024Z.txt](evidence/migrate-20261014T112313024Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/pgsp-20261014T113158170Z.txt](evidence/pgsp-20261014T113158170Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/smoke-20261014T113723620Z.txt](evidence/smoke-20261014T113723620Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/test-20261014T112914704Z.txt](evidence/test-20261014T112914704Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/typecheck-20261014T112547186Z.txt](evidence/typecheck-20261014T112547186Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/evidence/typecheck-20261014T112836978Z.txt](evidence/typecheck-20261014T112836978Z.txt) | Evidência local, incluindo tentativas anteriores e códigos de saída; sem alegação de CI remoto. |
| [apps/api/test/identity/harness.ts](harness.ts) | Testes unitários/HTTP e PostgreSQL isolado, mailbox restrito e conexões independentes. |
| [apps/api/test/identity/identity.pg.ts](identity.pg.ts) | Testes unitários/HTTP e PostgreSQL isolado, mailbox restrito e conexões independentes. |
| [apps/api/test/identity/identity.unit.spec.ts](identity.unit.spec.ts) | Testes unitários/HTTP e PostgreSQL isolado, mailbox restrito e conexões independentes. |
| [apps/api/test/identity/vitest.config.ts](vitest.config.ts) | Testes unitários/HTTP e PostgreSQL isolado, mailbox restrito e conexões independentes. |
| [docs/05-engineering/contracts/CT-01-inventario-http.md](../../../../docs/05-engineering/contracts/CT-01-inventario-http.md) | Delta HTTP Identity proposto; checkout e normas comerciais preservados. |
| [docs/05-engineering/contracts/CT-ID-01-identity-customer.md](../../../../docs/05-engineering/contracts/CT-ID-01-identity-customer.md) | Delta HTTP Identity proposto; checkout e normas comerciais preservados. |
| [docs/05-engineering/contracts/openapi/atlas-commerce-api-v1.yaml](../../../../docs/05-engineering/contracts/openapi/atlas-commerce-api-v1.yaml) | Delta HTTP Identity proposto; checkout e normas comerciais preservados. |
| [pnpm-lock.yaml](../../../../pnpm-lock.yaml) | Três linhas no importer: runtime-utils já transitivo torna-se direto, mesma versão. |

Os arquivos de evidência não executam lógica e preservam os ensaios falhos. Ver [RESULTS](RESULTS.md) para distinguir resultados finais e bloqueios. Nenhuma mudança em apps/storefront, apps/admin, packages, spike/probes originais, FD/imagens, RN/PC/SEC/ADR/DS ou contratos comerciais.
