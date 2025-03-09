// File path: spiritx-frontend/src/services/api.js

import axios from 'axios';

const API_URL = 'http://localhost:5234/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Added token to request');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log detailed errors for debugging
    if (error.response) {
      console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.data) {
        console.error('Error details:', error.response.data);
      }

      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        // Automatically logout on unauthorized responses
        logout();
        // Redirect to login page
        window.location.href = '/login';
      }
      // Handle 403 Forbidden (admin access issue)
      else if (error.response.status === 403) {
        console.error('Access forbidden - You do not have admin privileges');
        // Redirect to team page
        window.location.href = '/team';
      }
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Auth services
export const register = (username, password) => {
  return axiosInstance.post('/auth/register', { username, password });
};

export const login = async (username, password) => {
  try {
    // Clear any existing auth data to prevent conflicts
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const response = await axiosInstance.post('/auth/login', { username, password });

    // Log the full response for debugging
    console.log('Login response:', response);

    if (response.data && response.data.token) {
      // Store token
      localStorage.setItem('token', response.data.token);

      // Store user info including isAdmin flag with safer property access
      const userData = {
        userId: response.data.user?.userId || 0,
        username: response.data.user?.username || username,
        isAdmin: response.data.user?.isAdmin || false
      };

      localStorage.setItem('user', JSON.stringify(userData));

      // Debug log the admin status
      console.log('Login successful, user admin status:', userData.isAdmin);
    }
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('Logged out successfully');
};

// Utility function to check if user is logged in
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

// Improved utility function to check if user is admin
export const isAdmin = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // Ensure strict boolean comparison with === true
    return user.isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Player services
export const getAllPlayers = (category = '') => {
  if (category && category !== 'All') {
    console.log(`API call: Getting players with category: "${category}"`);
    console.log(`Category type: ${typeof category}`);
    console.log(`Category length: ${category.length}`);
    console.log(`Category characters: ${Array.from(category).map(c => c.charCodeAt(0))}`);

    // Check for any hidden characters or weird encoding
    const cleanCategory = encodeURIComponent(category.trim());
    console.log(`Encoded category parameter: "${cleanCategory}"`);

    return axiosInstance.get(`/players?category=${cleanCategory}`);
  }
  console.log('API call: Getting all players (no category filter)');
  return axiosInstance.get('/players');
};

export const getPlayerById = (id) => {
  return axiosInstance.get(`/players/${id}`);
};

// Team services
export const getUserTeam = () => {
  return axiosInstance.get('/teams');
};

export const addPlayerToTeam = (playerId) => {
  return axiosInstance.post('/teams/addPlayer', { playerId });
};

export const removePlayerFromTeam = (playerId) => {
  return axiosInstance.post('/teams/removePlayer', { playerId });
};

// Leaderboard services
export const getLeaderboard = () => {
  return axiosInstance.get('/leaderboard');
};

// Chatbot services
export const queryChatbot = (message) => {
  return axiosInstance.post('/chatbot/query', { message });
};

// Admin services
export const getAdminStats = () => {
  if (!isAdmin()) {
    console.warn('Attempting to access admin endpoint without admin privileges');
  }
  return axiosInstance.get('/admin/stats');
};

export const getTournamentSummary = () => {
  try {
    if (!isAdmin()) {
      console.warn('Attempting to access admin endpoint without admin privileges');
    }

    // Get token directly
    const token = localStorage.getItem('token');

    // Make a direct fetch request
    return fetch(`${API_URL}/admin/tournamentSummary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json().then(data => ({ data }));
    });
  } catch (error) {
    console.error('Error setting up tournament summary request:', error);
    return Promise.reject(error);
  }
};

export const importPlayers = (formData) => {
  if (!isAdmin()) {
    console.warn('Attempting to access admin endpoint without admin privileges');
  }

  // Log the current token for debugging
  const token = localStorage.getItem('token');
  console.log('Using token for import:', token ? 'Token exists' : 'No token!');

  return axiosInstance.post('/admin/importPlayers', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const clearPlayers = () => {
  if (!isAdmin()) {
    console.warn('Attempting to access admin endpoint without admin privileges');
  }
  return axiosInstance.delete('/admin/clearPlayers');
};

export const getAdminPlayers = (page = 1, pageSize = 10, searchTerm = "", category = "") => {
  if (!isAdmin()) {
    console.warn('Attempting to access admin endpoint without admin privileges');
  }

  let url = `/admin/players?page=${page}&pageSize=${pageSize}`;

  if (searchTerm) {
    url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
  }

  if (category && category !== 'All') {
    url += `&category=${encodeURIComponent(category)}`;
  }

  return axiosInstance.get(url);
};

export const getAdminPlayer = (id) => {
  if (!isAdmin()) {
    console.warn('Attempting to access admin endpoint without admin privileges');
  }
  return axiosInstance.get(`/admin/player/${id}`);
};

export const createPlayer = (playerData) => {
  if (!isAdmin()) {
    console.warn('Attempting to access admin endpoint without admin privileges');
  }
  return axiosInstance.post('/admin/player', playerData);
};

export const updatePlayer = (id, playerData) => {
  if (!isAdmin()) {
    console.warn('Attempting to access admin endpoint without admin privileges');
  }
  return axiosInstance.put(`/admin/player/${id}`, playerData);
};

export const deletePlayer = (id) => {
  if (!isAdmin()) {
    console.warn('Attempting to access admin endpoint without admin privileges');
  }
  return axiosInstance.delete(`/admin/player/${id}`);
};

// Test endpoints for debugging
export const testAuth = () => {
  return axiosInstance.get('/auth/test');
};

export const testProtected = () => {
  return axiosInstance.get('/auth/protected');
};

export const testAdmin = () => {
  return axiosInstance.get('/admin/test');
};