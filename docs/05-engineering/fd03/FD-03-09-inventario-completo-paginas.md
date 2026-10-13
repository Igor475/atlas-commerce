# FD-03-09 — Inventário estendido de páginas Atlas Commerce (v0.2)

> **Status:** arquitetura da navegação **APROVADA pelo responsável em 13/10/2026**, com ampliação de famílias de telas aqui documentada. Nomes de rotas e prioridade são **propostos**, não endpoints implementados ou funcionalidades autorizadas sem contratos.

## Por que ampliar?

As nove imagens fornecidas cobrem bem a vitrine e páginas transacionais principais, mas não todas as jornadas esperadas em um e-commerce. O inventário original contém **P01–P15** (famílias) e **A01–A08** (admin). **Não renumerar nem apagar IDs antigos.** Os IDs P16–P50 detalham páginas adicionais e subpáginas existentes em P11/P12/P15. Não contabilizar P16–P50 como 35 novos contratos já implementados; parte apenas subdivide famílias originais.

## Storefront: P16–P50

| ID | Tela | Caminho Next.js candidato (não API) | Dono lógico | Escopo | Estados relevantes |
|---|---|---|---|---|---|
| P16 | Criar conta | `/criar-conta` | P15/Identity | MVP | e-mail duplicado sem enumeração; senha inadequada; indisponibilidade |
| P17 | Verificação de e-mail | `/verificar-email` | Identity | MVP | token ausente, inválido, vencido, reutilizado, reenviar controlado |
| P18 | Esqueci minha senha | `/esqueci-senha` | Identity | MVP | resposta neutra, limite de envio, serviço de e-mail indisponível |
| P19 | Redefinir senha | `/redefinir-senha` | Identity | MVP | token inválido/vencido/usado, nova senha, sessão revogada |
| P20 | Entrar | `/entrar` | P15/Identity | MVP | erro neutro, rate limit, sessão expirada, retorno seguro |
| P21 | Favoritos | `/favoritos` | Catalog/Identity | Candidato-MVP | lista vazia, item indisponível, login solicitado sem perder intenção |
| P22 | Ofertas | `/ofertas` | Pricing/Catalog | Candidato-MVP | nenhuma oferta verificada; preço sem promoção inventada |
| P23 | Lançamentos | `/lancamentos` | Catalog | Candidato-MVP | nenhuma novidade com metadado demonstrável |
| P24 | Coleções e séries | `/colecoes e /colecao/[slug]` | Catalog | Candidato-MVP | vazio, coleção não publicada, formato |
| P25 | Autor e obras | `/autores e /autor/[slug]` | Catalog | Candidato-MVP | autor indisponível, sem obras, licença de retrato |
| P26 | Editora/selo editorial | `/editoras e /editora/[slug]` | Catalog | Evolução | sem selo válido, descrição ausente, nenhuma obra |
| P27 | Tema/assunto | `/temas e /tema/[slug]` | Catalog | Candidato-MVP | filtro inconclusivo, taxonomia sem dados |
| P28 | Comparar edições e formatos | `/comparar` | Catalog | Evolução | comparação apenas de atributos equivalentes e reais |
| P29 | Meu perfil e dados | `/minha-conta/perfil` | Identity | MVP | validar sem sobrescrever senha, dados mascarados |
| P30 | Meus endereços | `/minha-conta/enderecos` | Identity | MVP | endereço inexistente, CEP inválido, ownership, frete simulado |
| P31 | Segurança da conta | `/minha-conta/seguranca` | Identity | MVP | senha atual inválida, CSRF, sessões revogadas |
| P32 | Meus pedidos — lista | `/meus-pedidos` | Orders | MVP | lista vazia, paginação, revogação de sessão |
| P33 | Detalhe do pedido | `/pedidos/[id]` | Orders/Payments | MVP | outro titular 404, payment review, atualização pendente |
| P34 | Acompanhamento e expedição | `/pedidos/[id]/entrega` | Fulfillment | MVP restrito | sem rastreio real; status de simulação identificado |
| P35 | Detalhe e acesso biblioteca | `/minha-biblioteca/[id]` | Library/R2 | MVP | entitlement pendente/negado, mídia expirada |
| P36 | Preferências/consentimento | `/minha-conta/preferencias` | Identity/Privacy | Evolução | opt-in/out, revogação, retenção e trilha |
| P37 | Suporte / abrir solicitação | `/ajuda/contato` | Returns/Support | MVP restrito | canal real pendente, ticket não gerado sem API |
| P38 | Devolução e arrependimento | `/pedidos/[id]/solicitacoes` | Returns | MVP | motivo, prazo, status em avaliação, não negar direito legal |
| P39 | Perguntas frequentes | `/ajuda/perguntas-frequentes` | Content | Candidato-MVP | documentação revisada, fallback ajuda |
| P40 | Institucional e contato | `/sobre e /contato` | Content | Candidato-MVP | empresa fictícia, informações não inventadas |
| P41 | Política de privacidade | `/privacidade` | Legal | MVP para publicação | texto jurídico revisado e específico, versão/data |
| P42 | Termos de uso e compra | `/termos` | Legal | MVP para publicação | texto jurídico validado, não simular conformidade |
| P43 | Envio, trocas e reembolso | `/entrega-e-devolucao` | Legal/Returns | MVP para publicação | frete de simulação, regra legal aplicável |
| P44 | Acessibilidade e atendimento | `/acessibilidade` | Content | Candidato-MVP | declaração honesta, canal de feedback |
| P45 | Página não encontrada | `/404` | App | MVP | sem exposição de recursos privados, voltar à navegação |
| P46 | Indisponibilidade de serviço | `/indisponivel (apresentação)` | App/Operations | MVP | Render/Supabase Free, sem SLA fictício, retry seguro |
| P47 | Pagamento na loja: formulário incorporado | `/checkout/pagamento (candidato)` | Orders/Payments | MVP | Stripe inicia tarde, expira, erro 3DS, checkout incompleto |
| P48 | Pagamento: acompanhar resultado | `/checkout/resultado (candidato)` | Orders/Payments | MVP | pendente, pago após confirmação, revisão, sem prova por URL |
| P49 | Recuperar intenção de compra | `/checkout/retomar (conceitual)` | Cart/Identity | MVP | relogin, idempotência, não duplicar pedido |
| P50 | Conteúdo legal/ajuda: página genérica | `/informacoes/[slug] (candidato)` | Content | Evolução | controle de publicação, legal review, SEO |

