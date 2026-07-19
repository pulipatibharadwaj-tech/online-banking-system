import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await API.get('/accounts/dashboard/summary');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="loading">Failed to load dashboard</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {user?.full_name}</h1>
      </div>

      <div className="balance-cards">
        {data.accounts.map((acc) => (
          <div key={acc.id} className="balance-card">
            <h4>{acc.account_type === 'checking' ? 'Checking Account' : 'Savings Account'}</h4>
            <div className="amount">${parseFloat(acc.balance).toFixed(2)}</div>
            <div className="account-number">{acc.account_number}</div>
          </div>
        ))}
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">${parseFloat(data.totalBalance).toFixed(2)}</div>
          <div className="stat-label">Total Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.recentTransactions.length}</div>
          <div className="stat-label">Recent Transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.unreadNotifications}</div>
          <div className="stat-label">Unread Alerts</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Recent Transactions</h3>
          <Link to="/transfer" className="btn btn-primary btn-sm">New Transfer</Link>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>No transactions yet</td></tr>
              ) : (
                data.recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td><span className={`badge badge-${tx.transaction_type === 'transfer' ? 'info' : 'warning'}`}>{tx.transaction_type.replace('_', ' ')}</span></td>
                    <td>{tx.description || '-'}</td>
                    <td style={{ fontWeight: 600 }}>${parseFloat(tx.amount).toFixed(2)}</td>
                    <td><span className={`badge badge-${tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'}`}>{tx.status}</span></td>
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

export default Dashboard;
