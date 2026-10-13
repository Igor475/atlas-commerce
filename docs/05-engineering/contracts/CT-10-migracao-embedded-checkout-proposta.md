# CT-10 — Migração proposta dos contratos Stripe hosted → embedded

> **Tipo:** proposta de delta contratual para revisão. **Não substitui automaticamente** OpenAPI `atlas-commerce-api-v1.yaml`, CT-01/02 ou versões implantadas. Nenhuma API de checkout implementada neste projeto até aqui.

## Contrato de apresentação aprovado, DTO proposto

Em `POST /api/v1/checkouts`, devolver resposta do checkout **sem URL hosted**. A seleção exata das chaves será ratificada durante a revisão F04-02 e conforme a versão API Stripe. Proposta preliminar de **JSON ilustrativo** (IDs/opções fictícios, sem client secret real):

```json
{
  "orderId": "order_opaque_example",
  "state": "PENDING_PAYMENT",
  "reservationExpiresAt": null,
  "payment": {
    "sessionStatus": "PENDING",
    "presentation": "EMBEDDED",
    "sessionExpiresAt": null
  }
}
```

Para `payment.sessionStatus=READY`, substituir campos do status pendente por `sessionExpiresAt` e o **client secret de Checkout Session** obtido do Stripe de modo seguro. A entrega do segredo de cliente ao navegador tem finalidade de inicializar o componente oficial, e **não** equivale a `sk_test` nem a conceder autorização de pedido a qualquer browser. Guardas de sessão/titularidade, `no-store`, expiração, segregação de ambiente e não log obrigatórios. URL externa hosted deixa de ser dado principal da resposta. Se o SDK exigir uma chamada de recuperação exclusiva, avaliar endpoint adicional **antes** de criá-lo e inserir em CT/OpenAPI.

### Digital puro: divergência contratual UXD-16

- **Regra de domínio existente:** sem reserva física para pedido exclusivamente digital.
- **Contrato antigo:** `reservationExpiresAt` obrigatório como string date-time, incompatível.
- **Proposta recomendada:** manter a propriedade obrigatória com union `type: [string, 'null']`, `format: date-time` somente no valor string, e devolver `null` no digital puro. Isso torna a ausência explícita. **Depende de ratificação do contrato**, não está automaticamente aprovada só por FD-03. Outra alternativa é campo opcional, a avaliar em versionamento.
- **Não** criar `reservationExpiresAt = orderCreatedAt + 40m` para casos exclusivamente digitais.

### Indicador `payment.presentation`

Usar valor de negócio neutro como `EMBEDDED`, sem acoplar clients do domínio ao nome enum do Stripe (`embedded`, `embedded_page`, etc.). Adapter do Stripe verifica enum exato na versão fixada. Valores Stripe e semântica de `return_url`/`redirect_on_completion` sujeitos ao SDK/API atual e prova ST.

## Migração de documentos obrigatória

1. `docs/04-architecture/adrs/ADR-004-psp-sandbox.md`: trocar diretriz hosted pela modalidade Embedded Checkout; preservar PSP, Test Mode, BRL, cartão inicial, 40/30/5, validação raw webhook, refund, sem captura de PAN. Referenciar o adendo de decisão.
2. `docs/04-architecture/07-validacao-stripe.md`: substituir cenário de expor URL por liberar **client secret + form integrado** somente após prova temporal; adicionar embedded mounting/CSP/3DS/retorno/timeout, conservando ST-001–016 e acrescentando IDs se necessário.
3. `docs/05-engineering/contracts/CT-01-inventario-http.md`: revisar descrição de `POST /checkouts` e rastro 201/202.
4. `docs/05-engineering/contracts/CT-02-dtos-validacao.md`: revisar `CheckoutResult`, `checkoutUrl` e `reservationExpiresAt`.
5. `docs/05-engineering/contracts/openapi/atlas-commerce-api-v1.yaml`: semântica `payment` e `reservationExpiresAt`; atualizar exemplos, requisitos/descrições e doc version, validar YAML e schemas, testes negativos 201/202, corpo sem URL por default.
6. `docs/05-engineering/contracts/CT-08-cenarios-validacao-api.md`: atualizar cenários Checkout, digital puro, sessão expirada, reconciliação, sem renumerar testes.
7. `docs/05-engineering/fd03/README.md` e `FD-03-01/02/03/07/08`: substituir fala de redirect hosted; inventariar e ligar P16–P50, A09–A14, navegar estados. Preservar a proposta UXA-001–024 com atualização pontual de UXA-012/013, adicionar UXA-025–044.
8. `docs/05-engineering/fd03/diagrams/UX-01-checkout-autenticado.{dot,svg,png}` e `IA-01-sitemap-storefront.{dot,svg,png}`: sincronizar nós e representações, sem criar imagens falsas de páginas.
9. `docs/05-engineering/README.md`: índice para complementos e status FD-03 aprovado; manter F04-05 L1/Supabase pendente.
10. Buscar outras ocorrências **normativas** de Checkout hosted/redirect/URL (BRD/PC-01, adendos, ADR, segurança) e editar **somente quando houver contradição real**, preservando a decisão técnica, histórico e numeração de RN/PC. Registrar links e diff.

## Gate de segurança e prova

- Mesma `Idempotency-Key`/fingerprint retorna a mesma intenção, sem cobrar duas vezes.
- Sessão `READY` só com prazo elegível; montagem incorreta gera estado seguro sem client secret exposto.
- `clientSecret` não aparece em URL, logs, analytics, erro público, SSR estático, cache, cross-account.
- Browser/Stripe component/return não fazem pedido `PAID` sem evidência PSP, assinada e persistida.
- Para 3DS ou outros saltos externos, retorno seguro e revalidação do estado, sem prometer ausência completa de redirecionamentos.
- Em Test Mode, simular atraso 0/4/5/6 min, sessão expirando, duplicatas/out-of-order, pagamento tardio e refund idempotente.

**Fontes oficiais verificadas em 13/10/2026:** https://docs.stripe.com/payments/checkout/quickstarts ; https://docs.stripe.com/api/checkout/sessions/create . O enum para modo incorporado difere entre versões/documentações; **confirmar na SDK/API utilizada no código**.
