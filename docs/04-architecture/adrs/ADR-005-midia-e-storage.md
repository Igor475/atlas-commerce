# ADR-005 — Cloudflare R2 e proteção de mídia digital

> **Status:** DIREÇÃO ACEITA: fornecedor **Cloudflare R2**, utilização inicial **dentro da franquia gratuita Standard** por decisão explícita do responsável em 12/10/2026. **Não implementada ou homologada**; controles DS-005/006, SA-009/010, SEC-025–027 continuam pendentes.

## Escopo e decisão

- R2 será o object storage S3-compatible usado pelo NestJS, sem substituir PostgreSQL por metadados em arquivos e **sem Supabase Storage**.
- Conteúdo completo digital **sempre privado** (e-books, revistas completas e assets licenciados), com autorização de titularidade, compra/licença e estado da transação no backend, antes de cada concessão de link temporário.
- Capas e amostras autorizadas podem ser públicas e isoladas fisicamente em bucket/namespace diferente. A prévia não pode ser o mesmo objeto de conteúdo integral.
- Tokens R2 com menor privilégio possível, restringidos por bucket; credenciais exclusivamente no servidor, nunca em `NEXT_PUBLIC_*`, Git, cookies ou respostas JSON.
- Proposta de organização inicial em **ambiente demo**: `atlas-commerce-demo-public` para capa/prévia licenciadas e `atlas-commerce-demo-private` para integrais; nomes são **exemplos**, não buckets criados e podem mudar na implementação. Produção futura precisa de isolamento próprio, não reaproveitar credenciais ou permissões demo.
- Métodos S3 `GetObject`/`PutObject` com presigned URLs de curta validade **configurável** (baseline a ensaiar: 60 segundos para download, 5 minutos para upload editorial). O limite final depende de tamanho de arquivo, retry e política de usuário; URL assinada é bearer token e pode circular até expirar. **Não prometer DRM nem revogação instantânea de URL já emitida**.

## Franquia gratuita R2 (Standard, informação oficial consultada em 12/10/2026)

| Recurso | Inclusão mensal de referência | Atenção |
|---|---|---|
| Storage Standard | 10 GB-mês | Métrica GB-mês, não simplesmente tamanho momentâneo |
| Operações Class A | 1 milhão | Escrita, listagem e outras operações tarifadas |
| Operações Class B | 10 milhões | Leituras e operações tarifadas |
| Tráfego de saída | Sem tarifa R2 de egress | Outros serviços/serving/CDN podem ter custos separados |

**Free Tier não é teto automático de cobrança.** Acima das franquias, R2 pode cobrar; configurar alertas/limites operacionais e revisar faturamento Cloudflare antes de disponibilizar links públicos. A franquia grátis não se aplica à classe **Infrequent Access**; usar **Standard**. A franquia é por conta/período, não necessariamente por bucket.

## Upload, acesso e segurança

1. Validar autenticação e autorização editorial, tipo permitido (imagem/PDF após decisão de lista MIME), extensão, magic bytes, tamanho, limite de request, hash e quota. Inspecionar malware e sanitizar arquivos derivados/previews antes de publicação; objeto suspeito fica em quarentena privada.
2. Proibir SSRF ao importar mídia por URL; sem acesso direto a redes internas/metadados. Nunca aceitar object key arbitrária fornecida pelo cliente sem escopo e autorização.
3. O bucket privado mantém **public access desabilitado** (`r2.dev` e custom domain públicos desativados); `r2.dev` público é destinado a desenvolvimento não produtivo, não a prova de confidencialidade.
4. Na entrega de arquivo: sessão NestJS válida, entitlement por titular/item/licença, pedido pago e alocação física exigida para kits mistos, estado não revogado e object key mapeada server-side. Criar URL temporária GET somente então, com logs sem URL completa.
5. Política de revogação considera URLs já emitidas; se revogação imediata for requisito, migrar para proxy autenticado de curta duração e provar throughput. Não prometer que deletar entitlement faz URL R2 expirar.
6. R2 não substitui backup de banco: metadados/entitlements no PostgreSQL e objetos na R2 precisam de política de integridade e recuperação. Sem credenciais compartilhadas com outros sistemas.

## Alternativas rejeitadas ou condicionadas

- CDN/`r2.dev` com PDFs integrais públicos: **rejeitada**.
- Proxy de cada download pela Render Free: custo/latência e limite de processo, opcional somente por risco específico.
- Supabase Storage: **não adotado**; Supabase permanece somente PostgreSQL.

## Gate antes de código ou publicação real

Executar [R2-001–012](../VALIDACAO-VERCEL-R2-JOBS.md): buckets/políticas separados, negativas de acesso, TTL de URLs e fraude por link, validação de upload, SSRF, scanner, licenças, franquia/alertas e recuperação de objeto. Não subir documentos comerciais reais de terceiros ao demo sem direitos comprovados.

**Fontes oficiais:** https://developers.cloudflare.com/r2/pricing/ · https://developers.cloudflare.com/r2/api/s3/presigned-urls/ · https://developers.cloudflare.com/r2/buckets/public-buckets/ .
