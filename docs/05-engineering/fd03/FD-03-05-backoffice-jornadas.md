# FD-03-05 — UX de operações e backoffice (sem template genérico)

> As nove referências visuais representam **apenas o storefront**. Backoffice precisa de eficiência, informação densa, prevenção de erro, auditoria e acessibilidade. Não clonar VerboVivo nem inventar dashboards com gráficos falsos.

## Perfis e tarefas sem ampliação de poder

| Perfil proposto | Necessidades UX | Controle de servidor obrigatório |
|---|---|---|
| Editor | rascunho/publicação, conteúdo de prévia, revisão de mídia | permissão editorial; arquivo licenciado |
| Operador estoque | conferir saldos, registrar ajuste e motivo | capability de estoque, estoque transacional |
| Atendimento | consultar casos com finalidade, devolver/arrependimento | escopo, trilha de acesso e proteção de dados |
| Financeiro solicitante | registrar refund elegível, acompanhar estado | MFA/step-up, saldo reservado, idempotência |
| Financeiro aprovador | avaliar solicitação e alçada, aprovar/recusar | **outra identidade**; limite de valor e step-up |
| Admin de segurança | gerir sessões, papéis, fatores | não herda acesso financeiro nem editorial |

**Estado da autorização:** os perfis acima são candidatos da [DS-003](../../04-architecture/security/authorization-matrix.md), não roles finais aprovadas. Nomes, concessões, alçadas, abrangência da dupla aprovação, exceções e fator/recência de MFA continuam **pendentes de aprovação**; a proposta CT-01/06 exige identidade distinta no fluxo manual inventariado. A compensação técnica RN-078 segue política própria, sem depender de clique de operador.

## Fluxo crítico de refund manual

1. Operador autorizado identifica caso com motivação e transação alvo.
2. Sistema exibe captura e reembolsos **confirmados + pendentes reservados** sem revelar meios de pagamento sensíveis.
3. Solicitante registra a solicitação idempotente (`REQUESTED`), sem marcar 'concluído'.
4. Aprovador **diferente** revisa segundo o fluxo proposto; MFA recente e alçada aplicam-se à decisão. Autorizar e reservar saldo atomicamente corresponde a `APPROVED`, conforme [SM-07](../../03-business-processes/TABELAS-DE-TRANSICAO.md); não representar `REQUESTED` como devolução aprovada ou concluída.
5. Serviço técnico executa no PSP, com retries idempotentes e reconciliação. Status `PENDING`, `RECONCILIATION_REQUIRED` e `SUCCEEDED` devem ser distintos.
6. Auditoria liga identidades, justificativa, timestamps, operação externa e estados; não guarda segredo/token/cartão.

[ADM-01 — Fluxo administrativo](diagrams/ADM-01-fluxo-reembolso-admin.md).

## Estados de produtividade

- **Tabelas:** filtro persistente, cabeçalho legível, paginação determinística, alternativa a mouse, placeholders só quando legítimos.
- **Decisões:** contexto da versão do recurso e detecção de dados obsoletos; feedback de conflito, sem retentar refund automaticamente pela UI.
- **Acesso negado:** não revelar dados fora do escopo nem tentar obter tudo no cliente para 'esconder' linhas.
- **Observabilidade:** atrasos e mensagens outbox poderão ser visualizados **somente se autorizados**; Render Free dormindo não significa 'nenhum trabalho pendente'.
- **Responsividade:** admin pode assumir tarefas complexas no desktop, mas funções essenciais precisam ser acessíveis e compreensíveis em viewport menor; sem truncar IDs críticos ou valores monetários.

## Dependências

[DS-003](../../04-architecture/security/authorization-matrix.md), [CT-06](../contracts/CT-06-autorizacao-por-recurso.md), [PC-03](../../03-business-processes/POLITICAS-CONSOLIDADAS.md). Os limiares monetários de alçada **não** foram aprovados.
