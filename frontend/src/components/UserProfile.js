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
                const token = localStorage.getItem('token');

                // Fetch user personal data
                const userResponse = await fetch('http://localhost:5000/api/users/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!userResponse.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const userData = await userResponse.json();
                console.log('Fetched user data:', userData);

                setPersonalInfo(prev => ({
                    ...prev,
                    email: userData.email || '',
                    username: userData.username || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                }));

                // Fetch user preferences from the correct endpoint
                const prefResponse = await fetch('http://localhost:5000/api/users/preferences', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (prefResponse.ok) {
                    const prefData = await prefResponse.json();
                    console.log('Fetched preferences data:', prefData);

                    setPreferences(prev => ({
                        ...prev,
                        age: prefData.age?.toString() || '',
                        weight: prefData.weight?.toString() || '',
                        height: prefData.height?.toString() || '',
                        experience: prefData.experience || 'beginner',
                        poseCount: prefData.poseCount?.toString() || '4',
                        practiceDuration: prefData.practiceDuration?.toString() || '30',
                        practiceFrequency: prefData.practiceFrequency || 'weekly',
                        focusAreas: prefData.focusAreas || []
                    }));
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
            const token = localStorage.getItem('token');
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
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update profile');
            }

            const updatedData = await response.json();
            setPersonalInfo(prev => ({
                ...prev,
                email: updatedData.email || prev.email,
                username: updatedData.username || prev.username,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));

            setEditMode({ ...editMode, personal: false });
        } catch (err) {
            setError(err.message);
        }
    };

    const handlePreferencesSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            // Prepare updated preferences for the profile update endpoint
            const updatedPreferences = {
                email: personalInfo.email,
                age: parseInt(preferences.age),
                weight: parseInt(preferences.weight),
                height: parseInt(preferences.height),
                experience: preferences.experience,
                poseCount: parseInt(preferences.poseCount)
            };

            // Update profile preferences
            const profileResponse = await fetch('http://localhost:5000/api/users/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedPreferences)
            });

            if (!profileResponse.ok) {
                const errorData = await profileResponse.json();
                throw new Error(errorData.error || 'Failed to update profile preferences');
            }

            const profileData = await profileResponse.json();

            // Update additional user preferences
            const userPrefs = {
                practiceDuration: parseInt(preferences.practiceDuration),
                practiceFrequency: preferences.practiceFrequency,
                focusAreas: preferences.focusAreas
            };

            const userResponse = await fetch('http://localhost:5000/api/users/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userPrefs)
            });

            if (!userResponse.ok) {
                const errorData = await userResponse.json();
                throw new Error(errorData.error || 'Failed to update user preferences');
            }

            const userData = await userResponse.json();

            // Merge the responses into the local state
            setPreferences(prev => ({
                ...prev,
                age: profileData.age?.toString() || prev.age,
                weight: profileData.weight?.toString() || prev.weight,
                height: profileData.height?.toString() || prev.height,
                experience: profileData.experience || prev.experience,
                poseCount: profileData.poseCount?.toString() || prev.poseCount,
                practiceDuration: userData.practiceDuration?.toString() || prev.practiceDuration,
                practiceFrequency: userData.practiceFrequency || prev.practiceFrequency,
                focusAreas: userData.focusAreas || prev.focusAreas
            }));

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
