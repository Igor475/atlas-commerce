# F04-05 — Estado após publicação no GitHub

> **Data da conferência:** 13/10/2026. **Branch `main` verificada:** `f79e16602480b9e75efbc72179f068fb590ca04f`. Auditoria baseada no relatório fornecido e no GitHub Actions, **não** em nova execução local de testes por este documento.

## Confirmado diretamente pelo GitHub

- CI `Quality` execução `38415996707`: **conclusion: success** no commit `f79e166`.
- Job `checks`: checkout, Node, Corepack/pnpm, instalação frozen, `pnpm check`, `git diff --check` passaram no runner Linux.
- Job `postgres-integration`: subiu PostgreSQL descartável, aplicou a fixture migration, executou `spike:test` e limpou somente o projeto CI; todos os passos passaram.
- Código F04-05 (`probe-config`, `probe-driver`, `probe-readiness`, testes de conexão e workflow) está publicado.

Fonte: https://github.com/Igor475/atlas-commerce/actions/runs/38415996707

## Segundo relatório do Codex (evidência local, não reproduzida aqui)

- F04-05 L0: 9/9 testes de conexão local com TLS/readonly, reconexão/readiness, e PGSP 16/16, com resultados de log.
- `pnpm build` e `pnpm check` Windows não concluíram por travamento observado no build Next.
- `pnpm format:check` no Windows falhou por CRLF de arquivos antigos (34 arquivos). `pnpm check` em Linux CI **passou**, logo a falha não é reproduzida nessa execução remota.
- Não houve autorização L1, acesso remoto a Supabase, migrations cloud ou projeto provisionado.

## Gates e estado atual

| Gate | Estado |
|---|---|
| SUPCON-01/03–15 | Local relatado como PASS, revisar evidências por caso |
| SUPCON-02 | **CI Linux satisfaz o gate de build; Windows local segue pendente** |
| SUPCON-16 | **Passou no GitHub Actions pós-publicação** |
| SUPCON-17 | **Linux CI passou; Windows CRLF continua pendente** |
| SUPCON-18–22 | **BLOCKED-NO-REMOTE**, sem autorização de projeto/role readonly |

O resultado é **L0 operacional com evidências locais e remotas positivas, porém sem homologação Supabase real e com problema Windows a tratar**. Não promover ADR-006/010 a 'homologado para produção'.

## Recomendação antes de novo deploy ou L1

- Investigar separadamente o build Next no Windows, com captura de processo/ambiente/código de saída e comparação com Linux. Não alterar componentes Next fora da tarefa autorizada.
- Planejar tratamento disciplinado LF/CRLF (ex.: `.gitattributes` + renormalização **autorizada e revisada por diff**), sem reduzir qualidade do Prettier nem formatar/recriar documentos normativos como efeito colateral.
- Quando o usuário aprovar projeto Supabase Free dedicado e identidade readonly, projetar L1 estritamente SELECT/TLS/pool/grants, sem migrations/DDL/RLS mutantes.
- Não inserir segredos ou URLs completas nos logs, Markdown ou imagens; nenhuma alteração em Render/Vercel/Stripe/R2 por inferência.