## Relação com P01–P15 aprovados na FD-03 inicial

- **P01** home: atalhos para *Lançamentos, Ofertas, Autores, Categorias* somente se houver dados reais; P22–P27 detalham destinos.
- **P02/P03** categoria/busca: filtros por taxonomia/edição/formato quando houver metadados; sem resultados inventados.
- **P04–P07** produto livro, e-book, revista com preview, kit: informações reais; P28 comparação é evolução não aprovada como módulo.
- **P08** carrinho: preço estimado; não retém estoque; favoritos são lista distinta.
- **P09** checkout: expandido em identificação, endereço, resumo, componente Stripe incorporado P47 e resultado P48. Não é nova API por subpágina.
- **P10** status pagamento: P48 detalha estados pós-pagamento; confirmação pelo backend/PSP, nunca pela tela.
- **P11** conta: perfil P29, endereços P30 e segurança P31.
- **P12** pedidos: lista P32, detalhe P33, expedição P34, solicitações P38.
- **P13** biblioteca: listagem + detalhe P35, entitlement por usuário.
- **P14** ajuda/políticas: P37/P39–P44 e P50 se evoluir.
- **P15** identidade: login P20, cadastro P16, verificação P17 e recuperação P18–P19.

## Administração: áreas A01–A08 preservadas, telas de detalhe propostas

| ID | Tela operacional detalhada | Área base | Proteção e pendência |
|---|---|---|---|
| A09 | Usuários e papéis da equipe | A07 | somente security admin, MFA, não conceder capacidades financeiras por herança |
| A10 | Detalhe de produto, revisão editorial e mídias | A03 | direitos de uso, aprovação/publicação auditada |
| A11 | Ajuste e ledger de estoque | A04 | justificativa, colisões transacionais, autorização por SKU |
| A12 | Detalhe de pedido e atendimento | A05 | finalidade, minimização, escopo de consulta |
| A13 | Caso de reembolso e aprovação | A06 | requester ≠ approver, MFA recente e alçada DS-003 aberta |
| A14 | Eventos, falhas e auditoria | A07/A08 | segredos redigidos, replay somente quando houver contrato específico |

## Componentes transversais a documentar em FD-04/05

Cabeçalho com busca e conta, menus e navegação por categorias, rodapé institucional honesto, breadcrumb, filtros com teclado, cards editoriais, comparador (quando aprovado), gallery PDP, componente de preview autorizado, favorito com feedback, formulário e-mail/senha acessível, carrinho e resumo, mensagens de confirmação **baseadas no backend**, Stripe incorporado, consentimento, notificações e páginas vazias.

**Não copiar VerboVivo nem inventar direitos sobre capas, selos, certificados, avaliações, descontos ou frete.** As referências estão em `../FD-02-referencias-visuais-usuario.md`.

## Priorização

- **Fluxo mínimo para demonstração ponta a ponta:** P01–P06, P08–P10/P47–P49, P16–P20, P29–P35, P41–P43/P45–P46, backoffice A01–A07 com controles aprovados.
- **Candidatos sob revisão de contrato/escopo:** P21 favoritos; P22 ofertas; P23 lançamentos; P24 coleções; P25 autores; P27 temas; P37 suporte; P39 FAQ; P40 institucional; P44 acessibilidade (o conteúdo de acessibilidade e canal devem existir conforme decisão legal/UX).
- **Evoluções opcionais:** P26, P28, P36, P50 e A08/A14 quando implicarem novas capacidades de observabilidade.

A inclusão no inventário **não significa aprovação automática de todos os endpoints**. O usuário solicitou que o design considere essas páginas; as ações persistentes dependem de CT, regras e testes individuais.
