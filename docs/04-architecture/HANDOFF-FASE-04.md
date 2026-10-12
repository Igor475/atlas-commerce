# Atlas Commerce — Entrada controlada na Fase 04 (estrutura e engenharia)

> **Estado:** roteiro de preparação, **não** prompt de código e **não** implementação executada. A [Fase 03 consolidada](CONSOLIDACAO-FINAL-FASE-03-v0.5.md) aprova a direção, não a infraestrutura.

## Objetivo

Transformar ADRs e requisitos de negócio/segurança em **contratos versionados, monorepo planejado, pipeline e testes** sem colocar em risco a consistência de estoque, Stripe e acesso digital. Codex fará código somente após prompt especializado e com escopo delimitado.

## Ordem recomendada para a Fase 04

1. **F04-01 — Arquitetura executável do repositório (documental):** decidir monorepo pnpm workspaces, `apps/storefront`, `apps/admin` (ou admin integrado), `apps/api`, pacotes compartilhados sem misturar domínio; nomear fronteiras NestJS e dependências permitidas. Confirmar separação de deployment Vercel/Render sem presumir domínio comprado.
2. **F04-02 — Contratos e qualidade (documental):** OpenAPI para APIs, convenções de erro/idempotência, DTO e validação, migrations versionadas, versionamento de eventos/outbox, direitos digitais, testes por camadas, CI/gates, secrets/env por ambiente e fonte de configuração. Não alterar RN/SEC/PC por conveniência.
3. **F04-03 — Spike de dados pelo Codex:** NestJS/Prisma v7 + adapter de Postgres, Supabase Free via TLS/session pooler, transação crítica com locks em **mesma conexão**, pool mínimo e conexão/recovery no cold start. Testar contra DB isolado; jamais criar/alterar projeto Supabase sem autorização explícita.
4. **F04-04 — Spike de sessão/proxy pelo Codex:** Vercel Hobby e Render Free em topologia real definida; cookies `__Host-`, Secure/HttpOnly, CSRF, CORS/Origin e TLS. Não afirmar auth seguro por simples teste local.
5. **F04-05 — Spike concorrência/jobs pelo Codex:** reserva do último SKU, kits, timeout, reprocessamento, outbox/inbox, avaliação do Supabase Cron **como hipótese condicionada**; sem Stripe live, sem cron permanente não verificado.
6. **F04-06 — Stripe somente test mode:** provar ST-001–016 antes de declarar checkout/fulfillment disponível; restituir incompatibilidades à decisão de negócio, sem alterar TTL silenciosamente.

## Contrato obrigatório para prompts Codex

- Citar baseline GitHub e documento/ADR(s) correspondente(s), escopo, arquivos permitidos e proibidos.
- Restringir alterações a tarefas expressas, preservar documentação normativa, proibir refatorações oportunistas.
- Exigir validação `lint`, `typecheck`, testes automatizados e negativos pertinentes; **se não executados, informar por quê**.
- Nenhum segredo/credencial, teste com cobrança real ou dados licenciados indevidamente.
- Registrar diff/arquivos, decisões ambíguas e evidência de banco/PSP reais apenas quando efetivamente testados.
- Não alegar segurança, disponibilidade, LGPD ou PCI 'garantidos' pela escolha da stack.

## Gate para começo de cada módulo

Uma ADR/diretriz aceita autoriza planejar/experimentar a tecnologia, mas **a liberação do módulo depende de contrato testável e dos riscos do seu contexto**: inventário precisa de concorrência no banco; pagamentos precisam do Stripe sandbox e compensação; biblioteca precisa de entitlement real; autenticação precisa de topologia/CSRF e MFA. O plano Free não remove nenhum desses gates.

## Decisões remanescentes a obter antes dos respectivos fluxos

- URL/host da loja e do backoffice e topologia de proxy de autenticação; sem domínio não inventar subdomínios.
- Limites de upload/previews/licenciamento e propriedades dos buckets R2.
- Valor monetário das alçadas de refund manual, governança de aprovações e política final de cancelamento conforme jurídico.
- Região real dos serviços e estratégia de backup e recuperação testada; orçamento de eventual executor contínuo antes de operação comercial.
- Provedor de e-mail transacional por API HTTPS, bootstrap inicial de admin e recuperação de MFA.

**Saída pretendida:** dar ao Codex decisões técnicas suficientemente específicas sem fingir que escolhas infra documentais equivalem a infraestrutura já provisionada ou testada.
