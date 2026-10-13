# FD-03-01 — Sitemap e organização de navegação

> **PROPOSTA.** Os caminhos abaixo são **URLs candidatas do Next.js**, não rotas existentes nem endpoints HTTP da API. A confirmação em FD-04/05 exige revisão de SEO, canonical, legibilidade, idioma e contratos.

## Loja (`apps/storefront`) — 5 contextos de navegação

| Contexto | Entrada | Páginas/funções | Permissão |
|---|---|---|---|
| Descobrir | `/`, `/catalogo`, `/categoria/[slug]` | Home editorial, categorias configuráveis, coleções/temas, listagem | Público |
| Buscar | `/busca?q=...` | Resultados, filtros, ordenação, busca vazia, sugestões | Público; sem PII |
| Avaliar | `/produto/[slug]`, `/amostra/[id]` **(candidato)** | Ficha por formato, atributos, prévia pública licenciada | Público apenas se publicado/autorizado |
| Comprar | `/carrinho`, `/checkout` **(orquestração)** | Carrinho visitante, autenticação obrigatória, cotação e envio a Stripe hospedado | Carrinho público; checkout cliente autenticado |
| Acompanhar | `/minha-conta`, `/meus-pedidos`, `/pedidos/[id]`, `/minha-biblioteca` | Perfil/endereço, histórico, estado PSP, downloads temporários | Titular da conta |
| Assistência | `/ajuda`, `/privacidade`, `/termos`, `/entrega-e-devolucao` **(candidatos)** | Políticas e ajuda conforme textos reais revisados | Público; publicação legal a validar |

**Busca/navegação:** no topo, oferecer acesso a catálogo e busca; menus de categorias são gerados da taxonomia publicada, sem forçar Bíblia/EBD como categorias. Sem atribuir avaliações, rankings, promoções ou descontos sem dados/decisão. Nome e hierarquia exatos de menus permanecem abertos.

**Checkout:** a página própria da loja explica/resume dados, endereços, frete simulado, cupons e revisão **antes do redirecionamento ao Stripe Checkout**. Campos de cartão/Pix/boleto da referência não devem existir no app. `return/success` do Stripe sinaliza apenas retorno; a página lê `GET /me/orders/{id}` e mostra 'aguardando confirmação' se necessário.

**Autenticação:** entrar, criar conta, verificação de email, recuperação e MFA administrativo exigem inventário técnico próprio quando seus contratos forem aprovados; não inventar endpoints por causa do sitemap. Não compartilhar sessão de cliente com staff.

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

## Diagrama

[IA-01 — Sitemap lógico do storefront](diagrams/IA-01-sitemap-storefront.md). Ver [ADM-01](diagrams/ADM-01-fluxo-reembolso-admin.md) para escopo staff.

## Decisões abertas

Slugs/endereço definitivo, IA de conteúdo institucional, política de newsletter/consentimento, arquitetura SEO, cadastro e acessibilidade da busca. Não abrir essas capacidades por causa das imagens.
