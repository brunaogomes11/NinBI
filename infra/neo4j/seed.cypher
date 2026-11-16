// Dataset de exemplo "Varejo" do NinBI. Determinístico e idempotente.
// Toda criação só roda enquanto o marcador (:NinbiSeed {versao: 1}) não existe;
// o marcador é a última instrução, então uma carga interrompida recomeça sozinha.
// Cada instrução também confere se o seu rótulo já existe, para não duplicar nós.
// Uma instrução por bloco, separadas por ponto e vírgula no fim da linha.

// 12 lojas
OPTIONAL MATCH (m:NinbiSeed {versao: 1})
WITH m WHERE m IS NULL AND NOT EXISTS { MATCH (:Loja) }
UNWIND [
  {nome: 'Loja São Paulo', cidade: 'São Paulo', uf: 'SP', latitude: -23.5505, longitude: -46.6333},
  {nome: 'Loja Rio de Janeiro', cidade: 'Rio de Janeiro', uf: 'RJ', latitude: -22.9068, longitude: -43.1729},
  {nome: 'Loja Belo Horizonte', cidade: 'Belo Horizonte', uf: 'MG', latitude: -19.9167, longitude: -43.9345},
  {nome: 'Loja Curitiba', cidade: 'Curitiba', uf: 'PR', latitude: -25.4284, longitude: -49.2733},
  {nome: 'Loja Porto Alegre', cidade: 'Porto Alegre', uf: 'RS', latitude: -30.0346, longitude: -51.2177},
  {nome: 'Loja Salvador', cidade: 'Salvador', uf: 'BA', latitude: -12.9714, longitude: -38.5014},
  {nome: 'Loja Recife', cidade: 'Recife', uf: 'PE', latitude: -8.0476, longitude: -34.8770},
  {nome: 'Loja Fortaleza', cidade: 'Fortaleza', uf: 'CE', latitude: -3.7319, longitude: -38.5267},
  {nome: 'Loja Brasília', cidade: 'Brasília', uf: 'DF', latitude: -15.7939, longitude: -47.8828},
  {nome: 'Loja Goiânia', cidade: 'Goiânia', uf: 'GO', latitude: -16.6869, longitude: -49.2648},
  {nome: 'Loja Manaus', cidade: 'Manaus', uf: 'AM', latitude: -3.1190, longitude: -60.0217},
  {nome: 'Loja Belém', cidade: 'Belém', uf: 'PA', latitude: -1.4558, longitude: -48.4902}
] AS loja
CREATE (:Loja {nome: loja.nome, cidade: loja.cidade, uf: loja.uf, latitude: loja.latitude, longitude: loja.longitude});

// 6 categorias
OPTIONAL MATCH (m:NinbiSeed {versao: 1})
WITH m WHERE m IS NULL AND NOT EXISTS { MATCH (:Categoria) }
UNWIND ['Alimentos', 'Bebidas', 'Limpeza', 'Higiene', 'Eletrônicos', 'Vestuário'] AS nome
CREATE (:Categoria {nome: nome});

// 60 produtos, 10 por categoria
MATCH (c:Categoria)
WITH c ORDER BY c.nome
WITH collect(c) AS categorias
WHERE size(categorias) = 6 AND NOT EXISTS { MATCH (:NinbiSeed {versao: 1}) } AND NOT EXISTS { MATCH (:Produto) }
UNWIND range(1, 60) AS i
WITH i, categorias[i % 6] AS categoria
CREATE (p:Produto {
  nome: 'Produto ' + right('00' + toString(i), 2),
  preco: toFloat(10 + (i * 37) % 490) + 0.9
})
CREATE (p)-[:PERTENCE_A]->(categoria);

// 200 clientes
OPTIONAL MATCH (m:NinbiSeed {versao: 1})
WITH m WHERE m IS NULL AND NOT EXISTS { MATCH (:Cliente) }
UNWIND range(1, 200) AS i
CREATE (:Cliente {
  nome: 'Cliente ' + right('000' + toString(i), 3),
  segmento: ['Varejo', 'Atacado', 'Corporativo'][i % 3],
  cidade: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador',
    'Recife', 'Fortaleza', 'Brasília', 'Goiânia', 'Manaus', 'Belém'][i % 12]
});

// 2.000 pedidos em 24 meses (2024-01-01 a 2025-12-31), cada um de um cliente e vendido em uma loja
MATCH (l:Loja)
WITH l ORDER BY l.nome
WITH collect(l) AS lojas
MATCH (c:Cliente)
WITH lojas, c ORDER BY c.nome
WITH lojas, collect(c) AS clientes
WHERE size(lojas) = 12 AND size(clientes) = 200 AND NOT EXISTS { MATCH (:NinbiSeed {versao: 1}) } AND NOT EXISTS { MATCH (:Pedido) }
UNWIND range(1, 2000) AS i
WITH i, lojas[(i * 5) % 12] AS loja, clientes[i % 200] AS cliente
CREATE (p:Pedido {
  codigo: 'PED-' + right('0000' + toString(i), 4),
  data: date('2024-01-01') + duration({days: (i * 7) % 731}),
  status: ['Entregue', 'Entregue', 'Entregue', 'Enviado', 'Cancelado'][i % 5],
  valorTotal: 0.0
})
CREATE (cliente)-[:FEZ]->(p)
CREATE (p)-[:VENDIDO_EM]->(loja);

// 1 a 3 itens por pedido
MATCH (p:Pedido)
WITH p ORDER BY p.codigo
WITH collect(p) AS pedidos
MATCH (pr:Produto)
WITH pedidos, pr ORDER BY pr.nome
WITH pedidos, collect(pr) AS produtos
WHERE size(pedidos) = 2000 AND size(produtos) = 60 AND NOT EXISTS { MATCH (:NinbiSeed {versao: 1}) } AND NOT EXISTS { MATCH ()-[:CONTEM]->() }
UNWIND range(1, 2000) AS i
UNWIND range(0, i % 3) AS k
WITH pedidos[i - 1] AS pedido, produtos[(i * 7 + k * 13) % 60] AS produto, 1 + (i + k) % 5 AS quantidade
CREATE (pedido)-[:CONTEM {quantidade: quantidade}]->(produto);

// valorTotal = soma de quantidade x preço dos itens (recalculado, então repetir não muda nada)
OPTIONAL MATCH (m:NinbiSeed {versao: 1})
WITH m WHERE m IS NULL
MATCH (p:Pedido)-[c:CONTEM]->(pr:Produto)
WITH p, sum(c.quantidade * pr.preco) AS total
SET p.valorTotal = round(total * 100) / 100.0;

// marcador: só existe depois de tudo acima
OPTIONAL MATCH (m:NinbiSeed {versao: 1})
WITH m WHERE m IS NULL
CREATE (:NinbiSeed {versao: 1});
