# Segurança arquitetural — Fase 03

> **Estado:** análises propostas, não controles testados. A fonte de obrigações continua sendo [AC-SEC-001](../../07-security/security-requirements.md).

Este diretório especializa **como** aplicar SEC-001–038 ao monólito modular, sem alegar que algum controle já foi implantado.

## Artefatos

- [Matriz de autorização](authorization-matrix.md): papéis, escopos e segregação financeira; proposta para DS-003.
- [Modelo inicial de ameaças](threat-model.md): 18 cenários de abuso com STRIDE, risco e verificação vinculada.
- [Sessão e MFA](session-and-mfa.md): proposta detalhada de sessão opaca, cookies por origem, WebAuthn/TOTP, recovery e step-up; DS-001/002 **aguardam aprovação**.
- [Webhooks, PSP e mídia](trust-boundaries.md): fronteiras de confiança, segurança de arquivos e privacidade.
- [DFD-01 Identidade](DFD-01-identidade.md): browser/identidade/DB/email/MFA.
- [DFD-02 Checkout](DFD-02-checkout-pagamento.md): browser → API → DB, PSP → Pagamentos e reconciliação.
- [DFD-03 Biblioteca](DFD-03-entitlements.md): licença, objeto privado, URLs temporárias, retorno e auditoria.
- [DFD-04 Sessões/MFA](DFD-04-sessoes-mfa.md): navegador e admin, ingress, challenge e PostgreSQL.
- [Contrato de autenticação](../08-contratos-de-autenticacao.md) e [cenários AUTH-001–020](../09-cenarios-aceite-autenticacao.md).

## Níveis de confiabilidade

- **T0 — Internet/browser:** nenhum total, papel, status de pedido ou ID enviado é autoridade; cookies de sessão exigem defesa contra CSRF conforme topologia.
- **T1 — API/autenticação:** entrada validada; autorização por ação/recurso; segredo técnico não sai do servidor; erros não revelam dados.
- **T2 — Domínio transacional:** PostgreSQL sob guardas/constraints; eventos internos são verificados contra o estado persistido.
- **T3 — Integrações externas:** PSP, e-mail e object storage não são automaticamente confiáveis; verificar identidade, assinatura, escopo, status e falhas.
- **T4 — Operação/CI:** operadores, pipeline e logs com privilégios e retenção controlados; ambientes segregados.

## Separação de responsabilidades

- Login humano ≠ autenticação de webhook / jobs.
- Confirmação financeira ≠ alocação de estoque ≠ expedição ≠ entitlement.
- Retorno HTTP 200 de PSP ≠ reembolso liquidado; confirmação exige prova e reconciliação.
- URL assinada não é DRM nem permite revogação instantânea enquanto válida.

**Gate:** depois de resolver DS-001–009 e DA-006/009, revisar trust boundaries, riscos residuais e testes negativos; sem isso a arquitetura segue como proposta, não como desenho seguro homologado.
