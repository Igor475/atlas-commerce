# F04-05 — evidências locais e pendências

Data: 13/10/2026. Base inspecionada: `3be60d9210e42fc1fa18058c8ccdd9f77f477592`, branch `main`, checkout inicialmente limpo. A baseline histórica F04-04 já estava incorporada. Nenhum commit, push ou deploy executado.

## Resultado e fronteiras

Implementação L0 server-only preparada; 9/9 provas L0 e 16/16 PGSP passam. Gates globais ainda possuem bloqueios de build, EOL e CI remoto, detalhados abaixo. L1: **BLOCKED-NO-REMOTE**. Nenhum projeto ou provedor real (Supabase, Render, Vercel, R2, Stripe ou e-mail) foi conectado com credenciais, provisionado ou modificado. Não foram procuradas credenciais nem carregados arquivos .env. Consulta à documentação pública não é conexão a banco remoto.

O probe fica desabilitado por padrão. Local usa somente loopback/porta/banco/role fixos. Cloud é uma configuração e um adapter preparados, sem client do spike, queries ou sockets; mesmo com env válida, a composição HTTP lança REMOTE_AUTHORIZATION_REQUIRED. Uma autorização futura precisará definir projeto dedicado, identidade readonly, endpoint/CA via canal seguro e operação SELECT; não libera migrations ou mudanças cloud.

## Ambiente

Windows/PowerShell, Docker Desktop 4.89.0 / engine 29.7.2, PostgreSQL real 17.10 Linux no digest já fixado pelo Compose F04-04. Prisma/client/adapter 7.10.0, pg/types 8.23.1, TypeScript 6.0.3, pnpm 12.11.2; dependências e lockfile inalterados.

Foi detectado que o launcher global Corepack/pnpm usa Node 22.22.2, apesar do PATH inicialmente apontar para o Node 24.21.0 temporário. Os logs anteriores não comprovam runtime 24 em todos os subprocessos. A rodada `pinned-*` usa launcher temporário de pnpm junto ao node.exe 24.21.0; nenhuma instalação global ou arquivo do repositório foi alterado para corrigir o launcher.

## Arquivos e decisões

- `src/infrastructure/persistence/probe-config.ts`: profiles tipados, validação antes do pool, binding de host/role/projeto, rejeição de parâmetros URI, porta 6543, flags contraditórias, mistura SPIKE, CA inválida e TLS inseguro.
- `probe-driver.ts`: opções pg/Prisma v7, CA e hostname verificados, TLS mínimo 1.2, limites finitos. Campos separados impedem query parameters da URI de sobrescrever SSL.
- `probe-readiness.ts` e `src/health/*`: provider singleton lazy, coalescência das consultas simultâneas, BEGIN READ ONLY/SELECT 1/prova de grants, descarte em erro, recuperação posterior e shutdown. Liveness permanece independente. Readiness desabilitada 503 DEPENDENCIES_NOT_CONFIGURED; local saudável 200; falha/privilégio indevido 503 DEPENDENCY_UNAVAILABLE.
- `scripts/connection-local.mjs`, `connection-child.mjs`, `test/connection*`, script `connection:test`: fixtures Docker/TLS/role descartáveis, sem mocks; projeto exclusivo atlas-f0404-spike-f0405, verificação de contexto Docker local/projeto e porta; cleanup do projeto e dos certificados temporários.
- `.env.example` e `DEVELOPMENT.md`: flags desabilitadas, identidades conceitualmente separadas, reprodução e checklist passivo futuro Data API/RLS/grants; sem segredo real.
- `.github/workflows/quality.yml`: somente acréscimo de postgres-integration, preservando job checks, Node, SHA das actions, package-manager-cache false, Corepack, frozen install, contents read e cleanup always. Projeto atlas-f0404-spike-ci, Compose/digest existente, spike:migrate e spike:test.
- `test/spike/persistence.pg.spec.ts`: ajuste estreito na observação do shutdown PGSP-02, explicado abaixo; os 16 casos e asserção original de zero backends permanecem.

Não há alteração de frontend, contracts, documentos normativos, schema/migration/prisma.config/Compose/guards/scripts spike, dependências ou lockfile. Não foi acrescentado SDK, migrations cloud, SECURITY DEFINER, job residente, retry de mutação ou fallback de pooler.

## PGSP-02: falha preservada e ajuste de observação

