# F04-05 — Segurança de banco, CI e portabilidade do checkout

> **Status:** recomendações para implementar/testar, nenhuma permissão de projeto Supabase alterada.

## Papéis, Data API e RLS

O NestJS continua proprietário das regras de autorização. Não adotar Supabase Auth, Data API pública ou SDK do navegador para pedidos, estoque, sessão ou pagamento.

Separar três identidades conceituais: **runtime** com grants mínimos de negócio, **migration** com DDL apenas durante pipeline autorizado e **probe read-only** somente para avaliar conectividade. Nesta F04-05, não criar roles nem aplicar GRANT/RLS no Supabase; documentar o SQL/plano para aprovação futura. Se a conta de teste não tiver uma identidade readonly, o L1 **não começa**.

- Inventariar schemas expostos à Data API no Dashboard; idealmente não expor dados transacionais, usar schema privado e desabilitar Data API quando justificável.
- Se schema `public` ou outro estiver exposto, **RLS + grants mínimos** para todas as tabelas aplicáveis; negar acesso `anon`/`authenticated` a pedidos, sessão, ledger/refund e auditoria. `TO authenticated` sem predicado de recurso não basta.
- `SECURITY DEFINER` é privilegiado; não criá-lo para escapar de erro; revisar views e `security_invoker` quando houver views.
- URLs de DB, tokens, certificados privados, senhas, secrets e logs de integração ficam somente no backend ou secret store. Não colocar em `NEXT_PUBLIC_*`, CI em texto ou documentação.

## TLS e pool

- Backend persistente em IPv4: Supavisor **shared session mode :5432**; direct IPv6 apenas se provado. Transaction :6543 não suporta a mesma semântica de sessão/prepared statement e **não é fallback automático**.
- `sslmode=require` pode não validar hostname; com `pg` verificar cadeia e hostname/SNI com configuração efetiva do driver. Nunca usar `rejectUnauthorized:false` no remoto; se incompatível com CA, bloquear o L1.
- Pool `pg` é separado do Supavisor: tamanho total = pool por processo × réplicas + migrations + outros clientes. Medir limites do Free antes de fixar números de nuvem. Preservar timeout de aquisição, lock e statement.

## CI PostgreSQL verdadeiro

O GitHub Actions `Quality` em `main` está verde, mas não executa `pnpm --filter @atlas/api spike:test`. Criar, se viável, **job separado** no workflow já existente com `apps/api/compose.spike.yml`, projeto exclusivo `atlas-f0404-spike-ci`, porta loopback e a imagem PostgreSQL já fixada; executar migração da fixture, `spike:test` e cleanup **somente desse projeto**, inclusive na falha. Preservar `contents: read`, actions fixadas por SHA, frozen install e job principal intacto. Não compartilhar credenciais Supabase com o CI.

## Falha CRLF/LF observada

O relatório da F04-04 comprova que `pnpm check` no checkout Windows com `core.autocrlf=true` apresentou falha de formatação, enquanto uma cópia temporária normalizada LF passou. Investigar com `git ls-files --eol` e `git diff --check`. Se for possível corrigir sem mudar documentação normativa ou reformatar 37 arquivos alheios, adicionar `.gitattributes` **focado em código/config**, verificar implicações e rodar `pnpm check` **na árvore Windows original**. Não alterar Prettier para `endOfLine:auto` apenas para esconder o problema. Se exigir alteração ampla, registrar bloqueio.

## Status e relatório

Exigir evidência com HEAD, versões, comando e exit code, 22 casos SUPCON, 16 PGSP, diff, testes negativos, logs redigidos, resultados Windows/Linux e **CI remoto depois de push**. Não reportar a integração Supabase validada quando apenas o Docker local foi testado.
