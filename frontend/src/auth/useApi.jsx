import { useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { auth } from '../firebase'; // Direct auth access for fresh token

export const useApi = () => {
    const { backendUrl } = useAuth(); // We don't rely on stale 'token' from context

    const request = useCallback(async (endpoint, options = {}) => {
        let freshToken = null;
        if (auth.currentUser) {
            freshToken = await auth.currentUser.getIdToken();
        }

        const headers = {
            'Content-Type': 'application/json',
            ...(freshToken ? { 'Authorization': `Bearer ${freshToken}` } : {}),
            ...options.headers
        };

        const response = await fetch(`${backendUrl}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API Request Failed');
        return data;
    }, [backendUrl]);

    const get = useCallback((endpoint) => request(endpoint, { method: 'GET' }), [request]);
    const post = useCallback((endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }), [request]);
    const del = useCallback((endpoint, body) => request(endpoint, { method: 'DELETE', body: JSON.stringify(body) }), [request]);

    return { get, post, del };
};
