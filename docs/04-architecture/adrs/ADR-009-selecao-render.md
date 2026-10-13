# ADR-009 — Render como hospedagem inicial do backend NestJS

> **Estado:** **DIREÇÃO E PLANO FREE ACEITOS** em 12/10/2026; **infraestrutura detalhada e comportamento operacional não homologados**.  
> **Baseline:** AC-ARCH-APP-001, APP-13, ADR-001/002/003/004/006/007/008, DA-014 e DS-008.  
> **Versão:** 0.2.0 • **Escopo:** backend de demonstração do Atlas Commerce.

## Contexto e decisão

O Atlas Commerce permanece **monólito modular NestJS**. Seu **backend será inicialmente hospedado na Render, no plano Free**, no modelo **Web Service público** que recebe requisições HTTPS do frontend e webhooks do Stripe. A escolha foi aprovada; não significa conta ou deploy efetivamente provisionados.

- **Frontend:** Next.js na Vercel (APP-13). A decisão de usar `apps/storefront` e `apps/admin` separados depende da organização final da aplicação; o modelo não exige criar dois serviços hoje.
- **Backend:** um Web Service NestJS na **Render Free**; aceitar pausa/restart e limites de uso, sem promessas de uptime.
- **Banco:** **Supabase PostgreSQL** escolhido para o projeto, não Render Postgres. **Supabase Free aprovado**. [ADR-010](ADR-010-postgresql-supabase.md) regula conexão, segurança, backup e restauração.
- **Mídia:** Cloudflare R2 com separação entre objetos públicos autorizados e privados; segredos no backend.
- **Pagamentos:** Stripe Checkout incorporado **em modo teste**, conforme [adendo posterior ADR-004](ADR-004-ADENDO-UI-EMBEDDED.md); webhook na API validado por assinatura do corpo original.
- **Jobs:** outbox/inbox no PostgreSQL como fonte durável; cron/worker como serviço **adicional condicional**, definido pela ADR-007, e jamais dependente da continuidade de um processo Free suspenso.

## Plano Free versus operação contínua

A Render documenta que o plano **Free Web Service** pode entrar em suspensão após **15 minutos de inatividade** e demorar cerca de **um minuto** para retornar; não possui disco persistente. Pode sofrer reinícios e possui limites de instâncias/uso. **Aceitável para portfólio puramente demonstrativo, sem obrigação de pontualidade**. Não é apropriado como único executor para reservas com TTL 40 min, reconciliação de pagamento, reembolsos pendentes ou fulfillment recuperável.

**Recomendação condicionada:** quando forem executados **fluxos ponta a ponta com Stripe em modo de teste**, optar por Web Service em **plano sem suspensão por inatividade** e prover disparo/reexecução de jobs duráveis por Render Cron Job/Background Worker (ou alternativa externa com dedup e locks). Nem o serviço pago isolado garante exatamente-once, cron infalível ou atendimento automático a SLA.

**Não usar serviços externos de ping para disfarçar limitações do Free**. Não interpretar health check como mecanismo de garantia de execução de tarefas. O serviço HTTP apenas recebe/reconhece eventos e persiste intenção recuperável antes de confirmar processamento.

## Requisitos de deploy propostos (sem código)

1. Serviço Node conectado a um repositório GitHub após divisão/estrutura de aplicações aprovada. O processo deve escutar `0.0.0.0` e a porta injetada por `PORT`; não fixar `localhost:3000` em produção.
2. Health checks: rota liveness simples sem expor segredos e rota readiness que verifica dependências mandatórias sem operações pesadas. Escolher HTTP health check apropriado quando houver API.
3. TLS na borda da Render, `trust proxy` restrito/configurado corretamente, cookies e CSRF coerentes com Vercel + API; domínio same-origin/cross-origin depende de topologia, ainda **não aprovado**.
4. Segredos Stripe, PostgreSQL, R2 e fatores MFA segregados por ambiente, fora do Git e do frontend. `sk_test_` e `whsec_` específicos de destino; produção não ativa neste MVP.
5. PostgreSQL com TLS e pool global sob limites reais; executar migrations por fluxo controlado, com credencial diferente de runtime quando viável. Deploy deve tolerar restart sem duplo efeito.
6. Escrita persistente apenas em PostgreSQL/R2, **nunca** no filesystem efêmero. `outbox`, reservas, sessões, refunds, tentativas PSP e locks não residem em memória volátil.
7. Definir região com latência/custo a medir entre Render, PostgreSQL gerenciado, Vercel, Stripe e R2; external egress pode ser tarifado segundo plano contratado.
8. Logs estruturados/redigidos, ID de correlação, erros de webhook/refund/cron, alertas acionáveis; backups/restore e RPO/RTO dependem da plataforma real, sem números inventados.

