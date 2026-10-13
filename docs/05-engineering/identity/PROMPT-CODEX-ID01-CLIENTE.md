# ID-01: Implementar Identity Customer seguro no backend Atlas Commerce

**Papel:** Staff Backend Engineer NestJS, Arquiteto de Segurança de Aplicações e Especialista PostgreSQL/Prisma v7. **Trabalhe dentro do repositório `Igor475/atlas-commerce` existente; não crie um projeto novo.** Implementar somente a primeira fatia de autenticação de **clientes** com testes locais/CI em PostgreSQL descartável. **Não é um pedido de implementação do frontend**.

## 0. Pré-condições e ordem

1. Esta tarefa ocorre **somente depois** de executar/revisar/publicar a ratificação UXD-16 no prompt `docs/05-engineering/contracts/PROMPT-CODEX-UXD16-RATIFICAR.md`, preservando a distinção entre decisão de contrato e Stripe não homologado.
2. Executar `git status`, `git log -4`, conferir branch e HEAD. A base documental foi conferida no commit `0ec704221882f9eb4719e0b6032a658bea65e493` em 13/10/2026; se houver commits novos, partir da versão atual sem sobrescrever nada.
3. Ler `AGENTS.md` e skills aplicáveis, se existirem no workspace, e **todos** os documentos indicados em `docs/05-engineering/identity/README.md`, especialmente ADR-003, AUTH-001–020, CT-01/03/04/06/08, matrizes SEC/SA/DS-003, F04-06 e documentação do Prisma F04-04/F04-05.
4. Identificar incompatibilidades reais, contratos incompletos e decisões abertas. Apresentar rapidamente uma lista de bloqueios antes de implementar. **Se uma incompatibilidade impede executar o escopo sem reduzir segurança, PARAR e solicitar aprovação, sem assumir política por conta própria.**
5. Não iniciar outra fase, não criar branches/commits/push/deploy sem pedido.

## 1. Objetivo verificável

Entregar módulo `identity` funcional e isolado em `apps/api`, com persistência real em **PostgreSQL efêmero** e testes de autenticação de clientes: cadastro pendente, verificação por token, login de cliente ativo, sessão opaca revogável, `/me`, logout/logout global, recovery por token de uso único, proteção de Origin/CSRF/rate limit, evidência de testes positivos e negativos. O backend deve **negar todas as capacidades de staff** nesta fase.

Não confundir essa primeira fatia com toda a autenticação/segurança do produto: WebAuthn/TOTP, step-up, RBAC completo, bootstrap do primeiro funcionário, e-mail transacional de demonstração e hospedagem real continuam dependendo de decisões e testes posteriores.

## 2. Escopo de arquivos e alterações

**Permitidos, na menor superfície necessária:** `apps/api/src/modules/identity/**` (domain/application/infrastructure/presentation por necessidade real, sem diretórios vazios), módulos/composição `apps/api/src/app.module.ts`, hooks e config em `apps/api/src/` pontuais, `apps/api/test/identity/**`, migrations/config **novos e isolados para Identity**, scripts `apps/api/scripts/identity-*` somente se necessários, `apps/api/package.json`, lockfile se houver dependências justificadas, `.env.example` com **placeholders nunca secrets**, `packages/contracts` se o shape neutro exigir, `docs/05-engineering/contracts/CT-01`, OpenAPI e CT suplementares apenas no delta Identity descrito, `.github/workflows/quality.yml` para job de teste isolado, e `DEVELOPMENT.md` para comandos de uso local.

**Proibidos sem aprovação expressa:** qualquer arquivo sob `apps/storefront/**`, `apps/admin/**`, FD-01/02/03/04/05, assets e screenshots; `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts` e migration **do spike** F04-04 se um novo schema separado resolver a necessidade; modificações em `probe-*` F04-05 ou `spike-*` sem motivo comprovado; RN/PC/SEC/ADR/DS, outros CTs comerciais; Stripe, R2, Supabase remoto, Render/Vercel dashboard, Docker do usuário fora do projeto, `.env` real ou serviços pagos. Em caso de conflito real com arquivos protegidos, documentar diff proposto e pedir permissão antes de aplicar.

Se for necessário adicionar contrato HTTP Identity antes de controller, adicionar com semântica explicitamente **PROPOSTA/ID-01** e anotação das decisões não homologadas. Não alterar a forma final do checkout Stripe nem definir seu `ui_mode`.

## 3. Fronteiras arquiteturais

- Monólito modular NestJS já criado: domínio puro não importa Nest, Prisma, HTTP ou provedor de e-mail; application usa ports; infrastructure implementa banco, crypto, mail e auditoria; presentation valida requests e chama casos de uso. Evitar imports cíclicos e `CommonService` de identidade gigante.
- Prisma v7 com adapter PostgreSQL/`pg` pool limitado, client singleton/lazy e shutdown. Migrations explícitas e reprodutíveis. Não usar `prisma db push` em banco compartilhado nem alterar a fixture `spike` para camuflar schema produtivo. Testes com DB real isolado e cleanup automático restrito ao projeto criado pela suíte.
- Horário de expiração decidido no backend/DB; consultas/transações com binding seguro; não intercalar chamada HTTP/e-mail externo dentro de transação com lock.
- `packages/contracts` livre de Prisma, Nest, dados secretos, domínio de autorização e estado interno de sessão.

