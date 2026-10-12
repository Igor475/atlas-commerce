# F04-06 — Topologia Vercel↔Render e segurança de sessão

> **Status:** contrato de segurança a validar no navegador real. A ADR-003 aceita sessão opaca revogável no NestJS, cookie host-only, MFA para equipe, CSRF e isolamento loja/admin. A definição física de dois Next.js segue proposta F04-01.

## Padrão recomendado para o spike

```text
browser loja  → origem Vercel storefront → /api/* (proxy controlado) → Render NestJS → Supabase
browser staff → origem Vercel admin      → /api/* (proxy controlado) → Render NestJS → Supabase
Stripe → URL direta do webhook NestJS na Render (assinatura raw body, não cookie)
```

O padrão `rewrite` do Next.js pode encaminhar requests externamente e mascarar a URL destino, **mas não é prova** de autenticação segura: testar `Set-Cookie` com prefixo `__Host-`, `Secure`, `HttpOnly`, `SameSite`, Path `/`, sem `Domain`; host correto; logout/rotação; `Origin`, `Referer`, token CSRF de sessão e comportamento SSR/RSC com caches. O WebAuthn RP ID/Origin só será definido com hosts reais; não inventar `atlascommerce.com` ou subdomínios.

## Regras e testes negativos

- Loja e admin têm sessões com **classe e cookie isolados**; sessão de cliente nunca serve no staff. Operador com senha correta mas MFA pendente **não** recebe sessão autorizada.
- Passkeys/WebAuthn preferidos, TOTP alternativa controlada e recovery forte; cadastro/recovery via e-mail não contorna MFA. Bootstrap primeiro admin com fluxo restrito, auditável e não reutilizável.
- Cookie opaco é criado/rotacionado no NestJS; DB persiste **hash**; backend revoga no logout e logout global, bloqueio e recovery conforme política.
- Todo recurso valida autorização server-side por ação, titular, estado, MFA recente/alçada quando cabível. UI, `proxy.ts` do Next.js ou rewrite servem como UX/defesa complementar, **não substituem guards NestJS**.
- A política de TTL inicial aprovada é **cliente 12h absoluta/30min inatividade; backoffice 8h/15min**, com servidor autoritativo. Avaliar configuração e UX antes de deploy público.
- Dados de sessão/identidade privados e credenciais não recebem cache público Vercel/Next.js; `no-store`/cache headers validados por testes cross-user.
- O webhook do Stripe não usa sessão humana, CSRF de browser nem proxy que transforme corpo bruto. Requer verificação de assinatura, replay e amount/currency/IDs. Testar cold start da Render no recebimento.

**Pendência:** a topologia acima e separação física das duas apps devem ser ratificadas/validadas em spike. Ref.: [ADR-003](../04-architecture/adrs/ADR-003-autenticacao-sessoes.md), [AUTH](../04-architecture/09-cenarios-aceite-autenticacao.md), [F04-01](F04-01-estrutura-monorepo.md).