A primeira rodada registrou 15/16 e count=1 na leitura imediata de pg_stat_activity após shutdown: [log inicial](evidence/pgsp-final.txt), exit 1. O encerramento do socket não constitui confirmação de atualização da visão de estatísticas do servidor. O código instalado pg 8.23.1 encerra a conexão; 80 observações adicionais (30 encerramentos + 50 com CRUD equivalente) não encontraram vazamento persistente nem reproduziram novamente a contagem imediata 1: [observação](evidence/shutdown-observation.txt), [CRUD equivalente](evidence/shutdown-exact.txt). A causa transitória é uma hipótese coerente, não diagnóstico conclusivo reproduzido.

O diff acrescenta uma barreira usando o helper until existente (deadline 2500 ms) para observar a condição real zero antes da asserção original. Não repete CRUD, desconexão ou transação; não aceita backend persistente, não usa mock nem sleep como prova. Se o backend não desaparecer, o caso falha. Duas rodadas completas posteriores: [16/16 rodada 1](evidence/pgsp-revised-1.txt) e [16/16 rodada 2](evidence/pgsp-revised-2.txt), exit 0. Limpeza do projeto CI local: [cleanup](evidence/pgsp-cleanup-final.txt).

## Gates locais — códigos reais

| Comando                                  | Exit | Resultado / evidência                                                                                                                                                                                                   |
| ---------------------------------------- | ---: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm install --frozen-lockfile           |    0 | [pinned-install](evidence/pinned-install.txt); lockfile/deps preservados.                                                                                                                                               |
| pnpm lint                                |    0 | [pinned-lint](evidence/pinned-lint.txt).                                                                                                                                                                                |
| pnpm typecheck                           |    0 | [pinned-typecheck](evidence/pinned-typecheck.txt), todos workspaces.                                                                                                                                                    |
| pnpm test                                |    0 | [pinned-test](evidence/pinned-test.txt): 26 testes (23 API + 3 demais).                                                                                                                                                 |
| pnpm build                               |    1 | [pinned-build](evidence/pinned-build.txt): API/contratos compilaram, dois Next sem progresso por mais de 3 min; encerrados especificamente. Não aprovado nem causa conclusiva.                                          |
| pnpm smoke                               |    0 | [pinned-smoke](evidence/pinned-smoke.txt): API real live 200, ready 503 sem DB.                                                                                                                                         |
| pnpm format:check                        |    1 | [rodada final](evidence/final-format-check.txt): 34 arquivos preexistentes CRLF, caminhos protegidos inclusos.                                                                                                          |
| pnpm check                               |    1 | [pinned-check](evidence/pinned-check.txt): lint/typecheck/test passam; build Next novamente sem progresso por mais de 2 min; interrompido. Não alcançou smoke/format dentro do agregado; comandos separados executados. |
| pnpm --filter @atlas/api spike:test      |    0 | [pinned-pgsp](evidence/pinned-pgsp.txt): 16/16, Node v24.21.0 registrado pela suíte, PostgreSQL 17.10 real; migrate e cleanup exit 0.                                                                                   |
| pnpm --filter @atlas/api connection:test |    0 | [pinned-connection-test](evidence/pinned-connection-test.txt): 9/9 reais; TLS, grants, timeout ~506 ms, reconexão, shutdown, cold processes; cleanup integrante do runner.                                              |
| prettier --check arquivos alterados      |    0 | [changed-format](evidence/changed-format.txt): arquivos suportados pelo Prettier; SQL validado/executado pelo PostgreSQL local.                                                                                         |
| git diff --check                         |    0 | [diff-check](evidence/diff-check.txt); avisos autocrlf não são falha de whitespace.                                                                                                                                     |
| git diff --exit-code caminhos protegidos |    0 | [protected-diff](evidence/protected-diff.txt): frontend/contracts/docs/lock/schema/migration/Compose/scripts spike preservados.                                                                                         |

Tentativas anteriores foram mantidas, não substituídas por PASS: [L0 setup inicial](evidence/l0-run.txt), exit 1 com Docker inicialmente indisponível, sem testes; [build inicial](evidence/gate-build.txt), exit -1 após interrupção; [segunda tentativa](evidence/gate-build-unrestricted.txt), interrompida; [format intermediário](evidence/pinned-format-check.txt), exit 1 com 35 arquivos, incluindo tabela DEVELOPMENT ainda não formatada, corrigida e revalidada na rodada final de 34. Um smoke no sandbox/global Node 22 recebeu spawn EPERM (exit 1); o smoke final Node 24 fora do sandbox passou. Não atribuir travamento Next ao Node 22: repetiu com Node 24 confirmado.

A limitação Next foi observada tanto no sandbox quanto fora dele. Não foi diagnosticada nem reparada porque frontend/config frontend está fora do escopo; não se usaram flags alternativas de build para fabricar aprovação. Encerrar os processos de validação identificados não modificou fontes. Não houve sucesso global de pnpm check.

