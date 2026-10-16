# CP-04 — Concorrência e ports autorizados

## Operações implementadas

CustomerAddresses obtém principal no port confiável; seu adapter ProfileDatabase
oferece change, readForQuote, transaction e snapshotForOrder. Não exporta repository
de credenciais ou SQL genérico ao consumidor. O contexto transacional é opaco,
registrado em WeakMap privado, vinculado ao ator e removido no finally; contexto
forjado, de outro ator/adapter ou reutilizado depois do callback é recusado.

ReadForQuote retorna projeção mínima de **uma versão vigente/elegível**. A futura
quote deve congelar essa versão; conhecer endereço não garante venda ou entrega.
SnapshotForOrder exige expectedVersion, recusa versão inexistente/obsoleta/retirada
e retorna campos da revisão exata. Transaction mantém o mesmo Prisma transaction
client/conexão durante o callback; não permite devolver contexto ativo ao browser.

## Locks e consistência

Ordem local: principal/conta sob SHARE → intenção de escrita por conta/chave sob
UPDATE → endereço sob UPDATE (mudança) ou SHARE (leitura/snapshot). Revisões são
imutáveis e não exigem update lock. Dois updates com mesma versão esperada
serializam: um produz a próxima revisão, o outro recusa; nova intenção com a
versão atual pode avançar sem sobrescrever silenciosamente o primeiro resultado.

Se writer ganhou o lock e mudou revisão/elegibilidade antes de o consumidor
obter snapshot, o port espera e recusa a versão antiga. Se snapshot ganhou o
lock primeiro, edição/retirada de elegibilidade e desativação da conta esperam
até terminar sua transação: o snapshot permanece válido no ponto serializado.
Não exigir que um writer bloqueado "vença" antes do commit já protegido por SHARE.
Conexões independentes e pg_stat_activity comprovam espera real, sem sleep como
única evidência de concorrência. Lock timeout resulta em PROFILE_UNAVAILABLE,
sem snapshot fictício e sem retry automático com nova chave.

## Limite da integração Orders/Quotes

CP-01 usa PostgreSQL próprio; não conectou a fixture Identity nem substituiu
endereços TEST_ONLY de QTE-01. Os testes Orders-like exercitam o port e a espera
transacional real, **não uma integração comercial Orders implementada**. CP-019
confere cópia aceita e revisão histórica; não é tabela comercial de Order criada.

O contexto atual nasce em ProfileDatabase.transaction, limitado ao banco e às
roles CP-01. Na futura composição integrada, o coordenador precisará alistar
o port no **mesmo transaction client/conexão autorizado de Orders/Inventory**,
com guards, ACLs e schema aprovados; não passar um objeto browser ou abrir uma
segunda transação para ler endereço e depois confirmar o pedido. Essa ligação
requer implementação/testes próprios e não é inferida do callback local.

Conservar QTE/ORD locks, revalidar endereço/conta/política/preço após espera,
persistir snapshot e pedido/reserva/evidência num único commit e Stripe só após
commit. Falha depois de obter snapshot deve desfazer todos os efeitos da futura
compra. A suíte CP comprova rollback/liberação de locks locais; as regressões
ORD/QTE continuam responsáveis pela atomicidade existente, sem alteração de ports.
