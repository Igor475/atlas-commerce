# 02 — Mapa de módulos e fronteiras (monólito modular)

**Status:** proposta para API NestJS futura. O nome dos módulos é lógico; classes, packages e endpoints concretos **não existem** nesta etapa.

| Contexto/módulo lógico | Responsabilidade e dados sob sua autoridade | Não pode fazer | Regras-chave |
|---|---|---|---|
| Identity & Access | Credenciais, sessões, MFA, identidade humana, papel/permissionamento | Conceder acesso só porque UI mostra botão | RN-009–014, SEC-001–009 |
| Editorial Catalog | Obra, edição, produto, publicação, prévias autorizadas, mídia editorial | Aceitar upload sem política ou preço vindo do cliente | RN-001–008, SEC-010–013 |
| Pricing & Promotions | Preço vigente, cupom, descontos, cotação comercial derivada do servidor | Validar checkout com total do browser | RN-015–023, SEC-017–019 |
| Inventory | Estoque físico, reservas, alocação, expiração, ajustes rastreáveis | Reabrir reserva EXPIRED, efetuar débito sem transação | RN-024–031, 071–076, 088–089 |
| Checkout & Orders | Cotação aceita, snapshot, idempotência de checkout, lifecycle de pedido e vínculo aos itens | Declarar cobrança confirmada por redirect | RN-032–040, SEC-019/021 |
| Payments | Tentativa PSP, validação de webhook, fatos de captura, reconciliação, refund como estado financeiro | Delegar ao Checkout a autoridade de provar pagamento | RN-041–048, 077–087, SEC-020–024 |
| Digital Library | Entitlement por titular/item/licença, verificação para download/visualização | Publicar mídia integral em bucket ou CDN público | RN-049–054, 079, 087, 091; SEC-025–027 |
| Physical Fulfillment | Preparação de remessa, progressão por item, kit físico como unidade, devolução inspecionada | Aumentar estoque por reembolso sem inspeção | RN-055–063, 092–094 |
| Customer Support & Returns | Solicitação e enquadramento de arrependimento/atendimento, caso e decisão documentada | Indeferir automaticamente só por produto digital | RN-058–063, 085–087 |
| Backoffice & Audit | Casos de uso administrativos, trilha imutável lógica, evidência de alterações | Usar `is_admin=true` universal para operações financeiras | RN-064–070, SEC-003/005/028/030 |
| Integration & Messaging | Ports PSP/storage/email, inbox/outbox, retries e observabilidade de integrações | Usar evento de fila como prova final sem revalidar estado | RN-043–044, RN-070, SEC-016/024/034 |

## Contratos entre módulos

- **Command/query** dentro do mesmo processo via interfaces explícitas; não consultar tabelas de domínio de outro módulo diretamente do código consumidor.
- **Eventos de domínio** descrevem fato após transação, não instrução de atribuir novo estado sem guarda. Payload traz versionamento, ID estável, `correlation_id`, referência ao agregado, jamais credencial ou arquivo privado.
- **Aplicações** (storefront/admin) não usam acesso direto a PostgreSQL, Redis, R2/S3 ou PSP secret. O backend é a fronteira de autorização.
- **Payments** valida PSP e publica fato persistido de confirmação, mas a confirmação da **reserva** é competência de Inventory com guarda transacional.
- **Orders** controla transição do pedido; não torna digital ativo sem autorização da Digital Library e elegibilidade financeira/física.
- **Refund** financeiro e **return case** comercial têm vida separada; como módulo físico de código, podem compartilhar pasta Payments ou Returns conforme ADR, sem confundir ownership.
- **Observabilidade** é transversal; não transforma log em banco transacional ou registro de prova financeira.

## Dependências permitidas vs proibidas

**Permitidas:** módulos invocarem interfaces de aplicação do módulo dono, por `port` versionado; projetar leitura com visão materializada/cache invalidável; um serviço de aplicação orquestrar transação local coordenada para checkout, sem comprometer propriedade dos invariantes.

**Proibidas:** imports cíclicos; atualizações cruzadas de tabelas sem contrato; marcar `PAID` apenas por webhook não autenticado; conceder entitlement baseado em retorno do browser; tratar queue/Redis como ledger; mutation de snapshot de pedido após checkout; side effects de rede segurando `FOR UPDATE`.

## Arranjo de repositório — sugestão, não estrutura já criada

```text
apps/
  storefront/       # Next.js; cliente B2C
  admin/            # Next.js; backoffice (ou integrar em uma app via ADR)
  api/              # NestJS, monólito modular
  worker/           # opcional; somente se mensageria/replay justificarem processo próprio
packages/
  contracts/        # DTOs e esquemas públicos revisados; nunca entidades de banco expostas
  tooling/          # configuração compartilhada onde houver benefício real
docs/
  02-business-requirements/
  03-business-processes/
  04-architecture/
  07-security/
```

Não gerar diretórios nem bootstrap nesta etapa. Definir `worker` por ADR; alternativa válida: jobs recuperáveis no processo API com coordenação/lock, respeitando o host.
