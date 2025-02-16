import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PoseTracker from './PoseTracker';
import UserProfile from './UserProfile';
import './Layout.css';

const Layout = ({ userPreferences }) => {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('token');
    const storedPreferences = userPreferences || JSON.parse(localStorage.getItem('userPreferences'));

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (!storedPreferences) {
        return <Navigate to="/questionnaire" replace />;
    }

    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content">
                <Routes>
                    <Route
                        path="/practice"
                        element={<PoseTracker userPreferences={storedPreferences} />}
                    />
                    <Route
                        path="/profile"
                        element={<UserProfile userPreferences={storedPreferences} />}
                    />
                    <Route
                        path="*"
                        element={<Navigate to="/practice" replace />}
                    />
                </Routes>
            </main>
        </div>
    );
};

export default Layout; 