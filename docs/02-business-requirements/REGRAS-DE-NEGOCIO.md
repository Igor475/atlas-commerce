# Atlas Commerce — Especificação de Regras de Negócio

> **Identificador:** AC-BRD-001  
> **Versão:** 0.2.1 — sincronização com políticas críticas e requisitos de segurança  
> **Data:** 12/10/2026  
> **Estado:** Rascunho para validação; não representa requisitos aprovados de uma empresa real  
> **Idioma:** pt-BR  
> **Repositório:** `Igor475/atlas-commerce` (documento proposto; publicação ainda pendente)  
> **Localização:** `docs/02-business-requirements/REGRAS-DE-NEGOCIO.md`

## 0. Finalidade e controle do documento

Este documento inaugura o projeto de portfólio **Atlas Commerce**, uma plataforma fictícia de comércio eletrônico B2C, com operação editorial de livros físicos, e-books, revistas digitais e kits. O foco é demonstrar engenharia de software **por meio de decisões rastreáveis e sistemas verificáveis** — e não apenas desenvolver interfaces e CRUDs.

**Convenções:**

- **RN-XXX:** regra de negócio (restrição ou invariante do domínio).
- **RF-XXX:** requisito funcional (capacidade observável).
- **RNF-XXX:** requisito não funcional (atributo de qualidade).
- **SEC-XXX:** requisito de segurança especializado, vinculado à especificação AC-SEC-001.
- **SA-XXX:** cenário de aceitação de segurança, vinculado à especificação AC-SEC-001.
- **CA-XXX:** cenário de aceitação.
- **DA-XXX:** decisão de negócio/escopo ainda aberta.
- **MVP:** primeira versão demonstrável de ponta a ponta; **Evolução:** fase posterior.
- **Premissa:** escolha de modelagem para avançar sem stakeholders reais; deve ser confirmada antes da arquitetura definitiva.

**Importante:** as regras numeradas abaixo são **propostas de projeto**, não fatos sobre uma empresa existente. Assuntos legais, fiscais, comerciais ou de licenciamento exigirão análise apropriada antes de qualquer operação comercial real.

### 0.1 Integração documental, versões e precedência

Esta versão **mantém RN-001–RN-070, RF-001–RF-015 e CA-001–CA-010**, sem renumerar ou excluir conteúdo preexistente. A especificação é dividida em documentos com responsabilidades complementares:

| Documento | Escopo / IDs | Autoridade da proposta |
|---|---|---|
| **Este BRD (AC-BRD-001 v0.2.1)** | Regras gerais RN-001–070, RF/RNF e CA-001–010 | Base do domínio e escopo |
| [Adendo de políticas críticas v0.2](ADENDO-POLITICAS-CRITICAS-v0.2.md) | **RN-071–094** | Refinamentos propostos de reserva, pagamento tardio, reembolso e kits |
| [Políticas consolidadas](../03-business-processes/POLITICAS-CONSOLIDADAS.md) | PC-01–PC-04 | Detalhes operacionais das políticas críticas propostas |
| [Transições de estados](../03-business-processes/TABELAS-DE-TRANSICAO.md) | Guardas e efeitos das máquinas de estados | Condições específicas; não substitui invariantes de negócio |
| [Cenários críticos](../03-business-processes/CENARIOS-DE-ACEITE-v0.2.md) | CA-011–CA-026 | Casos adicionais para validar políticas críticas |
| [Segurança AC-SEC-001](../07-security/security-requirements.md) | SEC-001–SEC-038 e SA-001–SA-012 | Controles de segurança obrigatórios/condicionais por superfície |
| [Rastreabilidade cruzada](../03-business-processes/MATRIZ-DE-RASTREABILIDADE.md) | RN, CA, SEC, SA, diagramas | Mapa de referências; não redefine política |

**Regra anticolisão:** o adendo detalha regras de negócio mais específicas; a política consolidada esclarece a operação; a especificação SEC complementa-as e **não pode ser interpretada como autorização para reduzir controles ou direitos**. Havendo incompatibilidade real, registrar decisão DA/DS/ADR e corrigir todas as referências antes de implementar. Diagramas não têm precedência sobre invariantes e tabelas de transição. Regras legais aplicáveis exigem avaliação própria.

**Situação:** as políticas v0.2 são **propostas condicionadas** à validação do provedor de pagamento e às pendências comerciais/jurídicas, não decisões homologadas nem funcionalidades implementadas. Até decisão formal, usar os valores abaixo apenas no protótipo/sandbox e manter os pontos condicionados explicitamente em aberto.

### 0.2 Parâmetros propostos de reserva e compensação

- **RN-071–076 / PC-01:** TTL da reserva física de **40 minutos pelo relógio do banco**, sem extensão automática; sessão externa com duração **até 30 minutos desde a criação** e encerramento **ao menos 5 minutos antes** da reserva. Só ofertar método compatível. Dependência aberta: **DA-006 (PSP)**.
- **RN-077–080 / PC-02:** pagamento autenticado sem alocação física válida entra em `PAYMENT_REVIEW`, bloqueia fulfillment e direitos digitais de **pedido misto**, e inicia **reembolso integral idempotente como padrão do MVP**. Sem reatribuição automática.
- **RN-081–087 / PC-03:** reembolso tem estado próprio; limite = captura − reembolsos concluídos − valores pendentes reservados; timeout ambíguo **não** libera saldo nem autoriza refund adicional; retorno ao estoque depende de recebimento/inspeção, não da liquidação financeira.
- **RN-088–094 / PC-04:** kit usa snapshot imutável e reserva física all-or-nothing, é indivisível comercialmente no MVP; direitos digitais do kit misto exigem pagamento válido **e toda alocação física confirmada**; exceções legais são analisadas e auditadas.

