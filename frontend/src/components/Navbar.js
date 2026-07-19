import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/dashboard">GD Bank</Link>
      </div>
      <div className="nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/transfer">Transfer</Link>
        <Link to="/beneficiaries">Beneficiaries</Link>
        <Link to="/bills">Bills</Link>
        <Link to="/notifications">Notifications</Link>
        <Link to="/profile">Profile</Link>
        {user.role === 'admin' && <Link to="/admin">Admin</Link>}
        <span className="nav-user">{user.full_name}</span>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
