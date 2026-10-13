# FD-04-06 — Contrato conceitual do Design System Atlas

> **Status:** fundações para detalhar após seleção de uma direção; **nenhum token final é aprovado**. Não instalar Shadcn/Material, bibliotecas, fontes ou ícones sem justificativa e licença.

## Arquitetura dos tokens (nomes sem valores definitivos)

- Cores semânticas: `surface.page`, `surface.raised`, `surface.subtle`, `text.primary`, `text.secondary`, `text.inverse`, `border.default`, `action.primary`, `action.primaryHover`, `focus.ring`, `status.success`, `status.warning`, `status.danger`, `status.info`.
- Tipografia: `type.display`, `type.heading`, `type.body`, `type.caption`, `type.numeric`; tamanhos fluidos com escalas e limites; números monetários alinhados e legíveis.
- Layout: containers, espaço/ritmo, gutters, grid editorial, max-width de leitura e grid catálogo; densidade diferenciada `storefront` vs `admin`.
- Componentes: cabeçalho, busca combobox acessível, menu taxonomia, breadcrumb, filtros (desktop/mobile), card de produto, imagem capa, gallery, seleção de variante, selo **apenas com fato**, preço, botões/inputs, formulário, mensagens de erro, favoritos (quando contratado), carrinho, resumo, leitor amostra autorizado, conteúdo legal, tabelas/admin, diálogos de aprovação sensível.
- Motion: transições curtas com `prefers-reduced-motion`, nada de movimento que esconda preço/erro/foco. Sem carousel automático indispensável.
- Ícones: biblioteca consistente licenciada; nunca emojis como ícones de sistema nem selos fictícios.

## Componentes críticos e estados

| Componente | Estados futuros obrigatórios |
|---|---|
| Busca | ociosa, digitando, carregando, sem resultados, erro, teclado/ARIA |
| Facetas | aplicado, bloqueado, indefinido, reset, painel móvel |
| Formulários Identity | validação, erro antienumeração, throttle, enviado, token expirado, sessão revogada |
| Carrinho | vazio, preço mudado, indisponível, atualizado, cotação pendente |
| Checkout Stripe | aguardando sessão, pronto, vencido, offline, 3DS, erro, aguardando webhook, PAYMENT_REVIEW |
| Biblioteca | vazia, elegível, bloqueada, link temporário expirado, não autorizado |
| Admin refund | step-up obrigatório, autorratificação proibida, PSP inconclusivo, conclusão comprovada |

## Breakpoints a validar, não copiar desktop

Pequeno telefone `320–375 px`, tablet `768 px`, desktop `1024/1440 px`; alvos para FD-05, não declaração de suporte testado. No telefone, filtros em painel acessível, resumo Stripe reordenável, hero sem ocultar informação, menu e teclado operáveis, texto com zoom e sem overflow.

## Gate de qualidade

WCAG 2.2 AA como alvo; verificar cor por par, focus, labels, contraste, zoom 200–400%, touch targets, leitor de tela, LCP/INP/CLS por medição, licença de fonte/capa, preferências de motion. As paletas A/B/C são hipóteses; resultados de contraste isolados não garantem conformidade do sistema inteiro.
