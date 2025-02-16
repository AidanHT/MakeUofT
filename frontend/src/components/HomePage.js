import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <div className="home-content">
                <h1>Welcome to MindMaxxing</h1>
                <p className="tagline">Your personal AI-powered yoga instructor</p>

                <div className="features">
                    <div className="feature-card">
                        <i className="feature-icon">🧘</i>
                        <h3>Personalized Practice</h3>
                        <p>Get customized yoga sequences based on your experience and goals</p>
                    </div>
                    <div className="feature-card">
                        <i className="feature-icon">🎯</i>
                        <h3>Real-time Feedback</h3>
                        <p>Receive instant pose corrections and alignment guidance</p>
                    </div>
                    <div className="feature-card">
                        <i className="feature-icon">📈</i>
                        <h3>Track Progress</h3>
                        <p>Monitor your improvement and stay motivated</p>
                    </div>
                </div>

                <div className="cta-buttons">
                    <button
                        className="primary-button"
                        onClick={() => navigate('/login')}
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );
}

export default HomePage; 