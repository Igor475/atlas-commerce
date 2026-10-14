# ID-01 — Evidências e limites de entrega

Estado em 14/10/2026: **implementação local validada; aceite global/CI BLOQUEADO**. Não aprovar rollout. Base limpa na branch main, HEAD 07002dd7be89ad2f0d124179fc972c1e48a02319, preservado ao fim; mudanças desta tarefa não commitadas. A ratificação UXD-16 já existia nesse HEAD e foi conferida no main publicado antes da implementação. Não há alegação de que este delta tenha sido publicado.

Aplicada a skill engenharia-software-pragmatica conforme AGENTS. Sem trabalho de frontend. [Inventário completo e justificativas](FILES.md), [contrato Identity proposto](../../../../docs/05-engineering/contracts/CT-ID-01-identity-customer.md), [matriz de origem ID](../../../../docs/05-engineering/identity/ID-03-matriz-de-testes.md), [matriz AUTH](../../../../docs/04-architecture/09-cenarios-aceite-autenticacao.md).

## Diagnóstico, decisões e fechamento público

O HEAD continha planos Identity, mas não controllers, persistência ou transporte implementados. Divergências de cookie, TTL e topologia foram isoladas como contrato PROPOSTA/ID-01 local: 12h absoluta/30min idle máximos, verificação 30min, reset 15min. Isso não ratifica o host real ou normas futuras.

Não há transporte de e-mail aprovado. A composição normal não injeta mailbox e mantém os dez handlers indisponíveis com 503. O perfil disabled é padrão; local-disposable exige opt-in, segredo efêmero e loopback; produção recusa ativação. O mailbox existe somente no harness Vitest, com guard NODE_ENV=test/VITEST=true; não há endpoint de outbox. Logo, funcionalidade local nesta entrega significa **HTTP real em testes com PostgreSQL real e entrega de e-mail capturada no processo de teste**, não um serviço público utilizável nem e-mail transacional entregue.

Bloqueios globais encontrados: pnpm audit retorna 1 com 2 high/1 moderate; build e check retornam 124 no limite de 180s, em Next.js/Turbopack no Windows; format:check retorna 1 em 32 arquivos preexistentes. Nenhum gate foi enfraquecido. Não se atualizaram versões nem se normalizaram frontends/arquivos protegidos para ocultar falhas. O CI remoto deste delta não foi executado: **ID-035 BLOCKED_UNPUBLISHED**.

## Implementação e fronteiras

Domínio/application puros usam ports para crypto, banco e mail. O adapter PostgreSQL usa Prisma v7, pg pool máximo 2 e shutdown; cliente lazy, schema identity, banco atlas_identity_id01 e porta 55436 exclusivos. Nenhum db push/startup migration. [Schema](../../prisma-identity/schema.prisma) e [migration explícita](../../prisma-identity/migrations/20261013000000_identity/migration.sql) criam somente sete tabelas Identity; índices, FKs, CHECKs, unicidade de e-mail, classe CUSTOMER fixa e um token ativo por conta/finalidade. Migrator separado da role runtime sem superuser/CREATE/TEMP/membership ou acesso à tabela de migrations.

Migrador e transações verificam identidade fixa do banco/role e a configuração atlas.identity_fixture=atlas-id01-disposable antes de operar. O teste negativo do migrador sem essa marca retornou 1 e não executou DDL; após recriar apenas a própria fixture, duas reaplicações retornaram 0/idempotentes. Não se leu .env real; .env.example contém placeholders. Nenhuma conexão Supabase/Stripe/R2/Render/Vercel.

Sessões e tokens têm 256 bits aleatórios e apenas HMAC persistido, separados por finalidade. Senha Argon2id nativo, salt aleatório, PHC, custo parametrizado com upgrade sem redução; cinco amostras locais 37–42 ms (19MiB/2/1). Senhas NFC 15–128 caracteres, sem composição/truncamento; blocklist local mínima **não equivale** a uma lista completa de credenciais comprometidas. Essa lacuna bloqueia público.

Locks de conta, versão de credencial, consumo condicional e horário do DB protegem verificação, recovery e sessões. Concorrência foi comprovada observando dois application_name independentes bloqueados na mesma conta antes de liberar o lock; resultado único 204 e replay 400. Recovery revoga ambas sessões anteriores; logout/all persistem revogação. Contadores de abuso são persistentes/atômicos, com limites por IP e identidade e prova num processo Node novo, sem depender de memória.

