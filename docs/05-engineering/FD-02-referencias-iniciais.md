# FD-02 — Referências iniciais para pesquisa de design premium do Atlas Commerce

> **Status:** **HISTÓRICO — shortlist exploratória substituída como direção visual pelas nove capturas selecionadas pelo responsável em 13/10/2026**, catalogadas em [FD-02 — Referências visuais do usuário](FD-02-referencias-visuais-usuario.md). **NÃO** é benchmark responsivo completo, identidade visual escolhida, wireframes ou permissão de implementar UI.
> Complementa [FD-01](FD-01-direcao-design-frontend-premium.md) e o [brief de pesquisa](FD-02-brief-pesquisa-benchmark.md).

## Regra principal

O futuro storefront e backoffice **não podem** parecer um template de e-commerce ou um dashboard genérico gerado por IA. Precisamos de direção de arte editorial original, hierarquia visual de especialistas, uma identidade própria, descoberta e-commerce eficaz, navegação previsível, acessibilidade WCAG 2.2 AA e performance real. **Sofisticação não é excesso de efeitos.** Referências são investigadas para extrair princípios, nunca copiadas em branding/assets, CSS ou layouts literais.

## Shortlist histórica — sem direcionamento visual ativo

As entradas abaixo preservam somente a rastreabilidade da investigação anterior. **TASCHEN e Penguin Random House foram rejeitados como referências visuais ativas**; não devem orientar o design nem ser exigidos novamente. As nove capturas do responsável têm prioridade para composição e hierarquia do storefront, sem copiar VerboVivo ou aprovar automaticamente paleta, fontes e marca Atlas.

| Referência histórica | Página de pesquisa | O que se pretendia estudar | Evidência preliminar e o que faltava |
|---|---|---|---|
| TASCHEN | https://www.taschen.com/en/books/art/ | Categorias editoriais, filtros por séries, dimensões, idioma | Página pública apresenta filtros/ordenadores; **falta** inspeção visual desktop/mobile e PDP |
| Phaidon | https://www.phaidon.com/ | Narrativa editorial de coleções e capas | **Candidato não auditado visualmente**; localizar páginas específicas e registrar captures |
| Penguin Random House | https://www.penguinrandomhouse.com/books/839501/the-vegetarian-a-novel-deluxe-10th-anniversary-edition-by-han-kang/9798217199983/ | Informação de formato, livro, sinopse e prévia | Página pública traz formato e opção de amostra; **falta** avaliar a experiência real em duas larguras |
| Bookshop.org | https://bookshop.org/ | Busca, descoberta, merchandising editorial | **Candidato não auditado**; não copiar sua lógica de marketplace, incompatível com Atlas single-seller |
| Aesop | https://www.aesop.com/ | Copy, ritmo visual e comunicação comercial de marca | **Candidato não auditado**; comparar legibilidade e fluxo de conversão, não estética superficial |
| COS | https://www.cos.com/ | Ritmo de grid, tipografia, informação visual | **Candidato não auditado**; observar soluções transferíveis para livros sem replicar uma marca de moda |

**Não afirmar “benchmark concluído” ou “visual mobile validado” a partir desta tabela.** Referências só contam como analisadas após observação atual e capturas individuais da página exata, desktop/mobile com data, limitação e diagnóstico.

## Matriz de investigação obrigatória

Para cada referência: URL exata, data da captura, tipo de página, viewport, navegação, descoberta, filtros, ficha de produto, mecanismos de prévia, mensagens de estoque/pagamento, densidade, performance, acessibilidade, o que funcionou, o que não funcionou, **e hipótese original para Atlas**. Separar por páginas em imagens independentes, não colagens de screenshots minúsculos.

**Fluxos Atlas que precisam de benchmarking depois:** home editorial, resultado de busca, livro físico, ebook, revista digital com prévia licenciada, kit misto, carrinho, checkout test mode, pedido em revisão financeira, biblioteca, conta/recovery; backoffice de catálogo, estoque, autorização financeira e auditoria.

## Hipóteses para validar (não escolhas de UI)

- Exibir a **edição e o formato editorial** como informação principal, antes de CTAs ambíguos.
- Descoberta por assunto, autor, coleção e formato, com filtros compactos e honestos.
- Separar visualmente **prévia autorizada** e **conteúdo integral protegido**.
- Distinguir uma experiência expressiva de **storefront** de um **backoffice denso, ergonômico e auditável**.
- Evitar heros com gradientes gratuitos, cards padronizados em excesso, status que dependem só da cor e promoções fictícias.

## Limites das referências prioritárias

As capturas não autorizam transcrição pixel-perfect ou implementação de telas. Permanecem **conta obrigatória no checkout**, **Stripe Checkout hosted em test mode**, confirmação pela **evidência validada do PSP** e acesso digital integral por **entitlement**. Pix/boleto, convidado, 1-clique, preços fictícios, selos e descontos retratados não são funcionalidades aprovadas. Consultar as restrições por página no [catálogo das nove capturas](FD-02-referencias-visuais-usuario.md); RN/SEC/ADR e contratos permanecem intactos.

## Próximas entregas de design

**FD-02 efetiva:** registrar benchmark com pelo menos seis sites observados em desktop/mobile, links, imagens separadas e conclusões. **FD-03:** arquitetura da informação e jornada do Atlas. **FD-04:** 2–3 conceitos originais de direção de arte, tokens e avaliação de trade-offs. **FD-05:** wireframes, mockups e protótipos por tela/viewport com aprovação humana. **FD-06:** somente então Codex implementa as interfaces finais com revisão pixel-perfect e testes WCAG/performance.

**Nenhuma alteração no código das duas aplicações Next.js está autorizada por este documento.**
