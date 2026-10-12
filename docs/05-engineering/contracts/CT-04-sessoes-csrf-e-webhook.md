# CT-04 — Contratos de autenticação, CSRF e webhook (três contextos)

> **Fronteiras já aprovadas:** `storefront` e `admin` Next.js separados; `api` NestJS monólito. `__Host-` cookie separado **por host e classe**, sessão opaca hashed em Supabase PostgreSQL. Sem domínio real, sem cookies testados, sem Supabase Auth.

## Browser loja/admin

1. Cada navegador faz chamadas same-origin `https://<seu-host-verificado>/api/v1/...` via proxy controlado para Render, sem expor segredo NestJS, Stripe, DB ou R2. CORS, CSP, cookies e origem precisam de prova no host efetivo; `rewrite` não concede segurança sozinho.
2. O backend cria cookie `Secure`, `HttpOnly`, `SameSite` conforme política comprovada, `Path=/`, **sem `Domain`** e prefixo `__Host-`; valor é segredo aleatório e o banco armazena apenas hash. Em ambiente local sem HTTPS, usar estratégia local de desenvolvimento explícita, sem afrouxar produção.
3. A classe de sessão é bind a `storefront` ou `admin` e identificada pelo backend, não pelo `isAdmin` da requisição. Mesmo que navegador compartilhe token por erro, usuário da loja não obtém backoffice.
4. CSRF para **mutações cookie-auth**, inclusive login/logout/ações admin, com defesa Origin/Referer e token vinculado à sessão/fluxo e domínio correto. Cookie `SameSite` é defesa adicional e não substitui CSRF token. Endpoint `/auth/csrf` é bootstrap **proposto**; validar concretamente rotação, login csrf e origem antes da implementação.
5. Sessão cliente: prazo inicial 12h absoluto/30min inativo. Sessão staff: 8h absoluto/15min inativo. Somente backend mede e revoga; nenhum redirecionamento de front renova sessão administrativa implicitamente.
6. Senha correta em staff produz **challenge MFA pendente**, nunca sessão plenamente autorizada; WebAuthn com RP ID/Origin/userVerification ou TOTP alternativa aprovada; recovery sem downgrade automático. WebAuthn challenge único/purpose-bound e expiração a definir por teste.
7. Passkeys exigem RP ID válido ligado ao host real; não inventar domínios nem assumir que preview Vercel é origem fixa. Bootstrap e recuperação do primeiro admin exigem contrato específico antes da implementação.

## Stripe webhook (não humano)

- Stripe chama endpoint NestJS HTTPS de forma independente das origens de browser. Receber `Stripe-Signature` e **raw body exato**; testar verificação da assinatura do ambiente test e rejeitar replay/binding inválido. **Sem CSRF/cookie, sem Supabase Auth e sem simular `Authorization: Bearer`.**
- Só após assinatura e correlação de `session/intent`, amount/currency `BRL`, status e IDs persistir evento/inbox no banco. Evento repetido ou fora de ordem não duplica estoque/entitlement/refund.
- O servidor responde sucesso ao provedor somente após ter persistido recebimento válido e trabalho recuperável; erro/DB indisponível não afirma processamento. Cold start da Render Free é limite operacional não um motivo para confiar em redirect do cliente.
- Nunca logar raw body integral, assinatura, chave secreta, session cookie, payload financeiro identificável ou presigned URL.

## Jobs e clientes técnicos

Jobs não recebem cookie de operador nem burlam MFA: autenticação por credencial técnica escopada, rotacionável e auditável; não criar endpoint público de replay/cron que aceite header secreto estático fraco ou bypass. Nenhum cron real homologado no Free; outbox/inbox durável não equivale a worker sempre ativo.

**Gates:** [AUTH-001–020](../../04-architecture/09-cenarios-aceite-autenticacao.md), [SA-001–012](../../07-security/security-requirements.md), [ST-001–016](../../04-architecture/07-validacao-stripe.md), [VCL](../../04-architecture/VALIDACAO-VERCEL-R2-JOBS.md).
