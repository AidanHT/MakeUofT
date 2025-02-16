import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => {
        return location.pathname === path;
    };

    const handleLogout = () => {
        // Clear all stored data
        localStorage.removeItem('userToken');
        localStorage.removeItem('userPreferences');
        // Navigate to home page
        navigate('/');
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2>YogaAI</h2>
            </div>
            <nav className="sidebar-nav">
                <Link
                    to="/practice"
                    className={`nav-item ${isActive('/practice') ? 'active' : ''}`}
                >
                    <i className="fas fa-om"></i>
                    Practice
                </Link>
                <Link
                    to="/profile"
                    className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
                >
                    <i className="fas fa-user"></i>
                    Profile
                </Link>
            </nav>
            <div className="sidebar-footer">
                <button onClick={handleLogout} className="logout-button">
                    <i className="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar; 