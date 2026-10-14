# INT-01 — Resend HTTPS local, dispatch manual e gates

Implementação restrita a teste local e PostgreSQL descartável. Não homologa autenticação pública, domínio remetente, entrega inbox, páginas ou deploy. Não se fez envio real; o comando de prova exige autorização humana separada. Matriz de origem: [INT-03](INT-03-matriz-de-provas.md). Resultados: [Identity RESULTS](../../../apps/api/test/identity/RESULTS.md).

## Transporte e composição

HTTP nativo do Node 24, sem SDK novo, dependências ou alteração de Prisma/Next. Endpoint fixo `https://api.resend.com/emails`, POST JSON, Authorization Bearer e Idempotency-Key. Sem URL de API em env/request, redirects ou proxy fornecido pelo browser. Timeout 3s, abort no shutdown, corpo de resposta limitado a 4KiB; nenhum retry dentro da chamada. Só códigos classificados escapam do adapter, nunca response body, chave, destinatário ou link/token.

Default `disabled` e legado `local-disposable` preservados. Profile `local-resend` exige as mesmas guardas de DB descartável, segredo Identity e loopback; produção/demo recusados. Não basta haver RESEND_API_KEY. Adapter exige opt-in e destinatário exato. A composição normal cria apenas o dispatcher manual; `service()` HTTP segue 503, readiness false e liveness independente. Mailbox injetável e serviço HTTP enfileirado só no processo Vitest. Nenhum timer, cron, dispatch HTTP ou replay de browser foi criado.

Os requests do harness enfileirado fazem commit da intenção e retornam 202 neutro, sem chamar API externa. O caminho inline antigo fica limitado ao transporte de testes; resultado do provedor não vira DELIVERED. E-mail não autoriza STAFF/MFA; tokens/conta/sessões mantêm finalidade, TTL, consumo único e revogação originais.

## Configuração privada, sem ler .env real

Configurar no ambiente privado somente após consentimento para prova real, sem enviar chaves no chat ou Git. O código não usa dotenv. [.env.example](../../../apps/api/.env.example) contém apenas placeholders.

| Variável | Regra local |
|---|---|
| IDENTITY_PROFILE | local-resend somente para preparar dispatcher; não habilita HTTP público |
| IDENTITY_DISPOSABLE | 1, fixture Identity 127.0.0.1:55436 / atlas_identity_id01, marcador de ownership |
| IDENTITY_SECRET | segredo privado de 32 bytes hex; o mesmo que cifrou a outbox |
| IDENTITY_MAIL_PROVIDER | resend |
| IDENTITY_MAIL_LOCAL_OPT_IN | 1 explícito |
| IDENTITY_MAIL_DISPATCH_ENABLED | 1 explícito; default 0; nenhum envio automático |
| RESEND_API_KEY | backend privado, formato validado; nunca impresso; escopo mínimo de envio suportado |
| IDENTITY_MAIL_FROM | exatamente Atlas Commerce &lt;onboarding@resend.dev&gt; nesta etapa sem domínio próprio |
| IDENTITY_MAIL_TEST_TO | uma caixa autorizada da conta Resend, informada explicitamente pelo responsável; sem listas |
| IDENTITY_PUBLIC_SITE_ORIGIN | origem HTTP loopback exata com porta, sem path/query/fragment/credenciais |

Destinatário diferente é falha permanente antes da rede, não envio bem-sucedido. A env declara a caixa permitida; não prova sua propriedade, validada pelo provedor em prova posterior. Não se aceitam remetentes vercel.app/onrender.com nem domínio próprio não verificado. Endereços especiais de teste do provedor não têm exceção automática: só a caixa configurada é permitida.

## Links e lacuna de UI

Paths candidatos fixos `/auth/verify-email` e `/auth/recovery` na origem configurada, token em fragmento `#token=`; nunca derivados de Host/Forwarded/inputs. Templates PT-BR simples, HTML escapado, sem tracking/marketing/identidade final. Destinatário não é interpolado em HTML. Remetente/origem/versão do template são congelados no payload AES-GCM antes da primeira chamada; mudança de contexto no retry é INTEGRITY, sem key nova.

**Essas páginas não existem nesta entrega.** Não são rotas Next implementadas nem links funcionais homologados. Antes de UI real: aprovação separada, Referrer-Policy no-referrer, retirada do token após consumo, no-store, TLS/origins/proxy/cookies, política legal e credenciais comprometidas. Não liberar registro público só porque o adapter enviou mensagem.

## Outbox sem migration: mapeamento explícito

