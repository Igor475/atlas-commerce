# Atlas Commerce — Registro de aprovação das 19 diretrizes arquiteturais

> **ID:** AC-ARCH-APP-001 • **Versão do registro:** 0.5.0 (ratificações posteriores; nome histórico `v0.1` preservado para não quebrar links) • **Data da decisão:** 12/10/2026 (America/Sao_Paulo).  
> **Aprovação:** responsável pelo projeto, expressa nesta conversa após apresentação das 19 recomendações.  
> **Repositório de referência:** `Igor475/atlas-commerce`, `main`, `0c72d73d9a234754242e1fe5a615c618ce4067b4` (consultado antes desta entrega).  
> **Status:** **DIRETRIZES INICIAIS APROVADAS**; não equivale a implementação, testes, homologação ou aceitação irrestrita de cada ADR.

## Interpretação desta aprovação

A escolha abaixo orienta a arquitetura futura e restringe escolhas implícitas do Codex. **A aprovação incide na direção explicitamente apresentada, não em todos os detalhes de implantação.** Quando uma ADR existente disser “proposta”, a direção nela descrita pode estar aprovada por este registro, mas seus parâmetros técnicos e provas continuam pendentes onde indicados. O índice das ADRs deverá ser sincronizado; não reclassificar ADRs completas como homologadas.

Este registro preserva os contratos RN-001–094, as políticas PC-01–04, SEC-001–038, SA-001–012 e os testes CA/AUTH/DB/ST. Em caso de incompatibilidade com requisito normativo, não alterar silenciosamente: abrir mudança rastreável e validar o impacto.

## Quadro das 19 decisões autorizadas