## 4. Modelo persistido (mínimos)

Implemente conta de cliente com estados `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `DISABLED`; senha Argon2id parametrizada; sessão com ID aleatório >=256 bits e **apenas hash/HMAC persistido**, classe fixa `CUSTOMER`, expiração absoluta/inatividade e revogação; token de verificação e recuperação forte/finalidade/TTL/single-use; intenção durável e idempotente de e-mail (outbox), trilha de segurança minimizada e contador antiabuso que tolere reinício da Render Free.

Migrations novas precisam de índices, constraints, FK, unicidade de e-mail coerente, queries delimitadas e prova de consumo único de tokens sob **duas conexões reais**. Não criar permissões STAFF, `admin=true`, contas administrativas seed automáticas ou qualquer tabela financeiro/Stripe como efeito colateral.

## 5. Rotas e contratos candidatos

Antes do código, confronte `docs/05-engineering/identity/ID-01-escopo-e-contratos.md` com CT-01/OpenAPI atuais. Implementar apenas as rotas de cliente realmente autorizadas dentro deste escopo:

- `GET /api/v1/auth/csrf`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/verify-email/resend`
- `POST /api/v1/auth/login` para **CUSTOMER apenas**; fluxo STAFF não implementado e deve ser negado com erro explícito adequado ao contrato; não aceitar `context: STAFF` como cliente
- `GET /api/v1/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `POST /api/v1/auth/recovery/request`
- `POST /api/v1/auth/recovery/complete`

Para cada rota: request/response OpenAPI 3.1, validação de campos, HTTP status, autenticação necessária, Origin+CSRF, rate limit, payload máximo, política de cache, error RFC 9457 e cenários positivos/negativos. Contratos incompatíveis devem ser revisados **somente na superfície Identity**, sem inventar endpoints de perfil/endereços/financeiro/Stripe. Se não houver comprovação de proteção segura de uma rota, deixá-la **indisponível e declarar BLOCKED**, não expor handler permissivo.

## 6. Cadastro e e-mail

- Cadastro cria `PENDING_VERIFICATION` com senha Argon2id, não concede sessão de compra antes da verificação.
- Verificação e reenvio usam token de alta entropia, hashed no DB, purpose-bound, expiração e revogação/consumo atômicos. Reuso e concorrência negados.
- Não revelar existência de e-mail em cadastro/recovery/reenvio. Respostas públicas neutras, delays/jitter razoáveis e defesa de abuso com testes; nenhum status que permita enumeração óbvia.
- Não há provedor de e-mail aprovado para esta entrega. Adapters de e-mail falsos só em testes **com acesso restrito ao processo de teste**. O ambiente público não pode afirmar `e-mail enviado` sem delivery real; desabilitar fluxo público ou fail-fast quando transporte real obrigatório estiver ausente. Não imprimir tokens e não expor rota de consulta de outbox.
- Não abrir SMTP a partir de Render Free nem criar credenciais de provedor por conta própria. Integrar API HTTPS transacional somente após autorização separada.

## 7. Sessões, login, cookies e origem

- Para cliente ativo, comparar senha de forma segura e emitir sessão opaca de nova identidade após autenticação; token exclusivamente em `Set-Cookie`. DB guarda hash e metadados mínimos. `/me` devolve apenas dados autorizados e `sessionClass: CUSTOMER`; `no-store` em todos recursos privados.
- Logout faz revogação persistida, e logout-all invalida outras sessões. Um cookie copiado/reutilizado após revogação não autentica. Mudança de senha revoga as sessões conforme política e prova negativa.
- Avaliar valores da baseline: cliente **12h absoluta/30min idle** de forma configurável, validada no servidor e testada. Se houver conflito documental sobre o status desses valores, isolar com configuração demonstrativa segura e registrar pendência antes de publicar host real.
- Cookie de produção deve ser **host-only**, `Secure`, `HttpOnly`, `Path=/`, sem `Domain`, prefixo `__Host-`, SameSite conforme topologia validada. Existe divergência nominal entre ADR-003 e OpenAPI: não emitir ambos. Escolher/registrar um contrato consistente para uso local/proposto e deixar configuração de host real fechada até ensaio Vercel↔Render.
- A topologia same-origin proxy prevista exige validação de `Origin`, `Referer`, trusted proxy restrito, cookies e cache cross-user. localhost não prova esses requisitos para `*.vercel.app`/`*.onrender.com`.

## 8. CSRF, senha, limites e erros

- Proteger mutações de cookies e **login/register/recovery** contra CSRF/origin spoofing, antes e depois de sessão; estratégia bootstrap pré-auth com vínculo seguro (token synchronizer ou double-submit **assinado e vinculado ao contexto**). Não confiar só em SameSite/CORS. JSON-only nos endpoints cabíveis, reject body/headers anômalos.
- Senha Argon2id parametrizada com custo medido e caminho de upgrade. Não empregar SHA256/pbkdf baixo para senha, base64 e nenhum plaintext em auditoria. Senha/PII nunca entram em trace ou erro.
- Rate limit persistente/compartilhado entre instâncias por origem/identidade, com limites testados, retenção curta e sem dependência exclusiva de in-memory; checar tratamento de IPv4/proxy em produção. Respostas seguras com `Retry-After` quando aplicável.
- RFC 9457 `application/problem+json`, `requestId` confiável, códigos do CT-03; sem stack/SQL/segredos, e-mail completo, tokens, links de recovery ou URLs de DB. Validar comprimento/cardinalidade de entradas, extra props e conteúdos potencialmente maliciosos.

## 9. Staff e autorização: BLOQUEIO OBRIGATÓRIO

**Não implementar autenticação administrativa degradada.** Uma senha staff correta sem segundo fator **jamais** cria sessão privilegiada. Neste ID-01: login STAFF, cadastro admin, WebAuthn/TOTP real, MFA recovery, concessão/alteração de roles e permissões, aprovação/refund, `isAdmin`, bypass de step-up, seed SUPERADMIN e endpoints de gestão staff continuam **fora do escopo, negar por padrão**.

Manter contrato/requisitos de ADR-003, DS-003 e AUTH-004–009 visíveis como pendências. A etapa Identity Staff futura exige decisões específicas sobre WebAuthn RP ID/origins, TOTP fallback, onboarding do primeiro admin, recuperação forte e alçadas, jamais e-mail simples como segundo fator automático.

## 10. Testes obrigatórios e CI

Desenhe casos antes de codificar com base em `ID-03-matriz-de-testes.md` (ID-001–036), AUTH-001–020 e SEC-001–011, 014/015/028–030/038. Execute unit, integração HTTP e PostgreSQL descartável. Os casos concorrentes **precisam de conexões independentes** e invariantes no DB, não só mocks nem transações sequenciais.

Testar especialmente: token one-time concorrente; registro duplicado; recuperação concorrente e revogação de duas sessões; fixação de sessão; CSRF ausente/Origin malicioso; cookies host-only e no-store; diferenças entre loja/admin; senhas erradas e conta suspensa sem enumeração; limites de abuso após restart; desconexão DB; não vazar PII/segredo; falha de e-mail sem falsa entrega.

Preservar CI atual `checks` e `postgres-integration`, PGSP 16/16, toolchain fixada, 9/9 probes locais conforme evidência já existente. Acrescentar etapa de testes Identity num PostgreSQL efêmero de namespace diferente, com permissões de GitHub Actions mínimas, actions pinadas e cleanup `always()`. Sem acessar Supabase, Stripe, Render, Vercel ou R2. Se Docker estiver indisponível localmente, marcar os testes que não ocorreram como **BLOCKED**, não como aprovados.

Executar e relatar **códigos de saída e evidências reais**: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check`, `pnpm smoke`, `pnpm audit`, jobs PG e Identity aplicáveis, `git diff --check`, inspeção de dependências e secrets. Tratar Windows CRLF/Next build como problema separado, sem refatorar frontend nesta tarefa.

