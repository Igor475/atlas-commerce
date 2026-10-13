# FD-03 — Arquitetura da Informação e Experiência (Atlas Commerce)

> **Estado: ARQUITETURA DE NAVEGAÇÃO APROVADA PELO RESPONSÁVEL — FD-03 v0.2, 13/10/2026.** URLs finais, contratos e integração Stripe incorporada ainda dependem de ratificação/prova; a aprovação conceitual não é homologação técnica. Nenhum código de UI, protótipo ou design system criado. Documento baseado em contratos, regras e nas nove imagens fornecidas; FD-02 benchmark externo/responsivo formal ainda não concluído.

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
| FD-03-09 | [Inventário completo P01–P50/A01–A14](FD-03-09-inventario-completo-paginas.md) | Famílias preservadas e páginas ampliadas; URLs candidatas |
| FD-03-10 | [Identidade, favoritos e conta](FD-03-10-jornadas-identidade-favoritos.md) | J05–J10 e lacunas contratuais |
| FD-03-11 | [Stripe incorporado](FD-03-11-checkout-stripe-incorporado.md) | Direção aprovada, API/SDK/ui_mode pendentes de prova |
| FD-03-12 | [UXA-025–044](FD-03-12-criterios-aceite-complementares.md) | Gates planejados, não executados |
| FD-03-13 | [Decisões ratificadas v0.2](FD-03-13-status-decisoes-v02.md) | Aprovação de navegação e apresentação; limites |
| Diagramas | [Pacote de diagramas](diagrams/README.md) | IA-01, UX-01, UX-02, ADM-01; complementos [IA-02](diagrams/IA-02-navegacao-ampliada.md) e [UX-03](diagrams/UX-03-stripe-incorporado.md), sempre separados |

## Direção herdada das nove capturas

- [Home](../references/storefront/home-atlas-commerce.png): áreas editoriais e descoberta, sem catálogo/marketing fictício como fatos.
- [Categoria Revistas](../references/storefront/categorias-atlas-commerce.png) e [Categoria Bíblias](../references/storefront/categorias-2-atlas-commerce.png): grid e facetas condicionadas aos metadados existentes.
- [Pesquisa](../references/storefront/pesquisa-atlas-commerce.png): autocomplete e filtros com resultados efetivos.
- [Produto físico](../references/storefront/produto-atlas-commerce.png), [Livro](../references/storefront/produtos-atlas-commerce.png), [Revista digital](../references/storefront/produto-digital-atlas-commerce.png): ficha editorial densa, opções reais e prévia parcial legal.
- [Carrinho](../references/storefront/carrinho-atlas-commerce.png), [Checkout](../references/storefront/checkout-atlas-commerce.png): síntese e legibilidade; **não** importar compra como convidado, Pix/boleto, campos PAN/CVV construídos pelo Atlas, 1-click, selos de segurança, parcelamento ou promessa de desconto/frete.

## Restrições fundamentais

1. Uma única identidade editorial futura **Atlas Commerce**, sem copiar VerboVivo, suas capas ou mídias.
2. **Conta obrigatória** ao iniciar o checkout; visitantes podem pesquisar e montar carrinho.
3. **Stripe Checkout incorporado à página Atlas, apenas Test Mode**, conforme [adendo ADR-004](../../04-architecture/adrs/ADR-004-ADENDO-UI-EMBEDDED.md). Componente oficial Stripe, sem captura própria de PAN/CVV; não iniciar por redirect hosted. `ui_mode`/API/SDK ficam pendentes de versão exata e prova. O browser não é fonte de confirmação de pagamento.
4. Reserva física no DB por **40 min somente quando houver itens físicos**; pedido exclusivamente digital não cria reserva física (RN-079). A ADR-004 refina a sessão Stripe para **30 min propostos desde sua criação**, com término pelo menos **5 min antes** da reserva quando aplicável; compatibilidade 40/30/5 permanece condicionada à prova ST. Não reduzir a sessão abaixo de 30 min para compensar atraso nem usar countdown do browser como autoridade.
5. Tardio após expiração: **PAYMENT_REVIEW**, sem entrega, com compensação financeira idempotente.
6. Direito de arquivo digital nasce apenas de entitlement persistido; kit misto exige pagamento válido e alocação física integral.
7. Operador exige sessão staff diferenciada, MFA/step-up e autorização por recurso; UI não é controle de acesso.
8. Nenhuma recomendação de UI desta etapa autoriza implementação de backend ou criação de endpoint não inventariado em CT-01.

**Referências principais:** [FD-01](../FD-01-direcao-design-frontend-premium.md), [FD-02 selecionada](../FD-02-referencias-visuais-usuario.md), [CT-01](../contracts/CT-01-inventario-http.md), [PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md), [DS-003](../../04-architecture/security/authorization-matrix.md).

## Precedência da decisão v0.2 e histórico preservado

FD-03-R01–R03 aprovam navegação, cobertura de P01–P50/A01–A14 e apresentação incorporada. Favoritos, ofertas, lançamentos, coleções, autores, identidade completa, conta, suporte, políticas e vazios fazem parte do planejamento; ações persistentes e URLs continuam condicionadas a contratos. FD-04 deve propor **2–3 conceitos originais de marca/layout** para aprovação, antes dos mockups FD-05 e de qualquer código.

O texto recebido de FD-03-09–13/CT-10 registra o estado anterior à sincronização e suas instruções de migração; o delta proposto atualizado está em CT-01/02/08/OpenAPI. FD-01/02, registros históricos da Fase 03 e o rótulo “hospedado” do UX-02 permanecem preservados como referências anteriores de apresentação; **não orientam redirect inicial no fluxo ativo**. Prevalece a modalidade incorporada do adendo, sem alterar suas exigências de conta, PSP, entitlement ou originalidade. A atualização preserva IA-02/UX-03/UX-02/ADM-01 e as nove capturas.
