const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, min_amount, max_amount, type } = req.query;
    let sql = `SELECT t.*, sa.account_number as source_number, da.account_number as dest_number,
       b.nickname as beneficiary_nickname
       FROM transactions t
       LEFT JOIN accounts sa ON t.source_account_id = sa.id
       LEFT JOIN accounts da ON t.destination_account_id = da.id
       LEFT JOIN beneficiaries b ON t.beneficiary_id = b.id
       WHERE (t.source_account_id IN (SELECT id FROM accounts WHERE user_id = ?)
          OR t.destination_account_id IN (SELECT id FROM accounts WHERE user_id = ?))`;
    const params = [req.user.id, req.user.id];

    if (start_date) { sql += ` AND t.created_at >= ?`; params.push(start_date); }
    if (end_date) { sql += ` AND t.created_at <= ?`; params.push(end_date); }
    if (min_amount) { sql += ` AND t.amount >= ?`; params.push(min_amount); }
    if (max_amount) { sql += ` AND t.amount <= ?`; params.push(max_amount); }
    if (type) { sql += ` AND t.transaction_type = ?`; params.push(type); }
    sql += ' ORDER BY t.created_at DESC LIMIT 50';

    const result = query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const client = getClient();
  try {
    const { source_account_id, destination_account_id, beneficiary_id, amount, description } = req.body;
    if (!source_account_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid source account and positive amount required' });
    }

    client.begin();
    const accountResult = client.query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [source_account_id, req.user.id]);
    if (accountResult.rows.length === 0) {
      client.rollback();
      return res.status(404).json({ error: 'Source account not found' });
    }
    const account = accountResult.rows[0];

    if (parseFloat(account.balance) < parseFloat(amount)) {
      client.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const today = new Date().toISOString().split('T')[0];
    const dailySpent = client.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE source_account_id = ? AND transaction_type = 'transfer' 
       AND created_at >= ?`,
      [source_account_id, today]
    );
    if (parseFloat(dailySpent.rows[0].total) + parseFloat(amount) > parseFloat(account.daily_transfer_limit)) {
      client.rollback();
      return res.status(400).json({ error: 'Daily transfer limit exceeded' });
    }

    if (beneficiary_id && !destination_account_id) {
      const beneficiary = client.query('SELECT * FROM beneficiaries WHERE id = ? AND user_id = ?', [beneficiary_id, req.user.id]);
      if (beneficiary.rows.length === 0) {
        client.rollback();
        return res.status(404).json({ error: 'Beneficiary not found' });
      }
    }

    client.query('UPDATE accounts SET balance = balance - ?, updated_at = datetime("now") WHERE id = ?', [amount, source_account_id]);
    if (destination_account_id) {
      client.query('UPDATE accounts SET balance = balance + ?, updated_at = datetime("now") WHERE id = ?', [amount, destination_account_id]);
    }

    const gatewayRef = 'TXN-' + Date.now();
    const txId = uuidv4();
    const now = new Date().toISOString();
    client.query(
      `INSERT INTO transactions (id, source_account_id, destination_account_id, beneficiary_id, transaction_type, amount, status, description, gateway_reference, created_at)
       VALUES (?, ?, ?, ?, 'transfer', ?, 'completed', ?, ?, ?)`,
      [txId, source_account_id, destination_account_id || null, beneficiary_id || null, amount, description || 'Fund transfer', gatewayRef, now]
    );

    client.query(
      'INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, 'transaction', 'Transfer Completed', `Transfer of $${amount} completed. Reference: ${gatewayRef}`, now]
    );

    client.commit();
    res.status(201).json({
      message: 'Transfer successful',
      transaction: { id: txId, amount, gateway_reference: gatewayRef, status: 'completed' },
    });
  } catch (error) {
    client.rollback();
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  } finally {
    client.release();
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = query(
      `SELECT t.*, sa.account_number as source_number, da.account_number as dest_number
       FROM transactions t
       LEFT JOIN accounts sa ON t.source_account_id = sa.id
       LEFT JOIN accounts da ON t.destination_account_id = da.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
