const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', '..', 'data', 'gdbank.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const adminId = uuidv4();
const adminHash = bcrypt.hashSync('admin123', 10);
db.prepare(
  'INSERT OR IGNORE INTO users (id, full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
).run(adminId, 'System Admin', 'admin@gdbank.com', '+491234567890', adminHash, 'admin');

const accId = uuidv4();
db.prepare(
  'INSERT OR IGNORE INTO accounts (id, user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?, ?)'
).run(accId, adminId, 'GB0000000001', 'checking', 50000.00);

console.log('Database initialized successfully!');
console.log('Admin login: admin@gdbank.com / admin123');
db.close();
