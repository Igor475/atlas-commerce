# ADR-003 — Sessão, recuperação e MFA

**Status:** ABERTA • DS-001, DS-002, DS-003. Sem escolha definitiva de topologia de domínio.

## Contexto

Cliente tem login, biblioteca e pedidos; operador altera catálogo, preço, estoque e reembolso. Precisamos revogar sessão e impedir que a UI substitua authz.

## Alternativas

- Sessão opaca gerenciada pelo backend em cookie HttpOnly (revogação simples, cuidado com CSRF e cache).
- Access token curto + refresh HttpOnly rotativo ligado à sessão DB (escalabilidade/complexidade de rotação/replay).
- Provedor de identidade externo (integração e gestão de risco/contrato).

## Diretrizes não controversas

Nunca armazenar senha em claro; política de hash apropriada, antiforça bruta, recuperação de uso único, revogação e MFA do backoffice, step-up para operações de risco, check de titularidade e ação no backend. Access tokens no browser não substituem sessão revogável.

## Gate para fechar

Definir domínio same-site/cross-site e defesa CSRF/CORS; TTL/rotação/logout global; escolha de MFA/WebAuthn/TOTP e recuperação administrativa; alçadas e identidades de aprovação distintas. Testar SA-001–004 e SEC-001–011. **Nenhum cookie/TTL foi homologado ainda.**