## Matriz SUPCON-01–22

| ID        | Estado            | Evidência e limite                                                                                                                                                    |
| --------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SUPCON-01 | PASS              | Base e diff inspecionados; schema/migration/guards/Compose/scripts spike preservados; única alteração PGSP é a barreira de observação documentada.                    |
| SUPCON-02 | BLOCKED           | Install frozen/lint/typecheck/26 unit tests passam sem credenciais; API/contratos compilam; build Next global não concluiu, gate interrompido com exit 1.             |
| SUPCON-03 | PASS              | pinned-smoke: live 200 e ready 503 DEPENDENCIES_NOT_CONFIGURED; unit prova disabled sem factory/socket.                                                               |
| SUPCON-04 | PASS              | 13 testes unitários de config mais suíte real: flags/profile/host/porta/CA/URI/pool inconsistentes recusados antes do pool.                                           |
| SUPCON-05 | PASS              | Guard F04-04 inalterado recusa remoto; cloud recusa SPIKE/CI/local; env DATABASE_URL não é inferida.                                                                  |
| SUPCON-06 | PASS              | TLS real PostgreSQL local: cadeia+hostname corretos passam, wrong CA/hostname falham; ssl off/require/URI params recusados no plano cloud. Não é prova remota.        |
| SUPCON-07 | PASS              | Pool real max 1 ocupado, timeout de aquisição ~503–506 ms, erro seguro e consulta posterior recuperada; sem mutação.                                                  |
| SUPCON-08 | PASS              | Provider singleton lazy, consulta concorrente compartilhada, shutdown observado com zero backends reais.                                                              |
| SUPCON-09 | PASS              | PostgreSQL interrompido, live 200 independente, ready 503.                                                                                                            |
| SUPCON-10 | PASS              | SELECT/role íntegros ready 200; GRANT INSERT apenas local torna role unsafe e ready 503; REVOKE local recupera 200.                                                   |
| SUPCON-11 | PASS              | DNS .invalid, TCP recusado e NOLOGIN na fixture: somente DB_UNAVAILABLE; HTTP mínimo sem URI/senha/token/stack.                                                       |
| SUPCON-12 | PASS              | Stop/start local, recuperação, dois processos frios e um único marcador intacto.                                                                                      |
| SUPCON-13 | PASS              | Startup Nest sem mudanças no catálogo; guards/migration CLI local preservados; cloud composição recusa socket.                                                        |
| SUPCON-14 | PASS              | SELECT autorizado; sete negativas DML/DDL/TEMP/SET ROLE SQLSTATE 42501 mesmo após session readonly off; grants reais locais.                                          |
| SUPCON-15 | PASS              | DEVELOPMENT: checklist passivo de exposição, RLS, policies, ownership/memberships/grants/views/functions; sem operação cloud.                                         |
| SUPCON-16 | BLOCKED           | Job isolado adicionado; PGSP local 16/16; CI remoto PENDENTE sem push/run ID posterior ao diff.                                                                       |
| SUPCON-17 | BLOCKED           | Checkout Windows format:check exit 1 por CRLF preexistente em 34 arquivos; check interrompido também no build; Linux CI pendente. Sem alteração ampla fora do escopo. |
| SUPCON-18 | BLOCKED-NO-REMOTE | Sem autorização específica de projeto dedicado/role/operação; nenhum SELECT Supavisor real.                                                                           |
| SUPCON-19 | BLOCKED-NO-REMOTE | TLS/CA/hostname do Supabase não testados; TLS local não substitui prova remota.                                                                                       |
| SUPCON-20 | BLOCKED-NO-REMOTE | Pool/prepared statements e limites reais não medidos em Supabase.                                                                                                     |
| SUPCON-21 | BLOCKED-NO-REMOTE | Pausa/retorno Free não observados; nenhum keepalive ou pausa induzida.                                                                                                |
| SUPCON-22 | BLOCKED-NO-REMOTE | Grants/RLS/Data API reais não auditados; apenas roteiro passivo preparado.                                                                                            |

L0 possui implementação e provas locais aprovadas nos itens 01/03–15, mas **não está integralmente aprovado**: SUPCON-02 (build), 16 (CI) e 17 (EOL/Linux) bloqueados. L1 não foi executado e não será ativado por env neste L0.

## Segurança observada

