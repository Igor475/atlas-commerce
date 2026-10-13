# FD-03-02 — Jornadas e decisões de fluxo

> **Arquitetura das jornadas aprovada; contratos e execução ainda pendentes**, com regras obrigatórias citadas. Diagramas: [UX-01](diagrams/UX-01-checkout-autenticado.md), [UX-02](diagrams/UX-02-biblioteca-entitlement.md).

## J01 — Descobrir e selecionar

1. Visitante entra por home, categoria ou busca; pode usar filtros relevantes e acessar produto publicado.
2. A ficha informa formato físico/digital, edição, metadados e disponibilidade/preço **fornecidos pelo backend**.
3. Prévia pública de revista apresenta 'amostra parcial'; bloqueia integral por padrão; imagem da capa não concede licença.
4. Usuário escolhe quantidade/formato viável e adiciona ao carrinho. **Carrinho não reserva estoque**; reserva é ato do checkout transacional.
5. Valor ou estoque desatualizado requer revisão transparente antes da cotação/checkout.

## J02 — Carrinho, login e Stripe Checkout incorporado

1. Carrinho identifica itens, totais estimados, formato e elegibilidade; frete simulado/cupom só se contrato suportar.
2. Ao escolher 'ir ao checkout', exigir **sessão cliente válida**. Visitante entra/cadastra-se e retorna à intenção preservada (apenas após validação de sessão; evitar vazamento cross-account).
3. Backend recalcula cotação e valida preço, cupom, estoque e endereço aplicável. Não confiar em totais enviados pelo navegador.
4. Cria pedido/snapshot e outbox atomicamente no PostgreSQL; **somente havendo itens físicos**, cria também a reserva de **40 min**. Pedido e kit exclusivamente digitais não têm reserva física: dependem de elegibilidade comercial/licença (RN-079/PC-02/04). Para kit físico/misto a reserva é indivisível.
5. Só libera o **client secret de Checkout Session para o componente oficial Stripe incorporado em Test Mode** quando elegível, para a sessão autenticada/titular, sob TLS e `no-store`, sem logs/URL/cache/analytics. Para pedidos com reserva física, aplicar o refinamento da [ADR-004](../../04-architecture/adrs/ADR-004-psp-sandbox.md): sessão de **30 min propostos desde sua criação**, vencendo **>=5 min antes** da reserva; criação até 5 min após a reserva, com margem operacional e prova ST ainda pendente. Não encurtar a sessão abaixo de 30 min para contornar atraso. Sem reserva física, validar a vigência comercial do pedido digital, sem inventar reserva/TTL físico. Falha de compatibilidade mantém situação recuperável e não entrega client secret nem monta sessão incompatível.
6. Browser monta Stripe Checkout na página Atlas (P47), sem redirect hosted inicial. PAN/CVV pertencem ao componente Stripe, não a campos Atlas nem ao NestJS. Não habilitar Pix/boleto, guest, 1-click ou métodos adicionais. 3DS pode exigir navegação externa condicional; parâmetros de retorno/completion dependem da API/SDK/ui_mode versionados.
7. Ao concluir o componente ou voltar de autenticação bancária, P48 consulta estado no backend: *pendente* / *aprovado confirmado* / *não concluído* / *expirado* / *em revisão*. Webhook autenticado ou consulta ao PSP só constituem evidência após correlação de tentativa/pedido, IDs, valor, moeda e estado, persistida por Payments. Esse processamento independe de o comprador retornar; a página apenas consulta a projeção autorizada. Retorno sozinho não constitui pagamento.
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

## Ampliação J05–J10

[Jornadas complementares](FD-03-10-jornadas-identidade-favoritos.md): cadastro/verificação (P16/P17), login/recovery (P18–P20), favoritos (P21), ofertas/lançamentos/coleções/autores (P22–P27), conta/endereço/pedidos/biblioteca (P29–P38) e suporte/estados globais (P37/P39–P46/P50). P49 preserva a intenção, com revalidação e sem checkout automático após login. Cobertura obrigatória de planejamento; contratos e regras ainda abertos não são criados por esta jornada.

Direção detalhada: [FD-03-11](FD-03-11-checkout-stripe-incorporado.md), [UX-03](diagrams/UX-03-stripe-incorporado.md), [CT-10](../contracts/CT-10-migracao-embedded-checkout-proposta.md).

## Fronteiras

Autoridade: `identity` valida sessão; `catalog` publica dados; `pricing` cota; `inventory` reserva; `orders` cria snapshot; `payments` valida PSP; `library` valida entitlement; `integration` persiste eventos. UI jamais infere confirmação apenas da URL do Stripe.

**Base:** [PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md), [CT-01](../contracts/CT-01-inventario-http.md), [CT-06](../contracts/CT-06-autorizacao-por-recurso.md), [FD-02](../FD-02-referencias-visuais-usuario.md).
