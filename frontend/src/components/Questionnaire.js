import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitQuestionnaire } from '../services/api';
import './Questionnaire.css';

const Questionnaire = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        experienceLevel: 'beginner',
        practiceDuration: 30,
        focusAreas: [],
        practiceFrequency: '2-3 times per week'
    });

    const experienceLevels = [
        { value: 'beginner', label: 'Beginner - New to yoga' },
        { value: 'intermediate', label: 'Intermediate - Regular practice' },
        { value: 'advanced', label: 'Advanced - Experienced yogi' }
    ];

    const focusAreaOptions = [
        { value: 'flexibility', label: 'Flexibility' },
        { value: 'strength', label: 'Strength' },
        { value: 'balance', label: 'Balance' },
        { value: 'mindfulness', label: 'Mindfulness' },
        { value: 'stress-relief', label: 'Stress Relief' },
        { value: 'posture', label: 'Posture Improvement' }
    ];

    const durationOptions = [
        { value: 15, label: '15 minutes' },
        { value: 30, label: '30 minutes' },
        { value: 45, label: '45 minutes' },
        { value: 60, label: '60 minutes' }
    ];

    const frequencyOptions = [
        { value: 'daily', label: 'Daily' },
        { value: '2-3 times per week', label: '2-3 times per week' },
        { value: 'weekly', label: 'Once a week' },
        { value: 'occasionally', label: 'Occasionally' }
    ];

    const handleChange = (e) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const updatedFocusAreas = [...formData.focusAreas];
            if (e.target.checked) {
                updatedFocusAreas.push(value);
            } else {
                const index = updatedFocusAreas.indexOf(value);
                if (index > -1) {
                    updatedFocusAreas.splice(index, 1);
                }
            }
            setFormData(prev => ({
                ...prev,
                focusAreas: updatedFocusAreas
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
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const data = await submitQuestionnaire(formData);

            // Store preferences in localStorage
            localStorage.setItem('userPreferences', JSON.stringify(data.preferences));

            // Navigate to user profile page
            navigate('/profile');
        } catch (err) {
            setError(err.message || 'Failed to save preferences');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="questionnaire-container">
            <div className="questionnaire-box">
                <h1>Personalize Your Practice</h1>
                <p className="subtitle">Help us customize your yoga experience</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Your Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Enter your name"
                        />
                    </div>

                    <div className="form-group">
                        <label>Experience Level</label>
                        <select
                            name="experienceLevel"
                            value={formData.experienceLevel}
                            onChange={handleChange}
                            required
                        >
                            {experienceLevels.map(level => (
                                <option key={level.value} value={level.value}>
                                    {level.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Preferred Practice Duration</label>
                        <select
                            name="practiceDuration"
                            value={formData.practiceDuration}
                            onChange={handleChange}
                            required
                        >
                            {durationOptions.map(duration => (
                                <option key={duration.value} value={duration.value}>
                                    {duration.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Practice Frequency</label>
                        <select
                            name="practiceFrequency"
                            value={formData.practiceFrequency}
                            onChange={handleChange}
                            required
                        >
                            {frequencyOptions.map(frequency => (
                                <option key={frequency.value} value={frequency.value}>
                                    {frequency.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Areas of Focus (Select all that apply)</label>
                        <div className="checkbox-group">
                            {focusAreaOptions.map(area => (
                                <label key={area.value} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="focusAreas"
                                        value={area.value}
                                        checked={formData.focusAreas.includes(area.value)}
                                        onChange={handleChange}
                                    />
                                    {area.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Start Your Journey'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Questionnaire; 