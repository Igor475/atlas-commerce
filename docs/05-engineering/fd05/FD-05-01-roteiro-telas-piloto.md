# FD-05-01 — Roteiro de telas-piloto antes dos mockups integrais

> **Situação: proposta para o primeiro ciclo de mockups.** Não é um conjunto de telas ou resultados de testes. O Conceito A — Coleção Viva é a direção; sua implementação visual detalhada dependerá de inspeção e escolha humana.

## Provas de direção por tela-piloto

| Tela-piloto | Composição a testar | Estados mínimos | Referência principal |
|---|---|---|---|
| **Home (P01)** | identidade Atlas, hero editorial próprio, navegação, descobertas e microcuradoria | sem campanha, sem capa, loading/erro | `home-atlas-commerce.png` |
| **Categoria + busca (P02/P03)** | header com busca, filtros consistentes, páginas de coleção, contagem real e ordenação | nenhum resultado, faceta inválida, mobile overlay, autocomplete teclado | `categorias-atlas-commerce.png`, `pesquisa-atlas-commerce.png` |
| **Produto físico (P04)** | galeria com capas, edição, formato, preço e estoque, CTA e sinopse | mídia ausente, preço/estoque alterado, variante inválida | `produto-atlas-commerce.png` |
| **Revista digital (P06)** | conteúdo digital distinto, visualização pública de poucas páginas, licença explícita | amostra não disponível, original protegido, viewer inacessível | `produto-digital-atlas-commerce.png` |
| **Carrinho (P08)** | itens, quantidade, formato, preço estimado, frete simulado e resumo claro | vazio, preço alterado, estoque insuficiente | `carrinho-atlas-commerce.png` |
| **Checkout (P09/P47/P48)** | endereço quando físico, revisão, resumo, componente Stripe incorporado e status confiável | sessão PENDING/READY/expirada, 3DS, erro, pagamento em revisão | `checkout-atlas-commerce.png`, com regras Atlas divergentes |
| **Entrar/criar/recovery (P16/P18/P20)** | componentes e tipografia do Conceito A, baixa distração, formulários acessíveis | antienumeração, confirmação neutra, token expirado, rate limit | criação autoral; não há captura |
| **Favoritos/ofertas (P21/P22)** | organização de produtos e estado vazio; descontos somente com dados reais | sem favoritos, sem oferta legítima, login necessário | criação autoral a partir de linguagem visual A |
| **Admin (A02/A06)** | densidade de informação, MFA/capabilities, trilha de decisão/refund | restrição de acesso, pendente, erro, autoaprovação negada | linguagem própria, sem copiar storefront |

## Critérios de sucesso da primeira revisão

- **Autoria identificável:** páginas não se confundem com cópia das referências nem com template genérico; marca e capa sem ativos de terceiros não licenciados.
- **Linguagem compartilhada:** a busca, fichas e checkout parecem o mesmo produto, sem padronização mecânica que prejudique composição.
- **Dados honestos:** anúncios e selos só com suporte de catálogo/política; demo indicada quando apropriado.
- **Fluxo realista:** conta obrigatória antes do checkout, Stripe incorporado, entitlement após confirmação do PSP, estado `PAYMENT_REVIEW` seguro.
- **Navegação responsiva:** rascunhos desktop/mobile; falhas documentadas antes de protótipo aprovado.
- **Acessibilidade:** estado de foco, labels, contraste proposto, reflow e leitores de tela planejados.

## Ordem de revisão humana

1. Aprovar identidade Atlas preliminar (marca, tipografia e paleta) ou solicitar até duas revisões conceituais antes de expandir.
2. Revisar home, categoria/busca e PDP para validar padrão de navegação.
3. Revisar carrinho, checkout e estados para consistência transacional/privacidade.
4. Revisar telas sem captura e backoffice; depois escalar o trabalho para P01–P50/A01–A14.

Este roteiro é complemento ao [plano geral FD-05](FD-05-00-plano-de-mockups.md), não substitui a entrega completa.
