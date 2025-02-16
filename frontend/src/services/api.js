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

export const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', response.data.token);
        return response.data;
    } catch (error) {
        throw error.response?.data?.error || 'An error occurred';
    }
};

export const signup = async (userData) => {
    try {
        const response = await api.post('/auth/signup', userData);
        localStorage.setItem('token', response.data.token);
        return response.data;
    } catch (error) {
        throw error.response?.data?.error || 'An error occurred';
    }
};

export const submitQuestionnaire = async (profileData) => {
    try {
        const response = await api.post('/user/questionnaire', profileData);
        return response.data;
    } catch (error) {
        throw error.response?.data?.error || 'An error occurred';
    }
};

export const getUserProfile = async () => {
    try {
        const response = await api.get('/user/profile');
        return response.data;
    } catch (error) {
        throw error.response?.data?.error || 'An error occurred';
    }
};

export const logout = () => {
    localStorage.removeItem('token');
};

export default api; 