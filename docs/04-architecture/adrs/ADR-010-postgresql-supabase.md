# ADR-010 — Supabase como provedor PostgreSQL do Atlas Commerce

> **Status:** **PROVEDOR ACEITO** explicitamente em 12/10/2026; **PLANO SUPABASE FREE ACEITO, CONECTIVIDADE/SEGURANÇA NÃO HOMOLOGADAS, SEM IMPLEMENTAÇÃO.**  
> **Versão:** 0.2.0 • **Dependências:** APP-02/03/05/09/12/13/14/19; ADR-002/003/005/006/007/008/009; DA-014; DS-001/003/007/008; SEC-001–038.

## Decisão

1. **Banco gerenciado:** Supabase PostgreSQL como **fonte de verdade** dos pedidos, snapshots, estoque, pagamentos, reserva, refunds, sessões de identidade NestJS, inbox/outbox e entitlements.
2. **Plano:** **Supabase Free escolhido explicitamente** para portfólio pessoal não comercial. Upgrade e contingência de backup/limites serão avaliados antes de operação sustentada ou comercial; não criar infraestrutura automaticamente.
3. **Autenticação humana:** NestJS Identity com sessão opaca, cookies/CSRF e WebAuthn/TOTP segundo a ADR-003. **Não adotar Supabase Auth** por esta decisão.
4. **Arquivos digitais:** Cloudflare R2 continua escolhido pela APP-09/ADR-005. **Não adotar Supabase Storage** por inferência.
5. **Acesso a dados:** NestJS → driver PostgreSQL + **Prisma ORM v7 + `@prisma/adapter-pg`** como baseline a homologar. SQL parametrizado crítico deve usar a mesma conexão/transação com locks e constraints. Supabase REST/Data API, Realtime, Edge Functions e pg_cron **não foram aprovados**.
6. **Separação de ambientes/segredos:** credenciais runtime e migrations segregadas; nunca URL/usuário/senha de Postgres no navegador, no bundle Next.js, em logs ou Git. Secrets só nos stores de variáveis protegidas.

## Conectividade Render Free → Supabase

- A Render hospeda um backend Web Service **persistente enquanto acordado**, mas Free pode pausá-lo; reconexão do driver em cold start deve ser testada.
- Priorizar **Supavisor shared pooler `session mode` (porta 5432)** quando a Render não tiver conectividade direta IPv6 comprovada. O shared pooler oferece entrada IPv4 no Supabase, apropriado a backends persistentes em redes IPv4. **Obter string exata no Dashboard > Connect**, não construir hostname a partir de exemplos.
- Conexão direta IPv6 `db.[PROJECT-REF].supabase.co:5432` só se a rede suportar IPv6; não assumir suporte na Render Free. `transaction mode` (`:6543`) foi projetado principalmente para conexões curtas/serverless, tem incompatibilidades com sessão e prepared statements; **não adotá-lo por padrão**. Caso necessário, exige spike Prisma e ajustes compatíveis.
- **TLS obrigatório**, verificar certificados/hostname quando suporte do driver permitir; `sslmode=require` não equivale por si só a validação completa do servidor. Pool pequeno inicial para Render Free, com versão Prisma/driver/adapter e `max_connections` realmente medidos; nenhum número de conexões definitivo foi aprovado.
- **Migrations:** executar por processo controlado com privilégios adequados. Preferir ligação direta para ferramentas nativas quando viável, mas demonstrar conectividade IPv6; caso contrário testar uso do pooler de sessão para o workflow escolhido. Não conceder privilégios de migração ao runtime só por conveniência.

## Proteção de dados e Data API do Supabase

