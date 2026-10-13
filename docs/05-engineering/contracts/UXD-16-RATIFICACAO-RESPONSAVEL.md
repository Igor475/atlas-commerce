# UXD-16 — Ratificação expressa da forma `reservationExpiresAt`

> **Situação:** APROVADO PELO RESPONSÁVEL em 13/10/2026, na conversa do Atlas Commerce. Este arquivo registra a decisão; **não** declara controller, DTO, banco ou Stripe implementados. Os marcadores antigos do OpenAPI/FD-03/FD-04 serão sincronizados pelo prompt dedicado.

## Decisão exata

O campo `reservationExpiresAt` deve ser **obrigatório** em `CheckoutResult` e admitir `string RFC 3339 date-time UTC | null`:

| Composição do pedido persistido | Resposta obrigatória |
|---|---|
| Contém pelo menos um item/componente físico (livro físico, kit físico, kit misto) | Timestamp verdadeiro da reserva física ativa/criada sob relógio PostgreSQL |
| Contém **somente** itens digitais (e-book, revista digital ou kit exclusivamente digital) | `null` |

Não omitir o campo, não devolver string vazia, não usar `order.created_at + 40 min` como simulação no pedido digital e não confiar em flag `hasPhysicalItems` informada pelo navegador. A nulidade do prazo físico não prova pagamento, não gera direito de download nem dispensa validade própria da Checkout Session Stripe.

## OpenAPI 3.1

```yaml
required:
  - orderId
  - state
  - reservationExpiresAt
  - payment
properties:
  reservationExpiresAt:
    type: [string, 'null']
    format: date-time
```

A especificação estrutural já possui esse shape proposto; alterar **status/descrição**, sem mudar tipo ou remover `required`. A invariável `null ↔ ausência de componente físico no snapshot` exige validação de domínio adicional quando Orders existir.

## Provas futuras obrigatórias

1. Pedido físico, kit físico/misto → timestamp vindo de reserva PostgreSQL real.
2. Pedido exclusivamente digital, incluindo kit digital → `null`, sem reserva fictícia.
3. Campo ausente, vazia, data inválida, físico com `null` e digital com timestamp artificial → rejeitados pelos testes de contrato/domínio.
4. `payment.sessionExpiresAt` independente, distinto de expiração física.
5. Idempotência, replay, vencimento, saldo financeiro e elegibilidade não mudam por esta decisão.
6. O frontend não pode concluir pagamento nem liberar biblioteca com base nesses campos.

## Arquivos preexistentes onde a ratificação deve aparecer

`docs/05-engineering/contracts/openapi/atlas-commerce-api-v1.yaml` (`x-atlas-ratification`); `CT-02-dtos-validacao.md`, `CT-08-cenarios-validacao-api.md`, `CT-10-migracao-embedded-checkout-proposta.md`, `README.md`; `docs/05-engineering/fd03/FD-03-08-decisoes-abertas.md` e `FD-03-13-status-decisoes-v02.md`; `docs/05-engineering/fd04/FD-04-08-ratificacao-tecnica-uxd16.md`; `docs/05-engineering/fd05/FD-05-00-plano-de-mockups.md`; `docs/05-engineering/README.md` se referir a status antigo.

**Sem alteração:** RN-079, PC-01–04, política 40/30/5, Stripe Embedded Test Mode, segurança, alçadas DS-003, status da prova de PSP/Supabase. Esse aceite não autoriza implementar checkout.
