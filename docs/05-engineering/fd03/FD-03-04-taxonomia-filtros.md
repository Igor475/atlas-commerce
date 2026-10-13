# FD-03-04 — Taxonomia, facetas, busca e modelagem editorial na UX

> **Proposta de comportamento.** Não alterar modelos de banco, CRUD, schema ou contratos. Mapeamento final depende do catálogo e da disponibilidade de atributos.

## Entidades percebidas no catálogo

| Conceito editorial | Necessidade para pessoa compradora | Observação |
|---|---|---|
| Obra | relacionar título, autoria e assunto | não confundir obra com SKU transacionável |
| Edição / publicação | compreender editora, idioma, edição/ano e apresentação | ID/versionamento editorial a definir |
| Produto / oferta | conhecer preço e disponibilidade reais | precificação com snapshot no checkout |
| Formato | físico, e-book, revista digital e kit | cada oferta só exibe formatos efetivamente elegíveis |
| Categoria/assunto | descobrir temas/coleções | taxonomia independente de tema religioso das imagens |
| Autoria | explorar obras relacionadas | nomes só com fontes reais ou ficcionais devidamente rotulados |
| Prévia | amostra pública controlada | integral R2 privado com entitlement |
| Kit | composição e restrições | não vender componente isolado por meio de um 'seletor' visual |

## Modelo de filtros (facetas candidatas)

**Base:** categoria, formato, autor, editora/selo, faixa de preço, disponibilidade quando aplicável; ordenação por relevância, título/preço apenas se semântica de backend e estabilidade de paginação forem definidas. **Contextuais:** edição/idioma, série/volume, público-alvo, acabamento/tamanho de letra — **somente se os metadados publicados existirem**. EBD, Bíblia, tradução de texto sagrado e títulos religiosos NÃO são tags mandatórias do Atlas.

- Contagens vêm da consulta filtrada e respeitam publicação/disponibilidade. Nunca fabricar números como os das imagens.
- Remoção de chip altera consulta, preservando filtros aplicáveis e histórico útil. Links de busca devem ser compartilháveis sem PII.
- Faixa de preço em BRL com centavos e valores de origem confiável; evitar diferenças entre preço listado e cotação.
- Filtro sem itens oferece ação para limpá-lo, não zera estado do carrinho.
- Busca facetada e autocomplete só serão mostrados como operantes quando existir contrato de API e dados reais; o OpenAPI CT-01 atual não fornece necessariamente autocomplete.
- Mobile pode usar painel de filtros acessível, com estado sincronizado e foco administrado; desktop pode expor facetas persistentes sem roubar área da capa.
- Busca vazia/erro de rede diferem semanticamente; sugestões sem base não podem fingir sucesso.

## Produto/edição/variante

A troca visual de formato só troca para uma **oferta válida** com preço/licença/estoque próprios. Adicionar item ao carrinho não concede entitlement. Uma galeria pode mostrar capa/miolo **autorizado**; nenhuma imagem de terceiros é usada sem licença. Não prometer amostra quando não há páginas selecionadas.

## Não incluído por inferência

Reviews/estrelas, ranking 'mais vendido', lista de favoritos, notificações comerciais, compra com um clique, cálculo automático de frete externo, cupons empilhados, promoções constantes e descontos Pix. Essas capacidades exigem contratos/escopo, não são obrigações extraídas das capturas.

## Dependências

[FD-03-01](FD-03-01-sitemap-navegacao.md), [CT-01](../contracts/CT-01-inventario-http.md), [contratos de domínio](../contracts/README.md) e [regras BRD](../../02-business-requirements/REGRAS-DE-NEGOCIO.md).
