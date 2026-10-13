# FD-03-06 — Contrato de experiência responsiva e acessibilidade

> **Planejado**; as nove capturas do responsável mostram composições desktop e NÃO comprovam mobile/tablet. Não declarar WCAG atendida sem teste. Objetivo: WCAG 2.2 AA.

## Viewports de validação candidatos (não breakpoints fixos de CSS)

| Cenário | Exemplos para ensaio | Riscos UX a detectar |
|---|---|---|
| Mobile compacto | 320 e 375 px | busca usável, CTA, teclado virtual, filtros, comprimento do título, overflow |
| Mobile amplo | 390 e 430 px | galeria, seletor de quantidade, cart summary e barras fixas |
| Tablet | 768 e 1024 px | mudança de filtros, transição de grid, navegação e leitura de revista |
| Desktop | 1280 e 1440 px | densidade, espaços negativos e limite de leitura |
| Zoom | 200% e 400% quando aplicável | reflow, scroll horizontal de conteúdo essencial |

**Padrão:** definir breakpoints pela quebra real de conteúdo, não por copiar grid das capturas. Os valores são *casos de teste*, não medidas definitivas de layout.

## Contratos de interação a validar

1. Cabeçalho, busca e categorias alcançáveis por teclado com foco visível e ordem compreensível; autocomplete com semântica e fechamento previsível.
2. Facetas/filtros apresentam seleção acessível, rótulo de contagem e feedback; painel mobile devolve foco ao controle ao fechar.
3. Produtos: capa com texto alternativo quando informativa; atributos e preços em texto; contraste e hierarquia sem dependência exclusiva de cor.
4. Checkout: mensagens de erro por campo e resumo, status anunciado; nenhum campo de cartão local. Após retorno Stripe, tela indica status **verificado** ou **pendente**, não interpreta redirecionamento como pagamento.
5. Revistas: amostra parcial com controles nomeados, sequência de leitura, zoom sem esconder texto, texto alternativo/HTML de apoio quando PDF inacessível; original protegido.
6. Carrinho: quantidade atualizada com anúncio acessível; erro de estoque ou mudança de preço comunicado antes de avançar.
7. Recuperação de sessão e timeout: formulário acessível, sem perda silenciosa de intenção e sem vazamento entre contas.
8. Redução de movimento respeitada; nenhum animation lock bloqueia compra/leitura. Alvos interativos adequados, mensagens em PT-BR e compatibilidade com leitor de tela.
9. Admin: ações sensíveis pedem confirmação com rótulo explícito, razão e estado. Dados financeiros legíveis em diferentes zooms sem planilhas inacessíveis.

## Evidências esperadas na FD-05/06

Screenshots **separadas** por página/viewport e comparação com protótipo **aprovado**; testes automatizados de acessibilidade como auxílio (não substituem teclado/leitor de tela), verificações de foco/contraste e métricas LCP/CLS/INP em condições reproduzíveis. Não inventar números-alvo aprovados nem medir em placeholders.
