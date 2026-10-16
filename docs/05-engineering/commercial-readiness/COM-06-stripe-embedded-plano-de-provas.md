# COM-06 — Payments/Stripe Embedded: plano de provas

**PROPOSTO · pesquisa documental em 16/10/2026 · Test Mode NÃO EXECUTADO.** Nenhuma conexão Stripe, Session, webhook, credencial ou configuração de provedor foi utilizada. A escolha Stripe e a direção incorporada permanecem; API/SDK/40/30/5 não ficam homologados pela leitura da documentação.

Fontes locais: [ADR-004](../../04-architecture/adrs/ADR-004-psp-sandbox.md), [adendo embedded](../../04-architecture/adrs/ADR-004-ADENDO-UI-EMBEDDED.md), [CT-10](../contracts/CT-10-migracao-embedded-checkout-proposta.md), [UXD-16 ratificada](../contracts/UXD-16-RATIFICACAO-RESPONSAVEL.md), [ST-001–016](../../04-architecture/07-validacao-stripe.md), [PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md), SEC-016–025/030–038. Nenhum ID normativo foi alterado.

## Cinco avaliações distintas

| Avaliação                                 | Evidência/estado                                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Escolha arquitetural                      | RATIFICADO: Stripe Test Mode, apresentação embedded, Atlas sem PAN/CVV. Sem Live, Pix/boleto ou meio assíncrono aprovado por esta análise       |
| Comportamento documentado pelo fornecedor | VERIFICADO DOCUMENTALMENTE nas URLs abaixo, consultadas em 16/10/2026                                                                           |
| Compatibilidade técnica no Atlas          | NÃO VERIFICADA em execução; SDK não instalado. Tag/API/enum conferidos no código oficial não demonstram integração NestJS, Stripe.js ou browser |
| Prova Test Mode                           | PENDENTE: Session, timestamps, cartão/3DS, webhooks/reconciliação e 40/30/5                                                                     |
| Autorização de operação no provedor       | NÃO CONCEDIDA nesta tarefa. Futuro spike exige autorização específica, segredos por canal privado e escopo explícito                            |

## Dupla SDK/API candidata e mudanças atuais

