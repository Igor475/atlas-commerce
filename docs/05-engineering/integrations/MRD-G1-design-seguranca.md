# MRD-G1 — Design de segurança e preparação da implementação local

**Status: especificação G1 histórica; modalidade A autorizada posteriormente para experimentação local G2. Deltas contratuais pendentes; sem homologação.**
Data: 14/10/2026. Baseline local `8238dc7042971aa64f875296a615220adb5a1fad`,
branch `main`, inicialmente limpa. Não há código MRD, execução SQL, criação de
roles/segredos, teste de software, conexão Supabase ou alteração de CI nesta etapa.
Todo SQL abaixo é **literal proposto para revisão, NÃO EXECUTADO**.

Governança: [ADR-011](../../04-architecture/adrs/ADR-011-diagnostico-mediado-e-politica-l1.md),
[INT-02.2](INT-02-2-diagnostico-mediado-proposta.md), [INT-03](INT-03-matriz-de-provas.md),
[ADR-006](../../04-architecture/adrs/ADR-006-acesso-dados.md) e
[ADR-010](../../04-architecture/adrs/ADR-010-postgresql-supabase.md). Este design
não ratifica ADRs, não inicia G2 e não substitui normas RN/PC/SEC.

## 1. Diagnóstico e garantias

### Adendo de execução local — 14–15/10/2026

O prompt MRD-G2 ratificou modalidade A/catálogo v1 **para experimentação local** e
autorizou implementação/fixtures próprias. [MRD-G2](MRD-G2-implementacao-local.md)
registra as provas e o delta de cobertura de roles API pendente de revisão humana.
Os SQLs e limites originais deste G1 são preservados abaixo para rastreabilidade;
o texto histórico “não iniciar G2” não revoga a autorização posterior e limitada.
Nenhuma aprovação remota/produção, assinatura de revisor ou homologação foi inferida.

### Diagnóstico G1 original preservado

Os documentos atuais já distinguem L1-SQL e MRD, exigem consultas fixas, segredo
no executor e aprovação separada para remoto. Faltavam SQL literal, projeção de
saída, procedimentos MRD-001–016, limites e divisão de responsabilidades.
Este documento preenche essas lacunas como proposta versionada **catálogo v1**.

Inspeção somente de leitura:

- [L1 config](../../../apps/api/src/infrastructure/persistence/l1-config.ts),
  [queries](../../../apps/api/src/infrastructure/persistence/l1-queries.ts) e
  [diagnóstico](../../../apps/api/src/infrastructure/persistence/l1-diagnostic.ts):
  detector estrito, consentimento, TLS, pool restrito, descarte de conexão e códigos
  próprios. Não reutilizar seu resultado como resultado MRD nem alterar seus critérios.
- [CLI L1](../../../apps/api/scripts/supabase-readonly.mjs) e
  [runner INT-02](../../../apps/api/scripts/supabase-local.mjs): referências para
  lifecycle e isolamento; não importá-los como biblioteca, pois executam ações.
- [Probe driver](../../../apps/api/src/infrastructure/persistence/probe-driver.ts):
  `verifiedTls` é candidato a reuso puro; importar esse arquivo também carrega
  dependência Prisma. G2 deve verificar o grafo de imports e ausência de side effects
  antes de reutilizá-lo. Não refatorar L0/L1 para atender MRD sem escopo aprovado.
- Os arquivos `probe-*` implementam preparação/readiness L0; os `spike-*` tratam
  transações comerciais artificiais. MRD não usa seus repositories nem provider NestJS.
- [Testes INT-02](../../../apps/api/test/supabase-l1/l1.integration.ts) e
  [fixture](../../../apps/api/test/supabase-l1/readonly-fixture.sql): 38 casos
  registrados historicamente em [INT-02.1](INT-02-1-postgresql-ci.md), não reexecutados
  em G1. A fixture endurecida modifica PUBLIC **localmente**; não representa
  defaults Supabase e não deve virar a fixture positiva MRD nativa por cópia cega.

**L1-SQL estrita: PENDENTE e fail-closed.** Seus códigos, SQL, testes e gates
SUPL1-001–015 permanecem intactos. MRD evidencia somente execução limitada pelo
programa confiável; credencial obtida fora dele conserva seus direitos SQL.
Não há campo `secure`, `readonlyProven`, `ready` comercial ou aprovação automática
da L1 em uma resposta MRD. Metadados com sinais ausentes não provam ausência de
capacidades que o catálogo proposto não cobre.

O alvo remoto documental permanece Atlas Commerce, ref `bkxrsgryzkgpwgkngieh`,
organização `jwqgnrbkqqmuthquungg`, região `sa-east-1`. Data API desligada é
**USER_REPORTED_DISABLED**, relato do responsável, sem prova independente.
Nem esse relato nem MRD eliminam PUBLIC TEMP/EXECUTE; não foi acessado o projeto.

## 2. Modalidades e fronteiras de confiança

| Aspecto     | A — CLI local controlada (G2 proposto)                                           | B — executor segregado (evolução bloqueada)                                                          |
| ----------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Solicitante | Operador local que controla processo/SO                                          | Principal autenticado distinto da identidade do executor                                             |
| Caminho     | Operador → parser fechado → executor → PostgreSQL Docker em loopback             | Solicitante → autenticação/autorização → executor server-side → banco autorizado                     |
| Credencial  | Fixture local; operador/SO podem obtê-la, sem alegação de isolamento contra eles | Apenas executor e administradores autorizados têm acesso; nunca remetida ao solicitante              |
| Benefício   | Validar allowlist, minimização, falhas e lifecycle sem cloud                     | Pode separar poderes do solicitante e segredo SQL                                                    |
| Limite      | Não é sandbox contra operador/root nem contra código/dependência comprometidos   | Comprometimento do executor/secret store rompe a mediação; requer segurança operacional              |
| Superfície  | Manual, sem HTTP/startup/readiness/worker, sem fallback remoto                   | Transporte, autenticação, autorização, rede, secret store e auditoria ainda precisam de nova decisão |
| Aprovação   | Design, fixture local e prompt G2 explícitos                                     | Nova aprovação arquitetural antes de qualquer interface remota; G3/G4 separados                      |

