const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { getDb, saveDb } = require('./config/db');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const transferRoutes = require('./routes/transfers');
const beneficiaryRoutes = require('./routes/beneficiaries');
const billRoutes = require('./routes/bills');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

async function start() {
  await getDb();
  console.log('Database initialized');

  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const { query } = require('./config/db');

  const existing = query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  if (existing.rows.length === 0) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const { getDb } = require('./config/db');
    const db = await getDb();
    db.exec(schema);
    saveDb();
    console.log('Schema created');
  }

  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const adminCheck = query("SELECT id FROM users WHERE email = 'admin@gdbank.com'");
  if (adminCheck.rows.length === 0) {
    const adminId = uuidv4();
    const adminHash = bcrypt.hashSync('admin123', 10);
    const now = new Date().toISOString();
    query('INSERT INTO users (id, full_name, email, phone, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [adminId, 'System Admin', 'admin@gdbank.com', '+491234567890', adminHash, 'admin', now, now]);
    const accId = uuidv4();
    query('INSERT INTO accounts (id, user_id, account_number, account_type, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [accId, adminId, 'GB0000000001', 'checking', 50000.00, now, now]);
    saveDb();
    console.log('Admin user created: admin@gdbank.com / admin123');
  }

  app.listen(PORT, () => {
    console.log(`GD Bank API running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

process.on('SIGINT', () => { saveDb(); process.exit(0); });
process.on('SIGTERM', () => { saveDb(); process.exit(0); });
