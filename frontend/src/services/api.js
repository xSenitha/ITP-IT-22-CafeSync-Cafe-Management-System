// axios api service configuration
import axios from 'axios';

// create axios instance with base url
const API = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' }
});

// request interceptor to add auth token
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// response interceptor for error handling
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const downloadApiFile = async (url, fallbackFileName = 'download.xlsx') => {
    const response = await API.get(url, { responseType: 'blob' });
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match?.[1] || fallbackFileName;
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
};

export default API;
