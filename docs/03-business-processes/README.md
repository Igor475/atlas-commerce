# Atlas Commerce — Fase 02: processos e diagramas

> **ID:** AC-MODEL-002 | **Versão:** 0.3.0 — refinamento de fluxos críticos  
> **Data:** 12/10/2026 | **Estado:** diagramas conceituais revisados; controles e integrações não implementados  
> **Fontes:** [BRD v0.2.1](../02-business-requirements/REGRAS-DE-NEGOCIO.md), [Adendo v0.2](../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md), [SEC v0.2](../07-security/security-requirements.md).

## Objetivo e alcance

Este diretório documenta processos de compra, pós-venda, máquinas de estados e casos de uso com fontes editáveis. Os **vinte diagramas visuais legados** de Fase 02 são preservados, assim como a matriz, regras RN-001–094 e critérios CA-001–026. Esta revisão altera **SQ-05 e BPMN-01/02**, sem renumerar seus IDs, e complementa a rastreabilidade e as decisões técnicas condicionadas.

**Notações:** casos de uso e estados são representações inspiradas em UML; PR/PC em `.dot` são fluxogramas, **não** BPMN; SQ em `.mmd` são diagramas Mermaid; `bpmn/*.bpmn` contém XML BPMN 2.0 com BPMN DI, `isExecutable=false`, para inspeção e modelagem, não para execução. SVG/PNG são prévias independentes. Guards normativas encontram-se nas [tabelas de transição](TABELAS-DE-TRANSICAO.md), [políticas](POLITICAS-CONSOLIDADAS.md) e [segurança](../07-security/security-requirements.md).

## Catálogo dos diagramas existentes (preservar)

| ID | Tema | Fonte | Visualização |
|---|---|---|---|
| UC-01 | Loja e cliente | [.dot](use-cases/UC-01-loja-e-cliente.dot) | [SVG](use-cases/UC-01-loja-e-cliente.svg) · [PNG](use-cases/UC-01-loja-e-cliente.png) |
| UC-02 | Backoffice e integrações | [.dot](use-cases/UC-02-backoffice-e-integracoes.dot) | [SVG](use-cases/UC-02-backoffice-e-integracoes.svg) · [PNG](use-cases/UC-02-backoffice-e-integracoes.png) |
| PR-01 | Compra física | [.dot](processes/PR-01-compra-fisica.dot) | [SVG](processes/PR-01-compra-fisica.svg) · [PNG](processes/PR-01-compra-fisica.png) |
| PR-02 | Compra digital e mista | [.dot](processes/PR-02-compra-digital-e-mista.dot) | [SVG](processes/PR-02-compra-digital-e-mista.svg) · [PNG](processes/PR-02-compra-digital-e-mista.png) |
| PR-03 | Pós-venda e reembolso | [.dot](processes/PR-03-pos-venda-e-reembolso.dot) | [SVG](processes/PR-03-pos-venda-e-reembolso.svg) · [PNG](processes/PR-03-pos-venda-e-reembolso.png) |
| SQ-01 | Checkout idempotente | [.mmd](sequences/SQ-01-checkout-idempotente.mmd) | [SVG](sequences/SQ-01-checkout-idempotente.svg) · [PNG](sequences/SQ-01-checkout-idempotente.png) |
| SQ-02 | Webhook idempotente | [.mmd](sequences/SQ-02-webhook-idempotente.mmd) | [SVG](sequences/SQ-02-webhook-idempotente.svg) · [PNG](sequences/SQ-02-webhook-idempotente.png) |
| SQ-03 | Pagamento tardio | [.mmd](sequences/SQ-03-pagamento-tardio.mmd) | [SVG](sequences/SQ-03-pagamento-tardio.svg) · [PNG](sequences/SQ-03-pagamento-tardio.png) |
| SQ-04 | Reembolso idempotente | [.mmd](sequences/SQ-04-reembolso-idempotente.mmd) | [SVG](sequences/SQ-04-reembolso-idempotente.svg) · [PNG](sequences/SQ-04-reembolso-idempotente.png) |
| **SQ-05** | **Kit misto (corrigido)** | **[.mmd](sequences/SQ-05-kit-misto.mmd)** | **[SVG](sequences/SQ-05-kit-misto.svg) · [PNG](sequences/SQ-05-kit-misto.png)** |
| SM-01 | Pedido | [.dot](state-machines/SM-01-pedido.dot) | [SVG](state-machines/SM-01-pedido.svg) |
| SM-02 | Tentativa de pagamento | [.dot](state-machines/SM-02-tentativa-de-pagamento.dot) | [SVG](state-machines/SM-02-tentativa-de-pagamento.svg) |
| SM-03 | Reserva | [.dot](state-machines/SM-03-reserva-de-estoque.dot) | [SVG](state-machines/SM-03-reserva-de-estoque.svg) |
| SM-04 | Direito digital | [.dot](state-machines/SM-04-direito-de-acesso-digital.dot) | [SVG](state-machines/SM-04-direito-de-acesso-digital.svg) |
| SM-05 | Remessa física | [.dot](state-machines/SM-05-remessa-fisica.dot) | [SVG](state-machines/SM-05-remessa-fisica.svg) |
| SM-06 | Solicitação de devolução | [.dot](state-machines/SM-06-solicitacao-de-devolucao.dot) | [SVG](state-machines/SM-06-solicitacao-de-devolucao.svg) |
| SM-07 | Reembolso | [.dot](state-machines/SM-07-reembolso.dot) | [SVG](state-machines/SM-07-reembolso.svg) |
| PC-01/02 | Reserva + pagamento tardio | [.dot](processes/PC-01-reserva-e-pagamento-tardio.dot) | [SVG](processes/PC-01-reserva-e-pagamento-tardio.svg) |
| PC-03 | Reembolso | [.dot](processes/PC-03-reembolso.dot) | [SVG](processes/PC-03-reembolso.svg) |
| PC-04 | Kits | [.dot](processes/PC-04-kits.dot) | [SVG](processes/PC-04-kits.svg) |

