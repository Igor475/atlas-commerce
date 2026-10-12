# Segurança do Atlas Commerce

> **Estado:** análise e especificação, sem código implementado ou segurança validada.

## Documento vigente proposto

- [AC-SEC-001 v0.2 — security-requirements.md](security-requirements.md): 38 controles SEC, 12 cenários SA, 9 decisões DS e mapa das políticas PC-01–04.
- [Integração com processos](../03-business-processes/INTEGRACAO-SEGURANCA.md): ligações de diagramas e cenários.
- [Índice e precedência](../README.md): como resolver conflitos de documento.

## Entregáveis futuros (não criados como documentos ficticiamente completos)

| Artefato previsto | Pré-requisito |
|---|---|
| `threat-model.md` | DFDs, fronteiras de confiança, STRIDE/abuso e risco residual |
| `authorization-matrix.md` | Papéis e permissões por ação/recurso (DS-003), inclusive refund |
| `session-and-mfa.md` | Decisões DS-001/002 e testes de revogação/step-up |
| `payments-webhooks.md` | PSP selecionado, assinatura, eventos, retries, cronograma e compensação |
| `data-protection.md` | Inventário PII e dados financeiros, retenção e direitos LGPD |
| `security-test-plan.md` | SEC ↔ SA/CA ↔ testes concretos e saídas reprodutíveis |
| `incident-response.md` | Ambiente e fornecedores conhecidos, runbooks e backup/restore |

**Não confundir:** um arquivo previsto não representa política implantada, ameaça mitigada nem aprovação da auditoria.