Para B, a futura autorização deve vincular principal autenticado a projeto,
ambiente e conjunto de IDs permitidos, negar por padrão e gerar auditoria
correlacionável. Não aceitar project/host/role enviados pelo solicitante. O
mecanismo de autenticação, transporte, secret store e política de acesso de B
estão **BLOQUEADOS para implementação** até aprovação específica; não escolher
JWT, endpoint, worker, microserviço ou provedor por inferência.

Responsabilidades propostas para A, sem criar arquivos agora:

1. Configuração pura: perfil local, manifesto de fixture, consentimento e validação
   de argumentos/ambiente; nenhum pool/import que abra socket nesta fase.
2. Catálogo privado: quatro constantes SQL e validadores/projetores de saída;
   sem API pública que aceite SQL, sem callback de query fornecido pelo caller.
3. Executor: único dono do pool; serializa pré-condições e a operação solicitada,
   aplica deadlines, descarta conexão, fecha pool e produz objeto tipado mínimo.
4. CLI: invocação manual e uma resposta; nenhuma chamada a shell ou processo filho.
5. Harness local separado: único componente autorizado, em G2, a iniciar/remover
   recursos Docker/fixture/TLS; não é importado pelo executor ou pelo NestJS.

## 3. Catálogo fechado v1 — SQL proposto, não executado

Somente `PING`, `SERVER_METADATA`, `PRIVILEGES_SUMMARY` e
`SCHEMA_EXPOSURE_SUMMARY`. **Zero parâmetros SQL do chamador**, nenhum identificador
livre e nenhum arquivo de query carregado em runtime. Strings completas abaixo
são as unidades de revisão; alterar SQL exige nova versão/revisão e testes.
Qualificar catálogos/funções; fixar `search_path=pg_catalog` na configuração do
cliente MRD, sem receber PGOPTIONS. Isso é defesa adicional, não permissão SQL.

Catálogos/bootstrap e administrador PostgreSQL são confiáveis neste modelo.
Um administrador que substitui objetos nativos compromete a prova. G2 deve
comparar metadados de resultado e SQL enviada com o manifesto revisado; funções
homônimas de aplicação não podem substituir chamadas qualificadas.

### 3.1 PING

```sql
SELECT 1::pg_catalog.int4 AS ok;
```

- Finalidade/justificativa: testar resposta ao comando fixo, não autorização de
  escrita. Sem schema/tabela consultada ou função com efeito de aplicação; cast
  nativo int4 de constante. Uma linha, uma coluna int4 exatamente 1.
- Interno: `ok`. Saída: somente `reachable: true`; 0, null, string, segunda linha,
  coluna adicional ou resposta ausente são `MRD_RESULT_INVALID`.
- Sensibilidade: baixa, sinal de disponibilidade. Risco: consumir conexão e
  produzir logs/estatísticas normais do servidor. Não promete zero efeito físico.
- Positivo: resposta exata. Negativos: resultado alterado, timeout, socket fechado,
  caller fornecendo outro literal ou SQL; MRD-003/005/008/009/013.

### 3.2 SERVER_METADATA

```sql
SELECT pg_catalog.current_database() AS database_name,
       current_user AS effective_role,
       session_user AS login_role,
       pg_catalog.current_setting('server_version_num')::pg_catalog.int4 AS version_num,
       pg_catalog.current_setting('default_transaction_read_only')::pg_catalog.bool AS default_readonly,
       s.ssl AS tls,
       s.version AS tls_version
FROM (VALUES (1)) AS seed(n)
LEFT JOIN pg_catalog.pg_stat_ssl AS s
  ON s.pid = pg_catalog.pg_backend_pid();
```

- Finalidade: confrontar identidade da sessão e transporte com manifesto local.
  Consulta somente a própria linha em `pg_stat_ssl`; não retorna PID, IP, cipher,
  nomes de outras sessões, `version()` completo ou valores livres de pg_settings.
- Funções: `current_database` e `current_setting` leem contexto; `pg_backend_pid`
  identifica a própria sessão, sem cancelar/alterar outra; current_user/session_user
  são expressões especiais. Casts int4/bool nativos. Sem set_config ou função
  fornecida pela aplicação. Estatísticas e locks de leitura são efeitos normais.
- Interno: nomes DB/role, texto UTF-8 ≤63 bytes cada; versão inteira
  170000–179999; default_readonly boolean; tls boolean/null e tls_version texto/null.
  Nomes devem coincidir exatamente com o manifesto; null, ausência ou diferença
  bloqueiam. Não copiar nomes para logs. Exatamente uma linha/sete colunas.
- Saída permitida: `serverMajor: 17`, `identityMatched: true`,
  `defaultReadonly: true`, `tls: true`, `tlsVersion: "TLSv1.2" | "TLSv1.3"`.
  Ausência de TLS ou default readonly off recusa; o default é proteção contra
  erro, nunca prova SQL estrita. Versão não 17 bloqueia sem autodetecção permissiva.
- Sensibilidade: interno restrito (identidade); saída operacional minimizada.
  Risco: servidor/administrador malicioso pode mentir; o banco não prova sozinho
  o project ref Supabase. Positivo: sessão local esperada; negativos: role/DB,
  versão, TLS ou shape divergente; MRD-002/006/007/009.

### 3.3 PRIVILEGES_SUMMARY