| ID | Diretriz aprovada | Delimitação e vínculo |
|---|---|---|
| **APP-01** | **Monólito modular**, API NestJS e aplicações Next.js/React | [ADR-001](adrs/ADR-001-monolito-modular.md). Separação exata de apps e contratos a validar; não criar microsserviços por padrão. |
| **APP-02** | **PostgreSQL + Prisma ORM v7** como direção inicial, SQL parametrizado em operações críticas e **outbox/inbox transacional** | [ADR-002](adrs/ADR-002-integridade-outbox.md), [ADR-006](adrs/ADR-006-acesso-dados.md). **Aceite de stack condicionado ao spike** com adapter/driver, locks, migrations, pool e DB-001–028; Drizzle/SQL mantidos como fallback justificado. |
| **APP-03** | **Sessões opacas**, revogáveis no backend, em cookie `HttpOnly` e sob autorização server-side | [ADR-003](adrs/ADR-003-autenticacao-sessoes.md). `Secure`, escopo host-only, proteção CSRF e topologia real precisam ser confirmados. |
| **APP-04** | Política inicial de sessão: **cliente 12h absoluta/30min inatividade** e **backoffice 8h/15min** | [ADR-003](adrs/ADR-003-autenticacao-sessoes.md). Ponto de partida aprovado; aplicar relógio do backend e revisar risco/UX antes do deploy. |
| **APP-05** | **MFA obrigatório** para backoffice, **WebAuthn/passkeys prioritário**, **TOTP como alternativa controlada** | [ADR-003](adrs/ADR-003-autenticacao-sessoes.md). Desafio MFA antes da sessão privilegiada, recovery forte e step-up; sem bypass por e-mail. |
| **APP-06** | **Papéis separados** de Cliente, Editor, Estoque, Atendimento, Financeiro solicitante, Aprovador e Administrador de segurança | [Matriz de autorização](security/authorization-matrix.md); DS-003. Papéis são capacidades propostas, não acesso irrestrito nem permissões executáveis já existentes. |
| **APP-07** | **Reembolso manual com solicitação/aprovação por identidades diferentes**, MFA, trilha e limites configuráveis | DA-009/DS-003; [regras críticas](../03-business-processes/POLITICAS-CONSOLIDADAS.md). **Valores de alçada ainda serão definidos**; compensação automática segue guardas próprias. |
| **APP-08** | **Stripe Checkout hospedado em modo de teste**, inicialmente cartões elegíveis e política proposta de reserva **40/30/5** | [ADR-004](adrs/ADR-004-psp-sandbox.md) e [ST-001–016](07-validacao-stripe.md). Stripe já selecionado; **compatibilidade temporal, webhooks, refund e método não homologados**. |
| **APP-09** | **Cloudflare R2 no Free Tier Standard** como provedor escolhido para mídia, com separação entre conteúdo público e privado | [ADR-005](adrs/ADR-005-midia-e-storage.md). Permissões, assinaturas, região/custos e operação ainda exigem configuração/prova. |
| **APP-10** | Upload editorial de **imagens e PDFs autorizados**, com limites, validação e inspeção | DS-006, SEC-012/013. Extensões/MIME/tamanho exatos, malware e quarentena requerem desenho/teste. |
| **APP-11** | Somente mídia **própria, fictícia ou licenciada**, com entitlement por titular, item e licença | DA-008/013; [ADR-005](adrs/ADR-005-midia-e-storage.md). Direitos/termos jurídicos e política de revogação permanecem sujeitos à verificação. |
| **APP-12** | **Outbox persistente e jobs recuperáveis**; worker separado apenas se infraestrutura e volume justificarem | [ADR-002](adrs/ADR-002-integridade-outbox.md), [ADR-007](adrs/ADR-007-worker-e-jobs.md). Sem timers voláteis como única garantia; testar lease, replay e crash. |
| **APP-13** | **Vercel Hobby para Next.js + Render Free Web Service para NestJS + Supabase PostgreSQL Free** (planos escolhidos para demo não comercial) | [ADR-008](adrs/ADR-008-controles-operacionais.md), [ADR-009](adrs/ADR-009-selecao-render.md) e [ADR-010](adrs/ADR-010-postgresql-supabase.md). **Render Free e Supabase como provedor foram escolhidos explicitamente**; plano do Supabase **ainda não foi confirmado**. A disponibilidade é de demonstração, sem operação financeira real. Região, ligação TLS/pool, domínio e executor externo para jobs são gates. |
| **APP-14** | Backups automatizados, **restore testado**, LGPD, logs redigidos e monitoramento | DS-007/008; [ADR-008](adrs/ADR-008-controles-operacionais.md). Sem SLA, RPO/RTO ou retenção numérica inventados; exigem aprovação baseada no ambiente/obrigações. |
| **APP-15** | **OWASP ASVS 5.0** como referencial de seleção por risco, CI/CD e testes automatizados | DS-009, SEC-001–038. Não é certificação ASVS nem prova de segurança implementada. |
| **APP-16** | **Frete simulado determinístico** e **um cupom por pedido**, com controle transacional | DA-007/011. Fórmula/cotação/limites de uso e concorrência sujeitos a cenário e validação. |
| **APP-17** | **Kits comerciais indivisíveis** no MVP; políticas de cancelamento, compensação e reembolso já documentadas | RN-071–094, PC-01–04, DA-004/009. Sem realocação automática de kit misto pago tardiamente; direitos do consumidor permanecem sujeitos a avaliação jurídica. |
| **APP-18** | **Cadastro obrigatório para finalizar checkout**; navegação/carrinho de visitante permitidos | DA-003. Identidade, antienumeração, aprovação comercial e UX devem ser testados. |
| **APP-19** | **Portfólio demonstrativo**, sem cobranças reais nem emissão fiscal automatizada inicialmente | DA-010/014; [ADR-004](adrs/ADR-004-psp-sandbox.md). Publicação comercial posterior exige decisão separada, validação jurídica/fiscal e segurança operativa. |

## Estado formal de implementação e evidências

- **DECISÃO DO PROJETO:** os 19 pontos estão aprovados **como baseline de direção arquitetural** por declaração explícita do responsável.
- **PENDENTE:** confirmação de parâmetros técnicos, análise de segurança/arquitetura concreta e aceitação individual dos aspectos condicionais listados em [VALIDACOES-E-PARAMETROS-PENDENTES.md](VALIDACOES-E-PARAMETROS-PENDENTES.md).
- **NÃO IMPLEMENTADO NESTE PACOTE:** API, UI, integrações, migrations, autenticação, storage, monitoramento e worker.
- **NÃO TESTADO:** cenários SA, AUTH, ST, DB, CA; nenhuma alegação de prontidão para produção.

## Processo de mudança

Se o spike demonstrar inviabilidade relevante (ex.: janela do Stripe), registrar o problema, alternativas, justificativa e impacto em ADR/DA/DS e nas regras PC/CA/SA. O Codex **não poderá alterar unilateralmente** os 19 pontos ou os invariantes. Alterações da baseline necessitam nova aprovação do responsável.

**Referências transversais:** [Índice das ADRs](adrs/README.md), [status da Fase 03](STATUS-DECISOES-FASE-03.md), [gates de validação](06-rastreabilidade-e-gates.md), [guia de sincronização](GUIA-DE-SINCRONIZACAO-DA-APROVACAO.md).

