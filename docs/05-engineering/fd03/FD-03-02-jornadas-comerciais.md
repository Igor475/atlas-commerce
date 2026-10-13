# FD-03-02 — Jornadas e decisões de fluxo

> **Fluxos propostos para revisão**, com regras obrigatórias citadas. Diagramas: [UX-01](diagrams/UX-01-checkout-autenticado.md), [UX-02](diagrams/UX-02-biblioteca-entitlement.md).

## J01 — Descobrir e selecionar

1. Visitante entra por home, categoria ou busca; pode usar filtros relevantes e acessar produto publicado.
2. A ficha informa formato físico/digital, edição, metadados e disponibilidade/preço **fornecidos pelo backend**.
3. Prévia pública de revista apresenta 'amostra parcial'; bloqueia integral por padrão; imagem da capa não concede licença.
4. Usuário escolhe quantidade/formato viável e adiciona ao carrinho. **Carrinho não reserva estoque**; reserva é ato do checkout transacional.
5. Valor ou estoque desatualizado requer revisão transparente antes da cotação/checkout.

## J02 — Carrinho, login e checkout hosted

1. Carrinho identifica itens, totais estimados, formato e elegibilidade; frete simulado/cupom só se contrato suportar.
2. Ao escolher 'ir ao checkout', exigir **sessão cliente válida**. Visitante entra/cadastra-se e retorna à intenção preservada (apenas após validação de sessão; evitar vazamento cross-account).
3. Backend recalcula cotação e valida preço, cupom, estoque e endereço aplicável. Não confiar em totais enviados pelo navegador.
4. Cria pedido/snapshot e outbox atomicamente no PostgreSQL; **somente havendo itens físicos**, cria também a reserva de **40 min**. Pedido e kit exclusivamente digitais não têm reserva física: dependem de elegibilidade comercial/licença (RN-079/PC-02/04). Para kit físico/misto a reserva é indivisível.
5. Só oferece URL externa do **Stripe Checkout hospedado em Test Mode** quando elegível. Para pedidos com reserva física, aplicar o refinamento da [ADR-004](../../04-architecture/adrs/ADR-004-psp-sandbox.md): sessão de **30 min propostos desde sua criação**, vencendo **>=5 min antes** da reserva; criação até 5 min após a reserva, com margem operacional e prova ST ainda pendente. Não encurtar a sessão abaixo de 30 min para contornar atraso. Sem reserva física, validar a vigência comercial do pedido digital, sem inventar reserva/TTL físico. Falha de compatibilidade mantém situação recuperável e não expõe URL incompatível.
6. Browser é redirecionado ao Stripe (página hospedada). Não há formulário próprio de cartão, Pix/boleto nem pedido finalizado pelo retorno do browser.
7. Ao voltar, estado é consultado no backend: *pendente* / *aprovado confirmado* / *não concluído* / *expirado* / *em revisão*. Webhook autenticado ou consulta ao PSP só constituem evidência após correlação de tentativa/pedido, IDs, valor, moeda e estado, persistida por Payments. Esse processamento independe de o comprador retornar; a página apenas consulta a projeção autorizada. Retorno sozinho não constitui pagamento.
8. Se evidência de pagamento surge após reserva inválida: `PAYMENT_REVIEW`, sem entregar nada e com intenção de refund integral idempotente. O front pode mostrar acompanhamento, sem chamar 'estornado' antes de SUCCEEDED.

## J03 — Pós-venda e acesso digital

1. Após pagamento válido, pedido e fulfillment mantêm estados independentes. Itens físicos dependem de alocação/expedição; arquivo integral não é público.
2. Biblioteca mostra itens cujo titular possui **entitlement ativo**. Reembolso solicitado ≠ revogação imediata; conferir política e licença.
3. Kit misto só libera componente digital depois de comprovados pagamento **e alocação física completa do kit**.
4. Ação 'abrir/baixar' solicita emissão autorizada e recebe acesso limitado/expirável ao objeto privado R2, sem expor origem/segredo.
5. Link expirado pede novo token após verificar entitlement. Conta de outro usuário e licença revogada não acessam.

## J04 — Erros, retorno e retomada

- Offline/timeouts: não criar segundo pedido só porque o usuário recarregou; solicitar status usando intenção/idempotência persistida no servidor.
- 'Sem estoque' requer remover/ajustar item e reenviar cotação, não decremento otimista irrevogável.
- Render Free adormecido e Supabase Free pausado: estados explícitos de conexão indisponível, retry seguro e orientação de tentar novamente; **não prometer retomada imediata/24×7**.
- Expiração da reserva: distinguir *reserva expirada sem cobrança comprovada* de *cobrança tardia em revisão*.
- Método de pagamento não suportado no sandbox não deve aparecer.

## Fronteiras

Autoridade: `identity` valida sessão; `catalog` publica dados; `pricing` cota; `inventory` reserva; `orders` cria snapshot; `payments` valida PSP; `library` valida entitlement; `integration` persiste eventos. UI jamais infere confirmação apenas da URL do Stripe.

**Base:** [PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md), [CT-01](../contracts/CT-01-inventario-http.md), [CT-06](../contracts/CT-06-autorizacao-por-recurso.md), [FD-02](../FD-02-referencias-visuais-usuario.md).
