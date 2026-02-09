import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useApi } from '../auth/useApi';

const UserCacheContext = createContext();

export const useUserCache = () => useContext(UserCacheContext);

export const UserCacheProvider = ({ children }) => {
    const { get } = useApi();
    const [cache, setCache] = useState({});

    // We use a ref for pending requests to avoid race conditions and re-renders
    // mapping identifier -> Promise
    const pendingRequests = useRef({});

    const updateCache = useCallback((data) => {
        if (!data) return;
        setCache(prev => {
            const newCache = { ...prev };
            // Cache by ID
            if (data.id) newCache[data.id.toString()] = data;
            // Cache by Username (lowercase for consistent lookup)
            if (data.username) newCache[data.username.toLowerCase()] = data;
            return newCache;
        });
    }, []);

    const getCachedUser = useCallback((identifier) => {
        if (!identifier) return null;
        const key = identifier.toString().toLowerCase();
        return cache[key] || null;
    }, [cache]);

    const resolveUser = useCallback(async (identifier) => {
        if (!identifier) return null;
        const key = identifier.toString().toLowerCase();

        // 1. Check Cache
        if (cache[key]) {
            return cache[key];
        }

        // 2. Check Pending Requests
        if (pendingRequests.current[key]) {
            return pendingRequests.current[key];
        }

        // 3. Fetch
        const promise = (async () => {
            try {
                const res = await get(`/users/resolve/${identifier}`);
                updateCache(res);
                return res;
            } catch (err) {
                console.error(`Failed to resolve user ${identifier}`, err);
                // We might want to cache the failure/null to avoid retry loops, but for now just return null
                return null;
            } finally {
                // Remove from pending
                delete pendingRequests.current[key];
            }
        })();

        pendingRequests.current[key] = promise;
        return promise;

    }, [cache, get, updateCache]);

    const value = {
        cache,
        getCachedUser,
        resolveUser
    };

    return (
        <UserCacheContext.Provider value={value}>
            {children}
        </UserCacheContext.Provider>
    );
};
