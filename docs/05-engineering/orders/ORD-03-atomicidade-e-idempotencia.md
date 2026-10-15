# ORD-03 — Atomicidade e idempotência

## Operação única

Uma chamada parametrizada executa `orders.prepare` em transação implícita ou
explícita do chamador. Não há I/O externo, Promise.all entre módulos ou commits
intermediários. Falha em qualquer etapa desfaz intenção, reserva, ledger,
snapshots e evento.

Ordem: ator e intenção → cotação → produtos/componentes ordenados por UUID →
edições → obras → slots Pricing ordenados → saldos Inventory ordenados →
snapshots/evento → resultado da intenção. Locks são retidos até o commit.
Composição é relida após adquirir locks; mudança do conjunto é recusada.
Elegibilidade é revalidada depois dos locks. Pricing observa `clock_timestamp`
após esperar os slots: `statement_timestamp` anterior à espera seria obsoleto.
A validade da cotação é novamente conferida após a espera de estoque.

## Identidade e replay

Escopo fixo `ator / PREPARE_TEST_ONLY_V1 / chave`. Fingerprint SHA-256 inclui
itens canônicos e ID da cotação confiável. ID da preparação deriva desse escopo;
chave Inventory deriva do ID com namespace diferente. Mapeamento fica durável
em `request`, inclusive a referência da reserva.

Replay válido retorna o resultado persistido antes de reavaliar preço,
publicação ou expiração da cotação. Payload/cotação diferente na mesma chave
gera conflito. Duas conexões convergem via unique constraint e lock da intenção.
O port de cotação futuro deverá manter o ID confiável da intenção em retries;
gerar nova cotação a cada retry corretamente provoca conflito.

Identidade vem do port servidor e é conferida novamente contra `session_user`
registrado na fixture. Um consumidor não pode forjar o titular nem consultá-lo
por SQL direto. A identidade TEST_ONLY não constitui login público.

O adapter tem pool/timeouts delimitados e retry integral limitado a três
tentativas para serialization/deadlock. Erros SQL/conexão ficam redigidos em
códigos estáveis. Timeout não prova rollback: retry usa a mesma intenção.

## Evidência exigida

Evento armazena PID/XID dos quatro participantes. Testes conferem igualdade e
`xmin` das linhas Orders/Inventory. Barreiras observam `pg_stat_activity` e
locks em conexões independentes; falha injetada após reserva verifica ausência
de todos os efeitos. Processo filho é encerrado antes do commit e depois do
commit, antes da resposta da aplicação; nova conexão comprova rollback/replay.
Isso não simula perda de ACK TCP do servidor, que permanece não verificada.