Os `.png` dos diagramas de Graphviz legados permanecem em seus caminhos atuais e **não precisam ser substituídos**. Os arquivos descritivos `.md` de cada diagrama também são preservados. O pacote desta revisão contém apenas os arquivos que mudaram.

## BPMN 2.0 — fontes e prévias revisadas

| Diagrama | BPMN XML (editável) | Nova prévia visual | Correção de comportamento |
|---|---|---|---|
| BPMN-01 — Compra física | [BPMN](bpmn/BPMN-01-compra-fisica.bpmn) | [SVG](bpmn/BPMN-01-compra-fisica.svg) · [PNG](bpmn/BPMN-01-compra-fisica.png) | Separa reserva, expiração, confirmação financeira, revisão e refund integral |
| BPMN-02 — Pós-venda | [BPMN](bpmn/BPMN-02-pos-venda.bpmn) | [SVG](bpmn/BPMN-02-pos-venda.svg) · [PNG](bpmn/BPMN-02-pos-venda.png) | Preserva solicitação de digital, análise legal/alçada, refund incerto e inspeção física |

Os diagramas são **descritivos**, não orquestrações executáveis. O XML possui nós, sequência de fluxo e coordenadas BPMN DI estruturalmente validados por análise XML; abertura em um modelador BPMN externo e qualidade de layout nesse software continuam por validar. A prévia SVG/PNG foi gerada a partir dos mesmos nós e arestas e pode ter tipografia/layout diferente do modelador.

## Contratos de negócio e segurança

- **PC-01 — Reserva:** 40 minutos pelo relógio do PostgreSQL; sessão PSP de no máximo 30 minutos e expiração ao menos cinco minutos antes da reserva; parâmetros **condicionados à confirmação no PSP**.
- **PC-02 — Pago após reserva expirada:** `PAYMENT_REVIEW`, bloqueio de fulfillment e acesso digital do pedido misto, refund integral idempotente por padrão.
- **PC-03 — Reembolso:** separar solicitação, autorização, reserva financeira, submissão ao PSP, reconciliação e confirmação. Saldo = `captured - succeeded - outstanding_reserved`, sem retry com outro ID.
- **PC-04 — Kits:** composição fixada, reserva all-or-nothing, componentes físicos juntos e direitos digitais somente após quitação e alocação física completa.
- **Segurança:** módulos de Pagamentos validam os webhooks (SEC-020–024); nenhuma notificação externa pode conferir acesso sem guardas e direitos por recurso (SEC-025).

## Rastreabilidade e decisões

- [Políticas PC-01–04](POLITICAS-CONSOLIDADAS.md)
- [Tabelas de estados/guardas](TABELAS-DE-TRANSICAO.md)
- [Cenários CA-011–026](CENARIOS-DE-ACEITE-v0.2.md)
- [Integração processo × segurança](INTEGRACAO-SEGURANCA.md)
- [Matriz de rastreabilidade](MATRIZ-DE-RASTREABILIDADE.md)
- [Decisões pendentes v0.4](DECISOES-PENDENTES.md)
- [Critérios para PSP, alçadas e licenças](CRITERIOS-DECISOES-EXTERNAS.md)
- [Requisitos de segurança](../07-security/security-requirements.md)

As políticas comerciais/tecnológicas são **propostas do projeto fictício**: nenhum teste de software, confirmação do PSP, alçada operacional real nem parecer jurídico foi concluído. Para Fase 03, a seleção de provedor, matriz de autorização e registro dos termos de licença serão formalizados antes da implementação. **Não tratar decisões abertas como prontidão de produção.**
