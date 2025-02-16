import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PoseTracker from './components/PoseTracker';
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
        setIsNewUser(false); // Existing users are not new
        // For existing users, we'll try to load their preferences from the backend
        // This is a placeholder - you should implement the actual API call
        setUserPreferences(userData.preferences || {
            experience: 'beginner',
            poseCount: 4
        });
    };

    const handleSignup = (userData) => {
        setUser(userData);
        setIsNewUser(true); // Mark as new user on signup
        setUserPreferences(null); // New users need to fill out the questionnaire
    };

    const handleQuestionnaireSubmit = (preferences) => {
        setUserPreferences(preferences);
        setIsNewUser(false); // Reset new user flag after questionnaire
    };

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route
                        path="/login"
                        element={
                            user ? (
                                isNewUser ? (
                                    <Navigate to="/questionnaire" />
                                ) : (
                                    <Navigate to="/yoga" />
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
                                <Navigate to="/yoga" />
                            ) : (
                                <UserQuestionnaire onSubmit={handleQuestionnaireSubmit} />
                            )
                        }
                    />
                    <Route
                        path="/yoga"
                        element={
                            !user ? (
                                <Navigate to="/login" />
                            ) : isNewUser && !userPreferences ? (
                                <Navigate to="/questionnaire" />
                            ) : (
                                <PoseTracker userPreferences={userPreferences} />
                            )
                        }
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App; 