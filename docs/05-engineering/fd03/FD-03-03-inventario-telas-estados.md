# FD-03-03 — Inventário de páginas, componentes conceituais e estados

> **Inventário de arquitetura conceitual aprovado, não layout nem contratos finais aprovados.** Cada ID é UX (`PXX`, `AXX`) e **não** rota de API ou requisito funcional novo. A ordem abaixo é prioridade de desenho, não promessa de implementação integral do MVP.

## Storefront

| ID | Tela (referência) | Informação e ação fundamental | Estados obrigatórios na futura FD-05 |
|---|---|---|---|
| P01 | Home ([imagem](../references/storefront/home-atlas-commerce.png)) | Entradas editoriais, catálogo publicado e busca | carregando, vazio de campanha, erro, sem imagens licenciadas |
| P02 | Catálogo/categoria ([revistas](../references/storefront/categorias-atlas-commerce.png) / [outra](../references/storefront/categorias-2-atlas-commerce.png)) | taxonomia e facetas válidas | sem itens, filtro sem resultados, erro, filtro aplicado, paginação |
| P03 | Busca ([imagem](../references/storefront/pesquisa-atlas-commerce.png)) | consulta, sugestão opcional, ordenação e resultados | termo vazio, nada encontrado, loading, erro, teclado/autocomplete |
| P04 | Produto físico ([imagem](../references/storefront/produto-atlas-commerce.png)) | capa, edição, formato, estoque, preço, CTA | indisponível, opção impossível, preço atualizado, mídia ausente |
| P05 | Produto e-book / livro ([imagem](../references/storefront/produtos-atlas-commerce.png)) | edição/formatos específicos e direitos | licença/formato inválido, sem prévia, elegibilidade, erro |
| P06 | Revista digital ([imagem](../references/storefront/produto-digital-atlas-commerce.png)) | sumário/preview parcial autorizado | amostra indisponível, limite de páginas, sem original público |
| P07 | Kit comercial (sem imagem específica) | composição e elegibilidade indivisíveis | componente sem estoque, kit indisponível, preço validado |
| P08 | Carrinho ([imagem](../references/storefront/carrinho-atlas-commerce.png)) | quantidades, tipos, subtotais, cotação antes de pagar | vazio, item removido, preço/estoque alterado, cupom inválido |
| P09 | Identificação/checkout ([imagem](../references/storefront/checkout-atlas-commerce.png)) | login obrigatório, endereço se aplicável, revisão, Stripe incorporado P47 | sem sessão, quote expirada, estoque insuficiente, timeout, revisão |
| P10 | Retorno do pagamento/pedido | consultar estado real e apresentar próximos passos | aguardando confirmação, pago, falhou, PAYMENT_REVIEW, expirada |
| P11 | Conta/endereço | editar dados conforme contrato futuro | sessão revogada, sem endereço, validação, conflito |
| P12 | Pedidos | lista e detalhes por titular | vazio, pedido alheio indisponível, loading, pedido com revisão |
| P13 | Biblioteca digital | licenças próprias, abrir/baixar seguro | vazia, entitlement pendente, negado, link expirado, indisponível |
| P14 | Ajuda e políticas | conteúdo legal e suporte publicado | conteúdo não revisado, link indisponível, erro |
| P15 | Login/cadastro/recovery (contratos a detalhar) | identidade segura e retorno ao contexto | credencial inválida sem enumeração, token expirado, throttle |

## Admin

| ID | Área operacional | Ação crítica | Estado/proteção a representar |
|---|---|---|---|
| A01 | Login/MFA staff | entrar na sessão administrativa | MFA pendente/negado, recuperação controlada, sessão expirada |
| A02 | Resumo de pendências | priorizar casos reais | sem permissão, sem dados, degradado |
| A03 | Catálogo/editorial | publicar/retirar, mídia | item não publicado, licença ausente, validação negada |
| A04 | Estoque/reservas/kits | ajuste com razão e eventos | corrida, snapshot antigo, ajuste rejeitado |
| A05 | Pedidos/atendimento/devoluções | localizar com finalidade, registrar caso | acesso escopado, estado não elegível, dados protegidos |
| A06 | Financeiro/refunds | solicitar, aprovar, acompanhar | MFA step-up, sem alçada, autoaprovação negada, PSP inconclusivo |
| A07 | Auditoria/segurança | consulta por permissão, fatores de staff | acesso negado, trilha indisponível, segredo redigido |
| A08 | Integrações/pendências de job (se autorizado) | observar fila/replay governado | atraso, lease, poison, executor ausente; sem botão perigoso padrão |

## Extensão v0.2 — preservação dos IDs

[FD-03-09](FD-03-09-inventario-completo-paginas.md) detalha **P16–P50 e A09–A14**, sem redefinir P01–P15/A01–A08. P15 continua família de identidade e abrange P16–P20; P11 → P29–P31/P36; P12 → P32–P34/P38; P13 → P35; P14 → P37/P39–P44/P50. P21–P28 cobrem descoberta/favoritos e evoluções; P45/P46 cobrem 404/indisponibilidade. P09/P10 são detalhados por P47/P48; P49 retoma intenção sem duplicar pedido. Todos os vazios/erro/loading do inventário estendido devem figurar na FD-05.

A09 → A07, A10 → A03, A11 → A04, A12 → A05, A13 → A06, A14 → A07/A08. Nenhum ID representa endpoint implantado ou capability concedida. Campos, retenção e APIs de identidade/favoritos/conta/suporte exigem contratos próprios.

## Regras gerais de estado

- `loading` não implica skeleton genérico; usar estrutura próxima do conteúdo esperado **quando o layout existir**.
- Erros devem diferenciar **transiente**, **validação**, **negação**, **revisão financeira** e **indisponibilidade do serviço**.
- Números de avaliações, descontos, promoções, produtos, estoques e fretes só aparecem com fonte verdadeira/teste explicitamente fictício.
- Apresentar `UNAUTHENTICATED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND` com tratamento seguro, evitando pistas sobre objetos de outro titular, conforme [CT-03](../contracts/CT-03-erros-e-idempotencia-http.md); não criar enums de erro próprios por conveniência de UX.
- Toda ação irreversível exige feedback e confirmação adequada sem afirmá-la concluída antes do backend.
