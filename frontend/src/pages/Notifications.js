import React, { useState, useEffect } from 'react';
import API from '../api/axios';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Notifications {unreadCount > 0 && <span className="badge badge-info">{unreadCount} unread</span>}</h1>
        {unreadCount > 0 && <button className="btn btn-secondary btn-sm" onClick={markAllRead}>Mark all read</button>}
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>No notifications</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && markAsRead(n.id)} style={{ cursor: 'pointer' }}>
              <div className="notif-content">
                <h4>{n.title}</h4>
                <p>{n.message}</p>
              </div>
              <div className="notif-time">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
