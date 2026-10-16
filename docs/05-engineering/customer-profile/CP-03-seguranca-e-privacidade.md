# CP-03 — Segurança e privacidade

## Identidade e menor privilégio

Principal vem de port servidor e é conferido por classe/elegibilidade/evidência.
Cada função SQL valida session_user contra fixture_principal e fixture_account
ativa/verificada. Forjar accountId, declarar evidência no JSON ou possuir UUID
de endereço não concede acesso. Negativas de endereço alheio/inexistente usam
RESOURCE_NOT_FOUND sem PII. Não existe bypass staff/admin.

Bootstrap administrativo só instala roles no container descartável. Migrator
NOSUPERUSER possui criação local e membership do executor NOLOGIN para instalar
funções. Runtime actor_a/actor_b não tem membership, CREATE/TEMP, tabela/coluna
ou sequence acessível; recebe apenas USAGE e EXECUTE dos três ports explícitos.
Executor possui DML necessário interno, search_path pg_catalog e funções com
nomes qualificados. PUBLIC não executa funções Profile. UPDATE de coluna em
fixtures permite locks FOR SHARE, não manutenção de identidade por runtime.

Guard do adapter verifica destino/marker/versão/role, atributos perigosos,
membership, CREATE/TEMP, ownership, privilégios de tabelas/colunas/sequences e
funções extras nos schemas de aplicação. Privilegiar runtime indevidamente faz
falhar fechado. Esse guard local não substitui nem modifica L1_SQL_STRICT.
Revogações de PUBLIC existem **somente no banco Docker recém-criado**, não em
Supabase ou outro projeto. Trust sem senha/TLS é restrito a loopback da fixture;
não é configuração aprovada para provedor/produção.

URL só aceita destino fixo 127.0.0.1:55441/atlas_profile_cp01, schema/role exatos,
sem senha/hash/parâmetros extras. Node 24 e consentimento CP-01 obrigatórios.
Pool máximo três, connection timeout 1s, lock timeout 2,5s, statement 4s, query
4,5s, transação até 6s; desconexão no encerramento. São limites do laboratório,
não orçamento de produção. Sem migration automática, db push ou dotenv no runner.

## Minimização e riscos residuais

ReadForQuote retorna somente addressId, addressVersion, country, postalCode e
eligible. Não inclui nome, logradouro, complemento, owner, credenciais ou logs
de banco. SnapshotForOrder retorna cópia da revisão postal completa necessária
à expedição futura, com propósito TEST_ONLY; não é resposta HTTP pública.
Queries Prisma sem logging; exceções públicas do port só contêm códigos estáveis,
sem SQL, mensagem interna, payload ou conexão. SQL usa bind parameters, e
mass assignment é recusado em TypeScript e na função SQL.

Revisão é imutável no banco, mas uma cópia JS retornada pode ser usada pelo
consumidor: ela não altera o histórico. O futuro Order deverá persistir snapshot
aceito na mesma transação e impedir alteração posterior. Não guardar endereço
completo em eventos públicos, métricas, traces, analytics ou mensagens de erro.

Riscos residuais explícitos: administrador pode alterar DDL/grants; host local
com acesso ao Docker tem autoridade sobre a fixture; campos finais, fonte postal,
bases de tratamento, finalidade detalhada, retenção por conjunto de dados,
anonimização/descarte e controles em repouso não estão homologados. Não existe
limpeza automática que destrua replay/snapshot nem alegação de conformidade LGPD
integral. Dados reais permanecem proibidos nesse laboratório.