```sql
SELECT r.rolcanlogin AS can_login,
       (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR
        r.rolcreaterole OR r.rolreplication) AS elevated_flags,
       EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members AS m
               WHERE m.member = r.oid OR m.roleid = r.oid) AS membership,
       EXISTS (SELECT 1 FROM pg_catalog.pg_shdepend AS d
               WHERE d.refobjid = r.oid AND d.deptype = 'o') AS ownership,
       pg_catalog.has_database_privilege(pg_catalog.current_database(),
         'CREATE,CONNECT WITH GRANT OPTION') AS database_delegation,
       pg_catalog.has_database_privilege(pg_catalog.current_database(),
         'TEMP') AS temp_capability,
       EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS n
               WHERE pg_catalog.has_schema_privilege(n.oid,
                 'CREATE,USAGE WITH GRANT OPTION')) AS schema_delegation,
       EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
               JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
               WHERE n.nspname NOT IN ('pg_catalog','information_schema')
                 AND c.relkind IN ('r','p','v','m','f')
                 AND (pg_catalog.has_table_privilege(c.oid,
                   'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,SELECT WITH GRANT OPTION')
                   OR pg_catalog.has_any_column_privilege(c.oid,
                     'INSERT,UPDATE,REFERENCES,SELECT WITH GRANT OPTION'))) AS non_system_relation_risk,
       EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
               WHERE CASE WHEN c.relkind = 'S' THEN
                 pg_catalog.has_sequence_privilege(c.oid,
                   'USAGE,UPDATE,SELECT WITH GRANT OPTION') ELSE false END) AS sequence_risk,
       EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p
               JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
               WHERE pg_catalog.has_function_privilege(p.oid,'EXECUTE')
                 AND pg_catalog.has_schema_privilege(n.oid,'USAGE')
                 AND (p.prosecdef OR n.nspname NOT IN ('pg_catalog','information_schema')
                   OR pg_catalog.has_function_privilege(p.oid,
                     'EXECUTE WITH GRANT OPTION'))) AS executable_function_risk,
       EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p
               JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
               WHERE n.nspname = 'pg_catalog' AND p.provolatile = 'v'
                 AND pg_catalog.has_function_privilege(p.oid,'EXECUTE')) AS native_volatile_capability,
       pg_catalog.has_function_privilege(
         'pg_catalog.lo_create(oid)'::pg_catalog.regprocedure,
         'EXECUTE') AS large_object_capability,
       EXISTS (SELECT 1 FROM pg_catalog.pg_parameter_acl AS p,
                 LATERAL pg_catalog.aclexplode(p.paracl) AS a
               WHERE a.grantee IN (0,r.oid)) AS parameter_acl,
       EXISTS (SELECT 1 FROM pg_catalog.pg_default_acl AS d,
                 LATERAL pg_catalog.aclexplode(d.defaclacl) AS a
               WHERE a.grantee IN (0,r.oid)
                 AND (a.privilege_type <> 'SELECT' OR a.is_grantable)) AS default_acl_risk
FROM pg_catalog.pg_roles AS r
WHERE r.rolname = current_user;
```

- Finalidade: produzir **sinais limitados de capacidade**, não uma certificação
  ou substituto de `l1Queries.role`. Exatamente uma linha/14 colunas booleanas,
  sem null; não retorna OIDs, nomes de tabelas/roles, ACL bruta ou definições.
- Objetos: pg_roles, pg_auth_members, pg_shdepend, pg_namespace, pg_class, pg_proc,
  pg_parameter_acl e pg_default_acl. `has_*_privilege` apenas verifica ACL efetiva,
  incluindo PUBLIC; current_database lê contexto, aclexplode decompõe ACL e
  regprocedure resolve assinatura fixa. **Não executa lo_create** nem funções
  encontradas em pg_proc; volatilidade é sinal de revisão, não efeito produzido.
- Gates locais propostos: can_login deve ser true; elevated_flags, membership,
  ownership, database_delegation, schema_delegation, non_system_relation_risk,
  sequence_risk, executable_function_risk, parameter_acl e default_acl_risk devem
  ser false. Qualquer true bloqueia com `MRD_IDENTITY_REJECTED`.
- temp_capability, native_volatile_capability e large_object_capability são
  **avisos explícitos**, nunca “permissões removidas” ou atestado readonly.
  Essa classificação é proposta exclusivamente para A/fixture artificial após
  ratificação humana do limite MRD. **Não altera a política L1** e não autoriza
  remoto. Sem aceitação desse limite, não implementar caminho positivo G2.
- Saída: `signals` com os 14 nomes fixos acima, todos boolean; `coverage` constante
  `LIMITED_CATALOG_SIGNALS`; `sqlCredentialStrictReadonly: "NOT_PROVEN"`.
  Forma de falha só tem envelope/código, sem signals parciais.
- Sensibilidade: operacional restrita, limitada a capacidades sem identificar
  objetos. Riscos: ausência de um sinal não cobre todas as formas de escrita,
  MAINTAIN, trusted extensions, objetos futuros, acesso de leitura sensível,
  mudanças entre queries ou estado completo de RLS. Não liberar B com base apenas
  nessa query; inventário efetivo remoto e aprovação continuam obrigatórios.
- Positivo: fixture nativa sem grants comerciais mantém avisos PUBLIC visíveis.
  Negativos: injetar cada flag/grant/membership/owner/ACL com controlador local
  isolado e verificar recusa; nomes/colunas/null inesperados também recusam.
  MRD-002/005/006/009/012/013/015.

### 3.4 SCHEMA_EXPOSURE_SUMMARY

