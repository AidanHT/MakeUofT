import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitQuestionnaire } from '../services/api';
import './UserQuestionnaire.css';

function UserQuestionnaire({ onSubmit }) {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        age: '',
        weight: '',
        height: '',
        experience: 'beginner',
        poseCount: '4'
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
        setIsLoading(true);

        try {
            // Convert numeric fields to numbers
            const profileData = {
                ...formData,
                age: Number(formData.age),
                weight: Number(formData.weight),
                height: Number(formData.height),
                poseCount: Number(formData.poseCount)
            };

            // Submit to backend
            const response = await submitQuestionnaire(profileData);

            // Call the parent component's onSubmit with the profile data
            onSubmit(response.profile);

            // Navigate to yoga page
            navigate('/yoga');
        } catch (err) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="questionnaire-container">
            <div className="questionnaire-box">
                <h2>Tell Us About Yourself</h2>
                <p className="questionnaire-subtitle">
                    Help us personalize your yoga experience
                </p>

                <form onSubmit={handleSubmit} className="questionnaire-form">
                    <div className="form-group">
                        <label htmlFor="age">Age</label>
                        <input
                            type="number"
                            id="age"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                            required
                            min="13"
                            max="100"
                            placeholder="Enter your age"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="weight">Weight (kg)</label>
                        <input
                            type="number"
                            id="weight"
                            name="weight"
                            value={formData.weight}
                            onChange={handleChange}
                            required
                            min="30"
                            max="200"
                            placeholder="Enter your weight in kg"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="height">Height (cm)</label>
                        <input
                            type="number"
                            id="height"
                            name="height"
                            value={formData.height}
                            onChange={handleChange}
                            required
                            min="100"
                            max="250"
                            placeholder="Enter your height in cm"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="experience">Yoga Experience</label>
                        <select
                            id="experience"
                            name="experience"
                            value={formData.experience}
                            onChange={handleChange}
                            required
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="poseCount">Number of Poses</label>
                        <select
                            id="poseCount"
                            name="poseCount"
                            value={formData.poseCount}
                            onChange={handleChange}
                            required
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                <option key={num} value={num}>
                                    {num} {num === 1 ? 'pose' : 'poses'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Start Your Practice'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default UserQuestionnaire; 