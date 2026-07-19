const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'data', 'gdbank.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(buffer);
  } else {
    dbInstance = new SQL.Database();
  }
  dbInstance.run('PRAGMA foreign_keys = ON');
  dbInstance.run('PRAGMA journal_mode = WAL');
  return dbInstance;
}

function saveDb() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveDb();
    saveTimer = null;
  }, 500);
}

function query(sql, params = []) {
  const stmt = dbInstance.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return { rows };
  } else {
    stmt.run(params);
    const changes = dbInstance.getRowsModified();
    stmt.free();
    scheduleSave();
    return { rows: [], rowCount: changes };
  }
}

function getClient() {
  return {
    query: (sql, params = []) => query(sql, params),
    begin: () => dbInstance.run('BEGIN'),
    commit: () => { dbInstance.run('COMMIT'); scheduleSave(); },
    rollback: () => dbInstance.run('ROLLBACK'),
    release: () => {},
  };
}

module.exports = { getDb, query, getClient, saveDb };
