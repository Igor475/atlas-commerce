# CT-ID-01 — Delta proposto para Identity Customer local/CI

Estado: PROPOSTA / ID-01; somente clientes, não homologação pública nem mudança de ADR/RN/SEC. UXD-16 ratificada permanece intacta. Contrato registrado antes dos controllers.

## Escopo e decisões demonstrativas

Somente PostgreSQL descartável identity (banco atlas_identity_id01, porta loopback 55436), schema/migrations/client separados de spike. Migração usa identidade DDL distinta da runtime sem superuser/CREATE/TEMP. API não migra no startup. Modo disabled é padrão; demo/production e destinos remotos recusam ativação. Transporte de e-mail fake só é injetável pelo processo Vitest; sem transporte real autorizado, fluxos ficam 503 DEPENDENCY_UNAVAILABLE, nunca dizem e-mail enviado. Não existe endpoint de outbox.

Cookie escolhido no contrato proposto: __Host-atlas_session, Secure/HttpOnly/Path=/, sem Domain, SameSite=Strict. Teste HTTP local isolado pode usar atlas_identity_local sem Secure, exclusivamente loopback; isto não comprova browser HTTPS nem permite deploy. Nunca emitir os dois cookies de sessão simultaneamente. Origin explícito e exatamente configurado em todas as rotas locais, Referer coerente quando presente, sem trust proxy; Forwarded/X-Forwarded-* recusados. Hosts reais Vercel/Render continuam bloqueados.

CSRF pré-auth: cookie HttpOnly com nonce aleatório e assinatura/TTL, token derivado por HMAC de nonce+origem+hash da sessão (ou contexto anônimo). Rotação do login invalida CSRF anterior; obter novo bootstrap. SameSite/CORS não substituem validação. Mutações JSON-only, limite 4 KiB, campos desconhecidos recusados. Sem tokens em query/JSON de login, logs ou erros; GET csrf é a única resposta com token CSRF, nunca sessão ou recovery.

Parâmetros locais configuráveis e limitados: sessão 12h absoluta/30min idle; verificação 30min e recovery 15min, single-use; limites persistentes inicialmente 60 requests/5min por IP e 10/15min por identidade/operação, reenvio coalescido por 60s. Retenção local curta: janelas de abuso expiradas eliminadas em lotes; eventos 24h, outbox 48h ou até expiração. Isso não ratifica retenção pública/LGPD.

Senha demonstrativa: 15–128 caracteres Unicode após NFC, até 1024 bytes, sem composição/truncamento, aceita espaços; lista local mínima de senhas comuns/contextuais, sem consulta externa de senha. A lista não constitui cobertura completa de credenciais comprometidas e requer decisão antes do público. E-mail ASCII até 254, trim/lowercase consistente, UNIQUE persistido. Argon2id nativo do Node 24.21.0 (sem dependência nova), salt aleatório 16 bytes, 19 MiB/2 passes/1 lane, hash de 32 bytes e rehash versionado. Custo será medido. Nenhum custo de senha baixo substitui Argon2id.

## HTTP proposto / ID-01

Todas as rotas: no-store, Origin validado, limites persistentes, erros application/problem+json (RFC 9457), requestId aleatório do servidor. Falha DB nunca autentica. Desconexão não produz sucesso falso.

| Método/rota /api/v1 | Entrada | Resultado | Autenticação/CSRF |
|---|---|---|---|
| GET /auth/csrf | sem body | 200 csrfToken, cookie de contexto | pré-auth ou cliente; Origin; rate limit |
| POST /auth/register | email, password | 202 {state: ACCEPTED}, neutro mesmo se duplicado | pré-auth CSRF; cria somente PENDING_VERIFICATION |
| POST /auth/verify-email | token | 204, ou 400 INVALID_REQUEST sem detalhar token | pré-auth CSRF; consumo atômico |
| POST /auth/verify-email/resend | email | 202 ACCEPTED neutro | pré-auth CSRF; coalescência/outbox |
| POST /auth/login | email, password, context | 200 {state: AUTHENTICATED}, Set-Cookie; inválido 401 | CUSTOMER apenas; STAFF 403 FORBIDDEN sem desafio/sessão |
| GET /me | cookie | 200 {id,email,sessionClass:CUSTOMER}, 401 | owner/status/TTL; sem grants/staff |
| POST /auth/logout | {} | 204, revogação idempotente mesmo cookie antigo | CSRF vinculado ao cookie apresentado |
| POST /auth/logout-all | {} | 204 | sessão CUSTOMER válida + CSRF |
| POST /auth/recovery/request | email | 202 ACCEPTED neutro | pré-auth CSRF, somente conta ACTIVE |
| POST /auth/recovery/complete | token, password | 204 ou 400 INVALID_REQUEST | pré-auth CSRF; consumo único, revoga todas sessões |

Erros aplicáveis: 400 INVALID_REQUEST (campos/JSON/tamanho/tipo), 401 UNAUTHENTICATED (credenciais/conta/sessão indistinguíveis), 403 FORBIDDEN/CSRF_INVALID, 429 RATE_LIMITED com Retry-After, 503 DEPENDENCY_UNAVAILABLE com mensagem genérica. Conteúdo inválido/malformado não vaza body/PII. Rotas staff/MFA/financeiro não implementadas, negar por padrão. O 202 MFA da proposta anterior não é emitido por login ID-01.

Outbox persiste payload cifrado AES-256-GCM e chave de deduplicação; token fora de claro no banco. Envio ocorre depois do commit, com lease, reenvio idempotente por ID e resultado persistido. Timeout/falha não afirma entrega; retry não cria token novo nem ativa conta. Chave de cifragem/CSRF/HMAC vem de configuração secreta efêmera de teste, nunca do repositório.

## Provas e limites

ID-001–036 e AUTH-001–020 são a matriz de origem; PASS só com evidência. Testes de uso único e abuso devem observar conexões PostgreSQL independentes e locks reais. Origem/proxy público, provider real de e-mail, MFA staff, DS-003, backup/restore e Supabase L1 não são homologados por localhost. CheckoutResult/40/30/5/Stripe não mudam.

Fontes primárias consultadas em 13/10/2026: [Node 24.21 crypto.argon2](https://nodejs.org/download/release/v24.21.0/docs/api/crypto.html#cryptoargon2algorithm-parameters-callback), [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [NIST SP800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html). Próxima prova é execução local/CI, não rollout.
