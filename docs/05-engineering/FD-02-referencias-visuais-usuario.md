# FD-02 — Referências visuais fornecidas pelo responsável: Storefront Atlas Commerce

> **Situação:** nove imagens recebidas e selecionadas expressamente pelo responsável em 13/10/2026 como **REFERÊNCIA PRIORITÁRIA DE ESTILO E COMPOSIÇÃO** para `apps/storefront`. Não são identidade final, layout final aprovado nem contrato funcional. Não presumir direitos de reutilização sobre marca, capas, fotografias e ícones exibidos nas imagens. A marca visual retratada **VerboVivo não é Atlas Commerce**.

## Decisão que prevalece sobre a shortlist anterior

O responsável rejeitou o uso de **TASCHEN** e **Penguin Random House** como referências visuais para o projeto. Remover esses dois nomes dos benchmarks recomendados nas orientações FD-02 ativas. A shortlist anterior de lojas externas era exploratória e não constitui aprovação estética. As nove imagens abaixo passam a dirigir a comparação, hierarquia e inspiração de e-commerce para o storefront, sem copiar layout pixel a pixel, identidade, slogans, catálogo ou mídia.

## Linguagem visual percebida nas nove referências

- **Editorial contemporâneo e comercial funcional:** títulos serifados com personalidade, interface de leitura em sans-serif, ritmo de blocos e informações de produto bem hierarquizadas.
- **Paleta de referência:** verde profundo como estrutura/ações, fundos claros e creme, toques de dourado/âmbar nos destaques. **Cores exatas, fontes e marca Atlas ainda a definir em FD-04**, não copiar valores por amostragem como identidade aprovada.
- **Fotografia e capas de livros como protagonistas:** proporções consistentes, imagens generosas em PDP, grades densas mas legíveis.
- **Busca/discovery robustos:** campo visível, autocomplete, filtros por atributos editoriais, atalhos e taxonomia útil.
- **Comercial com clareza:** preço, edição/formato, quantidade, disponibilidade, frete simulado e resumo transparentes, sem badges enganosos.
- **Responsividade:** as imagens fornecidas são composições em largura de desktop. **Não inferir mobile, tablet, acessibilidade, performance nem microinteração validados** por elas.

## Referências por página

| Arquivo | Tipo de tela | Elementos a estudar | Restrições |
|---|---|---|---|
| [home-atlas-commerce.png](references/storefront/home-atlas-commerce.png) | Home editorial | Hero editorial com produto em evidência; atalhos por categoria; lançamentos, Bíblias, revistas digitais, EBD, autores e newsletter. | Não reutilizar logotipo, slogans, fotografias ou capas sem direitos comprovados. |
| [categorias-atlas-commerce.png](references/storefront/categorias-atlas-commerce.png) | Categoria Revistas | Banner de categoria, seletor impressas/digitais, filtros facetados, grid, destaque EBD e faixa de revistas digitais. | Separar formato físico/digital sem criar direitos de leitura por exibição de cartão. |
| [categorias-2-atlas-commerce.png](references/storefront/categorias-2-atlas-commerce.png) | Categoria Bíblias | Subcategorias em atalhos, filtros de tradução, público, acabamento e atributos; produto comparável; paginação. | Filtros devem refletir atributos existentes no domínio, não valores fictícios. |
| [pesquisa-atlas-commerce.png](references/storefront/pesquisa-atlas-commerce.png) | Pesquisa e descoberta | Autocomplete, sugestões, termos relacionados, chips de filtros, categorias/autores e grid consistente. | Resultados e contagens precisam vir de dados confiáveis; não inventar avaliações. |
| [produto-atlas-commerce.png](references/storefront/produto-atlas-commerce.png) | Produto físico — Bíblia | Galeria vertical, variações elegíveis, preço, atributos editoriais, CTA, prazo/frete, abas e recomendações. | Preço, estoque, variantes e promessa de entrega são autoridade do backend. |
| [produtos-atlas-commerce.png](references/storefront/produtos-atlas-commerce.png) | Produto físico/e-book — Livro | Fotografia/editorial em destaque, formato físico ou digital, quantidade, sinopse, autor, CTA e cross-sell. | Uma variante de formato não equivale automaticamente à mesma licença/preço; validar catálogo. |
| [produto-digital-atlas-commerce.png](references/storefront/produto-digital-atlas-commerce.png) | Revista digital com amostra | Capa e metadados; leitor de amostra de páginas selecionadas, aviso de conteúdo parcial e atributos do formato. | Prévia e original separados; o integral depende de entitlement e armazenamento privado. |
| [carrinho-atlas-commerce.png](references/storefront/carrinho-atlas-commerce.png) | Carrinho | Itens e quantidades claros, subtotais, cupom e simulação de frete, resumo persistente e recomendações. | Não assumir desconto Pix, embalagens, frete grátis ou parcelamento como políticas aprovadas. |
| [checkout-atlas-commerce.png](references/storefront/checkout-atlas-commerce.png) | Checkout | Progressão em etapas, formulários estruturados, modos de entrega, resumo lateral e revisibilidade. | NÃO copiar checkout como convidado, Pix/boleto, formulário próprio de cartão ou finalização local: Atlas exige conta e Stripe Checkout test mode. |

