# DS-003 — Matriz de autorização proposta

> **Status:** PROPOSTA PARA ADR, não habilitada nem aprovada. As permissões são granulares por ação **e por recurso**. Não é uma matriz de roles implementadas.

Legenda: `P` = pública; `O` = somente recurso do próprio titular; `R` = ação com permissão explícita; `A` = aprovação separada e step-up; `S` = identidade de serviço escopada; `—` = negar.

| Ação/recurso | Visitante | Cliente autenticado | Editor catálogo | Operador estoque | Atendimento | Financeiro solicitante | Financeiro aprovador | Admin segurança | Serviço técnico |
|---|---|---|---|---|---|---|---|---|---|
| Consultar catálogo publicado / prévia liberada | P | P | P | P | P | P | P | P | — |
| Ver pedidos e endereços pessoais | — | O | — | — | — | — | — | — | — |
| Checkout e pagamento próprios | — | O | — | — | — | — | — | — | — |
| Download/visualização privada adquirida | — | O | — | — | — | — | — | — | S, apenas emissão autorizada |
| Publicar/retirar item e metadados editoriais | — | — | R | — | — | — | — | — | — |
| Enviar mídia editorial privada | — | — | R com limites e inspeção | — | — | — | — | — | S, scanner isolado |
| Ajustar estoque (com justificativa) | — | — | — | R | — | — | — | — | — |
| Listar pedido de outro cliente para atendimento | — | — | — | — | R, com finalidade e escopo | — | — | — | — |
| Registrar devolução/arrependimento | — | O | — | — | R | — | — | — | — |
| Solicitar reembolso manual | — | — | — | — | R, encaminhar caso | R | — | — | S, somente compensação RN-078 |
| Aprovar reembolso manual | — | — | — | — | — | — | A | — | — |
| Executar / conciliar refund junto ao PSP | — | — | — | — | — | — | — | — | S, após decisão elegível persistida |
| Gerir permissões/MFA de equipe | — | — | — | — | — | — | — | A, exceto autoatribuição financeira | — |
| Consumir webhook assinado do PSP | — | — | — | — | — | — | — | — | S, identidade PSP validada |
| Ler auditoria e relatórios sensíveis | — | — | — | — | R, limitado ao caso | R, escopo financeiro | R, escopo financeiro | R, segurança | S, somente ingestão |

**Observações de segurança:** papéis são **propostos** e não substituem verificação `resource.owner_id`, motivo, escopo, status, finalidade e regra legal. Um administrador de identidade **não recebe automaticamente** poderes de refund, upload ou leitura indiscriminada. A concessão de permissões de alto risco deve exigir aprovação e trilha independente.

## Regras transversais (propostas)

1. Negar por padrão; permissões derivadas de sessão humana válida, não de flags enviadas no corpo da requisição.
2. Cada API/consulta/exportação faz filtro/autorização no **servidor**; ID não é segredo. Token de mídia não prova compra quando vazado.
3. Refund manual: autor e aprovador **identidades distintas** na proposta para operações de risco; revisão financeira e step-up. Valor de alçada não definido sem decisão DA-009/DS-003.
4. Compensação automática RN-078 tem **política técnica explícita** e auditoria, não bypass de conferência de captura/saldo e idempotência.
5. Sessões de operador privilegiado requerem MFA apropriado (SEC-004) e decisão sobre step-up recente para ações irreversíveis (SEC-005).
6. Credencial técnica de worker/PSP é segregada de conta humana, vinculada a ação/contexto e auditada, com rotação.
7. Controles do frontend (mostrar/esconder ação) são apenas UX. Testes negativos usam tokens válidos sem permissões, recurso de outro cliente, usuário desativado e transição proibida.

## Decisões explicitamente abertas

- Nome/enum exato de roles e permissões; hierarquia, escopo de atendimento e política de concessão.
- Limiares de valor, dupla aprovação e exceções emergenciais auditadas; DS-003, DA-009.
- Fator MFA (WebAuthn/TOTP) e step-up; DS-002.

**Validação prevista:** SA-001/002/009, SA-003/004, SA-008, SEC-001–005, SEC-014, SEC-022, SEC-025, SEC-028.
