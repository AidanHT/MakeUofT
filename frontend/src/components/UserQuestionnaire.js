import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitQuestionnaire } from '../services/api';
import './UserQuestionnaire.css';

function UserQuestionnaire({ onSubmit }) {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        age: '',
        weight: '',
        height: '',
        experience: 'beginner',
        poseCount: '4',
        practiceDuration: '30',
        practiceFrequency: 'weekly',
        focusAreas: []
    });

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem('token');

                // Fetch user profile data
                const profileResponse = await fetch('http://localhost:5000/api/users/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    // Update form data with existing profile data
                    setFormData(prev => ({
                        age: profileData.age?.toString() || '',
                        weight: profileData.weight?.toString() || '',
                        height: profileData.height?.toString() || '',
                        experience: profileData.experience || 'beginner',
                        poseCount: profileData.poseCount?.toString() || '4',
                        practiceDuration: profileData.practiceDuration?.toString() || '30',
                        practiceFrequency: profileData.practiceFrequency || 'weekly',
                        focusAreas: profileData.focusAreas || []
                    }));
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
                // Don't set error - just use default values if fetch fails
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            const updatedAreas = checked
                ? [...formData.focusAreas, value]
                : formData.focusAreas.filter(area => area !== value);
            setFormData(prev => ({
                ...prev,
                focusAreas: updatedAreas
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Convert numeric fields to numbers
            const profileData = {
                age: Number(formData.age),
                weight: Number(formData.weight),
                height: Number(formData.height),
                experience: formData.experience,
                poseCount: Number(formData.poseCount),
                practiceDuration: Number(formData.practiceDuration),
                practiceFrequency: formData.practiceFrequency,
                focusAreas: formData.focusAreas
            };

            // Submit to backend
            const response = await submitQuestionnaire(profileData);

            // Call the parent component's onSubmit with the profile data
            onSubmit(response.profile);

            // Navigate to practice page
            navigate('/practice');
        } catch (err) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="questionnaire-container">
                <div className="questionnaire-box">
                    <div className="loading">Loading your profile data...</div>
                </div>
            </div>
        );
    }

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
                            placeholder={formData.age ? undefined : "Enter your age"}
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
                            placeholder={formData.weight ? undefined : "Enter your weight in kg"}
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
                            placeholder={formData.height ? undefined : "Enter your height in cm"}
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

                    <div className="form-group">
                        <label htmlFor="practiceDuration">Practice Duration (minutes)</label>
                        <select
                            id="practiceDuration"
                            name="practiceDuration"
                            value={formData.practiceDuration}
                            onChange={handleChange}
                            required
                        >
                            <option value="15">15</option>
                            <option value="30">30</option>
                            <option value="45">45</option>
                            <option value="60">60</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="practiceFrequency">Practice Frequency</label>
                        <select
                            id="practiceFrequency"
                            name="practiceFrequency"
                            value={formData.practiceFrequency}
                            onChange={handleChange}
                            required
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">2-3 times per week</option>
                            <option value="occasional">Occasional</option>
                        </select>
                    </div>

                    <div className="form-group focus-areas">
                        <label>Focus Areas</label>
                        <div className="checkbox-group">
                            {['Flexibility', 'Strength', 'Balance', 'Mindfulness'].map(area => (
                                <label key={area} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="focusAreas"
                                        value={area}
                                        checked={formData.focusAreas.includes(area)}
                                        onChange={handleChange}
                                    />
                                    {area}
                                </label>
                            ))}
                        </div>
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