- Usar **PostgreSQL de backend**, com camada NestJS de autorização, não clientes Supabase públicos para consultar pedidos, sessões ou saldo.
- Se a **Supabase Data API** não for utilizada, **desabilitá-la quando aplicável**, ou colocar tabelas transacionais em schemas não expostos e revogar privilégios públicos. **Qualquer tabela em schema exposto, incluindo `public` quando exposto, deve ter RLS e grants mínimos adequados**. Não confiar em apenas esconder `anon` key nem em negar acesso pela UI.
- Uma conta DB privilegiada que ignora RLS torna guards de NestJS, controle de recurso e privilégio mínimo ainda mais críticos; criar papel runtime restrito e papel deploy separado. Não conceder `bypassrls` indiscriminadamente nem usar `SECURITY DEFINER` para contornar erro de acesso.
- LGPD: retenção, anonimização, base legal, criptografia em trânsito, backup e auditoria permanecem governados por SEC e DS-007, sem inventar conformidade certificada.

## Limitações Free e risco operacional

- Supabase **Free pode ser pausado** quando houver pouca atividade na janela de 7 dias; uma retomada manual pode ser necessária. Não confundir com a pausa da **Render Free a cada 15 min ociosos**: as causas, efeitos e recuperação diferem.
- Supabase **Free não disponibiliza backups diários gerenciados** como planos pagos. Para portfólio, preparar exportação lógica periódica controlada fora do runtime Render Free, armazenamento protegido off-site e **restauração de verdade ensaiada**, respeitando acesso/mínimo de dados. Exportações não substituem PITR.
- Render Free também **não garante execução contínua de jobs**. Outbox, reserva e refund continuam persistidos no Supabase, mas replay/cleanup só ocorrem quando há executor disponível e legítimo. **Nunca prometer expiração física pontual, 24×7, readiness ou refunds imediatos** nessa topologia.
- Para efetuar **vendas reais** futuramente, formalizar upgrade/solução de disponibilidade para backend/job e banco, backup e restore, monitoramento e políticas legais/fiscais; nenhuma cobrança real autorizada no MVP demonstrativo.

## Critérios de aprovação técnica / gates

- [x] Fornecedor PostgreSQL escolhido: **Supabase**.
- [x] **Plano Free aprovado** para demonstração. **Região, limites efetivos e configuração reais continuam pendentes**.
- [ ] Conexão Render Free → Supabase via TLS, IPv4 session pooler ou IPv6 verificado e queries parametrizadas; variação de restart/cold start.
- [ ] Prisma v7 e `@prisma/adapter-pg`, query raw na mesma transação, migrations e pool total comprovados.
- [ ] Inventário de schema exposto, Data API/RLS/grants, separação de usuários, teste negativo sem bypass.
- [ ] Exportação/restauração, concorrência e controles de privilégio comprovados; documentos DB-001–028, AUTH, SA/ST e SUPABASE-001–016.
- [ ] Jobs fora do ciclo de vida do Render Free antes de afirmar pontualidade/reconciliação ou fechar gate de pagamentos.

**Estado final:** provedor decidido, não criado nem homologado. [Guia de conexão](../CONEXAO-RENDER-SUPABASE.md) · [Plano de validação](../VALIDACAO-OPERACIONAL-SUPABASE.md).

### Fontes oficiais verificadas em 12/10/2026

- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/database/prisma
- https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/platform/backups
- https://render.com/docs/free


## Adendo operacional para o plano Free aprovado

A modalidade **Free** inclui banco PostgreSQL com limite anunciado de **500 MB** de dados, podendo colocar o projeto em **modo somente leitura** ao exceder a cota. É possível suspensão por baixa atividade numa janela de sete dias. **Não oferece backups diários gerenciados nem PITR** como substituto de recuperação. Planejar dump lógico independente e restore em instância segregada, sem tratar cron/serviço Free como agendador resiliente.

Autenticação permanece no NestJS, armazenamento no Cloudflare R2. O pooler de sessão e as credenciais são definidos com a conexão real da Render Free; nunca expor conexão DB ao browser. Este documento não cria o projeto nem comprova a capacidade/cota consumida.

**Status de decisão:** fornecedor + plano aprovados, **gates SUPABASE-001–016 não executados**. Ver [consolidação](../CONSOLIDACAO-FINAL-FASE-03-v0.5.md).