Outbox AES-256-GCM, UNIQUE token_id, envio fora da transação, SKIP LOCKED, lease, limite dez tentativas e ack condicionado ao número da tentativa. Worker obsoleto não confirma trabalho novo. Há retry e idempotencyKey estável; **não se comprova exactly-once de provedor inexistente**. Auditoria minimizada registra sucessos e falhas de login/verificação/recovery, IDs internos/requestId, sem senha/token/email. Retenção demonstrativa curta com limpeza em lotes: eventos 24h, outbox até TTL/48h, janelas expiradas; retenção pública/LGPD permanece pendente.

HTTP exige Origin exata, Referer coerente se presente, JSON até 4KiB, campos estritos, cookies/headers duplicados negados e nenhum proxy confiável. Forwarded/X-Forwarded recusados. CSRF assinado com nonce/TTL, origem e hash da sessão; novo bootstrap após login. Atraso 120–135ms antecede a resposta de register/resend/recovery/login; o teste mede o piso no HTTP, **não certifica indistinguibilidade estatística ou tempo constante**. RFC9457/requestId gerado, no-store; erros sem stack/SQL/PII. Cookie HTTP local atlas_identity_local HttpOnly/SameSite=Strict/host-only; __Host-atlas_session Secure é contrato candidato testado por atributos, sem browser HTTPS/topologia pública comprovados.

## Rotas

Todos os caminhos abaixo começam com /api/v1. Funcionais no harness local; composição normal sem mail: 503.

| Método/rota                    | Resultado local                                                   |
| ------------------------------ | ----------------------------------------------------------------- |
| GET /auth/csrf                 | 200 token CSRF e contexto assinado                                |
| POST /auth/register            | 202 neutro; PENDING_VERIFICATION; sem sessão                      |
| POST /auth/verify-email        | 204 único; inválido/replay 400                                    |
| POST /auth/verify-email/resend | 202 neutro; coalescência/rotação                                  |
| POST /auth/login               | 200 CUSTOMER ativo, sessão só Set-Cookie; 401 genérico; STAFF 403 |
| GET /me                        | 200 id/email próprios/sessionClass CUSTOMER; inválido 401         |
| POST /auth/logout              | 204 revogação persistente idempotente                             |
| POST /auth/logout-all          | 204, requer sessão válida e revoga outras                         |
| POST /auth/recovery/request    | 202 neutro                                                        |
| POST /auth/recovery/complete   | 204 único; troca Argon2id e revoga todas                          |

STAFF/MFA/WebAuthn/TOTP/RBAC/step-up/bootstrap admin e rotas comerciais não foram implementados. Contexto STAFF não cria desafio ou sessão degradada; recebe 403. Nenhum grant/seed administrativo. O antigo contrato futuro MFA continua identificado como bloqueado.

## Comandos e resultados reais

Windows/PowerShell, Node **24.21.0** executado pelo runtime local previamente fixado, pnpm **12.11.2**, Prisma/adapter **7.10.0**, Nest **12.1.3**, PostgreSQL **17.10** em Docker, pool 2. Node global 22 não foi usado. SHA é a base acima + working tree desta tarefa, não um commit de implementação.

