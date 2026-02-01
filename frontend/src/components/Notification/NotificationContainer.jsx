import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNotification } from '../../context/NotificationContext';
import NotificationItem from './NotificationItem';

const NotificationContainer = () => {
    const { notifications } = useNotification();

    return (
        <div style={{
            position: 'fixed',
            top: '80px',
            left: 0,
            width: '100%',
            height: 'calc(100% - 80px)', // Cover screen but allow click-through via pointer-events
            pointerEvents: 'none',
            zIndex: 20000,
            display: 'flex',
            justifyContent: 'center'
        }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '400px', pointerEvents: 'none' }}>
                <AnimatePresence initial={false}>
                    {notifications.map((notif, index) => (
                        <NotificationItem
                            key={notif.id}
                            {...notif}
                            index={index}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default NotificationContainer;