Não copiar estas regras para novos IDs independentes: os IDs normativos propostos são **RN-071–094**.

---

## 1. Visão do produto

### 1.1 Problema

Uma editora deseja vender produtos físicos e digitais numa experiência integrada. Ao mesmo tempo, precisa manter preços confiáveis, não vender estoque inexistente, evitar dupla confirmação de pedidos, conceder acesso digital com segurança e oferecer rastreabilidade de operações administrativas.

### 1.2 Proposta de valor

- **Compradores:** pesquisar, comparar, comprar e acompanhar seus produtos em um fluxo previsível.
- **Operação:** gerenciar catálogo, pedidos, estoque, direitos digitais e solicitações pós-venda com rastreabilidade.
- **Engenharia:** demonstrar fronteiras de domínio, transações, idempotência, eventos, observabilidade e recuperação de falhas.

### 1.3 Objetivos de negócio

1. Permitir compra de livros físicos, e-books, revistas digitais e kits.
2. Oferecer uma jornada clara entre seleção do produto e pagamento.
3. Preservar consistência das vendas e da disponibilidade de estoque.
4. Liberar ativos digitais apenas a compradores autorizados.
5. Tornar compras, pagamentos, ajustes e solicitações auditáveis.
6. Dar visibilidade operacional de falhas e pedidos que requerem intervenção.

### 1.4 Indicadores propostos (sem metas numéricas aprovadas)

Taxa de conversão, abandono de checkout, pedidos pagos, taxa de pagamentos recusados, tempo até confirmação, vendas canceladas por falta de estoque, entregas pendentes, concessões de acesso digital e erros de processamento de eventos. As fórmulas e metas serão especificadas antes da implementação analítica.

---

## 2. Escopo e fronteiras

### 2.1 Incluído no MVP

- Catálogo publicável: livros físicos, e-books, revistas digitais e kits simples.
- Categorias, autores, editoras e metadados editoriais.
- Pesquisa e filtros básicos, página de produto e prévia pública controlada de conteúdo digital.
- Cadastro/login, conta do cliente, recuperação de conta e endereços.
- Carrinho persistente e checkout autenticado com uma moeda: **BRL**.
- Preços, desconto por cupom simples e frete simulável ou integração de sandbox.
- Controle de estoque físico, reserva com validade e movimentações auditáveis.
- Pedido com itens físicos e digitais, snapshot financeiro, acompanhamento e histórico.
- Integração com um provedor de pagamentos em sandbox; tratamento de callbacks/webhooks validados.
- Liberação de e-books/revistas digitais autorizados e biblioteca do comprador.
- Painel administrativo mínimo para catálogo, estoque, pedidos e operações controladas.
- Fluxo básico de solicitação de cancelamento, arrependimento e reembolso, com revisão humana nos casos excepcionais.

### 2.2 Evoluções intencionalmente fora do MVP

Marketplace multi-vendedor, gestão de múltiplos depósitos, assinaturas recorrentes, cashback, programas de pontos, parcelamento próprio, motor de recomendação por IA, múltiplas moedas, múltiplas empresas, venda internacional, omnichannel, integrações reais com transportadoras e emissão fiscal automatizada. Essas capacidades não devem influenciar desnecessariamente a arquitetura inicial.

### 2.3 Restrições de escopo

- Modelo **single-merchant B2C**, não multi-tenant.
- Checkout de cliente autenticado no MVP; checkout como visitante fica em aberto para evolução.
- Produtos são vendidos pela plataforma; não existem sellers de terceiros.
- Um estoque lógico por SKU físico no MVP, sem transferências entre armazéns.
- Pagamentos reais e emissão fiscal não serão usados no portfólio público sem definição operacional e legal específica.
- Nunca armazenar número completo de cartão, CVV ou credenciais de pagamentos no banco da aplicação.

---

## 3. Atores e responsabilidades

| Ator | Responsabilidades e limites |
|---|---|
| Visitante | Visualizar catálogo, buscar produtos, consultar informações e preparar carrinho; não acessar pedidos privados. |
| Cliente | Autenticar-se, finalizar compra, consultar seus próprios pedidos, acessar sua biblioteca e solicitar suporte. |
| Administrador | Configurar operadores e permissões; não deve receber acesso irrestrito por padrão a dados financeiros sensíveis. |
| Gestor de catálogo | Criar e revisar publicações, preços e imagens, dentro de permissões concedidas. |
| Operador de estoque | Registrar entradas, baixas, ajustes justificados e consultar reservas. |
| Operador financeiro | Investigar pagamentos, conciliar ocorrências e iniciar reembolsos conforme autorização. |
| Atendimento | Consultar pedidos necessários ao suporte e registrar solicitações com rastreabilidade. |
| Provedor de pagamento | Comunicar transições de pagamentos e reembolsos por integração autenticada. |
| Provedor de frete | Calcular opções de entrega e/ou registrar eventos de expedição, quando integrado. |

**Separação de responsabilidades:** atores humanos são autenticados/autorizados; integrações automáticas possuem identidades técnicas próprias, com permissões e credenciais distintas.

---

## 4. Glossário — linguagem ubíqua

