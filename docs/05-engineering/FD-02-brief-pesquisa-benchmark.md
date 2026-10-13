# Atlas Commerce — FD-02: brief de pesquisa e benchmarking de design premium

> **Estado:** nove capturas selecionadas pelo responsável disponíveis como **referências visuais prioritárias do storefront** em [FD-02 — Referências visuais do usuário](FD-02-referencias-visuais-usuario.md). **Benchmark formal/responsivo ainda pendente**. Não equivale a identidade visual, wireframe ou design system aprovado.

## Propósito

Conceber um e-commerce editorial fictício com sofisticação de marca, interação comercial clara e experiência de leitura. Não repetir estética homogênea de templates. A futura interface final deverá distinguir loja editorial e backoffice operacional sem perder consistência de produto.

## Referências para investigação (não para cópia)

As **nove capturas selecionadas pelo responsável** são a direção prioritária de estilo, composição e hierarquia para o storefront: [catálogo por página e restrições](FD-02-referencias-visuais-usuario.md). Preservar os arquivos originais, nomes e proporções. Não copiar telas pixel-perfect nem implementar a identidade VerboVivo; paleta, fontes e marca Atlas continuam pendentes de FD-04 e aprovação humana.

**TASCHEN e Penguin Random House deixam de ser referências visuais ativas.** A [shortlist anterior](FD-02-referencias-iniciais.md), inclusive os candidatos citados em FD-01, tem caráter histórico/exploratório e não prevalece sobre a seleção do responsável. Pesquisa externa complementar, quando necessária, deve registrar página exata, URL, data, viewport e diagnóstico, sem exigir o retorno dos dois candidatos rejeitados. **Não afirmar análise concluída sem evidência das páginas estudadas.**

As capturas desktop fornecidas não comprovam responsividade, acessibilidade, performance ou interações. Nove capturas não equivalem a seis sites variados verificados; os critérios de pesquisa abaixo permanecem pendentes, sem reabrir a direção visual prioritária escolhida.

## Tarefas de pesquisa

1. Definir público-alvo fictício, jobs-to-be-done e objetivos de conversão/descoberta/entitlement com ligação aos requisitos RN e RF já documentados.
2. Inspecionar desktop e mobile de: homepage, busca, filtros, listagem, página de produto físico, livro digital, revista com prévia legal, kits, carrinho, checkout, pedidos, biblioteca e suporte; também backoffice em catálogo/estoque/financeiro (benchmark apropriado à produtividade).
3. Para cada exemplo: registrar URL/data, observação factual, força, fragilidade, hipótese a adaptar e cuidado para originalidade/licenciamento. Screenshots de uso analítico, sem publicar cópias de artes e sem importar imagens/fontes proprietárias ao projeto.
4. Comparar arquitetura de navegação, hierarquia editorial, imagens de capas, densidade, tipografia, legibilidade, disposição de metadados, CTA, estados vazios e de erro, acessibilidade, performance e variantes mobile.
5. Formular **3 princípios de diferenciação Atlas** e **3 anti-padrões explícitos**, acompanhados de justificativas baseadas em evidência. Esses princípios servem de insumo à FD-03/FD-04, não paleta/design final arbitrários.
6. Separar oportunidades de inovação moderada: melhor descoberta por temas, detalhes editoriais reais, preview honesto e biblioteca pós-compra útil — sem esconder preço/frete/disponibilidade ou comprometer checkout.
7. Produzir **um arquivo ou imagem por tela/captura**, legível, e uma matriz comparativa com links; não fazer colagem ilegível de páginas.

## Critérios de aceite FD-02

- Pelo menos seis referências reais, variadas e verificadas (URLs e data).
- Pelo menos duas larguras/experiências por referência quando existirem páginas acessíveis, com ressalva de indisponibilidade.
- Mapa de oportunidades separado para **storefront** e **admin**; considerar livros, e-books, revistas digitais, kits e pós-compra.
- Evidências de UX, limitações e critérios de qualidade; sem copiar branding, templates ou assets privados.
- **Nenhum código de UI final antes de FD-03/04/05 e aprovação humana**; usar apenas as páginas técnicas existentes.

## Fronteiras funcionais preservadas

Atlas exige **conta no checkout**, **Stripe Checkout hosted (hospedado) em test mode**, confirmação por **evidência validada do PSP** e conteúdo digital integral protegido por **entitlement**; a prévia pública é separada do integral. Pix/boleto, checkout como convidado, compra em 1-clique, preços fictícios, selos e descontos presentes nas referências **não viram funcionalidades ou políticas aprovadas**. RN/SEC/ADR e [contratos](contracts/README.md) permanecem superiores às referências visuais.

## Ligações

- [FD-01 — Padrão premium obrigatório](FD-01-direcao-design-frontend-premium.md).
- [F04-01 — apps separados](F04-01-estrutura-monorepo.md).
- [Contratos HTTP](contracts/README.md).
