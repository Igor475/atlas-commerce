# QTE-01 — Escopo e fronteiras

Pricing mantém a autoridade monetária; Catalog controla publicação, edição e
composição; Inventory controla saldos/reservas; Orders mantém preparação e
snapshots. Quotes possui a proposta temporária, itens, validade e entrega
selecionada. Não foi criado serviço independente ou pacote compartilhado.

Os ports SQL `catalog.prepare_orders_snapshot` e `pricing.prepare_orders_prices`
são reutilizados sob os locks existentes. Novas cadeias de migrations concedem
somente USAGE, EXECUTE dos ports e REFERENCES nas chaves necessárias. Quotes
não recebe escrita nem reserva em Inventory, nem manutenção Catalog/Pricing.
As migrations originais permanecem intactas.

`CheckoutQuotes` recebe identidade e seleção de política por ports de servidor.
O banco confere também `session_user` contra registro artificial ativo. UUID de
endereço sem vínculo ao titular não autoriza sua leitura. Runtime só executa
`quotes.issue`/`quotes.project`; não lê fixtures, preços privados ou snapshots
brutos. O executor NOLOGIN possui leitura/escrita interna limitada ao schema
Quotes e UPDATE de coluna para os locks de leitura, não para mudar fixtures.

## Integração Orders

Novo port versionado `orders.prepare_quote` resolve uma cotação persistida do
mesmo ator. Preço, publicação/composição, endereço e política são revalidados.
Mudança relevante exige nova cotação, sem alterar silenciosamente o total visto.

Depois de adquirir os locks, o wrapper materializa uma ponte técnica em
`orders.fixture_quote` com o ID/ator/itens/tempos da cotação real persistida,
para preservar o FK e o coordenador ORD-01 existente. Essa ponte não é fonte de
preço/entrega. O wrapper chama `orders.prepare` e grava `orders.quote_evidence`
com total e condições selecionadas na mesma transação da reserva e snapshots.
O prazo é conferido novamente após a espera pelo estoque; falha desfaz tudo.

O executor Orders recebe INSERT na ponte, sem conceder esse poder aos runtimes.
Uma associação privada identifica cotações Quotes na ponte. Um trigger em
`orders.request` exige evidência de revalidação no `pg_current_xact_id()` para
intenção nova que use essa associação. Assim, chamar diretamente o port legado
não permite pular entrega/preço com uma chave nova. Replay já concluído mantém
as guardas de fingerprint do coordenador original. Evidência e associação são
imutáveis, escritas apenas pelo executor NOLOGIN dentro do wrapper validado.
O adapter Orders acrescenta somente a chamada desse port e o controle de ACL
correspondente. Quotes não reescreve a preparação nem os estados comerciais.

Um lock transacional por ator/chave serializa retries do novo port. A constraint
ator/operação/chave continua sendo a autoridade de unicidade. Colisão do hash do
lock pode causar contenção extra, não identidade compartilhada. Deadlock ou
serialização exige retry integral limitado; nenhum I/O externo ocorre no SQL.

Replay de intenção já concluída usa resultado/evidência duráveis antes de exigir
nova validade. Chave com outra cotação conflita. Cotação não é marcada como
compra nem como single-use: consumo comercial e integração Identity continuam
pendentes; apenas a intenção técnica idempotente está demonstrada.

Nenhum controller novo, startup migration, checkout, pagamento, entitlement,
frete externo, Identity público, STAFF/MFA ou frontend foi implementado.
