import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((type, message, customEmojiId = null) => {
        const id = Date.now().toString();

        // Define default emoji mapping if customEmojiId is not provided
        let emojiId = customEmojiId;
        if (!emojiId) {
            switch (type) {
                case 'info':
                    emojiId = '5440660757194744323'; // Red Info (as requested)
                    break;
                case 'warning':
                    emojiId = '5447644880824181073'; // Yellow Warning
                    break;
                case 'success':
                    emojiId = '5206607081334906820'; // Green Tick
                    break;
                case 'error':
                case 'failed':
                    emojiId = '5210952531676504517'; // Red Wrong
                    break;
                case 'bell':
                    emojiId = '5458603043203327669'; // Yellow Bell
                    break;
                case 'chain':
                    emojiId = '5271604874419647061'; // Blue Chain
                    break;
                default:
                    emojiId = '5253742260054409879'; // White Msg
                    break;
            }
        }

        const newNotification = {
            id,
            type,
            message,
            emojiId,
        };

        setNotifications((prev) => {
            // Stack logic: Keep max 3, remove oldest if needed
            // Newest comes nicely on top? Or pushed to stack? 
            // "if more need to appear then the most previous one will be left by back to the top"
            // This implies a stack where new ones appear, and old ones leave.
            const updated = [newNotification, ...prev];
            if (updated.length > 3) {
                return updated.slice(0, 3);
            }
            return updated;
        });

        // Auto remove after 3s
        setTimeout(() => {
            removeNotification(id);
        }, 3000);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