## Decisão complementar de hospedagem — 12/10/2026

O proprietário escolheu **Render como fornecedor inicial do backend NestJS**. Esta decisão **refina APP-13**, sem alterar APP-01–12/14–19 nem homologar um plano específico. O frontend segue direcionado à Vercel; PostgreSQL continua gerenciado com **provedor ainda não escolhido**, e Cloudflare R2 permanece escolhido para objetos. Ver [ADR-009](adrs/ADR-009-selecao-render.md), [topologia](IMPLANTACAO-RENDER.md) e [gates RENDER-001–016](VALIDACAO-OPERACIONAL-RENDER.md).

**Cuidado para a implementação:** o serviço gratuito da Render pode dormir; não depender dele para cron, expiração de estoque, retry de webhooks/refunds ou processamento contínuo. O uso de plano sempre ativo e serviço de tarefas separado é uma **recomendação condicionada à necessidade e orçamento**, não compra autorizada nem deploy executado.

## Ratificação posterior de infraestrutura (12/10/2026)

A direção APP-13 foi atualizada por escolha explícita do responsável: **Render Web Service em plano Free**, **Supabase como provedor PostgreSQL**, e **Vercel** para o frontend já aprovado. A utilização do **Supabase Free é recomendada para portfólio, mas não foi confirmada pelo responsável**, portanto não tratá-la como decisão tomada.

Permanece em vigor a ADR-003 para autenticação **no NestJS**, sem adoção implícita de Supabase Auth; e a APP-09/ADR-005 para **Cloudflare R2**, sem mudança para Supabase Storage. Runtime, migrations, RLS/Data API, backups e jobs têm gates na [ADR-010](adrs/ADR-010-postgresql-supabase.md) e [SUPABASE-001–016](VALIDACAO-OPERACIONAL-SUPABASE.md).

**Esta ratificação substitui somente a escolha do provedor do banco e plano Render descritos em textos mais antigos; nenhum código, deploy ou prova foi executado.**

## Ratificação adicional de frontend, storage e processamento — 12/10/2026

O responsável **confirmou Vercel como provedor** e **Cloudflare R2 Free Tier Standard** como nível inicial para arquivos. A escolha de Hobby para Vercel **não foi explícita**, mas é recomendada para portfólio pessoal não comercial, observados os Termos da Vercel. Essa ratificação altera APP-09 e complementa APP-13 sem mudar a aprovação das outras diretrizes. A franquia R2 não impede cobranças excedentes. **O plano do Supabase continua pendente**.

A direção APP-12 (outbox/inbox duráveis) permanece aceita. O desenho operacional [ADR-007](adrs/ADR-007-worker-e-jobs.md) foi detalhado com cron Supabase **somente como hipótese condicionada a teste**, não como executor habilitado; nenhuma execução contínua é garantida em infra Free. Ver [registro](DECISOES-VERCEL-R2-FREE-E-JOBS.md) e [plano JOB/R2/VCL](VALIDACAO-VERCEL-R2-JOBS.md).


## Ratificação final de planos — 12/10/2026 (APP-13 / DS-008)

**APROVADO EXPLICITAMENTE pelo responsável:** **Vercel Hobby** para frontend Next.js e **Supabase Free** para PostgreSQL. Permanecem **Render Free** para NestJS, **Cloudflare R2 Free Tier Standard** para mídia e **Stripe test mode** para pagamento. Esta ratificação **substitui as menções históricas deste documento** a “Hobby apenas recomendado” e “Supabase Free ainda a confirmar”. Não altera os demais APP-01–19.

**Vercel Hobby** restringe uso à finalidade pessoal/não comercial e tem limites de invocações/execução; não é plano para venda real. **Supabase Free** tem limite de tamanho, possibilidade de pausar por baixa atividade, e não oferece backups diários gerenciados; preparar exportação protegida e restauração testada, sem assumir PITR. **Render Free** pode dormir; **cron/jobs financeiros não são garantidos** pela API suspensa. Não apresentar disponibilidade 24×7, SLA ou processamento pontual como homologados.

**Autoridade documental atual:** [Consolidação final Fase 03](CONSOLIDACAO-FINAL-FASE-03-v0.5.md) · [status ADR-001–010](STATUS-ADR-APROVACAO-2026-10-12.md) · [gates de validação](VALIDACOES-E-PARAMETROS-PENDENTES.md) · [transição Fase 04](HANDOFF-FASE-04.md). A arquitetura está escolhida para **demonstração**, não executada/testada.
