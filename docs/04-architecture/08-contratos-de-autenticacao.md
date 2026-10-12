# AC-AUTH-CONTRACT-001 — Contratos de autenticação e autorização

> **Versão:** 0.1.0 | **Estado:** PROPOSTA, sujeita à aprovação da ADR-003/DS-001–003. Sem endpoints publicados nem classes implementadas.

## Esquema conceitual de estados

| Entidade | Estado | Transições autorizadas |
|---|---|---|
| Conta | `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `DISABLED` | Cadastro verificado e decisões administrativas auditadas; conta inativa não autentica |
| Desafio MFA | `ISSUED`, `CONSUMED`, `EXPIRED`, `INVALIDATED` | Só completar com prova válida, finalidade, TTL e vinculação à identidade |
| Sessão | `ACTIVE`, `REVOKED`, `EXPIRED` | Criada apenas após autenticação suficiente; nunca revivida após terminal |
| Recovery token | `ISSUED`, `CONSUMED`, `EXPIRED`, `INVALIDATED` | Um propósito, vínculo de conta, uso único e rotação/invalidação |
| MFA factor | `PENDING_ENROLLMENT`, `ACTIVE`, `REVOKED` | Registro confirmado e autenticado; exclusão/rotação com reauth |

`ACTIVE` não implica papéis que o usuário não possui. A autorização é por sessão, ação, estado e recurso, com consultas server-side.

## Casos de uso / interfaces lógicas (nomes não são rotas oficiais)

| Comando/consulta lógico | Entradas esperadas | Saídas/efeitos e segurança |
|---|---|---|
| `RegisterCustomer` | email, senha, dados mínimos aceitos | Conta não ativa + desafio de e-mail, sem login pleno automático |
| `VerifyEmail` | token de uso único | Ativação idempotente e auditada, token consumido |
| `StartLogin` | credenciais + proteção antiautomação | `SESSION_ISSUED` para cliente elegível ou `MFA_REQUIRED` staff; sem revelar existência |
| `CompleteStaffMfa` | desafio, fator e prova | Consome desafio, emite sessão staff com fator verificado |
| `GetCurrentIdentity` | cookie presente | usuário, ações/capacidades filtradas; sem segredo/credencial |
| `LogoutDevice`, `LogoutAll` | sessão + autorização | revogação persistida; sessão antiga perde efeitos |
| `StartRecovery`, `CompleteRecovery` | e-mail/tokens, senha nova | respostas genéricas, consumo atômico e revogação conforme política |
| `Enroll/RemoveFactor` | reauth, challenge/fator | política de MFA, auditoria e notificação; não permitir bypass |
| `RequestStepUp` / `CompleteStepUp` | sessão staff e fator | marca autenticação recente server-side, TTL curto, uso/purpose conforme risco |
| `AuthorizeOperation` | ação + recurso + sessão + estado | decisão/negação por titularidade, role, finalidade, estado e step-up |

## Regras de contrato e garantias

- Sem `isAdmin`, `mfaComplete`, valores de refund ou permissões confiáveis enviados no body. Client faz solicitações, backend avalia.
- A sessão opaca nunca aparece em JSON ou URL; cookie em `Set-Cookie`. Responses de autenticação, resets e logs não devem expor a existência de conta.
- Cookie browser exige defesa CSRF nas mutações, não apenas CORS/SameSite. No SSR/Next.js, vazamento de cache entre usuários deve ser evitado (`no-store`, controle de cache/proxies por rota).
- Falhas normalizadas sem detalhar secrets e sem permitir enumeração; adicionar correlation ID e códigos de erro sem PII.
- Não operar logout como apenas remoção do cookie. Estado revogado no banco predomina inclusive se cookie antigo reaparecer.
- Login staff sem MFA concluído não é `authenticated staff`; token parcial não pode chamar `/me`, ações administrativas ou endpoints de cliente de forma oportunista.
- Autenticação recente para alto risco está ligada à sessão, ao fator e ao propósito. Papel financeiro e step-up não substituem autorização comercial, limite e segunda identidade quando exigida.
- Política de retenção de sessão, logs e challenges deve respeitar minimização, investigações e requisitos legais (DS-007).

## Contratos de integração e fronteiras

- Web browser → proxy same-origin → NestJS → PostgreSQL (sessões). Cada host usa cookie próprio com `__Host-`.
- E-mail transacional entrega verificação/recovery, mas não atua como MFA suficiente para staff.
- WebAuthn/Passkeys: desafio e material de verificação com origem/RP ID, UV e replay protegido. Não escolher biblioteca antes de decisão técnica.
- Stripe webhook não usa sessão nem CSRF de browser; a autenticação técnica é assinatura do payload bruto e escopo do destino.

## Questões abertas a decidir antes do código

Topologia final storefront/admin/API (domínios, reverse proxy), valores definitivos de TTL e recent-auth, primeiro admin, suporte WebAuthn/TOTP e recuperação, permissões e alçadas DS-003, escolha do provedor de email, requisitos de retenção e proteção dos segredos MFA.

**Aceite futuro:** [AUTH-001–020](09-cenarios-aceite-autenticacao.md); [SA-001–004](../07-security/security-requirements.md); aprovação da ADR-003 e matriz DS-003. Nenhum teste foi executado.
