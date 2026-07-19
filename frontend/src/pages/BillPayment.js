import React, { useState, useEffect } from 'react';
import API from '../api/axios';

const BillPayment = () => {
  const [accounts, setAccounts] = useState([]);
  const [billers, setBillers] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ account_id: '', biller_id: '', amount: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accRes, billerRes, histRes] = await Promise.all([
        API.get('/accounts'),
        API.get('/bills/billers'),
        API.get('/bills/history'),
      ]);
      setAccounts(accRes.data);
      setBillers(billerRes.data);
      setHistory(histRes.data);
      if (accRes.data.length > 0) setForm((f) => ({ ...f, account_id: accRes.data[0].id }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await API.post('/bills/pay', {
        account_id: form.account_id,
        biller_id: form.biller_id,
        amount: parseFloat(form.amount),
      });
      setMessage(`Payment successful! Reference: ${res.data.reference}`);
      setForm((f) => ({ ...f, biller_id: '', amount: '' }));
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Bill Payments</h1></div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Pay a Bill</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>From Account</label>
              <select name="account_id" value={form.account_id} onChange={handleChange} required>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.account_number} (${parseFloat(acc.balance).toFixed(2)})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Biller</label>
              <select name="biller_id" value={form.biller_id} onChange={handleChange} required>
                <option value="">Select biller</option>
                {billers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.category})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Amount ($)</label>
            <input type="number" name="amount" value={form.amount} onChange={handleChange} min="0.01" step="0.01" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto' }}>
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Payment History</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Date</th><th>Biller</th><th>Category</th><th>Amount</th><th>Status</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>No payments yet</td></tr>
              ) : (
                history.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>{p.biller_name}</td>
                    <td><span className="badge badge-info">{p.biller_category}</span></td>
                    <td>${parseFloat(p.amount).toFixed(2)}</td>
                    <td><span className={`badge badge-${p.status === 'completed' ? 'success' : 'danger'}`}>{p.status}</span></td>
                    <td style={{ fontSize: '0.8rem', color: '#999' }}>{p.gateway_reference}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillPayment;