```sql
SELECT target.name AS schema_name,
       (n.oid IS NOT NULL) AS present,
       CASE WHEN n.oid IS NULL THEN NULL ELSE EXISTS (
         SELECT 1 FROM pg_catalog.pg_class AS c
         WHERE c.relnamespace = n.oid
           AND c.relkind IN ('r','p','v','m','f')) END AS has_relations,
       CASE WHEN n.oid IS NULL THEN NULL ELSE EXISTS (
         SELECT 1 FROM pg_catalog.pg_class AS c,
           LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,
             pg_catalog.acldefault('r',c.relowner))) AS a
         WHERE c.relnamespace = n.oid
           AND c.relkind IN ('r','p','v','m','f')
           AND a.grantee = 0
         UNION ALL
         SELECT 1 FROM pg_catalog.pg_class AS c
         JOIN pg_catalog.pg_attribute AS col ON col.attrelid = c.oid,
           LATERAL pg_catalog.aclexplode(col.attacl) AS a
         WHERE c.relnamespace = n.oid
           AND c.relkind IN ('r','p','v','m','f')
           AND col.attnum > 0 AND NOT col.attisdropped
           AND a.grantee = 0) END AS public_relation_grant,
       CASE WHEN n.oid IS NULL THEN NULL ELSE EXISTS (
         SELECT 1 FROM pg_catalog.pg_class AS c
         JOIN pg_catalog.pg_roles AS api
           ON api.rolname IN ('anon','authenticated')
         WHERE c.relnamespace = n.oid
           AND c.relkind IN ('r','p','v','m','f')
           AND (pg_catalog.has_table_privilege(api.oid,c.oid,
             'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
             OR pg_catalog.has_any_column_privilege(api.oid,c.oid,
               'SELECT,INSERT,UPDATE,REFERENCES'))) END AS api_relation_grant
FROM (VALUES ('identity'::pg_catalog.text),
             ('public'::pg_catalog.text)) AS target(name)
LEFT JOIN pg_catalog.pg_namespace AS n ON n.nspname = target.name
ORDER BY target.name;
```

- Finalidade: sinalizar somente presença/ACL de dois schemas fixos; o nome da
  operação **não implica prova de exposição HTTP**. Objetos: pg_namespace,
  pg_class, pg_attribute e pg_roles; public_relation_grant inclui ACL de colunas.
  aclexplode/acldefault e helpers de privilégios leem ACL,
  sem executar views/funções/tabelas de aplicação. Não consultar pgrst settings,
  corpo de funções, políticas completas ou conteúdo de tabelas.
- Interno/saída: exatamente duas linhas/cinco colunas. schema_name é enum
  `identity | public`; present boolean; demais campos boolean quando presente,
  **null quando ausente**, nunca false por desconhecimento. Projetar para
  `schemas` (array ordenado de dois objetos com esses cinco campos) e
  `dataApiEvidence: "UNVERIFIED"`. Nenhum nome dinâmico, contagem ou lista de objetos.
- Sensibilidade: operacional restrita. Ausência de `anon`/`authenticated`,
  grants de schema, policies/RLS, outros schemas/rotas/RPC e heranças especiais
  não são completamente cobertos; nunca concluir “API segura/desligada”.
  O relato USER_REPORTED_DISABLED permanece separado da evidência técnica.
- Qualquer PUBLIC/API grant observado é aviso; grant em identity bloqueia
  `MRD_EXPOSURE_REVIEW_REQUIRED`. Em public, sinal observado requer revisão,
  não promoção de segurança; resultado descritivo pode ser emitido localmente
  com código `MRD_LOCAL_OBSERVED`, sem homologação. Remoto continua bloqueado.
- Positivo: public vazio e identity ausente retornam shape esperado. Negativos:
  identity com grant público/API, schema homônimo fora da lista, rows/colunas
  extras ou null incoerente; MRD-005/006/009/014.

## 4. Contrato de execução e saída proposto

### 4.1 Configuração e identidade local

- G2 só implementa perfil `local-disposable`; qualquer ref/URL/host remoto,
  review Supabase, senha Supabase ou tentativa de escolher outro perfil bloqueia
  **antes de DNS/socket**, inclusive em CI. Nenhum caminho remoto funcional.
- Alvo local proposto fixo: endereço **127.0.0.1**, porta **55438**, banco
  **atlas_mrd_g2**, login/role **atlas_mrd_local**. São novos identificadores de
  fixture propostos, não recursos existentes. Não usar 55434/55436 ou roles L1,
  Identity, runtime, migrator, postgres, anon, authenticated ou service_role.
- A CLI recebe manifesto local privado gerado pelo harness sob diretório temporário
  validado, sem symlink, não via path escolhido pelo solicitante. Manifesto sem
  senha contém versão, run ID, DB/role/porta fixos, ID/labels Docker e CA pública
  local. Conferir ownership dos recursos antes de conectar. Operador/SO controla
  esses arquivos; manifesto não é atestação contra root.
- Harness futuro gera fixture artificial PG17, sem dados comerciais e sem
  revogar PUBLIC globalmente para tornar MRD positivo. Criação de role/fixture
  local requer escopo explícito do próximo prompt; **não ocorreu em G1**.
  Credencial efêmera local por **pipe stdin privado** do harness ao processo CLI,
  nunca terminal interativo, argv, env genérica, Git, manifesto público ou logs.
  Payload único JSON ≤4096 bytes, somente runId UUID, manifestPath local e password
  local (1–256 bytes, sem controles); EOF obrigatório, campos extras/SQL recusados.
  Leitura limitada a 1000 ms desde a entrada da CLI; tamanho excedido/EOF ausente
  recusa sem socket. O deadline global começa na entrada do processo, antes de IO.
  O path deve resolver no diretório temporário próprio do run, sem symlinks e com
  ownership/ACL local conferidos. O pipe não autentica contra o operador/SO que
  controla o processo; esse é o limite explícito de A. Sem pipe válido, nenhuma
  conexão. Não fixar segredo em documento.

### 4.2 Argumentos, integridade e allowlist

- Gramática proposta: exatamente os três argumentos
  `--profile=local-disposable`, `--consent-local=MRD-G2`, `--operation=<ID>`;
  ordem fixa, um ID literal do catálogo, case-sensitive. Nenhum argumento extra,
  abreviação, repetição, stdin SQL, batch, path de query ou expansão por template.
  `--help` sozinho permite texto fixo sem IO de banco; ausência/erro bloqueia.
  Não imprimir os argumentos rejeitados. Duplicatas no mesmo pedido são inválidas.
  O marcador local registra intenção por invocação; não autentica o operador,
  não é token de uso único e não impede automação por quem controla o SO.
- CLI sem processos filhos, eval, plugins, callbacks externos ou imports de
  módulos web. Harness usa executáveis confiáveis resolvidos e argumentos
  estruturados, shell=false; env mínima, sem interpolation de conteúdo não confiável.
