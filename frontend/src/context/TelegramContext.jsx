import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';

const TelegramContext = createContext(null);

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider = ({ children }) => {
    // Handlers: { [layer: number]: handlerFunction }
    const [handlers, setHandlers] = useState({});

    // Register a back button handler for a specific layer/priority
    // Higher layer = higher priority
    // Layer 10: Page specific (e.g., Ads Details)
    // Layer 20: Overlays (e.g., Request Deal, Settings)
    const registerBackHandler = useCallback((layer, handler) => {
        setHandlers(prev => ({ ...prev, [layer]: handler }));
        return () => {
            setHandlers(prev => {
                const newState = { ...prev };
                delete newState[layer];
                return newState;
            });
        };
    }, []);

    useEffect(() => {
        // Find highest priority handler
        const layers = Object.keys(handlers).map(Number).sort((a, b) => b - a);
        const topLayer = layers[0];
        const activeHandler = handlers[topLayer];

        if (activeHandler) {
            WebApp.BackButton.show();
            WebApp.BackButton.onClick(activeHandler);
        } else {
            WebApp.BackButton.hide();
        }

        return () => {
            if (activeHandler) {
                WebApp.BackButton.offClick(activeHandler);
            }
        };
    }, [handlers]);

    return (
        <TelegramContext.Provider value={{ registerBackHandler }}>
            {children}
        </TelegramContext.Provider>
    );
};
