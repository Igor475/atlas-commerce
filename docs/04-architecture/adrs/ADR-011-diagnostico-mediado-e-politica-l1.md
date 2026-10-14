# ADR-011 — Política L1 estrita e diagnóstico mediado no Supabase PostgreSQL

> **Atlas Commerce · Status:** PROPOSTA DE RATIFICAÇÃO — direção de diagnóstico mediado escolhida pelo responsável em 14/10/2026; não implementada, não homologada.  
> **Data:** 14/10/2026 · **Referências:** ADR-006, ADR-008, ADR-010, INT-02, INT-02.1, INT-03, SEC-001–038, SUPL1-001–015.  
> **Escopo:** decisão sobre mecanismo de diagnóstico de metadados. Não decide políticas de runtime comercial, Auth, Storage, backups ou migrations.

## Contexto e problema

O Atlas Commerce utiliza PostgreSQL gerenciado no Supabase Free como fonte de verdade; o NestJS acessará o banco por uma credencial de runtime segregada, e não pela Data API. A autenticação humana permanece no NestJS; a mídia permanece no Cloudflare R2. O projeto Supabase **Atlas Commerce** possui ref pública `bkxrsgryzkgpwgkngieh`, na região `sa-east-1`. A desativação da **Data API foi informada pelo responsável** em 14/10/2026, mas não há evidência de inspeção independente do toggle nem de teste HTTP negativo nesta ADR.

A L1 publicada nos documentos INT-02 e INT-02.1 exige que uma credencial SQL de diagnóstico seja estritamente incapaz de escrever, mesmo se alguém obtiver acesso SQL arbitrário com ela. Esse é um requisito **da identidade PostgreSQL**, não apenas da lista de comandos emitidos por um programa.

As evidências levantadas em 14/10/2026 indicam `TEMP` herdado de `PUBLIC` no banco `postgres` e `EXECUTE` nas funções nativas como `lo_create(oid)`. `NOINHERIT` não retira direitos de `PUBLIC`; `default_transaction_read_only=on` pode ser alterado por sessão. Em Supabase gerenciado, nem todos os grants de funções nativas ou schemas de plataforma são revogáveis pelo usuário do projeto. As provas locais de INT-02.1 diferenciam negação de DML comercial da impossibilidade de qualquer escrita no banco.

**Portanto, L1 SQL estrita permanece PENDENTE / não comprovada.** A inexistência de tabelas comerciais ou a desativação da Data API não elimina esse bloqueio.

## Alternativas examinadas

| Alternativa | Benefício | Limite/risco | Decisão |
|---|---|---|---|
| Revogar `PUBLIC` globalmente no Supabase | Reduz algumas capacidades efetivas | Impacto transversal em serviços do provedor; permissões nativas não controláveis; não garante L1 estrita | **Rejeitada para esta etapa** |
| Role `NOINHERIT` com `default_transaction_read_only=on` | Boa defesa contra escrita acidental | `PUBLIC`, funções e alteração de configuração de sessão persistem | **Insuficiente como prova L1** |
| Banco PostgreSQL isolado com ACL integralmente controlada | Pode suportar prova de credencial SQL estrita, sob inventário/validação | Custo operacional e nova arquitetura | **Alternativa futura condicionada** |
| Diagnóstico mediado com consultas fixas e credencial guardada em executor confiável | Restringe o que a ferramenta/caller pode pedir e não exige mudar grants globais | **Não transforma a credencial em SQL estritamente read-only**; depende da confiança no mediador e sua cadeia de execução | **Direção selecionada para estudo e implementação posterior**, sob nova garantia distinta |

## Decisão proposta

