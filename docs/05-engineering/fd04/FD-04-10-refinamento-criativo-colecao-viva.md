# FD-04-10 — Refinamento criativo do Conceito A: Coleção Viva

> **Status: BRIEF DIRECIONAL, NÃO MOCKUP APROVADO.** Derivado da escolha explícita de A em 13/10/2026 e das nove referências selecionadas pelo responsável. Não cria licença sobre imagens ou fontes alheias.

## 1. Ideia central

**“Uma coleção para descobrir, escolher e guardar.”** A experiência deve acolher a exploração editorial sem obscurecer produto, preço, formato e disponibilidade. A marca Atlas precisa se distinguir visualmente de VerboVivo, com arquitetura própria dos grids, gestos visuais discretos, proporções revisadas, textos próprios e biblioteca de componentes autoral.

**Três adjetivos de referência:** curado, confiável, contemporâneo. **Três rejeições:** pomposo, genérico, publicitário demais.

## 2. Gramática de composição

| Pilar | Hipótese de direção A | Antipadrão a rejeitar |
|---|---|---|
| Hero editorial | Uma história/obra fictícia licenciada em destaque, boa composição, texto sintético e CTA honesto | Reproduzir fotografia, enquadramento, slogan ou medalha de best-seller da referência |
| Navegação | Busca ampla, categorias taxonômicas reais, favoritos/conta/carrinho discretos | Menus gigantes, ícones com baixo contraste, nav bloqueadora de conteúdo |
| Cartões | Capas com proporção íntegra, título e autor legíveis, edição/formato e preço verdadeiro | Estrelas falsas, desconto sem preço anterior legítimo, seis linhas de badges |
| Coleções | Recortes por tema, autor, coleção e formato quando disponíveis | Categorias cristãs impostas pelas imagens ou ofertas sem contrato |
| PDP | Galeria editorial e coluna de decisão; prévia pública claramente delimitada | Transformar livro físico e licença de e-book em uma variante comercial falsa |
| Checkout | Etapas claras e resumo utilizável lado a lado, formulário Stripe incorporado | Checkout como convidado, cartão próprio, Pix/boleto/parcelas não aprovados |
| Suporte/conta | Formulários cuidados, sem ornamentação excessiva, linguagem neutra e segura | Login convertido em vitrine com hero dominante ou mensagens que enumeram usuários |
| Biblioteca | Miniatura de capa + licença/estado e ação de leitura após entitlement | Link público para original no R2 ou liberação por redirect Stripe |

## 3. Tipografia e identidade (pesquisa, não seleção)

- **Display/editorial:** serifada com contraste moderado e personalidade clara em português; procurar excelente legibilidade em títulos longos e diacríticos. Não usar a mesma família tipográfica da referência automaticamente.
- **Interface e corpo:** sans-serif de leitura rápida com números tabulares e pesos moderados. UI de preço e formulários deve vencer a estética.
- **Marca Atlas:** estudar logotipo nominal e símbolo editorial original; evitar montanha/globo/monograma automático apenas por causa da palavra “Atlas”. Produzir ao menos três esboços argumentados em FD-05 antes de escolher.
- **Licenciamento:** usar somente fonte livre/licitamente utilizável, registrar arquivo de licença/fonte no projeto quando necessário; não incorporar fontes proprietárias extraídas de imagens.

## 4. Ritmo, espaçamento e densidade

Storefront: áreas de respiro em abertura de categoria e produto; grid funcional com densidade consistente; texto de sinopse em largura confortável. Evitar bordas muito arredondadas e sombras em todas as superfícies. Reservar acento quente para informações editoriais verdadeiras, não como pseudo-selo promocional.

Backoffice: densidade superior à loja, navegação adaptada a tarefas, tabelas legíveis, mudanças financeiras auditáveis, ações destrutivas bem diferenciadas. Não imitar o layout visual da home no admin.

## 5. Responsividade exigida no projeto de telas

- **320/375 px:** pesquisa acessível, navegação condensada, sem quebra de títulos, cards e preços; filtros com painel modal operável por teclado, foco e leitor de tela; CTA/resumo do checkout/Stripe refluem sem clip.
- **768 px:** estados tablet reais, não simples miniatura de desktop; filtros/detalhes podem mudar de padrão após teste de usabilidade.
- **1024/1440 px:** hierarquia e ritmo editorial; grades eficientes sem sacrificar capa e informação crítica.
- Compatível com zoom 200–400% onde WCAG exigir; prefers-reduced-motion; não prometer suporte sem evidência de testes.

## 6. Conteúdo e alegações comerciais

O Atlas é **demonstrativo**. Não inventar ratings, número de vendas, descontos, frete grátis, certificados, atendimento 24h, autores reais não licenciados, depoimentos ou “mais vendido” sem fundamento. Rótulos de campanhas devem ser honestos e possuir dados correspondentes. O visual das capturas não amplia o catálogo do MVP nem o escopo de Stripe.

## 7. Aprovação necessária antes de telas definitivas

Avaliar e aprovar separadamente: logo e sistema de marca, tipografias com licença, tokens de cor/contraste, grade responsiva, catálogo demonstrativo próprio/licenciado, tratamento de capas/fotos e quatro páginas-piloto (home, categoria/busca, PDP, checkout Stripe incorporado). O responsável poderá pedir ajustes sem reabrir a direção A.

[Decisão criativa](FD-04-09-decisao-conceito-A.md) · [Design System preliminar](FD-04-11-tokens-candidatos.md) · [Planejamento FD-05](../fd05/FD-05-00-plano-de-mockups.md).