| Termo | Definição de domínio |
|---|---|
| Produto | Entidade comercial apresentada no catálogo; pode possuir variantes comercializáveis. |
| SKU | Unidade vendável identificada de forma única, associada a preço, tipo e disponibilidade. |
| Produto físico | Item sujeito a controle de estoque e eventual expedição. |
| Produto digital | Item entregue por concessão de acesso, sem baixa de estoque físico. |
| Kit | Oferta que agrupa SKUs componentes, com composição fixada no pedido. |
| Carrinho | Seleção editável ainda não convertida em pedido. |
| Cotação de checkout | Preço, descontos, frete e totais recalculados pelo servidor para uma tentativa de compra. |
| Reserva de estoque | Comprometimento temporário de unidades físicas para um checkout/pedido. |
| Pedido | Registro da intenção de compra aceita pelo servidor, imutável em itens e valores-base após criação. |
| Tentativa de pagamento | Solicitação individual ao provedor vinculada a um pedido. |
| Evento de pagamento | Notificação de transição de estado recebida e verificada; pode chegar repetida ou fora de ordem. |
| Fulfillment | Processo de disponibilizar produtos digitais e preparar/enviar produtos físicos. |
| Direito de acesso digital (entitlement) | Vínculo verificável entre usuário, produto/edição e permissão de leitura/download. |
| Reembolso | Devolução financeira total ou parcial de valores efetivamente capturados. |
| Snapshot | Cópia de dados relevantes no momento da criação do pedido, preservada apesar de mudanças no catálogo. |

---

## 5. Contextos de negócio propostos

| Contexto | Responsabilidade | Não deve ser autoridade sobre |
|---|---|---|
| Identidade e acesso | Contas, autenticação e autorização | Estoque ou pagamentos |
| Catálogo editorial | Produtos, SKUs, metadados e publicação | Saldo de estoque ou quitação |
| Precificação e promoções | Preço vigente, cálculo e aplicação de cupom | Captura financeira |
| Carrinho e checkout | Composição e validação da intenção de compra | Confirmação direta de pagamentos |
| Inventário | Saldo físico, reservas e movimentações | Identidade de compradores |
| Pedidos | Snapshot de compra e estado comercial | Verdade externa sobre liquidação de pagamentos |
| Pagamentos | Tentativas, notificações verificadas e reembolsos | Estoque ou acesso digital diretamente |
| Fulfillment físico | Preparação, expedição e acompanhamento | Preço do pedido |
| Biblioteca digital | Concessão/revogação autorizada de direitos e acesso | Conciliação financeira |
| Backoffice e auditoria | Operações internas e trilha de responsabilidade | Mutação irrestrita de outros contextos |

A tabela descreve **fronteiras conceituais**, não exige microsserviços, filas ou bancos separados. As escolhas de implementação dependem da etapa de arquitetura.

---

## 6. Regras de negócio propostas

### 6.1 Catálogo e publicação

- **RN-001 [MVP]** — Somente SKUs publicados, ativos e elegíveis podem ser adicionados ao checkout.
- **RN-002 [MVP]** — Cada SKU possui identificador comercial único e tipo (`PHYSICAL` ou `DIGITAL`); um kit referencia componentes tipados.
- **RN-003 [MVP]** — Campos necessários para vender são validados conforme o tipo de SKU; itens físicos exigem informações logísticas mínimas, digitais exigem ativo e política de acesso.
- **RN-004 [MVP]** — Ocultar/despublicar um item impede novas vendas, mas não apaga o histórico nem altera pedidos existentes.
- **RN-005 [MVP]** — Autor, título, edição, formato, ISBN quando aplicável e demais características editoriais devem ser explicitados com clareza na oferta.
- **RN-006 [MVP]** — A prévia de e-book/revista deve utilizar material autorizado para demonstração, sem conceder acesso ao arquivo comercial completo.
- **RN-007 [MVP]** — Um kit vendido deve ter seus componentes e quantidades congelados no pedido, mesmo que sua composição comercial mude depois.
- **RN-008 [MVP]** — Um produto digital pode estar indisponível por motivo de licença/publicação sem implicar saldo físico igual a zero.

### 6.2 Clientes, conta e acesso

- **RN-009 [MVP]** — Apenas o dono da conta ou funcionário explicitamente autorizado pode consultar dados privados de um cliente, respeitado o escopo da função.
- **RN-010 [MVP]** — O cliente deve autenticar-se para concluir o checkout na versão inicial.
- **RN-011 [MVP]** — O cliente pode manter múltiplos endereços; cada pedido físico registra o endereço de entrega congelado no ato da compra.
- **RN-012 [MVP]** — Alterar dados cadastrais depois de comprar não modifica os dados históricos de um pedido.
- **RN-013 [MVP]** — Recuperação de conta e alteração de credenciais não podem conceder acesso sem verificação de identidade apropriada.
- **RN-014 [MVP]** — Direitos digitais são verificados a cada solicitação de recurso protegido; a posse de uma URL ou identificador não constitui autorização.

### 6.3 Carrinho, preços e promoções

- **RN-015 [MVP]** — O carrinho não reserva estoque; a disponibilidade é revalidada no checkout.
- **RN-016 [MVP]** — Alterações de preço ou publicação são refletidas no recálculo do servidor, nunca confiadas ao valor recebido do navegador.
- **RN-017 [MVP]** — Preço, quantidade, subtotal, desconto, frete e total final de cada pedido são calculados e validados no servidor.
- **RN-018 [MVP]** — Valores monetários devem ser representados sem ponto flutuante binário, com regras explícitas de arredondamento; BRL é a moeda única do MVP.
- **RN-019 [MVP]** — Cupom inválido, expirado, fora de condições de uso ou incompatível com o carrinho deve ser recusado de modo explícito.
- **RN-020 [MVP]** — O mesmo cupom não pode consumir além de seu limite global ou por cliente, inclusive em tentativas concorrentes.
- **RN-021 [MVP]** — Para o MVP, admite-se no máximo um cupom por pedido; acumulação de promoções futuras exige política própria.
- **RN-022 [MVP]** — O total cobrado não pode ser negativo; descontos devem respeitar bases de incidência e limites configurados.
- **RN-023 [MVP]** — O cliente deve ver valor total, entrega e condições aplicáveis antes de confirmar a compra.