## Alternativas

- **Render Web Service** (selecionada) oferece simplicidade de deploy e integração Git.
- VPS autogerenciada (não escolhida inicialmente) exigiria patching, TLS, backup e observabilidade próprios.
- Outro PaaS gerenciado (não escolhido) pode ser reconsiderado se incompatibilidade de custo/execução for demonstrada.

A migração futura não deve exigir separar domínios em microsserviços; contratos de port/adapter e segredos por ambiente favorecem portabilidade.

## Critérios de saída e riscos residuais

- [x] Render escolhida para backend inicial; Web Service como tipo de serviço proposto.
- [x] Decidir **Render Free**, apenas demonstração tolerante a suspensão; orçamento e futuro plano sempre ativo seguem condicionados.
- [x] Definir fornecedor banco: **Supabase PostgreSQL**.
- [x] **Plano Supabase Free escolhido.**
- [ ] Região, ligação TLS/Supavisor, roles e política real de backup/restore seguem por validar.
- [ ] Definir execução de expirador, replay outbox, retry Stripe/refund com job/worker independente; validar custo e frequência.
- [ ] Exercitar [RENDER-001–016](../VALIDACAO-OPERACIONAL-RENDER.md) com CI, deploy, restart, segurança, banco e restore, e validar ST/DB/SA correlatos.
- [ ] Validar hostname, ingress/cookie/CSRF e segredos test/live; nenhum ambiente real foi inspecionado nesta decisão.

**Conclusão:** decisão de **fornecedor aceita**, operação **não homologada**, nenhum código ou infraestrutura implantados por esta ADR.

## Fontes oficiais consultadas (12/10/2026)

- [Web Services](https://render.com/docs/web-services)
- [Limitações dos serviços Free](https://render.com/docs/free)
- [Health Checks](https://render.com/docs/health-checks)
- [Cron Jobs](https://render.com/docs/cronjobs)
- [Background Workers](https://render.com/docs/background-workers)
- [Planos de computação](https://render.com/docs/compute-plans)
- [Outbound Bandwidth](https://render.com/docs/outbound-bandwidth)

## Complemento operacional — Render Free + Supabase

- Spindown após 15 minutos sem requisição HTTP/WebSocket pode atrasar webhooks e interrompe executores residentes em memória; acordar por uma requisição não cria garantia de expiração/reconciliação pontuais. Stripe test mode e fluxos de demonstração devem tolerar estado **PENDING/RECONCILIATION_REQUIRED** e retomar de outbox/inbox persistente.
- Limite da Render Free: sem worker/background gratuito, sem disco persistente, sem one-off job/shell e **saída SMTP 25/465/587 bloqueada**. Para e-mail de verificação/recovery, avaliar API HTTPS de provedor externo com segredos de backend (ou adiar esses fluxos demonstrativos). Não assumir envio SMTP local.
- O Supabase persiste fatos de negócio mesmo com API dormindo, **mas não executa automaticamente o worker do NestJS**. Agendador independente, custos e operação continuam pendentes; não introduzir `pg_cron`/Edge Functions como solução sem nova ADR/validação de plano/permissões.
- Render→Supabase: TLS e pool pequeno, preferir Supavisor session mode 5432 se conexão direta IPv6 não comprovada; não usar URL de banco no browser. Separar runtime de migrations. Não assumir que plano Supabase Free já foi escolhido.
- Segurança do acesso, RLS/Data API, migrador e suporte Prisma v7 devem ser testados com ambiente real; ver [ADR-010](ADR-010-postgresql-supabase.md), [guia de conexão](../CONEXAO-RENDER-SUPABASE.md) e [SUPABASE-001–016](../VALIDACAO-OPERACIONAL-SUPABASE.md).

**Referências:** https://render.com/docs/free • https://supabase.com/docs/guides/database/connecting-to-postgres • https://supabase.com/docs/guides/platform/free-project-pausing


## Ratificação de hospedagem v0.5

O frontend hospedado será **Vercel Hobby**, escolhido explicitamente para **demonstração não comercial**; o banco PostgreSQL será **Supabase Free**, explicitamente confirmado. Render Free permanece decisão firme. Isso não resolve a execução de jobs em background nem a janela 40/30/5 do Stripe. Evidências RENDER/SUPABASE/VCL continuam faltando. [Estado consolidado](../CONSOLIDACAO-FINAL-FASE-03-v0.5.md).
