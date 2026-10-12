# F04-11 — Decisões ainda abertas, ordenadas por bloqueio

> **Importante:** as decisões abaixo **não** anulam a aprovação das 19 diretrizes nem Vercel Hobby/Render Free/Supabase Free/R2 Free. Elas exigem detalhe ou ensaio em escopo específico.

| Prioridade | Decisão / parâmetro | Sugestão e limite |
|---|---|---|
| **P0 para bootstrap** | **Monorepo físico: duas apps Next.js ou uma** | **Recomendação: `apps/storefront` + `apps/admin` separados**, um `apps/api`, pnpm workspace; aceite explícito antes de criar código. |
| P0 para bootstrap | Node LTS/pnpm/Next/Nest/Prisma/TS compatíveis | Fixar no prompt após verificar matrizes e SDK/adapter; um lockfile. |
| **P0 para auth** | Hosts reais, cookie `__Host-`, proxy, CSRF, WebAuthn RP ID | Iniciar com dois hosts demo/localhost, ensaiar efetivamente redirecionamentos/headers; não inventar domínio. |
| **P0 para dados** | Pool Supabase session mode, role runtime/migration, região | Testar TLS/driver/Prisma; usuário libera acesso e segredos quando desejar; nada é criado automaticamente. |
| P1 para catálogo/media | Buckets públicos/privados R2, limites MIME/tamanho, licença e retenção | Escolher política de objetos/previews e quotas após testes R2. |
| P1 para financeiro | Valores de alçada e procedimento de recuperação de MFA de aprovador | Pedir decisão antes do fluxo manual real, manter matriz DS-003. |
| P1 para notificações | Provedor de e-mail com API HTTPS | Necessário para verificar contas/recovery sem SMTP da Render Free; escolher quando implementar Identity. |
| **P1 para estoque/Stripe** | Validação temporal 40/30/5 e recuperação sem worker 24×7 | Invariante no DB primeiro; Stripe ST e JOB com atraso; se não compatível, revisão de RN/DA/ADR. |
| P1 para operação | Backups/export/restore e executor independente | Supabase Free/Render Free não garantem continuidade; upgrade/worker pago só com aprovação e caso real. |
| P2 para domínio público/comércio | Termos/privacidade/LGPD, fiscal/licença de cada obra | **Fora do MVP demonstrativo**; bloqueio para qualquer venda real. |

**Nota de segurança:** a disponibilidade ou não de um domínio não autoriza desabilitar cookies seguros/CSRF/MFA nem migrar a autenticação para Supabase Auth por conveniência. Referências: [F04-01](F04-01-estrutura-monorepo.md), [F04-09](F04-09-matriz-de-gates.md), [handoff](../04-architecture/HANDOFF-FASE-04.md).
