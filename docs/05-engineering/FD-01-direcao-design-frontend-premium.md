# FD-01 — Direção de design editorial premium: Atlas Commerce

> **Status:** REGRA DE QUALIDADE E PROCESSO RATIFICADA PELO PROPRIETÁRIO (12/10/2026). **Não é um layout final aprovado.** O projeto continua sendo e-commerce editorial B2C fictício. Responsável por código: Codex sob prompts específicos. A implementação visual final depende de pesquisa e aprovação próprias.

## 1. Intenção de produto

O Atlas Commerce deve parecer concebido por **um estúdio sênior de produto digital, direção de arte, UX, UI e design de comércio eletrônico**, não montado a partir de templates ou de componentes genéricos produzidos por IA. **Premium não significa ornamentado**: clareza de compra, leitura e informação editorial com personalidade própria, sem poluição e sem experimentalismo que sacrifique conversão, acessibilidade ou desempenho.

A identidade visual, o logo, a paleta, as tipografias, a direção fotográfica e a voz da marca **ainda precisam ser concebidos**. Não assumir que Atlas Commerce é marca real, livraria cristã, editora específica ou marketplace. Seu catálogo-modelo abrangerá livros físicos, e-books, revistas digitais e kits de uma única empresa fictícia.

## 2. Proibição explícita de design genérico

Nenhum agente deve, sem um entregável de design aprovado, inventar uma homepage de e-commerce pronta, painel de administração de template, hero genérico com gradiente, coleções artificiais, falsa promoção, copy placeholder parecendo produção, cards idênticos e excessivamente arredondados, paleta roxo/azul arbitrária, sombras excessivas, glassmorphism gratuito, ícones sem semântica, emojis substituindo iconografia, catálogo de imagens aleatórias ou efeitos animados como substitutos de hierarquia.

Não copiar de forma direta imagens, códigos, layouts, branding ou textos proprietários de terceiros. Referências são **análises**, não componentes a clonar. Não contratar/adquirir assets, fontes ou serviços pagos sem autorização.

**Exceção única na F04-03 — bootstrap:** páginas de teste sem design, em PT-BR, texto simples e acessível, com rótulo explícito `Interface em preparação — não representa o design final`. Não criar navbar, hero, vitrine, cards, dashboard, sidebar, login, carrinho ou qualquer fluxo ilustrativo. Nenhum mock de checkout funcional. Não usar defaults de scaffold como se fossem design aprovado. Esses placeholders são descartáveis e não se confundem com telas de produto.

## 3. Etapa dedicada obrigatória antes do frontend visual

### FD-02 — Pesquisa e benchmark auditáveis

As **nove capturas selecionadas pelo responsável**, catalogadas por página em [FD-02 — Referências visuais do usuário](FD-02-referencias-visuais-usuario.md), são as **referências prioritárias de estilo, composição e hierarquia do storefront**. **TASCHEN e Penguin Random House deixam de ser recomendações visuais ativas**; a shortlist externa anterior é somente histórico exploratório. Preservar imagens, nomes e proporções originais. Não copiar telas pixel-perfect, implementar a identidade VerboVivo ou aprovar automaticamente paleta, fontes e marca Atlas.

Analisar pelo menos seis referências reais e variadas como pesquisa complementar, sem exigir o retorno dos candidatos rejeitados nem substituir a direção prioritária escolhida. Verificar URLs e screenshots atuais, licenças e padrões de interação no momento da pesquisa. Examinar navegação, busca, descoberta, filtros, ficha do livro, prévias, checkout, conta, revista digital, composição de kits e estados de erro. Registrar o que funciona, o que não funciona e *por quê*. Construir matriz comparativa com evidência visual referenciada e autoria/URL/fonte. As nove capturas desktop não comprovam pesquisa responsiva, acessibilidade, performance ou aprovação final; os gates FD-03/04/05 e a aprovação humana permanecem obrigatórios.

### FD-03 — Estratégia e arquitetura da experiência

