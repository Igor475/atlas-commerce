# SEQ-02 — Refund financeiro e pós-venda

[Mermaid editável](SEQ-02-reembolso.mmd), complementar aos diagramas [SQ-04](../../03-business-processes/sequences/SQ-04-reembolso-idempotente.mmd) e [SM-07](../../03-business-processes/state-machines/SM-07-reembolso.dot) da Fase 02.

**Invariantes:** reembolso disponível por captura desconta `succeeded + pending_reserved`, sem duplicidade em timeout; separação de atendimento, autorização financeira, execução técnica e reconciliação, com revogação digital e retorno físico como processos independentes. Referências RN-081–087, SEC-003/005/022/024/025, CA-018–021 e SA-008.

O desenho completo está na fonte `.mmd`. A escolha de alçadas e PSP permanece aberta; por isso **não** representa autorização financeira já aprovada nem execução real.
