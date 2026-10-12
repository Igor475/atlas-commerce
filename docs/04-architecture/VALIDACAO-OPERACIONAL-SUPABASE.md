# AC-SUPABASE-TEST-001 — Gate Supabase PostgreSQL do Atlas Commerce

> **Estado:** 16 casos SUPABASE-001–016 **PLANEJADOS, NÃO EXECUTADOS**. Provedor Supabase aprovado, plano Free **somente recomendado**. Responsável futuro: etapa de implantação e spikes Codex autorizados.

| ID | Teste futuro | Critério verificável |
|---|---|---|
| SUPABASE-001 | Plano, quotas e região confirmados | Registro do plano contratado, limites, latências medidas e cota disponível; sem inferir Free por decisão de provedor |
| SUPABASE-002 | Conexão Render Free em cold start | Prisma/adapter inicia com TLS e timeout; não imprime URL/segredos |
| SUPABASE-003 | IPv4 e endpoint session mode 5432 | Host obtido em Connect; sessão, transactions/locks e prepared statements testados |
| SUPABASE-004 | Ligação direta IPv6 alternativo | Utilizar somente se conectividade real provada e custo/segurança registrados |
| SUPABASE-005 | Condições de erro SSL/certificado | Conexão insegura/hostname inválido é rejeitado segundo modo aprovado |
| SUPABASE-006 | Pool pequeno sob concorrência | Query/checkout sem exceder limites globais, observando saturação/latência |
| SUPABASE-007 | Runtime versus migrations | Roles e privilégios mínimos; runtime incapaz de aplicar DDL não autorizada |
| SUPABASE-008 | Data API/RLS/grants | `anon`/`authenticated` não acessam pedidos, saldo, sessões, dados financeiros ou logs protegidos |
| SUPABASE-009 | Prisma v7 + adapter e raw SQL numa TX | Locks, tempo DB após lock, rollback e DB-001–028 executados com PostgreSQL real |
| SUPABASE-010 | Projeto Supabase pausado/indisponível | Falhas controladas, sem marcar pagamento confirmado e com recuperação após reativação |
| SUPABASE-011 | Render Free acorda após suspensão | Reconexão ao pooler, idempotência intacta e segredos mantidos em backend |
| SUPABASE-012 | Backup lógico off-site controlado | Dump consistente com inventário de PII, criptografia, retenção e chave separada |
| SUPABASE-013 | Restore real em ambiente segregado | Reconstituir pedido/estoque/outbox/refund/entitlement; integridade checada e tempo medido |
| SUPABASE-014 | Crash após commit mas antes da entrega | Pedido/outbox preservados no Supabase; reprocessar com executor independente/lease |
| SUPABASE-015 | Expiração, captura tardia e refund | TTL DB bloqueia fulfilment mesmo sem cron; reconciliação recomeça sem efeito duplicado |
| SUPABASE-016 | Conectividade SMTP/e-mail e observabilidade | Usar e-mail por API HTTPS aprovada; logs/alertas de pausing, pool, backups e jobs; sem vazar segredos |

## Gates antes de afirmar prontidão

- [x] Provedor PostgreSQL escolhido: **Supabase**.
- [ ] Plano Supabase, região, limites e custos decididos.
- [ ] Todos os cenários aplicáveis comprovados em ambiente real, com commit, versões do driver, logs redigidos e evidência de execução.
- [ ] DB-001–028, SA-001–012, AUTH-001–020, ST-001–016 e RENDER-001–016 executados conforme a função implementada.
- [ ] Backups/restore e executor externo seguro disponíveis antes de operação comercial real.
- [ ] Provar que o banco e a API podem pausar sem corromper estoque, sessões, idempotência ou refund — **sem prometer prontidão de 24×7**.

**Este pacote não cria projeto Supabase, não executa queries/migrations e não verifica credenciais, quotas ou RLS de uma conta real.**