| Comando                                                     | Código/resultado                                                                       | Evidência                                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| pnpm install --frozen-lockfile                              | 0; 566 entradas verificadas, sem resolução nova                                        | [log](evidence/install-20261014T112251016Z.txt)                                                           |
| pnpm lint                                                   | 0 final                                                                                | [log](evidence/lint-20261014T113733487Z.txt)                                                              |
| pnpm typecheck                                              | 0; também passou na execução check após ajuste outbox                                  | [log](evidence/typecheck-20261014T112836978Z.txt), [check](evidence/check-20261014T113344839Z.txt)        |
| pnpm test                                                   | 0; API 29 + 1 admin + 1 storefront + 1 contracts                                       | [log](evidence/test-20261014T112914704Z.txt), [repetição check](evidence/check-20261014T113344839Z.txt)   |
| pnpm build                                                  | 124 timeout 180s Next/Windows; API e contracts build concluídos                        | [log](evidence/build-20261014T113008283Z.txt)                                                             |
| pnpm check                                                  | 124 timeout 180s no build após lint/typecheck/test; não chegou ao smoke/format         | [log](evidence/check-20261014T113344839Z.txt)                                                             |
| pnpm smoke                                                  | 0; live 200, ready 503 DEPENDENCIES_NOT_CONFIGURED                                     | [log](evidence/smoke-20261014T113723620Z.txt)                                                             |
| pnpm format:check                                           | 1; 32 arquivos preexistentes/CRLF; arquivos alterados passaram na checagem direcionada | [log](evidence/format-20261014T113240127Z.txt), [direcionado](evidence/final-verifications.txt)           |
| pnpm audit                                                  | 1; 2 high + 1 moderate                                                                 | [log](evidence/audit-20261014T113303670Z.txt)                                                             |
| pnpm --filter @atlas/api identity:migrate (duas vezes)      | 0 / 0; idempotentes                                                                    | [primeira](evidence/migrate-20261014T112148063Z.txt), [segunda](evidence/migrate-20261014T112313024Z.txt) |
| pnpm --filter @atlas/api identity:migrate sem marca fixture | 1 esperado; guard antes do DDL                                                         | [negativo](evidence/migrate-20261014T111239118Z.txt)                                                      |
| pnpm --filter @atlas/api identity:test                      | 0; **22/22** HTTP/PostgreSQL                                                           | [log final](evidence/identity-20261014T113628693Z.txt)                                                    |
| pnpm --filter @atlas/api spike:test                         | 0; **16/16 PGSP** preservados                                                          | [log](evidence/pgsp-20261014T113158170Z.txt)                                                              |
| pnpm --filter @atlas/api connection:test                    | 0; **9/9 probes L0** preservados                                                       | [log](evidence/connection-20261014T113416665Z.txt)                                                        |
| YAML, refs internos, Ajv disponível                         | 182 refs resolvidos, 10 schemas compilados, 15 instâncias positivas/negativas          | [log](evidence/contracts-validation.txt)                                                                  |
| git diff --check; cleanup                                   | 0; nenhum container dos três projetos de teste permaneceu                              | [log](evidence/final-verifications.txt)                                                                   |
| GitHub Actions do delta                                     | **BLOCKED**, não publicado/executado                                                   | job adicionado, sem run ID nem conclusão remota                                                           |

Há logs de tentativas anteriores falhas em evidence: erros do runner/sandbox, lint/typecheck e harness corrigidos; não são apresentados como PASS. O resultado final Identity substitui os ensaios 19/21, 20/21 e 21/21. Os logs stdout/stderr dos comandos limitados preservam a saída; o wrapper registra 124 para timeout. Nenhum resultado remoto foi inferido de execução local.

Auditoria: GHSA-ggr8-5vv4-36mx (deepmerge-ts), GHSA-3f6p-5ww8-9rcr e GHSA-rgwj-5xj2-c3m3 (mysql2), caminhos transitivos Prisma já presentes no lockfile-base. Não se avaliou explorabilidade integral, nem se considera isso inocente só por ser transitivo; atualização/mitigação exige revisão separada. O delta de lockfile adiciona **três linhas** no importer para @prisma/client-runtime-utils 7.10.0, antes já transitiva; nenhum pacote/versão de resolução foi atualizado.

## Matriz ID-001–036

PASS abaixo é estritamente prova local descrita; BLOCKED não é convertido em PASS por um teste de string/negação. Referências de implementação: [unit](identity.unit.spec.ts), [PG/HTTP](identity.pg.ts), [harness](harness.ts), [processo novo](../../scripts/identity-process.mjs). Cada título de teste identifica seus IDs; 22 testes agrupam vários casos.

