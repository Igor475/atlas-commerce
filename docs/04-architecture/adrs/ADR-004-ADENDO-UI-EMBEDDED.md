# ADR-004 — Adendo 2026-10-13: Stripe Checkout incorporado ao Atlas

> **Status:** DECISÃO DE EXPERIÊNCIA **ACEITA EXPRESSAMENTE pelo responsável**. A ADR-004 original ainda precisa ser sincronizada sem perda de histórico e sem afirmar homologação. **Não** é uma nova ADR numerada. **Não** libera implementação Stripe sem validação ST.

## Contexto

A ADR-004 previa Checkout hospedado e redirecionamento para Stripe. O responsável solicitou explicitamente Checkout transparente **dentro da página de checkout do e-commerce**. O requisito visual tem prioridade sobre a antiga escolha de modalidade de apresentação, mas não muda o provedor nem as invariantes transacionais.

## Decisão

1. Manter **Stripe Checkout Sessions**, BRL, **Test Mode**, cartão de teste inicialmente elegível, conta cliente obrigatória e confirmação server-side com webhook assinado/consulta PSP.
2. Substituir apresentação hosted por **Checkout com formulário incorporado** (Embedded Checkout), dentro do `apps/storefront`, sem campos próprios de dados sensíveis de cartão. A avaliação futura de Elements/Custom UI exige ADR/ratificação própria.
3. O valor concreto do campo `ui_mode` deve seguir a **API e o SDK versionados** usados no spike. Documentação Stripe mais recente em 13/10/2026 cita `embedded_page` enquanto materiais anteriores citam `embedded`: não declarar valor homologado antes da execução.
4. Preservar **reserva física de 40 min, sessão Stripe proposta de 30 min, buffer ≥5 min**, tempo do PostgreSQL no ponto de decisão, reconciliação, outbox/inbox, idempotência, tratamento tardio `PAYMENT_REVIEW` e reembolso integral idempotente quando aplicável.
5. Pedido puramente digital não recebe reserva física; compatibilidade com `reservationExpiresAt` em OpenAPI deve ser corrigida por contrato revisado, não inventando prazo.
6. Client secret de sessão embedded é dado sensível de uso pelo SDK no browser autenticado: distribuir apenas a quem tem acesso ao checkout, sob TLS, `no-store`, sem log, URL, analytics ou exposição entre contas; nunca expor segredo privado `sk_test` ou `whsec`.
7. Algumas autenticações/redirects bancários externos podem ocorrer. **Transparente** significa que a etapa principal de pagamento fica na loja, não promessa de ausência de qualquer navegação externa.
8. Manter Vercel Hobby/Render Free/Supabase Free/R2 Free **somente demonstrativo**, sem cobranças reais.

## Motivo e consequências

Benefício: fluxo visual integrado e marca original, compatível com as nove referências de hierarquia visual selecionadas, sob componente PCI do provedor. Custos: integração do browser com Stripe.js, CSP, tratamento de 3DS/return, acessibilidade, erros e critérios de teste. Não assumir que iframe incorporado pode ser estilizado pixel a pixel como os demais componentes Atlas.

## Critérios para modificar status para tecnicamente homologado

- Versão Stripe API/SDK, enum e método/card BRL verificados em Test Mode, client secret/return fluxo ensaiados.
- 40/30/5 em Checkout Embedded real, concorrência PG/Stripe, webhooks assinados raw body e refund/reconciliação idempotentes.
- CSP, cookie/Origin/CSRF, ausência de vazamento de secrets, 3DS/testes acessíveis e responsivos.
- Atualização coerente de ADR-004, ST, CT-01/02/08/OpenAPI, FD-03, RN/PC somente quando realmente necessário, com diff e aprovação humana.

**Registro:** escolha funcional aceita; **integração e contratos finais não implementados nem testados**. Fontes Stripe: https://docs.stripe.com/payments/checkout/quickstarts e https://docs.stripe.com/api/checkout/sessions/create .
