# QTE-POL-02 — Endereços e titularidade

**15/10/2026 · PROPOSTO · sem persistência ou endpoints novos.**

## Estado atual e fronteira recomendada

[RN-011/012 e RN-032/039](../../02-business-requirements/REGRAS-DE-NEGOCIO.md)
preveem múltiplos endereços por cliente, snapshot do pedido e acesso por titular.
Hoje `quotes.fixture_address` possui apenas ator, zona e flags artificiais de
completude/elegibilidade; seu snapshot não é um endereço postal completo.
[Orders](../orders/ORD-02-snapshots-e-invariantes.md) persiste preparação técnica,
não um pedido comercial com endereço real. Identity Customer implementado
localmente não significa vínculo comercial habilitado em Quotes/Orders.

| Alternativa                                               | Benefício                                                                          | Custo/risco                                                                                       | Recomendação                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Endereços dentro de Identity junto de credenciais/sessões | Menor número de módulos                                                            | Mistura perfil mutável com autenticação sensível; consumidores podem obter privilégios excessivos | Não recomendar acesso direto a tabelas Identity                                                               |
| Customer Profile no monólito, vinculado ao ID de conta    | Separa dados de entrega de segredos, suporta vários endereços e leitura autorizada | Precisa de política de ciclo de vida e consistência de conta/endereço                             | **PROPOSTO**, responsabilidade própria; pode compartilhar implantação sem compartilhar tabelas de credenciais |
| Serviço independente de endereços                         | Escala e operação autônomas                                                        | I/O de rede, consistência distribuída e custo sem necessidade demonstrada                         | Adiar; não exigido pelo portfólio                                                                             |

QTE-DEC-003 recomenda Customer Profile com endereços versionados por conta.
O inventário FD-03 atribui P30 a Identity: a separação de responsabilidade aqui
é uma proposta a aprovar, não uma renomeação já aplicada ao inventário ou ao módulo.
O ator vem da sessão autenticada/verificada do servidor. `shippingAddressId`
é somente referência, nunca autorização. Selecionar endereço de outro titular
ou revogado resulta em negativa uniforme, sem revelar existência ou conteúdo.
Staff não herda acesso por possuir login; suas capabilities continuam separadas.

## Dados candidatos e validação

Para entrega brasileira: país fixado a Brasil nesta proposta, CEP como string
normalizada de oito dígitos (preservando zeros), UF, município, bairro, logradouro,
número ou indicação explícita de sem número, complemento opcional e destinatário.
Formato não comprova que o CEP exista ou seja atendido. Fonte de referência,
consistência CEP/município/UF e tratamento de endereços especiais precisam de
aprovação e testes; não consultar serviço externo automaticamente nesta tarefa.
Limites de texto, campos obrigatórios por situação e normalização serão definidos
no futuro contrato, sem coerção silenciosa ou HTML confiável.

Para a tarifa fixa proposta, cálculo precisa de CEP/zona, versão do endereço,
elegibilidade/completude validadas e composição física. Nome, complemento,
telefone e endereço completo não entram em logs ou no cálculo de frete. Telefone
ou documento não são coletados sem necessidade justificada; não presumir exigência
de transportadora. Para expedir, Orders precisará de snapshot postal suficiente,
adquirido em leitura autorizada distinta da projeção mínima de cálculo.

Múltiplos endereços são permitidos; alterar o padrão cadastral não troca a seleção
de uma cotação já emitida. Alterar/excluir a versão selecionada antes da compra
exige revalidação e nova cotação; não substituir silenciosamente por outro endereço.
Exclusão lógica/retirada de elegibilidade do cadastro não apaga o snapshot de
pedido já confirmado. Digital puro dispensa endereço/entrega: recomenda-se recusar
campos de entrega desnecessários no futuro contrato para minimizar PII, sem afirmar
que essa recusa já está implementada na fixture.

## Port de leitura autorizado — candidato, não código

```text
AuthorizedDeliveryAddress.readForQuote(serverPrincipal, addressId)
  → { addressId, addressVersion, country, postalCode, zone,
      complete, eligible }
AuthorizedDeliveryAddress.snapshotForOrder(serverPrincipal, addressId, expectedVersion, tx)
  → { addressId, addressVersion, recipient, postalAddress }
```

O principal é objeto confiável produzido por Identity, não `ownerId` enviado
no JSON. O port filtra por titular e conta ativa/verificada, possui limites e
respostas minimizadas. Nenhum consumidor recebe credenciais, hashes, sessões ou
acesso SQL genérico. `zone` é derivada da política confiável, não editada pelo cliente.

Na futura transação de preparação, conferir versão/titularidade e congelar o
endereço sob o mesmo contexto PostgreSQL de Orders/Inventory. O parâmetro `tx`
indica a exigência de coordenação, não acesso irrestrito às tabelas do outro módulo.
A implementação futura deverá provar locks/versões consistentes também para
mudança de endereço/estado da conta concorrente. Uma leitura HTTP anterior não
substitui essa guarda. Não manter chamada remota dentro da transação.

Orders guarda cópia imutável do destino aceito e condições, vinculada à cotação;
alterações futuras no perfil não reescrevem o pedido. FK ao cadastro não é
substituto do snapshot. Revalidar antes do commit não pode aceitar endereço
novo com o preço mostrado para o antigo. RN-012 permanece intacta.

## Privacidade, retenção e provas pendentes

Controles propostos: leitura por titular, acesso operacional escopado por finalidade,
respostas autenticadas `no-store`, auditoria com ID/versão/ação/resultado e correlação
sem endereço bruto; escaping no consumidor; nenhuma PII em URL, analytics ou
ProblemDetails. Não copiar endereço completo para eventos públicos.

**Pendente de aprovação:** finalidade e bases de tratamento, prazo de retenção por
cadastro/cotação/pedido/auditoria, anonimização e fluxo de direitos. Não inventar
prazo legal nem excluir histórico comercial indiscriminadamente. Limpeza de quote
expirada precisa preservar evidência de checkout/replay por período aprovado.

Aceitação QTE-POL-T02: dois titulares não cruzam leituras; ID inexistente/alheio
tem negativa equivalente; sessão revogada/conta inelegível falha fechada; versões
mudam durante lock sem TOCTOU; mudança pós-compra não altera snapshot; digital
não lê endereço; logs/erros não vazam PII; migração e descarte não quebram histórico.
São testes **planejados**, não executados nesta tarefa.

Referências: [CT-06](../contracts/CT-06-autorizacao-por-recurso.md),
[Identity](../contracts/CT-ID-01-identity-customer.md),
[DB-01](../../04-architecture/database/DB-01-modelo-logico.md),
[fluxo e decisões](QTE-POL-05-fluxo-e-matriz-de-decisoes.md).
