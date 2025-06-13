import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

function getDatabase() {
  if (!db) {
    db = SQLite.openDatabaseSync('jrsapp.db');
  }
  return db;
}

interface TableResult {
  name: string;
}

// Função para verificar se a tabela existe
async function verificarTabela() {
  try {
    const database = getDatabase();
    const resultado = await database.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND (name='transacoes' OR name='produtos');
    `) as TableResult[];
    return {
      transacoes: resultado.some(r => r.name === 'transacoes'),
      produtos: resultado.some(r => r.name === 'produtos')
    };
  } catch (error) {
    console.error('Erro ao verificar tabela:', error);
    return { transacoes: false, produtos: false };
  }
}

// Função para inicializar o banco de dados
async function inicializarBanco() {
  try {
    const database = getDatabase();
    const tabelas = await verificarTabela();
    
    if (!tabelas.transacoes) {
      // Criar a tabela de transações
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS transacoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          descricao TEXT NOT NULL,
          categoria TEXT NOT NULL,
          quantidade INTEGER NOT NULL,
          valor INTEGER NOT NULL,
          tipo_transacao TEXT NOT NULL,
          acao TEXT NOT NULL,
          data TEXT NOT NULL
        );
      `);
      console.log('Tabela transacoes criada com sucesso');
    }

    if (!tabelas.produtos) {
      // Criar a tabela de produtos
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS produtos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          quantidade INTEGER NOT NULL,
          valor INTEGER NOT NULL
        );
      `);
      console.log('Tabela produtos criada com sucesso');
    }
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

// Inicializar o banco de dados imediatamente
inicializarBanco().catch(console.error);

// Função para recriar a tabela
export async function recriarTabela() {
  try {
    const database = getDatabase();
    // Primeiro, tenta dropar a tabela se ela existir
    await database.execAsync('DROP TABLE IF EXISTS transacoes;');
    
    // Depois, cria a tabela novamente
    await database.execAsync(`
      CREATE TABLE transacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT NOT NULL,
        categoria TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        valor INTEGER NOT NULL,
        tipo_transacao TEXT NOT NULL,
        acao TEXT NOT NULL,
        data TEXT NOT NULL
      );
    `);
    console.log('Tabela transacoes recriada com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao recriar tabela:', error);
    return false;
  }
}

export async function salvarTransacao(transacao: {
  descricao: string;
  categoria: string;
  quantidade: number;
  valor: number;
  tipo_transacao: string;
  acao: string;
  data: string;
}) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `INSERT INTO transacoes (descricao, categoria, quantidade, valor, tipo_transacao, acao, data)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        transacao.descricao,
        transacao.categoria,
        transacao.quantidade,
        transacao.valor,
        transacao.tipo_transacao,
        transacao.acao,
        transacao.data
      ]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.lastInsertRowId))
    .catch((error: Error) => {
      console.error('Erro ao salvar transação:', error);
      reject(error);
    });
  });
}

export async function atualizarTransacao(transacao: {
  id: number;
  descricao: string;
  categoria: string;
  quantidade: number;
  valor: number;
  tipo_transacao: string;
  acao: string;
  data: string;
}) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `UPDATE transacoes 
       SET descricao = ?, categoria = ?, quantidade = ?, valor = ?, 
           tipo_transacao = ?, acao = ?, data = ?
       WHERE id = ?;`,
      [
        transacao.descricao,
        transacao.categoria,
        transacao.quantidade,
        transacao.valor,
        transacao.tipo_transacao,
        transacao.acao,
        transacao.data,
        transacao.id
      ]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao atualizar transação:', error);
      reject(error);
    });
  });
}

export async function buscarTransacoes() {
  return new Promise(async (resolve, reject) => {
    try {
      const database = getDatabase();
      // Primeiro verifica se a tabela existe
      const tabelas = await verificarTabela();
      if (!tabelas.transacoes) {
        console.log('Tabela transacoes não existe, inicializando banco...');
        await inicializarBanco();
      }

      const resultado = await database.getAllAsync('SELECT * FROM transacoes ORDER BY data DESC;');
      resolve(resultado);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      reject(error);
    }
  });
}

export async function deletarTransacao(id: number) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync('DELETE FROM transacoes WHERE id = ?;', [id])
    .then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao deletar transação:', error);
      reject(error);
    });
  });
}

export async function adicionarProduto(nome: string, quantidade: number, valor: number) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `INSERT INTO produtos (nome, quantidade, valor)
       VALUES (?, ?, ?);`,
      [nome, quantidade, valor]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.lastInsertRowId))
    .catch((error: Error) => {
      console.error('Erro ao adicionar produto:', error);
      reject(error);
    });
  });
}

export async function buscarProdutos() {
  return new Promise(async (resolve, reject) => {
    try {
      const database = getDatabase();
      // Primeiro verifica se a tabela existe
      const tabelas = await verificarTabela();
      if (!tabelas.produtos) {
        console.log('Tabela produtos não existe, inicializando banco...');
        await inicializarBanco();
      }

      const resultado = await database.getAllAsync('SELECT * FROM produtos ORDER BY nome;');
      resolve(resultado);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      reject(error);
    }
  });
}

export async function atualizarProduto(id: number, nome: string, quantidade: number, valor: number) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `UPDATE produtos 
       SET nome = ?, quantidade = ?, valor = ?
       WHERE id = ?;`,
      [nome, quantidade, valor, id]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao atualizar produto:', error);
      reject(error);
    });
  });
}

export async function deletarProduto(id: number) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync('DELETE FROM produtos WHERE id = ?;', [id])
    .then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao deletar produto:', error);
      reject(error);
    });
  });
}