1. **Manter a L1-SQL estrita inalterada e fail-closed.** O resultado `READONLY_PROVEN` continua reservado exclusivamente ao detector original e aos seus critérios. Não afrouxar SQL, testes, fixture, configurações nem mensagens para contornar `ROLE_UNSAFE`. Não provisionar ou habilitar LOGIN em `atlas_l1_readonly` nesta etapa.
2. **Criar uma trilha separada chamada `MRD` — Mediated Read Diagnostics** (diagnóstico mediado de leitura). `MRD` prova comportamento de um programa que só disponibiliza operações nominativas, parametrizadas e previamente revisadas. **MRD aprovado não implica L1 aprovado.**
3. **Preferir primeira implementação como CLI operacional isolado**, chamado explicitamente por operador autorizado, sem rota HTTP ou integração no `AppModule`, sem execução no navegador, worker comercial, CI com secrets ou startup automático. Qualquer API futura exige nova ADR/ameaças/segurança e consentimento.
4. **Credencial interna distinta** das roles de migration, runtime comercial, `postgres`, `service_role`, `anon` e `authenticated`. Quando se autorizar a implementação remota, avaliar grants efetivos da identidade mediadora (incluindo `PUBLIC`, funções, membership, ownership e parâmetros), concedendo somente o necessário. A credencial nunca pode ser compartilhada com o chamador e não é garantia L1 estrita.
5. **Allowlist fechada de operações**, definida em código revisado, para `SELECT` de metadados expressamente aprovados e `SELECT 1`. Rejeitar SQL enviada pelo usuário, fragmentos, nomes dinâmicos de objeto, identificadores livres, operações derivadas de SQL parseada apenas por prefixo, chamadas a funções com efeitos colaterais e leitura de dados pessoais. Argumentos, se inevitáveis, têm tipo/enum/limites e binding parametrizado; preferir zero argumentos no MVP.
6. **Fronteira de confiança explícita:** a segurança do MRD é uma propriedade da interface, do executor, dos controles de acesso, das consultas fixas, da gestão de segredos e dos testes; um invasor com acesso à credencial SQL fora do mediador poderá explorar os privilégios efetivos que o PostgreSQL ainda conceder.
7. **Respostas mínimas e seguras:** apenas enumerações de status e métricas/sinais aprovados, sem connection string, senha, CA privada, tokens, SQL dinâmico, stack trace, identificadores de usuário, valores comerciais ou resultado bruto de tabelas. Auditoria do operador, versão/commit, ambiente, IDs das operações, decisão, duração e falhas com redaction.
8. **Fail-closed e consentimento:** sem identidades, CA/hostname, inventário, projeto correto, confirmação independente de Data API desligada ou autorização explícita para remoto, retornar BLOQUEADO sem socket remoto. Recuperação não pode promover status automaticamente.
9. **CI local isolado:** testes de contrato, segurança e regressão usam PostgreSQL 17 descartável/loopback, sem host ou segredo remoto. Testes negativos em ambiente descartável não equivalem à prova de segurança no provedor.
10. **Sem impacto na arquitetura comercial:** não alterar NestJS Identity, Prisma comercial, Vercel/Render, Stripe, R2, schema, migrations ou política de dados por consequência desta decisão.

## Estados e afirmações permitidas

- `L1_SQL_STRICT`: `PENDENTE` (nenhuma prova efetiva remota homologada). O detector original não muda.
- `MRD_DOCUMENTED`: somente quando esta proposta e os contratos forem integrados/revisados; **sem código**.
- `MRD_LOCAL_VALIDATED`: exclusivamente após CI/testes de mediação aprovados em banco descartável, sem direito de inferir segurança SQL remota.
- `MRD_REMOTE_VALIDATED`: somente em autorização separada, com execução real registrada e revisão de permissões/endpoint/TLS/Data API; **não equivale a `READONLY_PROVEN` nem homologação de produção**.
- `MRD_BLOCKED` / `MRD_UNVERIFIED`: erro, falta de evidência ou precondição não satisfeita; sem downgrade para sucesso.

Nenhum desses estados autoriza migrations comerciais, acesso a PII ou integração HTTP pública.

## Consequências, riscos e critérios de reversão

- **Positivo:** preserva o Supabase Free, diminui a superfície operacional de consulta arbitrária e demonstra separação de garantias no portfólio.
- **Negativo:** acrescenta código de segurança, auditoria, suporte e testes; a cadeia de execução passa a integrar o modelo de ameaça. Um mediador comprometido ou sua credencial exfiltrada não herda a segurança de uma role SQL estrita.
- **Alternativa de máxima garantia:** se uma auditoria futura exigir impossibilidade de escrita por credencial, manter bloqueado até existir banco/ambiente com controle suficiente para prova negativa sem exceções de conveniência.
- **Rollback:** desabilitar/remover o mediador independente sem modificar L1 ou a aplicação comercial; nenhum rollback de grants remotos é necessário nesta fase documental.

## Gates de aprovação e implementação

- [ ] ADR/contrato MRD revisados e ratificados documentalmente, com responsáveis, fronteira de confiança e classificação da garantia.
- [ ] Auditoria de `PUBLIC`, funções com efeitos colaterais, defaults de objetos futuros, grants, RLS e schemas expostos no planejamento das migrations comerciais.
- [ ] Confirmação independente da Data API desligada no Dashboard e prova negativa HTTP autorizada, sem atribuir essa evidência à L1.
- [ ] Autorização **separada** para codificar MRD; depois aprovação de testes isolados e regressão INT-02 sem alterações.
- [ ] Autorização **separada** para qualquer conexão remota, criação de role, credencial ou operação SQL no Supabase.
- [ ] Prova remota e relatórios com status MRD e L1 distintos; nenhuma liberação comercial automática.

## Fontes e evidências

- Código existente: `apps/api/src/infrastructure/persistence/l1-config.ts`, `l1-diagnostic.ts`, `l1-queries.ts`, `apps/api/scripts/supabase-readonly.mjs`.
- Evidência versionada: `docs/05-engineering/integrations/INT-02-1-postgresql-ci.md` e `apps/api/test/supabase-l1/RESULTS.md`.
- Supabase: https://supabase.com/docs/guides/troubleshooting/custom-role-inherits-privileges-that-were-not-explicitly-granted-ddaa1c
- Supabase Data API: https://supabase.com/docs/guides/api/securing-your-api
- PostgreSQL 17 (privilégios): https://www.postgresql.org/docs/17/ddl-priv.html

**Responsável técnico:** a definir · **Aprovador:** a definir · **Data de ratificação formal:** pendente.