### 6.4 Inventário e reserva

- **RN-024 [MVP]** — Apenas SKUs físicos e componentes físicos de kits consomem saldo de inventário.
- **RN-025 [MVP]** — A disponibilidade vendável é calculada a partir do saldo físico menos compromissos/reservas ativas, respeitando ajustes válidos.
- **RN-026 [MVP]** — Reservas concorrentes devem ser atômicas: para saldo vendável de uma unidade, somente uma reserva daquela unidade poderá ser aceita.
- **RN-027 [MVP]** — Toda reserva tem vínculo a checkout/pedido, quantidade, estado e validade; reserva expirada não habilita confirmação automática de estoque.
- **RN-028 [MVP]** — Confirmação, liberação ou expiração de reserva deve ocorrer de forma idempotente, sem duplicar créditos/débitos.
- **RN-029 [MVP]** — Ajustes manuais exigem operador autorizado, motivo e registro de auditoria.
- **RN-030 [MVP]** — A reserva de kits físicos deve ocorrer como uma unidade lógica: ou há saldo para todos os componentes, ou nenhum componente é comprometido.
- **RN-031 [MVP]** — Pedidos já pagos não perdem sua alocação de estoque por simples expiração de cronômetro; a confirmação e a reconciliação têm precedência conforme regras de estado.

### 6.5 Checkout e pedidos

- **RN-032 [MVP]** — Criar pedido exige cotação atual válida, identidade verificada e políticas de entrega aplicáveis.
- **RN-033 [MVP]** — Cada checkout confirmado pelo servidor cria um pedido identificável, com itens, quantidades, moeda, valores e condições em snapshot.
- **RN-034 [MVP]** — Repetir a mesma requisição de checkout com a mesma chave de idempotência e mesmo conteúdo não cria pedidos distintos; chave reutilizada com conteúdo diferente é rejeitada.
- **RN-035 [MVP]** — O pedido possui máquina de estados explícita; nenhuma atualização arbitrária diretamente por painel/cliente é permitida.
- **RN-036 [MVP]** — A existência de pedido ou tentativa de pagamento não comprova pagamento aprovado.
- **RN-037 [MVP]** — Uma falha do provedor de pagamento não pode deixar pedido e reserva sem estado recuperável ou trilha de investigação.
- **RN-038 [MVP]** — Pedidos mistos (físicos + digitais) preservam subtarefas de fulfillment independentes sem perder o vínculo com o pedido comercial.
- **RN-039 [MVP]** — O cliente vê apenas seus próprios pedidos; pesquisa administrativa exige autorização compatível com a função.
- **RN-040 [MVP]** — O histórico de alterações relevantes de estado inclui data, origem, identificador correlacionável e motivo quando aplicável.

### 6.6 Pagamentos e conciliação

- **RN-041 [MVP]** — O estado de pagamento é determinado por evidência validada do provedor ou processo de reconciliação autorizado, jamais por retorno otimista do navegador.
- **RN-042 [MVP]** — Webhooks só são aceitos após verificações pertinentes ao provedor (assinatura/autenticidade, identificação do evento, valor/moeda/pedido e proteção contra repetição).
- **RN-043 [MVP]** — O mesmo evento de pagamento pode chegar múltiplas vezes sem causar dupla confirmação, novo pedido ou dupla concessão de benefícios.
- **RN-044 [MVP]** — Eventos atrasados ou fora de ordem não podem regredir indevidamente o estado financeiro já comprovado.
- **RN-045 [MVP]** — Divergência entre valor/moeda do provedor e o pedido resulta em estado de revisão, não em confirmação silenciosa.
- **RN-046 [MVP]** — Pagamento aprovado após expiração/liberação da reserva não restaura automaticamente estoque inexistente: o caso entra em revisão e eventual compensação/reembolso.
- **RN-047 [MVP]** — Reembolso só pode atingir valores efetivamente pagos/capturados e não pode ultrapassar o saldo ainda reembolsável, inclusive sob concorrência.
- **RN-048 [MVP]** — Cada tentativa de pagamento e reembolso mantém identificadores próprios e histórico de comunicação com o provedor, com dados sensíveis protegidos.

### 6.7 Produtos digitais e biblioteca

- **RN-049 [MVP]** — Um direito de acesso digital é concedido somente após confirmação válida de pagamento **e elegibilidade comercial do pedido**.
- **RN-050 [MVP]** — Concessões repetidas para mesmo pedido/item/beneficiário não geram direitos duplicados.
- **RN-051 [MVP]** — O cliente só acessa arquivo digital completo com direito válido; prévia pública é um recurso separado.
- **RN-052 [MVP]** — Um link temporário de acesso deve expirar e não substitui a validação do direito do titular.
- **RN-053 [MVP]** — A remoção do item do catálogo não revoga automaticamente direitos já adquiridos; exceções por licença, fraude ou determinação legal exigem processo explícito.
- **RN-054 [MVP]** — Revogação/suspensão por estorno, fraude ou disputa é uma decisão rastreável, sujeita à política comercial e jurídica; não decorre cegamente de qualquer evento externo.

### 6.8 Entrega, cancelamento e reembolso

