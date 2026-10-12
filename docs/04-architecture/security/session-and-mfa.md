# DS-001/DS-002 — Autenticação, sessão, MFA e recuperação (refinamento v0.3)

> **Status:** proposta arquitetural para aprovação; não implementada nem testada. Não substituir [ADR-003](../adrs/ADR-003-autenticacao-sessoes.md) nem [SEC-001–011](../../07-security/security-requirements.md).

## Fronteiras e ciclo de vida da sessão

- Usuário visita loja (anônimo) → inicia autenticação → backend verifica credencial → se cliente habilitado, emite nova sessão opaca; se operador, gera **somente desafio MFA** até prova válida. Não reaproveitar sessão anônima como identificador autenticado.
- `Session`: identidade opaca gerada pelo backend, hash armazenado no PostgreSQL, `account_id`, classe de sessão (`SHOPPER`/`STAFF`), `created_at`, `last_seen_at`, `idle_expires_at`, `absolute_expires_at`, `revoked_at`, autenticação forte recente e metadados minimizados. O hash/identidade de sessão não deve ser exposto a logs.
- `MfaChallenge`: propósito `STAFF_LOGIN` ou `STEP_UP`, um uso, curta duração, sujeito a rate limit; a validação não aceita que o browser declare `mfa_complete=true`. 
- Logout revoga registro do servidor em transação; cookie é limpo no navegador como ação complementar. Logout global invalida sessões ativas; qualquer eventual cache deve respeitar revogação.
- Rate limit/antienumeração por conta+origem quando aplicável, sem bloqueios facilmente exploráveis para negar serviço a terceiros.

## Cookies, proxy e proteção CSRF

A direção recomendada é um ingresso de mesma origem: `GET /...` e `/api/...` pertencem à origem da interface pública ou administrativa, com proxy controlado para NestJS. Admin e loja **não compartilham cookie**; a separação se mantém se duas apps forem usadas. CORS restrito quando inevitável, credenciais nunca em `*`, `Secure` obrigatório em produção e cabeçalhos `X-Forwarded-*` aceitos apenas de proxies confiáveis.

Cookie host-only `__Host-*`, sem `Domain`, `Path=/`, `HttpOnly`, `Secure`, `SameSite` configurado por risco/topologia. CSRF: validar `Origin`, token vinculado à sessão para mutações; `SameSite` apenas camada adicional. Segurança de repositório e pipeline impede segredos de cookie/MFA no Git.

| Caminho / ação | Sessão necessária | Segurança adicional |
|---|---|---|
| Catálogo/prévia liberada | Não | somente conteúdo autorizado como público |
| Checkout / pedido / endereços / biblioteca | Sessão de cliente ativa | titularidade, autorização, CSRF nas mutações |
| Backoffice | Sessão staff com MFA concluído | ação/recurso, least privilege, CSRF nas mutações |
| Refund manual | Staff, MFA, permissão financeira | reauth/step-up recente, segregação, saldo e idempotência |
| Configuração de MFA/role | Staff MFA, permissão | reauth, auditoria, anti-autoelevação |
| Webhook Stripe | Nunca usar sessão browser | validar assinatura `Stripe-Signature` sobre raw body |
| Job interno | Credencial técnica escopada | autenticação de serviço, idempotência, auditoria |

## Segundo fator, onboarding e recuperação

- Preferência para WebAuthn/FIDO2 com `userVerification=required` no papel de operador; selecionar origens e RP ID reais antes de desenvolver. TOTP pode ser oferecido por política explícita; códigos não são phishing-resistant.
- Provisionamento do primeiro operador exige fluxo de bootstrap administrativo restrito, de uso único, sem senha padrão; desabilitar bootstrap após uso e preservar auditoria.
- Guardar credencial pública WebAuthn com challenge, origin, RP ID, flags e prevenção de replay; segredo TOTP protegido em repouso e fora de logs; recovery codes de alta entropia armazenados em hash, uso único.
- Alterar fator exige sessão forte/reautenticação e notificação. Recuperação de MFA sem fator restante segue procedimento excepcional de alto rigor documentado (sem permissão financeira automática até revisão).
- Reset de senha via e-mail comprovado: resposta genérica, token forte/uso único/TTL e revogação de sessão; não deve remover MFA existente, autorizar mudança de role ou suspender regras de step-up.

## Casos de segurança e risco residual

Credencial roubada, refresh/token de sessão reutilizado, CSRF, XSS, phishing de TOTP, replay de challenge WebAuthn, recuperação de operador por e-mail, subdomain cookie injection, request smuggling/trust proxy, session fixation, IDOR, quebra de autorização financeira e abuso do onboarding.

**Evidências futuras:** [AUTH-001–020](../09-cenarios-aceite-autenticacao.md), SA-001–004/008/009, SEC-001–011/014/022/030. Não há evidência executada no pacote.
