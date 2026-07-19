const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone, date_of_birth, password } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    const existing = query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const accountNumber = 'GB' + Date.now().toString().slice(-10);
    const now = new Date().toISOString();

    query('INSERT INTO users (id, full_name, email, phone, date_of_birth, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, full_name, email, phone || null, date_of_birth || null, password_hash, now, now]);

    const accountId = uuidv4();
    query('INSERT INTO accounts (id, user_id, account_number, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [accountId, userId, accountNumber, 1000.00, now, now]);

    query('INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, 'system', 'Welcome to GD Bank', 'Your account has been created successfully.', now]);

    const token = jwt.sign(
      { id: userId, email, role: 'customer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, full_name, email, role: 'customer' },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = query('SELECT * FROM users WHERE email = ?', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account is locked. Try again later.' });
    }
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const attempts = user.failed_login_attempts + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      query('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockUntil, user.id]);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = query('SELECT id FROM users WHERE email = ?', [email]);
    if (result.rows.length === 0) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    query('INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), result.rows[0].id, token, expiresAt]);
    res.json({ message: 'If the email exists, a reset link has been sent.', resetToken: token });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const now = new Date().toISOString();
    const result = query(
      'SELECT user_id FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?',
      [token, now]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, result.rows[0].user_id]);
    query('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token]);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const result = query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(new_password, 10);
    query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
