# CAT-02 — Modelo e invariantes locais

[Schema Prisma](../../../apps/api/prisma-catalog/schema.prisma) e
[migration SQL](../../../apps/api/prisma-catalog/migrations/202610150001_catalog/migration.sql)
pertencem exclusivamente à fixture CAT-01, schema catalog. Não alteram os schemas
Identity/spike, normas RN/PC nem provedor remoto.

As migrations SQL são a fonte versionada das constraints, triggers, view e índice
parcial que Prisma não representa integralmente. FKs no schema declaram NoAction
em atualização, coerente com SQL; futuras migrations geradas exigem revisão dessas
invariantes, sem db push ou aceitação automática de diff destrutivo.

| Entidade                 | Modelagem e proteção                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Work                     | Identidade/título editorial, estado; uma obra admite várias edições/autores.                                                |
| Edition                  | Obra e editora por FK, label/idioma, ISBN anulável; não presume ISBN para digital.                                          |
| Product                  | UUID/SKU estáveis, tipo fechado, título/descrição, estado; edição obrigatória exceto KIT. Sem preço/saldo/asset privado.    |
| Author/WorkAuthor        | Múltiplos autores por obra; PK composta impede duplicação da associação.                                                    |
| Publisher                | Editora/selo fictício vinculado à edição por FK.                                                                            |
| Category/ProductCategory | Categorias planas; PK composta e FKs. Sem hierarquia/ciclo possível nesta versão.                                           |
| KitComposition           | PK(kit,componente), FKs, quantidade inteira1..9999, máximo100 linhas, pai KIT, componente não-KIT, autoassociação recusada. |

Estados técnicos iniciais DRAFT/PUBLISHED/UNPUBLISHED são implementação editorial
local, não novo vocabulário normativo de compra. Publicação de produto avulso exige
obra/edição publicadas; publicação de kit exige composição não vazia e componentes
editorialmente publicados. A view public_products revalida todas essas condições
em cada SELECT e oculta kits se um componente/obra/edição deixar de ser publicado.
Não muda snapshots, estoque, direitos já adquiridos ou estado financeiro.

## Kits e concorrência

Kits simples físicos, digitais e mistos, sem kits aninhados. Essa restrição técnica
evita ciclos; não introduz política comercial nova. Guardas SQL impedem atualização
de identidade/tipo/edição e alteração da composição após a primeira publicação.
composition_version=1 e sealed irrevogável: composição publicada é imutável mesmo
após retirada. Evolução de composição exige desenho futuro de nova oferta/versão e
handoff para snapshot Orders, não atualização silenciosa ou endpoint novo.

Trigger de composição adquire FOR UPDATE no pai; publicação já detém lock da linha.
Duas conexões reais provam que edição concorrente espera a publicação e é recusada
após sealed. Não existe chamada externa durante lock. Leitura pública usa uma
instrução SQL com revalidação de estado no snapshot da instrução, não cache de
elegibilidade. Não há reserva all-or-nothing, preço de kit ou entitlement nesta etapa.

PKs atendem joins por ID e composição por kit; SKU UNIQUE atende identidade
comercial. Índice parcial product_published_id atende filtro publicado + keyset.
SKU técnico usa ASCII maiúsculo1..64; formato comercial definitivo permanece
dependente de revisão antes de importar identificadores reais.
EXPLAIN real na fixture demonstra uso do índice e joins; volume minúsculo não
comprova desempenho em escala. Índices de taxonomia/busca aguardam consultas reais.

## Segurança e operação da fixture

PostgreSQL17.10-bookworm por digest existente, Docker local, loopback55439,
banco atlas_catalog_cat01, marker atlas-cat01-disposable. Migration usa identidade
artificial atlas_catalog_migrator; runtime atlas_catalog_runtime sem flags elevadas,
sem membership e com SELECT apenas na view + USAGE catalog. View por proprietário
e security_barrier evita conceder leitura bruta de rascunhos ao runtime; não é
SECURITY DEFINER nem prova RLS/Supabase. Nenhuma concessão às roles API remotas.

Fixture usa trust local em loopback como os spikes existentes: somente para
descarte, sem senha real, TLS remoto ou garantia contra administrador/local process
malicioso. PUBLIC nativo não é revogado globalmente; não se afirma SQL estrita L1.
Cada leitura confere DB/role/marker/major17, e todo SQL de consulta usa bind Prisma.
Pool2, acquire/connect1000ms, statement1500ms, query2000ms, idle1000ms,
idle-in-transaction2000ms, lifetime30s; $disconnect no encerramento Nest.
Timeout de lock real retorna503 e nova leitura recupera; pool retorna zero sessões.

Config CATALOG_MODE=local-disposable exige CATALOG_CONSENT=CAT-01 e runtime URL
exata sem senha/endpoint/parâmetros extras. Produção/ambiente PG/URL migrator em
runtime são recusados; disabled por padrão não abre conexão. Não carrega dotenv.
Migration runner só aceita modo migrate/test, destino fixo e confere identidade
antes de Prisma criar histórico/DDL. SQL também repete guarda antes dos objetos.
Prisma cria schema para histórico: CREATE SCHEMA IF NOT EXISTS evita conflito;
histórico versionado garante reaplicação sem duplicação. Não há db push ou migration
no bootstrap. Não executar Prisma Migrate diretamente fora do runner autorizado.

Harness reserva lock de porta e projeto UUID antes de subir recursos, recusa Docker
remoto, sanitiza ambiente, confere binding/labels, aplica/reaplica migration e roda
HTTP/SQL reais; finally remove somente seu projeto/volume/network e verifica vazio.
Sem prune. SIGKILL/falha de SO/Docker podem impedir limpeza e requerem recuperação
manual após checar ownership; não se promete cleanup absoluto. Recuperação desta
fatia local é descartar somente sua fixture e recriá-la, não rollback de dados reais.

Fontes técnicas: [Prisma7 pool/adapter](https://docs.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool),
[PostgreSQL17 triggers](https://www.postgresql.org/docs/17/sql-createtrigger.html).
