// api.ts

import axios from 'axios';

/**
 * A custom error class for more descriptive API errors.
 */
export class ApiError extends Error {
  constructor(message: string, public status: number | null = null) {
    super(message);
    this.name = 'ApiError';
  }
}

// 1. Create a custom Axios instance
const api = axios.create({
  // Use a base URL from environment variables, with a dev fallback
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request Interceptor: Add the Authorization header
api.interceptors.request.use(
  (config) => {
    // Check if we are on the client-side (in the browser)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Response Interceptor: Handle errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If the error has a response object and a status of 401 (Unauthorized)
    if (error.response?.status === 401) {
      console.error('Unauthorized: Token is invalid or expired.');
      // Remove the invalid token from local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // Redirect the user to the login page
        window.location.href = '/login';
      }
    }

    // Create a new, custom error for more consistent handling
    const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred.';
    const errorStatus = error.response?.status || null;
    
    return Promise.reject(new ApiError(errorMessage, errorStatus));
  }
);

export default api;