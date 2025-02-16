import React, { useState, useEffect } from 'react';
import './UserProfile.css';

const UserProfile = ({ userPreferences }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState({
        personal: false,
        preferences: false
    });

    const [personalInfo, setPersonalInfo] = useState({
        email: '',
        username: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [preferences, setPreferences] = useState({
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
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('userToken');

                // Fetch user profile data
                const profileResponse = await fetch('http://localhost:5000/api/users/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!profileResponse.ok) {
                    throw new Error('Failed to fetch profile data');
                }

                const profileData = await profileResponse.json();

                // Set personal info from user data
                setPersonalInfo(prev => ({
                    ...prev,
                    email: profileData.email || '',
                    username: profileData.username || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                }));

                // Set preferences from profile data
                if (profileData.preferences) {
                    setPreferences({
                        age: profileData.preferences.age?.toString() || '',
                        weight: profileData.preferences.weight?.toString() || '',
                        height: profileData.preferences.height?.toString() || '',
                        experience: profileData.preferences.experienceLevel || 'beginner',
                        poseCount: profileData.preferences.poseCount?.toString() || '4',
                        practiceDuration: profileData.preferences.practiceDuration?.toString() || '30',
                        practiceFrequency: profileData.preferences.practiceFrequency || 'weekly',
                        focusAreas: profileData.preferences.focusAreas || []
                    });
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.message);
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handlePersonalInfoSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('userToken');
            const response = await fetch('http://localhost:5000/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: personalInfo.email,
                    username: personalInfo.username,
                    currentPassword: personalInfo.currentPassword,
                    newPassword: personalInfo.newPassword
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            setEditMode({ ...editMode, personal: false });
            setPersonalInfo(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));
        } catch (err) {
            setError(err.message);
        }
    };

    const handlePreferencesSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('userToken');

            // Convert string values to numbers where needed
            const updatedPreferences = {
                name: personalInfo.username, // Include name from personal info
                experienceLevel: preferences.experience,
                practiceDuration: parseInt(preferences.practiceDuration),
                practiceFrequency: preferences.practiceFrequency,
                focusAreas: preferences.focusAreas,
                // Additional profile data
                age: parseInt(preferences.age),
                weight: parseInt(preferences.weight),
                height: parseInt(preferences.height),
                poseCount: parseInt(preferences.poseCount)
            };

            // Update preferences
            const response = await fetch('http://localhost:5000/api/users/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedPreferences)
            });

            if (!response.ok) {
                throw new Error('Failed to update preferences');
            }

            const data = await response.json();
            setEditMode({ ...editMode, preferences: false });
        } catch (err) {
            setError(err.message);
        }
    };

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="user-profile">
            <div className="profile-header">
                <h1>Profile Settings</h1>
                <p className="profile-subtitle">Update your profile information and preferences</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="profile-section">
                <div className="section-header">
                    <h2>Personal Information</h2>
                    <button
                        className="edit-button"
                        onClick={() => setEditMode({ ...editMode, personal: !editMode.personal })}
                    >
                        {editMode.personal ? 'Cancel' : 'Edit'}
                    </button>
                </div>

                <form onSubmit={handlePersonalInfoSubmit} className="profile-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={personalInfo.email}
                            onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                            disabled={!editMode.personal}
                            className={!editMode.personal ? 'readonly' : ''}
                        />
                    </div>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={personalInfo.username}
                            onChange={(e) => setPersonalInfo({ ...personalInfo, username: e.target.value })}
                            disabled={!editMode.personal}
                            className={!editMode.personal ? 'readonly' : ''}
                        />
                    </div>
                    {editMode.personal && (
                        <>
                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    value={personalInfo.currentPassword}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, currentPassword: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={personalInfo.newPassword}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, newPassword: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    value={personalInfo.confirmPassword}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, confirmPassword: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="save-button">Save Changes</button>
                        </>
                    )}
                </form>
            </div>

            <div className="profile-section">
                <div className="section-header">
                    <h2>Practice Preferences</h2>
                    <button
                        className="edit-button"
                        onClick={() => setEditMode({ ...editMode, preferences: !editMode.preferences })}
                    >
                        {editMode.preferences ? 'Cancel' : 'Edit'}
                    </button>
                </div>

                <form onSubmit={handlePreferencesSubmit} className="profile-form">
                    <div className="form-group">
                        <label>Age</label>
                        <input
                            type="number"
                            value={preferences.age}
                            onChange={(e) => setPreferences({ ...preferences, age: e.target.value })}
                            disabled={!editMode.preferences}
                            className={!editMode.preferences ? 'readonly' : ''}
                            min="13"
                            max="100"
                        />
                    </div>
                    <div className="form-group">
                        <label>Weight (kg)</label>
                        <input
                            type="number"
                            value={preferences.weight}
                            onChange={(e) => setPreferences({ ...preferences, weight: e.target.value })}
                            disabled={!editMode.preferences}
                            className={!editMode.preferences ? 'readonly' : ''}
                            min="30"
                            max="200"
                        />
                    </div>
                    <div className="form-group">
                        <label>Height (cm)</label>
                        <input
                            type="number"
                            value={preferences.height}
                            onChange={(e) => setPreferences({ ...preferences, height: e.target.value })}
                            disabled={!editMode.preferences}
                            className={!editMode.preferences ? 'readonly' : ''}
                            min="100"
                            max="250"
                        />
                    </div>
                    <div className="form-group">
                        <label>Experience Level</label>
                        <select
                            value={preferences.experience}
                            onChange={(e) => setPreferences({ ...preferences, experience: e.target.value })}
                            disabled={!editMode.preferences}
                            className={!editMode.preferences ? 'readonly' : ''}
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Number of Poses</label>
                        <select
                            value={preferences.poseCount}
                            onChange={(e) => setPreferences({ ...preferences, poseCount: e.target.value })}
                            disabled={!editMode.preferences}
                            className={!editMode.preferences ? 'readonly' : ''}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                <option key={num} value={num}>
                                    {num} {num === 1 ? 'pose' : 'poses'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Practice Duration (minutes)</label>
                        <select
                            value={preferences.practiceDuration}
                            onChange={(e) => setPreferences({ ...preferences, practiceDuration: e.target.value })}
                            disabled={!editMode.preferences}
                            className={!editMode.preferences ? 'readonly' : ''}
                        >
                            <option value="15">15</option>
                            <option value="30">30</option>
                            <option value="45">45</option>
                            <option value="60">60</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Practice Frequency</label>
                        <select
                            value={preferences.practiceFrequency}
                            onChange={(e) => setPreferences({ ...preferences, practiceFrequency: e.target.value })}
                            disabled={!editMode.preferences}
                            className={!editMode.preferences ? 'readonly' : ''}
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">2-3 times per week</option>
                            <option value="occasional">Occasional</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Focus Areas</label>
                        <div className="checkbox-group">
                            {['Flexibility', 'Strength', 'Balance', 'Mindfulness'].map(area => (
                                <label key={area} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={preferences.focusAreas.includes(area)}
                                        onChange={(e) => {
                                            const updatedAreas = e.target.checked
                                                ? [...preferences.focusAreas, area]
                                                : preferences.focusAreas.filter(a => a !== area);
                                            setPreferences({ ...preferences, focusAreas: updatedAreas });
                                        }}
                                        disabled={!editMode.preferences}
                                    />
                                    {area}
                                </label>
                            ))}
                        </div>
                    </div>
                    {editMode.preferences && (
                        <button type="submit" className="save-button">Save Changes</button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default UserProfile; 