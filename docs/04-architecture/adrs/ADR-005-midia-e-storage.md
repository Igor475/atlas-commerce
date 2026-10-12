# ADR-005 — Conteúdo digital protegido e storage

**Status:** ABERTA em fornecedor e implementação • DS-005/006. Separação público/privado é requisito, não escolha de cloud.

## Alternativas

- S3-compatible object storage com namespace/bucket de mídia comercial privado e prévias públicas separadas; URLs de curta duração emitidas pelo backend após entitlement.
- Streaming proxied pela API com checagem por requisição e custo de banda/CPU.
- CDN pública de arquivos integrais: **rejeitada** por SEC-025–027.

## Proposta de desenho

Conteúdo integral nunca recebe link público durável. Biblioteca consulta entitlement por titular/item/licença e estado; só então emite acesso temporário limitado. Arquivo protegido permanece privado; autorização de compra digital não é determinada pela posse de URL.

Uploads editoriais exigem formato/tamanho/validação real, isolamento e revisão de licença, incluindo prevenção de SSRF em ingestão por URL. Uma URL assinada pode ser compartilhada enquanto válida; sem prometer DRM ou revogação instantânea. Retenção e expiração dependem de DS-007.

## Gate

Escolher storage, estratégia de assinatura/TTL/escopo, tipos e limites, scan, licença por obra/edição, política de prévia e testes SA-009/010. Não publicar conteúdo de terceiros sem autorização.
