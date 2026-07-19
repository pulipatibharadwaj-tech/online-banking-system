const express = require('express');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = query(
      'SELECT id, full_name, email, phone, date_of_birth, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, phone, date_of_birth } = req.body;
    const now = new Date().toISOString();
    query(
      `UPDATE users SET 
        full_name = COALESCE(?, full_name), 
        phone = COALESCE(?, phone), 
        date_of_birth = COALESCE(?, date_of_birth), 
        updated_at = ? 
       WHERE id = ?`,
      [full_name, phone, date_of_birth, now, req.user.id]
    );
    const result = query('SELECT id, full_name, email, phone, date_of_birth FROM users WHERE id = ?', [req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = query('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const accounts = query(
      'SELECT id, account_number, account_type, balance FROM accounts WHERE user_id = ?',
      [req.user.id]
    );
    const transactions = query(
      `SELECT t.*, sa.account_number as source_number, da.account_number as dest_number
       FROM transactions t
       LEFT JOIN accounts sa ON t.source_account_id = sa.id
       LEFT JOIN accounts da ON t.destination_account_id = da.id
       WHERE t.source_account_id IN (SELECT id FROM accounts WHERE user_id = ?)
          OR t.destination_account_id IN (SELECT id FROM accounts WHERE user_id = ?)
       ORDER BY t.created_at DESC LIMIT 5`,
      [req.user.id, req.user.id]
    );
    const unreadNotifications = query(
      'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    const totalBalance = accounts.rows.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    res.json({
      accounts: accounts.rows,
      recentTransactions: transactions.rows,
      unreadNotifications: parseInt(unreadNotifications.rows[0].cnt),
      totalBalance,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
