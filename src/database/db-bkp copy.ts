import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> = SQLite.openDatabaseAsync('database');

async function getDB() {
  return await dbPromise;
}

function validarNomeTabela(nome: string) {
  return /^[a-zA-Z0-9_]+$/.test(nome);
}

export async function criarTabela(nomeTabela: string) {
  const db = await getDB();
  if (!validarNomeTabela(nomeTabela)) {
    throw new Error('Nome da tabela inválido!');
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${nomeTabela} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomedoproduto TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      valor REAL NOT NULL
    );
  `);
}

export async function adicionarProduto(nomedoproduto: string, quantidade: number, valor: number) {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO produtos (nomedoproduto, quantidade, valor) VALUES (?, ?, ?);',
    [nomedoproduto, quantidade, valor]
  );
}

export async function atualizarProduto(id: number, nomedoproduto: string, quantidade: number, valor: number) {
  const db = await getDB();
  await db.runAsync(
    'UPDATE produtos SET nomedoproduto = ?, quantidade = ?, valor = ? WHERE id = ?;',
    [nomedoproduto, quantidade, valor, id]
  );
}

export async function deletarProduto(id: number) {
  const db = await getDB();
  await db.runAsync('DELETE FROM produtos WHERE id = ?;', [id]);
}

export async function buscarProdutos() {
  const db = await getDB();
  return await db.getAllAsync('SELECT * FROM produtos;');
}
