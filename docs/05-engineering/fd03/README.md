# FD-03 — Arquitetura da Informação e Experiência (Atlas Commerce)

> **Estado: PROPOSTA PARA REVISÃO DO RESPONSÁVEL — 13/10/2026.** Nenhum código de UI, protótipo ou design system criado. Documento baseado em contratos, regras e nas nove imagens fornecidas; FD-02 benchmark externo/responsivo formal ainda não concluído.

## Objetivo e limite

Definir **o que existe, como se encontra e como se comporta** na loja e no backoffice — sem escolher logotipo, tipografia, tokens, cores finais, fotografias ou componentes. O Atlas é **B2C fictício, single seller** com livros físicos, e-books, revistas digitais e kits, não necessariamente uma livraria religiosa; rótulos como Bíblia/EBD aparecem nas imagens apenas como exemplos de filtros editoriais e **não são categorias obrigatórias**.

### Índice de entregáveis

| ID | Arquivo | Propósito |
|---|---|---|
| FD-03-01 | [Sitemap e navegação](FD-03-01-sitemap-navegacao.md) | IA, rotas **candidatas** e permissão |
| FD-03-02 | [Jornadas comerciais](FD-03-02-jornadas-comerciais.md) | Descoberta, checkout autenticado, falha financeira, acesso digital |
| FD-03-03 | [Inventário de telas/estados](FD-03-03-inventario-telas-estados.md) | Conteúdo, erro, vazio, loading e responsividade |
| FD-03-04 | [Taxonomia e busca](FD-03-04-taxonomia-filtros.md) | Edição/formato, facetas, busca, prévia e variantes |
| FD-03-05 | [Backoffice operacional](FD-03-05-backoffice-jornadas.md) | Separação do admin, roles, dupla aprovação |
| FD-03-06 | [A11y/responsividade](FD-03-06-responsividade-a11y.md) | Critérios verificáveis de UX por viewport |
| FD-03-07 | [Critérios/gates](FD-03-07-rastreabilidade-gates.md) | UXA-001–024; vínculo com RN/PC/SEC/CT |
| FD-03-08 | [Decisões a ratificar](FD-03-08-decisoes-abertas.md) | Fechar antes de FD-04/05 |
| Diagramas | [Pacote de diagramas](diagrams/README.md) | IA-01, UX-01, UX-02, ADM-01; fontes e imagens separadas |

## Direção herdada das nove capturas

- [Home](../references/storefront/home-atlas-commerce.png): áreas editoriais e descoberta, sem catálogo/marketing fictício como fatos.
- [Categoria Revistas](../references/storefront/categorias-atlas-commerce.png) e [Categoria Bíblias](../references/storefront/categorias-2-atlas-commerce.png): grid e facetas condicionadas aos metadados existentes.
- [Pesquisa](../references/storefront/pesquisa-atlas-commerce.png): autocomplete e filtros com resultados efetivos.
- [Produto físico](../references/storefront/produto-atlas-commerce.png), [Livro](../references/storefront/produtos-atlas-commerce.png), [Revista digital](../references/storefront/produto-digital-atlas-commerce.png): ficha editorial densa, opções reais e prévia parcial legal.
- [Carrinho](../references/storefront/carrinho-atlas-commerce.png), [Checkout](../references/storefront/checkout-atlas-commerce.png): síntese e legibilidade; **não** importar compra como convidado, Pix/boleto, cartão digitado no próprio site, 1-click, selos de segurança, parcelamento ou promessa de desconto/frete.

## Restrições fundamentais

1. Uma única identidade editorial futura **Atlas Commerce**, sem copiar VerboVivo, suas capas ou mídias.
2. **Conta obrigatória** ao iniciar o checkout; visitantes podem pesquisar e montar carrinho.
3. **Stripe Checkout hospedado, apenas Test Mode**. O browser não é fonte de confirmação de pagamento.
4. Reserva física no DB por **40 min**, sessão externa por até **30 min** e margem de **5 min**, sujeitas à prova ST. Não mostrar countdown baseado só no navegador como autoridade.
5. Tardio após expiração: **PAYMENT_REVIEW**, sem entrega, com compensação financeira idempotente.
6. Direito de arquivo digital nasce apenas de entitlement persistido; kit misto exige pagamento válido e alocação física integral.
7. Operador exige sessão staff diferenciada, MFA/step-up e autorização por recurso; UI não é controle de acesso.
8. Nenhuma recomendação de UI desta etapa autoriza implementação de backend ou criação de endpoint não inventariado em CT-01.

**Referências principais:** [FD-01](../FD-01-direcao-design-frontend-premium.md), [FD-02 selecionada](../FD-02-referencias-visuais-usuario.md), [CT-01](../contracts/CT-01-inventario-http.md), [PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md), [DS-003](../../04-architecture/security/authorization-matrix.md).