As sete tabelas/constraints existentes bastam para o escopo manual local. Não se altera o CHECK de status. Eventos técnicos usam request_id igual ao UUID da intenção para correlação do job, subject_id nulo e código estático; aceitação registra também ID opaco do provedor, sem PII/token. A atualização do estado e evento é uma única transação.

| Estado lógico Resend | Representação existente |
|---|---|
| PENDING | status PENDING, lease null (fila) ou futuro (backoff) |
| PROCESSING | status PROCESSING e lease futuro; attempts é fencing monotônico |
| PROVIDER_ACCEPTED | status PROCESSING e lease null, acompanhado de evento RESEND_PROVIDER_ACCEPTED/ID |
| FAILED permanente | status FAILED com evento RESEND_PERMANENT/código |
| UNCERTAIN | status FAILED com evento RESEND_UNCERTAIN/código; exige intervenção |
| DELIVERED | reservado ao mailbox legado; nunca escrito pelo caminho Resend |

Não interpretar PROCESSING/null sem evento de aceitação como sucesso. A aceitação não comprova entrega inbox. Queries operacionais devem usar o mapeamento completo, não só o rótulo bruto.

Claim usa SKIP LOCKED, lease 30s e limite de lote 3. Fencing por attempts/lease protege freeze, preflight e ack; nenhuma rede dentro de SQL. Payload só é aberto no worker controlado. A marca RESEND_CLAIM impede o dispatcher legado de recuperar tentativas Resend. Lease Resend expirado é quarentenado, sem replay cego. A retenção atual cobre o TTL dos tokens; não é retenção de produção ratificada.

Idempotency-Key é identity-v1/UUID da intenção, estável para conteúdo congelado; não se muda a key para contornar 409. Retry apenas para 429 (Retry-After numérico/data respeitado) e 409 concorrente, no máximo três tentativas totais por intenção, fora da requisição humana. Token expirado/consumido/invalidado, conta inelegível, intenção criada há 24h ou retry além do TTL/janela são bloqueados. Usar criação da intenção como início da janela é deliberadamente conservador.

400/401/403/4xx são permanentes; 409 de payload diferente é integridade. 5xx, timeout, erro de rede, resposta ambígua ou crash depois do claim são UNCERTAIN, sem retry automático. 401/403 interrompem o lote; 429/409 concorrente também encerram a rodada. Não há promessa exactly-once. Persistir ID de aceitação permite reconciliação humana futura; não foi implementado GET remoto/webhook de entrega. Para incerteza sem ID, revisão pelo responsável/provedor é gate antes de qualquer reprocessamento; este runner não oferece replay de FAILED.

Uma rodada após restart pode reclamar PENDING válido e quarentenar leases vencidos. Ela não é scheduler confiável, não reativa contas e não renova TTL. Shutdown aborta chamada ativa, aguarda classificação/persistência quando DB disponível e fecha pool. Falha de persistência após aceitação deixa lease para quarentena posterior; erro exposto é estático.

## Comando opt-in — NÃO executado nesta tarefa

Prerequisitos: fixture própria, migration existente aplicada, build API, ambiente privado validado, intenção PENDING legítima já existente nessa fixture e **aprovação humana separada do envio real**. O runner não cria conta/intenção, não lê .env, não manufatura token para passar a prova. A composição HTTP permanece indisponível; preparar intenção fora do harness exige trilha local autorizada. Sem intenção elegível, retorna NO_ELIGIBLE_INTENT e exit não zero, sem alegar envio.

Após aprovação explícita, selecionar exatamente o UUID da intenção (não token/e-mail) e executar uma única rodada:

```text
pnpm --filter @atlas/api identity:mail:dispatch --consent-resend-local-proof --intent=<UUID_DA_INTENCAO>
```

O guard de argumentos/consentimento precede a leitura da credencial. Antes de rede, valida ownership DB, contexto, token e destinatário permitido. Saída somente classificação/NO_ELIGIBLE_INTENT, sem destinatário, token, payload, ID de provedor ou chave. Sem daemon e sem reprocessar estado incerto. Os flags não substituem a autorização humana exigida para o agente: **não executar autonomamente**.

## Fontes primárias consultadas em 14/10/2026

[Node.js SDK](https://resend.com/docs/send-with-nodejs), [REST Send Email](https://resend.com/docs/api-reference/emails/send-email), [idempotency](https://resend.com/changelog/idempotency-keys), [erros](https://resend.com/docs/api-reference/errors), [endereços de teste](https://resend.com/docs/dashboard/emails/send-test-emails). A API aceita JSON e key de idempotência até 256 caracteres com retenção de 24h. A integração usa HTTP nativo porque só precisa desse endpoint; não instalou SDK ou versão nova de Prisma/Next. Limites/entrega reais continuam não verificados sem consentimento e prova remota.
