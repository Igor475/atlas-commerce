# SHIP-03 — Integração transacional

## Emissão e autoridade

O principal server-side CPINT_TEST_ONLY e session_user precisam apontar à mesma conta CUSTOMER ativa/verificada. Shipping chama `customer_profile.read_for_quote`, recebendo apenas ID/versão/país/CEP/elegibilidade. A zona é resolvida internamente; o browser não envia zona/tarifa/opção como autoridade. Atributos físicos são consultados pelo port privado Quotes, após Catalog compor o conjunto físico real do laboratório.

`quotes.issue_shipping` chama o fluxo CP-02 e projeta internamente subtotal e delivery. A seleção imutável contém ID/versão da política, zona/opção, tarifa, ID/versão postal, origem TEST_ONLY e elegibilidade. O endereço completo fica somente no snapshot autorizado Orders. A tabela histórica `quotes.fixture_policy` permanece como ponte de FK/TTL; seu preço híbrido/zona não participa do cálculo Shipping. Sua versão deve coincidir com Shipping, ou há recusa. Nenhum cliente controla essa ponte. A fixture_address antiga também permanece somente como ponte de FK: o harness a configura junto do endereço artificial Profile; sua zona/flags não são autoridade Shipping. Um endereço apenas em Profile, sem a ponte exigida pelo schema legado, falha fechado. Remover essa ponte requer evolução de schema separada antes de composição comercial.

O harness configura TTL 600 segundos, medido pelo PostgreSQL depois dos locks; cenários de fronteira usam explicitamente um segundo. Isso prova a decisão de dez minutos localmente, sem habilitar quote comercial. Quote não reserva estoque. Digital puro passa pelo preço/configuração temporal Quotes, mas não chama Shipping nem exige leitura postal.

## Preparação e evidência

`orders.prepare_shipping_quote` chama `orders.prepare_profile_quote` na mesma instrução/transação PostgreSQL. CP-02 chama a revalidação Quotes, que resolve novamente Shipping sob locks, comparando as condições completas com a evidência aceita. Preço, publicação, composição, versão postal, política/zona/opção ou expiração incompatíveis recusam sem corrigir total silenciosamente.

Após a preparação interna, `orders.shipping_evidence` congela delivery, quote, referências de política/zona, PID/XID. Snapshot postal, preparação, reserva Inventory, eventos e evidência Shipping confirmam no mesmo commit. Falha inclusive depois da reserva/evidência desfaz tudo. Digital persiste entrega null e não inventa reserva; null JSON do port legado é normalizado para SQL NULL no novo fato.

Replay por mesma chave/ator/quote recupera o histórico antes de exigir configuração atual, mas reautoriza a conta. Chave com quote diferente conflita. **Não implementa unicidade comercial definitiva por cotação**: chaves distintas ainda não constituem consumo comercial único. Esse requisito fica no handoff de checkout, sem composição pública nesta fatia.

A projeção interna ampliada não é o QuoteResult HTTP ativo, que é fechado e não aceita os novos campos. Aplicar QTE-POL-06, escolher tipos/enums e migrar consumidores requer entrega contratual separada; nenhuma rota ou OpenAPI foi alterada.

## Evidência local executada

SHIP-033: PID 766, XID 2845; xmin Shipping/Profile/Orders/Inventory: 2845, 2845, 2845, 2845. Quote 0addfedb-ef2b-4470-b23d-5bff49e18e67; preparação bf6d5323-5501-7b95-8c2e-f05d826bf8ed. Antes: todas as oito contagens eram zero. Depois: um snapshot postal, uma evidência Profile, uma preparação/request/evento Orders e uma reserva/evento/ledger Inventory; uma evidência Shipping adicional. São IDs da execução, não constantes do produto.

SHIP-031 comprovou rollback após snapshot, após reserva/evidência Shipping e morte antes do commit; morte depois do commit sem resposta recuperou o mesmo fato, sem duplicação. Não houve prova de perda de ACK TCP.
