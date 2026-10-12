# Atlas Commerce — Validações e parâmetros após a aprovação da baseline

> **Estado:** pendências **não resolvidas** pela aprovação das 19 diretrizes. Este é um quadro de gates, não uma nova escolha de arquitetura.

## Decisões de detalhe que ainda podem exigir o responsável

| Grupo | O que a direção já resolve | O que ainda precisa ser definido com contexto real |
|---|---|---|
| **Identity / DS-001/002** | Sessão opaca, cookies seguros, cliente 12h/30m, staff 8h/15m, passkeys + TOTP controlado | Domínios e proxy, bootstrap primeiro admin, TOTP/recovery, mudança de e-mail, recent-auth por operação; ratificar ajustes de UX e política de sessão após teste |
| **Financeiro / DA-009/DS-003** | Papéis separados, solicitante/aprovador diferentes, MFA/step-up | **Valores numéricos de alçada**, exceções justificadas, papéis reais, revisão jurídico-fiscal |
| **Stripe / DS-004** | Stripe + Checkout hospedado, test mode, cartões inicialmente, janela proposta 40/30/5 | **Prova em sandbox de expiração absoluta**, pagamento tardio, assinatura do webhook, eventos, idempotência, refund, 3DS, disponibilidade de métodos; se inviável, **nova decisão de política** |
| **Dados / ADR-006** | PostgreSQL + Prisma v7 como preferência inicial; outbox/SQL parametrizado | Versões fixadas, adapter PostgreSQL, migrations, isolamento, índices, pool, timeouts, DB-001–028, restore e métricas |
| **Mídia / DS-005/006** | Cloudflare R2, previews públicos e arquivos integrais privados, imagens/PDF | Buckets/credenciais por ambiente, limite de arquivo/tipo, scanner, TTL assinado, retenção, licença efetiva, custo/egress |
| **Jobs / ADR-007** | Outbox durável, sem garantia apenas por timer | Se haverá worker separado, lock/lease e janelas de execução; depende do provedor backend e do orçamento |
| **Hosting / DA-014/DS-008** | **Vercel frontend + Render Free backend + Supabase PostgreSQL** | Plano **Supabase** ainda a confirmar; domínio, região, orçamento, Supavisor session pooler, TLS, segregação de credenciais, backups/export/restore e limites Free. Render Free não suporta jobs confiáveis em memória. |
| **Legal/privacidade / DS-007** | Somente demo sem venda real; dados minimizados e backups | Inventário LGPD, prazo de retenção, política de privacidade, autorização de assets, obrigações comerciais/fiscais antes de operação real |
| **Segurança / DS-009** | Referencial ASVS 5.0 e CI automatizado | Controles aplicáveis por risco, responsabilidade de testes, evidências e limites de release |
| **Comercial / DA-007/011** | Frete deterministicamente simulado e um cupom | Tabela/regiões de frete, validade de cotação, reuso/cancelamento do cupom e exemplos de aceite |

## Evidências que dependem de ensaios técnicos, não de uma simples confirmação

1. **ST-001–016:** Stripe test mode, 40/30/5, webhook, reconciliabilidade, refunds e métodos elegíveis — [plano](07-validacao-stripe.md).
2. **DB-001–028:** PostgreSQL concorrente real, locks, transação, migrations, pool e recuperação — [plano](database/DB-05-plano-de-validacao.md).
3. **AUTH-001–020:** sessões, logout, MFA, recuperação, CSRF, autorização e step-up — [plano](09-cenarios-aceite-autenticacao.md).
4. **CA-001–026 / SA-001–012:** comportamento de negócio e segurança sob testes de integração/E2E com evidência, não apenas documentação.
5. **BPMN:** validação em ferramenta BPMN compatível ainda não executada; diagramas Mermaid/DOT não substituem validação semântica de processos.
6. **Operação:** restore real, logs/alertas e segurança de segredos em provedor escolhido antes de alegar prontidão.

## Critérios para liberar prompts de implementação do Codex

- Cada prompt cita a baseline aprovada, as ADRs relevantes, a versão do GitHub e **arquivos permitidos**.
- **Spike experimental** pode começar antes da homologação de tecnologia apenas com limites explícitos, testes e sem efeitos reais; não se apresenta como implementação pronta.
- A construção de funcionalidades dependentes (estoque, refund, autenticação, entrega digital) só avança além dos spikes quando seus **contratos, riscos e políticas** estiverem suficientemente definidos e testáveis.
- Logs, caminhos alterados, migrações e resultados de teste devem ser apresentados com precisão; nada de alegar teste executado quando for apenas planejamento.
- Não inserir chaves de Stripe, storage, secrets, conteúdo licenciado de terceiros ou credenciais em documentação/repositório.