## Regras de implementação obrigatórias

1. **Não copiar VerboVivo**: criar identidade original Atlas Commerce com símbolo, tipografia licenciada, design tokens, redação, assets próprios/licenciados e composição autoral. As imagens são *referência*, não mockups finalizados para transcrição direta.
2. **O aspecto visual NÃO altera RN/ADR/SEC.** Atlas é single-seller demonstrativo e usa Stripe Checkout hospedado em **Test Mode**, conta obrigatória para compra, reserva 40 minutos e condições 40/30/5 a validar. Não exibir Pix, boleto, juros, parcelamento, descontos, reviews, frete grátis, prazo de entrega, badge PCI/SSL ou garantias como fatos sem contrato, verificação e aprovação.
3. O visual `checkout-atlas-commerce.png` serve para **clareza de informação e progressão**, não para implementar coleta de cartão própria ou checkout como convidado.
4. A amostra da revista `produto-digital-atlas-commerce.png` exige **páginas públicas selecionadas/licenciadas** e separação rigorosa do conteúdo completo no R2 privado. Visualizador/paginação ainda exigem decisão e teste.
5. **Storefront vs admin:** essas nove referências aplicam-se à **loja pública**, não autorizam um backoffice que copie a campanha visual; o admin deve ser denso, ergonômico e auditável, com identidade relacionada mas layout próprio.
6. A FD-03 deve mapear navegação, sitemap, jornadas, páginas, estados vazios/erro/carregamento e versões mobile antes de escolher visuais finais. A FD-04 deve propor 2–3 direções originais mantendo o espírito das referências. FD-05 aprova mockups, FD-06 converte em Next.js via Codex.
7. Alvo de acessibilidade: WCAG 2.2 AA, teste real de teclado, foco, contraste, texto, touch targets, sem afirmar conformidade automática.
8. Não modificar os placeholders técnicos atuais de `apps/storefront` ou `apps/admin` por este documento. Toda implementação visual requer autorização após as etapas de design.

## Relação com os documentos existentes

- `FD-01-direcao-design-frontend-premium.md`: preservado integralmente — padrão obrigatório de qualidade e originalidade.
- `FD-02-brief-pesquisa-benchmark.md`: atualizar **somente** a seção de referências e critérios correlatos, colocando estas imagens como âncora prioritária. Não exigir o retorno de TASCHEN/Penguin Random House.
- `FD-02-referencias-iniciais.md`: corrigir status da shortlist: *histórico substituído por referências enviadas pelo responsável*; não chamar a antiga shortlist de benchmark aprovado.
- `F04-01-estrutura-monorepo.md`, contratos e documentos normativos: inalterados.

## Gates de aprovação

- [x] Nove referências visuais fornecidas, identificadas e organizadas por tipo de página.
- [x] Preferência de usar essas referências em vez de TASCHEN e Penguin Random House.
- [ ] Análise visual/responsiva formal da FD-02, ao menos desktop/tablet/mobile, com avaliação crítica.
- [ ] FD-03: sitemap, inventário de telas, fluxo de checkout autorizado e estados.
- [ ] FD-04: conceitos originais e identidade Atlas escolhida.
- [ ] FD-05: wireframes e mockups por tela/viewport aprovados.
- [ ] FD-06: implementação Next.js, testes de UX, a11y e revisão pixel-perfect.

**Não confundir a aprovação das referências com autorização para copiar a UI fornecida.**