| ID     | Estado  | Prova / limite                                                                                                                 |
| ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ID-001 | PASS    | default HTTP 503 auth, live 200; smoke pronto não configurado; unit e build API                                                |
| ID-002 | PASS    | migration aplicada, duas reaplicações e registro DB; role runtime mínima                                                       |
| ID-003 | PASS    | schema spike ausente no DB Identity, arquivos spike intactos, PGSP 16/16                                                       |
| ID-004 | PASS    | HTTP 202 + status PENDING persistido, sem sessão                                                                               |
| ID-005 | PASS    | registro concorrente único/202 neutro; recovery/resend neutros                                                                 |
| ID-006 | PASS    | Argon2id/intent cifrada/HTTP sem tokens; limitado às fixtures e canais inspecionados                                           |
| ID-007 | PASS    | salt único, senha correta/incorreta, dummy, upgrade sem downgrade e medição                                                    |
| ID-008 | PASS    | ativação HTTP por token válido                                                                                                 |
| ID-009 | PASS    | dois lock waiters independentes; único 204, outro 400 e replay negado                                                          |
| ID-010 | PASS    | propósito errado, inválido/vencido/usado e rotação de resend invalidam token                                                   |
| ID-011 | PASS    | pendente/suspensa/desativada/credencial incorreta negam sessão                                                                 |
| ID-012 | BLOCKED | cookie HTTP local passa; contrato Secure verificado por atributos; browser TLS/host real pendente                              |
| ID-013 | PASS    | identificador pós-login novo e apenas hash DB; anterior negado                                                                 |
| ID-014 | PASS    | reutilização de sessão revogada/expirada negada no DB                                                                          |
| ID-015 | PASS    | timestamps DB expirados absoluta/idle; cliente não prolonga absoluta                                                           |
| ID-016 | PASS    | logout DB, antigo cookie 401                                                                                                   |
| ID-017 | PASS    | duas sessões deixam de autenticar após logout-all                                                                              |
| ID-018 | PASS    | classe CUSTOMER apenas; admin negado; contexto STAFF 403                                                                       |
| ID-019 | PASS    | login STAFF sempre negado; não é prova de MFA implementado                                                                     |
| ID-020 | PASS    | ausência/erro Origin, CSRF e content-type; JSON malformado/oversize                                                            |
| ID-021 | PASS    | CSRF pré-login deixa de validar depois da rotação; novo bootstrap                                                              |
| ID-022 | PASS    | recovery existente/inexistente 202 igual, piso HTTP; limites persistentes ID-026                                               |
| ID-023 | PASS    | reset altera hash/versão e revoga ambas sessões, login novo                                                                    |
| ID-024 | PASS    | duas conexões sob lock; um consumo, replay negado                                                                              |
| ID-025 | PASS    | CUSTOMER fixo; reset não concede staff; MFA de staff inexistente/fora escopo                                                   |
| ID-026 | PASS    | concorrência 12 chamadas/5 permitidas; cliente frio e processo Node novo continuam limitados                                   |
| ID-027 | BLOCKED | forwarding/admin Origin/headers forjados negados localmente; topologia pública/proxy aceito pendente                           |
| ID-028 | PASS    | /me próprios mínimos/no-store, outro cookie inválido não acessa                                                                |
| ID-029 | PASS    | campos role/status/isAdmin extras e payload >4KiB/JSON malformado negados                                                      |
| ID-030 | PASS    | RFC9457 minimizado, UUID confiável; sem segredos nos canais locais testados                                                    |
| ID-031 | BLOCKED | perda real de LOGIN DB + pools fechados => auth/ready 503, live 200, recuperação passa; restart completo Identity não ensaiado |
| ID-032 | PASS    | falha mailbox persiste retry; sem mail runtime indisponível e ready false                                                      |
| ID-033 | PASS    | retry/coalescência/rotação e fencing por attempts; sem ativação falsa                                                          |
| ID-034 | BLOCKED | comandos executados; build/check timeout, format/audit falham; sem contorno                                                    |
| ID-035 | BLOCKED | job CI isolado/always() preparado; remoto ainda não publicado/executado                                                        |
| ID-036 | PASS    | HTTP loopback real cookie/classe/cache/CSRF; proxy/TLS real explicitamente pendentes                                           |

## Matriz AUTH-001–020