- **RN-055 [MVP]** — Pedido exclusivamente digital dispensa cálculo de frete; pedido com itens físicos exige opção de entrega antes de confirmar compra.
- **RN-056 [MVP]** — Cada remessa física possui rastreio operacional separado do estado financeiro do pedido.
- **RN-057 [MVP]** — A operação não pode marcar item físico como entregue apenas porque o pagamento foi aprovado.
- **RN-058 [MVP]** — Cancelamento de pedido não pago deve encerrar tentativas pendentes conforme integração e liberar reservas quando seguro.
- **RN-059 [MVP]** — Solicitações de cancelamento, devolução e arrependimento são registradas com data, motivo, itens afetados e andamento.
- **RN-060 [MVP]** — O processo de arrependimento deve respeitar o regime legal aplicável, inclusive em vendas digitais; sua regra detalhada será validada antes do uso real.
- **RN-061 [MVP]** — Reembolso e devolução de estoque são operações distintas: não se incrementa estoque físico antes de determinar que a unidade retornou e está apta à venda.
- **RN-062 [MVP]** — Cancelamentos ou reembolsos parciais não podem alterar o snapshot original: produzem registros compensatórios vinculados aos itens.
- **RN-063 [MVP]** — Se um pedido misto falhar parcialmente, atendimento e operação devem enxergar separadamente pendências financeiras, físicas e digitais.

### 6.9 Administração, privacidade e auditoria

- **RN-064 [MVP]** — Alterações em preço, catálogo, saldo e estado financeiro dependem de permissões específicas, não apenas do atributo genérico `admin`.
- **RN-065 [MVP]** — Ações administrativas críticas registram ator, operação, entidade, instante, resultado e motivo quando exigido, sem expor segredos.
- **RN-066 [MVP]** — Integrações usam credenciais técnicas segregadas das sessões humanas, com escopos mínimos.
- **RN-067 [MVP]** — Solicitações do titular sobre dados pessoais possuem canal, rastreamento e tratamento conforme a LGPD e obrigações legais de retenção.
- **RN-068 [MVP]** — A plataforma exibe informações essenciais do fornecedor, produto, entrega, custos, confirmação da contratação e atendimento conforme as normas aplicáveis.
- **RN-069 [MVP]** — Dados pessoais e financeiros devem ser coletados e conservados com finalidade definida, acesso restrito e política documentada de retenção e exclusão.
- **RN-070 [MVP]** — A falha em notificação externa, e-mail ou fila não pode apagar transação de negócio já confirmada; pendências devem ser recuperáveis.

---

## 7. Capacidades funcionais (visão de alto nível)

| ID | Capacidade | Prioridade |
|---|---|---|
| RF-001 | Consultar, pesquisar e filtrar catálogo | MVP |
| RF-002 | Visualizar detalhes e prévias públicas de produtos digitais | MVP |
| RF-003 | Criar e manter conta de cliente | MVP |
| RF-004 | Gerenciar carrinho | MVP |
| RF-005 | Calcular orçamento/checkout com frete, desconto e totais | MVP |
| RF-006 | Confirmar pedido de maneira idempotente | MVP |
| RF-007 | Iniciar e acompanhar pagamento em sandbox | MVP |
| RF-008 | Reservar, confirmar, liberar e auditar estoque | MVP |
| RF-009 | Consultar pedidos e seus estados | MVP |
| RF-010 | Acessar biblioteca digital autorizada | MVP |
| RF-011 | Gerenciar catálogo, pedidos e estoque no backoffice | MVP |
| RF-012 | Solicitar cancelamento/arrependimento e acompanhar tratamento | MVP |
| RF-013 | Gerar relatórios operacionais auditáveis | Evolução |
| RF-014 | Checkout como visitante | Evolução |
| RF-015 | Integrar expedição e emissão fiscal de produção | Evolução |

---

## 8. Estados de negócio — catálogo inicial para modelagem

Os estados abaixo são **vocabulário inicial**, não uma máquina UML aprovada. Evitar criar um enum único que misture liquidação, estoque e entrega.

| Agregado/processo | Estados candidatos | Observação |
|---|---|---|
| Pedido | `PENDING_PAYMENT`, `PAID`, `IN_FULFILLMENT`, `PARTIALLY_FULFILLED`, `FULFILLED`, `CANCELLED`, `PAYMENT_REVIEW` | Definir transições e compensações em diagrama específico. |
| Pagamento | `CREATED`, `PENDING`, `APPROVED`, `FAILED`, `CANCELLED`, `PARTIALLY_REFUNDED`, `REFUNDED` | Uma tentativa não equivale ao saldo do pedido. |
| Reserva | `ACTIVE`, `CONFIRMED`, `RELEASED`, `EXPIRED` | Eventos concorrentes exigem transições protegidas. |
| Direito digital | `ACTIVE`, `SUSPENDED`, `REVOKED` | Não confundir direito com expiração da URL. |
| Remessa | `AWAITING_PICKING`, `PACKED`, `SHIPPED`, `DELIVERED`, `EXCEPTION` | Pode existir mais de uma remessa por pedido. |
| Solicitação de devolução | `REQUESTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED` | Não implica reembolso automático. |

---

## 9. Fluxos principais (descrição textual; diagramas propostos na Fase 02)

### FL-001 — Compra física

1. Cliente monta carrinho e informa endereço.
2. Sistema apresenta cotação do servidor, frete e condições.
3. Cliente confirma; checkout cria pedido e reserva estoque de forma transacional.
4. Sistema solicita pagamento e aguarda confirmação verificável.
5. Pagamento aprovado converte a reserva em alocação confirmada.
6. Operação prepara, expede e registra evolução logística.
7. Cliente consulta o pedido até conclusão ou exceção operacional.

### FL-002 — Compra digital

1. Cliente seleciona e-book ou revista digital.
2. Sistema confirma preço e elegibilidade para venda.
3. Pedido é criado e pagamento é iniciado.
4. Confirmação financeira válida habilita concessão idempotente do direito digital.
5. Cliente acessa sua biblioteca por autorização a cada recurso protegido.

### FL-003 — Compra mista / kit