- Recusar ambientes PG*, DATABASE_URL, PERSISTENCE__, SPIKE__, IDENTITY__,
  ATLAS_SUPABASE__, SUPABASE_* e opções NODE_OPTIONS/NODE_PATH/DEBUG/TLS bypass
  no executor; harness não repassa valores. Proibir dotenv e connectionString.
  CI só habilita o perfil local; nenhuma variável contém consentimento remoto.
- Catálogo fechado em módulo privado, strings/projetores imutáveis por processo;
  não expor Map mutável, query callback ou método `query(sql)`. Verificar conjunto
  exato de IDs/SQL/colunas em testes e snapshot de revisão com hash SHA-256 por SQL.
  Hash armazenado no mesmo binário não é proteção contra binário comprometido.
- Usar Node/pnpm/pg e lockfile fixados do HEAD após conferir compatibilidade;
  sem pacote/upgrade por conveniência. Review do diff/grafo de imports, origem
  confiável de instalação e aprovação humana protegem supply chain. Alteração
  de dependência/SQL invalida evidência anterior e exige revalidação.

### 4.3 Sequência, TLS, limites e cleanup

1. Validar consentimento/args/configuração/ownership e disponibilidade do sink
   de auditoria local; falha termina sem pool. Trava exclusiva de execução por
   run via criação atômica de lock privado; segunda CLI desse run recusa BUSY.
   Separadamente, o harness detém lock de recurso por porta 55438 antes do
   pré-voo Docker, até terminar cleanup; outro harness recusa sem adotar recursos.
2. Criar pool dedicado `pg`, max=1, aquisição/conexão 3000 ms, statement_timeout
   3000 ms, query_timeout 4000 ms, idle timeout 1000 ms, idle-in-transaction 5000 ms,
   maxLifetimeSeconds=30. Deadline total do executor 15000 ms; sem retries, fila
   externa ou conexão alternativa. São limites propostos, não SLO comprovado.
3. TLS local **obrigatório** com CA efêmera de testes, SAN compatível com IP
   127.0.0.1, rejectUnauthorized=true, mínimo TLS1.2 e verificação de identidade
   explícita para esse IP. Não resolver localhost para outro endereço; no caso
   de IP, validar SAN de IP, sem depender de SNI DNS. Nunca ssl=false/fallback.
4. Executar SERVER_METADATA e PRIVILEGES_SUMMARY como pré-condições fixas, na
   mesma conexão; validar forma/identidade/gates antes da operação escolhida.
   Se uma delas foi solicitada, aproveitar seu resultado, sem executá-la de novo.
   PING/SCHEMA_EXPOSURE_SUMMARY acrescentam uma query. Máximo três SELECTs por
   invocação. Não enviar BEGIN/SET/DML/DDL: search_path/default readonly/timeouts
   são opções fixas da conexão, não comandos escolhidos pelo usuário.
5. Preparar projeção somente da operação solicitada, sem emitir sucesso ou vazar
   dados de pré-condições. Não prometer snapshot atômico ou segurança futura:
   ACLs podem mudar entre SELECTs.
6. Em finally, destruir cliente com release(true), pool.end e remover lock próprio,
   inclusive em timeout/falha; SIGINT/SIGTERM inicia o mesmo encerramento, idempotente.
   Deadline não autoriza replay. Aquisição que completar depois do deadline deve
   destruir imediatamente o cliente, sem queries tardias. query_timeout não prova
   cancelamento no servidor: manter statement_timeout e destruir o socket.
   Socket ainda ativo/falha de cleanup é recusa. Após cleanup, persistir evento
   terminal com seu resultado; somente então emitir envelope final.
7. Harness aplica deadline de 180 s ao próprio grupo de processos, finaliza apenas
   filhos próprios e limpa somente IDs Docker/certificados/diretório temporário
   associados ao run ID que criou. Nunca docker prune ou remoção por prefixo solto.
   Recurso preexistente, porta ocupada, Docker remoto ou labels divergentes: parar
   sem adotar/excluir. Locks atômicos evitam corrida entre pré-voo e criação.

**Limite real de cleanup:** finally não cobre SIGKILL, crash do SO ou Docker
indisponível. Registrar MRD_CLEANUP_FAILED; próxima execução não adota resíduos,
exige recuperação explícita por ID/ownership. VM efêmera de teste é camada extra,
não garantia absoluta. Não imprimir sucesso antes de cleanup/auditoria concluírem.

### 4.4 Envelope, auditoria e erros

Uma linha JSON UTF-8 em stdout, limite **8192 bytes**, sem chaves extras:

| Campo           | Tipo/limite e regra                                                                    |
| --------------- | -------------------------------------------------------------------------------------- |
| contractVersion | Literal `MRD-v1`                                                                       |
| status          | `MRD_LOCAL_OBSERVED`, `MRD_BLOCKED` ou `MRD_UNVERIFIED`                                |
| code            | Enum fechado abaixo                                                                    |
| operationId     | Um dos quatro IDs; null se inválido antes da seleção                                   |
| elapsedMs       | Inteiro 0–180000, relógio monotônico; excedente vira falha, não truncamento silencioso |
| l1SqlStrict     | Literal `PENDENTE`, nunca derivado do sucesso MRD                                      |
| data            | Somente projeção da operação, ou null em qualquer falha                                |

`MRD_LOCAL_OBSERVED` / `MRD_OK` significa **comando mediado local observado**,
não MRD_LOCAL_VALIDATED global. Este último estado só cabe no relatório agregado
após todos os gates e aprovação. Não emitir MRD_REMOTE_VALIDATED em G2.