Na fixture local, role atlas_probe_readonly sem superuser/bypassrls/createdb/createrole/replication/memberships; apenas CONNECT/USAGE/SELECT. PUBLIC perde CREATE/TEMP exclusivamente no banco descartável. Ao desligar readonly de sessão, sete tentativas DML/DDL/TEMP/SET ROLE recebem 42501; marcador continua valor 7. Nenhum SQL negativo foi executado em remoto.

TLS PostgreSQL local aceitou CA e hostname corretos e recusou CA incorreta (UNABLE_TO_VERIFY_LEAF_SIGNATURE) e hostname incorreto (ERR_TLS_CERT_ALTNAME_INVALID). Profile remoto recusa ssl off/require, URI sslmode e configurações contraditórias antes de conectar. Essas provas locais não comprovam a CA, hostname ou grants efetivos de um Supabase real.

Pool max=1 saturado com cliente real retido: aquisição recusada em aproximadamente 503–506 ms, seguida de recuperação; uma factory apenas. Interrupção/restart do PostgreSQL preserva live=200, ready=503 durante falha e ready=200 após recuperação, dois processos frios e um único fato fixture. Startup não altera catálogo. Logs da aplicação usam códigos estáveis; respostas HTTP não exibem host/URI/versão/stack. CA/chaves efêmeras permanecem só em temp/volume descartável e são removidas pelo runner; nenhum material privado é versionado.

## Windows/Linux e CI

core.autocrlf=true. git ls-files --eol confirma i/lf e w/crlf nos frontends e contracts. format:check no checkout real aponta 34 arquivos preexistentes, incluindo caminhos proibidos. .gitattributes sozinho não reescreveria o conteúdo já materializado. Normalizar todos, mudar endOfLine ou ignorar os arquivos violaria o escopo: subitem EOL **BLOCKED-EOL-SCOPE**. Nenhuma renormalização ampla ou regra de formatter modificada. Formatação dos arquivos alterados é verificada separadamente.

**CI remoto PENDENTE**: nenhum push e nenhuma execução posterior a este diff; sem ID remoto de aprovação. O job Linux foi preparado, mas os comandos locais Windows/Docker não substituem evidência do runner Linux. SUPCON-16/17 permanecem bloqueados.

## Limites e referências oficiais

O quickstart [Prisma/Supabase](https://supabase.com/docs/guides/database/prisma) sugere permissões amplas para setup: createdb/bypassrls não foram adotados no diagnóstico readonly. [Conexão](https://supabase.com/docs/guides/database/connecting-to-postgres) e [pooling/limites](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits): endpoint/username precisam vir do Connect autorizado; session IPv4 5432 é a preparação, direto IPv6 requer confirmação explícita; não há fallback transaction 6543. Pool por processo 1..4 não é dimensionamento homologado do provedor.

[SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement), [pg SSL](https://node-postgres.com/features/ssl) e [Prisma v7 pool](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool) sustentam a validação completa e opções explícitas; sslmode=require sozinho não prova hostname. [Data API](https://supabase.com/docs/guides/api/securing-your-api) e [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) orientam o checklist passivo, sem alterações no projeto.

[Free pausing](https://supabase.com/docs/guides/platform/free-project-pausing): baixa atividade numa janela de sete dias pode pausar Free. Não foi induzida pausa nem criado keepalive artificial; limites reais, prepared statements e recuperação remota dependem do L1. [Changelog](https://supabase.com/changelog?types=breaking-change), consultado em 13/10/2026, registra mudanças de exposição Data API (novos defaults desde 30/05, enforcement previsto 30/10), correções PostgreSQL 15.19/17.11 e anúncio de ciphers HTTP para novembro. Não inferir o estado real do projeto ou mudança em TLS PostgreSQL a partir do anúncio HTTP.

A imagem local 17.10 permanece fixada pelo escopo. Aplicabilidade de cada CVE à imagem não foi auditada; atualização precisa de avaliação separada. A fixture é efêmera/loopback; não representa ambiente comercial, backup/restore, isolamento completo de funções/ownership, RLS final, recuperação de pagamento ou disponibilidade Free. Nenhum resultado homologa ADR-006, ADR-010 ou Atlas Commerce para produção.

## Próximos passos sem execução automática

1. Revisar este diff e os logs locais; tratar o build Next sem progresso em escopo autorizado separado.
2. Aprovar solução EOL que alcance os caminhos protegidos necessários, sem enfraquecer o formatter.
3. Após publicação humana, executar Quality e registrar ID/resultados posteriores ao diff; exigir checks e postgres-integration 16/16 no Linux.
4. L1 só após autorização específica de projeto dedicado/identidade/operação readonly e canal seguro. Mudança cloud exige autorização distinta. Não homologar produção com L0.
