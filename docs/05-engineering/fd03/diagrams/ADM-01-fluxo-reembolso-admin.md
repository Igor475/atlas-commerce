# ADM-01-fluxo-reembolso-admin — fluxo de reembolso segregado

> **Diagrama proposto, não tela aprovada.** A fonte editável é [ADM-01-fluxo-reembolso-admin.dot](ADM-01-fluxo-reembolso-admin.dot).

![fluxo de reembolso segregado](ADM-01-fluxo-reembolso-admin.svg)

[PNG separado](ADM-01-fluxo-reembolso-admin.png). Não usar este diagrama como validação de implementação ou substituto de regras RN/PC/SEC.

**Estados e aprovação:** `REQUESTED` é solicitação; `APPROVED` autoriza e reserva saldo na transação; somente prova PSP permite `SUCCEEDED` (SM-07/PC-03). O desenho de segregação manual segue proposta CT-01/06, com roles/alçadas/exceções **pendentes de aprovação DS-003/DA-009**; não redefine compensação automática RN-078. Ver [backoffice](../FD-03-05-backoffice-jornadas.md) e [pendência UXD-17](../FD-03-08-decisoes-abertas.md).