1. Sistema expande a composição do kit para validar componentes físicos/digitais.
2. Reserva física só é aceita se todos os componentes necessários estiverem disponíveis.
3. O pedido preserva composição, preços e benefícios comerciais.
4. Após o pagamento, processos físicos e digitais evoluem separadamente, mantendo consistência comercial.

### FL-004 — Pagamento atrasado após expiração

1. Reserva é liberada conforme sua validade e regras de reconciliação.
2. Posteriormente, o provedor comunica pagamento aprovado e autenticamente validado.
3. Sistema verifica a inexistência de reserva/estoque alocado e abre `PAYMENT_REVIEW`.
4. Nenhuma venda adicional de estoque é inventada e nenhum direito digital do pedido misto é liberado automaticamente nesse caso.
5. Inicia-se **reembolso integral idempotente como compensação padrão do MVP**, sujeito a conciliação até comprovação; exceções de realocação exigem decisão humana autorizada, sem retomada automática de reserva.

---

## 10. Cenários de aceitação prioritários

### CA-001 — Concorrência no último item (RN-025, RN-026)

**Dado** que resta exatamente uma unidade vendável de um SKU físico,  
**Quando** dois clientes confirmam checkouts concorrentes para essa unidade,  
**Então** no máximo uma reserva é aceita e nenhum saldo vendável fica negativo.

### CA-002 — Repetição da confirmação do checkout (RN-033, RN-034)

**Dado** que um cliente já concluiu uma requisição com uma chave de idempotência,  
**Quando** a mesma requisição é reenviada com a mesma chave,  
**Então** o sistema devolve o resultado do mesmo pedido sem duplicar pedido ou reserva.

### CA-003 — Webhook duplicado (RN-041 a RN-044, RN-050)

**Dado** um pedido cuja confirmação de pagamento já foi processada,  
**Quando** o provedor repete o mesmo evento válido,  
**Então** não há segunda confirmação, nem duplicação de estoque consumido ou de acesso digital.

### CA-004 — Preço manipulado no navegador (RN-016 a RN-018)

**Dado** que um cliente altera localmente o valor de um produto,  
**Quando** confirma o checkout,  
**Então** o servidor calcula o total pela precificação autorizada e rejeita divergência não aceita pelo cliente.

### CA-005 — Pagamento após reserva expirada (RN-027, RN-046)

**Dado** que uma reserva foi liberada antes de chegar a confirmação de pagamento,  
**Quando** o pagamento aprovado é recebido,  
**Então** o pedido entra em reconciliação/revisão sem consumir estoque inexistente.

### CA-006 — Biblioteca privada (RN-014, RN-049 a RN-053)

**Dado** um cliente sem direito ativo para um e-book,  
**Quando** tenta usar uma URL ou identificador pertencente a outro cliente,  
**Então** o conteúdo protegido não é entregue, mesmo que o endereço seja conhecido.

### CA-007 — Cupom de uso único sob concorrência (RN-019 a RN-021)

**Dado** um cupom válido com apenas um uso disponível,  
**Quando** duas compras tentam consumi-lo concorrentemente,  
**Então** no máximo uma consegue a aplicação comprometida do benefício.

### CA-008 — Reembolso concorrente (RN-047, RN-062)

**Dado** um pagamento com saldo parcialmente reembolsável,  
**Quando** são solicitados reembolsos concorrentes cujo somatório excede o saldo,  
**Então** os valores efetivados não ultrapassam o montante elegível.

### CA-009 — Produto removido após compra (RN-004, RN-053)

**Dado** um pedido legítimo e quitado,  
**Quando** o administrador despublica o produto,  
**Então** o snapshot do pedido permanece e direitos adquiridos não são removidos automaticamente.

### CA-010 — Falha de envio de notificação (RN-070)

**Dado** um pagamento confirmado e salvo,  
**Quando** o serviço de e-mail falha,  
**Então** o pagamento não é revertido indevidamente, e a notificação fica recuperável.

---

## 11. Requisitos não funcionais (critérios a detalhar)

| ID | Qualidade | Critério/abordagem proposta |
|---|---|---|
| RNF-001 | Segurança | Controles baseados em risco, detalhados como SEC-001 a SEC-038 em `docs/07-security/security-requirements.md`; prova por comportamento, separando aplicação, runtime e infraestrutura. |
| RNF-002 | Integridade | Operações críticas de estoque, cupom, checkout e reembolso resistem a concorrência e replay. |
| RNF-003 | Resiliência | Integrações externas têm timeout, tratamento de retries, reconciliação e comportamento em falha documentado. |
| RNF-004 | Rastreabilidade | Correlation ID, logs estruturados e auditoria de ações sensíveis, com minimização de PII e sem segredos; SEC-030 e SEC-036. |
| RNF-005 | Privacidade | Minimização de dados, controle de acesso em listagens/exportações, finalidade, retenção/descarte e direitos dos titulares; SEC-028 e SEC-029. |
| RNF-006 | Performance | Medir latência p50/p95/p99 de catálogo e checkout em ambiente e carga documentados; estabelecer metas após baseline. |
| RNF-007 | Escalabilidade | Planejar evolução por evidências de carga e gargalos; não assumir necessidade de microsserviços antecipadamente. |
| RNF-008 | Testabilidade | Testes unitários, integração com PostgreSQL real, contratos de integração, E2E e cenários de concorrência. |
| RNF-009 | Acessibilidade | Mirar WCAG 2.2 nível AA para interfaces; verificar com automação e avaliação manual. |
| RNF-010 | Operabilidade | Health checks, métricas, alertas, backups e restauração testada, com resposta a incidentes; SEC-035, SEC-036 e SEC-038. |
| RNF-011 | Manutenibilidade | Módulos com responsabilidades claras, contratos definidos, documentação de decisões e CI. |
| RNF-012 | Portabilidade | Desenvolvimento reproduzível com variáveis de ambiente exemplificadas e contêineres quando aplicável. |

