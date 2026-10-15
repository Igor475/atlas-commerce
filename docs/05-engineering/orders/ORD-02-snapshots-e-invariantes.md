# ORD-02 — Snapshots e invariantes

| Persistência Orders      | Invariantes                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `fixture_principal`      | Role de sessão fixa → ator artificial ativo, propósito TEST_ONLY                                            |
| `fixture_quote`          | Ator, itens canônicos, validade PostgreSQL; BASE_AT_PREPARE_TEST_ONLY                                       |
| `request`                | Unique ator/operação/chave; SHA-256 de cotação e itens; ID/Inventory key determinísticos; finalização única |
| `preparation`            | ID e titular vinculados à intenção; BRL; subtotal-base inteiro seguro; reserva real se físico               |
| `line_snapshot`          | Produto/edição/SKU, título, quantidade, preço-base/revisão, versão e dados editoriais mínimos               |
| `kit_component_snapshot` | Componente original, SKU/edição, formato, quantidade por kit e dados editoriais                             |
| `event`                  | Um fato técnico por preparação; timestamp do banco e prova interna PID/XID                                  |

FKs impedem referências inválidas. Índice por titular/ID atende leitura com
ownership. CHECKs limitam quantidades, tipos e dinheiro; triggers rejeitam
UPDATE/DELETE de snapshots, preparação e evento. Requests só aceitam
`result_id: null → seu próprio id`, sem mudança de payload. Runtime não recebe
SELECT bruto nem escrita nas tabelas.

Subtotal-base não é total final: não contém frete/desconto e não garante preço
futuro. A versão vigente é resolvida sob lock Pricing; kits usam o preço próprio
da oferta. Físicos avulsos e componentes são consolidados por SKU antes da
reserva. Digital não cria Inventory intent/reserva, nem recebe TTL artificial.

UXD-16 é demonstrada na projeção interna: `reservationExpiresAt` sempre presente,
UTC/RFC3339 da reserva real para físico/misto, `null` para ebook/revista/kit digital.
Não existe CheckoutResult HTTP nesta etapa. Provas internas, revisões de preço,
titulares e dados administrativos não são projetados ao consumidor.

Alterações posteriores em título, publicação e preço não reescrevem snapshots.
Não há cópia de PII, credenciais, objetos R2, descontos ou condições de entrega.
