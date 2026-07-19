import React, { useState, useEffect } from 'react';
import API from '../api/axios';

const Transfer = () => {
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [form, setForm] = useState({ source_account_id: '', destination_account_id: '', beneficiary_id: '', amount: '', description: '' });
  const [useBeneficiary, setUseBeneficiary] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accRes, benRes, txRes] = await Promise.all([
        API.get('/accounts'),
        API.get('/beneficiaries'),
        API.get('/transfers'),
      ]);
      setAccounts(accRes.data);
      setBeneficiaries(benRes.data);
      setTransactions(txRes.data);
      if (accRes.data.length > 0) setForm((f) => ({ ...f, source_account_id: accRes.data[0].id }));
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
      const payload = {
        source_account_id: form.source_account_id,
        amount: parseFloat(form.amount),
        description: form.description,
      };
      if (useBeneficiary && form.beneficiary_id) {
        payload.beneficiary_id = form.beneficiary_id;
      } else if (form.destination_account_id) {
        payload.destination_account_id = form.destination_account_id;
      }
      const res = await API.post('/transfers', payload);
      setMessage(`Transfer successful! Reference: ${res.data.transaction.gateway_reference}`);
      setForm((f) => ({ ...f, amount: '', description: '', destination_account_id: '', beneficiary_id: '' }));
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Transfer Funds</h1></div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>From Account</label>
            <select name="source_account_id" value={form.source_account_id} onChange={handleChange} required>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.account_number} (${parseFloat(acc.balance).toFixed(2)})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <input type="checkbox" checked={useBeneficiary} onChange={(e) => setUseBeneficiary(e.target.checked)} style={{ marginRight: '0.5rem' }} />
              Transfer to saved beneficiary
            </label>
          </div>

          {useBeneficiary ? (
            <div className="form-group">
              <label>Beneficiary</label>
              <select name="beneficiary_id" value={form.beneficiary_id} onChange={handleChange} required>
                <option value="">Select beneficiary</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>{b.nickname} ({b.account_number})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Destination Account Number</label>
              <input type="text" name="destination_account_id" value={form.destination_account_id} onChange={handleChange} placeholder="Enter account number" required />
            </div>
          )}

          <div className="form-group">
            <label>Amount ($)</label>
            <input type="number" name="amount" value={form.amount} onChange={handleChange} min="0.01" step="0.01" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input type="text" name="description" value={form.description} onChange={handleChange} placeholder="Optional" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto' }}>
            {loading ? 'Processing...' : 'Transfer'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Transaction History</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {transactions.slice(0, 20).map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td><span className="badge badge-info">{tx.transaction_type.replace('_', ' ')}</span></td>
                  <td>{tx.description || '-'}</td>
                  <td>${parseFloat(tx.amount).toFixed(2)}</td>
                  <td><span className={`badge badge-${tx.status === 'completed' ? 'success' : 'danger'}`}>{tx.status}</span></td>
                  <td style={{ fontSize: '0.8rem', color: '#999' }}>{tx.gateway_reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
