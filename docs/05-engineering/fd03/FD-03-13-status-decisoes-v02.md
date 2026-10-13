# FD-03-13 — Registro de decisões ratificadas e pendências (13/10/2026)

## Decisões explícitas do responsável (RATIFICADAS)

**FD-03-R01 — Arquitetura de navegação aprovada:** store `apps/storefront`, admin `apps/admin`, IA e jornadas principais da FD-03 aceitos como arquitetura de informação; ainda não significam telas implementadas nem aprovação do desenho visual final.

**FD-03-R02 — Cobertura adicional obrigatória no planejamento:** login, cadastro, verificação de e-mail, recuperação/redefinição de senha, favoritos, ofertas, lançamentos, conta/endereço/pedidos, políticas e estados críticos devem figurar nos mapas e mockups. Registrar com P16–P50 e A09–A14; rotas e contratos ainda candidatos.

**FD-03-R03 — Stripe dentro do checkout Atlas:** não iniciar a experiência de pagamento por redirect para Stripe hosted. Escolher **Stripe Checkout formulário incorporado**, sujeito ao modo enum da versão API (consultar documentação atual), segurança e validação Test Mode. Não implica processar cartão no backend nem aceitar novos métodos de pagamento.

## Consequências de governança

1. ADR-004 original menciona Checkout hosted. A decisão explícita posterior de UX **substitui essa modalidade de apresentação**, mantendo Stripe, BRL, Test Mode, card inicial, regras 40/30/5 e toda a segurança. Registrar adendo agora e sincronizar documento original antes do código.
2. CT-01/02 e OpenAPI atualmente retornam `checkoutUrl`, não apropriada ao fluxo embedded. A forma nova deve ser versionada e comprovada pelo SDK; não gerar `clientSecret` de testes fictício.
3. **UXD-16 — ratificação expressa posterior em 13/10/2026:** [registro do responsável](../contracts/UXD-16-RATIFICACAO-RESPONSAVEL.md). `reservationExpiresAt` sempre presente: string UTC/RFC 3339 da reserva real em físico/kit misto, null no exclusivamente digital/kit digital. A antiga pendência nulo/ausente foi encerrada somente para esse campo; sem prazo físico fictício e sem homologar os demais CT-10/Stripe.
4. **DS-003** alçadas de refund, MFA/step-up e nomes de permissões continuam pendentes. Não ampliar direitos de staff por navegação.
5. Inclusão de favoritos, ofertas, avaliações/marketing e páginas jurídicas no sitemap **não autoriza API, banco ou alegações comerciais** sem contrato e conteúdo revisado.
6. F04-05 Supabase L1 segue não homologado; Render Free/Vercel Hobby/Supabase Free/R2 Free permanecem solução demonstrativa, não sistema comercial apto a dinheiro real.

## Prioridade das referências

As **nove capturas escolhidas** em `docs/05-engineering/FD-02-referencias-visuais-usuario.md` continuam direcionando a loja. Não reintroduzir TASCHEN ou Penguin Random House como referências ativas. Na FD-04 propor 2–3 conceitos autorais; na FD-05 criar mockups separados por página e viewport. Backoffice exige linguagem operacional própria, sem template genérico.

## Limites de aprovação

| Objeto | Estado |
|---|---|
| Sitemap, jornadas base, complementação de inventário | APROVADOS conceitualmente |
| Checkout incorporado ao site | APROVADO como direção de UX/integracão |
| Stripe embedded: SDK, enum concreto, CSP e fluxos bancários | PENDENTE DE SPIKE |
| Stripe 40/30/5, webhooks e refunds | PENDENTE DE ST |
| OpenAPI e resposta do checkout, digital puro | SOMENTE UXD-16 RATIFICADA EM 13/10/2026; demais CT-10 PROPOSTOS, sem implementação/homologação |
| Fav/reviews/ofertas e endpoints de identidade | PROJETADOS / CONTRATOS PENDENTES |
| Identidade visual, logo, design system, telas finais | FD-04/05 PENDENTES |

**Não editar normas vigentes automaticamente.** Usar o prompt de sincronização, auditar diffs e manter histórico/links.
