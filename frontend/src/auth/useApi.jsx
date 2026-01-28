import { useAuth } from './AuthProvider';

export const useApi = () => {
    const { token, backendUrl } = useAuth();

    const request = async (endpoint, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        const response = await fetch(`${backendUrl}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API Request Failed');
        return data;
    };

    const get = (endpoint) => request(endpoint, { method: 'GET' });
    const post = (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) });

    return { get, post };
};
