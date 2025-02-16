import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../services/api';
import './SignUp.css';

const SignUp = () => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validate form data
        if (!formData.email || !formData.username || !formData.password) {
            setError('All fields are required');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const { confirmPassword, ...signupData } = formData;
            const data = await signup(signupData);

            // Store the token
            localStorage.setItem('token', data.token);

            // Navigate to questionnaire
            navigate('/questionnaire');
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'An error occurred during registration');
        } finally {
            setIsLoading(false);
        }
    };

    const navigateToLogin = () => {
        navigate('/');
    };

    return (
        <div className="signup-container">
            <div className="signup-content">
                <div className="signup-box">
                    <div className="signup-header">
                        <h2>Join MindMaxxing</h2>
                        <p className="subtitle">
                            Start your AI-powered fitness journey today
                        </p>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="signup-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="login-prompt">
                        Already have an account?
                        <button onClick={navigateToLogin} className="text-button">
                            Log in
                        </button>
                    </div>
                </div>

                <div className="benefits-section">
                    <h2>Why Join Us?</h2>
                    <div className="benefits-list">
                        <div className="benefit-item">
                            <i className="fas fa-graduation-cap"></i>
                            <p>Personalized learning experience tailored to your needs</p>
                        </div>
                        <div className="benefit-item">
                            <i className="fas fa-chart-line"></i>
                            <p>Track your progress and see your improvement over time</p>
                        </div>
                        <div className="benefit-item">
                            <i className="fas fa-users"></i>
                            <p>Join a community of dedicated learners</p>
                        </div>
                        <div className="benefit-item">
                            <i className="fas fa-clock"></i>
                            <p>Learn at your own pace with flexible practice sessions</p>
                        </div>
                        <div className="benefit-item">
                            <i className="fas fa-star"></i>
                            <p>Access to high-quality practice materials</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp; 