Códigos propostos: MRD_OK; MRD_ARGUMENT_INVALID; MRD_CONSENT_REQUIRED;
MRD_CONFIGURATION_INVALID; MRD_REMOTE_DISABLED; MRD_IDENTITY_REJECTED;
MRD_TLS_REJECTED; MRD_DB_UNAVAILABLE; MRD_TIMEOUT; MRD_BUSY;
MRD_RESULT_INVALID; MRD_EXPOSURE_REVIEW_REQUIRED; MRD_INTEGRITY_UNVERIFIED;
MRD_AUDIT_FAILED; MRD_CLEANUP_FAILED; MRD_INTERRUPTED; MRD_INTERNAL_ERROR.
Não são novos códigos L1. Erro de argumentos/consentimento/config remoto/BUSY
→ BLOCKED; TLS/DB/timeout/result/integrity/auditoria/cleanup/interrupção/interno
→ UNVERIFIED; identity/exposure → BLOCKED. Exit 0 somente após operação, auditoria
e cleanup concluídos; exit 2 BLOCKED, 1 UNVERIFIED, 130 interrupção. Em múltiplas
falhas, cleanup > auditoria > falha operacional determina código final, sem
promover sucesso. Falha de stdout não deixa prova entregue: saída não zero.

Auditoria local privada: evento START e terminal, occurredAt UTC/RFC3339 (até
30 caracteres, relógio do SO para rastreabilidade, não decisão de negócio),
contractVersion, run ID UUID
interno, commit (40 hex), modalidade A, ID válido/null, versão/hash de catálogo,
status/código, elapsedMs e resultado de cleanup. Identidade do operador em A é
“operador local do processo”, não autenticação remota comprovada; o vínculo à conta
SO deve ficar em registro operacional privado, sem copiar username para a saída.
JSON de auditoria ≤4096 bytes/evento, dois eventos/invocação, diretório privado
por run; sem truncar erro bruto. stderr limitado a código fixo e newline em falha
de inicialização/serialização, sem stack, args, SQL, hostname, CA/chave, senha,
objeto pg.Error ou variáveis de ambiente. Normalizar logs é insuficiente:
**construir saída por allowlist**, testar canários em todos os canais.

Cada invocação tem invocationId UUID interno distinto do runId da fixture;
eventos em arquivos próprios invocationId/start e invocationId/terminal, criados
de modo exclusivo e sem sobrescrever outro evento. Uma CLI recusada por BUSY
não compartilha arquivo com a execução em andamento. Nenhum ID dá autorização.

Se auditoria não puder iniciar, bloquear antes do socket; se terminal não puder
persistir, falhar sem sucesso. Retenção/política de exportação B continua decisão
operacional pendente, não criar armazenamento central nesta tarefa.

### 4.5 Qualquer remoto futuro

G2 recusa tudo remoto. Para futura G3/G4, nova autorização nominal por execução
deve conferir projeto/ref/org/região e host/username exatos do Dashboard Connect,
role técnica própria sem membership/ownership/flags elevados e inventário completo
de direitos efetivos PUBLIC/objetos/funções. Não usar a role L1 nem runtime/migrator.
CA oficial, hostname, Session Mode, consentimento e revisão independente Data API
precisam de evidência separada. Postgres não autentica sozinho project ref/região;
TLS e revisão Dashboard são complementares, sem confiar apenas em JSON preenchido.
Não incluir endpoint/credencial remota executável ou variável que habilite remoto
em G2. Nem toggle Data API nem relatório MRD aprovam a credencial como SQL readonly.

## 5. Modelo de ameaças proposto

Todos os controles abaixo são **planejados, não implementados**. C = controle de
código testável em G2; O = controle operacional; R = risco residual fora da garantia.

| Ameaça / condição                      | Controle C                                                              | Controle O                                       | Risco R e teste                                                   |
| -------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| SQL injection por caller               | IDs exatos, zero parâmetros, SQL privado literal; sem parser permissivo | Review da query inteira                          | Executor alterado pode enviar outra SQL; MRD-003/005              |
| Command injection                      | CLI sem subprocessos; harness shell=false, args estruturados            | Binários Docker/OpenSSL confiáveis               | PATH/SO adulterado fora da garantia; MRD-003/015                  |
| Manipulação/duplicação de argumentos   | Gramática completa e bounds, nenhuma opção livre                        | Invocação manual aprovada                        | Operador controla processo; MRD-001/004                           |
| Substituição de query / SQL dinâmica   | Mapa privado imutável e snapshots exatos                                | Review de fonte/build/hash e cadeia de entrega   | Hash no próprio código não resiste a comprometimento; MRD-005/015 |
| Escalada por flags/membership/grants   | Gates de sinais, nenhuma troca de role, nenhuma função de efeito        | Inventário efetivo antes de remoto               | Query limitada não prova toda ACL; MRD-002/009                    |
| Exfiltração de senha/token             | Canal privado, projeção allowlist, env limpa, sem erro bruto            | Restringir acesso SO/secret store e dumps        | Root/operador A pode ler memória/secret; MRD-006                  |
| Host/projeto trocado                   | A fixo loopback, nenhum override/fallback                               | Futuro Connect/TLS/projeto conferidos            | Configuração e servidor comprometidos; MRD-002/016                |
| TLS inválido/downgrade                 | CA/SAN IP/rejectUnauthorized/minTLS; sem retry inseguro                 | CA oficial só em etapa remota separada           | CA confiável comprometida; MRD-007                                |
| Logs/stdout/stderr vazam metadados/PII | Envelope fechado, canários, bounds, erro fixo                           | Logs privados, revisão de exportação             | Captura por OS/dep instrumentada; MRD-006/009                     |
| Dependência comprometida               | Lock/pins existentes, imports mínimos, sem plugin/loader ambiental      | Review de origem e diff, audit nos gates G2      | Dependência maliciosa pode ignorar controles; MRD-015             |
| Concorrência/DoS/catálogo grande       | Lock por fixture, pool1, deadlines, três queries máximas                | Orçamento de conexões e capacidade antes de B    | Planos/locks variam; timeout não prova segurança; MRD-008/010     |
| Executor comprometido                  | Nenhuma promessa de contenção total                                     | Isolamento/menor privilégio/resposta a incidente | Mediação deixa de ser garantia; MRD-015                           |
| Credencial usada fora da CLI           | Não expor pela interface, sinalizar NOT_PROVEN                          | Segregação e rotação/revogação autorizadas       | PUBLIC TEMP/lo_create continuam possíveis; MRD-013/015            |
| Sucesso falsamente seguro              | Estados próprios, UNVERIFIED em ausência/erro, L1 PENDENTE literal      | Revisão humana do relatório e evidência          | Observação local não homologa provedor; MRD-012/013/014/016       |

