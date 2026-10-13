# FD-03-11 — Checkout Stripe incorporado à loja (direção aprovada)

> **Decisão do responsável em 13/10/2026:** pagamento **na própria experiência de checkout do Atlas**, e não redirecionamento inicial para página Stripe hospedada. **Modo sugerido:** Checkout Sessions com formulário Stripe incorporado, utilizando valor `ui_mode` compatível com a versão Stripe API/SDK explicitamente fixada e testada. Não confundir com formulário de cartão desenvolvido pelo Atlas.

## Interpretação técnica de "transparente"

- **Escolha de UX aprovada:** cliente permanece no site Atlas para concluir o pagamento inicial; há formulário gerenciado pela Stripe dentro da página.
- **Primeira integração proposta:** Stripe **Embedded Checkout (embedded form)**. Esta opção preserva a proteção dos dados sensíveis pela Stripe com menos elementos de pagamento customizados. A interface em volta — cabeçalho, endereço, revisão, resumo do pedido e estados — recebe o design premium original aprovado em FD-04/05.
- **Alternativa técnica (não aprovada):** Checkout com Elements/Custom UI. Traz mais controle sobre formulário e fluxo, mas exige decisão própria e testes; não implementar automaticamente.
- **Versionamento crítico:** na documentação oficial atual de 13/10/2026, a API de criação pode listar `ui_mode: embedded_page` (em versões e exemplos anteriores, `embedded`). O Codex DEVE verificar o enum concreto da **versão efetivamente usada** no SDK/API Stripe em Test Mode. Não codificar um desses strings por suposição ou apenas por este documento.

Referências oficiais: https://docs.stripe.com/payments/checkout/quickstarts e https://docs.stripe.com/api/checkout/sessions/create

## Etapas da jornada (P09/P47/P48)

1. **Carrinho**: visitante pode selecionar itens. Nenhuma reserva de estoque antes do checkout.
2. **Identificação**: conta de cliente ativa obrigatória; se não, login/cadastro/recovery, retornando ao contexto com sessão segura.
3. **Endereço e entrega**, apenas quando houver item físico: selecionar endereço próprio e método de frete determinístico **simulado**, calculado no servidor. Digital puro dispensa endereço de entrega quando não exigido por motivo legal/PSP.
4. **Revisão**: backend cria/recalcula quote; comprador confere itens, edições, quantidade, preços em centavos, cupom autorizado e total. Consentimentos necessários e fluxo de erro.
5. **Criar intenção**: `POST /api/v1/checkouts` autenticado, CSRF e `Idempotency-Key`; em transação PostgreSQL cria pedido/snapshot/outbox e reserva física de **40 minutos quando aplicável**. Digital puro **não cria reserva física nem `reservationExpiresAt` artificial**.
6. **Sessão Stripe**: após commit, Payments prepara Checkout Session Test Mode com `mode=payment`, modalidade embedded, cartão de teste elegível e expiração proposta 30 min. Para físico, comprovar `stripe_expires_at <= reservation_expires_at - 5min` antes de liberar apresentação da sessão. Se não couber na janela, NÃO montar Stripe; resolver estado pendente/reconciliação sem novo pagamento duplicado.
7. **Renderização segura**: backend devolve um **client secret efêmero da sessão Checkout**, somente ao cliente autenticado e vinculado à intenção/ordem, via TLS e resposta `Cache-Control: no-store`. Pode ser usado pelo componente oficial da Stripe no navegador; **não é Stripe secret API key nem authorization token da conta**. Não registrar em log, analytics, URL, histórico, query string, error telemetry ou armazenamento persistente do browser.
8. **Interação**: o formulário de pagamento fica incorporado ao Atlas; dados PAN/CVV jamais são campos próprios, jamais transitam pelo NestJS. CSP e allowlists Stripe compatíveis com recursos oficiais; não habilitar iframes de qualquer origem. Erros do frame, atraso, foco e reflow devem ser testados.
9. **Autenticação adicional**: desafios 3DS e alguns métodos podem abrir modal/redirect de autenticação bancária; este comportamento externo não viola a direção de checkout incorporado. Em Test Mode inicial, habilitar somente cartão e casos autorizados.
10. **Conclusão visual**: Stripe pode notificar término do componente ou redirecionar `return_url` quando necessário. **Esses eventos NÃO provam pagamento**. P48 consulta somente estado persistido autorizado em NestJS; mostrar aguardando confirmação/confirmado/revisão/expirado. Webhook com assinatura válida ou consulta Stripe reconciliada é autoridade financeira.
11. **Recuperação/expiração**: refresh/desconexão usam intenção persistida com a mesma chave e identidade; nunca criar sessão/cobrança nova por erro de frame; token expirado reentra em fluxo seguro controlado. Render/Supabase Free podem estar offline.

## Diferenças da integração antiga hosted

| Elemento | Antes (a substituir) | Nova direção |
|---|---|---|
| UI inicial Stripe | redirect para `checkoutUrl` externo | renderização incorporada com client secret de sessão |
| API `POST /checkouts` | `201 checkoutUrl` | `201 payment.presentation=EMBEDDED` + dados mínimos para componente seguro; `202` recuperável sem client secret de sessão pronto |
| `return_url` | `success_url` hosted | retorno/autenticação **condicional** ao modo incorporado; `success_url` não permitido nos modos embedded modernos, verificar API versionada |
| Revalidação | webpage de retorno consulta pedido | componente/retorno consulta pedido; webhook continua autoridade |
| Prazo | reserva 40m / sessão 30m / buffer 5m | **mesma política** com prova na sessão embedded |
| Digital puro | sem reserva física | **sem reserva física**; `reservationExpiresAt` sempre presente e null, [UXD-16 ratificada pelo responsável em 13/10/2026](../contracts/UXD-16-RATIFICACAO-RESPONSAVEL.md); demais CT-10/Stripe pendentes |

## Segurança e integridade: proibições

- Nunca afirmar `PAID` no browser por resultado JS, URL, client secret ou retorno. Nunca liberar R2 por callback de frontend.
- Nunca mostrar Pix/boleto, Apple Pay, parcelas, juros, “100% seguro”, badges/certificações, descontos ou frete grátis das referências sem contrato, testes e autorização.
- Nunca executar Stripe dentro da transação que segura locks de estoque.
- Nunca usar nova idempotency key automaticamente após timeout financeiro ambíguo; usar mesmo contexto e conciliar.
- Nunca incluir Stripe API secret key, webhook signing secret, client secret em logs ou analytics; component client secret é apenas de apresentação, com escopo mínimo.
- Nunca instalar SDK Stripe, alterar OpenAPI normativo ou executar código comercial neste complemento documental; trabalho separado pelo Codex depois de ratificação completa.

## Cenários especiais

- Físico e kit misto: reserva/expiração e alocação atômicas; pagamento tardio => `PAYMENT_REVIEW` e reembolso integral idempotente, sem fulfillment.
- Pedido somente digital: **sem reserva de estoque**; precisa política comercial de expiração e condição de entitlement, não inventar TTL físico.
- Banco/plataforma Free pausados: status degradado, retentativa segura, sem prometer sincronização imediata.
- Pagamento falho e restauração de estado: nenhum débito extra por refresh/retry.

**Gates:** UXA-025–034 (FD-03-12), ST-001–016 **adaptados** ao modo embedded, CT-10 e revisão de ADR-004/CT-01/CT-02/OpenAPI/UX-01, versionados. **Não homologado nem implementado.**
