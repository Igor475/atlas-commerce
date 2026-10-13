# FD-04-11 — Design tokens candidatos para Coleção Viva

> **Status: EXPLORAÇÃO — NÃO RATIFICAR AUTOMATICAMENTE.** Valores abaixo são provenientes da hipótese do Conceito A e podem mudar após teste visual, contraste, acessibilidade e identidade Atlas própria. Não implementar CSS nesta tarefa.

## Cores de partida, semânticas e relações

| Token candidato | Valor exploratório | Uso conceitual | Gate antes de produção |
|---|---|---|---|
| `color.brand.deep` | `#123D33` | ação principal e referências estruturais | contrastes em hover/focus/disabled e modo escuro, se adotado |
| `color.canvas.warm` | `#F7F3EA` | áreas editoriais e transições | relação com cards, divisórias e links |
| `color.canvas.white` | `#FFFFFF` | leitura, formulários, áreas funcionais | contraste com bordas e campos |
| `color.ink.primary` | `#17251F` | textos principais | validação em estados/formulários |
| `color.accent.earth` | `#80521F` | realces editoriais pontuais | não representar erro/alerta unicamente por cor |
| `color.border.warm` | `#E7DAC8` | divisórias e fundo suave | borda precisa ser distinguível em formulários |

**Separar cores semânticas de cores de marca:** `success`, `warning`, `danger`, `info`, `focus`, `selected`, `disabled` não são todas variantes do verde. Não usar vermelho/verde isoladamente como único indicador de estado.

## Tokens que precisam de especificação futura

| Família | Itens a validar | Prioridade |
|---|---|---|
| Tipografia | display/heading/body/caption/price, peso, tracking, line height, tabular nums | P0 |
| Espaçamento | escalas múltiplas de 4/8, gutters responsivos, ritmo vertical por família de página | P0 |
| Containers | largura máxima do editorial vs catálogo e formulários; conteúdo no mobile | P0 |
| Grids | categorias com filtros; PDP em duas colunas desktop; responsividade do Stripe | P0 |
| Borders/radii | contorno sutil, cantos predominantemente discretos, focus ring evidente | P0 |
| Motion | hover, transição de filtros, mini-carrinho; reduced-motion obrigatório | P1 |
| Mídia | proporção de capa, placeholder sem capa, thumbnails e imagem ampliada licenciada | P0 |
| Densidade | normal storefront, compacta admin, nunca esconder validações | P0 |

## Padrões de produto a projetar

1. **Cartão editorial:** capa real, título/autor, edição/formato, preço verdadeiro; avaliação e preço antigo só com suporte de dados e política.
2. **Busca/sugestão:** combobox ARIA e teclado; resultados relacionados sem extrapolar dados reais; loading/empty/error.
3. **Facetas:** chips/remover tudo, URL/estado navegável, painéis mobile acessíveis e contagens verificáveis.
4. **Galeria PDP:** navegação por teclado, descrição de imagem, zoom acessível, direitos sobre fotografias/capas e fallback.
5. **Preview digital:** páginas selecionadas e licenciadas, proteção do original e mensagem de amostra parcial.
6. **Identity:** navegação do visitante para login/cadastro/recovery, rate limit, erros antienumeração e foco.
7. **Checkout:** dados de cliente/entrega e revisão Atlas ao lado do componente Stripe oficial; preservar altura/reflow, iframe/3DS e status persistido.
8. **Admin:** tabelas, filtros, autorização por recurso, MFA/step-up e refund requester≠approver.

## Qualidade de aceitação dos tokens

Cada par de cor texto/fundo terá medição automática/manual conforme WCAG 2.2 AA aplicável; estados foco/hover/disabled não devem perder legibilidade. Verificar teclado, foco, alvos, zoom, leitor de tela, performance de imagens/fontes e mobile. Não declarar conformidade sem resultados de teste.

Referências: [Conceito A](FD-04-02-conceito-A-colecao-viva.md) · [Fundação conceitual](FD-04-06-fundacoes-design-system.md) · [Brief refinado](FD-04-10-refinamento-criativo-colecao-viva.md).
