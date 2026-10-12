# Fase 03 — Quadro de decisões arquiteturais após seleção do Stripe

> **Estado documental em 12/10/2026:** fornecedor selecionado; arquitetura ainda em revisão. A conclusão desta fase exige decisão técnica explícita, não apenas publicar os ADRs.

| Item | Direção | Estado atual | Próximo gate |
|---|---|---|---|
| ADR-001 Monólito modular | NestJS modular, uma API inicial | Proposta bem fundamentada | Aceite humano + teste de fronteiras quando houver código |
| ADR-002 PostgreSQL/outbox | DB como fonte de verdade, inbox/outbox, sem efeitos externos em transação | Proposta | Escolher estratégia de locks, índice/dedup e ensaio concorrente |
| ADR-003 Autenticação/sessões | **Sessão opaca no PostgreSQL, cookie `__Host-`, same-origin proposto, MFA antes da sessão staff** | **Proposta detalhada, não aprovada** | Validar domínio/ingress, TTLs, CSRF, WebAuthn/TOTP e recovery; AUTH-001–020 |
| **ADR-004 Stripe** | **Stripe escolhido; Checkout hospedado test mode** | **Fornecedor definido; técnica não homologada** | [ST-001–016](07-validacao-stripe.md), especialmente sessão de 30 min e gap de 5 min |
| ADR-005 Mídia/storage | Prévia pública e conteúdo comercial privado | Proposta, fornecedor aberto | Política de licença/upload/TTL e testes de acesso |
| ADR-006 Acesso a dados | PostgreSQL; Prisma v7 + adapter/SQL como candidato, Drizzle/SQL alternativos | **Proposta detalhada, não aprovada** | [DB-001–028](database/DB-05-plano-de-validacao.md), locking, migrations, pool e consistência |
| ADR-007 Jobs/worker | Outbox durável; processo próprio condicional | Aberta | Hospedagem, lease/lock, recuperação e métricas |
| **ADR-008 Segurança operacional** | CI, segredos Stripe, TLS, backup/restore, observabilidade | **Nova proposta** | Hospedagem e plano de recuperação testável |

## Princípios de escopo

A escolha do Stripe não autoriza implementação de cartões reais, Pix/boleto, produção ou webhook sem assinatura. Também não encerra DA-009/DS-003 (alçadas), DS-001/002 (sessões/MFA) ou DS-005–009 (mídia, privacidade, operação e ASVS).

## Próxima ação recomendada

1. Revisar e aceitar formalmente ADR-001 e direção ADR-002 (sem alegar testes que ainda não ocorreram).
2. Revisar a **proposta ADR-003 v0.3** de sessão opaca/MFA e decidir topologia, valores, recuperação e matriz de autorização; ver [contratos de auth](08-contratos-de-autenticacao.md), [DFD-04](security/DFD-04-sessoes-mfa.md) e [testes AUTH](09-cenarios-aceite-autenticacao.md).
3. Executar spike Stripe no momento de preparação de implementação autorizado, **antes de codificar pagamentos/fulfillment**; validar ST-001–016 e rever TTL se incompatível.
4. Executar avaliação de ADR-006 e provas DB-001–028 quando autorizado, sem eleger ORM definitivo antes de medir; depois decidir storage, jobs e ambiente.
5. Só liberar um módulo ao Codex com ADR relevante aceita, limites exatos de escopo e casos CA/SA associados.

Referências: [índice ADR](adrs/README.md), [matriz de autorização](security/authorization-matrix.md), [DFD-02](security/DFD-02-checkout-pagamento.md), [decisões externas](../03-business-processes/CRITERIOS-DECISOES-EXTERNAS.md).

## Atualização ADR-006 v0.4

[ADR-006](adrs/ADR-006-acesso-dados.md) foi aprofundada; [índice do pacote DB](database/README.md) e [plano DB-001–028](database/DB-05-plano-de-validacao.md). **Status: proposta de arquitetura, não software, migrations ou testes executados.**
