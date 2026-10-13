# FD-04-09 — Decisão de direção criativa: Coleção Viva

> **Decisão do responsável — 13/10/2026: APROVADA a direção A — Coleção Viva.** Escopo: **conceito visual do Atlas Commerce**, não identidade final, mockups, tokens homologados ou implementação Next.js. Baseline GitHub consultada antes do pacote: `6f8c6ca70dfb51499fee76e4bde0bba65aed819e`.

## Deliberação expressa

O responsável escolheu a **recomendação A — Coleção Viva** entre A, B e C. A partir desta decisão:

1. A é a base de direção de arte e UX visual para o storefront Atlas Commerce.
2. B — Caderno Editorial e C — Estúdio Contemporâneo permanecem **alternativas históricas não escolhidas**, mas é permitido extrair princípios genéricos (sofisticação tipográfica de B e clareza operacional de C) sem produzir um híbrido inconsistente.
3. As [nove capturas selecionadas](../FD-02-referencias-visuais-usuario.md) continuam sendo referências visuais prioritárias. **Não** copiar marca VerboVivo, identidade, composição literal, capas, imagens, avaliações e afirmações comerciais.
4. O produto continua sendo **B2C editorial demonstrativo single-seller**, sem categorias religiosas obrigatórias, com catálogo apenas fictício ou licenciado.
5. Esta aprovação não libera o Codex para criar homepage, painel, componentes de UI definitivos ou configurar Stripe.

## Assinatura aprovada em nível conceitual

**Editorial acolhedor, contemporâneo e comercial**. Capa e título em primeiro plano; ritmo entre áreas de descoberta e catálogo funcional; hierarquia serifada em títulos de impacto combinada com fontes de interface legíveis; predominância de superfícies claras e verde profundo; acentos quentes discretos; detalhes contidos e layouts originais.

A referência de paleta em [Conceito A](FD-04-02-conceito-A-colecao-viva.md) continua **exploratória**; hex exato, famílias tipográficas, monograma/logo, iconografia, art direction fotográfica, copy e componentes/estados definitivos dependem de FD-04 refinada + FD-05 com aprovação humana.

## Separação de superfícies

- **Storefront**: personalidade editorial, descoberta, pesquisa, catálogo, páginas de produto, identidade do comprador, favoritos quando contratados, carrinho, pagamento incorporado e biblioteca.
- **Admin**: linguagem de produto coerente, porém foco em produtividade, densidade, permissões, MFA, estados financeiros e auditabilidade; não converter o dashboard em uma vitrine.
- **Checkout**: a composição original da página Atlas envolve o **componente oficial de Stripe Checkout incorporado, em Test Mode**; não editar campos sensíveis do Stripe, nem presumir pagamento concluído pelo browser.

## Status de decisões separadas

| Decisão | Estado depois desta ratificação |
|---|---|
| FD-03 sitemap e jornadas P01–P50/A01–A14 | **APROVADOS conceitualmente** |
| FD-04 direção A — Coleção Viva | **APROVADA PELO RESPONSÁVEL** |
| FD-04 tokens/identidade final | **PENDENTES** |
| FD-05 wireframes/mockups/protótipos | **PENDENTES** |
| UXD-16 `reservationExpiresAt` obrigatório/anulável | **PARECER TÉCNICO FAVORÁVEL; ACEITE EXPRESSO DO RESPONSÁVEL PENDENTE** |
| Stripe `ui_mode` concreto, 40/30/5, webhooks, refunds | **PENDENTES DE SPIKE** |
| F04-05 Supabase remoto L1 | **PENDENTE** |

A aprovação do conceito A **não** deve ser reaproveitada como aprovação implícita de UXD-16 ou qualquer mudança em CT/ADR.

## Rastreabilidade

- [Conceito A original](FD-04-02-conceito-A-colecao-viva.md)
- [Matriz original de decisão](FD-04-05-matriz-decisao.md)
- [Fundações de Design System](FD-04-06-fundacoes-design-system.md)
- [Padrões por tela](FD-04-07-padroes-por-tela.md)
- [Parecer UXD-16](FD-04-08-ratificacao-tecnica-uxd16.md)
- [FD-05 — plano de mockups](../fd05/FD-05-00-plano-de-mockups.md)