**Observação:** nenhuma meta de SLA, p95 ou VUs é considerada atingida por constar neste documento; evidência depende de medição reproduzível.

### 11.1 Especificação especializada de segurança

A segurança é planejada **desde a descoberta**, mas sua arquitetura e implementação serão determinadas nas fases seguintes. O documento **AC-SEC-001**, versionado em `docs/07-security/security-requirements.md`, detalha SEC-001–SEC-038, cenários SA-001–SA-012, ativos sensíveis, fronteiras de confiança, rastreabilidade e decisões DS-001–DS-009.

**Princípio de verificação:** nenhum requisito pode ser declarado implementado sem evidência; presença de configuração, biblioteca, middleware ou anotação não comprova proteção efetiva. Controles dependentes da infraestrutura devem permanecer **não verificados** até inspeção de ambiente/provedor e, quando apropriado, teste funcional.

**Nota de escopo:** checkout em sandbox, sem coleta direta de PAN/CVV no Atlas; conformidade PCI DSS e outras exigências reais dependem da integração final e de avaliação própria. A gestão de arquivos digitais e uploads requer controles específicos, sem supor que URLs assinadas impeçam compartilhamento durante sua validade.

---

## 12. Requisitos de conformidade a validar para operação brasileira

O escopo considera consumidores no Brasil. O sistema deve mapear controles para:

1. **CDC — Lei 8.078/1990:** informação adequada, ofertas, contratos, atendimento e direito de arrependimento, entre outros direitos.
2. **Decreto 7.962/2013:** informações claras sobre fornecedor/produtos, atendimento facilitado e exercício do arrependimento no comércio eletrônico.
3. **LGPD — Lei 13.709/2018:** bases legais, princípios, direitos dos titulares, segurança e retenção de dados pessoais.
4. **Regras fiscais, de copyright e de licenças de conteúdo digital:** investigação específica antes de disponibilizar uma operação real, inclusive notas fiscais e modelos de distribuição de obras.

A aplicação de prazos, devoluções de digitais, exceções e obrigações fiscais **não será improvisada como regra imutável**. Será documentada com fundamento e revisão jurídica/contábil quando sair do contexto de demonstração.

**Fontes oficiais:**

- Código de Defesa do Consumidor: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- Decreto do comércio eletrônico: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm
- Lei Geral de Proteção de Dados: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Guias da ANPD: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes

---

## 13. Decisões pendentes / hipóteses a validar

| ID | Questão | Hipótese de trabalho | Criticidade |
|---|---|---|---|
| DA-001 | Modelo de negócio | Uma editora brasileira fictícia vendendo B2C | Alta |
| DA-002 | Tipos de produto | Livro físico, e-book, revista digital e kit simples | Alta |
| DA-003 | Cadastro obrigatório | Sim, no checkout MVP; visitante pesquisa e monta carrinho | Média |
| DA-004 | Política de kits | Proposta RN-088–094: kit indivisível, snapshot fixo e reserva all-or-nothing; exceções legais permanecem | Alta |
| DA-005 | Estoque | Depósito lógico único; TTL proposto de 40 min pelo relógio do banco, condicionado a DA-006 | Alta |
| DA-006 | Provedor de pagamento | Escolher integração oficial com sandbox e webhooks | Alta |
| DA-007 | Frete | Simulador determinístico no MVP; provedor real depois | Média |
| DA-008 | Produtos digitais | Biblioteca e visualização/download autorizado por licença | Alta |
| DA-009 | Reembolsos e devoluções | Política RN-081–087 proposta; refund integral padrão para cobrança tardia; alçadas e tratamento jurídico-fiscal pendentes | Alta |
| DA-010 | Impostos e emissão fiscal | Fora da integração real do MVP, sem alegar prontidão comercial | Alta |
| DA-011 | Cupons | Um por pedido; sem empilhamento | Média |
| DA-012 | Reserva de estoque | Reserva 40 min, PSP até 30 min e gap mínimo de 5 min; proposta condicionada à DA-006 | Alta |
| DA-013 | Público e conteúdo | Conteúdo de demonstração próprio ou licenciado | Alta |
| DA-014 | Forma de hospedagem | Ambiente demonstrativo sem transações financeiras reais | Média |
| DA-015 | Política de dados e retenção | Definir inventário de dados e descarte legalmente apropriado | Alta |
| DA-016 | Política de identidade e sessão | Resolver DS-001, DS-002: cookies, TTL, revogação e MFA de contas privilegiadas | Alta |
| DA-017 | Matriz de autorização | Resolver DS-003: permissões por ação/recurso e separação de operações financeiras | Alta |
| DA-018 | Segurança de integrações | Resolver DS-004: assinatura de webhook, retries, sandbox e escopo PCI | Alta |
| DA-019 | Mídia e arquivos privados | Resolver DS-005, DS-006: uploads, prévias e armazenamento de downloads | Alta |
| DA-020 | Evidências de segurança operacional | Resolver DS-008: scans, CI, secrets, TLS, backup/restore e alertas | Alta |
| DA-021 | Referencial verificável | Resolver DS-009: selecionar requisitos OWASP ASVS aplicáveis por risco | Média |

**Estado da versão:** as hipóteses acima permitem avançar na modelagem, mas nenhuma deve ser apresentada como decisão de uma empresa real. As decisões DS-001 a DS-009 estão detalhadas na especificação de segurança AC-SEC-001.

---

## 14. Matriz inicial de rastreabilidade