## 6. Matriz detalhada futura MRD-001–016

**Todos PENDENTES / NÃO EXECUTADOS.** Estes procedimentos detalham os IDs originais
de INT-02.2, sem renumerar/substituir SUPL1 ou aprovar a implementação. Capturas
de queries na suíte ficam no controlador de teste privado, nunca em stdout da CLI.

| ID      | Pré-condições                                                       | Procedimento futuro                                                                                                                                                      | Esperado                                                                                                                           | Evidência necessária                                                                                                                                                  |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MRD-001 | Parser/config puros e pool factory instrumentada                    | Omitir consentimento local, usar marcador errado, omitir manifesto; simular pedido remoto sem consentimento                                                              | MRD_CONSENT_REQUIRED ou CONFIGURATION_INVALID; nenhum DNS/socket/pool                                                              | Contador zero de connect/DNS e saída fixa, commit/args sanitizados                                                                                                    |
| MRD-002 | Fixture local TLS e role nominal não privilegiada                   | Divergir DB/role/porta/profile; injetar endpoint remoto/username/admin; alterar cada flag/membership/ownership no controlador isolado                                    | Config remota bloqueada antes de socket; divergência da sessão/flags → IDENTITY_REJECTED; sem query da operação pedida             | Queries fixas observadas e sinais esperados; log sanitizado sem role/host bruto                                                                                       |
| MRD-003 | CLI sem subprocessos e driver espionado                             | Fornecer SQL/identificadores/URL via argv/stdin/env, ponto e vírgula, newline, aspas, metacaracteres shell e args extras                                                 | ARGUMENT_INVALID ou CONFIGURATION_INVALID; nenhum comando/query escolhido por caller                                               | Casos parametrizados, connect/query/spawn zero nos negativos pré-voo; nenhum arquivo sentinela criado                                                                 |
| MRD-004 | Quatro IDs exatos registrados                                       | ID desconhecido, case incorreto, ID vazio/Unicode/truncado, --operation duplicada/batch                                                                                  | ARGUMENT_INVALID; nenhuma query; help isolado sem IO                                                                               | Lista de inputs e envelope esperado; ausência de eco dos valores                                                                                                      |
| MRD-005 | Catálogo/manifesto revisados e fixture artificial com sentinelas    | Comparar cada SQL integral com snapshot; tentar substituir por SELECT lo_create/set_config/nextval ou view/função com efeito via input; homônimos em schema de aplicação | Nenhuma substituição via interface; dispatch somente strings fixas; nenhum LO/sentinela alterado pela CLI                          | Captura privada exata das SQL, revisão semântica por função e comparação de estado antes/depois pelo controlador; nunca injetar função perigosa no catálogo produtivo |
| MRD-006 | Canários fictícios para senha/token/PII em erros de driver e config | Capturar stdout/stderr/auditoria/arquivos/argv/env de filhos; erros init, TLS, connect, query, serialização e cleanup                                                    | Nenhum canário, URI, stack ou campo extra; limites de bytes respeitados; nenhuma propagação a filhos pela CLI                      | Scanner local de canais + schema de saída, sem canários reais/segredos no relatório                                                                                   |
| MRD-007 | CA/SAN IP local válidos e cenários inválidos isolados               | CA errada/expirada, certificado fora de validade, SAN errado, TLS desligado, versão inadequada, bypass env                                                               | TLS_REJECTED/configuração recusada; nunca ssl=false; nenhuma SQL antes do handshake válido                                         | Códigos fixos, captura de verificação de certificado e zero queries em falhas TLS                                                                                     |
| MRD-008 | Ownership próprio e prazo de execução definidos                     | Falhar Docker/init/manifesto/CA/pool, interromper processo, induzir lock de catálogo com controlador, perder socket; depois iniciar nova execução                        | DB_UNAVAILABLE/TIMEOUT/INTERRUPTED/cleanup failure conforme causa; sem sucesso/cached PASS; recuperação só com nova prova completa | Tempos ≤deadline+tolerância de teste documentada, conexões zeradas, pool fechado, inventário recursos antes/depois e novo run independente                            |
| MRD-009 | Banco artificial sem conteúdo real; validador fechado               | Retornar colunas/linhas extras, null/tipos errados, PostgreSQL diferente; schema ausente; nomes/token em conteúdo fictício                                               | RESULT_INVALID ou IDENTITY_REJECTED; ausência representada sem false seguro; nenhum dado bruto                                     | Asserts de cardinalidade/tipos/campos e saída minimizada para as quatro operações                                                                                     |
| MRD-010 | Lock exclusivo por fixture e pool1                                  | Disparar duas CLI simultâneas; repetir chamada após encerramento; simular aquisição saturada                                                                             | Uma execução, outra MRD_BUSY sem pool; repetição separada exige novo consentimento/manifesta identidade, sem replay/cache          | Contadores peak pool≤1 por run, ownership de lock e ausência de queries duplicadas por retry                                                                          |
| MRD-011 | Docker local e projeto/labels/run ID exclusivos                     | Simular recurso preexistente inclusive parado, porta ocupada, Docker TCP/SSH; executar harness sem credencial remota e com tentativa de env cloud                        | Não adotar/remover alheios, bloquear remoto; limpar apenas recursos próprios; CI futuro sem cloud                                  | IDs e inventário local sanitizados antes/depois; teste de ausência de sockets não loopback; revisão de workflow futuro sem secrets                                    |
| MRD-012 | G2 concluído localmente com suites anteriores intactas              | Executar runner original INT-02 separadamente (38), Identity/Resend, PGSP e L0; comparar arquivos L1/fixtures/workflows                                                  | Regressões passam sem mudar expectativa/controle; falha bloqueia aceite G2                                                         | Logs novos com commit/versões/comandos; diff/hash dos arquivos protegidos; sem reaproveitar logs G1/anteriores                                                        |
| MRD-013 | Caminho local positivo e negativos disponíveis                      | Validar todos envelopes e relatório agregado, inclusive PUBLIC TEMP/lo e avisos                                                                                          | Somente estados MRD próprios; l1SqlStrict=PENDENTE; NOT_PROVEN; nunca READONLY_PROVEN/ROLE_UNSAFE como sucesso MRD                 | Asserts de enum/campo literal e teste de não alteração da L1/readiness NestJS                                                                                         |
| MRD-014 | Somente relato humano de Data API desligada                         | Executar resumo de schemas local com absent/present/ACL diferentes; tentar inferir toggle de catálogo vazio                                                              | dataApiEvidence=UNVERIFIED; relato não vira verificação; identity grant bloqueia; public grant é aviso                             | Shapes esperados locais; confirmação Dashboard/prova HTTP futura continua BLOQUEADA fora de G2                                                                        |
| MRD-015 | Fonte/deps confiáveis e catálogo privado                            | Tentar mutação por interface/import público/loader/env e divergência de manifesto; revisar dependência/import com side effect                                            | INTEGRITY_UNVERIFIED/config recusada onde detectável; nenhum compromisso de resistir a root/credencial exfiltrada                  | Review de grafo, hashes/revisão/lockfile, testes de mutação e registro do risco residual; sem executar pacote malicioso                                               |
| MRD-016 | Nenhuma autorização remota em G1/G2                                 | Tentar ativar remoto em CLI/CI; revisar checklist futura G3/G4                                                                                                           | REMOTE_DISABLED antes de DNS/socket; prova real MRD remota permanece pendente, sem alterar L1                                      | Contadores zero e relatório local. Em tarefa futura separada: autorização nominal, Connect/CA/grants/Data API, commit/versões/log minimizado de execução efetiva      |

