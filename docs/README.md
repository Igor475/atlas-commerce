# Atlas Commerce — Índice da documentação e regras de sincronização

> **Versão deste índice:** 0.1.0 • **Estado:** documentação proposta • **Data:** 12/10/2026

## Mapa e versões

| Ordem | Documento | Identificador/escopo | Estado |
|---|---|---|---|
| 1 | [BRD](02-business-requirements/REGRAS-DE-NEGOCIO.md) | AC-BRD-001 v0.2.1; RN-001–070, RF, RNF, CA-001–010 | Proposto |
| 2 | [Adendo](02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md) | AC-BRD-001-A v0.2; RN-071–094 | Proposto, dependente de DA-006 |
| 3 | [Políticas PC-01–04](03-business-processes/POLITICAS-CONSOLIDADAS.md) e [transições](03-business-processes/TABELAS-DE-TRANSICAO.md) | Reserva, atraso, refund, kits | Proposto |
| 4 | [Diagramas](03-business-processes/README.md) e [critérios](03-business-processes/CENARIOS-DE-ACEITE-v0.2.md) | Modelagem Fase 02; CA-011–026 | Criados, em revisão |
| 5 | [Segurança](07-security/security-requirements.md) | AC-SEC-001 v0.2; SEC-001–038, SA-001–012, DS-001–009 | Proposto |
| 6 | [Integração processo × segurança](03-business-processes/INTEGRACAO-SEGURANCA.md) e [matriz](03-business-processes/MATRIZ-DE-RASTREABILIDADE.md) | Referências cruzadas e evidências | Planejado para validação |

## Regra de precedência e conflitos

1. **Leis e obrigações aplicáveis** não podem ser afastadas por conveniência de design; pontos legais ficam marcados como dependentes de revisão profissional para operação real.
2. **BRD** define escopo e invariantes gerais. **Adendo** refina especificamente RN-007, RN-027–031, RN-035–038, RN-041–054, RN-058–063 e adiciona RN-071–094, sujeito a aprovação. Não renumerar regras antigas.
3. **PC-01–04 e tabelas de transição** descrevem guardas e compensações operacionais. Modelos gráficos são vistas de alto nível, não autorização para ignorar guardas.
4. **AC-SEC-001** estabelece requisitos de segurança transversais, inclusive autorização e testes negativos; uma política de negócio não suspende esses controles. Se dois requisitos parecem incompatíveis, abrir uma decisão DA/DS/ADR e parar apenas a implementação afetada, em vez de escolher silenciosamente um dos textos.
5. **Cenários CA/SA** são critérios de prova; diagramas, anotações e bibliotecas não comprovam implementação. Todos os resultados são pendentes até teste executado.

## Questões ainda condicionadas

- **DA-006 / DS-004:** compatibilidade do provedor escolhido com reserva 40 min, sessão externa ≤30 min e término ao menos 5 min antes da reserva; assinatura/webhook, idempotência, PSP refund, métodos com liquidação assíncrona.
- **DA-009 / DS-003:** alçadas e segregação de reembolsos, revisão jurídica/fiscal e evidências.
- **DS-001/002:** sessão, recuperação de conta e MFA privilegiado.
- **DS-005–009:** distribuição digital, uploads, privacidade, segurança de infraestrutura e perfil de testes ASVS.
- **SQ-05:** a correção conceitual foi realizada: Pagamentos recebe o webhook, valida assinatura, identidade, valor, moeda e duplicidade, persiste a evidência financeira e confirma a reserva física de modo transacional. Fulfillment e direitos digitais dependem da confirmação financeira e da alocação física completa; pagamento tardio entra em `PAYMENT_REVIEW` e segue para reembolso integral idempotente no MVP. O refinamento arquitetural e a validação na implementação permanecem para a Fase 03.
- **BPMN-01/02:** os modelos foram revisados. O BPMN-01 contempla confirmação financeira, expiração da reserva, revisão e compensação; o BPMN-02 contempla solicitação de devolução, análise de direitos, autorização financeira, reembolso e reconciliação. Fontes BPMN editáveis e prévias visuais estão disponíveis; a abertura e validação em modelador BPMN compatível continuam pendentes.

## Checklist para alterações futuras

- [ ] Atualizar regra RN/SEC/DA/DS sem reaproveitar identificadores para outros conceitos.
- [ ] Atualizar links BRD/adendo/política/tabela/diagrama afetados.
- [ ] Atualizar cenários CA/SA, matriz de rastreabilidade e evidência de teste.
- [ ] Atualizar `.dot`/`.mmd`/`.bpmn` e exportações SVG/PNG juntas, se a semântica mudou.
- [ ] Registrar ADR e riscos residuais para decisões de arquitetura.
- [ ] Só marcar implementado/testado depois de evidência e ambiente identificados.

**Padrão de versão:** versões são por documento; v0.2 do adendo não significa que todos os arquivos estejam na versão 0.2, nem aprovação.
