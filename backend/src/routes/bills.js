const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/billers', authenticateToken, async (req, res) => {
  try {
    const result = query('SELECT * FROM billers WHERE is_active = 1 ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/pay', authenticateToken, async (req, res) => {
  const client = getClient();
  try {
    const { account_id, biller_id, amount } = req.body;
    if (!account_id || !biller_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Account, biller and positive amount required' });
    }
    client.begin();
    const account = client.query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [account_id, req.user.id]);
    if (account.rows.length === 0) {
      client.rollback();
      return res.status(404).json({ error: 'Account not found' });
    }
    if (parseFloat(account.rows[0].balance) < parseFloat(amount)) {
      client.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    client.query('UPDATE accounts SET balance = balance - ?, updated_at = datetime("now") WHERE id = ?', [amount, account_id]);
    const gatewayRef = 'BILL-' + Date.now();
    const paymentId = uuidv4();
    const now = new Date().toISOString();
    client.query(
      'INSERT INTO bill_payments (id, user_id, account_id, biller_id, amount, status, gateway_reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [paymentId, req.user.id, account_id, biller_id, amount, 'completed', gatewayRef, now]
    );
    const biller = client.query('SELECT name FROM billers WHERE id = ?', [biller_id]);
    client.query(
      'INSERT INTO transactions (id, source_account_id, transaction_type, amount, status, description, gateway_reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), account_id, 'bill_payment', amount, 'completed', `Bill payment to ${biller.rows[0]?.name || 'Biller'}`, gatewayRef, now]
    );
    client.query(
      'INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, 'transaction', 'Bill Payment', `Bill payment of $${amount} to ${biller.rows[0]?.name || 'Biller'} completed.`, now]
    );
    client.commit();
    res.status(201).json({ message: 'Payment successful', reference: gatewayRef });
  } catch (error) {
    client.rollback();
    console.error('Bill payment error:', error);
    res.status(500).json({ error: 'Payment failed' });
  } finally {
    client.release();
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const result = query(
      `SELECT bp.*, b.name as biller_name, b.category as biller_category
       FROM bill_payments bp
       JOIN billers b ON bp.biller_id = b.id
       WHERE bp.user_id = ?
       ORDER BY bp.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