| Cenário | Regras | Capacidades | Evidências futuras |
|---|---|---|---|
| Compra do último SKU | RN-024–031 | RF-005, RF-006, RF-008 | Teste concorrente com banco real; diagrama sequência; eventos de estoque |
| Repetição de checkout | RN-032–034 | RF-006 | Teste de idempotência e constraint persistente |
| Duplicidade de webhook | RN-041–044, RN-049–050 | RF-007, RF-010 | Testes de replay, assinatura e out-of-order |
| Acesso digital indevido | RN-009, RN-014, RN-049–054 | RF-010 | Testes de autorização e acesso a mídia |
| Cupom sob disputa | RN-019–021 | RF-005 | Teste transacional de uso concorrente |
| Cancelamento/reembolso | RN-047, RN-058–063, RN-077–087 | RF-012 | CA-015–021; testes de fluxo, saldo reservado, compensação e auditoria |
| Alteração administrativa | RN-064–069 | RF-011 | Testes de permissão e evidência de auditoria |
| Controle de acesso horizontal | RN-009, RN-014, RN-039 | RF-009, RF-010 | SEC-001–003, SA-001 e SA-009; testes de titularidade |
| Autenticação e sessão | RN-009, RN-013 | RF-003 | SEC-004–009, SA-003 e SA-004; testes de MFA/sessão |
| Catálogo e checkout expostos | RN-006, RN-016–021 | RF-002, RF-005 | SEC-010–019, SA-005 e SA-010; manipulação, uploads e abuso |
| Provedor e reembolso | RN-041–048, RN-058–063 | RF-007, RF-012 | SEC-020–024, SA-007 e SA-008; assinatura, replay e autorização |
| Proteção de dados e operação | RN-064–069 | RF-011, RF-013 | SEC-028–038, SA-011 e SA-012; privacidade, logs e restore |

Na implementação, essa matriz deve referenciar links reais para código, PRs e testes, sem links fictícios.

---

## 15. Riscos e critérios de encerramento da fase

### Riscos prioritários

- **R-001 — Venda acima do estoque:** controlar atomicidade e índices/constraints no banco.
- **R-002 — Eventos financeiros repetidos ou fora de ordem:** autenticar o provedor, deduplicar e reconciliar.
- **R-003 — Acoplamento de pedido e pagamento:** separar estados comerciais e financeiros.
- **R-004 — Acesso digital não autorizado:** checagem de entitlement e URLs temporárias.
- **R-005 — Ambiguidade de kits e remessas parciais:** fixar invariantes antes de modelagem física.
- **R-006 — Informação legal insuficiente:** revisão de políticas e exigências antes de produção real.
- **R-007 — Escopo excessivo:** preservar MVP e justificar cada expansão.
- **R-008 — Acesso horizontal e escalonamento:** consultar pedidos, endereços, arquivos ou relatórios alheios sem autorização.
- **R-009 — Comprometimento de contas privilegiadas:** MFA e autorizações administrativas precisam de estratégia explícita.
- **R-010 — Abuso de arquivos e integrações:** uploads, URLs externas e webhooks exigem fronteiras e validação.
- **R-011 — Vazamento por observabilidade/exports:** logs, arquivos de exportação e terceiros recebem dados que precisam de finalidade e controle.
- **R-012 — Controles operacionais apenas declarados:** CI, TLS, secrets e restore devem ter evidências reais, não somente configurações. 

### Definição de pronto da fase de regras de negócio

- [ ] Domínio, atores e glossário revisados.
- [ ] Inconsistências relevantes resolvidas e políticas v0.2 validadas contra a escolha do PSP (DA-006).
- [ ] DA-001 a DA-021 avaliadas e registradas como decididas/adiadas.
- [ ] Requisitos SEC-001 a SEC-038 revisados, priorizados e associados às superfícies do projeto.
- [ ] Casos SA-001 a SA-012 selecionados para testes futuros e decisões DS-001 a DS-009 priorizadas.
- [ ] Critérios CA-001–026 e SA-001–012 revisados, incluindo links para cenários de políticas críticas.
- [ ] Estados e limites de contexto aceitos para serem diagramados.
- [ ] Matriz de rastreabilidade inicial atualizada.
- [ ] Requisitos legais marcados para revisão especializada, quando aplicável.

---

## 16. Próxima etapa documentada

**Etapa 2 — Modelagem de processos e diagramas (artefatos iniciais já presentes no repositório; revisão e aprovação pendentes)**, com entregáveis independentes:

1. Mapa de contexto de negócio e atores.
2. Diagrama de casos de uso por papel.
3. BPMN: jornada de compra, pagamento e pós-venda.
4. Sequência: checkout com estoque, webhook duplicado e pagamento tardio.
5. Máquina de estados: pedido, pagamento, reserva e entitlement (cada uma separada).
6. Modelo conceitual de entidades e agregados.
7. Diagrama C4 de contexto (nível 1) e contêineres (nível 2) **após** validar as fronteiras de negócio.
8. Diagrama de fluxo de dados (DFD) para conta, checkout, webhooks, administração e arquivos, identificando fronteiras de confiança e cenários de abuso.

> **Regra de engenharia do portfólio:** a documentação serve como contrato de entendimento e referência de testes, mas deve evoluir sempre que o comportamento real mudar. Não registrar funcionalidade como implementada sem evidências.


## 17. Controle de sincronização

- O repositório já contém modelos da Fase 02 (UC, PR, SQ, SM, BPMN), políticas PC-01–04 e critérios CA-011–026; todos são **propostos**, não código implementado.
- Alterações futuras em RN-071–094 exigem revisão dos modelos e das referências SEC-018–024, SEC-025, SA-006–009, e da [matriz](../03-business-processes/MATRIZ-DE-RASTREABILIDADE.md).
- A atualização da versão base não significa aprovação automática do adendo nem validação da integração com o PSP.
