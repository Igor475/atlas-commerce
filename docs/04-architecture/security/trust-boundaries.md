# Fronteiras de confiança — PSP, objetos digitais e operações

## TB-01 Cliente ↔ API

- Entrada pública/privada não confiável: preço, total, quantidade, papel, resource ID, `status`, cursor, URL, MIME e `redirect_uri` devem ser validados/autorizados no servidor.
- CORS não substitui autenticação. Proteções XSS e CSRF dependem de sessões/domínios; negar operações indevidas independentemente da UI.

## TB-02 API ↔ PostgreSQL

- Fonte de verdade de permissões, pedidos, estoque, eventos financeiros, reembolsos e entitlements. Constraints e locks para invariantes monetários e concorrência; leitura de outro módulo por contrato.
- Conexão usa identidade técnica restrita; migrations não usam conta de runtime privilegiada por comodidade.

## TB-03 PSP ↔ Pagamentos

- Checkout incorporado/sandbox é integração de alto risco, conforme [adendo ADR-004](../adrs/ADR-004-ADENDO-UI-EMBEDDED.md). Validar assinatura no raw payload, identidade do PSP, `event_id`, ID da tentativa/captura, valor e moeda, deduplicação durável e estados fora de ordem.
- URL de retorno não confirma pagamento. Reembolso precisa de operação estável, confirmação reconciliada; pagamento válido sem reserva entra em revisão/compensação.
- **Stripe é o fornecedor escolhido**; Stripe Checkout incorporado é o caminho do MVP em modo de teste, **ainda não homologado**. A janela 40/30/5 deve ser comprovada em Stripe test mode, incluindo sessão com mínimo 30m, atrasos de criação e resultados financeiros tardios.

## TB-04 Mídia pública ↔ objeto comercial privado

- Separar capas/prévias autorizadas de e-book/revista completos. Upload editorial valida extensão, tipo real, tamanho e isolamento; arquivos não verificados não são servidos ao público.
- Solicitação de entrega privada passa por autenticação, entitlement, licença e status. Presigned URL temporária não impede compartilhamento enquanto válida, nem garante DRM.
- Não permitir SSRF por URL editorial importada de terceiros sem política de hostname/protocolo/redirect/DNS.

## TB-05 Backoffice / Ops / CI ↔ dados e recursos

- Permissões por ação/recurso, segregação financeira, MFA privilegiado, minimização de PII em exportações, logs e auditorias; segredos fora do Git/bundle.
- Contrato de uso/retention de dados a documentar antes de release real; backup/restore testado. A inspeção administrativa de PII exige finalidade e trilha.

## Trust boundary tests propostos

SA-001/002/003/004/005/007/008/009/010/011/012 e casos CA-003/005/015–026.
