import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ERR_NETWORK') {
            throw new Error('Network Error: Unable to connect to the server');
        }
        if (error.response) {
            throw error.response.data.error || 'An error occurred';
        }
        throw error;
    }
);

export const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const signup = async (userData) => {
    try {
        const response = await api.post('/auth/signup', userData);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const submitQuestionnaire = async (profileData) => {
    try {
        const response = await api.post('/users/questionnaire', {
            age: profileData.age,
            weight: profileData.weight,
            height: profileData.height,
            experience: profileData.experience,
            poseCount: profileData.poseCount,
            practiceDuration: profileData.practiceDuration,
            practiceFrequency: profileData.practiceFrequency,
            focusAreas: profileData.focusAreas
        });

        // Store preferences in localStorage for immediate access
        if (response.data.profile) {
            localStorage.setItem('userPreferences', JSON.stringify({
                experience: response.data.profile.experience,
                poseCount: response.data.profile.poseCount,
                practiceDuration: response.data.profile.practiceDuration,
                practiceFrequency: response.data.profile.practiceFrequency,
                focusAreas: response.data.profile.focusAreas
            }));
        }

        return response.data;
    } catch (error) {
        console.error('Questionnaire submission error:', error);
        throw error;
    }
};

export const getUserProfile = async () => {
    try {
        const response = await api.get('/user/profile');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem('token');
};

export default api; 