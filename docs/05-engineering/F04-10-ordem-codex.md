# F04-10 — Roadmap de implementação exclusiva pelo Codex

> **Status:** ordem de entregas sugerida; **não** é prompt de implementação enviado ao Codex e não concede autorização para mudanças. O responsável solicitou prompts detalhados quando começarmos o código.

| Ordem | Entrega por prompt próprio | O que precisa estar pronto antes |
|---|---|---|
| **F04-01** | **Esta documentação** do monorepo, fronteiras, contratos preliminares e QA | confirmação de Fase 03 v0.5 (feita) |
| F04-02 | **Documentação OpenAPI/DTO/eventos agora elaborada; aprovação de detalhes pendente** | separação física `storefront/admin/api` e pnpm aprovados; [contratos](contracts/README.md) |
| F04-03 | **Codex bootstrap** pnpm + Next storefront/admin + Nest API + contratos/tooling mínimos; sem domínio implementado | layout F04-01 aprovado, versões escolhidas |
| F04-04 | Codex spike PostgreSQL/Prisma/Supabase Free, migrations em DB local/isolado | ADR-006, DB gates; projeto Supabase real requer autorização própria |
| F04-05 | Codex spike proxy/sessão/MFA local e integração Vercel↔Render (somente quando disponível) | topologia, cookies, origin, recovery e AUTH gates |
| F04-06 | Codex estoque+kit+outbox em PostgreSQL real, dois clientes concorrentes | invariantes do DB, jobs duráveis, DB/CA |
| F04-07 | Codex Stripe test mode com validação 40/30/5 e refund | ADR-004, ST-001–016, sem live checkout |
| F04-08 | Codex catálogo/admin/biblioteca/R2 e pós-venda conforme escopo | autorização, licença, retorno, SA/R2 |
| F04-09 | Codex CI/CD, hardening, E2E, backups, evidências | módulos implementados, recursos de teste e orçamento definidos |

## Contrato obrigatório de todo prompt Codex

1. **Papel e objetivo claros** (módulo/escopo), ramo/commit base, documentos normativos e passos de inspeção prévia; atualizar baseline se `main` evoluiu.
2. **Arquivos permitidos e proibidos**: preservar regras RN/PC/SEC/CA/SA, ADRs e módulos não envolvidos; nenhuma refatoração fora de escopo, nenhuma instalação de provedor pago sem aprovação.
3. **Detalhamento técnico por obrigação**: design do teste antes de implementar, interfaces/erros, dados, migrações, segurança, concorrência, invariantes e observabilidade quando aplicável.
4. **Plano de verificação**: lint, typecheck, build, testes unit/integration/E2E negativos, repetição/concorrência quando necessário; mensagens exatas se não executados.
5. **Relatório final**: arquivos modificados, diff resumido, comandos/resultados, riscos, decisões bloqueadas e próxima etapa; nunca chamar demo de produção.
6. **Não alterar regras normativas** ou o desenho 40/30/5 sem solicitar decisão explícita; sem secrets, cartão real, projeto Supabase/R2 criado por inferência.
7. Se encontrar incompatibilidade, **isolar** e reportar; não escolher silenciosamente workaround que reduz proteção.

## Gate para a próxima entrega

**Separação `storefront/admin/API` e pnpm workspace aprovada**. Revisar/ratificar os [contratos detalhados F04-02](contracts/README.md) e, então, produzir o primeiro **prompt de bootstrap Codex F04-03** (sem módulos financeiros/estoque implementados). A escolha de bibliotecas/versões deve ser acompanhada de justificativa atualizada, não hardcode documental envelhecido.
