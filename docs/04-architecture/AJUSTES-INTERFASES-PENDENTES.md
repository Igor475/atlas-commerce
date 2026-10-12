# Integração editorial remanescente — BRD, Stripe e autenticação

> **Natureza:** lista de edições localizadas para documentos das fases 01/02/segurança. **Não é arquivo de substituição de BRD nem especificação SEC.** O pacote v0.3 não inclui versões reconstruídas dos arquivos de 40k+; preservar cada original no GitHub.

## Primeiro, verificar o estado publicado

Confirme se a branch principal já reflete a decisão Stripe. Não repetir alterações já aplicadas. Em todos os casos manter a distinção: **Stripe escolhido; integração ainda não homologada**, política 40/30/5 condicionada à prova ST-001–016. Nenhuma alteração em RN-001–094, SEC-001–038, SA-001–012 ou CA.

## Referências Stripe da atualização anterior ainda a conferir

1. `docs/02-business-requirements/REGRAS-DE-NEGOCIO.md` — na linha DA-006 da tabela de decisões, trocar somente “Escolher integração oficial com sandbox e webhooks” por “Stripe escolhido; Checkout hospedado em modo teste proposto; validação da janela, métodos, webhooks e refunds ainda pendente (DS-004/ADR-004)”.
2. `docs/02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md` — na seção “DA-006 (aberta)”, descrever **fornecedor escolhido**, mas **compatibilidade não homologada**, preservando RN-071–094.
3. `docs/07-security/security-requirements.md` — em DS-004, distinguir escolha Stripe de requisitos técnicos pendentes, sem modificar SEC/SA.
4. `docs/README.md` — substituir no índice/pendências a expressão “escolher PSP” por “Stripe escolhido; integrações sob validação”; vincular [`ADR-004`](adrs/ADR-004-psp-sandbox.md) e [`plano ST-001–016`](07-validacao-stripe.md).

## Nova decisão documental proposta para autenticação

5. No índice `docs/README.md`, após ADR-004 inserir referência a [`ADR-003`](adrs/ADR-003-autenticacao-sessoes.md), [`AUTH-001–020`](09-cenarios-aceite-autenticacao.md) e [`DFD-04`](security/DFD-04-sessoes-mfa.md). Indicar **proposta**, não aceita.
6. Em `docs/07-security/security-requirements.md`, as decisões DS-001/002 permanecem abertas **para revisão/aceite da arquitetura recomendada**, sem diminuir os requisitos SEC-001–011. DS-003 permanece aberta para alçadas e papéis.

**Critério de sincronização:** nenhum documento pode afirmar que Stripe já foi homologado, que MFA foi implementado ou que a ADR-003 está aceita sem decisão formal. As alterações acima são **edição manual** ou futura tarefa documental autorizada separadamente, não scripts neste ZIP.
