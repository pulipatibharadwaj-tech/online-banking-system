import React, { useState, useEffect } from 'react';
import API from '../api/axios';

const Beneficiaries = () => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [form, setForm] = useState({ nickname: '', account_number: '', bank_name: '', sort_code: '' });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const fetchBeneficiaries = async () => {
    try {
      const res = await API.get('/beneficiaries');
      setBeneficiaries(res.data);
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
      if (editing) {
        await API.put(`/beneficiaries/${editing}`, form);
        setMessage('Beneficiary updated');
      } else {
        await API.post('/beneficiaries', form);
        setMessage('Beneficiary added');
      }
      setForm({ nickname: '', account_number: '', bank_name: '', sort_code: '' });
      setEditing(null);
      fetchBeneficiaries();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (b) => {
    setForm({ nickname: b.nickname, account_number: b.account_number, bank_name: b.bank_name || '', sort_code: b.sort_code || '' });
    setEditing(b.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this beneficiary?')) return;
    try {
      await API.delete(`/beneficiaries/${id}`);
      setMessage('Beneficiary deleted');
      fetchBeneficiaries();
    } catch (err) {
      setError('Delete failed');
    }
  };

  const handleCancel = () => {
    setForm({ nickname: '', account_number: '', bank_name: '', sort_code: '' });
    setEditing(null);
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Beneficiaries</h1></div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>{editing ? 'Edit Beneficiary' : 'Add Beneficiary'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nickname</label>
              <input type="text" name="nickname" value={form.nickname} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Account Number</label>
              <input type="text" name="account_number" value={form.account_number} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Bank Name</label>
              <input type="text" name="bank_name" value={form.bank_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Sort Code</label>
              <input type="text" name="sort_code" value={form.sort_code} onChange={handleChange} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto' }}>
              {loading ? 'Saving...' : editing ? 'Update' : 'Add Beneficiary'}
            </button>
            {editing && <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Saved Beneficiaries</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Nickname</th><th>Account</th><th>Bank</th><th>Sort Code</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {beneficiaries.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>No beneficiaries added yet</td></tr>
              ) : (
                beneficiaries.map((b) => (
                  <tr key={b.id}>
                    <td>{b.nickname}</td>
                    <td>{b.account_number}</td>
                    <td>{b.bank_name || '-'}</td>
                    <td>{b.sort_code || '-'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(b)} style={{ marginRight: '0.3rem' }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}>Delete</button>
                    </td>
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

export default Beneficiaries;
