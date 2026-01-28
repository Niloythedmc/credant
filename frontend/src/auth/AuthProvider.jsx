import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { signInWithCustomToken, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    // Production Backend URL
    const BACKEND_URL = 'https://credant-backend-37550868092.us-central1.run.app/api';

    useEffect(() => {
        const initAuth = async () => {
            // 1. Check if we are already signed in
            const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
                if (firebaseUser) {
                    setUser(firebaseUser);
                    // Get ID Token for API calls
                    const idToken = await firebaseUser.getIdToken();
                    setToken(idToken);
                    setLoading(false);
                    return;
                }

                // 2. Not signed in? Check Telegram WebApp Data
                const tg = window.Telegram?.WebApp;
                if (tg && tg.initData) {
                    try {
                        // Call Backend Bridge
                        const response = await fetch(`${BACKEND_URL}/auth/telegram`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ initData: tg.initData })
                        });

                        if (!response.ok) throw new Error("Auth Failed");

                        const { token: customToken } = await response.json();

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
        backendUrl: BACKEND_URL
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading ? children : <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-dark)', color: 'var(--text-main)'
            }}>Loading Credant...</div>}
        </AuthContext.Provider>
    );
};
