import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, signup } from '../services/api';
import './Login.css';

function Login({ onLogin, onSignup }) {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate passwords match for signup
        if (isSignUp && formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            let response;
            if (isSignUp) {
                const signupData = {
                    email: formData.email,
                    username: formData.username,
                    password: formData.password
                };
                response = await signup(signupData);
                if (response.user) {
                    onSignup(response.user);
                    navigate('/questionnaire');
                }
            } else {
                response = await login(formData.email, formData.password);
                if (response.user) {
                    onLogin(response.user);
                    navigate('/practice');
                }
            }
        } catch (err) {
            if (err.message && err.message.includes('Network Error')) {
                setError('Unable to connect to the server. Please make sure the server is running and try again.');
            } else if (typeof err === 'string' && err.includes('<!DOCTYPE')) {
                setError('Server connection error. Please try again later.');
            } else {
                setError(err.toString());
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-content">
                    <div className="login-header">
                        <h2>Welcome to MindMaxxing</h2>
                        <p className="login-subtitle">
                            Transform your wellness journey
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="Enter your email"
                            />
                        </div>

                        {isSignUp && (
                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    placeholder="Choose a username"
                                    minLength="3"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter your password"
                                minLength="6"
                            />
                        </div>

                        {isSignUp && (
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="Confirm your password"
                                    minLength="6"
                                />
                            </div>
                        )}

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="submit-button" disabled={isLoading}>
                            {isLoading
                                ? 'Please wait...'
                                : (isSignUp ? 'Sign Up' : 'Sign In')}
                        </button>

                        <p className="toggle-form">
                            {isSignUp
                                ? 'Already have an account? '
                                : "Don't have an account? "}
                            <button
                                type="button"
                                className="toggle-button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError('');
                                    setFormData({
                                        email: '',
                                        username: '',
                                        password: '',
                                        confirmPassword: ''
                                    });
                                }}
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </form>
                </div>

                <div className="vertical-divider"></div>

                <div className="login-info">
                    <h3>Why Choose MindMaxxing?</h3>
                    <p>
                        Join our community and transform your yoga practice with motion-tracking technology.
                    </p>
                    <ul className="benefits-list">
                        <li>Personalized yoga sequences based on your level</li>
                        <li>Real-time pose correction and feedback</li>
                        <li>Track your progress and improvement</li>
                        <li>Access to a variety of yoga styles</li>
                        <li>Practice at your own pace, anytime</li>
                    </ul>
                    <p>
                        Our AI-powered platform adapts to your needs, helping you achieve your yoga goals safely and effectively.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login; 