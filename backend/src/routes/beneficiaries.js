const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = query('SELECT * FROM beneficiaries WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nickname, account_number, bank_name, sort_code } = req.body;
    if (!nickname || !account_number) {
      return res.status(400).json({ error: 'Nickname and account number are required' });
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    query(
      'INSERT INTO beneficiaries (id, user_id, nickname, account_number, bank_name, sort_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, nickname, account_number, bank_name || null, sort_code || null, now, now]
    );
    const result = query('SELECT * FROM beneficiaries WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { nickname, account_number, bank_name, sort_code } = req.body;
    const now = new Date().toISOString();
    query(
      `UPDATE beneficiaries 
       SET nickname = COALESCE(?, nickname),
           account_number = COALESCE(?, account_number),
           bank_name = COALESCE(?, bank_name),
           sort_code = COALESCE(?, sort_code),
           updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [nickname, account_number, bank_name, sort_code, now, req.params.id, req.user.id]
    );
    const result = query('SELECT * FROM beneficiaries WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Beneficiary not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = query('SELECT id FROM beneficiaries WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Beneficiary not found' });
    query('DELETE FROM beneficiaries WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Beneficiary deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
