# INV-01 — Escopo e fronteiras

Inventory controla saldo físico, compromisso, alocação, ledger e reserva; Catalog
mantém produto, publicação e composição; Pricing mantém preço; Orders terá intenção
comercial/snapshot e Payments terá evidência financeira. Fulfillment não foi criado.
Domínio não importa Nest, Prisma, HTTP ou PSP. Aplicação tem ports pequenos para
composição autorizada e decisão confiável; repository permanece interno a Inventory.

`InventoryService.reserve` recebe intenção interna com UUID técnico, referência
comercial futura e linhas. O port `AuthorizedComposition` deve vir de composição
confiável do servidor: UUID recebido do navegador não autoriza estoque. A suíte usa
adapter de aplicação da fixture que lê publicação e composição reais de Catalog,
sem importar repository privado; seu acesso de owner está confinado aos testes.
Não há adapter comercial nem SQL Catalog no repository Inventory. Publicação de
kits e elegibilidade dos componentes são verificadas pelo port antes da reserva.

Expansão aceita kits simples versão 1, descarta componentes digitais para estoque,
consolida SKUs físicos repetidos e ordena antes da transação. Limites técnicos:
100 linhas de entrada, 100 componentes por kit, 100 SKUs consolidados e quantidade
por SKU até 2147483647, com rejeição de overflow; não são política comercial nova.
Kit exclusivamente digital registra intenção idempotente `NO_PHYSICAL`, sem reserva
ou prazo físico. Não concede entitlement nem inventa prazo para digital.

O módulo não é importado pelo AppModule. Seu token padrão está indisponível;
`composeInventory` exige opt-in local explícito e retorna serviço sem decisão de
pagamento/cancelamento. Confirmação/liberação só são exercitadas com o adapter de
decisão controlada da fixture e role decider distinta. Não se aceita `paid=true`,
token arbitrário ou referência comercial como prova financeira.

Não foram criados endpoints, autorização STAFF/MFA improvisada, ajustes humanos,
pedidos fictícios, Orders, checkout, Stripe, reembolsos, logística, filas genéricas,
worker remoto ou frontend. Carga inicial de saldo existe somente na fixture DEMO.
Preço não participa do saldo; nenhuma mudança em Catalog/Pricing/Identity/Resend.
