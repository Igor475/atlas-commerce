# INT-04 — Configuração, provedores e origens (sem segredos)

**Documento de orientação, não é um `.env` real e não deve ser copiado cegamente sem validar os nomes definidos no código.**

## Resend / local

| Configuração sugerida | Tratamento |
|---|---|
| `RESEND_API_KEY` | Apenas backend local e secreto (não Git); key com mínimo escopo suportado |
| `IDENTITY_MAIL_PROVIDER=resend` | Só habilitar no perfil local explicitamente seguro; não basta env presente |
| `IDENTITY_MAIL_FROM` | `Atlas Commerce <onboarding@resend.dev>` **apenas no teste restrito**; domínio próprio verificado futuramente |
| `IDENTITY_MAIL_TEST_TO` | Caixa correspondente à conta Resend autorizada, valor privado |
| `IDENTITY_MAIL_DISPATCH_ENABLED` | Default falso; usar runner explícito, sem background eterno/Render Free |
| `IDENTITY_PUBLIC_SITE_ORIGIN` | Definir exatamente host local onde existirá UI; não usar host de request; ainda sem páginas finais |
| `IDENTITY_PROFILE` | Preservar fail-closed e `local-disposable` existente; nova configuração precisa de guardas |

**Restrições:** e-mail a outras caixas exigirá domínio verificado; endereço do site (`*.vercel.app` ou `*.onrender.com`) não serve como domínio remetente Resend. API HTTPS sai do NestJS, jamais browser. Não enviar token por log ou tracking. O `onboarding@resend.dev` é do provedor e não identifica domínio de Atlas.

## Supabase / local de desenvolvimento

| Conceito | Fonte |
|---|---|
| Project ref público (não senha) | Dashboard Supabase → projeto Atlas Commerce → URL/id do projeto |
| URL/host runtime | Botão **Connect** do projeto → **Session pooler**, porta 5432 quando IPv4 |
| Credencial role L1 readonly | Criada/autorizada sob permissão do responsável, mantida fora de Git |
| TLS/CA | Validar hostname/certificado, usar `rejectUnauthorized:true`/trust chain apropriada |
| Serviço Identity com escrita | Etapa INT-03 futura, credencial runtime menos privilegiada **diferente** de L1 readonly |
| `DATABASE_URL` | Apenas backend; nunca `NEXT_PUBLIC_`, nunca logs |

O usuário relatou a criação de projeto Atlas no Supabase. Na conexão Supabase disponível nesta conversa, o projeto não apareceu na listagem. Pode existir em outra organização/conta. **Não usar projetos ERP ou forçar conexão por semelhança.**

## Vercel/Render temporários — NÃO CONFIGURAR AGORA

- Hoje tudo local; pode usar `http://127.0.0.1:3000` ou `http://localhost:3000` conforme a porta/origem realmente testada, mas **não misturar** hostnames diferentes no cookie/CSRF.
- Depois, frontend loja e admin terão hosts **exatos** separados, cookies `__Host-` Secure/HttpOnly sem Domain e validação real de CSRF + proxy same-origin. Ex.: placeholder `<storefront-host>.vercel.app` NÃO é valor a incluir em config ou docs como host existente.
- Render servirá API, mas o cookie browser será host-only para a origem da loja/admin via encaminhamento verificado; cache público de HTML privado proibido.
- Wildcards `*.vercel.app`, `*.onrender.com`, allow-all em Origin, `trust proxy` amplo e RP ID WebAuthn inventado estão proibidos.
- Envio de e-mail, login público, staff MFA, Stripe Embedded e Cloudflare R2 ficam bloqueados até seus gates específicos.

## Comandos e ações que dependem de autorização futura

- Criar ou editar role/schemas/DDL Supabase, rodar prisma migrate, criar tabela ou usuário no projeto remoto;
- Enviar mensagem Resend a destino real, configurar domínio e DNS;
- Criar/ativar serviço Render, deployment Vercel ou public webhooks.

Essas ações não estão autorizadas por este pacote.
