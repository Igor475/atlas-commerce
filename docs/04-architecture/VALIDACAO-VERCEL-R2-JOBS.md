# AC-INFRA-TEST-003 — Plano de validação: Vercel, R2 e jobs

> **Estado:** **PLANEJADO — NENHUM TESTE EXECUTADO**. R2 Free Tier foi escolhido; Vercel **Hobby é plano aprovado para demo pessoal não comercial**; executor de jobs ainda exige prova.

## Vercel (VCL-001–008)

| ID | Ensaio futuro | Resultado exigido |
|---|---|---|
| VCL-001 | Build de Next.js + preview vs production | Rotas funcionais sem expor secrets; ambientes isolados |
| VCL-002 | Origem Vercel, proxy HTTPS e Render Free acordando | Cookie host-only, CORS/CSRF corretos, nenhum token em cache SSR |
| VCL-003 | Login/logout e callback em HTTP/2/redirects | Sem session fixation, referer ou origem insegura |
| VCL-004 | Vercel Hobby + política de uso não comercial | Elegibilidade registrada para **portfólio demo sem venda real** |
| VCL-005 | Crons Hobby simulados | Demonstra não atender sweep de reserva de 40 min; jamais agendar nessa dependência |
| VCL-006 | Header, CSP, cache de páginas privadas | Nenhuma resposta de conta de A entregue a B |
| VCL-007 | Falha/cold start do backend | UI pendente/erro recuperável, não confirmar pagamento por redirect |
| VCL-008 | Orçamento/uso público | Limites de função/imagens e operação monitorados |

## Cloudflare R2 (R2-001–012)

| ID | Ensaio futuro | Resultado exigido |
|---|---|---|
| R2-001 | Criar/testar buckets demo public/private | Full text PDF privado não exposto por `r2.dev` nem custom domain |
| R2-002 | Solicitar arquivo A como cliente B | Negado no NestJS sem presigned URL |
| R2-003 | Entitlement de kit misto com estoque não confirmado | Download integral negado |
| R2-004 | Revogar entitlement após emissão | Documentar janela restante da URL; não prometer revogação já emitida |
| R2-005 | Presigned GET com validade curta | Expira no prazo; não aparece em log, analytics, referer desnecessário |
| R2-006 | Credenciais R2 expostas ao navegador | Ausentes de JS, SSR response, variáveis `NEXT_PUBLIC_*`, Git |
| R2-007 | Upload falsificando MIME/extensão | Magic bytes/limite/inspeção e quarentena funcionam |
| R2-008 | Ingestão remota tentando SSRF | Redes internas/link-local/metadata bloqueadas |
| R2-009 | Prévia pública vs arquivo integral | São objetos diferentes com licença validada |
| R2-010 | 10 GB-mês, 1M Class A, 10M Class B | Métrica e alerta de franquia, classe Standard; excedente pode cobrar |
| R2-011 | Falha de upload e reprocessamento | Conteúdo parcial não é publicado, hash e object key estáveis |
| R2-012 | Restauração de referência DB e objeto R2 | Referência íntegra e recuperação testável |

## Jobs e reconciliação (JOB-001–018)

| ID | Ensaio futuro | Resultado exigido |
|---|---|---|
| JOB-001 | Render Free dorme por mais de 40min | Reserva vencida nunca confirmada por checkout/webhook posterior |
| JOB-002 | Duas tentativas de liberar mesma reserva | Liberação de saldo uma vez com transação e ledger |
| JOB-003 | Startup após longo período ocioso | Backlog detectado, claims duráveis recuperados |
| JOB-004 | Dois executores claim mesmo job | Owner/lease evita processamento simultâneo; replay idempotente |
| JOB-005 | Worker cai após commit mas antes de notificar | Outbox recuperada e mensagem entregue sem duplicar fato |
| JOB-006 | Falha após chamar Stripe e antes de persistir resultado | Reconcilia mesma tentativa e mesma chave, sem refund duplicado |
| JOB-007 | Pagamento válido após TTL de reserva | PAYMENT_REVIEW e refund estável, sem entrega |
| JOB-008 | Reembolso fica inconclusivo | Pending retém saldo e alerta por idade |
| JOB-009 | Email falha e é repetido | Pedido não desaparece nem é revertido por erro de notificação |
| JOB-010 | Entitlement em kit misto tenta antecipar fulfillment | Bloqueado sem confirmação da reserva integral |
| JOB-011 | Scheduler executa atrasado ou duplicado | Sem mudança indevida de estado, lag medido |
| JOB-012 | Supabase Free pausado | Sem alegar execução; restauração/reconciliar backlog após retomada |
| JOB-013 | Cron SQL sob privilégios mínimos | Não acessa tabelas públicas indevidas, sem bypass RLS indiscriminado |
| JOB-014 | Vercel Hobby cron 1/dia | Registro de incompatibilidade com prazo 40min |
| JOB-015 | Outbox poisoned / muitas falhas | Retry/backoff limitado, evento auditado e revisão manual |
| JOB-016 | Jobs longos e lease vencido | Sem duplo efeito; heartbeat/visibilidade conforme teste |
| JOB-017 | Pool Supabase saturado | Backpressure saudável e nenhuma transação semi-confirmada |
| JOB-018 | Upgrade para executor sempre ativo | Mesmos IDs, idempotência, contratos e reprocessamento sem migration destrutiva |

## Gates

- [ ] VCL-001–008, R2-001–012, JOB-001–018 com evidências reais e ambiente descrito.
- [ ] Frequência, custos e executor escolhido após prova; Supabase Cron é **alternativa de avaliação**, não cron configurado.
- [ ] Credenciais técnicas segregadas, RLS/Data API e limites de consumo testados.
- [ ] Backups offsite/restore exercitados; nenhuma inferência de SLA pela existência do documento.

**Fontes:** [ADR-005](adrs/ADR-005-midia-e-storage.md), [ADR-007](adrs/ADR-007-worker-e-jobs.md), [ADR-008](adrs/ADR-008-controles-operacionais.md), [ADR-009](adrs/ADR-009-selecao-render.md), [ADR-010](adrs/ADR-010-postgresql-supabase.md).


**Atualização de decisão em 12/10/2026:** VCL-004 continua **ensaio planejado**; porém a **escolha Hobby** foi aprovada pelo responsável, não é mais uma sugestão. Elegibilidade e comportamento concreto no deploy ainda devem ser conferidos. [Consolidação](CONSOLIDACAO-FINAL-FASE-03-v0.5.md).
