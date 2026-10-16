# CP-01 — Escopo, diagnóstico e fronteiras

## Diagnóstico anterior ao código

HEAD/main coincide com o baseline solicitado, sem alterações posteriores ou locais.
Identity já possui conta, credencial, sessão, verificação/recovery e guards de
origem/CSRF locais. Não existe fronteira de identidade comercial homologada para
Quotes/Orders; seus atores são TEST_ONLY. Não conectar bancos descartáveis
Identity e Catalog/Orders por inferência. FD-03 P29/P30 é inventário UX, não API.

[ADR-012](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md)
ratifica Customer Profile separado de credenciais/sessões, múltiplos endereços,
versionamento, ports autorizados, snapshots históricos e princípios de privacidade.
[QTE-POL-02](../quotes/QTE-POL-02-enderecos-e-titularidade.md) e
[QTE-POL-06](../quotes/QTE-POL-06-delta-openapi-candidato.md) mantêm campos postais,
fonte CEP, retenção e detalhes de entrega/HTTP em aberto. O pedido CP-01 autoriza
explicitamente candidatos técnicos tipados TEST_ONLY, sem decidir esses parâmetros.

## Implementação e autoridades

Módulo Nest `customer-profile`, com domínio de endereço/principal, aplicação
CustomerAddresses/ports e adapter Prisma 7/SQL. Não há camada presentation,
controller, forwardRef, serviço global ou dependência de repository alheio.
AppModule permanece intacto; o provider normal do módulo é null. A factory
explícita exige modo local, consentimento CP-01 e role de fixture; recusa produção.

Identity continua autoridade de conta/sessão/estado. O port CustomerPrincipalSource
retorna AuthorizedCustomerPrincipal (accountId, CUSTOMER, eligible, evidência
CP-01_TEST_ONLY). A fixture confere independentemente sessão SQL/conta ativa e
verificada, sem ler hashes/tokens/cookies. Não é adapter de Identity de produção.

Customer Profile possui endereço/revisão/elegibilidade; não fornece tarifa/zona
comercial. Quotes receberá somente CEP/país/versão/elegibilidade; Orders receberá
snapshot postal autorizado. A ligação real aos módulos não foi ativada: a fundação
prova o port e o contexto local sem reescrever QTE-01/ORD-01 ou seus guards.

## Invariantes preservadas

[RN-011/012/032/039/055](../../02-business-requirements/REGRAS-DE-NEGOCIO.md),
[PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md), DB-01–05,
ADR-003/006 e CT-01/02/03/04/06/08 orientam a fronteira. Não há reserva ao manter
endereço, cálculo de frete, TTL novo, contrato HTTP de endereço ou evolução de
QuoteResult. Publicar endereço não autoriza compra nem cria entitlement.

As comparações e ratificações dos seis QTE-POL continuam válidas. Nenhum campo
candidato deste laboratório altera normas RN/PC/CT, OpenAPI, FD-03/05 ou a política
40/30/5. Não foram criados dados pessoais reais, serviços externos ou retenção automática.
