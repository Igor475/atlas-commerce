# INV-05 — Handoff, segurança e pendências

Entrega local, sem homologação de produção. [Resultados](../../../apps/api/test/inventory/RESULTS.md)
distinguem suites executadas, CI do baseline e delta remoto não publicado. L1_SQL_STRICT
PENDENTE; nenhuma operação Supabase/Stripe/Resend/R2. UXD-16 e normas intactas;
TTL Inventory não homologa duração de sessão Stripe nem política completa 40/30/5.

## Integrações ainda abertas

- Orders: autenticação/owner/capability da intenção, referência real, snapshot e
  transação conjunta pedido/reserva. Referências DEMO não são Orders persistidos.
- Catalog: adapter comercial do port autorizado, revalidação transacional de
  elegibilidade e snapshot. O adapter SQL de owner da suíte não será promovido.
- Payments: decisão persistida confiável com tentativa, moeda, valor, evidência
  autenticada e correlação; capability escopada para confirmar. O simulador e a
  role decider local não constituem integração de pagamento.
- Release: autorização comercial e encerramento financeiro comprovado, não um
  booleano público. STAFF/MFA, motivo e auditoria são necessários a ajuste humano.
- Fulfillment: expedição, devolução inspecionada, compensações e direitos digitais.
- Expiração/outbox: executor autorizado, consumo idempotente e operação sob pausas;
  nenhum cron/worker remoto foi habilitado.

## Riscos residuais e operação

Loopback Docker com trust e sem TLS é exclusivamente fixture sem credenciais reais;
não é modelo de produção nem prova L1 remota. Markers não são autenticação contra
operador local malicioso. Migração/owner são privilegiados sobre seus objetos e
devem permanecer segregados. Grants podem mudar entre prova e comando por operador
privilegiado; CI local não protege de comprometimento administrativo do banco.

As constraints/ACLs/funções protegem runtime, não contra owner malicioso que altere
DDL ou desabilite triggers. Escala, latência com carga comercial, backup/restore,
TLS remoto e integração conjunta Orders/Payments não foram homologados. Índice
parcial suporta seleção de vencidas; EXPLAIN da fixture não é benchmark de produção.

Harness exige Docker local, loopback, imagem PostgreSQL17 fixada por digest,
projeto UUID exclusivo e lock de porta compartilhado com CAT/PRIC. Cleanup em finally
confere ownership/labels e inventário vazio de recursos próprios. Sem prune/limpeza
global. SIGKILL, falha do SO ou Docker indisponível podem impedir cleanup: inspecionar
somente projeto UUID/lock identificados, comprovar ownership antes de remoção. Nunca
revogar PUBLIC ou parar recursos de outros projetos para fazer teste passar.

Migration aditiva somente na fixture: falha DDL transacional reverte a migration;
reaplicação usa histórico. Recovery normal é replay da intenção/transição. Recriar
fixture só após cleanup próprio; ambiente persistente futuro exigirá plano de
backup/restore e roll-forward aprovado, sem presumir reversão de ledger comercial.

Não fazer commit, push, deploy, SQL remoto ou habilitação comercial como próximo
passo automático. Formatação histórica fora do escopo e aprovação CI do delta devem
ser reportadas separadamente, sem reduzir gates.
