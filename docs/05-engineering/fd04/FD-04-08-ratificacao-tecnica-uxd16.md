# UXD-16 — Parecer técnico favorável ao contrato obrigatório e anulável

> **Situação:** **PARECER TÉCNICO FAVORÁVEL, RATIFICAÇÃO DO RESPONSÁVEL PENDENTE**. Há parecer técnico do assistente, mas não foi identificada aprovação expressa do responsável para o campo obrigatório/anulável. **Não registrar APROVADO PELO RESPONSÁVEL nem atualizar marcadores contratuais como ratificados**. Aplica-se ao desenho do DTO `CheckoutResult`, não a migrations nem lógica comercial executável.

## Forma recomendada tecnicamente — proposta contratual

O campo **`reservationExpiresAt` é obrigatório e admite `string | null`** em resposta de `POST /api/v1/checkouts`.

| Pedido | Valor | Razão |
|---|---|---|
| Físico | string RFC 3339 date-time UTC | reserva física realmente criada |
| Kit físico ou misto | string RFC 3339 date-time UTC | existe ao menos componente físico e reserva all-or-nothing |
| E-book/revista 100% digitais | `null` | **não existe** reserva de estoque físico |
| Kit exclusivamente digital | `null` | licença/elegibilidade digital sem reserva física |

**Não omitir a propriedade**, não devolver `""`, falso `0`, nem sintetizar `orderCreatedAt+40m` em pedido sem físicos. O `null` não afirma pagamento realizado, licença concedida, validade comercial ilimitada ou ausência de sessão Stripe. `payment.sessionExpiresAt` é o vencimento distinto da sessão da Stripe e deve seguir as guardas propostas de `READY`.

## Forma OpenAPI 3.1 já proposta no GitHub

```yaml
CheckoutResult:
  type: object
  required: [orderId, state, reservationExpiresAt, payment]
  properties:
    reservationExpiresAt:
      type: [string, 'null']
      format: date-time
```

Quando a API tiver discriminante confiável de `containsPhysicalItems` ou equivalente derivado exclusivamente do snapshot persistido, o validador de domínio deve impor a correspondência **nulo ↔ sem físicos**. Não confiar num boolean recebido do cliente. O schema estrutural sozinho **não prova** coerência semântica se a propriedade discriminante não constar da resposta.

## Testes contratuais indispensáveis

1. Digital puro → `reservationExpiresAt: null`; idem kit exclusivamente digital.
2. Físico/kit misto com transação persistida → timestamp válido e origem PostgreSQL.
3. Propriedade ausente, string vazia ou timestamp inválido → resposta recusada no contrato.
4. Digital puro com timestamp artificial → falha na regra de domínio.
5. Físico com `null` após reserva persistida → falha na regra de domínio.
6. A mesma chave idempotente mantém estado persistido e não cria reserva ou Checkout Session duplicada.
7. `payment.sessionStatus=READY` implica `clientSecret` e `sessionExpiresAt` válidos apenas para o titular; PENDING/reconciliação não retorna `clientSecret`.
8. Expiração da sessão Stripe e expiração da reserva permanecem campos independentes; nenhum callback browser cria `PAID`.
9. Sessão de pagamento para digital puro deve ter validade comercial própria; essa **política está em aberto** e não é substituída pelo `null`.

## Próximo ajuste documental

Os documentos [`CT-02`](../contracts/CT-02-dtos-validacao.md), [`CT-10`](../contracts/CT-10-migracao-embedded-checkout-proposta.md), OpenAPI v1, cenários CT-08, [`FD-03-08`](../fd03/FD-03-08-decisoes-abertas.md) e [`FD-03-13`](../fd03/FD-03-13-status-decisoes-v02.md) ainda podem marcar UXD-16 como pendente. Após **aceite explícito do responsável**, alterar cirurgicamente somente o status e os testes de resposta, sem mudar RN-079, TTL 40/30/5, Stripe Test Mode ou a reserva real. Fixar `ui_mode` Stripe só depois de spike compatível com API/SDK versionados.