| ID       | Estado  | Evidência / limite                                                                              |
| -------- | ------- | ----------------------------------------------------------------------------------------------- |
| AUTH-001 | BLOCKED | login/sessão/HMAC passam localmente; cookie protegido HTTPS do host real pendente (ID-012)      |
| AUTH-002 | PASS    | ID-011, erros genéricos e atraso antes da resposta; sem certificação estatística                |
| AUTH-003 | PASS    | ID-022/026, 429/Retry-After e persistência pós-processo; capacidade pública pendente            |
| AUTH-004 | BLOCKED | STAFF 403; nenhum desafio MFA degradado; fluxo operador futuro                                  |
| AUTH-005 | BLOCKED | MFA válido/replay/expiração não implementados                                                   |
| AUTH-006 | BLOCKED | RP ID/origins/UV WebAuthn não implementados                                                     |
| AUTH-007 | PASS    | ID-023/024, consumo único sob duas conexões                                                     |
| AUTH-008 | BLOCKED | recovery operador/MFA fora do escopo; nenhum privilégio habilitado                              |
| AUTH-009 | BLOCKED | recuperação forte de fator de staff pendente                                                    |
| AUTH-010 | PASS    | ID-014/016, cookie revogado não autentica                                                       |
| AUTH-011 | PASS    | ID-017, duas sessões invalidadas                                                                |
| AUTH-012 | PASS    | ID-015, DB decide absoluta/idle                                                                 |
| AUTH-013 | PASS    | ID-013, rotação e CSRF anterior inválido                                                        |
| AUTH-014 | PASS    | ID-020/021, nega mutações inseguras e aceita legítimas no harness                               |
| AUTH-015 | BLOCKED | admin negado/host-only local passam; isolamento browser/subdomínios reais pendente              |
| AUTH-016 | N/A     | pedidos/mídia/entitlement não implementados por ID-01, não homologados                          |
| AUTH-017 | N/A     | financeiro/refund/segregação não implementados por ID-01                                        |
| AUTH-018 | BLOCKED | staff/step-up indisponíveis; ausência de privilégios não prova fluxo completo                   |
| AUTH-019 | BLOCKED | revogação por senha Customer passa ID-023; roles/MFA não implementados                          |
| AUTH-020 | BLOCKED | respostas/health/no-store/segredos locais verificados; SSR/cache cross-user público fora escopo |

SEC/SA/DS permanecem normativos e intactos. Evidências locais relacionadas: SEC-001/006/007/008/009/011 via ID-007–026; SEC-014/015/030/038 via limites, minimização/health/erros; SEC-002/028 via /me próprio somente. SEC-003/004/005 e DS-003: negação Customer/STAFF, sem alegação de RBAC/MFA/segregação completos. SEC-010/029, fronteiras comerciais e controles operacionais permanecem dependentes do escopo futuro; nenhuma norma foi reescrita.

## Integridade, CI e pendências

O workflow mantém integralmente os jobs checks/postgres-integration, permissões contents:read, actions por SHA, Node 24.21.0, Corepack/pnpm fixado, frozen-lockfile. Apenas identity-integration foi acrescentado com namespace/porta/schema distintos e cleanup always(). Não é CI aprovado sem execução remota desse working tree.

OpenAPI 3.1 parseado; 182 refs internos resolvidos; 10 schemas Identity compilados com Ajv/ajv-formats já disponíveis e 15 instâncias positivas/negativas. STAFF no request é documentado para 403, não um fluxo autorizado. Os 12 paths fora de Identity, schemas comerciais, CheckoutResult required/nullable e ratificação UXD-16 permanecem iguais ao HEAD em comparação estrutural. Apenas Me/LoginRequest/LoginResult e componentes novos são deltas de schemas.

Bloqueios de aceite: audit transitivo; build/check Next Windows e EOL global; run Linux/GitHub Actions após publicação autorizada. Pendências de rollout: serviço real de e-mail, host/TLS/origins/proxy/cookies/cache cross-user e proteção contra abuso em Internet, lista completa de credenciais comprometidas, retenção legal, backup/restore; Identity Staff/MFA/RBAC/DS-003; Supabase L1. Stripe Embedded Checkout Test Mode, compatibilidade temporal/SDK e prova 40/30/5 **não homologados**, sem mudanças.

Projetos Docker próprios Identity e PGSP foram removidos com seus volumes; runner de probes limpou seu projeto; confirmação por labels não encontrou containers restantes. Nenhum Docker externo foi alterado. Nenhum .env real lido, segredo/provedor configurado, branch/commit/push/deploy executado. **Parar sem publicar nem declarar ID-01 concluído.**
