# Integração da Fase 02 com segurança — versão 0.3

> **Identificador:** AC-MODEL-SEC-001 | **Estado:** modelos conceituais revisados, não implementação validada.

## Mapa de processos e controles

| Desenho | Risco/fronteira | SEC | CA/SA |
|---|---|---|---|
| UC-01/02 | Titularidade, escopo de operador, autenticação e privilégio | SEC-001–009/014 | SA-001–004 |
| PR-01, SQ-01, SM-03, PC-01 | Browser não fixa preço; reserva atômica; idempotência e prazo 40/30/5 | SEC-010, SEC-015–019, SEC-021/024 | CA-001/002/004, CA-011–014; SA-005/006 |
| SQ-02/03, SM-01/02, PC-02 | Assinatura do evento, captura real, identidade, replay, expiração e compensação | SEC-016, SEC-020–024, SEC-030 | CA-003/005/015–017; SA-007 |
| PR-03, SQ-04, SM-07, PC-03 | Escopo de refund, saldo reservado, timeout, trilha de auditoria | SEC-002–005, SEC-022/024/030 | CA-008/018–021; SA-002/008 |
| PR-02, **SQ-05 v0.3**, SM-04/05, PC-04 | Direito digital depende de quitação **e** alocação integral dos físicos; kit indivisível | SEC-017/018/021/025–028 | CA-006/022–026; SA-009 |
| BPMN-01/02 **revistos** | Compra com compensação tardia; pós-venda preserva revisão legal e refund ambíguo | SEC-020–030 | CA-011–026; SA aplicáveis |

## Semântica obrigatória

1. **O módulo Pagamentos é autoridade sobre evidência financeira.** SQ-05 corrigida: `Provedor → Pagamentos`, validação de assinatura/valor/moeda/evento, registro deduplicado, guardas de reserva/pedido. Checkout e browser não concedem direitos pelo redirect.
2. **Estados separados:** pagamento aprovado não equivale a reserva confirmada, expedição entregue, direito concedido nem reembolso concluído.
3. **Reserva expirada é terminal:** aprovação financeira tardia vai a `PAYMENT_REVIEW`, bloqueia kit e inicia compensação integral idempotente.
4. **Refund incerto não é falha confirmada:** manter saldo reservado e reconciliar com PSP sem criar outra devolução.
5. **Direitos digitais nunca são revogados só por solicitação de devolução.** Atendimento recebe pedidos inclusive digitais, avaliando direitos, licenças e a lei.
6. **Três parâmetros são propostas não homologadas:** TTL físico 40 min; sessão externa até 30 min; fim externo >=5 min antes do físico. Seleção de PSP condicionada a prova.

## Pendências da Fase 03

- DFDs e fronteiras de confiança para contas, pagamentos, arquivos digitais e operações administrativas.
- Matriz efetiva de autorização/reautenticação e segregação financeira; ADRs de sessão/MFA.
- Verificar compatibilidade do PSP em sandbox; licença por obra/edição antes de venda real.
- Abrir BPMN-01/02 em modelador e refinar o desenho conforme contrato arquitetural real.
- Completar `SEC/SA/CA -> testes e evidências` apenas após implementar/medir.

Referências: [BRD](../02-business-requirements/REGRAS-DE-NEGOCIO.md), [adendo](../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md), [SEC-001–038](../07-security/security-requirements.md), [transições](TABELAS-DE-TRANSICAO.md), [políticas](POLITICAS-CONSOLIDADAS.md), [matriz](MATRIZ-DE-RASTREABILIDADE.md) e [decisões externas](CRITERIOS-DECISOES-EXTERNAS.md).