## 11. Guardas de rollout e ambientes

- Nenhum `.env` real deve ser lido, copiado ou exposto no relatório. `.env.example` somente placeholders e documentação de uso.
- Não adicionar credencial do projeto Supabase Free, executar migrations remotas, ativar Data API, nem abrir endpoints de Internet. F04-05 L1 continua pendente.
- Em demo público, cadastro/login/recovery devem ficar indisponíveis até validação do esquema, TLS/origins/cookies, serviço de e-mail, rate limit, domínio, proteção de abuso, backups/restore e hardening; `readiness` deve ser honesto. `GET /health/live` deve continuar independente do banco.
- Não criar componentes visuais Next.js nesta fase. FD-05 Coleção Viva será desenhada/revista em paralelo; não inventar templates e login/dashboard genéricos.

## 12. Relatório final obrigatório

Entregar: (1) HEAD/status; (2) diagnóstico e conflitos; (3) lista completa de arquivos alterados + justificativa, migrations e contratos; (4) endpoints funcionais/explicitamente desabilitados; (5) arquitetura de sessões/cookies/CSRF/Argon2id e política antiabuso; (6) matrizes ID/AUTH com PASS/FAIL/BLOCKED/N/A, comandos, ambiente, SHA e evidências; (7) PGSP anteriores e status CI local/remoto separados; (8) riscos residuais e pendências por decisão; (9) diff/`git diff --check`; (10) confirmação de **nenhum commit/push/deploy**.

**Critério de aceite ID-01:** clientes autenticados em ambiente local isolado, tokens one-time e sessões revogáveis com evidência real, nenhum staff privilegiado habilitado, sem segredo em logs, CI com PostgreSQL real aprovado, ausência de alterações indevidas. Caso algum gate crítico falhe, não classificar como concluído nem degradar o controle para fazê-lo passar.
