# QTE-POL-03 — TTL comercial e revalidação

**15/10/2026 · PROPOSTO · nenhuma mudança de TTL em código.**

[QTE-01](QTE-03-entrega-e-tempo.md) recebe TTL somente na fixture, sem default
comercial; 1–3600 segundos é limite técnico. Os 600 segundos de alguns testes
não ratificam dez minutos de validade comercial.

| Alternativa | Benefício                                                                | Risco e consequência UX                                                                 |
| ----------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 5 minutos   | Menor tempo de exposição a dados defasados                               | Mais expirações durante leitura/endereço/acessibilidade e mais recotações               |
| 10 minutos  | Equilíbrio simples entre revisão e atualização; recomendação QTE-DEC-004 | Ainda exige revalidação integral; pode expirar em espera por lock                       |
| 15 minutos  | Mais tempo para comparar/revisar                                         | Mais chance de preço/publicação/entrega mudarem antes da confirmação; não garante preço |

**Recomendação PROPOSTA: 10 minutos**, medidos pelo PostgreSQL após aquisição dos
locks necessários à emissão, com validade exclusiva no limite: `agora >= expiresAt`
recusa intenção nova. Esta escolha não estende reserva ou sessão financeira.
Contador no browser é informativo; cliente não determina elegibilidade nem renova
TTL. Para acessibilidade, explicar vencimento e permitir nova cotação conservando
o carrinho, sem estender automaticamente o mesmo snapshot.

## Revalidação e concorrência

| Situação                                             | Comportamento futuro recomendado                                                                                | Estado da evidência atual                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Preço/revisão mudou, inclusive redução               | Nova cotação e novo aceite; nunca corrigir total silenciosamente                                                | QTE local compara revisão e valores                                      |
| Produto despublicado, kit/componente alterado        | Recusar intenção nova e indicar necessidade de rever carrinho                                                   | Catalog/Quotes locais revalidam snapshot/publicação                      |
| Componente físico sem estoque                        | Cotação não compromete estoque; preparação recusa tudo se faltar qualquer SKU                                   | Reserva all-or-nothing local; nenhum estoque é reservado ao cotar        |
| Endereço, versão, opção ou política mudou            | Invalidar escolha para nova intenção e recotar; snapshot antigo permanece histórico                             | Entrega TEST_ONLY comparada; versão postal real ainda ausente            |
| Venceu antes ou durante espera pelo lock             | Refazer verificação no relógio DB após locks e após reserva/preparação; rollback integral se vencida            | QTE/ORD locais têm guardas antes/depois da espera                        |
| Retry de intenção já concluída, quote depois vencida | Recuperar o fato persistido com mesmo ator/operação/chave/fingerprint, sem segunda reserva                      | Replay técnico local implementado; contrato comercial ainda por integrar |
| Mesma chave com nova quote/payload                   | Conflito; não reinterpretar como retry                                                                          | Idempotência técnica local; CT-03 prevê 409                              |
| Nova cotação após expiração                          | Novo ID e novo prazo; não mutar a antiga; nova confirmação é nova intenção quando não houver resultado anterior | Emissão imutável local, consumo comercial aberto                         |

A implementação local compara todo JSON editorial e revisões: mesmo mudança de
título pode exigir recotação. A proposta conserva essa regra conservadora; reduzir
a comparação a campos "materiais" requer decisão/teste específico, não alteração
implícita. A validade significa elegibilidade para revalidação, não congelamento
irrevogável de preço nem garantia de estoque.

Proposta QTE-DEC-005: uma cotação comercial deve vincular-se a **uma única intenção
de checkout** por titular. Retries usam a mesma intenção; nova compra pede nova
cotação. Hoje QTE-01 não torna quote single-use: chaves diferentes podem criar
preparações distintas quando há saldo. A unicidade comercial precisará de guarda
persistida/constraint e prova concorrente futuras, sem chamar essa lacuna de bug
na fundação TEST_ONLY autorizada. Após timeout, localizar resultado da intenção
anterior antes de aceitar recotação como nova compra.

## Quatro relógios separados

| Prazo                              | Fonte/propósito                                                         | Status                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Quote comercial: 10 min            | DB após locks da emissão; limita intenção nova                          | **PROPOSTO**, não configurado comercialmente                             |
| Reserva física: 40 min             | DB na criação da reserva; não começa ao entrar no carrinho nem ao cotar | Política existente, prova local Inventory; integração comercial pendente |
| Checkout Session: 30 min propostos | Timestamps reais do PSP e versão API/SDK comprovada                     | **NÃO HOMOLOGADO**, não implementado                                     |
| Segurança: pelo menos 5 min        | `sessionExpiresAt <= reservationExpiresAt - 5min` para físicos          | Política existente, compatibilidade PSP **NÃO HOMOLOGADA**               |

Após commit da reserva, a criação externa não recebe dez minutos extras porque
a quote tinha esse TTL. A [ADR-004](../../04-architecture/adrs/ADR-004-psp-sandbox.md)
registra a restrição temporal; não fixamos SDK/API/`ui_mode` por inferência.
Se a sessão não satisfizer os timestamps absolutos, não expor prontidão ou client
secret; reconciliar tentativa. Não ajustar 40/30/5 para caber no fluxo proposto.

[UXD-16 ratificada](../contracts/UXD-16-RATIFICACAO-RESPONSAVEL.md):
`reservationExpiresAt` sempre presente no futuro CheckoutResult, timestamp
UTC/RFC3339 da reserva real para físico/misto; `null` para exclusivamente digital.
Digital ainda tem quote e prazo próprio da sessão PSP, sem reserva física artificial.

Aceitação QTE-POL-T03 planejada: limites 5/10/15, decisão no instante exato de
expiração, lock atravessando vencimento, preço/publicação/kit/endereço mudando,
replay pós-commit/pós-expiração, duas chaves concorrentes para mesma quote,
timeout ambíguo e negativa a timestamps enviados pelo browser. Ensaios Stripe
continuam separados em ST, sem reaproveitar testes locais como homologação.

Referências: [RN-016/032/034](../../02-business-requirements/REGRAS-DE-NEGOCIO.md),
[PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md),
[DB-02](../../04-architecture/database/DB-02-invariantes-e-locking.md),
[CT-03](../contracts/CT-03-erros-e-idempotencia-http.md).
