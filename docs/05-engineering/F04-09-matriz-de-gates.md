# F04-09 — Rastreamento dos gates, sem falsa homologação

> **Estado:** plano de ensaio, nenhuma linha abaixo afirma teste executado. Uma direção aprovada libera planejamento, não libera pagamento real nem dispensa integridade financeira.

| Escopo que Codex implementará | Documentos normativos | Evidência de aprovação do módulo |
|---|---|---|
| Bootstrap 3 apps + workspace | ADR-001, F04-01/02/08 | install/build/test/lint por app, pacote sem dependência circular, sem apps extras |
| NestJS health/config | ADR-008/009, F04-07 | live/ready separados, env redigido, cold start Render RENDER-001–016 |
| Postgres/Prisma | ADR-006/010, DB-01–05 | TLS/pooler, migration isolada, DB-001–028 e SUPABASE-001–016 aplicáveis |
| Sessões/MFA | ADR-003, SEC/SA, F04-06 | AUTH-001–020, CSRF, cookies, auth owner, staff MFA, SSR cache |
| Catálogo, preço e cupom | BRD RN/CA, F04-03 | server-owned preço/cupom, validação input, corrida cupom CA-007 |
| Reserva/Kits/Orders | PC-01/04, ADR-002/006 | CA-001–026 relevante, DB-001–011, DB-005–009, estado seguro sem worker |
| Stripe test mode | ADR-004, F04-03/04 | ST-001–016; nunca redirect prova; late payment/refund idempotente |
| Biblioteca/R2 | ADR-005, SEC-025–027, F04-07 | R2-001–012 e SA-009/010, entitlement, licença, presigned TTL |
| Jobs/Outbox | ADR-002/007, F04-04 | JOB-001–018; serviço Free pausado não causa oversell/cobrança incorreta |
| Suporte e reembolso | RN-081–094, DS-003 | aprovação separada, valor reservado e refund provado, SA-008 |
| CI/CD e operação | ADR-008/009/010, F04-08 | lint/build/test/scan reais, export/restore e alertas comprovados |

## Gatilhos de bloqueio

- **Stripe ainda sem homologação 40/30/5:** codificar somente uma prova isolada em test mode; não liberar checkout completo como funcional.
- **Ausência de executor sempre ativo:** expiração é sempre guarda transacional do DB; job atrasado só recupera o estado. Não prometer processamento pontual no Render Free.
- **Sem domínio/RP ID definidos:** WebAuthn pode ter prova local controlada, mas não afirmar autenticação WebAuthn de produção ou cookie de demo correto.
- **Sem alçada financeira monetária:** não inventar limites; travar fluxo manual até contrato aprovado, mesmo com papel financeiro.
- **Sem licenças de mídia reais:** demo usa placeholders/conteúdo gerado/autorizado, não publicar PDFs com copyright de terceiros.
- **Vercel Hobby não comercial:** modo Stripe teste; qualquer produto publicamente demonstrado não gera cobrança real.
- **Supabase Free sem restore comprovado:** não alegar RPO/RTO, proteção de dados operacionais ou prontidão comercial.

A matriz dirige os prompts do Codex, com validações negativas e concorrentes. Referências: [handoff](../04-architecture/HANDOFF-FASE-04.md), [segurança](../07-security/security-requirements.md), [F04-10](F04-10-ordem-codex.md).
