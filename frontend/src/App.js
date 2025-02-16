import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import Login from './components/Login';
import UserQuestionnaire from './components/UserQuestionnaire';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [userPreferences, setUserPreferences] = useState(null);
    const [isNewUser, setIsNewUser] = useState(false);

    const handleLogin = (userData) => {
        setUser(userData);
        setIsNewUser(false);
        localStorage.setItem('userToken', userData.token);
        setUserPreferences(userData.preferences || {
            experience: 'beginner',
            poseCount: 4
        });
    };

    const handleSignup = (userData) => {
        setUser(userData);
        setIsNewUser(true);
        localStorage.setItem('userToken', userData.token);
        setUserPreferences(null);
    };

    const handleQuestionnaireSubmit = (preferences) => {
        setUserPreferences(preferences);
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
        setIsNewUser(false);
    };

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route
                        path="/"
                        element={
                            user ? (
                                <Navigate to="/practice" />
                            ) : (
                                <HomePage />
                            )
                        }
                    />
                    <Route
                        path="/login"
                        element={
                            user ? (
                                isNewUser ? (
                                    <Navigate to="/questionnaire" />
                                ) : (
                                    <Navigate to="/practice" />
                                )
                            ) : (
                                <Login onLogin={handleLogin} onSignup={handleSignup} />
                            )
                        }
                    />
                    <Route
                        path="/questionnaire"
                        element={
                            !user ? (
                                <Navigate to="/login" />
                            ) : !isNewUser ? (
                                <Navigate to="/practice" />
                            ) : (
                                <UserQuestionnaire onSubmit={handleQuestionnaireSubmit} />
                            )
                        }
                    />
                    {/* Protected routes using Layout */}
                    <Route
                        path="/*"
                        element={
                            !user ? (
                                <Navigate to="/login" />
                            ) : isNewUser && !userPreferences ? (
                                <Navigate to="/questionnaire" />
                            ) : (
                                <Layout userPreferences={userPreferences} />
                            )
                        }
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App; 