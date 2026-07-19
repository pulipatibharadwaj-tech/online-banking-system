import React, { useState, useEffect } from 'react';
import API from '../../api/axios';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, custRes] = await Promise.all([
        API.get('/admin/dashboard'),
        API.get('/admin/customers'),
      ]);
      setData(dashRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomer = async (id) => {
    try {
      await API.put(`/admin/customers/${id}/toggle`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading admin dashboard...</div>;
  if (!data) return <div className="loading">Failed to load</div>;

  return (
    <div className="page-container">
      <div className="page-header"><h1>Admin Dashboard</h1></div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">{data.totalCustomers}</div>
          <div className="stat-label">Total Customers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.totalAccounts}</div>
          <div className="stat-label">Total Accounts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${parseFloat(data.totalBalance).toFixed(2)}</div>
          <div className="stat-label">Total Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.todayTransactions}</div>
          <div className="stat-label">Today's Transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${parseFloat(data.todayVolume).toFixed(2)}</div>
          <div className="stat-label">Today's Volume</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.failedTransactions}</div>
          <div className="stat-label">Failed Transactions</div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Transactions</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Date</th><th>Customer</th><th>Type</th><th>Amount</th><th>Status</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {data.recentTransactions.map((tx) => (
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

      <div className="card">
        <h3>Customer Accounts</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>Accounts</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.full_name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.account_count}</td>
                  <td><span className={`badge badge-${c.is_active ? 'success' : 'danger'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button className={`btn btn-sm ${c.is_active ? 'btn-danger' : 'btn-secondary'}`} onClick={() => toggleCustomer(c.id)}>
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
