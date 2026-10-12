# F04-02 — Módulos, propriedade de dados e dependências permitidas

> **Tipo:** contrato arquitetural de engenharia, sem módulos NestJS implementados. Tradução fiel da [divisão lógica da Fase 03](../04-architecture/02-modulos-e-fronteiras.md), não novo catálogo de regras.

## Camadas internas esperadas (quando Codex criar código)

```text
modules/<nome>/
  domain/           # invariantes, entidades/agregados, estados, sem framework e DB
  application/      # comandos, consultas, ports, transações coordenadas
  infrastructure/   # repository Prisma/SQL, PSP/email/R2 adapters, mappers
  presentation/     # controladores HTTP, auth guards, DTOs locais
  <nome>.module.ts  # composition root do módulo
```

É um padrão **orientador**, não regra inflexível de criar quatro pastas vazias por módulo. Código mínimo primeiro, refino quando necessário. Não confundir DTO de transporte com AggregateRoot e nem model do Prisma com contrato público.

## Responsabilidade por módulo

| Módulo NestJS | Escrita e verdade sobre | Dependência por interface permitida |
|---|---|---|
| `identity` | credenciais, sessões, MFA, roles/capabilities | auditoria, notificações via port |
| `catalog` | obras/edições, produtos publicados, composição editorial | mídia via port, preços via query |
| `pricing` | preço/cotação/cupom e reserva de uso | catálogo publicada, Orders request |
| `inventory` | saldo, ledger, reserva/allocation e expiração | comandos orquestrados por checkout/fulfillment |
| `orders` | snapshots imutáveis, estado de pedido, checkout idempotente | catálogo/pricing/inventory/payments por ports |
| `payments` | Stripe, fatos financeiros, capture/refund/reconciliação | Orders/Inventory por orquestração controlada |
| `library` | entitlement, biblioteca, licenças/acesso digital | Order eligibility, Storage port |
| `fulfillment` | expedição, retorno físico e inspeção | Inventory por port |
| `returns` | casos de pós-venda, solicitações de arrependimento | Payments refund e Fulfillment por casos de uso |
| `backoffice-audit` | ações administrativas e evidência de decisão | Identity autorização por recurso/ação |
| `integration` | outbox/inbox, mapeamento de fornecedores, eventos duráveis | owner de mensagem, consumidores idempotentes |

## Política de dependência

- **Domain → sem NestJS, Prisma, Stripe, Supabase, R2, Next, filesystem ou HTTP.** `application` depende de `domain` e ports, não das implementações dos adapters. `infrastructure` depende dos ports da aplicação/domínio, `presentation` delega ao caso de uso.
- Intermódulo: expor **application service/port/query/contract**, não entity nem repository interno de módulo vizinho. Resolver interações sem imports cíclicos ou `forwardRef` por conveniência.
- Transação local de múltiplos agregados: coordenar **uma conexão/transação do PostgreSQL** sob serviço de aplicação autorizado, com port explícito e sem chamada externa sob lock; documentar quem decide commit ou rollback.
- Não importar `apps/api` dentro de `packages/contracts`; `packages/contracts` não pode depender de API e Web. Não colocar usuário, cupom, pedido, estoque e refund num `CommonService` gigante.
- Valores de dinheiro em centavos inteiros, estado financeiro separado de fulfillment; permissões e titularidade checadas no NestJS, não apenas na UI.

## Fluxos transversais e segurança

A autoridade do PSP pertence a **Payments**, que aceita somente evidência verificada (signature, body bruto, IDs/valor/moeda). **Inventory** decide a reserva sob lock e hora do DB, **Orders** decide estado comercial, **Library** só concede direito após condição financeira e física integral (kits). Um replay nunca repete estoque, captura, refund ou entitlement.

### Arquitetura verificável

Quando houver código, verificar imports proibidos com regra de lint/dependency graph; adicionar testes de fronteira por módulo; não considerar simplesmente a existência de pastas como isolamento. Ref. [ADR-002](../04-architecture/adrs/ADR-002-integridade-outbox.md), [ADR-006](../04-architecture/adrs/ADR-006-acesso-dados.md), [SA](../07-security/security-requirements.md).