## Gate específico — Render Web Service (novo em 12/10/2026)

- [x] Fornecedor inicial do backend: **Render** (decisão do proprietário).
- [x] Plano de computação **Render Free** escolhido explicitamente para demonstração tolerante a suspensão e latência. **Não liberado para vendas reais nem garantia de processamento pontual**; migrar execução para ambiente sempre ativo antes de depender de jobs críticos.
- [ ] Agendamento/executor durável: Render Cron Job ou Background Worker quando necessário, ou agendamento externo controlado com DB locks e dedup. Não depender de loop/`setTimeout` no Web Service Free.
- [x] Provedor PostgreSQL escolhido: **Supabase** (não Supabase Auth/Storage).
- [ ] Confirmar plano Supabase (Free recomendado inicialmente), região, TLS, modo Supavisor session 5432 vs direct IPv6, pool/driver Prisma v7 e permissões runtime/migrations.
- [ ] Endpoint HTTPS, `0.0.0.0:$PORT`, health HTTP apropriado, trust proxy, cookies, origem Vercel, CORS/CSRF, segredo Stripe de cada ambiente e logs redigidos.
- [ ] Provar em RENDER-001–016: deploy, pausa/restart, atraso, cron/recovery, callbacks assinados, restore, observabilidade e custos.

Ver [ADR-009](adrs/ADR-009-selecao-render.md), [implantação](IMPLANTACAO-RENDER.md) e [gates](VALIDACAO-OPERACIONAL-RENDER.md). A decisão de hospedagem **não** implica que a stack ou a segurança já está em execução.

## Gate específico — Supabase PostgreSQL (novo em 12/10/2026)

- [x] **Fornecedor Supabase decidido** como PostgreSQL do Atlas Commerce.
- [ ] Confirmar plano Supabase Free/Pro; Free é recomendado para MVP demonstrativo, **ainda não aprovado explicitamente**. No Free, considerar suspensão por baixa atividade, sem backups diários gerenciados e limites de conexão/cota.
- [ ] Configurar NestJS→Supabase com pool pequeno, SSL/TLS verificável, **Supavisor session mode 5432** como opção preferencial quando conexão direta IPv6 não estiver disponível, verificando host real no Dashboard. Migrations com conexão adequada e credencial de deploy separada.
- [ ] Usar **PostgreSQL server-side via Prisma**; não habilitar Supabase Auth/Storage/Realtime/REST automaticamente. Se a Data API não for necessária, desabilitar ou impedir exposição indevida; schema/tabelas expostos exigem RLS e grants revisados.
- [ ] Exercer [SUPABASE-001–016](VALIDACAO-OPERACIONAL-SUPABASE.md) e restore real antes de alegar recuperação. Exportações independentes não são backups automáticos gerenciados.
- [ ] Assumir **outbox/inbox no banco persistindo**, porém seu processamento não ocorre pontualmente quando o Render Free está suspenso. Executor independente de API e orçamento seguem em aberto.

Ver [ADR-010](adrs/ADR-010-postgresql-supabase.md), [guia de conexão](CONEXAO-RENDER-SUPABASE.md) e [testes Supabase](VALIDACAO-OPERACIONAL-SUPABASE.md).

## Gates complementares Vercel / R2 Free / jobs (12/10/2026)

- [x] Vercel: fornecedor do frontend confirmado; [ ] Plano Hobby/Pro conforme elegibilidade e uso real (**Hobby não comercial**).
- [x] R2: **Standard Free Tier escolhido**, monitorar 10 GB-mês/1M Class A/10M Class B; [ ] billing, buckets, chaves, revogação real de URL, limites e licenças (R2-001–012).
- [x] Outbox persistente permanece obrigatória; [ ] executor de jobs com suporte e frequência reais, Supabase Cron quando elegível e seguro, ensaios JOB-001–018.
- [ ] Supabase **plano** ainda a confirmar; fornecedor PostgreSQL já decidido.
- [ ] Validar frontend VCL-001–008 e não usar Vercel Hobby Cron (1/dia) para expirar reserva de 40min.

Referências: [Vercel/R2/Jobs](DECISOES-VERCEL-R2-FREE-E-JOBS.md), [ADR-005](adrs/ADR-005-midia-e-storage.md), [ADR-007](adrs/ADR-007-worker-e-jobs.md), [validação](VALIDACAO-VERCEL-R2-JOBS.md).