Definir públicos primários e tarefas críticas, arquitetura da informação, taxonomia editorial, busca/filtros, funil de checkout, biblioteca digital, preview, conta e backoffice. Produzir sitemap por origem de jornada e inventário de páginas/estados; diferenciar e-commerce de um vendedor e marketplace genérico. Projetar states: vazio, loading, erro, sem estoque, expiração de reserva, pagamento em revisão e conteúdo indisponível; nunca inventar prova de pagamento pelo browser.

### FD-04 — Direção de arte e design system

Criar 2–3 alternativas de **conceito original de design** (racional, voz, tipografia, escalas, grids, cores, fotografias/editorial, iconografia, tratamento de capa, microinterações). Avaliar vantagens e riscos; obter escolha explícita do responsável antes de fixar tema. Definir tokens (cor semântica, spacing, typography, radius, elevation, motion), componentes, estados e padrões responsivos; preservar distinção entre `storefront` e backoffice funcional sem destruir coerência de marca. A sofisticação é resultante da composição e tipografia, não da soma de efeitos.

### FD-05 — Wireframes, protótipos e validação

Wireframes de baixa fidelidade → mockups de alta fidelidade → protótipo navegável. Cobrir no mínimo: home, listagem/busca, produto físico, e-book, revista com prévia autorizada, kit, carrinho, checkout sandbox, pedidos, biblioteca, login/recuperação, perfil, páginas informativas e fluxos-chave do staff (sem expor permissões pela UI). Validar desktop, tablet e mobile; navegação por teclado, feedback, mensagens legíveis, estados e acessibilidade. Revisão humana antes de Codex converter telas aprovadas em Next.js.

### FD-06 — Implementação fiel e revisão visual

Entregar componentes com semântica e CSS controlados, sem dependências visuais desnecessárias. Implementação mobile-first e responsiva, WCAG 2.2 AA como alvo com evidência e exceções registradas, foco visível, alvos interativos, contraste, teclado, formulários acessíveis, motion reduzida e conteúdo em português. Medir LCP/CLS/INP em condições reproduzíveis; evitar imagens pesadas, fonte sem licença e animações bloqueantes. Conferir screenshots reais dos principais breakpoints e comparar com protótipos aprovados (pixel-perfect quando relevante). Integrar backend real apenas por contratos revisados; loading/skeleton não pode mascarar resultados falsos.

## 4. Critério de aprovação visual e UX

Antes de chamar uma tela de **aprovada**, exigir: coerência original de marca; hierarquia editorial; escaneabilidade; informação comercial honesta; navegação previsível; estados reais e compreensíveis; comportamento responsivo; qualidade tipográfica; ausência de clichês visuais; acessibilidade testável; desempenho; vínculo a requisito RN/CA/SEC e documentação de qualquer trade-off. Revisão é **humana**, com evidências e imagens separadas por página/viewport, não apenas opinião do gerador.

Backoffice requer ergonomia de trabalho intensivo: tabelas densas quando apropriadas, filtros úteis, confirmação de operações sensíveis, trilha de auditoria e estados operacionais. Não transportar o visual de campanha/editorial à força para operações financeiras complexas.

## 5. Gatilhos de bloqueio Codex

Se um prompt pedir frontend visual sem documento FD-04/FD-05 aprovado, limitar o trabalho a layout estrutural sem design comercial, **reportar a pendência** e solicitar entrega de direção de arte. Não inventar branding para preencher lacuna. Qualquer pedido de implementar todo o sistema simultaneamente deve separar gates de backend/integridade de gates visuais. Alterações não podem contrariar autenticação NestJS, sessão privada, biblioteca licenciada, estoque/Stripe e regras Fase 03.

## 6. Referências normativas

- [Blueprint F04-01](F04-01-estrutura-monorepo.md) e [topologia](F04-06-topologia-identidade.md).
- [F04-02 contratos](contracts/README.md), [ADRs](../04-architecture/adrs/README.md), [segurança](../07-security/security-requirements.md).
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- W3C WAI novidades 2.2: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- Next.js documentação oficial (verificar atualização antes de implementar): https://nextjs.org/docs

**Estado atual:** somente o processo e o padrão de qualidade foram aprovados; nenhum benchmark, identidade, wireframe, mockup, componente de UI ou teste de usabilidade foi produzido nesta decisão.
