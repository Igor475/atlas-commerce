# FD-04-07 — Como as três direções atenderão o inventário FD-03

A arquitetura aprovada cobre **P01–P50 e A01–A14** em [`FD-03-09`](../fd03/FD-03-09-inventario-completo-paginas.md); esta matriz identifica **famílias de design**, não reduz nem implementa o inventário.

| Família | Obrigação visual/UX | Referência do responsável quando houver |
|---|---|---|
| Home P01 / categorias P02 / busca P03 / Ofertas P22 | Contexto editorial, busca proeminente, promoções só quando verificadas, filtros reais, SEO e estados vazios | `home`, `categorias`, `categorias-2`, `pesquisa` |
| Produto físico P04 / livro/ebook P05 / revista P06 / kit P07 | Capa, sinopse, metadados, formato/variante, preço e estoque reais; preview separado da licença integral | `produto`, `produtos`, `produto-digital` |
| Carrinho P08 / Checkout P09, P47–P49 | Entrada segura, preço e frete recalculados, Stripe embedded do provedor, 3DS e estados pendentes sem falsa aprovação | `carrinho`, `checkout` |
| Login/cadastro/recovery P15–P20 | Campo de senha acessível, segurança de origem, respostas neutras, expiração e retomada sem vazar carrinho alheio | **sem captura**; criar desenho autoral coerente |
| Favoritos P21, lançamentos P23, coleções/autor/temas P24–P27 | Visibilidade de escolhas reais, filtros e estados zero; dados e ações sujeitos a contrato | **sem captura específica**; derivar de padrões da loja |
| Conta P11/P29–P31, pedidos P12/P32–P34 | Navegação privada com ações claras e densidade equilibrada; 404 para pedido alheio | **sem captura**; criar desenho autoral |
| Biblioteca P13/P35 e preview | Entitlement por titular, acessos temporários, preview público parcial, terminal de leitura sem arquivo privado público | captura `produto-digital` como prévia da PDP |
| Atendimento/legal P14/P37–P44, 404/503 P45–P46 | Tipografia de leitura, versão/documentação verdadeira, acessibilidade e fallback de indisponibilidade | **sem captura**; usar tipografia de marca, não layout de campanha |
| Admin A01–A14 | IA operacional independente, sessões staff/MFA, detalhe de pedidos/financeiro, auditoria, permissions e estados | **nenhuma das nove imagens deve definir layout do admin** |

## Stripe incorporado: regras de apresentação

1. Formulário de pagamento é **componente oficial Stripe**, dentro da página da loja; nunca colher PAN/CVV em inputs Atlas.
2. Em pedido com físicos, `reservationExpiresAt` vem de reserva real e a sessão da Stripe deve caber na política 40/30/5. Na [UXD-16 ratificada pelo responsável em 13/10/2026](../contracts/UXD-16-RATIFICACAO-RESPONSAVEL.md), o campo é sempre presente: string UTC/RFC 3339 com componente físico, `null` no exclusivamente digital, sem prometer 40 minutos para o pedido. Demais CT-10/Stripe continuam não homologados.
3. `payment.sessionExpiresAt` é informação própria da sessão Stripe, não substitui `reservationExpiresAt`.
4. Cartão/integrador pode acionar 3DS ou navegação autorizada. O sistema volta a consultar estado do pedido pelo backend, nunca inferindo `PAID` pelo browser.
5. As telas mobile devem comportar iframe/componente oficial sem cortar campos, cobrir erros ou expor client secret em links, URL ou logs.
6. Remover no desenho de referência o fluxo de compra como convidado, Pix/boleto não aprovados, descontos não verificados e falsa certificação de segurança.

## FD-05: evidência mínima a pedir

- Mockups separados para, no mínimo: home, categoria, busca, PDP físico, PDP e-book, PDP revista digital + amostra, kit, carrinho, identificação/login, cadastro, recuperação, favoritos, ofertas, checkout com Stripe, status de pagamento, pedidos, biblioteca, páginas legais e telas críticas do admin.
- Cada tela importante em **desktop/tablet/mobile** e estados relevantes. Sem screenshots recortados pela metade nem colagens ilegíveis.
- Auditoria de composição e de conteúdo real/proposta antes de integração backend.
