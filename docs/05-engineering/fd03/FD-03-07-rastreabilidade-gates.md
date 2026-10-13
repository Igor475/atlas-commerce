# FD-03-07 — Matriz de validação UXA-001–024

> Todos os itens são **PLANEJADOS, NÃO EXECUTADOS**. Um desenho documental não significa funcionalidade entregue. Resultado futuro deve apontar página, protótipo, viewport, acessibilidade, evidência e requisito/contrato.

| ID | Prova futura de UX | Origem/regra |
|---|---|---|
| UXA-001 | Homepage original permite iniciar descoberta sem promoções inventadas | FD-02 / Catálogo |
| UXA-002 | Categoria publica somente itens válidos | Catalog / CT-01 |
| UXA-003 | Busca vazia, sem resultado e erro são diferentes | FD-03-04 |
| UXA-004 | Facetas com atributos inexistentes não aparecem | FD-03-04 |
| UXA-005 | Contagens não são fabricadas | FD-02 / CT-01 |
| UXA-006 | Produto físico indica estoque/preço de fonte verdadeira | Pricing / Inventory |
| UXA-007 | Formato físico/digital não transfere licença implicitamente | PC-04 / Library |
| UXA-008 | Revista pública mostra amostra parcial apenas | SEC / R2 / Library |
| UXA-009 | Carrinho de visitante existe sem reservar estoque | BRD / PC-01 |
| UXA-010 | CTA checkout exige conta autenticada e preserva intenção segura | ADR-003 / CT-06 |
| UXA-011 | Quote é recalculada no servidor e mudança é visível | Pricing / CT-01 |
| UXA-012 | Checkout monta componente oficial Stripe incorporado no Atlas apenas com sessão Test Mode elegível; sem redirect hosted inicial | ADR-004 adendo / PC-01 / CT-10 |
| UXA-013 | PAN/CVV pertencem ao componente Stripe, sem campos próprios Atlas, Pix/boleto ou guest checkout | FD-02 / ADR-004 adendo |
| UXA-014 | Return do Stripe não confirma pagamento | PC-02 / CT-01 |
| UXA-015 | 40/30/5 e estado pendente não alegam SLA do plano Free | PC-01 / ADR-009/010 |
| UXA-016 | PAYMENT_REVIEW não permite entrega e oferece status real | PC-02 |
| UXA-017 | Kit misto sem físico integral não concede digital | PC-04 |
| UXA-018 | Biblioteca nega item de outro titular e link expirado | SEC / CT-06 |
| UXA-019 | Pedido de outro titular não vaza existência/dados | CT-06 |
| UXA-020 | Staff sem MFA/capability não acessa ação privilegiada | ADR-003 / DS-003 |
| UXA-021 | Refund não aceita solicitante=aprovador nem presume SUCCEEDED | DS-003 / PC-03 |
| UXA-022 | Mobile 320/375, tablet 768 e desktop 1440 usam reflow correto | FD-03-06 |
| UXA-023 | Teclado, foco, zoom, mensagens, contraste e leitor de tela revisados | WCAG 2.2 AA alvo |
| UXA-024 | As nove capturas inspiram composição, mas não são copiadas/brand reaproveitada | FD-01/02 |

**Extensão preservada:** [UXA-025–044](FD-03-12-criterios-aceite-complementares.md), incluindo identidade, favoritos, conta e pagamento incorporado. Os 44 casos continuam planejados/não executados; aprovação humana de arquitetura não marca testes como PASS.

## Gates de passagem para FD-04

- [x] Responsável aprovou arquitetura de navegação e separação storefront/admin (FD-03-R01/R02).
- [x] Responsável escolheu Checkout incorporado como direção e aprovou jornadas conceituais; implementação/fluxo financeiro real ainda sujeito a ST e contratos (FD-03-R03).
- [ ] Inventário de páginas e estados recebe comentários e priorização MVP/evolução.
- [ ] Decisões de FD-03-08 classificadas como aceitas, revisáveis ou bloqueadas.
- [ ] Pesquisa complementar FD-02 ainda aberta é explicitamente considerada, sem declarar conclusão fictícia.
- [ ] FD-04 terá **2–3 conceitos originais** para escolha, não implementação direta de mockup sem aprovação.

**Fontes:** [FD-01](../FD-01-direcao-design-frontend-premium.md), [FD-02](../FD-02-referencias-visuais-usuario.md), [PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md), [CT](../contracts/README.md), [DS-003](../../04-architecture/security/authorization-matrix.md).
