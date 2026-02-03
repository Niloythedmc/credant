import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import WebApp from '@twa-dev/sdk';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);
    const [tgUser, setTgUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    // Production Backend URL
    const BACKEND_URL = 'https://credant-production.up.railway.app/api';

    // Helper to fetch/refresh user profile
    const refreshProfile = async () => {
        if (!user || !token) return;
        try {
            const res = await fetch(`${BACKEND_URL}/auth/me?t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const profile = await res.json();
                console.log("User Profile Loaded:", profile);
                setUserProfile(profile);
            }
        } catch (e) {
            console.error("Failed to fetch user profile", e);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            // 0. Extract Telegram WebApp Data (Unsafe) immediately
            const tgApp = window.Telegram?.WebApp || WebApp;
            const tgUnsafeData = tgApp?.initDataUnsafe;

            if (tgUnsafeData?.user) {
                console.log("Telegram User Data:", tgUnsafeData.user);
                setTgUser(tgUnsafeData.user);
            }

            // 1. Check if we are already signed in
            const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
                if (firebaseUser) {
                    setUser(firebaseUser);
                    // Get ID Token for API calls
                    const idToken = await firebaseUser.getIdToken();
                    setToken(idToken);

                    // Fetch User Profile (with Wallet)
                    // We can't use refreshProfile here easily because of closure/state, 
                    // so we duplicate the fetch call or move refreshProfile definition up 
                    // but it depends on state. simpler to just inline fetch here for init 
                    // or better: define fetch logic outside.
                    // Actually, let's just define the fetcher here:

                    try {
                        const res = await fetch(`${BACKEND_URL}/auth/me?t=${Date.now()}`, {
                            headers: { 'Authorization': `Bearer ${idToken}` }
                        });
                        if (res.ok) {
                            const profile = await res.json();
                            console.log("User Profile Loaded:", profile);
                            setUserProfile(profile);
                        }
                    } catch (e) {
                        console.error("Failed to fetch user profile", e);
                    }

                    setLoading(false);
                    return;
                }

                // 2. Not signed in? Check Telegram WebApp Data (Signed)
                const tgData = tgApp?.initData;

                if (tgData) {
                    console.log("Telegram InitData found:", tgData);
                    try {
                        // Call Backend Bridge
                        const response = await fetch(`${BACKEND_URL}/auth/telegram`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ initData: tgData })
                        });

                        if (!response.ok) throw new Error("Auth Failed");

                        const { token: customToken, user: userData } = await response.json();

                        if (userData) {
                            console.log("Pre-loaded User Profile from Auth:", userData);
                            setUserProfile(userData);
                        }

                        // Sign in to Firebase
                        await signInWithCustomToken(auth, customToken);
                        // onAuthStateChanged will handle the rest
                    } catch (error) {
                        console.error("Telegram Auth Error:", error);
                        setLoading(false);
                    }
                } else {
                    // Not in Telegram or no data
                    console.log("No Telegram credentials found.");
                    setLoading(false);
                }
            });

            return () => unsubscribe();
        };

        initAuth();
    }, []);

    const logout = () => signOut(auth);

    const value = {
        user,
        token,
        loading,
        logout,
        backendUrl: BACKEND_URL,
        tgUser,
        userProfile,
        refreshProfile // Exposed
    };

    return (
        <AuthContext.Provider value={value}>
            {(!loading && user) ? (
                children
            ) : (
                <div style={{
                    height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-dark)', color: 'var(--text-main)'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div className="spinner" style={{
                            width: '40px', height: '40px',
                            border: '3px solid rgba(255,255,255,0.1)',
                            borderTop: '3px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <span style={{ fontSize: '14px', fontWeight: '500', opacity: 0.8 }}>Loading Credant...</span>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
};