**Candidato ao spike, não aprovado nem instalado:** `stripe-node 23.0.0` com API `2026-09-30.endive`. Fontes oficiais fixadas: [release v23.0.0](https://github.com/stripe/stripe-node/releases/tag/v23.0.0), [package.json](https://raw.githubusercontent.com/stripe/stripe-node/v23.0.0/package.json), [apiVersion.ts](https://raw.githubusercontent.com/stripe/stripe-node/v23.0.0/src/apiVersion.ts), [tipos Checkout Sessions](https://raw.githubusercontent.com/stripe/stripe-node/v23.0.0/src/resources/Checkout/Sessions.ts). O pacote declara Node >=20, compatível com a faixa Node 24 do repositório em requisito de engine; isso não é teste de runtime.

O tag anterior [v22.6.2](https://raw.githubusercontent.com/stripe/stripe-node/v22.6.2/src/apiVersion.ts) declara `2026-08-26.dahlia`. Não misturar exemplos dessas APIs. A dupla v23/Endive é sugestão reproduzível, não afirmação de que será a versão mais recente no dia da implementação.

Para Endive, a apresentação pretendida usa **`ui_mode=embedded_page`**: o [changelog de ui_mode](https://docs.stripe.com/changelog/dahlia/2026-03-25/updates-available-checkout-session-ui-modes) documenta a mudança de `embedded` para `embedded_page`; o enum está nos tipos fixados acima. `payment.presentation=EMBEDDED` é enum Atlas, independente do nome Stripe. Não copiar `ui_mode=embedded` de um exemplo histórico para a API candidata.

O [changelog Endive](https://docs.stripe.com/changelog/endive/2026-09-30/remove-payment-method-types-checkout-sessions) remove o parâmetro de criação `payment_method_types`; usá-lo nessa versão produz 400. O candidato deve investigar `allowed_payment_method_types` como filtro e comprovar que o conjunto efetivo retornado é **somente card e não vazio**. Não confiar em Dashboard defaults, nem habilitar meio assíncrono para contornar falha. Se a versão escolhida mudar, repetir a conferência SDK/API/parâmetros.

Stripe.js e wrapper browser ainda não têm versão/compatibilidade fixadas neste pacote. Loader oficial, CSP, origem, política de redirects e interação com cookies/CSRF exigem prova posterior; não criar UI nem escolher dependência por inferência.

## Session e fronteiras de segurança

A documentação de [criação](https://docs.stripe.com/api/checkout/sessions/create) e de [objeto Session](https://docs.stripe.com/api/checkout/sessions/object) descreve o client secret próprio de Checkout Session para inicialização embedded. Ele não é secret de PaymentIntent, chave API ou prova de pagamento. Encaminhar somente ao titular autenticado, por TLS, no-store, sem URL/log/analytics/cache/SSR; não expor secret de tentativa expirada ou de outro cliente.

Plano candidato: `mode=payment`, BRL e valores derivados do snapshot servidor; ambiente/conta Test Mode conferidos; referência opaca estável de PaymentAttempt para correlação. Identidade do cliente, itens/quantidades e total não vêm de metadata arbitrária do navegador. Validar valor/moeda/Session/attempt/conta/ambiente em resposta e evidência financeira. Modelo exato de line_items/tax/shipping exige prova de igualdade com o total persistido, sem duplicar frete ou habilitar descontos/taxas não aprovados.

`return_url` e comportamento de conclusão dependem dos métodos/redirects; parâmetros hosted como success_url/cancel_url não devem ser transplantados para embedded. Provar retorno, fechamento, autenticação 3DS e recuperação de sessão conforme a API escolhida. Retorno browser serve para UX/consulta autenticada, nunca para marcar PAID. Componente oficial coleta dados de cartão; Atlas não coleta PAN/CVV. Cancelar/fechar a tela não prova encerramento financeiro; [expire Session](https://docs.stripe.com/api/checkout/sessions/expire) só se aplica ao estado open, e resposta ambígua exige consulta autenticada.

## Commit, PaymentAttempt e idempotência

[COM-05](COM-05-checkout-e-idempotencia.md) propõe persistir intenção/pedido/reserva/attempt/despacho antes de chamar PSP. A chamada ocorre fora da transação. Persistir parâmetros canônicos e uma chave externa estável por operação/attempt, segregada da chave pública por ator/operação; nunca derivar de PII ou trocar chave em timeout. Uma nova tentativa financeira da mesma intenção depende de encerramento seguro e regra aprovada, sem permitir duas sessões concorrentes pagáveis.

A [idempotência Stripe](https://docs.stripe.com/api/idempotent_requests) documenta limite de 255 caracteres para chave e possibilidade de remoção após pelo menos 24h; reutilização após remoção pode criar nova operação. Resultado inicial inclusive 500 pode ser memorizado; falhas de validação/conflito concorrente têm tratamento distinto. Logo, retenção/unicidade Atlas deve sobreviver à janela PSP. Definir timeout, retry/backoff e auto-retries do SDK explicitamente no spike; toda repetição mantém parâmetros/chave e budget temporal. Se não for possível determinar o resultado, preservar RECONCILIATION_REQUIRED e bloquear recriação automática.

## Prova temporal 40/30/5 — continua condicionada

Proposta existente: reserva física R expira 40 minutos depois de criada no DB; Session financeira S dura 30 minutos; S deve encerrar pelo menos cinco minutos antes de R. A [API de criação](https://docs.stripe.com/api/checkout/sessions/create) documenta expires_at entre 30 minutos e 24h da criação, padrão 24h; o padrão não satisfaz o Atlas.

Condições necessárias a provar com timestamps reais: `S.expires_at - S.created = 30min` conforme precisão suportada; `S.expires_at <= R.expires_at - 5min`. Se os relógios/precisão forem coerentes, a álgebra limita criação da Session a até cinco minutos após início da reserva. Essa desigualdade é necessária, não comprovação de compatibilidade.

**Risco real:** expires_at calculado no cliente antes da chamada pode ficar abaixo do mínimo de 30min contado da criação no PSP, por latência e arredondamento em segundos. Não adicionar tolerância silenciosa, não reduzir o mínimo, não trocar por `R.expires_at-5min` gerando Session de 35min quando criada imediatamente, nem alongar reserva para forçar sucesso. O spike deve medir a precisão aceita, relógios, latência e timestamp efetivo; incompatibilidade exige decisão arquitetural expressa.

Plano: pré-checar budget com relógio DB e margem operacional ainda a aprovar; criar somente após commit; conferir timestamps retornados contra a reserva atual em transação curta; não entregar secret quando falhar a janela. Se houver Session open incompatível, solicitar expiração idempotente e reconciliar confirmação; ausência de resposta não prova expiração. Atraso que não caiba na janela impede apresentar pagamento e exige recuperação/encerramento seguro, sem reativar reserva nem criar nova Session às cegas.

Digital puro mantém `reservationExpiresAt: null` conforme UXD-16; não inventar reserva física. Sua política de Session continua Test Mode e precisa de definição/prova, sem aplicar automaticamente prazo físico de fulfillment.

## Webhook, reconciliação e compensação

Segundo a [documentação oficial de webhooks](https://docs.stripe.com/webhooks), validar assinatura sobre **raw body**, não JSON reserializado; segredo correto por endpoint/ambiente, tolerância temporal e rotação comprovados. Eventos podem repetir e chegar fora de ordem. Registrar API version do destino/evento separada da versão de requests; ordem por event.created não substitui consulta financeira/transição de domínio.

Plano de inbox durável: autenticar, limitar tamanho, conferir origem lógica/conta/ambiente e deduplicar event.id; também proteger efeito de negócio por objeto/captura/ação para eventos diferentes sobre o mesmo fato. 2xx só após aceitação durável segura, inclusive duplicata autenticada. Não armazenar payload sensível integral sem finalidade/retention aprovada. Worker revalida vínculo e valor/moeda; aplica transição elegível sob locks e concilia lacunas com consulta autenticada. Reentrega/restart nunca duplica estoque, acesso ou refund.

PC-01/02: confirmação financeira válida sem reserva alocável entra em PAYMENT_REVIEW, sem fulfillment nem entitlement de kit misto. Compensação integral é idempotente e deve reservar saldo reembolsável atomicamente: capturado menos refunds concluídos e pendentes reservados, conforme PC-03. Timeout de refund não libera saldo para outro refund; reconciliar a mesma operação. Compensação automática RN-078 não concede permissão humana financeira; refund manual exige DS-003/MFA/step-up/segregação aprovados. Digital puro só recebe entitlement elegível após prova financeira autenticada; URL/Session complete isoladamente não bastam.

## Matriz de provas futuras — todas PLANEJADAS

| ID         | Prova/aceite futuro                                                                                                                                        | Relação                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| COM-ST-001 | Tag/API/headers efetivos, embedded_page, SDK browser, clientSecret correto e card-only; parâmetros removidos recusados e nenhum meio assíncrono habilitado | ADR-004, ST-001–016         |
| COM-ST-002 | Session após commit; queda entre commit/chamada/ACK recupera um attempt e uma Session, sem locks durante rede                                              | ADR-002, SEC-019/024        |
| COM-ST-003 | Atrasos de 0/4/5/6min, segundos/clock skew/latência e limite exato do mínimo: comprovar/rejeitar 40/30/5 por timestamps reais                              | PC-01, CA-011–014           |
| COM-ST-004 | Mesma chave/param, outro param, 500, timeout, concorrência, retry SDK e chave PSP podada: nenhuma cobrança nova não autorizada                             | CT-03, SEC-016/019          |
| COM-ST-005 | Cartão teste, 3DS, retorno ausente/forjado, fechamento, expiração e cancelamento: browser nunca confirma PAID                                              | SEC-020/023                 |
| COM-ST-006 | Raw body alterado, assinatura inválida/antiga, segredo errado e ambiente/conta/valor/moeda divergentes recusados                                           | SA-007, SEC-020             |
| COM-ST-007 | Duplicata event.id, eventos diferentes mesmo fato, inversão/atraso/ausência e evento antes da resposta; efeitos únicos duráveis                            | CT-05, SEC-024/034          |
| COM-ST-008 | Pagamento tardio versus expiração concorrente/kit misto: PAYMENT_REVIEW e compensação, sem entitlement ou reserva ressuscitada                             | PC-01/02/04, CA-015–017/024 |
| COM-ST-009 | Refund duplicado/ambíguo/concorrente preserva saldo, pendência e mesma chave; manual sem autorização negado                                                | PC-03, SA-008               |
| COM-ST-010 | Restart/pausa, lease vencida, fila atrasada, consulta indisponível: reconciliação durável com limites e alerta                                             | RN-070/094, SEC-034/035     |
| COM-ST-011 | Secret e dados de pagamento ausentes de logs/URLs/cache/SSR/analytics; titular estrangeiro recusado                                                        | SEC-002/030/032             |
| COM-ST-012 | Digital puro com reserva null e kit misto com reserva real; entitlement somente nas condições normativas                                                   | UXD-16, SEC-025             |

ST-001–016 e API-001–030 permanecem intactos; novos IDs apenas detalham o plano. Nenhum caso desta tabela foi executado. Saída do spike exige relatório reproduzível com versões, ambiente Test Mode, timestamps e resultados sanitizados, incluindo falhas, sem credenciais. [COM-D06/07/08](COM-07-decisoes-e-roadmap.md) aguardam decisão e autorização separadas.
