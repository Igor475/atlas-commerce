# CP-02 — Modelo e versionamento TEST_ONLY

SQL é autoridade de constraints, funções e ACLs; Prisma 7.10 com adapter-pg
existente projeta Address e executa queries parametrizadas. Nenhuma dependência
adicionada. Schema customer_profile e histórico de migrations próprios, sem
alteração de schema/migration Identity, Catalog, Pricing, Inventory, Orders ou Quotes.

| Tabela            | Finalidade / invariantes                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fixture_account   | Conta artificial ativa/verificada, propósito TEST_ONLY; não cópia de credenciais/sessões                                                               |
| fixture_principal | Role SQL de ator vinculada a uma única conta CUSTOMER; não admite staff/admin                                                                          |
| address           | UUID estável, owner imutável, current_version positivo; índice account_id/id                                                                           |
| revision          | PK endereço/versão, owner vinculado por FK composta, propósito TEST_ONLY, campos postais tipados, elegibilidade e hora DB; UPDATE/DELETE recusados     |
| request           | Intenção CHANGE_TEST_ONLY_V1 por conta/chave, fingerprint canônico e referência da revisão produzida; não duplica todo o endereço no registro de retry |

O FK diferido de address para sua revisão atual permite criação atômica sem
ponteiro órfão no commit. FK de revision para endereço/owner impede revisão
pertencente simultaneamente a outro titular. Não há CASCADE DELETE ou limpeza
por TTL. Migrator não consegue alterar revisões por DML normal; administração
DDL continua autoridade privilegiada, fora dos runtimes.

## Candidatos postais e finalidade — não contrato definitivo

| Campo candidato                | Tipo/limite técnico da fixture                   | Finalidade                                                             |
| ------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------- |
| recipient                      | string 1–160 caracteres, sem controles           | Destinatário no snapshot para expedição futura                         |
| country                        | literal BR no laboratório                        | Interpretar o candidato postal; não comprova cobertura                 |
| postalCode                     | string de oito dígitos, preserva zeros           | Projeção mínima para futura política de zona; não valida CEP existente |
| region                         | duas letras maiúsculas; ZZ artificial nos testes | Candidato de UF; sem afirmar tabela oficial validada                   |
| city, district, street, number | strings 1–160, sem controles                     | Componentes explícitos do snapshot postal candidato                    |
| complement                     | string até 160 ou null, sem controles            | Complemento apenas na projeção completa                                |

Essas obrigatoriedades, limites e literal BR são **técnicos TEST_ONLY** autorizados
pelo pedido, não requisitos postais definitivos. Todos os dados da suíte usam
marcadores TEST, CEP 00000000 e região ZZ; não representam destino atendido.
Não existe normalização postal silenciosa, validação externa ou fallback para
dados ausentes. JSON é somente transporte com whitelist de nove campos/tipos;
a persistência usa colunas explícitas e nunca um blob postal genérico sem schema.

## Versionamento e replay

Criar recebe expectedVersion=0; update exige versão corrente e gera exatamente
versão+1 sob lock. Divergência recusa, sem last-write-wins. Caller deve recuperar
estado e decidir nova intenção. ELIGIBLE/INELIGIBLE/RETIRED são estados técnicos
validados; RETIRED é terminal **nesta fixture**, sem definir fluxo comercial de
reativação. Retirada lógica é nova revisão, não UPDATE/DELETE de histórico.

Request usa conta/chave e fingerprint SHA-256 do comando fixo, endereço, versão
esperada, campos normalizados estruturalmente pelo JSONB e elegibilidade. Mesma
intenção após commit retorna a revisão originalmente criada, mesmo que outra
edição tenha ocorrido; diferente fingerprint conflita. UUIDs/chaves não saem em
logs. Timeout não prova rollback; recuperar pela mesma intenção, nunca criar
chave nova automaticamente. Não se alega perda de ACK TCP ensaiada.

Migration exige nome exato do banco, role migrator, marker e PostgreSQL 17. Usa
CREATE SCHEMA IF NOT EXISTS porque Prisma já pode criá-lo; confere seu owner
antes da DDL. Harness aplica/reaplica pelo Prisma Migrate. Recuperação local é
descartar somente projeto/volume próprios e reconstruir, não executar DDL remoto.
Evolução comercial exigirá migração revisada, compatibilidade, retenção e testes
com os campos finais; não aplicar esta fixture em ambiente real.
