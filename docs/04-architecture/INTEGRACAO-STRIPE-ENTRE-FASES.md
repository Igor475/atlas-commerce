# Sincronização inter-fases — seleção Stripe

**Decisão nova:** fornecedor Stripe escolhido em 12/10/2026. Não significa que a API Stripe foi testada, que DA-009 foi resolvida ou que DS-004 está homologada.

## O que este pacote atualiza integralmente

- `docs/03-business-processes/DECISOES-PENDENTES.md` (DA-006 e status Stripe).
- `docs/03-business-processes/CRITERIOS-DECISOES-EXTERNAS.md` (prova da janela e dos métodos).
- Documentação da Fase 03: ADR-004, ADR-008, índice de ADRs, princípios, transações, operação, gates e fronteiras de confiança.
- Novos documentos de teste e status de decisão.

## Referências históricas que ainda requerem harmonização

Por serem documentos extensos fora desta atualização, manter texto integral e fazer revisão editorial pontual após publicar este pacote:

1. `docs/02-business-requirements/REGRAS-DE-NEGOCIO.md`: em DA-006, alterar apenas **“Escolher integração oficial com sandbox e webhooks”** por **“Stripe escolhido; Checkout hospedado em modo teste proposto; validação de janela, métodos, webhooks e refunds ainda pendente (DS-004/ADR-004)”**. Nenhuma alteração nos IDs RN/CA/RNF.
2. `docs/02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md`: preservar regras RN-071–094; na seção “DA-006 (aberta)” distinguir fornecedor escolhido de compatibilidade Stripe ainda não comprovada.
3. `docs/07-security/security-requirements.md`: DS-004 deve distinguir **Stripe fornecedor definido** de requisitos de integração ainda não validados; manter integralmente SEC-001–038, SA-001–012 e DS-001–009.
4. `docs/README.md`: adicionar links para ADR-004 e plano Stripe, mantendo “proposto/não implementado”; DA-006 não é mais “PSP a escolher”, mas DS-004 continua aberto para evidências.
5. Diagrama C4/DFD-02: diagramas genéricos PSP são ainda válidos como fronteira externa. Uma revisão futura opcional pode rotular fornecedor Stripe; se modificar `.dot`, regenerar o SVG/PNG conjuntamente, nunca somente o PNG.

**Não publicar o status “Stripe homologado” sem evidência de Stripe test mode.** Este documento não substitui as regras antigas nem autoriza mudança silenciosa do TTL 40/30/5.
