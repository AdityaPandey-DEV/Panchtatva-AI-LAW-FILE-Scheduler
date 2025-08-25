/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the application.
 * Handles login, logout, registration, and user session management.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set up axios interceptors
  useEffect(() => {
    // Request interceptor to add auth token
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          setUser(null);
          
          // Don't show toast for login/register pages
          if (!window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/register')) {
            toast.error('Session expired. Please login again.');
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptors
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/auth/me');
        setUser(response.data.data.user);
      } catch (error) {
        // Try demo mode
        const demoResponse = await axios.get('/demo/me');
        setUser(demoResponse.data.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // First try regular auth
      const response = await axios.post('/auth/login', {
        email: email.toLowerCase().trim(),
        password
      });

      const { token, user: userData } = response.data.data;
      
      // Store token and user data
      localStorage.setItem('token', token);
      setUser(userData);
      
      toast.success(`Welcome back, ${userData.name}!`);
      return { success: true, user: userData };

    } catch (error) {
      // If auth fails, try demo mode
      try {
        console.log('Trying demo mode login...');
        const demoResponse = await axios.post('/demo/login', {
          email: email.toLowerCase().trim(),
          password
        });

        const { token, user: userData } = demoResponse.data.data;
        
        // Store token and user data
        localStorage.setItem('token', token);
        setUser(userData);
        
        toast.success(`Welcome back, ${userData.name}! (Demo Mode)`);
        return { success: true, user: userData };

      } catch (demoError) {
        const message = error.response?.data?.message || 'Login failed';
        toast.error(message);
        return { success: false, error: message };
      }
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register', {
        ...userData,
        email: userData.email.toLowerCase().trim(),
        name: userData.name.trim()
      });

      const { token, user: newUser } = response.data.data;
      
      // Store token and user data
      localStorage.setItem('token', token);
      setUser(newUser);
      
      toast.success(`Welcome to Panchtatva, ${newUser.name}!`);
      return { success: true, user: newUser };

    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      const errors = error.response?.data?.errors;
      
      if (errors && Array.isArray(errors)) {
        errors.forEach(err => toast.error(err));
      } else {
        toast.error(message);
      }
      
      return { success: false, error: message, errors };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/auth/profile', profileData);
      const updatedUser = response.data.data.user;
      
      setUser(updatedUser);
      toast.success('Profile updated successfully');
      return { success: true, user: updatedUser };

    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      toast.success('Password changed successfully');
      return { success: true };

    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await axios.post('/auth/forgot-password', {
        email: email.toLowerCase().trim()
      });
      
      toast.success('Password reset instructions sent to your email');
      return { success: true };

    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const verifyToken = async (token) => {
    try {
      const response = await axios.post('/auth/verify-token', { token });
      return { success: true, user: response.data.data.user };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  };

  // Helper functions
  const isAuthenticated = () => !!user;
  
  const hasRole = (role) => user?.role === role;
  
  const hasAnyRole = (roles) => roles.includes(user?.role);
  
  const isAdmin = () => hasRole('admin');
  
  const isLawyer = () => hasRole('lawyer');
  
  const isClient = () => hasRole('client');

  const value = {
    // State
    user,
    loading,
    
    // Auth methods
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    verifyToken,
    checkAuthStatus,
    
    // Helper methods
    isAuthenticated,
    hasRole,
    hasAnyRole,
    isAdmin,
    isLawyer,
    isClient
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
