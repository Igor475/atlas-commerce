# ID-04 — Decisões a resolver e condições de parada

| Assunto | Situação após a preparação | Tratamento seguro na ID-01 |
|---|---|---|
| Forma UXD-16 | **Ratificada pelo responsável** | Sincronizar documentalmente antes de módulo de domínio; Identity não a altera |
| ADR-003 | Direção de sessões opacas aprovada na baseline, arquivo original ainda contém gates de implantação | Implementar **cliente local** seguindo invariantes; não declarar autenticação pública homologada |
| Valores TTL | Cliente 12h absoluta / 30min idle da baseline, staff 8h / 15min propostos | Valores configuráveis, bounded e testados; staff não implementado nesta entrega |
| Hosts, RP ID, CORS, cookie `__Host-` | Sem domínios publicamente validados; grafia do cookie diverge no material anterior | Testar via origem local controlada; produção fechada por padrão; registrar nome decidido e contratos |
| Verificação/recuperação por e-mail | Provedor API HTTPS ainda não escolhido; Render Free não suporta SMTP normal como caminho confiável | Adapter fake somente em testes isolados; outbox durável; envio público disabled/fail-closed |
| WebAuthn/TOTP e primeiro staff admin | Estratégia preferida WebAuthn mas RP ID/onboarding e recovery ainda não homologados | **Não expor staff login, criar staff seed, MFA bypass, nem sessões staff** |
| DS-003 financeira | Alçadas, step-up e matriz de poderes não fechadas | Negar todas operações privilegiadas; nenhum `role` de cliente dá capability |
| Prisma/migrations Identity | Só fixture `spike` existente e probe read-only F04-05 | Isolar schema/migrations e provar não alteração; nenhum DDL no Supabase |
| Supabase Free L1 | Não autorizado/validado | PostgreSQL efêmero em local e CI, não usar credencial remota nem provisionar serviço |
| Política antiautomação | Requer implementação proporcional e persistente | Não depender de store in-memory; documentar limites/impacto antes de habilitar público |
| Políticas de dados/e-mails | LGPD, retenção e templates públicos não homologados | Minimizar dados, sem política jurídica inventada nem comunicação de e-mail fictícia |
| FD-05 Coleção Viva | Direção criativa aprovada, telas ainda em planejamento | Nenhum componente Next.js de login/cadastro criado nessa etapa |

## Ordem segura dos trabalhos

1. Ratificar UXD-16 em índices/contratos via prompt documental e validar CI.
2. Começar **ID-01 Identity Customer** apenas com migrações locais/CI, feature gates e segurança comprovada.
3. Separadamente decidir provedor de e-mail, política final de cookies/origens e concluir Supabase L1 antes de expor cadastro/recovery na Internet.
4. Separadamente projetar e homologar **Identity Staff + MFA WebAuthn/TOTP**; só então liberar login do admin e operações sensíveis.
5. Seguir FD-05 no design: mockups, revisão humana, frontend Next.js somente após direção detalhada aprovada.

## Quando o Codex deve parar

Se houver conflito de contrato que altere RN/SEC/ADR, impossibilidade de isolar migrations, necessidade de credenciais de projeto real, provedor SMTP inseguro, downgrade de staff MFA, cookies compartilhados entre hosts, chaves de autenticação expostas ou testes impossíveis de execução, **não improvisar substituto inseguro**. Mostrar diagnóstico e solicitar decisão precisa.
