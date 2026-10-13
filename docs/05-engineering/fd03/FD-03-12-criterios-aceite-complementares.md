# FD-03-12 — Gates complementares UXA-025–044

> **Todos PLANEJADOS/NÃO EXECUTADOS.** Preservar UXA-001–024; modificar UXA-012/013 para incorporar o novo checkout por sincronização separada.

| ID | Prova futura | Gate/origem |
|---|---|---|
| UXA-025 | Login permite retomar carrinho sem checkout automático e sem cross-account | ADR-003 / Identity |
| UXA-026 | Cadastro não finge verificação de e-mail; mensagens sem enumeração | AUTH/SEC |
| UXA-027 | Link de verificação inválido, vencido, usado e reenviado produz estados corretos | AUTH/SEC |
| UXA-028 | Recovery informa resposta neutra, token único e revogação de sessão | AUTH/SEC |
| UXA-029 | Favoritos vazios, indisponível e login com preservação de contexto | UXD-09 / CT pendente |
| UXA-030 | Ofertas/lançamentos só exibem descontos/preços e datas verificáveis | Pricing/Catalog |
| UXA-031 | Página de autor/coleção ordena edições e formatos com dados reais | Catalog |
| UXA-032 | Conta/endereço/segurança separa dados próprios, nega IDs alheios | Identity/CT-06 |
| UXA-033 | Pedidos, acompanhamento e devolução não afirmam reembolso pago sem prova | PC-02/03 / Returns |
| UXA-034 | Frontend renderiza Checkout Stripe **dentro da página Atlas** sem PAN/CVV próprio | ADR-004 adendo / CT-10 |
| UXA-035 | `client_secret` da Checkout Session é restrito e não aparece em logs/URL/cache | SEC/DS-004 |
| UXA-036 | Sessão embedded vencida/409/idempotência reproduz status sem nova cobrança | ST/PC-01 |
| UXA-037 | 3DS/falha/retorno do componente não marca pedido como pago | PC-02 / Payments |
| UXA-038 | Compra digital pura não fabrica `reservationExpiresAt` | RN-079 / CT-10 |
| UXA-039 | Reserva física real verifica 40/30/5 **na API Stripe embed real** | ADR-004 / ST |
| UXA-040 | Links de privacidade/termos/devolução revisados e legíveis | LGPD / Legal |
| UXA-041 | 404, indisponibilidade Free e reconnect não vazam IDs nem segredos | DS/SEC |
| UXA-042 | Login/cadastro/checkout responsivos 320/375/768/1440, teclado/foco/reflow | WCAG 2.2 AA alvo |
| UXA-043 | Backoffice mantém MFA/capability e não copia estética de vitrine | DS-003 / FD-01 |
| UXA-044 | Conformidade visual às nove referências é autoral, com FD-04/05 aprovados | FD-01/02 |

## Aceite de fase

- [x] Responsável aprovou arquitetura de navegação FD-03, incluindo ampliação pedida das páginas.
- [x] Responsável escolheu pagamento inicial incorporado no checkout da loja.
- [ ] Sincronização de ADR-004, ST, CT-01/02, OpenAPI, FD-03-01/02/03/07/08, UX-01/IA-01, e links de índice.
- [ ] Escolha explícita da versão exata Stripe API/SDK + `ui_mode` efetivo a testar.
- [ ] Aprovação de forma nula/ausente de `reservationExpiresAt` para digital puro.
- [ ] Contratos concretos de identidade, favoritos, ofertas, páginas adicionais e direitos autorais.
- [ ] FD-04: 2–3 conceitos de design originais, depois FD-05 mockups; ainda não implementados.

**Não promover teste visual planeado a PASS só por esta documentação.**
