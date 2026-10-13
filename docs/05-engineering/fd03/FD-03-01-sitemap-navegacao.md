# FD-03-01 — Sitemap e organização de navegação

> **ARQUITETURA CONCEITUAL APROVADA — FD-03 v0.2.** Os caminhos abaixo são **URLs candidatas do Next.js**, não rotas existentes nem endpoints HTTP da API. A confirmação em FD-04/05 exige revisão de SEO, canonical, legibilidade, idioma e contratos.

## Loja (`apps/storefront`) — 6 contextos de navegação

| Contexto | Entrada | Páginas/funções | Permissão |
|---|---|---|---|
| Descobrir | `/`, `/catalogo`, `/categoria/[slug]` | Home editorial, categorias configuráveis, coleções/temas, listagem | Público |
| Buscar | `/busca?q=...` | Resultados, filtros, ordenação, busca vazia, sugestões | Público; sem PII |
| Avaliar | `/produto/[slug]`, `/amostra/[id]` **(candidato)** | Ficha por formato, kit com composição fixa, atributos, prévia pública licenciada | Público apenas se publicado/autorizado |
| Comprar | `/carrinho`, `/checkout` **(orquestração)** | Carrinho visitante, autenticação obrigatória, cotação e componente Stripe incorporado | Carrinho público; checkout cliente autenticado |
| Acompanhar | `/minha-conta`, `/meus-pedidos`, `/pedidos/[id]`, `/minha-biblioteca` | Perfil/endereço, histórico, estado PSP, downloads temporários | Titular da conta |
| Assistência | `/ajuda`, `/privacidade`, `/termos`, `/entrega-e-devolucao` **(candidatos)** | Políticas e ajuda conforme textos reais revisados | Público; publicação legal a validar |

**Busca/navegação:** no topo, oferecer acesso a catálogo e busca; menus de categorias são gerados da taxonomia publicada, sem forçar Bíblia/EBD como categorias. Sem atribuir avaliações, rankings, promoções ou descontos sem dados/decisão. Nome e hierarquia exatos de menus permanecem abertos.

**Checkout:** a página própria da loja explica/resume dados, endereços, frete simulado, cupons e revisão **antes de montar o componente oficial Stripe Checkout na própria página Atlas (P47)**. Não criar campos próprios de PAN/CVV, Pix/boleto ou guest checkout a partir da referência. Callback do componente ou eventual `return_url` bancária sinalizam apenas andamento/retorno; a página lê `GET /api/v1/me/orders/{orderId}` e mostra 'aguardando confirmação' se necessário.

**Autenticação:** entrar, criar conta, verificação de email, recuperação e MFA administrativo exigem inventário técnico próprio quando seus contratos forem aprovados; não inventar endpoints por causa do sitemap. Não compartilhar sessão de cliente com staff.

**Cobertura do inventário:** Descobrir → P01/P02 (catálogo global e categoria compartilham a família de listagem); Buscar → P03; Avaliar → P04–P07 (amostra é a experiência pública parcial de P05/P06); Comprar → P08/P09; Acompanhar → P10–P13; Assistência → P14. P15 cobre a autenticação citada acima, sem fixar URLs ou criar contratos. A apresentação de resultado P10/P48 permanece candidata, vinculada ao pedido e à decisão UXD-07. Ver [inventário](FD-03-03-inventario-telas-estados.md).

## Backoffice (`apps/admin`) — navegação orientada a tarefas

| Área candidata | Conteúdo/fluxo | Acesso previsto |
|---|---|---|
| Visão operacional | pendências/revisão, backlog recuperável, alertas sem dados sensíveis indiscriminados | staff e capability |
| Catálogo & mídias | obras, edições, publicação, mídias autorizadas, prévias | editor |
| Estoque & reservas | posição por SKU, ajustes auditados, expiradas, kits | operador de estoque |
| Pedidos & atendimento | pesquisa operacional, solicitação de devolução e caso de suporte | escopo atendimento |
| Financeiro | pedidos de refund, aprovações separadas, casos `PAYMENT_REVIEW` | financeiro com MFA/step-up |
| Segurança & auditoria | gestão de staff/fatores, registros auditáveis, falhas críticas | security admin com limites |

**Proibição:** menu visível ≠ autorização. Ações administrativas só aparecem com capability e são negadas no backend por padrão. Admin de segurança não pode aprovar reembolso por implicação de cargo.

**Cobertura admin:** A01 é o acesso staff/MFA anterior às áreas; A02 corresponde à visão operacional; A03–A07 correspondem às cinco áreas restantes. A08 é observabilidade opcional associada à visão operacional, **pendente de aprovação de escopo e contrato**, sem endpoint de replay criado por inferência. Papéis, alçadas e exceções continuam propostas DS-003; ocultar menu não concede autorização.

## Cobertura ampliada aprovada para planejamento

[FD-03-09](FD-03-09-inventario-completo-paginas.md) é a fonte dos detalhes/URLs candidatos, sem redefinir as famílias antigas:

| Contexto | IDs cobertos |
|---|---|
| Descobrir | P01/P02, P22–P28: ofertas, lançamentos, coleções, autores, editoras, temas e comparação (evoluções conforme inventário) |
| Buscar | P03: resultados, filtros e estados vazios/erro |
| Avaliar | P04–P07: físico, e-book, revista/amostra e kit |
| Comprar e identificar | P08/P09/P15, P16–P20, P47–P49: cadastro, verificação, login/recovery, Stripe incorporado, resultado e retomada |
| Acompanhar e conta | P10–P13, P21, P29–P36, P38: favoritos, perfil/endereço/segurança, pedidos, entrega, biblioteca, preferências e devolução |
| Assistência e estados globais | P14, P37, P39–P46, P50: suporte, FAQ, institucional, políticas, acessibilidade, 404, indisponibilidade e conteúdo genérico |

A09 detalha A07; A10 → A03; A11 → A04; A12 → A05; A13 → A06; A14 → A07/A08. Não criar poderes financeiros ou replay por existir uma tela. A navegação foi aprovada; prioridades, URLs finais, DS-003 e novos endpoints permanecem pendentes.

## Diagrama

[IA-01 — Sitemap lógico do storefront](diagrams/IA-01-sitemap-storefront.md). Complemento [IA-02](diagrams/IA-02-navegacao-ampliada.md), sem duplicar capturas. Ver [ADM-01](diagrams/ADM-01-fluxo-reembolso-admin.md) para escopo staff.

## Decisões abertas

Slugs/endereço definitivo, IA de conteúdo institucional, política de newsletter/consentimento, arquitetura SEO, cadastro e acessibilidade da busca. Não abrir essas capacidades por causa das imagens.
