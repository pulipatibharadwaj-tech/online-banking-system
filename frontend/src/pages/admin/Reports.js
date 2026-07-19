import React, { useState } from 'react';
import API from '../../api/axios';

const Reports = () => {
  const [filters, setFilters] = useState({ start_date: '', end_date: '', type: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const generateReport = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.type) params.type = filters.type;
      const res = await API.get('/admin/reports', { params });
      setReport(res.data);
    } catch (err) {
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!report) return;
    const headers = ['Date', 'Customer', 'Type', 'Amount', 'Status', 'Reference'];
    const rows = report.transactions.map((tx) => [
      new Date(tx.created_at).toLocaleString(),
      tx.customer_name,
      tx.transaction_type,
      tx.amount,
      tx.status,
      tx.gateway_reference,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.csv';
    a.click();
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Reports</h1></div>

      <div className="card">
        <h3>Generate Report</h3>
        <form onSubmit={generateReport}>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" name="start_date" value={filters.start_date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" name="end_date" value={filters.end_date} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Transaction Type</label>
            <select name="type" value={filters.type} onChange={handleChange}>
              <option value="">All Types</option>
              <option value="transfer">Transfer</option>
              <option value="bill_payment">Bill Payment</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto' }}>
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            {report && <button type="button" className="btn btn-secondary" onClick={exportCSV}>Export CSV</button>}
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {report && (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-value">{report.summary.totalTransactions}</div>
              <div className="stat-label">Total Transactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${report.summary.totalAmount.toFixed(2)}</div>
              <div className="stat-label">Total Amount</div>
            </div>
            {Object.entries(report.summary.byType).map(([type, data]) => (
              <div key={type} className="stat-card">
                <div className="stat-value">{data.count}</div>
                <div className="stat-label">{type.replace('_', ' ')} (${data.total.toFixed(2)})</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Report Results ({report.transactions.length} transactions)</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Date</th><th>Customer</th><th>Type</th><th>Amount</th><th>Status</th><th>Reference</th></tr>
                </thead>
                <tbody>
                  {report.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleString()}</td>
                      <td>{tx.customer_name}</td>
                      <td><span className="badge badge-info">{tx.transaction_type.replace('_', ' ')}</span></td>
                      <td>${parseFloat(tx.amount).toFixed(2)}</td>
                      <td><span className={`badge badge-${tx.status === 'completed' ? 'success' : 'danger'}`}>{tx.status}</span></td>
                      <td style={{ fontSize: '0.8rem', color: '#999' }}>{tx.gateway_reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
