# ADR-008 — Infraestrutura, segurança operacional e recuperação

> **Status:** **DIREÇÕES DE PROVEDOR APROVADAS**, controles técnicos **NÃO IMPLEMENTADOS OU HOMOLOGADOS**. Data: 12/10/2026. Derivação: APP-13/14/15, ADR-009/010, DS-007–009, SEC-028–038, RNF-004/005/010–012.

## Topologia aprovada e limites

| Serviço | Escolha | Limitação e gate |
|---|---|---|
| Frontend Next.js | **Vercel** escolhido | **Hobby** recomendado somente se uso pessoal **não comercial**; modalidade concreta ainda exige compatibilidade com os termos |
| API NestJS | **Render Web Service Free** | Pausa após 15min sem tráfego, cold start e FS efêmero; não manter job crítico apenas na API |
| Banco | **Supabase PostgreSQL** | Plano não confirmado; Free tem pausa e não fornece backups recuperáveis gerenciados como planos pagos |
| ORM | **Prisma v7** preferencial | Adapter, TLS, Supavisor/pool e migrações sujeitos a spike real |
| Pagamento | **Stripe Checkout test mode** | Sem cartão real; testar 40/30/5, webhook e refund antes de release |
| Mídia | **Cloudflare R2 Standard dentro do Free Tier** | Franquia mensal não é limite rígido de faturamento; privados nunca públicos |
| Jobs | Outbox/inbox PostgreSQL | Executor e frequência ainda condicionados; [ADR-007](ADR-007-worker-e-jobs.md) |

## Decisões de segurança e operação

1. **Separação de origens:** HTTPS, host-only cookies `__Host-`, proxy confiável, CSRF e CORS restrito. Domínio próprio ainda não foi informado, portanto valores reais de cookie/origin ficam abertos. Next.js não deve armazenar cookie de sessão em cache compartilhado.
2. **Segredos:** Stripe `sk_test`/`whsec` só no Render/ambiente autorizado, R2 S3 credentials somente backend; Supabase DB URL com TLS e usuário mínimo. Nunca em `NEXT_PUBLIC_*`, Git, screenshots ou logs.
3. **Supabase:** quando esquema PostgreSQL é consumido só por NestJS, preferir schemas privados/limitar Data API exposta; nenhuma adoção de Supabase Auth nem Storage. Se uma tabela for exposta à Data API, analisar GRANT+RLS+policy de titularidade e executar testes negativos.
4. **R2:** classes de mídia pública/privada fisicamente separadas, link temporário por entitlement e licença; ver [ADR-005](ADR-005-midia-e-storage.md). Limites/alertas de operações são exigidos para franquia gratuita.
5. **Confiabilidade:** banco/outbox determinam verdade. API dormindo e scheduler sem precisão não podem conceder estoque ou acesso digital indevidamente. Processamentos atrasados são reexecutados e auditados, sem alegar pontualidade; migrar para executor always-on antes de venda real.
6. **Backup e restauração:** definir exportação lógica independente para Supabase Free, política de retenção e teste de restauração separado. Inventariar objetos R2/metadata e garantir que backups sejam suficientes para reconstrução. Não inventar RPO/RTO numérico.
7. **Operação:** logs estruturados sem PII, IDs opacos, métricas de `payment_review_age`, refund incerto, backlog outbox e reservas vencidas não liberadas; alertas e procedimento de incidente/restauração.
8. **CI/segurança:** ASVS 5.0 baseado em risco, dependências travadas, secret scan e testes CA/SA/AUTH/DB/ST/JOB/R2; nada declarado implementado nesta fase.

## Bloqueios de deploy comercial

- Revisão jurídica/fiscal/licenças/LGPD e termos de uso comercial Vercel; **Hobby não é elegível para operação comercial**.
- Backend/DB/executor com disponibilidade real, processamento pontual recuperável, observabilidade, backups/restore e provas de integrações.
- Stripe test mode convertido apenas mediante autorização separada, homologação de domínio/segurança, webhook/cobranças reais e conformidade.

## Evidências exigidas

[Render RENDER-001–016](../VALIDACAO-OPERACIONAL-RENDER.md) · [Supabase SUPABASE-001–016](../VALIDACAO-OPERACIONAL-SUPABASE.md) · [R2, Vercel e jobs](../VALIDACAO-VERCEL-R2-JOBS.md).

**Documentar não equivale a deploy/teste.**
