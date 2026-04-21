// authentication context provider for global auth state
import { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

// create auth context
const AuthContext = createContext(null);

// auth provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // load user from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    // login function
    const login = async (email, password) => {
        const response = await API.post('/users/login', { email, password });
        const { token: newToken, user: userData } = response.data;
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        return response.data;
    };

    // register function
    const register = async (userData) => {
        const response = await API.post('/users/register', userData);
        const { token: newToken, user: newUser } = response.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        return response.data;
    };

    // logout function
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    // update user data (for profile edits)
    const updateUser = (updatedData) => {
        const newUser = { ...user, ...updatedData };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    // check if user is authenticated
    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

// custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
