const express = require('express');
const { query } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, requireRole('admin'));

router.get('/dashboard', async (req, res) => {
  try {
    const totalCustomers = query("SELECT COUNT(*) as cnt FROM users WHERE role = 'customer'");
    const totalAccounts = query('SELECT COUNT(*) as cnt FROM accounts');
    const totalBalance = query('SELECT COALESCE(SUM(balance), 0) as total FROM accounts');
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = query("SELECT COUNT(*) as cnt FROM transactions WHERE created_at >= ?", [today]);
    const todayVolume = query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE created_at >= ? AND status = 'completed'", [today]);
    const failedTransactions = query("SELECT COUNT(*) as cnt FROM transactions WHERE status = 'failed'");

    const recentTransactions = query(
      `SELECT t.*, u.full_name as customer_name, sa.account_number as source_number
       FROM transactions t
       JOIN accounts sa ON t.source_account_id = sa.id
       JOIN users u ON sa.user_id = u.id
       ORDER BY t.created_at DESC LIMIT 10`
    );

    res.json({
      totalCustomers: parseInt(totalCustomers.rows[0].cnt),
      totalAccounts: parseInt(totalAccounts.rows[0].cnt),
      totalBalance: parseFloat(totalBalance.rows[0].total),
      todayTransactions: parseInt(todayTransactions.rows[0].cnt),
      todayVolume: parseFloat(todayVolume.rows[0].total),
      failedTransactions: parseInt(failedTransactions.rows[0].cnt),
      recentTransactions: recentTransactions.rows,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const result = query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM accounts WHERE user_id = u.id) as account_count
       FROM users u WHERE u.role = 'customer' ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/customers/:id/toggle', async (req, res) => {
  try {
    const existing = query('SELECT id, is_active FROM users WHERE id = ? AND role = ?', [req.params.id, 'customer']);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    const newActive = existing.rows[0].is_active ? 0 : 1;
    query('UPDATE users SET is_active = ? WHERE id = ?', [newActive, req.params.id]);
    res.json({ id: req.params.id, is_active: newActive });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const { start_date, end_date, type } = req.query;
    let sql = `SELECT t.*, u.full_name as customer_name, sa.account_number as source_number
      FROM transactions t
      JOIN accounts sa ON t.source_account_id = sa.id
      JOIN users u ON sa.user_id = u.id
      WHERE 1=1`;
    const params = [];
    if (start_date) { sql += ` AND t.created_at >= ?`; params.push(start_date); }
    if (end_date) { sql += ` AND t.created_at <= ?`; params.push(end_date); }
    if (type) { sql += ` AND t.transaction_type = ?`; params.push(type); }
    sql += ' ORDER BY t.created_at DESC';
    const result = query(sql, params);

    const summary = {
      totalTransactions: result.rows.length,
      totalAmount: result.rows.reduce((sum, t) => sum + parseFloat(t.amount), 0),
      byType: {},
    };
    result.rows.forEach((t) => {
      if (!summary.byType[t.transaction_type]) {
        summary.byType[t.transaction_type] = { count: 0, total: 0 };
      }
      summary.byType[t.transaction_type].count++;
      summary.byType[t.transaction_type].total += parseFloat(t.amount);
    });
    res.json({ transactions: result.rows, summary });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