MRD-012 não declara executados os 38 casos nesta tarefa. MRD-014/016 têm uma parte
negativa local prevista e uma parte remota **bloqueada**, que não deve ser marcada
PASS por skip. Tolerância de tempo de teste não aumenta os deadlines configurados.

## 7. Plano detalhado G2 e ratificações pendentes

Antes de qualquer código, o responsável precisa ratificar ADR-011/INT-02.2 e este
G1 (modalidade A, catálogo literal, campos/avisos, limites e risco PUBLIC fora da
mediação), nomear revisor/aprovador e autorizar expressamente um **novo prompt G2
somente local**, incluindo criação/descarte de fixture/role/TLS efêmeros locais.
O pedido G1 não satisfaz esses gates. Modalidade B e G3/G4 continuam bloqueadas.

Sequência proposta para o próximo trabalho autorizado:

1. Conferir novo HEAD/diff, instruções, toolchain e aprovação; preservar L1,
   Identity/Resend, migrations, lockfile, workflows e módulos comerciais.
2. Implementar módulo MRD separado dentro da infraestrutura, sem provider NestJS,
   com config/parser puros, quatro literais/projetores, executor privado e CLI
   manual. Escolher nomes de arquivos descritivos dentro desse escopo; não
   compartilhar API que aceite SQL genérica ou acoplar testes à readiness.
3. Criar harness/fixture próprios com imagem PG17 por digest já fixado, loopback
   55438 e recursos/run ID exclusivos; controlar provisioning apenas localmente,
   sem herdar revogações PUBLIC da fixture L1 nem modificar a fixture original.
4. Implementar validators/sanitização/estado/auditoria/cleanup e todos os negativos
   da matriz, antes de registrar caminho positivo. Testar TLS IP real e recuperação.
5. Executar testes unitários/integração MRD locais, lint/typecheck/build/smoke,
   audit/formatação e regressões MRD-012 com evidências novas. Classificar falhas
   reais/bloqueios Windows separadamente, sem alterar CI/gates para mascará-los.
6. Inspecionar diff e recursos restantes, confirmar zero acesso cloud, apresentar
   relatório G2 para revisão. MRD_LOCAL_VALIDATED só quando todos os gates locais
   realmente passarem; L1 remoto segue PENDENTE. Sem commit/push/deploy automático.

G2 não acrescenta workflow automaticamente: qualquer job MRD futuro exige escopo
expresso separado, sem credenciais cloud; o Quality/INT-02 existente permanece.
Se o SQL proposto não funcionar na versão fixada, falhar, documentar divergência
e revisar o literal/contrato antes de implementar alternativa; não inventar query
de fallback. Os quatro literais ainda exigem execução real em G2 para validade
sintática/runtime/planos, pois G1 somente os revisou documentalmente.

## 8. Fontes e evidências documentais

- [PostgreSQL 17 — funções de contexto e privilégios](https://www.postgresql.org/docs/17/functions-info.html).
- [PostgreSQL 17 — catálogo e estatísticas TLS](https://www.postgresql.org/docs/17/monitoring-stats.html).
- [PostgreSQL 17 — default ACL](https://www.postgresql.org/docs/17/catalog-pg-default-acl.html).
- [PostgreSQL 17 — PUBLIC e privilégios](https://www.postgresql.org/docs/17/ddl-priv.html).
- [Supabase — direitos herdados por roles](https://supabase.com/docs/guides/troubleshooting/custom-role-inherits-privileges-that-were-not-explicitly-granted-ddaa1c).
- [Supabase — segurança Data API](https://supabase.com/docs/guides/api/securing-your-api).

Fontes técnicas não são inspeção da conta. Evidência histórica local está em
[INT-02.1](INT-02-1-postgresql-ci.md); estados antigos permanecem históricos. G1
validará apenas links, Markdown, IDs, literalidade/shape documental, diff e escopo.
Não confundir parse Markdown com parse/execução SQL. **Encerrar na revisão humana.**
